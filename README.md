# TechnoDrone

TechnoDrone is a browser-based top-down survival shooter with a neon arcade feel. The player pilots a drone through a 10-stage, 5-minute run built around movement, heat management, Flow State, and escalating combat pressure.

The project is designed as a clean portfolio piece: readable combat, sharp feedback, a dark holographic visual identity, and a static-web build that can run in a browser.

## Features

- 10-stage time-based survival structure
- Heat, overheat, dash, Flow State, alt-fire, and Base Drop systems
- Turrets, kamikazes, shield drones, shielded enemies, formations, and obstacle gates
- Canvas 2D gameplay rendering with PixiJS presentation/compositing
- Local save data and Supabase-backed leaderboard support
- Commissioned soundtrack and in-engine audio synthesis

## Controls

| Input | Action |
|---|---|
| `A` / `D` or arrow keys | Move |
| `J` or mouse | Primary fire |
| `Space` + direction | Dash |
| `K` | Alt-fire |
| `Q` | Base Drop |
| `Esc` | Pause / back |

## Run Locally

This is a static browser project. From the project folder:

```bash
node scripts/serve-static.mjs
```

Then open:

```text
http://127.0.0.1:4173
```

You can also serve the folder with any static web server.

If your terminal allows npm scripts, `npm run start` runs the same server.

## Tech Stack

- HTML5
- JavaScript
- Canvas 2D
- PixiJS
- Web Audio API
- Supabase leaderboard

## AI-Assisted Build Note

TechnoDrone was built with AI-assisted iteration during development. Final direction, tuning, play feel, file organization, and presentation choices are kept under human review.

## Portfolio Assets

Screenshots, logo exports, and short clips should live under `assets/`. See `PORTFOLIO_ASSETS.md` for the upload checklist.

Recommended public media:

- `assets/brand/technodrone-logo.svg`
- `assets/brand/technodrone-logo.png`
- `assets/screens/title.png`
- `assets/screens/gameplay.png`
- `assets/screens/flow-state.png`
- `assets/screens/game-over.png`
- `assets/media/gameplay-clip.mp4`

## Credits And Notices

- Audio credits: `AUDIO_CREDITS.md`
- Brand notes: `BRAND_NOTES.md`
- Privacy note: `PRIVACY.md`
- Third-party notices: `THIRD_PARTY_NOTICES.md`

## Current Status

This folder has been organized for portfolio presentation while preserving the existing game behavior. Internal design and agent notes are kept in `docs/internal/`.
