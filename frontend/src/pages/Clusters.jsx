import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getClusters } from '../services/api'
import LoadingSpinner from '../components/common/LoadingSpinner'
import AISummary from '../components/common/AISummary'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis } from 'recharts'

const CLUSTER_COLORS = [
  '#6366f1', '#ef4444', '#22c55e', '#f59e0b', '#3b82f6',
  '#ec4899', '#14b8a6', '#f97316', '#8b5cf6', '#06b6d4',
  '#84cc16', '#e11d48', '#0ea5e9', '#d946ef', '#64748b',
  '#facc15', '#a3e635', '#2dd4bf', '#818cf8', '#fb923c',
  '#c084fc', '#38bdf8', '#4ade80', '#fb7185', '#fbbf24',
  '#34d399', '#a78bfa', '#f472b6', '#60a5fa', '#a8a29e'
]

const SUBREDDIT_COLORS = {
  Anarchism: '#dc2626', socialism: '#ef4444', democrats: '#3b82f6',
  Liberal: '#60a5fa', politics: '#8b5cf6', PoliticalDiscussion: '#a78bfa',
  neoliberal: '#6366f1', worldpolitics: '#14b8a6', Conservative: '#f97316', Republican: '#ea580c'
}

export default function Clusters() {
  const [k, setK] = useState(8)
  const [debouncedK, setDebouncedK] = useState(8)
  const [clusters, setClusters] = useState([])
  const [expandedCluster, setExpandedCluster] = useState(null)
  const [summary, setSummary] = useState('')
  const [warning, setWarning] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedK(k), 300)
    return () => clearTimeout(timer)
  }, [k])

  useEffect(() => {
    async function fetchClusters() {
      setLoading(true)
      setExpandedCluster(null)
      try {
        const res = await getClusters({ k: debouncedK })
        setClusters(res.data.clusters || [])
        setSummary(res.data.summary || '')
        setWarning(res.data.warning || null)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchClusters()
  }, [debouncedK])

  const totalPosts = clusters.reduce((sum, c) => sum + c.size, 0)
  const sorted = [...clusters].sort((a, b) => b.size - a.size)

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Topic Clusters</h1>
      <p className="text-gray-500 mb-6">
        Posts are grouped by semantic meaning using KMeans on sentence embeddings (all-MiniLM-L6-v2, 384-dim).
        Topics emerge automatically — the labels show top keywords per cluster. Adjust the slider to see finer or coarser groupings.
      </p>

      {/* K Slider */}
      <div className="bg-white/70 backdrop-blur-sm rounded-xl border border-gray-200/50 shadow-sm p-4 mb-6">
        <div className="flex items-center gap-4">
          <label className="text-sm text-gray-600 font-medium">Number of clusters:</label>
          <input type="range" min="2" max="50" value={k}
            onChange={e => setK(Number(e.target.value))}
            className="flex-1 max-w-xs" />
          <span className="text-2xl font-bold text-indigo-600 w-12 text-center">{k}</span>
        </div>
        {warning && <p className="text-sm text-amber-600 mt-2">{warning}</p>}
        <div className="flex items-center justify-between mt-3">
          <p className="text-xs text-gray-400">
            {clusters.length} clusters · {totalPosts.toLocaleString()} posts · KMeans on 384-dim embeddings
          </p>
          <Link to="/dashboard/embeddings" className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">
            Explore full embedding map →
          </Link>
        </div>
      </div>

      {loading ? <LoadingSpinner message="Computing clusters..." /> : (
        <>
          {/* Donut chart */}
          <div className="mb-6">
            <div className="bg-white/70 backdrop-blur-sm rounded-xl border border-gray-200/50 shadow-sm p-4">
              <h2 className="text-sm font-semibold text-gray-900 mb-2">Cluster Proportions</h2>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={sorted.map(c => ({ name: c.label, value: c.size, id: c.id }))}
                    dataKey="value" nameKey="name" cx="50%" cy="50%"
                    innerRadius={60} outerRadius={110} paddingAngle={1}
                    onClick={(data) => {
                      const clickedId = data.id
                      setExpandedCluster(expandedCluster === clickedId ? null : clickedId)
                      setTimeout(() => document.getElementById('cluster-detail')?.scrollIntoView({ behavior: 'smooth' }), 100)
                    }}
                    className="cursor-pointer"
                  >
                    {sorted.map(c => (
                      <Cell key={c.id} fill={CLUSTER_COLORS[c.id % CLUSTER_COLORS.length]}
                        opacity={expandedCluster === null || expandedCluster === c.id ? 1 : 0.3} />
                    ))}
                  </Pie>
                  <Tooltip content={({ payload }) => {
                    if (!payload || !payload[0]) return null
                    const d = payload[0].payload
                    return (
                      <div className="bg-white shadow-lg rounded p-2 text-xs border">
                        <p className="font-medium text-gray-900">{d.name}</p>
                        <p className="text-gray-500">{d.value} posts ({((d.value / totalPosts) * 100).toFixed(1)}%)</p>
                        <p className="text-indigo-500 mt-1">Click to expand</p>
                      </div>
                    )
                  }} />
                </PieChart>
              </ResponsiveContainer>
              <p className="text-xs text-gray-400 text-center mt-1">
                Click a segment to expand that cluster · Hover for details
              </p>
              <AISummary text={summary} />
            </div>
          </div>

          {/* Expanded Cluster Detail */}
          {expandedCluster !== null && (() => {
            const cluster = clusters.find(c => c.id === expandedCluster)
            if (!cluster) return null
            const pct = ((cluster.size / totalPosts) * 100).toFixed(1)
            return (
              <div id="cluster-detail" className="mb-6 bg-white/70 backdrop-blur-sm rounded-xl border border-gray-200/50 shadow-sm p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: CLUSTER_COLORS[cluster.id % CLUSTER_COLORS.length] }} />
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">Cluster {cluster.id}</h2>
                      <p className="text-sm text-indigo-600 font-medium">{cluster.label}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-gray-900">{cluster.size}</p>
                    <p className="text-xs text-gray-500">{pct}% of all posts</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Subreddit breakdown */}
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Which communities discuss this topic?</h3>
                    {cluster.subreddits && cluster.subreddits.length > 0 ? (
                      <div className="space-y-1.5">
                        {cluster.subreddits.map(s => (
                          <div key={s.name} className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: SUBREDDIT_COLORS[s.name] || '#94a3b8' }} />
                            <span className="text-xs text-gray-700 w-28 truncate">r/{s.name}</span>
                            <div className="flex-1 bg-gray-100 rounded-full h-2">
                              <div className="h-2 rounded-full"
                                style={{
                                  width: `${(s.count / cluster.subreddits[0].count) * 100}%`,
                                  backgroundColor: SUBREDDIT_COLORS[s.name] || '#94a3b8'
                                }} />
                            </div>
                            <span className="text-xs text-gray-500 w-8 text-right">{s.count}</span>
                          </div>
                        ))}
                      </div>
                    ) : <p className="text-xs text-gray-400">No breakdown available</p>}
                  </div>

                  {/* Top posts */}
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Top posts in this cluster</h3>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {(cluster.top_posts || []).map((post, i) => (
                        <a key={post.id}
                          href={post.permalink ? `https://reddit.com${post.permalink}` : '#'}
                          target="_blank" rel="noopener noreferrer"
                          className="block bg-gray-50/80 rounded-lg p-2.5 hover:bg-gray-100 transition-colors">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-gray-900 line-clamp-2">
                                {i + 1}. {post.title}
                                <span className="text-indigo-400 ml-1">↗</span>
                              </p>
                              <p className="text-[10px] text-gray-500 mt-0.5">
                                r/{post.subreddit} · u/{post.author} · {post.score} upvotes · {post.date}
                              </p>
                            </div>
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>
                </div>

                <button onClick={() => setExpandedCluster(null)}
                  className="mt-4 text-xs text-gray-500 hover:text-gray-700">
                  ← Close detail view
                </button>
              </div>
            )
          })()}

          {/* Cluster Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sorted.map(cluster => {
              const pct = ((cluster.size / totalPosts) * 100).toFixed(1)
              const topSub = cluster.subreddits?.[0]
              return (
                <div key={cluster.id}
                  onClick={() => {
                    setExpandedCluster(expandedCluster === cluster.id ? null : cluster.id)
                    setTimeout(() => document.getElementById('cluster-detail')?.scrollIntoView({ behavior: 'smooth' }), 100)
                  }}
                  className={`bg-white/70 backdrop-blur-sm rounded-xl border shadow-sm p-4 cursor-pointer transition-all hover:shadow-md ${
                    expandedCluster === cluster.id
                      ? 'border-indigo-300 ring-1 ring-indigo-200'
                      : 'border-gray-200/50'
                  }`}>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: CLUSTER_COLORS[cluster.id % CLUSTER_COLORS.length] }} />
                      <h3 className="font-medium text-gray-900 text-sm">Cluster {cluster.id}</h3>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-medium text-gray-700">{cluster.size}</span>
                      <span className="text-xs text-gray-400 ml-1">({pct}%)</span>
                    </div>
                  </div>
                  <p className="text-xs text-indigo-600 mb-2 font-medium">{cluster.label}</p>

                  {/* Size bar */}
                  <div className="w-full bg-gray-100 rounded-full h-1.5 mb-2">
                    <div className="h-1.5 rounded-full"
                      style={{
                        width: `${(cluster.size / (sorted[0]?.size || 1)) * 100}%`,
                        backgroundColor: CLUSTER_COLORS[cluster.id % CLUSTER_COLORS.length]
                      }} />
                  </div>

                  {/* Top subreddit hint */}
                  {topSub && (
                    <p className="text-[10px] text-gray-400 mb-2">
                      Dominated by r/{topSub.name} ({topSub.count} posts)
                    </p>
                  )}

                  {/* Top 2 posts preview */}
                  <div className="space-y-1">
                    {(cluster.top_posts || []).slice(0, 2).map(post => (
                      <p key={post.id} className="text-xs text-gray-600 truncate">
                        <span className="text-gray-400">r/{post.subreddit}</span> — {post.title}
                      </p>
                    ))}
                  </div>

                  <p className="text-[10px] text-indigo-500 mt-2">Click to expand →</p>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
