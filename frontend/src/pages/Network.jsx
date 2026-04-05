import { useState, useEffect, useCallback, useRef } from 'react'
import { getNetworkGraph, removeNetworkNode } from '../services/api'
import LoadingSpinner from '../components/common/LoadingSpinner'
import ForceGraph2D from 'react-force-graph-2d'

const COMMUNITY_COLORS = [
  '#6366f1', '#ef4444', '#22c55e', '#f59e0b', '#3b82f6',
  '#ec4899', '#14b8a6', '#f97316', '#8b5cf6', '#06b6d4',
  '#84cc16', '#e11d48', '#0ea5e9', '#d946ef', '#64748b'
]

export default function Network() {
  const [graphData, setGraphData] = useState(null)
  const [stats, setStats] = useState(null)
  const [minDegree, setMinDegree] = useState(2)
  const [selectedNode, setSelectedNode] = useState(null)
  const [removalImpact, setRemovalImpact] = useState(null)
  const [loading, setLoading] = useState(true)
  const [removing, setRemoving] = useState(false)
  const [containerWidth, setContainerWidth] = useState(800)
  const graphRef = useRef()
  const containerRef = useRef()

  // Measure container width
  useEffect(() => {
    if (containerRef.current) {
      const observer = new ResizeObserver(entries => {
        for (const entry of entries) {
          setContainerWidth(entry.contentRect.width)
        }
      })
      observer.observe(containerRef.current)
      return () => observer.disconnect()
    }
  }, [])

  useEffect(() => {
    async function fetchGraph() {
      setLoading(true)
      try {
        const res = await getNetworkGraph({ min_degree: minDegree })
        const data = res.data
        setStats(data.stats)

        const nodes = data.nodes.map(n => ({
          id: n.id,
          pagerank: n.pagerank || 0,
          betweenness: n.betweenness || 0,
          community: n.community || 0,
          degree: n.degree || 0,
          subreddits: n.subreddits || [],
          // Size nodes by degree for better visibility
          val: Math.max(2, (n.degree || 1) * 1.5)
        }))

        const edgeKey = data.links ? 'links' : 'edges'
        const links = (data[edgeKey] || []).map(e => ({
          source: e.source,
          target: e.target,
          weight: e.weight || 1
        }))

        setGraphData({ nodes, links })
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchGraph()
  }, [minDegree])

  // Center the graph after it loads
  useEffect(() => {
    if (graphRef.current && graphData) {
      setTimeout(() => {
        graphRef.current.zoomToFit(400, 50)
      }, 1500)
    }
  }, [graphData])

  const handleNodeClick = useCallback((node) => {
    setSelectedNode(node)
    setRemovalImpact(null)
    // Zoom to clicked node
    if (graphRef.current) {
      graphRef.current.centerAt(node.x, node.y, 500)
    }
  }, [])

  const handleRemoveNode = async () => {
    if (!selectedNode) return
    setRemoving(true)
    try {
      const res = await removeNetworkNode(selectedNode.id)
      setRemovalImpact(res.data)
    } catch (err) {
      console.error(err)
    } finally {
      setRemoving(false)
    }
  }

  // Custom node rendering with labels for high-degree nodes
  const paintNode = useCallback((node, ctx, globalScale) => {
    const color = COMMUNITY_COLORS[node.community % COMMUNITY_COLORS.length]
    const size = Math.max(3, Math.sqrt(node.degree || 1) * 2.5)
    const isSelected = selectedNode?.id === node.id

    // Draw node circle
    ctx.beginPath()
    ctx.arc(node.x, node.y, size, 0, 2 * Math.PI)
    ctx.fillStyle = isSelected ? '#1e1b4b' : color
    ctx.fill()

    if (isSelected) {
      ctx.strokeStyle = '#6366f1'
      ctx.lineWidth = 2
      ctx.stroke()
    }

    // Only show labels when zoomed in sufficiently
    const showLabel = isSelected || (globalScale > 3 && node.degree >= 5) || (globalScale > 5 && node.degree >= 2) || globalScale > 8
    if (showLabel) {
      ctx.font = `${Math.max(2, 10 / globalScale)}px sans-serif`
      ctx.fillStyle = '#1f2937'
      ctx.textAlign = 'center'
      ctx.fillText(node.id, node.x, node.y + size + 3 + (4 / globalScale))
    }
  }, [selectedNode])

  const topAccounts = graphData
    ? [...graphData.nodes].sort((a, b) => b.pagerank - a.pagerank).slice(0, 15)
    : []

  // Get unique communities for legend
  const communities = graphData
    ? [...new Set(graphData.nodes.map(n => n.community))].sort((a, b) => a - b).slice(0, 10)
    : []

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Network Analysis</h1>
      <p className="text-gray-500 mb-6">
        Author interaction network built from crossposts, shared URLs, and co-subreddit activity
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Graph */}
        <div className="lg:col-span-2 bg-white/70 backdrop-blur-sm rounded-xl border border-gray-200/50 shadow-sm p-4" ref={containerRef}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-4">
              <label className="text-sm text-gray-500">
                Min degree:
                <input type="range" min="1" max="10" value={minDegree}
                  onChange={e => setMinDegree(Number(e.target.value))}
                  className="ml-2 w-24 align-middle" />
                <span className="ml-1 text-gray-900 font-medium">{minDegree}</span>
              </label>
              <button onClick={() => graphRef.current?.zoomToFit(400, 50)}
                className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded hover:bg-gray-200">
                Fit to view
              </button>
            </div>
            {stats && (
              <div className="text-xs text-gray-500">
                {stats.num_nodes} nodes · {stats.num_edges} edges · {stats.num_components} components
              </div>
            )}
          </div>

          {loading ? <LoadingSpinner /> : (
            <div className="border border-gray-200 rounded bg-gray-50" style={{ height: 550 }}>
              {graphData && (
                <ForceGraph2D
                  ref={graphRef}
                  graphData={graphData}
                  nodeCanvasObject={paintNode}
                  nodePointerAreaPaint={(node, color, ctx) => {
                    const size = Math.max(3, Math.sqrt(node.degree || 1) * 2.5)
                    ctx.beginPath()
                    ctx.arc(node.x, node.y, size + 2, 0, 2 * Math.PI)
                    ctx.fillStyle = color
                    ctx.fill()
                  }}
                  onNodeClick={handleNodeClick}
                  linkColor={() => 'rgba(156, 163, 175, 0.3)'}
                  linkWidth={e => Math.min(Math.sqrt(e.weight) * 0.8, 3)}
                  d3AlphaDecay={0.02}
                  d3VelocityDecay={0.3}
                  cooldownTicks={200}
                  warmupTicks={50}
                  width={containerWidth - 32}
                  height={550}
                  minZoom={0.5}
                  maxZoom={10}
                />
              )}
            </div>
          )}

          {/* Community legend */}
          <div className="mt-3 flex flex-wrap gap-2">
            {communities.map(c => (
              <div key={c} className="flex items-center gap-1 text-xs text-gray-500">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COMMUNITY_COLORS[c % COMMUNITY_COLORS.length] }} />
                Community {c}
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-2">
            Node size = degree (connections). Click a node to inspect. Scroll to zoom, drag to pan.
          </p>
        </div>

        {/* Side Panel */}
        <div className="space-y-4">
          {/* Instructions when no node selected */}
          {!selectedNode && (
            <div className="bg-blue-50/70 backdrop-blur-sm border border-blue-200/50 rounded-xl p-4">
              <p className="text-sm text-blue-700">Click on any node in the graph to inspect it and see options to remove it from the network.</p>
            </div>
          )}

          {/* Selected Node Info */}
          {selectedNode && (
            <div className="bg-white/70 backdrop-blur-sm rounded-xl border border-gray-200/50 shadow-sm p-4">
              <h3 className="font-semibold text-gray-900 mb-2">u/{selectedNode.id}</h3>
              <div className="text-sm space-y-1.5 text-gray-600">
                <div className="flex justify-between">
                  <span>PageRank</span>
                  <span className="font-medium text-gray-900">{selectedNode.pagerank?.toFixed(6)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Betweenness</span>
                  <span className="font-medium text-gray-900">{selectedNode.betweenness?.toFixed(6)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Degree</span>
                  <span className="font-medium text-gray-900">{selectedNode.degree}</span>
                </div>
                <div className="flex justify-between">
                  <span>Community</span>
                  <div className="flex items-center gap-1">
                    <div className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: COMMUNITY_COLORS[selectedNode.community % COMMUNITY_COLORS.length] }} />
                    <span className="font-medium text-gray-900">{selectedNode.community}</span>
                  </div>
                </div>
                <div>
                  <span className="text-gray-500">Subreddits:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {(selectedNode.subreddits || []).map(s => (
                      <span key={s} className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded">r/{s}</span>
                    ))}
                  </div>
                </div>
              </div>
              <button onClick={handleRemoveNode} disabled={removing}
                className="mt-4 w-full px-3 py-2 bg-red-50 text-red-700 text-sm rounded hover:bg-red-100 disabled:opacity-50 border border-red-200">
                {removing ? 'Removing...' : 'Simulate removal of this node'}
              </button>
            </div>
          )}

          {/* Removal Impact */}
          {removalImpact && (
            <div className="bg-amber-50/70 backdrop-blur-sm border border-amber-200/50 rounded-xl p-4">
              <h3 className="font-semibold text-amber-900 text-sm mb-2">Removal Impact</h3>
              <p className="text-sm text-amber-800">{removalImpact.impact}</p>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div className="bg-white rounded p-2 text-center">
                  <p className="text-gray-500">Before</p>
                  <p className="font-bold text-gray-900">{removalImpact.stats_before?.num_nodes} nodes</p>
                  <p className="text-gray-600">{removalImpact.stats_before?.num_components} components</p>
                </div>
                <div className="bg-white rounded p-2 text-center">
                  <p className="text-gray-500">After</p>
                  <p className="font-bold text-gray-900">{removalImpact.stats_after?.num_nodes} nodes</p>
                  <p className="text-gray-600">{removalImpact.stats_after?.num_components} components</p>
                </div>
              </div>
            </div>
          )}

          {/* Top Accounts Table */}
          <div className="bg-white/70 backdrop-blur-sm rounded-xl border border-gray-200/50 shadow-sm p-4">
            <h3 className="font-semibold text-gray-900 mb-3 text-sm">Top Accounts by PageRank</h3>
            <div className="space-y-0.5">
              {topAccounts.map((a, i) => (
                <div key={a.id}
                  className={`flex justify-between items-center text-xs px-2 py-2 rounded cursor-pointer hover:bg-gray-50 ${selectedNode?.id === a.id ? 'bg-indigo-50 border border-indigo-200' : ''}`}
                  onClick={() => {
                    setSelectedNode(a)
                    setRemovalImpact(null)
                    if (graphRef.current) {
                      // Find the node in the graph to get its position
                      const gNode = graphData.nodes.find(n => n.id === a.id)
                      if (gNode) graphRef.current.centerAt(gNode.x, gNode.y, 500)
                    }
                  }}>
                  <span className="text-gray-700 truncate mr-2">
                    <span className="text-gray-400 mr-1 inline-block w-5 text-right">{i + 1}.</span>
                    u/{a.id}
                  </span>
                  <span className="text-gray-500 font-mono shrink-0">{a.pagerank?.toFixed(5)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
