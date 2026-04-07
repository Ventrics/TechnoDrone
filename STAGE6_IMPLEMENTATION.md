# Stage 6 - Blackout Rush Implementation

Paste this prompt into your implementation agent.

---

## Prompt

Files to edit will likely include:
- `C:/Users/brian/Downloads/Anti gravity/Projects/TechnoDrone/js/stage.js`
- `C:/Users/brian/Downloads/Anti gravity/Projects/TechnoDrone/js/game.js`
- `C:/Users/brian/Downloads/Anti gravity/Projects/TechnoDrone/js/ui.js`
- and only the minimum additional render files needed for visibility tuning

Add a new Stage 6 mechanic: `Blackout Rush`.

This is a defining transition point into the harder half of the game.
Stage 6 should feel like the arena drops into a live underground techno blackout where only the most important threats burn through the darkness.

This mechanic must feel:
- bold
- beautiful
- high-dopamine
- high-pressure

It must NOT feel:
- muddy
- timid
- unreadable
- like every asset got dimmed equally

The correct fantasy is:

`The world falls away. Only the important neon survives.`

---

## Scope Reality Check

This does **not** require adding a bespoke glow system to every asset in the game.

Do **not** implement Blackout Rush by manually rewriting every draw function.

Instead, use a `visibility hierarchy`.

That means:
- some things stay fully readable
- some things get enhanced glow
- some things get dimmed heavily
- some things can nearly disappear

The implementation should be driven by `priority`, not by trying to make everything participate equally.

---

## Design Intent

- Stage 1 teaches swarm flow
- Stage 2 teaches ranged target priority
- Stage 3 teaches burst pressure + hazard timing
- Stage 4 teaches support-target priority
- Stage 5 teaches space control through gravity wells
- Stage 6 should teach `combat under sensory compression`

The player should feel:
- “the game trusts me now”
- “I can still read what matters”
- “this looks incredible and dangerous”

This should be the first true `wow stage`.

---

## Core Mechanic

Stage 6 introduces periodic `Blackout Pulses`.

During a blackout pulse:
- the world darkens aggressively
- nonessential background visuals are suppressed
- critical gameplay threats stay visible and glow harder
- the player has to rely on strong priority reads instead of ambient comfort

This is not a permanent darkness stage.
It should have rhythm.

Recommended structure:
- normal visibility window
- blackout pulse
- recovery window
- blackout pulse again

That gives the stage pacing and breath.

---

## Blackout Timing

Recommended first-pass cadence:

- Stage starts with `3-5 seconds` of normal visibility
- Then blackout pulses begin
- Pulse duration: `2500ms` to `3500ms`
- Recovery duration between pulses: `2500ms` to `4000ms`
- Late in the stage, pulses can slightly lengthen or recovery can shorten

The first pulse should feel like an event.
Do not start the stage already dark.

---

## Visibility Hierarchy

This is the most important rule in the file.

### Tier 1 - Must Stay Highly Visible

These should remain fully readable and often glow harder during blackout:

- player ship outline / core
- player heat / overheat read
- enemy bullets
- sniper telegraphs
- turret targeting / firing tells
- support tethers
- gravity well rings / center
- active arena hazards that can damage the player
- Bass Pulse / OverDrive / Nuke major effects

These are gameplay truth signals.
They should survive the blackout.

### Tier 2 - Important But Secondary

These should remain visible, but dimmer than Tier 1:

- standard enemy bodies
- elite outlines
- pickup orbs
- hit sparks
- impact flashes

They should still read, but they are not the primary focus.

### Tier 3 - Can Be Aggressively Suppressed

These can be dimmed hard during blackout:

- background stars
- noncritical decorative particles
- ambient flourishes
- soft environmental glow not tied to danger

This is where the darkness should come from.

---

## Visual Rule

Blackout Rush should not be implemented as:

- “draw everything darker”
- “add a black overlay and call it done”

It should be implemented as:

- strong darkening pass on the arena
- selective survival of important emissive elements
- selective boost to critical glow/tell intensity

The player should instantly understand:
- what can hurt me
- what is safe
- what matters right now

---

## Glow Philosophy

When blackout is active, glow should be:
- stronger
- cleaner
- more contrasted

Not blurrier.
Not noisier.

Good examples:
- sniper lines cut harder across the screen
- support links look like live cables
- gravity wells pulse like stage fixtures
- turret fire lanes pop clearly
- the player ship core feels premium and intentional

Bad examples:
- huge bloom blobs covering bullets
- every particle becoming equally bright
- the whole scene becoming a purple smear

---

## What Should Actually Change In Rendering

Keep this implementation focused.

Recommended Blackout Rush render changes:

1. Add a stage-controlled blackout intensity value
2. Add a strong dark overlay during blackout
3. Reduce background star alpha heavily during blackout
4. Suppress ambient/noncritical particles during blackout
5. Boost critical telegraphs and threat glows during blackout
6. Optionally add a subtle screen pulse on blackout start

Do not do a full asset-by-asset rewrite if a few controlled multipliers can achieve the effect.

---

## Stage 6 Mechanical Synergy

Blackout Rush combines with the full stacking mechanic set active at Stage 6:

Active stack:
- turrets (persisting from S2)
- snipers (persisting from S5)
- kamikazes (returning from S3, aggressive interval)
- multiEdge spawning (enemies from all edges, active from S6)

Why this works:
- turrets create anchored firing lanes — harder to read in the dark
- snipers cut bright red windup rings across the blackout — the telegraph becomes MORE readable, not less
- kamikazes from all edges force constant movement — no safe corner to hide in
- multiEdge spawning means threats arrive from directions the player isn't watching

The blackout compresses comfort and forces the player to prioritize what they can still see. Snipers are the breakout visual moment — their red charge ring should cut through the darkness like a laser pointer in a dark room.

---

## Fairness Rules

Blackout Rush must obey all of these:

### 1. Never hide lethal information
If something can directly kill the player, it must still read clearly.

### 2. Player silhouette must survive
The ship can be stylized, but the player can never lose track of their own body.

### 3. Critical telegraphs get stronger, not weaker
Sniper, turret, and hazard warnings should become more intense during blackout.

### 4. Do not over-stack with invisible clutter
If a blackout pulse overlaps a very busy mechanic stack, the solution is to suppress noncritical visuals, not to leave everything equally bright.

### 5. Death must still feel explainable
If the player dies during blackout, they should still know why.

---

## Stage 6 Usage Rules

Stage 6 should feature Blackout Rush as the `headline mechanic`.

It should not also introduce a second brand-new enemy type in the same stage.

Instead:
- reuse earlier mechanics
- remix them under blackout pressure
- let the visual event itself be the new stage identity

This keeps Stage 6 memorable and clean.

---

## Suggested First-Pass Intensity

### Blackout overlay
- target darkness: strong
- enough that the arena feels transformed
- but not so strong that Tier 2 enemies vanish

### Threat boost
- critical threat tell intensity should increase by roughly `20-40%`
- only for Tier 1 systems

### Background suppression
- stars and noncritical FX should drop hard during blackout
- if needed, this can be animated over `150-250ms` instead of snapping

---

## Audio / Feel Suggestions

If audio support exists:
- blackout entry should have a strong stage-drop feel
- a muted bass thump or power-cut pulse would fit
- recovery should feel like the room opens back up

But Blackout Rush must still work visually if audio is missing.
Do not gate the stage on sound work.

---

## Implementation Constraints

- Keep the system centralized where possible
- Prefer one blackout intensity controller over many one-off hacks
- Only add per-system blackout behavior where it materially improves readability
- Avoid touching systems that do not need to participate

The goal is:
- high impact
- controlled scope
- premium feel

Not:
- touching every asset renderer in the game

---

## Practical Build Plan

Recommended implementation order:

1. Add blackout state/timer controller in stage flow
2. Add global blackout overlay
3. Suppress background/ambient layers
4. Boost critical threat visuals
5. Tune player ship visibility
6. Playtest fairness

Do not start by rewriting every draw call.

---

## What Stage 6 Should Feel Like

The player should feel:
- “this is the hard mode now”
- “everything important is glowing like a live show”
- “I can still read the fight, but the stage is forcing me to focus”

This is the moment where TechnoDrone should feel most like a premium underground neon survival game.

---

## Summary

Stage 6 introduces `Blackout Rush`.

It is:
- a visibility-compression mechanic
- a spectacle mechanic
- a pressure-remix mechanic

It should be implemented through:
- a strong blackout overlay
- a strict visibility hierarchy
- enhanced glow on critical gameplay truths

It should **not** be implemented by manually creating a special glow rule for every asset in the game.

That is how this stays both powerful and manageable.
