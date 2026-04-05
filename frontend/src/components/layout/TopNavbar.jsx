import { NavLink } from 'react-router-dom'

const navItems = [
  { path: '/', label: 'Overview' },
  { path: '/timeseries', label: 'Time Series' },
  { path: '/network', label: 'Network' },
  { path: '/clusters', label: 'Topics' },
  { path: '/search', label: 'SearchAI' },
  { path: '/embeddings', label: 'Embeddings' },
]

export default function TopNavbar({ darkMode, setDarkMode }) {
  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 h-16 backdrop-blur-xl border-b shadow-sm transition-colors ${
      darkMode
        ? 'bg-gray-950/80 border-gray-800/50'
        : 'bg-white/70 border-gray-200/50'
    }`}>
      <div className="max-w-7xl mx-auto h-full flex items-center justify-between px-6">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg flex items-center justify-center shadow-md">
            <span className="text-white font-bold text-sm">T</span>
          </div>
          <div>
            <h1 className={`text-base font-bold leading-tight ${darkMode ? 'text-white' : 'text-gray-900'}`} style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}>
              TheScope
            </h1>
            <p className={`text-[10px] leading-tight ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
              Political Discourse Analysis
            </p>
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
                    ? darkMode
                      ? 'bg-amber-500/20 text-amber-300 font-medium'
                      : 'bg-amber-50 text-amber-800 font-medium shadow-sm'
                    : darkMode
                      ? 'text-gray-400 hover:text-white hover:bg-white/10'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100/80'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setDarkMode(!darkMode)}
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors border ${
              darkMode
                ? 'bg-gray-800 hover:bg-gray-700 text-amber-400 border-gray-700'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-600 border-gray-200'
            }`}
          >
            {darkMode ? '☀' : '🌙'}
          </button>
          <div className={`text-right`}>
            <p className={`text-xs font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>8,799 posts</p>
            <p className={`text-[10px] ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>Jul 2024 — Feb 2025</p>
          </div>
        </div>
      </div>
    </nav>
  )
}
