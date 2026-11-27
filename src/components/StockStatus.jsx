import { useEffect, useMemo, useState } from 'react'
import { RefreshCw, FileSpreadsheet, Search } from 'lucide-react'
import { api } from '../lib/api'
import { downloadXlsx } from '../lib/xlsx'
import PrintButton from './PrintButton'

/* 어플 '현장별 재고'(수량이 바뀔 때마다 변동 기록이 남음) + 용품 요청/구매 내역을 합쳐서
   "지금 재고 / 최근 60일 사용량 / 소진 예상일 / 최근 구매 단가"를 한 줄로 보여주는 화면(읽기 전용).
   사용량 = 변동 기록에서 수량이 줄어든 만큼. 입고 = 늘어난 만큼. */
const DAY = 864e5
const WINDOW = 60 // 사용 속도를 계산하는 최근 일수
const norm = (s) => (s || '').replace(/\s+/g, '').toLowerCase()
const fmt = (n) => Number(n).toLocaleString('ko-KR')
const mmdd = (t) => { const d = new Date(t + 9 * 3600e3); return `${d.getUTCMonth() + 1}/${d.getUTCDate()}` }

const STATUS = {
  out: { label: '품절', cls: 'bg-red-500/10 text-red-600', rank: 0 },
  order: { label: '발주 필요', cls: 'bg-red-500/10 text-red-600', rank: 1 },
  soon: { label: '주의', cls: 'bg-amber-500/15 text-amber-600', rank: 2 },
  ok: { label: '충분', cls: 'bg-teal-500/10 text-teal-600', rank: 3 },
  idle: { label: '사용 없음', cls: 'bg-base-800 text-base-400', rank: 4 },
  thin: { label: '기록 쌓는 중', cls: 'bg-base-800 text-base-400', rank: 5 }
}

function analyze(inventory, invLog, rows, now) {
  const logBy = new Map()
  invLog.forEach((l) => { if (!logBy.has(l.itemId)) logBy.set(l.itemId, []); logBy.get(l.itemId).push(l) })
  // 구매 내역: 현장+품목명(공백·대소문자 무시)이 같은 것끼리 연결
  const buyBy = new Map()
  rows.filter((r) => r.status !== 'declined').forEach((r) => {
    const k = norm(r.site) + '|' + norm(r.item)
    if (!buyBy.has(k)) buyBy.set(k, [])
    buyBy.get(k).push(r)
  })
  const since = now - WINDOW * DAY
  return inventory.map((it) => {
    const log = (logBy.get(it.id) || []).slice().sort((a, b) => a.at.localeCompare(b.at))
    let used = 0, added = 0
    for (let i = 1; i < log.length; i++) {
      if (new Date(log[i].at).getTime() < since) continue
      const d = log[i].qty - log[i - 1].qty
      if (d < 0) used += -d
      else added += d
    }
    const first = log.length ? new Date(log[0].at).getTime() : now
    const observed = Math.min(WINDOW, Math.max(1, Math.ceil((now - first) / DAY)))
    const daily = used / Math.max(observed, 7) // 기록이 너무 짧을 때 사용 속도가 부풀려지지 않게 최소 7일로 나눔
    const monthly = daily * 30
    const days = daily > 0 ? it.qty / daily : null
    let status
    if (it.qty <= 0) status = 'out'
    else if (used === 0) status = observed < 14 ? 'thin' : 'idle'
    else if (days <= 14) status = 'order'
    else if (days <= 30) status = 'soon'
    else status = 'ok'
    const buys = (buyBy.get(norm(it.site) + '|' + norm(it.name)) || []).slice().sort((a, b) => b.date.localeCompare(a.date))
    const priced = buys.find((b) => b.unitPrice != null || (b.amount != null && b.qty > 0))
    const unitPrice = priced ? (priced.unitPrice != null ? priced.unitPrice : Math.round(priced.amount / priced.qty)) : null
    const suggest = status === 'out' || status === 'order' || status === 'soon' ? Math.max(1, Math.ceil(monthly - it.qty)) : 0
    return {
      ...it, used, added, observed, daily, monthly, days, status, unitPrice,
      lastBuy: buys[0] ? buys[0].date : '', suggest,
      suggestCost: unitPrice != null && suggest > 0 ? suggest * unitPrice : null,
      empty: days != null ? now + days * DAY : null
    }
  })
}

const Kpi = ({ label, value, sub, tone }) => (
  <div className="rounded-2xl border border-base-800 bg-base-950 p-5">
    <div className="text-sm text-base-400">{label}</div>
    <div className={`mt-1 text-3xl font-extrabold tracking-tight ${tone || 'text-base-100'}`}>{value}</div>
    <div className="mt-1 text-xs text-base-500">{sub}</div>
  </div>
)
const Card = ({ title, right, children }) => (
  <section className="mb-5 rounded-2xl border border-base-800 bg-base-950 p-5">
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
      <h2 className="text-base font-bold text-base-100">{title}</h2>
      {right}
    </div>
    {children}
  </section>
)
const Badge = ({ s }) => <span className={`whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS[s].cls}`}>{STATUS[s].label}</span>

function CompareBars({ list }) {
  const max = Math.max(1, ...list.flatMap((x) => [x.qty, x.monthly]))
  return (
    <ul className="space-y-3">
      {list.map((x) => (
        <li key={x.id}>
          <div className="mb-1 flex items-center justify-between gap-2 text-xs">
            <span className="min-w-0 truncate text-base-200">{x.name} <span className="text-base-500">· {x.site}</span></span>
            <Badge s={x.status} />
          </div>
          <div className="flex items-center gap-2 text-[11px]">
            <span className="w-16 shrink-0 text-base-500">현재 재고</span>
            <div className="h-3 flex-1 rounded bg-base-900"><div className="h-3 rounded" style={{ width: `${(x.qty / max) * 100}%`, background: '#0E7C86' }} /></div>
            <span className="w-16 shrink-0 text-right font-semibold text-base-200">{fmt(x.qty)}{x.unit}</span>
          </div>
          <div className="mt-1 flex items-center gap-2 text-[11px]">
            <span className="w-16 shrink-0 text-base-500">30일 사용</span>
            <div className="h-3 flex-1 rounded bg-base-900"><div className="h-3 rounded" style={{ width: `${(x.monthly / max) * 100}%`, background: '#B9720A' }} /></div>
            <span className="w-16 shrink-0 text-right font-semibold text-base-200">{fmt(Math.round(x.monthly * 10) / 10)}{x.unit}</span>
          </div>
        </li>
      ))}
    </ul>
  )
}

export default function StockStatus() {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [site, setSite] = useState('전체')
  const [flt, setFlt] = useState('all') // all | need
  const [q, setQ] = useState('')

  const load = () => { setError(''); api.getSupplyStats().then(setData).catch((e) => setError(e.message)) }
  useEffect(load, [])

  const now = useMemo(() => Date.now(), [data])
  const items = useMemo(() => (data ? analyze(data.inventory || [], data.invLog || [], data.rows || [], now) : []), [data, now])
  const sites = useMemo(() => ['전체', ...[...new Set(items.map((i) => i.site))].sort((a, b) => a.localeCompare(b, 'ko'))], [items])
  const shown = useMemo(() => items
    .filter((i) => (site === '전체' || i.site === site) && (!q.trim() || norm(i.name).includes(norm(q))) && (flt === 'all' || STATUS[i.status].rank <= 2))
    .sort((a, b) => STATUS[a.status].rank - STATUS[b.status].rank || (a.days ?? 1e9) - (b.days ?? 1e9) || a.site.localeCompare(b.site, 'ko') || a.name.localeCompare(b.name, 'ko')),
  [items, site, q, flt])

  const scope = items.filter((i) => site === '전체' || i.site === site)
  const cnt = (s) => scope.filter((i) => i.status === s).length
  const needList = scope.filter((i) => STATUS[i.status].rank <= 2).sort((a, b) => STATUS[a.status].rank - STATUS[b.status].rank || (a.days ?? 0) - (b.days ?? 0))
  const needCost = needList.reduce((s, i) => s + (i.suggestCost || 0), 0)
  const needNoPrice = needList.filter((i) => i.suggest > 0 && i.suggestCost == null).length
  const compare = shown.filter((i) => i.monthly > 0).slice(0, 10)
  const noBuy = scope.filter((i) => !i.lastBuy).length

  const daysText = (i) => (i.status === 'out' ? '지금 없음' : i.days == null ? '—' : `약 ${Math.max(1, Math.round(i.days))}일 (${mmdd(i.empty)})`)

  const exportExcel = () => {
    const rows = [
      ['현장', '품목', '현재 재고', '단위', `최근 ${WINDOW}일 사용`, `최근 ${WINDOW}일 입고`, '30일 환산 사용', '소진 예상', '상태', '권장 발주 수량(30일치)', '최근 구매 단가', '예상 발주 금액', '최근 구매일', '메모'],
      ...shown.map((i) => [i.site, i.name, i.qty, i.unit, i.used, i.added, Math.round(i.monthly * 10) / 10, i.status === 'out' ? '품절' : i.days == null ? '' : `${Math.round(i.days)}일`, STATUS[i.status].label, i.suggest || '', i.unitPrice ?? '', i.suggestCost ?? '', i.lastBuy, i.note])
    ]
    downloadXlsx(rows, `재고소진예상_${site}_${new Date().toLocaleDateString('sv-SE')}`, '재고 현황')
  }

  if (error) return <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-amber-400">{error}</div>
  if (!data) return <div className="py-20 text-center text-sm text-page-sub">불러오는 중…</div>

  return (
    <div id="print-stock-status">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 print:hidden">
        <p className="text-xs text-page-sub">앱의 '현장별 재고' 기준 · 수량이 줄어든 만큼을 사용량으로 계산합니다 (읽기 전용)</p>
        <div className="flex flex-wrap gap-2">
          <PrintButton targetId="print-stock-status" title={`재고 소진 예상_${new Date().toLocaleDateString('sv-SE')}`} />
          <button onClick={load} className="focus-ring flex items-center gap-1.5 rounded-lg border border-page-border bg-page-soft px-3 py-1.5 text-xs text-page-sub hover:text-page-text"><RefreshCw size={14} /> 새로고침</button>
          <button onClick={exportExcel} className="focus-ring flex items-center gap-1.5 rounded-lg border border-page-border bg-page-soft px-3 py-1.5 text-xs text-page-sub hover:text-page-text"><FileSpreadsheet size={14} /> 엑셀 다운로드</button>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-base-800 bg-base-950 p-10 text-center text-sm text-base-400">
          앱에 등록된 현장별 재고가 아직 없어요. 앱 관리자 화면 → 재고에서 품목을 등록하면 여기에 나타납니다.
        </div>
      ) : (
        <>
          <div className="mb-5 space-y-3 rounded-2xl border border-page-border bg-page-soft p-4 print:hidden">
            <div className="flex flex-wrap gap-2">
              {sites.map((s) => (
                <button key={s} onClick={() => setSite(s)} className={`focus-ring rounded-full px-3.5 py-1.5 text-sm ${site === s ? 'bg-mist-500 font-semibold text-white' : 'border border-page-border text-page-sub hover:text-page-text'}`}>{s}</button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-base-500" />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="품목 검색" className="focus-ring rounded-lg border border-base-700 bg-base-900 py-1.5 pl-8 pr-3 text-sm placeholder:text-base-500" />
              </div>
              <div className="inline-flex overflow-hidden rounded-lg border border-base-700 text-xs">
                {[['all', '전체'], ['need', '발주 필요·주의만']].map(([k, l]) => (
                  <button key={k} onClick={() => setFlt(k)} className={`px-3 py-1.5 font-medium ${flt === k ? 'bg-mist-500 text-white' : 'bg-base-950 text-base-400 hover:bg-base-900'}`}>{l}</button>
                ))}
              </div>
            </div>
          </div>

          <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Kpi label="관리 품목" value={`${scope.length}개`} sub={site === '전체' ? `${sites.length - 1}개 현장` : site} />
            <Kpi label="발주 필요" value={`${cnt('out') + cnt('order')}개`} sub="품절 또는 14일 안에 소진 예상" tone={cnt('out') + cnt('order') ? 'text-red-600' : undefined} />
            <Kpi label="주의" value={`${cnt('soon')}개`} sub="15~30일 안에 소진 예상" tone={cnt('soon') ? 'text-amber-600' : undefined} />
            <Kpi label="예상 발주 금액" value={needCost ? `${fmt(needCost)}원` : '—'} sub={needNoPrice ? `30일치 기준 · 단가 없는 ${needNoPrice}개 제외` : '30일치 기준 권장 수량 × 최근 단가'} />
          </div>

          {needList.length > 0 && (
            <Card title={`발주 필요 목록 (${needList.length}개)`}>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-sm">
                  <thead><tr className="border-b border-base-800 text-left text-xs text-base-500">
                    <th className="py-2 pr-3 font-medium">품목</th><th className="py-2 pr-3 font-medium">현장</th><th className="py-2 pr-3 text-right font-medium">재고</th>
                    <th className="py-2 pr-3 font-medium">소진 예상</th><th className="py-2 pr-3 text-right font-medium">권장 발주(30일치)</th><th className="py-2 text-right font-medium">예상 금액</th>
                  </tr></thead>
                  <tbody>
                    {needList.map((i) => (
                      <tr key={i.id} className="border-b border-base-800/60 last:border-0">
                        <td className="py-2.5 pr-3 text-base-100">{i.name}</td>
                        <td className="py-2.5 pr-3 text-base-400">{i.site}</td>
                        <td className="py-2.5 pr-3 text-right font-semibold text-base-200">{fmt(i.qty)}{i.unit}</td>
                        <td className={`py-2.5 pr-3 ${i.status === 'soon' ? 'text-amber-600' : 'text-red-600'}`}>{daysText(i)}</td>
                        <td className="py-2.5 pr-3 text-right text-base-200">{i.suggest ? `${fmt(i.suggest)}${i.unit}` : '—'}</td>
                        <td className="py-2.5 text-right text-base-300">{i.suggestCost != null ? `${fmt(i.suggestCost)}원` : <span className="text-base-500">단가 없음</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {compare.length > 0 && (
            <Card title="품목별 재고 vs 30일 사용량" right={<span className="text-xs text-base-500">사용량이 있는 품목 · 급한 순</span>}>
              <CompareBars list={compare} />
            </Card>
          )}

          <Card title={`전체 재고 (${shown.length}개)`}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead><tr className="border-b border-base-800 text-left text-xs text-base-500">
                  <th className="py-2 pr-3 font-medium">현장</th><th className="py-2 pr-3 font-medium">품목</th><th className="py-2 pr-3 text-right font-medium">재고</th>
                  <th className="py-2 pr-3 text-right font-medium">{WINDOW}일 사용</th><th className="py-2 pr-3 text-right font-medium">{WINDOW}일 입고</th>
                  <th className="py-2 pr-3 font-medium">소진 예상</th><th className="py-2 pr-3 text-right font-medium">최근 단가</th><th className="py-2 font-medium">상태</th>
                </tr></thead>
                <tbody>
                  {shown.map((i) => (
                    <tr key={i.id} className="border-b border-base-800/60 last:border-0">
                      <td className="py-2.5 pr-3 text-base-400">{i.site}</td>
                      <td className="py-2.5 pr-3 text-base-100">{i.name}{i.note && <span className="ml-1.5 text-xs text-base-500">{i.note}</span>}</td>
                      <td className="py-2.5 pr-3 text-right font-semibold text-base-200">{fmt(i.qty)}{i.unit}</td>
                      <td className="py-2.5 pr-3 text-right text-base-300">{i.used ? `${fmt(i.used)}${i.unit}` : '—'}</td>
                      <td className="py-2.5 pr-3 text-right text-base-300">{i.added ? `${fmt(i.added)}${i.unit}` : '—'}</td>
                      <td className="py-2.5 pr-3 text-base-300">{daysText(i)}</td>
                      <td className="py-2.5 pr-3 text-right text-base-300">{i.unitPrice != null ? `${fmt(i.unitPrice)}원` : '—'}</td>
                      <td className="py-2.5"><Badge s={i.status} /></td>
                    </tr>
                  ))}
                  {shown.length === 0 && <tr><td colSpan={8} className="py-8 text-center text-sm text-base-500">조건에 맞는 품목이 없어요.</td></tr>}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-base-500">
              · 사용량은 앱에서 재고 수량을 줄인 기록으로 계산해요. 기록이 14일보다 짧으면 '기록 쌓는 중'으로 표시됩니다.<br />
              · 최근 단가는 같은 현장·같은 품목명으로 요청·구매한 내역에서 가져와요{noBuy ? ` (연결된 구매 내역이 없는 품목 ${noBuy}개는 '—')` : ''}. 이름을 똑같이 써야 연결돼요.
            </p>
          </Card>
        </>
      )}
    </div>
  )
}
