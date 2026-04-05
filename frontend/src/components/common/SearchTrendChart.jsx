import { useState } from 'react'
import { searchTimeSeries } from '../../services/api'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'

const COLORS = {
  Anarchism: '#dc2626', socialism: '#ef4444', democrats: '#3b82f6',
  Liberal: '#60a5fa', politics: '#8b5cf6', PoliticalDiscussion: '#a78bfa',
  neoliberal: '#6366f1', worldpolitics: '#14b8a6', Conservative: '#f97316', Republican: '#ea580c'
}

const GRANULARITIES = ['day', 'week', 'month']

export default function SearchTrendChart({ series: initialSeries, granularity: initialGranularity, totalMatching: initialTotal, query }) {
  const [series, setSeries] = useState(initialSeries)
  const [granularity, setGranularity] = useState(initialGranularity || 'week')
  const [totalMatching, setTotalMatching] = useState(initialTotal)
  const [loading, setLoading] = useState(false)

  if (!series || series.length === 0) return null

  const handleGranularityChange = async (g) => {
    if (g === granularity || !query) return
    setGranularity(g)
    setLoading(true)
    try {
      const res = await searchTimeSeries({ message: query, granularity: g })
      setSeries(res.data.series)
      setTotalMatching(res.data.total_matching)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // Pivot: group by date, columns = subreddits
  const dateMap = {}
  const subreddits = new Set()
  for (const item of series) {
    if (!dateMap[item.date]) dateMap[item.date] = { date: item.date }
    dateMap[item.date][item.subreddit] = item.count
    subreddits.add(item.subreddit)
  }
  const chartData = Object.values(dateMap).sort((a, b) => a.date.localeCompare(b.date))
  const activeSubs = [...subreddits].sort()

  return (
    <div className="bg-white/70 backdrop-blur-sm rounded-xl border border-gray-200/50 shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900">Matching Posts Over Time</h3>
        <div className="flex items-center gap-2">
          <div className="flex gap-0.5">
            {GRANULARITIES.map(g => (
              <button key={g} onClick={() => handleGranularityChange(g)}
                className={`px-2 py-0.5 text-xs rounded ${granularity === g ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                {g}
              </button>
            ))}
          </div>
          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
            {totalMatching} posts
          </span>
        </div>
      </div>
      {loading ? (
        <div className="flex items-center justify-center h-[220px] text-gray-400 text-sm">Loading...</div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={chartData}>
            <XAxis dataKey="date" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip contentStyle={{ fontSize: 12 }} wrapperStyle={{ zIndex: 10 }} />
            {activeSubs.length <= 6 && <Legend wrapperStyle={{ fontSize: 10 }} />}
            {activeSubs.map(sub => (
              <Area key={sub} type="monotone" dataKey={sub}
                stackId="1"
                stroke={COLORS[sub] || '#94a3b8'}
                fill={COLORS[sub] || '#94a3b8'}
                fillOpacity={0.6}
                dot={false}
                connectNulls
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
