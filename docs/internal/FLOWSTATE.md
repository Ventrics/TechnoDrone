# Flow State

> Any agent touching Flow State should read this file first.

## Core Standard
Flow State is the main high the player is chasing.

It is not just a buff. It is the reward loop that keeps TechnoDrone emotionally alive between moment-to-moment survival beats. The player should want it, recognize it instantly, feel stronger inside it, and miss it the moment it ends.

If dash is the micro-rhythm tool, Flow State is the macro payoff.

## Design Goal
Flow State should create this arc:
- anticipation while charge builds
- release on activation
- aggression while active
- satisfaction during the run
- immediate hunger to earn it again

The feeling should be:
`now I get to go off`

Not:
`my damage buff is active`

## What Players Must Feel
On activation, the player should instantly understand:
1. I entered a premium reward state.
2. My ship and weapons are now enhanced.
3. I should push harder right now.

Flow State should feel:
- immersive
- rewarding
- high-energy
- premium
- legible at a glance

It should not feel:
- subtle
- purely statistical
- HUD-only
- cluttered
- visually chaotic

## Current Mechanical Role

### Charge
- Built through kills and aggressive momentum
- No graze dependency
- Charge bar should build anticipation clearly

### Active State
- Heat gain: `0` while active
- Movement speed: `+15-20%`
- Duration: use the current tuned code value unless doing a balance pass

Core rule:
The player should feel Flow State in the world before they need to read it in the HUD.

## Presentation Priority
Flow State succeeds when the game itself looks and feels upgraded, not when a status label changes.

Priority order:
1. Ship transformation
2. Weapon transformation
3. World-state transformation
4. Activation burst
5. Sustain behavior
6. HUD confirmation

Build order should follow that same priority. Do not start by adding more HUD.

## Visual Layers

### 1. Ship
- Brighter core
- Stronger violet-white or magenta-white bloom
- Hotter engine and energy points
- Slightly improved afterimage quality during movement

The ship should look empowered immediately, even in peripheral vision.

### 2. Weapons
- Bullets become more prestigious, not more confusing
- White-hot center
- Purple or magenta glow fringe
- Brighter tip or leading edge

Do not change projectile silhouette enough to hurt readability.

### 3. World
- Outer screen margins carry a pink-purple energized aura
- Playfield border becomes brighter and more alive
- The machine should feel like it entered a superior state

Effects should mostly live on borders, ship, and weapons, not as visual clutter in the center playfield.

## Activation, Sustain, Exit

### Activation
One strong premium moment:
- screen-edge bloom pulse
- ship flare
- playfield frame pulse

It should feel celebratory and expensive, not explosive or messy.

### Sustain
The active state should remain stable and desirable:
- breathing outer aura
- upgraded ship glow
- upgraded bullets
- energized frame

Sustain should feel powerful without becoming noisy.

### Exit
- Border glow softens
- Ship returns cleanly to base look
- Bullets revert
- Aura drains off smoothly

Do not overdramatize the exit. Activation is the money moment.

## Color Direction
- World: pink-purple / magenta-violet
- Ship: violet-white
- Weapons: white-hot core with purple glow

Flow State should reinforce TechnoDrone's existing identity, not swap in a different one.

## HUD Role

### Before activation
The HUD's job is anticipation.
- Charge bar must read clearly
- Build should feel visible and desirable

### During activation
The HUD becomes secondary confirmation.
- World, ship, and weapons should carry the feeling
- The player should feel Flow State before reading a label

Rule:
The HUD helps build Flow State. The world expresses active Flow State.

## What Flow State Must Not Become
- Just a brighter bar
- A mild stat buff with no emotion
- A particle storm
- A full-screen flash mode
- A clutter layer that obscures enemies, bullets, or hazards

Gameplay clarity still wins.

## Performance Rules
High-value, low-cost effects:
1. Outer border glow
2. Brighter playfield frame
3. Bullet glow/color swap
4. Ship bloom amplification
5. One strong activation pulse plus soft sustain pulse

Avoid:
- dense fullscreen particles
- constant screen flashing
- heavy blur stacks every frame
- giant screen shake
- busy in-playfield overlays

## Improvement Standard
Flow State is important enough that "works" is not the finish line.

If it is mechanically correct but emotionally flat, it still needs work.

Future improvements should aim at:
- clearer anticipation while charging
- more satisfying activation
- stronger ship/weapon transformation
- better sustain mood without extra clutter
- sharper contrast between normal play and Flow State
- stronger desire to re-earn it after exit

When deciding between features, prefer the one that increases feeling, legibility, and chase value at low visual/performance cost.

## Implementation Phases
1. Core mechanics: no heat gain, movement bonus, duration validation
   Files: `js/player.js`
2. Ship and bullet transformation: make Flow State legible instantly
   Files: `js/player.js`, `js/weapons.js`
3. World-state expression: outer aura and energized frame
   Files: `js/game.js`, `js/ui.js`, possibly `js/fx.js`
4. Activation and exit presentation: premium pulse in, clean fade out
   Files: `js/player.js`, `js/game.js`, `js/fx.js`
5. Balance and feel pass: charge rate, duration, readability under pressure

## Success Criteria
Flow State is successful when:
1. A first-time player notices activation immediately.
2. The player wants to play more aggressively during it.
3. A spectator can tell the game entered a special state.
4. The screen feels more alive and expensive, not more cluttered.
5. The player wants to earn it again as soon as it ends.

Final benchmark:
If the player triggers Flow State and the reaction is not basically `oh hell yes`, it is not finished.
