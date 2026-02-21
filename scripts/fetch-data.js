#!/usr/bin/env node
/**
 * fetch-data.js
 *
 * Fetches live data from ESPN + CFBD APIs and writes updated JSON files.
 * Run by GitHub Actions daily at 8:10am UTC.
 *
 * Usage:  node scripts/fetch-data.js
 * Env:    CFBD_API_KEY  (required for win probabilities)
 */

import { readFileSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_DIR = join(__dirname, '..', 'src', 'data')

const GT_ESPN_ID = '59'
const SEASON = 2026
const CFBD_API_KEY = process.env.CFBD_API_KEY || ''

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function fetchJson(url, headers = {}) {
  const res = await fetch(url, { headers })
  if (!res.ok) {
    console.warn(`HTTP ${res.status} from ${url}`)
    return null
  }
  return res.json()
}

function readJson(filename) {
  try {
    return JSON.parse(readFileSync(join(DATA_DIR, filename), 'utf-8'))
  } catch {
    return null
  }
}

function writeJson(filename, data) {
  writeFileSync(join(DATA_DIR, filename), JSON.stringify(data, null, 2) + '\n')
  console.log(`✓ Written ${filename}`)
}

// ---------------------------------------------------------------------------
// ESPN – GT schedule + scores
// ---------------------------------------------------------------------------

async function fetchGtSchedule() {
  const url = `https://site.api.espn.com/apis/site/v2/sports/football/college-football/teams/${GT_ESPN_ID}/schedule?season=${SEASON}`
  console.log('Fetching GT schedule from ESPN...')
  const data = await fetchJson(url)
  if (!data?.events) return null

  return data.events.map((event) => {
    const comp = event.competitions?.[0]
    if (!comp) return null

    const gtTeam = comp.competitors?.find((c) => c.id === GT_ESPN_ID)
    const oppTeam = comp.competitors?.find((c) => c.id !== GT_ESPN_ID)

    const isHome = gtTeam?.homeAway === 'home'
    const isCompleted = comp.status?.type?.completed ?? false

    let result = null
    let gtScore = null
    let oppScore = null
    if (isCompleted && gtTeam && oppTeam) {
      gtScore = parseInt(gtTeam.score, 10)
      oppScore = parseInt(oppTeam.score, 10)
      result = gtScore > oppScore ? 'W' : 'L'
    }

    return {
      espnId: event.id,
      date: event.date?.slice(0, 10),
      opponent: oppTeam?.team?.displayName || 'TBD',
      opponentEspnId: oppTeam?.team?.id,
      home: isHome,
      venue: comp.venue?.fullName || null,
      result,
      gtScore,
      oppScore,
      completed: isCompleted,
    }
  }).filter(Boolean)
}

// ---------------------------------------------------------------------------
// ESPN – opponent team records
// ---------------------------------------------------------------------------

async function fetchOpponentRecord(espnId) {
  if (!espnId) return null
  const url = `https://site.api.espn.com/apis/site/v2/sports/football/college-football/teams/${espnId}`
  const data = await fetchJson(url)
  if (!data?.team) return null

  const record = data.team.record?.items?.find((r) => r.type === 'total')
  const wins = parseInt(record?.stats?.find((s) => s.name === 'wins')?.value ?? 0, 10)
  const losses = parseInt(record?.stats?.find((s) => s.name === 'losses')?.value ?? 0, 10)
  const ranking = data.team.rank || null

  return { wins, losses, ranking }
}

// ---------------------------------------------------------------------------
// ESPN – top players for opponent
// ---------------------------------------------------------------------------

async function fetchOpponentTopPlayers(espnId) {
  if (!espnId) return []
  const url = `https://site.api.espn.com/apis/site/v2/sports/football/college-football/teams/${espnId}/roster`
  const data = await fetchJson(url)
  if (!data?.athletes) return []

  // Flatten all athletes
  const all = data.athletes.flatMap((group) => group.items || [])
  // Sort by some heuristic (experience/displayName). Return top 3 prominent ones.
  return all.slice(0, 3).map((a) => ({
    name: a.displayName || a.fullName,
    position: a.position?.abbreviation || '',
    note: a.description || '',
  }))
}

// ---------------------------------------------------------------------------
// CFBD – pregame win probabilities
// ---------------------------------------------------------------------------

async function fetchWinProbabilities() {
  if (!CFBD_API_KEY) {
    console.warn('No CFBD_API_KEY set — skipping win probability fetch')
    return []
  }

  console.log('Fetching win probabilities from CFBD...')
  const url = `https://api.collegefootballdata.com/metrics/wp/pregame?year=${SEASON}&team=Georgia%20Tech`
  const data = await fetchJson(url, { Authorization: `Bearer ${CFBD_API_KEY}` })
  return data || []
}

// ---------------------------------------------------------------------------
// Merge ESPN schedule into existing schedule.json
// ---------------------------------------------------------------------------

function mergeSchedule(existing, espnGames) {
  if (!espnGames?.length) return existing

  const updated = { ...existing, lastUpdated: new Date().toISOString() }

  updated.games = existing.games.map((game) => {
    // Try to match by opponent name (fuzzy)
    const espnGame = espnGames.find((eg) => {
      const oppNorm = (eg.opponent || '').toLowerCase().replace(/[^a-z]/g, '')
      const seedNorm = (game.opponent || '').toLowerCase().replace(/[^a-z]/g, '')
      return oppNorm.includes(seedNorm) || seedNorm.includes(oppNorm)
    })

    if (!espnGame) return game

    return {
      ...game,
      date: espnGame.date || game.date,
      venue: espnGame.venue || game.venue,
      result: espnGame.result !== undefined ? espnGame.result : game.result,
      gtScore: espnGame.gtScore !== undefined ? espnGame.gtScore : game.gtScore,
      oppScore: espnGame.oppScore !== undefined ? espnGame.oppScore : game.oppScore,
      _espnId: espnGame.espnId,
      _opponentEspnId: espnGame.opponentEspnId,
    }
  })

  return updated
}

// ---------------------------------------------------------------------------
// Apply win probabilities
// ---------------------------------------------------------------------------

function applyWinProbabilities(schedule, cfbdProbs) {
  if (!cfbdProbs?.length) return schedule

  const updated = { ...schedule }
  updated.games = schedule.games.map((game) => {
    const prob = cfbdProbs.find((p) => {
      const oppNorm = (p.awayTeam || p.homeTeam || '').toLowerCase().replace(/[^a-z]/g, '')
      const seedNorm = (game.opponent || '').toLowerCase().replace(/[^a-z]/g, '')
      // GT is home or away — find the matching game
      return oppNorm.includes(seedNorm) || seedNorm.includes(oppNorm)
    })

    if (!prob) return game

    // Determine which prob is GT's
    const gtIsHome = game.home
    const gtWinProb = gtIsHome
      ? Math.round((prob.homeWinProb ?? 0.5) * 100)
      : Math.round((prob.awayWinProb ?? 0.5) * 100)

    return { ...game, gtWinProbability: gtWinProb }
  })

  return updated
}

// ---------------------------------------------------------------------------
// Update opponents.json
// ---------------------------------------------------------------------------

async function updateOpponents(opponents, scheduleGames) {
  const updated = {
    ...opponents,
    lastUpdated: new Date().toISOString(),
  }

  updated.opponents = await Promise.all(
    opponents.opponents.map(async (opp) => {
      // Find the ESPN ID from the schedule (set during schedule merge)
      const scheduleGame = scheduleGames.find((g) => g.opponentId === opp.id)
      const espnId = scheduleGame?._opponentEspnId || opp.espnId

      console.log(`  Fetching record for ${opp.name}...`)
      const record = await fetchOpponentRecord(espnId)
      if (!record) return opp

      // Only update top players if ESPN gives us something richer
      let topPlayers = opp.topPlayers
      if (espnId && topPlayers.some((p) => !p.note)) {
        const espnPlayers = await fetchOpponentTopPlayers(espnId)
        if (espnPlayers.length > 0) {
          topPlayers = espnPlayers
        }
      }

      return {
        ...opp,
        espnId: espnId || opp.espnId,
        record,
        ranking: record.ranking || opp.ranking,
        topPlayers,
      }
    })
  )

  return updated
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log(`\n=== GT Football Data Fetch — ${new Date().toISOString()} ===\n`)

  // Load existing data
  const existingSchedule = readJson('schedule.json')
  const existingOpponents = readJson('opponents.json')

  if (!existingSchedule || !existingOpponents) {
    console.error('Could not read existing JSON files. Aborting.')
    process.exit(1)
  }

  // 1. Fetch GT schedule from ESPN
  const espnGames = await fetchGtSchedule()

  // 2. Merge ESPN data into seed schedule
  let schedule = mergeSchedule(existingSchedule, espnGames)

  // 3. Fetch + apply win probabilities from CFBD
  const cfbdProbs = await fetchWinProbabilities()
  schedule = applyWinProbabilities(schedule, cfbdProbs)

  // 4. Update opponents (records + top players)
  console.log('\nFetching opponent records...')
  const opponents = await updateOpponents(existingOpponents, schedule.games)

  // 5. Write updated files
  console.log('\nWriting updated data files...')
  writeJson('schedule.json', schedule)
  writeJson('opponents.json', opponents)

  console.log('\n=== Done ===\n')
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
