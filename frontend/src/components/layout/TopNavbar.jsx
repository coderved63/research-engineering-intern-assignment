import { NavLink } from 'react-router-dom'

const navItems = [
  { path: '/', label: 'Overview' },
  { path: '/timeseries', label: 'Time Series' },
  { path: '/network', label: 'Network' },
  { path: '/clusters', label: 'Topics' },
  { path: '/search', label: 'SearchAI' },
  { path: '/embeddings', label: 'Embeddings' },
]

export default function TopNavbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 h-16 backdrop-blur-md bg-white/80 border-b border-gray-200/50 shadow-sm">
      <div className="max-w-7xl mx-auto h-full flex items-center justify-between px-6">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">S</span>
          </div>
          <div>
            <h1 className="text-base font-bold text-gray-900 leading-tight">SimPPL Dashboard</h1>
            <p className="text-[10px] text-gray-400 leading-tight">Political Discourse Analysis</p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {navItems.map(({ path, label }) => (
            <NavLink
              key={path}
              to={path}
              end={path === '/'}
              className={({ isActive }) =>
                `px-3 py-1.5 text-sm rounded-lg transition-all ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-700 font-medium shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100/80'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-xs font-medium text-gray-700">8,799 posts</p>
            <p className="text-[10px] text-gray-400">Jul 2024 — Feb 2025</p>
          </div>
        </div>
      </div>
    </nav>
  )
}
