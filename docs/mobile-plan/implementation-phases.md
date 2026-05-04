# Implementation Phases

This is a practical order for later development.

## Phase 1 - Mobile Layout Foundation

Objective: the game fits phone screens.

Tasks:

- Add responsive layout mode in `js/core.js`.
- Compute `PLAY_X`, `PLAY_Y`, `PLAY_W`, `PLAY_H`, `PANEL_X`, `PANEL_Y`, `PANEL_W`, and `PANEL_H` from a layout object.
- Add mobile CSS in `index.html`.
- Use `100dvh` or equivalent fallback.
- Add `touch-action: none`.
- Handle `visualViewport.resize`.
- Keep desktop layout unchanged where possible.

Acceptance:

- Full arena visible at common phone sizes.
- No missing player.
- No missing top/bottom UI zones.

## Phase 2 - Input Abstraction

Objective: game systems read semantic input.

Tasks:

- Add `input` object in `js/core.js` or a new `js/input.js`.
- Map keyboard/mouse to `input`.
- Update movement, dash, fire, alt-fire, Base Drop, and pause logic.
- Preserve existing desktop behavior.
- Reset transient button presses each frame.

Acceptance:

- Desktop gameplay feels unchanged.
- No direct new touch hacks in gameplay files.

## Phase 3 - Touch Controls

Objective: phone users can play.

Tasks:

- Add pointer events.
- Track active pointer IDs.
- Add mobile movement rail.
- Add fire button.
- Add dash button.
- Add laser button.
- Add Base Drop button.
- Add pause button.
- Draw controls either in Canvas2D or DOM overlay.

Recommendation:

- Draw gameplay HUD in canvas.
- Consider DOM for controls only if canvas hit targets become hard to maintain.

Acceptance:

- User can start a run and play through at least stage 3 on phone viewport using only touch.

## Phase 4 - Mobile HUD

Objective: game state is readable without side panel.

Tasks:

- Add `drawMobileHUD()`.
- Branch from `drawHUD()` or `render()` based on layout mode.
- Add heat/fire visual coupling.
- Add Flow indicator.
- Add lives pips.
- Add stage/timer top strip.
- Add alt-fire and Base Drop availability indicators.

Acceptance:

- Heat and Flow are visible at a glance.
- Stage and score remain readable.
- Controls do not cover critical enemy/player action.

## Phase 5 - Mobile Tutorial And Menus

Objective: onboarding and menus match touch.

Tasks:

- Branch tutorial copy by input mode.
- Add tap skip target.
- Convert title/end/pause/leaderboard click handling to pointer tap handling.
- Replace keyboard-specific end-screen labels on touch devices.
- Enlarge menu hit targets.

Acceptance:

- First-time mobile user can complete tutorial without a keyboard.

## Phase 6 - Name Entry

Objective: leaderboard is usable on mobile.

Tasks:

- Add DOM input overlay during `nameEntry`.
- Sync value into `nameEntry.name`.
- Focus input when entering the screen or tapping the name field.
- Handle confirm from button and keyboard enter.
- Hide overlay when exiting.

Acceptance:

- Phone keyboard appears.
- Callsign can be entered, deleted, confirmed, and submitted.

## Phase 7 - Balance Pass

Objective: mobile play is fair and legible.

Tasks:

- Tune enemy density for smaller arena.
- Tune player speed relative to arena width.
- Tune dash distance/cooldown if needed.
- Tune pickup sizes.
- Tune tutorial target spacing.
- Tune late-stage spawn pressure.

Acceptance:

- Stage 1-3 feels learnable.
- Stage 8-10 remains intense but readable.
- Heat management remains meaningful.

## Phase 8 - Performance Pass

Objective: stable mobile frame rate.

Tasks:

- Add mobile performance settings.
- Reduce Pixi filter intensity.
- Reduce dust counts.
- Reduce particle caps.
- Lower renderer resolution on mobile.
- Test with sustained gameplay.

Acceptance:

- Smooth enough on mid-range Android and iPhone Safari.
- No obvious memory leak after repeated runs.

## Phase 9 - Deployment And Portfolio

Objective: mobile users can open it.

Tasks:

- Document local mobile testing with LAN IP.
- Update local server docs for `HOST=0.0.0.0`.
- Deploy game to public/static host.
- Replace portfolio `127.0.0.1` links with deployed URL or relative link.
- Retest from phone.

Acceptance:

- Portfolio Play link works from a phone.

