import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, ChevronRight, Clock, MapPinOff, RefreshCw, Building2 } from 'lucide-react'
import { api } from '../lib/api'
import { hoursOf } from '../lib/hours'

export default function Workers() {
  const [state, setState] = useState({ loading: true, error: null, records: [], roster: [] })
  const [openId, setOpenId] = useState(null)

  const load = () => {
    setState((s) => ({ ...s, loading: true, error: null }))
    api
      .getAttendanceSummary()
      .then((data) => setState({ loading: false, error: null, ...data }))
      .catch((err) => setState((s) => ({ ...s, loading: false, error: err.message })))
  }
  useEffect(load, [])

  const byWorker = useMemo(() => {
    const map = {}
    for (const r of state.records || []) {
      map[r.workerId] = map[r.workerId] || []
      map[r.workerId].push(r)
    }
    return map
  }, [state.records])

  const thisMonth = new Date().toISOString().slice(0, 7)

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-base-100">근로자 현황</h1>
          <p className="mt-1 text-sm text-base-400">근로자별 근무시간과 출퇴근 이력을 확인합니다.</p>
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
        <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-amber-500">
          {state.error}
        </div>
      )}

      {state.loading ? (
        <p className="p-8 text-center text-sm text-base-500">불러오는 중…</p>
      ) : (state.roster || []).length === 0 ? (
        <p className="p-8 text-center text-sm text-base-500">등록된 근로자가 없어요.</p>
      ) : (
        <div className="space-y-2">
          {state.roster.map((w) => {
            const records = (byWorker[w.id] || []).slice().sort((a, b) => (b.date || '').localeCompare(a.date || ''))
            const monthHours = records
              .filter((r) => r.date?.startsWith(thisMonth))
              .reduce((sum, r) => sum + hoursOf(r), 0)
            const totalHours = records.reduce((sum, r) => sum + hoursOf(r), 0)
            const flagCount = records.filter((r) => r.outFlag).length
            const isOpen = openId === w.id

            // 현장별로 그룹핑 (한 사람이 여러 현장에서 일할 수 있어서)
            const bySite = {}
            for (const r of records) {
              const key = r.site || '미지정'
              bySite[key] = bySite[key] || []
              bySite[key].push(r)
            }
            const siteNames = Object.keys(bySite).sort(
              (a, b) => bySite[b].reduce((s, r) => s + hoursOf(r), 0) - bySite[a].reduce((s, r) => s + hoursOf(r), 0)
            )
            const multiSite = siteNames.length > 1

            return (
              <div key={w.id} className="rounded-xl border border-base-800 bg-base-950 shadow-sm">
                <button
                  onClick={() => setOpenId(isOpen ? null : w.id)}
                  className="focus-ring flex w-full items-center justify-between p-4 text-left"
                >
                  <div className="flex items-center gap-3">
                    {isOpen ? (
                      <ChevronDown size={16} className="shrink-0 text-base-500" />
                    ) : (
                      <ChevronRight size={16} className="shrink-0 text-base-500" />
                    )}
                    <div>
                      <p className="flex items-center gap-1.5 font-medium text-base-100">
                        {w.name}
                        {w.isTeamLead && (
                          <span className="rounded-full bg-mist-500/15 px-1.5 py-0.5 text-[10px] text-mist-500">팀장</span>
                        )}
                        {multiSite && (
                          <span className="flex items-center gap-0.5 rounded-full bg-base-800 px-1.5 py-0.5 text-[10px] text-base-400">
                            <Building2 size={10} /> {siteNames.length}곳
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-base-400">{w.siteNames.join(', ') || '배정 현장 없음'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-right text-xs text-base-400">
                    <span>이번달 {monthHours.toFixed(1)}h</span>
                    {flagCount > 0 && (
                      <span className="flex items-center gap-1 text-amber-500">
                        <MapPinOff size={12} /> {flagCount}
                      </span>
                    )}
                  </div>
                </button>

                {isOpen && (
                  <div className="border-t border-base-800 p-4 pt-3">
                    <div className="mb-3 flex gap-4 text-xs text-base-400">
                      <span>누적 {totalHours.toFixed(1)}h</span>
                      <span>이번달 {monthHours.toFixed(1)}h</span>
                      <span>기록 {records.length}건</span>
                    </div>

                    {records.length === 0 ? (
                      <p className="text-sm text-base-500">출근 기록이 없어요.</p>
                    ) : (
                      <div className="space-y-4">
                        {siteNames.map((siteName) => {
                          const siteRecords = bySite[siteName]
                            .slice()
                            .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
                          const siteHours = siteRecords.reduce((sum, r) => sum + hoursOf(r), 0)
                          return (
                            <div key={siteName}>
                              {multiSite && (
                                <div className="mb-1.5 flex items-center justify-between">
                                  <p className="flex items-center gap-1 text-xs font-medium text-base-300">
                                    <Building2 size={11} className="text-mist-500" /> {siteName}
                                  </p>
                                  <span className="text-[11px] text-base-500">
                                    {siteHours.toFixed(1)}h · {siteRecords.length}건
                                  </span>
                                </div>
                              )}
                              <ul className="space-y-1.5">
                                {siteRecords.slice(0, 10).map((r) => (
                                  <li
                                    key={r.id}
                                    className="flex items-center justify-between rounded-lg bg-base-900 px-3 py-2 text-xs"
                                  >
                                    <div className="flex items-center gap-2">
                                      <span className="text-base-300">{r.date}</span>
                                      {!multiSite && <span className="text-base-500">{r.site}</span>}
                                    </div>
                                    <div className="flex items-center gap-2 text-base-400">
                                      <Clock size={12} /> {hoursOf(r).toFixed(1)}h
                                      {r.ongoing && <span className="text-mist-500">진행중</span>}
                                      {r.outFlag && <MapPinOff size={12} className="text-amber-500" />}
                                    </div>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )
                        })}
                      </div>
                    )}
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
