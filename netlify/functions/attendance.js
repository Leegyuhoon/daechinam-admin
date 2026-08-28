// 기존 daechinam-app이 공개해둔 /api/data 엔드포인트에서 데이터를 가져와
// 대시보드용으로 요약합니다. 원본 데이터는 { workers, sites, records, settings, ... }
// 형태의 JSON 하나(key: "shared")로 저장되어 있습니다.
const SOURCE_URL = 'https://daechinam.netlify.app/api/data'

function toKstDateString(iso) {
  if (!iso) return null
  // 기록의 clockIn/clockOut은 UTC ISO. KST(UTC+9) 기준 날짜로 변환.
  const d = new Date(new Date(iso).getTime() + 9 * 60 * 60 * 1000)
  return d.toISOString().slice(0, 10)
}

export default async (req) => {
  if (req.method !== 'GET') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  try {
    const res = await fetch(SOURCE_URL)
    if (!res.ok) throw new Error(`원본 API 응답 오류 (${res.status})`)
    const data = await res.json()

    const workers = data.workers || []
    const sites = data.sites || []
    const records = data.records || []

    const workerName = Object.fromEntries(workers.map((w) => [w.id, w.name]))
    const siteName = Object.fromEntries(sites.map((s) => [s.id, s.name]))

    const url = new URL(req.url)
    const from = url.searchParams.get('from')
    const to = url.searchParams.get('to')

    // clockIn 기준 KST 날짜로 정규화
    const normalized = records.map((r) => ({
      id: r.id,
      workerId: r.workerId,
      workerName: workerName[r.workerId] || '알수없음',
      site: r.site || siteName[r.siteId] || '미지정',
      date: toKstDateString(r.clockIn) || r.date,
      clockIn: r.clockIn,
      clockOut: r.clockOut,
      ongoing: !r.clockOut,
      outFlag: !!r.outFlag // 이탈(반경 초과) 여부
    }))

    const filtered = normalized.filter((r) => {
      if (!r.date) return true
      if (from && r.date < from) return false
      if (to && r.date > to) return false
      return true
    })

    const byDate = {}
    for (const r of filtered) {
      const d = r.date || '알수없음'
      byDate[d] = byDate[d] || { date: d, checkedIn: 0, checkedOut: 0, ongoing: 0, outFlag: 0 }
      byDate[d].checkedIn += 1
      if (r.clockOut) byDate[d].checkedOut += 1
      if (r.ongoing) byDate[d].ongoing += 1
      if (r.outFlag) byDate[d].outFlag += 1
    }

    const daily = Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date))
    const todayOngoing = filtered.filter((r) => r.ongoing)

    return Response.json({
      records: filtered,
      daily,
      total: filtered.length,
      workerCount: workers.length,
      siteCount: sites.length,
      ongoing: todayOngoing // 현재 근무중(퇴근 미처리) 목록
    })
  } catch (err) {
    return Response.json(
      { error: '출퇴근 데이터를 불러오지 못했습니다', detail: String(err) },
      { status: 500 }
    )
  }
}
