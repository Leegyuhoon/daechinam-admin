import { useEffect, useState } from 'react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import {
  Users,
  Building2,
  TriangleAlert,
  RefreshCw,
  MapPinOff,
  Megaphone,
  ClipboardList,
  PackageCheck,
  Crown,
  Timer
} from 'lucide-react'
import { api } from '../lib/api'
import { hoursOf } from '../lib/hours'
import Heatmap from './Heatmap'

const LONG_SHIFT_HOURS = 12 // 이 시간을 넘으면 "장시간 근무"로 표시

function StatCard({ icon: Icon, label, value, tone = 'mist' }) {
  const toneClass = tone === 'amber' ? 'text-amber-400 bg-amber-500/10' : 'text-mist-400 bg-mist-500/10'
  return (
    <div className="rounded-xl border border-base-800 bg-base-950 p-4">
      <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-lg ${toneClass}`}>
        <Icon size={18} strokeWidth={2.2} />
      </div>
      <p className="text-2xl font-semibold text-base-100">{value}</p>
      <p className="mt-0.5 text-xs text-base-400">{label}</p>
    </div>
  )
}

function Panel({ title, icon: Icon, children, badge }) {
  return (
    <div className="rounded-xl border border-base-800 bg-base-950 p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-sm font-medium text-base-200">
          <Icon size={15} className="text-mist-400" /> {title}
        </p>
        {badge != null && badge > 0 && (
          <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-medium text-amber-400">
            {badge}
          </span>
        )}
      </div>
      {children}
    </div>
  )
}

const timeAgo = (iso) => {
  if (!iso) return ''
  const diffMin = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (diffMin < 60) return `${diffMin}분 전`
  if (diffMin < 1440) return `${Math.floor(diffMin / 60)}시간 전`
  return `${Math.floor(diffMin / 1440)}일 전`
}

export default function Dashboard() {
  const [state, setState] = useState({
    loading: true,
    error: null,
    daily: [],
    ongoing: [],
    siteBreakdown: [],
    roster: [],
    notices: [],
    siteReports: [],
    supplyRequests: [],
    pendingSupplyCount: 0
  })

  const load = () => {
    setState((s) => ({ ...s, loading: true, error: null }))
    api
      .getAttendanceSummary()
      .then((data) => setState({ loading: false, error: null, ...data }))
      .catch((err) => setState((s) => ({ ...s, loading: false, error: err.message })))
  }

  useEffect(load, [])

  const today = state.daily?.[state.daily.length - 1]
  const outFlagTotal = (state.daily || []).reduce((sum, d) => sum + (d.outFlag || 0), 0)
  const chartData = (state.daily || []).slice(-14)
  const leaders = (state.roster || []).filter((w) => w.isTeamLead)

  const outFlagRecords = (state.records || []).filter((r) => r.outFlag)
  const longShiftRecords = (state.records || []).filter((r) => hoursOf(r) >= LONG_SHIFT_HOURS)
  const alerts = [
    ...outFlagRecords.map((r) => ({ ...r, kind: '반경 이탈' })),
    ...longShiftRecords.map((r) => ({ ...r, kind: '장시간 근무' }))
  ].sort((a, b) => (b.date || '').localeCompare(a.date || ''))

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-base-100">출퇴근 대시보드</h1>
          <p className="mt-1 text-sm text-base-400">daechinam.netlify.app 현장 데이터를 한 화면에 모아봅니다.</p>
        </div>
        <button
          onClick={load}
          className="focus-ring flex items-center gap-1.5 rounded-lg border border-base-800 px-3 py-1.5 text-xs text-base-300 hover:bg-base-800"
        >
          <RefreshCw size={14} className={state.loading ? 'animate-spin' : ''} />
          새로고침
        </button>
      </div>

      {state.error && (
        <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-amber-400">
          {state.error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard icon={Users} label="오늘 출근 기록" value={state.loading ? '—' : today?.checkedIn ?? 0} />
        <StatCard icon={Users} label="현재 근무중" value={state.loading ? '—' : state.ongoing?.length ?? 0} />
        <StatCard icon={Building2} label="등록 현장" value={state.loading ? '—' : state.siteCount ?? 0} />
        <StatCard icon={MapPinOff} label="반경 이탈 누적" value={state.loading ? '—' : outFlagTotal} tone="amber" />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-base-800 bg-base-950 p-4 lg:col-span-2">
          <p className="mb-3 text-sm font-medium text-base-200">출근 히트맵 (최근 12주)</p>
          <Heatmap daily={state.daily} />
        </div>

        <Panel title="이상 근무 알림" icon={TriangleAlert} badge={alerts.length}>
          {alerts.length === 0 ? (
            <p className="text-sm text-base-500">특이사항이 없어요.</p>
          ) : (
            <ul className="space-y-2">
              {alerts.slice(0, 6).map((a) => (
                <li key={`${a.kind}-${a.id}`} className="flex items-center justify-between rounded-lg bg-base-900 px-3 py-2 text-xs">
                  <div>
                    <p className="text-base-100">{a.workerName}</p>
                    <p className="text-base-500">
                      {a.site} · {a.date}
                    </p>
                  </div>
                  <span
                    className={`flex items-center gap-1 rounded-full px-2 py-0.5 ${
                      a.kind === '반경 이탈' ? 'bg-amber-500/15 text-amber-400' : 'bg-base-800 text-base-300'
                    }`}
                  >
                    {a.kind === '반경 이탈' ? <MapPinOff size={11} /> : <Timer size={11} />}
                    {a.kind}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-base-800 bg-base-950 p-4 lg:col-span-2">
          <p className="mb-4 text-sm font-medium text-base-200">최근 출퇴근 추이 (최근 14일)</p>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="checkedIn" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#38BFAE" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#38BFAE" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#262E37" vertical={false} />
                <XAxis dataKey="date" stroke="#6B7684" fontSize={11} tickLine={false} />
                <YAxis stroke="#6B7684" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: '#1D232A', border: '1px solid #333D48', borderRadius: 8, fontSize: 12 }}
                />
                <Area type="monotone" dataKey="checkedIn" stroke="#38BFAE" fill="url(#checkedIn)" strokeWidth={2} name="출근 기록" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          {!state.loading && chartData.length === 0 && !state.error && (
            <p className="py-8 text-center text-sm text-base-500">아직 표시할 출퇴근 데이터가 없어요.</p>
          )}

          {(state.siteBreakdown || []).length > 0 && (
            <div className="mt-4 border-t border-base-800 pt-4">
              <p className="mb-2 text-xs text-base-400">현장별 근무 횟수</p>
              <div className="space-y-1.5">
                {state.siteBreakdown.slice(0, 6).map((s) => {
                  const max = state.siteBreakdown[0]?.count || 1
                  return (
                    <div key={s.name} className="flex items-center gap-2 text-xs">
                      <span className="w-24 shrink-0 truncate text-base-300">{s.name}</span>
                      <div className="h-1.5 flex-1 rounded-full bg-base-800">
                        <div
                          className="h-1.5 rounded-full bg-mist-500"
                          style={{ width: `${Math.max(6, (s.count / max) * 100)}%` }}
                        />
                      </div>
                      <span className="w-6 shrink-0 text-right text-base-400">{s.count}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-base-800 bg-base-950 p-4">
          <p className="mb-4 text-sm font-medium text-base-200">현재 근무중 ({state.ongoing?.length ?? 0}명)</p>
          {state.loading ? (
            <p className="text-sm text-base-500">불러오는 중…</p>
          ) : (state.ongoing || []).length === 0 ? (
            <p className="text-sm text-base-500">현재 출근 중인 인원이 없어요.</p>
          ) : (
            <ul className="space-y-2">
              {state.ongoing.map((r) => (
                <li key={r.id} className="flex items-center justify-between rounded-lg bg-base-900 px-3 py-2 text-sm">
                  <div>
                    <p className="text-base-100">{r.workerName}</p>
                    <p className="text-xs text-base-400">{r.site}</p>
                  </div>
                  {r.outFlag && <TriangleAlert size={14} className="text-amber-400" />}
                </li>
              ))}
            </ul>
          )}

          {leaders.length > 0 && (
            <div className="mt-4 border-t border-base-800 pt-4">
              <p className="mb-2 flex items-center gap-1 text-xs text-base-400">
                <Crown size={12} /> 팀장
              </p>
              <div className="flex flex-wrap gap-1.5">
                {leaders.map((l) => (
                  <span key={l.id} className="rounded-full bg-base-900 px-2 py-1 text-xs text-base-300">
                    {l.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Panel title="공지사항" icon={Megaphone}>
          {(state.notices || []).length === 0 ? (
            <p className="text-sm text-base-500">공지사항이 없어요.</p>
          ) : (
            <ul className="space-y-3">
              {state.notices.slice(0, 5).map((n) => (
                <li key={n.id} className="text-sm">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-base-100">{n.title}</p>
                    <span className="text-[11px] text-base-500">{timeAgo(n.createdAt)}</span>
                  </div>
                  <p className="mt-0.5 line-clamp-2 whitespace-pre-line text-xs text-base-400">{n.message}</p>
                  {n.siteName && <p className="mt-1 text-[11px] text-mist-400">{n.siteName}</p>}
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="현장 신고·이슈" icon={ClipboardList}>
          {(state.siteReports || []).length === 0 ? (
            <p className="text-sm text-base-500">등록된 현장 신고가 없어요.</p>
          ) : (
            <ul className="space-y-3">
              {state.siteReports.slice(0, 5).map((r) => (
                <li key={r.id} className="text-sm">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-base-100">{r.category || '기타'}</p>
                    <span className="text-[11px] text-base-500">{timeAgo(r.createdAt)}</span>
                  </div>
                  <p className="mt-0.5 line-clamp-2 whitespace-pre-line text-xs text-base-400">{r.note}</p>
                  <p className="mt-1 text-[11px] text-mist-400">
                    {r.siteName} · {r.workerName}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="비품 요청" icon={PackageCheck} badge={state.pendingSupplyCount}>
          {(state.supplyRequests || []).length === 0 ? (
            <p className="text-sm text-base-500">비품 요청이 없어요.</p>
          ) : (
            <ul className="space-y-2">
              {state.supplyRequests.slice(0, 6).map((s) => (
                <li key={s.id} className="flex items-center justify-between rounded-lg bg-base-900 px-3 py-2 text-sm">
                  <div>
                    <p className="text-base-100">
                      {s.itemName} <span className="text-base-400">× {s.qty}</span>
                    </p>
                    <p className="text-xs text-base-400">
                      {s.siteName} · {s.workerName}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] ${
                      s.status === 'delivered'
                        ? 'bg-mist-500/15 text-mist-400'
                        : 'bg-amber-500/15 text-amber-400'
                    }`}
                  >
                    {s.status === 'delivered' ? '완료' : s.status === 'approved' ? '승인' : '대기'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  )
}
