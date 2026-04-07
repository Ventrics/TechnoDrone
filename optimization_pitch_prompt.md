# EXECUTIVE PITCH: Staged Optimization Phase for TechnoDrone

## Context for AI Agent
Act as a Senior Engine Programmer pitching an optimization pass to the Lead Game Designer and Studio Owners.

The game "TechnoDrone" already has a strong foundation:
- clear stage progression
- strong game feel
- readable hitboxes
- good core systems like heat, graze, and overdrive

However, as enemy counts, particles, and screen chaos increase in later stages, the current HTML5 Canvas implementation is likely to develop:
- frame drops
- micro-stutters
- unstable performance on lower-end machines
- poor headroom for future premium polish

Your job is to pitch a staged optimization program that improves performance **without changing the core gameplay feel or harming the premium neon presentation**.

Do not pitch this as a blind rewrite. Pitch it as a measured, evidence-driven optimization pass.

---

## The Pitch

### Phase 0: Lightweight Profiling / Instrumentation
**The Problem:** Right now, we can feel occasional frame hitches, but we do not yet have enough runtime visibility into what is actually causing them. If we optimize blindly, we risk spending time on the wrong systems or accidentally reducing the game's visual quality without solving the real bottleneck.

**The Solution:** Add lightweight instrumentation first:
- frame time sampling
- bullet count
- enemy count
- particle count
- optional collision-check counters
- optional draw-pass counters

This gives the team real evidence about where the engine is struggling.

**Integration note:** A profiling HUD overlay is a natural fit for the existing dev screen spec (`DEV_SCREEN_IMPLEMENTATION.md`). Tuck the frame time / entity count display behind the dev screen toggle rather than building separate UI for it.

*Impact: We optimize based on data, not guesses.*

---

### Phase 1: Eliminate Memory Thrashing with True Object Pooling
**The Problem:** The engine currently uses array churn patterns such as `Array.filter()` cleanup and `push({ ... })` spawning for bullets and particle-like systems. Even where counts are capped, the engine still creates and discards objects during gameplay, which invites garbage collection spikes during intense action.

**The Solution:** Pre-allocate fixed-size pools for high-frequency runtime objects:
- bullets
- enemy bullets
- sparks
- smoke
- fragments
- other short-lived FX

Instead of creating/destroying objects, recycle them using an `active` flag or similar reuse pattern.

*Impact: Fewer gameplay-time allocations, fewer GC spikes, more stable frame pacing.*

Important note:
Do not claim "zero allocations everywhere" unless that is actually proven. The pitch should stay honest and professional.

---

### Phase 2: Remove or Reduce the Worst `ctx.filter` Usage
**The Problem:** Per-frame blur compositing through `ctx.filter` is often inconsistent across browsers and can become a major render cost, especially when the game is already drawing many emissive elements.

**The Solution:** Replace the most expensive filter-based bloom/composite steps first with cheaper alternatives:
- additive compositing
- pre-softened gradients
- layered emissive passes

If we stay in Canvas 2D, this is a strong candidate for the first rendering optimization because it can produce large wins without changing gameplay logic.

**Scope clarification:** Phase 2 targets the full-screen bloom composite pass. The current implementation renders bright sources to a half-resolution offscreen `bloomCanvas`, then composites it onto the main canvas using a single `ctx.filter = 'blur(10px)'` call with `globalCompositeOperation = 'lighter'`. This is the specific call to replace — not scattered filter usage. Phase 3 (below) targets the separate problem of per-element `shadowColor` + `shadowBlur` glow draws.

*Impact: Lower frame render cost, better browser consistency, more stable late-game performance.*

---

### Phase 3: Neon Glow Refactor (Targeted, Not Blind)
**The Problem:** `shadowColor` + `shadowBlur` is one of the most expensive visual operations in Canvas 2D. The game uses this heavily as part of its signature neon look. At scale, this may become a significant render bottleneck.

**The Solution:** Refactor only the most expensive glow-heavy systems first and replace them with tuned alternatives such as:
- multi-pass strokes with wider alpha falloff
- soft radial gradients
- layered emissive shapes

The pitch should be careful here:
- do **not** promise the replacement is automatically identical
- do say it can be made visually close while preserving the premium OLED identity
- do emphasize that visual validation will be part of the process

*Impact: Meaningful render savings while protecting the game's visual brand.*

---

### Phase 4: Upgrade Collision Detection if Profiling Confirms It
**The Problem:** The current collision model trends toward `O(N*M)` behavior when bullet count and enemy count both rise. That means performance cost can grow much faster than the on-screen chaos appears to.

**The Solution:** If profiling shows collision checks are a top bottleneck, implement a simple spatial partitioning layer such as a spatial hash grid so bullets only test against nearby enemies.

Important note:
This is the highest-risk systems optimization in the pitch because collision bugs directly damage trust and feel. It should not necessarily be the first change just because it sounds technically impressive.

*Impact: Harder ceiling on collision cost during the most chaotic late-game states.*

---

## Recommended Priority Order

1. `Phase 0: profiling / instrumentation`
2. `Phase 1: true object pooling`
3. `Phase 2: reduce worst filter-based rendering cost`
4. `Phase 3: targeted glow refactor`
5. `Phase 4: spatial collision upgrade if profiling still demands it`

This order protects both engineering time and product quality.

### Unlisted but worth noting: Draw Call Batching

One optimization that often outperforms glow refactoring in Canvas 2D is reducing `ctx.save()/restore()` pairs and render state changes. Currently every shard gets its own save → translate → rotate → draw → restore cycle. Batching enemies by color into a single path operation would reduce state-change overhead significantly. This could fold into Phase 3 or slot between Phase 1 and Phase 2 depending on what profiling reveals.

---

## Key Product Framing

This optimization pass is not just about "making it faster."

It protects:
- the premium feel
- the late-game spectacle
- the ability to scale stage intensity
- the ability to ship on a wider range of hardware
- the team's future iteration speed

The goal is:
- smoother performance
- better frame stability
- preserved visual identity
- no gameplay feel regressions

---

## What Not to Pitch

Do **not** pitch:
- a full engine rewrite
- broad “optimize everything” language
- guaranteed visual sameness without validation
- collision-grid work as the automatic first step

This should sound like a disciplined production plan, not a panic reaction.

---

## Next Step for Agent

Please read and acknowledge this staged optimization pitch.

When interacting with the user, maintain a Senior Engine Programmer persona.

Ask the user whether we have approval to begin with:
`Phase 0: lightweight profiling / instrumentation`

If they prefer to skip directly to implementation work, recommend:
`Phase 1: true object pooling`

Do not make any code changes until the user gives approval.
