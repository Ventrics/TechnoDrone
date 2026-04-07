# Stage 7 - Sniper Hunt Implementation

Paste this prompt into your implementation agent.

---

## Prompt

Files to edit will likely include:
- `C:/Users/brian/Downloads/Anti gravity/Projects/TechnoDrone/js/stage.js`
- `C:/Users/brian/Downloads/Anti gravity/Projects/TechnoDrone/js/enemies.js`
- and only the minimum additional files needed for telegraphs / visual clarity

Add a new Stage 7 mechanic: `Sniper Hunt`.

Stage 7 is the first stage that should feel like the game is fully in its hard-mode identity.
By now, the player has already learned:
- swarm flow
- anchor priority
- burst pressure
- support-target priority
- space control
- sensory compression under blackout

Stage 7 should make the player feel:

`I am being hunted from multiple angles inside a hostile arena.`

This stage must feel:
- sharp
- dangerous
- deliberate
- readable

It must not feel:
- random
- cluttered
- unfairly busy

---

## Design Intent

Stage 7 is where the game stops feeling like “new mechanics being introduced”
and starts feeling like `curated pressure stacks`.

The player should now be tested on:
- kill order
- lane awareness
- routing under movement pressure
- reacting to precision threats while previous mechanics are still active

This is the correct step after Stage 6.

---

## Headline Mechanic

Stage 7 introduces `Snipers` as the headline threat.

This is not just “enemy bullets.”
Snipers should create:
- long-lane pressure
- threat timing
- positional fear
- immediate target-priority stress

If the player ignores a sniper, they should get punished.
If they read the tell and react quickly, they should feel smart.

---

## Returning Mechanics

Stage 7 should stack `3-4` mechanics total.

Recommended Stage 7 stack:
- `Snipers` (headline mechanic)
- `Turrets`
- `Support Drones`
- `Gravity Wells`

Optional:
- very light `Kamikaze` presence only if playtesting shows the board still feels too passive

Do **not** let kamikazes dominate this stage.
The point here is precision pressure, not panic spam.

---

## Stage Fantasy

This stage should feel like:
- turrets anchor bad lanes
- support drones keep important threats alive
- gravity wells distort your escape options
- snipers punish hesitation or lazy positioning

That combination creates a strong late-game identity without requiring excessive clutter.

---

## Sniper Behavior

Snipers should:
- appear as part of standard enemy waves or as a special enemy flag on selected enemies
- pause briefly to line up shots
- project a visible warning tell
- fire clearly readable long-range shots

Their purpose is:
- not pure DPS
- not volume spam
- but `precision threat pressure`

If the player fails to identify the sniper lane, they should feel it.

---

## Readability Requirements

Stage 7 only works if the sniper mechanic is perfectly readable.

### Required reads
- where the sniper is
- when the shot is coming
- what lane is threatened
- whether the sniper is on-screen or off-screen

### Required visual treatment
- visible charge-up
- clear beam / line telegraph
- bright readable projectile
- off-screen warning if sniper is outside the viewport

If this is not readable, the stage will feel cheap.

---

## Stage 7 Pressure Philosophy

This stage should not add more mechanics just because it can.

It should instead create pressure through:
- interactions between mechanics
- tighter kill-order decisions
- constrained safe routes

Good Stage 7 pressure:
- turret lane + sniper angle + support tether + gravity pull

Bad Stage 7 pressure:
- every enemy type doing everything at once

---

## Recommended Board-State Rules

To keep the stage hard but readable, use role limits:

### Anchor pressure
- `Turrets`: yes
- keep active turret count controlled

### Support pressure
- `Shield Drone` / `Repair Drone`: yes
- but do not flood the board with support links

### Space-control pressure
- `Gravity Wells`: yes
- likely only `1` active at a time for most of the stage

### Precision pressure
- `Snipers`: yes
- the main escalation mechanic

This gives the stage structure.

---

## Suggested First-Pass Stage Rules

### Snipers
- moderate presence at stage start
- stronger presence in second half of stage
- should be common enough to define the stage, but not so common that the screen turns into permanent warning beams

### Turrets
- light returning presence
- enough to anchor space and create kill-order tension

### Support Drones
- occasional, not constant
- ideally support turrets or elites when possible

### Gravity Wells
- controlled use
- likely `1` active at a time
- should shape movement, not erase it

---

## What Stage 7 Should Teach

The player should learn:
- the most dangerous enemy is not always the closest one
- if they fail to clear priority threats early, the board becomes harder to solve
- safe movement must be planned, not improvised

This is the first stage where the player should feel truly hunted.

---

## Emotional Goal

The player should feel:
- “I have to think fast”
- “I can’t just kite”
- “I know why the board is dangerous”
- “if I solve the right problem first, I can survive”

That is the ideal late-game survival emotion.

---

## Visual Feel

Stage 7 should look:
- crisp
- threatening
- lane-oriented
- high-contrast

Sniper telegraphs should become a major part of the screen language here.
They should not overpower all other visuals, but they should be one of the first things the player notices.

---

## Fairness Rules

Stage 7 must obey:

### 1. Precision threats must be readable
Snipers cannot be allowed to become invisible noise.

### 2. Board-state must remain explainable
The player should be able to understand why the screen became dangerous.

### 3. Threat roles must stay distinct
- turrets = anchors
- support drones = force multipliers
- gravity wells = movement tax
- snipers = precision punishment

Do not blur these roles.

### 4. Difficulty should come from interaction, not volume
If the stage is hard only because there are too many things, it has failed.

---

## Suggested First-Pass Balance Approach

Balance by controlling:
- simultaneous sniper pressure
- simultaneous support links
- turret count
- gravity-well frequency

Do **not** solve the stage by just lowering enemy HP or making everything weaker.

The correct tuning lever is:
`how many serious decisions the player must make at once`

That is the real difficulty budget.

---

## Practical Build Order

Recommended implementation order:

1. Lock Stage 7 mechanic assignment
2. Tune sniper presence and cadence
3. Add light turret return
4. Add support-drone return
5. Add gravity-well overlap
6. Playtest readability before increasing intensity

Do not start by turning every mechanic to maximum.

---

## What Stage 7 Should Feel Like

Stage 7 should feel like:

`the arena knows where you are, the lanes are hostile, and survival depends on solving the board before it solves you`

That is the right emotional leap after Stage 6.

---

## Summary

Stage 7 introduces `Sniper Hunt`.

Headline mechanic:
- `Snipers`

Returning mechanics:
- `Turrets`
- `Support Drones`
- `Gravity Wells`

Stage purpose:
- test precision threat awareness under stacked arena pressure

This stage should be the first true `curated pressure stack` stage in the late game.
