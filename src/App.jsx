import { Routes, Route } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import MobileNav from './components/MobileNav'
import Dashboard from './components/Dashboard'
import Inventory from './components/Inventory'
import SafetyTraining from './components/SafetyTraining'

export default function App() {
  return (
    <div className="flex min-h-screen bg-base-900">
      <Sidebar />
      <main className="flex-1 overflow-x-hidden px-4 pb-24 pt-6 sm:px-8 sm:pb-8">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/safety" element={<SafetyTraining />} />
        </Routes>
      </main>
      <MobileNav />
    </div>
  )
}
