import { useEffect, useState } from 'react'
import { Routes, Route } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import MobileNav from './components/MobileNav'
import Dashboard from './components/Dashboard'
import Workers from './components/Workers'
import Sites from './components/Sites'
import SpotJobs from './components/SpotJobs'
import Inventory from './components/Inventory'
import SafetyTraining from './components/SafetyTraining'
import Training from './components/Training'
import ClientReports from './components/ClientReports'
import ClientReportView from './components/ClientReportView'

function AdminLayout({ children }) {
  return (
    <div className="flex min-h-screen bg-page-bg">
      <Sidebar />
      <main className="flex-1 overflow-x-hidden px-4 pb-24 pt-6 sm:px-8 sm:pb-8">{children}</main>
      <MobileNav />
    </div>
  )
}

// 어플(daechinam-app)과 같은 다크 네이비 + 골드 브랜드로 맞춘 접속 인트로 화면
function Splash() {
  return (
    <div
      className="fixed inset-0 z-[999] flex flex-col items-center justify-center gap-3"
      style={{ background: '#1D232A' }}
    >
      <div
        className="flex h-14 w-14 items-center justify-center rounded-2xl"
        style={{ background: 'rgba(185,114,10,0.18)' }}
      >
        <span className="text-xl font-bold" style={{ color: '#EB9E18' }}>D</span>
      </div>
      <p className="text-sm font-semibold tracking-wide" style={{ color: '#F5F1EA' }}>DAECHINAM</p>
      <p className="text-[11px]" style={{ color: '#9BA3AB' }}>통합 관리</p>
    </div>
  )
}

export default function App() {
  const [showSplash, setShowSplash] = useState(true)
  useEffect(() => {
    const t = setTimeout(() => setShowSplash(false), 700)
    return () => clearTimeout(t)
  }, [])

  return (
    <>
      {showSplash && <Splash />}
      <Routes>
        {/* 근로자용 / 업체 담당자용 — 관리 UI 없이 독립된 화면 */}
        <Route path="/training" element={<Training />} />
        <Route path="/client-report" element={<ClientReportView />} />

        {/* 본사 관리용 — 사이드바 포함 */}
        <Route
          path="/*"
          element={
            <AdminLayout>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/workers" element={<Workers />} />
                <Route path="/sites" element={<Sites />} />
                <Route path="/spot-jobs" element={<SpotJobs />} />
                <Route path="/inventory" element={<Inventory />} />
                <Route path="/safety" element={<SafetyTraining />} />
                <Route path="/client-reports" element={<ClientReports />} />
              </Routes>
            </AdminLayout>
          }
        />
      </Routes>
    </>
  )
}
