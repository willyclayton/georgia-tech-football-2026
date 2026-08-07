# Georgia Tech Football

Sleek Yellow Jackets football companion — roster, depth/field/playbook, schedule calendar, standings, and Ask Buzz.

Built as an Expo (React Native + web) iPhone-first app. Live: [gt-football.vercel.app](https://gt-football.vercel.app)

## Features

- **Home** — next game hero, team pulse, ones to watch, schedule strip
- **Roster** — searchable roster with unit / position filters
- **Depth** — list, field X/O view, and offense/defense playbooks
- **Schedule** — list + calendar with home/away pills; tap teams for results
- **Standings** — ACC + national context
- **Ask Buzz** — grounded answers from app data (says “dunno” instead of inventing)

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

## Deploy

```bash
npx expo export -p web
npx vercel --prod
```
