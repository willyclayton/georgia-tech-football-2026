# Georgia Tech Football 2026

A zero-maintenance web app for casual GT football fans. Tracks the 2026 season schedule, live scores, win probabilities, and the key players/depth chart — all updated automatically every morning via GitHub Actions.

**Live site:** `https://<your-username>.github.io/georgia-tech-football-2026/`

---

## Features

- **Schedule tab** — all 12 games with dates, home/away, and a color-coded win probability bar for upcoming games (green = W, red = L, gold = upcoming)
- **Game detail modal** — click any game to see the win probability breakdown, score prediction range, opponent's top 3 players, and a matchup summary
- **Roster tab** — depth chart by position group (QB through ST) with transfer badges and starter callouts
- **Record badge** — live W–L record in the header, auto-calculated from completed game results
- **Daily auto-refresh** — a GitHub Actions cron job fetches ESPN + CFBD data every morning and commits the updated JSON, triggering a redeploy

---

## Tech Stack

- **React 18** + **Vite 5** — fast dev experience and optimized production builds
- **Tailwind CSS 3** — utility-first styling with custom GT brand colors
- **GitHub Pages** — free static hosting
- **GitHub Actions** — CI/CD pipeline for daily data fetching and deployment
- **ESPN unofficial API** — schedule, scores, opponent records (no API key needed)
- **College Football Data API (CFBD)** — pregame win probabilities (free tier)

---

## One-Time Setup

1. **Fork / push this repo** to a public GitHub repository.

2. **Get a free CFBD API key** at [collegefootballdata.com](https://collegefootballdata.com) (takes ~1 minute to register).

3. **Add the secret** in your repo:
   `Settings → Secrets and variables → Actions → New repository secret`
   - Name: `CFBD_API_KEY`
   - Value: your CFBD key

4. **Enable GitHub Pages**:
   `Settings → Pages → Source: GitHub Actions`

5. **Trigger a manual deploy** in the Actions tab to publish the site immediately.

That's it — the site updates itself every day after that.

---

## Local Development

```bash
npm install
npm run dev        # http://localhost:5173/georgia-tech-football-2026/
npm run build      # Production build → dist/
npm run preview    # Preview built output
```

To run the data fetch script locally (requires `CFBD_API_KEY` in your environment):

```bash
export CFBD_API_KEY=your_key_here
node scripts/fetch-data.js
```

---

## Project Structure

```
georgia-tech-football-2026/
├── src/
│   ├── App.jsx                   # Tab nav, modal state, record calc
│   ├── main.jsx
│   ├── index.css                 # Tailwind + custom component classes
│   ├── components/
│   │   ├── RecordBanner.jsx      # W–L badge
│   │   ├── Schedule.jsx          # Game cards + win probability bars
│   │   ├── GameDetail.jsx        # Modal: matchup details, opponent info
│   │   └── Roster.jsx            # Depth chart + player cards
│   └── data/
│       ├── schedule.json         # Games, scores, win probabilities
│       ├── roster.json           # GT players by position group
│       └── opponents.json        # Opponent records + top players
├── scripts/
│   └── fetch-data.js             # Daily data fetch (ESPN + CFBD)
├── .github/workflows/
│   ├── fetch-data.yml            # Cron: 8:10am UTC daily
│   └── deploy.yml                # Build + deploy on push to main
├── vite.config.js
├── tailwind.config.js
└── package.json
```

---

## Data Sources

| Source | Data | Auth |
|---|---|---|
| ESPN (unofficial) | Schedule, scores, opponent records | None |
| CFBD API | Pregame win probabilities | Free API key |

---

## Schedule

| # | Date | Opponent | Location |
|---|------|----------|----------|
| 1 | Sep 5 | Colorado | Home |
| 2 | Sep 12 | Tennessee | Home |
| 3 | Sep 19 | Mercer | Home |
| 4 | Sep 26 | Stanford | Away |
| — | Oct 3 | BYE | — |
| 5 | Oct 10 | Duke | Home |
| 6 | Oct 17 | Virginia Tech | Away |
| 7 | Oct 24 | Boston College | Home |
| 8 | Oct 31 | Pittsburgh | Away |
| 9 | Nov 7 | Louisville | Home |
| 10 | Nov 14 | Clemson | Away |
| 11 | Nov 21 | Wake Forest | Home |
| 12 | Nov 28 | Georgia | Away |
