import { useState, useEffect } from 'react'
import { getEmbeddingsSummary } from '../services/api'
import AISummary from '../components/common/AISummary'

export default function Embeddings() {
  const [summary, setSummary] = useState('')

  useEffect(() => {
    getEmbeddingsSummary()
      .then(res => setSummary(res.data.summary || ''))
      .catch(err => console.error(err))
  }, [])

  return (
    <div>
      <div className="flex items-start justify-between mb-3 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Embedding Explorer</h1>
          <p className="text-gray-500 mt-1 max-w-2xl">
            A visual map of all 8,799 posts. Posts that discuss similar things are placed near each other —
            tight clumps reveal topic neighborhoods that emerged automatically from the data.
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-500 bg-gray-100 px-3 py-2 rounded-lg shrink-0">
          <span><strong>Scroll</strong> to zoom</span>
          <span>·</span>
          <span><strong>Drag</strong> to pan</span>
          <span>·</span>
          <span><strong>Hover</strong> for details</span>
        </div>
      </div>

      <div className="bg-white/70 backdrop-blur-sm rounded-xl border border-gray-200/50 shadow-sm overflow-hidden mb-4">
        <iframe
          src="/static/datamapplot.html"
          title="Embedding Visualization"
          className="w-full border-0"
          style={{ height: '70vh', minHeight: 500 }}
        />
      </div>

      <p className="text-xs text-gray-400 mb-4">
        UMAP 2D projection of all-MiniLM-L6-v2 sentence embeddings (384-dim → 2D).
        Colored by subreddit. Built with Datamapplot.
      </p>

      <AISummary text={summary} />
    </div>
  )
}
