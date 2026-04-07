# TechnoDrone UI Design Philosophy

This document is the current source of truth for TechnoDrone's UI direction.

It captures the learnings from:
- the title screen
- the game over screen
- the gameplay HUD
- the tutorial overlay
- recent cleanup around palette, hierarchy, and readability

Any future UI pass should read this file first.

If an older spec conflicts with this document, follow this document.

---

## Executive Summary

TechnoDrone UI should feel:
- premium
- sharp
- intentional
- minimal
- neon
- readable at a glance

It should not feel:
- boxed-in by default
- gamey in a cheap way
- pastel
- overly panelized
- debug-like
- busy for the sake of looking futuristic

The right mental model is:

`floating holographic techno UI with strong typography, restrained structure, and clear semantic color.`

---

## Core Design Thesis

The game is at its best when the screen feels:
- mostly black
- high contrast
- emotionally selective
- visually rewarding when important things happen

That means the UI should not flood the screen with constant shapes or containers.

Instead:
- the playfield stays clean and dark
- important text gets glow and hierarchy
- bars and rails feel engineered
- large moments get premium presentation

The visual language should reward attention, not demand it.

---

## Global UI Rules

### 1. Default to floating UI, not boxed UI

Boxes should be the exception, not the default.

Use boxes only when the screen truly benefits from a contained module, such as:
- pause menu
- modal overlays
- settings-like choices

Do not use a box just because text needs a background.

Preferred alternatives:
- floating text
- thin guide lines
- accent bars
- light separators
- negative space

### 2. Typography is the hero

The strongest UI moments in TechnoDrone are text-driven.

Examples:
- `TECHNO DRONE`
- `GAME OVER`
- the final tutorial catchphrase

UI should lean on:
- bold monospace or similarly sharp techno text
- strong size hierarchy
- measured letter spacing
- layered glow treatment on important copy

Small text should still be legible, but it should never look accidental.

### 3. The screen should breathe

Spacing matters as much as color.

Use:
- clear vertical rhythm
- strong separation between title, subtitle, divider, and stats
- enough line spacing that phrases feel authored

Avoid:
- cramped stacked text
- bars jammed too close together
- labels that visually merge into neighboring elements

### 4. UI should live around gameplay, not inside it

The playfield should remain mostly OLED black.

Important rule:
- progression, system state, and presentation should generally live around the play area
- not wash over the center of gameplay

Exceptions:
- tutorial prompts
- short callouts
- rare premium moments like the final tutorial beat

Even then, those should be restrained and intentional.

---

## Color Philosophy

### Core palette

The current UI language should stay close to this family:

- `#fb29fd` - hot neon magenta
- `#dd32b3` - cotton-candy pink
- `#4216d2` - deep electric purple
- `#2e3bf0` - saturated electric blue
- `#000840` - dark navy base

Supporting neutral:
- `#d9d4ff` or similar pale lilac-white for premium readable text

### Color usage rules

Use colors semantically.

- purple / magenta:
  - identity
  - Overdrive
  - premium hero moments
  - title/tutorial/game over emphasis

- electric blue:
  - structural UI
  - rails
  - divider lines
  - stage progression accents
  - cool system energy

- pale lilac-white:
  - primary readable values
  - headline top layer
  - important text that must remain crisp

- red / orange:
  - danger
  - overheating
  - damage
  - sniper/threat language
  - Bass Pulse only where intentionally separated from Overdrive

- gold / yellow:
  - Spread Shot
  - special reward-state accents where needed

### Avoid

Avoid introducing random accent colors just to differentiate systems.

The UI should feel like one machine, not five unrelated widgets.

Bad pattern:
- one system green
- another orange
- another cyan
- another pink
- another white

unless there is a very clear semantic reason.

---

## Screen-by-Screen Philosophy

## Title Screen

The title screen should feel:
- premium
- sparse
- centered
- confident

Structure:
- oversized hero typography
- small supporting line
- strong clickable menu text
- minimal stats
- controlled progression indicator

The title screen should not feel like a menu inside a generic panel.

It should feel like a branded state of the game.

Design cues to preserve:
- layered neon title treatment
- clean centered composition
- strong action text
- deliberate spacing

---

## Game Over Screen

The game over screen is one of the best references for premium layout in the project.

Why it works:
- big centered hero text
- strong glow hierarchy
- deliberate spacing
- light structural lines
- compact supporting stats
- clean lower control prompts

This screen should continue to be used as a benchmark for:
- headline spacing
- letter spacing
- divider placement
- minimal but premium composition

When in doubt, borrow rhythm from the game over screen.

---

## Gameplay HUD

### Role split

Gameplay HUD should be split by job, not by symmetry.

Current philosophy:
- gameplay center = sacred
- outer frame = presentation
- right rail = systems and values
- top/bottom playfield bars = stage and Overdrive state

### HUD style rules

- avoid large background slabs behind the whole HUD
- prefer floating modules, clean text, and engineered bars
- use sharp/slanted geometry rather than soft rounded game UI pills
- text must be large enough to parse instantly
- every important label should feel designed, not default

### Value hierarchy

The player should be able to parse:
1. score
2. kills
3. lives / nukes
4. heat
5. active mechanic

at a glance.

If the rail reads as "a bunch of bars," hierarchy has failed.

### The right rail should feel like:
- a holographic instrument strip
- not a settings menu
- not a debug readout

### Bar design rules

- bars should be thick enough to read
- tracks should be dark navy, not light grey
- fill colors should be purposeful and consistent
- segment rows should feel like a designed system, not placeholders

---

## Tutorial UI

The tutorial should now follow the same visual philosophy as the rest of the game.

### Key rules

- no generic card boxes by default
- floating text preferred
- playfield placement is acceptable when restrained
- tutorial text should draw the eye naturally toward the action
- prompts should feel like in-world holographic guidance

### Visual treatment

Use:
- floating headline text
- thin guide lines
- palette-consistent glow
- minimal supporting labels

Avoid:
- chunky panels
- tutorial-looking boxes
- mismatched colors
- verbose blocks of instructions

### Final tutorial beat

The final tutorial beat is intentionally more dramatic.

It should feel like:
- a reward
- a confidence spike
- a micro title card

That moment should borrow from:
- title screen confidence
- game over screen spacing

But it should still remain cleaner and lighter than a full screen transition.

---

## Motion and Glow

### Glow rules

Glow is good when it:
- clarifies emphasis
- creates mood
- makes text feel premium

Glow is bad when it:
- makes everything equally bright
- destroys hierarchy
- creates visual mud

Use glow selectively:
- hero text gets layered glow
- labels get lighter glow
- guide lines get subtle glow
- standard informational text gets restrained glow

### Animation rules

Use:
- soft pulse
- low-frequency flicker
- simple sweeps
- entry emphasis on important moments

Avoid:
- constant jitter
- fast flicker on normal interface
- noisy effects that compete with enemy readability

The animation should feel expensive, not chaotic.

---

## Readability Rules

### 1. Important text must survive peripheral vision

If the player glances quickly, they should still parse:
- what the prompt is
- what the big reward state is
- what the current danger system is

### 2. Large moments deserve large text

Do not undersell:
- Game Over
- Overdrive
- tutorial finale
- major warnings

### 3. Small labels should still be deliberate

Even minor labels should:
- use the correct palette
- have intentional alpha
- belong to the system around them

### 4. Gameplay clarity beats decorative style

Whenever style conflicts with:
- enemy readability
- projectile readability
- mechanic legibility

gameplay clarity wins.

---

## Specific Learnings From Recent Iteration

These were learned directly from the recent UI work and should guide future passes.

### 1. Players respond better to floating text than boxed text

Especially for tutorial prompts and cinematic beats.

### 2. Center-screen copy works better when it is sparse and intentional

A small amount of strong centered text is better than a full panel.

### 3. The game over screen spacing is more premium than ad hoc stacked text

Future UI should reuse that rhythm:
- stronger vertical gaps
- clean divider logic
- wider letter spacing where needed

### 4. Too many colors makes the interface feel amateur

The palette must stay tight and controlled.

### 5. Heat, Overdrive, and danger should be readable from the ship itself when possible

Ship-mounted or playfield-adjacent feedback is often better than another HUD block.

### 6. The playfield should remain clean black whenever possible

If we want more visual richness, add it around the playfield, not over it.

---

## Future UI Checklist

Before shipping any UI change, check:

- Does it feel like the same universe as the title screen and game over screen?
- Is the color palette still tight?
- Could this be floating instead of boxed?
- Is the typography strong enough?
- Does the spacing feel intentional?
- Is gameplay still clearer, not less clear?
- Is this a premium effect or just more stuff?

If the answer to the last question is "just more stuff," cut it.

---

## One-Line Standard

Use this sentence as the final gut check:

`TechnoDrone UI should feel like a premium holographic arcade machine projected into a black void.`
