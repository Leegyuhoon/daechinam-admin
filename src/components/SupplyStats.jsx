import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, RefreshCw, FileSpreadsheet, TrendingUp, TrendingDown, Minus, Search } from 'lucide-react'
import { api } from '../lib/api'
import { downloadXlsx } from '../lib/xlsx'
import PrintButton from './PrintButton'

/* ───────────── 날짜 도우미 (모두 'YYYY-MM-DD' 글자 기준 · 한국 시간) ───────────── */
const kstToday = () => new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10)
const parse = (s) => new Date(s + 'T00:00:00Z')
const ymd = (d) => d.toISOString().slice(0, 10)
const addDays = (s, n) => ymd(new Date(parse(s).getTime() + n * 864e5))
const monthStart = (s) => s.slice(0, 7) + '-01'
const weekStart = (s) => addDays(s, -((parse(s).getUTCDay() + 6) % 7)) // 월요일 시작
const shiftMonths = (s, k) => {
  const [y, m, d] = s.split('-').map(Number)
  const t = y * 12 + (m - 1) + k
  const ny = Math.floor(t / 12), nm = t % 12
  const last = new Date(Date.UTC(ny, nm + 1, 0)).getUTCDate()
  return `${ny}-${String(nm + 1).padStart(2, '0')}-${String(Math.min(d, last)).padStart(2, '0')}`
}
const daysBetween = (a, b) => Math.round((parse(b) - parse(a)) / 864e5) + 1
const monthEnd = (s) => ymd(new Date(Date.UTC(+s.slice(0, 4), +s.slice(5, 7), 0)))

const PRESETS = [
  ['thisMonth', '이번 달'], ['lastMonth', '지난 달'], ['3m', '최근 3개월'], ['year', '올해'], ['all', '전체'], ['custom', '직접 선택']
]
// 기간과, 그 기간과 비교할 "이전 기간" — 월 단위 기간은 지난달과 같은 일수끼리 비교
function periodOf(preset, today, custom, minDate) {
  let from, to, shift = 0
  if (preset === 'thisMonth') { from = monthStart(today); to = today; shift = 1 }
  else if (preset === 'lastMonth') { const f = shiftMonths(monthStart(today), -1); from = f; to = monthEnd(f); shift = 1 }
  else if (preset === '3m') { from = shiftMonths(monthStart(today), -2); to = today; shift = 3 }
  else if (preset === 'year') { from = today.slice(0, 4) + '-01-01'; to = today; shift = 12 }
  else if (preset === 'all') { from = minDate || today; to = today }
  else { from = custom.from || today; to = custom.to || today }
  if (from > to) [from, to] = [to, from]
  let pf, pt
  if (shift) {
    pf = shiftMonths(from, -shift); pt = shiftMonths(to, -shift)
    if (preset === 'lastMonth') pt = monthEnd(pf)
  } else { const len = daysBetween(from, to); pt = addDays(from, -1); pf = addDays(pt, -(len - 1)) }
  return { from, to, pf, pt }
}

/* ───────────── 숫자 표시 ───────────── */
const fmt = (n) => Math.round(n || 0).toLocaleString('ko-KR')
const short = (n) => {
  const a = Math.abs(n)
  if (a >= 1e8) return `${(n / 1e8).toFixed(a >= 1e9 ? 0 : 1).replace(/\.0$/, '')}억`
  if (a >= 1e4) return `${Math.round(n / 1e4).toLocaleString('ko-KR')}만`
  return fmt(n)
}
const pctChange = (cur, prev) => (prev > 0 ? Math.round(((cur - prev) / prev) * 100) : cur > 0 ? null : 0)

const STATUS = { requested: '요청', approved: '승인', delivered: '전달완료', declined: '거절' }
const GOLD = '#B9720A', GOLD_SOFT = '#F0C77A', GRAY = '#C9D0D5'
const PALETTE = ['#B9720A', '#0E7C86', '#5B3FAE', '#C9456B', '#3B7A2A', '#2F6FB3', '#9A6B2F', '#7A8790']

/* ───────────── 그래프 (외부 라이브러리 없이 SVG) ───────────── */
function TrendChart({ data, metric }) {
  const W = 880, H = 320, L = 56, R = 16, T = 28, B = 46
  const max = Math.max(1, ...data.map((d) => d.value))
  const nice = (() => { const p = 10 ** Math.floor(Math.log10(max)); const m = max / p; return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * p })()
  const bw = (W - L - R) / Math.max(1, data.length)
  const every = Math.ceil(data.length / 14)
  const y = (v) => T + (H - T - B) * (1 - v / nice)
  if (!data.length) return <div className="py-16 text-center text-sm text-base-500">표시할 데이터가 없어요</div>
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="기간별 추이 그래프">
      {[0, 0.25, 0.5, 0.75, 1].map((f) => (
        <g key={f}>
          <line x1={L} x2={W - R} y1={y(nice * f)} y2={y(nice * f)} stroke="#E7EBED" />
          <text x={L - 8} y={y(nice * f) + 4} textAnchor="end" fontSize="12" fill="#7C8790">{metric === 'amount' ? short(nice * f) : fmt(nice * f)}</text>
        </g>
      ))}
      {data.map((d, i) => {
        const x = L + i * bw + bw * 0.16, w = bw * 0.68, h = (H - T - B) * (d.value / nice)
        return (
          <g key={d.key}>
            <rect x={x} y={y(d.value)} width={w} height={Math.max(h, d.value > 0 ? 2 : 0)} rx="4" fill={i === data.length - 1 ? GOLD : GOLD_SOFT} />
            {(data.length <= 16 || d.value === max) && d.value > 0 && (
              <text x={x + w / 2} y={y(d.value) - 6} textAnchor="middle" fontSize="12" fontWeight="700" fill="#232930">{metric === 'amount' ? short(d.value) : fmt(d.value)}</text>
            )}
            {i % every === 0 && <text x={x + w / 2} y={H - B + 18} textAnchor="middle" fontSize="12" fill="#576068">{d.label}</text>}
          </g>
        )
      })}
    </svg>
  )
}

function Donut({ rows, metric }) {
  const total = rows.reduce((s, r) => s + r.value, 0)
  const R = 70, C = 2 * Math.PI * R
  let acc = 0
  return (
    <div className="flex flex-wrap items-center gap-6">
      <svg viewBox="0 0 200 200" className="h-44 w-44 shrink-0" role="img" aria-label="비율 그래프">
        <circle cx="100" cy="100" r={R} fill="none" stroke="#F4F6F7" strokeWidth="30" />
        {total > 0 && rows.map((r, i) => {
          const len = (r.value / total) * C
          const el = <circle key={r.label} cx="100" cy="100" r={R} fill="none" stroke={PALETTE[i % PALETTE.length]} strokeWidth="30" strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-acc} transform="rotate(-90 100 100)" />
          acc += len
          return el
        })}
        <text x="100" y="96" textAnchor="middle" fontSize="12" fill="#7C8790">합계</text>
        <text x="100" y="118" textAnchor="middle" fontSize="18" fontWeight="800" fill="#232930">{metric === 'amount' ? short(total) : fmt(total)}</text>
      </svg>
      <ul className="min-w-0 flex-1 space-y-1.5 text-sm">
        {rows.map((r, i) => (
          <li key={r.label} className="flex items-center gap-2">
            <span className="h-3 w-3 shrink-0 rounded-sm" style={{ background: PALETTE[i % PALETTE.length] }} />
            <span className="min-w-0 flex-1 truncate text-base-300">{r.label}</span>
            <span className="shrink-0 font-semibold text-base-200">{total ? Math.round((r.value / total) * 100) : 0}%</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function RankBars({ rows, metric, unit }) {
  const max = Math.max(1, ...rows.flatMap((r) => [r.value, r.prev || 0]))
  if (!rows.length) return <div className="py-10 text-center text-sm text-base-500">표시할 데이터가 없어요</div>
  const show = (v) => (metric === 'amount' ? `${fmt(v)}원` : `${fmt(v)}${unit || ''}`)
  return (
    <ul className="space-y-3.5">
      {rows.map((r, i) => {
        const ch = pctChange(r.value, r.prev || 0)
        return (
          <li key={r.label}>
            <div className="mb-1 flex items-baseline justify-between gap-3">
              <span className="min-w-0 truncate text-sm font-medium text-base-200"><span className="mr-1.5 text-xs text-base-500">{i + 1}</span>{r.label}</span>
              <span className="shrink-0 text-sm font-bold text-base-100">{show(r.value)}
                {ch !== null && r.prev > 0 && <span className={`ml-2 text-xs font-semibold ${ch > 0 ? 'text-red-600' : ch < 0 ? 'text-teal-500' : 'text-base-500'}`}>{ch > 0 ? '▲' : ch < 0 ? '▼' : ''}{Math.abs(ch)}%</span>}
                {ch === null && <span className="ml-2 text-xs font-semibold text-violet-500">신규</span>}
              </span>
            </div>
            <div className="h-3.5 overflow-hidden rounded bg-base-900"><div className="h-full rounded" style={{ width: `${(r.value / max) * 100}%`, background: GOLD }} /></div>
            <div className="mt-1 h-1.5 overflow-hidden rounded bg-base-900" title="이전 기간"><div className="h-full rounded" style={{ width: `${((r.prev || 0) / max) * 100}%`, background: GRAY }} /></div>
          </li>
        )
      })}
    </ul>
  )
}

function Kpi({ label, value, sub, delta, tone }) {
  const Icon = delta == null ? null : delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Minus
  return (
    <div className="rounded-2xl border border-base-800 bg-base-950 p-5">
      <div className="text-sm text-base-400">{label}</div>
      <div className={`mt-1 text-3xl font-extrabold tracking-tight ${tone || 'text-base-100'}`}>{value}</div>
      <div className="mt-1 flex items-center gap-1.5 text-xs text-base-500">
        {Icon && <span className={`flex items-center gap-0.5 font-semibold ${delta > 0 ? 'text-red-600' : delta < 0 ? 'text-teal-500' : 'text-base-500'}`}><Icon size={14} />{delta === 0 ? '변동 없음' : `${Math.abs(delta)}%`}</span>}
        <span>{sub}</span>
      </div>
    </div>
  )
}

const Card = ({ title, right, children, className = '' }) => (
  <section className={`rounded-2xl border border-base-800 bg-base-950 p-5 ${className}`}>
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
      <h2 className="text-base font-bold text-base-100">{title}</h2>
      {right}
    </div>
    {children}
  </section>
)
const Seg = ({ value, onChange, options }) => (
  <div className="inline-flex overflow-hidden rounded-lg border border-base-700 text-xs">
    {options.map(([k, l]) => (
      <button key={k} onClick={() => onChange(k)} className={`px-3 py-1.5 font-medium ${value === k ? 'bg-mist-500 text-white' : 'bg-base-950 text-base-400 hover:bg-base-900'}`}>{l}</button>
    ))}
  </div>
)

/* ───────────── 집계 ───────────── */
function group(rows, keyFn) {
  const m = new Map()
  rows.forEach((r) => {
    const k = keyFn(r)
    const g = m.get(k) || { label: k, qty: 0, amount: 0, count: 0, noPrice: 0 }
    g.qty += r.qty; g.amount += r.amount || 0; g.count += 1; if (r.amount == null) g.noPrice += 1
    m.set(k, g)
  })
  return m
}
const norm = (s) => s.replace(/\s+/g, '').toLowerCase()

export default function SupplyStats({ embedded = false }) {
  const navigate = useNavigate()
  const [all, setAll] = useState(null)
  const [error, setError] = useState('')
  const [preset, setPreset] = useState('thisMonth')
  const [custom, setCustom] = useState({ from: '', to: '' })
  const [site, setSite] = useState('전체')
  const [q, setQ] = useState('')
  const [metric, setMetric] = useState('amount') // amount | qty
  const [bucket, setBucket] = useState('month') // week | month
  const [cmpTab, setCmpTab] = useState('item') // item | site
  const [withDeclined, setWithDeclined] = useState(false)
  const today = kstToday()

  const load = () => { setError(''); api.getSupplyStats().then((d) => setAll(d.rows || [])).catch((e) => setError(e.message)) }
  useEffect(load, [])

  const base = useMemo(() => (all || []).filter((r) => (withDeclined || r.status !== 'declined') && (!q.trim() || norm(r.item).includes(norm(q)) || norm(r.vendor).includes(norm(q)))), [all, withDeclined, q])
  const sites = useMemo(() => ['전체', ...[...group(base, (r) => r.site).values()].sort((a, b) => b.amount - a.amount || b.count - a.count).map((g) => g.label)], [base])
  const minDate = useMemo(() => (all || []).reduce((m, r) => (!m || r.date < m ? r.date : m), ''), [all])
  const per = periodOf(preset, today, custom, minDate)
  const inSite = (r) => site === '전체' || r.site === site
  const cur = useMemo(() => base.filter((r) => inSite(r) && r.date >= per.from && r.date <= per.to), [base, site, per.from, per.to])
  const prev = useMemo(() => base.filter((r) => inSite(r) && r.date >= per.pf && r.date <= per.pt), [base, site, per.pf, per.pt])
  const val = (g) => (metric === 'amount' ? g.amount : g.qty)

  const sum = (rows) => ({ qty: rows.reduce((s, r) => s + r.qty, 0), amount: rows.reduce((s, r) => s + (r.amount || 0), 0), count: rows.length, noPrice: rows.filter((r) => r.amount == null).length })
  const sc = sum(cur), sp = sum(prev)

  // 추이 — 주별(월요일 시작) / 월별. 데이터가 없는 구간도 0으로 채워 끊김 없이 보이게 함
  const trend = useMemo(() => {
    const rows = cur.length || !all ? cur : []
    const m = group(rows, (r) => (bucket === 'week' ? weekStart(r.date) : r.date.slice(0, 7)))
    const keys = []
    if (bucket === 'week') { for (let d = weekStart(per.from); d <= per.to; d = addDays(d, 7)) keys.push(d) }
    else { for (let d = monthStart(per.from); d <= per.to; d = shiftMonths(d, 1)) keys.push(d.slice(0, 7)) }
    return keys.slice(-60).map((k) => ({ key: k, label: bucket === 'week' ? `${+k.slice(5, 7)}/${+k.slice(8, 10)}` : `${+k.slice(5, 7)}월`, value: m.has(k) ? val(m.get(k)) : 0 }))
  }, [cur, bucket, metric, per.from, per.to, all])

  const rankOf = (keyFn, n = 10) => {
    const a = group(cur, keyFn), b = group(prev, keyFn)
    return [...a.values()].sort((x, y) => val(y) - val(x)).slice(0, n).map((g) => ({ label: g.label, value: val(g), prev: b.has(g.label) ? val(b.get(g.label)) : 0 }))
  }
  const itemRank = useMemo(() => rankOf((r) => r.item), [cur, prev, metric])
  const siteRank = useMemo(() => rankOf((r) => r.site, 12), [cur, prev, metric])
  const vendorRows = useMemo(() => {
    const g = [...group(cur.filter((r) => r.vendor), (r) => r.vendor).values()].sort((a, b) => val(b) - val(a))
    const top = g.slice(0, 7).map((x) => ({ label: x.label, value: val(x) }))
    const rest = g.slice(7).reduce((s, x) => s + val(x), 0)
    return rest > 0 ? [...top, { label: '기타', value: rest }] : top
  }, [cur, metric])

  // 비교표 — 항목별/현장별로 이번 기간 vs 이전 기간
  const cmpRows = useMemo(() => {
    const keyFn = cmpTab === 'item' ? (r) => r.item : (r) => r.site
    const a = group(cur, keyFn), b = group(prev, keyFn)
    const keys = new Set([...a.keys(), ...b.keys()])
    return [...keys].map((k) => {
      const x = a.get(k) || { qty: 0, amount: 0 }, y = b.get(k) || { qty: 0, amount: 0 }
      return { label: k, q1: x.qty, a1: x.amount, q0: y.qty, a0: y.amount }
    }).sort((x, y) => (metric === 'amount' ? y.a1 - x.a1 : y.q1 - x.q1) || (metric === 'amount' ? y.a0 - x.a0 : y.q0 - x.q0))
  }, [cur, prev, cmpTab, metric])

  const detail = useMemo(() => [...cur].sort((a, b) => b.date.localeCompare(a.date) || a.item.localeCompare(b.item, 'ko')), [cur])
  const [showAll, setShowAll] = useState(false)

  const exportExcel = () => {
    const rows = [
      ['날짜', '현장', '품목', '수량', '단가', '금액', '구매처', '구매방식', '상태', '요청자'],
      ...detail.map((r) => [r.date, r.site, r.item, r.qty, r.unitPrice ?? '', r.amount ?? '', r.vendor, r.method === 'offline' ? '오프라인' : r.method === 'online' ? '온라인' : r.method, STATUS[r.status] || r.status, r.worker])
    ]
    downloadXlsx(rows, `용품내역_${per.from}_${per.to}${site !== '전체' ? '_' + site : ''}`, '용품 내역')
  }
  const exportSummary = () => {
    const rows = [
      [cmpTab === 'item' ? '품목' : '현장', '이번 기간 수량', '이번 기간 금액', '이전 기간 수량', '이전 기간 금액', '금액 증감(%)'],
      ...cmpRows.map((r) => [r.label, r.q1, r.a1, r.q0, r.a0, pctChange(r.a1, r.a0) ?? '신규'])
    ]
    downloadXlsx(rows, `용품비교_${cmpTab === 'item' ? '품목별' : '현장별'}_${per.from}_${per.to}`, '비교')
  }

  const periodLabel = `${per.from} ~ ${per.to}`
  const prevLabel = `${per.pf} ~ ${per.pt}`
  const unitLabel = metric === 'amount' ? '원' : '개'

  return (
    <div id="print-supply-stats">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
        {embedded ? <span /> : <h1 className="text-xl font-semibold text-page-text">용품 통계</h1>}
        <div className="flex flex-wrap gap-2 print:hidden">
          <PrintButton targetId="print-supply-stats" title={`용품 통계_${per.from}_${per.to}`} />
          <button onClick={load} className="focus-ring flex items-center gap-1.5 rounded-lg border border-page-border bg-page-soft px-3 py-1.5 text-xs text-page-sub hover:text-page-text"><RefreshCw size={14} /> 새로고침</button>
          <button onClick={() => navigate(-1)} className="focus-ring flex items-center gap-1.5 rounded-lg border border-page-border bg-page-soft px-3 py-1.5 text-xs text-page-sub hover:bg-page-border hover:text-page-text"><ArrowLeft size={14} /> <span className="hidden sm:inline">뒤로가기</span></button>
        </div>
      </div>

      {error && <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-amber-400">{error}</div>}
      {!all && !error && <div className="py-20 text-center text-sm text-page-sub">불러오는 중…</div>}

      {all && (
        <>
          {/* 조건 선택 */}
          <div className="mb-5 space-y-3 rounded-2xl border border-page-border bg-page-soft p-4 print:hidden">
            <div className="flex flex-wrap items-center gap-2">
              {PRESETS.map(([k, l]) => (
                <button key={k} onClick={() => setPreset(k)} className={`focus-ring rounded-full px-3.5 py-1.5 text-sm ${preset === k ? 'bg-mist-500 font-semibold text-white' : 'border border-page-border text-page-sub hover:text-page-text'}`}>{l}</button>
              ))}
              {preset === 'custom' && (
                <span className="flex items-center gap-1.5 text-sm text-page-sub">
                  <input type="date" value={custom.from} onChange={(e) => setCustom({ ...custom, from: e.target.value })} className="rounded-lg border border-base-700 bg-base-900 px-2 py-1 text-base-100" /> ~
                  <input type="date" value={custom.to} onChange={(e) => setCustom({ ...custom, to: e.target.value })} className="rounded-lg border border-base-700 bg-base-900 px-2 py-1 text-base-100" />
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select value={site} onChange={(e) => setSite(e.target.value)} className="focus-ring rounded-lg border border-base-700 bg-base-900 px-3 py-2 text-sm text-base-100">
                {sites.map((s) => <option key={s}>{s}</option>)}
              </select>
              <div className="flex min-w-[180px] flex-1 items-center gap-2 rounded-lg border border-base-700 bg-base-900 px-3 py-2">
                <Search size={14} className="text-base-500" />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="품목·구매처 검색" className="w-full bg-transparent text-sm text-base-100 outline-none placeholder:text-base-500" />
              </div>
              <label className="flex cursor-pointer items-center gap-1.5 text-sm text-page-sub"><input type="checkbox" checked={withDeclined} onChange={(e) => setWithDeclined(e.target.checked)} /> 거절한 요청 포함</label>
              <Seg value={metric} onChange={setMetric} options={[['amount', '금액 기준'], ['qty', '수량 기준']]} />
            </div>
            <div className="text-xs text-page-sub">조회 기간 <b className="text-page-text">{periodLabel}</b> · 비교 기간 <b className="text-page-text">{prevLabel}</b></div>
          </div>

          {/* 핵심 숫자 */}
          <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Kpi label="총 사용 금액" value={`${fmt(sc.amount)}원`} delta={pctChange(sc.amount, sp.amount)} sub={`이전 ${fmt(sp.amount)}원`} tone="text-mist-500" />
            <Kpi label="총 사용 수량" value={`${fmt(sc.qty)}개`} delta={pctChange(sc.qty, sp.qty)} sub={`이전 ${fmt(sp.qty)}개`} />
            <Kpi label="요청 건수" value={`${fmt(sc.count)}건`} delta={pctChange(sc.count, sp.count)} sub={`이전 ${fmt(sp.count)}건`} />
            <Kpi label="건당 평균 금액" value={`${fmt((sc.count - sc.noPrice) ? sc.amount / (sc.count - sc.noPrice) : 0)}원`} delta={pctChange((sc.count - sc.noPrice) ? sc.amount / (sc.count - sc.noPrice) : 0, (sp.count - sp.noPrice) ? sp.amount / (sp.count - sp.noPrice) : 0)} sub="가격 입력된 건 기준" />
          </div>
          {sc.noPrice > 0 && (
            <div className="mb-5 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3.5 text-sm text-amber-400 print:hidden">
              이 기간 {sc.count}건 중 <b>{sc.noPrice}건은 가격이 입력되지 않아</b> 금액에 포함되지 않았어요. 어플 → 관리자 → 용품에서 "구매 정보"를 입력하면 금액 통계가 정확해져요.
            </div>
          )}

          <div className="grid gap-5 lg:grid-cols-2">
            <Card className="lg:col-span-2" title={`${bucket === 'week' ? '주별' : '월별'} ${metric === 'amount' ? '사용 금액' : '사용 수량'} 추이`}
              right={<Seg value={bucket} onChange={setBucket} options={[['week', '주별'], ['month', '월별']]} />}>
              <TrendChart data={trend} metric={metric} />
            </Card>
            <Card title="현장별 (진한 막대 = 이번 기간, 회색 = 이전 기간)"><RankBars rows={siteRank} metric={metric} unit="개" /></Card>
            <Card title="품목별 TOP 10 (진한 막대 = 이번 기간, 회색 = 이전 기간)"><RankBars rows={itemRank} metric={metric} unit="개" /></Card>
            <Card title={`구매처별 ${metric === 'amount' ? '금액' : '수량'} 비율`}>
              {vendorRows.length ? <Donut rows={vendorRows} metric={metric} /> : <div className="py-10 text-center text-sm text-base-500">구매처가 입력된 내역이 없어요</div>}
            </Card>
            <Card title="현장별 비율">
              {siteRank.length ? <Donut rows={(() => { const t = siteRank.slice(0, 7); const rest = [...group(cur, (r) => r.site).values()].sort((a, b) => val(b) - val(a)).slice(7).reduce((s, g) => s + val(g), 0); return rest > 0 ? [...t.map(({ label, value }) => ({ label, value })), { label: '기타', value: rest }] : t.map(({ label, value }) => ({ label, value })) })()} metric={metric} /> : <div className="py-10 text-center text-sm text-base-500">내역이 없어요</div>}
            </Card>

            <Card className="lg:col-span-2" title="이번 기간 vs 이전 기간 비교"
              right={<div className="flex flex-wrap items-center gap-2 print:hidden"><Seg value={cmpTab} onChange={setCmpTab} options={[['item', '품목별'], ['site', '현장별']]} />
                <button onClick={exportSummary} className="focus-ring flex items-center gap-1 rounded-lg border border-base-700 px-2.5 py-1.5 text-xs text-base-400 hover:bg-base-900"><FileSpreadsheet size={13} /> 엑셀</button></div>}>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[620px] text-sm">
                  <thead><tr className="border-b border-base-800 text-left text-xs text-base-500">
                    <th className="py-2 pr-3 font-medium">{cmpTab === 'item' ? '품목' : '현장'}</th>
                    <th className="px-3 text-right font-medium">이번 수량</th><th className="px-3 text-right font-medium">이번 금액</th>
                    <th className="px-3 text-right font-medium">이전 수량</th><th className="px-3 text-right font-medium">이전 금액</th><th className="pl-3 text-right font-medium">금액 증감</th>
                  </tr></thead>
                  <tbody>
                    {cmpRows.slice(0, 40).map((r) => {
                      const ch = pctChange(r.a1, r.a0)
                      return (
                        <tr key={r.label} className="border-b border-base-900">
                          <td className="py-2 pr-3 font-medium text-base-200">{r.label}</td>
                          <td className="px-3 text-right tabular-nums">{fmt(r.q1)}</td><td className="px-3 text-right font-semibold tabular-nums">{fmt(r.a1)}원</td>
                          <td className="px-3 text-right tabular-nums text-base-500">{fmt(r.q0)}</td><td className="px-3 text-right tabular-nums text-base-500">{fmt(r.a0)}원</td>
                          <td className={`pl-3 text-right font-bold tabular-nums ${ch === null ? 'text-violet-500' : ch > 0 ? 'text-red-600' : ch < 0 ? 'text-teal-500' : 'text-base-500'}`}>
                            {ch === null ? '신규' : ch === 0 ? (r.a0 === 0 && r.a1 === 0 ? '-' : '0%') : `${ch > 0 ? '▲' : '▼'} ${Math.abs(ch)}%`}
                          </td>
                        </tr>
                      )
                    })}
                    {!cmpRows.length && <tr><td colSpan="6" className="py-8 text-center text-base-500">비교할 내역이 없어요</td></tr>}
                  </tbody>
                </table>
              </div>
              <p className="mt-2 text-xs text-base-500">증감은 금액 기준이에요. ▲(붉은색)은 늘어난 것, ▼(청록색)은 줄어든 것입니다.</p>
            </Card>

            <Card className="lg:col-span-2" title={`상세 내역 (${fmt(detail.length)}건)`}
              right={<button onClick={exportExcel} className="focus-ring flex items-center gap-1.5 rounded-lg border border-base-700 px-3 py-1.5 text-xs text-base-400 hover:bg-base-900 print:hidden"><FileSpreadsheet size={14} /> 엑셀 다운로드</button>}>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-sm">
                  <thead><tr className="border-b border-base-800 text-left text-xs text-base-500">
                    <th className="py-2 pr-3 font-medium">날짜</th><th className="px-3 font-medium">현장</th><th className="px-3 font-medium">품목</th>
                    <th className="px-3 text-right font-medium">수량</th><th className="px-3 text-right font-medium">단가</th><th className="px-3 text-right font-medium">금액</th>
                    <th className="px-3 font-medium">구매처</th><th className="pl-3 font-medium">상태</th>
                  </tr></thead>
                  <tbody>
                    {(showAll ? detail : detail.slice(0, 50)).map((r) => (
                      <tr key={r.id} className="border-b border-base-900">
                        <td className="py-2 pr-3 tabular-nums text-base-400">{r.date}</td><td className="px-3 text-base-300">{r.site}</td><td className="px-3 font-medium text-base-200">{r.item}</td>
                        <td className="px-3 text-right tabular-nums">{fmt(r.qty)}</td>
                        <td className="px-3 text-right tabular-nums text-base-400">{r.unitPrice != null ? fmt(r.unitPrice) : '-'}</td>
                        <td className="px-3 text-right font-semibold tabular-nums">{r.amount != null ? `${fmt(r.amount)}원` : <span className="text-amber-500">미입력</span>}</td>
                        <td className="px-3 text-base-400">{r.vendor || '-'}</td><td className="pl-3 text-xs text-base-400">{STATUS[r.status] || r.status}</td>
                      </tr>
                    ))}
                    {!detail.length && <tr><td colSpan="8" className="py-8 text-center text-base-500">이 조건에 맞는 내역이 없어요</td></tr>}
                  </tbody>
                </table>
              </div>
              {detail.length > 50 && !showAll && <button onClick={() => setShowAll(true)} className="mt-3 w-full rounded-lg border border-base-700 py-2 text-sm text-base-400 hover:bg-base-900 print:hidden">나머지 {detail.length - 50}건 모두 보기</button>}
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
