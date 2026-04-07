export default function AISummary({ text }) {
  if (!text) return null

  // Strip any markdown formatting the LLM might return
  const cleanText = text
    .replace(/^#{1,4}\s+.*$/gm, '')  // remove headers
    .replace(/\*\*/g, '')             // remove bold markers
    .replace(/^\s*[-*]\s/gm, '• ')    // convert list markers to bullets
    .trim()

  // Split into paragraphs by blank lines
  const paragraphs = cleanText.split(/\n\s*\n/).filter(p => p.trim())

  return (
    <div className="mt-4 bg-indigo-50/70 backdrop-blur-sm border border-indigo-100/50 rounded-xl px-5 py-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs bg-indigo-200/80 text-indigo-800 px-2 py-0.5 rounded-md font-semibold tracking-wide">
          AI Summary
        </span>
      </div>
      <div className="space-y-3">
        {paragraphs.map((para, i) => (
          <p key={i} className="text-sm text-gray-700 leading-relaxed">{para}</p>
        ))}
      </div>
    </div>
  )
}
