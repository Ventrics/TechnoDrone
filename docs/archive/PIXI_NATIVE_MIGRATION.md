# TechnoDrone — Full PixiJS Native Migration
## Handoff Document for Fresh Agent Sessions

---

## What This Is

TechnoDrone is a space shooter game currently running a **hybrid rendering architecture**:
- All game entities draw to a hidden Canvas2D surface (`#gameCanvas`)
- A PixiJS compositor (`pixi-post.js`) reads that canvas as a texture each frame and applies GPU post-processing filters to a visible WebGL canvas (`#pixi-canvas`)

This document is the execution plan to **replace the Canvas2D rendering entirely** with a native PixiJS scene graph. Game logic (physics, hit detection, state machines, audio) stays completely untouched. Only the `draw()` functions and the compositor layer change.

## Important Status Note — Read Before Continuing

The full native PixiJS gameplay rewrite is **not** the current visual source of truth.

As of 2026-04-14, the project direction is:
- **Preferred baseline:** Canvas 2D gameplay rendering with `shadowBlur` glow, composited by `pixi-post.js`
- **Why:** that hybrid "middle-ground" version currently looks better than the sharper native Pixi gameplay pass
- **Native Pixi gameplay rendering:** still useful as an experiment and future path, but it should stay opt-in / parked until it matches the hybrid look first

Practical rule for agents:
- If a Pixi-native gameplay change makes ships, enemies, bullets, particles, or FX look flatter, sharper, more aliased, or less luminous than the Canvas version, treat that as a visual regression
- Do not promote native gameplay layers as the default render path until parity is reached
- PixiJS remains valuable for GPU compositing, post-processing, performance headroom, and future shader-style effects. Near-term, the target architecture is **Canvas gameplay + Pixi enhancement**

This document is still useful for long-term migration planning, but until parity is proven, agents should prioritize restoring and preserving the hybrid baseline over finishing the native rewrite.

---

## Project Location

```
C:/Users/brian/Downloads/Anti gravity/Projects/TechnoDrone/
```

---

## Current File Map

```
js/
  core.js         — Canvas setup, input handling, save management (DO NOT TOUCH)
  game.js         — Main render loop, game state, HUD composition
  player.js       — Player ship update() + draw()
  enemies.js      — All enemy types update() + draw()
  weapons.js      — Bullets, enemy bullets, screen nuke
  fx.js           — 5 particle systems (fragments, burst, sparks, smoke, impact)
  starfield.js    — Parallax star background + nebula
  wavefield.js    — Title screen wave effect (low priority, touch last)
  stage.js        — Stage timing, kill tracking, shake/flash state (DO NOT TOUCH)
  audio.js        — Audio system (DO NOT TOUCH)
  ui.js           — HUD elements, menus, title screen
  tutorial.js     — Tutorial state machine (DO NOT TOUCH)
  pixi-post.js    — Current GPU compositor (will be rebuilt as scene manager)
  constants.js    — Color palette, stage config (DO NOT TOUCH)

vendor/
  pixi.min.js         — PixiJS WebGL renderer
  pixi-filters.js     — Filter library (AdvancedBloomFilter, GlowFilter, CRTFilter, etc.)
```

---

## Core Architecture Principle

**The game logic and rendering must stay decoupled.**

Every entity already has an `update(delta)` function and a `draw()` function. The migration replaces `draw()` with a PixiJS display object that gets updated each frame. The pattern is:

```
// BEFORE (Canvas2D):
draw() {
  ctx.beginPath();
  ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
  ctx.fillStyle = this.color;
  ctx.fill();
}

// AFTER (PixiJS):
initGfx(stage) {
  this.gfx = new PIXI.Graphics();
  stage.addChild(this.gfx);
}

syncGfx() {
  this.gfx.clear();
  this.gfx.beginFill(hexToInt(this.color), 1.0);
  this.gfx.drawCircle(this.x, this.y, this.r);
  this.gfx.endFill();
}
```

`syncGfx()` gets called from `update()` or from the main render loop after all updates.

---

## Visual Style Reference (OLED Neon Aesthetic)

The game is built around these principles — every migrated entity must preserve them:

- **Near-black background:** `#050505` play area fill
- **Multi-layer glow:** Each entity has 3 render passes: wide soft bloom fill → corona stroke → sharp white edge
- **Color palette:**
  - Player: Cyan `#31afd4`, white edges
  - Enemies (stage-dependent): White `#f5f7ff` / Cyan `#00e5ff` / Deep blue `#003b8e`
  - Elite enemies: Always red `#ff1133`
  - Flow State: Magenta `#e040fb` / `#fb29fd`
  - Danger: Red `#ff3300`, Orange `#ff8800`
  - Gold/rewards: `#f5c542`, `#ffb020`
- **Glow method (current):** `ctx.shadowBlur` — replace with PixiJS `GlowFilter` on the entity's container, or draw explicit soft-fill circles underneath the hard geometry
- **Line weights:** Outer glow ~1.8px, hard edge ~0.7–1.2px

---

## PixiJS Scene Graph Structure

Build this layer stack in `pixi-post.js` (rename/repurpose to `pixi-scene.js`):

```
PIXI.Application
└── app.stage
    ├── bgLayer          — starfield, nebula gradient
    ├── gameLayer        — all game entities (clipped to play area via mask)
    │   ├── particleLayer    — fx.js particles (use ParticleContainer where possible)
    │   ├── entityLayer      — enemies, pickups, bullets
    │   └── playerLayer      — player ship (always on top of entities)
    ├── fxLayer          — screen flashes, nuke rings (above clip mask)
    └── hudLayer         — all UI text, HUD elements (Canvas2D text → PIXI.Text)
```

Apply filters at the `gameLayer` level, not `app.stage`, so HUD stays crisp:
```js
gameLayer.filters = [bloomFilter, adjFilter, caFilter];
app.stage.filters = [colorFilter, crtFilter]; // color grade + vignette on everything
```

---

## Migration Scope by File

### Priority 1 — Particles: `fx.js`
**Reason:** Biggest CPU performance gain. Particles are the heaviest `ctx.shadowBlur` users.

**Approach:**
- Use `PIXI.ParticleContainer` for fragments, burst particles, hit sparks
- `PIXI.Graphics` for impact rings (they animate radius/alpha individually)
- Smoke particles: simple `PIXI.Graphics` circles, addChild/removeChild on spawn/death
- Each particle system gets an `initGfx(layer)` call once, then `syncGfx()` each frame
- Remove all `ctx.shadowBlur` from fx.js — glow comes from the bloom filter on the layer

**Particle systems to migrate:**
1. `fragments` — spinning shards on enemy death
2. `burstParticles` — expanding ring circles on kill
3. `hitSparks` — directional spark trails
4. `impactFX` — hit rings + kill flash rings
5. `smokeParticles` — drifting smoke puffs

---

### Priority 2 — Background: `starfield.js`
**Reason:** Simple, low-risk, sets up the bgLayer correctly.

**Approach:**
- Each star becomes a `PIXI.Graphics` dot (or tiny sprite from a 2×2 white texture)
- 5 parallax layers → 5 `PIXI.Container` objects scrolled at different speeds
- Twinkle effect: animate `alpha` on each star object
- Nebula gradient: render once to a `PIXI.RenderTexture`, display as static `PIXI.Sprite`

---

### Priority 3 — Enemies: `enemies.js`
**Reason:** Most entities on screen, highest draw call count.

**Enemy types to migrate:**
- Shards (triangle/diamond/pentagon by size)
- Elite shards (hexagon, red)
- Kamikazes (asymmetric arrowhead)
- Turrets (octagon + center dot + optional targeting ring + charge glow)
- Shield drones (counter-rotating diamond + tether line)
- Bonus rings / jackpot stars
- Obstacle gates

**Approach:**
- Each enemy gets a `PIXI.Container` with child `PIXI.Graphics` objects for each layer (glow fill, corona, hard edge)
- On `spawn()`: create and addChild to entityLayer
- On `death()`: removeChild and pool the container for reuse
- For the 3-layer glow: draw a soft large-radius filled polygon at low alpha (glow layer), then stroke at full alpha (edge layer) — same visual effect as shadowBlur but GPU-native
- HP bars: `PIXI.Graphics` rect updated each frame (only visible when recently hit)
- Shield tether: `PIXI.Graphics` line, `moveTo/lineTo`, updated each frame
- Flash on hit: set `container.tint = 0xffffff` for flash duration, then restore

---

### Priority 4 — Player Ship: `player.js`
**Reason:** Most complex single entity, lots of state-dependent visual layers.

**Ship layers to build as child Graphics:**
1. `glowEllipse` — soft filled ellipse behind ship (varies by state)
2. `engineL`, `engineR` — engine exhaust glow + white core dot
3. `hullFill` — polygon fill at low alpha
4. `hullMid` — polygon stroke at 28% alpha, 3px
5. `hullEdge` — polygon stroke at 65% alpha, 1.2px
6. `hullCap` — polygon stroke at 100%, 0.6px
7. `flowGlow` — outer magenta stroke, only visible during Flow State
8. `panelLines` — internal pink cross lines
9. `heatArc` — 270° arc, color-coded by heat level (use PIXI.Graphics arc)

**State-driven updates:**
- `flowStateActive`: enable flowGlow layer, shift engine colors to magenta
- `overheated`: shift glow color to red-orange, add flame shapes behind engines
- `nearDeath` (lives === 1): flicker alpha with sin wave, add red dashed hull marks
- `dashActive`: set hullEdge to white, boost engine exhaust scale

---

### Priority 5 — Weapons: `weapons.js`
**Entities:**
- Player bullets (pool of ~30)
- Enemy bullets (pool of ~20)
- Screen nuke rings (4 animated concentric rings)

**Approach:**
- Bullets: pool of `PIXI.Graphics` circles, reuse on fire/expire
- Nuke rings: 4 `PIXI.Graphics` objects, update radius/alpha/width each frame during active nuke
- Alt-fire types (spread, laser if present): each gets its own Graphics object

---

### Priority 6 — Game Loop + HUD: `game.js` + `ui.js`
**This is the wiring pass — do last.**

**`game.js` changes:**
- Remove the entire `render()` Canvas2D pipeline
- New render loop: call `update()` for all systems, then `syncGfx()` for all display objects, then `pixiScene.render()`
- Remove `drawVignetteAndScanlines()` call (already handled by CRTFilter)
- Remove Canvas2D shake translate (already handled by sprite offset)
- Keep all game state logic (gameState machine, stage transitions, etc.)

**`ui.js` changes:**
- HUD text elements → `PIXI.Text` objects on hudLayer
- Score, kills, lives, heat status, stage label, timer bar
- Use `anatol-mn` font (loaded via Adobe Fonts kit `bft6law`) — ensure font is loaded before creating PIXI.Text
- Menus (title, death, pause) → `PIXI.Container` with `PIXI.Text` + `PIXI.Graphics` elements
- The stage timer bar → `PIXI.Graphics` rect updated each frame

---

### Low Priority — Title Screen: `wavefield.js`
- Simplex noise wave effect — can stay as Canvas2D for now or be migrated as a `PIXI.Graphics` line update each frame
- Not in the critical path for gameplay quality

---

## The `pixi-post.js` → `pixi-scene.js` Rewrite

The current `pixi-post.js` is a texture compositor. After migration it becomes the **scene manager**.

**New responsibilities:**
```js
const pixiScene = (() => {
  // Layers
  let app, bgLayer, gameLayer, particleLayer, entityLayer, playerLayer, fxLayer, hudLayer;
  // Filters (already built — keep the same filter setup)
  let colorFilter, bloomFilter, adjFilter, caFilter, crtFilter;

  function init() { /* create app, build layer stack, init filters */ }
  function render() { /* app.renderer.render(app.stage) */ }

  // State hooks (same API as before)
  function triggerHit() { /* spike caIntensity */ }
  function triggerShake(intensity) { /* sprite offset */ }
  function setFlowState(active) { /* lerp colorFilter */ }
  function setStage(n) { /* adjFilter preset */ }
  function setNearDeath(active) { /* crtFilter vignette color */ }

  // Layer accessors (used by entity files to addChild/removeChild)
  function getBgLayer()       { return bgLayer; }
  function getEntityLayer()   { return entityLayer; }
  function getParticleLayer() { return particleLayer; }
  function getPlayerLayer()   { return playerLayer; }
  function getFxLayer()       { return fxLayer; }
  function getHudLayer()      { return hudLayer; }

  return { init, render, triggerHit, triggerShake, setFlowState, setStage, setNearDeath,
           getBgLayer, getEntityLayer, getParticleLayer, getPlayerLayer, getFxLayer, getHudLayer };
})();
```

---

## Play Area Clipping

Currently done via `ctx.rect() + ctx.clip()`. In PixiJS, apply a rectangular mask to `gameLayer`:

```js
const playMask = new PIXI.Graphics();
playMask.beginFill(0xffffff);
playMask.drawRect(PLAY_X, PLAY_Y, PLAY_W, PLAY_H);
playMask.endFill();
gameLayer.mask = playMask;
```

`fxLayer` and `hudLayer` go outside the mask so full-screen effects (hit flash, activation flash, HUD) aren't clipped.

---

## Color Utility

Canvas2D uses hex strings (`'#31afd4'`). PixiJS needs integers (`0x31afd4`). Add this utility once in `constants.js` or at the top of the scene file:

```js
function hexToInt(hex) {
  return parseInt(hex.replace('#', ''), 16);
}
```

---

## Verification Checkpoints

Test each system independently before moving to the next:

1. **Particles** — kill an enemy, confirm fragment burst + hit sparks + smoke all appear correctly. Check impact rings animate properly.
2. **Starfield** — confirm 5 parallax layers scroll at different speeds, stars twinkle.
3. **Enemies** — spawn each type (shard, elite, kamikaze, turret, shield drone). Confirm 3-layer glow looks right. Hit an enemy — confirm white flash, HP bar. Kill it — confirm death burst.
4. **Player** — confirm ship renders all layers. Enter Flow State — confirm magenta glow + engine color shift. Overheat — confirm flame effect. Take a hit — confirm near-death flicker at 1 life.
5. **Weapons** — fire bullets, confirm glow. Fire nuke — confirm 4 rings animate outward.
6. **HUD** — confirm all text renders with correct font, score updates, stage label shows, timer bar fills.
7. **Full game loop** — play through a complete run. Stage transitions, screen shake on hit, Flow State activation, nuke, death screen.

---

## What NOT to Touch

- `core.js` — input handling, canvas setup, save system
- `stage.js` — stage timing, kill counting, shake/flash state (the state lives here, only the visual expression moves to PixiJS)
- `audio.js` — untouched
- `tutorial.js` — untouched
- `constants.js` — untouched (add `hexToInt` utility here if desired)
- All game physics, collision detection, entity position/velocity logic

---

## Agent Split Recommendation

**Agent 1:** `fx.js` + `starfield.js` + `pixi-post.js` → `pixi-scene.js` foundation
- Build the scene graph skeleton first
- Migrate particles (biggest performance win)
- Migrate background
- Result: game renders bg + particles in PixiJS, entities still Canvas2D (hybrid for now)

**Agent 2:** `enemies.js` + `weapons.js` + `player.js`
- Migrate all game entities
- Depends on Agent 1 having the layer accessors ready (`getEntityLayer()`, etc.)
- Can work on entity Graphics code independently, wire up to layers at the end

**Final pass (single agent):** `game.js` + `ui.js`
- Remove Canvas2D render pipeline
- Wire HUD to PIXI.Text on hudLayer
- Full verification run

---

## Success Criteria

The migration is complete when:
- `#gameCanvas` can be removed from the DOM entirely (no Canvas2D rendering)
- `ctx` is only referenced in `core.js` (for input/event capture surface) and nowhere else
- The game plays identically to before visually
- 60fps maintained with 20+ enemies + full particle load
- Per-entity GPU effects are now possible (GlowFilter on elites, MotionBlurFilter on bullets, etc.)
