# TechnoDrone Game Plan

> Read before changing mechanics, stage structure, or core gameplay systems.
> If this file conflicts with the code, update this file after verifying the code is intentional.

## Game Summary
TechnoDrone is a 5-minute top-down survival shooter.

- `10` stages
- `30s` per stage
- Stage progression is time-based, not kill-based
- Pressure stacks across the run
- Aggression should create space
- Readability matters more than raw chaos

## Current File Set
Core runtime lives in:
- `js/audio.js`
- `js/constants.js`
- `js/core.js`
- `js/enemies.js`
- `js/fx.js`
- `js/game.js`
- `js/player.js`
- `js/stage.js`
- `js/starfield.js`
- `js/ui.js`
- `js/wavefield.js`
- `js/weapons.js`

## Stage Structure
The current codebase uses this stage stack:

| Stage | Added or emphasized | Active pressure |
|---|---|---|
| 1 | Baseline swarm | Standard enemies |
| 2 | Turrets begin | Swarm + turrets |
| 3 | Kamikazes + obstacle wave | Swarm + turrets + kamikazes + gates |
| 4 | Shield drones | Swarm + turrets + kamikazes + shield drones |
| 5 | Higher elite pressure | Swarm + turrets + elites |
| 6 | Kamikazes return + multi-edge | Multi-edge swarm + turrets + kamikazes + gates |
| 7 | Shielded enemies | Swarm + turrets + shielded enemies |
| 8 | Full stack first time | Turrets + kamikazes + shielded + formations |
| 9 | Max density with gates | Full stack at higher intensity |
| 10 | Finale pressure | Peak stack, distinct finish still needs tuning |

Important:
- Turrets are driven by `turretInterval` in `STAGE_CONFIG` plus `TURRET_SPAWN_SCHEDULES` in `js/enemies.js`
- Shield drones use `SHIELD_DRONE_SPAWN_SCHEDULES` in `js/enemies.js`
- Obstacle waves are the current replacement for older hazard ideas

## Current Mechanics

### Turrets
- Spawn from the top edge in scheduled lanes
- Drift down and lock to a backline row
- Fire aimed shots after a lock/windup
- HP: `7`
- Main implementation: `js/enemies.js`

### Kamikazes
- Fast suicide units
- Recur on the intended stages instead of staying constant
- Main implementation: `js/enemies.js`

### Obstacle Gates
- Timed obstacle-wave mechanic used on stages `3`, `6`, and `9`
- Rows contain safe green lanes and dangerous red blockers
- This is the current stage hazard system
- Timing/state: `js/stage.js`
- Spawn/draw/collision: `js/enemies.js`

### Shield Drones
- Support unit that protects another enemy
- Prioritizes strong targets
- Fragility is intentional
- Main implementation: `js/enemies.js`

### Shielded Enemies
- Extra shield HP layer
- Introduced later in the run
- Main implementation: `js/enemies.js`

### Formations
- Start showing up in later stages
- Used for pacing variety and pressure patterns, not as a separate named mechanic
- Main implementation: `js/enemies.js`

## Core Player Systems

### Heat
- Firing builds heat from `0-100`
- Releasing fire cools it down
- Overheat locks firing temporarily
- Heat lives on the ship, not in a separate HUD bar
- Dash is also a heat-management tool

Current intent:
- Heat should stay readable at a glance
- Dash should relieve pressure, not just avoid it

### Dash
- Short burst movement with cooldown
- Refunds a chunk of heat
- Offensive use is valid when it converts danger into tempo

### Flow State
- Built through kills and aggression
- This is the player's main chase-state
- Active behavior: no heat gain, speed boost, stronger presentation
- It should feel premium and worth re-earning immediately
- Full spec lives in `FLOWSTATE.md`

### Alt-Fire
- Current pickup flow is Laser
- Elites can drop it
- The system should stay simple and legible

### Base Drop
- `Q` activation
- Limited uses per run
- Should feel like a major release valve, not a spammable tool

### Lives
- Hit-based life loss, no regenerative shield system
- Extra lives are earned at specific milestones

## Score Philosophy
Score is a style reward, not the victory condition.

It should reward:
- kills
- elite kills
- survival under pressure
- aggressive play

It should not replace the timer as the main progression rule.

## Design Rules
1. Every threat needs readable telegraphing.
2. Aggression should reduce pressure, not just increase risk.
3. One stage should introduce one clear new test.
4. Avoid duplicate HUD signals.
5. Darkness or blackout effects do not belong in this game.
6. Visual intensity should not come at the cost of combat readability.

## What Not To Add Back
- Kill-quota stage advancement
- Graze as a Flow State source
- Redundant HUD heat bars
- Old placeholder hazard systems that are no longer in use
- Full-screen darkness/blackout effects

## Current Reality Check
These are true of the current codebase and should shape future work:
- `ui.js` contains both presentation and tutorial/menu flow
- `game.js` owns the main loop and render composition
- `stage.js` owns stage timing, obstacle-wave state, and kill rewards
- `enemies.js` owns most enemy behavior, collisions, and obstacle gate pieces
- Flow State terminology should replace old OverDrive terminology everywhere

## Open Work
- Stage 10 still needs a more distinct finale identity
- Flow State still needs continued feel polish
- Some stage tuning is present but not final
- Docs should stay aligned with the code after each major gameplay pass
