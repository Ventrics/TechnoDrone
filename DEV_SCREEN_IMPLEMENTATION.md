# Dev Stage Select Screen — Implementation

Paste this prompt into your implementation agent.

---

## Prompt

File to edit: `C:/Users/brian/Downloads/Anti gravity/Projects/TechnoDrone/index.html`

Add a hidden developer stage select screen for testing. No user-facing UI hints that it exists.

---

### Access Method — Secret Key Sequence

On the title screen, listen for the key sequence: **D → E → V** (case-insensitive, must be typed in order).

Implementation:
```javascript
// Near the top of the keyup/input handling section
let devKeyBuffer = [];
// In the keyup handler, when gameState === 'title':
devKeyBuffer.push(e.key.toLowerCase());
if (devKeyBuffer.length > 3) devKeyBuffer.shift();
if (devKeyBuffer.join('') === 'dev') {
  gameState = 'devMenu';
  devKeyBuffer = [];
}
```

When the code is accepted, briefly flash the title text color (one quick white pulse, ~200ms) as the only confirmation before the screen transitions.

---

### New Game State: `devMenu`

Add `'devMenu'` to the game state switch/draw logic.

**Layout:**
- Black background (`#050505`)
- Title text: `DEV MODE` at top, small, cyan (`#31afd4`), same font as the rest of the UI
- 10 stage buttons in a 2-row grid (5 per row), each:
  - Shows the stage number large (e.g. `01`, `02` ... `10`)
  - Background tinted with that stage's `STAGE_BG_COLORS` color (slightly brighter than the actual bg)
  - Border: 1px cyan, glow on hover
  - On click: jump to that stage (see below)
- "SKIP QUOTA" toggle button below the grid:
  - Off by default
  - When ON: glows pink, label reads `SKIP QUOTA: ON`
  - When OFF: dim, label reads `SKIP QUOTA: OFF`
- "BACK" button bottom-left, returns to `'title'` state

**Stage jump on click:**
```javascript
function devJumpToStage(n) {
  // Reset game state as if starting fresh
  resetGame();               // call whatever the existing new-game reset function is
  stage.current = n;
  stage.kills = 0;
  gameState = 'playing';
}
```

**Skip Quota toggle:**
```javascript
let devSkipQuota = false;
// In the stage advancement check (where kills >= quota triggers next stage):
if (devSkipQuota && stage.kills >= 1) { /* advance stage */ }
```

---

### Style Notes
- Follow the existing OLED aesthetic throughout: `#050505` bg, cyan/pink/white palette, glow on interactive elements
- Dev screen should feel intentional but not polished — it's a tool, not a feature
- No animations needed beyond hover glow on buttons
