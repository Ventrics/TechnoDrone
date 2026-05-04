# Mobile QA Checklist

Use this once implementation starts.

## Viewports

Test at minimum:

- 360x740 portrait
- 390x844 portrait
- 414x896 portrait
- 844x390 landscape
- 932x430 landscape
- Desktop 1440x900

## Browsers And Devices

Required:

- iPhone Safari
- Android Chrome
- Desktop Chrome

Nice to have:

- iPad Safari
- Android Firefox
- Desktop Edge

## Startup

- Game loads without horizontal scrolling.
- Canvas fills the intended viewport.
- No browser zoom from double tap.
- Audio starts only after user interaction.
- Title screen buttons are tappable.
- Tutorial starts for first-time user.
- Start Run works after tutorial completion.

## Gameplay

- Player remains visible.
- Full arena is visible.
- Move left/right works from touch.
- Fire works from touch.
- Heat increases while firing.
- Heat cools when fire is released.
- Overheat is readable.
- Dash works while moving.
- Dash cooldown is visible.
- Laser/alt-fire works when available.
- Base Drop works when available.
- Pause button works.
- Resume works.
- Home works from pause.
- Input resets on browser background/foreground.
- Input resets on orientation change.

## Tutorial

- Tutorial copy uses mobile terms.
- Move step can be completed by touch.
- Shoot step can be completed by touch.
- Heat step can be completed by touch.
- Dash step can be completed by touch.
- Flow State step can be completed by touch.
- Laser step can be completed by touch.
- Base Drop step can be completed by touch.
- Skip affordance works without keyboard.

## HUD

- Score readable.
- Stage readable.
- Timer readable.
- Heat readable.
- Flow readable.
- Lives readable.
- Alt-fire state readable.
- Base Drop state readable.
- Controls do not block critical threats.

## Menus

- Title actions are tappable.
- Pause rows are tappable.
- Music volume can be changed.
- SFX can be toggled.
- Leaderboard can be opened and closed.
- Death screen restart works.
- Death screen main menu works.
- Win screen play again works.
- Win screen main menu works.

## Leaderboard And Name Entry

- Phone keyboard appears on name entry.
- Callsign can be typed.
- Callsign can be deleted.
- Invalid callsign rejection still works.
- Confirm submits when online.
- Failure state is readable when offline.
- Leaderboard list fits narrow screens.
- Back/return action works without keyboard.

## Performance

- Title screen remains smooth.
- Gameplay remains smooth through stage 3.
- Gameplay remains playable through stages 8-10.
- Flow State does not cause severe frame drops.
- Base Drop does not freeze the game.
- Long run does not leak obvious memory.
- Repeated restart does not degrade performance.

## Local Mobile Testing Notes

The current server defaults to `127.0.0.1`, which is not reachable from another device.

For phone testing later, run the server bound to all interfaces:

```powershell
$env:HOST='0.0.0.0'; npm run start
```

Then open the computer's LAN IP from the phone:

```text
http://<computer-lan-ip>:4173
```

Before public sharing, replace any portfolio links that point to `http://127.0.0.1:4173/`.

