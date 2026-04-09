# New Player Clarity Audit
Last updated: 2026-04-09

---

## What Changed Since Last Audit

These mechanics were added or reworked since the original audit and need tutorial consideration:

- **Elite orb drop system** — Elites no longer instantly grant the laser. They now drop a green pickup orb that drifts toward the player slowly, then snaps when within 250px. Player must collect it.
- **Laser refill** — Collecting a second elite orb while the laser is active now fully refills ammo instead of granting Flow State charge.
- **Laser ammo reduced** — Max fuel dropped from 200 → 100. The laser is now shorter-lived and refillable, not a sustained weapon.
- **Elite spawn rates halved** — Elites are rarer across all stages. They are now meaningful events, not background noise.

---

## Core Problem Statement

TechnoDrone has strong mechanics. The clarity problem is not missing features — it is that too many mechanics are expected to be self-taught at exactly the wrong moments.

The game currently fails to answer two questions fast enough:
1. **Is this dangerous?**
2. **Should I care about this right now?**

---

## Full Mechanic Inventory

### Mechanics the tutorial currently teaches

| Mechanic | How taught |
|----------|-----------|
| Move (A/D) | Dedicated step, must hit both zones |
| Shoot (J / mouse) | Dedicated step, must kill 5 enemies |
| Heat | Dedicated step, must overheat and cool |
| Dash (space + direction) | Dedicated step, must dash both directions |
| Dash kills enemies | Dedicated step, must kill 2 with dash |
| Dash dumps heat | Dedicated step, must dash and reduce heat |
| Flow State | Dedicated step, must activate and hold 5s |
| Taking damage breaks Flow State | Dedicated step, must get hit |
| Laser (K / right-click) | Dedicated step, orb pre-granted, must kill 10 |
| Bass Drop / Nuke (Q) | Dedicated step, must use it |

### Mechanics the tutorial does NOT teach

| Mechanic | First appears | Gap |
|----------|--------------|-----|
| **Elite enemies** | Stage 1 | Player may kill them without knowing they're special |
| **Elite orb pickup** | Stage 1 | No indication the orb exists, what it means, or how to collect it |
| **Laser refill via elite orb** | Any stage | Completely undocumented |
| **Kamikaze drones** | Stage 3 | No warning before first encounter, tight reaction window |
| **Telegraph ring** | Stage 3 | The orange shrinking ring has no prior teaching |
| **Turrets** | Stage 2 | Stationary shooters — players may ignore them until getting hit |
| **Shield drones** | Stage 4 | Orbit and protect nearby enemies — role is invisible |
| **Shielded enemies** | Stage 7 | Cyan-outlined enemies absorb hits — requires breaking shield first |
| **Chain multiplier** | Throughout | Score multiplier for consecutive kills — never explained |
| **Graze mechanic** | Throughout | Close bullet dodges for bonus — completely undocumented |
| **Formation spawns** | Stage 4+ | Coordinated enemy patterns — no tutorial |

---

## Priority Gaps

### 1. Kamikaze — Needs Work

**The mechanic:**
- Spawns opposite side from player, hunts across screen horizontally (vx ±55)
- When aligned with player X (within ~15px), plays "sniperWarning" audio and enters **telegraph** state
- Telegraph lasts **350ms** — orange ring shrinks around the enemy as a countdown
- Then enters **charge** — straight down at **640px/s**, no horizontal movement
- HP: 1 hit. Shape: arrowhead. Color: red-orange (#ff2200)

**Why it's confusing:**
- First encounter is Stage 3, no prior teaching
- 350ms is too short for a new player to recognize the pattern and react
- The orange ring is the only warning, and it's small relative to the action on screen
- Spawn behavior (appears off-center, hunts toward player X) can make it look like a normal enemy until it suddenly dives
- No on-screen language communicates "this is a dive attack, dash sideways"
- The audio cue ("sniperWarning") is helpful but only fires once and relies on the player knowing what it means

**What needs to change:**

Option A — Extend telegraph window
- Increase from 350ms to 550ms
- Gives a first-time player more time to register the visual before the charge
- Low risk, pure upside

Option B — Add a first-encounter callout
- On the very first kamikaze telegraph the player sees, flash a short on-screen message: `DASH TO DODGE`
- One-time only (tracked via flag), disappears after 1.5s
- Teaches the correct response without a full tutorial step

Option C — Strengthen the telegraph visual
- Make the orange ring larger and more dramatic
- Add a brief directional indicator (e.g., a flash of vertical line below the kamikaze)
- The dive direction is always straight down — make that readable before it happens

**Recommendation:** Do all three. A+B+C costs 1–2 hours and eliminates the single most jarring surprise in early-game.

---

### 2. Elite Orb — Tutorial Step Needs Update

The tutorial currently:
- Pre-grants the laser in the `spread` step (bypasses the elite orb system entirely)
- Says nothing about elites
- Says nothing about orbs floating toward the player
- Says nothing about refilling ammo

The tutorial needs to teach:
1. Elites exist and they look different (hexagon, red, pulsing ring)
2. Killing an elite drops a green orb
3. Fly toward the orb to collect it — it accelerates toward you when close
4. The orb gives you the laser. Collecting another orb while active refills ammo.

**Options:**

Option A — Add a dedicated elite tutorial step
- Spawn 1 elite
- Show: `ELITE ENEMY — KILL FOR POWER`
- When killed, the orb drops
- Show: `COLLECT THE ORB`
- Player must collect it and fire the laser
- Replaces the current "laser is pre-granted" approach

Option B — Keep pre-grant in tutorial, add a first-encounter callout in-game
- When the first elite dies in a live run, flash: `COLLECT THE ORB — GRANTS LASER`
- Simpler, no tutorial restructure needed
- Weaker teaching (single callout during chaos)

**Recommendation:** Option A. The elite orb is now a core reward loop mechanic. It deserves a dedicated step. The laser step becomes: kill the elite, collect the orb, fire it.

---

### 3. Overdrive / Flow State Naming (Carried from Previous Audit)

Still unresolved: `Overdrive` and `Overheat` are too similar in language. Both are heat-related, both sound like intense states, but one is good and one is bad.

Proposed decision:
- **Rename Overdrive** → `FLOW STATE` is already what it's called internally. The HUD label and callout text should match.
- Confirm: is the current in-game text using "Overdrive" or "Flow State"? If still using "Overdrive," rename it.

**Recommendation:** Audit all callouts, HUD labels, and tutorial text for the word "Overdrive" and replace with "FLOW STATE."

---

### 4. Chain Multiplier — No Teaching

The chain multiplier is a meaningful score system (x2 at 15 kills, x3 at 30, x4 at 50, max at 75) but is never explained.

Players may notice the `CHAIN x2` callout but don't know:
- What counts as breaking the chain
- Whether it's time-based or hit-based
- Why maintaining the chain matters

This doesn't need a full tutorial step. It needs a one-line explanation when the chain first activates:
- First time chain hits x2: flash `CHAIN MULTIPLIER — KEEP KILLING`

---

### 5. Turret — No Teaching

Turrets appear Stage 2+. They are stationary, lock on, and fire at the player. The issue:
- New players may try to dodge their shots and never prioritize them
- Turrets that are off-screen or in a corner can create invisible damage
- The message "turret = kill first" is never communicated

**Recommendation:** First-encounter callout when the first turret spawns: `TURRET — PRIORITY TARGET`

---

### 6. Shield Drone — No Teaching

Shield drones orbit nearby enemies and protect them. The issue:
- Players shoot shielded enemies and nothing happens — frustrating and unclear
- The solution (kill the shield drone first) is not communicated
- Appears Stage 4

**Recommendation:** First-encounter callout when a shield drone first appears: `SHIELD DRONE — KILL IT TO EXPOSE PROTECTED ENEMIES`

---

## Tutorial Step Proposed Sequence (Revised)

| Step | Mechanic | Change from current |
|------|---------|-------------------|
| 1 | Move | No change |
| 2 | Shoot | No change |
| 3 | Heat | No change |
| 4 | Dash | No change |
| 5 | Dash kills | No change |
| 6 | Dash dumps heat | No change |
| 7 | Flow State | No change |
| 8 | Taking damage | No change |
| **9** | **Elites + Orb + Laser** | **NEW: spawn elite, kill it, collect orb, fire laser** |
| 10 | Bass Drop | No change (shift from step 10 → 10) |
| 11 | Release | No change |

---

## In-Game First-Encounter Callouts (Separate from Tutorial)

These are one-time messages that fire the first time a player encounters a mechanic in a real run. Each is tracked by a flag, fires once per save/session, then never again.

| Trigger | Message | Duration |
|---------|---------|---------|
| First kamikaze telegraph | `DASH TO DODGE` | 1.5s |
| First turret spawn | `TURRET — PRIORITY TARGET` | 2s |
| First shield drone spawn | `SHIELD DRONE — KILL IT FIRST` | 2s |
| First chain x2 | `CHAIN MULTIPLIER — KEEP KILLING` | 2s |
| First elite orb drops (outside tutorial) | `COLLECT THE ORB` | 2s |

---

## Recommended Priority Order

1. **Kamikaze** — extend telegraph (350ms → 550ms) + first-encounter callout + bigger ring visual
2. **Tutorial elite/orb step** — replace pre-granted laser with kill-elite → collect-orb → fire flow
3. **First-encounter callout system** — generic infrastructure, then populate above triggers
4. **Overdrive → Flow State** — audit all labels for consistency
5. **Chain callout** — one-liner on first x2
6. **Turret + shield drone callouts** — one-liners on first encounter

---

## Summary

The game is mechanically sound. The clarity pass is about two things:

1. **Tutorial**: teach the elite orb system, and introduce kamikazes before Stage 3 drops them on unprepared players.
2. **First-encounter callouts**: lightweight one-time messages that close the gap for every mechanic that's too late or too complex for the tutorial.

The kamikaze is the single most jarring undocumented moment in the early game. It is also the easiest to fix.

---

## Handoff — Instructions for Continuing Agent

**Project location:** `C:/Users/brian/Downloads/Anti gravity/Projects/TechnoDrone/`
**Main entry point:** `index.html`
**JS files:** `js/enemies.js`, `js/ui.js`, `js/stage.js`, `js/weapons.js`, `js/player.js`, `js/constants.js`

---

### Recent changes already implemented (do NOT redo these)

All of the following are already in the codebase as of 2026-04-09:

- `js/constants.js` lines 34–43: Elite spawn rates halved across all stages
- `js/player.js` line 511: `SPREAD_MAX_FUEL` = 100
- `js/weapons.js`:
  - `pickups.eliteOrbs` array added
  - `pickups.spawnEliteOrb(x, y, type)` method added
  - Elite orb update loop: slow drift (60px/s) at distance, snaps at 320px/s within 250px, collected at dist < 25
  - Elite orb draw: green (#39ff14) double-ring bloom with pulsing core, pull-phase spokes
  - `pickups.reset()` clears `eliteOrbs`
  - Collecting elite orb while laser active now **refills spreadFuel to max** (not Flow State charge)
- `js/stage.js` lines 57–67: Elite kill now calls `pickups.spawnEliteOrb()` instead of instant laser grant. Skips drop on nuke kills.

---

### Task 1 — Kamikaze fix (START HERE)

**Files to edit:** `js/enemies.js`, `js/ui.js` (for first-encounter callout)

**Step 1 — Extend telegraph window**
In `js/enemies.js`, find the kamikaze state machine (around line 704). Find the telegraph duration constant (currently `350`). Change it to `550`.
Search for: `chargerTelegraphTimer` — the duration is assigned when state changes to `'telegraph'`.

**Step 2 — Enlarge telegraph ring**
In `js/enemies.js` around line 1061–1074, the telegraph ring render reads:
```js
const ringR = s.size * (2.5 - telegraphProgress * 1.5);
```
Change the multipliers so the ring starts larger and fades more slowly:
```js
const ringR = s.size * (4.5 - telegraphProgress * 2.5);
```
Also increase `shadowBlur` from 12 to 20, and `lineWidth` from 2 to 3, for more visibility.

**Step 3 — Add a vertical dive indicator**
During telegraph phase, draw a thin vertical line from the kamikaze downward to the bottom of the play area, fading in over the telegraph duration. Color: `#ff6600` at ~0.3 alpha. This makes the dive direction readable before it happens.

**Step 4 — First-encounter callout**
In `js/ui.js`, find `streakCallout` or the callout system. Add a one-time flag (e.g., `let hasShownKamikazeWarning = false`). When a kamikaze first enters telegraph state, if the flag is false: show callout `DASH TO DODGE`, set flag true. Duration 1800ms. This is one-time per session, never repeats.

---

### Task 2 — Tutorial: replace laser pre-grant with elite orb step

**File to edit:** `js/ui.js`

The current tutorial step 9 (`spread`) pre-grants the laser via `player.activateAltFire('spread')` during `_setupStep`. This bypasses the elite orb system entirely.

**What to change:**
1. In `_setupStep`, for the `spread` step: instead of pre-granting the laser, spawn 1 elite enemy near the center of the play area. Make it stationary (vx=0, vy=0) or very slow so the player can focus on it.
2. Change the step title to `ELITE ENEMY` and subtitle to `KILL IT FOR POWER`.
3. Add a sub-phase: after the elite is killed and the orb drops, change the subtitle to `COLLECT THE ORB`.
4. Completion condition: player must collect the orb (check `player.altFireType === 'spread'`) AND fire it AND kill 5 enemies with it (reduce from current 10 to reduce friction).
5. The orb spawns via the normal `pickups.spawnEliteOrb()` path — no special-casing needed.

**Key file locations in ui.js to find:**
- Tutorial steps array: search for `id: 'spread'`
- `_setupStep` function: search for `activateAltFire`
- Completion conditions: search for `case 'spread'`

---

### Task 3 — First-encounter callout infrastructure

**File to edit:** `js/ui.js` or a new `js/hints.js`

Build a lightweight one-time hint system. Structure:
```js
const firstEncounterHints = {
  kamikaze:    false,
  turret:      false,
  shieldDrone: false,
  chain:       false,
  eliteOrb:    false,
};

function showHintOnce(key, message, duration = 2000) {
  if (firstEncounterHints[key]) return;
  firstEncounterHints[key] = true;
  streakCallout.show(message, '#ffffff', duration, 1.8, 'center');
}
```

Then wire up each trigger:
- Kamikaze telegraph: `showHintOnce('kamikaze', 'DASH TO DODGE', 1800)` — in `js/enemies.js` when state transitions to `'telegraph'`
- First turret spawn: `showHintOnce('turret', 'TURRET — PRIORITY TARGET', 2000)` — in `js/enemies.js` or `js/stage.js` when turret spawns
- First shield drone spawn: `showHintOnce('shieldDrone', 'SHIELD DRONE — KILL IT FIRST', 2000)` — in `js/enemies.js` when shield drone spawns
- First chain x2: `showHintOnce('chain', 'CHAIN MULTIPLIER — KEEP KILLING', 2000)` — in `js/stage.js` where `c === 15` triggers `CHAIN x2` callout (already exists, just add the hint call)
- First elite orb in live run: `showHintOnce('eliteOrb', 'COLLECT THE ORB', 2000)` — in `js/stage.js` after `pickups.spawnEliteOrb()` is called

---

### Task 4 — Overdrive / Flow State naming audit

**Files to search:** all JS files + `index.html`

Run a search for the word `Overdrive` (case insensitive) across the whole project. Every instance should be replaced with `FLOW STATE`. Confirm the HUD label, callout text, and tutorial subtitle all use the same term.

Search: `grep -ri "overdrive" C:/Users/brian/Downloads/Anti\ gravity/Projects/TechnoDrone/js/`

---

### Verify everything works

After implementing tasks 1–4, test in the browser:
1. Start a new run — skip tutorial
2. Stage 3: first kamikaze should show enlarged ring, `DASH TO DODGE` callout fires once, telegraph lasts visibly longer
3. Stage 1: kill an elite — green orb drops, drifts toward ship, laser activates on collection
4. Play tutorial fresh — step 9 should spawn an elite, not pre-grant the laser
5. Check no instances of "Overdrive" remain in game UI
