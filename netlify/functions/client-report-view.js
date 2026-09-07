import { getStore } from '@netlify/blobs'

// POST /api/client-report-view
// body: { id, password }
export default async (req) => {
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 })

  try {
    const { id, password } = await req.json()
    if (!id || !password) {
      return Response.json({ ok: false, error: 'id와 비밀번호가 필요합니다' }, { status: 400 })
    }

    const store = getStore('client-reports')
    const item = await store.get(id, { type: 'json' })
    if (!item) return Response.json({ ok: false, error: '해당 업체 보고를 찾을 수 없습니다' }, { status: 404 })

    if (item.password !== password) {
      return Response.json({ ok: false, error: '비밀번호가 올바르지 않습니다' }, { status: 401 })
    }

    return Response.json({ ok: true, companyName: item.companyName, sections: item.sections || [] })
  } catch (err) {
    return Response.json({ ok: false, error: '조회 중 오류', detail: String(err) }, { status: 500 })
  }
}
