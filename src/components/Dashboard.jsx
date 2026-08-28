import { useEffect, useState } from 'react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { Users, Building2, TriangleAlert, RefreshCw, MapPinOff } from 'lucide-react'
import { api } from '../lib/api'

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

export default function Dashboard() {
  const [state, setState] = useState({
    loading: true,
    error: null,
    daily: [],
    total: 0,
    workerCount: 0,
    siteCount: 0,
    ongoing: []
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

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-base-100">출퇴근 대시보드</h1>
          <p className="mt-1 text-sm text-base-400">daechinam.netlify.app 출퇴근 데이터를 실시간으로 모아봅니다.</p>
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
          <p className="mb-4 text-sm font-medium text-base-200">최근 출퇴근 추이 (최근 14일)</p>
          <div className="h-64">
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
        </div>
      </div>
    </div>
  )
}
