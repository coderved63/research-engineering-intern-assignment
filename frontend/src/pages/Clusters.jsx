import { useState, useEffect } from 'react'
import { getClusters } from '../services/api'
import LoadingSpinner from '../components/common/LoadingSpinner'
import { ScatterChart, Scatter, XAxis, YAxis, Tooltip, ResponsiveContainer, ZAxis } from 'recharts'

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
  const [embeddings, setEmbeddings] = useState([])
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
        const [clusterRes, embRes] = await Promise.all([
          getClusters({ k: debouncedK }),
          getClusters({ k: debouncedK }).then(() =>
            // Fetch embedding coordinates
            fetch(`/api/v1/clusters/embeddings?k=${debouncedK}`).then(r => r.json())
          )
        ])
        setClusters(clusterRes.data.clusters || [])
        setWarning(clusterRes.data.warning || null)
        setEmbeddings(embRes.points || [])
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchClusters()
  }, [debouncedK])

  // Group embedding points by cluster for scatter chart
  const clusterGroups = {}
  for (const pt of embeddings) {
    if (!clusterGroups[pt.cluster]) clusterGroups[pt.cluster] = []
    clusterGroups[pt.cluster].push(pt)
  }

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
      </div>

      {loading ? <LoadingSpinner message="Computing clusters..." /> : (
        <>
          {/* UMAP Scatter Plot */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Embedding Space (UMAP 2D Projection)</h2>
            <p className="text-sm text-gray-500 mb-4">Each dot is a post, colored by cluster assignment</p>
            <ResponsiveContainer width="100%" height={500}>
              <ScatterChart>
                <XAxis dataKey="x" type="number" tick={{ fontSize: 10 }} name="UMAP-1" />
                <YAxis dataKey="y" type="number" tick={{ fontSize: 10 }} name="UMAP-2" />
                <ZAxis range={[8, 8]} />
                <Tooltip content={({ payload }) => {
                  if (!payload || !payload[0]) return null
                  const d = payload[0].payload
                  return (
                    <div className="bg-white shadow-lg rounded p-2 text-xs border max-w-xs">
                      <p className="font-medium text-gray-900">{d.title}</p>
                      <p className="text-gray-500">r/{d.subreddit} · Cluster {d.cluster}</p>
                    </div>
                  )
                }} />
                {Object.entries(clusterGroups).map(([cid, points]) => (
                  <Scatter key={cid} data={points} fill={CLUSTER_COLORS[cid % CLUSTER_COLORS.length]}
                    opacity={0.6} />
                ))}
              </ScatterChart>
            </ResponsiveContainer>
          </div>

          {/* Cluster Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {clusters.sort((a, b) => b.size - a.size).map(cluster => (
              <div key={cluster.id} className="bg-white rounded-lg shadow p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: CLUSTER_COLORS[cluster.id % CLUSTER_COLORS.length] }} />
                    <h3 className="font-medium text-gray-900 text-sm">Cluster {cluster.id}</h3>
                  </div>
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                    {cluster.size} posts
                  </span>
                </div>
                <p className="text-xs text-indigo-600 mb-3 font-medium">{cluster.label}</p>
                <div className="space-y-1">
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
