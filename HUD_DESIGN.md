# TechnoDrone - HUD Design Spec

Note:
This file contains older HUD-specific thinking and is no longer the primary source of truth.

Read [UI_DESIGN_PHILOSOPHY.md](C:/Users/brian/Downloads/Anti%20gravity/Projects/TechnoDrone/UI_DESIGN_PHILOSOPHY.md) first for the current shared direction across:
- gameplay HUD
- tutorial UI
- title screen
- game over screen

This document defines the HUD layout, visual rules, and on-ship indicators. It is the source of truth for UI presentation during gameplay.

---

## Design Principles

- All gameplay HUD elements on the **left side** — the ship operates center-to-right, so left is dead space we own
- Only exception: `[ESC] PAUSE` stays bottom-right
- Information is **grouped by category** with clear visual gaps between groups
- Control hints **fade after Stage 1** — teach once, then get out of the way
- Critical combat state (heat, shield) is communicated **through the ship itself**, not just HUD bars
- The HUD should feel premium and minimal — no debug-looking text in production

---

## Layout

### Left Column — Status Group (top)

| Y Position | Content | Font | Color |
|------------|---------|------|-------|
| 20 | `LIVES  3` + shield arc icon | bold 21px mono | stage hudColor |
| 50 | `STAGE  1 / 10` | bold 21px mono | stage hudColor |
| 80 | `TIME  17s   KILLS  16` | bold 21px mono | stage hudColor |
| 112 | `ACTIVE: SNIPERS` (only when mechanics active) | 16px mono, alpha 0.72 | stage hudColor |

Shield arc: small cyan arc (radius 8px) drawn next to LIVES text. Shows recharge progress when shield is down.

### Left Column — Systems Group (below status)

Starts after overdrive bar, with an 8px gap.

| Element | Details |
|---------|---------|
| OVERDRIVE | 13px label + 160px bar (cyan when charging, orange #ff6600 when active) |
| *8px gap* | |
| SCORE | bold 21px, stage hudColor, left-aligned x=20 |
| *6px gap* | |
| [J / MOUSE] FIRE | 14px mono, white, glow 16 |
| [K] alt-fire | 14px mono. Shows: SPREAD/FLAME + fuel bar, or CD timer, or "awaiting drop" |
| [SPC] DASH | 14px mono. Cyan when ready, grey with countdown when cooling |
| [Q] NUKE | 14px mono + 3 diamond icons INLINE after text + charge bar below |

**Text alignment**: all `textAlign = 'left'`, x=20
**Bars**: all start x=20, width=160px, height 4-6px

### Nuke Diamonds (inline)
- 3 diamond icons drawn AFTER the `[Q] NUKE` label text, not on a separate row
- Use `ctx.measureText()` to get label width, place diamonds at `x = 20 + textWidth + 10`
- Diamond spacing: 22px apart
- Filled diamonds: pink (#ff007f) with glow for remaining uses
- Empty diamonds: grey #555 at alpha 0.2
- Ready diamond: white, pulsing glow
- Charge bar: below the label+diamonds line, x=20, width=160px

### Bottom Right
```
[ESC] PAUSE     ← 14px mono, alpha 0.42, white, no glow
```

### Control Hint Fading
- During Stage 1 and tutorial: full alpha on all control labels
- Stage 2+: control label text ([J/MOUSE], [K], [SPC], [Q]) renders at alpha 0.3
- Bars, icons, and status values remain full alpha
- This reduces clutter for experienced players

---

## Stage Timer Bar (top edge)

- Full-width bar across top of canvas, height 3px
- Background: hudColor at alpha 0.25
- Fill: hudColor at alpha 0.85, width = `canvas.width * timeFraction`
- Hidden during tutorial

---

## Center Watermark Timer

Large faded countdown in the center of the screen for ambient time awareness.

- **Position**: `canvas.width / 2`, `canvas.height / 2`
- **Font**: bold 120px monospace
- **Text**: `"17s"` format (seconds remaining, no leading zero)
- **Color & alpha by time remaining**:
  - 10+ seconds: white `#ffffff` at alpha 0.06
  - 5-10 seconds: danger red `#ff4422` at alpha 0.10
  - Under 5 seconds: `#ff4422`, pulsing alpha 0.08-0.14 at 4Hz
- **No glow/shadow** — purely a faded watermark
- **Render order**: AFTER starfield, BEFORE enemies and player (gameplay renders on top)
- **Hidden during**: tutorial, title, pause, death, win, leaderboard screens

---

## Heat Arc on Ship

Replaces the old 34x4px rectangular heat bar that was drawn above the ship. Heat state is now communicated through a circular arc wrapping around the drone hull.

### Geometry
- **Center**: ship origin (0, 0 in local drone coords)
- **Radius**: 28px (just outside the ship silhouette)
- **Span**: 270 degrees, from 135 deg to 45 deg going clockwise
- **Gap**: at the nose/front of the ship (where the player is looking)
- **Fill direction**: clockwise, proportional to heat (0% = nothing, 100% = full 270 deg)
- **Line width**: 2.5px
- **Draw method**: `ctx.arc()` with `ctx.stroke()`, not fill

### Background Track
- Full 270 deg arc always visible at alpha 0.12, color `#333`
- Shows the "empty" capacity — player can see how much heat room remains

### Color Progression
| Heat Range | Color | Hex |
|------------|-------|-----|
| 0-50% | Cyan | `#31afd4` (COLOR_CYAN) |
| 50-80% | Orange | `#ff8800` |
| 80-100% | Red-orange | `#ff3300` |
| Overheated | Red, pulsing | `#ff0000`, alpha oscillates 0.35-1.0 |

### Glow
- Single-pass `shadowBlur = 8`, color matches arc color
- Do NOT use 3-pass glow — too expensive per frame for a per-ship element

### Overheat State
- Arc pulses red (alpha 0.35 to 1.0 at ~15ms sin cycle)
- Ship aura continues to glow red (existing behavior, keep it)
- The old flashing red line above the rectangular bar is REMOVED

### Barrel Roll Interaction
- The arc is drawn inside the translated/scaled drone context
- It automatically scales with `rollScaleY` during dash — no extra code needed

### Render Order (within drone.draw)
Ship hull → Engine exhaust → **Heat arc** → Tip weapon glow

---

## Shield Indicator

The shield recharge arc stays in the HUD (next to LIVES text), NOT on the ship.

- Position: fixed at (130, 28) in screen space
- Full arc: cyan, radius 8px, when shield is active
- Recharge progress: partial arc fill, dimmed background

**Future consideration**: if a ship-mounted shield arc is added later, use radius 34px (outer ring) to separate from the heat arc (inner, 28px). But do NOT implement this now.

---

## What This Spec Does NOT Cover

- Title screen layout (separate concern)
- Leaderboard screen UI
- Death/win screen layouts
- Pause menu layout
- Tutorial step text rendering

These may get their own spec files in the future.

---

## Color Reference

| Element | Color | Usage |
|---------|-------|-------|
| hudColor | Stage-dependent | Most HUD text |
| COLOR_CYAN | `#31afd4` | Shield, dash ready, heat (low) |
| COLOR_PINK | `#ff007f` | Nuke diamonds, buff indicators |
| Overdrive active | `#ff6600` | Overdrive bar and label |
| Spread buff | `#ffcc00` | Spread alt-fire label and bar |
| Flame alt-fire | `#ff6600` | Flame label and bar |
| Danger/overheat | `#ff3300` / `#ff0000` | Heat arc, low-time warnings |
| Faded elements | `#555555` / `#888888` | Inactive controls, cooldowns |
