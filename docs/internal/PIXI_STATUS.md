# TechnoDrone Pixi Status

> Active reference for the current Pixi layer. Keep this short and update it when the renderer direction changes.

## Current Baseline
TechnoDrone is still a hybrid renderer:
- Canvas 2D owns gameplay drawing and glow-heavy ship/enemy visuals
- PixiJS owns compositing, post-processing, and screen presentation
- `js/pixi-post.js` is the main Pixi coordination layer

## Active Pixi Work
The current Pixi surface is focused on presentation polish:
- screen transitions
- death glitch burst
- near-death red vignette
- title wordmark bloom
- win-screen presentation cleanup

## Safe Touch Points
When working on Pixi presentation, the usual coordination files are:
- `js/pixi-post.js`
- `js/game.js`
- `js/ui.js`

Avoid widening the surface into gameplay draw rewrites or vendor changes unless the task is explicitly about renderer migration.

## Archived Planning Docs
Historical Pixi planning docs live in `docs/archive/`:
- `docs/archive/PIXI_PLAN.md`
- `docs/archive/PIXI_NATIVE_MIGRATION.md`
- `docs/archive/PIXI_UI_PLAN.md`

If the Pixi direction changes again, update this file first and keep the older plans archived.
