import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Package, ShieldCheck, Users, Building2 } from 'lucide-react'

const items = [
  { to: '/', label: '대시보드', icon: LayoutDashboard, end: true },
  { to: '/workers', label: '근로자', icon: Users },
  { to: '/sites', label: '현장', icon: Building2 },
  { to: '/inventory', label: '재고', icon: Package },
  { to: '/safety', label: '안전교육', icon: ShieldCheck }
]

export default function MobileNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-20 flex border-t border-base-800 bg-base-950/95 backdrop-blur md:hidden">
      {items.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            `focus-ring flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] ${
              isActive ? 'text-mist-400' : 'text-base-400'
            }`
          }
        >
          <Icon size={19} strokeWidth={2} />
          {label}
        </NavLink>
      ))}
    </nav>
  )
}
