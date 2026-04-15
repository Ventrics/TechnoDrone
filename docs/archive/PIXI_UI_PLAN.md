# TechnoDrone — PixiJS UI & Transition Enhancements
## Codex Agent Handoff

---

## Background

TechnoDrone uses a **hybrid rendering pipeline**:
- All game entities and UI draw to a hidden Canvas 2D surface (`#gameCanvas`, opacity 0)
- `js/pixi-post.js` reads that canvas as a GPU texture each frame and composites it through PixiJS WebGL (`#pixi-canvas`, visible)
- Post-processing filters are applied to `contentRoot`: `ColorMatrixFilter` (color grading) + `RGBSplitFilter` (chromatic aberration on hits)
- `pixi-filters.js` is already loaded — AdvancedBloomFilter, GlowFilter, CRTFilter, GodrayFilter, PixelateFilter, GlitchFilter are all available

**What exists in `pixi-post.js` today:**
```
app.stage
  ├── contentRoot              ← filters: [colorFilter, caFilter]
  │     ├── bgRoot             ← native bg layer (disabled, nativeLayerFlags.bg = false)
  │     ├── canvasGlowSprite   ← blurred canvas copy, SCREEN blend, alpha ~0.13
  │     ├── canvasSprite       ← main game canvas texture (read each frame)
  │     ├── worldRoot          ← native entity layers (all disabled)
  │     ├── fxLayer            ← native fx layer (disabled)
  │     └── overlayRoot        ← stageOverlay, flowOverlay, dangerOverlay (PIXI.Graphics)
  └── hudLayer                 ← native hud layer (disabled)
```

`overlayRoot` sits above the canvas texture — objects added here composite over Canvas 2D content with GPU blending. `dangerOverlay` is a PIXI.Graphics that exists but is `.clear()`'d every frame — it's ready to use.

**Key existing API in `pixiPost`:**
- `triggerHit()` — spikes caIntensity to 4.5 (RGBSplit chromatic aberration)
- `setNearDeath(active)` — toggles near-death state, currently only bumps saturation slightly
- `setFlowState(active)` — lerps flow blend, drives colorFilter + flowOverlay
- `setStage(n)` — sets stage level for color grading

**All game logic, physics, and Canvas 2D drawing stays completely untouched.** These features are purely additive PixiJS layers on top.

---

## Feature 1 — Screen Transition System
**Priority: High | Files: `pixi-post.js`, `game.js`**

Currently there are **zero transitions between game states** — every state change is a hard cut. This feature adds a `transitionLayer` PIXI.Container at the top of `app.stage` (above hudLayer) that animates independently during state changes.

### New API
```js
pixiPost.startTransition(type, onMidpoint, onComplete)
```
- `onMidpoint` — callback fired at the transition's midpoint (when the old state is fully hidden). Caller changes `gameState` here.
- `onComplete` — callback fired when the transition finishes (optional cleanup).

### Transition Types

**`'fade'`** — Baseline for all transitions
- PIXI.Graphics rect fills screen: alpha 0 → 1 over 300ms, onMidpoint fires, alpha 1 → 0 over 300ms
- Color: `0x000000`
- Use for: title → tutorial, tutorial → playing, leaderboard → title

**`'glitch'`** — Digital death transition
- Spike `caIntensity` to 16 (contentRoot RGBSplitFilter goes wild)
- Apply `PIXI.filters.GlitchFilter({slices: 8, offset: 20, fillMode: 2})` to `contentRoot` for 400ms, then remove
- White flash overlay (alpha 0 → 0.4 → 0) over 200ms
- onMidpoint fires at 200ms
- Total duration: ~600ms
- Use for: playing → gameOver (player death)

**`'pixelate'`** — Arcade dissolve
- Apply `PIXI.filters.PixelateFilter(1)` to `contentRoot`
- Animate pixelate size: 1 → 32 over 300ms, onMidpoint fires, 32 → 1 over 300ms
- Use for: gameOver → title, win → title, stage clear (if a stage-clear screen is added later)

**`'crt-off'`** — CRT monitor death
- Animate `contentRoot.scale.y`: 1 → 0.04 over 400ms (screen squishes to horizontal line)
- Simultaneously: `contentRoot.scale.x`: 1 → 1.08 (slight horizontal stretch as it squishes)
- At scale.y = 0.04: white flash (alpha 0 → 0.6), then fade to black
- onMidpoint fires at 400ms
- Reset scale after onComplete (new state draws at full scale)
- Use for: alternative to glitch for game over — more dramatic/cinematic

### Implementation Notes
- `transitionLayer` must be the **last child** of `app.stage` so it renders above everything
- All transition timers use `performance.now()` deltas in the `render()` loop — no `setTimeout`
- Active transition state: `{ type, startTime, phase: 'out'|'in', onMidpoint, onComplete, midpointFired }`
- `render()` checks active transition each frame and updates accordingly
- If a transition is already active when `startTransition()` is called, skip (can't stack transitions)

### `game.js` integration
Wrap every `gameState = 'xxx'` assignment in a transition call. Example:
```js
// BEFORE:
gameState = 'title';

// AFTER:
pixiPost.startTransition('fade', () => { gameState = 'title'; });
```

Key transition assignments to find in `game.js`:
- Death → `gameState = 'gameOver'` or `gameState = 'nameEntry'`: use `'glitch'`
- Win → `gameState = 'win'`: use `'pixelate'`
- Title → `gameState = 'playing'`: use `'fade'`
- Any screen → `gameState = 'title'`: use `'fade'`

---

## Feature 2 — Death Event Glitch Burst
**Priority: High | Files: `pixi-post.js`, `game.js`**

When the player dies, the screen should tear apart before settling into the death/game-over state. The RGBSplitFilter is already wired — this just extends it.

### New API
```js
pixiPost.triggerDeath()
```

### Implementation
In `pixi-post.js`:
1. Spike `caIntensity` to 18 (vs. 4.5 for a normal hit)
2. Set `deathGlitchTimer = performance.now()` — drives a 800ms PixelateFilter spike
3. In `render()`, if deathGlitchTimer is active:
   - t = (now - deathGlitchTimer) / 800  (0 → 1)
   - pixelSize = Math.round(1 + 10 * Math.sin(t * Math.PI))  (bell curve: 1→8→1)
   - Apply/update a `PIXI.filters.PixelateFilter(pixelSize)` on `contentRoot`
   - At t >= 1: remove PixelateFilter, clear deathGlitchTimer
4. Red-wash `stageOverlay`: fill entire screen with `0xff0000` at alpha 0.25, decay over 600ms

**Filter management:** PixelateFilter should be added to `contentRoot.filters` array during the burst and removed after — don't leave it in the filter chain permanently.

### `game.js` integration
Find the spot in `game.js` where player lives reach 0 and game-over is triggered. Call `pixiPost.triggerDeath()` at that moment, before the state changes.

---

## Feature 3 — Near-Death Danger Overlay
**Priority: Medium | Files: `pixi-post.js` only**

`dangerOverlay` is a `PIXI.Graphics` object in `overlayRoot`. It exists, is cleared every frame in `_rebuildOverlayPass()`, and `setNearDeath(true)` is already called from `game.js`. It just needs content.

### Implementation
In `_rebuildOverlayPass()`, extend the `dangerOverlay.clear()` block:

```js
dangerOverlay.clear();
if (nearDeath) {
  // Pulsing red vignette — darkens edges of screen
  const pulse = 0.5 + 0.5 * Math.sin(now * 0.005);  // ~0.8Hz pulse
  const baseAlpha = 0.12 + 0.06 * pulse;
  
  // Draw vignette as 4 edge rectangles with gradient-like fade
  // Top edge
  dangerOverlay.beginFill(0xff0000, baseAlpha * 0.6);
  dangerOverlay.drawRect(0, 0, canvas.width, 60);
  dangerOverlay.endFill();
  // Bottom edge
  dangerOverlay.beginFill(0xff0000, baseAlpha * 0.6);
  dangerOverlay.drawRect(0, canvas.height - 60, canvas.width, 60);
  dangerOverlay.endFill();
  // Left edge
  dangerOverlay.beginFill(0xff0000, baseAlpha * 0.4);
  dangerOverlay.drawRect(0, 0, 40, canvas.height);
  dangerOverlay.endFill();
  // Right edge
  dangerOverlay.beginFill(0xff0000, baseAlpha * 0.4);
  dangerOverlay.drawRect(canvas.width - 40, 0, 40, canvas.height);
  dangerOverlay.endFill();

  // Thin red border on play area edges
  dangerOverlay.lineStyle(1.5, 0xff2200, 0.4 + 0.3 * pulse);
  dangerOverlay.drawRect(PLAY_X, PLAY_Y, PLAY_W, PLAY_H);
  dangerOverlay.lineStyle(0);
}
```

This is a pure addition to existing code. No new variables needed — `nearDeath` and `now` are already in scope.

---

## Feature 4 — Title Screen GPU Wordmark Bloom
**Priority: Medium | Files: `pixi-post.js`, `game.js`, `ui.js`**

The "Techno Drone" wordmark is drawn with 4-pass Canvas shadowBlur. `AdvancedBloomFilter` produces real multi-pass GPU bloom that actually makes text look like it's emitting light rather than just being blurry.

### Approach
Replace the Canvas wordmark with a PixiJS Text object + AdvancedBloomFilter on a new `titleGlowLayer`.

### `pixi-post.js` changes
1. Add `let titleGlowLayer = null;` to module scope
2. In `init()`, after hudLayer is created:
   ```js
   titleGlowLayer = new PIXI.Container();
   titleGlowLayer.visible = false;
   app.stage.addChild(hudLayer);  // hudLayer was already here
   // Insert titleGlowLayer between contentRoot and hudLayer:
   // contentRoot → titleGlowLayer → hudLayer → transitionLayer
   ```
   Actually insert before hudLayer: `app.stage.addChildAt(titleGlowLayer, app.stage.children.indexOf(hudLayer));`

3. Create the PIXI.Text wordmark:
   ```js
   const wordmark = new PIXI.Text('Techno Drone', {
     fontFamily: 'cc-running-with-scissors-up, anatol-mn, monospace',
     fontSize: 96,
     fill: '#d9d4ff',
     letterSpacing: 8,
   });
   wordmark.anchor.set(0.5, 0.5);
   wordmark.x = canvas.width / 2;
   wordmark.y = canvas.height * 0.28;  // Match Canvas version position
   titleGlowLayer.addChild(wordmark);
   
   const bloom = new PIXI.filters.AdvancedBloomFilter({
     bloomScale: 1.4,
     blur: 14,
     brightness: 1.1,
     threshold: 0.4,
     quality: 4,
   });
   titleGlowLayer.filters = [bloom];
   ```

4. Add public API:
   ```js
   function setTitleWordmark(visible) {
     if (titleGlowLayer) titleGlowLayer.visible = !!visible;
   }
   ```

5. Export `setTitleWordmark` in the return object.

### `game.js` changes
Find where `gameState` is set to `'title'` and call `pixiPost.setTitleWordmark(true)`. When leaving title state, call `pixiPost.setTitleWordmark(false)`.

### `ui.js` changes
In `drawTitleScreen()`, find the 4-pass wordmark drawing block (the loop drawing "Techno Drone" with multiple shadowBlur passes). Wrap it in a guard:
```js
if (!pixiPost.isTitleWordmarkActive()) {
  // ... existing wordmark draw code ...
}
```

Add `isTitleWordmarkActive()` to `pixi-post.js` return:
```js
function isTitleWordmarkActive() {
  return titleGlowLayer ? titleGlowLayer.visible : false;
}
```

**Font note:** The font `cc-running-with-scissors-up` is loaded via Adobe Fonts kit `bft6law` in the document head. PIXI.Text will use it once the CSS font is loaded. To be safe, call `setTitleWordmark(true)` only after `document.fonts.ready` resolves (which it already will be by the time title screen loads in normal gameplay flow).

---

## Feature 5 — Win Screen God Rays
**Priority: Low-Medium | Files: `pixi-post.js`, `game.js`**

On mission complete, volumetric god rays fire from behind the player drone position as it rises to center screen.

### `pixi-post.js` changes
1. Add `let winFxActive = false; let winFxStartTime = 0; let winFxSprite = null; let godrayFilter = null;`
2. In `init()`, create the win fx sprite (off by default):
   ```js
   winFxSprite = new PIXI.Sprite(PIXI.Texture.WHITE);
   winFxSprite.width = canvas.width;
   winFxSprite.height = canvas.height;
   winFxSprite.tint = 0x8b5cf6;  // purple-magenta
   winFxSprite.alpha = 0;
   winFxSprite.blendMode = PIXI.BLEND_MODES.SCREEN;
   godrayFilter = new PIXI.filters.GodrayFilter({
     angle: 30,
     gain: 0.0,
     lacunarity: 2.5,
     parallel: true,
     time: 0,
   });
   winFxSprite.filters = [godrayFilter];
   overlayRoot.addChild(winFxSprite);  // goes on top of other overlays
   ```
3. Add public API:
   ```js
   function triggerWin(droneScreenX, droneScreenY) {
     if (!winFxSprite || !godrayFilter) return;
     winFxActive = true;
     winFxStartTime = performance.now();
     // GodrayFilter center is normalized 0-1
     godrayFilter.center = [droneScreenX / canvas.width, droneScreenY / canvas.height];
     godrayFilter.gain = 0.0;
     winFxSprite.alpha = 0;
   }
   
   function stopWin() {
     winFxActive = false;
     if (winFxSprite) winFxSprite.alpha = 0;
   }
   ```
4. In `render()`, update god rays if active:
   ```js
   if (winFxActive && winFxSprite && godrayFilter) {
     const elapsed = performance.now() - winFxStartTime;
     const t = Math.min(1, elapsed / 2000);
     // Fade in fast, stay, fade out slowly after 4s
     const fadeIn = Math.min(1, elapsed / 800);
     const fadeOut = elapsed > 4000 ? Math.max(0, 1 - (elapsed - 4000) / 2000) : 1;
     const intensity = fadeIn * fadeOut;
     godrayFilter.gain = 0.55 * intensity;
     godrayFilter.time += 0.01;  // animate rays
     winFxSprite.alpha = 0.7 * intensity;
   }
   ```
5. Export `triggerWin`, `stopWin`.

### `game.js` changes
- Find where `gameState = 'win'` is set. After this, call `pixiPost.triggerWin(drone.x, drone.y)` (the drone starts at bottom and rises — update the center as it animates if desired, or just use center screen).
- When leaving win state (back to title or restart), call `pixiPost.stopWin()`.

---

## Architecture Summary — Final Layer Stack

After all 5 features are implemented:

```
app.stage
  ├── contentRoot                   ← filters: [colorFilter, caFilter, pixelateFilter*]
  │     ├── bgRoot                  ← (disabled)
  │     ├── canvasGlowSprite        ← SCREEN blend bloom
  │     ├── canvasSprite            ← main Canvas2D texture
  │     ├── worldRoot               ← (disabled)
  │     ├── fxLayer                 ← (disabled)
  │     └── overlayRoot
  │           ├── stageOverlay      ← stage color wash (existing)
  │           ├── flowOverlay       ← flow state veil + edge highlights (existing)
  │           ├── dangerOverlay     ← near-death red vignette [FEATURE 3]
  │           └── winFxSprite       ← god rays SCREEN blend [FEATURE 5]
  ├── titleGlowLayer                ← PIXI.Text wordmark + AdvancedBloomFilter [FEATURE 4]
  ├── hudLayer                      ← (currently empty/disabled)
  └── transitionLayer               ← screen transitions [FEATURE 1]
```

`* pixelateFilter` is added to and removed from `contentRoot.filters` transiently during death/transitions — not permanently in the chain.

---

## Do Not Touch

- `js/core.js` — input handling, canvas setup
- `js/stage.js` — stage timing, kill counting
- `js/audio.js` — audio system
- `js/tutorial.js` — tutorial state machine
- `js/constants.js` — color palette, stage config
- `js/player.js`, `js/enemies.js`, `js/weapons.js`, `js/fx.js`, `js/starfield.js` — no changes needed
- All physics, collision, and game logic

---

## Verification Checklist

For each feature after implementation:
1. Open `index.html` in browser — check console for JS errors
2. Test the specific trigger listed below
3. Confirm no visual regression in normal gameplay
4. Confirm 60fps maintained under particle load (DevTools Performance panel)

| Feature | Test |
|---------|------|
| Screen Transitions | Navigate: title→play→die→title→leaderboard→title. Each transition should be smooth with no flicker. |
| Death Glitch | Die with a full screen of enemies — screen should tear/glitch intensely for ~800ms before death screen |
| Near-Death Overlay | Reach 1 life — red vignette should pulse at screen edges. Gain a life (stage 5 or 8) — vignette should disappear. |
| Title Bloom | Visit title screen — wordmark glow should look more luminous/bleeding vs. soft blur. Canvas version was 4-pass shadowBlur; PixiJS version should feel like real emitted light. |
| God Rays | Clear all 10 stages — on win screen, purple god rays should emit from behind the rising drone and fade after ~4s. |
