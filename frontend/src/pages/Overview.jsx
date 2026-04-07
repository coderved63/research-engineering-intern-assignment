import { useState, useEffect } from 'react'
import { getOverviewStats, getTimeSeriesPosts } from '../services/api'
import MetricCard from '../components/common/MetricCard'
import LoadingSpinner from '../components/common/LoadingSpinner'
import AISummary from '../components/common/AISummary'
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
  { date: '2024-30', label: 'Biden drops out', color: '#3b82f6' },
  { date: '2024-45', label: 'Election Day', color: '#dc2626' },
  { date: '2025-01', label: 'Jan 6 Anniversary', color: '#f97316' },
  { date: '2025-03', label: 'Inauguration', color: '#7c3aed' },
  { date: '2025-06', label: 'Executive Orders Spike', color: '#dc2626' },
]

export default function Overview() {
  const [stats, setStats] = useState(null)
  const [timeline, setTimeline] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showEvents, setShowEvents] = useState(false)

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
      <div className="mb-8 max-w-4xl">
        <h1 className="text-3xl font-bold text-gray-900">
          Tracing Narratives Across Reddit Communities
        </h1>
        <p className="text-gray-500 mt-3 leading-relaxed">
          How do politically distinct Reddit communities process the same events — and what does each one notice
          that the others miss? This dashboard traces {stats.total_posts.toLocaleString()} posts from {stats.total_authors.toLocaleString()} authors
          across 10 subreddits between July 2024 and February 2025 — a window that covers Biden dropping out,
          the November election, and the first month of Trump's second term.
        </p>
        <p className="text-gray-500 mt-3 leading-relaxed">
          The most striking pattern in the data is concentration: 83% of all activity falls into the six weeks
          after January 20, when daily volume jumped from roughly 13 posts/day to 217 — a 1,500% surge that
          turned the second half of the dataset into a near-real-time snapshot of the transition itself.
          The pages below trace what each community noticed, which accounts bridged them, and how the topics
          shifted week by week.
        </p>
      </div>

      {/* About This Analysis */}
      <details className="mb-8 bg-white/70 backdrop-blur-sm rounded-xl border border-gray-200/50 shadow-sm">
        <summary className="px-6 py-4 cursor-pointer text-sm font-semibold text-gray-900 hover:text-indigo-700 select-none">
          About This Analysis — Methodology & Approach
        </summary>
        <div className="px-6 pb-6 text-gray-600 space-y-4 border-t border-gray-100 pt-5">
          <p className="text-sm leading-relaxed">
            This dashboard investigates how narratives spread across a curated set of Reddit communities during the 2024 US election
            and 2025 presidential transition. Inspired by SimPPL's Parrot platform, it combines <strong className="text-gray-800">linguistic analysis</strong> (NLP)
            with <strong className="text-gray-800">network analysis</strong> to trace how information flows between communities with different political orientations.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="bg-white/10 rounded-lg p-4 border border-gray-200/20">
              <h4 className="font-semibold text-gray-900 mb-2 text-sm">Data Source</h4>
              <p className="text-sm text-gray-600 leading-relaxed">
                8,799 Reddit posts from 10 subreddits collected for their political associations:
                r/Anarchism, r/socialism, r/democrats, r/Liberal, r/politics, r/PoliticalDiscussion, r/neoliberal,
                r/Conservative, r/Republican, and r/worldpolitics. Each post includes title, body text, author, score,
                comments, and timestamps (July 23, 2024 — February 18, 2025).
              </p>
              <div className="mt-3 bg-amber-50/70 border border-amber-200/70 rounded-lg px-3 py-2.5">
                <div className="flex items-start gap-2">
                  <div className="shrink-0 mt-0.5 w-4 h-4 rounded-full bg-amber-200/70 text-amber-800 flex items-center justify-center text-[10px] font-bold">!</div>
                  <p className="text-xs text-amber-900/90 leading-relaxed">
                    <strong className="font-semibold">Noted during the dataset audit:</strong> nine of the ten subreddits
                    contain active political discussion, while r/worldpolitics has drifted into largely unmoderated,
                    off-topic content (every post is flagged NSFW in the source data). It is kept in all analyses because
                    removing it would change the network topology and weaken the comparison; individual r/worldpolitics
                    posts are marked with a contextual note wherever they appear in the UI.
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white/10 rounded-lg p-4 border border-gray-200/20">
              <h4 className="font-semibold text-gray-900 mb-2 text-sm">NLP Pipeline</h4>
              <p className="text-sm text-gray-600 leading-relaxed">
                Posts are encoded into 384-dimensional sentence embeddings using all-MiniLM-L6-v2 (sentence-transformers).
                These embeddings power semantic search (cosine similarity), topic clustering (KMeans), and the 2D UMAP projection
                for embedding visualization (Datamapplot).
              </p>
            </div>
            <div className="bg-white/10 rounded-lg p-4 border border-gray-200/20">
              <h4 className="font-semibold text-gray-900 mb-2 text-sm">Network Construction</h4>
              <p className="text-sm text-gray-600 leading-relaxed">
                The author interaction network is built from three signal types: crosspost relationships (who crossposted from whom),
                shared URL co-sharing (authors who independently shared the same external link), and co-subreddit activity
                (authors active in 2+ of the same communities). We compute PageRank, betweenness centrality, and Louvain community detection.
                The [deleted] meta-author is excluded to prevent false super-connections across 9 subreddits.
              </p>
            </div>
            <div className="bg-white/10 rounded-lg p-4 border border-gray-200/20">
              <h4 className="font-semibold text-gray-900 mb-2 text-sm">AI Integration</h4>
              <p className="text-sm text-gray-600 leading-relaxed">
                Dynamic plain-language summaries beneath charts are generated by Gemma 3 27B (Google AI) based on the actual data
                returned by each query — not hardcoded. The semantic search chatbot uses the same LLM for conversational responses
                and follow-up query suggestions. Non-English queries are automatically detected and translated before searching.
              </p>
            </div>
          </div>
        </div>
      </details>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <MetricCard label="Total Posts" value={stats.total_posts.toLocaleString()} subtitle="across 10 subreddits" />
        <MetricCard label="Unique Authors" value={stats.total_authors.toLocaleString()} subtitle="87 cross-community" />
        <MetricCard label="Date Range" value="7 months" subtitle={`${stats.date_range.start} to ${stats.date_range.end}`} />
        <MetricCard label="Network" value={`${stats.network_stats.num_nodes} nodes`} subtitle={`${stats.network_stats.num_edges} edges, ${stats.network_stats.num_components} components`} />
      </div>

      {/* Timeline with Events */}
      <div className="bg-white/70 backdrop-blur-sm rounded-xl border border-gray-200/50 shadow-sm p-6 mb-8">
        <div className="flex items-start justify-between mb-1 gap-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Activity Timeline</h2>
            <p className="text-sm text-gray-500 mt-1">Weekly post volume across all 10 communities</p>
          </div>
          <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer select-none shrink-0 mt-1">
            <input
              type="checkbox"
              checked={showEvents}
              onChange={e => setShowEvents(e.target.checked)}
              className="w-3.5 h-3.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
            />
            Show key events
          </label>
        </div>
        <ResponsiveContainer width="100%" height={showEvents ? 340 : 300}>
          <AreaChart data={timeline} margin={{ top: showEvents ? 30 : 10, right: 20, left: 0, bottom: 0 }}>
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
            {showEvents && KEY_EVENTS.map(evt => (
              <ReferenceLine key={evt.date} x={evt.date} stroke={evt.color} strokeDasharray="3 3" strokeWidth={1.5}
                label={{ value: evt.label, position: 'top', fontSize: 11, fill: evt.color, fontWeight: 500 }} />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Key Findings */}
      <div className="bg-indigo-50/50 backdrop-blur-sm rounded-xl border border-indigo-100/50 p-5 mb-8">
        <h2 className="text-sm font-semibold text-indigo-900 mb-3">Key Findings from the Data</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white/60 rounded-lg p-3">
            <p className="text-sm font-medium text-gray-900 mb-1">87 People Post in Multiple Communities</p>
            <p className="text-xs text-gray-500">
              Out of 3,599 authors, 87 are active in 2 or more subreddits with different political leanings.
              These "bridge accounts" may carry ideas and narratives between communities that otherwise don't interact —
              for example, one user posts in both r/Conservative and r/democrats.
            </p>
          </div>
          <div className="bg-white/60 rounded-lg p-3">
            <p className="text-sm font-medium text-gray-900 mb-1">Massive Spike After Inauguration</p>
            <p className="text-xs text-gray-500">
              After Trump's inauguration on January 20, 2025, average daily posting jumped from 13 posts/day to 217 posts/day —
              a 1,500% increase. This was driven by reactions to executive orders on immigration, DOGE, and federal workforce changes
              across all 10 communities simultaneously.
            </p>
          </div>
          <div className="bg-white/60 rounded-lg p-3">
            <p className="text-sm font-medium text-gray-900 mb-1">Each Side Reads Different News</p>
            <p className="text-xs text-gray-500">
              Conservative subreddits primarily share links from breitbart.com (#1), foxnews.com, and nypost.com.
              Liberal and centrist subreddits share from nytimes.com (#1), theguardian.com, and apnews.com.
              These communities are reading entirely different sources about the same events — creating
              isolated information ecosystems.
            </p>
          </div>
          <div className="bg-white/60 rounded-lg p-3">
            <p className="text-sm font-medium text-gray-900 mb-1">Some Accounts Post at Unusual Rates</p>
            <p className="text-xs text-gray-500">
              The user M_i_c_K posted 246 times across r/Conservative and r/Republican in just 26 days — that's over 9 posts per day.
              While this doesn't prove automation, this posting frequency is far above normal human behavior and
              warrants investigation for potential coordinated or bot-assisted activity.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Subreddit Breakdown */}
        <div className="bg-white/70 backdrop-blur-sm rounded-xl border border-gray-200/50 shadow-sm p-6">
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
        <div className="bg-white/70 backdrop-blur-sm rounded-xl border border-gray-200/50 shadow-sm p-6">
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

      {/* Executive Summary */}
      {stats.executive_summary && (
        <div className="mb-8">
          <AISummary text={stats.executive_summary} />
        </div>
      )}

      {/* Top Authors */}
      <div className="bg-white/70 backdrop-blur-sm rounded-xl border border-gray-200/50 shadow-sm p-6">
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
                      {i + 1}.{' '}
                      <a href={`https://reddit.com/u/${a.author}`} target="_blank" rel="noopener noreferrer"
                        className="text-indigo-600 hover:text-indigo-800 hover:underline">
                        u/{a.author} <span className="text-indigo-400 text-xs">↗</span>
                      </a>
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
