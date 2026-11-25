// 네이버 캘린더(CalDAV)에 일정 직접 넣기·고치기·지우기
// 필요한 환경변수: NAVER_CALDAV_ID (네이버 아이디), NAVER_CALDAV_PASSWORD (네이버 "애플리케이션 비밀번호")
import { getStore } from '@netlify/blobs'
import { calendarText, eventLines, visitEvent, spotEvent } from './ics.js'

const BASE = process.env.NAVER_CALDAV_URL || 'https://caldav.calendar.naver.com'
const ID = process.env.NAVER_CALDAV_ID
const PW = process.env.NAVER_CALDAV_PASSWORD
const CONFIG_KEY = 'caldav-config'

export const caldavConfigured = () => !!(ID && PW)

const auth = () => 'Basic ' + Buffer.from(`${ID}:${PW}`).toString('base64')

// 응답이 너무 늦으면 저장 자체가 늦어지지 않게 끊음
async function dav(method, url, { body, headers = {}, timeout = 6000 } = {}) {
  let target = url
  for (let hop = 0; hop < 4; hop++) {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), timeout)
    try {
      const res = await fetch(target, {
        method,
        body,
        redirect: 'manual',
        signal: ctrl.signal,
        headers: { Authorization: auth(), ...headers }
      })
      if ([301, 302, 307, 308].includes(res.status) && res.headers.get('location')) {
        target = new URL(res.headers.get('location'), target).toString()
        continue
      }
      return { status: res.status, text: await res.text(), url: target }
    } finally {
      clearTimeout(timer)
    }
  }
  throw new Error('너무 많이 이동됨')
}

const PROP = (inner) => `<?xml version="1.0" encoding="utf-8"?><d:propfind xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav"><d:prop>${inner}</d:prop></d:propfind>`
const tagText = (xml, tag) => {
  const m = xml.match(new RegExp(`<(?:[\\w-]+:)?${tag}[^>]*>([\\s\\S]*?)</(?:[\\w-]+:)?${tag}>`, 'i'))
  return m ? m[1] : null
}
const hrefIn = (xml) => {
  const m = xml && xml.match(/<(?:[\w-]+:)?href[^>]*>\s*([^<\s]+)\s*<\/(?:[\w-]+:)?href>/i)
  return m ? m[1] : null
}
const decodeXml = (s) => String(s || '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&')

// 연결 확인 + 쓸 수 있는 캘린더 목록
export async function discoverCalendars() {
  if (!caldavConfigured()) throw new Error('Netlify 환경변수 NAVER_CALDAV_ID / NAVER_CALDAV_PASSWORD 가 없습니다')
  const tryStarts = [`${BASE}/.well-known/caldav`, `${BASE}/`, `${BASE}/caldav/${encodeURIComponent(ID)}/`]
  let principal = null
  let lastStatus = null
  for (const start of tryStarts) {
    const r = await dav('PROPFIND', start, { body: PROP('<d:current-user-principal/>'), headers: { Depth: '0', 'Content-Type': 'application/xml; charset=utf-8' } }).catch(() => null)
    if (!r) continue
    lastStatus = r.status
    if (r.status === 401) throw new Error('네이버가 아이디·애플리케이션 비밀번호를 거절했습니다 (401). 비밀번호를 다시 확인해 주세요.')
    const p = hrefIn(tagText(r.text, 'current-user-principal'))
    if (p) {
      principal = new URL(p, r.url).toString()
      break
    }
  }
  if (!principal) throw new Error(`네이버 캘린더 주소를 찾지 못했습니다 (응답 ${lastStatus ?? '없음'})`)

  const h = await dav('PROPFIND', principal, { body: PROP('<c:calendar-home-set/>'), headers: { Depth: '0', 'Content-Type': 'application/xml; charset=utf-8' } })
  const homeHref = hrefIn(tagText(h.text, 'calendar-home-set'))
  if (!homeHref) throw new Error(`캘린더 목록 위치를 찾지 못했습니다 (응답 ${h.status})`)
  const home = new URL(homeHref, h.url).toString()

  const l = await dav('PROPFIND', home, {
    body: PROP('<d:displayname/><d:resourcetype/><c:supported-calendar-component-set/><d:current-user-privilege-set/>'),
    headers: { Depth: '1', 'Content-Type': 'application/xml; charset=utf-8' }
  })
  const calendars = []
  for (const resp of l.text.split(/<\/(?:[\w-]+:)?response>/i)) {
    const href = hrefIn(resp)
    if (!href) continue
    const rt = tagText(resp, 'resourcetype') || ''
    if (!/calendar/i.test(rt)) continue
    const comps = tagText(resp, 'supported-calendar-component-set') || ''
    if (comps && !/VEVENT/i.test(comps)) continue
    const priv = tagText(resp, 'current-user-privilege-set') || ''
    const canWrite = !priv || /<(?:[\w-]+:)?(write|all|write-content|bind)\b/i.test(priv)
    calendars.push({ href: new URL(href, l.url).toString(), name: decodeXml(tagText(resp, 'displayname') || '').trim() || href, canWrite })
  }
  return calendars
}

export async function readCaldavConfig() {
  return (await getStore('regular-ops').get(CONFIG_KEY, { type: 'json' }).catch(() => null)) || {}
}
export async function writeCaldavConfig(cfg) {
  await getStore('regular-ops').setJSON(CONFIG_KEY, cfg)
}

const fileOf = (uid) => `${uid.replace(/@.*/, '').replace(/[^A-Za-z0-9_-]/g, '')}.ics`
const join = (cal, uid) => (cal.endsWith('/') ? cal : cal + '/') + fileOf(uid)

export async function putEvent(calHref, ev) {
  const r = await dav('PUT', join(calHref, ev.uid), {
    body: calendarText([eventLines(ev)]),
    headers: { 'Content-Type': 'text/calendar; charset=utf-8' }
  })
  if (r.status >= 300) throw new Error(`일정 등록 실패 (${r.status}) ${r.text.slice(0, 120)}`)
}
export async function deleteEvent(calHref, uid) {
  const r = await dav('DELETE', join(calHref, uid))
  if (r.status >= 300 && r.status !== 404) throw new Error(`일정 삭제 실패 (${r.status})`)
}

// 저장 직후 자동 반영 — 실패해도 사이트 저장은 그대로 (기록만 남김)
async function logError(msg) {
  try {
    const cfg = await readCaldavConfig()
    await writeCaldavConfig({ ...cfg, lastError: { at: new Date().toISOString(), msg: String(msg).slice(0, 300) } })
  } catch {
    // 무시
  }
}

export async function syncVisits(visits, sites, { removed = [] } = {}) {
  if (!caldavConfigured()) return
  const cfg = await readCaldavConfig()
  if (!cfg.regularHref) return
  const siteById = Object.fromEntries((sites || []).map((s) => [s.id, s]))
  const jobs = []
  for (const v of visits || []) {
    const s = siteById[v.siteId]
    if (!v?.id || !v.date) continue
    if (v.status === 'canceled' || !s) jobs.push(() => deleteEvent(cfg.regularHref, `visit-${v.id}@daechinam`))
    else jobs.push(() => putEvent(cfg.regularHref, visitEvent(v, s)))
  }
  for (const id of removed) jobs.push(() => deleteEvent(cfg.regularHref, `visit-${id}@daechinam`))
  await runAll(jobs)
}

export async function syncSpot(job, { removedId } = {}) {
  if (!caldavConfigured()) return
  const cfg = await readCaldavConfig()
  if (!cfg.spotHref) return
  const jobs = []
  if (job?.id && job.date) jobs.push(() => putEvent(cfg.spotHref, spotEvent(job)))
  if (removedId) jobs.push(() => deleteEvent(cfg.spotHref, `spot-${removedId}@daechinam`))
  await runAll(jobs)
}

// 동시에 4개씩 처리, 실패는 모아서 기록
export async function runAll(jobs, concurrency = 4) {
  const errors = []
  let i = 0
  const worker = async () => {
    while (i < jobs.length) {
      const job = jobs[i++]
      try {
        await job()
      } catch (e) {
        errors.push(e.message || String(e))
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, jobs.length) }, worker))
  if (errors.length) await logError(errors[0])
  return errors
}
