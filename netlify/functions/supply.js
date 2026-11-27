// 용품 현황용 — 어플(daechinam-app)이 공개해 둔 /api/data 에서 용품 요청 내역 + 현장별 재고(와 재고 변동 기록)를
// 가져와 화면이 쓰기 좋게 정리해서 내려줍니다. (netlify/functions/attendance.js 와 같은 방식, 읽기 전용)
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

    // 어플의 '현장별 재고'(팀장·관리자가 어플에서 입력) 와 수량이 바뀔 때마다 남는 변동 기록
    const inventory = (data.inventory || []).map((x) => ({
      id: x.id,
      siteId: x.siteId,
      site: siteName[x.siteId] || '현장 미지정',
      name: (x.name || '').trim(),
      qty: Number(x.qty) || 0,
      unit: x.unit || '',
      note: x.note || '',
      updatedAt: x.updatedAt || null
    })).filter((x) => x.name)
    const invLog = (data.inventoryLog || []).filter((l) => l.itemId && l.at).map((l) => ({ itemId: l.itemId, qty: Number(l.qty) || 0, at: l.at }))

    return new Response(JSON.stringify({ rows, inventory, invLog, generatedAt: new Date().toISOString() }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e.message || e) }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }
}

