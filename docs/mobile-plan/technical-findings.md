# Technical Findings

These findings are based on inspection of the actual TechnoDrone game folder.

## Current Blockers

### 1. Playfield Is Wider Than Phones

`js/core.js` computes the play area from viewport height:

```js
PLAY_H = Math.min(canvas.height * 0.92, 900);
PLAY_W = Math.round(PLAY_H * (9 / 8));
PLAY_X = Math.round((canvas.width - PLAY_W) / 2);
```

On a typical portrait phone, this makes `PLAY_W` larger than the screen. Example: a 390x844 viewport produces a playfield around 873px wide, which creates a negative `PLAY_X`.

Impact:

- The arena is clipped horizontally.
- Player/enemy positions can exist offscreen.
- Click/tap regions do not match what the user sees.
- HUD side panel has no real space.

### 2. Gameplay Input Is Keyboard/Mouse Only

Input currently lives in `js/core.js`:

- `keydown`
- `keyup`
- `mousedown`
- `mousemove`
- `mouseup`
- `mouseDown`
- `mouseRightDown`
- `mouseX`
- `mouseY`
- `keys`
- `justPressed`

Gameplay systems read these globals directly:

- `js/player.js` reads `A`, `D`, arrow keys, and space for movement/dash.
- `js/weapons.js` reads `mouseDown`, `mouseRightDown`, `J`, and `K`.
- `js/game.js` reads `Q` for Base Drop and `Escape` for pause.

Impact:

- Touch cannot play the game.
- There is no semantic input model.
- Adding touch directly into each gameplay file would create tangled behavior.

### 3. HUD Is Desktop Side-Panel First

`js/core.js` computes:

```js
PANEL_X = PLAY_X + PLAY_W + 20;
PANEL_W = canvas.width - PANEL_X - 20;
```

`js/ui.js` exits HUD drawing when:

```js
if (PANEL_W < 120) return;
```

Impact:

- On phones, the HUD disappears or becomes unusable.
- Core resources like heat, Flow State, lives, stage timer, ult, and alt-fire need a mobile HUD.

### 4. Menus Are Canvas Click Regions

`js/game.js` uses a single `canvas.addEventListener('click', ...)` for:

- Title screen actions
- Leaderboard return
- Name entry confirm/delete
- Pause menu
- Death screen
- Win screen
- Dev menu

Impact:

- Mobile browsers synthesize click from taps, but not reliably enough for game UI.
- Pointer/touch offsets need one canonical translation path.
- Tap handling should be immediate and shared.

### 5. Tutorial Copy Is Keyboard-Specific

`js/tutorial.js` teaches desktop inputs:

- `A / D`
- `J - LEFT CLICK`
- `SPACE - A / D`
- `K / RIGHT CLICK`
- `PRESS Q`
- `ENTER TO SKIP`

Impact:

- Even if touch works, the tutorial tells mobile users the wrong thing.
- Tutorial progression should not care whether the input source is keyboard or touch.

### 6. Leaderboard Name Entry Needs Real Mobile Text Input

`js/ui.js` implements callsign entry by reading `justPressed` keys and drawing text on canvas.

Impact:

- Phone keyboards will not reliably appear.
- Copy/paste, autocomplete, and text editing are unavailable.
- A DOM input overlay is needed for mobile.

### 7. Local Server Is Desktop-Only By Default

`scripts/serve-static.mjs` defaults to:

```js
const host = process.env.HOST || '127.0.0.1';
```

Impact:

- A phone on the same Wi-Fi cannot open the game through the computer's local IP unless the server binds to `0.0.0.0`.
- Portfolio Play links using `127.0.0.1` will fail on mobile because `127.0.0.1` points to the phone.

### 8. Mobile Performance Needs A Pass

Rendering architecture:

- Hidden Canvas2D gameplay canvas
- Visible PixiJS canvas
- Pixi uses `BaseTexture.from(canvas)`
- Canvas texture updates every frame
- Pixi compositor adds color filters, RGB split, blur, bloom, glitch, overlays, masks

Impact:

- This can work, but lower-end mobile GPUs may struggle.
- Mobile needs a performance mode with reduced filters, reduced particle counts, lower renderer resolution, and fewer expensive glow passes.

## Existing Strengths

- Static browser app, easy to deploy.
- Good separation by files and systems.
- Core game loop is centralized in `js/game.js`.
- Current desktop click targets are already measurable, which helps convert them to tap targets.
- `pixi-post.js` already caps resolution somewhat.
- Tutorial progression is mostly behavior-based, so it can survive input abstraction.

