#!/usr/bin/env node
/**
 * Smoke test mirroring lib/askRetrieve.ts scoring rules against ask-knowledge.json.
 */
import Fuse from 'fuse.js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const knowledge = JSON.parse(readFileSync(join(root, 'data/ask-knowledge.json'), 'utf8'));
const SCORE_THRESHOLD = 0.45;

function normalize(q) {
  return q
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/[^a-z0-9#\s\-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const fuse = new Fuse(knowledge.entries, {
  includeScore: true,
  threshold: 0.55,
  ignoreLocation: true,
  minMatchCharLength: 2,
  keys: [
    { name: 'questions', weight: 0.55 },
    { name: 'keywords', weight: 0.3 },
    { name: 'searchText', weight: 0.15 },
  ],
});

function retrieve(question, limit = 5) {
  const normalized = normalize(question);
  const exact = knowledge.entries.filter((e) =>
    e.questions.some((qq) => normalize(qq) === normalized)
  );
  if (exact.length) return exact.slice(0, limit).map((entry) => ({ entry, score: 0 }));

  const byId = new Map();
  for (const entry of knowledge.entries) {
    let best = Infinity;
    for (const kw of entry.keywords || []) {
      const k = normalize(kw);
      if (k.length < 3) continue;
      const re = new RegExp(`\\b${k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`);
      if (re.test(normalized)) {
        best = Math.min(best, Math.max(0.05, 0.35 - Math.min(k.length, 24) / 100));
      }
    }
    if (best < Infinity) byId.set(entry.id, { entry, score: best });
  }

  for (const r of fuse.search(question, { limit: limit * 3 })) {
    const score = r.score ?? 1;
    if (score > SCORE_THRESHOLD && !byId.has(r.item.id)) continue;
    const prev = byId.get(r.item.id);
    if (!prev || score < prev.score) {
      byId.set(r.item.id, { entry: r.item, score: Math.min(score, prev?.score ?? score) });
    }
  }

  return [...byId.values()]
    .sort((a, b) => a.score - b.score)
    .filter((h) => h.score <= SCORE_THRESHOLD || h.score <= 0.35)
    .slice(0, limit);
}

const cases = [
  ['What school did Malachi Hosley transfer from?', /Hosley transferred from/i],
  ['Who is number 15?', /#15 Alberto Mendoza/i],
  ['When is the next game?', /Next up/i],
  ['Where do we stand in the ACC?', /ACC/i],
  ["Who's the QB?", /QBs on the roster/i],
  ['What is Clean, Old-Fashioned Hate?', /Clean, Old-Fashioned Hate/i],
  ['Where do the Yellow Jackets play?', /Bobby Dodd/i],
  ['Predict the national championship', /Dunno how to answer that/i],
  ['asdf qwerty zxcv', null],
];

let failed = 0;
for (const [q, expect] of cases) {
  const hit = retrieve(q)[0];
  if (expect == null) {
    if (hit) {
      failed += 1;
      console.log(`FAIL (expected miss): ${q} → ${hit.entry.id}`);
    } else {
      console.log(`OK   miss: ${q}`);
    }
    continue;
  }
  if (!hit || !expect.test(hit.entry.answer)) {
    failed += 1;
    console.log(
      `FAIL: ${q}\n  got: ${hit ? `${hit.entry.id} / ${hit.entry.answer.slice(0, 80)}` : 'null'}`
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
