#!/usr/bin/env node
/**
 * Sync Georgia Tech football data from ESPN (roster, career stats, logos)
 * and the verified 2026 ACC/GT schedule into data/live.json.
 */
import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const TEAM_ID = '59';

async function get(url) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; GTFootballApp/1.0)',
      Accept: 'application/json',
    },
  });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
}

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

/**
 * Estimate remaining eligibility.
 * Prefer seasons-with-stats when present; otherwise use ESPN class year
 * (OL/LS often have Senior class with no counting-stat seasons).
 */
function buildEligibility(player, experience) {
  const className = experience?.displayValue || player.year || '—';
  const abbr = experience?.abbreviation || CLASS_ABBR[className] || '—';
  const expYears =
    Number(experience?.years) ||
    ({ FR: 1, SO: 2, JR: 3, SR: 4 }[abbr] ?? null);
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
  // Class standing: FR=1 → 4 left, SO=2 → 3, JR=3 → 2, SR=4 → 1 (including this season)
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

const schedule = [
  { id: '2026-colorado', week: 1, date: '2026-09-03', dateLabel: 'Thu, Sep 3', time: '8:00 PM', tv: 'ESPN', opponent: 'Colorado', opponentAbbr: 'COLO', opponentId: '38', opponentLogo: 'https://a.espncdn.com/i/teamlogos/ncaa/500/38.png', home: true, conference: false, venue: 'Bobby Dodd Stadium', city: 'Atlanta, GA', status: 'upcoming', note: 'Buffaloes first visit to The Flats', source: 'Georgia Tech Athletics / ACC' },
  { id: '2026-tennessee', week: 2, date: '2026-09-12', dateLabel: 'Sat, Sep 12', time: '7:00 PM', tv: 'ESPN', opponent: 'Tennessee', opponentAbbr: 'TENN', opponentId: '2633', opponentLogo: 'https://a.espncdn.com/i/teamlogos/ncaa/500/2633.png', home: true, conference: false, venue: 'Bobby Dodd Stadium', city: 'Atlanta, GA', status: 'upcoming', note: 'First home meeting since 1986', source: 'Georgia Tech Athletics' },
  { id: '2026-mercer', week: 3, date: '2026-09-19', dateLabel: 'Sat, Sep 19', time: '12:00 PM', tv: 'ACCN', opponent: 'Mercer', opponentAbbr: 'MER', opponentId: '2382', opponentLogo: 'https://a.espncdn.com/i/teamlogos/ncaa/500/2382.png', home: true, conference: false, venue: 'Bobby Dodd Stadium', city: 'Atlanta, GA', status: 'upcoming', note: 'In-state non-conference', source: 'Georgia Tech Athletics' },
  { id: '2026-stanford', week: 4, date: '2026-09-26', dateLabel: 'Sat, Sep 26', time: '10:30 PM', tv: 'ESPN', opponent: 'Stanford', opponentAbbr: 'STAN', opponentId: '24', opponentLogo: 'https://a.espncdn.com/i/teamlogos/ncaa/500/24.png', home: false, conference: true, venue: 'Stanford Stadium', city: 'Stanford, CA', status: 'upcoming', note: 'First-ever trip to Stanford', source: 'ACC' },
  { id: '2026-duke', week: 6, date: '2026-10-10', dateLabel: 'Sat, Oct 10', time: 'TBA', tv: 'TBA', opponent: 'Duke', opponentAbbr: 'DUKE', opponentId: '150', opponentLogo: 'https://a.espncdn.com/i/teamlogos/ncaa/500/150.png', home: true, conference: true, venue: 'Bobby Dodd Stadium', city: 'Atlanta, GA', status: 'upcoming', note: 'Defending ACC champions', source: 'ACC' },
  { id: '2026-vt', week: 7, date: '2026-10-17', dateLabel: 'Sat, Oct 17', time: 'TBA', tv: 'TBA', opponent: 'Virginia Tech', opponentAbbr: 'VT', opponentId: '259', opponentLogo: 'https://a.espncdn.com/i/teamlogos/ncaa/500/259.png', home: false, conference: true, venue: 'Lane Stadium', city: 'Blacksburg, VA', status: 'upcoming', note: 'ACC rivalry road trip', source: 'ACC' },
  { id: '2026-bc', week: 8, date: '2026-10-24', dateLabel: 'Sat, Oct 24', time: 'TBA', tv: 'TBA', opponent: 'Boston College', opponentAbbr: 'BC', opponentId: '103', opponentLogo: 'https://a.espncdn.com/i/teamlogos/ncaa/500/103.png', home: true, conference: true, venue: 'Bobby Dodd Stadium', city: 'Atlanta, GA', status: 'upcoming', note: 'Homecoming', source: 'ACC' },
  { id: '2026-pitt', week: 9, date: '2026-10-31', dateLabel: 'Sat, Oct 31', time: 'TBA', tv: 'TBA', opponent: 'Pittsburgh', opponentAbbr: 'PITT', opponentId: '221', opponentLogo: 'https://a.espncdn.com/i/teamlogos/ncaa/500/221.png', home: false, conference: true, venue: 'Acrisure Stadium', city: 'Pittsburgh, PA', status: 'upcoming', note: 'Halloween in Pittsburgh', source: 'ACC' },
  { id: '2026-louisville', week: 10, date: '2026-11-07', dateLabel: 'Sat, Nov 7', time: 'TBA', tv: 'TBA', opponent: 'Louisville', opponentAbbr: 'LOU', opponentId: '97', opponentLogo: 'https://a.espncdn.com/i/teamlogos/ncaa/500/97.png', home: true, conference: true, venue: 'Bobby Dodd Stadium', city: 'Atlanta, GA', status: 'upcoming', note: '2025 bowl winner', source: 'ACC' },
  { id: '2026-clemson', week: 11, date: '2026-11-14', dateLabel: 'Sat, Nov 14', time: 'TBA', tv: 'TBA', opponent: 'Clemson', opponentAbbr: 'CLEM', opponentId: '228', opponentLogo: 'https://a.espncdn.com/i/teamlogos/ncaa/500/228.png', home: false, conference: true, venue: 'Memorial Stadium', city: 'Clemson, SC', status: 'upcoming', note: 'Death Valley', source: 'ACC' },
  { id: '2026-wake', week: 12, date: '2026-11-21', dateLabel: 'Sat, Nov 21', time: 'TBA', tv: 'TBA', opponent: 'Wake Forest', opponentAbbr: 'WAKE', opponentId: '154', opponentLogo: 'https://a.espncdn.com/i/teamlogos/ncaa/500/154.png', home: true, conference: true, venue: 'Bobby Dodd Stadium', city: 'Atlanta, GA', status: 'upcoming', note: 'Senior Day stretch', source: 'ACC' },
  { id: '2026-uga', week: 13, date: '2026-11-28', dateLabel: 'Sat, Nov 28', time: 'TBA', tv: 'TBA', opponent: 'Georgia', opponentAbbr: 'UGA', opponentId: '61', opponentLogo: 'https://a.espncdn.com/i/teamlogos/ncaa/500/61.png', home: false, conference: false, venue: 'Sanford Stadium', city: 'Athens, GA', status: 'upcoming', note: 'Clean, Old-Fashioned Hate', source: 'Georgia Tech Athletics' },
];

console.log('Syncing ESPN roster…');
const roster = await get(`https://site.api.espn.com/apis/site/v2/sports/football/college-football/teams/${TEAM_ID}/roster`);
const teamJson = await get(`https://site.api.espn.com/apis/site/v2/sports/football/college-football/teams/${TEAM_ID}`);
const teamMeta = teamJson.team;

const players = [];
for (const g of roster.athletes || []) {
  for (const a of g.items || []) {
    const pos = a.position || {};
    const abbr = pos.abbreviation || '?';
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
      previous: null,
      previousTeams: [],
      career: null,
      eligibility: null,
      _experience: a.experience || null,
      note: null,
      tags: [],
    });
  }
}

console.log(`Roster: ${players.length}. Fetching career stats…`);
let withStats = 0;
for (const [i, p] of players.entries()) {
  try {
    const data = await get(
      `https://site.web.api.espn.com/apis/common/v3/sports/football/college-football/athletes/${p.id}/stats`
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
        // Keep rush / recv / pass separate — never flatten conflicting labels like YDS.
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
    const primary = pickPrimaryCategory(categories, p.position);
    const headlines = [];
    if (primary) {
      const source = primary.totals || primary.rows.at(-1)?.display || {};
      for (const lab of primary.labels || []) {
        if (source[lab] != null) headlines.push({ label: lab, value: source[lab] });
        if (headlines.length >= 4) break;
      }
    }
    // Order prior schools by first season year — ESPN's teams map is not chronological.
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
    p.previousTeams = prev;
    if (prev.length) {
      p.tags = ['Transfer'];
      p.previous = prev.map((t) => t.abbr).join(', ');
    }
    p.career = {
      categories,
      seasons: Object.values(seasonsMap).sort((a, b) => Number(b.year) - Number(a.year)),
      headlines,
      primaryCategory: primary?.name || null,
    };
    withStats += 1;
  } catch {
    // no college stats yet
  }
  if ((i + 1) % 20 === 0) console.log(`  ${i + 1}/${players.length}`);
  await new Promise((r) => setTimeout(r, 40));
}

for (const p of players) {
  p.eligibility = buildEligibility(p, p._experience);
  delete p._experience;
}

// Keep existing depth chart if present
let depthChart = { offense: [], defense: [], special: [] };
const existingPath = join(root, 'data/live.json');
if (existsSync(existingPath)) {
  try {
    const existing = JSON.parse(readFileSync(existingPath, 'utf8'));
    if (existing.depthChart) depthChart = existing.depthChart;
  } catch {}
}

const featuredNames = [
  'Alberto Mendoza',
  'Justice Haynes',
  'Malachi Hosley',
  'Isaiah Fuhrmann',
  'Kyle Efford',
  'Aidan Birr',
];
const featured = featuredNames
  .map((n) => players.find((p) => p.name === n)?.id)
  .filter(Boolean);

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

console.log('Fetching ACC standings + Top 25…');
let standings = null;
const opponents = {};
try {
  const acc = await get(
    'https://site.web.api.espn.com/apis/v2/sports/football/college-football/standings?group=1&season=2025'
  );
  const entries = (acc.standings?.entries || []).map((e) => {
    const t = e.team || {};
    const stats = Object.fromEntries(
      (e.stats || []).map((s) => [s.name || s.abbreviation, s.displayValue ?? s.value])
    );
    return {
      id: String(t.id),
      name: t.displayName || t.name,
      shortName: t.shortDisplayName || t.name,
      abbr: t.abbreviation,
      logo: `https://a.espncdn.com/i/teamlogos/ncaa/500/${t.id}.png`,
      overall: String(stats.overall || '—'),
      conference: String(stats['vs. Conf.'] || '—'),
    };
  });

  const rankJson = await get(
    'https://site.web.api.espn.com/apis/site/v2/sports/football/college-football/rankings'
  );
  const poll = (rankJson.rankings || [])[0];
  const national = [];
  for (const x of poll?.ranks || []) {
    const t = x.team || {};
    const oid = String(t.id);
    let record = x.recordSummary || '';
    if (!record || record === '0-0') {
      try {
        const sched = await get(
          `https://site.web.api.espn.com/apis/site/v2/sports/football/college-football/teams/${oid}/schedule?season=2025&seasontype=2`
        );
        let w = 0;
        let l = 0;
        for (const ev of sched.events || []) {
          const comp = (ev.competitions || [])[0] || {};
          if (!comp.status?.type?.completed) continue;
          const us = (comp.competitors || []).find((c) => String(c.team?.id) === oid);
          if (!us) continue;
          if (us.winner === true) w += 1;
          else if (us.winner === false) l += 1;
        }
        record = `${w}-${l}`;
        await new Promise((r) => setTimeout(r, 30));
      } catch {
        record = record || '—';
      }
    }
    national.push({
      rank: x.current,
      previous: x.previous,
      id: oid,
      name: t.displayName || t.name,
      abbr: t.abbreviation,
      logo: `https://a.espncdn.com/i/teamlogos/ncaa/500/${t.id}.png`,
      record,
      points: x.points,
    });
  }

  standings = {
    season: 2025,
    label: '2025 Final',
    conference: { name: 'ACC', label: '2025 Final ACC Standings', entries },
    national: {
      poll: poll?.name || 'Top 25',
      label: '2026 Preseason Coaches Poll',
      note: 'Records shown from 2025 season',
      entries: national,
    },
  };
} catch (err) {
  console.warn('Standings fetch failed:', err.message);
}

console.log('Fetching opponent 2025 schedules…');
for (const g of schedule) {
  const oid = g.opponentId;
  if (!oid || opponents[oid]) continue;
  try {
    const d = await get(
      `https://site.web.api.espn.com/apis/site/v2/sports/football/college-football/teams/${oid}/schedule?season=2025&seasontype=2`
    );
    const games = [];
    for (const e of d.events || []) {
      const comp = (e.competitions || [])[0] || {};
      const comps = comp.competitors || [];
      const us = comps.find((c) => String(c.team?.id) === String(oid));
      const them = comps.find((c) => String(c.team?.id) !== String(oid));
      if (!us || !them) continue;
      const usScore = us.score?.displayValue ?? us.score;
      const themScore = them.score?.displayValue ?? them.score;
      let result = null;
      if (us.winner === true) result = 'W';
      else if (them.winner === true) result = 'L';
      if (usScore === '0' && themScore === '0' && !result) continue;
      games.push({
        id: String(e.id),
        date: String(e.date || '').slice(0, 10),
        name: e.name,
        home: us.homeAway === 'home',
        opponent: them.team?.displayName || them.team?.nickname,
        opponentAbbr: them.team?.abbreviation,
        opponentId: String(them.team?.id),
        opponentLogo: `https://a.espncdn.com/i/teamlogos/ncaa/500/${them.team?.id}.png`,
        score: usScore != null && themScore != null ? `${usScore}-${themScore}` : null,
        result,
        venue: comp.venue?.fullName || null,
      });
    }
    const wins = games.filter((x) => x.result === 'W').length;
    const losses = games.filter((x) => x.result === 'L').length;
    const accRow = standings?.conference.entries.find((x) => x.id === String(oid));
    opponents[oid] = {
      id: String(oid),
      name: g.opponent,
      abbr: g.opponentAbbr,
      logo: g.opponentLogo,
      record: accRow?.overall || `${wins}-${losses}`,
      conference: accRow ? 'ACC' : null,
      season: 2025,
      games,
    };
    await new Promise((r) => setTimeout(r, 40));
  } catch (err) {
    console.warn(`Opponent ${oid} failed:`, err.message);
  }
}

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
    season: 2026,
    record: '0-0',
    color: '#B39051',
    navy: '#051E39',
    logo: 'https://a.espncdn.com/i/teamlogos/ncaa/500/59.png',
    logoDark: 'https://a.espncdn.com/i/teamlogos/ncaa/500-dark/59.png',
    lastSeason: { record: '9-4', conference: '6-2', rank: 24, note: 'Ranked as high as No. 7 in 2025' },
    pulse: [
      { label: '2025', value: '9-4', detail: 'Final record' },
      { label: 'ACC', value: '6-2', detail: 'Tied 2nd' },
      { label: 'Home', value: '7', detail: 'Games at The Flats' },
      { label: 'Rank', value: '#24', detail: 'Final AP 2025' },
    ],
  },
  players,
  depthChart,
  schedule,
  featured,
  featuredMore: featuredMore.slice(0, 18),
  opponents,
  standings,
  dataAsOf: `ESPN roster, career stats, standings & opponent schedules · synced ${new Date().toISOString().slice(0, 10)}`,
  sources: [
    { name: 'ESPN College Football API', url: 'https://site.web.api.espn.com', usedFor: 'Roster, headshots, career stats, previous teams, logos, standings, opponent schedules' },
    { name: 'Georgia Tech Athletics / ACC', url: 'https://ramblinwreck.com', usedFor: '2026 regular-season schedule' },
    { name: 'Georgia Tech Brand Guide', url: 'https://brand.gatech.edu', usedFor: 'Tech Gold #B39051 · Navy #051E39' },
  ],
};

writeFileSync(join(root, 'data/live.json'), JSON.stringify(payload, null, 2));
console.log(`Wrote data/live.json · ${players.length} players · ${withStats} with career stats · ${Object.keys(opponents).length} opponents · ESPN color was #${teamMeta.color}`);
