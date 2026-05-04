# TechnoDrone Playtest Harness

Headless batch runner for TechnoDrone. It drives the in-page bot via Puppeteer,
collects `window.__TD_METRICS__` across many seeds, and produces JSON plus A/B
comparison reports.

## Install

Node 18+.

```bash
cd tests
npm install
```

## Run a batch

```bash
node runBatch.js --config baseline --seeds 1-30 --speed 10 --parallel 4 --out results/baseline.json
```

Required:
- `--config <name>` - loads `tests/configs/<name>.json`.
- `--seeds <spec>` - `1-30`, `1,2,5`, or mixed (`1-5,10,20-22`).
- `--out <path>` - output JSON path relative to `tests/`.

Optional:
- `--speed <n>` (default `10`) - simulation speed multiplier.
- `--parallel <n>` (default `4`) - concurrent tabs.
- `--timeout <sec>` (default `120`) - per-run timeout.

Progress lines look like `[12/30] seed=12 reached=5 score=3400 OK`.

## Compare two batches

```bash
node compare.js results/baseline.json results/stage7-easier.json
```

Prints a plain-text table, flags any metric with `|delta%| >= 15%` as `major`,
shows both absolute and conditional stage fail rates, and runs a Welch's t-test
on mean score. Conditional stage fail rate means failures on stage N divided by
runs that reached stage N.

## Configs

Drop `tests/configs/<name>.json`. The in-page harness reads it when the URL
includes `?config=<name>`. Example shape:

```json
{
  "name": "stage4-relief",
  "description": "Conservative first pass for the stage 4 difficulty spike.",
  "stageConfig": [
    {
      "stage": 4,
      "maxEnemies": 18,
      "spawnInterval": 340
    }
  ],
  "player": {},
  "dash": {},
  "flowState": {}
}
```

Included first-pass configs:
- `baseline` - no overrides.
- `stage4-relief` - eases the stage 4 spike with small spawn/cap/special-timing changes.
- `stage5-density` - reduces sustained stage 5 crowding without changing mechanics.
- `flow-pressure-relief` - tests survivability through heat, dash, and flow relief while keeping enemy density unchanged.

## Output shape

`runBatch.js` writes `{ config, seeds, parallel, speed, startedAt, finishedAt,
elapsedMs, runs, summary }` where `runs[i]` is the full per-seed
`__TD_METRICS__` plus `{ status, completed, reachedStage, score }`.

`summary` includes completion rate, mean/median reached stage and score,
per-stage fail rates, conditional per-stage fail rates for runs that reached
each stage, per-stage mean durations, heat overheats, flow uptime, dashes, and
total kills by type.

`summary.stageFailRate` is the absolute share of all seeds that ended on each
stage. `summary.stageFailRateGivenReached` is the failure share among runs that
reached that stage.

## Assumptions About The In-Page Contract

- `window.__TD_METRICS_READY__ === true` signals the run is done.
- `window.__TD_METRICS__` contains at least `{ completed, reachedStage, score, stages[], killsByType }`.
- Missing fields are tolerated: the summary falls back to `0` or empty per-stage values.
