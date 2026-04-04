import { useState, useEffect } from 'react'
import { getOverviewStats, getTimeSeriesPosts } from '../services/api'
import MetricCard from '../components/common/MetricCard'
import LoadingSpinner from '../components/common/LoadingSpinner'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
  AreaChart, Area, ReferenceLine
} from 'recharts'

const SUBREDDIT_COLORS = {
  Anarchism: '#dc2626',
  socialism: '#ef4444',
  democrats: '#3b82f6',
  Liberal: '#60a5fa',
  politics: '#8b5cf6',
  PoliticalDiscussion: '#a78bfa',
  neoliberal: '#6366f1',
  worldpolitics: '#14b8a6',
  Conservative: '#f97316',
  Republican: '#ea580c',
}

const KEY_EVENTS = [
  { date: '2024-W30', label: 'Biden drops out', color: '#3b82f6' },
  { date: '2024-W45', label: 'Election Day', color: '#dc2626' },
  { date: '2025-W01', label: 'Jan 6 Anniversary', color: '#f97316' },
  { date: '2025-W03', label: 'Inauguration', color: '#7c3aed' },
  { date: '2025-W06', label: 'Executive Orders Spike', color: '#dc2626' },
]

export default function Overview() {
  const [stats, setStats] = useState(null)
  const [timeline, setTimeline] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function fetchData() {
      try {
        const [statsRes, timelineRes] = await Promise.all([
          getOverviewStats(),
          getTimeSeriesPosts({ granularity: 'week' })
        ])
        setStats(statsRes.data)

        // Aggregate timeline by week (all subreddits combined)
        const weekMap = {}
        for (const item of timelineRes.data.series) {
          if (!weekMap[item.date]) weekMap[item.date] = 0
          weekMap[item.date] += item.count
        }
        const weekData = Object.entries(weekMap)
          .map(([date, count]) => ({ date, count }))
          .sort((a, b) => a.date.localeCompare(b.date))
        setTimeline(weekData)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  if (loading) return <LoadingSpinner message="Loading dashboard..." />
  if (error) return <div className="text-red-500 p-4">Error: {error}</div>
  if (!stats) return null

  const pieData = stats.subreddits.map(s => ({ name: s.name, value: s.count }))

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Political Discourse on Reddit
        </h1>
        <p className="text-gray-500 mt-2 max-w-2xl">
          Analyzing how 10 political communities discussed the 2024 election and 2025
          transition of power. This dataset captures {stats.total_posts.toLocaleString()} posts
          from {stats.total_authors.toLocaleString()} authors between {stats.date_range.start} and {stats.date_range.end}.
        </p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <MetricCard label="Total Posts" value={stats.total_posts.toLocaleString()} subtitle="across 10 subreddits" />
        <MetricCard label="Unique Authors" value={stats.total_authors.toLocaleString()} subtitle="87 cross-community" />
        <MetricCard label="Date Range" value="7 months" subtitle={`${stats.date_range.start} to ${stats.date_range.end}`} />
        <MetricCard label="Network" value={`${stats.network_stats.num_nodes} nodes`} subtitle={`${stats.network_stats.num_edges} edges, ${stats.network_stats.num_components} components`} />
      </div>

      {/* Timeline with Events */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Activity Timeline</h2>
        <p className="text-sm text-gray-500 mb-4">Weekly post volume with key political events marked</p>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={timeline}>
            <defs>
              <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="date" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Area type="monotone" dataKey="count" stroke="#6366f1" fill="url(#colorCount)" strokeWidth={2} />
            {KEY_EVENTS.map(evt => (
              <ReferenceLine key={evt.date} x={evt.date} stroke={evt.color} strokeDasharray="3 3"
                label={{ value: evt.label, position: 'top', fontSize: 10, fill: evt.color }} />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Subreddit Breakdown */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Subreddit Distribution</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%"
                outerRadius={100} label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                labelLine={{ strokeWidth: 1 }} fontSize={11}>
                {pieData.map((entry) => (
                  <Cell key={entry.name} fill={SUBREDDIT_COLORS[entry.name] || '#94a3b8'} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Top News Domains */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Top News Sources Shared</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={stats.top_domains.slice(0, 10)} layout="vertical">
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis dataKey="domain" type="category" tick={{ fontSize: 11 }} width={120} />
              <Tooltip />
              <Bar dataKey="count" fill="#6366f1" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Authors */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Most Active Accounts</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 px-3 text-gray-500 font-medium">Author</th>
                <th className="text-right py-2 px-3 text-gray-500 font-medium">Posts</th>
                <th className="text-right py-2 px-3 text-gray-500 font-medium">Posts/Day</th>
              </tr>
            </thead>
            <tbody>
              {stats.top_authors.map((a, i) => {
                const days = 210 // approx days in dataset range
                const perDay = (a.count / days).toFixed(2)
                return (
                  <tr key={a.author} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-2 px-3 font-medium text-gray-900">
                      {i + 1}. u/{a.author}
                    </td>
                    <td className="py-2 px-3 text-right text-gray-600">{a.count}</td>
                    <td className="py-2 px-3 text-right">
                      <span className={`${parseFloat(perDay) > 0.5 ? 'text-orange-600 font-medium' : 'text-gray-600'}`}>
                        {perDay}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-gray-400 mt-3">
          Accounts posting &gt;0.5 posts/day are highlighted — high-velocity accounts worth investigating.
        </p>
      </div>
    </div>
  )
}
