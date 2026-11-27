import { useState } from 'react'
import StockStatus from './StockStatus'
import SupplyStats from './SupplyStats'
import Inventory from './Inventory'

// 재고 현황 + 용품 통계를 한 화면(메뉴 하나)으로 묶는 껍데기.
// 탭: 재고·소진 예상(어플 재고 기준) / 사용·금액 통계 / 기존 재고 장부(관리자 사이트에 따로 입력해 둔 재고)
const TABS = [
  ['stock', '재고·소진 예상'],
  ['stats', '사용·금액 통계'],
  ['ledger', '기존 재고 장부']
]

const initialTab = () => {
  try {
    const t = new URLSearchParams(window.location.search).get('tab')
    return TABS.some(([k]) => k === t) ? t : 'stock'
  } catch {
    return 'stock'
  }
}

export default function SupplyHub() {
  const [tab, setTab] = useState(initialTab)
  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold text-page-text">용품 현황</h1>
      <div className="mb-5 flex gap-1 overflow-x-auto border-b border-page-border print:hidden">
        {TABS.map(([k, l]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`focus-ring -mb-px whitespace-nowrap border-b-2 px-4 py-2.5 text-sm ${
              tab === k ? 'border-mist-500 font-semibold text-page-text' : 'border-transparent text-page-sub hover:text-page-text'
            }`}
          >
            {l}
          </button>
        ))}
      </div>
      {tab === 'stock' && <StockStatus />}
      {tab === 'stats' && <SupplyStats embedded />}
      {tab === 'ledger' && <Inventory />}
    </div>
  )
}
