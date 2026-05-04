# Priority Roadmap

This is the recommended order of importance.

## P0 - Make The Game Fit A Phone

Goal: no clipped playfield, no missing HUD, no broken viewport.

Changes:

- Replace height-only playfield sizing with responsive layout logic.
- Add mobile detection based on viewport shape and effective screen width, not user agent.
- For portrait mobile, make arena width-driven.
- Reserve zones for top HUD and bottom controls.
- Avoid negative `PLAY_X`.
- Use `100dvh` or equivalent behavior for mobile browser chrome.
- Add `touch-action: none`, `user-select: none`, and safe-area handling.
- Listen to `visualViewport.resize` where available.

Acceptance criteria:

- 390x844 viewport shows full playable arena.
- 360x740 viewport shows full playable arena.
- 844x390 landscape viewport shows full playable arena.
- No horizontal scrolling.
- No browser zoom on double tap.
- Player stays visible.

## P0 - Decide Mobile Layout Direction

Recommended direction: portrait-first with a redesigned HUD and control layer.

Why:

- Portrait is the natural phone posture.
- The game is already top-down and vertically flowing.
- Touch controls can live below/around the arena.
- The side-panel HUD is the wrong shape for phones.

Open decision:

- Should portrait mobile use the full 10-stage mode unchanged, or a mobile-tuned mode with slightly different pacing?

## P1 - Add Semantic Input Layer

Goal: gameplay reads intent, not raw keyboard/mouse globals.

Proposed global object:

```js
const input = {
  moveAxis: 0,
  fireHeld: false,
  altHeld: false,
  dashPressed: false,
  baseDropPressed: false,
  pausePressed: false,
  pointerX: 0,
  pointerY: 0,
  usingTouch: false,
  resetFramePresses() {},
  resetAll() {},
};
```

Keyboard/mouse provider:

- Maps `A/D` and arrows to `moveAxis`.
- Maps `J` and left mouse to `fireHeld`.
- Maps `K` and right mouse to `altHeld`.
- Maps space to `dashPressed`.
- Maps `Q` to `baseDropPressed`.
- Maps `Escape` to `pausePressed`.

Touch provider:

- Maps drag zone to `moveAxis`.
- Maps fire button to `fireHeld`.
- Maps dash button to `dashPressed`.
- Maps laser button to `altHeld`.
- Maps Base Drop button to `baseDropPressed`.
- Maps pause button to `pausePressed`.

Files likely touched:

- `js/core.js`
- `js/player.js`
- `js/weapons.js`
- `js/game.js`
- `js/tutorial.js`

## P1 - Build Mobile Controls

Goal: mobile play feels intentional.

Recommended controls:

- Left lower zone: horizontal drag/virtual slider for movement.
- Right primary button: hold to fire.
- Right secondary button: hold/tap laser when available.
- Dash button: tap while holding direction.
- Base Drop button: top or lower-center panic button, clearly separated from fire.
- Pause button: top-right.

Important design constraint:

Do not make fire permanently automatic unless we intentionally rebalance heat. Heat management is one of the game's core skill loops.

## P1 - Replace Click-Only Menus With Tap/Pointers

Goal: every canvas menu action should work from mouse, touch, and stylus.

Changes:

- Create `getCanvasPointFromEvent(e)`.
- Create `handleCanvasTap(x, y)`.
- Move title, leaderboard, name entry, pause, death, win, and dev menu click logic into that function.
- Call it from `pointerup` or touch-safe tap handling.
- Preserve desktop click behavior.

## P1 - Mobile HUD

Goal: mobile players can read the game state without a side panel.

Display on mobile:

- Score
- Stage/time
- Heat
- Flow State charge/timer
- Lives
- Alt-fire status
- Base Drop availability

Recommended layout:

- Top strip: score, stage, timer.
- Left/right compact meters: heat and Flow.
- Bottom dock: controls with resource states embedded.
- Keep critical warnings inside the playfield center as they already are.

## P1 - Mobile Tutorial

Goal: tutorial copy matches current input mode.

Replace copy on mobile:

- `A / D` -> `DRAG`
- `J - LEFT CLICK` -> `HOLD FIRE`
- `SPACE - A / D` -> `TAP DASH WHILE MOVING`
- `K / RIGHT CLICK` -> `HOLD LASER`
- `PRESS Q` -> `TAP BASE DROP`
- `ENTER TO SKIP` -> `TAP SKIP`

Tutorial completion should use input state and gameplay outcomes, not raw keys.

## P1 - Mobile Name Entry

Goal: leaderboard entry works on phones.

Changes:

- Add a DOM input overlay only while `gameState === 'nameEntry'`.
- Sync input value into `nameEntry.name`.
- Focus the input on tap.
- Keep canvas visual styling, but let DOM handle text entry.
- Hide/destroy input when leaving name entry.

## P2 - Balance And Readability

Goal: preserve difficulty without making phone play feel unfair.

Areas to test:

- Enemy speed
- Enemy size
- Hit radius
- Player width
- Bullet width
- Pickup size
- Tutorial target spacing
- Max enemy count
- Stage 8-10 density
- Flow State visual intensity

Likely need:

- Mobile scale factor based on `PLAY_W`.
- Slightly larger interactable pickups.
- Slightly reduced late-stage density.
- Larger HUD text and simplified microcopy.

## P2 - Performance Mode

Goal: smooth mobile gameplay.

Changes:

- Cap Pixi renderer resolution more aggressively on mobile.
- Lower or disable blur/bloom filters on mobile.
- Reduce dust counts on title, leaderboard, death, and win screens.
- Lower particle caps.
- Reduce expensive Canvas2D shadow blur passes where possible.
- Add a simple FPS/debug overlay for test builds.

## P3 - Local And Portfolio Access

Goal: users can actually open the mobile game.

Changes:

- Document local mobile testing with `HOST=0.0.0.0`.
- Optionally update `scripts/serve-static.mjs` docs or package scripts.
- Replace portfolio `127.0.0.1` Play links before publishing.
- Use a deployed URL or relative hosted path.

