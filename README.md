# Georgia Tech Football

Sleek Yellow Jackets football companion — roster, player details, depth chart, and 2026 schedule.

Built as an Expo (React Native + web) iPhone-first app in the same spirit as the [Braves app](https://github.com/willyclayton/braves-app).

## Features

- **Home** — next game hero, team pulse, ones to watch, schedule strip
- **Roster** — 110-player searchable roster with unit / position filters
- **Depth Chart** — projected offense, defense, and special teams
- **Schedule** — full 2026 slate with home / away / ACC filters
- **Player detail** — bio, tags, depth role, quick facts

## Stack

- Expo SDK 57 + expo-router
- TypeScript
- react-native-reanimated
- Static web export (Vercel-ready)

## Develop

```bash
npm install
npm run web
```

## Data

Roster and schedule live in `data/live.json`, typed through `data/tech.ts`. Sources: Georgia Tech Athletics official roster / ACC schedule, with fall-camp depth projections.
npm run web
```

## Ask Buzz

Player/roster questions are answered first by a **local grounded engine** (no API cost, no hallucinations on jersey/transfer facts).

For open-ended questions the local engine cannot match, the app can call a free **Groq** LLM (`llama-3.1-8b-instant`) via `/api/ask`, still constrained to `data/live.json`.

1. Create a free key at [console.groq.com](https://console.groq.com)
2. Add it to Vercel:

```bash
npx vercel env add GROQ_API_KEY
# Production → paste key
npx vercel --prod
```

Without `GROQ_API_KEY`, Ask Buzz still works using the local engine only.

## Deploy

```bash
