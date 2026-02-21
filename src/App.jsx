import { useState, Component } from 'react'

class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }
  static getDerivedStateFromError(error) {
    return { error }
  }
  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-gray-950 flex items-center justify-center p-8">
          <div className="bg-red-950 border border-red-800 rounded-xl p-6 max-w-lg w-full">
            <p className="text-red-400 font-bold text-sm mb-2">App Error</p>
            <p className="text-red-300 text-xs font-mono break-all">{this.state.error.message}</p>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
import scheduleData from './data/schedule.json'
import rosterData from './data/roster.json'
import opponentsData from './data/opponents.json'
import standingsData from './data/standings.json'
import RecordBanner from './components/RecordBanner'
import Schedule from './components/Schedule'
import GameDetail from './components/GameDetail'
import Roster from './components/Roster'
import Standings from './components/Standings'

export default function App() {
  const [activeTab, setActiveTab] = useState('schedule')
  const [selectedGame, setSelectedGame] = useState(null)

  const opponentMap = Object.fromEntries(
    opponentsData.opponents.map((o) => [o.id, o])
  )

  const completedGames = scheduleData.games.filter(
    (g) => g.result === 'W' || g.result === 'L'
  )
  const wins = completedGames.filter((g) => g.result === 'W').length
  const losses = completedGames.filter((g) => g.result === 'L').length

  return (
    <ErrorBoundary>
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <header className="bg-gt-navy border-b border-gt-gold/30 sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <img
            src="https://a.espncdn.com/guid/e2e3ae48-f880-5489-0628-b2286d0adca1/logos/primary_logo_on_black_color.png"
            alt="Georgia Tech"
            className="w-10 h-10 object-contain"
          />
          <div>
            <h1 className="text-white font-bold text-lg leading-tight">Georgia Tech Football</h1>
            <p className="text-gt-gold text-xs font-medium tracking-wide uppercase">2026 Season</p>
          </div>
          <div className="ml-auto">
            <RecordBanner wins={wins} losses={losses} />
          </div>
        </div>

        {/* Tab navigation */}
        <div className="max-w-3xl mx-auto px-4 pb-2 flex gap-2">
          <button
            onClick={() => setActiveTab('schedule')}
            className={`tab-btn ${activeTab === 'schedule' ? 'tab-btn-active' : 'tab-btn-inactive'}`}
          >
            Schedule
          </button>
          <button
            onClick={() => setActiveTab('roster')}
            className={`tab-btn ${activeTab === 'roster' ? 'tab-btn-active' : 'tab-btn-inactive'}`}
          >
            Roster
          </button>
          <button
            onClick={() => setActiveTab('standings')}
            className={`tab-btn ${activeTab === 'standings' ? 'tab-btn-active' : 'tab-btn-inactive'}`}
          >
            Standings
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-3xl mx-auto px-4 py-6">
        {activeTab === 'schedule' && (
          <Schedule
            games={scheduleData.games}
            opponentMap={opponentMap}
            onGameClick={setSelectedGame}
          />
        )}
        {activeTab === 'roster' && (
          <Roster
            positionGroups={rosterData.positionGroups}
            coaching={rosterData.coaching}
          />
        )}
        {activeTab === 'standings' && (
          <Standings data={standingsData} />
        )}
      </main>

      {/* Game detail modal */}
      {selectedGame && (
        <GameDetail
          game={selectedGame}
          opponent={opponentMap[selectedGame.opponentId]}
          onClose={() => setSelectedGame(null)}
        />
      )}

      {/* Footer */}
      <footer className="max-w-3xl mx-auto px-4 py-8 text-center text-gray-600 text-xs">
        Data refreshes daily via GitHub Actions · Schedule and win probabilities are estimates
      </footer>
    </div>
    </ErrorBoundary>
  )
}
