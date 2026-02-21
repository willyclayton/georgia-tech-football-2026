# Personal Project: Georgia Tech Football 2026

## What It Is

A static web app that gives casual Georgia Tech football fans a clean, single-page dashboard for the 2026 season — schedule, live scores, win probabilities, and a depth chart. No login, no subscription, no ads. Just open the link and see the season.

---

## Technologies Used

| Category | Technology |
|---|---|
| Markup | HTML5 |
| Styling | CSS3, Tailwind CSS |
| JavaScript | ES2022+ (modules, async/await, fetch API) |
| UI Framework | React 18 |
| Build Tool | Vite 5 |
| Runtime | Node.js (data fetch script) |
| CI/CD | GitHub Actions (YAML workflows) |
| Hosting | GitHub Pages |
| Data APIs | ESPN unofficial REST API, College Football Data API (CFBD) |
| Version Control | Git / GitHub |

---

## Purpose and What Makes It Different

Most college football fan apps are either paywalled (ESPN+, 247Sports), bloated with ads, or require constant manual updates. This one is:

- **Completely free** — $0 in hosting, $0 in API costs, forever
- **Zero maintenance** — a GitHub Actions cron job fetches fresh data every morning at 8am and automatically redeploys the site without any manual intervention
- **GT-specific** — built around the exact 2026 schedule, roster, and key players (Justice Haynes, the Haynes/Hosley DB duo, OC George Godsey's first year), not a generic template
- **Honest about uncertainty** — win probability bars are shown for upcoming games so fans can see how each matchup is expected to play out, not just raw results

The core novelty is the fully automated data pipeline: ESPN and CFBD APIs → Node.js script → GitHub auto-commit → GH Pages rebuild. The user never has to touch the site after the initial 5-minute setup.

---

## Lessons Learned

**GitHub Actions as a data pipeline is underrated.** Using a scheduled workflow to fetch API data, commit JSON files, and trigger a redeploy is a surprisingly clean architecture for low-frequency data that doesn't need a real backend. No server costs, no uptime concerns.

**Vite's `base` config is easy to get wrong on GitHub Pages.** Since GH Pages serves from a subpath (`/repo-name/`), forgetting to set `base: '/georgia-tech-football-2026/'` in `vite.config.js` breaks all asset paths silently. It was one of the first things to lock in.

**Unofficial ESPN API is powerful but undocumented.** The `site.api.espn.com` endpoints return rich data with no authentication required, but the shape of the response can vary by team and season. Building a merging strategy that falls back to seeded data when the API returns nothing unexpected is essential for resilience.

**Seeding data upfront pays off.** Rather than waiting for the season to start to show anything, pre-seeding the schedule with projected win probabilities and opponent info means the app is useful from day one, even before a single game is played.

**Component decomposition kept complexity manageable.** Splitting the UI into `Schedule`, `GameDetail`, `Roster`, and `RecordBanner` made each piece easy to reason about independently. The modal state and tab state living in `App.jsx` kept prop drilling shallow without needing a state library.
