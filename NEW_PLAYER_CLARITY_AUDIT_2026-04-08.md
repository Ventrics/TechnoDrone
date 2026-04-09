# New Player Clarity Audit

Date: 2026-04-08
Project: TechnoDrone

## Problem Statement

The current game teaches controls better than it teaches meaning.

A new player is expected to infer too much on their own:

- what elites do
- what the reward loop is
- what Overdrive means
- why Overdrive is good while overheat is bad
- what a turret does
- what a shield drone does
- which enemies are high-priority

As a result, the game becomes much easier once understood, but that understanding currently depends too much on trial, error, and designer familiarity.

## Core Diagnosis

TechnoDrone has strong systems, but new-player communication is underdeveloped.

The main issue is not lack of mechanics. The issue is lack of clarity around:

- danger
- priority
- reward
- state change

The game currently does not always answer these two questions quickly enough:

1. Is this dangerous?
2. Should I care about it right now?

## Main Gaps

### 1. Elite Reward Clarity

Players are not clearly told what elites do.

Current issue:

- players may notice elites are different
- players may kill them
- players may receive `SPREAD SHOT`, `BASS PULSE`, or Overdrive charge
- but the meaning of that event is not strongly explained

Needed outcome:

- players should immediately understand that elites are reward targets
- elite kills should clearly communicate: "kill this to gain power"

### 2. Overdrive Naming + Readability

`Overdrive` is currently too close in language to `Overheat`.

This creates unnecessary friction:

- overheat = bad
- overdrive = good

These two states are opposites, but their names sound too similar.

Even if the name stays, the presentation is not yet strong enough to make the state unmistakable.

Needed outcome:

- either rename Overdrive
- or make the current state presentation dramatically clearer

### 3. Reward State Presentation

The current screen treatment is not strong enough to make the player feel like they are in a peak power mode.

Needed outcome:

- the player should instantly know they are empowered
- the player should feel encouraged to play more aggressively
- the state should feel rare, premium, and temporary

### 4. Enemy Role Clarity

Turrets and shield drones are not explained clearly enough.

Current issue:

- players can fight them without understanding their tactical role
- this makes the game feel harder than it actually is

Needed outcome:

- turret = stationary backline shooter / area-control threat
- shield drone = support/protection target that changes how nearby enemies are solved

These roles need to be understood quickly and visually.

## Design Goals

1. Make reward targets obvious.
2. Make high-priority enemies obvious.
3. Make the reward state impossible to miss.
4. Make the tutorial teach meaning, not just buttons.
5. Reduce the amount of game knowledge a player has to infer manually.

## Recommended Design Pass

### A. Tutorial Expansion

The tutorial should include a short enemy-language section.

Needed lessons:

- elite kill = grants power
- turret = kill before it controls space
- shield drone = protected/support enemy, remove to open the field
- reward state = what it is, why it matters, how it changes play

The tutorial should focus on:

- what matters
- what to prioritize
- what rewards aggression

not just:

- which button to press

### B. Overdrive Decision

Decide whether to:

1. Keep the name `Overdrive` and improve presentation
2. Rename the state entirely

Possible rename directions:

- Surge
- Amplify
- Neon Rush
- Full Burn
- Max Sync
- Ascend

Any replacement should clearly separate itself from `Overheat`.

### C. Reward-State Presentation Upgrade

If the name stays, the visuals must do more work.

The reward state should include stronger:

- ship transformation
- bullet transformation
- outer frame response
- hero callout
- persistent indication that the player is currently empowered

The player should not wonder whether they are in the state.

### D. Priority Language

Enemy communication should follow simple rules:

- regular enemies = stage identity
- elites = reward targets
- turrets = immediate backline danger
- shield drones = support/protection priority

Every enemy role should read clearly in:

- color
- behavior
- tutorial encounter
- on-screen messaging

## Proposed Next Questions

When this pass is picked up later, answer these first:

1. Should `Overdrive` be renamed?
2. What exact message should elite kills communicate?
3. How should the tutorial teach turret priority?
4. How should the tutorial teach shield drone priority?
5. What visual change makes the reward state feel undeniable?
6. What should a first-time player understand within the first 2 runs?

## Recommended Priority Order

1. Decide on Overdrive naming
2. Clarify elite reward messaging
3. Add turret/shield drone role teaching
4. Strengthen reward-state presentation
5. Review the full tutorial again from a new-player perspective

## Summary

The game is mechanically stronger than it is communicatively clear.

That is good news.

It means the next major improvement is not inventing more mechanics. It is teaching the existing ones better.

Once players understand:

- what rewards them
- what threatens them
- what states matter

the game should feel significantly better without needing major systemic changes.
