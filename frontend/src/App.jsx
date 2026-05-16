import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import Overview from './pages/Overview'
import Inventory from './pages/Inventory'
import Procurement from './pages/Procurement'
import Demand from './pages/Demand'
import Suppliers from './pages/Suppliers'
import Financial from './pages/Financial'
import Risk from './pages/Risk'
import AiAdvisor from './pages/AiAdvisor'

const nav = [
  { to: '/', icon: '▦', label: 'Overview' },
  { to: '/inventory', icon: '⬡', label: 'Inventory' },
  { to: '/procurement', icon: '⬒', label: 'Procurement' },
  { to: '/demand', icon: '↗', label: 'Demand & sales' },
  { to: '/suppliers', icon: '⊡', label: 'Suppliers' },
  { to: '/financial', icon: '◈', label: 'Financial' },
  { to: '/risk', icon: '⊕', label: 'Supply risk' },
  { to: '/ai', icon: '✦', label: 'AI advisor' },
]

function formatDate(d) {
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function getDateRange() {
  const end = new Date()
  const start = new Date()
  start.setDate(end.getDate() - 89)
  return { start, end }
}

export default function App() {
  const { start, end } = getDateRange()
  const today = formatDate(new Date())
  const rangeLabel = `${formatDate(start)} – ${formatDate(end)}`

  return (
    <BrowserRouter>
      <div className="flex h-screen bg-gray-50 font-sans">

        <aside className="w-44 bg-white border-r border-gray-100 flex flex-col flex-shrink-0">
          <div className="p-4 flex items-center gap-2 border-b border-gray-100">
            <div className="w-6 h-6 bg-blue-600 rounded-md flex items-center justify-center">
              <span className="text-white text-xs font-bold">S</span>
            </div>
            <span className="text-sm font-semibold text-gray-900">SupplyIQ</span>
          </div>

          <div className="px-3 pt-3 pb-1">
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
              Navigation
            </span>
          </div>

          <nav className="flex-1 px-2 py-1 flex flex-col gap-0.5">
            {nav.map(({ to, icon, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-colors ${isActive
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
                  }`
                }
              >
                <span className="text-sm">{icon}</span>
                {label}
              </NavLink>
            ))}
          </nav>

          <div className="border-t border-gray-100 p-3 flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-blue-50 flex items-center justify-center text-xs font-medium text-blue-700">
              VR
            </div>
            <div>
              <div className="text-xs font-medium text-gray-800">Vikas Ramaswamy.</div>
              <div className="text-xs text-gray-400">Data Engineer</div>
            </div>
          </div>
        </aside>

        <main className="flex-1 flex flex-col overflow-hidden min-w-0">
          <header className="bg-white border-b border-gray-100 px-6 h-11 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-900">Last 90 days</span>
              <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                {rangeLabel}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">{today}</span>
              <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full">
                ● Live
              </span>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto p-5">
            <Routes>
              <Route path="/" element={<Overview />} />
              <Route path="/inventory" element={<Inventory />} />
              <Route path="/procurement" element={<Procurement />} />
              <Route path="/demand" element={<Demand />} />
              <Route path="/suppliers" element={<Suppliers />} />
              <Route path="/financial" element={<Financial />} />
              <Route path="/risk" element={<Risk />} />
              <Route path="/ai" element={<AiAdvisor />} />
            </Routes>
          </div>
        </main>
      </div>
    </BrowserRouter>
  )
}