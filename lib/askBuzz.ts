import { playbookFor } from '@/data/playbook';
import {
  collegeStops,
  depthChart,
  nextGame,
  players,
  previousTeamsLabel,
  schedule,
  shortLastName,
  standings,
  team,
} from '@/data/tech';
import type { Player, Unit } from '@/data/types';

export type AskMessage = {
  id: string;
  role: 'user' | 'buzz';
  text: string;
  links?: { label: string; href: string }[];
  /** Compact follow-up prompts shown after this reply (not the starter list). */
  followUps?: string[];
  /** True when the local engine could not match the question. */
  unmatched?: boolean;
  source?: 'local' | 'llm';
};

/** Shown once at the start of a chat — keep to three. */
export const SAMPLE_QUESTIONS = [
  'What school did Malachi Hosley transfer from?',
  'Who is number 15?',
  'When is the next game?',
];

const TOPIC_FOLLOW_UPS = [
  'Tell me about the offense',
  'Tell me about the defense',
  'Where do we stand in the ACC?',
];

function withFollowUps(msg: AskMessage, extras: string[] = []): AskMessage {
  const pool = [...extras, ...TOPIC_FOLLOW_UPS];
  const seen = new Set<string>();
  const followUps: string[] = [];
  for (const item of pool) {
    const key = item.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    followUps.push(item);
    if (followUps.length >= 3) break;
  }
  return { ...msg, followUps };
}

const POS_ALIASES: Record<string, string[]> = {
  QB: ['quarterback', 'quarterbacks', 'qb', 'qbs', 'signal caller'],
  RB: ['running back', 'running backs', 'rb', 'rbs', 'tailback', 'tailbacks'],
  WR: ['wide receiver', 'wide receivers', 'receiver', 'receivers', 'wr', 'wrs'],
  TE: ['tight end', 'tight ends', 'te', 'tes'],
  OL: ['offensive line', 'olineman', 'ol', 'offensive lineman', 'tackle', 'guard', 'center'],
  DL: ['defensive line', 'dline', 'dl', 'defensive lineman', 'de', 'dt'],
  LB: ['linebacker', 'linebackers', 'lb', 'lbs'],
  DB: ['defensive back', 'defensive backs', 'db', 'dbs', 'corner', 'cornerback', 'safety', 'safeties'],
  K: ['kicker', 'kickers', 'pk'],
  P: ['punter', 'punters'],
};

function normalize(q: string) {
  return q
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/[^a-z0-9#\s\-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractNumber(q: string): number | null {
  // Prefer explicit jersey phrasing; ignore bare digits that belong to ordinals (3rd game).
  const m =
    q.match(/#\s*(\d{1,2})\b/) ||
    q.match(/\b(?:number|no\.?|jersey)\s*(\d{1,2})\b/);
  if (m) {
    const n = Number(m[1]);
    return Number.isFinite(n) ? n : null;
  }
  // Bare number only when it isn't an ordinal like 1st/2nd/3rd/4th
  const bare = q.match(/\b(\d{1,2})\b(?!\s*(?:st|nd|rd|th)\b)/);
  if (!bare) return null;
  // Also skip if the digits are glued to st/nd/rd/th (3rd)
  if (new RegExp(`\\b${bare[1]}(?:st|nd|rd|th)\\b`).test(q)) return null;
  const n = Number(bare[1]);
  return Number.isFinite(n) ? n : null;
}

const ORDINAL_WORDS: Record<string, number> = {
  first: 1,
  second: 2,
  third: 3,
  fourth: 4,
  fifth: 5,
  sixth: 6,
  seventh: 7,
  eighth: 8,
  ninth: 9,
  tenth: 10,
  eleventh: 11,
  twelfth: 12,
  last: -1,
};

/** “3rd game”, “third game”, “game 3”, “our last game” → 1-based index (or -1 = last). */
function extractGameOrdinal(q: string): number | null {
  const looksLikeGame =
    /\bgames?\b|\bmatchup\b|\bopponent\b|\bweek\b|\bschedule\b|\bplay(?:ing)?\b/.test(q);
  if (!looksLikeGame) return null;

  const nth = q.match(/\b(\d{1,2})\s*(?:st|nd|rd|th)\b/);
  if (nth) {
    const n = Number(nth[1]);
    return n >= 1 && n <= 20 ? n : null;
  }

  const gameNum = q.match(/\bgame\s*(?:number\s*)?(\d{1,2})\b/);
  if (gameNum) {
    const n = Number(gameNum[1]);
    return n >= 1 && n <= 20 ? n : null;
  }

  const weekNum = q.match(/\bweek\s*(\d{1,2})\b/);
  if (weekNum) {
    const week = Number(weekNum[1]);
    const idx = schedule.findIndex((g) => g.week === week);
    return idx >= 0 ? idx + 1 : null;
  }

  for (const [word, n] of Object.entries(ORDINAL_WORDS)) {
    if (new RegExp(`\\b${word}\\b`).test(q)) return n;
  }
  return null;
}

function extractUnit(q: string): Unit | null {
  if (/\bdefen[cs]e\b|\bdefensive\b|\bon d\b|\bon the d\b/.test(q)) return 'defense';
  if (/\boffen[cs]e\b|\boffensive\b|\bon o\b|\bon the o\b/.test(q)) return 'offense';
  if (/\bspecial teams?\b|\bkicker\b|\bpunter\b/.test(q)) return 'special';
  return null;
}

function aliasMatches(q: string, alias: string): boolean {
  const a = alias.toLowerCase().trim();
  if (!a) return false;
  // Short abbreviations must be whole words — otherwise "te" matches "team", "ol" matches "college".
  if (a.length <= 3 && !a.includes(' ')) {
    return new RegExp(`\\b${a}\\b`, 'i').test(q);
  }
  return new RegExp(`\\b${a.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(q);
}

function extractPosition(q: string): string | null {
  // Prefer longer / multi-word aliases first so "tight end" wins over noise.
  const ranked = Object.entries(POS_ALIASES).flatMap(([pos, aliases]) =>
    (Array.isArray(aliases) ? aliases : [aliases]).map((alias) => ({ pos, alias }))
  );
  ranked.sort((a, b) => b.alias.length - a.alias.length);
  for (const { pos, alias } of ranked) {
    if (aliasMatches(q, alias)) return pos;
  }
  return null;
}

const NAME_STOP = new Set([
  'what',
  'who',
  'where',
  'when',
  'how',
  'many',
  'much',
  'does',
  'did',
  'do',
  'is',
  'are',
  'was',
  'were',
  'will',
  'win',
  'won',
  'can',
  'could',
  'should',
  'would',
  'might',
  'may',
  'the',
  'a',
  'an',
  'our',
  'for',
  'from',
  'with',
  'about',
  'against',
  'versus',
  'team',
  'teams',
  'player',
  'players',
  'prior',
  'previous',
  'before',
  'play',
  'played',
  'plays',
  'have',
  'has',
  'left',
  'years',
  'year',
  'eligibility',
  'remaining',
  'number',
  'jersey',
  'tell',
  'me',
  'list',
  'show',
  'next',
  'game',
  'games',
  'schedule',
  'standings',
  'defense',
  'offense',
  'college',
  'transfer',
  'transfers',
  'predict',
  'prediction',
  'score',
  'scores',
  'heisman',
  'championship',
  'national',
  'best',
  'greatest',
  'think',
  'opinion',
  'guess',
]);

/** Tiny Levenshtein for typo-tolerant last-name matching (Horsley → Hosley). */
function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const prev = new Array(b.length + 1);
  const cur = new Array(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;
  for (let i = 1; i <= a.length; i++) {
    cur[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(cur[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    for (let j = 0; j <= b.length; j++) prev[j] = cur[j];
  }
  return prev[b.length];
}

function nameTokens(q: string): string[] {
  return q
    .split(/\s+/)
    .map((t) => t.replace(/^[^a-z]+|[^a-z]+$/gi, '').toLowerCase())
    .filter((t) => t.length >= 3 && !NAME_STOP.has(t) && !/^\d+$/.test(t));
}

function findPlayersByName(q: string): Player[] {
  const tokens = nameTokens(q);

  // Exact full-name / first+last hits win outright.
  const fullHits = players.filter((p) => {
    const full = p.name.toLowerCase();
    return full.length > 3 && q.includes(full);
  });
  if (fullHits.length) return fullHits;

  const firstLastHits = players.filter((p) => {
    const last = shortLastName(p.name).toLowerCase();
    const first = (p.firstName || p.name.split(/\s+/)[0] || '').toLowerCase();
    return first.length > 2 && last.length > 2 && q.includes(first) && q.includes(last);
  });
  if (firstLastHits.length) return firstLastHits;

  // Fuzzy: score first+last together much higher than last-name-only.
  // Short last names must match exactly — "will"≈"hill" used to false-hit.
  if (!tokens.length) return [];
  const fuzzy: { p: Player; score: number }[] = [];
  for (const p of players) {
    const last = shortLastName(p.name).toLowerCase();
    const first = (p.firstName || p.name.split(/\s+/)[0] || '').toLowerCase();
    const lastMax = last.length >= 6 ? 2 : last.length >= 5 ? 1 : 0;
    const lastHit = tokens.some(
      (t) => last.length >= 3 && (lastMax === 0 ? t === last : editDistance(t, last) <= lastMax)
    );
    const firstHit = tokens.some(
      (t) => first.length >= 3 && (first.length <= 4 ? t === first : editDistance(t, first) <= 1)
    );

    let score = Infinity;
    if (firstHit && lastHit) score = 0;
    else if (lastHit && tokens.length === 1) score = 1; // single-token last name only
    else if (lastHit && !firstHit) score = 3; // weak: last name alone while query had more tokens
    else if (firstHit && !lastHit && first.length >= 5) score = 4;

    // Typo last name + exact/near first (Horsley + Malachi)
    if (!lastHit && firstHit && last.length >= 5) {
      for (const t of tokens) {
        if (t === first) continue;
        const d = editDistance(t, last);
        if (d <= lastMax) score = Math.min(score, d);
      }
    }

    if (score < Infinity) fuzzy.push({ p, score });
  }
  fuzzy.sort((a, b) => a.score - b.score || a.p.name.localeCompare(b.p.name));
  if (!fuzzy.length) return [];
  const top = fuzzy[0].score;
  // Keep only best score band (so Justice+Haynes doesn't also return Evan Haynes).
  return fuzzy.filter((f) => f.score <= top).map((f) => f.p);
}

function describePreviousTeams(p: Player): string {
  const prior = collegeStops(p, { includeGt: false });
  if (!prior.length) {
    return `#${p.number} ${p.name} has no prior college team listed — Georgia Tech is the only stop on record.`;
  }
  const last = prior[prior.length - 1];
  const path = [...prior.map((t) => t.abbr || t.name), 'GT'].join(' → ');
  if (prior.length === 1) {
    return `#${p.number} ${p.name} transferred from ${last.name}${
      last.abbr ? ` (${last.abbr})` : ''
    }.`;
  }
  return `#${p.number} ${p.name} most recently transferred from ${last.name}${
    last.abbr ? ` (${last.abbr})` : ''
  }. Full college path: ${path}.`;
}

function byNumber(n: number, unit?: Unit | null, pos?: string | null): Player[] {
  let list = players.filter((p) => p.number === n);
  if (unit) list = list.filter((p) => p.unit === unit);
  if (pos) {
    const group = POS_ALIASES[pos] ? pos : pos;
    const expand: Record<string, string[]> = {
      OL: ['OL', 'OT', 'OG', 'C'],
      DL: ['DL', 'DE', 'DT'],
      DB: ['DB', 'CB', 'S', 'NB'],
      RB: ['RB', 'FB'],
    };
    const allowed = expand[group] || [group];
    list = list.filter((p) => allowed.includes(p.position));
  }
  return list;
}

function playerLinks(list: Player[]) {
  return list.map((p) => ({
    label: `#${p.number} ${p.name}`,
    href: `/player/${p.id}`,
  }));
}

function describePlayer(p: Player, opts?: { brief?: boolean }) {
  const elig = p.eligibility;
  const prev = previousTeamsLabel(p) || 'no prior college teams listed';
  const seasons =
    elig && elig.seasonsPlayed > 0
      ? `${elig.seasonsPlayed} season${elig.seasonsPlayed === 1 ? '' : 's'} played${
          elig.seasonsLabel ? ` (${elig.seasonsLabel})` : ''
        }`
      : 'no college seasons with stats yet';
  if (opts?.brief) {
    return `#${p.number} ${p.name} (${p.position}, ${elig?.classAbbr || p.year})`;
  }
  const lines = [
    `#${p.number} ${p.name} — ${p.positionName || p.position}, ${elig?.class || p.year}.`,
    `${p.height}, ${p.weight || '—'} lbs${p.hometown ? ` · from ${p.hometown}` : ''}.`,
    elig
      ? `Eligibility: ${elig.yearsLeftLabel} · ${seasons}.`
      : null,
    `Previous teams: ${prev}.`,
  ];
  if (p.note) lines.push(p.note);
  return lines.filter(Boolean).join('\n');
}

function answerAge(): AskMessage {
  return withFollowUps({
    id: uid(),
    role: 'buzz',
    text:
      "I don't have player ages or birthdays in the Georgia Tech data feed — ESPN's roster doesn't publish DOB here. I can tell you class, seasons played, and years of eligibility left instead. Try: “How much eligibility does number 15 have?”",
  }, ['How much eligibility does #15 have?', 'List the transfer players']);
}

function describeGameLine(g: (typeof schedule)[number], label?: string) {
  const head = label ? `${label}: ` : '';
  return `${head}${g.home ? 'vs' : '@'} ${g.opponent} on ${g.dateLabel} at ${g.time} (${g.tv}).\n${g.venue} · ${g.city}${
    g.note ? `\n${g.note}` : ''
  }`;
}

function answerNextGame(): AskMessage {
  const g = nextGame();
  if (!g) {
    return withFollowUps({
      id: uid(),
      role: 'buzz',
      text: 'No upcoming game is listed on the 2026 schedule right now.',
    });
  }
  return withFollowUps(
    {
      id: uid(),
      role: 'buzz',
      text: describeGameLine(g, 'Next up'),
      links: g.opponentId
        ? [{ label: `${g.opponent} 2025 schedule`, href: `/opponent/${g.opponentId}` }]
        : undefined,
    },
    ['Show the full schedule', 'Where do we stand in the ACC?']
  );
}

function answerNthGame(ordinal: number): AskMessage {
  if (!schedule.length) {
    return {
      id: uid(),
      role: 'buzz',
      text: 'No games are loaded on the schedule right now.',
      unmatched: true,
    };
  }
  const index = ordinal === -1 ? schedule.length - 1 : ordinal - 1;
  const g = schedule[index];
  if (!g) {
    return {
      id: uid(),
      role: 'buzz',
      text: `We only have ${schedule.length} games on the ${team.season} schedule — there is no game #${ordinal}.`,
    };
  }
  const label =
    ordinal === -1
      ? `Last game (#${schedule.length})`
      : ordinal === 1
        ? '1st game'
        : ordinal === 2
          ? '2nd game'
          : ordinal === 3
            ? '3rd game'
            : `${ordinal}th game`;
  return withFollowUps(
    {
      id: uid(),
      role: 'buzz',
      text: describeGameLine(g, label),
      links: g.opponentId
        ? [
            { label: `${g.opponent} 2025 results`, href: `/opponent/${g.opponentId}` },
            { label: 'Open schedule', href: '/schedule' },
          ]
        : [{ label: 'Open schedule', href: '/schedule' }],
    },
    ['When is the next game?', 'Show the full schedule']
  );
}

function answerStandings(): AskMessage {
  const acc = standings?.conference.entries ?? [];
  const gt = acc.find((e) => e.abbr === 'GT');
  const rank = acc.findIndex((e) => e.abbr === 'GT') + 1;
  const natNote = team.lastSeason;
  return {
    id: uid(),
    role: 'buzz',
    text: [
      gt
        ? `In the ${standings?.conference.label || '2025 ACC standings'}, Georgia Tech finished ${gt.overall} overall (${gt.conference} conference)${rank ? ` — #${rank} in the ACC` : ''}.`
        : `Georgia Tech's 2025 record was ${natNote.record} (${natNote.conference} ACC).`,
      `Final AP: #${natNote.rank}. ${natNote.note}`,
      'Open the Standings tab for the full ACC table and Top 25.',
    ].join('\n'),
    links: [{ label: 'Open standings', href: '/standings' }],
  };
}

function answerTransfers(): AskMessage {
  const transfers = players.filter((p) => collegeStops(p, { includeGt: false }).length);
  const lines = transfers
    .slice(0, 20)
    .map((p) => {
      const path = collegeStops(p, { includeGt: false })
        .map((t) => t.abbr || t.name)
        .join(' → ');
      return `• #${p.number} ${p.name} (${p.position}) — ${path} → GT`;
    });
  return {
    id: uid(),
    role: 'buzz',
    text: `I count ${transfers.length} players with prior college stops on the roster:\n${lines.join('\n')}${
      transfers.length > 20 ? `\n…and ${transfers.length - 20} more on the Roster tab.` : ''
    }`,
    links: playerLinks(transfers.slice(0, 6)),
  };
}

function answerPositionGroup(pos: string, q: string): AskMessage {
  const expand: Record<string, string[]> = {
    OL: ['OL', 'OT', 'OG', 'C'],
    DL: ['DL', 'DE', 'DT'],
    DB: ['DB', 'CB', 'S', 'NB'],
    RB: ['RB', 'FB'],
  };
  const allowed = expand[pos] || [pos];
  const group = players
    .filter((p) => allowed.includes(p.position))
    .sort((a, b) => a.number - b.number);

  if (!group.length) {
    return { id: uid(), role: 'buzz', text: `I don't see any ${pos} players on the loaded roster.` };
  }

  const wantsPrev =
    /previous|transfer|played for|came from|from\b|before|prior/.test(q);
  const wantsElig = /eligib|years? left|how many years|remaining|class/.test(q);

  if (wantsPrev) {
    const lines = group.map((p) => {
      const prior = collegeStops(p, { includeGt: false });
      const prev = prior.length
        ? prior.map((t) => `${t.name}${t.abbr ? ` (${t.abbr})` : ''}`).join(' → ')
        : 'no prior college team listed';
      return `• #${p.number} ${p.name} — ${prev}`;
    });
    return {
      id: uid(),
      role: 'buzz',
      text: `Previous college stops for GT ${pos}s:\n${lines.join('\n')}`,
      links: playerLinks(group),
    };
  }

  if (wantsElig) {
    const lines = group.map(
      (p) =>
        `• #${p.number} ${p.name} — ${p.eligibility?.class || p.year}, ${
          p.eligibility?.yearsLeftLabel || 'eligibility n/a'
        }`
    );
    return {
      id: uid(),
      role: 'buzz',
      text: `Eligibility for GT ${pos}s:\n${lines.join('\n')}`,
      links: playerLinks(group),
    };
  }

  const lines = group.map((p) => `• ${describePlayer(p, { brief: true })}`);
  return {
    id: uid(),
    role: 'buzz',
    text: `Here are the ${pos}s on the roster (${group.length}):\n${lines.join('\n')}`,
    links: playerLinks(group.slice(0, 8)),
  };
}

function answerDepth(q: string): AskMessage {
  const unit: Unit = /\bdefen/.test(q) ? 'defense' : /\bspecial/.test(q) ? 'special' : 'offense';
  const rows = depthChart[unit] || [];
  const lines = rows.map((row) => {
    const names = row.slots
      .filter((s) => s.id || s.name)
      .map((s) => (s.id ? `#${s.number} ${shortLastName(s.name)}` : s.name))
      .join(' → ');
    return `• ${row.label}: ${names || '—'}`;
  });
  return {
    id: uid(),
    role: 'buzz',
    text: `${unit[0].toUpperCase() + unit.slice(1)} depth chart (camp projection):\n${lines.join('\n')}`,
    links: [{ label: 'Open depth chart', href: '/depth' }],
  };
}

function answerSchedule(q: string): AskMessage {
  const home = /\bhome\b/.test(q);
  const away = /\baway\b|\broad\b/.test(q);
  const acc = /\bacc\b|\bconference\b/.test(q);
  let games = schedule;
  if (home) games = games.filter((g) => g.home);
  if (away) games = games.filter((g) => !g.home);
  if (acc) games = games.filter((g) => g.conference);
  const lines = games
    .slice(0, 8)
    .map(
      (g) =>
        `• ${g.dateLabel}: ${g.home ? 'vs' : '@'} ${g.opponent} (${g.time}, ${g.tv})`
    );
  return {
    id: uid(),
    role: 'buzz',
    text: `${team.season} schedule${home ? ' — home' : ''}${away ? ' — away' : ''}${
      acc ? ' — ACC' : ''
    } (${games.length} games):\n${lines.join('\n')}`,
    links: [{ label: 'Full schedule', href: '/schedule' }],
  };
}

function answerHelp(): AskMessage {
  return {
    id: uid(),
    role: 'buzz',
    text:
      "I'm Buzz — your free Georgia Tech football guide. I answer from this app's roster, eligibility, schedule, depth chart, and standings (no paid AI API).\n\nAsk things like:\n• Who is #15?\n• How much eligibility does #44 on defense have?\n• What previous teams did our quarterbacks play for?\n• When is the next game?\n• Where do we stand in the ACC?",
  };
}

let _seq = 0;
function uid() {
  _seq += 1;
  return `m-${Date.now()}-${_seq}`;
}

export function welcomeMessage(): AskMessage {
  return {
    id: uid(),
    role: 'buzz',
    text:
      "Hey — Buzz here. Ask about players, eligibility, the schedule, or standings. Tap a suggestion or type your own.",
  };
}

/** Topic-style prompts after the user has already asked something. */
export function defaultFollowUps(): string[] {
  return [...TOPIC_FOLLOW_UPS];
}

function answerPlayerQuestion(q: string, matches: Player[]): AskMessage {
  const wantsPrev =
    /\bprevious\b|\bprior\b|\btransfer\b|\btransferred\b|\bplayed for\b|\bcame from\b|\bbefore\b|\bused to\b|\bschool\b|\bwhere .+ from\b|\bfrom where\b/.test(
      q
    );
  if (/\bage\b|\bold is\b|\bbirthday\b|\bborn\b|\bdob\b/.test(q)) {
    return withFollowUps(
      {
        id: uid(),
        role: 'buzz',
        text: "I don't have ages in the data feed.\n\n" + matches.map((p) => describePlayer(p)).join('\n\n'),
        links: playerLinks(matches),
      },
      ['Where did they transfer from?', 'When is the next game?']
    );
  }
  if (wantsPrev) {
    return withFollowUps(
      {
        id: uid(),
        role: 'buzz',
        text: matches.map((p) => describePreviousTeams(p)).join('\n\n'),
        links: playerLinks(matches),
      },
      ['How much eligibility do they have left?', 'When is the next game?']
    );
  }
  return withFollowUps(
    {
      id: uid(),
      role: 'buzz',
      text: matches.map((p) => describePlayer(p)).join('\n\n'),
      links: playerLinks(matches),
    },
    ['Where did they transfer from?', 'When is the next game?']
  );
}

export function askBuzz(question: string): AskMessage {
  const raw = question.trim();
  if (!raw) {
    return withFollowUps({
      id: uid(),
      role: 'buzz',
      text: 'Ask me a question about Georgia Tech football.',
    });
  }
  const q = normalize(raw);

  if (/^(hi|hello|hey|yo|sup)\b/.test(q) || /\bhelp\b|\bwhat can you\b/.test(q)) {
    return withFollowUps(answerHelp(), SAMPLE_QUESTIONS);
  }

  // Predictions / opinions / anything outside team data — do not invent.
  if (
    /\bpredict\b|\bprediction\b|\bheisman\b|\bwho will win\b|\bwho wins\b|\bguess\b|\bopinion\b|\bshould we\b|\bbet\b|\bodds\b|\bfuture\b|\brecruit(?:ing|s)?\b|\bnfl draft\b/.test(
      q
    )
  ) {
    return withFollowUps(
      {
        id: uid(),
        role: 'buzz',
        text: 'Dunno how to answer that — I stick to roster, schedule, depth chart, and standings in this app, not predictions or opinions.',
        unmatched: true,
      },
      SAMPLE_QUESTIONS
    );
  }

  // Schedule ordinals before jersey numbers — “3rd game” is not player #3.
  const gameOrdinal = extractGameOrdinal(q);
  if (gameOrdinal != null) {
    return answerNthGame(gameOrdinal);
  }

  // 1) Resolve a specific player FIRST — never let keywords like “transfer” steal the question.
  const num = extractNumber(q);
  const unit = extractUnit(q);
  const pos = extractPosition(q);
  const named = findPlayersByName(q);

  if (num != null || named.length) {
    let matches = named.length ? named : byNumber(num!, unit, pos);
    if (!matches.length && num != null) {
      matches = byNumber(num);
    }
    if (!matches.length) {
      return withFollowUps({
        id: uid(),
        role: 'buzz',
        text: `I couldn't find ${num != null ? `number ${num}` : 'that player'}${
          unit ? ` on ${unit}` : ''
        } on the current roster.`,
      });
    }

    if (matches.length > 1 && !unit && !pos && named.length === 0) {
      const wantsPrev =
        /\bprevious\b|\bprior\b|\btransfer\b|\bschool\b|\bcame from\b/.test(q);
      const header = `Two players wear #${num}:`;
      const body = matches
        .map((p) =>
          wantsPrev
            ? describePreviousTeams(p)
            : `• ${describePlayer(p, { brief: true })} — ${
                p.eligibility?.yearsLeftLabel || p.year
              }`
        )
        .join('\n\n');
      return withFollowUps(
        {
          id: uid(),
          role: 'buzz',
          text: `${header}\n\n${body}`,
          links: playerLinks(matches),
        },
        ['Tell me about the offense', 'Tell me about the defense']
      );
    }

    return answerPlayerQuestion(q, matches);
  }

  // 2) Coordinators / playbook / scheme
  if (
    /\bwho is (the )?(oc|offensive coordinator)\b|\boffensive coordinator\b/.test(q) &&
    !/\bplaybook\b|\bscheme\b/.test(q)
  ) {
    return withFollowUps(
      {
        id: uid(),
        role: 'buzz',
        text: `OC is ${team.offensiveCoordinator || 'George Godsey'} (co-OC / QBs: ${
          team.coOffensiveCoordinator || 'Chris Weinke'
        }). Scheme label: ${team.offense}. Open Depth → Playbook for the for-dummies guide and deeper concepts.`,
        links: [{ label: 'Open playbook', href: '/depth' }],
      },
      ['Explain the offense playbook', 'Who is the DC?']
    );
  }
  if (
    /\bwho is (the )?(dc|defensive coordinator)\b|\bdefensive coordinator\b/.test(q) &&
    !/\bplaybook\b|\bscheme\b/.test(q)
  ) {
    return withFollowUps(
      {
        id: uid(),
        role: 'buzz',
        text: `DC is ${team.defensiveCoordinator || 'Jason Semore'}. Scheme label: ${
          team.defense
        }. Open Depth → Playbook for the 4-2-5 for-dummies guide and coverages.`,
        links: [{ label: 'Open playbook', href: '/depth' }],
      },
      ['Explain the defense playbook', 'Who is the OC?']
    );
  }
  if (
    /\bplaybook\b|\bscheme\b|\bfor dummies\b|\bhow (does|do) (the )?(offense|defense) work\b|\bexplain the (offense|defense)\b|\bwhat (offense|defense) do we run\b|\bspread pro\b|\b4\s*[- ]?\s*2\s*[- ]?\s*5\b|\bgodsey\b|\bsemore\b/.test(
      q
    )
  ) {
    const side: 'offense' | 'defense' =
      /\bdefen|\b4\s*[- ]?\s*2\s*[- ]?\s*5\b|\bsemore\b|\b(?:the )?dc\b/.test(q)
        ? 'defense'
        : 'offense';
    const book = playbookFor(side);
    const coachLines = book.coaches.map((c) => `• ${c.role}: ${c.name}`).join('\n');
    return withFollowUps(
      {
        id: uid(),
        role: 'buzz',
        text: `${book.title} (${book.scheme})\n${book.dummy.headline}\n\n${book.dummy.bullets
          .map((b) => `· ${b}`)
          .join('\n')}\n\nCoaches:\n${coachLines}\n\nOpen Depth → Playbook for plays and deeper concepts.`,
        links: [{ label: 'Open playbook', href: '/depth' }],
      },
      side === 'offense'
        ? ['Explain the defense playbook', 'When is the next game?']
        : ['Explain the offense playbook', 'Tell me about the defense']
    );
  }

  // 3) Team-wide topics (only when no player was named)
  if (/\btell me about the offense\b|\boffense overview\b|\babout the offense\b/.test(q)) {
    return withFollowUps(answerDepth('offense depth chart'), [
      'Explain the offense playbook',
      'What previous teams did our QBs play for?',
    ]);
  }
  if (/\btell me about the defense\b|\bdefense overview\b|\babout the defense\b/.test(q)) {
    return withFollowUps(answerDepth('defense depth chart'), [
      'Explain the defense playbook',
      'Where do we stand in the ACC?',
    ]);
  }
  if (/\bfull schedule\b|\bshow the (full )?schedule\b/.test(q)) {
    return withFollowUps(answerSchedule(q), ['When is the next game?']);
  }
  if (/\bage\b|\bold is\b|\bbirthday\b|\bborn\b|\bdob\b/.test(q)) {
    return withFollowUps(answerAge(), [
      'How much eligibility does #15 have?',
      'List the transfer players',
    ]);
  }
  if (/\bnext game\b|\bwhen do we play\b|\bupcoming\b/.test(q)) {
    return answerNextGame();
  }
  if (/\bstandings?\b|\bhow are we doing\b|\bacc rank\b|\bin the acc\b|\brecord\b/.test(q)) {
    return withFollowUps(answerStandings(), ['When is the next game?', 'Tell me about the offense']);
  }
  if (
    /\b(list|all|every|show)\b.{0,24}\btransfers?\b|\btransfers?\b.{0,16}\b(list|roster|players)\b|\bwho transferred\b|\bwhich players transferred\b/.test(
      q
    )
  ) {
    return withFollowUps(answerTransfers(), ['What previous teams did our QBs play for?']);
  }
  if (/\bdepth chart\b|\bwho starts\b|\bstarters?\b/.test(q)) {
    return withFollowUps(answerDepth(q), [
      /\bdefen/.test(q) ? 'Tell me about the offense' : 'Tell me about the defense',
      'List the transfer players',
    ]);
  }
  if (/\bschedule\b|\bgames this season\b|\bwho do we play\b/.test(q)) {
    return withFollowUps(answerSchedule(q), ['When is the next game?']);
  }
  if (pos) {
    return withFollowUps(answerPositionGroup(pos, q), [
      'Tell me about the offense',
      'Tell me about the defense',
    ]);
  }
  if (/\beligib/.test(q)) {
    return withFollowUps(
      {
        id: uid(),
        role: 'buzz',
        text: 'Ask about a specific player — e.g. “How many years of eligibility does #44 on defense have left?” or “Eligibility for our quarterbacks.”',
      },
      ['Eligibility for our quarterbacks', 'Who is number 15?']
    );
  }
  if (/\broster\b|\bhow many players\b/.test(q)) {
    return withFollowUps(
      {
        id: uid(),
        role: 'buzz',
        text: `The loaded roster has ${players.length} players (${
          players.filter((p) => p.unit === 'offense').length
        } offense / ${players.filter((p) => p.unit === 'defense').length} defense / ${
          players.filter((p) => p.unit === 'special').length
        } special). Open Roster to browse, or ask about a number or position.`,
        links: [{ label: 'Open roster', href: '/roster' }],
      },
      ['Tell me about the offense', 'List the transfer players']
    );
  }

  return withFollowUps(
    {
      id: uid(),
      role: 'buzz',
      text: "Dunno how to answer that — I only know what's in this app's roster, schedule, depth chart, and standings. Try a player name, jersey number, or “When is the next game?”",
      unmatched: true,
    },
    SAMPLE_QUESTIONS
  );
}
