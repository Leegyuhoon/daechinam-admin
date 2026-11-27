// 재고 현황 쓰기 — 어플(daechinam-app)의 '현장별 재고'(data.inventory / data.inventoryLog)를 직접 고칩니다.
// 어플과 같은 방식(ETag + If-Match)으로 저장해서, 어플에서 동시에 저장해도 서로 덮어쓰지 않고 충돌 시 다시 시도합니다.
// 읽기는 supply.js(/api/supply)가 같은 원본을 내려줍니다.
const SOURCE_URL = process.env.APP_DATA_URL || 'https://daechinam.netlify.app/api/data'

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } })

async function readData() {
  const res = await fetch(SOURCE_URL, { headers: { 'Accept-Encoding': 'identity', 'Cache-Control': 'no-store' } })
  if (!res.ok) throw new Error(`어플 데이터를 불러오지 못했어요 (${res.status})`)
  const etag = res.headers.get('etag')
  const data = await res.json()
  if (!data || typeof data !== 'object' || !Array.isArray(data.sites)) throw new Error('어플 데이터 형식이 올바르지 않아요')
  return { data, etag }
}

// true = 저장됨, false = 그 사이 다른 곳에서 저장돼서 충돌
async function writeData(data, etag) {
  const res = await fetch(SOURCE_URL, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'If-Match': etag },
    body: JSON.stringify(data)
  })
  if (res.status === 409) return false
  if (!res.ok) throw new Error(`저장하지 못했어요 (${res.status})`)
  return true
}

const rid = () => (globalThis.crypto?.randomUUID ? crypto.randomUUID().replace(/-/g, '').slice(0, 10) : String(Date.now()) + Math.random().toString(36).slice(2, 6))

// fn(data) 가 새 data 를 돌려주면 저장. 충돌하면 최신본을 다시 받아 fn 을 다시 적용(최대 6번)
async function mutate(fn) {
  for (let i = 0; i < 6; i++) {
    const { data, etag } = await readData()
    if (!etag) throw new Error('동시 저장 보호(ETag)를 쓸 수 없어서 안전하게 저장할 수 없어요')
    const next = fn(data)
    if (await writeData(next, etag)) return next
    await new Promise((r) => setTimeout(r, 150 + Math.random() * 250))
  }
  throw new Error('다른 곳에서 계속 저장 중이라 반영하지 못했어요. 잠시 후 다시 시도해 주세요')
}

const logEntry = (it, at) => ({ id: rid(), itemId: it.id, siteId: it.siteId, itemName: it.name, qty: it.qty, at })

export default async (req) => {
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 })
  try {
    const b = await req.json().catch(() => ({}))
    const now = new Date().toISOString()

    if (b.action === 'upsert') {
      const name = String(b.name || '').trim().slice(0, 80)
      if (!name) return json({ error: '품목명이 필요합니다' }, 400)
      const qty = Number(b.qty)
      if (!Number.isFinite(qty) || qty < 0) return json({ error: '수량을 0 이상의 숫자로 입력해 주세요' }, 400)
      let saved = null
      await mutate((d) => {
        const list = Array.isArray(d.inventory) ? d.inventory : []
        const log = Array.isArray(d.inventoryLog) ? d.inventoryLog : []
        if (b.id) {
          const prev = list.find((x) => x.id === b.id)
          if (!prev) throw new Error('품목을 찾을 수 없어요(앱에서 이미 삭제됐을 수 있어요)')
          const item = { ...prev, name, qty, unit: String(b.unit || '').trim().slice(0, 20), note: String(b.note || '').trim().slice(0, 200), updatedAt: now }
          saved = item
          return {
            ...d,
            inventory: list.map((x) => (x.id === item.id ? item : x)),
            inventoryLog: (Number(prev.qty) || 0) !== qty ? [...log, logEntry(item, now)] : log
          }
        }
        if (!d.sites.some((s) => s.id === b.siteId)) throw new Error('현장을 선택해 주세요')
        const item = { id: rid(), siteId: b.siteId, name, qty, unit: String(b.unit || '').trim().slice(0, 20), note: String(b.note || '').trim().slice(0, 200), updatedAt: now }
        saved = item
        return { ...d, inventory: [...list, item], inventoryLog: [...log, logEntry(item, now)] }
      })
      return json({ ok: true, item: saved })
    }

    if (b.action === 'adjust') {
      const delta = Number(b.delta)
      if (!b.id || !Number.isFinite(delta) || delta === 0) return json({ error: '잘못된 요청이에요' }, 400)
      let saved = null
      await mutate((d) => {
        const list = Array.isArray(d.inventory) ? d.inventory : []
        const log = Array.isArray(d.inventoryLog) ? d.inventoryLog : []
        const prev = list.find((x) => x.id === b.id)
        if (!prev) throw new Error('품목을 찾을 수 없어요(앱에서 이미 삭제됐을 수 있어요)')
        const qty = Math.max(0, (Number(prev.qty) || 0) + delta)
        if (qty === (Number(prev.qty) || 0)) { saved = prev; return d }
        const item = { ...prev, qty, updatedAt: now }
        saved = item
        return { ...d, inventory: list.map((x) => (x.id === item.id ? item : x)), inventoryLog: [...log, logEntry(item, now)] }
      })
      return json({ ok: true, item: saved })
    }

    if (b.action === 'delete') {
      if (!b.id) return json({ error: 'id가 필요합니다' }, 400)
      await mutate((d) => ({ ...d, inventory: (Array.isArray(d.inventory) ? d.inventory : []).filter((x) => x.id !== b.id) }))
      return json({ ok: true })
    }

    return json({ error: '알 수 없는 요청이에요' }, 400)
  } catch (e) {
    return json({ error: String(e.message || e) }, 500)
  }
}
