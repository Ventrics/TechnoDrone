# TechnoDrone — Rendering & Visual Overhaul Plan

## Context

The game plays well and is stable. The focus now shifts to presentation quality — improving enemy and ship visuals — and understanding the technology stack with an eye toward eventually shipping on Steam. This plan covers what's currently being used to render everything, what a better rendering stack looks like, and a phased roadmap from "browser game" to "Steam-ready product."

---

## Current Rendering Stack

**Everything is pure HTML5 Canvas 2D.** No WebGL. No libraries.

### How glow/bloom works today
1. **Per-object glow**: Every shape (ship, enemies, bullets) uses `ctx.shadowBlur` + `ctx.shadowColor` before each draw — 3–5 layered strokes per entity for depth
2. **Frame-level bloom**: A separate off-screen canvas at **0.5× resolution** captures bright points, then `ctx.filter = 'blur(10px)'` + `'lighter'` composite mode merges it back — gives the bloom halo effect

### Where the limits are
- `shadowBlur` is **CPU-rendered** in most browsers — it works fine now but doesn't scale well with more enemies or richer effects
- `ctx.filter = 'blur(10px)'` is also CPU-side — the bloom gets expensive at high resolutions
- No support for custom shader effects (chromatic aberration, scanlines, lens distortion, per-pixel color grading)
- No GPU particle instancing

---

## The Better Option: PixiJS

**PixiJS** is a WebGL-backed 2D renderer with a Canvas 2D-like API. It is the most practical upgrade for this game.

### Why PixiJS
- All rendering happens on the **GPU** — shadowBlur equivalent (glow filters), blur, and composite operations run as shaders
- Has a built-in **BloomFilter** that is dramatically higher quality than the current blur approach
- Supports custom **GLSL shaders** — chromatic aberration, CRT scanlines, color grading, per-object distortion
- Particle instancing via `ParticleContainer` — can handle 10,000+ particles without frame drops
- Still JavaScript/HTML — no engine change needed
- Ships in a browser or Electron identically

### Migration cost
- Game **logic is untouched** — `update()`, physics, stage system, audio, constants all stay exactly the same
- Only the **draw functions** need to be rewritten (drone.draw, shards.draw, fx.js particle rendering)
- Estimated scope: rewrite `player.js` draw section, `enemies.js` draw section, `fx.js`, and the bloom pass in `game.js`

---

## Steam Path: Electron

**Electron** wraps the game in a Chromium window and packages it as a native desktop app. This is how most HTML5 games ship to Steam.

### How it works
- Game code is **unchanged** — Electron just runs it without a browser
- Add **Steamworks.js** (the Steam SDK for JavaScript) for:
  - Leaderboard integration (can replace or supplement the current Supabase leaderboard)
  - Steam Achievements
  - Cloud saves
- Package with **electron-builder** → produces `.exe` on Windows, `.app` on Mac
- Submit to Steam via Steamworks dashboard as a normal app

### PixiJS + Electron = ideal combo
- PixiJS renders via WebGL which Electron exposes with full GPU access
- Better performance than pure Canvas 2D in a browser, even better than browser because Electron disables security sandboxing overhead
- This stack is what many successful indie shooters use (e.g. games by Photonstorm, some Itch.io titles)

---

## Visual Improvements (Can Do Now, Canvas 2D)

These are design-level changes that don't require a tech migration and would improve the look immediately:

### Player Ship
- Current: 6-point polygon with 4-layer stroke pass, engine ellipses, heat arc
- Potential improvements: sharper delta-wing silhouette refinement, more distinct engine glow positioning, thinner hull lines for a cleaner OLED look

### Standard Enemies (Shards)
- Current: equilateral triangle (3 sides), same shape at all 3 sizes
- Potential improvements: give each size tier a different polygon — small = triangle (3), medium = quad/diamond (4), large = pentagon (5) — so size is immediately readable by shape

### Elites
- Current: hexagon (6 sides) at 1.4× size
- Potential improvements: distinct inner detail (smaller concentric polygon), rotation speed that varies by stage

### Kamikazes
- Current: 6-point arrowhead with red flicker
- Could feel more threatening with a pointed, asymmetric shape

---

## Recommended Phased Approach

### Phase 1 (now): Visual redesign in Canvas 2D
- Refine ship hull shape
- Give the 3 enemy size tiers distinct polygon shapes
- Improve elite visual detail
- **Files:** `js/enemies.js` (makeShardShape, makeRegularPolygon, shards.draw), `js/player.js` (hull points array, draw layers)

### Phase 2 (next): PixiJS migration
- Replace Canvas 2D context with PixiJS Application
- Port draw functions to PixiJS Graphics/Sprite API
- Add BloomFilter (dramatically better than current blur pass)
- Add chromatic aberration shader for hit feedback
- **Files:** All of `js/` draw sections, `js/core.js` (canvas setup), `js/game.js` (render loop)

### Phase 3: Electron + Steam packaging
- Add `package.json`, Electron main process
- Integrate Steamworks.js for leaderboard + achievements
- Build pipeline with electron-builder
- **New files:** `main.js` (Electron entry), `package.json`, `build/` config

---

## Verification
- Phase 1: Load game in browser, verify all 3 enemy size tiers have visually distinct shapes, ship looks cleaner
- Phase 2: Confirm 60fps maintained, bloom visually superior to current blur, no regression in gameplay feel
- Phase 3: Launch as `.exe`, verify Steam overlay works, leaderboard posts correctly
