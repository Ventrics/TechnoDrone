# Stage 4 - Shield Drone Implementation

---

## Design Intent

Stage 4 introduces `Support Pressure` through a single new enemy: the **Shield Drone**.

The player has already learned:
- S1: move, shoot, manage heat
- S2: identify and kill priority ranged threats (turrets)
- S3: don't stand still — hazards and kamikazes punish static play

Stage 4 asks a new question: **which enemy is making the dangerous one unkillable?**

The shield drone doesn't attack. It makes another enemy temporarily invincible. The player has to read a *relationship* between two enemies, not just a position. That's the new skill.

This stage should feel smarter, not faster or noisier.

---

## The Shield Drone

A small, fast support unit that latches onto a high-value enemy and makes it fully invincible until the drone is destroyed.

### Behavior

- Spawns from the right edge like a normal enemy
- Moves toward the nearest priority target (see priority rules below)
- Once within `support radius (180px)` of a valid target:
  - locks to that target, orbiting slowly around it
  - target becomes fully invincible (bullets pass through, no damage)
  - draws a visible tether between itself and the target
- If its target dies: briefly searches for a new target (400ms delay), then reacquires
- If no valid target exists: drifts left slowly, continues scanning
- Does not fire at the player

### Target Priority (in order)
1. Locked turrets (`turretLocked === true`)
2. Elite enemies (`isElite === true`)
3. Any other shard (fallback only)

A shield drone on a locked turret should feel immediately threatening — the turret is now both shooting and unkillable until the drone is dealt with.

### Stats
- HP: 2 (fragile — easy to kill once identified)
- Speed: 180px/s (faster than a turret, slower than a kamikaze)
- Support radius: 180px
- Orbit radius: 40px around target
- Orbit speed: slow (roughly one rotation per 3 seconds)
- No direct attack

---

## Visual Design

The drone silhouette must be instantly distinct from every other enemy type.

### Shape
- Small rotating diamond (square rotated 45°), size ~10
- Thin outer ring rotating in the opposite direction to the core
- The counter-rotation is the visual signature — it should read as "not a normal enemy"

### Colors
- Body: `#00ccff` (bright cyan — distinct from orange turrets and pink/white shards)
- Outer ring: `#00ccff` at 0.5 alpha, slightly larger

### Tether (between drone and protected target)
- Dashed or pulsing line, `#00ccff`
- Animates: pulses inward toward the target (shows direction of protection)
- Width: 1.5px, alpha ~0.7
- Must be visible but not dominant — it's a readability cue, not a spectacle

### Protected Target Indicator
- Supported enemy gets a cyan shield shell: a thin glowing ring, radius `size * 1.8`
- Ring pulses gently (alpha oscillates 0.4 → 0.8)
- Color: `#00ccff`
- This is the most important visual — the player must immediately read "this enemy is protected"

### Glow Pass (OLED style, 3-pass)
1. Wide soft bloom: `#00ccff`, shadowBlur 20, alpha 0.15
2. Mid corona: `#00ccff`, shadowBlur 10, alpha 0.5
3. Hard white core dot: `#ffffff`, shadowBlur 4, alpha 0.9

---

## Stage 4 Spawn Rules

- Shield drones use their own spawn timer, separate from the kamikaze timer
- Spawn interval: `8000ms` (one every 8 seconds)
- Max active shield drones: `2`
- First spawn: `5000ms` into the stage (give the player a moment to settle in)
- Add `shieldDroneInterval: 8000` to `STAGE_CONFIG[3]` in `constants.js`
- Stages 1–3 and 5+: `shieldDroneInterval: 0`

### Spawn Schedule in `TURRET_SPAWN_SCHEDULES` style
Add a `SHIELD_DRONE_SPAWN_SCHEDULES` object to `enemies.js`:
```js
const SHIELD_DRONE_SPAWN_SCHEDULES = {
  4: [5000, 13000, 21000],
};
```
3 drones over a 30-second stage. Spaced so the player always has a window without one active.

---

## Implementation Notes

### Object shape (`spawnShieldDrone` function)
```js
{
  x: canvas.width + 20,
  y: random between 60 and canvas.height - 60,
  size: 10,
  color: '#00ccff',
  vx: -180,
  vy: 0,
  isShieldDrone: true,
  supportTarget: null,
  retargetTimer: 0,
  orbitAngle: 0,
  hp: 2,
  maxHp: 2,
  isElite: false,
  angle: 0,
  spin: 0.06,         // diamond body spin
  ringSpin: -0.04,    // outer ring counter-spin
  flashTimer: 0,
  hpBarTimer: 0,
  shieldHp: 0,
  turnRate: 0,
}
```

### Update logic
- In `shards.update()`, handle `isShieldDrone` before homing logic — drones skip homing entirely
- Each frame: if `supportTarget` is set and still alive, orbit it; otherwise scan for new target
- Set `supportTarget.isShieldProtected = true` while drone is alive and locked
- Clear `isShieldProtected` immediately when drone dies or loses its target

### Collision / damage logic
- In `applyDamageToShard()`: if `s.isShieldProtected`, return false (no damage), play a blocked SFX, trigger the shield shell flash
- Do NOT destroy the enemy, do NOT reduce HP — the shot just disappears

### HUD / MECHANIC_ASSIGNMENT
- Add `'shieldDrones'` to `MECHANIC_ASSIGNMENT[4]` in `constants.js`
- Add `shieldDrones: 'SHIELD DRONES'` to `mechanicLabels` in `drawHUD()` in `ui.js`

---

## What Stage 4 Should Feel Like

First encounter: "why isn't this turret taking damage?"
One second later: "oh — that small cyan thing."
Immediate reaction: "kill the small thing first."

That's the whole lesson. It should click fast and feel satisfying when it does.

The stage is smarter than Stage 3, not harder in raw numbers.

---

## Balance Guardrails

- If drones feel invisible: increase their size or the tether alpha
- If drones feel unfair: increase first-spawn delay before reducing count
- Do not increase drone HP — they should die in 2 shots. The threat is the *mechanic*, not the drone's durability
- Do not add more than 2 active at once in Stage 4

---

## Files to Modify

- `js/constants.js` — `STAGE_CONFIG[3]` shieldDroneInterval, `MECHANIC_ASSIGNMENT[4]`
- `js/enemies.js` — `spawnShieldDrone()`, `SHIELD_DRONE_SPAWN_SCHEDULES`, update loop, draw loop, `applyDamageToShard()` shield-protected check
- `js/ui.js` — `mechanicLabels` entry for `shieldDrones`

Files NOT modified: `player.js`, `stage.js`, `game.js`, `weapons.js`
