import { useState, useEffect } from 'react'
import { getTimeSeriesPosts, getTimeSeriesEngagement } from '../services/api'
import LoadingSpinner from '../components/common/LoadingSpinner'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
  AreaChart, Area
} from 'recharts'

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
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      try {
        const params = { granularity }
        if (selectedSubs.length > 0) {
          params.subreddit = selectedSubs.join(',')
        }

        const [postRes, engRes] = await Promise.all([
          getTimeSeriesPosts(params),
          getTimeSeriesEngagement({ ...params, metric: 'score' })
        ])

        // Pivot post data: group by date, columns = subreddits
        const dateMap = {}
        for (const item of postRes.data.series) {
          if (!dateMap[item.date]) dateMap[item.date] = { date: item.date }
          dateMap[item.date][item.subreddit] = item.count
        }
        setPostData(Object.values(dateMap).sort((a, b) => a.date.localeCompare(b.date)))

        // Pivot engagement data
        const engMap = {}
        for (const item of engRes.data.series) {
          if (!engMap[item.date]) engMap[item.date] = { date: item.date }
          engMap[item.date][item.subreddit] = item.avg
        }
        setEngagementData(Object.values(engMap).sort((a, b) => a.date.localeCompare(b.date)))
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [granularity, selectedSubs])

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
      <div className="bg-white rounded-lg shadow p-4 mb-6">
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
          <div className="bg-white rounded-lg shadow p-6 mb-6">
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
          </div>

          {/* Engagement Chart */}
          <div className="bg-white rounded-lg shadow p-6">
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
          </div>
        </>
      )}
    </div>
  )
}
