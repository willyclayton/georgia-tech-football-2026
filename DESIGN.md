# Design System: Georgia Tech Football

Guided by [Impeccable](https://github.com/pbakaus/impeccable) craft rules, remapped to official Georgia Tech athletics brand.

## Creative North Star

Dark navy lacquer, Tech Gold as the only brand accent, official interlocking GT mark from ESPN/GT assets. Flat surfaces, hairline rules, small radii. Product proof over decoration.

## Colors (official)

| Token | Hex | Use |
|---|---|---|
| navy | `#051E39` | Page ground |
| navyLift | `#0A2A4D` | Raised panels |
| navyDeep | `#030F1C` | Insets / tab bar |
| gold | `#B39051` | Brand accent, CTAs, active |
| goldSoft | `#C4A86A` | Hover / secondary gold |
| white | `#FFFFFF` | Primary text |
| mist | `rgba(255,255,255,0.72)` | Body secondary |
| mistDim | `rgba(255,255,255,0.42)` | Meta |
| line | `rgba(255,255,255,0.12)` | Hairlines |

Source: [Georgia Tech Brand Guide](https://brand.gatech.edu) / Athletics Brand Guidelines (Tech Gold `#B39051`, Navy `#051E39`).

## Typography

- Display / wordmark: Space Grotesk (tracked uppercase for brand)
- Body / UI: DM Sans
- Avoid Inter, Roboto, system defaults as primary faces

## Rules

1. **Gold carries brand.** One accent. No magenta, cyan, or purple.
2. **Hairline first.** Prefer 1px rules over shadows.
3. **No fake marks.** Only ESPN/GT-hosted logo PNGs.
4. **No nested cards.** Rows and hairlines, not card stacks.
5. **Small radii.** 2–10px. No pill clusters.
6. **Motion is functional.** Staggered fade-in, pulse on next game only.

## Logos

Local copies of ESPN NCAA team art (id `59`):

- `assets/images/gt-logo.png`
- `assets/images/gt-logo-dark.png`
- `assets/images/gt-primary-on-black.png`

Opponent logos load from `a.espncdn.com/i/teamlogos/ncaa/500/{id}.png`.
