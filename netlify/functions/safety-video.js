import { getStore } from '@netlify/blobs'

// GET /api/safety-video?id=...
export default async (req) => {
  if (req.method !== 'GET') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  const url = new URL(req.url)
  const id = url.searchParams.get('id')
  if (!id) return new Response('id가 필요합니다', { status: 400 })

  try {
    const store = getStore('safety-videos')
    const meta = await store.getMetadata(id)
    if (!meta) return new Response('영상을 찾을 수 없습니다', { status: 404 })

    const stream = await store.get(id, { type: 'stream' })
    if (!stream) return new Response('영상을 찾을 수 없습니다', { status: 404 })

    return new Response(stream, {
      status: 200,
      headers: {
        'Content-Type': meta.metadata?.contentType || 'video/mp4',
        'Cache-Control': 'public, max-age=31536000, immutable'
      }
    })
  } catch (err) {
    return Response.json({ error: '영상 재생 실패', detail: String(err) }, { status: 500 })
  }
}
