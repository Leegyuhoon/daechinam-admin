import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronDown, ChevronRight, Users, MapPinOff, RefreshCw, CalendarDays, ArrowLeft } from 'lucide-react'
import { api } from '../lib/api'
import { hoursOf } from '../lib/hours'

export default function Sites() {
  const navigate = useNavigate()
  const [state, setState] = useState({ loading: true, error: null, records: [] })
  const [openSite, setOpenSite] = useState(null)
  const [openDateKey, setOpenDateKey] = useState(null)

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

  const toggleSite = (name) => {
    setOpenSite(openSite === name ? null : name)
    setOpenDateKey(null) // 현장을 바꾸면 날짜 펼침도 초기화
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-base-100">현장 현황</h1>
        <div className="flex gap-2">
          <button
            onClick={() => navigate(-1)}
            className="focus-ring flex items-center gap-1.5 rounded-lg border border-base-800 bg-base-950 px-3 py-1.5 text-xs text-base-300 hover:bg-base-800"
          >
            <ArrowLeft size={14} /> 뒤로가기
          </button>
          <button
            onClick={load}
            className="focus-ring flex items-center gap-1.5 rounded-lg border border-base-800 bg-base-950 px-3 py-1.5 text-xs text-base-300 hover:bg-base-800"
          >
            <RefreshCw size={14} className={state.loading ? 'animate-spin' : ''} />
            새로고침
          </button>
        </div>
      </div>

      {state.error && (
        <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-amber-500">
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
            const records = bySite[name]
            const workerSet = new Set(records.map((r) => r.workerId))
            const totalHours = records.reduce((sum, r) => sum + hoursOf(r), 0)
            const flagCount = records.filter((r) => r.outFlag).length
            const isSiteOpen = openSite === name

            const byDate = {}
            for (const r of records) {
              const key = r.date || '알수없음'
              byDate[key] = byDate[key] || []
              byDate[key].push(r)
            }
            const dates = Object.keys(byDate).sort((a, b) => b.localeCompare(a))

            return (
              <div key={name} className="rounded-xl border border-base-800 bg-base-950 shadow-sm">
                <button
                  onClick={() => toggleSite(name)}
                  className="focus-ring flex w-full items-center justify-between p-4 text-left"
                >
                  <div className="flex items-center gap-3">
                    {isSiteOpen ? (
                      <ChevronDown size={16} className="shrink-0 text-base-500" />
                    ) : (
                      <ChevronRight size={16} className="shrink-0 text-base-500" />
                    )}
                    <div>
                      <p className="font-medium text-base-100">{name}</p>
                      <p className="flex items-center gap-1 text-xs text-base-400">
                        <Users size={12} className="text-violet-500" /> {workerSet.size}명
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-right text-xs text-base-400">
                    <span>누적 {totalHours.toFixed(1)}h</span>
                    {flagCount > 0 && (
                      <span className="flex items-center gap-1 text-amber-500">
                        <MapPinOff size={12} /> {flagCount}
                      </span>
                    )}
                  </div>
                </button>

                {isSiteOpen && (
                  <div className="space-y-1.5 border-t border-base-800 p-4 pt-3">
                    {dates.map((date) => {
                      const dateKey = `${name}:${date}`
                      const dateRecords = byDate[date]
                      const dateHours = dateRecords.reduce((sum, r) => sum + hoursOf(r), 0)
                      const isDateOpen = openDateKey === dateKey

                      return (
                        <div key={date} className="rounded-lg border border-base-800 bg-base-900">
                          <button
                            onClick={() => setOpenDateKey(isDateOpen ? null : dateKey)}
                            className="focus-ring flex w-full items-center justify-between px-3 py-2 text-left"
                          >
                            <span className="flex items-center gap-1.5 text-xs font-medium text-base-200">
                              {isDateOpen ? (
                                <ChevronDown size={13} className="text-base-500" />
                              ) : (
                                <ChevronRight size={13} className="text-base-500" />
                              )}
                              <CalendarDays size={12} className="text-teal-500" /> {date}
                            </span>
                            <span className="text-[11px] text-base-500">
                              {dateRecords.length}명 · {dateHours.toFixed(1)}h
                            </span>
                          </button>

                          {isDateOpen && (
                            <ul className="space-y-1.5 border-t border-base-800 p-2">
                              {dateRecords.map((r) => (
                                <li
                                  key={r.id}
                                  className="flex items-center justify-between rounded-lg bg-base-950 px-3 py-2 text-xs"
                                >
                                  <span className="text-base-300">{r.workerName}</span>
                                  <div className="flex items-center gap-2 text-base-400">
                                    {hoursOf(r).toFixed(1)}h
                                    {r.ongoing && <span className="text-teal-500">진행중</span>}
                                    {r.outFlag && <MapPinOff size={12} className="text-amber-500" />}
                                  </div>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )
                    })}
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
