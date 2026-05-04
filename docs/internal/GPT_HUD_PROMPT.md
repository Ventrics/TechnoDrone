# GPT Image Prompt — TechnoDrone HUD + Pause/Settings Mockups

Self-contained prompt to paste into a high-fidelity GPT image model. Asks for two separate images: an in-game HUD mockup and a pause/settings mockup. Both should read as the same machine.

If the image model accepts only one image per request, send Section A first, then Section B. The Preamble, Palette, and Box Treatment sections apply to both.

---

## Preamble — paste this with every request

You are designing UI mockups for **TechnoDrone**, a browser-based premium-arcade space shooter. The aesthetic is a holographic arcade machine projected into a black void: OLED-deep blacks, neon glow, layered shadow-blur for bloom, deliberate negative space. UI rewards attention; it does not constantly demand it.

Typography:
- **HUD / UI text**: a condensed geometric techno sans. Reference stack: `manifold-extd-cf`, Eurostile Extended, Microgramma D Extended.
- **Hero wordmarks** (titles, GAME OVER, MISSION COMPLETE): a futuristic display caps face. Reference stack: `cc-running-with-scissors-up`, `anatol-mn`.

Render rules:
- Pure black background `#000000` outside the playfield, no gradient creep into corners.
- Glow is `shadowBlur`-style: blur only, no XY offset. Multi-layer bloom on hero text (4–5 stacked passes at varying blur and alpha) is welcome; on body text keep it restrained.
- All text baselines are top-aligned and tracked deliberately. No default kerning.
- The result must look engineered, not illustrated. No painterly textures, no 3D bevels, no skeuomorphism.

## Color palette — Core Palette

Use these and only these as accents. The UI must feel like one machine.

- `#fb29fd` hot neon magenta
- `#dd32b3` pink
- `#4216d2` deep electric purple
- `#2e3bf0` electric blue
- `#000840` dark navy base
- `#d9d4ff` pale lilac-white (primary readable text)
- `#f3f0ff` near-white (bright values)
- `#31afd4` cyan (rails, dividers, structural UI, idle state)
- `#ff007f` hot pink (Bass Drop ready, kills accent)
- `#ff8800` / `#ff3300` orange-to-red (heat / danger ramp)

Semantic use:
- Purple/magenta — identity, Flow State, hero moments.
- Electric blue — structural UI, stage progression.
- Pale lilac-white — primary readable values.
- Red/orange — danger, overheating, damage.
- Gold/yellow — reward accents (use sparingly).

## Box treatment language — applies to every framed element

- **Corner geometry**: 8px cut corners, never rounded pills.
- **Strokes**: 1–2px, single border. No double borders, no inset/outset, no embossed edges.
- **Fills**: alpha `0.10`–`0.25` max. No opaque slabs anywhere except full-screen modal overlays.
- **Glow**: lives on the stroke, not the fill. `shadowBlur` 8–16, single pass.
- **No decoration**: no inner rules, no header bars, no tab tongues, no decorative cut-marks. The box is a frame, not a graphic.

Yes: slanted cells with cut corners, hairline corner brackets, thin-stroke containers, gradient selection chips with cut corners.

No: opaque slabs, drop-shadowed cards, rounded pills, decorative rules under floating labels, double-stroke borders, header strips on top of panels.

---

## Section A — In-Game HUD mockup (revised)

**Output**: 1920×1080, 16:9, pure black outside the playfield.

This revision tightens the right-side panel based on what actually carries weight. Strip everything else.

**Layout skeleton**

- **Playfield**: occupies the left ~70% of the canvas. A 9:8 aspect rectangle, vertically centered, anchored slightly left. Inside the playfield sits a small drone — render it as a delta-wing triangle pointing up, magenta-to-cyan glow on the leading edges, faint exhaust trail. Just a placeholder; the playfield is the focus, not the ship.
- **Play-area corner brackets**: hairline L-shapes at all four corners of the playfield. Arms 18px long, 1.8px line width, square line-cap, cyan `#31afd4` with `shadowBlur` 14.
- **Heat arc on the ship**: a 270° arc around the drone, gap at the nose (front), 28px radius, 2.5px line width, cyan-to-orange gradient (~60% heat).
- **Top edge**: a thin stage-timer bar across the full width (3px tall, electric blue `#2e3bf0` at alpha `0.85`, ~62% filled). To the upper-left of the playfield, a small floating `STAGE 04` readout. **Stage information lives only here at the top — it does not appear in the right-side panel.**
- **Right-side HUD**: occupies the rightmost ~30%. Tasteful framing still permitted (hairline container with 8px cut corners, open L-bracket, or vertical gradient bleed). Whatever framing you choose, individual values stay floating typography and the cut-corner motif is honored.

**Right-side HUD contents — top to bottom, KEEP ONLY THESE FIVE**

1. `SCORE` — small label in muted purple `#9db2ff` at 13px bold, then a large value: `1,248,750` in `#f3f0ff` at ~52px bold, blue glow `#2e3bf0` `shadowBlur` 20.
2. `HIGH SCORE` — small cyan label at 11px (alpha `0.6`), with a small upward chevron or arrow icon in cyan `#31afd4` indicating it's the all-time best, value `2,104,990` in `#d9d4ff` at ~16px, cyan glow `shadowBlur` 8. Compact, sits directly below SCORE.
3. `KILLS` — pink label `#f0a9de` at 13px, value `247` in `#f6ddff` at ~46px bold, pink glow `#dd32b3` `shadowBlur` 16.
4. `LIVES` — cyan label `#8fdcff` at 13px. Below the label, a horizontal row of **6 drone-shaped icons** representing capacity. The drone shape is a small delta-wing triangle (matching the player ship silhouette): triangle pointing up, ~22px tall × ~26px wide, with the same cut-corner energy as the rest of the UI but read as a stylized ship. **Three filled** (cyan `#31afd4` fill at alpha `0.85` with `shadowBlur` 12 cyan glow on the stroke), **three empty** (dim navy stroke at alpha `0.35`, no fill). Right-aligned cyan numeral `3` next to the row showing current count. Generous spacing between icons; this row reads as a clear capacity meter at a glance.
5. `BASS DROP` — pink label `#f0a9de` at 13px. Below it, a horizontal row of **3 drone-shaped icons** in the same vocabulary as the LIVES row but in hot pink. Drone silhouettes pulsing pink `#fb29fd` fill at alpha `0.85` with `#dd32b3` stroke and `shadowBlur` 14 (this shows the "ready" state, all three filled). **No timer text, no charge bar — only the three drone icons.**

**REMOVE entirely from the right-side panel** (these existed in the previous mockup and should not appear):
- `TIME` readout / multiplier (`4.2x` / `13.05` / wave indicator).
- `FLOW STATE` meter / bar.
- `STAGE PROGRESS` bar (the stage-progress percentage row). Stage info is only on the top edge.
- All control hints (`[J/MOUSE] FIRE`, `[K] LASER`, `[SPC] DASH`, `[Q] NUKE`, key-icon glyph block at the bottom).

**Bottom-right corner of the canvas**: faint `[ESC] PAUSE` label in white at alpha `0.42`, no glow, 14px. Nothing else below the BASS DROP row.

**Tone**: calmer and sparser than the previous mockup. The right-side panel should feel like five clean readouts, not nine. Negative space between SCORE/HIGH SCORE, KILLS, LIVES, and BASS DROP is part of the design, not a gap waiting to be filled.

---

## Section B — Pause / Settings mockup

**Output**: 1920×1080, 16:9, identical playfield faintly visible behind the overlay.

**Background**: the same in-game HUD from Section A, dimmed by a full-screen overlay of `#020206` at alpha `0.78`. The playfield, brackets, and right-side cluster should still be readable but pushed back. Heat arc and drone are 30% visible.

**Containing box** (this is exactly where containing boxes belong):
- One thin-stroke container, centered horizontally, slightly above center vertically.
- ~520px wide × ~440px tall.
- 8px cut corners, 1.5px stroke in cyan `#31afd4` with `shadowBlur` 12.
- Fill: dark navy `#000840` at alpha `0.18`. No header bar, no inner rules.

**Heading**: `PAUSED` at the top of the container, 34px bold, cyan `#31afd4`, `shadowBlur` 34. Centered, generous space below it before the first option.

**Options stack** (vertically centered inside the container, ~42px between rows, all centered horizontally):

1. **RESUME** — selected state. White `#ffffff` at full alpha, 21px bold, `shadowBlur` 22 white glow. Slight bracket marks `[ ]` flanking the word at low alpha.
2. **MUSIC VOL** — 21px cyan `#31afd4` at alpha `0.62`, idle. To the right of the label, a bracketed bar chart `[||||||    ]` (6 of 10 bars filled), monospace, cyan glow `shadowBlur` 8.
3. **SFX** — 21px cyan idle. To the right: `[ ON ]` in monospace, cyan glow.
4. **HOME** — 21px cyan idle.

**Footer hint**: below the container, centered, 12px in cyan at alpha `0.5`, pulsing implied: `[ ESC TO RESUME ]`.

**No** decorative rules under any label. **No** drop shadow on the container. **No** rounded pills. **No** logo lockup. The container itself is the only frame; everything inside is floating typography or a thin-stroke indicator.

---

## Negative prompt — applies to both images

- No opaque slabs, no rounded pills, no drop-shadowed cards.
- No header strips, no decorative rules under floating labels, no double borders.
- No accent colors outside the Core Palette listed above.
- No flat 2D vector look, no Photoshop-stock-UI feel, no glassmorphism plates.
- No tab tongues, no decorative cut-marks, no "high-tech" hexagons or scanline overlays inside the boxes themselves (a faint global scanline on the playfield is fine).
- No 3D bevels, no inner shadows, no embossed edges.
- No painterly background, no nebula, no realistic stars — keep the void OLED-black.

## Output format

Produce two separate 1920×1080 images, one for Section A and one for Section B. Both should be screenshot-ready references for a Canvas 2D / PixiJS implementation pass. Do not add watermarks, captions, or filename overlays.
