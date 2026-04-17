# TechnoDrone QA Checklist

> Run this before pushing gameplay, UI, menu, score, or persistence changes.
> Primary goal: protect feel, state flow, and save correctness.

## What This Pass Is Called
- End-to-end state-flow regression pass
- Gameplay feel regression pass
- Save/persistence regression pass

## Quick Prompt
Use this prompt when asking an agent to verify a build:

`Run an end-to-end state-flow regression pass on TechnoDrone. Focus on gameplay feel, menu/state transitions, high-score and save persistence, and anything that could break the player experience before a push.`

## Feel Baseline
- Treat current gameplay feel as protected.
- If the game feels softer, slower, mushier, less precise, or less trustworthy, treat that as a regression.
- Responsiveness and honest hit detection outrank atmosphere and presentation upgrades.
- Rotated enemies must feel fair to shoot.
- Bullet collisions must match the visible shot path.

## Core Flow Checks
- Launch to title screen works correctly.
- Title menu selection and input feel correct with keyboard and mouse.
- `START RUN` begins a normal run.
- `TUTORIAL` starts and completes correctly.
- `LEADERBOARD` opens and returns correctly.
- Pause menu opens, updates, and returns correctly.
- Death flow reaches the expected end screen.
- Win flow reaches the expected mission complete screen.
- Returning to the main menu from death and win works correctly.
- Starting a second run after death or win resets gameplay state correctly.

## Save And Persistence Checks
- New best score updates on the title screen after a win.
- New best score updates on the title screen after a death.
- Run history saves correctly.
- Leaderboard submission flow still works when a player name exists.
- Name-entry flow still works when a player name does not exist.
- Furthest-stage progress saves correctly if touched by the change.
- Audio settings persist correctly if touched by the change.

## Gameplay Feel Checks
- Movement still feels responsive.
- Dash still feels responsive and useful.
- Primary fire still feels crisp.
- Bullets do not visually pass through rotated enemies.
- Hits feel honest on enemy edges.
- Flow State still feels rewarding and readable.
- Heat and overheat behavior still feel intentional.
- Nothing added to the playfield makes combat feel slower unless explicitly requested.

## Visual Safety Checks
- Combat readability stays clear during active gameplay.
- No added atmosphere or overlays should muddy the playfield.
- Canvas glow language remains intact unless a change explicitly targets rendering architecture.
- Title, pause, death, win, and HUD still read clearly after the change.

## Push Gate
Do not push as-is if any of these are true:
- A new score or progression value appears on one screen but not another.
- A hit looks wrong even once in normal play.
- Menu flow works only in one input mode.
- A visual idea improves style but hurts feel.
- A change introduces uncertainty about save behavior.

## Recommended Pre-Push Ask
- Ask for an end-to-end state-flow regression pass.
- Ask for a gameplay feel regression pass.
- Ask for a save/persistence regression pass.
- Ask for findings first, with file references for anything suspicious.
