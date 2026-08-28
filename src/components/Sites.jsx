import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, ChevronRight, Users, MapPinOff, RefreshCw } from 'lucide-react'
import { api } from '../lib/api'
import { hoursOf } from '../lib/hours'

export default function Sites() {
  const [state, setState] = useState({ loading: true, error: null, records: [] })
  const [openSite, setOpenSite] = useState(null)

  const load = () => {
    setState((s) => ({ ...s, loading: true, error: null }))
    api
      .getAttendanceSummary()
      .then((data) => setState({ loading: false, error: null, ...data }))
      .catch((err) => setState((s) => ({ ...s, loading: false, error: err.message })))
  }
  useEffect(load, [])

  const bySite = useMemo(() => {
    const map = {}
    for (const r of state.records || []) {
      const key = r.site || '미지정'
      map[key] = map[key] || []
      map[key].push(r)
    }
    return map
  }, [state.records])

  const siteNames = Object.keys(bySite).sort((a, b) => bySite[b].length - bySite[a].length)

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-base-100">현장 현황</h1>
          <p className="mt-1 text-sm text-base-400">현장별 근무자와 출퇴근 이력을 확인합니다.</p>
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
        <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-amber-400">
          {state.error}
        </div>
      )}

      {state.loading ? (
        <p className="p-8 text-center text-sm text-base-500">불러오는 중…</p>
      ) : siteNames.length === 0 ? (
        <p className="p-8 text-center text-sm text-base-500">표시할 현장 데이터가 없어요.</p>
      ) : (
        <div className="space-y-2">
          {siteNames.map((name) => {
            const records = bySite[name].slice().sort((a, b) => (b.date || '').localeCompare(a.date || ''))
            const workerSet = new Set(records.map((r) => r.workerId))
            const totalHours = records.reduce((sum, r) => sum + hoursOf(r), 0)
            const flagCount = records.filter((r) => r.outFlag).length
            const isOpen = openSite === name

            return (
              <div key={name} className="rounded-xl border border-base-800 bg-base-950">
                <button
                  onClick={() => setOpenSite(isOpen ? null : name)}
                  className="focus-ring flex w-full items-center justify-between p-4 text-left"
                >
                  <div className="flex items-center gap-3">
                    {isOpen ? (
                      <ChevronDown size={16} className="shrink-0 text-base-500" />
                    ) : (
                      <ChevronRight size={16} className="shrink-0 text-base-500" />
                    )}
                    <div>
                      <p className="font-medium text-base-100">{name}</p>
                      <p className="flex items-center gap-1 text-xs text-base-400">
                        <Users size={12} /> {workerSet.size}명
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-right text-xs text-base-400">
                    <span>누적 {totalHours.toFixed(1)}h</span>
                    {flagCount > 0 && (
                      <span className="flex items-center gap-1 text-amber-400">
                        <MapPinOff size={12} /> {flagCount}
                      </span>
                    )}
                  </div>
                </button>

                {isOpen && (
                  <div className="border-t border-base-800 p-4 pt-3">
                    <ul className="space-y-1.5">
                      {records.slice(0, 20).map((r) => (
                        <li
                          key={r.id}
                          className="flex items-center justify-between rounded-lg bg-base-900 px-3 py-2 text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-base-300">{r.date}</span>
                            <span className="text-base-500">{r.workerName}</span>
                          </div>
                          <div className="flex items-center gap-2 text-base-400">
                            {hoursOf(r).toFixed(1)}h
                            {r.ongoing && <span className="text-mist-400">진행중</span>}
                            {r.outFlag && <MapPinOff size={12} className="text-amber-400" />}
                          </div>
                        </li>
                      ))}
                    </ul>
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
