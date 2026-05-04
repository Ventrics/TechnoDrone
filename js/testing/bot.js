// Headless median-player bot for TechnoDrone playtest harness — drives title->playing->end.
(function () {
  if (typeof window === 'undefined') return;
  if (window.__TD_BOT_MODE__ !== true) return;

  // ── Tunables (chosen to produce a "representative median" player, not optimal) ──────
  const FIRE_KEY             = 'j';
  const LASER_KEY            = 'k';
  const DASH_KEY             = ' ';
  const NUKE_KEY             = 'q';
  const LEFT_KEY             = 'ArrowLeft';
  const RIGHT_KEY            = 'ArrowRight';

  // Heat thresholds (cap is 100; HEAT_PER_SHOT=4 → 20 shots = 80 heat):
  const FIRE_HEAT_STOP       = 72;   // release earlier to avoid overheat lockout exposure
  const FIRE_HEAT_RESUME     = 50;
  const HEAT_DUMP_DASH       = 80;

  // Threat / targeting radii:
  const THREAT_BAND_X        = 220;  // horizontal band around drone.x for targeting
  const IMMEDIATE_THREAT_R   = 140;  // wider so we react earlier
  const PANIC_DASH_R         = 120;
  const LASER_COLUMN_HALFW   = 60;
  const LASER_COLUMN_MIN     = 2;
  const NUKE_MIN_ENEMIES     = 6;

  const DECISION_HYSTERESIS  = 2;

  // ── State ──────────────────────────────────────────────────────────────────
  let stepCount      = 0;
  let ended          = false;
  let lastTitleTap   = 0;
  let lastTutTap     = 0;
  let committedDx    = 0;
  let pendingDx      = 0;
  let pendingDxAge   = 0;
  let lastDashFrame  = -999;
  let lastNukeFrame  = -999;
  let lastLaserFrame = -999;

  function now() { return (typeof performance !== 'undefined' ? performance.now() : Date.now()); }

  // Press a key for exactly one frame (taps). We set justPressed true so the game consumes it,
  // and also toggle keys[] true briefly for systems that poll `keys`.
  function tap(code) {
    try {
      if (typeof justPressed !== 'undefined') justPressed[code] = true;
      if (typeof keys !== 'undefined') keys[code] = true;
      // Clear held-down state next frame so game sees it as a single-frame press.
      setTimeout(() => {
        try { if (typeof keys !== 'undefined') keys[code] = false; } catch (_) {}
      }, 32);
    } catch (_) {}
  }

  function holdKey(code, v) {
    try { if (typeof keys !== 'undefined') keys[code] = !!v; } catch (_) {}
  }

  function clearAllInputs() {
    try {
      if (typeof keys !== 'undefined') {
        [LEFT_KEY, RIGHT_KEY, FIRE_KEY, FIRE_KEY.toUpperCase(),
         LASER_KEY, LASER_KEY.toUpperCase(), DASH_KEY,
         NUKE_KEY, NUKE_KEY.toUpperCase()].forEach(k => keys[k] = false);
      }
    } catch (_) {}
  }

  function safeRead(name) {
    try { return eval(name); } catch (_) { return undefined; }
  }

  function getEnemies() {
    const sh = safeRead('shards');
    if (!sh || !Array.isArray(sh.pool)) return [];
    return sh.pool.filter(e => e && !e.isBonusRing && !e.isGatePiece);
  }

  function getEnemyBullets() {
    const eb = safeRead('enemyBullets');
    if (!eb || !Array.isArray(eb.pool)) return [];
    return eb.pool;
  }

  // Returns the most imminent bullet threat: the bullet whose closest-approach
  // to the player within BULLET_LOOKAHEAD_S is minimal AND below BULLET_HIT_R.
  // null if no bullet will hit.
  function imminentBullet(pos, bullets) {
    const LOOKAHEAD_S = 0.45;
    const HIT_R = 32; // bullet hit radius ~8, player ~14; pad for reaction time
    let worst = null;
    let worstD = Infinity;
    let worstT = 0;
    for (const b of bullets) {
      const vx = b.vx || 0, vy = b.vy || 0;
      const dx = pos.x - b.x, dy = pos.y - b.y;
      const v2 = vx * vx + vy * vy;
      if (v2 < 1) continue;
      // t at closest approach to the player's current position.
      let t = (dx * vx + dy * vy) / v2;
      if (t < 0) continue;               // bullet moving away
      if (t > LOOKAHEAD_S) continue;     // too far in the future
      const cx = b.x + vx * t, cy = b.y + vy * t;
      const d = Math.hypot(cx - pos.x, cy - pos.y);
      if (d > HIT_R) continue;
      if (d < worstD) { worstD = d; worst = b; worstT = t; }
    }
    return worst ? { bullet: worst, dist: worstD, t: worstT } : null;
  }

  function getPos() {
    const d = safeRead('drone');
    if (d && typeof d.x === 'number') return { x: d.x, y: d.y };
    const p = safeRead('player');
    return { x: (p && p.x) || 0, y: (p && p.y) || 0 };
  }

  function getPlayArea() {
    return {
      x: safeRead('PLAY_X') || 0,
      y: safeRead('PLAY_Y') || 0,
      w: safeRead('PLAY_W') || 800,
      h: safeRead('PLAY_H') || 600
    };
  }

  // ── Non-playing handlers ───────────────────────────────────────────────────
  function handleTitle() {
    // Default titleSelection is 0 (START RUN); tapping Enter triggers startGame().
    // Throttle to ~200ms so we don't spam the key.
    if (now() - lastTitleTap > 200) {
      lastTitleTap = now();
      tap('Enter');
    }
  }

  function handleTutorial() {
    // Tutorial only accepts Enter skip after 8s per-step. Easiest: just hammer Enter periodically
    // (the tutorial also auto-advances on step completion — whichever arrives first). If Enter
    // pre-skip window hasn't opened, the tap is a no-op; once it opens we skip immediately.
    if (now() - lastTutTap > 250) {
      lastTutTap = now();
      tap('Enter');
    }
  }

  // ── Playing policy ─────────────────────────────────────────────────────────
  function chooseMovementTarget(pos, enemies) {
    // Weighted centroid of enemies within vertical band around drone.x, weighted by 1/(dist+1).
    let sumW = 0, sumX = 0;
    for (const e of enemies) {
      if (Math.abs(e.x - pos.x) > THREAT_BAND_X) continue;
      if (e.y > pos.y) continue; // enemies below the player are behind us in top-down mode
      const dx = e.x - pos.x, dy = e.y - pos.y;
      const d = Math.hypot(dx, dy) + 1;
      const w = 1 / d;
      sumW += w;
      sumX += e.x * w;
    }
    if (sumW <= 0) return null;
    return sumX / sumW;
  }

  // Trajectory-based action choice: evaluate {-1, 0, +1} horizontal actions by
  // simulating player + enemies forward over a horizon and picking the action
  // whose minimum safety distance is highest. Centroid bias is applied only as
  // a tiebreaker when actions are equally safe (so we still shoot enemies).
  const PLAYER_SPEED_BASE = 364;
  const PLAYER_SPEED_FLOW = 436.8;
  const HIT_SAFETY_R      = 34;
  const SIM_HORIZON_S     = 1.3;
  const SIM_STEP_S        = 0.05;

  // Monte Carlo rollout parameters
  const MC_ROLLOUTS       = 32;   // random rollouts per first action on top of 1 greedy
  const MC_DEPTH          = 5;
  const botRandom = (function () {
    const rng = window.__TD_BOT_RNG__;
    if (rng && typeof rng.random === 'function') return rng.random;

    const seedApi = window.__TD_SEED__;
    if (seedApi && typeof seedApi.botRandom === 'function') return seedApi.botRandom;

    let state = (((seedApi && typeof seedApi.getSeed === 'function') ? seedApi.getSeed() : 1) ^ 0xB0715EED) >>> 0;
    if (!state) state = 1;
    return function () {
      state = (state + 0x6D2B79F5) | 0;
      let t = state;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  })();

  // Multi-segment simulator: player switches direction at times t[1..n].
  // dirs[i] is active during [t[i], t[i+1]]. Returns min safety along the path.
  function scoreSegments(dirs, switchTimes, pos, play, enemies, bullets, playerSpeed) {
    let minSafety = Infinity;
    const n = dirs.length;
    // Precompute player x at each switch time to avoid repeated integration.
    const xAt = [pos.x];
    for (let i = 0; i < n - 1; i++) {
      const seg = switchTimes[i + 1] - switchTimes[i];
      let nx = xAt[i] + dirs[i] * playerSpeed * seg;
      nx = Math.max(play.x + 34, Math.min(play.x + play.w - 34, nx));
      xAt.push(nx);
    }
    for (let t = 0; t <= SIM_HORIZON_S + 1e-9; t += SIM_STEP_S) {
      // Find current segment
      let seg = 0;
      while (seg < n - 1 && t >= switchTimes[seg + 1]) seg++;
      const segStart = switchTimes[seg];
      let px = xAt[seg] + dirs[seg] * playerSpeed * (t - segStart);
      px = Math.max(play.x + 34, Math.min(play.x + play.w - 34, px));
      const py = pos.y;
      for (const e of enemies) {
        if (!e || typeof e.x !== 'number') continue;
        let vx = e.vx || 0, vy = e.vy || 0;
        if (e.isKamikaze && e.chargerState === 'telegraph') {
          const speed = e.chargerChargeSpeed || 544;
          const dx = pos.x - e.x, dy = pos.y - e.y;
          const mag = Math.hypot(dx, dy) || 1;
          vx = speed * dx / mag;
          vy = speed * dy / mag;
        }
        const ex = e.x + vx * t;
        const ey = e.y + vy * t;
        const bodyR = e.isTurret ? (e.size || 10) * 2.5 : (e.size || 10) * 0.75;
        const d = Math.hypot(ex - px, ey - py) - bodyR - 14;
        if (d < minSafety) minSafety = d;
        if (minSafety < -20) return minSafety;
      }
      if (bullets) {
        for (const b of bullets) {
          const bx = b.x + (b.vx || 0) * t;
          const by = b.y + (b.vy || 0) * t;
          const hr = b.hitRadius || 8;
          const d = Math.hypot(bx - px, by - py) - hr - 14;
          if (d < minSafety) minSafety = d;
          if (minSafety < -20) return minSafety;
        }
      }
    }
    return minSafety;
  }

  // Greedy rollout: given a fixed first action, find the best continuation by
  // picking the locally safest direction for each subsequent segment.
  // Deterministic and cheap compared to sampling, and usually finds better
  // plans than random rollouts of the same depth.
  function greedyRollout(d1, pos, play, enemies, bullets, playerSpeed) {
    const segLen = SIM_HORIZON_S / MC_DEPTH;
    const switchTimes = [];
    for (let i = 0; i <= MC_DEPTH; i++) switchTimes.push(i * segLen);
    const dirs = [d1];
    // Precompute player position at end of each segment as we commit to actions.
    // For each subsequent segment (1..MC_DEPTH-1), evaluate 3 candidate
    // suffixes (keep d=−1/0/+1 for the rest of horizon, simpler than full
    // depth-first). Pick the suffix-start direction with highest min safety.
    for (let i = 1; i < MC_DEPTH; i++) {
      let bestDir = 0, bestScore = -Infinity;
      for (const d of [-1, 0, 1]) {
        // Fill remaining segments with this direction and score.
        const trial = dirs.slice();
        for (let j = i; j < MC_DEPTH; j++) trial.push(d);
        const s = scoreSegments(trial, switchTimes, pos, play, enemies, bullets, playerSpeed);
        if (s > bestScore) { bestScore = s; bestDir = d; }
      }
      dirs.push(bestDir);
    }
    return scoreSegments(dirs, switchTimes, pos, play, enemies, bullets, playerSpeed);
  }

  // Hybrid: greedy (deterministic) + MC sampling for tie-breaking / diversity.
  function pickMCAction(pos, play, enemies, bullets, centroidX, playerSpeed) {
    const segLen = SIM_HORIZON_S / MC_DEPTH;
    const switchTimes = [];
    for (let i = 0; i <= MC_DEPTH; i++) switchTimes.push(i * segLen);
    const candidates = [-1, 0, 1];
    let bestScore = -Infinity, bestFirstSafety = -Infinity, bestDir = 0;
    const safetyByFirst = {};
    for (const d1 of candidates) {
      // Start with greedy rollout (deterministic).
      let best = greedyRollout(d1, pos, play, enemies, bullets, playerSpeed);
      // Augment with a few random rollouts to escape greedy local optima.
      for (let r = 0; r < MC_ROLLOUTS; r++) {
        const dirs = [d1];
        for (let i = 1; i < MC_DEPTH; i++) {
          dirs.push(candidates[Math.floor(botRandom() * 3)]);
        }
        const s = scoreSegments(dirs, switchTimes, pos, play, enemies, bullets, playerSpeed);
        if (s > best) best = s;
      }
      const score = best;
      safetyByFirst[String(d1)] = best;
      if (score > bestScore) { bestScore = score; bestDir = d1; bestFirstSafety = best; }
    }
    // Tiebreak eligible actions (within 6 of max) toward centroid / stand.
    const best = bestScore;
    const elig = [];
    for (const d1 of candidates) {
      if (safetyByFirst[String(d1)] >= best - 6) elig.push(d1);
    }
    if (elig.length === 1) return { dir: elig[0], bestSafety: bestFirstSafety };
    let pick = bestDir;
    if (elig.indexOf(0) !== -1) {
      if (centroidX == null) pick = 0;
      else {
        const diff = centroidX - pos.x;
        if (Math.abs(diff) <= 24) pick = 0;
        else {
          const wantDir = diff > 0 ? 1 : -1;
          pick = (elig.indexOf(wantDir) !== -1) ? wantDir : 0;
        }
      }
    } else if (centroidX != null) {
      const diff = centroidX - pos.x;
      const wantDir = diff > 0 ? 1 : -1;
      pick = (elig.indexOf(wantDir) !== -1) ? wantDir : elig[0];
    } else {
      pick = elig[0];
    }
    return { dir: pick, bestSafety: bestFirstSafety };
  }

  // Two-phase simulator: player uses dir1 for [0, switchT], then dir2 for (switchT, SIM_HORIZON_S].
  // Lets the bot plan a single direction-change within the lookahead window.
  function scorePlan(dir1, dir2, switchT, pos, play, enemies, bullets, playerSpeed) {
    let minSafety = Infinity;
    let switchPx = pos.x + dir1 * playerSpeed * switchT;
    switchPx = Math.max(play.x + 34, Math.min(play.x + play.w - 34, switchPx));
    for (let t = 0; t <= SIM_HORIZON_S + 1e-9; t += SIM_STEP_S) {
      let px;
      if (t <= switchT) {
        px = pos.x + dir1 * playerSpeed * t;
      } else {
        px = switchPx + dir2 * playerSpeed * (t - switchT);
      }
      px = Math.max(play.x + 34, Math.min(play.x + play.w - 34, px));
      const py = pos.y;
      for (const e of enemies) {
        if (!e || typeof e.x !== 'number') continue;
        let vx = e.vx || 0, vy = e.vy || 0;
        if (e.isKamikaze && e.chargerState === 'telegraph') {
          const speed = e.chargerChargeSpeed || 544;
          const dx = pos.x - e.x, dy = pos.y - e.y;
          const mag = Math.hypot(dx, dy) || 1;
          vx = speed * dx / mag;
          vy = speed * dy / mag;
        }
        const ex = e.x + vx * t;
        const ey = e.y + vy * t;
        const bodyR = e.isTurret ? (e.size || 10) * 2.5 : (e.size || 10) * 0.75;
        const d = Math.hypot(ex - px, ey - py) - bodyR - 14;
        if (d < minSafety) minSafety = d;
        if (minSafety < -20) return minSafety;
      }
      if (bullets) {
        for (const b of bullets) {
          const bx = b.x + (b.vx || 0) * t;
          const by = b.y + (b.vy || 0) * t;
          const hr = b.hitRadius || 8;
          const d = Math.hypot(bx - px, by - py) - hr - 14;
          if (d < minSafety) minSafety = d;
          if (minSafety < -20) return minSafety;
        }
      }
    }
    return minSafety;
  }

  function scoreAction(dir, pos, play, enemies, bullets, playerSpeed) {
    // Forward-simulate player at speed*dir for SIM_HORIZON_S, bounded by play area.
    let minSafety = Infinity;
    for (let t = 0; t <= SIM_HORIZON_S + 1e-9; t += SIM_STEP_S) {
      const px = Math.max(play.x + 34,
                          Math.min(play.x + play.w - 34,
                                   pos.x + dir * playerSpeed * t));
      const py = pos.y;
      for (const e of enemies) {
        if (!e || typeof e.x !== 'number') continue;
        let vx = e.vx || 0, vy = e.vy || 0;
        // Kamikaze in telegraph: it'll charge toward the player at chargerChargeSpeed (~544px/s).
        // Treat its projected velocity as pointing from its current pos toward player pos.
        if (e.isKamikaze && e.chargerState === 'telegraph') {
          const speed = e.chargerChargeSpeed || 544;
          const dx = pos.x - e.x, dy = pos.y - e.y;
          const mag = Math.hypot(dx, dy) || 1;
          vx = speed * dx / mag;
          vy = speed * dy / mag;
        }
        const ex = e.x + vx * t;
        const ey = e.y + vy * t;
        const bodyR = e.isTurret ? (e.size || 10) * 2.5 : (e.size || 10) * 0.75;
        const d = Math.hypot(ex - px, ey - py) - bodyR - 14;
        if (d < minSafety) minSafety = d;
        if (minSafety < -20) return minSafety;
      }
      if (bullets) {
        for (const b of bullets) {
          const bx = b.x + (b.vx || 0) * t;
          const by = b.y + (b.vy || 0) * t;
          const hr = b.hitRadius || 8;
          const d = Math.hypot(bx - px, by - py) - hr - 14;
          if (d < minSafety) minSafety = d;
          if (minSafety < -20) return minSafety;
        }
      }
    }
    return minSafety;
  }

  function pickMoveAction(pos, play, enemies, bullets, centroidX, speed) {
    const sL = scoreAction(-1, pos, play, enemies, bullets, speed);
    const sS = scoreAction( 0, pos, play, enemies, bullets, speed);
    const sR = scoreAction(+1, pos, play, enemies, bullets, speed);
    // Pick highest safety. Tiebreak within 6px of max toward centroid.
    const best = Math.max(sL, sS, sR);
    const eligible = [];
    if (sL >= best - 6) eligible.push(-1);
    if (sS >= best - 6) eligible.push( 0);
    if (sR >= best - 6) eligible.push(+1);
    if (eligible.length === 1) return eligible[0];
    // Prefer standing still when safe — moving changes our projected trajectory
    // and can shake our aim. Only move when clear offensive reason (centroid)
    // or when best safety is obviously worse for stand vs. move.
    if (eligible.indexOf(0) !== -1) {
      if (centroidX == null) return 0;
      const diff = centroidX - pos.x;
      if (Math.abs(diff) <= 24) return 0; // already aligned-ish
      const wantDir = diff > 0 ? 1 : -1;
      if (eligible.indexOf(wantDir) !== -1) return wantDir;
      return 0;
    }
    // Stand isn't eligible — pick the move direction closer to centroid.
    if (centroidX != null) {
      const diff = centroidX - pos.x;
      const wantDir = diff > 0 ? 1 : -1;
      if (eligible.indexOf(wantDir) !== -1) return wantDir;
    }
    return eligible[0];
  }

  function nearestThreat(pos, enemies) {
    // Only consider enemies above or level with the player — the player is
    // locked at the bottom of the play area, so enemies below are past.
    let best = null, bestD = Infinity;
    for (const e of enemies) {
      if (e.y > pos.y + 10) continue;
      const dx = e.x - pos.x, dy = e.y - pos.y;
      const d = Math.hypot(dx, dy);
      if (d < bestD) { bestD = d; best = e; }
    }
    return best ? { enemy: best, dist: bestD } : null;
  }

  // Does `e` look like it's heading toward the player?
  function isOnCollision(pos, e) {
    const dx = pos.x - e.x, dy = pos.y - e.y;
    const vl = Math.hypot(e.vx || 0, e.vy || 0);
    if (vl < 1) return false;
    const dl = Math.hypot(dx, dy) + 0.0001;
    // cosine between velocity and vector-to-player
    const cos = ((e.vx || 0) * dx + (e.vy || 0) * dy) / (vl * dl);
    return cos > 0.7;
  }

  function countInColumn(pos, enemies) {
    let c = 0;
    for (const e of enemies) {
      if (Math.abs(e.x - pos.x) <= LASER_COLUMN_HALFW && e.y < pos.y) c++;
    }
    return c;
  }

  function handlePlaying() {
    const p = safeRead('player');
    if (!p || p.dead) return;

    const pos = getPos();
    const play = getPlayArea();
    const enemies = getEnemies();
    const bullets = getEnemyBullets();
    const heat = p.heat || 0;
    const heatFrac = heat / 100;
    const dashObj = safeRead('dash');
    const dashReady = !!(dashObj && dashObj.cooldown <= 0 && dashObj.duration <= 0);
    const nuke = safeRead('screenNuke');
    const nukeActive = !!(nuke && nuke.active);

    // ── Movement ──
    let desiredDx = 0;
    const near = nearestThreat(pos, enemies);
    const centroidX = chooseMovementTarget(pos, enemies);
    const bullet = imminentBullet(pos, bullets);

    // Trajectory-based action choice. Pick the move direction that keeps the
    // player safest over a short lookahead; break ties toward the enemy
    // centroid so we're still shooting at things. Also returns the best
    // safety score so the dash code can detect "no safe action".
    const playerSpeed = p.flowStateActive ? PLAYER_SPEED_FLOW : PLAYER_SPEED_BASE;
    // Monte Carlo rollout planner: for each first action, sample random depth-4
    // continuations and pick the first action whose best rollout is safest.
    const mc = pickMCAction(pos, play, enemies, bullets, centroidX, playerSpeed);
    desiredDx = mc.dir;
    const bestSafety = mc.bestSafety;

    // Bullet dodge overrides if a bullet will hit very soon and the chosen
    // action doesn't already take us clear.
    if (bullet && bullet.t < 0.25) {
      const cx = play.x + play.w / 2;
      const bdx = (pos.x < cx) ? 1 : -1;
      if (desiredDx !== bdx) desiredDx = bdx;
    }

    // Hysteresis on direction changes — prevents per-frame flickering.
    if (desiredDx !== committedDx) {
      if (desiredDx === pendingDx) {
        pendingDxAge++;
        if (pendingDxAge >= DECISION_HYSTERESIS) {
          committedDx = pendingDx;
          pendingDxAge = 0;
        }
      } else {
        pendingDx = desiredDx;
        pendingDxAge = 1;
      }
    } else {
      pendingDxAge = 0;
    }

    // Clamp to bounds — release movement if already at edge and trying to push further.
    if (committedDx < 0 && pos.x <= play.x + 34) committedDx = 0;
    if (committedDx > 0 && pos.x >= play.x + play.w - 34) committedDx = 0;

    holdKey(LEFT_KEY,  committedDx < 0);
    holdKey(RIGHT_KEY, committedDx > 0);

    // ── Primary fire ──
    // Simple hysteresis around heat. Also stop firing if we're about to use the laser.
    const wantLaser = p.altFireType === 'laser' && p.laserFuel === 100 &&
                      countInColumn(pos, enemies) >= LASER_COLUMN_MIN;
    let shouldFire;
    if (p.overheated) shouldFire = false;
    else if (heat >= FIRE_HEAT_STOP) shouldFire = false;
    else if (heat <= FIRE_HEAT_RESUME) shouldFire = true;
    else shouldFire = !!keys[FIRE_KEY]; // stay in current state in the middle band
    if (wantLaser) shouldFire = false;
    holdKey(FIRE_KEY, shouldFire);

    // ── Laser alt-fire ──
    // Hold 'k' for one frame burst — laser drains 10 fuel/shot so we tap rather than hold
    // to match a median player's "pulse" usage pattern.
    if (wantLaser && stepCount - lastLaserFrame > 10) {
      lastLaserFrame = stepCount;
      holdKey(LASER_KEY, true);
      setTimeout(() => { try { holdKey(LASER_KEY, false); } catch (_) {} }, 120);
    }

    // ── Dash (survival only — trajectory-gated) ──
    // Only dash when the simulator says no safe action exists, OR a bullet is
    // imminent. The trajectory simulator handles normal dodging on its own;
    // dash is the backstop for unavoidable hits. Dash i-frames let us pass
    // through the danger without being hit.
    if (dashReady && stepCount - lastDashFrame > 20) {
      let dashDir = 0;
      if (bullet && bullet.t < 0.15) {
        dashDir = committedDx !== 0 ? committedDx : (bullet.bullet.vx > 0 ? -1 : 1);
      } else if (bestSafety < -8) {
        // All actions lead to a hit — dash in whatever direction looks
        // best (if current desiredDx agrees with the safest simulated action).
        dashDir = desiredDx !== 0 ? desiredDx : (near && near.enemy.x > pos.x ? -1 : 1);
      }
      if (dashDir !== 0) {
        holdKey(dashDir > 0 ? RIGHT_KEY : LEFT_KEY, true);
        holdKey(dashDir > 0 ? LEFT_KEY  : RIGHT_KEY, false);
        tap(DASH_KEY);
        lastDashFrame = stepCount;
      }
    }

    // ── Nuke (aggressive use) ──
    // Use it rather than hoard it. Three triggers:
    //   (a) emergency — simulator sees a likely hit (bestSafety < 0)
    //   (b) crowd — many enemies on screen and we have spare uses
    //   (c) low-life + any crowd — if we're at 1 life, save ourselves
    const nukeEmergency = bestSafety < 0 && p.ultUses > 0;
    const nukeCrowd     = enemies.length >= NUKE_MIN_ENEMIES && p.ultUses > 0;
    const nukeLowLife   = p.lives <= 1 && enemies.length >= 4 && p.ultUses > 0;
    if (!nukeActive && (nukeEmergency || nukeCrowd || nukeLowLife) &&
        stepCount - lastNukeFrame > 180) {
      tap(NUKE_KEY);
      lastNukeFrame = stepCount;
    }
  }

  // ── Main per-frame entry ───────────────────────────────────────────────────
  function botUpdate() {
    stepCount++;
    const gs = safeRead('gameState');

    if (gs === 'title') {
      clearAllInputs();
      handleTitle();
      return;
    }
    if (gs === 'tutorial') {
      // Tutorial mostly plays itself; tapping Enter after its skip-window advances.
      clearAllInputs();
      handleTutorial();
      return;
    }
    if (gs === 'playing' || gs === 'finale') {
      handlePlaying();
      return;
    }
    if (gs === 'win' || gs === 'leaderboard' || gs === 'nameEntry') {
      // Run is over — release everything and signal the harness.
      clearAllInputs();
      ended = true;
      return;
    }

    // Post-death: player.dead becomes true, then the game transitions to nameEntry or leaderboard.
    const p = safeRead('player');
    if (p && p.dead && !p.deathPresentationPending) {
      clearAllInputs();
      ended = true;
      // Keep tapping Enter so we progress through death/name-entry/leaderboard screens.
      if (now() - lastTitleTap > 250) {
        lastTitleTap = now();
        tap('Enter');
      }
      return;
    }
  }

  // ── Register ───────────────────────────────────────────────────────────────
  function register() {
    const clock = window.__TD_CLOCK__;
    if (clock && typeof clock.onFrame === 'function') {
      clock.onFrame(botUpdate);
      return true;
    }
    return false;
  }

  if (!register()) {
    // Clock may not yet be installed — poll briefly until it is.
    let attempts = 0;
    const iv = setInterval(() => {
      if (register() || ++attempts > 200) clearInterval(iv);
    }, 50);
  }

  window.__TD_BOT__ = {
    get ended() { return ended; },
    get stepCount() { return stepCount; },
    getDebugState() {
      const p = safeRead('player') || {};
      const s = safeRead('stage')  || {};
      const enemies = getEnemies();
      return {
        gameState: safeRead('gameState'),
        stepCount,
        ended,
        committedDx,
        lives: p.lives,
        dead: p.dead,
        heat: p.heat,
        overheated: p.overheated,
        laserFuel: p.laserFuel,
        altFireType: p.altFireType,
        flowStateActive: p.flowStateActive,
        ultUses: p.ultUses,
        stage: s.current,
        totalKills: s.totalKills,
        enemyCount: enemies.length
      };
    }
  };
})();
