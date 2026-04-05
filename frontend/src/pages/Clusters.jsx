import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getClusters } from '../services/api'
import LoadingSpinner from '../components/common/LoadingSpinner'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'

const CLUSTER_COLORS = [
  '#6366f1', '#ef4444', '#22c55e', '#f59e0b', '#3b82f6',
  '#ec4899', '#14b8a6', '#f97316', '#8b5cf6', '#06b6d4',
  '#84cc16', '#e11d48', '#0ea5e9', '#d946ef', '#64748b',
  '#facc15', '#a3e635', '#2dd4bf', '#818cf8', '#fb923c',
  '#c084fc', '#38bdf8', '#4ade80', '#fb7185', '#fbbf24',
  '#34d399', '#a78bfa', '#f472b6', '#60a5fa', '#a8a29e',
  '#c4b5fd', '#fca5a5', '#86efac', '#fde68a', '#bef264',
  '#93c5fd', '#f9a8d4', '#5eead4', '#d8b4fe', '#fdba74',
  '#7dd3fc', '#bef264', '#a5b4fc', '#fda4af', '#fcd34d',
  '#6ee7b7', '#c4b5fd', '#fca5a5', '#86efac', '#fde68a'
]

export default function Clusters() {
  const [k, setK] = useState(8)
  const [debouncedK, setDebouncedK] = useState(8)
  const [clusters, setClusters] = useState([])
  const [warning, setWarning] = useState(null)
  const [loading, setLoading] = useState(true)

  // Debounce k changes
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedK(k), 300)
    return () => clearTimeout(timer)
  }, [k])

  useEffect(() => {
    async function fetchClusters() {
      setLoading(true)
      try {
        const res = await getClusters({ k: debouncedK })
        setClusters(res.data.clusters || [])
        setWarning(res.data.warning || null)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchClusters()
  }, [debouncedK])

  // Total posts across all clusters
  const totalPosts = clusters.reduce((sum, c) => sum + c.size, 0)

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Topic Clusters</h1>
      <p className="text-gray-500 mb-6">Posts grouped by semantic similarity using KMeans on sentence embeddings</p>

      {/* K Slider */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex items-center gap-4">
          <label className="text-sm text-gray-600 font-medium">Number of clusters:</label>
          <input type="range" min="2" max="50" value={k}
            onChange={e => setK(Number(e.target.value))}
            className="flex-1 max-w-xs" />
          <span className="text-2xl font-bold text-indigo-600 w-12 text-center">{k}</span>
        </div>
        {warning && (
          <p className="text-sm text-amber-600 mt-2">{warning}</p>
        )}
        <div className="flex items-center justify-between mt-3">
          <p className="text-xs text-gray-400">
            {clusters.length} clusters · {totalPosts.toLocaleString()} posts · KMeans on 384-dim embeddings
          </p>
          <Link to="/embeddings"
            className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">
            Explore full embedding map →
          </Link>
        </div>
      </div>

      {loading ? <LoadingSpinner message="Computing clusters..." /> : (
        <>
          {/* Donut chart */}
          <div className="mb-6">
            <div className="bg-white rounded-lg shadow p-4">
              <h2 className="text-sm font-semibold text-gray-900 mb-2">Cluster Proportions</h2>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={clusters.sort((a, b) => b.size - a.size).map(c => ({ name: c.label, value: c.size, id: c.id }))}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={110}
                    paddingAngle={1}
                    className=""
                  >
                    {clusters.sort((a, b) => b.size - a.size).map(c => (
                      <Cell key={c.id} fill={CLUSTER_COLORS[c.id % CLUSTER_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={({ payload }) => {
                    if (!payload || !payload[0]) return null
                    const d = payload[0].payload
                    const pct = ((d.value / totalPosts) * 100).toFixed(1)
                    return (
                      <div className="bg-white shadow-lg rounded p-2 text-xs border">
                        <p className="font-medium text-gray-900">{d.name}</p>
                        <p className="text-gray-500">{d.value} posts ({pct}%)</p>
                      </div>
                    )
                  }} />
                </PieChart>
              </ResponsiveContainer>
              <p className="text-xs text-gray-400 text-center mt-1">
                Hover over segments for details · Largest cluster: {clusters[0]?.label} ({clusters[0]?.size} posts)
              </p>
            </div>
          </div>

          {/* Cluster Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {clusters.sort((a, b) => b.size - a.size).map(cluster => (
              <div key={cluster.id}
                className="bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: CLUSTER_COLORS[cluster.id % CLUSTER_COLORS.length] }} />
                    <h3 className="font-medium text-gray-900 text-sm">Cluster {cluster.id}</h3>
                  </div>
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                    {cluster.size} posts
                  </span>
                </div>
                <p className="text-xs text-indigo-600 mb-3 font-medium">{cluster.label}</p>
                {/* Size bar */}
                <div className="w-full bg-gray-100 rounded-full h-1.5 mb-3">
                  <div className="h-1.5 rounded-full"
                    style={{
                      width: `${(cluster.size / (clusters[0]?.size || 1)) * 100}%`,
                      backgroundColor: CLUSTER_COLORS[cluster.id % CLUSTER_COLORS.length]
                    }} />
                </div>
                <div className="space-y-1.5">
                  {(cluster.top_posts || []).slice(0, 3).map(post => (
                    <p key={post.id} className="text-xs text-gray-600 truncate">
                      <span className="text-gray-400">r/{post.subreddit}</span> — {post.title}
                    </p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
