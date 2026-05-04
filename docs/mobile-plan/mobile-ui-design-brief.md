# Mobile UI Design Brief

This is the part that needs real design thinking. The desktop UI has a strong identity, but its structure does not map cleanly to phones. The mobile version should feel like a purpose-built arcade cockpit.

## Design Goals

- Keep the black-void neon identity.
- Make combat readability better than desktop, not worse.
- Keep the player's thumbs away from critical action when possible.
- Make controls feel physical and immediate.
- Keep heat, Flow State, and Base Drop visible at all times.
- Avoid tiny text and desktop keyboard labels.
- Make tutorial and menus touch-native.

## Core Mobile Layout Concept

Portrait mobile should be a three-zone layout:

1. **Top command strip**
   - Score
   - Stage
   - Timer
   - Pause

2. **Central arena**
   - Full visible playfield
   - Minimal overlays
   - Warnings and callouts remain centered
   - Player and enemy silhouettes get priority over decoration

3. **Bottom control dock**
   - Movement zone on left
   - Fire, dash, laser, Base Drop controls on right/center
   - Resource feedback integrated into the controls

## Proposed Control Layout

### Movement

Use a horizontal drag rail rather than a circular joystick.

Why:

- The game only moves left/right.
- A joystick implies vertical movement that does not exist.
- A horizontal rail teaches the actual mechanic instantly.
- It can be visually styled like a neon magnetic track.

Behavior:

- Touch and drag anywhere in the left lower zone.
- `moveAxis` maps from -1 to 1 based on drag position.
- Snap back to 0 on release.
- Optional: if the user drags outside the zone, continue tracking until release.

### Fire

Use a large hold button on the lower right.

Behavior:

- Hold to fire.
- Button visual fills or pulses with heat.
- When overheated, button should visually lock or sputter.
- Keep fire under the right thumb.

Important:

- Avoid permanent autofire unless the whole heat system is redesigned.

### Dash

Use a nearby secondary button.

Behavior:

- Tap dash while holding left/right movement.
- If no movement direction is held, dash can default to last movement direction.
- Cooldown ring around button.
- Flash/heat refund feedback on press.

### Laser / Alt Fire

Use a smaller button above or beside fire.

Behavior:

- Hidden or dimmed until laser is available.
- Hold to fire laser.
- Fuel shown as a ring or radial meter.

### Base Drop

Use a distinct panic control, separated from fire.

Options:

- Bottom center, between movement and fire.
- Top-left near the HUD.
- Floating button only when charged/available.

Recommendation:

- Bottom center as a larger diamond/circle with a clear charge state.
- Add confirmation only if accidental taps become a problem. The game is fast, so confirmation is probably too slow.

### Pause

Top-right small icon-sized button.

Behavior:

- Tap to pause.
- Pause menu uses large touch rows.

## Mobile HUD Direction

### Top Strip

Suggested contents:

- Left: score
- Center: stage and timer
- Right: pause

Visual style:

- Thin neon typography.
- Compact separators.
- No large card or desktop panel.

### Heat And Flow

Heat and Flow are too important to bury.

Options:

1. Around the fire button:
   - Heat ring around fire.
   - Flow ring outside heat.

2. Around the player:
   - Current implementation already shows ship heat/flow arcs.
   - Keep this, but not as the only indicator.

Recommendation:

- Keep ship arcs.
- Add heat ring around fire.
- Add Flow meter as a slim bar or ring near top/side.

### Lives

Use small drone pips or marks near the top strip.

Avoid:

- Tiny text like `LIVES 3`.
- Desktop side-panel readouts.

### Stage Timer

Mobile should keep the timer highly visible because it controls escalation.

Recommended:

- Top-center stage timer.
- Color shifts when urgent.
- Existing top entry bar could be adapted into a top strip progress line.

## Screen-Specific Redesign Notes

### Title

The current title screen can remain visually similar but needs touch-native buttons.

Mobile title should show:

- TechnoDrone wordmark
- Start Run
- Tutorial
- Leaderboard

Buttons should be real large tap targets, even if drawn on canvas.

### Tutorial

Tutorial should be mobile-specific copy and should visually point at the touch controls.

Examples:

- `DRAG TO MOVE`
- `HOLD FIRE`
- `TAP DASH WHILE MOVING`
- `HOLD LASER`
- `TAP BASE DROP`

### Pause

Pause menu should use large rows:

- Resume
- Music
- SFX
- Home

Music volume should become a slider or minus/plus tap zones. Current desktop row can be adapted but needs larger targets.

### Death And Win Screens

Desktop text like `[ R - START NEW RUN ]` and `[ M - MAIN MENU ]` should become:

- `START NEW RUN`
- `MAIN MENU`
- `PLAY AGAIN`

Tap targets should match the text.

### Leaderboard

Leaderboard should be simplified for phone width.

Recommended:

- Top 10 instead of top 20 on small screens.
- Rank, callsign, score.
- Kills can be secondary or hidden if space is tight.
- Return control should say `BACK`, not `ESC OR BACKSPACE`.

### Name Entry

Use a real DOM input overlay.

Canvas can still draw:

- Background
- Title
- Hints
- Confirm button

But text editing should be handled by HTML.

## Open Design Questions

1. Should mobile be portrait-only at first, or support landscape from the start?
2. Should movement be a drag rail, left/right buttons, or a hybrid?
3. Should fire remain manual hold, or should mobile use auto-fire with heat rebalanced?
4. Should Base Drop require a deliberate long press to avoid accidents?
5. Should mobile have a shorter mode, or keep the full 5-minute 10-stage structure?
6. Should the game expose a visible mobile/desktop toggle for testing?

## Recommended First Design Spike

Create a static mobile mockup before coding controls.

Mockup viewport:

- 390x844
- 360x740
- 844x390

Mockup states:

- Title
- Playing normal
- Playing overheated
- Flow State active
- Laser available
- Base Drop available
- Pause
- Death

The first mockup should answer control placement and HUD density. Once that feels right, implementation becomes much cleaner.

