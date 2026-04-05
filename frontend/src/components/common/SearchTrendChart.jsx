import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'

const COLORS = {
  Anarchism: '#dc2626', socialism: '#ef4444', democrats: '#3b82f6',
  Liberal: '#60a5fa', politics: '#8b5cf6', PoliticalDiscussion: '#a78bfa',
  neoliberal: '#6366f1', worldpolitics: '#14b8a6', Conservative: '#f97316', Republican: '#ea580c'
}

export default function SearchTrendChart({ series, granularity, totalMatching }) {
  if (!series || series.length === 0) return null

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
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900">Matching Posts Over Time</h3>
        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
          {totalMatching} posts matched · {granularity}ly
        </span>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={chartData}>
          <XAxis dataKey="date" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
          <YAxis tick={{ fontSize: 10 }} />
          <Tooltip contentStyle={{ fontSize: 12 }} />
          {activeSubs.length <= 6 && <Legend wrapperStyle={{ fontSize: 10 }} />}
          {activeSubs.map(sub => (
            <Area key={sub} type="monotone" dataKey={sub}
              stackId="1"
              stroke={COLORS[sub] || '#94a3b8'}
              fill={COLORS[sub] || '#94a3b8'}
              fillOpacity={0.6}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
