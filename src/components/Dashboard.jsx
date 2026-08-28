import { useEffect, useState } from 'react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { Users, Clock, AlertTriangle, RefreshCw } from 'lucide-react'
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
  const [state, setState] = useState({ loading: true, error: null, daily: [], total: 0, records: [] })

  const load = () => {
    setState((s) => ({ ...s, loading: true, error: null }))
    api
      .getAttendanceSummary()
      .then((data) => setState({ loading: false, error: null, ...data }))
      .catch((err) => setState((s) => ({ ...s, loading: false, error: err.message })))
  }

  useEffect(load, [])

  const today = state.daily?.[state.daily.length - 1]
  const lateCount = (state.daily || []).reduce((sum, d) => sum + (d.late || 0), 0)

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-base-100">출퇴근 대시보드</h1>
          <p className="mt-1 text-sm text-base-400">기존 출퇴근 앱 데이터를 한눈에 모아봅니다.</p>
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
          {state.error}. attendance 함수의 스토어명·데이터 구조가 실제 기존 앱과 맞는지 확인이 필요해요.
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard icon={Users} label="오늘 출근 인원" value={state.loading ? '—' : today?.checkedIn ?? 0} />
        <StatCard icon={Clock} label="오늘 퇴근 처리" value={state.loading ? '—' : today?.checkedOut ?? 0} />
        <StatCard icon={AlertTriangle} label="누적 지각" value={state.loading ? '—' : lateCount} tone="amber" />
      </div>

      <div className="mt-6 rounded-xl border border-base-800 bg-base-950 p-4">
        <p className="mb-4 text-sm font-medium text-base-200">일별 출퇴근 추이</p>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={state.daily || []}>
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
              <Area type="monotone" dataKey="checkedIn" stroke="#38BFAE" fill="url(#checkedIn)" strokeWidth={2} name="출근" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        {!state.loading && (state.daily || []).length === 0 && !state.error && (
          <p className="py-8 text-center text-sm text-base-500">아직 표시할 출퇴근 데이터가 없어요.</p>
        )}
      </div>
    </div>
  )
}
