# Stage 3 - Kamikazes + Turrets + Map Hazards

This document describes the design intent and current implementation of Stage 3.

---

## Design Intent

Stage 3 is the first real complexity spike. Three threat types are active simultaneously:

1. **Kamikazes** — fast suicide units that demand dash timing
2. **Turrets** — persistent ranged threats that require priority kills
3. **Map Hazards** — ground zones that spawn directly under the player and punish standing still

The player must now manage spatial awareness, prioritization, and movement discipline all at once. The pace is faster than Stage 2, and the swarm density increases.

Stage 3 teaches: **you cannot stay in one spot anymore**.

---

## Current Config

```
STAGE_CONFIG[2]:
  speed:          170
  maxEnemies:     16
  spawnInterval:  450ms
  homingChance:   0.65
  eliteChance:    0.15
  kamikazeInterval: 3500ms
  turretInterval:   6000ms
  multiEdge:      false
```

```
MECHANIC_ASSIGNMENT[3]: ['kamikazes']
```

---

## Active Mechanics

### Kamikazes
- Fast, straight-line suicide units
- Spawned every `3500ms`
- Higher elite chance (0.15) means alt-fire is more accessible
- Player must dash through or dodge before they close range
- Do not home — they charge in a fixed direction

### Turrets (persisting from Stage 2)
- Spawn on a fixed schedule: `[4000, 10000, 16000, 22000]` (4 turrets total)
- Turret spawn schedule defined in `TURRET_SPAWN_SCHEDULES[3]` in `enemies.js`
- Drift right then lock at alternating x-depths (82% and 65% of canvas width)
- Lock into 5 vertical zones (`TURRET_Y_ZONES`) — max 2 per zone prevents stacking
- HP: 7
- Fire rate: one shot per ~1000ms after lock + 300ms charge windup

### Map Hazards
- Active from Stage 3 onward
- Always spawn directly under the player's current position
- Warning phase: 2200ms (pulsing ring telegraph)
- Active phase: 3000ms (full eruption zone, damages player on contact)
- Closing phase: 500ms (fading out)
- Radius: 220px — large enough to require deliberate movement to escape
- Damage cooldown: 1500ms per hazard (player can't be hit every frame)
- Max 3 hazards active at once
- Spawn interval: 5500–8000ms (randomized)

---

## Turret Spawn Schedule

```javascript
TURRET_SPAWN_SCHEDULES[3]: [4000, 10000, 16000, 22000]
```

4 turrets over a ~30s stage. Spaced to avoid front-loading.

---

## Life / Reward System

- No life bonus on Stage 3 advance
- 100-kill milestone grants +1 life (global)

---

## Balance Notes

- Stage 3 is intentionally the first "wall" — the player will die here more than S1/S2
- Map hazards are the key differentiator vs Stage 2: constant positional pressure
- Turret interval is 6000ms (slower than S2's 2500ms) because turrets are now a secondary threat, not the spotlight
- If Stage 3 feels overwhelming: increase hazard spawn interval or reduce hazard radius before touching enemy density
- If Stage 3 feels too easy: tighten hazard spawn interval toward 5000ms, or reduce kamikaze interval slightly

---

## Implementation Constraints

- Map hazards must always spawn on the player — random spawns were removed intentionally
- Kamikazes should feel like a dash-test, not a homing nightmare — they do not home
- Turrets must persist through all future stages (never removed after S2)
- Do not add `snipers` or `shielded` — those are S5 and S7 introductions respectively
