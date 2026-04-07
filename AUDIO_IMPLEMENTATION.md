# TechnoDrone Audio System Implementation

Paste this prompt into your implementation agent.

---

## Prompt

Create `js/audio.js` for TechnoDrone at `C:/Users/brian/Downloads/Anti gravity/Projects/TechnoDrone/`.

Build a complete Web Audio API sound system using procedural synthesis (no audio files). The system must have a clean public API so that procedural sounds can later be swapped for audio file playback without changing any call sites.

**Architecture rule: NO ES modules.** Global scope, loaded via `<script src="js/audio.js"></script>` before the game loop script.

---

## Design Goals

1. **Zero file dependencies** — all sounds generated from oscillators, noise, and envelopes
2. **Swappable** — the API stays the same whether a sound is synthesized or loaded from a file
3. **Aesthetic fit** — sounds should feel like they belong in a neon OLED arcade game. Think: crisp, synthetic, slightly retro, not realistic
4. **Performance** — sounds must not cause frame drops. Pre-build reusable nodes where possible. Never create AudioContext per sound.
5. **Mixable** — separate volume channels for SFX, music, and master

---

## Public API

The entire audio system is exposed as a single global object: `audio`

```javascript
// ── Initialization ──
audio.init()
// Call once on first user interaction (click/keypress).
// Creates the AudioContext. Web Audio requires user gesture to start.
// Idempotent — safe to call multiple times.

// ── SFX ──
audio.play('shoot')
audio.play('enemyHit')
audio.play('enemyDeath')
// Fire-and-forget. Plays the named sound immediately.
// Returns nothing. Silent no-op if audio not initialized or muted.

// ── Music ──
audio.playMusic('gameplay')
audio.playMusic('title')
// Crossfades to the named music track over 800ms.
// Only one music track plays at a time.

audio.stopMusic(fadeMs = 500)
// Fades out current music.

// ── Volume ──
audio.setMasterVolume(0.0 - 1.0)
audio.setSfxVolume(0.0 - 1.0)
audio.setMusicVolume(0.0 - 1.0)

// ── Mute ──
audio.toggleMute()
// Toggles global mute. Returns new mute state (true/false).
// Connect this to the existing pause menu SOUND toggle.

audio.isMuted  // boolean getter

// ── Future: File-based override ──
audio.registerSound('shoot', 'sfx/shoot.mp3')
// When called, replaces the procedural 'shoot' generator with
// an audio buffer loaded from the file. Call sites don't change.
// NOT implemented now — just reserve the method signature.

audio.registerMusic('gameplay', 'music/gameplay.mp3')
// Same pattern for music tracks.
```

---

## Internal Architecture

```
AudioContext
  ├── masterGain ──────────────────────── speakers (ctx.destination)
  │     ├── sfxGain
  │     │     └── (individual sound nodes connect here)
  │     └── musicGain
  │           └── (music source nodes connect here)
```

### Key Implementation Details

1. **Single AudioContext** — created in `audio.init()`, reused forever
2. **Gain nodes** — `masterGain`, `sfxGain`, `musicGain` created once at init
3. **Sound registry** — `Map<string, { type: 'procedural' | 'buffer', generate?: Function, buffer?: AudioBuffer }>`
4. **Procedural sounds** — each registered as a function that creates and connects nodes to sfxGain, then starts them. Nodes auto-disconnect when done (use `oscillator.onended`).
5. **Polyphony limiting** — for rapid-fire sounds like `shoot`, limit to 4 simultaneous voices. If a 5th fires, steal the oldest. Track active voices per sound name.
6. **AudioContext resume** — browsers suspend AudioContext until user gesture. `audio.init()` should call `ctx.resume()`. Also try resuming on every `audio.play()` call as a safety net.

---

## Sound Definitions

Each sound is a procedural synthesis recipe. All times are in seconds.

### Player Actions

#### `shoot` — Player bullet fire
- **Character**: Short, crisp laser tick
- **Recipe**: Square wave at 880Hz, pitch slides down to 440Hz over 0.06s
- Gain envelope: 0.15 peak, linear ramp to 0 over 0.08s
- Total duration: 0.08s
- **Polyphony cap: 4** (player fires rapidly)
- This sound plays VERY frequently — it must be cheap to generate

#### `dash` — Dash activate
- **Character**: Whooshing sweep
- **Recipe**: White noise through bandpass filter, center frequency sweeps from 2000Hz to 400Hz over 0.25s
- Gain envelope: 0.2 peak, fade to 0 over 0.3s
- Filter Q: 2
- Total duration: 0.3s

#### `overheat` — Heat lockout triggered
- **Character**: Harsh warning buzz
- **Recipe**: Sawtooth wave at 120Hz, gain pulses on/off 3 times over 0.4s
- Gain: 0.12 per pulse
- Total duration: 0.4s

#### `flameLoop` — Flamethrower sustained fire
- **Character**: Crackling roar
- **Recipe**: Brown noise (filtered white noise, lowpass at 600Hz) layered with a quiet sawtooth at 80Hz
- Gain envelope: ramp up over 0.15s to 0.18, sustain while active, ramp down over 0.1s on release
- **Special**: This is a sustained sound, not fire-and-forget. Needs `audio.startLoop('flameLoop')` and `audio.stopLoop('flameLoop')` methods.
- Polyphony: 1 (only one flame at a time)

#### `nuke` — Screen nuke activate
- **Character**: Deep boom with rising overtone
- **Recipe**: Sine wave at 40Hz with gain 0.3, fast attack (0.01s), slow decay (1.2s). Layer a rising sine sweep from 200Hz to 2000Hz over 0.6s at gain 0.08.
- Add white noise burst at 0.15 gain, decaying over 0.3s
- Total duration: 1.2s

### Combat Feedback

#### `enemyHit` — Bullet hits enemy (not kill)
- **Character**: Short metallic ping
- **Recipe**: Triangle wave at 1200Hz, pitch drops to 600Hz over 0.04s
- Gain: 0.08, fade to 0 over 0.05s
- Total duration: 0.05s
- **Polyphony cap: 6**

#### `enemyDeath` — Enemy killed
- **Character**: Crunchy pop
- **Recipe**: White noise burst, gain 0.2, decay over 0.15s. Layer a sine at 300Hz, decay over 0.1s.
- Total duration: 0.15s
- **Polyphony cap: 4**

#### `eliteDeath` — Elite enemy killed
- **Character**: Bigger, deeper version of enemyDeath
- **Recipe**: Same as enemyDeath but add a sub-bass sine at 60Hz with gain 0.15, decay over 0.3s. White noise burst is louder (0.25) and longer (0.25s).
- Total duration: 0.3s

#### `shieldHit` — Bullet absorbed by shield
- **Character**: Glassy clink
- **Recipe**: Sine wave at 2400Hz, rapid decay over 0.06s. Layer a quieter sine at 3600Hz (harmonic), decay over 0.04s.
- Gain: 0.1
- Total duration: 0.06s
- **Polyphony cap: 4**

#### `shieldBreak` — Shield destroyed
- **Character**: Shattering glass
- **Recipe**: White noise through highpass filter at 3000Hz, gain 0.2, decay over 0.2s. Layer descending sine sweep from 3000Hz to 500Hz over 0.15s at gain 0.1.
- Total duration: 0.2s

#### `playerHit` — Player takes damage (life lost)
- **Character**: Heavy impact with alarm quality
- **Recipe**: Sine at 150Hz, gain 0.25, decay over 0.3s. Layer sawtooth at 220Hz pulsing 3 times over 0.4s at gain 0.1.
- Total duration: 0.4s

#### `playerDeath` — Player dies (all lives gone)
- **Character**: Long descending tone, somber
- **Recipe**: Sawtooth at 440Hz, pitch slides down to 80Hz over 1.5s. Gain 0.2, slow decay. Layer white noise at 0.05, decay over 0.8s.
- Total duration: 1.5s

#### `graze` — Near miss graze
- **Character**: Quick bright chime
- **Recipe**: Sine at 1800Hz, gain 0.06, decay over 0.04s
- Total duration: 0.04s
- **Polyphony cap: 3** (grazes can happen rapidly)
- Must be very quiet — this fires often and should not dominate the mix

### Pickups & State Changes

#### `pickupCollect` — Buff pickup collected
- **Character**: Ascending sparkle
- **Recipe**: Sine sweep from 800Hz to 2400Hz over 0.12s. Gain 0.12, fade over 0.15s.
- Total duration: 0.15s

#### `overdriveActivate` — Overdrive mode starts
- **Character**: Power-up surge
- **Recipe**: Sawtooth sweep from 200Hz to 1200Hz over 0.3s at gain 0.15. Layer a sine at 600Hz pulsing at 8Hz for 0.5s at gain 0.08.
- Total duration: 0.5s

#### `overdriveEnd` — Overdrive expires
- **Character**: Power-down descend
- **Recipe**: Sine sweep from 1000Hz to 300Hz over 0.25s. Gain 0.1, fade out.
- Total duration: 0.25s

#### `stageAdvance` — Advanced to next stage
- **Character**: Triumphant two-tone
- **Recipe**: Sine at 523Hz (C5) for 0.1s, then sine at 784Hz (G5) for 0.15s. Each at gain 0.15 with 0.1s decay tail.
- Total duration: 0.35s

#### `chainMilestone` — Chain kill milestone (x5, x10, etc.)
- **Character**: Quick rising arpeggio
- **Recipe**: Three rapid sine tones — 600Hz, 800Hz, 1000Hz — each 0.04s, staggered 0.05s apart. Gain 0.1.
- Total duration: 0.14s

### UI Sounds

#### `menuSelect` — Menu option highlighted
- **Character**: Soft click
- **Recipe**: Sine at 1000Hz, gain 0.08, duration 0.03s
- Total duration: 0.03s

#### `menuConfirm` — Menu option confirmed (Enter)
- **Character**: Firm click
- **Recipe**: Sine at 1200Hz for 0.02s then 1600Hz for 0.02s. Gain 0.1.
- Total duration: 0.04s

### Enemy Sounds

#### `sniperWarning` — Sniper windup begins (targeting laser appears)
- **Character**: Rising tension whine
- **Recipe**: Sine sweep from 400Hz to 1600Hz over 0.45s (matches windup duration). Gain starts at 0.03 and rises to 0.1.
- Total duration: 0.45s
- **Polyphony cap: 3** (max simultaneous sniper windups)

#### `sniperFire` — Sniper shoots
- **Character**: Sharp crack
- **Recipe**: White noise burst, gain 0.18, decay over 0.08s. Layer sine at 500Hz, decay 0.05s.
- Total duration: 0.08s

#### `turretFire` — Turret shoots
- **Character**: Softer version of sniperFire
- **Recipe**: White noise burst, gain 0.1, decay over 0.06s. Layer sine at 700Hz, decay 0.04s.
- Total duration: 0.06s

---

## Music System (Procedural)

Music uses sustained oscillator layers that evolve per stage. This is a PLACEHOLDER system — it will be fully replaced by commissioned tracks later.

### Architecture
- Music is built from 2-3 layered oscillator "voices" playing sustained tones
- Each voice: oscillator → gain → musicGain → master
- Voices change pitch/timbre on stage advance
- Simple rhythmic pulse via gain modulation (not sequencing)

### `title` — Title screen music
- **Character**: Ambient, mysterious, inviting
- **Voices**:
  - Pad: sine at 130Hz (C3), gain 0.04, slow tremolo (0.5Hz LFO on gain, depth ±0.01)
  - Shimmer: triangle at 523Hz (C5), gain 0.015, slow detune wobble (±3 cents at 0.3Hz)
- Keep it quiet and atmospheric. The title screen should feel calm before the storm.

### `gameplay` — In-game music
- **Character**: Pulsing, tense, escalates with stage
- **Voices**:
  - Sub bass: sine at `65 * (1 + stage * 0.05)` Hz, gain 0.05, pulsing at `1.5 + stage * 0.3` Hz via gain LFO
  - Mid tone: triangle at `130 * (1 + stage * 0.08)` Hz, gain 0.025, slight detune wobble
  - High tick: square at `520Hz`, gain 0.008, rhythmic on/off at `2 + stage * 0.4` Hz (like a hi-hat pulse)
- The `stage` variable shifts pitch and pulse rate — so music naturally intensifies without any crossfading logic
- On stage advance: briefly duck music gain by 50% for 0.3s then restore (makes the stage flash feel impactful)

### `death` — Death screen
- **Voices**: Single sine at 174Hz (F3), gain 0.03, slow decay over 3s then sustain at 0.01
- Quiet, somber, doesn't overstay

### `win` — Win screen
- **Voices**: Sine chord — 261Hz (C4) + 329Hz (E4) + 392Hz (G4), each at gain 0.025, slow tremolo
- Bright, resolved, major chord

### Music transitions
- `audio.playMusic('gameplay')` crossfades: current music fades out over 800ms while new music fades in over 800ms
- Music intensity updates happen in the game loop: call `audio.updateMusicIntensity(stage.current)` each frame (or on stage change). This adjusts oscillator frequencies and LFO rates smoothly.

---

## Integration Points (where to add audio.play() calls)

These are the call sites in the game code. The implementation agent should add these calls at the appropriate locations:

| Sound | Where to call | Trigger |
|-------|--------------|---------|
| `audio.init()` | First keydown or mousedown event | User gesture (required for Web Audio) |
| `audio.play('shoot')` | `bullets.update()` | When a bullet is spawned |
| `audio.play('dash')` | `dash` activation code | When dash starts |
| `audio.play('overheat')` | `player.update()` | When heat hits 100 and lockout begins |
| `audio.play('enemyHit')` | `applyDamageToShard()` | When enemy takes damage but doesn't die |
| `audio.play('enemyDeath')` | `destroyShard()` | When non-elite enemy dies |
| `audio.play('eliteDeath')` | `destroyShard()` | When elite enemy dies (check `s.isElite`) |
| `audio.play('shieldHit')` | `applyDamageToShard()` | When shield absorbs damage |
| `audio.play('shieldBreak')` | `applyDamageToShard()` | When shieldHp reaches 0 |
| `audio.play('playerHit')` | `player.hit()` | When player loses a life |
| `audio.play('playerDeath')` | `player.hit()` | When player dies (lives reach 0) |
| `audio.play('graze')` | `graze` detection code | When graze triggers |
| `audio.play('pickupCollect')` | `pickups` collection code | When player collects a pickup |
| `audio.play('overdriveActivate')` | `player.update()` | When overdrive activates |
| `audio.play('overdriveEnd')` | `player.update()` | When overdrive timer expires |
| `audio.play('stageAdvance')` | `stage._advance()` | When stage increments |
| `audio.play('chainMilestone')` | `stage.onKill()` or chain code | When chain hits 5, 10, 15, 20 |
| `audio.play('nuke')` | `screenNuke` activation | When nuke fires |
| `audio.play('sniperWarning')` | `shards.update()` | When `sniperWindup` starts (set to 450) |
| `audio.play('sniperFire')` | `shards.update()` | When sniper fires (windup crosses 0) |
| `audio.play('turretFire')` | Turret fire code | When turret fires |
| `audio.play('menuSelect')` | Title/pause key handlers | When selection changes |
| `audio.play('menuConfirm')` | Title/pause key handlers | When Enter pressed |
| `audio.playMusic('title')` | Title screen entry | When gameState becomes 'title' |
| `audio.playMusic('gameplay')` | Game start | When gameState becomes 'playing' |
| `audio.stopMusic()` | Death/win screen entry | On player death or win |

### Connecting to Pause Menu
The existing pause menu has a SOUND option. Wire it to `audio.toggleMute()`. Display "SOUND: ON" or "SOUND: OFF" based on `audio.isMuted`.

---

## Script Load Order

`audio.js` should load early (after `core.js`, before gameplay scripts) since other scripts will call `audio.play()`:

```html
<script src="js/constants.js"></script>
<script src="js/core.js"></script>
<script src="js/audio.js"></script>  <!-- HERE -->
<script src="js/fx.js"></script>
...
```

---

## Performance Rules

- **Never create AudioContext more than once**
- **Never create gain/oscillator nodes outside of sound playback** (except the persistent master/sfx/music gains and music oscillators)
- **Polyphony limits are enforced** — stealing oldest voice when cap exceeded
- **Procedural sounds auto-cleanup** — use `oscillator.onended` to disconnect nodes. Do not accumulate disconnected nodes.
- **Music oscillators are long-lived** — create once, modulate parameters, don't recreate per stage
- **Silent when muted** — `audio.play()` should early-return if muted. Do not generate and discard sounds.
- **No audio processing when game is paused** — music should continue but SFX calls should be suppressed

---

## Verification

1. Start game — title music plays (quiet ambient pad)
2. Press Enter — `menuConfirm` click sound, music crossfades to gameplay
3. Hold fire — `shoot` sounds play rapidly without stacking into distortion (polyphony cap working)
4. Kill enemies — `enemyHit` pings on damage, `enemyDeath` pops on kill
5. Graze enemies — quiet chime
6. Collect pickup — ascending sparkle
7. Overheat — warning buzz
8. Dash — whoosh
9. Overdrive activates — power-up surge
10. Stage advance — two-tone chime, music intensity shifts
11. Player hit — heavy impact
12. Player death — descending somber tone, music stops
13. Pause → SOUND toggle → confirm it mutes/unmutes all audio
14. Win screen — major chord music
15. Performance: no frame drops from audio, especially during rapid fire
16. Open another browser tab and return — AudioContext resumes correctly

---

## Non-Negotiables
- No audio files — everything procedural
- No ES modules
- `audio.play('name')` API must remain stable — this is the contract for future file-based replacement
- `audio.registerSound()` and `audio.registerMusic()` method signatures must exist (can be no-ops that log "not yet implemented")
- Polyphony caps must be enforced — uncapped rapid-fire sounds will distort and stutter
- Music must not be loud — it's background texture, not the focus. SFX should dominate the mix.
- All gain values in the recipes are starting points — the agent should trust them but can adjust ±30% if something sounds obviously wrong during testing
- Follow the game's OLED aesthetic in spirit: sounds should be crisp, synthetic, and clean — not muddy, realistic, or retro-chiptune
