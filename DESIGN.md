# TechnoDrone Design

> Source of truth for UI, HUD, and visual presentation. If another doc conflicts with this one, follow this one.

## Core Standard
TechnoDrone should feel like a premium holographic arcade machine projected into a black void.

The playfield stays mostly black and clean. UI should reward attention, not constantly demand it. Favor glow, hierarchy, rails, and negative space over boxes and noise.

## Non-Negotiables
- Note: this is here because Codex cannot listen.
- Default to floating UI, not boxed UI. Boxes are mainly for pause, settings, and modals.
- This is added because Codex cannot listen: do not add decorative lines, tails, accent rails, dividers, or underlines unless told to, or unless they communicate real gameplay information.
- Right-side HUD labels and numbers must remain floating text. Do not attach them to separator lines, accent lines, ornamental rules, rails, connector strokes, underlines, framing strokes, or decorative bars.
- If the right-side HUD needs emphasis, use spacing, alignment, typography, glow, scale, and color only. Decorative linework next to text is a bug unless it conveys actual gameplay information.
- Typography carries the brand. Strong monospace/techno text, clear size hierarchy, deliberate tracking, layered glow on important copy.
- UI lives around gameplay, not on top of it. The center playfield is sacred except for tutorial prompts and rare hero moments.
- Spacing must feel authored. Strong separation between title, subtitle, dividers, stats, and prompts.
- Gameplay clarity beats style. If a visual choice hurts readability, cut it.

## Color System

### Core Palette
- `#fb29fd` hot neon magenta
- `#dd32b3` pink
- `#4216d2` deep electric purple
- `#2e3bf0` electric blue
- `#000840` dark navy base
- `#d9d4ff` pale lilac-white for primary readable text

### Semantic Use
- Purple/magenta: identity, Flow State, title/tutorial/game-over hero moments
- Electric blue: rails, dividers, stage progression, structural UI
- Pale lilac-white: primary readable values and crisp top-layer text
- Red/orange: danger, overheating, damage, threat language
- Gold/yellow: reward-state accents and bonus moments

Do not add random accent colors just to separate systems. The UI should feel like one machine.

## Screen Direction

### Title
Centered, sparse, premium. Oversized hero typography, small support line, strong action text, minimal stats. It should feel branded, not like a panel inside a frame.

### Game Over
This is the layout benchmark. Big centered hero text, strong glow hierarchy, generous spacing, light structural lines, compact supporting stats, clean lower prompts.

### Gameplay HUD
Role split:
- Center: gameplay
- Outer frame: presentation
- Left rail: systems and values
- Top edge: stage timer

Style:
- No large background slabs
- Floating modules and engineered bars
- Sharp/slanted geometry, not soft pills
- Labels must look designed, not default
- Right-side panel is floating typography first, not panel chrome
- No decorative linework attached to right-side labels or values
- Right-side emphasis comes from type hierarchy and spacing, not rails or dividers

Reading priority:
1. Score
2. Kills
3. Lives / Base Drop
4. Heat
5. Active mechanic

If the rail reads like "a bunch of bars," the hierarchy failed.

### Tutorial
Use the same floating holographic language. Avoid generic cards. Draw attention toward action. The final tutorial beat should feel like a lighter version of the title/game-over premium treatment.

## HUD Layout
All HUD elements are left-aligned at `x=20` except `[ESC] PAUSE`, which sits bottom-right.

### Left Column: Status Group
| Y | Content | Font | Color |
|---|---|---|---|
| 20 | `LIVES N` + shield arc icon | bold 21px mono | stage `hudColor` |
| 50 | `STAGE N / 10` | bold 21px mono | stage `hudColor` |
| 80 | `TIME Ns   KILLS N` | bold 21px mono | stage `hudColor` |
| 112 | `ACTIVE: MECHANIC` when active | 16px mono, alpha 0.72 | stage `hudColor` |

Shield arc:
- Small cyan arc, radius `8px`, beside `LIVES`
- Shows recharge progress while shield is down

### Left Column: Systems Group
- `FLOW STATE`: 13px label + `160px` bar
- Charging color: cyan
- Active color: orange `#ff6600`
- Gap after Flow State block: `8px`
- `SCORE`: bold 21px, `hudColor`, `x=20`
- Gap after score: `6px`
- `[J / MOUSE] FIRE`: 14px mono, white, glow 16
- `[K] alt-fire`: 14px mono; show `LASER` + fuel bar or `awaiting drop`
- `[SPC] DASH`: 14px mono; cyan when ready, grey countdown when cooling
- `[Q] NUKE`: 14px mono + 3 inline diamond icons + charge bar below

Nuke diamonds:
- Position after `[Q] NUKE` using `ctx.measureText()`
- Spacing: `22px`
- Filled: pink `#ff007f` with glow
- Empty: grey `#555` at alpha `0.2`
- Ready: white pulsing glow

Control hint fading:
- Tutorial and Stage 1: full alpha on labels
- Stage 2+: control labels drop to alpha `0.3`
- Bars, icons, and status values stay full alpha

### Bottom Right
`[ESC] PAUSE`: 14px mono, white, alpha `0.42`, no glow

## Heat Arc
Heat is shown on-ship, not as a HUD bar.

- Center: ship origin `(0,0)` in local drone coords
- Radius: `28px`
- Span: `270deg`, from `135deg` to `45deg` clockwise
- Gap remains at the nose/front
- Line width: `2.5px`
- Background track: full arc always visible, alpha `0.12`, color `#333`

### Heat Colors
| Range | Color | Hex |
|---|---|---|
| 0-50% | Cyan | `#31afd4` |
| 50-80% | Orange | `#ff8800` |
| 80-100% | Red-orange | `#ff3300` |
| Overheated | Pulsing red | `#ff0000`, alpha `0.35-1.0` |

Glow:
- Single pass only
- `shadowBlur=8`
- Glow color matches arc
- Do not use 3-pass glow; too expensive per frame

Render order inside `drone.draw`:
1. Ship hull
2. Engine exhaust
3. Heat arc
4. Tip weapon glow

## Timers

### Stage Timer Bar
- Full width at top edge
- Height: `3px`
- Background: `hudColor` at alpha `0.25`
- Fill: `hudColor` at alpha `0.85`
- Hidden during tutorial

### Center Watermark Timer
- Large faded countdown in center for ambient awareness
- Font: bold `120px` monospace
- Format: `"17s"`
- `10+ sec`: white `#ffffff`, alpha `0.06`
- `5-10 sec`: `#ff4422`, alpha `0.10`
- `<5 sec`: `#ff4422`, pulse `0.08-0.14` at `4Hz`
- No glow or shadow
- Render after starfield, before enemies and player
- Hidden during tutorial, title, pause, death, win, leaderboard

## Motion and Glow
- Glow should clarify emphasis, create mood, and make hero text feel premium
- Too much glow destroys hierarchy and creates visual mud
- Use strongest glow on hero text, lighter glow on labels, subtle glow on guide lines
- Normal informational text should stay restrained
- Preferred motion: soft pulse, low-frequency flicker, simple sweeps, brief premium entry emphasis
- Avoid constant jitter and fast flicker

## Canvas vs Pixi

### Canvas Is The Source Of Truth For Glow-Heavy Visuals
- If an effect depends on softness, bloom, halo falloff, OLED-black contrast, or luminous edge treatment, default to Canvas 2D first.
- This includes ship glow, weapon glow, hit flashes, danger vignettes, Flow State edge glow, heat arcs, and similar "soft energy" visuals.
- These effects should preserve the established Canvas `shadowBlur` / gradient language unless the user explicitly asks for a redesign.
- If a Pixi version looks harder, boxier, flatter, more geometric, or more obviously "drawn," it is the wrong implementation for this project.

### Pixi Is For Compositing And Enhancement
- Use Pixi for full-frame compositing, color grading, subtle post effects, chromatic response, render presentation, and future performance headroom.
- Pixi should enhance the Canvas look, not replace it by default.
- Avoid using Pixi `Graphics` geometry to recreate soft warning states, glow vignettes, or other atmospheric effects unless parity has already been proven.

### Visual Decision Rule
- When choosing between Canvas and Pixi, ask:
- Does this effect need soft falloff and organic glow? Use Canvas.
- Does this effect need full-frame compositing or post-processing? Use Pixi.
- If unsure, choose the more conservative path that preserves the old look.

## Typography Notes
- Playable-area screen callouts rendered through `streakCallout` use `Eurostile Extended`.
- Fallback stack for those callouts: `Eurostile Extended`, `Eurostile Extended #2`, `Microgramma D Extended`, `Microgramma`, `sans-serif`.
- This applies to in-play hero text such as Flow State, reward callouts, bonus phase callouts, and similar center/top playfield announcements.

## Readability Rules
1. Important text must survive peripheral vision.
2. Big moments deserve big text.
3. Small labels still need intentional color, alpha, and placement.
4. Gameplay clarity always outranks decoration.

## Ship Checklist
Before shipping a UI change, ask:
- Does this feel like the same universe as Title and Game Over?
- Is the palette still tight?
- Could this float instead of sitting in a box?
- Is the typography strong enough?
- Does the spacing feel intentional?
- Is gameplay clearer, not worse?
- Is this premium, or just more stuff?

If it is just more stuff, cut it.
