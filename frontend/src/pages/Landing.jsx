import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Logo from '../components/common/Logo'

export default function Landing() {
  const navigate = useNavigate()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <div className="min-h-screen bg-gray-950 text-white overflow-hidden relative">
      {/* Subtle grid background */}
      <div className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage: `linear-gradient(rgba(255, 255, 255, 0.5) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(255, 255, 255, 0.5) 1px, transparent 1px)`,
          backgroundSize: '80px 80px',
        }}
      />

      <style>{`
        @keyframes fade-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scale-in {
          from { opacity: 0; transform: scale(0.5) rotate(-180deg); }
          to { opacity: 1; transform: scale(1) rotate(0deg); }
        }
        @keyframes letter-in {
          from { opacity: 0; transform: translateY(40px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes glow-pulse {
          0%, 100% { filter: drop-shadow(0 0 20px rgba(245, 158, 11, 0.3)); }
          50% { filter: drop-shadow(0 0 40px rgba(245, 158, 11, 0.6)); }
        }
        .fade-up {
          animation: fade-up 0.8s ease-out forwards;
          opacity: 0;
        }
        .fade-in {
          animation: fade-in 1.2s ease-out forwards;
          opacity: 0;
        }
        .scale-in {
          animation: scale-in 1.2s cubic-bezier(0.34, 1.56, 0.64, 1) forwards, glow-pulse 4s ease-in-out 1.2s infinite;
          opacity: 0;
        }
        .letter-in {
          animation: letter-in 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
          opacity: 0;
          display: inline-block;
        }
      `}</style>

      {/* Navigation Bar */}
      <nav className={`relative z-10 px-8 py-6 flex items-center justify-between border-b border-white/5 ${mounted ? 'fade-in' : 'opacity-0'}`}>
        <div className="flex items-center gap-2.5">
          <Logo size={28} />
          <h1 className="text-xl font-bold tracking-tight" style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}>
            TheScope
          </h1>
        </div>

        <div className="flex items-center gap-8 text-sm text-gray-500">
          <a href="#features" className="hover:text-white transition-colors">Features</a>
          <a href="#stats" className="hover:text-white transition-colors">Stats</a>
          <a href="https://github.com/coderved63/research-engineering-intern-assignment" target="_blank" rel="noopener noreferrer"
            className="hover:text-white transition-colors">GitHub</a>
          <button onClick={() => navigate('/dashboard')}
            className="px-4 py-2 bg-white text-gray-950 font-medium rounded-full hover:bg-gray-200 transition-colors text-xs">
            Open Dashboard
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10 max-w-6xl mx-auto px-8 pt-32 pb-24">
        <div className="text-center flex flex-col items-center">
          {/* Centered Logo with scale-in + glow */}
          <div className={`mb-10 ${mounted ? 'scale-in' : 'opacity-0'}`}>
            <Logo size={120} />
          </div>

          {/* TheScope name with letter-by-letter animation */}
          <h1 className="text-7xl md:text-9xl font-bold mb-8 tracking-tight"
            style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}>
            {'TheScope'.split('').map((letter, i) => (
              <span
                key={i}
                className={mounted ? 'letter-in' : 'opacity-0'}
                style={{ animationDelay: `${0.6 + i * 0.08}s` }}
              >
                {letter}
              </span>
            ))}
          </h1>

          {/* Tagline */}
          <p className={`text-2xl md:text-3xl text-gray-400 mb-14 ${mounted ? 'fade-up' : 'opacity-0'}`}
            style={{ animationDelay: '1.6s' }}>
            Tracing how{' '}
            <span className="bg-gradient-to-r from-amber-400 via-orange-500 to-red-500 bg-clip-text text-transparent font-medium">
              narratives spread
            </span>
          </p>

          {/* CTA Button */}
          <div className={`mb-32 ${mounted ? 'fade-up' : 'opacity-0'}`}
            style={{ animationDelay: '1.8s' }}>
            <button onClick={() => navigate('/dashboard')}
              className="px-10 py-4 bg-white text-gray-950 font-semibold rounded-full hover:bg-gray-200 hover:scale-105 transition-all shadow-2xl shadow-white/10">
              Enter Dashboard →
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div id="stats" className={`grid grid-cols-2 md:grid-cols-4 gap-6 mb-24 ${mounted ? 'fade-up' : 'opacity-0'}`}
          style={{ animationDelay: '0.8s' }}>
          {[
            { value: '8,799', label: 'Reddit Posts', sublabel: 'analyzed semantically' },
            { value: '10', label: 'Subreddits', sublabel: 'across the spectrum' },
            { value: '1,500%', label: 'Activity Surge', sublabel: 'after inauguration' },
            { value: '320', label: 'Network Nodes', sublabel: '773 interaction edges' },
          ].map((stat, i) => (
            <div key={i} className="bg-white/[0.03] backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:border-amber-500/30 hover:bg-white/[0.05] transition-all">
              <div className="text-4xl font-bold bg-gradient-to-br from-amber-400 to-orange-500 bg-clip-text text-transparent mb-2"
                style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}>
                {stat.value}
              </div>
              <div className="text-sm font-medium text-gray-300">{stat.label}</div>
              <div className="text-xs text-gray-500 mt-0.5">{stat.sublabel}</div>
            </div>
          ))}
        </div>

        {/* Features Section */}
        <div id="features" className="mb-24">
          <div className="mb-12 max-w-3xl">
            <div className="text-amber-400 text-xs font-medium tracking-[0.2em] uppercase mb-4">What you can explore</div>
            <h2 className="text-4xl md:text-5xl font-bold leading-tight"
              style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}>
              Six lenses on political discourse
            </h2>
            <p className="text-gray-500 mt-4 text-base">
              Each section is built around a specific question — from how communities discussed events over time, to who bridges them, to how topics evolved.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
            {[
              {
                number: '01',
                title: 'Time Series',
                desc: 'Post volume, engagement, and topic trends over time. Each chart includes a dynamically generated plain-language summary.',
              },
              {
                number: '02',
                title: 'Network Analysis',
                desc: 'Force-directed graph of 320 connected authors. Compute PageRank, betweenness, and Louvain communities. Simulate node removal.',
              },
              {
                number: '03',
                title: 'Topic Clustering',
                desc: 'KMeans clustering on sentence embeddings with a tunable k. Click any cluster to see its top posts and subreddit breakdown.',
              },
              {
                number: '04',
                title: 'SearchAI',
                desc: 'Semantic search ranked by meaning, not keywords. Handles non-English queries through detection and translation.',
              },
              {
                number: '05',
                title: 'Embedding Map',
                desc: 'Interactive 2D projection of all 8,799 posts via UMAP. Zoom, pan, and search to discover topic neighborhoods.',
              },
              {
                number: '06',
                title: 'Investigative Story',
                desc: 'Methodology, verified key findings, and an event-annotated timeline. Designed like a research report, not a chart wall.',
              },
            ].map((feature) => (
              <div key={feature.number}
                className="group bg-gray-950 hover:bg-white/[0.02] p-8 transition-colors">
                <div className="text-amber-500/60 text-xs font-mono tracking-wider mb-6">{feature.number}</div>
                <h3 className="text-xl font-semibold text-white mb-3 tracking-tight">{feature.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Tech Stack Strip */}
        <div className="text-center mb-20">
          <p className="text-xs text-gray-600 tracking-wider uppercase mb-4">Built with</p>
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-gray-500">
            <span>React</span>
            <span className="text-gray-700">·</span>
            <span>Flask</span>
            <span className="text-gray-700">·</span>
            <span>sentence-transformers</span>
            <span className="text-gray-700">·</span>
            <span>NetworkX</span>
            <span className="text-gray-700">·</span>
            <span>UMAP</span>
            <span className="text-gray-700">·</span>
            <span>KMeans</span>
            <span className="text-gray-700">·</span>
            <span>Gemma 3 27B</span>
            <span className="text-gray-700">·</span>
            <span>Datamapplot</span>
          </div>
        </div>

        {/* Final CTA */}
        <div className="text-center">
          <h3 className="text-3xl md:text-4xl font-bold mb-4"
            style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}>
            Ready to investigate?
          </h3>
          <p className="text-gray-400 mb-8">
            Step into the dashboard and start exploring political narratives.
          </p>
          <button onClick={() => navigate('/dashboard')}
            className="px-10 py-4 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold rounded-full shadow-2xl shadow-amber-500/30 hover:shadow-amber-500/50 hover:scale-105 transition-all text-lg">
            Launch TheScope →
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 px-8 py-6 text-center text-xs text-gray-600">
        TheScope · Built for the SimPPL Research Engineering Intern Assignment ·{' '}
        <a href="https://github.com/coderved63/research-engineering-intern-assignment" target="_blank" rel="noopener noreferrer"
          className="hover:text-amber-400 transition-colors">GitHub</a>
      </footer>
    </div>
  )
}
