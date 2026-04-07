# Stage Doc Cleanup Plan

This file is the reset plan for the later-stage design docs.

The goal is to stop carrying forward weak or placeholder stage specs just because they already exist. We are rebuilding the stage ladder around the current design philosophy:

- fast 5-minute survival structure
- hazards + enemies working together
- readable pressure
- stacking mechanics with clear identity

---

## Current Source Of Truth

The new stage direction should be built around:
- [STAGE2_IMPLEMENTATION.md](C:\Users\brian\Downloads\Anti gravity\Projects\TechnoDrone\STAGE2_IMPLEMENTATION.md)
- [STAGE4_IMPLEMENTATION.md](C:\Users\brian\Downloads\Anti gravity\Projects\TechnoDrone\STAGE4_IMPLEMENTATION.md)
- [STAGE5_IMPLEMENTATION.md](C:\Users\brian\Downloads\Anti gravity\Projects\TechnoDrone\STAGE5_IMPLEMENTATION.md)

Stage 3 is currently being actively worked on outside this file.

These should be treated as the active design direction, not the old Stage 6-10 files.

---

## What To Do With Old Stage Files

The following files should be treated as legacy drafts unless they are explicitly reviewed and re-approved:

- [STAGE6_IMPLEMENTATION.md](C:\Users\brian\Downloads\Anti gravity\Projects\TechnoDrone\STAGE6_IMPLEMENTATION.md)
- [STAGE7_IMPLEMENTATION.md](C:\Users\brian\Downloads\Anti gravity\Projects\TechnoDrone\STAGE7_IMPLEMENTATION.md)
- [STAGE8_IMPLEMENTATION.md](C:\Users\brian\Downloads\Anti gravity\Projects\TechnoDrone\STAGE8_IMPLEMENTATION.md)
- [STAGE9_IMPLEMENTATION.md](C:\Users\brian\Downloads\Anti gravity\Projects\TechnoDrone\STAGE9_IMPLEMENTATION.md)
- [STAGE10_IMPLEMENTATION.md](C:\Users\brian\Downloads\Anti gravity\Projects\TechnoDrone\STAGE10_IMPLEMENTATION.md)

Recommended action:
- do not use them as implementation authority
- redesign those stages from scratch, one by one
- once a replacement spec exists, remove or archive the old file

---

## Recommended Workflow Going Forward

For each future stage:

1. Decide the stage’s teaching purpose
2. Decide the headline mechanic
3. Decide what older mechanics remix into it
4. Write a fresh implementation spec
5. Only then let an agent implement it

This prevents the late game from turning into random mechanic stacking with no authored identity.

---

## Late-Stage Rebuild Philosophy

Stages 6-10 should not just be “more stuff.”

Each one should answer:
- what new pressure is introduced here?
- how does it combine with previous stages?
- what skill is being tested now?

That means the new later-stage docs should be written from scratch under the current philosophy, not patched from old placeholder ideas.

---

## Practical Recommendation

Short-term:
- keep the legacy Stage 6-10 docs on disk for reference only
- do not build from them directly

Medium-term:
- replace them one at a time with fresh specs

Final cleanup:
- once a new stage doc is approved and implemented, delete or archive the old conflicting draft

This gives us a cleaner process without losing temporary reference material too early.
