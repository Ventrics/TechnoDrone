# TechnoDrone — Game Plan

> **AGENTS: Read this document before making any changes to the game.**
> This file defines the locked design direction, stage structure, and philosophy for the entire project.
> Do not introduce mechanics, change stage configs, or alter systems without verifying alignment here first.
> If something in this document conflicts with what you see in the code, the code is more recent — update this doc or ask.

---

## Vision

TechnoDrone is a 5-minute, high-dopamine survival shoot 'em up.

The player is not trying to farm a kill quota. The player is trying to survive a sequence of short, escalating combat tests where:
- hazards are readable
- target priority matters
- aggression creates advantage
- clean movement preserves momentum
- every stage has a distinct identity

The run should feel fast, stylish, and replayable — not exhausting or administrative.

---

## Core Fantasy

- Survive five minutes of escalating neon combat
- Read the battlefield quickly
- Identify the most dangerous threat first
- Kill with intent, not for chores
- Use aggression to create breathing room, not to satisfy a quota

If the player dies, it should feel like: *"I lost control of the pressure."*
Not: *"I failed to maintain three timers and a spreadsheet."*

---

## Locked Direction

### Run Format
- 10 stages
- 30 seconds per stage
- total run time: ~5 minutes
- stage advancement is **time-based**, not kill-based
- surviving the timer advances the player automatically

### Success Model
- primary objective: survive
- secondary objective: score well
- tertiary objective: build power and momentum through skilled aggression

### Combat Model
- kills matter because they reduce pressure
- kills are not the win condition for a stage
- enemies and hazards must force target-priority decisions
- passive survival should be possible briefly, but not optimal for the full run

---

## Mechanic Stacking Design

**Core rule: once a mechanic is introduced, it never leaves.**

Each new stage introduces one new mechanic. All previous mechanics stay active at increasing intensity. By Stage 10 the player is dealing with everything simultaneously at peak difficulty.

| Stage | New Mechanic | Full Active Stack |
|-------|-------------|-------------------|
| 1 | — | Baseline swarm |
| 2 | Turrets | Turrets |
| 3 | Kamikazes + Map Hazards | Turrets + Kamikazes + Hazards |
| 4 | Shield Drones | Turrets + Kamikazes + Shield Drones |
| 5 | Snipers | Turrets + Snipers |
| 6 | Kamikazes return + multi-edge | Turrets + Snipers + Kamikazes |
| 7 | Shielded | Turrets + Snipers + Shielded |
| 8 | Full stack first time | Turrets + Kamikazes + Snipers + Shielded |
| 9 | Max density | All 4 at max rate |
| 10 | Finale | All 4 at peak intensity |

Turrets are driven by `turretInterval` in `STAGE_CONFIG` and `TURRET_SPAWN_SCHEDULES` in `enemies.js` — they are **not** in `MECHANIC_ASSIGNMENT`.

Map hazards activate from Stage 3 onward via `mapHazards` system — always spawn on the player, 220px radius.

---

## Stage Identities

### Stage 1 — Move and Shoot
- Baseline swarm only, no special mechanics
- Teach: movement feel, heat discipline, dash rhythm, elite hunting
- Config: 14 enemies, 420ms spawn, 65% homing, 6% elite

### Stage 2 — Priority Killing
- Turrets introduced (5 on fixed schedule)
- Teach: identify and remove persistent ranged threats before they compound
- Config: turretInterval 2500ms, 5 turrets on fixed times

### Stage 3 — Don't Stand Still
- Kamikazes + turrets continuing + map hazards introduced
- Teach: you cannot hold position anymore — hazards spawn on you
- Map hazards: 220px radius, always under player, 2200ms warning → 3000ms active

### Stage 4 — Support Pressure
- Shield Drones introduced — latch onto turrets/elites and make them fully invincible until the drone is killed
- Teach: read relationships between enemies, not just positions — kill the support unit first
- Kamikazes and turrets both still active; drones spawn on a fixed schedule (3 over 30s)

### Stage 5 — New Threat Type
- Snipers introduced, kamikazes pause
- Teach: slow down and read windup telegraphs, new movement discipline
- Config: turretInterval 7000ms (3 turrets), kamikazeInterval 0

### Stage 6 — Spatial Chaos
- Kamikazes return, multi-edge spawning activates
- Teach: threats now come from all sides, route management under two fast threat types
- Config: multiEdge: true, kamikazeInterval 1800ms, turretInterval 5000ms

### Stage 7 — Sustained Focus
- Shielded enemies introduced
- Teach: some targets require sustained burst fire — commit to the kill
- Config: shielded + snipers + turrets, kamikazes pause

### Stage 8 — Full Stack First Time
- All 4 mechanics together for the first time
- Teach: everything you've learned must work simultaneously
- Stage 8 is the skill check, not the finale

### Stage 9 — Maximum Density
- All 4 mechanics at highest frequency, no new mechanic
- Teach: survive the storm — pure execution

### Stage 10 — Finale
- All 4 mechanics at peak intensity
- Stage 10 must not just be "Stage 9 faster" — it needs a finale identity
- Still to be designed: pacing ramp within the 30 seconds, climax moment

---

## Lives System

- Player starts with **3 lives**, no shield
- Every hit costs a life immediately — no buffer
- `+1 life` granted on reaching Stage 5 and Stage 8
- `+1 life` granted every 100 kills (global milestone, max 5 lives)
- Hit feedback: full-screen red flash + heavy screen shake — should feel punishing
- `INVINCIBLE_DURATION`: 300ms post-hit invincibility

---

## Design Pillars

### 1. Readable Pressure
Every hazard needs a telegraph. Death should be attributable to a readable cause. Stacked mechanics must remain visually separable.

### 2. Aggression Creates Space
Killing enemies buys safety, score, charge, or tempo. Elites and priority enemies become dangerous if left alive. Pure kiting should be weaker than decisive target removal.

### 3. One Stage, One Test
Each stage has a clear tactical identity. Do not pile three new concepts into one stage unless it is an intended climax.

### 4. Minimal Cognitive Waste
Reduce overlapping timers. Avoid duplicated HUD signals. Systems should be felt through play, not only through UI bars.

### 5. High Dopamine, Short Commitment
Fast onboarding. No filler stages. Deaths should encourage immediate replay. Every 30-second slice should do something distinct.

---

## What This Game Is Not

- not a roguelite progression grind
- not a quota-farming survival game
- not a bullet sponge DPS race
- not a systems-heavy sandbox

If a feature mainly exists to support kill quotas, it should be questioned.

---

## Active Mechanics Reference

### Turrets
- Drift in from right, lock at authored x-depths (82%/65% alternating)
- 5 vertical zone slots, max 2 per zone
- HP: 7, fire rate: 1 shot/sec after 300ms windup
- Persist from Stage 2 through Stage 10

### Kamikazes
- Fast straight-line suicide units, no homing
- Introduced Stage 3, pause at Stage 5/7, return Stage 6/8+

### Map Hazards
- Always spawn under the player
- 2200ms warning → 3000ms active → 500ms closing
- Radius: 220px, damage cooldown 1500ms
- Active Stage 3 onward

### Snipers
- Diamond shape, long windup with expanding ring telegraph
- Introduced Stage 5

### Shield Drones
- Small cyan orbiting unit, HP 2, no attack
- Locks onto a turret or elite and makes them fully invincible until the drone dies
- Counter-rotating diamond shape — visually distinct from all other enemies
- Introduced Stage 4

### Shielded
- Extra shield HP layer, requires sustained burst to break
- Introduced Stage 7

---

## Mechanics Not In The Game

These were considered and rejected or deferred:

- **Darkness** — removed. Screen blackout conflicts with the OLED/neon fantasy and is unpleasant rather than skillful.
- Support drones, gravity wells, EMP zones, laser walls — deferred. Not blocked, but not scheduled.

Do not reintroduce darkness.

---

## HUD Philosophy

- All key info left-aligned, top-left
- `LIVES  N` — no shield display, no recharge arc
- Stage timer rendered as large faded watermark in center (pulses red under 5s)
- Active mechanics listed below stage/time line
- `[ESC] PAUSE` bottom-right only
- Control hints fade out after Stage 1

### HUD Rules
- no duplicate indicators for the same state
- if a mechanic is shown in the HUD, it must be real
- no temporary debug-looking text surviving into production

---

## Heat System

Heat is a core identity mechanic, not a side mechanic.

What heat does:
- discourages mindless fire-holding
- creates rhythm in aggression
- rewards calm pacing

What heat does not do:
- become a detached UI minigame
- require multiple redundant indicators

One primary indicator: circular arc on the ship. Colors: cyan (0–50%) → orange (50–80%) → red-orange (80–100%) → pulsing red when overheated.

### Dash + Heat Loop
- barrel roll dash should refund a modest amount of heat on use
- target first-pass refund: `10–15` flat heat
- the goal is to reward movement rhythm and keep the player flowing
- dash should feel like an active heat-management tool, not only a panic escape

### OverDrive Role
- OverDrive is one of the game’s main payoff states
- it should be built primarily through kills and aggressive combat momentum
- it should not depend on graze anymore
- during OverDrive:
  - heat gain should be suspended
  - movement speed should increase modestly
  - weapon visuals should intensify

---

## Score Philosophy

Score is the style meter, not the objective.

Score rewards:
- aggressive target removal
- dash rhythm and pressure control
- overdrive uptime
- elite kills
- survival consistency under pressure

---

## Fairness Rules

### Must-Have
- brief post-hit invulnerability (300ms)
- clear kill cause when possible
- readable telegraphs for dangerous attacks
- no surprise lethal stack from invisible overlapping states

### Rule
If the player cannot explain why they died, the game is losing trust.

---

## Production Guardrails

Before any new mechanic is considered complete, verify:
- is the threat readable?
- does the player understand the counterplay?
- does it support target priority?
- does it harmonize with heat, dash, and overdrive?
- does it add tension without creating visual mush?

If the answer to any of those is no, the mechanic is not ready.

---

## Current Status (as of Stage 3 complete)

- S1–S3: implemented and tested
- S4: mechanic stacking config set, no new enemies — needs tuning pass
- S5: snipers in MECHANIC_ASSIGNMENT, sniper visual redesigned — needs play testing
- S6–S10: config set, not individually tuned or tested yet

**Workflow rule: test one stage at a time before moving to the next.**

---

## Short Version

TechnoDrone is a 5-minute neon survival shooter where each 30-second stage introduces or intensifies a distinct combat threat, mechanics stack and never leave, aggression creates space, and every system supports fast, readable, high-dopamine play.
