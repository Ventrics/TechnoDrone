# Tutorial Replay Button — Implementation

Paste this prompt into your implementation agent.

---

## Prompt

File to edit: `C:/Users/brian/Downloads/Anti gravity/Projects/TechnoDrone/index.html`

Add a "How to Play" button to the title screen that lets the player replay the tutorial at any time. No new game states needed — reuse the existing tutorial flow.

---

### Changes Required

**1. Title screen draw** — Add a "HOW TO PLAY" button alongside the existing Play/Leaderboard buttons.
- Match the existing title screen button style exactly (same font, glow, sizing)
- Position it below or beside the existing buttons (wherever it fits cleanly in the current layout)

**2. Title screen input** — When "HOW TO PLAY" is clicked:
```javascript
localStorage.removeItem('drone_tutorial_done');
gameState = 'tutorial';
// reset any tutorial state variables as done on first run
```

**3. That's it.** The tutorial already handles its own flow and transitions back to title when complete. No other changes needed.

Follow existing button/UI style — OLED aesthetic, glow text, same color palette as the rest of the title screen.
