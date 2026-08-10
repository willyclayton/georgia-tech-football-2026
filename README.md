# Georgia Tech Football

Sleek Yellow Jackets football companion — roster, depth/field/playbook, schedule calendar, standings, and Ask Buzz.

Built as an Expo (React Native + web) iPhone-first app. Live: [gt-football.vercel.app](https://gt-football.vercel.app)

## Features

- **Home** — next game hero, team pulse, ones to watch, schedule strip
- **Roster** — searchable roster with unit / position filters
- **Depth** — list, field X/O view, and offense/defense playbooks
- **Schedule** — list + calendar with home/away pills; tap teams for results
- **Standings** — ACC + national context
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

Roster, schedule, depth, and opponents live in `data/live.json`. Refresh from ESPN:

```bash
npm run sync
```

Playbook copy lives in `data/playbook.ts` (scheme education tied to current depth chart starters).

### Ask Buzz (Version A)

Grounded answers come from a committed knowledge corpus — no fine-tuning, no API key, no per-query cost:

1. Curated FAQ: `data/ask-faq.json` (rivalry, stadium, traditions, limits)
2. Generated facts: `npm run build:ask` expands `live.json` + FAQ into `data/ask-knowledge.json`
3. At query time: Fuse.js fuzzy-matches the question in the client and returns the best canned answer

`npm run sync` and `npm run build:web` both rebuild the knowledge file.

## Deploy

```bash
npx expo export -p web
npx vercel --prod
```
