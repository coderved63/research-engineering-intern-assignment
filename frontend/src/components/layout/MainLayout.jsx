import TopNavbar from './TopNavbar'

export default function MainLayout({ children }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-indigo-50/30 to-gray-50">
      <TopNavbar />
      <main className="pt-20 px-6 pb-8">
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  )
}
