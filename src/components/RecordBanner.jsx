export default function RecordBanner({ wins, losses }) {
  if (wins === 0 && losses === 0) {
    return (
      <span className="text-xs text-gray-400 font-medium px-3 py-1 bg-gray-800 rounded-full">
        Season not started
      </span>
    )
  }
  return (
    <div className="flex items-center gap-1 px-3 py-1 bg-gray-800 rounded-full">
      <span className="text-gt-gold-light font-bold text-sm">{wins}</span>
      <span className="text-gray-500 font-bold text-sm">–</span>
      <span className="text-gray-300 font-bold text-sm">{losses}</span>
    </div>
  )
}
