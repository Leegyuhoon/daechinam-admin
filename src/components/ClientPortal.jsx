import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { PenLine, MessagesSquare, FileText, ImagePlus, X, Loader2, Send, Printer, ChevronLeft, CheckCircle2 } from 'lucide-react'
import { api } from '../lib/api'
import { TICKET_CATEGORIES, TICKET_STATUS, fmtDateTime, collectMonth, reportLink } from '../lib/rounds'
import MonthlyReportDoc from './rounds/MonthlyReportDoc'

// 업체 담당자 전용 페이지 (/client?c=접속코드) — 문의 남기기 · 답변 확인 · 월간 보고서
const inputCls = 'focus-ring w-full rounded-lg border border-base-700 bg-base-900 px-3 py-2.5 text-sm text-base-100'
const STATUS_CLS = { open: 'bg-amber-400/10 text-amber-500', progress: 'bg-teal-400/10 text-teal-500', done: 'bg-base-800 text-base-400' }

function NewTicket({ code, onDone }) {
  const [t, setT] = useState({ category: '불편 사항', content: '', authorName: '' })
  const [photos, setPhotos] = useState([])
  const [uploading, setUploading] = useState(0)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState(null)

  const pick = async (e) => {
    const files = [...(e.target.files || [])].slice(0, 6 - photos.length)
    e.target.value = ''
    setUploading(files.length)
    const added = []
    for (const f of files) {
      try {
        added.push(await api.clientPortalPhoto(code, f))
      } catch (err) {
        setError(err.message)
      }
      setUploading((n) => n - 1)
    }
    setPhotos((p) => [...p, ...added])
  }

  const send = async () => {
    if (!t.content.trim()) return setError('내용을 입력해주세요.')
    setSending(true)
    setError(null)
    try {
      await api.clientPortalPost(code, { action: 'ticket', ...t, photos })
      onDone()
    } catch (err) {
      setError(err.message)
      setSending(false)
    }
  }

  return (
    <div className="space-y-3">
      <div>
        <p className="mb-1.5 text-xs text-base-400">어떤 내용인가요?</p>
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
          {TICKET_CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setT({ ...t, category: c })}
              className={`focus-ring rounded-lg border py-2 text-sm ${t.category === c ? 'border-mist-500 bg-mist-500/10 font-medium' : 'border-base-700 text-base-400'}`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>
      <textarea
        rows={5}
        className={inputCls}
        value={t.content}
        onChange={(e) => setT({ ...t, content: e.target.value })}
        placeholder="예: 3층 여자화장실 휴지가 오후에 자주 떨어져요. / 회의실 카펫 얼룩 제거가 가능할까요?"
      />
      <div className="flex flex-wrap gap-1.5">
        {photos.map((p, i) => (
          <div key={p.url} className="relative h-16 w-16 overflow-hidden rounded-lg">
            <img src={p.url} alt="" className="h-full w-full object-cover" />
            <button onClick={() => setPhotos(photos.filter((_, j) => j !== i))} className="absolute right-0.5 top-0.5 rounded-full bg-black/60 p-0.5 text-white">
              <X size={11} />
            </button>
          </div>
        ))}
        {photos.length < 6 && (
          <label className="flex h-16 w-16 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-base-700 text-[10px] text-base-500">
            {uploading ? <Loader2 size={16} className="animate-spin" /> : <ImagePlus size={16} />}
            사진(선택)
            <input type="file" accept="image/*" multiple className="hidden" onChange={pick} disabled={uploading > 0} />
          </label>
        )}
      </div>
      <input className={inputCls} value={t.authorName} onChange={(e) => setT({ ...t, authorName: e.target.value })} placeholder="성함 또는 부서 (선택)" />
      {error && <p className="text-xs text-amber-500">{error}</p>}
      <button
        onClick={send}
        disabled={sending || uploading > 0}
        className="focus-ring flex w-full items-center justify-center gap-1.5 rounded-lg bg-mist-500 py-3 text-sm font-medium text-base-950 hover:bg-mist-400 disabled:opacity-50"
      >
        <Send size={15} /> {sending ? '보내는 중…' : '보내기'}
      </button>
    </div>
  )
}

function TicketItem({ t, code, onUpdated }) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const answered = (t.messages || []).some((m) => m.from === 'admin')

  const reply = async () => {
    if (!text.trim()) return
    setSending(true)
    try {
      const { ticket } = await api.clientPortalPost(code, { action: 'reply', ticketId: t.id, text })
      setText('')
      onUpdated(ticket)
    } catch (err) {
      alert(err.message)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="rounded-xl border border-base-800 bg-base-950 p-3">
      <button onClick={() => setOpen(!open)} className="block w-full text-left">
        <div className="mb-1 flex flex-wrap items-center gap-1.5 text-[11px]">
          <span className="rounded bg-base-900 px-1.5 py-0.5 text-base-400">{t.category}</span>
          <span className={`rounded px-1.5 py-0.5 ${STATUS_CLS[t.status] || STATUS_CLS.open}`}>{TICKET_STATUS[t.status] || '접수'}</span>
          {answered && <span className="rounded bg-mist-500/15 px-1.5 py-0.5 text-mist-600">답변 있음</span>}
          <span className="ml-auto text-base-500">{fmtDateTime(t.createdAt)}</span>
        </div>
        <p className={`text-sm ${open ? 'whitespace-pre-line' : 'line-clamp-2'}`}>{t.content}</p>
      </button>
      {open && (
        <div className="mt-3 space-y-2">
          {(t.photos || []).length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {t.photos.map((p) => (
                <img key={p.url} src={p.url} alt="" className="h-16 w-16 rounded-md object-cover" />
              ))}
            </div>
          )}
          {(t.messages || []).map((m, i) => (
            <div key={i} className={`flex ${m.from === 'admin' ? '' : 'justify-end'}`}>
              <div className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${m.from === 'admin' ? 'bg-mist-500/15' : 'bg-base-900'}`}>
                <p className="whitespace-pre-line">{m.text}</p>
                <p className="mt-0.5 text-[10px] text-base-500">
                  {m.from === 'admin' ? '(주)이엘씨_대치남' : '작성자'} · {fmtDateTime(m.at)}
                </p>
              </div>
            </div>
          ))}
          <div className="flex gap-1.5">
            <input className={inputCls + ' !py-2'} value={text} onChange={(e) => setText(e.target.value)} placeholder="추가로 남길 말씀" />
            <button onClick={reply} disabled={sending || !text.trim()} className="focus-ring shrink-0 rounded-lg bg-mist-500 px-3 text-base-950 disabled:opacity-40">
              <Send size={15} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function ClientPortal() {
  const [params, setParams] = useSearchParams()
  const code = params.get('c')
  const [tab, setTab] = useState(params.get('tab') || 'new')
  const [state, setState] = useState({ loading: true, error: null, data: null })
  const [justSent, setJustSent] = useState(false)
  const [reportMonth, setReportMonth] = useState(null)

  const load = () =>
    api
      .clientPortalLoad(code)
      .then((data) => setState({ loading: false, error: null, data }))
      .catch((err) => setState({ loading: false, error: err.message, data: null }))
  useEffect(() => {
    if (!code) setState({ loading: false, error: '잘못된 링크입니다', data: null })
    else load()
  }, [code])

  const go = (t) => {
    setTab(t)
    setReportMonth(null)
    setJustSent(false)
    const next = new URLSearchParams(params)
    next.set('tab', t)
    setParams(next, { replace: true })
  }

  if (state.loading || state.error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-page-bg px-4">
        <p className="text-sm text-page-sub">{state.loading ? '불러오는 중…' : state.error}</p>
      </div>
    )
  }

  const { site, tickets, reports, visits, executions } = state.data
  const report = reportMonth && reports.find((r) => r.month === reportMonth)

  return (
    <div className="min-h-screen bg-page-bg px-3 pb-10 pt-6 sm:px-6">
      <div className="mx-auto max-w-2xl">
        <div className="no-print mb-4">
          <p className="text-[11px] text-page-sub">(주)이엘씨_대치남 고객 전용</p>
          <p className="text-lg font-semibold text-page-text">{site.name}</p>
        </div>

        <div className="no-print mb-4 flex gap-1 rounded-xl border border-page-border bg-page-soft p-1">
          {[
            ['new', '문의 남기기', PenLine],
            ['tickets', `문의 내역${tickets.length ? ` ${tickets.length}` : ''}`, MessagesSquare],
            ['reports', '월간 보고서', FileText]
          ].map(([key, label, Icon]) => (
            <button
              key={key}
              onClick={() => go(key)}
              className={`focus-ring flex flex-1 items-center justify-center gap-1 rounded-lg py-2 text-xs sm:text-sm ${
                tab === key ? 'bg-base-950 font-medium text-base-100' : 'text-page-sub'
              }`}
            >
              <Icon size={14} /> {label}
            </button>
          ))}
        </div>

        <div className="rounded-xl border border-base-800 bg-base-950 p-4 text-base-100 shadow-sm">
          {tab === 'new' &&
            (justSent ? (
              <div className="py-8 text-center">
                <CheckCircle2 size={36} className="mx-auto mb-2 text-teal-500" />
                <p className="font-medium">접수되었습니다.</p>
                <p className="mt-1 text-xs text-base-500">확인 후 답변드리겠습니다. 답변은 "문의 내역"에서 보실 수 있어요.</p>
                <div className="mt-4 flex justify-center gap-2">
                  <button onClick={() => go('tickets')} className="rounded-lg border border-base-700 px-3 py-2 text-xs">
                    문의 내역 보기
                  </button>
                  <button onClick={() => setJustSent(false)} className="rounded-lg border border-base-700 px-3 py-2 text-xs">
                    하나 더 남기기
                  </button>
                </div>
              </div>
            ) : (
              <>
                <p className="mb-3 text-xs text-base-500">질문, 불편 사항, 개선 요청을 남겨 주시면 확인 후 이 페이지로 답변드립니다.</p>
                <NewTicket
                  code={code}
                  onDone={() => {
                    setJustSent(true)
                    load()
                  }}
                />
              </>
            ))}

          {tab === 'tickets' &&
            (tickets.length === 0 ? (
              <p className="py-8 text-center text-xs text-base-500">남기신 문의가 없어요.</p>
            ) : (
              <div className="space-y-2">
                {tickets.map((t) => (
                  <TicketItem
                    key={t.id}
                    t={t}
                    code={code}
                    onUpdated={(nt) => setState((s) => ({ ...s, data: { ...s.data, tickets: s.data.tickets.map((x) => (x.id === nt.id ? nt : x)) } }))}
                  />
                ))}
              </div>
            ))}

          {tab === 'reports' &&
            (report ? (
              <div>
                <div className="no-print mb-3 flex items-center justify-between">
                  <button onClick={() => setReportMonth(null)} className="flex items-center gap-0.5 text-xs text-base-400">
                    <ChevronLeft size={14} /> 목록
                  </button>
                  <button onClick={() => window.print()} className="flex items-center gap-1 rounded-lg border border-base-700 px-2.5 py-1.5 text-xs text-base-300">
                    <Printer size={13} /> 인쇄/PDF 저장
                  </button>
                </div>
                <div className="print-area">
                  <MonthlyReportDoc
                    siteName={site.name}
                    month={report.month}
                    report={report}
                    data={collectMonth({ month: report.month, visits, tickets, executions })}
                    serviceReportLink={reportLink}
                  />
                </div>
              </div>
            ) : reports.length === 0 ? (
              <p className="py-8 text-center text-xs text-base-500">아직 공개된 보고서가 없어요.</p>
            ) : (
              <div className="space-y-2">
                {reports.map((r) => {
                  const [y, m] = r.month.split('-')
                  return (
                    <button key={r.id} onClick={() => setReportMonth(r.month)} className="flex w-full items-center justify-between rounded-lg border border-base-800 px-3 py-3 text-left hover:border-mist-500">
                      <span className="text-sm font-medium">
                        {y}년 {Number(m)}월 청소 관리 보고서
                      </span>
                      <span className="text-xs text-base-500">{r.rating && `평가 ${r.rating}`}</span>
                    </button>
                  )
                })}
              </div>
            ))}
        </div>
      </div>
    </div>
  )
}
