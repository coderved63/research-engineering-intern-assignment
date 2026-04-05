export default function AISummary({ text }) {
  if (!text) return null

  return (
    <div className="mt-3 bg-indigo-50 border border-indigo-100 rounded-lg px-4 py-3">
      <div className="flex items-start gap-2">
        <span className="text-xs bg-indigo-200 text-indigo-800 px-1.5 py-0.5 rounded font-medium shrink-0 mt-0.5">
          AI Summary
        </span>
        <p className="text-sm text-gray-700 leading-relaxed">{text}</p>
      </div>
    </div>
  )
}
