# TechnoDrone - QoL & Combat Feedback Implementation Spec

Paste individual sections into your implementation agent as needed.

---

## Design Review Status

All items reviewed and approved. Original proposal from combat feedback audit, refined with design lead input.

| # | Feature | Status | Priority |
|---|---------|--------|----------|
| 1 | Dash readiness via engine exhaust | APPROVED | High |
| 2 | Smooth heat aura on ship | APPROVED (supplements 270° heat arc in HUD_DESIGN.md) | Medium |
| 3 | Graze afterimage | APPROVED — afterimage only, NO floating text | Medium |
| 4 | HUD consolidation | ALREADY DESIGNED — see HUD_DESIGN.md (left-side layout) | Done |
| 5 | Off-screen sniper telegraph | APPROVED | High |
| 6 | Zero-friction death restart | APPROVED | High |
| 7 | Sniper bullet visual overhaul | APPROVED — user-reported, critical fix | High |
| 8 | Stage intro title cards | APPROVED | Medium |
| 9 | Shield absorb flash | APPROVED | Medium |
| 10 | Overdrive engine color shift | APPROVED | Medium |

---

## High Priority Implementations

### 1. Sniper Bullet Visual Overhaul

**The Problem:** After 40-50 runs, the player has never been hit by a sniper bullet. The trail is 12px long and 2px wide — effectively invisible. Speed is too slow to create dodge pressure.

**Current values:**
- Speed: `320 + stage * 14` (~418 px/s at Stage 7)
- Trail: `0.03 * speed` = ~12.5px
- Width: 2px, color `#ff8844`, shadowBlur 12
- Life: 2600ms

**New values:**
- Speed: `420 + stage * 20` (~560 px/s at Stage 7) — fast enough to demand respect
- Trail: `0.08 * speed` = ~45px — actually visible
- Width: 3px, color `#ff4422` (hotter red-orange), shadowBlur 18
- Life: 2600ms (unchanged — adequate for cross-screen)
- **Add bright core dot**: 3px white filled circle at bullet head after trail stroke
- **Add muzzle flash**: on sniper fire, spawn white circle at sniper position (radius 8px, alpha 0.6, fades over 100ms)

**In `enemyBullets.fire()`** — add an `isSniper` flag so draw can differentiate:
```javascript
fire(x, y, targetX, targetY, opts = {}) {
  const speed = opts.isSniper ? (420 + stage.current * 20) : (320 + stage.current * 14);
  this.pool.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
                   life: 2600, isSniper: !!opts.isSniper });
}
```

**In `enemyBullets.draw()`** — sniper bullets get enhanced rendering:
```javascript
if (b.isSniper) {
  // longer, brighter trail
  setGlow('#ff4422', 18);
  ctx.strokeStyle = '#ff4422';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(b.x - b.vx * 0.08, b.y - b.vy * 0.08);
  ctx.lineTo(b.x, b.y);
  ctx.stroke();
  // bright core dot
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(b.x, b.y, 1.5, 0, Math.PI * 2);
  ctx.fill();
  clearGlow();
} else {
  // existing turret bullet rendering (unchanged)
}
```

**In sniper fire trigger** (where `enemyBullets.fire()` is called during windup completion):
```javascript
enemyBullets.fire(s.x, s.y, drone.x, drone.y, { isSniper: true });
// muzzle flash
impactFX.onHit(s.x, s.y, '#ffffff');  // reuse existing impact FX for the flash
```

**The complete sniper threat loop after fix:**
1. Targeting laser appears during windup — "a sniper is aiming at me"
2. Laser brightens as windup progresses — tension builds
3. Muzzle flash at sniper position — "it fired"
4. Bright red-orange bolt with white core crosses screen fast — real dodge pressure
5. Player moves or gets hit — fair either way, they saw it coming

---

### 2. Zero-Friction Death Restart

**The Problem:** Deaths should encourage immediate replay. Currently pressing R on the death screen may route through state transitions.

**The Fix:** When R is pressed on death/game-over screen:
1. Flash "SYSTEM REBOOT" centered, white, bold 28px, for 200ms
2. Hard-reset all game state (player, enemies, stage, bullets, particles — everything)
3. Set `gameState = 'playing'`, `stage.current = 1`
4. Skip title screen entirely
5. Begin Stage 1, Frame 1 immediately

**Do NOT** reset the run history (save object) — the player should see their previous runs accumulating. Only reset gameplay state.

**Audio:** Play `audio.play('menuConfirm')` on R press, then `audio.playMusic('gameplay')` as Stage 1 begins.

---

### 3. Dash Readiness via Engine Exhaust

**The Problem:** Dash cooldown is communicated via text timer in the HUD. Reading text while dodging shatters focus.

**The Fix:** In `drone.draw()`, modify the engine exhaust rendering:

**When dash is on cooldown** (`dash.cooldown > 0`):
- Engine exhaust color: `#444444` (dim grey) instead of `COLOR_CYAN`
- Exhaust pulse amplitude: reduced to 0.2 (barely flickering)
- Exhaust glow: shadowBlur 8 (reduced from 32)

**When dash becomes ready** (`dash.cooldown` crosses from >0 to <=0):
- Engine exhaust snaps back to `COLOR_CYAN` at full brightness
- One-frame flash: both exhaust ports draw at radius 12px (briefly larger) with shadowBlur 40
- Spawn 2-3 small cyan spark particles from exhaust ports (reuse existing spark system if available)
- Play `audio.play('dashReady')` — add a new tiny tick sound to audio.js:
  ```
  dashReady: sine 1400Hz, gain 0.05, duration 0.03s
  ```

**The text HUD still shows [SPC] DASH / cooldown** (from HUD_DESIGN.md), but the engine is the PRIMARY communication channel. The text is backup.

---

### 4. Off-Screen Sniper Telegraph

**The Problem:** If a sniper is winding up while positioned off-screen (or at the far edge), the player has no warning.

**The Fix:** In `shards.draw()`, when drawing the sniper targeting laser during windup:

- Calculate the laser line from sniper position toward drone position
- If the sniper's x or y is outside the visible canvas, **still draw the laser line** — it should enter the screen from the edge and point toward the player
- Clamp the laser origin to the nearest screen edge: `clampedX = Math.max(0, Math.min(canvas.width, s.x))`, same for y
- Draw the dashed line from the clamped edge point toward the drone
- At the screen edge where the laser enters, draw a small warning indicator: a small triangle or chevron pointing inward, same color as the laser (`#ff4422`), pulsing alpha

This ensures the player ALWAYS sees the targeting laser, even if the sniper is off-screen. The edge indicator tells them "the threat is over THERE."

---

## Medium Priority Implementations

### 5. Stage Intro Title Cards

**When:** On each stage advance (when `stage._advance()` fires)

**Visual:**
```
         STAGE 3
     — INTERCEPTORS —
```

- Stage number: bold 42px monospace, white, centered
- Stage name: 18px monospace, stage hudColor, centered, below number
- Glow: single-pass shadowBlur 20, white (on number), hudColor (on name)
- Animation: fade in 200ms → hold 800ms → fade out 500ms (total 1.5s)
- Render on top of gameplay (enemies keep spawning during the card)
- Do not pause gameplay — the card is ambient, not blocking

**Stage names** (add to `constants.js`):
```javascript
const STAGE_NAMES = [
  'ORIENTATION', 'COMPRESSION', 'INTERCEPTORS', 'HEAT DISCIPLINE',
  'ELITE ECONOMY', 'MOBILITY EXAM', 'SNIPER PRIORITY', 'SHIELD BREAK',
  'SENSORY STRESS', 'FINAL PATTERN'
];
```

---

### 6. Graze Afterimage

**When:** Each time a graze triggers (in the `graze` object's detection code)

**Visual:**
- Capture the drone's current position at graze moment
- Draw a copy of the ship hull (same 6-point polygon) at that frozen position
- Color: white at alpha 0.35, no fill, stroke only, lineWidth 1.5
- Fade: alpha decays to 0 over 200ms linearly
- No glow — just a clean white outline ghost
- Maximum 3 active afterimages at once (pool of 3, oldest replaced)

**Do NOT add floating text.** The afterimage IS the feedback. The overdrive bar in the HUD handles the "graze charges overdrive" communication.

---

### 7. Shield Absorb Flash

**When:** `player.hit()` absorbs damage via shield (shield goes from active to recharging)

**Visual:**
- Ship flashes white for 80ms (set a `shieldFlashTimer` on the drone)
- Emit a ring pulse centered on the drone: white circle expanding from radius 20 to 50 over 200ms, alpha decaying from 0.4 to 0
- Reuse `impactFX.onHit()` or similar existing ring system if possible
- Play `audio.play('shieldHit')` (already defined in audio.js)

**Purpose:** The player should FEEL that the shield saved them, not discover it later when they notice the shield icon is recharging.

---

### 8. Overdrive Engine Color Shift

**When:** `player.overdriveActive === true`

**Visual changes to `drone.draw()`:**
- Engine exhaust color: `#ff6600` (orange) instead of `COLOR_CYAN`
- Engine exhaust glow: shadowBlur 36 (slightly larger than normal 32)
- Engine pulse amplitude: 0.65 + 0.35 * sin (instead of normal 0.55 + 0.45) — more aggressive pulsing
- Ship trail (if one exists): increase alpha by 30%, widen by 1px

**On overdrive end:** snap back to cyan. No transition — the sudden color drop communicates "overdrive ended" instantly.

---

### 9. Smooth Heat Aura Color Shift

**Enhancement to existing `shipGlow` in `drone.draw()`:**

Currently the ship aura is binary: cyan normally, red only at overheat. Change to a smooth gradient:

```javascript
const heatFrac = player.heat / 100;
const shipGlow = player.overheated ? '#ff3300'
  : dash.duration > 0 ? '#ffffff'
  : heatFrac > 0.8 ? '#ff3300'
  : heatFrac > 0.5 ? '#ff8800'
  : heatFrac > 0.25 ? '#ffcc00'
  : COLOR_CYAN;

const shipGlowAlpha = player.overheated ? 0.28
  : dash.duration > 0 ? 0.22
  : 0.14 + heatFrac * 0.10;  // aura grows slightly brighter with heat

const shipGlowRadius = player.overheated ? 30
  : dash.duration > 0 ? 24
  : 18 + heatFrac * 8;  // aura expands slightly with heat
```

This makes heat a PERIPHERAL sensation — the ship's ambient glow warms up as heat builds, even before the 270° heat arc (from HUD_DESIGN.md) fills.

---

## Implementation Constraints (apply to all items)

- No ES modules
- No gameplay behavior changes (these are all visual/audio feedback additions)
- Follow OLED design language: `#050505` background, glow-based visuals, no flat UI elements
- Performance: no per-frame allocations for visual effects. Use pooled objects or timers.
- All new audio calls use the existing `audio.play()` API
- All new visual effects should be subtle enough to not obscure gameplay readability
