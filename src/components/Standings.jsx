import { useState } from 'react'

const GT_ESPN_ID = '59'

function isGT(team, espnId) {
  return espnId === GT_ESPN_ID || team.includes('Georgia Tech')
}

function ApPollRow({ entry, index }) {
  const gt = isGT(entry.team, entry.espnId)
  return (
    <div
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg ${
        gt ? 'bg-gt-gold/10 border border-gt-gold/30' : index % 2 === 0 ? 'bg-gray-900/60' : ''
      }`}
    >
      <span className="text-gray-500 text-xs font-semibold w-6 text-right">{entry.rank}</span>
      <img
        src={`https://a.espncdn.com/i/teamlogos/ncaa/500/${entry.espnId}.png`}
        alt={entry.team}
        className="w-6 h-6 object-contain flex-shrink-0"
        onError={(e) => { e.target.style.display = 'none' }}
      />
      <span className={`flex-1 text-sm font-medium ${gt ? 'text-gt-gold-light' : 'text-gray-200'}`}>
        {entry.team}
      </span>
      <span className="text-gray-400 text-xs">{entry.record}</span>
      {entry.points && (
        <span className="text-gray-600 text-xs w-12 text-right">{entry.points} pts</span>
      )}
    </div>
  )
}

function AccRow({ entry, index }) {
  const gt = isGT(entry.team, entry.espnId)
  return (
    <div
      className={`grid grid-cols-[1fr_auto_auto] items-center gap-4 px-3 py-2.5 rounded-lg ${
        gt ? 'bg-gt-gold/10 border border-gt-gold/30' : index % 2 === 0 ? 'bg-gray-900/60' : ''
      }`}
    >
      <div className="flex items-center gap-2 min-w-0">
        <img
          src={`https://a.espncdn.com/i/teamlogos/ncaa/500/${entry.espnId}.png`}
          alt={entry.team}
          className="w-5 h-5 object-contain flex-shrink-0"
          onError={(e) => { e.target.style.display = 'none' }}
        />
        <span className={`text-sm font-medium truncate ${gt ? 'text-gt-gold-light' : 'text-gray-200'}`}>
          {entry.team}
        </span>
      </div>
      <span className="text-gray-300 text-xs text-right tabular-nums">
        {entry.confWins}–{entry.confLosses}
      </span>
      <span className="text-gray-500 text-xs text-right tabular-nums w-10">
        {entry.totalWins}–{entry.totalLosses}
      </span>
    </div>
  )
}

export default function Standings({ data }) {
  const [view, setView] = useState('acc')

  const hasApPoll = data?.apPoll?.length > 0

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-white font-bold text-lg">Standings</h2>
        <div className="flex gap-1 bg-gray-900 border border-gray-800 rounded-full p-1">
          <button
            onClick={() => setView('acc')}
            className={`px-3 py-1 text-xs font-semibold rounded-full transition-all ${
              view === 'acc' ? 'bg-gt-gold-light text-gray-900' : 'text-gray-400 hover:text-white'
            }`}
          >
            ACC
          </button>
          <button
            onClick={() => setView('ap')}
            className={`px-3 py-1 text-xs font-semibold rounded-full transition-all ${
              view === 'ap' ? 'bg-gt-gold-light text-gray-900' : 'text-gray-400 hover:text-white'
            }`}
          >
            AP Top 25
          </button>
        </div>
      </div>

      {view === 'acc' && (
        <div>
          {/* Table header */}
          <div className="grid grid-cols-[1fr_auto_auto] gap-4 px-3 pb-2 mb-1 border-b border-gray-800">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Team</span>
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 text-right">Conf</span>
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 text-right w-10">Ovr</span>
          </div>
          <div className="space-y-0.5">
            {data?.accStandings?.map((entry, i) => (
              <AccRow key={entry.espnId} entry={entry} index={i} />
            ))}
          </div>
          {(!data?.accStandings?.length) && (
            <p className="text-gray-600 text-sm text-center py-8">Standings available once the season begins</p>
          )}
        </div>
      )}

      {view === 'ap' && (
        <div>
          {hasApPoll ? (
            <>
              <div className="flex gap-4 px-3 pb-2 mb-1 border-b border-gray-800">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 w-6"></span>
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 flex-1">Team</span>
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Record</span>
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 w-12 text-right">Pts</span>
              </div>
              <div className="space-y-0.5">
                {data.apPoll.map((entry, i) => (
                  <ApPollRow key={entry.rank} entry={entry} index={i} />
                ))}
              </div>
            </>
          ) : (
            <p className="text-gray-600 text-sm text-center py-8">AP Poll available once the season begins</p>
          )}
        </div>
      )}

      <p className="text-gray-700 text-xs text-center mt-6">
        Updates daily via GitHub Actions · Season begins September 2026
      </p>
    </div>
  )
}
