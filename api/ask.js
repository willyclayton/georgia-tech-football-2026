/**
 * Ask Buzz Version B stub (optional LLM phrasing).
 *
 * Version A (default, shipped): client-side Fuse.js retrieval over
 * data/ask-knowledge.json — no server, no key, no cost.
 *
 * Version B (this endpoint, when you want conversational phrasing):
 * 1. Client retrieves top knowledge hits locally (or sends the question here)
 * 2. This function passes grounded context to a free-tier LLM
 * 3. Cache aggressively (hash question + context); on 429, client falls back to Version A
 *
 * Prefer Gemini AI Studio free tier when wiring this up — check your project's
 * actual rate limits in AI Studio rather than third-party blog posts.
 * Set GEMINI_API_KEY (or keep GROQ_API_KEY) in Vercel env. Without a key,
 * returns { fallback: true } so the client uses the local knowledge answer.
 */
const fs = require('fs');
const path = require('path');

function loadKnowledge() {
  const candidates = [
    path.join(process.cwd(), 'data', 'ask-knowledge.json'),
    path.join(__dirname, '..', 'data', 'ask-knowledge.json'),
  ];
  for (const file of candidates) {
    if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf8'));
  }
  return null;
}

function retrieveLocal(knowledge, question, limit = 5) {
  const q = String(question || '')
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
  if (!q || !knowledge?.entries?.length) return [];

  const scored = [];
  for (const entry of knowledge.entries) {
    let score = 0;
    for (const qq of entry.questions || []) {
      const n = String(qq).toLowerCase();
      if (n === q) score = Math.max(score, 100);
      else if (n.includes(q) || q.includes(n)) score = Math.max(score, 70);
    }
    for (const kw of entry.keywords || []) {
      const k = String(kw).toLowerCase();
      if (k && q.includes(k)) score = Math.max(score, 40 + Math.min(k.length, 20));
    }
    if (score > 0) scored.push({ entry, score });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((s) => s.entry);
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    const question = String(body.question || '').trim();
    if (!question) return res.status(400).json({ error: 'Missing question' });

    const knowledge = loadKnowledge();
    const hits = retrieveLocal(knowledge, question, 5);
    const canned = hits[0]?.answer || null;

    const key = process.env.GEMINI_API_KEY || process.env.GROQ_API_KEY;
    if (!key) {
      return res.status(200).json({
        fallback: true,
        reason: 'No LLM API key configured — use Version A local retrieval',
        canned,
        hitIds: hits.map((h) => h.id),
      });
    }

    // Version B LLM phrasing is intentionally not enabled by default.
    // Wire Gemini/Groq here when you want conversational answers; until then,
    // always fall back so the client serves the grounded canned answer.
    return res.status(200).json({
      fallback: true,
      reason: 'Version B LLM phrasing not enabled — serving Version A retrieval',
      canned,
      hitIds: hits.map((h) => h.id),
      context: hits.map((h) => ({ id: h.id, answer: h.answer })),
    });
  } catch (err) {
    return res.status(200).json({
      fallback: true,
      reason: err.message || 'Ask API failed',
    });
  }
};
