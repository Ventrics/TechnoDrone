# TechnoDrone Mobile Plan

Created: 2026-04-21

This folder captures the mobile-readiness plan for TechnoDrone so we can come back later and implement it in a controlled order.

The main conclusion: TechnoDrone should not be treated as a simple responsive resize. The desktop version is built around a wide playfield, side HUD, keyboard/mouse controls, and canvas-only UI. A good mobile version needs a deliberately different interaction model, especially for controls, HUD, tutorial, and leaderboard name entry.

## Source Reviewed

Important TechnoDrone files inspected:

- `index.html`
- `scripts/serve-static.mjs`
- `js/core.js`
- `js/player.js`
- `js/weapons.js`
- `js/ui.js`
- `js/ui-endscreens.js`
- `js/tutorial.js`
- `js/game.js`
- `js/pixi-post.js`
- `js/constants.js`

## Documents

- [Technical Findings](./technical-findings.md)
- [Priority Roadmap](./priority-roadmap.md)
- [Mobile UI Design Brief](./mobile-ui-design-brief.md)
- [Implementation Phases](./implementation-phases.md)
- [QA Checklist](./qa-checklist.md)

## North Star

Make TechnoDrone feel like a native mobile arcade shooter while preserving the desktop identity:

- Black-void neon arcade mood
- Heat and Flow State as core readability systems
- High-speed survival rhythm
- Premium, readable combat feedback
- Touch controls that feel intentional rather than bolted on

## Biggest Product Decision

We need to decide whether mobile is:

1. **Portrait-first mobile version**  
   Recommended. Most phone play happens portrait. This requires a redesigned HUD and control layer but creates a stronger mobile product.

2. **Landscape-only mobile version**  
   Faster to ship. It preserves more of the desktop layout but feels less native and still needs touch controls.

3. **Two-mode support**  
   Best long-term. Portrait is the default phone mode; landscape remains playable for people who rotate. Higher implementation cost.

Recommendation: build portrait-first, keep landscape as a secondary responsive layout.
