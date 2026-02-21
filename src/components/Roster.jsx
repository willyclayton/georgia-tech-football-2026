const POSITION_COLORS = {
  QB: 'bg-purple-900/50 text-purple-300 border-purple-700/50',
  RB: 'bg-green-900/50 text-green-300 border-green-700/50',
  WR: 'bg-blue-900/50 text-blue-300 border-blue-700/50',
  OT: 'bg-orange-900/50 text-orange-300 border-orange-700/50',
  C: 'bg-orange-900/50 text-orange-300 border-orange-700/50',
  OG: 'bg-orange-900/50 text-orange-300 border-orange-700/50',
  DE: 'bg-red-900/50 text-red-300 border-red-700/50',
  DT: 'bg-red-900/50 text-red-300 border-red-700/50',
  LB: 'bg-yellow-900/50 text-yellow-300 border-yellow-700/50',
  CB: 'bg-cyan-900/50 text-cyan-300 border-cyan-700/50',
  S: 'bg-cyan-900/50 text-cyan-300 border-cyan-700/50',
  K: 'bg-gray-800 text-gray-400 border-gray-700',
  P: 'bg-gray-800 text-gray-400 border-gray-700',
}

function PlayerCard({ player }) {
  const posColor = POSITION_COLORS[player.position] || 'bg-gray-800 text-gray-400 border-gray-700'

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-start gap-3">
      {/* Number + Position */}
      <div className="flex flex-col items-center gap-1 min-w-[36px]">
        <span className="text-gt-gold-light font-black text-lg leading-none">{player.number}</span>
        <span className={`text-xs font-bold px-1.5 py-0.5 rounded border ${posColor}`}>
          {player.position}
        </span>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-white font-semibold text-sm">{player.name}</p>
          <span className="text-gray-500 text-xs">{player.year}</span>
          {player.depth === 1 && (
            <span className="text-xs text-gt-gold bg-gt-navy px-1.5 py-0.5 rounded">Starter</span>
          )}
          {player.transfer && (
            <span className="text-xs text-blue-400 bg-blue-950 px-1.5 py-0.5 rounded">
              Transfer · {player.transferFrom}
            </span>
          )}
        </div>
        <p className="text-gray-400 text-xs mt-1 leading-snug">{player.note}</p>
      </div>
    </div>
  )
}

function PositionGroup({ group }) {
  const starters = group.players.filter((p) => p.depth === 1)
  const backups = group.players.filter((p) => p.depth > 1)

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-white font-bold text-base">{group.group}</span>
        <span className="text-gray-600 text-xs">({group.abbr})</span>
        <div className="flex-1 h-px bg-gray-800 ml-1" />
      </div>

      <div className="space-y-2">
        {starters.map((p) => <PlayerCard key={p.name} player={p} />)}
        {backups.length > 0 && (
          <div className="space-y-2 ml-4 pl-4 border-l border-gray-800">
            {backups.map((p) => <PlayerCard key={p.name} player={p} />)}
          </div>
        )}
      </div>
    </div>
  )
}

export default function Roster({ positionGroups, coaching }) {
  return (
    <div>
      {/* Coaching staff */}
      <div className="bg-gt-navy border border-gt-gold/20 rounded-xl p-4 mb-6">
        <p className="text-gt-gold text-xs font-semibold uppercase tracking-wide mb-3">Coaching Staff</p>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Head Coach</span>
            <span className="text-white font-semibold">{coaching.headCoach}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Offensive Coordinator</span>
            <span className="text-white font-semibold">{coaching.offensiveCoordinator}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Defensive Coordinator</span>
            <span className="text-white font-semibold">{coaching.defensiveCoordinator}</span>
          </div>
        </div>
      </div>

      {/* Position groups */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-white font-bold text-lg">Depth Chart</h2>
        <span className="text-gray-500 text-xs">Key players only</span>
      </div>

      {positionGroups.map((group) => (
        <PositionGroup key={group.abbr} group={group} />
      ))}

      <p className="text-gray-700 text-xs text-center mt-2">
        Roster reflects 2026 preseason projections · Transfer portal activity may change depth chart
      </p>
    </div>
  )
}
