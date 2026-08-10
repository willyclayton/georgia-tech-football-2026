import Fuse from 'fuse.js';
import knowledge from '@/data/ask-knowledge.json';
import aliases from '@/data/ask-aliases.json';

export type AskKnowledgeLink = { label: string; href: string };

export type AskKnowledgeEntry = {
  id: string;
  category: string;
  scope?: 'player' | 'group' | 'team' | 'faq';
  intent?: string;
  playerIds?: string[];
  jersey?: number | null;
  names?: string[];
  questions: string[];
  keywords: string[];
  answer: string;
  links: AskKnowledgeLink[];
  followUps: string[];
  searchText: string;
};

type KnowledgeFile = {
  version: number;
  builtAt: string;
  entryCount: number;
  entries: AskKnowledgeEntry[];
};

type AliasFile = {
  normalizePhrases?: { from: string; to: string }[];
  opponentAliases?: Record<string, string[]>;
};

const corpus = knowledge as KnowledgeFile;
const aliasData = aliases as AliasFile;

const SCORE_THRESHOLD = 0.48;

let fuse: Fuse<AskKnowledgeEntry> | null = null;

function getFuse() {
  if (!fuse) {
    fuse = new Fuse(corpus.entries, {
      includeScore: true,
      threshold: 0.55,
      ignoreLocation: true,
      minMatchCharLength: 2,
      keys: [
        { name: 'questions', weight: 0.5 },
        { name: 'names', weight: 0.25 },
        { name: 'keywords', weight: 0.15 },
        { name: 'searchText', weight: 0.1 },
      ],
    });
  }
  return fuse;
}

function normalize(q: string) {
  let out = q
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/[^a-z0-9#\s\-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  for (const rule of aliasData.normalizePhrases || []) {
    out = out.replace(new RegExp(rule.from, 'gi'), rule.to);
  }

  // Common grammar / typo fixes fans type fast
  out = out
    .replace(/\bcomes from\b/g, 'come from')
    .replace(/\bwhos\b/g, 'who is')
    .replace(/\belig\b/g, 'eligibility')
    .replace(/\byrs?\s*left\b/g, 'years left');

  return out.replace(/\s+/g, ' ').trim();
}

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

type Intent =
  | 'transfer'
  | 'eligibility'
  | 'stats'
  | 'depth'
  | 'schedule'
  | 'standings'
  | 'playbook'
  | 'coach'
  | 'limits'
  | 'help'
  | 'rivalry'
  | 'stadium'
  | 'bio'
  | 'roster'
  | 'general';

function detectIntent(q: string): Intent {
  if (/\bpredict\b|\bprediction\b|\bbet\b|\bodds\b|\bspread\b|\bheisman\b|\bdraft\b|\bplayoff\b/.test(q)) {
    return 'limits';
  }
  if (/\bage\b|\bbirthday\b|\bborn\b|\bdob\b|\bold is\b/.test(q)) return 'limits';
  if (/\brecruit|\bnil\b|\bcommit/.test(q)) return 'limits';
  if (/^(hi|hello|hey|yo)\b|\bhelp\b|\bwhat can you\b/.test(q)) return 'help';
  if (
    /\btransfer|\bprevious (team|school)|\bprior school|\bcome from\b|\bcame from\b|\bschool did\b|\bportal\b|\bpath\b/.test(
      q
    ) ||
    // "haynes from?" / "hosley from" after punctuation strip
    /\bfrom\s*$/.test(q)
  ) {
    return 'transfer';
  }
  if (/\beligib|\byears? left\b|\bclass\b|\bsenior\b|\bjunior\b|\bsophomore\b|\bfreshman\b|\bredshirt\b/.test(q)) {
    return 'eligibility';
  }
  if (/\bstats?\b|\byards?\b|\btouchdowns?\b|\btds?\b|\bcareer numbers\b/.test(q)) return 'stats';
  if (/\bdepth chart\b|\bstarter\b|\bstarts?\b|\bstarting\b|\bbackup\b/.test(q)) return 'depth';
  if (/\bschedule\b|\bnext game\b|\bkickoff\b|\btv\b|\bchannel\b|\bwhen (is|do)|\bgame\b|\bvs\b|\b@\b/.test(q)) {
    return 'schedule';
  }
  if (/\bstandings?\b|\brecord\b|\bacc rank\b|\bhow are we doing\b/.test(q)) return 'standings';
  if (/\bplaybook\b|\bscheme\b|\bfor dummies\b|\b4\s*[- ]?\s*2\s*[- ]?\s*5\b/.test(q)) return 'playbook';
  if (
    /\bcoach\b|\bcoordinator\b|\boc\b|\bdc\b|\bgodsey\b|\bsemore\b|\bweinke\b|\bbrent key\b|\bplay caller\b|\bcalling plays\b|\bspecial teams coordinator\b|\bstrength (coach|staff)\b|\bbuyout\b/.test(
      q
    )
  ) {
    return 'coach';
  }
  if (/\brivalry\b|\bcofh\b|\bclean old|\bgovernor'?s cup\b|\bthwg\b/.test(q)) return 'rivalry';
  if (/\bstadium\b|\bbobby dodd\b|\bthe flats\b|\bhyundai\b|\bparking\b|\bbag policy\b/.test(q)) {
    return 'stadium';
  }
  if (/\blist the\b|\bwho are the\b|\ball transfers\b|\broster\b/.test(q)) return 'roster';
  return 'bio';
}

function extractJersey(q: string): number | null {
  const m =
    q.match(/#\s*(\d{1,2})\b/) ||
    q.match(/\b(?:number|no\.?|jersey)\s*(\d{1,2})\b/) ||
    q.match(/\belig(?:ibility)? left\s*#?\s*(\d{1,2})\b/);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : null;
}

function isListIntent(q: string) {
  return /\b(list|all|every|show me the|who are the|our)\b/.test(q) && !/\b#\d|\bnumber\s*\d/.test(q);
}

type PlayerRef = { id: string; names: string[]; jersey: number | null; featured: boolean };

let playerIndex: PlayerRef[] | null = null;

function getPlayerIndex(): PlayerRef[] {
  if (playerIndex) return playerIndex;
  const map = new Map<string, PlayerRef>();
  for (const e of corpus.entries) {
    if (e.scope !== 'player' || !e.playerIds?.length) continue;
    const id = e.playerIds[0];
    const prev = map.get(id) || {
      id,
      names: [],
      jersey: e.jersey ?? null,
      featured: false,
    };
    for (const n of e.names || []) {
      const low = n.toLowerCase();
      if (!prev.names.includes(low)) prev.names.push(low);
    }
    if (e.jersey != null) prev.jersey = e.jersey;
    // Featured/starters tend to own bare last-name transfer questions in our build.
    if (e.keywords?.some((k) => e.names?.some((n) => n.toLowerCase() === k.toLowerCase() && !n.includes(' ')))) {
      prev.featured = true;
    }
    map.set(id, prev);
  }
  // Prefer players who appear on transfer entries with school abbrs / starter depth.
  for (const e of corpus.entries) {
    if (e.intent === 'transfer' && e.scope === 'player' && e.playerIds?.[0]) {
      const ref = map.get(e.playerIds[0]);
      if (ref && (e.keywords || []).some((k) => /^[A-Z]{2,4}$/.test(k))) {
        ref.featured = true;
      }
    }
    if (e.id.startsWith('depth-starter-') && e.playerIds?.[0]) {
      const ref = map.get(e.playerIds[0]);
      if (ref) ref.featured = true;
    }
  }
  playerIndex = [...map.values()];
  return playerIndex;
}

function resolvePlayers(q: string): PlayerRef[] {
  const tokens = q
    .split(/\s+/)
    .map((t) => t.replace(/^[^a-z0-9#]+|[^a-z0-9#]+$/gi, ''))
    .filter((t) => t.length >= 3 && !/^\d+$/.test(t));

  const stop = new Set([
    'what',
    'school',
    'did',
    'does',
    'from',
    'come',
    'came',
    'transfer',
    'transferred',
    'where',
    'who',
    'about',
    'tell',
    'have',
    'left',
    'years',
    'eligibility',
    'previous',
    'team',
    'teams',
    'player',
    'number',
    'jersey',
    'the',
    'our',
    'for',
    'with',
    'play',
    'played',
    'stats',
    'career',
    'head',
    'coach',
    'coaches',
    'heading',
    'into',
    'record',
    'tech',
    'his',
    'her',
    'and',
    'are',
    'was',
    'were',
    'how',
    'many',
    'much',
    'any',
    'open',
    'game',
    'games',
    'season',
    'offense',
    'defense',
    'special',
    'coordinator',
    'staff',
  ]);

  const nameTokens = tokens.filter((t) => !stop.has(t) && !t.startsWith('#') && !/^\d+$/.test(t));
  if (!nameTokens.length) return [];

  const hits: { ref: PlayerRef; score: number }[] = [];
  for (const ref of getPlayerIndex()) {
    let best = Infinity;
    for (const name of ref.names) {
      const parts = name.split(/\s+/);
      const last = parts[parts.length - 1];
      const first = parts[0];
      // Full name containment
      if (q.includes(name) && name.includes(' ')) {
        best = Math.min(best, 0);
        continue;
      }
      for (const t of nameTokens) {
        if (t === name || t === last) best = Math.min(best, t === name ? 0 : 1);
        // Fuzzy last names only when token is long enough — avoids head→Heard.
        else if (t.length >= 5 && last.length >= 5 && editDistance(t, last) <= 1) {
          best = Math.min(best, 2);
        } else if (first.length >= 4 && t === first) best = Math.min(best, 3);
      }
      // first + last both present
      if (
        nameTokens.some((t) => t === first || (first.length >= 5 && editDistance(t, first) <= 1)) &&
        nameTokens.some(
          (t) => t === last || (t.length >= 5 && last.length >= 5 && editDistance(t, last) <= 1)
        )
      ) {
        best = Math.min(best, 0);
      }
    }
    if (best < Infinity) hits.push({ ref, score: best - (ref.featured ? 0.1 : 0) });
  }

  hits.sort((a, b) => a.score - b.score);
  if (!hits.length) return [];
  const top = hits[0].score;
  let chosen = hits.filter((h) => h.score <= top + 0.15).map((h) => h.ref);

  // Bare last-name queries ("haynes from?") — prefer featured/starter only.
  const usedFirst = nameTokens.some((t) =>
    chosen.some((ref) => ref.names.some((n) => n.split(/\s+/)[0] === t && n.includes(' ')))
  );
  if (!usedFirst && chosen.length > 1) {
    const featured = chosen.filter((r) => r.featured);
    if (featured.length) chosen = featured;
  }
  return chosen;
}

export type RetrievedHit = {
  entry: AskKnowledgeEntry;
  score: number;
};

function intentBonus(entry: AskKnowledgeEntry, intent: Intent): number {
  const ei = entry.intent || 'general';
  if (ei === intent) return -0.25;
  if (intent === 'transfer' && ei === 'bio') return 0.05;
  if (intent === 'bio' && ei === 'transfer') return 0.08;
  if (intent === 'limits' && ei === 'limits') return -0.4;
  if (intent === 'help' && ei === 'help') return -0.4;
  return 0;
}

function scopePenalty(entry: AskKnowledgeEntry, hasPlayer: boolean, listIntent: boolean): number {
  if (!hasPlayer) return 0;
  if (listIntent) return entry.scope === 'group' ? -0.05 : 0.05;
  // Specific player questions: crush group roster dumps.
  if (entry.scope === 'group') return 0.35;
  if (entry.scope === 'player') return -0.2;
  return 0;
}

/**
 * Version A retrieval with entity + attribute ranking.
 * Player-specific transfer/elig/bio beats position-group lists.
 */
export function retrieveAskKnowledge(question: string, limit = 5): RetrievedHit[] {
  const raw = question.trim();
  if (!raw) return [];

  const q = normalize(raw);
  const intent = detectIntent(q);
  const jersey = extractJersey(q);
  const players = resolvePlayers(q);
  const playerIds = new Set(players.map((p) => p.id));
  const listIntent = isListIntent(q);

  // Exact question match (after normalize) — return immediately.
  const exact = corpus.entries.filter((e) => e.questions.some((qq) => normalize(qq) === q));
  if (exact.length) {
    const ranked = exact
      .map((entry) => ({
        entry,
        score:
          0 +
          intentBonus(entry, intent) +
          (jersey != null && entry.jersey === jersey ? -0.05 : 0) +
          (entry.playerIds?.some((id) => playerIds.has(id)) ? -0.1 : 0) +
          (entry.intent === intent ? -0.05 : 0),
      }))
      .sort((a, b) => a.score - b.score);
    return ranked.slice(0, limit);
  }

  const byId = new Map<string, RetrievedHit>();

  const consider = (entry: AskKnowledgeEntry, base: number) => {
    let score = base;
    score += intentBonus(entry, intent);
    score += scopePenalty(entry, playerIds.size > 0 || jersey != null, listIntent);

    if (jersey != null) {
      if (entry.jersey === jersey) score -= 0.28;
      else if (entry.scope === 'player') score += 0.05;
    }

    if (playerIds.size) {
      if (entry.playerIds?.some((id) => playerIds.has(id))) score -= 0.3;
      else if (entry.scope === 'player') score += 0.12;
    }

    // Bare "from?" / transfer with a resolved player must land on transfer intent entries.
    if (intent === 'transfer' && playerIds.size && entry.intent === 'transfer' && entry.scope === 'player') {
      if (entry.playerIds?.some((id) => playerIds.has(id))) score -= 0.2;
    }

    const prev = byId.get(entry.id);
    if (!prev || score < prev.score) byId.set(entry.id, { entry, score });
  };

  // Jersey hard path
  if (jersey != null) {
    for (const entry of corpus.entries) {
      if (entry.jersey === jersey) consider(entry, 0.05);
    }
  }

  // Player hard path
  if (playerIds.size) {
    for (const entry of corpus.entries) {
      if (entry.playerIds?.some((id) => playerIds.has(id))) {
        const base = entry.intent === intent ? 0.04 : 0.12;
        consider(entry, base);
      }
    }
  }

  // Keyword / fuse soft path
  for (const entry of corpus.entries) {
    let best = Infinity;
    for (const kw of entry.keywords || []) {
      const k = normalize(kw);
      if (k.length < 3) continue;
      const re = new RegExp(`\\b${k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`);
      if (re.test(q)) {
        best = Math.min(best, Math.max(0.08, 0.38 - Math.min(k.length, 24) / 100));
      }
    }
    if (best < Infinity) consider(entry, best);
  }

  for (const r of getFuse().search(raw, { limit: Math.max(12, limit * 4) })) {
    const score = r.score ?? 1;
    if (score > 0.6 && !byId.has(r.item.id)) continue;
    consider(r.item, score);
  }

  const ranked = [...byId.values()].sort((a, b) => a.score - b.score);

  // If we resolved a player + transfer/elig/stats/bio, force player-scope into the top slot when present.
  if (playerIds.size && !listIntent && ['transfer', 'eligibility', 'stats', 'bio'].includes(intent)) {
    const preferredPool = ranked.filter(
      (h) =>
        h.entry.scope === 'player' &&
        h.entry.playerIds?.some((id) => playerIds.has(id)) &&
        h.entry.intent === intent
    );
    // On transfer intent, prefer an answer that actually lists a prior school.
    const preferred =
      (intent === 'transfer'
        ? preferredPool.find((h) => !/no prior college team listed/i.test(h.entry.answer))
        : null) || preferredPool[0];
    if (preferred) {
      return [preferred, ...ranked.filter((h) => h.entry.id !== preferred.entry.id)].slice(0, limit);
    }
  }

  return ranked.filter((h) => h.score <= SCORE_THRESHOLD + 0.15).slice(0, limit);
}

export function bestAskAnswer(question: string): RetrievedHit | null {
  const hits = retrieveAskKnowledge(question, 5);
  return hits[0] ?? null;
}

export function askContextForLlm(question: string, limit = 5): string[] {
  return retrieveAskKnowledge(question, limit).map(
    (h) => `[${h.entry.category}/${h.entry.id}]\nQ: ${h.entry.questions[0]}\nA: ${h.entry.answer}`
  );
}

export function knowledgeStats() {
  return {
    entryCount: corpus.entryCount ?? corpus.entries.length,
    builtAt: corpus.builtAt,
  };
}
