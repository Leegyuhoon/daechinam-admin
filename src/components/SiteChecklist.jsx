import { useEffect, useState } from 'react'
import { CheckCircle2, Clock } from 'lucide-react'
import { api } from '../lib/api'

// siteName에 해당하는 실제 출퇴근 기록을 날짜별로 묶어서 체크리스트 형태로 보여줍니다.
export default function SiteChecklist({ siteName, limit = 14 }) {
  const [loading, setLoading] = useState(true)
  const [days, setDays] = useState([])
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!siteName) {
      setLoading(false)
      return
    }
    setLoading(true)
    api
      .getAttendanceSummary()
      .then((data) => {
        const records = (data.records || []).filter((r) => r.site === siteName)
        const byDate = {}
        for (const r of records) {
          const d = r.date || '날짜미상'
          byDate[d] = byDate[d] || []
          byDate[d].push(r)
        }
        const sorted = Object.entries(byDate)
          .sort((a, b) => b[0].localeCompare(a[0]))
          .slice(0, limit)
          .map(([date, recs]) => ({ date, recs }))
        setDays(sorted)
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [siteName, limit])

  if (!siteName) return null
  if (loading) return <p className="text-xs text-base-500">불러오는 중…</p>
  if (error) return <p className="text-xs text-amber-500">{error}</p>
  if (days.length === 0) return <p className="text-xs text-base-500">최근 출근 기록이 없어요.</p>

  return (
    <div className="space-y-2">
      {days.map(({ date, recs }) => (
        <div key={date} className="rounded-lg bg-base-900 p-3">
          <p className="mb-1.5 text-xs font-medium text-base-300">{date}</p>
          <ul className="space-y-1">
            {recs.map((r) => (
              <li key={r.id} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-base-200">
                  {r.ongoing ? (
                    <Clock size={12} className="text-teal-500" />
                  ) : (
                    <CheckCircle2 size={12} className="text-mist-500" />
                  )}
                  {r.workerName}
                </span>
                <span className="text-base-500">{r.ongoing ? '근무중' : '완료'}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}
