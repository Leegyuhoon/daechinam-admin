import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Lock,
  Plus,
  Trash2,
  Pencil,
  X,
  Copy,
  Check,
  Building2,
  ChevronDown,
  ChevronRight,
  Target,
  Timer,
  Users,
  TriangleAlert,
  ListChecks
} from 'lucide-react'
import { api } from '../lib/api'
import SiteChecklist from './SiteChecklist'

const emptyReport = () => ({
  companyName: '',
  password: '',
  siteName: '',
  kpi: { cleanliness: '', complaintSLA: '', reworkRate: '', emergencyResponse: '' },
  responseTimes: {
    minorConfirm: '',
    minorAction: '',
    complaintConfirm: '',
    complaintAction: '',
    emergencyInitial: '',
    emergencyFull: ''
  },
  reviewMeetings: { monthly: '', quarterly: '' },
  escalation: { minor: '', major: '', critical: '' }
})

function PasswordGate({ onOk }) {
  const [pw, setPw] = useState('')
  const [error, setError] = useState(null)
  const [checking, setChecking] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError(null)
    setChecking(true)
    try {
      await api.verifyClientAdminPassword(pw)
      onOk()
    } catch (err) {
      setError(err.message)
    } finally {
      setChecking(false)
    }
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <form onSubmit={submit} className="w-full max-w-sm rounded-xl border border-base-800 bg-base-950 p-6 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-mist-500/15 text-mist-500">
            <Lock size={16} />
          </div>
          <p className="text-sm font-semibold text-base-100">업체 보고 관리</p>
        </div>
        <p className="mb-4 text-xs text-base-400">업체별 보고 카테고리를 만들고 관리하려면 비밀번호가 필요해요.</p>
        <input
          type="password"
          autoFocus
          className="focus-ring w-full rounded-lg border border-base-700 bg-base-900 px-3 py-2.5 text-sm"
          placeholder="관리자 비밀번호"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
        />
        {error && <p className="mt-2 text-xs text-amber-500">{error}</p>}
        <button
          type="submit"
          disabled={checking}
          className="focus-ring mt-3 w-full rounded-lg bg-mist-500 px-4 py-2.5 text-sm font-medium text-base-950 hover:bg-mist-400 disabled:opacity-50"
        >
          {checking ? '확인 중…' : '들어가기'}
        </button>
      </form>
    </div>
  )
}

function Field({ label, value, onChange, placeholder }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs text-base-400">{label}</span>
      <input
        className="focus-ring w-full rounded-lg border border-base-700 bg-base-900 px-3 py-2 text-sm"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  )
}

function FormGroup({ icon: Icon, title, children }) {
  return (
    <div className="rounded-lg border border-base-800 bg-base-900 p-3">
      <p className="mb-3 flex items-center gap-1.5 text-xs font-medium text-base-300">
        <Icon size={13} className="text-mist-500" /> {title}
      </p>
      <div className="grid gap-3 sm:grid-cols-2">{children}</div>
    </div>
  )
}

function ReportForm({ initialReport, onSaved, onCancel }) {
  const [report, setReport] = useState(initialReport || emptyReport())
  const [siteNames, setSiteNames] = useState([])
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api
      .getAttendanceSummary()
      .then((att) => setSiteNames(att.allSiteNames || []))
      .catch(() => {})
  }, [])

  const setKpi = (key, value) => setReport((r) => ({ ...r, kpi: { ...r.kpi, [key]: value } }))
  const setRt = (key, value) => setReport((r) => ({ ...r, responseTimes: { ...r.responseTimes, [key]: value } }))
  const setRm = (key, value) => setReport((r) => ({ ...r, reviewMeetings: { ...r.reviewMeetings, [key]: value } }))
  const setEsc = (key, value) => setReport((r) => ({ ...r, escalation: { ...r.escalation, [key]: value } }))

  const save = async () => {
    setError(null)
    if (!report.companyName.trim() || !report.password.trim()) {
      setError('업체명과 비밀번호를 입력해주세요.')
      return
    }
    setSaving(true)
    try {
      await api.upsertClientReport(report)
      onSaved()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-xl border border-base-800 bg-base-950 p-4">
      <p className="mb-3 text-sm font-medium text-base-200">
        {initialReport ? '업체 보고 수정' : '새 업체 보고 등록'}
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <input
          className="focus-ring rounded-lg border border-base-700 bg-base-900 px-3 py-2 text-sm"
          placeholder="업체명 (예: 메트라이프 본사)"
          value={report.companyName}
          onChange={(e) => setReport({ ...report, companyName: e.target.value })}
        />
        <input
          className="focus-ring rounded-lg border border-base-700 bg-base-900 px-3 py-2 text-sm"
          placeholder="이 업체 담당자에게 알려줄 비밀번호"
          value={report.password}
          onChange={(e) => setReport({ ...report, password: e.target.value })}
        />
        <label className="block sm:col-span-2">
          <span className="mb-1 block text-xs text-base-400">
            연동할 현장 (이 현장의 실제 출퇴근 기록이 "일일 체크리스트"로 자동 표시돼요)
          </span>
          <select
            className="focus-ring w-full rounded-lg border border-base-700 bg-base-900 px-3 py-2 text-sm"
            value={report.siteName}
            onChange={(e) => setReport({ ...report, siteName: e.target.value })}
          >
            <option value="">연동 안 함</option>
            {siteNames.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-4 space-y-3">
        <FormGroup icon={Target} title="서비스 품질지표(KPI) 목표">
          <Field label="청결도" value={report.kpi.cleanliness} onChange={(v) => setKpi('cleanliness', v)} placeholder="예: 90% 이상" />
          <Field label="민원처리 SLA" value={report.kpi.complaintSLA} onChange={(v) => setKpi('complaintSLA', v)} placeholder="예: 95% 이상" />
          <Field label="작업누락·재작업 발생률" value={report.kpi.reworkRate} onChange={(v) => setKpi('reworkRate', v)} placeholder="예: 3% 이하" />
          <Field label="긴급대응 처리시간" value={report.kpi.emergencyResponse} onChange={(v) => setKpi('emergencyResponse', v)} placeholder="예: 5분 이내 100%" />
        </FormGroup>

        <FormGroup icon={Timer} title="유형별 대응 처리시간">
          <Field label="청소 미흡 — 현장확인" value={report.responseTimes.minorConfirm} onChange={(v) => setRt('minorConfirm', v)} placeholder="예: 30분 이내" />
          <Field label="청소 미흡 — 조치" value={report.responseTimes.minorAction} onChange={(v) => setRt('minorAction', v)} placeholder="예: 1시간 이내" />
          <Field label="고객 민원 — 현장확인" value={report.responseTimes.complaintConfirm} onChange={(v) => setRt('complaintConfirm', v)} placeholder="예: 10분 이내" />
          <Field label="고객 민원 — 조치" value={report.responseTimes.complaintAction} onChange={(v) => setRt('complaintAction', v)} placeholder="예: 1시간 이내" />
          <Field label="긴급 오염 — 초동조치" value={report.responseTimes.emergencyInitial} onChange={(v) => setRt('emergencyInitial', v)} placeholder="예: 5분 이내" />
          <Field label="긴급 오염 — 본조치" value={report.responseTimes.emergencyFull} onChange={(v) => setRt('emergencyFull', v)} placeholder="예: 2시간 이내" />
        </FormGroup>

        <FormGroup icon={Users} title="정기 운영 리뷰">
          <Field label="월간 운영리뷰 참석자" value={report.reviewMeetings.monthly} onChange={(v) => setRm('monthly', v)} placeholder="예: 현장소장 ↔ 회사 시설관리 담당자" />
          <Field label="분기 경영리뷰 참석자" value={report.reviewMeetings.quarterly} onChange={(v) => setRm('quarterly', v)} placeholder="예: 본사 운영관리 임원 ↔ 회사 책임자" />
        </FormGroup>

        <FormGroup icon={TriangleAlert} title="이슈 등급별 에스컬레이션">
          <Field label="경미" value={report.escalation.minor} onChange={(v) => setEsc('minor', v)} placeholder="예: 현장책임자 자체 처리" />
          <Field label="중대" value={report.escalation.major} onChange={(v) => setEsc('major', v)} placeholder="예: 현장→본사(2시간 이내)" />
          <Field label="긴급" value={report.escalation.critical} onChange={(v) => setEsc('critical', v)} placeholder="예: 현장→본사→고객사(즉시)" />
        </FormGroup>
      </div>

      {error && <p className="mt-3 text-xs text-amber-500">{error}</p>}

      <div className="mt-4 flex gap-2">
        <button
          onClick={save}
          disabled={saving}
          className="focus-ring rounded-lg bg-mist-500 px-4 py-2 text-sm font-medium text-base-950 hover:bg-mist-400 disabled:opacity-50"
        >
          {saving ? '저장 중…' : initialReport ? '수정 저장' : '등록'}
        </button>
        <button onClick={onCancel} className="focus-ring rounded-lg border border-base-700 px-4 py-2 text-sm text-base-300">
          취소
        </button>
      </div>
    </div>
  )
}

function CopyLinkButton({ url }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // 클립보드 권한이 없으면 조용히 무시
    }
  }
  return (
    <button
      onClick={copy}
      className="focus-ring flex items-center gap-1 rounded-full border border-base-800 px-2 py-1 text-[11px] text-base-400 hover:bg-base-800"
    >
      {copied ? <Check size={11} className="text-mist-500" /> : <Copy size={11} />}
      {copied ? '복사됨' : '링크 복사'}
    </button>
  )
}

function SummaryRow({ label, value }) {
  if (!value) return null
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-base-500">{label}</span>
      <span className="font-medium text-base-200">{value}</span>
    </div>
  )
}

export default function ClientReports() {
  const navigate = useNavigate()
  const [unlocked, setUnlocked] = useState(false)
  const [checkingStored, setCheckingStored] = useState(true)
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingReport, setEditingReport] = useState(null)
  const [openId, setOpenId] = useState(null)

  const load = () => {
    setLoading(true)
    api.listClientReports().then(({ items }) => setReports(items)).finally(() => setLoading(false))
  }

  useEffect(() => {
    const stored = localStorage.getItem('daechinam_client_admin_pw')
    if (stored) {
      api
        .verifyClientAdminPassword(stored)
        .then(() => setUnlocked(true))
        .catch(() => {})
        .finally(() => setCheckingStored(false))
    } else {
      setCheckingStored(false)
    }
  }, [])

  useEffect(() => {
    if (unlocked) load()
  }, [unlocked])

  const openNew = () => {
    setEditingReport(null)
    setShowForm(true)
  }
  const openEdit = (r) => {
    setEditingReport(r)
    setShowForm(true)
  }
  const remove = async (id) => {
    if (!confirm('이 업체 보고를 삭제할까요? 삭제하면 되돌릴 수 없어요.')) return
    await api.deleteClientReport(id)
    load()
  }

  if (checkingStored) return null
  if (!unlocked) return <PasswordGate onOk={() => setUnlocked(true)} />

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold text-base-100">업체 보고</h1>
        <div className="flex gap-2">
          <button
            onClick={() => navigate(-1)}
            className="focus-ring flex items-center gap-1.5 rounded-lg border border-base-800 px-3 py-1.5 text-xs text-base-300 hover:bg-base-800"
          >
            <ArrowLeft size={14} /> 뒤로가기
          </button>
          <button
            onClick={() => (showForm ? setShowForm(false) : openNew())}
            className="focus-ring flex items-center gap-1.5 rounded-lg border border-base-800 px-3 py-1.5 text-xs text-base-300 hover:bg-base-800"
          >
            <Plus size={14} /> 업체 추가
          </button>
          <button
            onClick={() => {
              api.clearClientAdminPassword()
              setUnlocked(false)
            }}
            className="focus-ring flex items-center gap-1.5 rounded-lg border border-base-800 px-3 py-1.5 text-xs text-base-300 hover:bg-base-800"
          >
            <Lock size={14} />
          </button>
        </div>
      </div>

      {showForm && (
        <div className="mb-6">
          <ReportForm
            key={editingReport?.id || 'new'}
            initialReport={editingReport}
            onSaved={() => {
              setShowForm(false)
              setEditingReport(null)
              load()
            }}
            onCancel={() => {
              setShowForm(false)
              setEditingReport(null)
            }}
          />
        </div>
      )}

      {loading ? (
        <p className="p-8 text-center text-sm text-base-500">불러오는 중…</p>
      ) : reports.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-base-800 bg-base-950 p-10 text-base-500">
          <Building2 size={28} />
          <p className="text-sm">등록된 업체 보고가 없어요.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {reports.map((r) => {
            const isOpen = openId === r.id
            const link = `${window.location.origin}/client-report?id=${r.id}`
            const kpi = r.kpi || {}
            const rt = r.responseTimes || {}
            const rm = r.reviewMeetings || {}
            const esc = r.escalation || {}
            return (
              <div key={r.id} className="rounded-xl border border-base-800 bg-base-950 shadow-sm">
                <button
                  onClick={() => setOpenId(isOpen ? null : r.id)}
                  className="focus-ring flex w-full items-center justify-between p-4 text-left"
                >
                  <div className="flex items-center gap-3">
                    {isOpen ? (
                      <ChevronDown size={16} className="shrink-0 text-base-500" />
                    ) : (
                      <ChevronRight size={16} className="shrink-0 text-base-500" />
                    )}
                    <p className="font-medium text-base-100">{r.companyName}</p>
                  </div>
                </button>

                {isOpen && (
                  <div className="border-t border-base-800 p-4 pt-3">
                    <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg bg-base-900 px-3 py-2">
                      <span className="truncate text-xs text-base-400">{link}</span>
                      <CopyLinkButton url={link} />
                    </div>
                    <p className="mb-3 text-xs text-base-500">
                      비밀번호: <span className="font-medium text-base-300">{r.password}</span> — 이 링크와 비밀번호를 업체 담당자에게 전달하세요.
                    </p>

                    <div className="mb-3 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-lg bg-base-900 p-3">
                        <p className="mb-1.5 flex items-center gap-1 text-xs font-medium text-base-200">
                          <Target size={12} className="text-mist-500" /> KPI 목표
                        </p>
                        <SummaryRow label="청결도" value={kpi.cleanliness} />
                        <SummaryRow label="민원처리 SLA" value={kpi.complaintSLA} />
                        <SummaryRow label="누락·재작업 발생률" value={kpi.reworkRate} />
                        <SummaryRow label="긴급대응 처리시간" value={kpi.emergencyResponse} />
                      </div>
                      <div className="rounded-lg bg-base-900 p-3">
                        <p className="mb-1.5 flex items-center gap-1 text-xs font-medium text-base-200">
                          <Timer size={12} className="text-mist-500" /> 대응 처리시간
                        </p>
                        <SummaryRow label="청소미흡 확인/조치" value={[rt.minorConfirm, rt.minorAction].filter(Boolean).join(' / ')} />
                        <SummaryRow label="고객민원 확인/조치" value={[rt.complaintConfirm, rt.complaintAction].filter(Boolean).join(' / ')} />
                        <SummaryRow label="긴급오염 초동/본조치" value={[rt.emergencyInitial, rt.emergencyFull].filter(Boolean).join(' / ')} />
                      </div>
                      <div className="rounded-lg bg-base-900 p-3">
                        <p className="mb-1.5 flex items-center gap-1 text-xs font-medium text-base-200">
                          <Users size={12} className="text-mist-500" /> 정기 운영 리뷰
                        </p>
                        <SummaryRow label="월간 운영리뷰" value={rm.monthly} />
                        <SummaryRow label="분기 경영리뷰" value={rm.quarterly} />
                      </div>
                      <div className="rounded-lg bg-base-900 p-3">
                        <p className="mb-1.5 flex items-center gap-1 text-xs font-medium text-base-200">
                          <TriangleAlert size={12} className="text-mist-500" /> 에스컬레이션
                        </p>
                        <SummaryRow label="경미" value={esc.minor} />
                        <SummaryRow label="중대" value={esc.major} />
                        <SummaryRow label="긴급" value={esc.critical} />
                      </div>
                    </div>

                    {r.siteName && (
                      <div className="mb-3 rounded-lg bg-base-900 p-3">
                        <p className="mb-2 flex items-center gap-1 text-xs font-medium text-base-200">
                          <ListChecks size={12} className="text-teal-500" /> 일일 체크리스트 ({r.siteName})
                        </p>
                        <SiteChecklist siteName={r.siteName} />
                      </div>
                    )}

                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => openEdit(r)}
                        className="focus-ring flex items-center gap-1 text-xs text-base-500 hover:text-mist-500"
                      >
                        <Pencil size={12} /> 수정
                      </button>
                      <button
                        onClick={() => remove(r.id)}
                        className="focus-ring flex items-center gap-1 text-xs text-base-500 hover:text-red-500"
                      >
                        <X size={12} /> 삭제
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
