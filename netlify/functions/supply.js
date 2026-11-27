// 용품 통계용 — 어플(daechinam-app)이 공개해 둔 /api/data 에서 용품 요청 내역을 가져와
// 통계 화면이 쓰기 좋게 한 줄씩 정리해서 내려줍니다. (netlify/functions/attendance.js 와 같은 방식)
const SOURCE_URL = 'https://daechinam.netlify.app/api/data'

export default async (req) => {
  if (req.method !== 'GET') return new Response('Method Not Allowed', { status: 405 })
  try {
    const res = await fetch(SOURCE_URL)
    if (!res.ok) throw new Error(`원본 API 응답 오류 (${res.status})`)
    const data = await res.json()
    const siteName = Object.fromEntries((data.sites || []).map((s) => [s.id, s.name]))

    const rows = (data.supplyRequests || []).map((r) => {
      const qty = Number(r.qty) || 0
      const unitPrice = r.unitPrice != null && r.unitPrice !== '' ? Number(r.unitPrice) : null
      // 금액: 구매 정보에 입력한 총액 우선, 없으면 단가 × 수량, 둘 다 없으면 null(미입력)
      let amount = null
      if (r.totalPrice != null && r.totalPrice !== '') amount = Number(r.totalPrice)
      else if (unitPrice != null) amount = Math.round(unitPrice * qty)
      return {
        id: r.id,
        date: r.date || (r.createdAt ? r.createdAt.slice(0, 10) : ''),
        site: r.siteName || siteName[r.siteId] || '현장 미지정',
        item: (r.itemName || '').trim(),
        qty,
        unitPrice,
        amount,
        vendor: r.vendor || '',
        method: r.purchaseMethod || '',
        status: r.status || 'requested', // requested | approved | delivered | declined
        worker: r.workerName || '',
        purchasedAt: r.purchasedAt || null,
        deliveredAt: r.deliveredAt || null
      }
    }).filter((r) => r.date && r.item)

    return new Response(JSON.stringify({ rows, generatedAt: new Date().toISOString() }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e.message || e) }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }
}

