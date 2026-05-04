# TechnoDrone Privacy

This note describes the data handled by TechnoDrone during local play and leaderboard submission.

## Local Storage

TechnoDrone uses browser `localStorage` to remember:

- save data
- run history and high score
- furthest stage reached
- audio settings
- player name / callsign

You can reset this data by clearing site data for the game in your browser settings.

## Leaderboard Data

When a score is submitted, TechnoDrone may send the following to its Supabase-backed leaderboard:

- player name / callsign
- score
- kills
- submission timestamp

The leaderboard is used to fetch, compare, and display scores.

## What The Game Does Not Do

- No in-game account creation
- No ad tracking SDKs in the game code
- No microphone, camera, contacts, or location access
- No intentional collection of sensitive personal data

## Third-Party Services

- Supabase is used for leaderboard storage and retrieval.
- Adobe Fonts / Typekit CSS is loaded from `use.typekit.net`.

## Contact

Add the portfolio contact email or project issue link here before public launch.
