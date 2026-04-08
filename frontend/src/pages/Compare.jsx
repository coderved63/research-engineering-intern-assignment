import { useState, useEffect } from 'react'
import { getCompareSubreddits } from '../services/api'
import LoadingSpinner from '../components/common/LoadingSpinner'
import AISummary from '../components/common/AISummary'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend
} from 'recharts'

const SUBREDDITS = [
  'Anarchism', 'socialism', 'democrats', 'Liberal', 'politics',
  'PoliticalDiscussion', 'neoliberal', 'worldpolitics', 'Conservative', 'Republican'
]

const SUB_COLORS = {
  Anarchism: '#dc2626', socialism: '#ef4444', democrats: '#3b82f6',
  Liberal: '#60a5fa', politics: '#8b5cf6', PoliticalDiscussion: '#a78bfa',
  neoliberal: '#6366f1', worldpolitics: '#14b8a6', Conservative: '#f97316', Republican: '#ea580c'
}

export default function Compare() {
  const [sub1, setSub1] = useState('Liberal')
  const [sub2, setSub2] = useState('Anarchism')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (sub1 === sub2) return
    setLoading(true)
    setError(null)
    getCompareSubreddits(sub1, sub2)
      .then(res => setData(res.data))
      .catch(err => setError(err.response?.data?.message || 'Failed to load comparison'))
      .finally(() => setLoading(false))
  }, [sub1, sub2])

  // Merge timeseries for chart
  const mergedTimeseries = (() => {
    if (!data) return []
    const dateMap = {}
    for (const item of data.sub1.timeseries || []) {
      if (!dateMap[item.date]) dateMap[item.date] = { date: item.date }
      dateMap[item.date][data.sub1.name] = item.count
    }
    for (const item of data.sub2.timeseries || []) {
      if (!dateMap[item.date]) dateMap[item.date] = { date: item.date }
      dateMap[item.date][data.sub2.name] = item.count
    }
    return Object.values(dateMap).sort((a, b) => a.date.localeCompare(b.date))
  })()

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Compare Communities</h1>
      <p className="text-gray-500 mb-6 max-w-3xl">
        Side-by-side comparison of two subreddits. See how each community discusses different topics, shares
        different news sources, and engages at different rates. Pick any two subreddits below.
      </p>

      {/* Picker */}
      <div className="bg-white/70 backdrop-blur-sm rounded-xl border border-gray-200/50 shadow-sm p-5 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] items-center gap-4">
          <div>
            <label className="block text-xs text-gray-500 font-medium mb-1.5">Community A</label>
            <select value={sub1} onChange={e => setSub1(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent bg-white">
              {SUBREDDITS.map(s => (
                <option key={s} value={s}>r/{s}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-center pt-5">
            <div className="px-3 py-1 bg-gray-100 rounded-full text-xs font-semibold text-gray-500 uppercase tracking-wider">
              vs
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-500 font-medium mb-1.5">Community B</label>
            <select value={sub2} onChange={e => setSub2(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent bg-white">
              {SUBREDDITS.map(s => (
                <option key={s} value={s}>r/{s}</option>
              ))}
            </select>
          </div>
        </div>
        {sub1 === sub2 && (
          <p className="text-xs text-amber-600 mt-3">Please select two different subreddits to compare.</p>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {loading ? <LoadingSpinner message="Loading comparison..." /> : data && (
        <>
          {/* Side-by-side stats grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
            {[data.sub1, data.sub2].map((sub, idx) => (
              <div key={sub.name} className="bg-white/70 backdrop-blur-sm rounded-xl border border-gray-200/50 shadow-sm overflow-hidden">
                {/* Header */}
                <div className="p-5 border-b border-gray-200/50"
                  style={{
                    background: `linear-gradient(135deg, ${SUB_COLORS[sub.name]}10 0%, transparent 100%)`
                  }}>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: SUB_COLORS[sub.name] }} />
                    <h2 className="text-xl font-bold text-gray-900">r/{sub.name}</h2>
                  </div>
                  <p className="text-xs text-gray-500">
                    {sub.unique_authors} unique authors
                    {sub.date_range && sub.date_range.start && sub.date_range.end && (() => {
                      const start = new Date(sub.date_range.start)
                      const end = new Date(sub.date_range.end)
                      const days = Math.round((end - start) / 86400000) + 1
                      const fmt = d => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                      return (
                        <span className="block mt-1 text-[10px] text-gray-400 italic">
                          Data window: {fmt(start)} – {fmt(end)} ({days} day{days === 1 ? '' : 's'})
                        </span>
                      )
                    })()}
                  </p>
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-3 border-b border-gray-200/50">
                  <div className="p-4 border-r border-gray-200/50">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Posts</p>
                    <p className="text-2xl font-bold text-gray-900">{sub.total_posts.toLocaleString()}</p>
                  </div>
                  <div className="p-4 border-r border-gray-200/50">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Avg Score</p>
                    <p className="text-2xl font-bold text-gray-900">{sub.avg_score.toLocaleString()}</p>
                  </div>
                  <div className="p-4">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Avg Comments</p>
                    <p className="text-2xl font-bold text-gray-900">{sub.avg_comments.toLocaleString()}</p>
                  </div>
                </div>

                {/* Top news sources */}
                <div className="p-5 border-b border-gray-200/50">
                  <h3 className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-3">Top News Sources</h3>
                  <div className="space-y-1.5">
                    {sub.top_domains.slice(0, 5).map(d => (
                      <div key={d.domain} className="flex items-center justify-between text-sm">
                        <span className="text-gray-700 truncate">{d.domain}</span>
                        <span className="text-xs text-gray-400 ml-2 shrink-0">{d.count}</span>
                      </div>
                    ))}
                    {sub.top_domains.length === 0 && (
                      <p className="text-xs text-gray-400">No external links shared</p>
                    )}
                  </div>
                </div>

                {/* Top topics */}
                <div className="p-5 border-b border-gray-200/50">
                  <h3 className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-3">Top Discussion Topics</h3>
                  <div className="space-y-1.5">
                    {sub.top_topics.slice(0, 5).map((t, i) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <span className="text-gray-700 text-xs truncate" title={t.label}>{t.label}</span>
                        <span className="text-xs text-gray-400 ml-2 shrink-0">{t.count}</span>
                      </div>
                    ))}
                    {sub.top_topics.length === 0 && (
                      <p className="text-xs text-gray-400">No topic data available</p>
                    )}
                  </div>
                </div>

                {/* Top authors */}
                <div className="p-5 border-b border-gray-200/50">
                  <h3 className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-3">Most Active Authors</h3>
                  <div className="space-y-1.5">
                    {sub.top_authors.slice(0, 5).map(a => (
                      <div key={a.author} className="flex items-center justify-between text-sm">
                        <a href={`https://reddit.com/u/${a.author}`} target="_blank" rel="noopener noreferrer"
                          className="text-indigo-600 hover:text-indigo-800 hover:underline truncate">
                          u/{a.author}
                        </a>
                        <span className="text-xs text-gray-400 ml-2 shrink-0">{a.count} posts</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Top posts */}
                <div className="p-5">
                  <h3 className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-3">Top Posts</h3>
                  {sub.top_posts.length > 0 ? (
                    <div className="space-y-2">
                      {sub.top_posts.slice(0, 3).map(p => (
                        <a key={p.id} href={p.permalink ? `https://reddit.com${p.permalink}` : '#'}
                          target="_blank" rel="noopener noreferrer"
                          className="block text-xs text-gray-600 hover:text-indigo-600 line-clamp-2">
                          {p.title} <span className="text-gray-400">({p.score.toLocaleString()} upvotes)</span>
                        </a>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400">No posts to display.</p>
                  )}
                  {sub.name === 'worldpolitics' && (
                    <p className="text-[10px] text-amber-700/80 mt-3 italic leading-snug">
                      Note: r/worldpolitics is largely unmoderated and has drifted away from political discussion.
                      Posts are shown as-is from the source data.
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Time series chart */}
          <div className="bg-white/70 backdrop-blur-sm rounded-xl border border-gray-200/50 shadow-sm p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Activity Over Time</h2>
            <p className="text-sm text-gray-500 mb-4">
              Weekly post volume for both communities side by side
            </p>
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={mergedTimeseries}>
                <XAxis dataKey="date" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey={data.sub1.name} stroke={SUB_COLORS[data.sub1.name]}
                  strokeWidth={2} dot={false} connectNulls />
                <Line type="monotone" dataKey={data.sub2.name} stroke={SUB_COLORS[data.sub2.name]}
                  strokeWidth={2} dot={false} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* AI Summary */}
          <AISummary text={data.summary} />
        </>
      )}
    </div>
  )
}
