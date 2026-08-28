import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Package, ShieldCheck, Users, Building2 } from 'lucide-react'

const items = [
  { to: '/', label: '출퇴근 대시보드', icon: LayoutDashboard, end: true },
  { to: '/workers', label: '근로자 현황', icon: Users },
  { to: '/sites', label: '현장 현황', icon: Building2 },
  { to: '/inventory', label: '재고 현황', icon: Package },
  { to: '/safety', label: '안전교육', icon: ShieldCheck }
]

export default function Sidebar() {
  return (
    <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-base-800 bg-base-950 px-4 py-6">
      <p className="mb-8 px-2 text-sm font-semibold leading-snug text-base-100">
        (주)이엘씨_대치남 통합 관리
      </p>

      <nav className="flex flex-col gap-1">
        {items.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `focus-ring flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                isActive
                  ? 'bg-mist-500/15 text-mist-500 font-medium'
                  : 'text-base-300 hover:bg-base-800 hover:text-base-100'
              }`
            }
          >
            <Icon size={18} strokeWidth={2} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto flex items-center gap-2 rounded-lg border border-base-800 px-3 py-2.5 text-xs text-base-400">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-mist-500 opacity-60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-mist-500" />
        </span>
        현장 데이터 실시간 연동 중
      </div>
    </aside>
  )
}
