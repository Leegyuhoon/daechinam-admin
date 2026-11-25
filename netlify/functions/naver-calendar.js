// 네이버 캘린더 연결 설정 (관리자)
//   GET                                  → 연결 상태
//   POST {action:'discover'}             → 연결 확인 + 캘린더 목록
//   POST {action:'save', regularHref, spotHref}
//   POST {action:'syncAll', kind, offset} → 지난 1개월~앞으로의 일정을 나눠서 보내기
import { getStore } from '@netlify/blobs'
import { isAdmin } from '../lib/auth.js'
import { caldavConfigured, discoverCalendars, readCaldavConfig, writeCaldavConfig, putEvent, runAll, diagnose, removeOurEvents } from '../lib/caldav.js'
import { visitEvent, spotEvent } from '../lib/ics.js'

const CHUNK = 25

export default async (req) => {
  if (!isAdmin(req)) return Response.json({ error: '관리자 비밀번호가 필요합니다' }, { status: 401 })
  try {
    if (req.method === 'GET') {
      const cfg = await readCaldavConfig()
      return Response.json({ configured: caldavConfigured(), id: caldavConfigured() ? process.env.NAVER_CALDAV_ID : null, ...cfg })
    }
    if (req.method !== 'POST') return Response.json({ error: 'Method Not Allowed' }, { status: 405 })
    const body = await req.json().catch(() => ({}))

    if (body.action === 'discover') {
      const calendars = await discoverCalendars()
      return Response.json({ ok: true, calendars })
    }

    if (body.action === 'save') {
      const cfg = await readCaldavConfig()
      const next = {
        ...cfg,
        regularHref: body.regularHref || '',
        regularName: body.regularName || '',
        spotHref: body.spotHref || '',
        spotName: body.spotName || '',
        lastError: null,
        savedAt: new Date().toISOString()
      }
      await writeCaldavConfig(next)
      return Response.json({ ok: true, ...next })
    }

    // 예전에 보내던 캘린더에서 사이트 일정만 지우기
    if (body.action === 'removeFrom') {
      if (!body.href) return Response.json({ error: '캘린더가 필요합니다' }, { status: 400 })
      return Response.json({ ok: true, ...(await removeOurEvents(body.href)) })
    }

    if (body.action === 'diagnose') {
      const cfg = await readCaldavConfig()
      const href = body.kind === 'spot' ? cfg.spotHref : cfg.regularHref
      if (!href) return Response.json({ error: '보낼 캘린더를 먼저 골라 저장해 주세요' }, { status: 400 })
      return Response.json({ ok: true, ...(await diagnose(href)) })
    }

    if (body.action === 'syncAll') {
      const cfg = await readCaldavConfig()
      const kind = body.kind === 'spot' ? 'spot' : 'regular'
      const href = kind === 'spot' ? cfg.spotHref : cfg.regularHref
      if (!href) return Response.json({ error: '보낼 캘린더를 먼저 골라 저장해 주세요' }, { status: 400 })
      const from = new Date(Date.now() - 31 * 86400000).toISOString().slice(0, 10)
      let events = []
      if (kind === 'regular') {
        const store = getStore('regular-ops')
        const sites = (await store.get('sites', { type: 'json' }).catch(() => null)) || []
        const visits = (await store.get('visits', { type: 'json' }).catch(() => null)) || []
        const siteById = Object.fromEntries(sites.map((s) => [s.id, s]))
        events = visits
          .filter((v) => v.date && v.date >= from && v.status !== 'canceled' && siteById[v.siteId])
          .sort((a, b) => a.date.localeCompare(b.date))
          .map((v) => visitEvent(v, siteById[v.siteId]))
      } else {
        const spot = getStore('spot-jobs')
        const { blobs } = await spot.list()
        for (const { key } of blobs) {
          const j = await spot.get(key, { type: 'json' }).catch(() => null)
          if (j?.date && (j.endDate || j.date) >= from) events.push(spotEvent(j))
        }
        events.sort((a, b) => a.start.localeCompare(b.start))
      }
      const offset = Math.max(0, Number(body.offset) || 0)
      const part = events.slice(offset, offset + CHUNK)
      const errors = await runAll(part.map((ev) => () => putEvent(href, ev)))
      const next = offset + part.length
      return Response.json({ ok: true, total: events.length, next, done: next >= events.length, errors: errors.slice(0, 3), failed: errors.length })
    }

    return Response.json({ error: '알 수 없는 요청' }, { status: 400 })
  } catch (err) {
    return Response.json({ error: err.message || String(err) }, { status: 500 })
  }
}
