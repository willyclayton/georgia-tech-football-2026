#!/usr/bin/env node
/**
 * Smoke tests for Ask Buzz retrieval regressions (metadata-aware ranking).
 */
import Fuse from 'fuse.js';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const knowledge = JSON.parse(readFileSync(join(root, 'data/ask-knowledge.json'), 'utf8'));

function normalize(q) {
  return q
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/[^a-z0-9#\s\-]/g, ' ')
    .replace(/\bcomes from\b/g, 'come from')
    .replace(/\bwhos\b/g, 'who is')
    .replace(/\belig\b/g, 'eligibility')
    .replace(/\s+/g, ' ')
    .trim();
}

function editDistance(a, b) {
  if (a === b) return 0;
  const prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  const cur = Array(b.length + 1);
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

function detectIntent(q) {
  if (/\bpredict\b|\bbet\b|\bodds\b|\bheisman\b|\bdraft\b|\bvegas\b|\bplayoff odds\b|\bsp\+|\bfpi\b|\bnil\b/.test(q)) {
    return 'limits';
  }
  if (
    /\bcoach\b|\bcoordinator\b|\boc\b|\bdc\b|\bgodsey\b|\bsemore\b|\bplay caller\b|\bcalling plays\b|\bspecial teams coordinator\b|\bbrent key\b|\boffseason\b/.test(
      q
    )
  ) {
    return 'coach';
  }
  if (
    /\btransfer|\bprevious|\bcome from\b|\bcame from\b|\bschool did\b/.test(q) ||
    /\bfrom\s*$/.test(q)
  ) {
    return 'transfer';
  }
  if (/\beligib|\byears? left\b|\bsenior\b/.test(q)) return 'eligibility';
  if (/\bstats?\b|\byards?\b|\btouchdowns?\b/.test(q)) return 'stats';
  if (/\bdepth chart\b|\bstarter\b|\bstarts?\b|\bstarting\b|\bqb1\b|\brb1\b|\bleft tackle\b|\bkicking\b|\bpunting\b/.test(q)) {
    return 'depth';
  }
  if (/\bschedule\b|\bnext game\b|\bkickoff\b|\bwhen (is|do)|\bgame\b|\bopen\b|\bathens\b|\batlanta\b/.test(q)) {
    return 'schedule';
  }
  if (/\bstandings?\b|\brecord\b/.test(q)) return 'standings';
  if (/\bplaybook\b|\bscheme\b|\b4-2-5\b|\bbase defense\b/.test(q)) return 'playbook';
  if (/\blist the\b|\bwho are the\b|\ball transfers\b|\btop three receivers\b/.test(q)) return 'roster';
  return 'bio';
}

function retrieve(question) {
  const q = normalize(question);
  const intent = detectIntent(q);
  const fuse = new Fuse(knowledge.entries, {
    includeScore: true,
    threshold: 0.55,
    ignoreLocation: true,
    keys: [
      { name: 'questions', weight: 0.5 },
      { name: 'names', weight: 0.25 },
      { name: 'keywords', weight: 0.15 },
      { name: 'searchText', weight: 0.1 },
    ],
  });

  const playerMap = new Map();
  for (const e of knowledge.entries) {
    if (e.scope !== 'player' || !e.playerIds?.[0]) continue;
    const id = e.playerIds[0];
    const prev = playerMap.get(id) || { id, names: [], featured: false };
    for (const n of e.names || []) {
      const low = n.toLowerCase();
      if (!prev.names.includes(low)) prev.names.push(low);
    }
    if (
      e.id.startsWith('depth-starter-') ||
      (e.intent === 'transfer' && (e.keywords || []).some((k) => /^[A-Z]{2,4}$/.test(k)))
    ) {
      prev.featured = true;
    }
    playerMap.set(id, prev);
  }

  const tokens = q.split(/\s+/).filter((t) => t.length >= 3);
  const stop = new Set([
    'what',
    'school',
    'did',
    'from',
    'come',
    'came',
    'transfer',
    'where',
    'who',
    'about',
    'tell',
    'have',
    'left',
    'years',
    'eligibility',
    'the',
    'our',
    'play',
    'played',
    'previous',
    'team',
    'head',
    'coach',
    'heading',
    'into',
    'record',
    'tech',
    'his',
    'and',
    'are',
    'how',
    'many',
    'any',
    'open',
    'game',
    'season',
    'staff',
    'coordinator',
  ]);
  const nameTokens = tokens.filter((t) => !stop.has(t) && !t.startsWith('#') && !/^\d+$/.test(t));
  const playerHits = [];
  for (const ref of playerMap.values()) {
    let best = Infinity;
    for (const name of ref.names) {
      const parts = name.split(/\s+/);
      const last = parts[parts.length - 1];
      const first = parts[0];
      if (q.includes(name) && name.includes(' ')) best = Math.min(best, 0);
      for (const t of nameTokens) {
        if (t === name || t === last) best = Math.min(best, t === name ? 0 : 1);
        else if (t.length >= 5 && last.length >= 5 && editDistance(t, last) <= 1) best = Math.min(best, 2);
      }
      if (
        nameTokens.some((t) => t === first) &&
        nameTokens.some(
          (t) => t === last || (t.length >= 5 && last.length >= 5 && editDistance(t, last) <= 1)
        )
      ) {
        best = Math.min(best, 0);
      }
    }
    if (best < Infinity) playerHits.push({ ref, score: best - (ref.featured ? 0.1 : 0) });
  }
  playerHits.sort((a, b) => a.score - b.score);
  let topPlayers = playerHits.length
    ? playerHits.filter((h) => h.score <= playerHits[0].score + 0.15).map((h) => h.ref)
    : [];
  const usedFirst = nameTokens.some((t) =>
    topPlayers.some((ref) => ref.names.some((n) => n.split(/\s+/)[0] === t && n.includes(' ')))
  );
  if (!usedFirst && topPlayers.length > 1) {
    const featured = topPlayers.filter((r) => r.featured);
    if (featured.length) topPlayers = featured;
  }
  const playerIds = new Set(topPlayers.map((p) => p.id));
  const listIntent = /\b(list|all|who are the|show me the)\b/.test(q);

  const jerseyMatch = q.match(/#\s*(\d{1,2})\b/) || q.match(/\b(?:number|jersey)\s*(\d{1,2})\b/);
  const jersey = jerseyMatch ? Number(jerseyMatch[1]) : null;

  const byId = new Map();
  const consider = (entry, base) => {
    let score = base;
    if (entry.intent === intent) score -= 0.25;
    if ((playerIds.size || jersey != null) && !listIntent && entry.scope === 'group') score += 0.35;
    if ((playerIds.size || jersey != null) && entry.scope === 'player') score -= 0.2;
    if (jersey != null && entry.jersey === jersey) score -= 0.28;
    if (playerIds.size && entry.playerIds?.some((id) => playerIds.has(id))) score -= 0.3;
    if (
      intent === 'transfer' &&
      entry.intent === 'transfer' &&
      entry.scope === 'player' &&
      entry.playerIds?.some((id) => playerIds.has(id))
    ) {
      score -= 0.2;
    }
    const prev = byId.get(entry.id);
    if (!prev || score < prev.score) byId.set(entry.id, { entry, score });
  };

  const exact = knowledge.entries.filter((entry) => entry.questions.some((qq) => normalize(qq) === q));
  if (exact.length) {
    return exact
      .map((entry) => ({
        entry,
        score: 0 + (entry.intent === intent ? -0.3 : 0),
      }))
      .sort((a, b) => a.score - b.score)
      .slice(0, 5);
  }
  if (jersey != null) {
    for (const entry of knowledge.entries) if (entry.jersey === jersey) consider(entry, 0.05);
  }
  if (playerIds.size) {
    for (const entry of knowledge.entries) {
      if (entry.playerIds?.some((id) => playerIds.has(id))) {
        consider(entry, entry.intent === intent ? 0.04 : 0.12);
      }
    }
  }
  for (const r of fuse.search(question, { limit: 20 })) {
    consider(r.item, r.score ?? 1);
  }

  let ranked = [...byId.values()].sort((a, b) => a.score - b.score);
  if (playerIds.size && !listIntent && ['transfer', 'eligibility', 'stats', 'bio'].includes(intent)) {
    const preferredPool = ranked.filter(
      (h) =>
        h.entry.scope === 'player' &&
        h.entry.playerIds?.some((id) => playerIds.has(id)) &&
        h.entry.intent === intent
    );
    const preferred =
      (intent === 'transfer'
        ? preferredPool.find((h) => !/no prior college team listed/i.test(h.entry.answer))
        : null) || preferredPool[0];
    if (preferred) {
      ranked = [preferred, ...ranked.filter((h) => h.entry.id !== preferred.entry.id)];
    }
  }
  return ranked.slice(0, 5);
}

const cases = [
  ['What school did justice haynes comes from', /ALA → MICH → GT|Alabama.*Michigan|path: ALA → MICH → GT/i, /player-4870760-transfer/],
  ['haynes from?', /ALA|Alabama|MICH|Michigan/i, /player-4870760-transfer/],
  ['What school did Malachi Hosley transfer from?', /PENN|Pennsylvania/i, null],
  ['Who is number 15?', /#15 Alberto Mendoza/i, null],
  ['When is the next game?', /Next up|Colorado/i, null],
  ['When is the UGA game?', /Georgia/i, null],
  ['uga game', /Georgia/i, null],
  ['Where do we stand in the ACC?', /ACC/i, null],
  ["Who's the QB?", /QBs on the roster|quarterback/i, null],
  ['Who starts at QB?', /starter|Mendoza|camp projection/i, null],
  ['list the rbs', /RBs on the roster/i, /pos-RB/],
  ['What is Clean, Old-Fashioned Hate?', /Clean, Old-Fashioned Hate/i, null],
  ['Predict the national championship', /Dunno how to answer that/i, null],
  ['Justice Haynes stats', /career|YDS|TD|CAR/i, null],
  ['how much elig left #22', /1 year left|Eligibility/i, null],
  ['Who is Evan Haynes?', /#84 Evan Haynes/i, null],
  ["Who's the head coach heading into 2026, and what's his record at Tech?", /27-20|Brent Key/i, null],
  ['Any coordinator changes this offseason?', /Godsey|Faulkner|Semore/i, null],
  ["Who's the OC and who's actually calling plays?", /Godsey|play-caller|play caller/i, null],
  ["Who's the special teams coordinator?", /Tim Salem/i, null],
  ["Who's QB1?", /Mendoza|QB1/i, null],
  ["Who's RB1 and is there a committee?", /Haynes|RB1/i, null],
  ['Who are the top three receivers?', /Fuhrmann|receiver|WR/i, null],
  ["Who's at left tackle?", /left tackle|LT/i, null],
  ["What's our base defense — 3-4, 4-2-5, 4-3?", /4-2-5/i, null],
  ["Who's kicking field goals?", /PK|Birr|kicking/i, null],
  ['When and against whom do we open?', /Colorado|Sep 3|opener/i, null],
  ['When do we play Georgia, and is it in Athens or Atlanta?', /Georgia|Athens|Nov 28/i, null],
  ["What's the Vegas win total?", /Dunno|betting|don't track/i, null],
  ['What are his Heisman odds?', /Dunno|Heisman|don't track/i, null],
  ['asdf qwerty zxcv', null, null],
];

let failed = 0;
for (const [q, expect, idRe] of cases) {
  const hit = retrieve(q)[0];
  if (expect == null) {
    console.log(`OK   ${q} → ${hit ? `${hit.entry.id} (${hit.score.toFixed(3)})` : 'miss'}`);
    continue;
  }
  const okText = hit && expect.test(hit.entry.answer);
  const okId = !idRe || (hit && idRe.test(hit.entry.id));
  if (!okText || !okId) {
    failed += 1;
    console.log(
      `FAIL: ${q}\n  id=${hit?.entry.id} score=${hit?.score}\n  ans=${hit?.entry.answer?.slice(0, 140)}`
    );
  } else {
    console.log(`OK   ${q} → ${hit.entry.id}`);
  }
}

if (failed) {
  console.error(`\n${failed} case(s) failed`);
  process.exit(1);
}
console.log(`\nAll ${cases.length} smoke cases passed (${knowledge.entryCount} knowledge entries)`);
