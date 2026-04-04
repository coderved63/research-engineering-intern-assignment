export default function Embeddings() {
  return (
    <div className="flex flex-col h-[calc(100vh-6rem)]">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Embedding Explorer</h1>
          <p className="text-gray-500 mt-1">Interactive map of all 8,799 posts — similar posts are near each other</p>
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-500 bg-gray-100 px-3 py-2 rounded-lg">
          <span><strong>Scroll</strong> to zoom</span>
          <span>·</span>
          <span><strong>Drag</strong> to pan</span>
          <span>·</span>
          <span><strong>Hover</strong> for details</span>
          <span>·</span>
          <span>Use the <strong>search bar</strong> inside the map</span>
        </div>
      </div>

      <div className="flex-1 bg-white rounded-lg shadow overflow-hidden border border-gray-200">
        <iframe
          src="/static/datamapplot.html"
          title="Embedding Visualization"
          className="w-full border-0"
          style={{ height: 'calc(100vh - 12rem)', minHeight: 600 }}
        />
      </div>

      <p className="text-xs text-gray-400 mt-2">
        UMAP 2D projection of all-MiniLM-L6-v2 sentence embeddings (384-dim → 2D).
        Colored by subreddit. Built with Datamapplot.
      </p>
    </div>
  )
}
