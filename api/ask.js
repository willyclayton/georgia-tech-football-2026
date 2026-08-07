/**
 * Free grounded LLM endpoint (Groq free tier).
 * Answers ONLY from Georgia Tech team data — no invented facts.
 *
 * Set GROQ_API_KEY in Vercel project env (https://console.groq.com — free).
 * Without a key, returns { fallback: true } so the client uses the local engine.
 */
const fs = require('fs');
const path = require('path');

function loadLive() {
  const candidates = [
    path.join(process.cwd(), 'data', 'live.json'),
    path.join(__dirname, '..', 'data', 'live.json'),
  ];
  for (const file of candidates) {
    if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf8'));
  }
  throw new Error('live.json not found');
}

function chronPrior(player) {
  const byKey = new Map();
  for (const cat of player.career?.categories || []) {
    for (const row of cat.rows || []) {
      const abbr = row.teamAbbr;
      if (!abbr || abbr === 'GT') continue;
      const year = Number(row.year);
      if (!Number.isFinite(year)) continue;
      const key = String(row.teamSlug || row.teamId || abbr);
      const prev = byKey.get(key);
      if (!prev || year < prev.year) {
        byKey.set(key, {
          year,
          abbr,
          name: row.teamName || abbr,
        });
      }
    }
  }
  if (byKey.size) {
    return [...byKey.values()]
      .sort((a, b) => a.year - b.year)
      .map((t) => ({ abbr: t.abbr, name: t.name }));
  }
  return (player.previousTeams || []).map((t) => ({
    abbr: t.abbr,
    name: t.name,
  }));
}

function buildContext(live) {
  const players = (live.players || []).map((p) => ({
    id: p.id,
    number: p.number,
    name: p.name,
    position: p.position,
    unit: p.unit,
    class: p.eligibility?.class || p.year,
    yearsLeft: p.eligibility?.yearsLeft,
    seasonsPlayed: p.eligibility?.seasonsPlayed,
    seasons: p.eligibility?.seasons,
    hometown: p.hometown,
    priorSchools: chronPrior(p),
    note: p.note || null,
  }));
  const schedule = (live.schedule || []).slice(0, 12).map((g) => ({
    date: g.dateLabel || g.date,
    opponent: g.opponent,
    home: g.home,
    tv: g.tv,
  }));
  const acc = (live.standings?.conference?.entries || []).slice(0, 17).map((e, i) => ({
    rank: i + 1,
    team: e.shortName || e.name,
    abbr: e.abbr,
    overall: e.overall,
    conference: e.conference,
  }));
  return {
    team: {
      name: live.team?.name,
      season: live.team?.season,
      record: live.team?.record,
      lastSeason: live.team?.lastSeason,
      coach: live.team?.headCoach,
    },
    players,
    schedule,
    accStandings2025: acc,
  };
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

    const key = process.env.GROQ_API_KEY;
    if (!key) {
      return res.status(200).json({
        fallback: true,
        reason: 'GROQ_API_KEY not configured',
      });
    }

    const live = loadLive();
    const context = buildContext(live);

    const system = `You are Buzz, Georgia Tech football guide inside the GT Football app.
Answer ONLY using the JSON context provided. Never invent players, schools, stats, or dates.
If the answer is not clearly in the context, reply exactly: "Dunno how to answer that — I only know what's in this app's roster, schedule, depth chart, and standings."
Do not guess, speculate, or fill gaps. Be concise (2-6 sentences) only when the context has the answer.
Prefer exact names and abbreviations from context.
For transfer/prior-school questions, use priorSchools in chronological order (first to last before GT).
When listing a path, format like ALA → MICH → GT.`;

    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        temperature: 0.1,
        max_tokens: 500,
        messages: [
          { role: 'system', content: system },
          {
            role: 'user',
            content: `CONTEXT:\n${JSON.stringify(context)}\n\nQUESTION: ${question}`,
          },
        ],
      }),
    });

    if (!groqRes.ok) {
      const errText = await groqRes.text();
      return res.status(200).json({
        fallback: true,
        reason: `Groq error ${groqRes.status}`,
        detail: errText.slice(0, 240),
      });
    }

    const data = await groqRes.json();
    const text = data.choices?.[0]?.message?.content?.trim();
    if (!text) {
      return res.status(200).json({ fallback: true, reason: 'Empty LLM response' });
    }

    return res.status(200).json({
      fallback: false,
      source: 'llm',
      text,
      model: 'llama-3.1-8b-instant',
    });
  } catch (err) {
    return res.status(200).json({
      fallback: true,
      reason: err.message || 'Ask API failed',
    });
  }
};
