import { NavLink } from 'react-router-dom'

const navItems = [
  { path: '/', label: 'Overview', icon: '📊' },
  { path: '/timeseries', label: 'Time Series', icon: '📈' },
  { path: '/network', label: 'Network', icon: '🔗' },
  { path: '/clusters', label: 'Topics', icon: '🧩' },
  { path: '/search', label: 'Search', icon: '🔍' },
  { path: '/embeddings', label: 'Embeddings', icon: '🗺️' },
]

export default function Sidebar() {
  return (
    <aside className="w-64 min-h-screen bg-gray-900 text-white flex flex-col">
      <div className="p-6 border-b border-gray-700">
        <h1 className="text-lg font-bold tracking-tight">SimPPL Dashboard</h1>
        <p className="text-xs text-gray-400 mt-1">Political Discourse Analysis</p>
      </div>

      <nav className="flex-1 py-4">
        {navItems.map(({ path, label, icon }) => (
          <NavLink
            key={path}
            to={path}
            end={path === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-6 py-3 text-sm transition-colors ${
                isActive
                  ? 'bg-gray-800 text-white border-r-2 border-blue-400'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
              }`
            }
          >
            <span>{icon}</span>
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-gray-700 text-xs text-gray-500">
        <p>8,799 posts · 10 subreddits</p>
        <p>Jul 2024 — Feb 2025</p>
      </div>
    </aside>
  )
}
