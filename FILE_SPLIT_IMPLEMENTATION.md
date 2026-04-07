# TechnoDrone - File Split Implementation Plan

This document is the execution plan for splitting the current single-file game into multiple JavaScript files without changing gameplay behavior.

The split is a maintainability and collaboration task first. It is not a redesign.

---

## Goal

Convert the current monolithic [index.html](C:\Users\brian\Downloads\Anti gravity\Projects\TechnoDrone\index.html) into a multi-script structure that:

- preserves behavior exactly
- reduces context load for future agents
- makes ownership boundaries clearer
- lowers token usage for future work
- keeps the project build-free and easy to run locally

Target structure:

- [index.html](C:\Users\brian\Downloads\Anti gravity\Projects\TechnoDrone\index.html)
- [js/constants.js](C:\Users\brian\Downloads\Anti gravity\Projects\TechnoDrone\js\constants.js)
- [js/core.js](C:\Users\brian\Downloads\Anti gravity\Projects\TechnoDrone\js\core.js)
- [js/player.js](C:\Users\brian\Downloads\Anti gravity\Projects\TechnoDrone\js\player.js)
- [js/enemies.js](C:\Users\brian\Downloads\Anti gravity\Projects\TechnoDrone\js\enemies.js)
- [js/weapons.js](C:\Users\brian\Downloads\Anti gravity\Projects\TechnoDrone\js\weapons.js)
- [js/fx.js](C:\Users\brian\Downloads\Anti gravity\Projects\TechnoDrone\js\fx.js)
- [js/ui.js](C:\Users\brian\Downloads\Anti gravity\Projects\TechnoDrone\js\ui.js)
- [js/starfield.js](C:\Users\brian\Downloads\Anti gravity\Projects\TechnoDrone\js\starfield.js)
- [js/game.js](C:\Users\brian\Downloads\Anti gravity\Projects\TechnoDrone\js\game.js)

---

## Non-Negotiables

- No build tools
- No ES modules
- No behavior changes during the split
- No renaming for style only
- No opportunistic refactors unless required to preserve runtime behavior
- Script files must load in dependency order from `index.html`

If a behavior change is desired, it belongs in a separate spec and separate implementation pass.

---

## Design / Product Guardrails

The split must preserve the current product direction:

- pure `#050505` background
- premium OLED-style glow language
- timed stage progression
- readable hazards
- performance-aware effects
- no unnecessary effect spam

The architecture should make future premium polish easier, not harder.

---

## Recommended Script Ownership

### `constants.js`
Owns:
- colors
- stage configs
- mechanic assignment
- tuning values
- labels and static arrays

Rules:
- constants only
- no runtime side effects

### `core.js`
Owns:
- canvas
- ctx
- input state
- shared utility functions
- time helpers
- save/load helpers if they are truly generic
- shared globals that multiple systems rely on

Rules:
- keep this minimal
- avoid turning this into a dumping ground

### `player.js`
Owns:
- `player`
- `drone`
- `dash`
- `bullets`
- any helpers tightly coupled to those systems

### `enemies.js`
Owns:
- `shards`
- enemy spawning
- enemy bullets
- special enemy constructors like turret/kamikaze/drift

### `weapons.js`
Owns:
- alt-fire systems
- flamethrower
- spread fire behavior
- overdrive-adjacent weapon behaviors if they are not player-core

### `fx.js`
Owns:
- particles
- sparks
- impact FX
- fragments
- smoke
- cached overlay helpers if those are purely visual

### `ui.js`
Owns:
- title screen
- glossary/info screens
- pause
- game over / win
- leaderboard UI
- name entry
- HUD

### `starfield.js`
Owns:
- parallax stars
- shooting stars
- starfield stage scaling

### `game.js`
Owns:
- main loop
- state machine transitions
- collision checks
- stage flow glue
- reset/start/restart wiring

---

## Split Order

This order minimizes risk.

### Phase 1 - Safe Extractions
1. `constants.js`
2. `fx.js`
3. `starfield.js`

Why:
- low coupling
- high readability win
- low behavior risk

### Phase 2 - UI / Support Systems
4. `ui.js`
5. `weapons.js`

Why:
- reduces file size quickly
- improves future delegation

### Phase 3 - High-Coupling Gameplay Systems
6. `enemies.js`
7. `player.js`

Why:
- these touch many systems
- better handled after constants/core/support files are stable

### Phase 4 - Final Wiring
8. `game.js`
9. reduce `index.html` to canvas shell + style + script tags

---

## Verification Rules

After each phase:

1. Run syntax validation on the extracted scripts
2. Launch the game locally
3. Verify:
   - title screen works
   - entering gameplay works
   - HUD appears
   - shooting works
   - enemies spawn
   - pause works
   - death / win still render
4. Update the implementation log

Do not batch multiple phases without verification.

---

## Collaboration Rules

To avoid merge conflicts:

- only one agent should own the split at a time
- a second agent may review or prepare docs, but should not edit overlapping files during extraction
- if another agent is implementing a gameplay feature, pause that work or land it before beginning the split

Best pattern:
- Split agent owns architecture
- Review agent owns QA notes, risk review, and follow-up specs

---

## What Must Not Happen During the Split

- converting globals into classes "because it's cleaner"
- renaming core functions for style
- changing balance while moving code
- folding multiple systems together
- mixing new feature work into extraction commits

This plan succeeds by being boring and disciplined.

---

## Phase Checklist

### Phase 1 Checklist
- extract constants exactly
- extract visual FX exactly
- extract starfield exactly
- verify no missing globals

### Phase 2 Checklist
- extract menus/HUD/title/death/win rendering
- extract alt-fire/flamethrower/spread logic
- verify all UI states still render correctly

### Phase 3 Checklist
- extract enemy system
- extract player/drone/dash/bullets
- verify all combat interactions still function

### Phase 4 Checklist
- extract loop/state/reset/collision glue
- convert `index.html` into shell
- confirm direct file launch still works

---

## Success Definition

The split is complete when:

- the game behaves identically
- each major system has a clear file home
- new agents can work on one file or subsystem without loading the full game
- the architecture is simpler to reason about than the original single-file version

---

## Immediate Next Step

Begin with `constants.js` extraction only.

That first pass should:
- create the `js/` directory
- move only true constants
- add script tags in dependency order
- leave gameplay untouched

If that lands cleanly, continue to `fx.js`.
