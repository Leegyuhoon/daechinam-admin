// 정기현장 순회 관리 — 날짜 계산 도우미 (모든 날짜는 'YYYY-MM-DD' 문자열, 한국 시간 기준)

export const pad = (n) => String(n).padStart(2, '0')

export function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function thisMonth() {
  return todayStr().slice(0, 7)
}

export function shiftMonth(month, delta) {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
}

export function addMonths(dateStr, n) {
  if (!dateStr) return null
  const [y, m, d] = dateStr.split('-').map(Number)
  const target = new Date(y, m - 1 + Number(n || 0), 1)
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate()
  target.setDate(Math.min(d, lastDay))
  return `${target.getFullYear()}-${pad(target.getMonth() + 1)}-${pad(target.getDate())}`
}

export function monthEnd(month) {
  const [y, m] = month.split('-').map(Number)
  return `${month}-${pad(new Date(y, m, 0).getDate())}`
}

export function daysInMonth(month) {
  const [y, m] = month.split('-').map(Number)
  return new Date(y, m, 0).getDate()
}

export function weekdayOf(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).getDay() // 0=일
}

export const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

export function fmtDate(dateStr) {
  if (!dateStr) return '-'
  const [, m, d] = dateStr.split('-')
  return `${Number(m)}/${Number(d)}(${WEEKDAYS[weekdayOf(dateStr)]})`
}

export function cycleLabel(months) {
  const n = Number(months) || 1
  if (n === 1) return '매월'
  if (n === 12) return '연 1회'
  if (n === 6) return '연 2회 (6개월)'
  if (n === 3) return '분기 1회'
  return `${n}개월마다`
}

export const CYCLE_OPTIONS = [1, 2, 3, 4, 6, 12]

// 마지막 점검 완료일
export function lastInspection(siteId, visits) {
  return visits
    .filter((v) => v.siteId === siteId && v.type === 'inspection' && v.status === 'done')
    .map((v) => v.date)
    .sort()
    .pop() || null
}

// 다음 점검 예정일 (기록이 없으면 null)
export function nextInspectionDue(site, visits) {
  const last = lastInspection(site.id, visits)
  return last ? addMonths(last, site.inspectCycleMonths || 1) : null
}

export function serviceNextDue(service) {
  return service.lastDoneDate ? addMonths(service.lastDoneDate, service.cycleMonths || 1) : null
}

// 해당 월에 점검이 필요한 현장인지
export function needsInspectionIn(site, visits, month) {
  if (site.active === false) return false
  const cycle = Number(site.inspectCycleMonths) || 1
  const due = nextInspectionDue(site, visits)
  if (!due) return cycle === 1 // 매월 현장은 기록이 없으면 이번 달 대상, 그 외(제주 등)는 직접 배치
  return due <= monthEnd(month)
}

// 해당 월에 실행이 필요한 서비스 항목 목록
export function servicesDueIn(site, month) {
  if (site.active === false) return []
  return (site.services || []).filter((s) => {
    const due = serviceNextDue(s)
    if (!due) return false // 마지막 실행일이 없으면 직접 배치
    return due <= monthEnd(month)
  })
}

// 자동 배치 — 이번 달 점검/서비스 대상 중 아직 일정이 없는 것을 화·수·목에 하루 1곳씩 순서대로 배치
export function autoPlan(month, sites, visits) {
  const today = todayStr()
  const slots = []
  for (let d = 1; d <= daysInMonth(month); d++) {
    const date = `${month}-${pad(d)}`
    const wd = weekdayOf(date)
    if (date >= today && wd >= 2 && wd <= 4) slots.push(date)
  }
  if (slots.length === 0) return []

  const inMonth = visits.filter((v) => v.date?.startsWith(month) && v.status !== 'canceled')
  const busy = new Set(inMonth.map((v) => v.date))
  const free = slots.filter((d) => !busy.has(d))
  const pool = free.length ? free : slots

  const created = []
  let i = 0
  const ordered = [...sites].sort((a, b) => (a.order ?? 99) - (b.order ?? 99))
  for (const site of ordered) {
    if (site.active === false) continue
    const siteVisits = inMonth.filter((v) => v.siteId === site.id)
    const hasInspection = siteVisits.some((v) => v.type === 'inspection')
    const dueServices = servicesDueIn(site, month).filter(
      (s) => !siteVisits.some((v) => v.type === 'service' && v.serviceId === s.id)
    )
    const needInspection = !hasInspection && needsInspectionIn(site, visits, month)
    if (!needInspection && dueServices.length === 0) continue

    const date = siteVisits[0]?.date || pool[i++ % pool.length]
    if (needInspection) {
      created.push({ siteId: site.id, date, type: 'inspection', status: 'planned', memo: '' })
    }
    for (const s of dueServices) {
      created.push({ siteId: site.id, date, type: 'service', serviceId: s.id, serviceName: s.name, status: 'planned', memo: '' })
    }
  }
  return created
}

export function reportLink(executionId) {
  return `${window.location.origin}/service-report?id=${executionId}`
}
