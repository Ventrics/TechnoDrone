'use strict';

/**
 * Compare two TechnoDrone batch result files.
 *
 * Usage:
 *   node compare.js results/baseline.json results/experiment-A.json
 */

const fs = require('fs');
const path = require('path');

const NUM_STAGES = 10;
const MAJOR_THRESHOLD = 0.15; // 15%

// ---------- stats ----------

function mean(arr) {
  if (!arr.length) return 0;
  let s = 0;
  for (const v of arr) s += v;
  return s / arr.length;
}

function variance(arr) {
  const n = arr.length;
  if (n < 2) return 0;
  const m = mean(arr);
  let s = 0;
  for (const v of arr) s += (v - m) * (v - m);
  return s / (n - 1);
}

// Welch's t-test on two independent samples.
// Returns { t, df, p } (two-tailed p via a simple Student-t CDF approx).
function welchT(a, b) {
  const na = a.length;
  const nb = b.length;
  if (na < 2 || nb < 2) return { t: 0, df: 0, p: 1 };
  const ma = mean(a);
  const mb = mean(b);
  const va = variance(a);
  const vb = variance(b);
  const se = Math.sqrt(va / na + vb / nb);
  if (se === 0) return { t: 0, df: na + nb - 2, p: 1 };
  const t = (ma - mb) / se;
  const num = (va / na + vb / nb) * (va / na + vb / nb);
  const den = (va * va) / (na * na * (na - 1)) + (vb * vb) / (nb * nb * (nb - 1));
  const df = den === 0 ? na + nb - 2 : num / den;
  const p = studentTwoTailP(Math.abs(t), df);
  return { t, df, p };
}

// Log-gamma via Lanczos.
function logGamma(x) {
  const g = 7;
  const c = [
    0.99999999999980993,
    676.5203681218851,
    -1259.1392167224028,
    771.32342877765313,
    -176.61502916214059,
    12.507343278686905,
    -0.13857109526572012,
    9.9843695780195716e-6,
    1.5056327351493116e-7,
  ];
  if (x < 0.5) {
    return Math.log(Math.PI / Math.sin(Math.PI * x)) - logGamma(1 - x);
  }
  x -= 1;
  let a = c[0];
  const tt = x + g + 0.5;
  for (let i = 1; i < g + 2; i++) a += c[i] / (x + i);
  return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(tt) - tt + Math.log(a);
}

// Regularized incomplete beta I_x(a, b), via continued fraction.
function betacf(x, a, b) {
  const MAXIT = 200;
  const EPS = 3e-12;
  const FPMIN = 1e-300;
  const qab = a + b;
  const qap = a + 1;
  const qam = a - 1;
  let c = 1;
  let d = 1 - (qab * x) / qap;
  if (Math.abs(d) < FPMIN) d = FPMIN;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= MAXIT; m++) {
    const m2 = 2 * m;
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    h *= d * c;
    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < EPS) break;
  }
  return h;
}

function incompleteBeta(x, a, b) {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const bt = Math.exp(
    logGamma(a + b) - logGamma(a) - logGamma(b) + a * Math.log(x) + b * Math.log(1 - x)
  );
  if (x < (a + 1) / (a + b + 2)) {
    return (bt * betacf(x, a, b)) / a;
  }
  return 1 - (bt * betacf(1 - x, b, a)) / b;
}

// Two-tailed Student-t p-value for |t| with df degrees of freedom.
function studentTwoTailP(tAbs, df) {
  if (!isFinite(tAbs) || df <= 0) return 1;
  const x = df / (df + tAbs * tAbs);
  // p = I_x(df/2, 1/2)
  return incompleteBeta(x, df / 2, 0.5);
}

// ---------- formatting ----------

function fmtNum(v, digits) {
  if (typeof v !== 'number' || !isFinite(v)) return '-';
  return v.toFixed(digits);
}

function fmtDelta(v, digits) {
  if (typeof v !== 'number' || !isFinite(v)) return '-';
  const s = v.toFixed(digits);
  return v >= 0 ? `+${s}` : s;
}

function fmtPct(frac) {
  if (!isFinite(frac)) return '-';
  const pct = frac * 100;
  const s = Math.abs(pct) >= 10 ? pct.toFixed(0) : pct.toFixed(1);
  return pct >= 0 ? `+${s}%` : `${s}%`;
}

function pad(str, width, alignRight) {
  str = String(str);
  if (str.length >= width) return str;
  const pads = ' '.repeat(width - str.length);
  return alignRight ? pads + str : str + pads;
}

// ---------- row building ----------

function pctDelta(a, b) {
  if (!isFinite(a) || !isFinite(b)) return null;
  if (a === 0) {
    if (b === 0) return 0;
    return null; // undefined relative change from zero baseline
  }
  return (b - a) / Math.abs(a);
}

function classify(metricKind, stage, a, b, delta, pct) {
  // metricKind: 'generic' | 'stageFail' | 'easierBetter' (where lower B is better)
  const major = pct !== null && Math.abs(pct) >= MAJOR_THRESHOLD;
  if (metricKind === 'stageFail') {
    // stage-fail delta: B - A
    if (stage >= 6 && delta < -1e-9) {
      return major ? '(improvement, major)' : '(improvement)';
    }
    if (stage <= 3 && delta > 1e-9) {
      return major
        ? '(regression (easy stages shouldn\'t get harder), major)'
        : '(regression (easy stages shouldn\'t get harder))';
    }
    return major ? '(major)' : '';
  }
  if (metricKind === 'easierBetter') {
    // lower B than A is better (e.g., heat overheats)
    if (delta < 0 && major) return '(improvement, major)';
    if (delta < 0) return '(improvement)';
    if (delta > 0 && major) return '(regression, major)';
    return major ? '(major)' : '';
  }
  // generic: higher is better
  if (delta > 0 && major) return '(improvement, major)';
  if (delta < 0 && major) return '(regression, major)';
  return major ? '(major)' : '';
}

function buildRow(label, a, b, digits, kind, stage) {
  const delta = (isFinite(a) && isFinite(b)) ? b - a : null;
  const pct = delta === null ? null : pctDelta(a, b);
  const note = delta === null ? '' : classify(kind || 'generic', stage || 0, a, b, delta, pct);
  return {
    label,
    a: fmtNum(a, digits),
    b: fmtNum(b, digits),
    delta: delta === null ? '-' : fmtDelta(delta, digits),
    pct: pct === null ? '-' : fmtPct(pct),
    note,
  };
}

// ---------- main ----------

function loadBatch(file) {
  if (!fs.existsSync(file)) {
    throw new Error(`File not found: ${file}`);
  }
  const raw = fs.readFileSync(file, 'utf8');
  const data = JSON.parse(raw);
  if (!data || !data.summary || !Array.isArray(data.runs)) {
    throw new Error(`Not a batch result file: ${file}`);
  }
  return data;
}

function seedRangeLabel(seeds) {
  if (!Array.isArray(seeds) || !seeds.length) return '(none)';
  const lo = Math.min.apply(null, seeds);
  const hi = Math.max.apply(null, seeds);
  if (seeds.length === hi - lo + 1) return `${lo}-${hi}`;
  return `${seeds.length} seeds`;
}

function conditionalStageFailRates(batch) {
  const existing = batch.summary && batch.summary.stageFailRateGivenReached;
  if (Array.isArray(existing) && existing.length) return existing;

  const out = new Array(NUM_STAGES).fill(0);
  const runs = Array.isArray(batch.runs) ? batch.runs : [];
  for (let i = 1; i <= NUM_STAGES; i++) {
    let reachedHere = 0;
    let endedHere = 0;
    for (const r of runs) {
      const reached = typeof r.reachedStage === 'number' && isFinite(r.reachedStage) ? r.reachedStage : 0;
      if (reached >= i) reachedHere++;
      if (!r.completed && reached === i) endedHere++;
    }
    out[i - 1] = reachedHere > 0 ? endedHere / reachedHere : 0;
  }
  return out;
}

function main() {
  const argv = process.argv.slice(2);
  if (argv.length < 2) {
    console.error('Usage: node compare.js <baseline.json> <experiment.json>');
    process.exit(1);
  }
  const fileA = path.resolve(process.cwd(), argv[0]);
  const fileB = path.resolve(process.cwd(), argv[1]);

  const A = loadBatch(fileA);
  const B = loadBatch(fileB);

  const sA = A.summary;
  const sB = B.summary;

  const rows = [];

  rows.push(buildRow('Silent removals (total)', sA.violationsTotal || 0, sB.violationsTotal || 0, 0, 'easierBetter'));
  rows.push(buildRow('Runs with violations', sA.runsWithViolations || 0, sB.runsWithViolations || 0, 0, 'easierBetter'));
  rows.push(buildRow('Completion rate', sA.completionRate, sB.completionRate, 2, 'generic'));
  rows.push(buildRow('Mean reached stage', sA.meanReachedStage, sB.meanReachedStage, 2, 'generic'));
  rows.push(buildRow('Median reached stage', sA.medianReachedStage, sB.medianReachedStage, 2, 'generic'));
  rows.push(buildRow('Mean score', sA.meanScore, sB.meanScore, 0, 'generic'));
  rows.push(buildRow('Median score', sA.medianScore, sB.medianScore, 0, 'generic'));

  const afr = sA.stageFailRate || [];
  const bfr = sB.stageFailRate || [];
  for (let i = 0; i < NUM_STAGES; i++) {
    rows.push(buildRow(`Stage fail rate ${i + 1}`, afr[i] || 0, bfr[i] || 0, 2, 'stageFail', i + 1));
  }

  const acfr = conditionalStageFailRates(A);
  const bcfr = conditionalStageFailRates(B);
  for (let i = 0; i < NUM_STAGES; i++) {
    rows.push(buildRow(`Stage fail rate given reached ${i + 1}`, acfr[i] || 0, bcfr[i] || 0, 2, 'stageFail', i + 1));
  }

  const adur = sA.meanStageDurationMs || [];
  const bdur = sB.meanStageDurationMs || [];
  for (let i = 0; i < NUM_STAGES; i++) {
    rows.push(buildRow(`Mean duration ms stage ${i + 1}`, adur[i] || 0, bdur[i] || 0, 0, 'generic'));
  }

  const ahot = sA.meanHeatOverheatPerStage || [];
  const bhot = sB.meanHeatOverheatPerStage || [];
  for (let i = 0; i < NUM_STAGES; i++) {
    rows.push(buildRow(`Mean heat overheat/stage ${i + 1}`, ahot[i] || 0, bhot[i] || 0, 2, 'easierBetter'));
  }

  const aflow = sA.meanFlowUptimePctPerStage || [];
  const bflow = sB.meanFlowUptimePctPerStage || [];
  for (let i = 0; i < NUM_STAGES; i++) {
    rows.push(buildRow(`Mean flow uptime% stage ${i + 1}`, aflow[i] || 0, bflow[i] || 0, 2, 'generic'));
  }

  const adash = sA.meanDashesPerStage || [];
  const bdash = sB.meanDashesPerStage || [];
  for (let i = 0; i < NUM_STAGES; i++) {
    rows.push(buildRow(`Mean dashes stage ${i + 1}`, adash[i] || 0, bdash[i] || 0, 2, 'generic'));
  }

  const akills = sA.killsByTypeTotal || {};
  const bkills = sB.killsByTypeTotal || {};
  const killKeys = Array.from(new Set([
    ...Object.keys(akills),
    ...Object.keys(bkills),
  ])).sort();
  for (const k of killKeys) {
    rows.push(buildRow(`Kills total: ${k}`, akills[k] || 0, bkills[k] || 0, 0, 'generic'));
  }

  // Welch's t on mean score across runs.
  const aScores = (A.runs || []).map((r) => (typeof r.score === 'number' ? r.score : 0));
  const bScores = (B.runs || []).map((r) => (typeof r.score === 'number' ? r.score : 0));
  const tt = welchT(aScores, bScores);

  // ---------- print ----------

  const labelWidth = Math.max(30, rows.reduce((m, r) => Math.max(m, r.label.length), 0) + 2);
  const colA = 12;
  const colB = 12;
  const colD = 11;
  const colP = 10;

  const aName = path.basename(fileA, path.extname(fileA));
  const bName = path.basename(fileB, path.extname(fileB));

  const lines = [];
  lines.push('TechnoDrone A/B Comparison');
  lines.push(`  A: ${aName} (n=${(A.runs || []).length} seeds, ${seedRangeLabel(A.seeds)})`);
  lines.push(`  B: ${bName} (n=${(B.runs || []).length} seeds, ${seedRangeLabel(B.seeds)})`);
  lines.push('');

  lines.push(
    pad('Metric', labelWidth) +
      pad('A', colA, true) +
      pad('B', colB, true) +
      pad('Delta', colD, true) +
      pad('Delta%', colP, true) +
      '  Note'
  );
  lines.push('-'.repeat(labelWidth + colA + colB + colD + colP + 8));

  for (const r of rows) {
    lines.push(
      pad(r.label, labelWidth) +
        pad(r.a, colA, true) +
        pad(r.b, colB, true) +
        pad(r.delta, colD, true) +
        pad(r.pct, colP, true) +
        '  ' +
        (r.note || '')
    );
  }

  lines.push('');
  const pStr = tt.p < 0.001 ? '< 0.001' : tt.p.toFixed(3);
  const sig = tt.p < 0.05 ? 'significant' : 'not significant';
  lines.push(`Score significance: Welch t=${tt.t.toFixed(2)}, df=${tt.df.toFixed(1)}, p = ${pStr} (${sig})`);

  const aViol = sA.violationsTotal || 0;
  const bViol = sB.violationsTotal || 0;
  if (bViol > aViol) {
    lines.push('');
    lines.push(`!! REGRESSION: silent-removal violations went up (${aViol} → ${bViol}). Inspect runs[].metrics.violations.samples.`);
    const aByStage = sA.violationsByStage || [];
    const bByStage = sB.violationsByStage || [];
    const stageDeltas = [];
    for (let i = 0; i < NUM_STAGES; i++) {
      const da = aByStage[i] || 0;
      const db = bByStage[i] || 0;
      if (db > da) stageDeltas.push(`s${i + 1}: ${da}→${db}`);
    }
    if (stageDeltas.length) lines.push(`   per-stage: ${stageDeltas.join(', ')}`);
  } else if (bViol === 0 && aViol === 0) {
    lines.push(`✓ No silent-removal violations in either batch.`);
  }

  console.log(lines.join('\n'));
}

try {
  main();
} catch (err) {
  console.error('compare.js error:', (err && err.message) || err);
  process.exit(2);
}
