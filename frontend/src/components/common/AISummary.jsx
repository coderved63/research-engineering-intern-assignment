export default function AISummary({ text }) {
  if (!text) return null

  // Strip any markdown formatting the LLM might return
  const cleanText = text
    .replace(/^#{1,4}\s+.*$/gm, '')  // remove headers
    .replace(/\*\*/g, '')             // remove bold markers
    .replace(/^\s*[-*]\s/gm, '• ')    // convert list markers to bullets
    .trim()

  return (
    <div className="mt-3 bg-indigo-50/70 backdrop-blur-sm border border-indigo-100/50 rounded-xl px-4 py-3">
      <div className="flex items-start gap-2">
        <span className="text-xs bg-indigo-200/80 text-indigo-800 px-1.5 py-0.5 rounded-md font-medium shrink-0 mt-0.5">
          AI Summary
        </span>
        <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{cleanText}</div>
      </div>
    </div>
  )
}
