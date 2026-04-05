import { useState } from 'react'
import TopNavbar from './TopNavbar'

export default function MainLayout({ children }) {
  const [darkMode, setDarkMode] = useState(false)

  return (
    <div className={`min-h-screen transition-colors ${
      darkMode
        ? 'bg-gray-950'
        : 'bg-gray-50'
    }`}>
      <div className="grid-bg min-h-screen">
        <TopNavbar darkMode={darkMode} setDarkMode={setDarkMode} />
        <main className="pt-20 px-6 pb-8">
          <div className={`max-w-7xl mx-auto ${darkMode ? 'dark-mode' : ''}`}>
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
