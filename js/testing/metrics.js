// js/testing/metrics.js — per-run metrics collector for headless bot playtests.
(function () {
  if (window.__TD_BOT_MODE__ !== true) return;
  if (!window.__TD_CLOCK__) {
    console.warn('[metrics] __TD_CLOCK__ missing — metrics disabled');
    return;
  }

  var params = new URLSearchParams(location.search);
  var seedParam = parseInt(params.get('seed'), 10);
  var configName = params.get('config') || 'baseline';

  window.__TD_METRICS_READY__ = false;
  window.__TD_METRICS__ = null;

  // ─── Mutable accumulator ────────────────────────────────────────────────
  var state = {
    seed: isFinite(seedParam) ? seedParam : null,
    configName: configName,
    startedAt: null,
    finalized: false,

    // Per-run totals
    reachedStage: 1,
    deathStage: null,
    totalDurationMs: 0,
    totalKills: 0,
    killsByType: newKillBuckets(),
    finalScore: 0,
    scorePerStage: [],
    perStage: [],

    // Per-stage running aggregates
    curStageIdx: 0,           // 0-based == stage.current - 1
    curStage: newStageBucket(1),
    stageScoreAtStart: 0,

    // Heat / flow / dash tracking
    heatSum: 0,
    heatSamples: 0,
    prevHeatOver: false,       // previous-frame overheat-state
    flowStateWasActive: false,
    dashWasActive: false,
    dashLastActive: false,

    // Death tracking
    prevLives: null,
    prevDead: false,

    // Per-hit diagnostic log (captured by player.hit() monkey-patch)
    hitLog: [],

    // Game state / stage transition tracking
    prevGameState: null,
    prevStageCurrent: 1,
  };

  function newKillBuckets() {
    return {
      basic: 0,
      elite: 0,
      turret: 0,
      kamikaze: 0,
      shieldDrone: 0,
      formation: 0,
    };
  }

  function newStageBucket(stageNum) {
    return {
      stage: stageNum,
      durationMs: 0,
      kills: 0,
      killsByType: newKillBuckets(),
      scoreGained: 0,
      heatSum: 0,
      heatSamples: 0,
      heatAvg: 0,
      heatOverheatCount: 0,
      flowStateUptimeMs: 0,
      flowStateActivations: 0,
      dashCount: 0,
      dashOffensiveCount: 0,
      dashDefensiveCount: 0,
      deaths: 0,
      completed: false,
    };
  }

  // ─── Monkey-patch stage.onKill for authoritative kill-type logging ──────
  // stage.onKill(enemy, fromNuke) is the single funnel for scored kills.
  // We wrap it so we observe (a) the enemy object at the moment of kill and
  // (b) the score awarded. This is the cleanest seam — game logic unchanged.
  // Snapshot world state at the moment of a hit. We inspect drone pos, nearest
  // enemy (by distance), nearest bullet on collision course, heat, dash state.
  function snapshotHitCause() {
    try {
      var px = (typeof drone !== 'undefined' && drone && drone.x) || 0;
      var py = (typeof drone !== 'undefined' && drone && drone.y) || 0;
      var near = null, nearD = Infinity;
      if (typeof shards !== 'undefined' && shards && shards.pool) {
        for (var i = 0; i < shards.pool.length; i++) {
          var s = shards.pool[i];
          if (!s || s.isBonusRing || s.isGatePiece) continue;
          var dx = s.x - px, dy = s.y - py;
          var d = Math.hypot(dx, dy);
          if (d < nearD) { nearD = d; near = s; }
        }
      }
      var bulNear = null, bulD = Infinity;
      if (typeof enemyBullets !== 'undefined' && enemyBullets && enemyBullets.pool) {
        for (var j = 0; j < enemyBullets.pool.length; j++) {
          var b = enemyBullets.pool[j];
          var bd = Math.hypot(b.x - px, b.y - py);
          if (bd < bulD) { bulD = bd; bulNear = b; }
        }
      }
      var typeOf = function (e) {
        if (!e) return null;
        if (e.isTurret) return 'turret';
        if (e.isShieldDrone) return 'shieldDrone';
        if (e.isKamikaze) return 'kamikaze';
        if (e.formationDelayActive || (typeof e.formationDelay === 'number' && e.formationDelay !== 0)) return 'formation';
        if (e.isElite) return 'elite';
        if (e.isGateBlocker) return 'gateBlocker';
        return 'basic';
      };
      // Cause heuristic: whichever was "closer" to a damaging contact.
      // Player hit radius is 14, enemy body ~size*0.75 or *2.5, bullet hitR ~8.
      var enemyContact = near ? (nearD - (near.size * (near.isTurret ? 2.5 : 0.75)) - 14) : 999;
      var bulletContact = bulNear ? (bulD - (bulNear.hitRadius || 8) - 14) : 999;
      var cause = (bulletContact < enemyContact) ? 'bullet' : 'enemy';
      return {
        stage: (typeof stage !== 'undefined' && stage && stage.current) || 0,
        cause: cause,
        nearestEnemyType: near ? typeOf(near) : null,
        nearestEnemyDist: near ? Math.round(nearD) : null,
        nearestEnemyVy: near ? Math.round(near.vy || 0) : null,
        nearestBulletDist: bulNear ? Math.round(bulD) : null,
        nearestBulletIsTurret: bulNear ? !!bulNear.isTurret : null,
        px: Math.round(px),
        py: Math.round(py),
        heat: (typeof player !== 'undefined' && player && player.heat) || 0,
        overheated: !!(typeof player !== 'undefined' && player && player.overheated),
        dashReady: !!(typeof dash !== 'undefined' && dash && dash.cooldown <= 0 && dash.duration <= 0),
        flowStateActive: !!(typeof player !== 'undefined' && player && player.flowStateActive),
        livesBefore: (typeof player !== 'undefined' && player && player.lives) || 0,
        simTimeMs: Math.round((window.__TD_CLOCK__ && window.__TD_CLOCK__.getSimTimeMs && window.__TD_CLOCK__.getSimTimeMs()) || 0),
      };
    } catch (e) { return { error: String(e) }; }
  }

  var hitPatchInstalled = false;
  function installHitPatch() {
    if (hitPatchInstalled) return;
    if (typeof player === 'undefined' || typeof player.hit !== 'function') return;
    var origHit = player.hit.bind(player);
    player.hit = function () {
      // Only record hits that actually damage — hit() no-ops while invincible.
      if (!player.dead && (!player.invincibleTimer || player.invincibleTimer <= 0)) {
        try { state.hitLog.push(snapshotHitCause()); } catch (e) {}
      }
      return origHit.apply(player, arguments);
    };
    hitPatchInstalled = true;
    console.log('[metrics] hit patch installed');
  }

  var killPatchInstalled = false;
  function installKillPatch() {
    if (killPatchInstalled) return;
    if (typeof stage === 'undefined' || typeof stage.onKill !== 'function') {
      console.warn('[metrics] stage.onKill not found at hook time; will retry via onBeforeFirstFrame');
      return;
    }
    var origOnKill = stage.onKill.bind(stage);
    stage.onKill = function (enemy, fromNuke) {
      var award = origOnKill(enemy, fromNuke);
      try { recordKill(enemy); } catch (e) { console.error('[metrics] recordKill error', e); }
      return award;
    };
    killPatchInstalled = true;
    console.log('[metrics] kill patch installed');
  }

  function classifyEnemy(e) {
    if (!e || typeof e !== 'object') return 'basic';
    if (e.isBonusRing || e.isGatePiece) return null;   // not a real kill
    if (e.isTurret)      return 'turret';
    if (e.isShieldDrone) return 'shieldDrone';
    if (e.isKamikaze)    return 'kamikaze';
    // Formation enemies are regular shards that spawned with a formation delay.
    // formationDelayActive is true at spawn and set false when they arrive;
    // either presence (delay>0 ever) or the active flag signals formation origin.
    if (e.formationDelayActive || (typeof e.formationDelay === 'number' && e.formationDelay !== 0)) {
      return 'formation';
    }
    if (e.isElite) return 'elite';
    return 'basic';
  }

  function recordKill(enemy) {
    var type = classifyEnemy(enemy);
    if (!type) return; // bonus rings etc.
    state.totalKills++;
    state.killsByType[type] = (state.killsByType[type] || 0) + 1;
    state.curStage.kills++;
    state.curStage.killsByType[type] = (state.curStage.killsByType[type] || 0) + 1;
  }

  // ─── Per-frame accumulation ─────────────────────────────────────────────
  var STEP_MS = (window.__TD_CLOCK__ && window.__TD_CLOCK__.STEP_MS) || (1000 / 60);

  function heatCap() {
    // Per instructions: overheat threshold is HEAT_PER_SHOT * 20
    var hps = (typeof player !== 'undefined' && player.HEAT_PER_SHOT) || 4;
    return hps * 20;
  }

  function onAfterFrame() {
    if (state.finalized) return;
    if (typeof gameState === 'undefined' || typeof player === 'undefined' || typeof stage === 'undefined') return;

    // Only accumulate while the run is "live" gameplay. Skip title/tutorial/
    // nameEntry/win/leaderboard so stage buckets reflect real gameplay time only.
    var gs = gameState;
    var live = (gs === 'playing' || gs === 'finale');

    // ── Stage transition (any time stage.current changes) ──
    if (stage.current !== state.prevStageCurrent) {
      finalizeCurrentStageBucket(/*completed=*/true);
      rollNewStageBucket(stage.current);
      state.prevStageCurrent = stage.current;
    }

    if (stage.current > state.reachedStage) state.reachedStage = stage.current;

    if (live) {
      // Duration
      state.curStage.durationMs += STEP_MS;
      state.totalDurationMs += STEP_MS;

      // Heat
      var h = player.heat || 0;
      state.curStage.heatSum += h;
      state.curStage.heatSamples++;
      state.heatSum += h;
      state.heatSamples++;
      var cap = heatCap();
      var isOver = h >= cap;
      if (isOver && !state.prevHeatOver) {
        state.curStage.heatOverheatCount++;
      }
      state.prevHeatOver = isOver;

      // Flow state
      var flowActive = !!player.flowStateActive;
      if (flowActive) state.curStage.flowStateUptimeMs += STEP_MS;
      if (flowActive && !state.flowStateWasActive) state.curStage.flowStateActivations++;
      state.flowStateWasActive = flowActive;

      // Dash: detect rising edge of dash.duration > 0 (dash becoming active)
      var dashActive = (typeof dash !== 'undefined') && dash.duration > 0;
      if (dashActive && !state.dashLastActive) {
        state.curStage.dashCount++;
        // Categorize: offensive if heat was high (>80% cap) at dash start
        if (h > cap * 0.8) {
          state.curStage.dashOffensiveCount++;
        } else {
          state.curStage.dashDefensiveCount++;
        }
      }
      state.dashLastActive = dashActive;

      // Score per stage = player.score - snapshot at stage start
      state.curStage.scoreGained = (player.score || 0) - state.stageScoreAtStart;
    }

    // ── Death detection ──
    // player.dead goes true when lives hit 0 (see player.js:1009)
    if (player.dead && !state.prevDead) {
      state.curStage.deaths++;
      state.deathStage = stage.current;
    }
    state.prevDead = !!player.dead;
    state.prevLives = player.lives;

    // ── End-of-run detection ──
    //   win: gameState === 'win'
    //   gameOver: player.dead (lives==0 is the real terminal). We finalize on
    //   first frame we see either condition.
    if (!state.finalized) {
      if (gs === 'win' || player.dead) {
        finalizeRun(gs === 'win');
      }
    }

    state.prevGameState = gs;
  }

  function rollNewStageBucket(stageNum) {
    state.curStage = newStageBucket(stageNum);
    state.curStageIdx = stageNum - 1;
    state.stageScoreAtStart = (typeof player !== 'undefined' ? player.score : 0) || 0;
  }

  function finalizeCurrentStageBucket(completed) {
    var b = state.curStage;
    if (b.heatSamples > 0) b.heatAvg = b.heatSum / b.heatSamples;
    else b.heatAvg = 0;
    delete b.heatSum;
    delete b.heatSamples;
    b.completed = !!completed;
    state.perStage.push(b);
    state.scorePerStage.push(b.scoreGained);
  }

  function finalizeRun(completed) {
    if (state.finalized) return;
    state.finalized = true;

    // Close out the current stage bucket
    finalizeCurrentStageBucket(completed && state.curStage.stage === 10);

    state.finalScore = (typeof player !== 'undefined' ? player.score : 0) || 0;

    var violations = (window.__TD_LEDGER__ && typeof window.__TD_LEDGER__.snapshot === 'function')
      ? window.__TD_LEDGER__.snapshot()
      : { total: 0, byEntityType: {}, byStage: {}, byReason: {}, samples: [] };

    var out = {
      seed: state.seed,
      configName: state.configName,
      completed: !!completed,
      reachedStage: state.reachedStage,
      deathStage: state.deathStage,
      totalDurationMs: state.totalDurationMs,
      totalKills: state.totalKills,
      killsByType: state.killsByType,
      finalScore: state.finalScore,
      scorePerStage: state.scorePerStage.slice(),
      perStage: state.perStage.map(function (b) { return JSON.parse(JSON.stringify(b)); }),
      hitLog: state.hitLog.slice(),
      violations: violations,
      timestamp: new Date().toISOString(),
    };

    window.__TD_METRICS__ = out;
    window.__TD_METRICS_READY__ = true;
    try { console.log('[metrics] run finalized:', out); } catch (e) {}
  }

  // ─── Init (before first frame) ──────────────────────────────────────────
  window.__TD_CLOCK__.onBeforeFirstFrame(function () {
    installKillPatch();
    installHitPatch();
    // Seed initial stage bucket now that `stage` exists.
    if (typeof stage !== 'undefined') {
      state.prevStageCurrent = stage.current || 1;
      state.curStage = newStageBucket(state.prevStageCurrent);
      state.reachedStage = state.prevStageCurrent;
    }
    if (typeof player !== 'undefined') {
      state.stageScoreAtStart = player.score || 0;
      state.prevLives = player.lives;
    }
    state.startedAt = Date.now();
  });

  window.__TD_CLOCK__.onAfterFrame(onAfterFrame);

  // Expose for debugging / Agent-4 forced finalize if run hangs
  window.__TD_METRICS_FORCE_FINALIZE__ = function () { finalizeRun(false); };

  // Primary install: synchronous at IIFE end. metrics.js loads AFTER all game
  // scripts, so `stage` is defined now. The onBeforeFirstFrame call above is
  // just a retry in case the sync attempt failed (e.g., stage deferred).
  try { installKillPatch(); } catch (e) { console.error('[metrics] sync install failed', e); }
  try { installHitPatch();  } catch (e) { console.error('[metrics] sync hit-patch failed', e); }
})();
