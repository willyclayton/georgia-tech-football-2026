# CLAUDE.md — Georgia Tech Football 2026

## Project Overview
Static React + Vite + Tailwind app for tracking the GT 2026 football season.
Hosted on GitHub Pages, auto-refreshed daily via GitHub Actions cron job. Zero cost, zero maintenance after setup.

## Dev Commands
```bash
npm run dev      # Start local dev server (http://localhost:5173/georgia-tech-football-2026/)
npm run build    # Production build → dist/
npm run preview  # Preview the production build locally
```

## Key Architecture Decisions
- **No backend** — all data is static JSON in `src/data/`, updated by CI
- **`base` in vite.config.js** must stay as `/georgia-tech-football-2026/` for GH Pages subpath routing
- **`fetch-data.js`** is an ES module (`"type": "module"` in package.json) — use `import`, not `require`
- `[skip ci]` in the auto-commit message prevents a deploy loop when only JSON changes

## Data Flow
```
8:10am UTC → GitHub Actions cron
→ node scripts/fetch-data.js (ESPN + CFBD APIs)
→ commits changed src/data/*.json to main
→ deploy.yml triggers → npm run build → dist/ → GH Pages
```

## Source of Truth for Data
| File | Updated by |
|---|---|
| `src/data/schedule.json` | `fetch-data.js` (ESPN scores + CFBD win probs) |
| `src/data/roster.json` | Manual edits only (no live API for this) |
| `src/data/opponents.json` | `fetch-data.js` (ESPN team records + rosters) |

## ESPN API
- GT team ID: **59**
- No API key required — public unofficial API
- Base: `https://site.api.espn.com/apis/site/v2/sports/football/college-football/`

## CFBD API
- Requires `CFBD_API_KEY` environment variable / GitHub Actions secret
- Free tier: 1,000 requests/month — daily cron uses ~15 req/day
- Endpoint: `https://api.collegefootballdata.com/metrics/wp/pregame?year=2026&team=Georgia%20Tech`

## One-Time Setup (not yet done)
1. Push to public GitHub repo
2. Add `CFBD_API_KEY` secret in repo Settings → Secrets and variables → Actions
3. Enable GitHub Pages: Settings → Pages → Source: **GitHub Actions**
4. Manually trigger `fetch-data.yml` once to verify the pipeline

## Styling Notes
- GT brand colors defined in `tailwind.config.js`: `gt-gold`, `gt-navy`, `gt-gold-light`
- Dark theme throughout (`bg-gray-950` base)
- Reusable CSS classes in `src/index.css` under `@layer components`: `.game-card`, `.win-bar`, `.modal-overlay`, `.tab-btn`
