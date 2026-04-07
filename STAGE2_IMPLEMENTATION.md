# Stage 2 - Turret Enemy Implementation

Paste this prompt into your implementation agent.

---

## Prompt

File to edit: `C:/Users/brian/Downloads/Anti gravity/Projects/TechnoDrone/index.html`

Add a new `Turret` enemy type for Stage 2. The goal is to make Stage 2 feel like a clean target-priority lesson inside the timed-survival format: the player should quickly learn that stationary ranged threats must be removed before the swarm becomes unmanageable.

Keep the implementation readable and restrained. This is Stage 2, so it should introduce a new pressure type without overwhelming the player.

---

### Design Intent
- Stage 1 teaches swarm flow and graze confidence.
- Stage 2 should teach `priority killing`.
- The turret is not a boss or mini-boss.
- It exists to create a readable ranged threat that changes target selection.
- The stage objective is still survival, not kill quota.

---

### Behavior
- Spawns at `canvas.width + 30`, random y between `60` and `canvas.height - 120`
- Moves left at `120px/s`
- No homing
- No y movement
- When `x <= canvas.width * 0.52`, it locks in place:
  - `vx = 0`
  - `vy = 0`
  - `turretLocked = true`
  - spin stops
- Once locked:
  - fires `1` enemy bullet per second using the existing `enemyBullets.fire()` system
  - has a `300ms` charge windup before each shot
  - first shot is delayed until `1200ms` after locking
- Slow spin while traveling: `spin = 0.04 rad/frame`
- Frozen orientation while locked
- HP: `3`
- No shield
- Not elite
- Counts as a normal kill for score/threat cleanup only, not as any stage progression gate

---

### Spawn Logic
1. Add `turretInterval: 4500` to Stage 2's `STAGE_CONFIG` entry
2. All other stages should have `turretInterval: 0` for now
3. In the game loop near the kamikaze spawn timer, add a turret spawn timer:
   - call `spawnTurret()` every `turretInterval` ms
   - cap active turrets at `3`, not `4`
4. If Stage 2 becomes too crowded in testing, prefer lowering simultaneous turret count before nerfing the turret behavior itself

---

### Visual
- Shape: cross/plus using two overlapping rectangles
  - horizontal bar + vertical bar
  - arm length = `size * 4`
  - arm width = `size * 1.5`
- Color: `#ff6600`
- Size: `13`
- Use the game's existing OLED visual language:
  - wide orange bloom
  - mid orange corona
  - hard white core dot
- While traveling:
  - spinning cross shape
- While locked:
  - frozen orientation
  - faint targeting ring around it: thin circle, radius `size * 2`, low alpha
- While charging:
  - pulsing white center dot
  - alpha = `1 - (turretChargeTimer / 300)`

The turret silhouette should be immediately readable from gameplay distance and clearly distinct from standard shard enemies.

---

### Object Shape (`spawnTurret` function)
```javascript
{
  x: canvas.width + 30,
  y: random between 60 and canvas.height - 120,
  size: 13,
  color: '#ff6600',
  vx: -120,
  vy: 0,
  isTurret: true,
  turretLocked: false,
  turretFireTimer: 1200,
  turretCharging: false,
  turretChargeTimer: 0,
  hp: 3,
  maxHp: 3,
  isElite: false,
  angle: 0,
  spin: 0.04,
  shieldHp: 0,
  turnRate: 0,
}
```

---

### Update Rules
- In the enemy update loop, handle `isTurret` before homing logic
- Turrets must skip homing entirely
- Make sure turret enemies are excluded from any movement assumptions that only make sense for regular shards
- Keep the code localized and easy to expand later if we add more ranged enemies

---

### Balance Notes
- This is an authored Stage 2 mechanic, not a generic modifier
- The player should feel:
  - "that enemy will become a problem if I leave it alive"
  - not "the screen is already overloaded"
- Preserve fairness:
  - keep the first-shot delay
  - keep the windup
  - keep the active cap conservative

If testing shows Stage 2 is too soft, increase turret frequency slightly before increasing cap.
If testing shows Stage 2 is too stressful, reduce cap or slightly delay first-shot timing before touching visuals.

---

### Implementation Constraints
- Do not reintroduce kill-quota-based design assumptions
- Do not make the turret elite
- Do not give it hidden mechanics
- Do not let it accidentally inherit regular homing behavior

Follow the existing OLED design philosophy: pure `#050505` background, 3-pass glow on emissive elements, no unnecessary effect spam.
