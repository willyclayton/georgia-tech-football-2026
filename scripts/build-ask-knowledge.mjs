#!/usr/bin/env node
/**
 * Build Ask Buzz knowledge corpus from live.json + curated FAQ + alias banks.
 * Emits data/ask-knowledge.json for client-side Fuse retrieval.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { addFanDataCoverage } from './ask-fan-data-coverage.mjs';

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

function fill(template, vars) {
  return template.replace(/\{(\w+)\}/g, (_, k) => (vars[k] != null ? String(vars[k]) : ''));
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
        byKey.set(key, { year, name: row.teamName || abbr, abbr });
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
    }. Path: ${pathLabel}.`;
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

function describeStats(player) {
  const headlines = player.career?.headlines || [];
  if (!headlines.length) {
    return `#${player.number} ${player.name} has no career stat lines loaded in this app yet.`;
  }
  const bits = headlines.map((h) => `${h.label} ${h.value}`).join(' · ');
  return `#${player.number} ${player.name} career (college totals in app): ${bits}.`;
}

function playerLinks(list) {
  return list.map((p) => ({
    label: `#${p.number} ${p.name}`,
    href: `/player/${p.id}`,
  }));
}

function gameLine(g, label) {
  const head = label ? `${label}: ` : '';
  return `${head}${g.home ? 'vs' : '@'} ${g.opponent} on ${g.dateLabel} at ${g.time} (${
    g.tv || 'TV TBD'
  }).\n${g.venue} · ${g.city}${g.note ? `\n${g.note}` : ''}`;
}

function push(entries, entry) {
  const questions = [...new Set((entry.questions || []).filter(Boolean))];
  const keywords = [...new Set((entry.keywords || []).filter(Boolean))];
  entries.push({
    id: entry.id,
    category: entry.category,
    scope: entry.scope || 'team',
    intent: entry.intent || 'general',
    playerIds: entry.playerIds || [],
    jersey: entry.jersey ?? null,
    names: entry.names || [],
    questions,
    keywords,
    answer: entry.answer,
    links: entry.links || [],
    followUps: entry.followUps || [],
    // Keep searchText lean — questions + keywords only (not full answer dumps).
    searchText: [...questions, ...keywords].join(' ').toLowerCase(),
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

const POS_SLANG = {
  QB: ['qb', 'qbs', 'quarterback', 'quarterbacks', 'signal caller'],
  RB: ['rb', 'rbs', 'running back', 'running backs', 'tailback'],
  WR: ['wr', 'wrs', 'receiver', 'receivers', 'wide receiver', 'wide receivers'],
  TE: ['te', 'tes', 'tight end', 'tight ends'],
  OL: ['ol', 'oline', 'offensive line', 'offensive linemen'],
  DL: ['dl', 'dline', 'defensive line', 'defensive linemen'],
  LB: ['lb', 'lbs', 'linebacker', 'linebackers'],
  DB: ['db', 'dbs', 'secondary', 'defensive backs', 'cornerbacks', 'safeties'],
  K: ['kicker', 'kickers', 'pk'],
  P: ['punter', 'punters'],
};

function main() {
  const live = readJson('data/live.json');
  const faq = readJson('data/ask-faq.json');
  const fanQa = readJson('data/ask-fan-qa.json');
  const staff = readJson('data/ask-staff.json');
  const aliases = readJson('data/ask-aliases.json');
  const team = live.team;
  const players = live.players || [];
  const schedule = live.schedule || [];
  const depthChart = live.depthChart || {};
  const standings = live.standings;
  const featured = new Set(live.featured || []);
  const entries = [];

  for (const e of [...(faq.entries || []), ...(fanQa.entries || [])]) {
    push(entries, {
      id: e.id,
      category: e.category || 'faq',
      scope: e.scope || 'faq',
      intent: e.intent || 'faq',
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
    scope: 'team',
    intent: 'team',
    questions: [
      'Tell me about Georgia Tech football',
      'Who are the Yellow Jackets?',
      'Georgia Tech team info',
      'What offense and defense do we run?',
    ],
    keywords: ['georgia tech', 'yellow jackets', team.offense, team.defense, team.headCoach],
    answer: [
      `${team.name} ${team.nickname} — ${team.conference}, ${team.season} season (record ${team.record}).`,
      `Head coach: ${team.headCoach}. Offense: ${team.offense}. Defense: ${team.defense}.`,
      `Home: ${team.stadium}, ${team.city}.`,
      `Last season (${team.season - 1}): ${team.lastSeason.record} (${team.lastSeason.conference} ACC), final AP #${team.lastSeason.rank}. ${team.lastSeason.note}`,
    ].join('\n'),
    links: [{ label: 'Open roster', href: '/roster' }],
    followUps: ['Who is the head coach?', 'Tell me about the offense'],
  });

  const hc = staff.headCoach || {};
  push(entries, {
    id: 'team-coach',
    category: 'team',
    scope: 'team',
    intent: 'coach',
    questions: [
      'Who is the head coach?',
      'Who coaches Georgia Tech?',
      `Who is ${team.headCoach}?`,
      'Who is Brent Key?',
      "Who's coaching GT?",
      "Who's the head coach heading into 2026, and what's his record at Tech?",
    ],
    keywords: ['head coach', 'coach', team.headCoach, 'brent key', 'record at tech'],
    answer: [
      `${hc.name || team.headCoach} — ${hc.seasonLabel || 'head coach'}.`,
      hc.recordAtTech ? `Record at Tech: ${hc.recordAtTech}.` : null,
      ...(hc.yearly || []),
      `Staff: OC ${team.offensiveCoordinator || staff.coordinators?.oc?.name || '—'} · co-OC ${
        team.coOffensiveCoordinator || staff.coordinators?.coOc?.name || '—'
      } · DC ${team.defensiveCoordinator || staff.coordinators?.dc?.name || '—'} · ST ${
        staff.coordinators?.st?.name || 'Tim Salem'
      }.`,
      hc.contractNote || null,
    ]
      .filter(Boolean)
      .join('\n'),
    followUps: ['Any coordinator changes this offseason?', 'Who is the OC?'],
  });

  push(entries, {
    id: 'team-oc',
    category: 'team',
    scope: 'team',
    intent: 'coach',
    questions: [
      'Who is the OC?',
      'Who is the offensive coordinator?',
      `Who is ${team.offensiveCoordinator || 'George Godsey'}?`,
      'Who coaches the offense?',
      "Who's the OC and who's actually calling plays?",
    ],
    keywords: ['oc', 'offensive coordinator', team.offensiveCoordinator, 'godsey', 'play caller'],
    answer: [
      staff.coordinators?.oc?.note ||
        `OC is ${team.offensiveCoordinator || 'George Godsey'} (co-OC / QBs: ${
          team.coOffensiveCoordinator || 'Chris Weinke'
        }).`,
      staff.coordinators?.oc?.playCaller || null,
      `Scheme label: ${team.offense}. Open Depth → Playbook for the for-dummies guide.`,
    ]
      .filter(Boolean)
      .join('\n'),
    links: [{ label: 'Open playbook', href: '/depth' }],
    followUps: ['Explain the offense playbook', 'Who is the DC?'],
  });

  push(entries, {
    id: 'team-dc',
    category: 'team',
    scope: 'team',
    intent: 'coach',
    questions: [
      'Who is the DC?',
      'Who is the defensive coordinator?',
      `Who is ${team.defensiveCoordinator || 'Jason Semore'}?`,
      'Who coaches the defense?',
      "Who's the DC and what's his scheme background?",
    ],
    keywords: ['dc', 'defensive coordinator', team.defensiveCoordinator, 'semore', 'scheme background'],
    answer: [
      staff.coordinators?.dc?.note ||
        `DC is ${team.defensiveCoordinator || 'Jason Semore'}. Scheme label: ${team.defense}.`,
      `Scheme label in-app: ${team.defense}. Open Depth → Playbook for the 4-2-5 for-dummies guide.`,
    ]
      .filter(Boolean)
      .join('\n'),
    links: [{ label: 'Open playbook', href: '/depth' }],
    followUps: ['Explain the defense playbook', 'Who is the OC?'],
  });

  const acc = standings?.conference?.entries || [];
  const gtStanding = acc.find((e) => e.abbr === 'GT');
  const rank = acc.findIndex((e) => e.abbr === 'GT') + 1;
  push(entries, {
    id: 'standings-acc',
    category: 'standings',
    scope: 'team',
    intent: 'standings',
    questions: [
      'Where do we stand in the ACC?',
      'What are the ACC standings?',
      'How are we doing?',
      'What is Georgia Tech record?',
      "What's our record?",
      'Current record',
      'ACC rank',
      'Conference record',
    ],
    keywords: ['standings', 'acc', 'record', 'rank', 'how are we doing'],
    answer: [
      `2026 record so far: ${team.record}.`,
      gtStanding
        ? `In the ${standings?.conference?.label || 'ACC standings'} snapshot, Georgia Tech is listed ${
            gtStanding.overall
          } overall (${gtStanding.conference} conference)${rank ? ` — #${rank} in the table` : ''}.`
        : `Recent context: ${team.lastSeason.record} (${team.lastSeason.conference} ACC) in ${team.season - 1}.`,
      `Last season final AP: #${team.lastSeason.rank}. ${team.lastSeason.note}`,
      `Open Standings and flip ${team.season - 1} if you want last year's ACC finish.`,
      'Open the Standings tab for the ACC table and AP / Coaches polls.',
    ].join('\n'),
    links: [{ label: 'Open standings', href: '/standings' }],
    followUps: ['When is the next game?', 'How did we do in 2025?'],
  });

  const news = live.news || [];
  if (news.length) {
    push(entries, {
      id: 'news-mood',
      category: 'news',
      scope: 'team',
      intent: 'team',
      questions: [
        'What is the mood around the team?',
        'Any news about the season?',
        'How are people feeling about Georgia Tech?',
        'Season preview',
        'What are people saying?',
      ],
      keywords: ['news', 'mood', 'preview', 'opener', 'feeling', 'hype'],
      answer: [
        `Latest ${team.season} notes (Athletics / ESPN):`,
        ...news.slice(0, 5).map((n) => `• ${n.headline}${n.description ? ` — ${n.description}` : ''}`),
        'Open Home for the full news list.',
      ].join('\n'),
      links: news.slice(0, 3).map((n) => ({ label: n.headline, href: n.url })),
      followUps: ['When is the next game?', 'Where do we stand in the ACC?'],
    });
  }

  // Schedule
  const upcoming = schedule.find((g) => g.status !== 'final') || schedule[0];
  if (upcoming) {
    push(entries, {
      id: 'schedule-next',
      category: 'schedule',
      scope: 'team',
      intent: 'schedule',
      questions: [
        'When is the next game?',
        'Who do we play next?',
        'When do we play?',
        'Upcoming game',
        "What's our next game?",
        'Next game?',
        `When do we play ${upcoming.opponent}?`,
        'What channel is the next game?',
        'What time is kickoff?',
      ],
      keywords: [
        'next game',
        'upcoming',
        'when do we play',
        'kickoff',
        upcoming.opponent,
        upcoming.opponentAbbr,
      ],
      answer: gameLine(upcoming, 'Next up'),
      links: upcoming.opponentId
        ? [{ label: `${upcoming.opponent} slate`, href: `/opponent/${upcoming.opponentId}` }]
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
    const aliasList = aliases.opponentAliases?.[g.opponentAbbr] || [];
    const aliasQuestions = aliasList.flatMap((a) => [
      `When is the ${a} game?`,
      `${a} game`,
      `When do we play ${a}?`,
      `What time is ${a}?`,
      `What channel is ${a}?`,
      `Is ${a} home or away?`,
    ]);
    push(entries, {
      id: `schedule-game-${n}`,
      category: 'schedule',
      scope: 'team',
      intent: 'schedule',
      questions: [
        `When is the ${label}?`,
        `Who is the ${label} against?`,
        `Game ${n}`,
        `Week ${g.week} opponent`,
        `${g.home ? 'vs' : '@'} ${g.opponent}`,
        `When do we play ${g.opponent}?`,
        `When is ${g.opponent}?`,
        `${g.opponent} game`,
        `${g.opponentAbbr} game`,
        ...aliasQuestions,
      ],
      keywords: [
        g.opponent,
        g.opponentAbbr,
        `week ${g.week}`,
        `game ${n}`,
        g.home ? 'home' : 'away',
        ...aliasList,
      ],
      answer: gameLine(g, `${g.opponent} (${label})`),
      links: g.opponentId
        ? [
            { label: `${g.opponent} slate`, href: `/opponent/${g.opponentId}` },
            { label: 'Open schedule', href: '/schedule' },
          ]
        : [{ label: 'Open schedule', href: '/schedule' }],
      followUps: ['When is the next game?', 'Show the full schedule'],
    });
  });

  const schedLines = (games) =>
    games
      .slice(0, 10)
      .map(
        (g) =>
          `• ${g.dateLabel}: ${g.home ? 'vs' : '@'} ${g.opponent} (${g.time}, ${g.tv || 'TV TBD'})`
      )
      .join('\n');

  push(entries, {
    id: 'schedule-full',
    category: 'schedule',
    scope: 'group',
    intent: 'schedule',
    questions: [
      'Show the full schedule',
      'What is the schedule?',
      'Who do we play this season?',
      'List the games',
      `${team.season} schedule`,
      'Nonconference slate',
    ],
    keywords: ['schedule', 'games this season', 'full schedule', 'slate'],
    answer: `${team.season} schedule (${schedule.length} games):\n${schedLines(schedule)}`,
    links: [{ label: 'Full schedule', href: '/schedule' }],
    followUps: ['When is the next game?', 'When is the UGA game?'],
  });

  push(entries, {
    id: 'schedule-home',
    category: 'schedule',
    scope: 'group',
    intent: 'schedule',
    questions: ['Home games', 'Home schedule', 'Games at The Flats', 'Bobby Dodd home games'],
    keywords: ['home games', 'home schedule', 'the flats'],
    answer: `${team.season} home schedule (${schedule.filter((g) => g.home).length} games):\n${schedLines(
      schedule.filter((g) => g.home)
    )}`,
    links: [{ label: 'Full schedule', href: '/schedule' }],
    followUps: ['When is the next game?', 'Show the full schedule'],
  });

  push(entries, {
    id: 'schedule-away',
    category: 'schedule',
    scope: 'group',
    intent: 'schedule',
    questions: ['Away games', 'Road schedule', 'Road games'],
    keywords: ['away games', 'road schedule', 'road games'],
    answer: `${team.season} away schedule (${schedule.filter((g) => !g.home).length} games):\n${schedLines(
      schedule.filter((g) => !g.home)
    )}`,
    links: [{ label: 'Full schedule', href: '/schedule' }],
    followUps: ['When is the next game?', 'Show the full schedule'],
  });

  push(entries, {
    id: 'schedule-acc',
    category: 'schedule',
    scope: 'group',
    intent: 'schedule',
    questions: ['ACC schedule', 'Conference games', 'Who do we play in the ACC?'],
    keywords: ['acc schedule', 'conference games'],
    answer: `${team.season} ACC schedule (${schedule.filter((g) => g.conference).length} games):\n${schedLines(
      schedule.filter((g) => g.conference)
    )}`,
    links: [{ label: 'Full schedule', href: '/schedule' }],
    followUps: ['Where do we stand in the ACC?', 'When is the next game?'],
  });

  // Depth charts + starters
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
      scope: 'group',
      intent: 'depth',
      questions: [
        `${title} depth chart`,
        `Tell me about the ${unit}`,
        `Who starts on ${unit}?`,
        `About the ${unit}`,
        unit === 'offense' ? 'Who starts on offense?' : null,
        unit === 'defense' ? 'Who starts on defense?' : null,
      ].filter(Boolean),
      keywords: [unit, 'depth chart', 'starters', 'who starts', `${unit} depth`],
      answer: `${title} depth chart (camp projection):\n${lines.join('\n')}`,
      links: [{ label: 'Open depth chart', href: '/depth' }],
      followUps:
        unit === 'defense'
          ? ['Tell me about the offense', 'Explain the defense playbook']
          : ['Tell me about the defense', 'Explain the offense playbook'],
    });

    for (const row of rows) {
      const starter = (row.slots || []).find((s) => s.id || s.name);
      if (!starter?.name) continue;
      const posKey = row.label;
      push(entries, {
        id: `depth-starter-${unit}-${posKey.replace(/\s+/g, '-').toLowerCase()}`,
        category: 'depth',
        scope: 'player',
        intent: 'depth',
        playerIds: starter.id ? [String(starter.id)] : [],
        jersey: starter.number ?? null,
        names: [starter.name, shortLastName(starter.name)],
        questions: [
          `Who starts at ${posKey}?`,
          `Starting ${posKey}`,
          `Who is the starting ${posKey}?`,
          `${posKey} starter`,
        ],
        keywords: ['starter', 'starts', 'starting', posKey, unit],
        answer: `Camp projection starter at ${posKey}: ${
          starter.number != null ? `#${starter.number} ` : ''
        }${starter.name}. Open Depth for the full chain.`,
        links: starter.id
          ? [
              { label: `#${starter.number} ${starter.name}`, href: `/player/${starter.id}` },
              { label: 'Open depth chart', href: '/depth' },
            ]
          : [{ label: 'Open depth chart', href: '/depth' }],
        followUps: [`Tell me about the ${unit}`, 'When is the next game?'],
      });
    }
  }

  push(entries, {
    id: 'playbook-offense',
    category: 'playbook',
    scope: 'team',
    intent: 'playbook',
    questions: [
      'Explain the offense playbook',
      'What offense do we run?',
      'How does the offense work?',
      'Offense for dummies',
      'Spread Pro Style',
      'Explain the scheme on offense',
      'Pro spread?',
    ],
    keywords: ['playbook', 'scheme', 'spread pro', 'offense for dummies', 'godsey'],
    answer: [
      `Offense Playbook (${team.offense})`,
      'In English: Tech wants room to run and easy throws.',
      '· Spread = receivers line up wide so the defense can’t stack the box.',
      '· Pro style = NFL-flavored terminology and multiple protections — not just “air raid.”',
      '· The dream snap: run the ball downhill, then hit play-action / RPO when the defense overplays the run.',
      `Coaches: HC ${team.headCoach}; OC ${team.offensiveCoordinator || 'George Godsey'}; co-OC ${
        team.coOffensiveCoordinator || 'Chris Weinke'
      }.`,
      'Open Depth → Playbook for plays and deeper concepts.',
    ].join('\n'),
    links: [{ label: 'Open playbook', href: '/depth' }],
    followUps: ['Explain the defense playbook', 'Who starts at QB?'],
  });

  push(entries, {
    id: 'playbook-defense',
    category: 'playbook',
    scope: 'team',
    intent: 'playbook',
    questions: [
      'Explain the defense playbook',
      'What defense do we run?',
      'How does the defense work?',
      'Defense for dummies',
      '4-2-5',
      'Explain the scheme on defense',
      'Base defense',
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

  push(entries, {
    id: 'roster-overview',
    category: 'roster',
    scope: 'group',
    intent: 'roster',
    questions: ['How many players are on the roster?', 'Show the roster', 'Roster size'],
    keywords: ['roster size', 'how many players', 'full roster'],
    answer: `The loaded roster has ${players.length} players (${
      players.filter((p) => p.unit === 'offense').length
    } offense / ${players.filter((p) => p.unit === 'defense').length} defense / ${
      players.filter((p) => p.unit === 'special').length
    } special). Open Roster to browse, or ask about a number or name.`,
    links: [{ label: 'Open roster', href: '/roster' }],
    followUps: ['List the transfer players', 'Who starts at QB?'],
  });

  const transfers = players.filter((p) => collegeStops(p).length);
  const transferLines = transfers
    .slice(0, 24)
    .map((p) => {
      const pathLabel = collegeStops(p)
        .map((t) => t.abbr || t.name)
        .join(' → ');
      return `• #${p.number} ${p.name} (${p.position}) — ${pathLabel} → GT`;
    });
  push(entries, {
    id: 'roster-transfers',
    category: 'roster',
    scope: 'group',
    intent: 'transfer',
    questions: [
      'List the transfer players',
      'Who transferred to Georgia Tech?',
      'Which players transferred?',
      'Show all transfers',
      'Transfer portal players',
      'Who came from the portal?',
    ],
    // No individual player names here — prevents drowning player-specific transfer answers.
    keywords: ['transfers', 'transfer portal', 'who transferred', 'all transfers', 'list transfers'],
    answer: `I count ${transfers.length} players with prior college stops on the roster:\n${transferLines.join(
      '\n'
    )}${transfers.length > 24 ? `\n…and ${transfers.length - 24} more on the Roster tab.` : ''}`,
    links: playerLinks(transfers.slice(0, 6)),
    followUps: ['What school did Justice Haynes come from?', 'What previous teams did our QBs play for?'],
  });

  // Prior-school index: "who transferred from Alabama?"
  const byPrior = new Map();
  for (const p of transfers) {
    for (const t of collegeStops(p)) {
      const key = (t.abbr || t.name || '').toUpperCase();
      if (!key) continue;
      if (!byPrior.has(key)) byPrior.set(key, { label: t.name, abbr: t.abbr, players: [] });
      byPrior.get(key).players.push(p);
    }
  }
  for (const [key, bucket] of byPrior) {
    if (bucket.players.length < 1) continue;
    push(entries, {
      id: `transfers-from-${key.toLowerCase()}`,
      category: 'roster',
      scope: 'group',
      intent: 'transfer',
      questions: [
        `Who transferred from ${bucket.label}?`,
        bucket.abbr ? `Who transferred from ${bucket.abbr}?` : null,
        bucket.abbr ? `Which players came from ${bucket.abbr}?` : null,
        `Any ${bucket.abbr || bucket.label} transfers?`,
      ].filter(Boolean),
      keywords: ['transferred from', bucket.label, bucket.abbr, 'came from'].filter(Boolean),
      answer: `Players on the GT roster with ${bucket.label}${
        bucket.abbr ? ` (${bucket.abbr})` : ''
      } in their college path:\n${bucket.players
        .map((p) => `• #${p.number} ${p.name} (${p.position}) — ${describePrevious(p).split('. ').pop()}`)
        .join('\n')}`,
      links: playerLinks(bucket.players.slice(0, 8)),
      followUps: ['List the transfer players', 'What school did Justice Haynes come from?'],
    });
  }

  // Position groups — keywords are position slang only (NOT player names).
  for (const [pos, allowed] of Object.entries(POS_EXPAND)) {
    const group = players
      .filter((p) => allowed.includes(p.position))
      .sort((a, b) => a.number - b.number || a.name.localeCompare(b.name));
    if (!group.length) continue;
    const label = POS_LABEL[pos] || pos;
    const slang = POS_SLANG[pos] || [pos.toLowerCase()];
    const brief = group.map(
      (p) => `• #${p.number} ${p.name} (${p.position}, ${p.eligibility?.classAbbr || p.year})`
    );
    push(entries, {
      id: `pos-${pos}`,
      category: 'roster',
      scope: 'group',
      intent: 'roster',
      questions: [
        `Who are the ${label}?`,
        `List the ${pos}s`,
        `List the ${label}`,
        `Show me the ${label}`,
        `Our ${label}`,
        pos === 'QB' ? "Who's the QB?" : null,
        pos === 'QB' ? 'Who is the quarterback?' : null,
        pos === 'QB' ? 'List the QBs' : null,
        pos === 'RB' ? 'Who are the running backs?' : null,
        pos === 'RB' ? 'List the RBs' : null,
        pos === 'RB' ? 'Show me the running backs' : null,
        pos === 'K' ? "Who's our kicker?" : null,
        pos === 'P' ? 'Who is the punter?' : null,
      ].filter(Boolean),
      keywords: [...slang, 'list', 'who are the'],
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
      scope: 'group',
      intent: 'transfer',
      questions: [
        `What previous teams did our ${pos}s play for?`,
        `Where did our ${label} transfer from?`,
        `${pos} transfer history`,
        `Previous teams for ${label}`,
        `Which ${label} are transfers?`,
      ],
      keywords: [...slang, 'previous teams', 'transfer history', 'are transfers'],
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
      scope: 'group',
      intent: 'eligibility',
      questions: [
        `Eligibility for our ${label}`,
        `How much eligibility do the ${pos}s have?`,
        `${pos} years left`,
        `How much eligibility do the ${label} have?`,
      ],
      keywords: [...slang, 'eligibility', 'years left'],
      answer: `Eligibility for GT ${pos}s:\n${eligLines.join('\n')}`,
      links: playerLinks(group),
      followUps: [`Who are the ${label}?`, 'List the transfer players'],
    });
  }

  // Class rollups
  for (const [cls, re] of [
    ['seniors', /^senior/i],
    ['juniors', /^junior/i],
    ['sophomores', /^soph/i],
    ['freshmen', /^fresh/i],
  ]) {
    const group = players.filter((p) => re.test(p.eligibility?.class || p.year));
    if (!group.length) continue;
    push(entries, {
      id: `class-${cls}`,
      category: 'roster',
      scope: 'group',
      intent: 'eligibility',
      questions: [
        `Which ${cls} are on the roster?`,
        `List the ${cls}`,
        `Show ${cls}`,
      ],
      keywords: [cls, 'class', 'roster'],
      answer: `${cls[0].toUpperCase() + cls.slice(1)} on the loaded roster (${group.length}):\n${group
        .slice(0, 20)
        .map((p) => `• #${p.number} ${p.name} (${p.position})`)
        .join('\n')}${group.length > 20 ? `\n…and ${group.length - 20} more.` : ''}`,
      links: playerLinks(group.slice(0, 6)),
      followUps: ['List the transfer players', 'How much eligibility does #15 have?'],
    });
  }

  const oneYear = players.filter((p) => p.eligibility?.yearsLeft === 1);
  push(entries, {
    id: 'elig-one-year',
    category: 'roster',
    scope: 'group',
    intent: 'eligibility',
    questions: ['Who has 1 year left?', 'Players with one year of eligibility', 'Who has one year left?'],
    keywords: ['1 year left', 'one year left', 'years left'],
    answer: `Players listed with 1 year left (${oneYear.length}):\n${oneYear
      .slice(0, 20)
      .map((p) => `• #${p.number} ${p.name} (${p.position}, ${p.eligibility?.class || p.year})`)
      .join('\n')}`,
    links: playerLinks(oneYear.slice(0, 6)),
    followUps: ['List the seniors', 'List the transfer players'],
  });

  // Per-jersey + per-player
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
        scope: 'player',
        intent: 'bio',
        playerIds: [String(p.id)],
        jersey: num,
        names: [p.name, shortLastName(p.name)],
        questions: [
          `Who is number ${num}?`,
          `Who is #${num}?`,
          `Who wears ${num}?`,
          `Who wears #${num}?`,
          `Jersey ${num}`,
          `Number ${num}`,
          `Show me #${num}`,
        ],
        keywords: [`#${num}`, `number ${num}`, `jersey ${num}`],
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
        scope: 'group',
        intent: 'bio',
        playerIds: list.map((p) => String(p.id)),
        jersey: num,
        names: list.flatMap((p) => [p.name, shortLastName(p.name)]),
        questions: [
          `Who is number ${num}?`,
          `Who is #${num}?`,
          `Who wears ${num}?`,
          `Who wears #${num}?`,
          `Jersey ${num}`,
        ],
        keywords: [`#${num}`, `number ${num}`, `jersey ${num}`],
        answer: `${list.length} players wear #${num}:\n\n${body}`,
        links: playerLinks(list),
        followUps: ['Tell me about the offense', 'Tell me about the defense'],
      });
      for (const p of list) {
        push(entries, {
          id: `jersey-${num}-${p.unit}`,
          category: 'player',
          scope: 'player',
          intent: 'bio',
          playerIds: [String(p.id)],
          jersey: num,
          names: [p.name, shortLastName(p.name)],
          questions: [
            `Who is number ${num} on ${p.unit}?`,
            `Who is #${num} ${p.position}?`,
            `#${num} ${p.unit}`,
            `#${num} ${p.position}`,
          ],
          keywords: [`#${num}`, p.unit, p.position],
          answer: describePlayer(p),
          links: playerLinks([p]),
          followUps: ['Where did they transfer from?', 'When is the next game?'],
        });
      }
    }
  }

  // Shared last-name disambiguation cards
  const byLast = new Map();
  for (const p of players) {
    const last = shortLastName(p.name).toLowerCase();
    if (!byLast.has(last)) byLast.set(last, []);
    byLast.get(last).push(p);
  }

  for (const p of players) {
    const last = shortLastName(p.name);
    const first = p.firstName || p.name.split(/\s+/)[0];
    const prior = collegeStops(p);
    const vars = { name: p.name, last, first, number: p.number };
    const isFeatured = featured.has(p.id) || (p.tags || []).includes('Starter');
    const lastCollisions = byLast.get(last.toLowerCase()) || [p];

    const uniqueLast = lastCollisions.length === 1;
    const bioQs = (aliases.bioUtterances || [])
      .filter((t) => {
        if (uniqueLast || isFeatured) return true;
        return t.includes('{name}') || t.includes('{first}') || t.includes('{number}');
      })
      .map((t) => fill(t, vars));
    // Prefer featured/starter when fans say bare last name.
    if (isFeatured || uniqueLast) {
      bioQs.push(`Tell me about ${last}`, `${last}?`, `Who is ${last}?`);
    }

    push(entries, {
      id: `player-${p.id}`,
      category: 'player',
      scope: 'player',
      intent: 'bio',
      playerIds: [String(p.id)],
      jersey: p.number,
      names: [p.name, first, last],
      questions: bioQs,
      keywords: [
        p.name,
        `${first} ${last}`,
        `#${p.number}`,
        p.position,
        p.hometown,
        ...(isFeatured ? [last] : []),
      ].filter(Boolean),
      answer: describePlayer(p),
      links: playerLinks([p]),
      followUps: [
        prior.length ? `Where did ${last} transfer from?` : 'When is the next game?',
        `How much eligibility does ${last} have?`,
      ],
    });

    // For shared last names, keep last-name-only transfer phrasing on the
    // featured/starter player only — otherwise Evan Haynes steals "haynes from?".
    const transferQs = (aliases.transferUtterances || [])
      .filter((t) => {
        if (uniqueLast || isFeatured) return true;
        // Require first/full name in the template for non-featured collisions.
        return t.includes('{name}') || t.includes('{first}') || t.includes('{number}');
      })
      .map((t) => fill(t, vars));
    if (uniqueLast || isFeatured) {
      transferQs.push(
        `${last} from?`,
        `${last.toLowerCase()} from?`,
        `Where did ${last} comes from?`,
        `What school did ${last} comes from?`,
        `What school did ${p.name.toLowerCase()} comes from?`
      );
    }
    // Prior-school specific questions
    for (const t of prior) {
      if (t.abbr) {
        transferQs.push(
          `Did ${last} play at ${t.name}?`,
          `Was ${last} at ${t.abbr}?`,
          `${last} ${t.abbr}`
        );
      }
    }

    push(entries, {
      id: `player-${p.id}-transfer`,
      category: 'player',
      scope: 'player',
      intent: 'transfer',
      playerIds: [String(p.id)],
      jersey: p.number,
      names: [p.name, first, last],
      questions: transferQs,
      keywords: [
        p.name,
        `${first} ${last}`,
        `#${p.number}`,
        ...(isFeatured || lastCollisions.length === 1 ? [last] : []),
        ...prior.map((t) => t.abbr || t.name),
        ...prior.map((t) => t.name),
      ].filter(Boolean),
      answer: describePrevious(p),
      links: playerLinks([p]),
      followUps: [`How much eligibility does ${last} have?`, `${last} career stats`],
    });

    const eligQs = (aliases.eligUtterances || []).map((t) => fill(t, vars));
    push(entries, {
      id: `player-${p.id}-elig`,
      category: 'player',
      scope: 'player',
      intent: 'eligibility',
      playerIds: [String(p.id)],
      jersey: p.number,
      names: [p.name, first, last],
      questions: eligQs,
      keywords: [
        p.name,
        `${first} ${last}`,
        `#${p.number}`,
        ...(isFeatured || lastCollisions.length === 1 ? [last] : []),
        p.eligibility?.class,
        p.eligibility?.classAbbr,
      ].filter(Boolean),
      answer: describePlayer(p),
      links: playerLinks([p]),
      followUps: [`Where did ${last} transfer from?`, 'When is the next game?'],
    });

    if (p.career?.headlines?.length) {
      const statsQs = (aliases.statsUtterances || []).map((t) => fill(t, vars));
      push(entries, {
        id: `player-${p.id}-stats`,
        category: 'player',
        scope: 'player',
        intent: 'stats',
        playerIds: [String(p.id)],
        jersey: p.number,
        names: [p.name, first, last],
        questions: statsQs,
        keywords: [
          p.name,
          `${first} ${last}`,
          `#${p.number}`,
          ...(isFeatured || lastCollisions.length === 1 ? [last] : []),
          'stats',
          'career',
          'yards',
          'touchdowns',
        ].filter(Boolean),
        answer: describeStats(p),
        links: playerLinks([p]),
        followUps: [`Where did ${last} transfer from?`, `How much eligibility does ${last} have?`],
      });
    }
  }

  // Explicit disambiguation for shared last names
  for (const [last, list] of byLast) {
    if (list.length < 2) continue;
    push(entries, {
      id: `disambiguate-${last}`,
      category: 'player',
      scope: 'group',
      intent: 'bio',
      playerIds: list.map((p) => String(p.id)),
      names: list.flatMap((p) => [p.name, shortLastName(p.name)]),
      questions: [
        `Which ${list[0] ? shortLastName(list[0].name) : last}?`,
        `${shortLastName(list[0].name)} players`,
        `There are two ${shortLastName(list[0].name)}s`,
      ],
      keywords: [shortLastName(list[0].name), 'which', 'two'],
      answer: `Two players share the last name ${shortLastName(list[0].name)}:\n${list
        .map(
          (p) =>
            `• #${p.number} ${p.name} (${p.position}, ${p.eligibility?.classAbbr || p.year})${
              (p.tags || []).includes('Starter') ? ' — tagged Starter' : ''
            }`
        )
        .join('\n')}\nAsk with a first name or jersey number to pick one.`,
      links: playerLinks(list),
      followUps: list.slice(0, 2).map((p) => `Who is ${p.name}?`),
    });
  }

  // Fan FAQ coverage from live depth/schedule/roster + curated clusters
  addFanDataCoverage((entry) => push(entries, entry), {
    team,
    players,
    schedule,
    depthChart,
    collegeStops,
    describePlayer,
    describeStats,
    playerLinks,
    shortLastName,
  });

  const out = {
    version: 3,
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
