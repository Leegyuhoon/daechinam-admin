import { getStore } from '@netlify/blobs'

// ⚠️ TODO: 기존 daechinam-app의 netlify/functions/*.js 에서
//   1) getStore('여기에_실제_스토어명') 의 실제 이름
//   2) 저장되는 레코드 JSON 구조 (예: { userId, name, checkIn, checkOut, date, siteId ... })
// 를 확인해서 아래 STORE_NAME과 매핑 로직을 실제 스키마에 맞게 고쳐야 합니다.
// 지금은 'attendance' 스토어를 가정한 자리표시자(placeholder)입니다.
const STORE_NAME = 'attendance'

export default async (req) => {
  if (req.method !== 'GET') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  try {
    const store = getStore(STORE_NAME)
    const { blobs } = await store.list()

    const url = new URL(req.url)
    const from = url.searchParams.get('from') // YYYY-MM-DD
    const to = url.searchParams.get('to')

    const records = []
    for (const { key } of blobs) {
      const raw = await store.get(key, { type: 'json' })
      if (raw) records.push(raw)
    }

    const filtered = records.filter((r) => {
      if (!r.date) return true
      if (from && r.date < from) return false
      if (to && r.date > to) return false
      return true
    })

    // 대시보드에서 바로 쓰기 좋은 형태로 요약
    const byDate = {}
    for (const r of filtered) {
      const d = r.date || '알수없음'
      byDate[d] = byDate[d] || { date: d, checkedIn: 0, checkedOut: 0, late: 0 }
      if (r.checkIn) byDate[d].checkedIn += 1
      if (r.checkOut) byDate[d].checkedOut += 1
      if (r.isLate) byDate[d].late += 1
    }

    return Response.json({
      records: filtered,
      daily: Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date)),
      total: filtered.length
    })
  } catch (err) {
    return Response.json(
      { error: '출퇴근 데이터를 불러오지 못했습니다', detail: String(err) },
      { status: 500 }
    )
  }
}
