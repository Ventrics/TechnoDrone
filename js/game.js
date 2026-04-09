window.addEventListener('keydown', e => {
  if (gameState !== 'playing' || player.dead) return;
  if (e.key === 'Escape') {
    paused = !paused;
    pauseSel = 0;
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
    if (PAUSE_ITEMS[pauseSel] === 'MUSIC VOL') {
      let vol = parseInt(localStorage.getItem('drone_music_vol') || '20', 10);
      vol = Math.max(0, vol - 5);
      localStorage.setItem('drone_music_vol', vol.toString());
      localStorage.setItem('drone_music_on', vol > 0 ? '1' : '0');
      audio.setMusicVolume(vol / 100);
      audio.play('menuSelect');
    }
  }
  
  if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
    if (PAUSE_ITEMS[pauseSel] === 'MUSIC VOL') {
      let vol = parseInt(localStorage.getItem('drone_music_vol') || '20', 10);
      vol = Math.min(100, vol + 5);
      localStorage.setItem('drone_music_vol', vol.toString());
      localStorage.setItem('drone_music_on', vol > 0 ? '1' : '0');
      audio.setMusicVolume(vol / 100);
      audio.play('menuSelect');
    }
  }

  if (e.key === 'Enter') {
    audio.play('menuConfirm');
    const selItem = PAUSE_ITEMS[pauseSel];
    if (selItem === 'RESUME') { 
      paused = false; 
    }
    if (selItem === 'SFX') { 
      let on = localStorage.getItem('drone_sfx_on') !== '0';
      on = !on;
      localStorage.setItem('drone_sfx_on', on ? '1' : '0');
      audio.setSfxVolume(on ? 1.0 : 0);
    }
    if (selItem === 'MUSIC VOL') { 
      let vol = parseInt(localStorage.getItem('drone_music_vol') || '20', 10);
      vol = vol > 0 ? 0 : 10;
      localStorage.setItem('drone_music_vol', vol.toString());
      localStorage.setItem('drone_music_on', vol > 0 ? '1' : '0');
      audio.setMusicVolume(vol / 100);
    }
    if (selItem === 'HOME') { 
      paused = false; 
      pauseSel = 0; 
      gameState = 'title'; 
      audio.playMusic('title'); 
      delete justPressed['Enter']; 
    }
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

function _buildNegativeSpaceBackdrop() {
  const bg = document.createElement('canvas');
  const active = document.createElement('canvas');
  bg.width = canvas.width;
  bg.height = canvas.height;
  active.width = canvas.width;
  active.height = canvas.height;
  const bctx = bg.getContext('2d');
  const actx = active.getContext('2d');

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

  actx.save();
  actx.beginPath();
  actx.rect(0, 0, active.width, active.height);
  actx.rect(PLAY_X, PLAY_Y, PLAY_W, PLAY_H);
  actx.clip('evenodd');

  const spacing = 20;
  for (let y = 8; y < active.height; y += spacing) {
    for (let x = 8; x < active.width; x += spacing) {
      if (x > PLAY_X && x < PLAY_X + PLAY_W && y > PLAY_Y && y < PLAY_Y + PLAY_H) {
        continue;
      }
      const t = Math.max(0, Math.min(1, (x / active.width) * 0.58 + (y / active.height) * 0.42));
      const r = Math.round(154 + (115 - 154) * t);
      const g = Math.round(102 + (44 - 102) * t);
      const b = Math.round(255 + (230 - 255) * t);
      const color = `rgba(${r},${g},${b},0.88)`;
      const idleColor = `rgba(${Math.round(r * 0.38)},${Math.round(g * 0.34)},${Math.round(b * 0.42)},0.28)`;
      const radius = 1.05 + (((x + y) / spacing) % 3) * 0.28;
      bctx.save();
      bctx.shadowColor = idleColor;
      bctx.shadowBlur = 4;
      bctx.fillStyle = idleColor;
      bctx.beginPath();
      bctx.arc(x, y, radius * 0.9, 0, Math.PI * 2);
      bctx.fill();
      bctx.restore();
      actx.save();
      actx.shadowColor = color;
      actx.shadowBlur = 14;
      actx.fillStyle = color;
      actx.beginPath();
      actx.arc(x, y, radius, 0, Math.PI * 2);
      actx.fill();
      actx.restore();
    }
  }

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
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, canvas.width, canvas.height);
    ctx.rect(PLAY_X, PLAY_Y, PLAY_W, PLAY_H);
    ctx.clip('evenodd');
    const cx = PLAY_X + PLAY_W * 0.5;
    const cy = PLAY_Y + PLAY_H * 0.5;
    const maxR = Math.hypot(Math.max(cx, canvas.width - cx), Math.max(cy, canvas.height - cy));
    const waveR = maxR * Math.max(0.001, _negativeSpaceFlowGlow);
    ctx.beginPath();
    ctx.arc(cx, cy, waveR, 0, Math.PI * 2);
    ctx.clip();
    ctx.globalAlpha = _negativeSpaceFlowGlow * 0.82;
    ctx.drawImage(_negativeSpaceBackdropActive, 0, 0);
    ctx.restore();
  }
}

function update(delta) {
  const backdropTarget = (gameState === 'playing' && !player.dead && player.flowStateActive) ? 1 : 0;
  const glowRate = delta / (backdropTarget > _negativeSpaceFlowGlow ? 260 : 420);
  _negativeSpaceFlowGlow += (backdropTarget - _negativeSpaceFlowGlow) * Math.min(1, glowRate);

  if (gameState === 'title') { updateTitle(delta); return; }
  if (gameState === 'leaderboard') { leaderboard.update(delta); return; }
  if (gameState === 'win') {
    starField.update(delta);
    drone.update(delta);
    return;
  }
  if (paused) { return; }

  if (player.dead) {
    if (gameState === 'nameEntry') nameEntry.update(delta);
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
      return (
        s.x > PLAY_X - 80 &&
        s.x < PLAY_X + PLAY_W + 80 &&
        s.y < PLAY_Y + PLAY_H + 120
      );
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
  if (gameState !== 'tutorial') {
    stage.update(delta);
    audio.updateMusicIntensity(stage.current);
  }
  player.update(effectiveDelta);
  checkCollisions();
  screenNuke.update(effectiveDelta);
  streakCallout.update(effectiveDelta);

  if (stage.current === 10 && stage10WipeProgress < 1)
    stage10WipeProgress = Math.min(1, stage10WipeProgress + delta / 1500);

  if (tutorialAllowsControl('nuke') && (justPressed['q'] || justPressed['Q'])) screenNuke.fire();
}

function render() {
  if (gameState === 'title') { drawTitleScreen(); return; }
  if (gameState === 'leaderboard') { leaderboard.draw(); return; }
  if (gameState === 'win') { drawWinScreen(); return; }
  if (gameState === 'devMenu') { drawDevMenu(); return; }

  if (player.dead) {
    if (gameState === 'nameEntry') {
      nameEntry.drawOverlay();
      return;
    }
    drawDeathScreen();
    return;
  }

  // Clear full canvas (panel area background)
  _drawNegativeSpaceBackdrop();

  // Play area background
  ctx.fillStyle = COLOR_BG;
  ctx.fillRect(PLAY_X, PLAY_Y, PLAY_W, PLAY_H);

  // Play area border
  const stageColorBorder = STAGE_ENEMY_COLORS[Math.min(stage.current - 1, 9)];
  ctx.save();
  ctx.globalAlpha = 0.18;
  ctx.strokeStyle = stageColorBorder;
  ctx.lineWidth = 1;
  ctx.strokeRect(PLAY_X, PLAY_Y, PLAY_W, PLAY_H);
  ctx.restore();

  const sideBarY = PLAY_Y + 10;
  const sideBarH = PLAY_H - 20;
  const odRailFrac = player.flowStateActive
    ? player.flowStateTimer / player.FLOW_STATE_DURATION
    : player.flowStateCharge / player.FLOW_STATE_MAX;
  const odRailActive = player.flowStateActive;
  const odRailColor = odRailActive ? '#e040fb' : '#8b5cf6';
  const odRailPulse = odRailActive ? (0.72 + 0.28 * (Math.sin(getNow() * 0.022) * 0.5 + 0.5)) : 1;
  ctx.save();
  ctx.globalAlpha = 0.14;
  ctx.fillStyle = '#ffffff';
  _roundRect(ctx, PLAY_X - 20, sideBarY, 12, sideBarH, 5);
  ctx.fill();
  if (odRailFrac > 0) {
    const fillH = sideBarH * Math.max(0, Math.min(1, odRailFrac));
    const fillY = sideBarY + sideBarH - fillH;
    ctx.globalAlpha = odRailActive ? odRailPulse : 0.88;
    setGlow(odRailColor, odRailActive ? 18 : 14);
    ctx.fillStyle = odRailColor;
    _roundRect(ctx, PLAY_X - 20, fillY, 12, fillH, 5);
    ctx.fill();
  }
  ctx.globalAlpha = 0.26;
  ctx.fillStyle = '#ffffff';
  _roundRect(ctx, PLAY_X - 16, sideBarY + 20, 2, Math.max(0, sideBarH - 40), 1);
  ctx.fill();

  ctx.globalAlpha = 0.14;
  ctx.fillStyle = '#ffffff';
  _roundRect(ctx, PLAY_X + PLAY_W + 8, sideBarY, 12, sideBarH, 5);
  ctx.fill();
  if (odRailFrac > 0) {
    const fillH = sideBarH * Math.max(0, Math.min(1, odRailFrac));
    const fillY = sideBarY + sideBarH - fillH;
    ctx.globalAlpha = odRailActive ? odRailPulse : 0.88;
    setGlow(odRailColor, odRailActive ? 18 : 14);
    ctx.fillStyle = odRailColor;
    _roundRect(ctx, PLAY_X + PLAY_W + 8, fillY, 12, fillH, 5);
    ctx.fill();
  }
  ctx.globalAlpha = 0.26;
  ctx.fillStyle = '#ffffff';
  _roundRect(ctx, PLAY_X + PLAY_W + 12, sideBarY + 20, 2, Math.max(0, sideBarH - 40), 1);
  ctx.fill();

  const flowStateLetters = ['F', 'L', 'O', 'W', ' ', 'S', 'T', 'A', 'T', 'E'];
  const flowStateTextX = PLAY_X - 38;
  const flowStateStartY = PLAY_Y + 92;
  const flowStateSpacing = 30;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 38px monospace';
  ctx.globalAlpha = odRailActive ? odRailPulse : 0.86;
  ctx.shadowColor = odRailColor;
  ctx.shadowBlur = odRailActive ? 18 : 12;
  ctx.fillStyle = '#ffffff';
  flowStateLetters.forEach((ch, idx) => {
    ctx.fillText(ch, flowStateTextX, flowStateStartY + idx * flowStateSpacing);
  });
  ctx.globalAlpha = odRailActive ? 0.2 : 0.14;
  ctx.shadowBlur = 0;
  ctx.fillStyle = odRailColor;
  flowStateLetters.forEach((ch, idx) => {
    ctx.fillText(ch, flowStateTextX, flowStateStartY + idx * flowStateSpacing - 1);
  });
  clearGlow();
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

  // Top entry highlight bar — a slim holographic lane marker that sits just
  // under the border so enemy spawns feel like they emerge from beneath it.
  const timeFrac = Math.max(0, Math.min(1, stage.timer / STAGE_DURATION));
  const timeLeft = Math.max(0, Math.ceil(stage.timer / 1000));
  const timerUrgent = timeLeft <= 5;
  const timerWarning = timeLeft <= 10;
  const timerPulse = timerUrgent ? (0.72 + 0.28 * (Math.sin(getNow() * 0.025) * 0.5 + 0.5)) : 1;
  const timerColor = timerUrgent ? '#ff5a44' : timerWarning ? '#ff9a5f' : stageColorBorder;
  ctx.save();
  const topBarInset = Math.max(8, PLAY_W * 0.025);
  const topBarX = PLAY_X + topBarInset;
  const topBarY = PLAY_Y + 8;
  const topBarW = PLAY_W - topBarInset * 2;
  const topBarH = 7;
  ctx.globalAlpha = 0.12;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(topBarX, topBarY, topBarW, topBarH);

  if (timeFrac > 0) {
    const fillW = topBarW * timeFrac;
    ctx.globalAlpha = timerUrgent ? timerPulse : 0.92;
    ctx.fillStyle = timerColor;
    ctx.shadowColor = timerColor;
    ctx.shadowBlur = timerUrgent ? 16 : 12;
    ctx.fillRect(topBarX, topBarY, fillW, topBarH);
  }

  ctx.globalAlpha = 0.18;
  ctx.fillStyle = '#ffffff';
  ctx.shadowBlur = 0;
  ctx.fillRect(topBarX + 22, topBarY + 1, Math.max(0, topBarW - 44), 1);

  const nextStageLabel = 'NEXT STAGE';
  const labelX = topBarX + topBarW * 0.5;
  const labelY = topBarY - 8;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.font = 'bold 17px monospace';
  ctx.globalAlpha = timerUrgent ? 0.98 : 0.82;
  ctx.shadowColor = timerColor;
  ctx.shadowBlur = timerUrgent ? 20 : 14;
  ctx.fillStyle = timerColor;
  ctx.fillText(nextStageLabel, labelX, labelY);
  ctx.globalAlpha = timerUrgent ? 0.45 : 0.3;
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#ffffff';
  ctx.fillText(nextStageLabel, labelX, labelY - 1);
  ctx.restore();

  // Bottom flow state bar — mirrors top timer bar
  {
    const botBarInset = Math.max(8, PLAY_W * 0.025);
    const botBarX = PLAY_X + botBarInset;
    const botBarY = PLAY_Y + PLAY_H - 13;
    const botBarW = PLAY_W - botBarInset * 2;
    const botBarH = 7;

    const altActive = !!player.altFireType;
    const altLabel = 'LASER';
    const altColor = '#39ff14';
    const altFrac = Math.max(0, player.spreadFuel / player.SPREAD_MAX_FUEL);
    const altPulse = altActive ? (0.76 + 0.24 * (Math.sin(getNow() * 0.02) * 0.5 + 0.5)) : 1;
    const altBarY = botBarY;
    const altLabelY = altBarY - 8;

    ctx.save();
    if (altActive) {
      ctx.globalAlpha = 0.12;
      ctx.fillStyle = '#ffffff';
      ctx.shadowBlur = 0;
      ctx.fillRect(botBarX, altBarY, botBarW, botBarH);

      if (altFrac > 0) {
        const altFillW = botBarW * altFrac;
        ctx.globalAlpha = 0.92 * altPulse;
        ctx.fillStyle = altColor;
        ctx.shadowColor = altColor;
        ctx.shadowBlur = 16;
        ctx.fillRect(botBarX, altBarY, altFillW, botBarH);
      }

      ctx.globalAlpha = 0.18;
      ctx.fillStyle = '#ffffff';
      ctx.shadowBlur = 0;
      ctx.fillRect(botBarX + 22, altBarY + 1, Math.max(0, botBarW - 44), 1);

      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.font = 'bold 17px monospace';
      ctx.globalAlpha = 0.88;
      ctx.shadowColor = altColor;
      ctx.shadowBlur = 18;
      ctx.fillStyle = altColor;
      ctx.fillText(altLabel, botBarX + botBarW * 0.5, altLabelY);
      ctx.globalAlpha = 0.32;
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#ffffff';
      ctx.fillText(altLabel, botBarX + botBarW * 0.5, altLabelY - 1);
    }

    ctx.restore();
  }

  starField.draw();

  // Clip all game entities to the play area
  ctx.save();
  ctx.beginPath();
  ctx.rect(PLAY_X, PLAY_Y, PLAY_W, PLAY_H);
  ctx.clip();

  if (gameState !== 'tutorial' && stage.shakeTimer > 0 && stage.shakeIntensity > 0) {
    const sx = (Math.random() * 2 - 1) * stage.shakeIntensity;
    const sy = (Math.random() * 2 - 1) * stage.shakeIntensity;
    ctx.translate(sx, sy);
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

  bloomCtx.clearRect(0, 0, bloomCanvas.width, bloomCanvas.height);
  bloomCtx.save();
  bloomCtx.scale(0.5, 0.5);
  bloomCtx.globalAlpha = 0.9;
  for (let i = 0; i < bullets.pool.length; i++) {
    const b = bullets.pool[i];
    bloomCtx.fillStyle = b.flowState ? '#e040fb' : COLOR_PINK;
    bloomCtx.beginPath();
    bloomCtx.arc(b.x, b.y, b.flowState ? 5 : 3, 0, Math.PI * 2);
    bloomCtx.fill();
  }
  bloomCtx.globalAlpha = 0.28;
  for (let i = 0; i < shards.pool.length; i++) {
    const s = shards.pool[i];
    bloomCtx.fillStyle = s.color;
    bloomCtx.beginPath();
    bloomCtx.arc(s.x, s.y, Math.max(0.1, (s.size || 0) * 0.25), 0, Math.PI * 2);
    bloomCtx.fill();
  }
  for (let i = 0; i < fragments.pool.length; i++) {
    const f = fragments.pool[i];
    bloomCtx.globalAlpha = f.alpha * 0.5;
    bloomCtx.fillStyle = f.color;
    bloomCtx.beginPath();
    bloomCtx.arc(f.x, f.y, Math.max(0.1, (f.size || 0) * 0.4), 0, Math.PI * 2);
    bloomCtx.fill();
  }
  {
    // Tip is at top of sprite (rotated -PI/2 + tilt)
    const tipAngle = -Math.PI / 2 + drone.tilt;
    const tx = drone.x + 22 * Math.cos(tipAngle);
    const ty = drone.y + 22 * Math.sin(tipAngle);
    bloomCtx.globalAlpha = player.flowStateActive ? 0.95 : 0.85;
    bloomCtx.fillStyle = player.flowStateActive ? '#e040fb' : COLOR_PINK;
    bloomCtx.beginPath();
    bloomCtx.arc(tx, ty, player.flowStateActive ? 5 : 4, 0, Math.PI * 2);
    bloomCtx.fill();
  }
  bloomCtx.restore();

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 0.5;
  ctx.filter = 'blur(10px)';
  ctx.drawImage(bloomCanvas, 0, 0, canvas.width, canvas.height);
  ctx.filter = 'none';
  ctx.restore();

  stage.drawFlash();

  // Activation flash — brief full-canvas magenta pulse on Flow State start
  if (player.flowStateActivationFlash > 0) {
    const t = Math.pow(player.flowStateActivationFlash / 420, 2);
    ctx.save();
    ctx.globalAlpha = t * 0.28;
    ctx.fillStyle = '#cc44ff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
  }

  drawCenterWatermark();
  drawVignetteAndScanlines();
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
  }
}

// --- Dev Mode ---
let devKeyBuffer = [];
let devFastStage = false;

function _restartFromEndScreen() {
  _resetAllState();
  gameState = 'playing';
  endScreenSelection = 0;
  endScreenSelectionChangedAt = getNow();
  audio.play('menuConfirm');
  audio.playMusic('gameplay');
}

function _goToTitleFromEndScreen() {
  _resetAllState();
  gameState = 'title';
  endScreenSelection = 0;
  endScreenSelectionChangedAt = getNow();
  delete justPressed['Enter'];
  delete justPressed[' '];
  audio.play('menuSelect');
  audio.playMusic('title');
}

window.addEventListener('keydown', e => {
  if (gameState !== 'title') return;
  devKeyBuffer.push(e.key.toLowerCase());
  if (devKeyBuffer.length > 3) devKeyBuffer.shift();
  if (devKeyBuffer.join('') === 'dev') {
    gameState = 'devMenu';
    devKeyBuffer = [];
    audio.play('menuConfirm');
  }
});

window.addEventListener('keydown', e => {
  if (gameState !== 'devMenu') return;
  if (e.key === 'Escape') { gameState = 'title'; audio.play('menuSelect'); }
});

function devJumpToStage(n) {
  _resetAllState();
  stage.current = n;
  COLOR_BG = STAGE_BG_COLORS[n - 1];
  if (devFastStage) stage.timer = 8000;
  gameState = 'playing';
  audio.playMusic('gameplay');
  audio.updateMusicIntensity(n);
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
      gameState = 'leaderboard';
      leaderboard.fetchScores();
    } else if (inTutorial) {
      titleSelection = 1;
      titleSelectionChangedAt = getNow();
      audio.play('menuConfirm');
      tutorial.start();
      gameState = 'tutorial';
      audio.playMusic('gameplay');
    } else if (inStartRun) {
      titleSelection = 0;
      titleSelectionChangedAt = getNow();
      audio.play('menuConfirm');
      startGame();
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
  for (const k in justPressed) delete justPressed[k];
  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
