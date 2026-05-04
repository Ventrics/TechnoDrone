# GPT Image Prompt — TechnoDrone Gameplay Element Sheet

Self-contained prompt for GPT image. Produces a single 1920×1080 reference sheet with six labeled elements on a black background. Used to lock visual direction before wiring into code.

Paste everything from "Preamble" through "Composition" into a single GPT image request.

---

## Preamble

You are designing a reference sheet for **TechnoDrone**, a browser-based premium-arcade space shooter. The aesthetic is a holographic arcade machine projected into a black void: OLED-deep blacks, neon glow, multi-layer shadow-blur bloom, hairline stroke geometry, deliberate negative space. Everything reads like luminous wireframe — no painterly textures, no 3D bevels, no rendered metal panels, no skeuomorphism.

Typography on labels:
- A condensed geometric techno sans, all caps. Reference stack: `manifold-extd-cf`, Eurostile Extended, Microgramma D Extended.

Render rules:
- Pure black background `#000000`.
- All glow is `shadowBlur`-style: blur only, no XY offset. Multi-pass bloom (3–5 stacked passes at varying blur and alpha) on hero elements; lighter glow on supporting parts.
- Strokes are hairline (1–2px effective). Fills are dark navy at very low alpha or empty. **Light comes from the stroke, not the fill.**
- The result must look engineered and luminous, not illustrated.

## Color palette — Core Palette only

Use these and only these as accents. Do not introduce new colors.

- `#fb29fd` hot neon magenta — **reserved for Flow State and the ship's Flow bloom**
- `#dd32b3` pink — late-stage enemies, BASS DROP indicators
- `#7c3aed` electric purple
- `#4216d2` deep electric purple
- `#6366f1` indigo
- `#2e3bf0` electric blue
- `#003b8e` deep blue
- `#00e5ff` electric cyan
- `#7be3ff` ice cyan
- `#31afd4` cyan (HUD structural)
- `#f5f7ff` cool white — Stage 1 / Stage 10 enemies
- `#d9d4ff` pale lilac-white — primary readable text
- `#ffd15c` / `#ff8800` gold-to-orange — **reserved for the Jackpot pickup only**
- `#ff1133` red — **reserved for elite enemies (do not use elsewhere)**

## Composition

A single 1920×1080 canvas, pure black background, divided into a 3-row grid of clearly separated cells. Each cell holds one element and a small floating label in cool white at 13px hairline-glow type. Cells do not have visible borders — separation is by negative space (~80px gutters). Layout:

```
Row 1 (top half):  [1] HERO SHIP          |  [2] SHIP IN FLOW STATE
Row 2 (mid band):  [3] NORMAL ENEMY        |  [4] JACKPOT PICKUP
Row 3 (bottom):    [5] FLOW STATE LABEL    [6] 10-NODE STAGE DOTS
```

Cells 1–4 are roughly square (each ~720×400 px region). Cells 5 and 6 are full-width strips (~1840×200 each).

---

### [1] HERO SHIP — premium delta with extended wings

Centered in the cell, ship pointing **upward** (nose at top), silhouette larger and more confident than a basic triangle. Build it as:

- Slim central fuselage, hairline cyan stroke `#00e5ff` at full alpha with cyan `shadowBlur` 12.
- **Wings extending past a slim delta** — swept-back wings reaching wider than a standard arrow silhouette. Two clean wing planes per side, the outer wing tip pulled rearward like a delta interceptor. Wing leading edge: cyan hairline. Wing trailing edge: magenta hairline `#fb29fd` at full alpha with magenta glow.
- **Wing-tip highlights**: small magenta `#fb29fd` dots at the outermost tip of each wing, with strong magenta `shadowBlur` 16 — these are the brand color accents.
- **Center spine**: bright white hairline running tip to tail through the fuselage, white `#ffffff` at alpha 0.85 with cyan glow underglow.
- **Cockpit/canopy hint**: a small inset diamond or sliver near the nose, cyan stroke only, no fill.
- **Exhaust beam**: a bright vertical magenta-to-cyan gradient beam trailing below the rear, ~3× the ship length, fading to transparent. White-hot core fading to magenta to cyan to nothing.
- **Heat arc**: 270° hairline arc around the ship origin, cyan transitioning into orange as a single ramp around the back, gap at the nose. Show ~50% heat. Do not split the arc into halves.
- Floating label below the ship: `HERO SHIP — DEFAULT`.

The overall impression: a wireframe gunship that feels expensive. Not bulky, not cute, not anime. Think Iron Maiden album art crossed with vector arcade.

### [2] SHIP IN FLOW STATE — magenta bloom hero moment

Same silhouette as cell [1], same proportions. Treatment shifts to:

- Outer corona: wide magenta `#fb29fd` stroke at alpha 0.20 with `shadowBlur` 24.
- Mid bloom: magenta stroke at alpha 0.55, `shadowBlur` 14.
- Inner: pale lilac-white `#d9d4ff` stroke, hairline, full alpha.
- Wing-tip highlights now read as bright white-hot points with magenta haloes.
- Spine line glows hot pink/magenta instead of white.
- Exhaust beam doubles in length and brightness, pure magenta core.
- Subtle motion lines / chromatic offset implied around the ship — like the air is bending around it.
- Floating label below: `HERO SHIP — FLOW STATE`.

Should feel like the calmest possible nuclear explosion. Pure light, no muscle.

### [3] NORMAL ENEMY — Stage 1 neon glow language

This is the small standard enemy, currently rendered too flat (gray fill, painterly shadow). Redesign as luminous wireframe.

- Asymmetric hard-edged shard / chunk silhouette, ~5–7 vertices, irregular and angular. Not a clean polygon — it should read as a fractured fragment.
- **No fill** (or near-black `#000840` at alpha 0.10 max).
- **Outer glow stroke**: cool white `#f5f7ff` at alpha 0.32, `shadowBlur` 12.
- **Mid stroke**: white at alpha 0.7, hairline 1.2px, `shadowBlur` 6.
- **Inner crisp stroke**: pure white at full alpha, hairline 0.6px, no glow.
- **Inner accent line**: a single hairline drawn across the shard's interior, white at alpha 0.4 — gives a sense of facet without filling.
- Subtle slow-rotation hint: shape is tilted ~12° off-axis.
- Floating label below: `NORMAL ENEMY — STAGE 1 (`#f5f7ff`)`.

Critical: **do not render shadow gradients inside the shape, do not bevel, do not give the enemy volume via fill shading.** All depth comes from the layered stroke glow. The current implementation lost the neon — bring it back.

Note: the same silhouette will be recolored across stages. The 10-stage gradient is `#f5f7ff → #7be3ff → #00e5ff → #2e3bf0 → #003b8e → #6366f1 → #7c3aed → #4216d2 → #dd32b3 → #f5f7ff`. You only need to render the Stage 1 white version here — the others derive from this template.

### [4] JACKPOT PICKUP — premium reward orb

Centered in the cell. The jackpot is the highest-value pickup in the game and currently looks generic. Design it as a hero element:

- **Outer halo**: warm orange `#ff8800` radial bloom at alpha 0.18, `shadowBlur` 36, ~80px radius. Soft falloff.
- **Mid halo**: gold `#ffd15c` ring at alpha 0.55, `shadowBlur` 20, ~50px radius.
- **Inner ring**: a hairline gold ring stroke, alpha full, with a thin internal accent ring just inside it (suggests rotation / spin).
- **Core**: a small white-hot center dot `#ffffff` with intense gold glow `shadowBlur` 16.
- **Internal glyph**: a small stylized `$` or stacked-coin glyph in the center, hairline gold, optional. If too literal, replace with a small geometric mark (cut-corner square or chevron stack).
- **Particle wisps**: 5–8 tiny gold points drifting outward at varying angles, like sparks lifting off the orb. Hairline, low alpha.
- **Floating callout treatment hint**: small text above the orb reading `JACKPOT` in gold, 13px, with a subtle chevron mark. This is just a treatment reference — placement in-game will differ.
- Floating label below: `JACKPOT PICKUP`.

Tone: gold is the only warm color in the entire game. Lean into that — it should feel like the orb is from a higher caste than everything else on screen.

### [5] FLOW STATE LABEL TREATMENT

Full-width strip across the bottom-mid of the canvas. Show it in context: the **two existing tall purple rails** flank a small section of playfield (this is the flow-state charge meter — keep them as-is, ~80% filled, hot purple `#7c3aed` with strong `shadowBlur` 18, hairline white inner edge).

Between the rails, on the LEFT side, redesign the floating `FLOW STATE` label that currently lives there as rotated vertical text. The current treatment is literal stacked rotated letters — replace it.

Propose a **designed wordmark** that:
- Reads cleanly at a glance even when peripheral.
- Uses a stacked typographic treatment: e.g. `FLOW` over `STATE`, both horizontal, tight tracking, in pale lilac-white `#d9d4ff` with magenta `#fb29fd` glow `shadowBlur` 14.
- Has deliberate kerning and spacing — looks engineered, not auto-rotated.
- Sits in the negative space adjacent to the left rail, not touching it.
- Optionally includes a small hairline chevron or accent mark indicating "charging" state.

Floating label below the strip: `FLOW STATE WORDMARK`.

### [6] 10-NODE STAGE PROGRESSION DOTS

Full-width strip across the bottom of the canvas. Show 10 small circular nodes evenly spaced along a horizontal hairline:

- The hairline connecting them is electric blue `#2e3bf0` at alpha 0.35, 1px.
- **Past stages** (nodes 1–3): small filled cyan `#31afd4` dots, radius 4px, with cyan `shadowBlur` 8, alpha 0.7.
- **Current stage** (node 4): larger node, radius 7px, bright magenta `#fb29fd` fill with hot magenta `shadowBlur` 16, full alpha. A small floating label `STAGE 04` sits 14px above it in pale lilac-white at 13px.
- **Future stages** (nodes 5–10): hairline outline circles only, no fill, dim purple `#4216d2` stroke at alpha 0.4, no glow.
- The whole row should read at a glance as "you are 4/10 through the run."
- Floating label below the strip: `STAGE PROGRESSION (TOP BAR)`.

This will live on the top bar of the gameplay HUD next to the existing `STAGE 04 / 10` text label. The mockup just establishes its visual treatment.

---

## Negative prompt — applies to entire canvas

- No painterly textures, no airbrush gradients, no inner-shadow volume on enemy shapes.
- No 3D bevels, no embossed edges, no metallic rendering, no specular highlights.
- No rounded pills, no opaque slabs, no drop-shadowed cards.
- No double borders, no decorative rules, no header strips, no tab tongues.
- No accent colors outside the listed Core Palette. Especially: **no green, no teal-green, no yellow that isn't the gold reserved for jackpot, no red that isn't elite-red (and no elites in this sheet).**
- No flat 2D vector look, no Photoshop-stock-UI feel, no glassmorphism plates.
- No realistic stars, no nebula clouds, no fog. Background is OLED-black void.
- No text other than the small element labels and the in-context labels described above (`STAGE 04`, `JACKPOT`, etc.).
- No watermarks, no captions, no branding logos.

## Output format

A single 1920×1080 PNG, screenshot-ready as a reference sheet for a Canvas 2D / PixiJS implementation pass. Each of the six elements clearly readable in isolation. Black gutters between cells, no visible cell borders. Aim for the calm precision of a printed product spec, not a busy collage.
