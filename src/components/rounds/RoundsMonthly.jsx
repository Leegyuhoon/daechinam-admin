import { useState } from 'react'
import { ChevronLeft, ChevronRight, Printer, Check, BellRing, Copy, Sparkles, Eye, EyeOff } from 'lucide-react'
import { thisMonth, shiftMonth, collectMonth, RATINGS, portalLink, reportLink } from '../../lib/rounds'
import { Modal, Card, Label, inputCls, btnPrimary, btnGhost } from './ui'
import MonthlyReportDoc from './MonthlyReportDoc'
import PrintButton, { printElement } from '../PrintButton'

// 기록을 바탕으로 총평 초안 만들기 (자유롭게 고쳐 쓰면 됨)
function draftSummary(siteName, month, d) {
  const m = Number(month.slice(5))
  const done = d.tickets.filter((t) => t.status === 'done').length
  const lines = [`${m}월 ${siteName} 정기 청소를 계약 내용에 따라 정상적으로 진행했습니다.`]
  if (d.inspections.length) lines.push(`본사 점검을 ${d.inspections.length}회 진행해 청소 상태를 확인했습니다.`)
  if (d.tickets.length) lines.push(`접수된 문의·요청 ${d.tickets.length}건 중 ${done}건을 처리 완료했습니다.${d.tickets.length > done ? ' 나머지 건도 빠르게 조치하겠습니다.' : ''}`)
  const issueItems = d.issues.flatMap((x) => x.items || [])
  if (issueItems.length) {
    const doneN = issueItems.filter((it) => it.status === 'done').length
    lines.push(`현장에서 보고된 이슈 ${issueItems.length}건 중 ${doneN}건을 조치 완료했습니다.`)
  }
  if (d.executions.length) lines.push(`추가 작업으로 ${d.executions.map((e) => e.serviceName).join(', ')}을(를) 진행했습니다.`)
  return lines.join('\n')
}

function ReportEditor({ site, month, initial, data, ops, onClose }) {
  const [r, setR] = useState(initial)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [copied, setCopied] = useState(false)

  const save = async (patch = {}) => {
    const next = { ...r, ...patch }
    if (patch.published && !r.published) next.publishedAt = new Date().toISOString()
    setSaving(true)
    setError(null)
    try {
      const saved = await ops.save('reports', next)
      setR(saved)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  // 알림을 안 켠 담당자에게 직접 보낼 수 있도록 보고서 링크 복사
  const copyLink = async () => {
    const code = await ops.ensureAccessCode(site)
    const msg = portalLink(code, 'reports')
    try {
      await navigator.clipboard.writeText(msg)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      prompt('아래 내용을 복사해 주세요', msg)
    }
  }

  return (
    <Modal title={`${site.name} · ${Number(month.slice(5))}월 보고서`} onClose={onClose} wide>
      <div className="no-print space-y-3">
        <div>
          <p className="mb-1 text-xs text-base-400">종합 평가</p>
          <div className="flex gap-1">
            {RATINGS.map((x) => (
              <button
                key={x}
                onClick={() => setR({ ...r, rating: x })}
                className={`focus-ring flex-1 rounded-lg border py-1.5 text-sm ${r.rating === x ? 'border-mist-500 bg-mist-500/10 font-medium' : 'border-base-700 text-base-400'}`}
              >
                {x}
              </button>
            ))}
          </div>
        </div>
        <Label text="이번 달 총평">
          <textarea rows={4} className={inputCls} value={r.summary} onChange={(e) => setR({ ...r, summary: e.target.value })} />
        </Label>
        <button onClick={() => setR({ ...r, summary: draftSummary(site.name, month, data) })} className="flex items-center gap-1 text-[11px] text-mist-500 hover:underline">
          <Sparkles size={12} /> 이번 달 기록으로 초안 채우기
        </button>
        <Label text="다음 달 계획 · 건의 사항 (예정된 일정은 자동으로 들어가요)">
          <textarea rows={2} className={inputCls} value={r.nextPlan} onChange={(e) => setR({ ...r, nextPlan: e.target.value })} placeholder="예: 연말 대청소 일정 협의 요청드립니다." />
        </Label>
        {error && <p className="text-xs text-amber-500">{error}</p>}
        <div className="flex flex-wrap gap-2">
          <button onClick={() => save()} disabled={saving} className={btnGhost}>
            {saving ? '저장 중…' : '임시 저장'}
          </button>
          {r.published ? (
            <button onClick={() => save({ published: false })} disabled={saving} className={btnGhost}>
              <EyeOff size={14} /> 공개 취소
            </button>
          ) : (
            <button onClick={() => save({ published: true })} disabled={saving} className={btnPrimary}>
              <Eye size={14} /> 저장하고 업체에 공개
            </button>
          )}
          <button onClick={() => printElement('print-monthly-doc', `${site.name}_${month}_월간보고서`)} className={`${btnGhost} ml-auto`}>
            <Printer size={14} /> PDF 저장
          </button>
        </div>
        {r.published && (
          <div className="rounded-lg border border-mist-500/40 bg-mist-500/5 p-3">
            <p className="flex items-center gap-1.5 text-xs font-medium">
              <BellRing size={13} className="text-mist-500" /> 업체 전용 페이지에 공개됐어요.
            </p>
            <p className="mt-0.5 text-[11px] text-base-500">알림을 켠 담당자에게는 "월간 보고서 등록" 알림이 바로 전송돼요.</p>
            <button onClick={copyLink} className={`${btnGhost} mt-2 !py-1.5 !text-xs`}>
              {copied ? <Check size={13} /> : <Copy size={13} />} {copied ? '복사됨' : '보고서 링크 복사'}
            </button>
          </div>
        )}
        <p className="pt-2 text-xs font-semibold text-base-300">미리보기</p>
      </div>
      <div id="print-monthly-doc" className="rounded-xl border border-base-800 bg-base-950 p-4">
        <MonthlyReportDoc siteName={site.name} month={month} report={r} data={data} serviceReportLink={reportLink} />
      </div>
    </Modal>
  )
}

export default function RoundsMonthly({ data, ops }) {
  const { sites, visits, tickets, executions, reports, issues } = data
  const [month, setMonth] = useState(shiftMonth(thisMonth(), new Date().getDate() <= 10 ? -1 : 0))
  const [editing, setEditing] = useState(null)
  const [y, m] = month.split('-')

  const activeSites = sites.filter((s) => s.active !== false).sort((a, b) => (a.order ?? 99) - (b.order ?? 99))
  const rows = activeSites.map((site) => {
    const d = collectMonth({ siteId: site.id, month, visits, tickets, executions, issues })
    const report = reports.find((r) => r.siteId === site.id && r.month === month)
    return { site, d, report }
  })
  const publishedCount = rows.filter((r) => r.report?.published).length

  const open = ({ site, report }) =>
    setEditing({
      site,
      initial: report || { siteId: site.id, month, rating: '', summary: '', nextPlan: '', published: false }
    })

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button onClick={() => setMonth(shiftMonth(month, -1))} className={btnGhost + ' !px-2'}>
              <ChevronLeft size={16} />
            </button>
            <p className="min-w-[110px] text-center text-base font-semibold">
              {y}년 {Number(m)}월
            </p>
            <button onClick={() => setMonth(shiftMonth(month, 1))} className={btnGhost + ' !px-2'}>
              <ChevronRight size={16} />
            </button>
          </div>
          <div className="flex items-center gap-3">
            <p className="text-xs text-base-400">
              보고서 공개 <span className="font-semibold text-mist-500">{publishedCount}</span> / {rows.length}곳
            </p>
            <PrintButton targetId="print-monthly-list" title={`월간 보고서 현황_${month}`} label="현황 PDF" small />
          </div>
        </div>
        <p className="mt-3 text-[11px] text-base-500">
          점검 기록(월간 일정의 점검 메모), 문의·요청 처리 내역, 현장 이슈(팀장 보고), 전후 보고서, 다음 달 일정이 자동으로 들어가요. 종합 평가와 총평만 적고 공개하면 업체 전용 페이지에서 바로 볼 수 있어요.
          매월 초에는 지난달이 먼저 보여요.
        </p>
      </Card>

      <div id="print-monthly-list" className="grid gap-2 md:grid-cols-2">
        {rows.map((row) => {
          const { site, d, report } = row
          const status = report?.published ? ['공개됨', 'bg-teal-400/10 text-teal-500'] : report ? ['작성 중', 'bg-amber-400/10 text-amber-500'] : ['작성 전', 'bg-base-800 text-base-400']
          return (
            <button key={site.id} onClick={() => open(row)} className="focus-ring block text-left">
              <Card className="!p-3 hover:border-mist-500/50">
                <div className="mb-1.5 flex items-center justify-between">
                  <p className="text-sm font-semibold">{site.name}</p>
                  <span className={`rounded px-1.5 py-0.5 text-[11px] ${status[1]}`}>
                    {report?.published && <Check size={10} className="mr-0.5 inline" />}
                    {status[0]}
                  </span>
                </div>
                <p className="text-[11px] text-base-500">
                  점검 {d.inspections.length}회 · 문의 {d.tickets.length}건 (완료 {d.tickets.filter((t) => t.status === 'done').length}) · 현장 이슈 {d.issues.reduce((n, x) => n + (x.items || []).length, 0)}건 · 추가 작업 {d.executions.length}건
                  {report?.rating && ` · 평가 ${report.rating}`}
                </p>
              </Card>
            </button>
          )
        })}
      </div>

      {editing && (
        <ReportEditor
          site={editing.site}
          month={month}
          initial={editing.initial}
          data={collectMonth({ siteId: editing.site.id, month, visits, tickets, executions, issues })}
          ops={ops}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  )
}
