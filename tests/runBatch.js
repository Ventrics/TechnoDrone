'use strict';

/**
 * TechnoDrone headless batch runner.
 *
 * Usage:
 *   node runBatch.js --config baseline --seeds 1-30 --speed 10 --parallel 4 --out results/baseline.json
 *
 * Required: --config, --seeds, --out
 * Optional: --speed (default 10), --parallel (default 4), --timeout (seconds per run, default 120)
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const puppeteer = require('puppeteer');

// ---------- tiny static HTTP server ----------
// Chromium blocks fetch() and most XHR on file:// URLs. Serve the project root
// over localhost to get normal fetch semantics for tests/configs/*.json.

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
};

function startStaticServer(rootDir) {
  const server = http.createServer((req, res) => {
    try {
      const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
      let rel = urlPath === '/' ? '/index.html' : urlPath;
      const abs = path.normalize(path.join(rootDir, rel));
      if (!abs.startsWith(path.normalize(rootDir))) {
        res.writeHead(403); res.end('Forbidden'); return;
      }
      if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) {
        res.writeHead(404); res.end('Not found'); return;
      }
      const ext = path.extname(abs).toLowerCase();
      res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
      fs.createReadStream(abs).pipe(res);
    } catch (err) {
      res.writeHead(500); res.end(String(err));
    }
  });
  return new Promise((resolve, reject) => {
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      resolve({ server, port });
    });
  });
}

const NUM_STAGES = 10;
const ENEMY_TYPES = ['basic', 'elite', 'turret', 'kamikaze', 'shieldDrone', 'formation'];

// ---------- arg parsing ----------

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const key = a.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith('--')) {
      out[key] = true;
    } else {
      out[key] = next;
      i++;
    }
  }
  return out;
}

function parseSeedSpec(spec) {
  // Accepts "1-30" or "1,2,5,8" or "1-5,10,20-22"
  const seeds = [];
  const parts = String(spec).split(',');
  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const m = trimmed.match(/^(\d+)-(\d+)$/);
    if (m) {
      const a = parseInt(m[1], 10);
      const b = parseInt(m[2], 10);
      const lo = Math.min(a, b);
      const hi = Math.max(a, b);
      for (let i = lo; i <= hi; i++) seeds.push(i);
    } else if (/^\d+$/.test(trimmed)) {
      seeds.push(parseInt(trimmed, 10));
    } else {
      throw new Error(`Unrecognized seed token: "${trimmed}"`);
    }
  }
  return seeds;
}

// ---------- stats helpers ----------

function mean(arr) {
  if (!arr.length) return 0;
  let s = 0;
  for (const v of arr) s += v;
  return s / arr.length;
}

function median(arr) {
  if (!arr.length) return 0;
  const sorted = arr.slice().sort((a, b) => a - b);
  const n = sorted.length;
  if (n % 2 === 1) return sorted[(n - 1) >> 1];
  return (sorted[n / 2 - 1] + sorted[n / 2]) / 2;
}

// ---------- parallel queue ----------

async function runWithConcurrency(items, limit, worker) {
  const results = new Array(items.length);
  let cursor = 0;
  let completed = 0;

  async function next() {
    while (true) {
      const i = cursor++;
      if (i >= items.length) return;
      try {
        results[i] = await worker(items[i], i);
      } catch (err) {
        results[i] = { __error: String((err && err.stack) || err) };
      }
      completed++;
    }
  }

  const n = Math.max(1, Math.min(limit, items.length));
  const workers = [];
  for (let i = 0; i < n; i++) workers.push(next());
  await Promise.all(workers);
  return results;
}

// ---------- single run ----------

async function runSeed(browser, url, seed, configName, speed, timeoutMs) {
  const target = `${url}?bot=1&seed=${seed}&config=${encodeURIComponent(configName)}&speed=${speed}`;
  const page = await browser.newPage();
  const result = {
    seed,
    status: 'UNKNOWN',
    completed: false,
    reachedStage: 0,
    score: 0,
    metrics: null,
    error: null,
  };

  try {
    await page.goto(target, { waitUntil: 'domcontentloaded', timeout: timeoutMs });
    await page.waitForFunction(
      () => window.__TD_METRICS_READY__ === true,
      { timeout: timeoutMs, polling: 100 }
    );
    const metrics = await page.evaluate(() => {
      try {
        return JSON.parse(JSON.stringify(window.__TD_METRICS__ || {}));
      } catch (e) {
        return null;
      }
    });
    result.metrics = metrics || {};
    result.status = 'OK';
    result.completed = !!(metrics && metrics.completed);
    result.reachedStage = (metrics && typeof metrics.reachedStage === 'number') ? metrics.reachedStage : 0;
    const scoreField = metrics && (metrics.finalScore != null ? metrics.finalScore : metrics.score);
    result.score = typeof scoreField === 'number' ? scoreField : 0;
  } catch (err) {
    const msg = String((err && err.message) || err);
    if (/timeout|Waiting failed/i.test(msg)) {
      result.status = 'TIMEOUT';
    } else {
      result.status = 'FAIL';
    }
    result.error = msg;
    // Attempt best-effort metrics grab on timeout / failure.
    try {
      const metrics = await page.evaluate(() => {
        try {
          return window.__TD_METRICS__ ? JSON.parse(JSON.stringify(window.__TD_METRICS__)) : null;
        } catch (e) {
          return null;
        }
      });
      if (metrics) {
        result.metrics = metrics;
        if (typeof metrics.reachedStage === 'number') result.reachedStage = metrics.reachedStage;
        const s = metrics.finalScore != null ? metrics.finalScore : metrics.score;
        if (typeof s === 'number') result.score = s;
      }
    } catch (_) {
      // ignore
    }
  } finally {
    try { await page.close(); } catch (_) { /* ignore */ }
  }

  return result;
}

// ---------- summary ----------

function buildSummary(runs) {
  const n = runs.length;
  const safe = (v, d) => (typeof v === 'number' && isFinite(v) ? v : d);

  const reachedStages = runs.map((r) => safe(r.reachedStage, 0));
  const scores = runs.map((r) => safe(r.score, 0));
  const completions = runs.filter((r) => r.completed).length;

  // Compatibility field: absolute fraction of all seeds that ended on stage N.
  const stageFailRate = new Array(NUM_STAGES).fill(0);
  // Conditional field: failures on stage N divided by runs that reached stage N.
  const stageFailRateGivenReached = new Array(NUM_STAGES).fill(0);
  for (let i = 1; i <= NUM_STAGES; i++) {
    let endedHere = 0;
    let reachedHere = 0;
    for (const r of runs) {
      const reachedStage = safe(r.reachedStage, 0);
      if (!r.completed && reachedStage === i) endedHere++;
      if (reachedStage >= i) reachedHere++;
    }
    stageFailRate[i - 1] = n > 0 ? endedHere / n : 0;
    stageFailRateGivenReached[i - 1] = reachedHere > 0 ? endedHere / reachedHere : 0;
  }

  // Per-stage aggregated metrics from run.metrics.stages (if present).
  const stageDurations = []; // [stage][value, ...]
  const heatOverheats = [];
  const flowUptimes = [];
  const dashes = [];
  for (let i = 0; i < NUM_STAGES; i++) {
    stageDurations.push([]);
    heatOverheats.push([]);
    flowUptimes.push([]);
    dashes.push([]);
  }

  const killsByTypeTotal = {};
  for (const t of ENEMY_TYPES) killsByTypeTotal[t] = 0;

  for (const r of runs) {
    const m = r.metrics || {};
    // Agent 3 schema: perStage[] with stage, durationMs, heatOverheatCount,
    // flowStateUptimeMs, dashCount. Fall back to legacy field names if present.
    const stages = Array.isArray(m.perStage) ? m.perStage : (Array.isArray(m.stages) ? m.stages : []);
    for (let i = 0; i < NUM_STAGES; i++) {
      const s = stages[i];
      if (!s) continue;
      if (typeof s.durationMs === 'number' && isFinite(s.durationMs)) stageDurations[i].push(s.durationMs);
      const heatOH = (typeof s.heatOverheatCount === 'number') ? s.heatOverheatCount : s.heatOverheat;
      if (typeof heatOH === 'number' && isFinite(heatOH)) heatOverheats[i].push(heatOH);
      const flowMs = (typeof s.flowStateUptimeMs === 'number') ? s.flowStateUptimeMs : null;
      const flowPct = (flowMs != null && typeof s.durationMs === 'number' && s.durationMs > 0)
        ? flowMs / s.durationMs
        : (typeof s.flowUptimePct === 'number' ? s.flowUptimePct : null);
      if (flowPct != null && isFinite(flowPct)) flowUptimes[i].push(flowPct);
      const dashN = (typeof s.dashCount === 'number') ? s.dashCount : s.dashes;
      if (typeof dashN === 'number' && isFinite(dashN)) dashes[i].push(dashN);
    }

    // Kills can be in m.killsByType (overall) or distributed in perStage[].killsByType.
    const globalKills = m.killsByType || {};
    let haveGlobal = false;
    for (const t of ENEMY_TYPES) {
      if (typeof globalKills[t] === 'number') {
        killsByTypeTotal[t] += globalKills[t];
        haveGlobal = true;
      }
    }
    if (!haveGlobal) {
      for (const s of stages) {
        const k = (s && s.killsByType) || {};
        for (const t of ENEMY_TYPES) {
          if (typeof k[t] === 'number') killsByTypeTotal[t] += k[t];
        }
      }
    }
  }

  // Violation aggregation across runs (silent removal detector).
  let violationsTotal = 0;
  let runsWithViolations = 0;
  const violationsByEntityType = {};
  const violationsByStage = new Array(NUM_STAGES).fill(0);
  for (const r of runs) {
    const v = r.metrics && r.metrics.violations;
    if (!v || typeof v.total !== 'number') continue;
    if (v.total > 0) runsWithViolations++;
    violationsTotal += v.total;
    if (v.byEntityType) {
      for (const k of Object.keys(v.byEntityType)) {
        violationsByEntityType[k] = (violationsByEntityType[k] || 0) + (v.byEntityType[k] || 0);
      }
    }
    if (v.byStage) {
      for (const k of Object.keys(v.byStage)) {
        const idx = parseInt(k, 10) - 1;
        if (idx >= 0 && idx < NUM_STAGES) violationsByStage[idx] += v.byStage[k] || 0;
      }
    }
  }

  return {
    completionRate: n > 0 ? completions / n : 0,
    meanReachedStage: mean(reachedStages),
    medianReachedStage: median(reachedStages),
    meanScore: mean(scores),
    medianScore: median(scores),
    stageFailRate,
    stageFailRateGivenReached,
    meanStageDurationMs: stageDurations.map((a) => mean(a)),
    meanHeatOverheatPerStage: heatOverheats.map((a) => mean(a)),
    meanFlowUptimePctPerStage: flowUptimes.map((a) => mean(a)),
    meanDashesPerStage: dashes.map((a) => mean(a)),
    killsByTypeTotal,
    violationsTotal,
    runsWithViolations,
    violationsByEntityType,
    violationsByStage,
  };
}

// ---------- main ----------

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const missing = [];
  if (!args.config) missing.push('--config');
  if (!args.seeds) missing.push('--seeds');
  if (!args.out) missing.push('--out');
  if (missing.length) {
    console.error(`Missing required args: ${missing.join(', ')}`);
    console.error('Usage: node runBatch.js --config <name> --seeds 1-30 --out results/<file>.json [--speed 10] [--parallel 4] [--timeout 120]');
    process.exit(1);
  }

  const configName = String(args.config);
  const seeds = parseSeedSpec(args.seeds);
  const speed = args.speed !== undefined ? parseInt(args.speed, 10) : 10;
  const parallel = args.parallel !== undefined ? parseInt(args.parallel, 10) : 4;
  const timeoutSec = args.timeout !== undefined ? parseInt(args.timeout, 10) : 120;
  const timeoutMs = Math.max(1, timeoutSec) * 1000;
  const outArg = String(args.out);

  if (!seeds.length) {
    console.error('Seed list is empty.');
    process.exit(1);
  }

  const projectRoot = path.resolve(__dirname, '..');
  const indexPath = path.join(projectRoot, 'index.html');
  if (!fs.existsSync(indexPath)) {
    console.error(`Cannot find index.html at ${indexPath}`);
    process.exit(1);
  }

  const { server, port } = await startStaticServer(projectRoot);
  const url = `http://127.0.0.1:${port}/index.html`;

  // Resolve output path relative to tests/ (cwd of this script).
  const outPath = path.isAbsolute(outArg) ? outArg : path.resolve(__dirname, outArg);
  const outDir = path.dirname(outPath);
  fs.mkdirSync(outDir, { recursive: true });

  console.log(`TechnoDrone batch: config=${configName} seeds=${seeds.length} parallel=${parallel} speed=${speed} timeout=${timeoutSec}s`);
  console.log(`URL: ${url}`);
  console.log(`Out: ${outPath}`);

  const startedAt = new Date();
  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--allow-file-access-from-files',
      '--no-sandbox',
      '--disable-web-security',
    ],
  });

  let completedCount = 0;
  const total = seeds.length;

  let runs;
  try {
    runs = await runWithConcurrency(seeds, parallel, async (seed) => {
      let r;
      try {
        r = await runSeed(browser, url, seed, configName, speed, timeoutMs);
      } catch (err) {
        r = {
          seed,
          status: 'FAIL',
          completed: false,
          reachedStage: 0,
          score: 0,
          metrics: null,
          error: String((err && err.stack) || err),
        };
      }
      completedCount++;
      const tag = r.status === 'OK' ? 'OK' : r.status === 'TIMEOUT' ? 'TIMEOUT' : 'FAIL';
      console.log(
        `[${completedCount}/${total}] seed=${r.seed} reached=${r.reachedStage} score=${r.score} ${tag}` +
        (r.completed ? ' WIN' : '')
      );
      return r;
    });
  } finally {
    try { await browser.close(); } catch (_) { /* ignore */ }
    try { server.close(); } catch (_) { /* ignore */ }
  }

  // Sort runs by seed for stable output.
  runs.sort((a, b) => (a.seed || 0) - (b.seed || 0));

  const finishedAt = new Date();
  const elapsedMs = finishedAt.getTime() - startedAt.getTime();

  const summary = buildSummary(runs);

  const payload = {
    config: configName,
    seeds,
    parallel,
    speed,
    timeoutSec,
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    elapsedMs,
    runs,
    summary,
  };

  fs.writeFileSync(outPath, JSON.stringify(payload, null, 2), 'utf8');

  console.log('');
  console.log(`Done in ${(elapsedMs / 1000).toFixed(1)}s. Wrote ${outPath}`);
  console.log(`Completion rate: ${(summary.completionRate * 100).toFixed(1)}%   mean reached stage: ${summary.meanReachedStage.toFixed(2)}   mean score: ${summary.meanScore.toFixed(0)}`);
  if (summary.violationsTotal > 0) {
    console.log(`⚠ Silent removals: ${summary.violationsTotal} across ${summary.runsWithViolations}/${runs.length} runs`);
    const byType = Object.entries(summary.violationsByEntityType).sort((a, b) => b[1] - a[1]).slice(0, 5);
    if (byType.length) console.log(`  top entity types: ${byType.map(([k, v]) => `${k}=${v}`).join(', ')}`);
    const byStage = summary.violationsByStage.map((v, i) => v > 0 ? `s${i + 1}=${v}` : null).filter(Boolean);
    if (byStage.length) console.log(`  per-stage: ${byStage.join(', ')}`);
  } else {
    console.log(`✓ No silent-removal violations detected`);
  }
}

main().catch((err) => {
  console.error('Batch runner crashed:', err);
  process.exit(2);
});
