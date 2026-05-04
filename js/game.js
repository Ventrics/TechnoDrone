window.addEventListener('keydown', e => {
  if (gameState !== 'playing' || player.dead) return;
  if (e.key === 'Escape') {
    paused = !paused;
    pauseSel = 0;
    if (paused && screenNuke.active) audio.stopLoop('bassPulseLoop');
    if (typeof pixiPost !== 'undefined') pixiPost.setPaused(paused);
  }
  if (!paused) return;
  
  if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') { 
    pauseSel = (pauseSel - 1 + PAUSE_ITEMS.length) % PAUSE_ITEMS.length; 
    audio.play('menuSelect'); 
  }
  if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') { 
    pauseSel = (pauseSel + 1) % PAUSE_ITEMS.length; 
    audio.play('menuSelect'); 
  }
  
  if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
    if (PAUSE_ITEMS[pauseSel] === 'MUSIC VOL') _adjustPauseMusicVolume(-5);
  }
  
  if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
    if (PAUSE_ITEMS[pauseSel] === 'MUSIC VOL') _adjustPauseMusicVolume(5);
  }

  if (e.key === 'Enter') {
    _activatePauseItem(pauseSel);
  }
});

window.addEventListener('keydown', e => {
  if (gameState !== 'tutorial') return;
  if (e.key === 'Escape') {
    audio.play('menuSelect');
    tutorial.cancel();
  }
});

let lastTime = 0;
let stage10WipeProgress = 0;
let _negativeSpaceBackdrop = null;
let _negativeSpaceBackdropActive = null;
let _negativeSpaceBackdropW = 0;
let _negativeSpaceBackdropH = 0;
let _negativeSpaceFlowGlow = 0;
let missionCompleteSequence = {
  startedAt: 0,
  heroX: 0,
};

function _setTitleWordmarkVisible(visible) {
  if (typeof pixiPost !== 'undefined' && typeof pixiPost.setTitleWordmark === 'function') {
    pixiPost.setTitleWordmark(visible);
  }
}

function _drawNearDeathVignette() {
  if (!(player.lives === 1 && !player.dead)) return;

  const now = getNow();
  const pulse = 0.55 + 0.45 * (Math.sin(now * 0.0105) * 0.5 + 0.5);
  const edgeAlpha = 0.075 + pulse * 0.045;
  const innerAlpha = 0.022 + pulse * 0.014;
  const glowSize = Math.max(34, Math.min(68, PLAY_W * 0.11));

  ctx.save();
  ctx.beginPath();
  ctx.rect(PLAY_X, PLAY_Y, PLAY_W, PLAY_H);
  ctx.clip();

  const left = ctx.createLinearGradient(PLAY_X, 0, PLAY_X + glowSize, 0);
  left.addColorStop(0, `rgba(255, 0, 50, ${edgeAlpha})`);
  left.addColorStop(0.45, `rgba(220, 0, 40, ${edgeAlpha * 0.45})`);
  left.addColorStop(1, 'rgba(180, 0, 30, 0)');
  ctx.fillStyle = left;
  ctx.fillRect(PLAY_X, PLAY_Y, glowSize, PLAY_H);

  const right = ctx.createLinearGradient(PLAY_X + PLAY_W, 0, PLAY_X + PLAY_W - glowSize, 0);
  right.addColorStop(0, `rgba(255, 0, 50, ${edgeAlpha})`);
  right.addColorStop(0.45, `rgba(220, 0, 40, ${edgeAlpha * 0.45})`);
  right.addColorStop(1, 'rgba(180, 0, 30, 0)');
  ctx.fillStyle = right;
  ctx.fillRect(PLAY_X + PLAY_W - glowSize, PLAY_Y, glowSize, PLAY_H);

  const top = ctx.createLinearGradient(0, PLAY_Y, 0, PLAY_Y + glowSize);
  top.addColorStop(0, `rgba(255, 0, 50, ${edgeAlpha * 0.9})`);
  top.addColorStop(0.45, `rgba(220, 0, 40, ${edgeAlpha * 0.38})`);
  top.addColorStop(1, 'rgba(180, 0, 30, 0)');
  ctx.fillStyle = top;
  ctx.fillRect(PLAY_X, PLAY_Y, PLAY_W, glowSize);

  const bottom = ctx.createLinearGradient(0, PLAY_Y + PLAY_H, 0, PLAY_Y + PLAY_H - glowSize);
  bottom.addColorStop(0, `rgba(255, 0, 50, ${edgeAlpha * 0.9})`);
  bottom.addColorStop(0.45, `rgba(220, 0, 40, ${edgeAlpha * 0.38})`);
  bottom.addColorStop(1, 'rgba(180, 0, 30, 0)');
  ctx.fillStyle = bottom;
  ctx.fillRect(PLAY_X, PLAY_Y + PLAY_H - glowSize, PLAY_W, glowSize);

  // Very soft interior pressure so the warning state breathes without boxing the field in.
  const centerX = PLAY_X + PLAY_W * 0.5;
  const centerY = PLAY_Y + PLAY_H * 0.5;
  const well = ctx.createRadialGradient(centerX, centerY, PLAY_W * 0.28, centerX, centerY, PLAY_W * 0.68);
  well.addColorStop(0, 'rgba(0,0,0,0)');
  well.addColorStop(0.72, `rgba(120, 14, 28, ${innerAlpha})`);
  well.addColorStop(1, `rgba(152, 18, 36, ${innerAlpha * 1.7})`);
  ctx.fillStyle = well;
  ctx.fillRect(PLAY_X, PLAY_Y, PLAY_W, PLAY_H);

  ctx.restore();
}

function _drawPlayfieldFog() {
  const now = getNow();
  const cx = PLAY_X + PLAY_W * 0.5;
  const cy = PLAY_Y + PLAY_H * 0.5;

  ctx.save();
  ctx.beginPath();
  ctx.rect(PLAY_X, PLAY_Y, PLAY_W, PLAY_H);
  ctx.clip();

  const pools = [
    {
      x: cx + Math.sin(now * 0.00023) * PLAY_W * 0.12,
      y: cy - PLAY_H * 0.16 + Math.cos(now * 0.00019) * PLAY_H * 0.08,
      r: PLAY_W * 0.34,
      alpha: 0.048,
      color: 'rgba(210,240,255,',
    },
    {
      x: PLAY_X + PLAY_W * 0.22 + Math.cos(now * 0.00017 + 1.4) * PLAY_W * 0.09,
      y: PLAY_Y + PLAY_H * 0.72 + Math.sin(now * 0.00021 + 0.7) * PLAY_H * 0.07,
      r: PLAY_W * 0.28,
      alpha: 0.034,
      color: 'rgba(180,220,235,',
    },
    {
      x: PLAY_X + PLAY_W * 0.8 + Math.sin(now * 0.00014 + 2.1) * PLAY_W * 0.08,
      y: PLAY_Y + PLAY_H * 0.34 + Math.cos(now * 0.00016 + 0.9) * PLAY_H * 0.09,
      r: PLAY_W * 0.24,
      alpha: 0.026,
      color: 'rgba(245,250,255,',
    },
  ];

  pools.forEach(pool => {
    const grad = ctx.createRadialGradient(pool.x, pool.y, 0, pool.x, pool.y, pool.r);
    grad.addColorStop(0, `${pool.color}${pool.alpha})`);
    grad.addColorStop(0.42, `${pool.color}${pool.alpha * 0.45})`);
    grad.addColorStop(1, `${pool.color}0)`);
    ctx.fillStyle = grad;
    ctx.fillRect(pool.x - pool.r, pool.y - pool.r, pool.r * 2, pool.r * 2);
  });

  const topHaze = ctx.createLinearGradient(0, PLAY_Y, 0, PLAY_Y + PLAY_H * 0.28);
  topHaze.addColorStop(0, 'rgba(235,245,255,0.018)');
  topHaze.addColorStop(1, 'rgba(235,245,255,0)');
  ctx.fillStyle = topHaze;
  ctx.fillRect(PLAY_X, PLAY_Y, PLAY_W, PLAY_H * 0.28);

  ctx.restore();
}

function _setPixiNativeLayer(layerName, enabled) {
  if (typeof pixiPost === 'undefined' || typeof pixiPost.setNativeLayerEnabled !== 'function') return;
  pixiPost.setNativeLayerEnabled(layerName, enabled);
}

function _syncPixiLayerModes() {
  _setPixiNativeLayer('bg', false);
  _setPixiNativeLayer('particles', false);
  _setPixiNativeLayer('entities', false);
  _setPixiNativeLayer('player', false);
  _setPixiNativeLayer('fx', false);
  _setPixiNativeLayer('hud', false);
}

function beginMissionCompleteSequence() {
  gameState = 'finale';
  paused = false;
  stage10WipeProgress = 1;
}

function startMissionCompleteScreen() {
  startScreenTransition('pixelate', () => {
    const finalScore = player.score;
    const finalKills = stage.totalKills;
    recordRunResult(finalScore, finalKills, 10, true);
    submitLeaderboardRun(finalScore, finalKills);
    bullets.pool = [];
    bullets.cooldown = 0;
    enemyBullets.reset();
    pickups.reset();
    screenNuke.reset();
    dash.reset();
    player.altFireType = null;
    player.laserFuel = 0;
    player.flowStateActive = false;
    player.flowStateTimer = 0;
    player.flowStateCharge = player.FLOW_STATE_MAX;
    pixiPost.setFlowState(false);
    pixiPost.setNearDeath(false);
    gameState = 'win';
    endScreenSelection = 0;
    endScreenSelectionChangedAt = getNow();
    missionCompleteSequence.startedAt = getNow();
    missionCompleteSequence.heroX = PLAY_X + PLAY_W * 0.5;
    audio.playMusic('win');
  });
}

function _buildNegativeSpaceBackdrop() {
  const bg = document.createElement('canvas');
  const active = document.createElement('canvas');
  bg.width = canvas.width;
  bg.height = canvas.height;
  active.width = canvas.width;
  active.height = canvas.height;
  const bctx = bg.getContext('2d');
  const actx = active.getContext('2d');

  // Base background
  bctx.fillStyle = '#030406';
  bctx.fillRect(0, 0, bg.width, bg.height);

  bctx.save();
  bctx.beginPath();
  bctx.rect(0, 0, bg.width, bg.height);
  bctx.rect(PLAY_X, PLAY_Y, PLAY_W, PLAY_H);
  bctx.clip('evenodd');

  const wash = bctx.createRadialGradient(
    bg.width * 0.5, bg.height * 0.45, 0,
    bg.width * 0.5, bg.height * 0.45, Math.max(bg.width, bg.height) * 0.85
  );
  wash.addColorStop(0, 'rgba(72,76,84,0.22)');
  wash.addColorStop(0.45, 'rgba(28,30,36,0.14)');
  wash.addColorStop(1, 'rgba(3,4,6,0.94)');
  bctx.fillStyle = wash;
  bctx.fillRect(0, 0, bg.width, bg.height);

  const orbA = bctx.createRadialGradient(PLAY_X - 120, PLAY_Y + PLAY_H * 0.32, 0, PLAY_X - 120, PLAY_Y + PLAY_H * 0.32, 260);
  orbA.addColorStop(0, 'rgba(96,98,108,0.11)');
  orbA.addColorStop(0.55, 'rgba(96,98,108,0.04)');
  orbA.addColorStop(1, 'rgba(96,98,108,0)');
  bctx.fillStyle = orbA;
  bctx.fillRect(0, 0, bg.width, bg.height);

  const orbB = bctx.createRadialGradient(PLAY_X + PLAY_W + 150, PLAY_Y + PLAY_H * 0.62, 0, PLAY_X + PLAY_W + 150, PLAY_Y + PLAY_H * 0.62, 300);
  orbB.addColorStop(0, 'rgba(82,84,92,0.12)');
  orbB.addColorStop(0.5, 'rgba(82,84,92,0.05)');
  orbB.addColorStop(1, 'rgba(82,84,92,0)');
  bctx.fillStyle = orbB;
  bctx.fillRect(0, 0, bg.width, bg.height);

  bctx.restore();

  // Active canvas: border bloom + behind-playfield radiance — pre-rendered once, clipped outside playfield
  actx.save();
  actx.beginPath();
  actx.rect(0, 0, active.width, active.height);
  actx.rect(PLAY_X, PLAY_Y, PLAY_W, PLAY_H);
  actx.clip('evenodd');

  // Playfield border bloom — stroke with shadow bleeding outward into side panels
  actx.shadowColor = 'rgba(120, 55, 255, 1.0)';
  actx.shadowBlur = 55;
  actx.strokeStyle = 'rgba(140, 75, 255, 0.95)';
  actx.lineWidth = 2;
  actx.strokeRect(PLAY_X, PLAY_Y, PLAY_W, PLAY_H);
  // Second pass — wider softer halo
  actx.shadowBlur = 100;
  actx.strokeStyle = 'rgba(100, 45, 220, 0.50)';
  actx.lineWidth = 1;
  actx.strokeRect(PLAY_X, PLAY_Y, PLAY_W, PLAY_H);

  const arenaCx = PLAY_X + PLAY_W * 0.5;
  const arenaCy = PLAY_Y + PLAY_H * 0.5;

  // Single centered backlight source behind the arena.
  const rearAura = actx.createRadialGradient(arenaCx, arenaCy, PLAY_W * 0.16, arenaCx, arenaCy, PLAY_W * 0.98);
  rearAura.addColorStop(0, 'rgba(132, 78, 255, 0.46)');
  rearAura.addColorStop(0.22, 'rgba(116, 56, 242, 0.22)');
  rearAura.addColorStop(0.48, 'rgba(92, 30, 196, 0.09)');
  rearAura.addColorStop(0.76, 'rgba(72, 20, 156, 0.035)');
  rearAura.addColorStop(1, 'rgba(60, 18, 140, 0)');
  actx.fillStyle = rearAura;
  actx.fillRect(0, 0, active.width, active.height);

  const outerShell = actx.createRadialGradient(arenaCx, arenaCy, PLAY_W * 0.52, arenaCx, arenaCy, PLAY_W * 1.22);
  outerShell.addColorStop(0, 'rgba(150, 104, 255, 0.08)');
  outerShell.addColorStop(0.34, 'rgba(120, 66, 238, 0.055)');
  outerShell.addColorStop(0.7, 'rgba(92, 38, 196, 0.022)');
  outerShell.addColorStop(1, 'rgba(88, 38, 196, 0)');
  actx.fillStyle = outerShell;
  actx.fillRect(0, 0, active.width, active.height);

  actx.restore();

  _negativeSpaceBackdrop = bg;
  _negativeSpaceBackdropActive = active;
  _negativeSpaceBackdropW = canvas.width;
  _negativeSpaceBackdropH = canvas.height;
}

function _drawNegativeSpaceBackdrop() {
  if (!_negativeSpaceBackdrop || _negativeSpaceBackdropW !== canvas.width || _negativeSpaceBackdropH !== canvas.height) {
    _buildNegativeSpaceBackdrop();
  }
  ctx.drawImage(_negativeSpaceBackdrop, 0, 0);
  if (_negativeSpaceBackdropActive && _negativeSpaceFlowGlow > 0.001) {
    // Breathing: slow sin oscillation modulates intensity when fully active
    const breathe = 0.12 * Math.sin(Date.now() * 0.0018) * _negativeSpaceFlowGlow;
    ctx.globalAlpha = Math.max(0, Math.min(1, _negativeSpaceFlowGlow * 0.88 + breathe));
    ctx.drawImage(_negativeSpaceBackdropActive, 0, 0);
    ctx.globalAlpha = 1;
  }
}

function update(delta) {
  _syncPixiLayerModes();

  const backdropTarget = (gameState === 'playing' && !player.dead && player.flowStateActive) ? 1 : 0;
  const glowRate = delta / (backdropTarget > _negativeSpaceFlowGlow ? 260 : 420);
  _negativeSpaceFlowGlow += (backdropTarget - _negativeSpaceFlowGlow) * Math.min(1, glowRate);

  if (gameState === 'title') { updateTitle(delta); return; }
  if (gameState === 'leaderboard') { leaderboard.update(delta); return; }
  if (gameState === 'nameEntry') { nameEntry.update(delta); return; }
  if (gameState === 'devMenu') { return; }
  if (gameState === 'win') {
    starField.update(delta);
    updateWinDust(delta);
    const winMove = ((keys['ArrowLeft'] || keys['a'] || keys['A']) ? -1 : 0) +
      ((keys['ArrowRight'] || keys['d'] || keys['D']) ? 1 : 0);
    const targetX = PLAY_X + PLAY_W * 0.5 + winMove * PLAY_W * 0.16;
    const currentX = missionCompleteSequence.heroX || (PLAY_X + PLAY_W * 0.5);
    missionCompleteSequence.heroX = currentX + (targetX - currentX) * Math.min(1, delta / 140);
    return;
  }
  if (paused) { return; }

  if (player.dead) {
    updateDeathDust(delta);
    return;
  }

  const effectiveDelta = stage.slowmoTimer > 0 ? delta * 0.25 : delta;
  starField.update(delta);
  dash.update(effectiveDelta);
  drone.update(effectiveDelta);
  bullets.update(effectiveDelta);
  enemyBullets.update(effectiveDelta);

  if (gameState === 'tutorial') {
    tutorial.update(delta);
    const dt = effectiveDelta / 1000;
    shards.pool = shards.pool.filter(s => {
      if (s.tutorialStatic) {
        s.vx = 0;
        s.vy = 0;
      } else if (!s.isKamikaze) {
        const curAngle = Math.atan2(s.vy, s.vx);
        const tgtAngle = Math.atan2(drone.y - s.y, drone.x - s.x);
        let diff = tgtAngle - curAngle;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        const maxTurn = (s.turnRate || 0.5) * dt;
        const turn = Math.min(Math.abs(diff), maxTurn) * Math.sign(diff);
        const newAngle = curAngle + turn;
        const spd = Math.hypot(s.vx, s.vy);
        s.vx = Math.cos(newAngle) * spd;
        s.vy = Math.sin(newAngle) * spd;
      }
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.angle += s.spin;
      if (s.flashTimer > 0) s.flashTimer -= effectiveDelta;
      if (s.hpBarTimer > 0) s.hpBarTimer -= effectiveDelta;
      const alive = (
        s.x > PLAY_X - 80 &&
        s.x < PLAY_X + PLAY_W + 80 &&
        s.y < PLAY_Y + PLAY_H + 120
      );
      if (!alive) window.__TD_LEDGER__?.markRemoved(s, 'tutorialOffScreen');
      return alive;
    });
  } else {
    shards.update(effectiveDelta);
  }

  fragments.update(effectiveDelta);
  burstParticles.update(effectiveDelta);
  hitSparks.update(effectiveDelta);
  impactFX.update(effectiveDelta);
  smokeParticles.update(effectiveDelta);
  pickups.update(effectiveDelta);
  if (typeof reactiveGrid !== 'undefined') reactiveGrid.update(effectiveDelta);
  if (gameState === 'playing') {
    stage.update(delta);
    audio.updateMusicIntensity(stage.current);
  } else if (gameState === 'finale') {
    stage.update(delta);
    audio.updateMusicIntensity(stage.current);
  }
  player.update(effectiveDelta);
  checkCollisions();
  screenNuke.update(effectiveDelta);
  streakCallout.update(effectiveDelta);

  if (stage.current === 10 && stage10WipeProgress < 1)
    stage10WipeProgress = Math.min(1, stage10WipeProgress + delta / 1500);

  if (tutorialAllowsControl('baseDrop') && (justPressed['q'] || justPressed['Q'])) screenNuke.fire();
}

function render() {
  _syncPixiLayerModes();
  _setTitleWordmarkVisible(gameState === 'title');

  if (gameState === 'title') {
    pixiPost.setNearDeath(false);
    pixiPost.setFlowState(false);
    drawTitleScreen();
    return;
  }
  if (gameState === 'leaderboard') {
    pixiPost.setNearDeath(false);
    pixiPost.setFlowState(false);
    leaderboard.draw();
    return;
  }
  if (gameState === 'nameEntry') {
    pixiPost.setNearDeath(false);
    pixiPost.setFlowState(false);
    nameEntry.drawOverlay();
    return;
  }
  if (gameState === 'win') {
    pixiPost.setNearDeath(false);
    pixiPost.setFlowState(false);
    drawWinScreen();
    return;
  }
  if (gameState === 'devMenu') {
    pixiPost.setNearDeath(false);
    pixiPost.setFlowState(false);
    drawDevMenu();
    return;
  }

  if (player.dead && !player.deathPresentationPending) {
    pixiPost.setNearDeath(false);
    pixiPost.setFlowState(false);
    drawDeathScreen();
    return;
  }

  // Clear full canvas (panel area background)
  _drawNegativeSpaceBackdrop();

  // Play area background
  ctx.fillStyle = COLOR_BG;
  ctx.fillRect(PLAY_X, PLAY_Y, PLAY_W, PLAY_H);
  if (typeof reactiveGrid !== 'undefined') reactiveGrid.draw();
  starField.draw();
  _drawPlayfieldFog();

  // Play area border
  const stageColorBorder = STAGE_ENEMY_COLORS[Math.min(stage.current - 1, 9)];
  ctx.save();
  ctx.globalAlpha = 0.18;
  ctx.strokeStyle = stageColorBorder;
  ctx.lineWidth = 1;
  ctx.strokeRect(PLAY_X, PLAY_Y, PLAY_W, PLAY_H);
  ctx.restore();

  // Flow State world-state: energized border + edge strips
  if (player.flowStateActive) {
    const now = getNow();
    const odPulse = 0.6 + 0.4 * (Math.sin(now * 0.014) * 0.5 + 0.5);
    const flashBoost = player.flowStateActivationFlash > 0
      ? Math.pow(player.flowStateActivationFlash / 420, 1.5) * 0.5 : 0;

    // Energized border — stacked thin strokes, no shadowBlur
    ctx.save();
    ctx.lineJoin = 'miter';
    const borderAlpha = (0.5 + flashBoost) * odPulse;
    ctx.globalAlpha = borderAlpha * 0.9;
    ctx.strokeStyle = '#e040fb';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(PLAY_X, PLAY_Y, PLAY_W, PLAY_H);
    ctx.globalAlpha = borderAlpha * 0.4;
    ctx.strokeStyle = '#cc44ff';
    ctx.lineWidth = 6;
    ctx.strokeRect(PLAY_X, PLAY_Y, PLAY_W, PLAY_H);
    ctx.restore();

  }

  // Top stage strip — single 10-segment bar, current segment fills with timer
  if (gameState !== 'tutorial' && gameState !== 'finale') {
    const timeFrac = Math.max(0, Math.min(1, stage.timer / STAGE_DURATION));
    const timeLeft = Math.max(0, Math.ceil(stage.timer / 1000));
    const timerUrgent = timeLeft <= 5;
    const timerWarning = timeLeft <= 10;
    const timerPulse = timerUrgent ? (0.72 + 0.28 * (Math.sin(getNow() * 0.025) * 0.5 + 0.5)) : 1;
    const fillFrac = 1 - timeFrac; // current segment fills as time elapses
    const segCyan = '#31afd4';
    const segCyanBright = '#7ce0ff';
    const currentColor = timerUrgent ? '#ff5a44' : timerWarning ? '#ff9a5f' : segCyanBright;
    const currentGlowColor = timerUrgent ? '#ff5a44' : timerWarning ? '#ff9a5f' : segCyan;

    ctx.save();
    const stripInset = Math.max(8, PLAY_W * 0.025);
    const stripX = PLAY_X + stripInset;
    const stripY = PLAY_Y + 8;
    const stripW = PLAY_W - stripInset * 2;
    const stripH = 8;
    const segCount = 10;
    const segGap = 3;
    const segW = (stripW - segGap * (segCount - 1)) / segCount;
    const cur = Math.min(stage.current, segCount);

    for (let i = 0; i < segCount; i++) {
      const stageNum = i + 1;
      const sx = stripX + i * (segW + segGap);
      const isCurrent = stageNum === cur;
      const isPast = stageNum < cur;

      // Segment outline (always)
      ctx.globalAlpha = isCurrent ? 0.65 : isPast ? 0.55 : 0.30;
      ctx.shadowBlur = 0;
      ctx.strokeStyle = isCurrent ? currentGlowColor : segCyan;
      ctx.lineWidth = 1;
      ctx.strokeRect(sx + 0.5, stripY + 0.5, segW - 1, stripH - 1);

      if (isPast) {
        // Solid filled past stage
        ctx.globalAlpha = 0.65;
        ctx.shadowColor = segCyan;
        ctx.shadowBlur = 6;
        ctx.fillStyle = segCyan;
        ctx.fillRect(sx + 1, stripY + 1, segW - 2, stripH - 2);
      } else if (isCurrent) {
        // Fractional fill driven by elapsed timer
        const fw = (segW - 2) * fillFrac;
        if (fw > 0) {
          ctx.globalAlpha = timerUrgent ? timerPulse : 0.92;
          ctx.shadowColor = currentGlowColor;
          ctx.shadowBlur = timerUrgent ? 18 : 14;
          ctx.fillStyle = currentColor;
          ctx.fillRect(sx + 1, stripY + 1, fw, stripH - 2);
        }
      }
    }
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  // Cinematic stage-transition splash — center-screen "STAGE NN" pulse
  if (stage.stageSplashTimer > 0 && gameState !== 'tutorial') {
    const SPLASH_MS = stage.STAGE_SPLASH_MS || 1100;
    const elapsed = SPLASH_MS - stage.stageSplashTimer;
    const t = Math.max(0, Math.min(1, elapsed / SPLASH_MS));
    // Phases: fade-in/scale-up 0-0.23, hold 0.23-0.68, fade-out 0.68-1.0
    let alpha, scale;
    if (t < 0.23) {
      const p = t / 0.23;
      const ease = 1 - Math.pow(1 - p, 3);
      alpha = ease;
      scale = 0.78 + 0.22 * ease;
    } else if (t < 0.68) {
      alpha = 1;
      scale = 1.0;
    } else {
      const p = (t - 0.68) / 0.32;
      alpha = 1 - p;
      scale = 1.0 + 0.06 * p;
    }
    const cx = PLAY_X + PLAY_W * 0.5;
    const cy = PLAY_Y + PLAY_H * 0.5;
    const text = `STAGE ${String(stage.stageSplashNum || stage.current).padStart(2, '0')}`;
    const baseSize = 88;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `${baseSize}px ${TITLE_WORDMARK_FONT}`;
    // Soft glow halo behind
    ctx.globalAlpha = alpha * 0.55;
    ctx.shadowColor = '#fb29fd';
    ctx.shadowBlur = 38;
    ctx.fillStyle = '#fb29fd';
    ctx.fillText(text, 0, 0);
    // Crisp white core
    ctx.globalAlpha = alpha;
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 14;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(text, 0, 0);
    ctx.restore();
  }

  // Flow State peripheral charge indicator — slanted cell, bottom-center of playfield
  // Coords hoisted so the LASER label can anchor to the bar's right edge
  const fsW = 320;
  const fsH = 18;
  const fsSkew = 10; // horizontal skew per side for slanted-cell look
  const fsCx = PLAY_X + PLAY_W * 0.5;
  const fsY = PLAY_Y + PLAY_H - 34;
  const fsLeftX = fsCx - fsW * 0.5;

  if (gameState !== 'tutorial') {
    if (player.flowStateActive) {
      // Active state: solid magenta burn-down timer (drains left→right)
      const frac = Math.max(0, Math.min(1, player.flowStateTimer / player.FLOW_STATE_DURATION));

      ctx.save();

      // Outline
      ctx.globalAlpha = 0.95;
      ctx.shadowColor = '#fb29fd';
      ctx.shadowBlur = 10;
      ctx.strokeStyle = '#ff5fff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(fsLeftX + fsSkew, fsY);
      ctx.lineTo(fsLeftX + fsW, fsY);
      ctx.lineTo(fsLeftX + fsW - fsSkew, fsY + fsH);
      ctx.lineTo(fsLeftX, fsY + fsH);
      ctx.closePath();
      ctx.stroke();

      // Burn-down fill
      if (frac > 0) {
        const fillW = (fsW - 4) * frac;
        if (fillW >= fsSkew + 2) {
          ctx.globalAlpha = 0.92;
          ctx.shadowColor = '#fb29fd';
          ctx.shadowBlur = 10;
          ctx.fillStyle = '#fb29fd';
          ctx.beginPath();
          ctx.moveTo(fsLeftX + fsSkew + 2, fsY + 2);
          ctx.lineTo(fsLeftX + 2 + fillW, fsY + 2);
          ctx.lineTo(fsLeftX + 2 + fillW - fsSkew, fsY + fsH - 2);
          ctx.lineTo(fsLeftX + 2, fsY + fsH - 2);
          ctx.closePath();
          ctx.fill();
        }
      }
      ctx.restore();
    } else {
      // Charging state: existing gradient + softened ready-pulse
      const fsFrac = Math.max(0, Math.min(1, player.flowStateCharge / player.FLOW_STATE_MAX));
      const fsFull = fsFrac >= 1;
      const fsPulse = fsFull ? (0.89 + 0.11 * (Math.sin(getNow() * 0.018) * 0.5 + 0.5)) : 1;

      ctx.save();

      // Hairline outline (slanted parallelogram)
      ctx.globalAlpha = fsFull ? 0.95 * fsPulse : 0.55;
      ctx.shadowColor = fsFull ? '#fb29fd' : '#31afd4';
      ctx.shadowBlur = fsFull ? 10 : 6;
      ctx.strokeStyle = fsFull ? '#ff5fff' : '#7ce0ff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(fsLeftX + fsSkew, fsY);
      ctx.lineTo(fsLeftX + fsW, fsY);
      ctx.lineTo(fsLeftX + fsW - fsSkew, fsY + fsH);
      ctx.lineTo(fsLeftX, fsY + fsH);
      ctx.closePath();
      ctx.stroke();

      // Gradient fill (cyan -> magenta as charge climbs)
      if (fsFrac > 0) {
        const fillW = (fsW - 4) * fsFrac;
        if (fillW >= fsSkew + 2) {
          const grad = ctx.createLinearGradient(fsLeftX, 0, fsLeftX + fsW, 0);
          grad.addColorStop(0, '#31afd4');
          grad.addColorStop(0.55, '#7ce0ff');
          grad.addColorStop(1, '#fb29fd');
          ctx.globalAlpha = fsFull ? 0.92 * fsPulse : 0.85;
          ctx.shadowColor = fsFull ? '#fb29fd' : '#31afd4';
          ctx.shadowBlur = fsFull ? 9 : 8;
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.moveTo(fsLeftX + fsSkew + 2, fsY + 2);
          ctx.lineTo(fsLeftX + 2 + fillW, fsY + 2);
          ctx.lineTo(fsLeftX + 2 + fillW - fsSkew, fsY + fsH - 2);
          ctx.lineTo(fsLeftX + 2, fsY + fsH - 2);
          ctx.closePath();
          ctx.fill();
        }
      }
      ctx.restore();
    }
  }

  // Bottom laser fuel bar — thin baseline strip, only renders when alt-fire active
  {
    const botBarInset = Math.max(8, PLAY_W * 0.025);
    const botBarX = PLAY_X + botBarInset;
    const botBarY = PLAY_Y + PLAY_H - 13;
    const botBarW = PLAY_W - botBarInset * 2;
    const botBarH = 3;

    const altActive = !!player.altFireType;
    const altLabel = 'LASER';
    const altColor = '#39ff14';
    const altFrac = Math.max(0, player.laserFuel / player.LASER_MAX_FUEL);

    ctx.save();
    if (altActive) {
      ctx.globalAlpha = 0.12;
      ctx.fillStyle = '#ffffff';
      ctx.shadowBlur = 0;
      ctx.fillRect(botBarX, botBarY, botBarW, botBarH);

      if (altFrac > 0) {
        const altFillW = botBarW * altFrac;
        ctx.globalAlpha = 0.6;
        ctx.fillStyle = altColor;
        ctx.shadowColor = altColor;
        ctx.shadowBlur = 5;
        ctx.fillRect(botBarX, botBarY, altFillW, botBarH);
      }

      // Small LASER label, anchored to the right of the FlowState bar
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.font = `bold 11px ${UI_DISPLAY_FONT}`;
      ctx.globalAlpha = 0.88;
      ctx.shadowColor = altColor;
      ctx.shadowBlur = 7;
      ctx.fillStyle = altColor;
      ctx.fillText(altLabel, fsLeftX + fsW + 7, fsY + fsH * 0.5);
    }

    ctx.restore();
  }
  // Clip all game entities to the play area
  ctx.save();
  ctx.beginPath();
  ctx.rect(PLAY_X, PLAY_Y, PLAY_W, PLAY_H);
  ctx.clip();

  if (!paused && gameState !== 'tutorial' && stage.shakeTimer > 0 && stage.shakeIntensity > 0) {
    pixiPost.triggerShake(stage.shakeIntensity);
  }

  shards.draw();
  burstParticles.draw();
  hitSparks.draw();
  fragments.draw();
  smokeParticles.draw();
  impactFX.draw();
  pickups.draw();
  bullets.draw();
  enemyBullets.draw();
  drone.draw();
  screenNuke.draw();
  turretIndicators.draw();

  ctx.restore(); // end clip

  // Hit flash — clipped to play area
  if (player.hitFlashTimer > 0) {
    const t = player.hitFlashTimer / player.HIT_FLASH_MS;
    ctx.save();
    ctx.globalAlpha = t * 0.55;
    ctx.fillStyle = '#cc0011';
    ctx.fillRect(PLAY_X, PLAY_Y, PLAY_W, PLAY_H);
    ctx.restore();
  }

  _drawNearDeathVignette();

  // Bloom is now handled by PixiJS GPU post-processing (pixi-post.js)

  // Activation burst — screen-edge rim pulse + soft center wash (premium moment)
  if (player.flowStateActivationFlash > 0) {
    const raw = player.flowStateActivationFlash / 420;
    const t = Math.pow(raw, 1.6); // ease-out, strongest at activation
    const edge = Math.max(90, Math.min(190, canvas.width * 0.115));
    const rimA   = `rgba(204, 68, 255, ${0.70 * t})`;
    const rimMid = `rgba(168, 85, 247, ${0.32 * t})`;
    const rimEnd = 'rgba(88, 38, 196, 0)';

    ctx.save();
    // Left rim
    const lGrad = ctx.createLinearGradient(0, 0, edge, 0);
    lGrad.addColorStop(0, rimA);
    lGrad.addColorStop(0.5, rimMid);
    lGrad.addColorStop(1, rimEnd);
    ctx.fillStyle = lGrad;
    ctx.fillRect(0, 0, edge, canvas.height);
    // Right rim
    const rGrad = ctx.createLinearGradient(canvas.width, 0, canvas.width - edge, 0);
    rGrad.addColorStop(0, rimA);
    rGrad.addColorStop(0.5, rimMid);
    rGrad.addColorStop(1, rimEnd);
    ctx.fillStyle = rGrad;
    ctx.fillRect(canvas.width - edge, 0, edge, canvas.height);
    // Top rim
    const tGrad = ctx.createLinearGradient(0, 0, 0, edge);
    tGrad.addColorStop(0, rimA);
    tGrad.addColorStop(0.5, rimMid);
    tGrad.addColorStop(1, rimEnd);
    ctx.fillStyle = tGrad;
    ctx.fillRect(0, 0, canvas.width, edge);
    // Bottom rim
    const bGrad = ctx.createLinearGradient(0, canvas.height, 0, canvas.height - edge);
    bGrad.addColorStop(0, rimA);
    bGrad.addColorStop(0.5, rimMid);
    bGrad.addColorStop(1, rimEnd);
    ctx.fillStyle = bGrad;
    ctx.fillRect(0, canvas.height - edge, canvas.width, edge);
    // Soft unifying center wash — much dimmer than the old flat flash
    ctx.globalAlpha = t * 0.13;
    ctx.fillStyle = '#cc44ff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
  }

  pixiPost.setNearDeath(player.lives === 1 && !player.dead);
  drawHUD();
  streakCallout.draw();
  if (gameState === 'tutorial') tutorial.draw();
  if (paused) drawPauseMenu();

  if (stage.current === 10 && stage10WipeProgress > 0) {
    const wipeY = PLAY_Y + PLAY_H * stage10WipeProgress;
    const wipedH = wipeY - PLAY_Y;
    ctx.save();
    // Greyscale the wiped region
    ctx.globalCompositeOperation = 'saturation';
    ctx.fillStyle = '#808080';
    ctx.fillRect(PLAY_X, PLAY_Y, PLAY_W, wipedH);
    ctx.restore();
    // Glowing wipe edge line
    if (stage10WipeProgress < 1) {
      ctx.save();
      ctx.globalCompositeOperation = 'source-over';
      const grad = ctx.createLinearGradient(0, wipeY - 6, 0, wipeY + 6);
      grad.addColorStop(0, 'rgba(255,255,255,0)');
      grad.addColorStop(0.5, 'rgba(255,255,255,0.95)');
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(PLAY_X, wipeY - 6, PLAY_W, 12);
      ctx.restore();
    }

    // Redraw kamikazes over the greyscale wipe — they always stay red
    const activeKamikazes = shards.pool.filter(s => s.isKamikaze);
    if (activeKamikazes.length > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(PLAY_X, PLAY_Y, PLAY_W, PLAY_H);
      ctx.clip();
      activeKamikazes.forEach(s => {
        const drawColor = s.flashTimer > 0 ? '#ffffff' : s.color;
        const facingAngle = Math.atan2(s.vy, s.vx);
        const flicker = 0.75 + 0.25 * Math.sin(getNow() * 0.025 + s.x * 0.01);
        ctx.save();
        ctx.translate(s.x, s.y);
        ctx.rotate(facingAngle);
        // Bloom
        ctx.globalAlpha = 0.1 * flicker;
        setGlow(drawColor, 28);
        ctx.fillStyle = drawColor;
        ctx.beginPath();
        s.pts.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
        ctx.closePath();
        ctx.fill();
        // Core outline
        ctx.globalAlpha = 0.62 * flicker;
        setGlow(drawColor, 18);
        ctx.lineWidth = 2.8;
        ctx.strokeStyle = drawColor;
        ctx.stroke();
        // Inner bright line
        ctx.globalAlpha = 0.9 * flicker;
        setGlow(drawColor, 12);
        ctx.lineWidth = 1.2;
        ctx.stroke();
        ctx.restore();
      });
      ctx.restore();
    }
  }
}

// --- Dev Mode ---
let devKeyBuffer = [];
let devFastStage = false;

function _restartFromEndScreen() {
  startScreenTransition('fade', () => {
    _resetAllState();
    gameState = 'playing';
    endScreenSelection = 0;
    endScreenSelectionChangedAt = getNow();
    audio.play('menuConfirm');
    audio.playMusic('gameplay');
  });
}

function _goToTitleFromEndScreen() {
  startScreenTransition('pixelate', () => {
    _resetAllState();
    gameState = 'title';
    titleIntroT = 0; titleIntroLive = true; titleSnapFired = false; titleSnapDecay = 0;
    endScreenSelection = 0;
    endScreenSelectionChangedAt = getNow();
    delete justPressed['Enter'];
    delete justPressed[' '];
    audio.play('menuSelect');
    audio.playMusic('title');
  });
}

function _adjustPauseMusicVolume(delta) {
  let vol = parseInt(localStorage.getItem('drone_music_vol') || '20', 10);
  vol = Math.max(0, Math.min(100, vol + delta));
  localStorage.setItem('drone_music_vol', vol.toString());
  localStorage.setItem('drone_music_on', vol > 0 ? '1' : '0');
  audio.setMusicVolume(vol / 100);
  audio.play('menuSelect');
}

function _activatePauseItem(index, clickX = null) {
  pauseSel = index;
  const selItem = PAUSE_ITEMS[index];
  if (!selItem) return;

  if (selItem === 'MUSIC VOL' && typeof clickX === 'number') {
    const target = getPauseMenuClickTargets().find(entry => entry.index === index);
    if (target) {
      const leftZone = target.x + target.width * 0.32;
      const rightZone = target.x + target.width * 0.68;
      if (clickX < leftZone) {
        _adjustPauseMusicVolume(-5);
        return;
      }
      if (clickX > rightZone) {
        _adjustPauseMusicVolume(5);
        return;
      }
    }
  }

  audio.play('menuConfirm');
  if (selItem === 'RESUME') {
    paused = false;
    if (typeof pixiPost !== 'undefined') pixiPost.setPaused(false);
    return;
  }
  if (selItem === 'SFX') {
    let on = localStorage.getItem('drone_sfx_on') !== '0';
    on = !on;
    localStorage.setItem('drone_sfx_on', on ? '1' : '0');
    audio.setSfxVolume(on ? 1.0 : 0);
    return;
  }
  if (selItem === 'MUSIC VOL') {
    let vol = parseInt(localStorage.getItem('drone_music_vol') || '20', 10);
    vol = vol > 0 ? 0 : 10;
    localStorage.setItem('drone_music_vol', vol.toString());
    localStorage.setItem('drone_music_on', vol > 0 ? '1' : '0');
    audio.setMusicVolume(vol / 100);
    return;
  }
  if (selItem === 'HOME') {
    startScreenTransition('fade', () => {
      paused = false;
      pauseSel = 0;
      if (typeof pixiPost !== 'undefined') pixiPost.setPaused(false);
      gameState = 'title';
      titleIntroT = 0; titleIntroLive = true; titleSnapFired = false; titleSnapDecay = 0;
      audio.playMusic('title');
      delete justPressed['Enter'];
    });
  }
}

function _returnFromLeaderboard() {
  startScreenTransition('fade', () => {
    audio.play('menuConfirm');
    audio.playMusic('title');
    gameState = 'title';
    titleIntroT = 0; titleIntroLive = true; titleSnapFired = false; titleSnapDecay = 0;
  });
}

function _confirmNameEntry() {
  if (nameEntry.name.length === 0) return;
  if (containsBadWord(nameEntry.name)) {
    nameEntry.rejectTimer = 2000;
    return;
  }
  writePlayerName(nameEntry.name);
  const submission = getQueuedLeaderboardRun();
  leaderboard.submitMessage = 'SUBMITTING SCORE...';
  leaderboard.submitOk = true;
  startScreenTransition('fade', () => {
    gameState = 'leaderboard';
    audio.play('menuConfirm');
    leaderboard.submitScore(submission.score, submission.kills).then(ok => {
      if (ok) clearLeaderboardSubmission(submission);
    });
    leaderboard.fetchScores();
  });
}

window.addEventListener('keydown', e => {
  if (gameState !== 'title') return;
  devKeyBuffer.push(e.key.toLowerCase());
  if (devKeyBuffer.length > 4) devKeyBuffer.shift();
  const devCode = devKeyBuffer.join('');
  if (devCode.endsWith('dev') || devCode.endsWith('devi')) {
    startScreenTransition('fade', () => {
      gameState = 'devMenu';
      devKeyBuffer = [];
      audio.play('menuConfirm');
    });
  }
});

window.addEventListener('keydown', e => {
  if (gameState !== 'devMenu') return;
  if (e.key === 'Escape') {
    startScreenTransition('fade', () => {
      gameState = 'title';
      titleIntroT = 0; titleIntroLive = true; titleSnapFired = false; titleSnapDecay = 0;
      audio.play('menuSelect');
      audio.playMusic('title');
    });
  }
  if (/^[1-9]$/.test(e.key)) devJumpToStage(parseInt(e.key, 10));
  if (e.key === '0') devJumpToStage(10);
  if (e.key === 'f' || e.key === 'F') {
    devFastStage = !devFastStage;
    audio.play('menuSelect');
  }
  if (e.key === 't' || e.key === 'T') startTutorialFromDevMenu();
  if (e.key === 'g' || e.key === 'G') devPreviewScreen('death');
  if (e.key === 'w' || e.key === 'W') devPreviewScreen('win');
  if (e.key === 'l' || e.key === 'L') devPreviewScreen('leaderboard');
  if (e.key === 'p' || e.key === 'P') devPreviewScreen('pause');
});

function _prepDevPreviewBase() {
  _resetAllState();
  paused = false;
  pauseSel = 0;
  endScreenSelection = 0;
  endScreenSelectionChangedAt = getNow();
  if (typeof pixiPost !== 'undefined') {
    pixiPost.setPaused(false);
    pixiPost.setNearDeath(false);
    pixiPost.setFlowState(false);
  }
}

function devPreviewScreen(screen) {
  startScreenTransition('fade', () => {
    _prepDevPreviewBase();

    if (screen === 'death') {
      gameState = 'playing';
      stage.current = Math.max(1, Math.min(10, furthestStage || 5));
      COLOR_BG = STAGE_BG_COLORS[stage.current - 1];
      if (typeof pixiPost !== 'undefined') pixiPost.setStage(stage.current);
      player.score = Math.max(save.highScore || 0, 28450);
      stage.totalKills = 312;
      player.dead = true;
      player.deathPresentationPending = false;
      player.deathMessage = 'DEV PREVIEW';
      audio.playMusic('death');
      return;
    }

    if (screen === 'win') {
      gameState = 'win';
      stage.current = 10;
      COLOR_BG = STAGE_BG_COLORS[9];
      if (typeof pixiPost !== 'undefined') pixiPost.setStage(10);
      player.score = Math.max(save.highScore || 0, 58210);
      stage.totalKills = 640;
      missionCompleteSequence.startedAt = getNow() - 2400;
      missionCompleteSequence.heroX = PLAY_X + PLAY_W * 0.5;
      audio.playMusic('win');
      return;
    }

    if (screen === 'leaderboard') {
      gameState = 'leaderboard';
      leaderboard.submitMessage = '';
      leaderboard.submitOk = false;
      leaderboard.fetchScores();
      audio.playMusic('title');
      return;
    }

    if (screen === 'pause') {
      gameState = 'playing';
      stage.current = Math.max(1, Math.min(10, furthestStage || 3));
      COLOR_BG = STAGE_BG_COLORS[stage.current - 1];
      if (typeof pixiPost !== 'undefined') pixiPost.setStage(stage.current);
      player.score = 12400;
      stage.totalKills = 96;
      paused = true;
      pauseSel = 0;
      if (typeof pixiPost !== 'undefined') pixiPost.setPaused(true);
      audio.playMusic('gameplay');
    }
  });
}

function devJumpToStage(n) {
  startScreenTransition('fade', () => {
    _resetAllState();
    paused = false;
    if (typeof pixiPost !== 'undefined') pixiPost.setPaused(false);
    stage.current = n;
    COLOR_BG = STAGE_BG_COLORS[n - 1];
    if (typeof pixiPost !== 'undefined') pixiPost.setStage(n);
    if (devFastStage) stage.timer = 8000;
    gameState = 'playing';
    audio.playMusic('gameplay');
    audio.updateMusicIntensity(n);
  });
}

canvas.addEventListener('click', e => {
  if (gameState === 'title') {
    const layout = getTitleScreenLayout();
    const actionFontSize = Math.round(Math.max(28, Math.min(42, 42 * layout.layoutScale)));
    const startRunWidth = getTitleOptionWidth('START RUN', actionFontSize);
    const tutorialWidth = getTitleOptionWidth('TUTORIAL', actionFontSize);
    const leaderboardWidth = getTitleOptionWidth('LEADERBOARD', actionFontSize);

    const hitPaddingX = 32 * layout.layoutScale;
    const hitPaddingY = 22 * layout.layoutScale;
    const inStartRun =
      Math.abs(e.offsetX - canvas.width / 2) <= (startRunWidth / 2 + hitPaddingX) &&
      Math.abs(e.offsetY - layout.startRunY) <= hitPaddingY;
    const inTutorial =
      Math.abs(e.offsetX - canvas.width / 2) <= (tutorialWidth / 2 + hitPaddingX) &&
      Math.abs(e.offsetY - layout.tutorialY) <= hitPaddingY;
    const inLeaderboard =
      Math.abs(e.offsetX - canvas.width / 2) <= (leaderboardWidth / 2 + hitPaddingX) &&
      Math.abs(e.offsetY - layout.leaderboardY) <= hitPaddingY;

    if (inLeaderboard) {
      titleSelection = 2;
      titleSelectionChangedAt = getNow();
      audio.play('menuConfirm');
      openLeaderboardFromTitle();
    } else if (inTutorial) {
      titleSelection = 1;
      titleSelectionChangedAt = getNow();
      audio.play('menuConfirm');
      startTutorialRun();
    } else if (inStartRun) {
      titleSelection = 0;
      titleSelectionChangedAt = getNow();
      audio.play('menuConfirm');
      startGame();
    }
  }
  if (gameState === 'leaderboard') {
    const target = getClickTargetAt(getLeaderboardClickTargets(), e.offsetX, e.offsetY);
    if (target?.action === 'return') _returnFromLeaderboard();
  }
  if (gameState === 'nameEntry') {
    const target = getClickTargetAt(getNameEntryClickTargets(), e.offsetX, e.offsetY);
    if (target?.action === 'confirm') _confirmNameEntry();
    else if (target?.action === 'delete' && nameEntry.name.length > 0) {
      nameEntry.name = nameEntry.name.slice(0, -1);
      nameEntry.rejectTimer = 0;
      audio.play('menuSelect');
    }
  }
  if (paused && gameState === 'playing') {
    const target = getClickTargetAt(getPauseMenuClickTargets(), e.offsetX, e.offsetY);
    if (target) _activatePauseItem(target.index, e.offsetX);
  }
  if (player.dead && gameState !== 'nameEntry') {
    const target = getClickTargetAt(getDeathScreenClickTargets(), e.offsetX, e.offsetY);
    if (target) {
      endScreenSelection = target.selection;
      endScreenSelectionChangedAt = getNow();
      if (target.action === 'restart') _restartFromEndScreen();
      else if (target.action === 'menu') _goToTitleFromEndScreen();
    }
  }
  if (gameState === 'win') {
    const target = getClickTargetAt(getWinScreenClickTargets(), e.offsetX, e.offsetY);
    if (target) {
      endScreenSelection = target.selection;
      endScreenSelectionChangedAt = getNow();
      if (target.action === 'restart') _restartFromEndScreen();
      else if (target.action === 'menu') _goToTitleFromEndScreen();
    }
  }
  if (gameState === 'devMenu') handleDevMenuClick(e);
});

window.addEventListener('keydown', e => {
  const onEndScreen = (player.dead || gameState === 'win') && gameState !== 'nameEntry';
  if (!onEndScreen) return;

  if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
    endScreenSelection = (endScreenSelection - 1 + 2) % 2;
    endScreenSelectionChangedAt = getNow();
    audio.play('menuSelect');
  }
  if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
    endScreenSelection = (endScreenSelection + 1) % 2;
    endScreenSelectionChangedAt = getNow();
    audio.play('menuSelect');
  }
  if (e.key === 'Enter') {
    if (endScreenSelection === 0) _restartFromEndScreen();
    else _goToTitleFromEndScreen();
  }
  if ((e.key === 'r' || e.key === 'R')) {
    _restartFromEndScreen();
  }
  if ((e.key === 'm' || e.key === 'M')) {
    _goToTitleFromEndScreen();
  }
});

window.addEventListener('keydown', e => {
  if (gameState !== 'title') return;
  if (e.key === '7') {
    _resetAllState();
    player.score = 28450;
    stage.totalKills = 312;
    stage.current = 8;
    player.dead = true;
    player.deathMessage = 'SYSTEM FAILURE';
  }
  if (e.key === '8') {
    _resetAllState();
    player.score = 58210;
    stage.totalKills = 640;
    stage.current = 10;
    gameState = 'win';
    missionCompleteSequence.startedAt = getNow() - 2400;
    missionCompleteSequence.heroX = PLAY_X + PLAY_W * 0.5;
  }
});

let _titleMusicQueued = false;
function loop(timestamp) {
  if (!_titleMusicQueued && gameState === 'title') {
    _titleMusicQueued = true;
    audio.playMusic('title');
  }
  frameNow = timestamp;
  const delta = Math.min(timestamp - lastTime, 100);
  lastTime = timestamp;
  update(delta);
  render();
  pixiPost.render();
  for (const k in justPressed) delete justPressed[k];
  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
