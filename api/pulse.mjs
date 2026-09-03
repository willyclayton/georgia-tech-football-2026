/**
 * Live overlay for the 2026 season slate.
 * Fetches ESPN standings, polls, scores, opponent slates, and football news.
 * Static live.json remains the fallback when this route is unavailable.
 */
import { fetchSeasonOverlay } from '../scripts/espn-live.mjs';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate=86400');
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  try {
    const overlay = await fetchSeasonOverlay();
    res.status(200).json({ ok: true, live: true, ...overlay });
  } catch (err) {
    res.status(502).json({
      ok: false,
      live: false,
      error: err.message || 'pulse failed',
    });
  }
}
