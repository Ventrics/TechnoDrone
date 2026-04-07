# Stage 1 - Baseline Swarm

This document describes the design intent and current implementation of Stage 1.

---

## Design Intent

Stage 1 is the onboarding stage. No new mechanics are introduced — it is purely movement and shooting fundamentals.

The player should learn:
- How the ship moves and feels
- How to graze enemies for the overdrive charge
- That holding fire causes heat buildup and forces cooldown discipline
- That elites drop alt-fire orbs and are worth hunting

Stage 1 should feel manageable but not trivial. The swarm has moderate density and homing tendency. There are no turrets, no kamikazes, no snipers.

---

## Current Config

```
STAGE_CONFIG[0]:
  speed:          170
  maxEnemies:     14
  spawnInterval:  420ms
  homingChance:   0.65
  eliteChance:    0.06
  kamikazeInterval: 0
  turretInterval:   0
  multiEdge:      false
```

```
MECHANIC_ASSIGNMENT[1]: []
```

---

## Active Mechanics

None. Stage 1 is baseline swarm only.

- Enemies spawn from the right edge only (`multiEdge: false`)
- 65% of enemies home toward the player
- 6% chance any spawn is elite (drops alt-fire orb on kill)
- No kamikazes, no turrets, no snipers, no shielded

---

## Progression Gates

- None. Stage 1 advances purely on timer (`STAGE_DURATION`).
- On advance to Stage 2: turrets are introduced.

---

## Life / Reward System

- Player starts with 3 lives
- No life bonus on Stage 1 advance
- 100-kill milestone grants +1 life (global mechanic, applies in any stage)

---

## Balance Notes

- Stage 1 is intentionally soft to give the player time to find rhythm
- `eliteChance: 0.06` means elites are rare — the player has to be aggressive to find alt-fire
- `homingChance: 0.65` keeps pressure honest without being oppressive
- If Stage 1 feels too easy, raise `eliteChance` before touching density or speed
- If Stage 1 feels too hard, lower `homingChance` first

---

## Implementation Constraints

- Do not add any mechanic flag to `MECHANIC_ASSIGNMENT[1]`
- Do not set `turretInterval` or `kamikazeInterval` for Stage 1
- Stage 1 is the baseline everything else is measured against — keep it clean
