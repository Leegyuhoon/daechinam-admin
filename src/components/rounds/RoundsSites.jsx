import { useState } from 'react'
import { Plus, Pencil, Trash2, Phone, Clock, MapPin } from 'lucide-react'
import { cycleLabel, CYCLE_OPTIONS, serviceNextDue, lastInspection, nextInspectionDue, todayStr, fmtDate } from '../../lib/rounds'
import { Modal, Label, Card, inputCls, btnPrimary, btnGhost, btnDanger } from './ui'

const emptySite = (order) => ({
  name: '',
  order,
  inspectCycleMonths: 1,
  contactName: '',
  contactPhone: '',
  workHours: '',
  address: '',
  memo: '',
  active: true,
  services: []
})

const emptyService = () => ({ id: crypto.randomUUID(), name: '', cycleMonths: 1, lastDoneDate: '', note: '' })

const SERVICE_EXAMPLES = ['카펫 세척', '유리창 청소', '바닥 왁스', '에어컨 필터', '방역·소독', '외벽·간판']

function SiteModal({ initial, onClose, ops }) {
  const [site, setSite] = useState({ ...initial, services: (initial.services || []).map((s) => ({ ...s })) })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const setSvc = (i, patch) => setSite((s) => ({ ...s, services: s.services.map((sv, j) => (j === i ? { ...sv, ...patch } : sv)) }))
  const addSvc = (name = '') => setSite((s) => ({ ...s, services: [...s.services, { ...emptyService(), name }] }))
  const removeSvc = (i) => setSite((s) => ({ ...s, services: s.services.filter((_, j) => j !== i) }))

  const save = async () => {
    if (!site.name.trim()) return setError('현장명을 입력해주세요.')
    setSaving(true)
    setError(null)
    try {
      await ops.save('sites', {
        ...site,
        name: site.name.trim(),
        inspectCycleMonths: Number(site.inspectCycleMonths) || 1,
        services: site.services.filter((s) => s.name.trim()).map((s) => ({ ...s, name: s.name.trim(), cycleMonths: Number(s.cycleMonths) || 1 }))
      })
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    if (!confirm(`'${site.name}' 현장을 삭제할까요? 이 현장의 일정·보고서 기록은 남지만 목록에서 사라져요.`)) return
    await ops.remove('sites', site.id)
    onClose()
  }

  return (
    <Modal title={site.id ? '현장 정보 수정' : '현장 추가'} onClose={onClose} wide>
      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <Label text="현장명">
            <input className={inputCls} value={site.name} onChange={(e) => setSite({ ...site, name: e.target.value })} />
          </Label>
          <Label text="점검 방문 주기">
            <select className={inputCls} value={site.inspectCycleMonths} onChange={(e) => setSite({ ...site, inspectCycleMonths: e.target.value })}>
              {CYCLE_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {cycleLabel(n)}
                </option>
              ))}
            </select>
          </Label>
          <Label text="업체 담당자">
            <input className={inputCls} value={site.contactName} onChange={(e) => setSite({ ...site, contactName: e.target.value })} placeholder="예: 김OO 과장" />
          </Label>
          <Label text="담당자 연락처">
            <input className={inputCls} value={site.contactPhone} onChange={(e) => setSite({ ...site, contactPhone: e.target.value })} placeholder="010-0000-0000" />
          </Label>
          <Label text="근무 시간">
            <input className={inputCls} value={site.workHours} onChange={(e) => setSite({ ...site, workHours: e.target.value })} placeholder="예: 평일 05:00~08:00" />
          </Label>
          <Label text="주소">
            <input className={inputCls} value={site.address} onChange={(e) => setSite({ ...site, address: e.target.value })} />
          </Label>
          <Label text="메모" className="sm:col-span-2">
            <textarea rows={2} className={inputCls} value={site.memo} onChange={(e) => setSite({ ...site, memo: e.target.value })} placeholder="출입 방법, 주의사항 등" />
          </Label>
        </div>

        <div className="rounded-lg border border-base-800 bg-base-900 p-3">
          <p className="mb-1 text-xs font-medium text-base-300">서비스 항목 (정기 청소 외에 주기적으로 하는 작업)</p>
          <p className="mb-3 text-[11px] text-base-500">마지막 실행일과 주기를 넣으면 다음 예정일이 자동으로 계산되고, 월간 일정의 "자동 배치"에 포함돼요.</p>
          <div className="space-y-2">
            {site.services.map((sv, i) => (
              <div key={sv.id} className="grid grid-cols-2 gap-2 rounded-lg bg-base-950 p-2 sm:grid-cols-[1.4fr_1fr_1fr_auto]">
                <input className={inputCls} placeholder="항목명" value={sv.name} onChange={(e) => setSvc(i, { name: e.target.value })} />
                <select className={inputCls} value={sv.cycleMonths} onChange={(e) => setSvc(i, { cycleMonths: e.target.value })}>
                  {CYCLE_OPTIONS.map((n) => (
                    <option key={n} value={n}>
                      {cycleLabel(n)}
                    </option>
                  ))}
                </select>
                <input type="date" title="마지막 실행일" className={inputCls} value={sv.lastDoneDate || ''} onChange={(e) => setSvc(i, { lastDoneDate: e.target.value })} />
                <button onClick={() => removeSvc(i)} className="focus-ring flex items-center justify-center rounded-lg px-2 text-base-500 hover:text-red-500">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <button onClick={() => addSvc()} className="focus-ring flex items-center gap-1 rounded-md border border-base-700 bg-base-950 px-2 py-1 text-[11px] text-base-300">
              <Plus size={11} /> 항목 추가
            </button>
            {SERVICE_EXAMPLES.filter((n) => !site.services.some((s) => s.name === n)).map((n) => (
              <button key={n} onClick={() => addSvc(n)} className="focus-ring rounded-md px-2 py-1 text-[11px] text-base-500 hover:text-mist-500">
                + {n}
              </button>
            ))}
          </div>
        </div>

        <label className="flex items-center gap-2 text-xs text-base-400">
          <input type="checkbox" checked={site.active !== false} onChange={(e) => setSite({ ...site, active: e.target.checked })} />
          운영 중 (해제하면 일정·현황에서 빠져요)
        </label>

        {error && <p className="text-xs text-amber-500">{error}</p>}
        <div className="flex gap-2">
          <button onClick={save} disabled={saving} className={btnPrimary}>
            {saving ? '저장 중…' : '저장'}
          </button>
          <button onClick={onClose} className={btnGhost}>
            취소
          </button>
          {site.id && (
            <button onClick={remove} className={`${btnDanger} ml-auto`}>
              <Trash2 size={14} /> 삭제
            </button>
          )}
        </div>
      </div>
    </Modal>
  )
}

export default function RoundsSites({ data, ops }) {
  const { sites, visits } = data
  const [modal, setModal] = useState(null)
  const today = todayStr()
  const sorted = [...sites].sort((a, b) => (a.active === false) - (b.active === false) || (a.order ?? 99) - (b.order ?? 99))

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs text-page-sub">현장 {sites.filter((s) => s.active !== false).length}곳 운영 중</p>
        <button onClick={() => setModal(emptySite(sites.length))} className={btnPrimary}>
          <Plus size={14} /> 현장 추가
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {sorted.map((site) => {
          const last = lastInspection(site.id, visits)
          const next = nextInspectionDue(site, visits)
          return (
            <Card key={site.id} className={site.active === false ? 'opacity-50' : ''}>
              <div className="mb-2 flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">{site.name}</p>
                  <p className="mt-0.5 text-[11px] text-base-500">
                    점검 {cycleLabel(site.inspectCycleMonths)} · 마지막 {last ? fmtDate(last) : '기록 없음'}
                    {next && (
                      <span className={next < today ? ' font-medium text-amber-500' : ''}> · 다음 {next}</span>
                    )}
                  </p>
                </div>
                <button onClick={() => setModal(site)} className={btnGhost + ' !px-2 !py-1.5'}>
                  <Pencil size={13} />
                </button>
              </div>

              <div className="mb-3 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-base-400">
                {site.contactName && (
                  <span className="flex items-center gap-1">
                    <Phone size={11} /> {site.contactName} {site.contactPhone}
                  </span>
                )}
                {site.workHours && (
                  <span className="flex items-center gap-1">
                    <Clock size={11} /> {site.workHours}
                  </span>
                )}
                {site.address && (
                  <span className="flex items-center gap-1">
                    <MapPin size={11} /> {site.address}
                  </span>
                )}
              </div>
              {site.memo && <p className="mb-3 whitespace-pre-line rounded-lg bg-base-900 px-2.5 py-1.5 text-[11px] text-base-400">{site.memo}</p>}

              {(site.services || []).length === 0 ? (
                <button onClick={() => setModal(site)} className="w-full rounded-lg border border-dashed border-base-700 py-2 text-[11px] text-base-500 hover:text-mist-500">
                  + 서비스 항목 등록 (카펫 세척, 유리창 등)
                </button>
              ) : (
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="text-left text-base-500">
                      <th className="pb-1 font-normal">서비스 항목</th>
                      <th className="pb-1 font-normal">주기</th>
                      <th className="pb-1 font-normal">마지막</th>
                      <th className="pb-1 font-normal">다음 예정</th>
                    </tr>
                  </thead>
                  <tbody>
                    {site.services.map((sv) => {
                      const due = serviceNextDue(sv)
                      return (
                        <tr key={sv.id} className="border-t border-base-800/60">
                          <td className="py-1 text-base-200">{sv.name}</td>
                          <td className="py-1 text-base-400">{cycleLabel(sv.cycleMonths)}</td>
                          <td className="py-1 text-base-400">{sv.lastDoneDate || '-'}</td>
                          <td className={`py-1 ${due && due < today ? 'font-medium text-amber-500' : 'text-base-400'}`}>
                            {due || '마지막 실행일 입력 필요'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </Card>
          )
        })}
      </div>

      {modal && <SiteModal initial={modal} ops={ops} onClose={() => setModal(null)} />}
    </div>
  )
}
