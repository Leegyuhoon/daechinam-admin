// 네이버 캘린더(또는 구글·아이폰 캘린더) 구독용 일정 주소 (iCal / .ics)
//   GET  /api/calendar-feed?t=<비밀 토큰>&kind=regular|spot   → 캘린더 앱이 주기적으로 읽어 감
//   POST /api/calendar-feed  {action:'get'|'rotate'}  (관리자 비밀번호) → 토큰 확인·새로 만들기
import { getStore } from '@netlify/blobs'
import { isAdmin } from '../lib/auth.js'
import { calendarText, eventLines, visitEvent, spotEvent } from '../lib/ics.js'

const TOKEN_KEY = 'calendar-feed'

function newToken() {
  const a = new Uint8Array(24)
  crypto.getRandomValues(a)
  return Array.from(a, (b) => b.toString(16).padStart(2, '0')).join('')
}

async function readJson(store, key, fallback) {
  const v = await store.get(key, { type: 'json' }).catch(() => null)
  return v ?? fallback
}

export default async (req) => {
  const store = getStore('regular-ops')
  const url = new URL(req.url)

  try {
    // 토큰 확인·새로 만들기 (관리자만)
    if (req.method === 'POST') {
      if (!isAdmin(req)) return Response.json({ error: '관리자 비밀번호가 필요합니다' }, { status: 401 })
      const body = await req.json().catch(() => ({}))
      let cur = await readJson(store, TOKEN_KEY, null)
      if (!cur?.token || body.action === 'rotate') {
        cur = { token: newToken(), createdAt: new Date().toISOString() }
        await store.setJSON(TOKEN_KEY, cur)
      }
      return Response.json({ token: cur.token, createdAt: cur.createdAt })
    }

    // HEAD 요청(주소 확인용)도 받아 줌
    if (req.method !== 'GET' && req.method !== 'HEAD') return new Response('Method Not Allowed', { status: 405 })

    const cur = await readJson(store, TOKEN_KEY, null)
    const t = url.searchParams.get('t') || ''
    if (!cur?.token || t !== cur.token) return new Response('Not Found', { status: 404 })

    // /cal/<토큰>/spot.ics 모양도 지원
    const file = url.searchParams.get('file') || ''
    const kind = url.searchParams.get('kind') === 'spot' || file.startsWith('spot') ? 'spot' : 'regular'
    // 지난 3개월 ~ 앞으로의 일정
    const from = new Date(Date.now() - 92 * 86400000).toISOString().slice(0, 10)
    let events = []
    let name

    if (kind === 'regular') {
      name = '대치남 정기 현장'
      const sites = await readJson(store, 'sites', [])
      const visits = await readJson(store, 'visits', [])
      const siteById = Object.fromEntries(sites.map((s) => [s.id, s]))
      events = visits
        .filter((v) => v.date && v.date >= from && v.status !== 'canceled' && siteById[v.siteId])
        .map((v) => eventLines(visitEvent(v, siteById[v.siteId])))
    } else {
      name = '대치남 일회성 현장'
      const spot = getStore('spot-jobs')
      const { blobs } = await spot.list()
      for (const { key } of blobs) {
        const j = await spot.get(key, { type: 'json' }).catch(() => null)
        if (!j?.date || (j.endDate || j.date) < from) continue
        events.push(eventLines(spotEvent(j)))
      }
    }

    return new Response(req.method === 'HEAD' ? null : calendarText(events, { name, feed: true }), {
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `inline; filename="${kind}.ics"`,
        'Cache-Control': 'public, max-age=600'
      }
    })
  } catch (err) {
    return new Response(`오류: ${String(err)}`, { status: 500 })
  }
}
