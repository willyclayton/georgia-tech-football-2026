function formatDate(dateStr) {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', weekday: 'short' })
}

function WinProbBar({ gtProb }) {
  const oppProb = 100 - gtProb
  return (
    <div className="mt-2.5">
      <div className="flex justify-between text-xs text-gray-500 mb-1">
        <span>GT {gtProb}%</span>
        <span>{oppProb}% Opp</span>
      </div>
      <div className="win-bar">
        <div
          className="bg-gt-gold-light transition-all duration-500"
          style={{ width: `${gtProb}%` }}
        />
        <div className="bg-gray-700 flex-1" />
      </div>
    </div>
  )
}

function ResultBadge({ result, gtScore, oppScore }) {
  if (!result) return null
  const isWin = result === 'W'
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ${
      isWin ? 'bg-green-900/60 text-green-300' : 'bg-red-900/60 text-red-300'
    }`}>
      {result} {gtScore}–{oppScore}
    </span>
  )
}

function LocationBadge({ home }) {
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${
      home
        ? 'bg-blue-900/50 text-blue-300'
        : 'bg-gray-800 text-gray-400'
    }`}>
      {home ? 'Home' : 'Away'}
    </span>
  )
}

function ConfBadge({ conference, opponent }) {
  let label = 'ACC'
  if (!conference) {
    label = opponent === 'Mercer' ? 'FCS' : 'Non-conf'
  }
  return (
    <span className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium bg-gray-800/80 text-gray-500">
      {label}
    </span>
  )
}

function GameCard({ game, opponent, onClick }) {
  const isCompleted = game.result === 'W' || game.result === 'L'
  const isUpcoming = !isCompleted

  const cardBg = game.home
    ? 'bg-blue-950/40 border-blue-800/60'
    : 'bg-gray-900/60 border-gray-700'

  const logoUrl = opponent?.espnId
    ? `https://a.espncdn.com/i/teamlogos/ncaa/500/${opponent.espnId}.png`
    : null

  return (
    <div
      className={`rounded-lg border p-4 cursor-pointer hover:brightness-110 transition-all duration-200 ${cardBg}`}
      onClick={() => onClick(game)}
    >
      <div className="flex items-center gap-3">
        {/* Opponent logo */}
        <div className="w-8 h-8 flex-shrink-0 flex items-center justify-center">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={game.opponent}
              className="w-8 h-8 object-contain"
              onError={(e) => { e.target.style.display = 'none' }}
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gray-800" />
          )}
        </div>

        {/* Center: opponent name + badges */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-white font-semibold text-sm">
              {game.home ? 'vs' : '@'} {game.opponent}
            </p>
            {opponent?.ranking && (
              <span className="inline-flex items-center rounded-md px-1.5 py-0.5 text-xs font-semibold bg-gt-navy text-gt-gold border border-gt-gold/30">
                #{opponent.ranking}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            <ConfBadge conference={game.conference} opponent={game.opponent} />
            <LocationBadge home={game.home} />
          </div>
        </div>

        {/* Right: date + result */}
        <div className="text-right flex-shrink-0">
          <p className="text-gt-gold-light text-xs font-semibold">{formatDate(game.date)}</p>
          <div className="mt-1">
            {isCompleted ? (
              <ResultBadge result={game.result} gtScore={game.gtScore} oppScore={game.oppScore} />
            ) : (
              <span className="text-gray-600 text-base">›</span>
            )}
          </div>
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
      <div className="text-xs text-gray-600 py-1">
        <span>BYE: Oct 3</span>
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
