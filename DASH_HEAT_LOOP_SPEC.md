# Dash Heat Loop Spec

Paste this prompt into your implementation or review agent.

---

## Purpose

This document defines the new relationship between:
- dash
- heat
- movement flow
- OverDrive support

Graze has been removed from the game direction.
The system that now needs to carry that rhythm role is `dash`.

The core design sentence is:

`Dash preserves flow.`

---

## Design Goal

Dash should not be only:
- a panic dodge
- a survival button

Dash should also be:
- a rhythm tool
- a heat-management tool
- something the player wants to weave into combat

The player should feel rewarded for staying mobile and stylish.

---

## Recommended Rule

When the player performs a barrel-roll dash:
- immediately refund a modest amount of heat

Recommended first-pass value:
- `10–15` flat heat refunded

Use a flat value first, not a percentage.

Why:
- easier to feel
- easier to tune
- easier to communicate

---

## Why This Is Good

This creates a clean gameplay loop:
- firing builds heat
- dash relieves heat
- movement preserves offense
- OverDrive becomes easier to reach if the player stays in rhythm

That is much more aligned with the current game than the removed graze system.

---

## Player Fantasy

The player should feel:
- “I rolled through danger and kept my weapon system alive”
- “movement is part of my offense”
- “I can stay in flow if I use dash intelligently”

That is the right emotional role for barrel roll.

---

## Feedback Requirements

The heat refund must be visible immediately.

Recommended feedback:
- a quick heat bar dip
- a small cyan/violet vent flash near the ship
- optional brief exhaust burst or cool-off snap

The player should understand:

`That dash reduced my heat.`

This cannot live only in hidden numbers.

---

## Relationship To OverDrive

Dash should not directly activate OverDrive.

Instead, dash supports OverDrive by:
- letting the player keep firing longer
- helping them preserve rhythm
- helping them stay aggressive without overheating

So the overall loop becomes:
- kill to build OverDrive
- dash to maintain flow
- trigger OverDrive to enter the payoff state

---

## Balance Notes

First-pass tuning should be conservative but noticeable.

Recommended first pass:
- refund `10–15` flat heat

If too weak:
- increase refund before adding more complexity

If too strong:
- reduce refund before touching dash cooldown or distance

Do not immediately add:
- dash chains
- dash combo multipliers
- conditional refund scaling

First pass should stay clean.

---

## UX Rule

If the player uses dash and does not notice that it helped their heat rhythm, the feature is under-communicated.

The mechanic only works if the player feels it.

---

## Summary

Dash should become part of the game’s core combat rhythm.

### Final design sentence:
`Dash preserves flow by refunding heat and supporting aggressive movement.`
