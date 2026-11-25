// 네이버 캘린더(또는 구글·아이폰 캘린더) 구독용 일정 주소 (iCal / .ics)
//   GET  /api/calendar-feed?t=<비밀 토큰>&kind=regular|spot   → 캘린더 앱이 주기적으로 읽어 감
//   POST /api/calendar-feed  {action:'get'|'rotate'}  (관리자 비밀번호) → 토큰 확인·새로 만들기
import { getStore } from '@netlify/blobs'
import { isAdmin } from '../lib/auth.js'

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

// iCal 글자 처리: 특수문자 이스케이프 + 한 줄 75바이트 접기
const esc = (s) => String(s || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n')
function fold(line) {
  const enc = new TextEncoder()
  if (enc.encode(line).length <= 75) return line
  const out = []
  let cur = ''
  for (const ch of line) {
    if (enc.encode(cur + ch).length > (out.length ? 74 : 75)) {
      out.push(cur)
      cur = ch
    } else cur += ch
  }
  out.push(cur)
  return out.join('\r\n ')
}
const ymd = (d) => d.replace(/-/g, '')
const addDay = (d, n = 1) => {
  const t = new Date(`${d}T00:00:00Z`)
  t.setUTCDate(t.getUTCDate() + n)
  return t.toISOString().slice(0, 10)
}
const stamp = (iso) => (iso || new Date().toISOString()).replace(/[-:]/g, '').replace(/\.\d+/, '').replace(/Z?$/, 'Z')

function event({ uid, start, end, summary, description, location, updatedAt }) {
  return [
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${stamp(updatedAt)}`,
    `DTSTART;VALUE=DATE:${ymd(start)}`,
    `DTEND;VALUE=DATE:${ymd(end)}`,
    `SUMMARY:${esc(summary)}`,
    description ? `DESCRIPTION:${esc(description)}` : null,
    location ? `LOCATION:${esc(location)}` : null,
    'TRANSP:TRANSPARENT',
    'END:VEVENT'
  ].filter(Boolean)
}

function calendar(name, events) {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//ELC Daechinam//Admin//KO',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${esc(name)}`,
    'X-WR-TIMEZONE:Asia/Seoul',
    'REFRESH-INTERVAL;VALUE=DURATION:PT1H',
    'X-PUBLISHED-TTL:PT1H',
    ...events.flat(),
    'END:VCALENDAR'
  ]
  return lines.map(fold).join('\r\n') + '\r\n'
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

    if (req.method !== 'GET') return new Response('Method Not Allowed', { status: 405 })

    const cur = await readJson(store, TOKEN_KEY, null)
    const t = url.searchParams.get('t') || ''
    if (!cur?.token || t !== cur.token) return new Response('Not Found', { status: 404 })

    const kind = url.searchParams.get('kind') === 'spot' ? 'spot' : 'regular'
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
        .map((v) => {
          const s = siteById[v.siteId]
          const what = v.type === 'service' ? `[서비스] ${s.name} ${v.serviceName || ''}`.trim() : `[점검] ${s.name}`
          const done = v.status === 'done' ? ' ✓완료' : ''
          const desc = [
            v.type === 'service' ? `서비스: ${v.serviceName || ''}` : '정기 점검 방문',
            v.status === 'done' ? '상태: 완료' : '상태: 예정',
            s.workHours ? `근무 시간: ${s.workHours}` : '',
            s.teamLeaderName ? `현장 팀장: ${s.teamLeaderName}${s.teamLeaderPhone ? ` ${s.teamLeaderPhone}` : ''}` : '',
            s.contactName ? `업체 담당: ${s.contactName}${s.contactPhone ? ` ${s.contactPhone}` : ''}` : '',
            v.memo ? `메모·점검 결과: ${v.memo}` : '',
          ]
            .filter(Boolean)
            .join('\n')
          return event({
            uid: `visit-${v.id}@daechinam`,
            start: v.date,
            end: addDay(v.date),
            summary: what + done,
            description: desc,
            location: s.address || '',
            updatedAt: v.updatedAt || v.createdAt
          })
        })
    } else {
      name = '대치남 일회성 현장'
      const spot = getStore('spot-jobs')
      const { blobs } = await spot.list()
      for (const { key } of blobs) {
        const j = await spot.get(key, { type: 'json' }).catch(() => null)
        if (!j?.date || (j.endDate || j.date) < from) continue
        const people = [j.employeeCount ? `직원 ${j.employeeCount}명` : '', j.dayWorkerCount ? `일용직 ${j.dayWorkerCount}명` : ''].filter(Boolean).join(' · ')
        events.push(
          event({
            uid: `spot-${j.id}@daechinam`,
            start: j.date,
            end: addDay(j.endDate || j.date),
            summary: `[일회성] ${j.siteName}${j.days > 1 ? ` (${j.days}일)` : ''}`,
            description: [people, j.workDescription ? `작업: ${j.workDescription}` : ''].filter(Boolean).join('\n'),
            updatedAt: j.updatedAt || j.createdAt
          })
        )
      }
    }

    return new Response(calendar(name, events), {
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
