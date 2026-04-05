import { useState, useRef, useEffect } from 'react'
import { searchPosts, searchTimeSeries } from '../services/api'
import SearchTrendChart from '../components/common/SearchTrendChart'

export default function Search() {
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSearch = async (query) => {
    const q = query || input.trim()
    if (loading) return

    // Add user message
    setMessages(prev => [...prev, { role: 'user', content: q }])
    setInput('')
    setLoading(true)

    try {
      const [searchRes, tsRes] = await Promise.allSettled([
        searchPosts({ message: q }),
        searchTimeSeries({ message: q, granularity: 'week' })
      ])

      const data = searchRes.status === 'fulfilled' ? searchRes.value.data : { answer: 'Search failed.', results: [], follow_up_queries: [] }
      const tsData = tsRes.status === 'fulfilled' ? tsRes.value.data : null

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.answer,
        results: data.results,
        timeseries: tsData,
        follow_ups: data.follow_up_queries,
        language: data.query_language,
        translated: data.was_translated,
        translation_note: data.translation_note
      }])
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, something went wrong. Please try again.',
        results: [],
        follow_ups: []
      }])
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (input.trim()) handleSearch()
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <div className="mb-4">
        <h1 className="text-3xl font-bold text-gray-900">SearchAI</h1>
        <p className="text-gray-500 mt-1">
          Semantic search powered by AI — results ranked by meaning, not keywords.
          Try queries with zero word overlap: e.g., "government overreach" finds posts about "federal surveillance."
        </p>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-4">
        {messages.length === 0 && (
          <div className="text-center py-16">
            <p className="text-gray-400 text-lg mb-6">Ask anything about the dataset</p>
            <div className="flex flex-wrap justify-center gap-2">
              {[
                'How do communities discuss immigration differently?',
                'What topics dominated after the inauguration?',
                'Show me posts about government surveillance',
              ].map(q => (
                <button key={q} onClick={() => handleSearch(q)}
                  className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 hover:border-indigo-300 hover:text-indigo-600 transition-colors">
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`${msg.role === 'user' ? 'flex justify-end' : ''}`}>
            {msg.role === 'user' ? (
              <div className="bg-indigo-600 text-white px-4 py-2 rounded-lg rounded-br-none max-w-lg text-sm">
                {msg.content}
              </div>
            ) : (
              <div className="space-y-3 max-w-3xl">
                {/* Translation note */}
                {msg.translated && msg.translation_note && (
                  <p className="text-xs text-amber-600 bg-amber-50 px-3 py-1 rounded inline-block">
                    {msg.translation_note}
                  </p>
                )}

                {/* AI Answer */}
                <div className="bg-white/70 backdrop-blur-sm rounded-xl border border-gray-200/50 shadow-sm p-4">
                  <p className="text-sm text-gray-700">{msg.content}</p>
                </div>

                {/* Time-Series Chart */}
                {msg.timeseries && msg.timeseries.series && msg.timeseries.series.length > 0 && (
                  <SearchTrendChart
                    series={msg.timeseries.series}
                    granularity={msg.timeseries.granularity}
                    totalMatching={msg.timeseries.total_matching}
                    query={messages[i - 1]?.content || ''}
                  />
                )}

                {/* Results */}
                {msg.results && msg.results.length > 0 && (
                  <div className="bg-white/70 backdrop-blur-sm rounded-xl border border-gray-200/50 shadow-sm p-4">
                    <p className="text-xs text-gray-500 font-medium mb-2">
                      Top {msg.results.length} results
                    </p>
                    <div className="space-y-2">
                      {msg.results.slice(0, 10).map((r, j) => (
                        <a key={r.id} href={r.permalink ? `https://reddit.com${r.permalink}` : '#'}
                          target="_blank" rel="noopener noreferrer"
                          className="block border-b border-gray-100 pb-2 last:border-0 hover:bg-gray-50 rounded px-1 -mx-1 transition-colors">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {j + 1}. {r.title}
                                <span className="text-indigo-400 ml-1 text-xs">↗</span>
                              </p>
                              <p className="text-xs text-gray-500 mt-0.5">
                                r/{r.subreddit} · u/{r.author} · {r.score} pts · {r.date}
                              </p>
                              {r.selftext && (
                                <p className="text-xs text-gray-400 mt-1 line-clamp-2">{r.selftext}</p>
                              )}
                            </div>
                            {r.similarity && (
                              <span className="text-xs text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded ml-2 shrink-0">
                                {(r.similarity * 100).toFixed(0)}%
                              </span>
                            )}
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Follow-up suggestions */}
                {msg.follow_ups && msg.follow_ups.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {msg.follow_ups.map(q => (
                      <button key={q} onClick={() => handleSearch(q)}
                        className="px-3 py-1.5 bg-indigo-50 text-indigo-700 text-xs rounded-full hover:bg-indigo-100 transition-colors">
                        {q}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2 text-gray-400 text-sm">
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
            Searching...
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Ask anything about political discourse on Reddit..."
          className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          disabled={loading}
        />
        <button type="submit" disabled={loading || !input.trim()}
          className="px-6 py-3 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed">
          Send
        </button>
      </form>
    </div>
  )
}
