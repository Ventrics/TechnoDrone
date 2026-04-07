# Tutorial Redesign Spec

Note:
This file captures older tutorial-specific planning and is no longer the primary source of truth for presentation.

Read [UI_DESIGN_PHILOSOPHY.md](C:/Users/brian/Downloads/Anti%20gravity/Projects/TechnoDrone/UI_DESIGN_PHILOSOPHY.md) first for the current visual direction and shared UI rules.

This document defines the intended redesign for the first-run tutorial in TechnoDrone.

The goal is to make the tutorial:
- short
- readable
- premium
- interactive
- impossible to misunderstand

Target runtime:
- `20-30 seconds`

Core rule:
- the tutorial should advance primarily when the player performs the requested action
- not just because a timer expired

This should feel like:
- a clean onboarding sequence
- a playable micro-mission
- a fast confidence builder before the real run starts

---

## Current Problems

### 1. Bad text encoding
The current tutorial strings contain mojibake like:
- `â€”`

This makes the game feel broken and cheap.

Immediate content rule:
- use plain ASCII punctuation in tutorial strings
- preferred separator: `-`

Example:
- `MANAGE HEAT - RELEASE TO COOL`

Do not use smart punctuation unless the file encoding is guaranteed clean UTF-8 everywhere.

### 2. Steps are too passive
The current tutorial mostly advances on time, not on understanding.

That means a player can:
- miss the point
- ignore the mechanic
- still get pushed forward

That is bad onboarding.

### 3. The tutorial does not fully teach the real game loop
The current tutorial teaches some basics, but it does not clearly teach:
- OverDrive
- dash heat refund
- both alt fires
- the fact that nukes are limited for the full run

### 4. The current tutorial lacks “premium” pacing
It needs to feel authored and responsive, not like text cards over gameplay.

---

## Tutorial Philosophy

The tutorial should teach the player this sentence:

`Move, shoot, dodge, manage heat, build OverDrive, use alt-fire, and save your nukes.`

That is the game.

Everything in the tutorial should serve that sentence.

If a step does not support the real loop, cut it.

---

## Mechanics The Tutorial Must Teach

These are the current core mechanics that need explicit onboarding:

1. `Movement`
- `WASD`

2. `Primary fire`
- hold `J` or mouse

3. `Dash`
- `SPACE`
- up/down barrel-roll dodge

4. `Dash refunds heat`
- using dash reduces heat

5. `Heat / overheat`
- firing builds heat
- releasing fire cools
- overheating locks you out

6. `OverDrive`
- built through combat momentum
- activates as a strong temporary payoff state
- no heat gain while active
- movement feels faster and freer

7. `Alt fire pickups`
- elites drop alt fire
- current alt fires:
  - `Spread`
  - `Bass Pulse`
- alt fire uses `K`

8. `Nukes`
- `Q`
- only `3` nukes for the entire run

Optional but lower priority:
- score popups
- advanced stage mechanics
- support enemies
- blackout visuals

Those do not belong in the core first-run tutorial.

---

## Recommended Structure

The tutorial should be split into short action-gated steps.

Each step should have:
- a short instruction
- one clear success condition
- minimal enemy/hazard setup
- fast transition once completed

The tutorial should feel like a quick DJ set buildup:
- one mechanic enters
- player performs it
- next mechanic drops in

---

## Recommended Step Flow

### Step 1 - Move
Instruction:
- `MOVE - WASD`

Success condition:
- player moves a minimum distance in any direction

Goal:
- confirm the player can control the ship

Recommended length:
- `1-3 seconds`

Notes:
- no enemies yet
- let the ship breathe

---

### Step 2 - Shoot
Instruction:
- `FIRE - HOLD J OR MOUSE`

Success condition:
- player fires for a brief threshold
- or destroys one easy target

Goal:
- teach primary fire immediately

Recommended setup:
- 1-2 slow fragile enemies

Recommended length:
- `2-4 seconds`

---

### Step 3 - Heat
Instruction:
- `HEAT BUILDS WHILE FIRING`
- follow-up:
- `RELEASE TO COOL`

Success condition:
- player reaches a visible heat threshold
- then cools below a lower threshold

Goal:
- make the heat loop obvious

Recommended setup:
- harmless or slow targets stay present so the player can keep firing

Important:
- the tutorial should visibly wait for the player to cool
- this step must not auto-pass too quickly

---

### Step 4 - Dash
Instruction:
- `DASH - SPACE + UP OR DOWN`

Success condition:
- player performs one valid up/down dash

Goal:
- teach the barrel-roll dodge input correctly

Recommended setup:
- one clean incoming threat or lane marker

Important:
- this must teach the actual input
- not generic “press space”

---

### Step 5 - Dash Heat Refund
Instruction:
- `DASH REFUNDS HEAT`

Success condition:
- player has meaningful heat built up
- player dashes
- heat visibly drops

Goal:
- connect movement to weapon rhythm

Recommended setup:
- give the player something to fire at first
- then encourage a dash

This is a core system now and should be taught explicitly.

---

### Step 6 - OverDrive
Instruction:
- `KILLS CHARGE OVERDRIVE`
- follow-up:
- `OVERDRIVE = NO HEAT + MORE SPEED`

Success condition:
- player builds and activates OverDrive once

Goal:
- make OverDrive feel central, not hidden

Recommended setup:
- a short burst of easy enemies
- enough to trigger OverDrive quickly in tutorial conditions

Important:
- tutorial tuning can cheat here
- it is okay to reduce required charge during tutorial

This is preferable to making the player grind too long.

---

### Step 7 - Alt Fire Pickup
Instruction:
- `ELITES DROP ALT FIRE`
- `PRESS K TO USE`

Success condition:
- player kills one tutorial elite
- collects the drop
- uses alt fire at least once

Goal:
- teach the pickup loop and the `K` input

Recommended setup:
- spawn one elite with a guaranteed scripted alt-fire drop

Important:
- for tutorial clarity, the first scripted drop should be deterministic

---

### Step 8 - Alt Fire Identity
Instruction:
- first pass recommendation:
  - `SPREAD - WIDE CROWD CLEAR`
  - `BASS PULSE - CLOSE RANGE WAVE`

Success condition:
- player uses each alt fire once

Goal:
- teach that alt fires are different tools, not just generic bonuses

Recommended implementation choice:
- either split this into two very short micro-steps
- or spawn both in a controlled sequence

If time budget gets tight:
- prioritize teaching `one guaranteed alt fire pickup + K use`
- then show the second alt fire in a short optional second beat

---

### Step 9 - Nuke
Instruction:
- `Q - NUKE`
- `YOU ONLY GET 3 PER RUN`

Success condition:
- player fires one nuke

Goal:
- teach both function and scarcity

Recommended setup:
- pack several enemies onto the screen for immediate payoff

Important:
- the scarcity message matters as much as the button
- players should leave the tutorial knowing nukes are limited-run resources

---

### Step 10 - Final Recap / Release
Instruction:
- `SURVIVE. BUILD OVERDRIVE. SAVE YOUR NUKES.`

Optional:
- `GOOD LUCK`

Success condition:
- brief end beat, then transition into real gameplay

Goal:
- leave the player energized, not lectured

Recommended length:
- `1-2 seconds`

---

## Recommended Timing Budget

Approximate target:

1. Move: `2s`
2. Shoot: `3s`
3. Heat + cool: `4s`
4. Dash: `3s`
5. Dash heat refund: `3s`
6. OverDrive: `5s`
7. Alt fire pickup/use: `4s`
8. Nuke: `3s`
9. Exit beat: `1-2s`

Total:
- about `28-29 seconds`

This is the right range.

---

## Input-Gated Rules

The tutorial should not rely only on timers.

Each step should support:
- `instruction text`
- `success condition`
- optional `fallback timeout`

Meaning:
- advance when the player does the thing
- if they do nothing for too long, gently help or auto-advance

Recommended fallback:
- `5-7 seconds` max for simple steps
- slightly longer for OverDrive step if needed

This prevents the tutorial from stalling forever while still feeling responsive.

---

## Tutorial-Specific Tuning

The tutorial is allowed to cheat for clarity.

That means it is acceptable to:
- lower OverDrive charge requirement during tutorial
- guarantee specific alt-fire drops
- spawn simplified enemies
- reduce incoming pressure
- keep player shield/lives forgiving

Do not force the tutorial to obey full normal-run tuning if it harms comprehension.

The goal is:
- understanding first
- fairness second
- authenticity third

---

## Visual Direction

The tutorial should feel premium.

That means:
- short bold text
- clean placement
- strong fade in/out
- no broken symbols
- no debug-feeling instructions

Text should be:
- large
- centered
- concise
- all caps is fine if kept short

Good:
- `MOVE - WASD`
- `DASH REFUNDS HEAT`

Bad:
- long paragraphs
- multiple instructions at once
- jargon

---

## HUD / UI Teaching Requirements

The tutorial should draw attention to the actual in-game UI anchors, not replace them with separate fake tutorial UI.

The player should leave the tutorial understanding:
- where heat is shown
- where OverDrive is shown
- where alt-fire fuel is shown
- where nuke count is shown

Recommended teaching style:
- step text tells the player what matters
- gameplay HUD confirms it live

Optional premium addition:
- brief pulse/highlight on the relevant HUD element during the related step

Examples:
- heat step pulses the ship heat arc
- OverDrive step pulses the OverDrive meter
- nuke step pulses the `[Q] NUKE` area

This would be high value.

---

## Nuke Teaching Rule

The tutorial must explicitly state:

`YOU ONLY GET 3 NUKES PER RUN`

Not implied.
Not hidden.
Explicit.

Because this is a high-value limited resource and players should know that from the beginning.

---

## OverDrive Teaching Rule

The tutorial must explicitly state the payoff, not just the meter.

Players should learn:
- kills build OverDrive
- OverDrive makes you faster
- OverDrive removes heat gain while active

Recommended wording:
- `KILLS CHARGE OVERDRIVE`
- `OVERDRIVE = SPEED + FREE FIRE`

Keep it simple.

---

## Alt Fire Teaching Rule

The tutorial must teach both:
- how to get alt fire
- how the current alt fires differ

Minimum acceptable version:
- kill elite
- collect drop
- press `K`

Better version:
- one scripted Spread moment
- one scripted Bass Pulse moment

That would give the player actual understanding instead of just control knowledge.

---

## What The Player Should Understand By The End

By the end of the tutorial, the player should know:

1. Move with `WASD`
2. Fire with `J` or mouse
3. Dash with `SPACE + UP/DOWN`
4. Dash refunds some heat
5. Firing builds heat and overheating is bad
6. Kills build OverDrive
7. OverDrive means speed and free fire
8. Elites drop alt fire
9. `K` uses alt fire
10. `Q` uses nuke
11. Nukes are limited to `3` for the run

If the player does not know these things, the tutorial is incomplete.

---

## Recommended Implementation Strategy

### First pass
- replace current timed-only tutorial with action-gated steps
- fix all text encoding
- teach only the core loop

### Second pass
- add HUD pulses/highlights
- polish transitions
- tighten pacing

### Third pass
- add premium audiovisual touches:
  - step-complete chime
  - subtle camera emphasis
  - clean end-release into live run

This keeps scope sane.

---

## Summary

The tutorial should become a short, interactive, premium onboarding sequence.

### Final design sentence:
`Teach the real loop fast, clearly, and through action.`

### Locked principles:
- `20-30 seconds`
- action-gated progression
- ASCII-clean text
- explicit teaching of heat, dash refund, OverDrive, alt fire, and limited nukes
- premium presentation

This tutorial should make the first 30 seconds of TechnoDrone feel intentional and polished instead of provisional.
