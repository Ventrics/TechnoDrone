# TechnoDrone Tutorial

> Source of truth for first-run tutorial design.

- Target runtime: `45-60s`
- Core rule: every step advances on player action
- Core rule: only enable the inputs required for the current lesson

## Purpose
The tutorial should teach how TechnoDrone feels, reads, and rewards attention.

The player should leave understanding:

`Move, shoot, manage heat, dash, trigger Flow State, use Base Drop, read the color language.`

If a step does not directly support that outcome, cut it.

## Design Philosophy
The tutorial must teach the game's visual language as part of play, not in a detached text dump.

- `GREEN = GOOD`
- `RED = BAD`
- `GOLD = BONUS POINTS`

Tutorial content must always respect those meanings:

- Green markers can guide movement, show safe goals, or mark success
- Red targets and red threats are things the player should shoot, avoid, or prioritize
- Gold objects are optional score rewards or bonus pickups
- Never ask the player to shoot anything green

## Must Teach
1. Movement with `A` and `D`
2. Primary fire with `J` or mouse
3. Heat builds while firing
4. Cooling requires releasing fire
5. Dash with `SPACE` plus `A` or `D`
6. Dash refunds heat
7. Kills build Flow State
8. Flow State means speed plus free fire
9. Base Drop is the panic-clear button
10. Green good, red bad, gold bonus points

## What To Cut
These do not belong in the first-run tutorial unless they become absolutely necessary:

- Elite-specific lessons
- Alt-fire pickup lessons
- Shield drone lessons
- Turret-specific lessons
- Score popup explanations
- Stage-specific gimmicks
- Extended end-card sequences
- Slow motion or dramatic finish beats

The tutorial is onboarding, not a mechanics catalog.

## Input Locking Rules
Movement should remain available through the full tutorial unless a future step explicitly depends on removing it.

Other inputs should be locked to the lesson being taught.

Examples:

- Movement step: allow `A` and `D` only
- Shoot step: allow movement plus fire
- Heat lesson: allow movement plus fire until heat is demonstrated, then require release
- Dash step: allow `A`, `D`, and `SPACE` only
- Flow State step: allow movement plus fire
- Base Drop step: allow movement plus the Base Drop input

If a button is not being taught in the current step, it should do nothing.

## Step Flow
Each step needs:

- One short instruction
- One clear action
- One clean success condition
- Fast transition after completion

## Recommended Steps
| Step | Instruction | Allowed Inputs | Setup | Success |
|---|---|---|---|---|
| 1 | `MOVE - A / D` | `A`, `D` | Two green goal markers, one left and one right | Player touches both markers |
| 2 | `SHOOT THE RED TARGETS` | `A`, `D`, fire | Two or three stationary red targets, no threat | Player destroys all targets |
| 3 | `FIRING BUILDS HEAT - RELEASE TO COOL` | `A`, `D`, fire | No pressure, strong HUD readability | Player raises heat, then cools below threshold |
| 4 | `DASH - SPACE + A OR D` | `A`, `D`, `SPACE` | Two stationary red targets placed for dash kills | Player destroys both with dash |
| 5 | `DASH REFUNDS HEAT` | `A`, `D`, `SPACE`, fire | Let player build heat first, then require dash | Player visibly drops heat by dashing |
| 6 | `KILLS CHARGE FLOW STATE` | `A`, `D`, fire | Spawn a larger easy red swarm, start Flow State near full | Player activates Flow State, clears the rest of the swarm, then gets a short beat before advancing |
| 7 | `YOU LOSE FLOW STATE WHEN HIT` | none | Keep Flow State active, fire a guaranteed enemy shot | Player gets hit and loses Flow State |
| 8 | `GREEN GOOD  RED BAD  GOLD BONUS` | movement plus fire if needed | One green guide, one back-right turret, one kamikaze, then a delayed gold bonus ring | Player completes the read correctly |
| 9 | `BASE DROP CLEARS THE SCREEN` | `A`, `D`, Base Drop | Spawn a dense red cluster built to be deleted | Player uses Base Drop |

## Step Notes
### Step 1: Movement
- Start here every time
- No firing
- No enemies
- The screen should immediately teach that green markers are goals

### Step 2: Shooting
- Targets must be red or neutral, never green
- Keep them stationary
- No retaliation
- The player should learn that red means "deal with this"

### Step 3: Heat
- This is a readability lesson more than a combat lesson
- Make the heat gain obvious and the cool-down obvious
- Do not add pressure that distracts from the meter

### Step 4: Dash
- Teach dash as movement with purpose, not as a text instruction alone
- Make the player destroy both red targets with dash so the move has a clear purpose

### Step 5: Dash Refund
- This should feel immediate
- Build heat quickly, dash once, show the drop clearly

### Step 6: Flow State
- Keep this as one strong lesson instead of two near-duplicate beats
- Use a larger easy swarm so activation happens naturally during play
- Start the meter near full so a few kills are enough to trigger it
- Do not advance immediately on activation
- Let the player kill the remaining enemies in Flow State, then hold briefly before the next step
- Lower the requirement for tutorial use
- Do not force a clumsy loss-state demo afterward

### Step 7: Flow State Loss
- This is the one step where movement can be disabled
- The text must explicitly say that getting hit makes the player lose Flow State
- Use a guaranteed readable projectile so the lesson cannot fail silently

### Step 8: Color Language
- This step should confirm the visual philosophy through action
- Use a turret and a kamikaze as the red threats instead of a plain static red target
- Keep the turret anchored high on the back right so the top of the screen still reads clearly
- Flow State should not still be active here
- Delay the gold ring spawn slightly so the read happens in sequence
- Keep it fast

### Step 9: Base Drop
- Replace all remaining `nuke` tutorial language with `Base Drop`
- This is the emergency clear tool
- The setup should make the benefit obvious in one button press
- Do not use slow motion during the tutorial Base Drop lesson
- The transition should wait for the effect to read cleanly instead of snapping away immediately

## Timing Budget
| Step | Target |
|---|---|
| Move | `4-5s` |
| Shoot | `4-5s` |
| Heat | `5-6s` |
| Dash | `4-5s` |
| Dash refund | `4-5s` |
| Flow State | `6-8s` |
| Flow State loss | `2-3s` |
| Color language confirm | `4-5s` |
| Base Drop | `3-4s` |
| Total | `~42-55s` |

## Gating Rules
- Advance only when the player does the required action
- Do not use timed auto-advance as the primary completion rule
- A fallback skip is acceptable, but it should not define the pacing
- Do not let the player accidentally complete a future lesson early
- Do not stall forever
- Do not require perfection

## Allowed Tutorial Cheats
- Lower Flow State charge requirement
- Spawn simplified enemies
- Freeze or simplify enemy behavior
- Make hazards cleaner than in the full game
- Make the player invulnerable
- Guarantee a clean Base Drop moment

Priority order:

`understanding -> clarity -> pace -> authenticity`

## Presentation Rules
- Short bold text
- Centered all-caps instructions
- ASCII punctuation only
- One instruction at a time
- Fast fade in and fade out
- Highlight the relevant action or HUD element only when useful

Good:

- `MOVE - A / D`
- `SHOOT THE RED TARGETS`
- `RELEASE TO COOL`
- `BASE DROP CLEARS THE SCREEN`

Bad:

- Long paragraphs
- Multiple lessons at once
- Contradicting the color language
- Slow dramatic victory cards
- Forced slow motion

## Completion Standard
After the tutorial, the player should know:

1. `A` and `D` move the drone
2. Fire destroys red threats
3. Firing builds heat
4. Releasing fire cools the weapon
5. `SPACE` plus direction performs a dash
6. Dashing refunds heat
7. Kills charge Flow State
8. Flow State gives speed plus free fire
9. Base Drop is the screen-clear tool
10. Green is good, red is bad, gold is bonus points

If the player does not leave knowing those things, the tutorial is incomplete.
