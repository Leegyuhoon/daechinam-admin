import { getStore } from '@netlify/blobs'

const STORE_NAME = 'spot-jobs'

// item shape:
// {
//   id, siteName, date,
//   employeeCount, dayWorkerCount, dayWorkerRate, dayWorkerTotal,
//   workDescription,
//   media: [{ id, url, kind: 'photo'|'video', filename }],
//   createdAt, updatedAt
// }
export default async (req) => {
  const store = getStore(STORE_NAME)
  const url = new URL(req.url)

  try {
    if (req.method === 'GET') {
      const { blobs } = await store.list()
      const items = []
      for (const { key } of blobs) {
        const item = await store.get(key, { type: 'json' })
        if (item) items.push(item)
      }
      items.sort((a, b) => (b.date || '').localeCompare(a.date || ''))
      return Response.json({ items })
    }

    if (req.method === 'POST') {
      const body = await req.json()
      if (!body.siteName?.trim() || !body.date) {
        return Response.json({ error: '현장명과 날짜가 필요합니다' }, { status: 400 })
      }
      const id = body.id || crypto.randomUUID()
      const employeeCount = Number(body.employeeCount) || 0
      const dayWorkerCount = Number(body.dayWorkerCount) || 0
      const dayWorkerRate = Number(body.dayWorkerRate) || 0
      const item = {
        id,
        siteName: body.siteName.trim(),
        date: body.date,
        employeeCount,
        dayWorkerCount,
        dayWorkerRate,
        dayWorkerTotal: dayWorkerCount * dayWorkerRate,
        workDescription: body.workDescription || '',
        media: Array.isArray(body.media) ? body.media : [],
        createdAt: body.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      await store.setJSON(id, item)
      return Response.json({ item })
    }

    if (req.method === 'DELETE') {
      const id = url.searchParams.get('id')
      if (!id) return Response.json({ error: 'id가 필요합니다' }, { status: 400 })
      await store.delete(id)
      return Response.json({ ok: true })
    }

    return new Response('Method Not Allowed', { status: 405 })
  } catch (err) {
    return Response.json({ error: '일회성 현장근무 처리 중 오류', detail: String(err) }, { status: 500 })
  }
}
