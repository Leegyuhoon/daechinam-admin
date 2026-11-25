// iCal(.ics) 만들기 — 캘린더 구독 주소와 네이버 캘린더(CalDAV) 보내기에서 함께 사용

export const esc = (s) => String(s || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n')

// 한 줄 75바이트 넘으면 접기
export function fold(line) {
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
export const addDay = (d, n = 1) => {
  const t = new Date(`${d}T00:00:00Z`)
  t.setUTCDate(t.getUTCDate() + n)
  return t.toISOString().slice(0, 10)
}
const stamp = (iso) => (iso || new Date().toISOString()).replace(/[-:]/g, '').replace(/\.\d+/, '').replace(/Z?$/, 'Z')

export function eventLines({ uid, start, end, summary, description, location, updatedAt }) {
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

export function calendarText(events, { name, feed = false } = {}) {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//ELC Daechinam//Admin//KO',
    'CALSCALE:GREGORIAN',
    ...(feed ? ['METHOD:PUBLISH', `X-WR-CALNAME:${esc(name)}`, 'X-WR-TIMEZONE:Asia/Seoul', 'REFRESH-INTERVAL;VALUE=DURATION:PT1H', 'X-PUBLISHED-TTL:PT1H'] : []),
    ...events.flat(),
    'END:VCALENDAR'
  ]
  return lines.map(fold).join('\r\n') + '\r\n'
}

// 정기 현장 일정(점검·서비스) → 일정 정보
export function visitEvent(v, s) {
  const what = v.type === 'service' ? `[서비스] ${s.name} ${v.serviceName || ''}`.trim() : `[점검] ${s.name}`
  const desc = [
    v.type === 'service' ? `서비스: ${v.serviceName || ''}` : '정기 점검 방문',
    v.status === 'done' ? '상태: 완료' : '상태: 예정',
    s.workHours ? `근무 시간: ${s.workHours}` : '',
    s.teamLeaderName ? `현장 팀장: ${s.teamLeaderName}${s.teamLeaderPhone ? ` ${s.teamLeaderPhone}` : ''}` : '',
    s.contactName ? `업체 담당: ${s.contactName}${s.contactPhone ? ` ${s.contactPhone}` : ''}` : '',
    v.memo ? `메모·점검 결과: ${v.memo}` : '',
    '(대치남 통합 관리 사이트에서 자동 등록 — 수정은 사이트에서)'
  ]
    .filter(Boolean)
    .join('\n')
  return {
    uid: `visit-${v.id}@daechinam`,
    start: v.date,
    end: addDay(v.date),
    summary: what + (v.status === 'done' ? ' (완료)' : ''),
    description: desc,
    location: s.address || '',
    updatedAt: v.updatedAt || v.createdAt
  }
}

// 일회성 현장 → 일정 정보
export function spotEvent(j) {
  const people = [j.employeeCount ? `직원 ${j.employeeCount}명` : '', j.dayWorkerCount ? `일용직 ${j.dayWorkerCount}명` : ''].filter(Boolean).join(' · ')
  return {
    uid: `spot-${j.id}@daechinam`,
    start: j.date,
    end: addDay(j.endDate || j.date),
    summary: `[일회성] ${j.siteName}${j.days > 1 ? ` (${j.days}일)` : ''}`,
    description: [people, j.workDescription ? `작업: ${j.workDescription}` : '', '(대치남 통합 관리 사이트에서 자동 등록 — 수정은 사이트에서)'].filter(Boolean).join('\n'),
    updatedAt: j.updatedAt || j.createdAt
  }
}
