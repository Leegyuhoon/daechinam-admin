import { useEffect, useState } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
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
  Timer,
  ListChecks,
  Trophy
} from 'lucide-react'
import { api } from '../lib/api'
import { hoursOf } from '../lib/hours'

const LONG_SHIFT_HOURS = 12 // 이 시간을 넘으면 "장시간 근무"로 표시
const PIE_COLORS = ['#129983', '#0E7A6C', '#5FD9C9', '#0B6355', '#7C8790', '#AEB6BC', '#C97F0A']

function StatCard({ icon: Icon, label, value, tone = 'mist' }) {
  const toneClass = tone === 'amber' ? 'text-amber-500 bg-amber-500/10' : 'text-mist-500 bg-mist-500/10'
  return (
    <div className="rounded-xl border border-base-800 bg-base-950 p-4 shadow-sm">
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
    <div className="rounded-xl border border-base-800 bg-base-950 p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-sm font-medium text-base-200">
          <Icon size={15} className="text-mist-500" /> {title}
        </p>
        {badge != null && badge > 0 && (
          <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-medium text-amber-500">
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

const formatTime = (iso) => {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Seoul'
  })
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
  const chartData = (state.daily || []).slice(-10) // 도넛 가독성을 위해 최근 10일만
  const leaders = (state.roster || []).filter((w) => w.isTeamLead)

  const outFlagRecords = (state.records || []).filter((r) => r.outFlag)
  const longShiftRecords = (state.records || []).filter((r) => hoursOf(r) >= LONG_SHIFT_HOURS)
  const alerts = [
    ...outFlagRecords.map((r) => ({ ...r, kind: '반경 이탈' })),
    ...longShiftRecords.map((r) => ({ ...r, kind: '장시간 근무' }))
  ].sort((a, b) => (b.date || '').localeCompare(a.date || ''))

  const todayDate = today?.date || null
  const todayRecords = (state.records || [])
    .filter((r) => r.date === todayDate)
    .sort((a, b) => (a.clockIn || '').localeCompare(b.clockIn || ''))

  // 이번달 근무시간 TOP5
  const thisMonth = new Date().toISOString().slice(0, 7)
  const hoursByWorker = {}
  for (const r of state.records || []) {
    if (!r.date?.startsWith(thisMonth)) continue
    hoursByWorker[r.workerId] = (hoursByWorker[r.workerId] || 0) + hoursOf(r)
  }
  const nameById = Object.fromEntries((state.roster || []).map((w) => [w.id, w.name]))
  const topWorkers = Object.entries(hoursByWorker)
    .map(([id, hours]) => ({ id, name: nameById[id] || '알수없음', hours }))
    .sort((a, b) => b.hours - a.hours)
    .slice(0, 5)
  const topMax = topWorkers[0]?.hours || 1

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-base-100">출퇴근 대시보드</h1>
          <p className="mt-1 text-sm text-base-400">daechinam.netlify.app 현장 데이터를 한 화면에 모아봅니다.</p>
        </div>
        <button
          onClick={load}
          className="focus-ring flex items-center gap-1.5 rounded-lg border border-base-800 bg-base-950 px-3 py-1.5 text-xs text-base-300 hover:bg-base-800"
        >
          <RefreshCw size={14} className={state.loading ? 'animate-spin' : ''} />
          새로고침
        </button>
      </div>

      {state.error && (
        <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-amber-500">
          {state.error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard icon={Users} label="오늘 출근 기록" value={state.loading ? '—' : today?.checkedIn ?? 0} />
        <StatCard icon={Users} label="현재 근무중" value={state.loading ? '—' : state.ongoing?.length ?? 0} />
        <StatCard icon={Building2} label="등록 현장" value={state.loading ? '—' : state.siteCount ?? 0} />
        <StatCard icon={MapPinOff} label="반경 이탈 누적" value={state.loading ? '—' : outFlagTotal} tone="amber" />
      </div>

      <div className="mt-6 rounded-xl border border-base-800 bg-base-950 p-4 shadow-sm">
        <p className="mb-3 flex items-center gap-1.5 text-sm font-medium text-base-200">
          <ListChecks size={15} className="text-mist-500" />
          오늘 출퇴근 명단 {todayDate && <span className="text-xs font-normal text-base-500">({todayDate})</span>}
        </p>
        {todayRecords.length === 0 ? (
          <p className="py-4 text-center text-sm text-base-500">오늘 출퇴근 기록이 없어요.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-base-800 text-left text-xs text-base-500">
                  <th className="py-2 pr-4 font-medium">이름</th>
                  <th className="py-2 pr-4 font-medium">현장</th>
                  <th className="py-2 pr-4 font-medium">출근</th>
                  <th className="py-2 pr-4 font-medium">퇴근</th>
                  <th className="py-2 font-medium">상태</th>
                </tr>
              </thead>
              <tbody>
                {todayRecords.map((r) => (
                  <tr key={r.id} className="border-b border-base-800/60 last:border-0">
                    <td className="py-2 pr-4 text-base-100">{r.workerName}</td>
                    <td className="py-2 pr-4 text-base-400">{r.site}</td>
                    <td className="py-2 pr-4 text-base-300">{formatTime(r.clockIn)}</td>
                    <td className="py-2 pr-4 text-base-300">{formatTime(r.clockOut)}</td>
                    <td className="py-2">
                      {r.outFlag ? (
                        <span className="flex items-center gap-1 text-xs text-amber-500">
                          <MapPinOff size={12} /> 반경 이탈
                        </span>
                      ) : r.ongoing ? (
                        <span className="text-xs text-mist-500">근무중</span>
                      ) : (
                        <span className="text-xs text-base-500">완료</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-base-800 bg-base-950 p-4 shadow-sm lg:col-span-2">
          <p className="mb-3 text-sm font-medium text-base-200">최근 출퇴근 추이 (최근 10일)</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="checkedIn"
                  nameKey="date"
                  innerRadius="45%"
                  outerRadius="80%"
                  paddingAngle={2}
                >
                  {chartData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: '#FFFFFF', border: '1px solid #D8DEE1', borderRadius: 8, fontSize: 12 }}
                  formatter={(value, _name, entry) => [`${value}건`, entry.payload.date]}
                />
                <Legend
                  layout="vertical"
                  align="right"
                  verticalAlign="middle"
                  wrapperStyle={{ fontSize: 11, color: '#576068' }}
                />
              </PieChart>
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

        <Panel title="이번달 근무시간 TOP5" icon={Trophy}>
          {topWorkers.length === 0 ? (
            <p className="text-sm text-base-500">이번달 근무 기록이 없어요.</p>
          ) : (
            <ul className="space-y-2.5">
              {topWorkers.map((w, i) => (
                <li key={w.id}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-base-200">
                      <span className="text-base-500">{i + 1}</span> {w.name}
                    </span>
                    <span className="text-base-400">{w.hours.toFixed(1)}h</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-base-800">
                    <div
                      className="h-1.5 rounded-full bg-mist-500"
                      style={{ width: `${Math.max(6, (w.hours / topMax) * 100)}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
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
                      a.kind === '반경 이탈' ? 'bg-amber-500/15 text-amber-500' : 'bg-base-800 text-base-400'
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

        <div className="rounded-xl border border-base-800 bg-base-950 p-4 shadow-sm">
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
                  {r.outFlag && <TriangleAlert size={14} className="text-amber-500" />}
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
                  {n.siteName && <p className="mt-1 text-[11px] text-mist-500">{n.siteName}</p>}
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
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
                  <p className="mt-1 text-[11px] text-mist-500">
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
                        ? 'bg-mist-500/15 text-mist-500'
                        : 'bg-amber-500/15 text-amber-500'
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
