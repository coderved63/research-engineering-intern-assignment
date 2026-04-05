import { useState, useEffect } from 'react'
import { getTimeSeriesPosts, getTimeSeriesEngagement, getTopicTrends } from '../services/api'
import LoadingSpinner from '../components/common/LoadingSpinner'
import AISummary from '../components/common/AISummary'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
  AreaChart, Area
} from 'recharts'

const TOPIC_COLORS = [
  '#6366f1', '#ef4444', '#22c55e', '#f59e0b', '#3b82f6',
  '#ec4899', '#14b8a6', '#f97316', '#8b5cf6', '#06b6d4',
  '#84cc16', '#e11d48', '#0ea5e9', '#d946ef', '#64748b'
]

const SUBREDDITS = [
  'Anarchism', 'socialism', 'democrats', 'Liberal', 'politics',
  'PoliticalDiscussion', 'neoliberal', 'worldpolitics', 'Conservative', 'Republican'
]

const COLORS = {
  Anarchism: '#dc2626', socialism: '#ef4444', democrats: '#3b82f6',
  Liberal: '#60a5fa', politics: '#8b5cf6', PoliticalDiscussion: '#a78bfa',
  neoliberal: '#6366f1', worldpolitics: '#14b8a6', Conservative: '#f97316', Republican: '#ea580c'
}

const GRANULARITIES = ['day', 'week', 'month']

export default function TimeSeries() {
  const [granularity, setGranularity] = useState('week')
  const [selectedSubs, setSelectedSubs] = useState([])
  const [postData, setPostData] = useState([])
  const [engagementData, setEngagementData] = useState([])
  const [postSummary, setPostSummary] = useState('')
  const [engSummary, setEngSummary] = useState('')
  const [topicData, setTopicData] = useState([])
  const [topicK, setTopicK] = useState(8)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      try {
        const params = { granularity }
        if (selectedSubs.length > 0) {
          params.subreddit = selectedSubs.join(',')
        }

        const [postRes, engRes, topicRes] = await Promise.all([
          getTimeSeriesPosts(params),
          getTimeSeriesEngagement({ ...params, metric: 'score' }),
          getTopicTrends({ k: topicK, granularity })
        ])

        // Pivot post data: group by date, columns = subreddits
        const dateMap = {}
        for (const item of postRes.data.series) {
          if (!dateMap[item.date]) dateMap[item.date] = { date: item.date }
          dateMap[item.date][item.subreddit] = item.count
        }
        setPostData(Object.values(dateMap).sort((a, b) => a.date.localeCompare(b.date)))
        setPostSummary(postRes.data.summary || '')

        // Pivot engagement data
        const engMap = {}
        for (const item of engRes.data.series) {
          if (!engMap[item.date]) engMap[item.date] = { date: item.date }
          engMap[item.date][item.subreddit] = item.avg
        }
        setEngagementData(Object.values(engMap).sort((a, b) => a.date.localeCompare(b.date)))
        setEngSummary(engRes.data.summary || '')

        // Pivot topic data
        const topicMap = {}
        const topicNames = new Set()
        for (const item of topicRes.data.series) {
          const shortLabel = item.topic.split(',').slice(0, 2).map(w => w.trim()).join(', ')
          if (!topicMap[item.date]) topicMap[item.date] = { date: item.date }
          topicMap[item.date][shortLabel] = (topicMap[item.date][shortLabel] || 0) + item.count
          topicNames.add(shortLabel)
        }
        setTopicData({
          series: Object.values(topicMap).sort((a, b) => a.date.localeCompare(b.date)),
          topics: [...topicNames]
        })
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [granularity, selectedSubs, topicK])

  const toggleSub = (sub) => {
    setSelectedSubs(prev =>
      prev.includes(sub) ? prev.filter(s => s !== sub) : [...prev, sub]
    )
  }

  const activeSubs = selectedSubs.length > 0 ? selectedSubs : SUBREDDITS

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Time Series Analysis</h1>
      <p className="text-gray-500 mb-6">Post volume and engagement trends over time</p>

      {/* Filters */}
      <div className="bg-white/70 backdrop-blur-sm rounded-xl border border-gray-200/50 shadow-sm p-4 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <label className="text-sm text-gray-500 font-medium block mb-1">Granularity</label>
            <div className="flex gap-1">
              {GRANULARITIES.map(g => (
                <button key={g} onClick={() => setGranularity(g)}
                  className={`px-3 py-1 text-sm rounded ${granularity === g ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                  {g}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1">
            <label className="text-sm text-gray-500 font-medium block mb-1">Subreddits (click to filter)</label>
            <div className="flex flex-wrap gap-1">
              {SUBREDDITS.map(sub => (
                <button key={sub} onClick={() => toggleSub(sub)}
                  className={`px-2 py-0.5 text-xs rounded-full border transition-colors ${
                    selectedSubs.includes(sub)
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                      : selectedSubs.length === 0
                        ? 'border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-400'
                        : 'border-gray-200 bg-white text-gray-400 hover:border-gray-400'
                  }`}>
                  r/{sub}
                </button>
              ))}
              {selectedSubs.length > 0 && (
                <button onClick={() => setSelectedSubs([])}
                  className="px-2 py-0.5 text-xs text-red-500 hover:text-red-700">
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {loading ? <LoadingSpinner /> : (
        <>
          {/* Post Volume Chart */}
          <div className="bg-white/70 backdrop-blur-sm rounded-xl border border-gray-200/50 shadow-sm p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Post Volume Over Time</h2>
            <p className="text-sm text-gray-500 mb-4">Number of posts per {granularity} by subreddit</p>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={postData}>
                <XAxis dataKey="date" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {activeSubs.map(sub => (
                  <Line key={sub} type="monotone" dataKey={sub} stroke={COLORS[sub]}
                    strokeWidth={1.5} dot={false} connectNulls />
                ))}
              </LineChart>
            </ResponsiveContainer>
            <AISummary text={postSummary} />
          </div>

          {/* Engagement Chart */}
          <div className="bg-white/70 backdrop-blur-sm rounded-xl border border-gray-200/50 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Average Score Over Time</h2>
            <p className="text-sm text-gray-500 mb-4">Mean post score per {granularity} by subreddit</p>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={engagementData}>
                <XAxis dataKey="date" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {activeSubs.map(sub => (
                  <Line key={sub} type="monotone" dataKey={sub} stroke={COLORS[sub]}
                    strokeWidth={1.5} dot={false} connectNulls />
                ))}
              </LineChart>
            </ResponsiveContainer>
            <AISummary text={engSummary} />
          </div>

          {/* Topic Trends Chart */}
          {topicData.series && topicData.series.length > 0 && (
            <div className="bg-white/70 backdrop-blur-sm rounded-xl border border-gray-200/50 shadow-sm p-6">
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-lg font-semibold text-gray-900">Topic Trends Over Time</h2>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-gray-500">Topics:</label>
                  <select value={topicK} onChange={e => setTopicK(Number(e.target.value))}
                    className="text-xs border border-gray-200 rounded px-2 py-1 bg-white">
                    {[3, 5, 8, 10, 15].map(k => (
                      <option key={k} value={k}>{k} clusters</option>
                    ))}
                  </select>
                </div>
              </div>
              <p className="text-sm text-gray-500 mb-4">How discussion topics evolve over time (KMeans clusters)</p>
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={topicData.series}>
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ fontSize: 11 }} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  {topicData.topics.map((topic, i) => (
                    <Area key={topic} type="monotone" dataKey={topic}
                      stackId="1"
                      stroke={TOPIC_COLORS[i % TOPIC_COLORS.length]}
                      fill={TOPIC_COLORS[i % TOPIC_COLORS.length]}
                      fillOpacity={0.6}
                      dot={false}
                      connectNulls
                    />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}
    </div>
  )
}
