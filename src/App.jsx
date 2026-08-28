import { Routes, Route } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import MobileNav from './components/MobileNav'
import Dashboard from './components/Dashboard'
import Workers from './components/Workers'
import Sites from './components/Sites'
import Inventory from './components/Inventory'
import SafetyTraining from './components/SafetyTraining'
import Training from './components/Training'

function AdminLayout({ children }) {
  return (
    <div className="flex min-h-screen bg-base-900">
      <Sidebar />
      <main className="flex-1 overflow-x-hidden px-4 pb-24 pt-6 sm:px-8 sm:pb-8">{children}</main>
      <MobileNav />
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      {/* 근로자용 — 관리 UI 없이 독립된 화면 */}
      <Route path="/training" element={<Training />} />

      {/* 본사 관리용 — 사이드바 포함 */}
      <Route
        path="/*"
        element={
          <AdminLayout>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/workers" element={<Workers />} />
              <Route path="/sites" element={<Sites />} />
              <Route path="/inventory" element={<Inventory />} />
              <Route path="/safety" element={<SafetyTraining />} />
            </Routes>
          </AdminLayout>
        }
      />
    </Routes>
  )
}
