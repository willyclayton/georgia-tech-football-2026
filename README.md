# Georgia Tech Football

Sleek Yellow Jackets football companion — roster, depth/field/playbook, schedule calendar, standings, and Ask Buzz.

Built as an Expo (React Native + web) iPhone-first app. Live: [gt-football.vercel.app](https://gt-football.vercel.app)

## Features

- **Home** — next game hero, 2026 pulse, season news, polls, ones to watch
- **Roster** — searchable roster with unit / position filters
- **Depth** — list, field X/O view, and offense/defense playbooks
- **Schedule** — list + calendar; tap teams for their 2026 slate (2025 opponent results wiped)
- **Standings** — 2026 ACC + AP/Coaches, with a 2025 toggle
- **Ask Buzz** — free local Q&A over a curated knowledge file (Fuse.js retrieval; says “dunno” instead of inventing)

## Stack

- Expo SDK 57 + expo-router
- TypeScript
- Static web export (Vercel)

## Develop

```bash
npm install
npm run web
```

## Data

Roster, 2026 slate, depth, polls, and news live in `data/live.json`. Opponent pages show the current season only (blank until they play). Refresh from ESPN:

```bash
npm run sync        # roster + 2026 slate; reuse career stats
npm run sync:full   # also refetch every career line
```

Saturday (and Sunday morning) GitHub Actions run `npm run sync` and commit if the slate moved. Vercel also hits `/api/pulse` on that cadence so Home / Standings / opponent pages can overlay live scores without waiting on a rebuild.

Playbook copy lives in `data/playbook.ts` (scheme education tied to current depth chart starters).

### Ask Buzz (Version A)

Grounded answers come from a committed knowledge corpus — no fine-tuning, no API key, no per-query cost:

1. Curated FAQ: `data/ask-faq.json` (rivalry, stadium, traditions, limits)
2. Staff + fan clusters: `data/ask-staff.json`, `data/ask-fan-qa.json` (~250-question themes: coaches, expectations dunno, NIL/gameday limits)
3. Alias / paraphrase banks: `data/ask-aliases.json` (UGA/VT slang, transfer/bio/elig phrasings)
4. Generated facts: `npm run build:ask` expands live data + FAQ into `data/ask-knowledge.json` (players, depth/QB1/RB1/ST, schedule openers/UGA site, portal counts, …)
5. At query time: Fuse.js + entity/intent ranking (player-specific beats group lists; shared last names prefer starters)

`npm run sync` and `npm run build:web` both rebuild the knowledge file. Smoke: `npm run test:ask`.

## Deploy

```bash
npx expo export -p web
npx vercel --prod
```
