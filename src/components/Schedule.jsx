function formatDate(dateStr) {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', weekday: 'short' })
}

function WinProbBar({ gtProb }) {
  const oppProb = 100 - gtProb
  return (
    <div className="mt-2">
      <div className="flex justify-between text-xs text-gray-500 mb-1">
        <span>GT {gtProb}%</span>
        <span>{oppProb}% Opp</span>
      </div>
      <div className="win-bar">
        <div
          className="bg-gt-gold-light transition-all duration-500"
          style={{ width: `${gtProb}%` }}
        />
        <div
          className="bg-red-700 flex-1"
        />
      </div>
    </div>
  )
}

function ResultBadge({ result, gtScore, oppScore }) {
  if (!result) return null
  const isWin = result === 'W'
  return (
    <div className={`flex items-center gap-1.5 text-sm font-bold ${isWin ? 'text-green-400' : 'text-red-400'}`}>
      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs text-white ${isWin ? 'bg-green-600' : 'bg-red-600'}`}>
        {result}
      </span>
      <span>{gtScore} – {oppScore}</span>
    </div>
  )
}

function GameCard({ game, opponent, onClick }) {
  const isCompleted = game.result === 'W' || game.result === 'L'
  const isUpcoming = !isCompleted

  const borderColor = game.result === 'W'
    ? 'border-green-800/60 bg-green-950/20'
    : game.result === 'L'
      ? 'border-red-800/60 bg-red-950/20'
      : 'border-gray-800 bg-gray-900'

  const opponentLogo = opponent?.name || game.opponent

  return (
    <div
      className={`rounded-xl border p-4 cursor-pointer hover:brightness-110 transition-all duration-200 ${borderColor}`}
      onClick={() => onClick(game)}
    >
      <div className="flex items-center justify-between gap-3">
        {/* Left: date + location */}
        <div className="min-w-[90px]">
          <p className="text-gt-gold-light text-xs font-semibold uppercase tracking-wide">
            {formatDate(game.date)}
          </p>
          <p className="text-gray-500 text-xs mt-0.5">
            {game.home ? '🏠 Home' : '✈️ Away'}
            {!game.conference && game.opponent !== 'Mercer' ? ' · Non-conf' : ''}
            {!game.conference && game.opponent === 'Mercer' ? ' · FCS' : ''}
            {game.conference ? ' · ACC' : ''}
          </p>
        </div>

        {/* Center: opponent */}
        <div className="flex-1">
          <p className="text-white font-semibold text-base">
            {game.home ? 'vs' : '@'} {game.opponent}
            {opponent?.ranking && (
              <span className="ml-2 text-xs text-gt-gold bg-gt-navy px-1.5 py-0.5 rounded">
                #{opponent.ranking}
              </span>
            )}
          </p>
          <p className="text-gray-500 text-xs mt-0.5">{game.venue}</p>
        </div>

        {/* Right: result or arrow */}
        <div className="text-right min-w-[60px]">
          {isCompleted ? (
            <ResultBadge result={game.result} gtScore={game.gtScore} oppScore={game.oppScore} />
          ) : (
            <span className="text-gray-600 text-lg">›</span>
          )}
        </div>
      </div>

      {/* Win probability bar for upcoming games */}
      {isUpcoming && <WinProbBar gtProb={game.gtWinProbability} />}
    </div>
  )
}

export default function Schedule({ games, opponentMap, onGameClick }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-white font-bold text-lg">2026 Schedule</h2>
        <span className="text-gray-500 text-xs">{games.length} games</span>
      </div>

      {/* Bye week note */}
      <div className="text-xs text-gray-600 flex items-center gap-2 py-1">
        <span className="text-gray-700">BYE: Oct 3</span>
      </div>

      <div className="space-y-2">
        {games.map((game) => (
          <GameCard
            key={game.id}
            game={game}
            opponent={opponentMap[game.opponentId]}
            onClick={onGameClick}
          />
        ))}
      </div>

      <p className="text-gray-700 text-xs text-center mt-4">
        Win probabilities update daily · Click any game for details
      </p>
    </div>
  )
}
