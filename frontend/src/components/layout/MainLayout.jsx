import { useState } from 'react'
import TopNavbar from './TopNavbar'

export default function MainLayout({ children }) {
  const [darkMode, setDarkMode] = useState(false)

  return (
    <div className={`min-h-screen transition-colors ${
      darkMode
        ? 'bg-gradient-to-br from-gray-950 via-gray-900 to-indigo-950'
        : 'bg-gradient-to-br from-slate-50 via-indigo-50/40 to-purple-50/30'
    }`}>
      <TopNavbar darkMode={darkMode} setDarkMode={setDarkMode} />
      <main className="pt-20 px-6 pb-8">
        <div className={`max-w-7xl mx-auto ${darkMode ? 'dark-mode' : ''}`}>
          {children}
        </div>
      </main>
    </div>
  )
}
