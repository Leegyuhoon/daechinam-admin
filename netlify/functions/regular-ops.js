import { getStore } from '@netlify/blobs'

// 정기현장 순회 관리 — 현장(서비스 항목 포함), 일정(점검·서비스 방문), 서비스 실행(전후 기록)
// 관리자 비밀번호는 "업체 보고"와 같은 CLIENT_REPORT_ADMIN_PASSWORD를 함께 씁니다.
const STORE_NAME = 'regular-ops'
const ADMIN_PASSWORD = process.env.CLIENT_REPORT_ADMIN_PASSWORD
const COLLECTIONS = ['sites', 'visits', 'executions']

// 처음 열 때 한 번만 자동 등록되는 현장 목록 (이후엔 화면에서 수정·추가·삭제)
const SEED_SITES = [
  '은혜광성교회',
  'CSA 위례',
  'SG메디컬',
  'EM365',
  '정상어학원 미사',
  '정상어학원 하남',
  '라조리오',
  '진경산업',
  '봉주르 팔당',
  '메트라이프 본사',
  '메트라이프 제주'
]

function checkAdmin(req) {
  if (!ADMIN_PASSWORD) return true
  return req.headers.get('x-client-admin-password') === ADMIN_PASSWORD
}

async function readCol(store, name) {
  const data = await store.get(name, { type: 'json' }).catch(() => null)
  return Array.isArray(data) ? data : []
}

function seedSites() {
  const now = new Date().toISOString()
  return SEED_SITES.map((name, i) => ({
    id: crypto.randomUUID(),
    name,
    order: i,
    inspectCycleMonths: name === '메트라이프 제주' ? 6 : 1,
    contactName: '',
    contactPhone: '',
    workHours: '',
    address: '',
    memo: name === '메트라이프 제주' ? '제주 현장 — 1년에 2번 정도 방문' : '',
    active: true,
    services: [],
    createdAt: now
  }))
}

// item: 각 컬렉션의 레코드 (id 필수, 없으면 생성)
export default async (req) => {
  if (!checkAdmin(req)) {
    return Response.json({ error: '관리자 비밀번호가 필요합니다' }, { status: 401 })
  }

  const store = getStore(STORE_NAME)
  const url = new URL(req.url)

  try {
    if (req.method === 'GET') {
      let sites = await readCol(store, 'sites')
      const seeded = await store.get('seeded', { type: 'json' }).catch(() => null)
      if (sites.length === 0 && !seeded) {
        sites = seedSites()
        await store.setJSON('sites', sites)
        await store.setJSON('seeded', { at: new Date().toISOString() })
      }
      const [visits, executions] = await Promise.all([readCol(store, 'visits'), readCol(store, 'executions')])
      return Response.json({ sites, visits, executions })
    }

    if (req.method === 'POST') {
      const body = await req.json()
      const { collection } = body
      if (!COLLECTIONS.includes(collection)) {
        return Response.json({ error: '알 수 없는 항목입니다' }, { status: 400 })
      }
      const incoming = Array.isArray(body.items) ? body.items : body.item ? [body.item] : []
      if (incoming.length === 0) return Response.json({ error: '저장할 내용이 없습니다' }, { status: 400 })

      const list = await readCol(store, collection)
      const now = new Date().toISOString()
      const saved = incoming.map((raw) => {
        const item = { ...raw, id: raw.id || crypto.randomUUID(), updatedAt: now }
        if (!item.createdAt) item.createdAt = now
        const idx = list.findIndex((x) => x.id === item.id)
        if (idx >= 0) list[idx] = item
        else list.push(item)
        return item
      })
      await store.setJSON(collection, list)
      return Response.json({ items: saved, item: saved[0] })
    }

    if (req.method === 'DELETE') {
      const collection = url.searchParams.get('collection')
      const id = url.searchParams.get('id')
      if (!COLLECTIONS.includes(collection) || !id) {
        return Response.json({ error: 'collection과 id가 필요합니다' }, { status: 400 })
      }
      const list = await readCol(store, collection)
      await store.setJSON(
        collection,
        list.filter((x) => x.id !== id)
      )
      return Response.json({ ok: true })
    }

    return new Response('Method Not Allowed', { status: 405 })
  } catch (err) {
    return Response.json({ error: '정기현장 처리 중 오류', detail: String(err) }, { status: 500 })
  }
}
