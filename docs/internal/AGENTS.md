# TechnoDrone Agent Routing

> Quick reference for scoping work to the right files.
> Check this before editing so agents touch the smallest correct surface area.

## Balance and Tuning
| What you want to change | File | Where |
|---|---|---|
| Stage difficulty, enemy speed, spawn rate, enemy count | `js/constants.js` | `STAGE_CONFIG` |
| Stage colors and enemy palette | `js/constants.js` | stage color arrays |
| Turret spawn timing per stage | `js/enemies.js` | `TURRET_SPAWN_SCHEDULES` |
| Shield drone spawn timing | `js/enemies.js` | `SHIELD_DRONE_SPAWN_SCHEDULES` |
| Elite chance, homing chance, formation timing | `js/constants.js` | `STAGE_CONFIG` |
| Flow State charge rate, duration | `js/player.js` | flow-state logic |
| Heat gain, decay, overheat lockout | `js/player.js` | player heat constants |
| Dash cooldown, dash refund, dash duration | `js/player.js` | `dash` object |

## Enemy Behavior
| What you want to change | File | Where |
|---|---|---|
| How enemies move or target | `js/enemies.js` | enemy update loop |
| New enemy type | `js/enemies.js` | spawn + update + draw |
| Turret lock behavior and firing | `js/enemies.js` | turret block |
| Shield drone orbit, tether, protection | `js/enemies.js` | shield drone block |
| Kamikaze behavior | `js/enemies.js` | kamikaze spawn/update |
| Obstacle gate row behavior | `js/enemies.js` | gate-piece spawn/update/draw |
| Obstacle wave timing | `js/stage.js` | obstacle state + timers |

## Player and Weapons
| What you want to change | File | Where |
|---|---|---|
| Player movement and speed | `js/player.js` | `drone.update()` |
| Dash feel and visuals | `js/player.js` | `dash` + `drone.draw()` |
| Heat arc on ship | `js/player.js` | `drone.draw()` |
| Flow State visuals | `js/player.js` + `js/game.js` | ship/world-state draw |
| Bullet behavior, speed, spread | `js/weapons.js` | `bullets` object |
| Alt-fire pickup/use | `js/weapons.js` | alt-fire logic |
| Nuke behavior | `js/weapons.js` | `screenNuke` |
| Collision and enemy damage resolution | `js/enemies.js` | collision/damage helpers |

## HUD and UI
| What you want to change | File | Where |
|---|---|---|
| HUD layout, labels, bars | `js/ui.js` | `drawHUD()` |
| Title screen | `js/ui.js` | title draw/update |
| Game over / win / pause screens | `js/ui.js` + `js/game.js` | screen draw + state handling |
| Tutorial steps, lesson flow, prompts | `js/ui.js` | `tutorial` object |
| Leaderboard screen and score submission | `js/ui.js` | `leaderboard` object |
| Stage timer bar / top lane | `js/game.js` | main render |
| Center watermark timer | `js/ui.js` | `drawCenterWatermark()` |

## Visuals and FX
| What you want to change | File | Where |
|---|---|---|
| Hit sparks, impact rings | `js/fx.js` | hit/kill FX |
| Explosion and kill flash | `js/fx.js` | kill FX |
| Smoke, fragments, burst particles | `js/fx.js` | particle pools |
| Bloom pass | `js/game.js` | bloom composite |
| Starfield density and speed | `js/starfield.js` | starfield config |
| Wave/title background motion | `js/wavefield.js` | wavefield logic |
| Vignette and scanlines | `js/game.js` | overlay composite |

## Game Flow and Structure
| What you want to change | File | Where |
|---|---|---|
| Stage advance logic | `js/stage.js` | stage timer / `_advance()` |
| Save/load and local storage | `js/core.js` | save helpers |
| Main game loop and state transitions | `js/game.js` | update/render/state listeners |
| Score calculation and kill rewards | `js/stage.js` | `stage.onKill()` |
| Title start flow and tutorial boot | `js/ui.js` | `startGame()` / tutorial start |
| Mechanic assignment per stage | `js/constants.js` | `MECHANIC_ASSIGNMENT` |

## Feel Guardrails
- The current gameplay feel is a protected baseline. Treat responsiveness, shot satisfaction, and collision honesty as higher priority than atmospheric visuals.
- The playfield should stay clean and fast. Do not add heavy ambient overlays, aurora passes, fog layers, or similar fill effects during active gameplay unless the user explicitly asks for them again and they are verified to preserve feel on a typical laptop.
- Bullet-to-enemy collision should favor what the player sees. The current player-bullet collision uses a swept previous-frame-to-current-frame segment so fast shots do not visually clip through rotated shard edges.
- If a change makes the game feel even slightly softer, mushier, or less precise, treat that as a regression even if the frame drop looks small on paper.
- When testing visual ideas, prefer reversible, isolated changes and remove them quickly if they trade away snap.

## Rendering Architecture — READ THIS FIRST

The game uses a **two-canvas compositor** as of 2026-04-14. This changes where rendering happens and what is safe to touch.

### How it works
- `#gameCanvas` — Canvas 2D. All existing draw code writes here. **Hidden from the user (opacity: 0)** but still receives all mouse/keyboard events.
- `#pixi-canvas` — PixiJS WebGL canvas. Inserted before `#gameCanvas` in the DOM. This is the visible output. `pixi-post.js` reads the Canvas 2D output as a texture each frame and composites it through GPU filters.
- The game loop in `game.js` calls `pixiPost.render()` at the end of each frame.
- Current active filters: `ColorMatrixFilter` (contrast + saturation) and `RGBSplitFilter` (chromatic aberration that spikes on player hit).

### What this means for agents
- **Do NOT add or remove `ctx.shadowBlur` calls.** The Canvas 2D glow system is intentionally left in place. Removing it without the corresponding PixiJS filter migration will break all glow visuals.
- **Do NOT touch `js/pixi-post.js` or `vendor/`** unless the task is explicitly about post-processing or rendering architecture.
- **GPU bloom is not active yet.** `AdvancedBloomFilter` was trialed but removed — it compounds the existing `shadowBlur` glow. Proper bloom (Phase 2.5) requires a shadowBlur removal pass across draw functions first.
- All existing draw code in `player.js`, `enemies.js`, `fx.js`, `weapons.js`, `ui.js`, `game.js` is untouched Canvas 2D. Safe to work on normally — just don't add `ctx.shadowBlur` removals or PixiJS-specific draw calls.

### Current visual baseline
- The **preferred visual baseline** is the hybrid middle-ground renderer: Canvas 2D gameplay drawing with `shadowBlur` glow, composited through `pixi-post.js`.
- Treat that hybrid look as the source of truth for quality. If a native PixiJS gameplay path looks sharper, flatter, more pixelated, or less luminous than the Canvas version, that is a regression.
- Native PixiJS gameplay rendering in `player.js`, `enemies.js`, `weapons.js`, `fx.js`, and `starfield.js` should be treated as **experimental / parked work** until it reaches visual parity with the hybrid baseline.
- Do **not** promote Pixi-native gameplay layers as the default path unless the result preserves the old glow-heavy OLED look first.
- PixiJS is still valuable here for GPU compositing, post-processing, performance headroom, and future effects. The near-term goal is **Canvas gameplay + Pixi enhancement**, not "rewrite every draw call to Pixi at any cost."

### Canvas vs Pixi Routing
- **Canvas 2D owns glow-heavy gameplay visuals.** If an effect needs softness, halo falloff, bloom-like glow, OLED-black contrast, or atmospheric edge treatment, implement it in Canvas first.
- Default Canvas examples: ship glow, bullet glow, hit flashes, warning/danger vignettes, Flow State edge glow, heat arcs, soft fog, and similar luminous effects.
- **Pixi owns compositing and enhancement.** Use Pixi for full-frame post, color grading, chromatic response, screen presentation, and similar compositor responsibilities.
- Do **not** use Pixi `Graphics` as the default way to recreate soft warning states or glow vignettes. Hard-edged geometric overlays are usually a regression in this project.
- If an effect looked better before the Pixi transition, preserve the old Canvas visual language and use Pixi only to enhance it.

### Files added / changed
| File | Change |
|------|--------|
| `js/pixi-post.js` | **NEW** — PixiJS compositor. Read this to understand the post-processing layer. |
| `vendor/pixi.min.js` | PixiJS v7 local bundle |
| `vendor/pixi-filters.js` | pixi-filters v5.2.1 local bundle |
| `index.html` | Loads vendor scripts, hides `#gameCanvas`, styles `#pixi-canvas` |
| `js/core.js` | Removed `bloomCanvas`/`bloomCtx`. `resize()` now calls `pixiPost.resize()`. |
| `js/game.js` | Removed old CPU bloom pass (~40 lines). Added `pixiPost.render()` to loop. |
| `js/player.js` | `pixiPost.triggerHit()` called on player damage — triggers CA flash. |
| `PIXI_STATUS.md` | Current Pixi status, active UI/transition notes, and renderer guardrails. |

---

## Rules for Agents
- Touch the smallest correct file surface for the task.
- If a change unexpectedly spills into another system, stop and flag it.
- `constants.js` is for balance/config data, not runtime behavior.
- `ui.js` contains both presentation and menu/tutorial flow. Do not move combat systems there.
- `game.js` owns the main loop and frame composition.
- Preserve the current gameplay feel before chasing presentation upgrades. Responsiveness and trustworthy hit detection outrank atmosphere.
- Check `QA_CHECKLIST.md` before pushing gameplay, menu, UI, score, or persistence changes.
- Check `GAME_PLAN.md` before adding or removing mechanics.
- Check `DESIGN.md` before changing visuals.
- Check `FLOWSTATE.md` before changing Flow State behavior or presentation.
- Check `TUTORIAL.md` before changing tutorial flow or step text.
- Right-side HUD text must float on its own. Do not add separator lines, accent lines, ornamental rules, HUD rails, underlines, connectors, framing strokes, or decorative bars near labels or numbers unless the user explicitly asks for them.
- For the right-side HUD, treat decorative linework near text as a bug, not a style option. Create emphasis with spacing, alignment, typography, glow, scale, and color only.
