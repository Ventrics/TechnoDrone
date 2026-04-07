# Stage 5 - Gravity Wells Implementation

Paste this prompt into your implementation agent.

---

## Prompt

File to edit: `C:/Users/brian/Downloads/Anti gravity/Projects/TechnoDrone/index.html`

Add a new Stage 5 mechanic: `Gravity Wells`.

The goal of Stage 5 is to teach `space control pressure`.
By this point, the player has already learned:
- swarm flow
- target priority
- burst pressure
- support-target priority

Stage 5 should be the moment when the arena itself stops being neutral.

The player should start feeling:

`I cannot just dodge enemies. I also have to respect where the arena is trying to pull me.`

Keep the mechanic readable and controlled. This should feel dangerous and memorable, not messy or unfair.

---

## Design Intent

- Stage 1 teaches swarm flow and graze confidence
- Stage 2 teaches ranged priority through turrets
- Stage 3 adds burst pressure and hazard timing
- Stage 4 adds support-target priority
- Stage 5 should teach `space control`

This stage should make positioning itself part of the challenge.

The player should:
- recognize gravity wells immediately
- understand the pull direction
- feel the danger before it becomes lethal
- still feel in control if they react correctly

---

## Core Mechanic

Stage 5 introduces `Gravity Wells`:
- stationary arena hazards
- visible pull zones
- movement distortion inside the field
- strong synergy with existing threats like turrets, kamikazes, and support units

Gravity Wells should not directly deal damage on contact in the first version.
Their danger comes from:
- dragging the player into bad positions
- making dodge routes worse
- making other threats harder to solve

That is more interesting than just “another thing that touches you and hurts you.”

---

## Behavior

### Spawn
- Gravity Wells appear at authored or semi-authored positions
- Prefer spawning away from the far left edge so the player has space to react
- Avoid spawning directly on top of the player
- Avoid spawning too close to another well in the first version

### Lifecycle
- Wells should exist long enough to matter
- Suggested first pass:
  - active duration: `7000ms` to `10000ms`
  - warning fade-in before active pull: `600ms`
  - warning fade-out or collapse when ending: `400ms`

### Pull
- While inside the radius, the player is pulled toward the well center
- Pull should scale with distance:
  - weaker at the edge
  - stronger near the center
- First pass should be moderate, not brutal

Suggested first-pass pull behavior:
- outer radius: mild pull
- inner radius: noticeable pull
- center area: high danger but still escapable with good movement

---

## Player Interaction

The player should be able to:
- feel the pull
- fight against it
- dash out of bad positioning
- use skillful movement to keep grazing and threat handling intact

The player should NOT feel:
- hard-stunned
- robbed of control
- dragged with no chance to recover

The gravity well is a `movement tax`, not a guaranteed hit.

---

## Visual Readability

This mechanic has to be instantly readable.

### Visual Language
- dark-space distortion or neon ring field
- visible center core
- circular or spiral field lines
- subtle inward motion that shows “this is pulling”
- should be distinct from portals and unlike enemy bullets

### Recommended Style
- outer field: dim cyan / blue-violet ring
- inner core: brighter white-cyan or violet-white pulse
- low-alpha concentric rings or spiral arcs
- particles drifting inward toward the center

### Readability Rule
The player must be able to answer:
- where is the center?
- how large is the danger zone?
- is it activating, active, or ending?

---

## State Phases

Recommended simple 3-phase flow:

### 1. Warning
- ring fades in
- core starts pulsing
- little or no pull yet
- gives the player time to read the hazard

### 2. Active
- full pull strength
- strongest visual intensity
- inward particles / field motion visible

### 3. Collapse
- pull weakens
- core dims
- field shrinks or breaks apart

This gives the mechanic rhythm and fairness.

---

## Stage 5 Usage Rules

Stage 5 should feature gravity wells as the `headline mechanic`.

Recommended first-pass usage:
- only `1` active gravity well at a time for most of the stage
- optional brief later overlap of `2`, but only after playtesting
- do not fill the map with them

The point is not clutter.
The point is to change the shape of the fight.

---

## Synergy With Existing Mechanics

This mechanic works well because it interacts naturally with other stage threats:

### With Turrets
- wells pull the player into fixed firing lanes
- turrets become more punishing if ignored

### With Kamikazes
- wells make panic dodges harder
- the player has to manage burst threats while movement is distorted

### With Support Drones
- support units force target decisions while the arena is also pressuring position

### With Portal / Timed Ground Hazard
- very strong synergy, but use carefully
- do not stack too many area hazards at once in the first pass

---

## Suggested First-Pass Balance

### Gravity Well
- radius: `120` to `150`
- strong inner radius: `50` to `70`
- pull strength at edge: mild
- pull strength near center: moderate to high
- warning duration: `600ms`
- active duration: `8000ms`
- collapse duration: `400ms`

If it feels too oppressive:
- reduce pull before reducing visual size
- keep the visual radius honest

If it feels too weak:
- increase inner pull, not full-field pull

That preserves fairness.

---

## Implementation Constraints

- Keep the well visually readable behind/around enemies
- Do not let the effect obscure bullets or critical enemy tells
- Do not stack many simultaneous particle systems here
- Avoid high-cost visual tricks if a cleaner ring solution reads better

The mechanic must support the game’s premium neon feel without becoming muddy.

---

## What Stage 5 Should Feel Like

The player should feel:
- “the map is fighting me now”
- “I need to route my movement, not just react”
- “if I ignore anchors or supports while a well is active, the board gets out of control”

That is the correct progression step after Stage 4.

---

## Summary

Stage 5 introduces `Gravity Wells`.

They should:
- manipulate movement
- change safe routes
- combine naturally with earlier mechanics
- stay readable and fair

This keeps the game aligned with the core philosophy:
- dodge hazards
- manage pressure
- kill the right enemy
- survive increasingly hostile arena conditions
