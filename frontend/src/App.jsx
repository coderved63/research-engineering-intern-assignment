import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import MainLayout from './components/layout/MainLayout'
import Landing from './pages/Landing'
import Overview from './pages/Overview'
import TimeSeries from './pages/TimeSeries'
import Network from './pages/Network'
import Clusters from './pages/Clusters'
import Search from './pages/Search'
import Embeddings from './pages/Embeddings'

function DashboardRoutes() {
  return (
    <MainLayout>
      <Routes>
        <Route path="/" element={<Overview />} />
        <Route path="/timeseries" element={<TimeSeries />} />
        <Route path="/network" element={<Network />} />
        <Route path="/clusters" element={<Clusters />} />
        <Route path="/search" element={<Search />} />
        <Route path="/embeddings" element={<Embeddings />} />
      </Routes>
    </MainLayout>
  )
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/dashboard/*" element={<DashboardRoutes />} />
      </Routes>
    </Router>
  )
}

export default App
