import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ChevronDown,
  ChevronRight,
  Users,
  MapPinOff,
  RefreshCw,
  CalendarDays,
  Building2,
  ArrowLeft,
  Wallet
} from 'lucide-react'
import { api } from '../lib/api'
import { hoursOf } from '../lib/hours'

function SiteCard({ name, records, workerCount, totalHours, flagCount, maxHours, isOneOff, isOpen, onToggle }) {
  const byDate = {}
  for (const r of records) {
    const key = r.date || '알수없음'
    byDate[key] = byDate[key] || []
    byDate[key].push(r)
  }
  const dates = Object.keys(byDate).sort((a, b) => b.localeCompare(a))
  const [openDateKey, setOpenDateKey] = useState(null)
  const oneOffTotal = isOneOff ? records.reduce((sum, r) => sum + (r.flatPay || 0), 0) : 0

  return (
    <div className="overflow-hidden rounded-xl border border-base-800 bg-base-950 shadow-sm">
      <button onClick={onToggle} className="focus-ring flex w-full flex-col items-center gap-2 p-4 text-center">
        <div
          className={`flex h-14 w-14 items-center justify-center rounded-full ${
            isOneOff ? 'bg-amber-500/15 text-amber-500' : 'bg-violet-500/15 text-violet-500'
          }`}
        >
          {isOneOff ? <CalendarDays size={22} /> : <Building2 size={24} />}
        </div>
        <span className="text-sm font-medium text-base-100">{name}</span>
        {isOneOff ? (
          <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium text-amber-500">일회성</span>
        ) : (
          <div className="h-1.5 w-full rounded-full bg-base-800">
            <div
              className="h-1.5 rounded-full bg-red-500"
              style={{ width: `${Math.max(6, (totalHours / maxHours) * 100)}%` }}
            />
          </div>
        )}
        <div className="flex items-center gap-2 text-[11px] text-base-500">
          <span className="flex items-center gap-0.5">
            <Users size={10} /> {workerCount}명
          </span>
          {isOneOff ? (
            <span className="flex items-center gap-0.5">
              <Wallet size={10} /> {oneOffTotal.toLocaleString('ko-KR')}원
            </span>
          ) : (
            <span>{totalHours.toFixed(1)}h</span>
          )}
          {flagCount > 0 && (
            <span className="flex items-center gap-0.5 text-amber-500">
              <MapPinOff size={10} /> {flagCount}
            </span>
          )}
        </div>
      </button>

      {isOpen && (
        <div className="space-y-1.5 border-t border-base-800 p-3 pt-3">
          {dates.map((date) => {
            const dateKey = `${name}:${date}`
            const dateRecords = byDate[date]
            const isDateOpen = openDateKey === dateKey

            return (
              <div key={date} className="rounded-lg border border-base-800 bg-base-900">
                <button
                  onClick={() => setOpenDateKey(isDateOpen ? null : dateKey)}
                  className="focus-ring flex w-full items-center justify-between px-2.5 py-1.5 text-left"
                >
                  <span className="flex items-center gap-1 text-[11px] font-medium text-base-200">
                    {isDateOpen ? (
                      <ChevronDown size={11} className="text-base-500" />
                    ) : (
                      <ChevronRight size={11} className="text-base-500" />
                    )}
                    <CalendarDays size={11} className="text-teal-500" /> {date}
                  </span>
                  <span className="text-[10px] text-base-500">{dateRecords.length}명</span>
                </button>

                {isDateOpen && (
                  <ul className="space-y-1 border-t border-base-800 p-1.5">
                    {dateRecords.map((r) => (
                      <li
                        key={r.id}
                        className="flex items-center justify-between rounded-md bg-base-950 px-2 py-1.5 text-[11px]"
                      >
                        <span className="text-base-300">{r.workerName}</span>
                        <div className="flex items-center gap-1.5 text-base-400">
                          {r.flatPay != null ? (
                            <span>{r.flatPay.toLocaleString('ko-KR')}원</span>
                          ) : (
                            <>
                              {hoursOf(r).toFixed(1)}h
                              {r.ongoing && <span className="text-teal-500">진행중</span>}
                            </>
                          )}
                          {r.outFlag && <MapPinOff size={10} className="text-amber-500" />}
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
}

export default function Sites() {
  const navigate = useNavigate()
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

  const allCards = useMemo(() => {
    return Object.keys(bySite)
      .map((name) => {
        const records = bySite[name]
        const workerSet = new Set(records.map((r) => r.workerId))
        const totalHours = records.reduce((sum, r) => sum + hoursOf(r), 0)
        const flagCount = records.filter((r) => r.outFlag).length
        // 일회성 현장근무: siteId 없이 직접 입력한 장소(고정 현장 목록에 없는 곳)로 기록된 근무
        const isOneOff = records.every((r) => !r.siteId && r.flatPay != null)
        return { name, records, workerCount: workerSet.size, totalHours, flagCount, isOneOff }
      })
      .sort((a, b) => b.records.length - a.records.length)
  }, [bySite])

  const regularCards = allCards.filter((c) => !c.isOneOff)
  const oneOffCards = allCards.filter((c) => c.isOneOff)
  const maxHours = Math.max(1, ...regularCards.map((c) => c.totalHours))

  const toggleSite = (name) => {
    setOpenSite(openSite === name ? null : name)
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-page-text">현장 현황</h1>
        <div className="flex gap-2">
          <button
            onClick={() => navigate(-1)}
            className="focus-ring flex items-center gap-1.5 rounded-lg border border-page-border bg-page-soft px-3 py-1.5 text-xs text-page-sub hover:bg-page-border hover:text-page-text"
          >
            <ArrowLeft size={14} /> 뒤로가기
          </button>
          <button
            onClick={load}
            className="focus-ring flex items-center gap-1.5 rounded-lg border border-page-border bg-page-soft px-3 py-1.5 text-xs text-page-sub hover:bg-page-border hover:text-page-text"
          >
            <RefreshCw size={14} className={state.loading ? 'animate-spin' : ''} />
            새로고침
          </button>
        </div>
      </div>

      {state.error && (
        <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-amber-400">
          {state.error}
        </div>
      )}

      {state.loading ? (
        <p className="p-8 text-center text-sm text-page-sub">불러오는 중…</p>
      ) : allCards.length === 0 ? (
        <p className="p-8 text-center text-sm text-page-sub">표시할 현장 데이터가 없어요.</p>
      ) : (
        <>
          <p className="mb-3 text-xs font-medium text-page-sub">정식 현장 ({regularCards.length})</p>
          {regularCards.length === 0 ? (
            <p className="mb-6 text-sm text-page-sub">등록된 정식 현장 기록이 없어요.</p>
          ) : (
            <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {regularCards.map((c) => (
                <SiteCard
                  key={c.name}
                  {...c}
                  maxHours={maxHours}
                  isOpen={openSite === c.name}
                  onToggle={() => toggleSite(c.name)}
                />
              ))}
            </div>
          )}

          {oneOffCards.length > 0 && (
            <>
              <p className="mb-3 flex items-center gap-1.5 text-xs font-medium text-page-sub">
                <CalendarDays size={12} className="text-amber-500" />
                일회성 현장근무 ({oneOffCards.length})
              </p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {oneOffCards.map((c) => (
                  <SiteCard
                    key={c.name}
                    {...c}
                    maxHours={maxHours}
                    isOpen={openSite === c.name}
                    onToggle={() => toggleSite(c.name)}
                  />
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
