import { useEffect } from 'react'

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

function WinProbBar({ gtProb }) {
  const oppProb = 100 - gtProb
  return (
    <div>
      <div className="flex justify-between text-sm font-semibold mb-2">
        <span className="text-gt-gold-light">GT {gtProb}%</span>
        <span className="text-gray-400">{oppProb}% Opp</span>
      </div>
      <div className="h-3 rounded-full overflow-hidden bg-gray-700 flex">
        <div
          className="bg-gt-gold-light transition-all duration-700"
          style={{ width: `${gtProb}%` }}
        />
        <div className="bg-gray-600 flex-1" />
      </div>
    </div>
  )
}

function ScorePrediction({ prediction, opponentName }) {
  const gtMid = Math.round((prediction.low + prediction.high) / 2)
  const oppMid = Math.round((prediction.oppLow + prediction.oppHigh) / 2)
  return (
    <div className="bg-gray-800/60 border border-gray-700 rounded-lg p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">
        Predicted Score
      </p>
      <div className="flex items-center justify-center gap-4">
        <div className="text-center">
          <p className="text-gt-gold-light font-bold text-2xl leading-none">{gtMid}</p>
          <p className="text-gray-500 text-xs mt-1">GT</p>
        </div>
        <span className="text-gray-600 font-bold text-xl">–</span>
        <div className="text-center">
          <p className="text-gray-300 font-bold text-2xl leading-none">{oppMid}</p>
          <p className="text-gray-500 text-xs mt-1 max-w-[80px] truncate">{opponentName}</p>
        </div>
      </div>
    </div>
  )
}

export default function GameDetail({ game, opponent, onClose }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const isCompleted = game.result === 'W' || game.result === 'L'

  const logoUrl = opponent?.espnId
    ? `https://a.espncdn.com/i/teamlogos/ncaa/500/${opponent.espnId}.png`
    : null

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-card">
        {/* Modal header */}
        <div className="bg-gt-navy rounded-t-2xl p-5">
          <div className="flex items-start justify-between mb-1">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              {/* Opponent logo */}
              {logoUrl && (
                <img
                  src={logoUrl}
                  alt={game.opponent}
                  className="w-12 h-12 object-contain flex-shrink-0 mt-0.5"
                  onError={(e) => { e.target.style.display = 'none' }}
                />
              )}
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${
                    game.home ? 'bg-blue-900/60 text-blue-300' : 'bg-gray-800 text-gray-400'
                  }`}>
                    {game.home ? 'Home' : 'Away'}
                  </span>
                  <span className="text-gt-gold text-xs font-semibold">
                    {game.conference ? 'ACC' : 'Non-Conference'}
                  </span>
                </div>
                <h2 className="text-white font-bold text-xl mt-1">
                  GT {game.home ? 'vs' : '@'} {game.opponent}
                </h2>
                <p className="text-gray-400 text-sm mt-0.5">{formatDate(game.date)}</p>
                <p className="text-gray-500 text-xs mt-0.5">{game.venue}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white text-2xl leading-none ml-4 mt-1 flex-shrink-0"
              aria-label="Close"
            >
              ×
            </button>
          </div>

          {/* Result badge if completed */}
          {isCompleted && (
            <div className={`inline-flex items-center gap-2 mt-3 px-3 py-1.5 rounded-md text-sm font-bold ${
              game.result === 'W' ? 'bg-green-900/60 text-green-300' : 'bg-red-900/60 text-red-300'
            }`}>
              <span>{game.result === 'W' ? 'WIN' : 'LOSS'}</span>
              <span>GT {game.gtScore} – {game.opponent} {game.oppScore}</span>
            </div>
          )}
        </div>

        {/* Modal body */}
        <div className="p-5 space-y-5">
          {/* Win probability */}
          {!isCompleted && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">
                Win Probability
              </p>
              <WinProbBar gtProb={game.gtWinProbability} />
            </div>
          )}

          {/* Score prediction */}
          {!isCompleted && game.scorePrediction && (
            <ScorePrediction
              prediction={game.scorePrediction}
              opponentName={game.opponent}
            />
          )}

          {/* Matchup summary */}
          {game.matchupSummary && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
                Matchup Breakdown
              </p>
              <p className="text-gray-300 text-sm leading-relaxed">{game.matchupSummary}</p>
            </div>
          )}

          {/* Opponent top players */}
          {opponent?.topPlayers?.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">
                {opponent.name} Key Players
              </p>
              <div className="space-y-2">
                {opponent.topPlayers.map((player) => (
                  <div key={player.name} className="bg-gray-800/60 border border-gray-700/50 rounded-lg px-4 py-2.5 flex items-start gap-3">
                    <span className="text-xs font-bold text-gt-gold bg-gt-navy px-1.5 py-0.5 rounded mt-0.5">
                      {player.position}
                    </span>
                    <div>
                      <p className="text-white text-sm font-semibold">{player.name}</p>
                      <p className="text-gray-400 text-xs">{player.note}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Opponent record */}
          {opponent && (
            <div className="flex items-center justify-between text-sm border-t border-gray-800 pt-4">
              <span className="text-gray-500">{opponent.name} Record</span>
              <span className="text-gray-300 font-semibold">
                {opponent.record.wins}–{opponent.record.losses}
                {opponent.ranking && (
                  <span className="ml-2 text-gt-gold text-xs">#{opponent.ranking}</span>
                )}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
