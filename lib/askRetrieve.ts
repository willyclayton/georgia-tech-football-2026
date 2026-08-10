import Fuse from 'fuse.js';
import knowledge from '@/data/ask-knowledge.json';

export type AskKnowledgeLink = { label: string; href: string };

export type AskKnowledgeEntry = {
  id: string;
  category: string;
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

const corpus = knowledge as KnowledgeFile;

/** Minimum Fuse score quality (lower is better). Tuned for short sports FAQs. */
const SCORE_THRESHOLD = 0.45;

let fuse: Fuse<AskKnowledgeEntry> | null = null;

function getFuse() {
  if (!fuse) {
    fuse = new Fuse(corpus.entries, {
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
  }
  return fuse;
}

function normalize(q: string) {
  return q
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/[^a-z0-9#\s\-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export type RetrievedHit = {
  entry: AskKnowledgeEntry;
  score: number;
};

/**
 * Whole-word keyword hits catch narrow-domain phrasing Fuse can miss
 * (e.g. "Predict the national championship" → faq-predictions).
 */
function keywordHits(normalized: string, limit: number): RetrievedHit[] {
  const scored: RetrievedHit[] = [];
  for (const entry of corpus.entries) {
    let best = Infinity;
    for (const kw of entry.keywords || []) {
      const k = normalize(kw);
      if (k.length < 3) continue;
      const re =
        k.length <= 3
          ? new RegExp(`\\b${k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`)
          : new RegExp(`\\b${k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`);
      if (re.test(normalized)) {
        // Shorter / rarer keywords still count; longer phrases rank better.
        best = Math.min(best, Math.max(0.05, 0.35 - Math.min(k.length, 24) / 100));
      }
    }
    if (best < Infinity) scored.push({ entry, score: best });
  }
  scored.sort((a, b) => a.score - b.score);
  return scored.slice(0, limit);
}

/**
 * Version A retrieval: Fuse.js fuzzy search over the committed knowledge JSON.
 * No network, no API key. Returns best matches or [].
 */
export function retrieveAskKnowledge(question: string, limit = 5): RetrievedHit[] {
  const q = question.trim();
  if (!q) return [];

  const normalized = normalize(q);

  // Prefer exact / near-exact question hits first (common suggestion taps).
  const exact = corpus.entries.filter((e) =>
    e.questions.some((qq) => normalize(qq) === normalized)
  );
  if (exact.length) {
    return exact.slice(0, limit).map((entry) => ({ entry, score: 0 }));
  }

  const byId = new Map<string, RetrievedHit>();

  for (const hit of keywordHits(normalized, limit * 3)) {
    byId.set(hit.entry.id, hit);
  }

  for (const r of getFuse().search(q, { limit: limit * 3 })) {
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

/** Top answer for Version A, or null when nothing is grounded enough. */
export function bestAskAnswer(question: string): RetrievedHit | null {
  const hits = retrieveAskKnowledge(question, 5);
  return hits[0] ?? null;
}

/** Context chunks for a future Version B (retrieval → LLM phrasing). */
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
