# TechnoDrone - Implementation Log

This file is the running record of significant changes, decisions, and architectural work.

Purpose:
- help debug regressions
- speed up future agent handoffs
- preserve intent, not just final code state

Update this file whenever a meaningful system change lands.

---

## Logging Rules

For each entry, include:
- date
- change area
- what changed
- why it changed
- risk / follow-up if applicable

Keep entries concise and high signal.

---

## 2026-03-24

### Project Management / Architecture
- Added [FILE_SPLIT_IMPLEMENTATION.md](C:\Users\brian\Downloads\Anti gravity\Projects\TechnoDrone\FILE_SPLIT_IMPLEMENTATION.md)
- Purpose: define a behavior-preserving plan for splitting the game out of the single [index.html](C:\Users\brian\Downloads\Anti gravity\Projects\TechnoDrone\index.html)
- Key decision: split by system in phases, verify after each phase, no gameplay changes during extraction
- Began Phase 1 of the actual split
- Added [js/constants.js](C:\Users\brian\Downloads\Anti gravity\Projects\TechnoDrone\js\constants.js) as the new home for static tuning/config values
- Updated [index.html](C:\Users\brian\Downloads\Anti gravity\Projects\TechnoDrone\index.html) to load `js/constants.js` before the main inline script
- Neutralized the old inline constants block so `js/constants.js` is now the live source of truth without changing runtime behavior
- Added [js/starfield.js](C:\Users\brian\Downloads\Anti gravity\Projects\TechnoDrone\js\starfield.js) for the gameplay parallax star field
- Updated [index.html](C:\Users\brian\Downloads\Anti gravity\Projects\TechnoDrone\index.html) to load `js/starfield.js`
- Neutralized the old inline gameplay-starfield block so the extracted file is now the active version
- Added [js/fx.js](C:\Users\brian\Downloads\Anti gravity\Projects\TechnoDrone\js\fx.js) for reusable visual FX systems
- Moved fragments, burst particles, hit sparks, impact FX, and smoke particles into the extracted file
- Updated [index.html](C:\Users\brian\Downloads\Anti gravity\Projects\TechnoDrone\index.html) to load `js/fx.js`
- Neutralized the old inline FX block so the extracted file is now the active version
- Added [js/core.js](C:\Users\brian\Downloads\Anti gravity\Projects\TechnoDrone\js\core.js) for shared infrastructure
- Moved save helpers, player-name helpers, canvas/context setup, bloom canvas setup, glow helpers, input state, shared save state, and frame timing helpers into the extracted file
- Moved top-level title/game state globals into `js/core.js` as well (`gameState`, title selection state)
- Updated [index.html](C:\Users\brian\Downloads\Anti gravity\Projects\TechnoDrone\index.html) to load `js/core.js`
- Neutralized the old inline core-utility block so the extracted file is now the active version
- Corrected script loading so extracted gameplay-dependent files load only after their required globals exist
- Added [js/ui.js](C:\Users\brian\Downloads\Anti gravity\Projects\TechnoDrone\js\ui.js) for the first safe UI slice
- Moved leaderboard background rendering, the leaderboard object, and the name-entry overlay into the extracted file
- Updated [index.html](C:\Users\brian\Downloads\Anti gravity\Projects\TechnoDrone\index.html) to load `js/ui.js`
- Neutralized the old inline leaderboard/name-entry block so the extracted file is now the active version
- Expanded [js/ui.js](C:\Users\brian\Downloads\Anti gravity\Projects\TechnoDrone\js\ui.js) with the next screen-render slice
- Moved `drawStageNodes`, `drawTitleScreen`, `drawEndScreen`, `drawDeathScreen`, `drawWinScreen`, pause UI state, and `drawPauseMenu` into the extracted file
- Left the pause input listener and game-state transitions in [index.html](C:\Users\brian\Downloads\Anti gravity\Projects\TechnoDrone\index.html) to keep this pass behavior-safe
- Neutralized the old inline title/end/pause render block so the extracted file is now the active version
- Expanded [js/ui.js](C:\Users\brian\Downloads\Anti gravity\Projects\TechnoDrone\js\ui.js) again with the main in-game presentation helpers
- Moved `drawHUD`, vignette/scanline cache helpers, `drawVignetteAndScanlines`, `drawDarknessOverlay`, and the runtime-error overlay helpers into the extracted file
- Left tutorial flow, reset/start logic, and the main update loop in [index.html](C:\Users\brian\Downloads\Anti gravity\Projects\TechnoDrone\index.html) for this pass
- Neutralized the old inline HUD/overlay/runtime-overlay blocks so the extracted file is now the active version
- Expanded [js/ui.js](C:\Users\brian\Downloads\Anti gravity\Projects\TechnoDrone\js\ui.js) with the remaining title/tutorial boot helpers
- Moved `tutorial`, `_resetAllState`, `startGame`, and `updateTitle` into the extracted file
- Neutralized the old inline tutorial/title-update block so the extracted file is now the active version
- Verified both [js/ui.js](C:\Users\brian\Downloads\Anti gravity\Projects\TechnoDrone\js\ui.js) and the remaining inline script with syntax checks after fixing legacy comment boundaries
- Added [js/weapons.js](C:\Users\brian\Downloads\Anti gravity\Projects\TechnoDrone\js\weapons.js) for the first combat-systems extraction
- Moved `streakCallout`, `isPlayerMoving`, `isFireHeld`, `bullets`, `pickups`, `flamethrower`, `screenNuke`, and `chainLightning` into the extracted file
- Updated [index.html](C:\Users\brian\Downloads\Anti gravity\Projects\TechnoDrone\index.html) to load `js/weapons.js`
- Neutralized the old inline weapon/alt-fire blocks so the extracted file is now the active version
- Verified both [js/weapons.js](C:\Users\brian\Downloads\Anti gravity\Projects\TechnoDrone\js\weapons.js) and the remaining inline script with syntax checks
- Added [js/player.js](C:\Users\brian\Downloads\Anti gravity\Projects\TechnoDrone\js\player.js) for the next safe movement/render slice
- Moved `dash`, `drone`, and `drone.init()` into the extracted file
- Updated [index.html](C:\Users\brian\Downloads\Anti gravity\Projects\TechnoDrone\index.html) to load `js/player.js`
- Neutralized the old inline `dash` / `drone` block so the extracted file is now the active version
- Verified both [js/player.js](C:\Users\brian\Downloads\Anti gravity\Projects\TechnoDrone\js\player.js) and the remaining inline script with syntax checks
- Expanded [js/player.js](C:\Users\brian\Downloads\Anti gravity\Projects\TechnoDrone\js\player.js) with `graze` and the main `player` state object
- Moved player damage/heat/shield/overdrive/alt-fire state management into the extracted file
- Neutralized the old inline `graze` / `player` block so the extracted file is now the active version
- Re-verified [js/player.js](C:\Users\brian\Downloads\Anti gravity\Projects\TechnoDrone\js\player.js) and the remaining inline script with syntax checks after the state extraction
- Added [js/enemies.js](C:\Users\brian\Downloads\Anti gravity\Projects\TechnoDrone\js\enemies.js) for the enemy/spawn slice
- Moved shard shape helpers, stage enemy stat helpers, spawn helpers, `shards`, `enemyBullets`, `applyDamageToShard`, and `destroyShard` into the extracted file
- Updated [index.html](C:\Users\brian\Downloads\Anti gravity\Projects\TechnoDrone\index.html) to load `js/enemies.js` before [js/weapons.js](C:\Users\brian\Downloads\Anti gravity\Projects\TechnoDrone\js\weapons.js)
- Neutralized the old inline enemy definition blocks so the extracted file is now the active version
- Verified both [js/enemies.js](C:\Users\brian\Downloads\Anti gravity\Projects\TechnoDrone\js\enemies.js) and the remaining inline script with syntax checks
- Restored `checkCollisions()` in [js/enemies.js](C:\Users\brian\Downloads\Anti gravity\Projects\TechnoDrone\js\enemies.js) after removing the old inline enemy block exposed that it was still only present in commented legacy code
- Added [js/game.js](C:\Users\brian\Downloads\Anti gravity\Projects\TechnoDrone\js\game.js) for the final live gameplay wiring layer
- Moved the pause listener, `update`, `render`, title click handler, restart/debug preview listeners, and `loop` into the extracted file
- Updated [index.html](C:\Users\brian\Downloads\Anti gravity\Projects\TechnoDrone\index.html) to load [js/game.js](C:\Users\brian\Downloads\Anti gravity\Projects\TechnoDrone\js\game.js) after the gameplay system files
- Removed the old inline game-loop/live listener block from [index.html](C:\Users\brian\Downloads\Anti gravity\Projects\TechnoDrone\index.html)
- Verified [js/game.js](C:\Users\brian\Downloads\Anti gravity\Projects\TechnoDrone\js\game.js) and the remaining inline script with syntax checks
- Deleted unused ES-module leftovers: [js/app.js](C:\Users\brian\Downloads\Anti gravity\Projects\TechnoDrone\js\app.js), [js/config.js](C:\Users\brian\Downloads\Anti gravity\Projects\TechnoDrone\js\config.js), and [js/storage.js](C:\Users\brian\Downloads\Anti gravity\Projects\TechnoDrone\js\storage.js)
- Kept [js/audio.js](C:\Users\brian\Downloads\Anti gravity\Projects\TechnoDrone\js\audio.js) because it appears to be intentional future work tied to [AUDIO_IMPLEMENTATION.md](C:\Users\brian\Downloads\Anti gravity\Projects\TechnoDrone\AUDIO_IMPLEMENTATION.md)
- Added [js/stage.js](C:\Users\brian\Downloads\Anti gravity\Projects\TechnoDrone\js\stage.js) and moved the remaining live stage/mechanic globals there (`altFireDropIndex`, `mechanicAssignment`, `buildMechanicAssignment`, `getActiveMechanics`, `stage`)
- Replaced [index.html](C:\Users\brian\Downloads\Anti gravity\Projects\TechnoDrone\index.html) with a clean shell file that now only contains the canvas, minimal styles, and script tags
- Final active runtime order is now: `constants.js`, `core.js`, `ui.js`, `player.js`, `stage.js`, `starfield.js`, `fx.js`, `enemies.js`, `weapons.js`, `game.js`
- Verified [js/stage.js](C:\Users\brian\Downloads\Anti gravity\Projects\TechnoDrone\js\stage.js) with syntax checks and confirmed the final shell structure

### Stage 2 Planning
- Rewrote [STAGE2_IMPLEMENTATION.md](C:\Users\brian\Downloads\Anti gravity\Projects\TechnoDrone\STAGE2_IMPLEMENTATION.md)
- Updated it to match timed survival instead of old kill-quota language
- Reduced proposed simultaneous turret cap from `4` to `3`
- Framed Stage 2 as a target-priority teaching stage

### Alt-Fire / OverDrive Cleanup
- Extra alt-fire pickups collected while an alt-fire is already active now feed OverDrive instead of queuing hidden state
- Removed stale queued alt-fire behavior
- Goal: make screen state reflect actual state and reduce pickup confusion

### Alt-Fire Consistency Pass
- `Spread` was changed from timer-based behavior to fuel-based behavior, matching `Flame`
- Goal: keep alt-fire family rules consistent and reduce contradictory design language

### Flamethrower
- Removed fuel recharge
- Reworked visuals multiple times toward a broader forward fire-plume / fire-cloud look
- Status: improved, but still considered an active polish area

### Flamethrower — Startup Ramp (Agent 2)
- Added `startupProgress` property (0→1 over 280ms) to flamethrower object
- Flame now grows from ship outward to max range instead of appearing at full length instantly
- Particle spawn, ribbon draw, sway amplitude, ribbon body size, and damage hitbox all scale with `startupProgress`
- Retracts on release at 60% of ramp time (~170ms) for snappy shutdown
- Why: full-length instant pop felt disconnected from the OLED design language — fire should feel projected, not teleported
- Risk: none, purely additive to existing flamethrower system

### Dash / Barrel Roll
- Dash was changed to vertical-only (`Up + Space`, `Down + Space`)
- Forward dash removed
- Barrel roll visual was iterated toward a nose-pivot roll
- Status: improved, but still considered an active polish area

### Dash / Barrel Roll — Y-Scale Fix (Agent 2)
- Replaced `ctx.rotate(dash.rollAngle)` with `ctx.scale(1, Math.cos(dash.rollAngle))`
- Old approach rotated the ship in the 2D plane like a clock hand — nose swung around, looked like a backflip
- New approach simulates 3D barrel roll around the forward axis: body squashes at 90°/270°, flips at 180°, nose stays planted at x=22
- Updated `rollScaleY` replaces old `rollWidth` variable throughout
- Afterimage trail updated to match (uses `trailScaleY` instead of rotation)
- `bellyFlash` now derived from `rollScaleY` instead of old `rollFlip`
- Why: user reported the roll looked like a weird diagonal/backward flip, not an airplane barrel roll
- Risk: needs live play validation — the Y-scale approach may need easing tweaks for weight/snap feel

### Planning Docs Created (Agent 2)
- `STAGE2_IMPLEMENTATION.md` — turret enemy spec for Stage 2 (cross shape, drift-in-then-lock, 1 bullet/sec)
- `STARFIELD_IMPLEMENTATION.md` — remove dash star speedup, scale speed/brightness/density by stage, add gameplay shooting stars
- `TUTORIAL_REPLAY_IMPLEMENTATION.md` — "How to Play" button on title screen
- `DEV_SCREEN_IMPLEMENTATION.md` — secret `dev` key sequence → stage select grid + skip-quota toggle

---

## Open Areas To Watch

- Barrel roll needs live play feel validation after Y-scale change
- Flamethrower startup ramp landed, but overall silhouette/animation may still need polish
- Architecture split is in progress (owned by Agent 1)
- Four implementation specs are queued and ready for agent pickup
- Future agents should check this log before making assumptions about recent behavior

### Sniper Readability + Off-Screen Telegraph
- Sniper shots now fire through a dedicated projectile path with `isSniper` metadata
- Sniper bullets are faster, brighter, and use a longer orange-red trail with a bright core so they read at gameplay speed
- Sniper muzzle fire now triggers a small impact flash to make the shot release more obvious
- Sniper windup telegraph was upgraded from a faint local line to a hotter edge-clamped beam
- Off-screen snipers now show a pulsing inward-pointing warning marker on the screen edge during windup
- Why: user reported sniper bullets were too small and effectively never landed; mechanic needed to threaten inattentive players and stay readable even when the sniper spawned off-screen
- Risk: live tuning may still be needed for bullet speed vs fairness, especially on later stages

### Flamethrower Cone + Loop Audio Pass
- Widened the flamethrower cone from a narrow ribbon into a broader gas-like plume
- Increased cone angle and slightly increased range so flame pressure reads as area control instead of a thin arm
- Reworked flame body rendering to use layered cloud ellipses and a wider cone silhouette
- Flame particles now drift outward with velocity and stretch, so the plume reads more like hot gas being pushed forward
- Retuned the procedural `flameLoop` audio away from a raw buzz toward a hissier gas-burn texture using filtered noise plus a lower triangle tone
- Why: user wanted a wider, freer cone shape and a more gas-like flamethrower fantasy instead of a twisting arm/buzz
- Risk: visuals and sound may still need one more feel pass after live play because flamethrowers are very sensitive to silhouette and mix

### Flamethrower Premium Visual Pass
- Tightened the flame silhouette into layered neon-style gradients instead of relying mainly on big cloud blobs
- Added a cleaner mid-cone corona and two hot inner filaments so the flame reads closer to the rest of the OLED visual language
- Reduced some particle prominence and blur so the cone body carries more of the look instead of loose blobs dominating the frame
- Why: user wanted the flamethrower to feel more premium and less like it was visually fighting the sleek neon presentation
- Optimization note: this pass adds gradient fills and a couple of extra stroked filaments, but keeps particle count unchanged and reduces some blur intensity, so the render-cost increase should be modest

### Flamethrower Realism Pass
- Rebuilt the cone as a much more explicit physical flame shape with turbulent top/bottom edges instead of mostly soft layering
- Added three hotter internal flow lanes so the flame reads like pressurized fuel burning through the cone
- Increased the visibility of the core body and trailing heat pockets so the effect is easier to notice at gameplay speed
- Why: previous pass was still too subtle in motion and silhouette; user wanted a more obviously realistic flame body
- Optimization note: this adds more path points to the cone body, but it does not increase particle count; the cheapest optimization later would be reducing edge segments from 18 to 12 if needed

### Flamethrower Replaced With Bass Pulse
- Replaced the old `flame` alt-fire with a new `bass` alt-fire type across constants, player state, UI, gameplay, and audio
- New weapon identity is `BASS PULSE`: a short-range forward wave weapon built from purple/magenta arc bands with a soft cone fill
- Fuel behavior remains aligned with spread shot so the alt-fire family stays consistent
- Replaced the old hiss/burn loop with a muted bassy synth loop (`bassPulseLoop`) to better match the techno/DJ direction
- HUD, pickup color, ship accent color, and reset flow were all updated to use the new purple Bass Pulse identity
- Why: user decided the flamethrower fantasy was fighting the game’s neon style and wanted a more theme-consistent close-range weapon
- Optimization note: Bass Pulse is cheaper than the late-stage flame rendering because it uses a few stroked arcs and a soft cone fill instead of many dense organic plume shapes

### Stage-Scaled Starfield
- Removed the dash-based star speed warp entirely so background motion no longer spikes when the player dodges
- Star speed, brightness, and visible density now scale with `stage.current`, so later stages feel faster and denser
- Increased the underlying star pool per layer to support stage-driven density without reallocating during play
- Why: perceived velocity should come from stage escalation, not from dash FX
- Optimization note: this stays cheap because the stars are still tiny rects and only the visible fraction is updated/drawn each frame

### Bass Pulse Cleanup Pass
- Removed the extra Bass Pulse particle circles so the weapon now reads as waves only
- Extended Bass Pulse range and widened its cone so it feels more like a forward force field
- Increased the visible wave thickness and inner arcs to support the stronger area-control fantasy
- Retuned `bassPulseLoop` into a softer low hummed tone with only a tiny amount of filtered noise underneath
- Why: user wanted the weapon to feel cleaner, wider, and more like a sustained sonic field than a mixed wave-plus-particle effect
- Optimization note: this is a net rendering win because removing the extra particles reduces per-frame draw work

### OverDrive Implementation Pass
- Locked OverDrive movement speed boost to `+20%` by increasing ship movement speed while `player.overdriveActive`
- Suspended heat gain during OverDrive for both primary fire and Bass Pulse
- Reworked OverDrive shot visuals to use a stronger violet/cyan treatment with brighter corona and larger ring echoes
- Upgraded ship-level OverDrive feedback:
  - stronger violet hull glow
  - stronger drone tip glow
  - ship-mounted heat arc now becomes an OverDrive timer arc while active
- Updated the left HUD OverDrive bar to a hot-violet active state and removed stale `[PIERCE ON]` wording
- Why: OverDrive needed to feel like a real payoff state instead of a subtle stat buff
- Optimization note: this is a low-risk visual increase; the extra bullet rings add a little draw cost, but the change is modest and localized

### Dash Heat Refund Pass
- Implemented first-pass dash heat refund directly on successful barrel-roll activation
- Locked first-pass refund to `12` flat heat
- Added a short cyan ship-arc flash so the player can immediately feel that the dash reduced heat
- Why: the dash/heat loop had been documented but not actually hooked up in code
- Optimization note: negligible cost increase; this is just one extra short-lived arc draw on the ship

### Dev Menu Tutorial Replay
- Added a dedicated `PLAY TUTORIAL` button to the `dev` stage-select screen
- Added a `startTutorialFromDevMenu()` helper that resets live run state and jumps directly into `gameState = 'tutorial'`
- Kept saved tutorial completion intact, so this is replay access only and does not interfere with normal first-run onboarding
- Why: user wanted a fast way to replay the tutorial from the developer menu without clearing save state or using browser storage workarounds
- Optimization note: negligible; this is a pure menu/UI path with no runtime gameplay cost

### Tutorial Redesign Pass
- Replaced the passive timed tutorial flow with a new action-gated onboarding sequence in `js/ui.js`
- Tutorial now teaches the live core loop in order:
  - movement
  - firing
  - heat build/cool
  - dash input
  - dash heat refund
  - OverDrive activation
  - Spread
  - Bass Pulse
  - nukes and the `3 per run` limit
- Removed the broken mojibake tutorial strings by switching all tutorial text to clean ASCII labels
- Added scripted tutorial setups for each step using controlled enemy waves, fixed pickups, and tutorial-safe state resets between steps
- Added lightweight UI focus highlighting so the tutorial can point at the ship heat arc, OverDrive bar, alt-fire slot, dash row, and nuke row without inventing a separate fake HUD
- Kept the redesign self-contained inside `js/ui.js`; no gameplay loop rewrite was needed
- Optimization note: low risk. The new tutorial adds some panel drawing and one pulsing outline highlight, but only during tutorial mode

### Bass Pulse Range Buff
- Doubled `bassPulse.RANGE` in `js/weapons.js` from `225` to `450`
- Why: user felt Bass Pulse was noticeably underpowered relative to Spread and wanted both alt-fire upgrades to feel equally exciting and viable
- Optimization note: moderate but acceptable. Bass Pulse now checks against more enemies in a wider cone, but the logic is still a single pass over the existing shard pool and should remain manageable at current scales

### Score Popups
- Implemented arcade-style score popups by reusing the existing `pickups.popups` system
- Basic enemy kills now spawn small white `+10` text at the death position
- Elite kills now spawn slightly larger yellow `+50` text
- Added score-specific popup styling in `pickups.draw()` without changing existing pickup popup visuals
- Added a popup cap of `30` entries in `pickups.update()` to avoid unbounded buildup during swarm or nuke kills
- Why: user wanted classic arcade score feedback to make kills feel more rewarding and the score system feel alive
- Optimization note: low risk. This reuses the existing popup array/render path and avoids glow or shadow blur

### Dash Heat Refund Tuning
- Increased dash heat refund in `js/player.js` from `12` to `35`
- Why: user wanted the barrel roll to refund a much more meaningful chunk of the 100-heat bar so the mechanic strongly rewards movement and sustained firing flow
- Optimization note: no meaningful performance impact; tuning only

### Legacy Cleanup
- Removed the dead `tutorialLegacy` block from `js/ui.js` now that the action-gated tutorial fully replaced it
- Why: reduce confusion for future agents and eliminate obsolete tutorial code with broken old text/encoding
- Verification: `node --check js/ui.js`
