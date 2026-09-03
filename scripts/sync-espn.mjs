#!/usr/bin/env node
/**
 * Sync Georgia Tech football data into data/live.json.
 *
 * Default: refresh 2026 slate (schedule, standings, polls, opponents, news,
 * roster, depth remap). Reuses career stats already on file unless FULL_SYNC=1.
 */
import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  CURRENT_SEASON,
  PRIOR_SEASON,
  TEAM_ID,
  attachPolls,
  buildPulse,
  espnGet,
  fetchGtSchedule,
  fetchNews,
  fetchOpponents,
  fetchRankingsPolls,
  fetchStandings,
  fetchTeamRecord,
  accIdSet,
} from './espn-live.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const FULL_SYNC = process.env.FULL_SYNC === '1' || process.argv.includes('--full');

const PRIMARY_BY_POS = {
  QB: 'passing',
  RB: 'rushing',
  FB: 'rushing',
  WR: 'receiving',
  TE: 'receiving',
  K: 'kicking',
  P: 'punting',
  PK: 'kicking',
  LB: 'defensive',
  DE: 'defensive',
  DT: 'defensive',
  DL: 'defensive',
  CB: 'defensive',
  S: 'defensive',
  DB: 'defensive',
};

function pickPrimaryCategory(categories, position) {
  const want = PRIMARY_BY_POS[position];
  if (want) {
    const hit = categories.find((c) => c.name === want);
    if (hit) return hit;
  }
  return (
    categories.find((c) => ['rushing', 'passing', 'receiving', 'defensive'].includes(c.name)) ||
    categories[0]
  );
}

const CLASS_ABBR = { Freshman: 'FR', Sophomore: 'SO', Junior: 'JR', Senior: 'SR' };

function buildEligibility(player, experience) {
  const className = experience?.displayValue || player.year || '—';
  const abbr = experience?.abbreviation || CLASS_ABBR[className] || '—';
  const expYears =
    Number(experience?.years) || ({ FR: 1, SO: 2, JR: 3, SR: 4 }[abbr] ?? null);
  const seasons = new Set();
  for (const cat of player.career?.categories || []) {
    for (const row of cat.rows || []) {
      if (row.year != null) seasons.add(Number(row.year));
    }
  }
  for (const s of player.career?.seasons || []) {
    if (s.year != null) seasons.add(Number(s.year));
  }
  const seasonsPlayed = [...seasons].sort((a, b) => a - b);
  const n = seasonsPlayed.length;
  const fromClass = expYears ? Math.max(0, 5 - expYears) : null;
  const fromSeasons = Math.max(0, 4 - n);
  let yearsLeft;
  let basis;
  if (n === 0 && fromClass != null) {
    yearsLeft = fromClass;
    basis = 'class';
  } else {
    yearsLeft = fromSeasons;
    basis = 'seasons';
  }
  let extraYearLikely = false;
  if (yearsLeft === 0 && className === 'Senior') {
    yearsLeft = 1;
    extraYearLikely = true;
  }
  let seasonsLabel = null;
  if (seasonsPlayed.length === 1) seasonsLabel = String(seasonsPlayed[0]);
  else if (seasonsPlayed.length > 1) {
    seasonsLabel = `${seasonsPlayed[0]}–${String(seasonsPlayed.at(-1)).slice(-2)}`;
  }
  const yearsLeftLabel =
    yearsLeft === 0
      ? 'None left'
      : yearsLeft === 1
        ? extraYearLikely
          ? '1 year left*'
          : '1 year left'
        : `${yearsLeft} years left`;
  const olLike = ['OL', 'OT', 'OG', 'C', 'LS'].includes(player.position);
  let note;
  if (extraYearLikely) {
    note =
      'Extra year likely (COVID, medical, or redshirt) — ESPN lists Senior with 4+ seasons already used.';
  } else if (n === 0 && olLike) {
    note =
      'ESPN has no counting-stat seasons for this player (common for OL/LS). Years left estimated from listed class.';
  } else if (n === 0) {
    note =
      'No college seasons with ESPN stats on record. Years left estimated from listed class.';
  } else {
    note =
      'Years left estimated from seasons with college stats under the standard 4-season rule. Redshirts and COVID years can add eligibility.';
  }
  return {
    class: className,
    classAbbr: abbr,
    experienceYears: experience?.years ?? expYears,
    seasonsPlayed: n,
    seasons: seasonsPlayed,
    seasonsLabel,
    yearsLeft,
    yearsLeftLabel,
    extraYearLikely,
    basis,
    note,
  };
}

const OFFENSE = new Set(['QB', 'RB', 'FB', 'WR', 'TE', 'OL', 'OT', 'OG', 'C', 'ATH']);
const DEFENSE = new Set(['DE', 'DT', 'DL', 'LB', 'CB', 'S', 'DB', 'NB']);
const unitFor = (abbr) => (OFFENSE.has(abbr) ? 'offense' : DEFENSE.has(abbr) ? 'defense' : 'special');

function loadExisting() {
  const existingPath = join(root, 'data/live.json');
  if (!existsSync(existingPath)) return null;
  try {
    return JSON.parse(readFileSync(existingPath, 'utf8'));
  } catch {
    return null;
  }
}

async function hydrateCareer(player) {
  const data = await espnGet(
    `https://site.web.api.espn.com/apis/common/v3/sports/football/college-football/athletes/${player.id}/stats`
  );
  const teams = Object.entries(data.teams || {}).map(([slug, t]) => ({
    id: t.id,
    slug,
    name: t.displayName || t.name,
    abbr: t.abbreviation,
    logo: t.logos?.[0]?.href || `https://a.espncdn.com/i/teamlogos/ncaa/500/${t.id}.png`,
  }));
  const seasonsMap = {};
  const categories = (data.categories || []).map((cat) => {
    const labels = cat.labels || [];
    const names = cat.names || [];
    const rows = (cat.statistics || []).map((row) => {
      const season = row.season || {};
      const year = season.year || season.displayName;
      const team = teams.find((t) => t.slug === row.teamSlug);
      const display = {};
      labels.forEach((lab, idx) => {
        if (row.stats?.[idx] != null) display[lab] = row.stats[idx];
      });
      const stats = {};
      names.forEach((n, idx) => {
        if (row.stats?.[idx] != null) stats[n] = row.stats[idx];
      });
      if (cat.name !== 'scoring') {
        const slot = seasonsMap[String(year)] || {
          year,
          teamAbbr: team?.abbr,
          teamName: team?.name,
          teamLogo: team?.logo,
          categories: {},
        };
        slot.teamAbbr = team?.abbr ?? slot.teamAbbr;
        slot.teamName = team?.name ?? slot.teamName;
        slot.teamLogo = team?.logo ?? slot.teamLogo;
        slot.categories[cat.name] = {
          displayName: cat.displayName || cat.name,
          stats: display,
        };
        seasonsMap[String(year)] = slot;
      }
      return {
        year,
        teamId: row.teamId,
        teamSlug: row.teamSlug,
        teamAbbr: team?.abbr,
        teamName: team?.name,
        teamLogo: team?.logo,
        stats,
        display,
      };
    });
    let totals = null;
    if (Array.isArray(cat.totals)) {
      totals = {};
      labels.forEach((lab, idx) => {
        if (cat.totals[idx] != null) totals[lab] = cat.totals[idx];
      });
    }
    return { name: cat.name, displayName: cat.displayName, labels, rows, totals };
  });
  const primary = pickPrimaryCategory(categories, player.position);
  const headlines = [];
  if (primary) {
    const source = primary.totals || primary.rows.at(-1)?.display || {};
    for (const lab of primary.labels || []) {
      if (source[lab] != null) headlines.push({ label: lab, value: source[lab] });
      if (headlines.length >= 4) break;
    }
  }
  const firstYearBySlug = {};
  for (const cat of categories) {
    for (const row of cat.rows || []) {
      const y = Number(row.year);
      if (!row.teamSlug || !Number.isFinite(y)) continue;
      if (firstYearBySlug[row.teamSlug] == null || y < firstYearBySlug[row.teamSlug]) {
        firstYearBySlug[row.teamSlug] = y;
      }
    }
  }
  const prev = teams
    .filter((t) => t.abbr !== 'GT' && String(t.id) !== TEAM_ID)
    .sort((a, b) => {
      const ay = firstYearBySlug[a.slug] ?? 9999;
      const by = firstYearBySlug[b.slug] ?? 9999;
      if (ay !== by) return ay - by;
      return String(a.abbr || '').localeCompare(String(b.abbr || ''));
    });
  player.previousTeams = prev;
  if (prev.length) {
    player.tags = ['Transfer'];
    player.previous = prev.map((t) => t.abbr).join(', ');
  }
  player.career = {
    categories,
    seasons: Object.values(seasonsMap).sort((a, b) => Number(b.year) - Number(a.year)),
    headlines,
    primaryCategory: primary?.name || null,
  };
}

function refreshDepthChart(existing, players) {
  const byId = new Map(players.map((p) => [String(p.id), p]));
  const byName = new Map(players.map((p) => [p.name.toLowerCase(), p]));
  const out = { offense: [], defense: [], special: [] };
  for (const unit of ['offense', 'defense', 'special']) {
    out[unit] = (existing?.[unit] || [])
      .map((row) => ({
        label: row.label,
        slots: (row.slots || [])
          .map((slot) => {
            const hit =
              (slot.id && byId.get(String(slot.id))) || byName.get(String(slot.name || '').toLowerCase());
            if (!hit) return null;
            return {
              id: hit.id,
              number: hit.number,
              name: hit.name,
              position: hit.position,
            };
          })
          .filter(Boolean),
      }))
      .filter((row) => row.slots.length);
  }
  const kept = Object.values(out).reduce((n, rows) => n + rows.reduce((m, r) => m + r.slots.length, 0), 0);
  const prior = Object.values(existing || {}).reduce(
    (n, rows) => n + (rows || []).reduce((m, r) => m + (r.slots?.length || 0), 0),
    0
  );
  if (prior && kept < prior * 0.5) {
    console.warn(`Depth remap kept ${kept}/${prior} slots — leaving previous chart in place`);
    return existing;
  }
  return out;
}

const existing = loadExisting();

console.log(`Syncing ESPN roster (${CURRENT_SEASON} slate${FULL_SYNC ? ', full career' : ', reuse career'})…`);
const roster = await espnGet(
  `https://site.web.api.espn.com/apis/site/v2/sports/football/college-football/teams/${TEAM_ID}/roster`
);
const teamJson = await espnGet(
  `https://site.web.api.espn.com/apis/site/v2/sports/football/college-football/teams/${TEAM_ID}`
);
const teamMeta = teamJson.team;
const priorById = new Map((existing?.players || []).map((p) => [String(p.id), p]));

const players = [];
for (const g of roster.athletes || []) {
  for (const a of g.items || []) {
    const pos = a.position || {};
    const abbr = pos.abbreviation || '?';
    const prev = priorById.get(String(a.id));
    players.push({
      id: String(a.id),
      espnId: String(a.id),
      number: /^\d+$/.test(String(a.jersey || '')) ? Number(a.jersey) : 0,
      name: a.displayName || a.fullName,
      firstName: a.firstName,
      lastName: a.lastName,
      position: abbr,
      positionName: pos.displayName || abbr,
      height: a.displayHeight || '',
      weight: Number(a.weight || 0),
      year: a.experience?.displayValue || '',
      hometown: a.birthPlace?.displayText || '',
      unit: unitFor(abbr),
      headshot: a.headshot?.href || null,
      previous: prev?.previous ?? null,
      previousTeams: prev?.previousTeams || [],
      career: !FULL_SYNC && prev?.career ? prev.career : null,
      eligibility: null,
      _experience: a.experience || null,
      note: prev?.note ?? null,
      tags: prev?.tags || [],
    });
  }
}

console.log(`Roster: ${players.length}. ${FULL_SYNC ? 'Refreshing' : 'Filling missing'} career stats…`);
let withStats = 0;
let fetched = 0;
for (const [i, p] of players.entries()) {
  const needs = FULL_SYNC || !p.career;
  if (needs) {
    try {
      await hydrateCareer(p);
      fetched += 1;
    } catch {
      // no college stats yet
    }
    await new Promise((r) => setTimeout(r, 40));
  }
  if (p.career) withStats += 1;
  if ((i + 1) % 20 === 0) console.log(`  ${i + 1}/${players.length}`);
}

for (const p of players) {
  p.eligibility = buildEligibility(p, p._experience);
  delete p._experience;
}

const depthChart = refreshDepthChart(existing?.depthChart || { offense: [], defense: [], special: [] }, players);

const featuredNames = [
  'Alberto Mendoza',
  'Justice Haynes',
  'Malachi Hosley',
  'Isaiah Fuhrmann',
  'Kyle Efford',
  'Aidan Birr',
];
const featured = featuredNames.map((n) => players.find((p) => p.name === n)?.id).filter(Boolean);

const notes = {
  'Alberto Mendoza': 'Projected QB1. Indiana transfer after Haynes King.',
  'Justice Haynes': 'Michigan transfer and featured back. Foot injury shortened 2025.',
  'Malachi Hosley': 'Explosive change-of-pace back. 7+ YPC in 2025.',
  'Kyle Efford': 'Defensive leader at middle linebacker.',
  'Aidan Birr': 'All-American caliber kicker.',
  'Isaiah Fuhrmann': 'Elon transfer projected as the X receiver.',
};
for (const p of players) {
  if (notes[p.name]) p.note = notes[p.name];
}

const featuredMore = [...featured];
for (const unit of Object.values(depthChart)) {
  for (const row of unit || []) {
    const starter = row.slots?.[0];
    if (starter?.id && !featuredMore.includes(starter.id)) featuredMore.push(starter.id);
  }
}

console.log(`Fetching ${CURRENT_SEASON} standings, polls, schedule, news…`);
const [standings2026, standings2025, polls, record, news] = await Promise.all([
  fetchStandings(CURRENT_SEASON, String(CURRENT_SEASON)),
  fetchStandings(PRIOR_SEASON, `${PRIOR_SEASON} Final`),
  fetchRankingsPolls(),
  fetchTeamRecord(),
  fetchNews(),
]);

const accIds = accIdSet(standings2026);
const schedule = await fetchGtSchedule(accIds);
console.log(`Wiping opponent slates to ${CURRENT_SEASON} (${schedule.length} GT games)…`);
const opponents = await fetchOpponents(schedule, standings2026, CURRENT_SEASON);

const standings = attachPolls(standings2026, polls, {
  note: '2026 polls · records reset with the new season',
});
const standingsPrior = {
  ...standings2025,
  national: {
    id: 'ap-final',
    poll: 'AP Top 25',
    label: `${PRIOR_SEASON} Final AP`,
    note: 'Georgia Tech finished 9-4 (6-2 ACC) and ranked No. 24 in the final 2025 AP poll. Full national table is not archived in-app — ACC finish is below.',
    entries: [],
  },
  polls: [],
};

const pulse = buildPulse({ record, standings, schedule, polls });
const coachList = Array.isArray(roster.coach) ? roster.coach : [];
const head = coachList.find((c) => String(c.position || '').includes('Head')) || coachList[0] || {};

const payload = {
  team: {
    name: 'Georgia Tech',
    nickname: 'Yellow Jackets',
    abbr: 'GT',
    conference: 'ACC',
    stadium: 'Bobby Dodd Stadium at Hyundai Field',
    city: 'Atlanta, GA',
    headCoach: head.displayName || 'Brent Key',
    offensiveCoordinator: 'George Godsey',
    coOffensiveCoordinator: 'Chris Weinke',
    defensiveCoordinator: 'Jason Semore',
    offense: 'Spread Pro Style',
    defense: '4-2-5',
    season: CURRENT_SEASON,
    record,
    color: '#B39051',
    navy: '#051E39',
    espnColor: teamMeta?.color ? `#${teamMeta.color}` : '#b3a369',
    logo: 'https://a.espncdn.com/i/teamlogos/ncaa/500/59.png',
    logoDark: 'https://a.espncdn.com/i/teamlogos/ncaa/500-dark/59.png',
    lastSeason: {
      record: '9-4',
      conference: '6-2',
      rank: 24,
      note: 'Ranked as high as No. 7 in 2025',
    },
    pulse,
  },
  players,
  depthChart,
  schedule,
  featured,
  featuredMore: featuredMore.slice(0, 18),
  opponents,
  standings,
  standingsPrior,
  polls: standings.polls || polls,
  news,
  dataAsOf: `ESPN ${CURRENT_SEASON} roster, slate, polls & news · synced ${new Date()
    .toISOString()
    .slice(0, 10)}`,
  sources: [
    {
      name: 'ESPN College Football API',
      url: 'https://site.web.api.espn.com',
      usedFor: 'Roster, headshots, career stats, 2026 slate, polls, standings',
    },
    {
      name: 'Georgia Tech Athletics / ACC',
      url: 'https://ramblinwreck.com',
      usedFor: 'Official news, opener notes, 2026 regular-season slate',
    },
    {
      name: 'Georgia Tech Brand Guide',
      url: 'https://brand.gatech.edu',
      usedFor: 'Tech Gold #B39051 · Navy #051E39',
    },
  ],
};

writeFileSync(join(root, 'data/live.json'), JSON.stringify(payload, null, 2));
console.log(
  `Wrote data/live.json · ${players.length} players · ${withStats} with career · ${fetched} career fetches · ${schedule.length} games · ${Object.keys(opponents).length} opponents · ${news.length} news · ESPN color was #${teamMeta?.color}`
);
