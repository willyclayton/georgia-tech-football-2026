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
        <span className="text-red-400">{oppProb}% Opp</span>
      </div>
      <div className="h-4 rounded-full overflow-hidden bg-gray-700 flex">
        <div
          className="bg-gt-gold-light transition-all duration-700 flex items-center justify-center"
          style={{ width: `${gtProb}%` }}
        >
          {gtProb >= 25 && (
            <span className="text-gray-900 text-xs font-bold">{gtProb}%</span>
          )}
        </div>
        <div className="bg-red-700 flex-1 flex items-center justify-center">
          {oppProb >= 25 && (
            <span className="text-white text-xs font-bold">{oppProb}%</span>
          )}
        </div>
      </div>
    </div>
  )
}

function ScorePrediction({ prediction }) {
  return (
    <div className="bg-gray-800 rounded-xl p-4">
      <p className="text-gray-400 text-xs font-semibold uppercase tracking-wide mb-2">Score Prediction</p>
      <div className="flex items-center justify-between">
        <div className="text-center">
          <p className="text-gt-gold-light font-bold text-xl">
            {prediction.low}–{prediction.high}
          </p>
          <p className="text-gray-500 text-xs">GT</p>
        </div>
        <div className="text-gray-600 font-bold text-lg">vs</div>
        <div className="text-center">
          <p className="text-gray-300 font-bold text-xl">
            {prediction.oppLow}–{prediction.oppHigh}
          </p>
          <p className="text-gray-500 text-xs">Opponent</p>
        </div>
      </div>
    </div>
  )
}

export default function GameDetail({ game, opponent, onClose }) {
  // Close on Escape key
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const isCompleted = game.result === 'W' || game.result === 'L'

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-card">
        {/* Modal header */}
        <div className="bg-gt-navy rounded-t-2xl p-5">
          <div className="flex items-start justify-between mb-1">
            <div>
              <p className="text-gt-gold text-xs font-semibold uppercase tracking-wide">
                {game.conference ? 'ACC · ' : 'Non-Conference · '}
                {game.home ? 'Home' : 'Away'}
              </p>
              <h2 className="text-white font-bold text-xl mt-1">
                GT {game.home ? 'vs' : '@'} {game.opponent}
              </h2>
              <p className="text-gray-400 text-sm mt-0.5">{formatDate(game.date)}</p>
              <p className="text-gray-500 text-xs mt-0.5">{game.venue}</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white text-2xl leading-none ml-4 mt-1"
              aria-label="Close"
            >
              ×
            </button>
          </div>

          {/* Result badge if completed */}
          {isCompleted && (
            <div className={`inline-flex items-center gap-2 mt-3 px-3 py-1.5 rounded-full text-sm font-bold ${game.result === 'W' ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'}`}>
              <span>{game.result === 'W' ? 'WIN' : 'LOSS'}</span>
              <span>GT {game.gtScore} · {game.opponent} {game.oppScore}</span>
            </div>
          )}
        </div>

        {/* Modal body */}
        <div className="p-5 space-y-5">
          {/* Win probability */}
          {!isCompleted && (
            <div>
              <p className="text-gray-400 text-xs font-semibold uppercase tracking-wide mb-3">
                Win Probability
              </p>
              <WinProbBar gtProb={game.gtWinProbability} />
            </div>
          )}

          {/* Score prediction */}
          {!isCompleted && game.scorePrediction && (
            <ScorePrediction prediction={game.scorePrediction} />
          )}

          {/* Matchup summary */}
          {game.matchupSummary && (
            <div>
              <p className="text-gray-400 text-xs font-semibold uppercase tracking-wide mb-2">
                Matchup Breakdown
              </p>
              <p className="text-gray-300 text-sm leading-relaxed">{game.matchupSummary}</p>
            </div>
          )}

          {/* Opponent top players */}
          {opponent?.topPlayers?.length > 0 && (
            <div>
              <p className="text-gray-400 text-xs font-semibold uppercase tracking-wide mb-3">
                {opponent.name} Key Players
              </p>
              <div className="space-y-2">
                {opponent.topPlayers.map((player) => (
                  <div key={player.name} className="bg-gray-800 rounded-lg px-4 py-2.5 flex items-start gap-3">
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
                {opponent.ranking && <span className="ml-2 text-gt-gold text-xs">#{opponent.ranking}</span>}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
