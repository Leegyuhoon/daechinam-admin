import { getStore } from '@netlify/blobs'

function chunkKey(id, index) {
  return `${id}:chunk:${String(index).padStart(5, '0')}`
}

// GET /api/spot-media?id=... - 조각을 순서대로 이어붙여 스트리밍 (사진·영상 공용)
export default async (req) => {
  if (req.method !== 'GET') return new Response('Method Not Allowed', { status: 405 })

  const url = new URL(req.url)
  const id = url.searchParams.get('id')
  if (!id) return new Response('id가 필요합니다', { status: 400 })

  const store = getStore('spot-job-media')

  try {
    const manifest = await store.get(id, { type: 'json' }).catch(() => null)
    if (!manifest || !manifest.totalChunks) {
      return new Response('파일을 찾을 수 없습니다', { status: 404 })
    }

    const { totalChunks, contentType } = manifest
    let index = 0
    let currentReader = null

    const stream = new ReadableStream({
      async pull(controller) {
        try {
          while (true) {
            if (!currentReader) {
              if (index >= totalChunks) {
                controller.close()
                return
              }
              const chunkStream = await store.get(chunkKey(id, index), { type: 'stream' })
              if (!chunkStream) {
                controller.error(new Error(`조각 ${index}을(를) 찾을 수 없습니다`))
                return
              }
              currentReader = chunkStream.getReader()
              index += 1
            }
            const { done, value } = await currentReader.read()
            if (done) {
              currentReader = null
              continue
            }
            controller.enqueue(value)
            return
          }
        } catch (err) {
          controller.error(err)
        }
      }
    })

    return new Response(stream, {
      status: 200,
      headers: {
        'Content-Type': contentType || 'application/octet-stream',
        'Cache-Control': 'public, max-age=31536000, immutable'
      }
    })
  } catch (err) {
    return Response.json({ error: '파일 재생 실패', detail: String(err) }, { status: 500 })
  }
}
