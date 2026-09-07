import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Lock, Building2, Target, Timer, Users, TriangleAlert, ListChecks } from 'lucide-react'
import { api } from '../lib/api'
import SiteChecklist from './SiteChecklist'

function Row({ label, value }) {
  if (!value) return null
  return (
    <div className="flex items-center justify-between border-b border-base-800/60 py-2 text-sm last:border-0">
      <span className="text-base-400">{label}</span>
      <span className="font-medium text-base-100">{value}</span>
    </div>
  )
}

function Card({ icon: Icon, title, children }) {
  return (
    <div className="rounded-xl border border-base-800 bg-base-950 p-4 shadow-sm">
      <p className="mb-2 flex items-center gap-1.5 text-sm font-medium text-base-100">
        <Icon size={15} className="text-mist-500" /> {title}
      </p>
      <div>{children}</div>
    </div>
  )
}

export default function ClientReportView() {
  const [params] = useSearchParams()
  const id = params.get('id')
  const [pw, setPw] = useState('')
  const [error, setError] = useState(null)
  const [checking, setChecking] = useState(false)
  const [data, setData] = useState(null)

  const submit = async (e) => {
    e.preventDefault()
    setError(null)
    if (!id) {
      setError('링크가 올바르지 않아요. 전달받은 링크로 다시 접속해주세요.')
      return
    }
    setChecking(true)
    try {
      const res = await api.viewClientReport(id, pw)
      setData(res)
    } catch (err) {
      setError(err.message)
    } finally {
      setChecking(false)
    }
  }

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-base-900 px-4">
        <form onSubmit={submit} className="w-full max-w-sm rounded-xl border border-base-800 bg-base-950 p-6 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-mist-500/15 text-mist-500">
              <Lock size={16} />
            </div>
            <p className="text-sm font-semibold text-base-100">업체 보고 조회</p>
          </div>
          <p className="mb-4 text-xs text-base-400">전달받으신 비밀번호를 입력해주세요.</p>
          <input
            type="password"
            autoFocus
            className="focus-ring w-full rounded-lg border border-base-700 bg-base-900 px-3 py-2.5 text-sm"
            placeholder="비밀번호"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
          />
          {error && <p className="mt-2 text-xs text-amber-500">{error}</p>}
          <button
            type="submit"
            disabled={checking}
            className="focus-ring mt-3 w-full rounded-lg bg-mist-500 px-4 py-2.5 text-sm font-medium text-base-950 hover:bg-mist-400 disabled:opacity-50"
          >
            {checking ? '확인 중…' : '확인하기'}
          </button>
        </form>
      </div>
    )
  }

  const kpi = data.kpi || {}
  const rt = data.responseTimes || {}
  const rm = data.reviewMeetings || {}
  const esc = data.escalation || {}

  return (
    <div className="min-h-screen bg-base-900 px-4 py-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-mist-500/15 text-mist-500">
            <Building2 size={18} />
          </div>
          <div>
            <p className="text-sm font-semibold text-base-100">{data.companyName}</p>
            <p className="text-xs text-base-400">업체 보고</p>
          </div>
        </div>

        <div className="space-y-3">
          {data.siteName && (
            <Card icon={ListChecks} title={`일일 체크리스트 (${data.siteName})`}>
              <SiteChecklist siteName={data.siteName} />
            </Card>
          )}

          <Card icon={Target} title="서비스 품질지표(KPI) 목표">
            <Row label="청결도" value={kpi.cleanliness} />
            <Row label="민원처리 SLA" value={kpi.complaintSLA} />
            <Row label="작업누락·재작업 발생률" value={kpi.reworkRate} />
            <Row label="긴급대응 처리시간" value={kpi.emergencyResponse} />
          </Card>

          <Card icon={Timer} title="유형별 대응 처리시간">
            <Row label="청소 미흡 — 현장확인" value={rt.minorConfirm} />
            <Row label="청소 미흡 — 조치" value={rt.minorAction} />
            <Row label="고객 민원 — 현장확인" value={rt.complaintConfirm} />
            <Row label="고객 민원 — 조치" value={rt.complaintAction} />
            <Row label="긴급 오염 — 초동조치" value={rt.emergencyInitial} />
            <Row label="긴급 오염 — 본조치" value={rt.emergencyFull} />
          </Card>

          <Card icon={Users} title="정기 운영 리뷰">
            <Row label="월간 운영리뷰 참석자" value={rm.monthly} />
            <Row label="분기 경영리뷰 참석자" value={rm.quarterly} />
          </Card>

          <Card icon={TriangleAlert} title="이슈 등급별 에스컬레이션">
            <Row label="경미" value={esc.minor} />
            <Row label="중대" value={esc.major} />
            <Row label="긴급" value={esc.critical} />
          </Card>
        </div>
      </div>
    </div>
  )
}
