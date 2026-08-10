#!/usr/bin/env node
/**
 * Build Ask Buzz Version A knowledge corpus.
 *
 * Reads data/live.json + data/ask-faq.json and writes data/ask-knowledge.json —
 * a flat list of grounded Q&A entries for client-side Fuse.js retrieval.
 *
 * Run after roster sync: npm run sync && npm run build:ask
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

function readJson(rel) {
  return JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
}

function shortLastName(full) {
  const parts = String(full).replace(/\./g, '').split(/\s+/).filter(Boolean);
  const last = parts[parts.length - 1];
  if (/^(jr|sr|ii|iii|iv)$/i.test(last) && parts.length >= 2) return parts[parts.length - 2];
  return last;
}

function collegeStops(player) {
  const byKey = new Map();
  for (const cat of player.career?.categories || []) {
    for (const row of cat.rows || []) {
      const abbr = row.teamAbbr || null;
      if (!abbr || abbr === 'GT') continue;
      const year = Number(row.year);
      if (!Number.isFinite(year)) continue;
      const key = String(row.teamSlug || row.teamId || abbr);
      const existing = byKey.get(key);
      if (!existing || year < existing.year) {
        byKey.set(key, {
          year,
          name: row.teamName || abbr,
          abbr,
        });
      }
    }
  }
  if (byKey.size) {
    return [...byKey.values()]
      .sort((a, b) => a.year - b.year)
      .map(({ name, abbr }) => ({ name, abbr }));
  }
  return (player.previousTeams || []).map((t) => ({
    name: t.name,
    abbr: t.abbr || null,
  }));
}

function describePrevious(player) {
  const prior = collegeStops(player);
  if (!prior.length) {
    return `#${player.number} ${player.name} has no prior college team listed — Georgia Tech is the only stop on record.`;
  }
  const last = prior[prior.length - 1];
  const pathLabel = [...prior.map((t) => t.abbr || t.name), 'GT'].join(' → ');
  if (prior.length === 1) {
    return `#${player.number} ${player.name} transferred from ${last.name}${
      last.abbr ? ` (${last.abbr})` : ''
    }.`;
  }
  return `#${player.number} ${player.name} most recently transferred from ${last.name}${
    last.abbr ? ` (${last.abbr})` : ''
  }. Full college path: ${pathLabel}.`;
}

function describePlayer(player) {
  const elig = player.eligibility;
  const prior = collegeStops(player);
  const prevLabel = prior.length
    ? prior.map((t) => t.abbr || t.name).join(', ')
    : 'no prior college teams listed';
  const seasons =
    elig && elig.seasonsPlayed > 0
      ? `${elig.seasonsPlayed} season${elig.seasonsPlayed === 1 ? '' : 's'} played${
          elig.seasonsLabel ? ` (${elig.seasonsLabel})` : ''
        }`
      : 'no college seasons with stats yet';
  const lines = [
    `#${player.number} ${player.name} — ${player.positionName || player.position}, ${
      elig?.class || player.year
    }.`,
    `${player.height}, ${player.weight || '—'} lbs${
      player.hometown ? ` · from ${player.hometown}` : ''
    }.`,
    elig ? `Eligibility: ${elig.yearsLeftLabel} · ${seasons}.` : null,
    `Previous teams: ${prevLabel}.`,
  ];
  if (player.note) lines.push(player.note);
  return lines.filter(Boolean).join('\n');
}

function playerLinks(list) {
  return list.map((p) => ({
    label: `#${p.number} ${p.name}`,
    href: `/player/${p.id}`,
  }));
}

function gameLine(g, label) {
  const head = label ? `${label}: ` : '';
  return `${head}${g.home ? 'vs' : '@'} ${g.opponent} on ${g.dateLabel} at ${g.time} (${g.tv}).\n${
    g.venue
  } · ${g.city}${g.note ? `\n${g.note}` : ''}`;
}

function push(entries, entry) {
  entries.push({
    id: entry.id,
    category: entry.category,
    questions: entry.questions,
    keywords: entry.keywords || [],
    answer: entry.answer,
    links: entry.links || [],
    followUps: entry.followUps || [],
    searchText: [...entry.questions, ...(entry.keywords || []), entry.answer]
      .join(' ')
      .toLowerCase(),
  });
}

const POS_EXPAND = {
  OL: ['OL', 'OT', 'OG', 'C'],
  DL: ['DL', 'DE', 'DT'],
  DB: ['DB', 'CB', 'S', 'NB'],
  RB: ['RB', 'FB'],
  QB: ['QB'],
  WR: ['WR'],
  TE: ['TE'],
  LB: ['LB'],
  K: ['K'],
  P: ['P'],
};

const POS_LABEL = {
  QB: 'quarterbacks',
  RB: 'running backs',
  WR: 'wide receivers',
  TE: 'tight ends',
  OL: 'offensive linemen',
  DL: 'defensive linemen',
  LB: 'linebackers',
  DB: 'defensive backs',
  K: 'kickers',
  P: 'punters',
};

function main() {
  const live = readJson('data/live.json');
  const faq = readJson('data/ask-faq.json');
  const team = live.team;
  const players = live.players || [];
  const schedule = live.schedule || [];
  const depthChart = live.depthChart || {};
  const standings = live.standings;
  const entries = [];

  for (const e of faq.entries || []) {
    push(entries, {
      id: e.id,
      category: e.category || 'faq',
      questions: e.questions || [],
      keywords: e.keywords || [],
      answer: e.answer,
      links: e.links || [],
      followUps: e.followUps || [],
    });
  }

  // Team / coaches
  push(entries, {
    id: 'team-overview',
    category: 'team',
    questions: [
      'Tell me about Georgia Tech football',
      'Who are the Yellow Jackets?',
      'Georgia Tech team info',
      'What offense and defense do we run?',
    ],
    keywords: [
      'georgia tech',
      'yellow jackets',
      team.offense,
      team.defense,
      team.headCoach,
      String(team.season),
    ],
    answer: [
      `${team.name} ${team.nickname} — ${team.conference}, ${team.season} season (record ${team.record}).`,
      `Head coach: ${team.headCoach}. Offense: ${team.offense}. Defense: ${team.defense}.`,
      `Home: ${team.stadium}, ${team.city}.`,
      `Last season (${team.season - 1}): ${team.lastSeason.record} (${team.lastSeason.conference} ACC), final AP #${team.lastSeason.rank}. ${team.lastSeason.note}`,
    ].join('\n'),
    links: [{ label: 'Open roster', href: '/roster' }],
    followUps: ['Who is the head coach?', 'Tell me about the offense'],
  });

  push(entries, {
    id: 'team-coach',
    category: 'team',
    questions: [
      'Who is the head coach?',
      'Who coaches Georgia Tech?',
      `Who is ${team.headCoach}?`,
      'Who is Brent Key?',
    ],
    keywords: ['head coach', 'coach', team.headCoach, 'brent key'],
    answer: `${team.headCoach} is the Georgia Tech head coach. Offense (${team.offense}) is led by OC ${
      team.offensiveCoordinator || '—'
    } / co-OC ${team.coOffensiveCoordinator || '—'}. Defense (${team.defense}) is led by DC ${
      team.defensiveCoordinator || '—'
    }.`,
    followUps: ['Who is the OC?', 'Who is the DC?'],
  });

  push(entries, {
    id: 'team-oc',
    category: 'team',
    questions: [
      'Who is the OC?',
      'Who is the offensive coordinator?',
      `Who is ${team.offensiveCoordinator || 'George Godsey'}?`,
    ],
    keywords: ['oc', 'offensive coordinator', team.offensiveCoordinator, 'godsey'],
    answer: `OC is ${team.offensiveCoordinator || 'George Godsey'} (co-OC / QBs: ${
      team.coOffensiveCoordinator || 'Chris Weinke'
    }). Scheme label: ${team.offense}. Open Depth → Playbook for the for-dummies guide.`,
    links: [{ label: 'Open playbook', href: '/depth' }],
    followUps: ['Explain the offense playbook', 'Who is the DC?'],
  });

  push(entries, {
    id: 'team-dc',
    category: 'team',
    questions: [
      'Who is the DC?',
      'Who is the defensive coordinator?',
      `Who is ${team.defensiveCoordinator || 'Jason Semore'}?`,
    ],
    keywords: ['dc', 'defensive coordinator', team.defensiveCoordinator, 'semore'],
    answer: `DC is ${team.defensiveCoordinator || 'Jason Semore'}. Scheme label: ${
      team.defense
    }. Open Depth → Playbook for the 4-2-5 for-dummies guide.`,
    links: [{ label: 'Open playbook', href: '/depth' }],
    followUps: ['Explain the defense playbook', 'Who is the OC?'],
  });

  // Standings / record
  const acc = standings?.conference?.entries || [];
  const gtStanding = acc.find((e) => e.abbr === 'GT');
  const rank = acc.findIndex((e) => e.abbr === 'GT') + 1;
  push(entries, {
    id: 'standings-acc',
    category: 'standings',
    questions: [
      'Where do we stand in the ACC?',
      'What are the ACC standings?',
      'How are we doing?',
      'What is Georgia Tech record?',
      'ACC rank',
      'What was last season record?',
    ],
    keywords: ['standings', 'acc', 'record', 'rank', 'how are we doing'],
    answer: [
      gtStanding
        ? `In the ${standings?.conference?.label || 'ACC standings'}, Georgia Tech finished ${
            gtStanding.overall
          } overall (${gtStanding.conference} conference)${rank ? ` — #${rank} in the ACC` : ''}.`
        : `Georgia Tech's recent record was ${team.lastSeason.record} (${team.lastSeason.conference} ACC).`,
      `Final AP: #${team.lastSeason.rank}. ${team.lastSeason.note}`,
      'Open the Standings tab for the full ACC table and Top 25.',
    ].join('\n'),
    links: [{ label: 'Open standings', href: '/standings' }],
    followUps: ['When is the next game?', 'Tell me about the offense'],
  });

  // Schedule
  const upcoming = schedule.find((g) => g.status !== 'final') || schedule[0];
  if (upcoming) {
    push(entries, {
      id: 'schedule-next',
      category: 'schedule',
      questions: [
        'When is the next game?',
        'Who do we play next?',
        'When do we play?',
        'Upcoming game',
        `When do we play ${upcoming.opponent}?`,
      ],
      keywords: ['next game', 'upcoming', 'when do we play', upcoming.opponent, upcoming.opponentAbbr],
      answer: gameLine(upcoming, 'Next up'),
      links: upcoming.opponentId
        ? [{ label: `${upcoming.opponent} schedule`, href: `/opponent/${upcoming.opponentId}` }]
        : [{ label: 'Open schedule', href: '/schedule' }],
      followUps: ['Show the full schedule', 'Where do we stand in the ACC?'],
    });
  }

  const ordinalWord = (n) => {
    if (n === 1) return '1st';
    if (n === 2) return '2nd';
    if (n === 3) return '3rd';
    return `${n}th`;
  };

  schedule.forEach((g, i) => {
    const n = i + 1;
    const label = `${ordinalWord(n)} game`;
    push(entries, {
      id: `schedule-game-${n}`,
      category: 'schedule',
      questions: [
        `When is the ${label}?`,
        `Who is the ${label} against?`,
        `Game ${n}`,
        `Week ${g.week} opponent`,
        `${g.home ? 'vs' : '@'} ${g.opponent}`,
        `When do we play ${g.opponent}?`,
      ],
      keywords: [
        g.opponent,
        g.opponentAbbr,
        `week ${g.week}`,
        `game ${n}`,
        g.home ? 'home' : 'away',
      ],
      answer: gameLine(g, label),
      links: g.opponentId
        ? [
            { label: `${g.opponent} results`, href: `/opponent/${g.opponentId}` },
            { label: 'Open schedule', href: '/schedule' },
          ]
        : [{ label: 'Open schedule', href: '/schedule' }],
      followUps: ['When is the next game?', 'Show the full schedule'],
    });
  });

  const schedLines = (games) =>
    games
      .slice(0, 8)
      .map((g) => `• ${g.dateLabel}: ${g.home ? 'vs' : '@'} ${g.opponent} (${g.time}, ${g.tv})`)
      .join('\n');

  push(entries, {
    id: 'schedule-full',
    category: 'schedule',
    questions: [
      'Show the full schedule',
      'What is the schedule?',
      'Who do we play this season?',
      'List the games',
      `${team.season} schedule`,
    ],
    keywords: ['schedule', 'games this season', 'full schedule'],
    answer: `${team.season} schedule (${schedule.length} games):\n${schedLines(schedule)}`,
    links: [{ label: 'Full schedule', href: '/schedule' }],
    followUps: ['When is the next game?', 'Where do we stand in the ACC?'],
  });

  push(entries, {
    id: 'schedule-home',
    category: 'schedule',
    questions: ['Home games', 'Home schedule', 'Games at The Flats', 'Bobby Dodd home games'],
    keywords: ['home', 'the flats', 'bobby dodd'],
    answer: `${team.season} home schedule (${schedule.filter((g) => g.home).length} games):\n${schedLines(
      schedule.filter((g) => g.home)
    )}`,
    links: [{ label: 'Full schedule', href: '/schedule' }],
    followUps: ['When is the next game?', 'Show the full schedule'],
  });

  push(entries, {
    id: 'schedule-away',
    category: 'schedule',
    questions: ['Away games', 'Road schedule', 'Road games'],
    keywords: ['away', 'road'],
    answer: `${team.season} away schedule (${schedule.filter((g) => !g.home).length} games):\n${schedLines(
      schedule.filter((g) => !g.home)
    )}`,
    links: [{ label: 'Full schedule', href: '/schedule' }],
    followUps: ['When is the next game?', 'Show the full schedule'],
  });

  push(entries, {
    id: 'schedule-acc',
    category: 'schedule',
    questions: ['ACC schedule', 'Conference games', 'Who do we play in the ACC?'],
    keywords: ['acc schedule', 'conference games'],
    answer: `${team.season} ACC schedule (${schedule.filter((g) => g.conference).length} games):\n${schedLines(
      schedule.filter((g) => g.conference)
    )}`,
    links: [{ label: 'Full schedule', href: '/schedule' }],
    followUps: ['Where do we stand in the ACC?', 'When is the next game?'],
  });

  // Depth charts
  for (const unit of ['offense', 'defense', 'special']) {
    const rows = depthChart[unit] || [];
    if (!rows.length) continue;
    const lines = rows.map((row) => {
      const names = (row.slots || [])
        .filter((s) => s.id || s.name)
        .map((s) => (s.id ? `#${s.number} ${shortLastName(s.name)}` : s.name))
        .join(' → ');
      return `• ${row.label}: ${names || '—'}`;
    });
    const title = unit[0].toUpperCase() + unit.slice(1);
    push(entries, {
      id: `depth-${unit}`,
      category: 'depth',
      questions: [
        `${title} depth chart`,
        `Tell me about the ${unit}`,
        `Who starts on ${unit}?`,
        unit === 'offense' ? 'Who starts on offense?' : null,
        unit === 'defense' ? 'Who starts on defense?' : null,
        `About the ${unit}`,
      ].filter(Boolean),
      keywords: [unit, 'depth chart', 'starters', 'who starts'],
      answer: `${title} depth chart (camp projection):\n${lines.join('\n')}`,
      links: [{ label: 'Open depth chart', href: '/depth' }],
      followUps:
        unit === 'defense'
          ? ['Tell me about the offense', 'Explain the defense playbook']
          : ['Tell me about the defense', 'Explain the offense playbook'],
    });
  }

  // Playbook summaries (static copy mirrored from playbook.ts basics)
  push(entries, {
    id: 'playbook-offense',
    category: 'playbook',
    questions: [
      'Explain the offense playbook',
      'What offense do we run?',
      'How does the offense work?',
      'Offense for dummies',
      'Spread Pro Style',
      'Explain the scheme on offense',
    ],
    keywords: ['playbook', 'scheme', 'spread pro', 'offense for dummies', 'godsey'],
    answer: [
      `Offense Playbook (${team.offense})`,
      'In English: Tech wants room to run and easy throws.',
      '· Spread = receivers line up wide so the defense can’t stack the box.',
      '· Pro style = NFL-flavored terminology and multiple protections — not just “air raid.”',
      '· The dream snap: run the ball downhill, then hit a play-action or RPO when the defense overplays the run.',
      `Coaches: HC ${team.headCoach}; OC ${team.offensiveCoordinator || 'George Godsey'}; co-OC ${
        team.coOffensiveCoordinator || 'Chris Weinke'
      }.`,
      'Open Depth → Playbook for plays and deeper concepts.',
    ].join('\n'),
    links: [{ label: 'Open playbook', href: '/depth' }],
    followUps: ['Explain the defense playbook', 'When is the next game?'],
  });

  push(entries, {
    id: 'playbook-defense',
    category: 'playbook',
    questions: [
      'Explain the defense playbook',
      'What defense do we run?',
      'How does the defense work?',
      'Defense for dummies',
      '4-2-5',
      'Explain the scheme on defense',
    ],
    keywords: ['playbook', 'scheme', '4-2-5', '425', 'defense for dummies', 'semore'],
    answer: [
      `Defense Playbook (${team.defense})`,
      'In English: four down linemen, two linebackers, five DBs — stop the run, then match receivers.',
      '· The front four rushes / occupies blockers.',
      '· Two LBs fill run fits and cover short zones.',
      '· Five DBs give Tech flexibility vs spread offenses.',
      `DC: ${team.defensiveCoordinator || 'Jason Semore'}.`,
      'Open Depth → Playbook for coverages and deeper concepts.',
    ].join('\n'),
    links: [{ label: 'Open playbook', href: '/depth' }],
    followUps: ['Explain the offense playbook', 'Tell me about the defense'],
  });

  // Roster overview + transfers
  push(entries, {
    id: 'roster-overview',
    category: 'roster',
    questions: [
      'How many players are on the roster?',
      'Show the roster',
      'Roster size',
    ],
    keywords: ['roster', 'how many players'],
    answer: `The loaded roster has ${players.length} players (${
      players.filter((p) => p.unit === 'offense').length
    } offense / ${players.filter((p) => p.unit === 'defense').length} defense / ${
      players.filter((p) => p.unit === 'special').length
    } special). Open Roster to browse, or ask about a number or position.`,
    links: [{ label: 'Open roster', href: '/roster' }],
    followUps: ['Tell me about the offense', 'List the transfer players'],
  });

  const transfers = players.filter((p) => collegeStops(p).length);
  const transferLines = transfers
    .slice(0, 20)
    .map((p) => {
      const pathLabel = collegeStops(p)
        .map((t) => t.abbr || t.name)
        .join(' → ');
      return `• #${p.number} ${p.name} (${p.position}) — ${pathLabel} → GT`;
    });
  push(entries, {
    id: 'roster-transfers',
    category: 'roster',
    questions: [
      'List the transfer players',
      'Who transferred to Georgia Tech?',
      'Which players transferred?',
      'Show all transfers',
      'Transfer portal players',
    ],
    keywords: ['transfers', 'transfer portal', 'who transferred'],
    answer: `I count ${transfers.length} players with prior college stops on the roster:\n${transferLines.join(
      '\n'
    )}${transfers.length > 20 ? `\n…and ${transfers.length - 20} more on the Roster tab.` : ''}`,
    links: playerLinks(transfers.slice(0, 6)),
    followUps: ['What previous teams did our QBs play for?', 'Tell me about the offense'],
  });

  // Position groups
  for (const [pos, allowed] of Object.entries(POS_EXPAND)) {
    const group = players
      .filter((p) => allowed.includes(p.position))
      .sort((a, b) => a.number - b.number || a.name.localeCompare(b.name));
    if (!group.length) continue;
    const label = POS_LABEL[pos] || pos;
    const brief = group.map((p) => `• #${p.number} ${p.name} (${p.position}, ${p.eligibility?.classAbbr || p.year})`);
    push(entries, {
      id: `pos-${pos}`,
      category: 'roster',
      questions: [
        `Who are the ${label}?`,
        `List the ${pos}s`,
        `Show me the ${label}`,
        pos === 'QB' ? "Who's the QB?" : null,
        pos === 'QB' ? 'Who is the quarterback?' : null,
        `Our ${label}`,
      ].filter(Boolean),
      keywords: [pos, label, ...group.map((p) => p.name)],
      answer: `Here are the ${pos}s on the roster (${group.length}):\n${brief.join('\n')}`,
      links: playerLinks(group.slice(0, 8)),
      followUps: [`What previous teams did our ${pos}s play for?`, 'Tell me about the offense'],
    });

    const prevLines = group.map((p) => {
      const prior = collegeStops(p);
      const prev = prior.length
        ? prior.map((t) => `${t.name}${t.abbr ? ` (${t.abbr})` : ''}`).join(' → ')
        : 'no prior college team listed';
      return `• #${p.number} ${p.name} — ${prev}`;
    });
    push(entries, {
      id: `pos-${pos}-prev`,
      category: 'roster',
      questions: [
        `What previous teams did our ${pos}s play for?`,
        `Where did our ${label} transfer from?`,
        `${pos} transfer history`,
        `Previous teams for ${label}`,
      ],
      keywords: [pos, label, 'previous', 'transfer', 'prior'],
      answer: `Previous college stops for GT ${pos}s:\n${prevLines.join('\n')}`,
      links: playerLinks(group),
      followUps: [`Who are the ${label}?`, 'List the transfer players'],
    });

    const eligLines = group.map(
      (p) =>
        `• #${p.number} ${p.name} — ${p.eligibility?.class || p.year}, ${
          p.eligibility?.yearsLeftLabel || 'eligibility n/a'
        }`
    );
    push(entries, {
      id: `pos-${pos}-elig`,
      category: 'roster',
      questions: [
        `Eligibility for our ${label}`,
        `How much eligibility do the ${pos}s have?`,
        `${pos} years left`,
      ],
      keywords: [pos, label, 'eligibility', 'years left'],
      answer: `Eligibility for GT ${pos}s:\n${eligLines.join('\n')}`,
      links: playerLinks(group),
      followUps: [`Who are the ${label}?`, 'List the transfer players'],
    });
  }

  // Per-player cards + jersey lookups
  const byNumber = new Map();
  for (const p of players) {
    const list = byNumber.get(p.number) || [];
    list.push(p);
    byNumber.set(p.number, list);
  }

  for (const [num, list] of byNumber) {
    if (list.length === 1) {
      const p = list[0];
      push(entries, {
        id: `jersey-${num}`,
        category: 'player',
        questions: [
          `Who is number ${num}?`,
          `Who is #${num}?`,
          `Who wears ${num}?`,
          `Jersey ${num}`,
          `Number ${num}`,
        ],
        keywords: [`#${num}`, `number ${num}`, p.name, shortLastName(p.name), p.position],
        answer: describePlayer(p),
        links: playerLinks([p]),
        followUps: ['Where did they transfer from?', 'When is the next game?'],
      });
    } else {
      const body = list
        .map(
          (p) =>
            `• #${p.number} ${p.name} (${p.position}, ${p.eligibility?.classAbbr || p.year}) — ${
              p.eligibility?.yearsLeftLabel || p.year
            }`
        )
        .join('\n');
      push(entries, {
        id: `jersey-${num}`,
        category: 'player',
        questions: [
          `Who is number ${num}?`,
          `Who is #${num}?`,
          `Who wears ${num}?`,
          `Jersey ${num}`,
        ],
        keywords: [`#${num}`, `number ${num}`, ...list.map((p) => p.name)],
        answer: `Two players wear #${num}:\n\n${body}`,
        links: playerLinks(list),
        followUps: ['Tell me about the offense', 'Tell me about the defense'],
      });
      for (const p of list) {
        push(entries, {
          id: `jersey-${num}-${p.unit}`,
          category: 'player',
          questions: [
            `Who is number ${num} on ${p.unit}?`,
            `Who is #${num} ${p.position}?`,
            `#${num} ${p.unit}`,
          ],
          keywords: [`#${num}`, p.unit, p.position, p.name],
          answer: describePlayer(p),
          links: playerLinks([p]),
          followUps: ['Where did they transfer from?', 'When is the next game?'],
        });
      }
    }
  }

  for (const p of players) {
    const last = shortLastName(p.name);
    const first = p.firstName || p.name.split(/\s+/)[0];
    const prior = collegeStops(p);
    push(entries, {
      id: `player-${p.id}`,
      category: 'player',
      questions: [
        `Who is ${p.name}?`,
        `Tell me about ${p.name}`,
        `Tell me about ${last}`,
        `${first} ${last}`,
        `${p.name} info`,
      ],
      keywords: [p.name, first, last, `#${p.number}`, p.position, p.hometown],
      answer: describePlayer(p),
      links: playerLinks([p]),
      followUps: [
        prior.length ? `Where did ${last} transfer from?` : 'When is the next game?',
        `How much eligibility does ${last} have?`,
      ],
    });

    push(entries, {
      id: `player-${p.id}-transfer`,
      category: 'player',
      questions: [
        `What school did ${p.name} transfer from?`,
        `Where did ${p.name} transfer from?`,
        `Where did ${last} transfer from?`,
        `${p.name} previous team`,
        `${last} prior school`,
        `Did ${last} transfer?`,
      ],
      keywords: [p.name, last, 'transfer', 'previous', 'prior', 'school', ...prior.map((t) => t.abbr || t.name)],
      answer: describePrevious(p),
      links: playerLinks([p]),
      followUps: [`How much eligibility does ${last} have?`, 'When is the next game?'],
    });

    push(entries, {
      id: `player-${p.id}-elig`,
      category: 'player',
      questions: [
        `How much eligibility does ${p.name} have?`,
        `How much eligibility does ${last} have?`,
        `How many years does #${p.number} have left?`,
        `${last} eligibility`,
        `Years left for ${p.name}`,
      ],
      keywords: [p.name, last, `#${p.number}`, 'eligibility', 'years left'],
      answer: `${describePlayer(p)}`,
      links: playerLinks([p]),
      followUps: [`Where did ${last} transfer from?`, 'When is the next game?'],
    });
  }

  const out = {
    version: 1,
    builtAt: new Date().toISOString(),
    sourceDataAsOf: live.dataAsOf || null,
    entryCount: entries.length,
    entries,
  };

  const outPath = path.join(root, 'data', 'ask-knowledge.json');
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2) + '\n');
  console.log(`Wrote ${entries.length} Ask Buzz knowledge entries → data/ask-knowledge.json`);
}

main();
