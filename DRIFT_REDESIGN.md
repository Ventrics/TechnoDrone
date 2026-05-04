# Drift Enemy Redesign

The "regular" non-homing enemy (`spawnDrift`) felt like it was floating downward instead of flying at the player. This redesign makes drifts read as incoming asteroids — committed trajectories, accelerating mass, varied silhouettes.

## Diagnosis (pre-change)

- Constant velocity (100–200 px/s set once at spawn, no acceleration)
- Triangle locked at `angle: 0` regardless of motion direction (nose points straight down even when velocity is diagonal)
- Tight spawn cone (~±17° from straight down)
- Uniform sizes (20–28 px)
- No motion signal in any single frame

The orientation lock was the loudest tell — a triangle drifting left-down with a nose still pointing straight down reads as a drone in formation, not debris in flight.

## Locked design

| Decision | Value |
|---|---|
| **Nose orientation** | Aligns to `Math.atan2(vy, vx) - π/2` every frame (geometry has nose at +Y) |
| **Aim** | At player position at spawn time. No live tracking, no leading. |
| **Scatter** | ±15° around the aim vector |
| **Speed curve** | Accelerates from spawn speed to terminal speed along the launch vector |
| **Size variance** | 16–44 px, uniform random |
| **Mass coupling** | Light (small): spawn 160 → terminal 340 px/s, 1 hp baseline. Heavy (large): spawn 100 → terminal 260 px/s, 2 hp baseline. Linear interpolation by size. |
| **Trail** | Faint additive streak in overlay layer, length ∝ current speed (capped) |
| **Spawn edge** | Top only (unchanged) |
| **Stage scaling** | Untouched (same curve all stages; existing hp/count scaling unchanged) |

## Net feel

A fan of variably-sized triangles spawning across the top edge, every nose pointed at where the player stood at spawn time, accelerating as they descend, leaving a thin streak behind. Boulders trundle. Darts dive.

## Files touched

- `js/enemies.js` — `spawnDrift()`, drift branch in `update()`, `facingAngle` in both Canvas2D draw and Pixi `_syncEntityGfx`.

## Deliberately not changed

- **Side spawns.** Top-only preserves the "danger comes from above" gameplay shape.
- **Stage scaling on the new params.** Lock one curve, playtest stages 8–12, add scaling later only if late game feels flat.
- **Homing shard (`_makeShard`) movement.** Same triangle geometry, but the role split (drift = dumb, shard = smart) stays intact.

## Followups to consider after playtest

- If late stages feel flat, scale `terminalSpeed` and/or `accel` per stage.
- If trail feels too subtle, extend from velocity-vector streak to multi-frame ghost trail (same render path, longer history).
- Apply velocity-aligned nose to non-elite homing shards too — they currently have the same geometric inconsistency.
