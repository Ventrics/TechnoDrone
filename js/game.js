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
    if (PAUSE_ITEMS[pauseSel] === 'MASTER VOL') {
      let vol = parseInt(localStorage.getItem('drone_master_vol') || '100', 10);
      vol = Math.max(0, vol - 10);
      localStorage.setItem('drone_master_vol', vol.toString());
      audio.setMasterVolume(vol / 100);
      audio.play('menuSelect');
    }
  }
  
  if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
    if (PAUSE_ITEMS[pauseSel] === 'MASTER VOL') {
      let vol = parseInt(localStorage.getItem('drone_master_vol') || '100', 10);
      vol = Math.min(100, vol + 10);
      localStorage.setItem('drone_master_vol', vol.toString());
      audio.setMasterVolume(vol / 100);
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
    if (selItem === 'MUSIC') { 
      let on = localStorage.getItem('drone_music_on') !== '0';
      on = !on;
      localStorage.setItem('drone_music_on', on ? '1' : '0');
      audio.setMusicVolume(on ? 1.0 : 0);
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

let lastTime = 0;

function update(delta) {
  if (gameState === 'title') { updateTitle(delta); return; }
  if (gameState === 'leaderboard') { leaderboard.update(delta); return; }
  if (gameState === 'win') { return; }
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
      if (!s.isKamikaze) {
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
  bassPulse.update(effectiveDelta);
  screenNuke.update(effectiveDelta);
  streakCallout.update(effectiveDelta);

  if (justPressed['q'] || justPressed['Q']) screenNuke.fire();
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
  ctx.fillStyle = '#08080c';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

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
  ctx.save();
  ctx.globalAlpha = 0.72;
  setGlow(stageColorBorder, 14);
  ctx.fillStyle = stageColorBorder;
  _roundRect(ctx, PLAY_X - 8, sideBarY, 4, sideBarH, 3);
  ctx.fill();
  _roundRect(ctx, PLAY_X + PLAY_W + 4, sideBarY, 4, sideBarH, 3);
  ctx.fill();
  ctx.globalAlpha = 0.2;
  ctx.fillStyle = '#ffffff';
  _roundRect(ctx, PLAY_X - 7, sideBarY + 14, 1, Math.max(0, sideBarH - 28), 1);
  ctx.fill();
  _roundRect(ctx, PLAY_X + PLAY_W + 5, sideBarY + 14, 1, Math.max(0, sideBarH - 28), 1);
  ctx.fill();
  clearGlow();
  ctx.restore();

  // Overdrive world-state: energized border + edge strips
  if (player.overdriveActive) {
    const now = getNow();
    const odPulse = 0.6 + 0.4 * (Math.sin(now * 0.014) * 0.5 + 0.5);
    const flashBoost = player.overdriveActivationFlash > 0
      ? Math.pow(player.overdriveActivationFlash / 420, 1.5) * 0.5 : 0;

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
  const topBarInset = Math.max(18, PLAY_W * 0.06);
  const topBarX = PLAY_X + topBarInset;
  const topBarY = PLAY_Y + 8;
  const topBarW = PLAY_W - topBarInset * 2;
  const topBarH = 5;
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
  ctx.fillRect(topBarX + 18, topBarY + 1, Math.max(0, topBarW - 36), 1);

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

  // Bottom overdrive bar — mirrors top timer bar
  {
    const odFrac = player.overdriveActive
      ? player.overdriveTimer / player.OVERDRIVE_DURATION
      : player.overdriveCharge / player.OVERDRIVE_MAX;
    const odActive = player.overdriveActive;
    const odColor = odActive ? '#e040fb' : '#8b5cf6';
    const odPulse = odActive ? (0.72 + 0.28 * (Math.sin(getNow() * 0.022) * 0.5 + 0.5)) : 1;
    const botBarInset = Math.max(18, PLAY_W * 0.06);
    const botBarX = PLAY_X + botBarInset;
    const botBarY = PLAY_Y + PLAY_H - 13;
    const botBarW = PLAY_W - botBarInset * 2;
    const botBarH = 5;

    ctx.save();
    // Track
    ctx.globalAlpha = 0.12;
    ctx.fillStyle = '#ffffff';
    ctx.shadowBlur = 0;
    ctx.fillRect(botBarX, botBarY, botBarW, botBarH);

    // Fill
    if (odFrac > 0) {
      const fillW = botBarW * odFrac;
      ctx.globalAlpha = odPulse * (odActive ? 0.95 : 0.80);
      ctx.fillStyle = odColor;
      ctx.shadowColor = odColor;
      ctx.shadowBlur = odActive ? 16 : 8;
      ctx.fillRect(botBarX, botBarY, fillW, botBarH);
    }

    // Highlight line
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = '#ffffff';
    ctx.shadowBlur = 0;
    ctx.fillRect(botBarX + 18, botBarY + 1, Math.max(0, botBarW - 36), 1);

    const overdriveLabel = 'OVERDRIVE';
    const odLabelX = botBarX + botBarW * 0.5;
    const odLabelY = botBarY + botBarH + 18;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.font = 'bold 17px monospace';
    ctx.globalAlpha = odActive ? odPulse : 0.82;
    ctx.shadowColor = odColor;
    ctx.shadowBlur = odActive ? 20 : 14;
    ctx.fillStyle = odColor;
    ctx.fillText(overdriveLabel, odLabelX, odLabelY);
    ctx.globalAlpha = odActive ? 0.45 : 0.3;
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(overdriveLabel, odLabelX, odLabelY - 1);
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
  bassPulse.draw();
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
    bloomCtx.fillStyle = b.overdriving ? '#e040fb' : COLOR_PINK;
    bloomCtx.beginPath();
    bloomCtx.arc(b.x, b.y, b.overdriving ? 5 : 3, 0, Math.PI * 2);
    bloomCtx.fill();
  }
  bloomCtx.globalAlpha = 0.28;
  for (let i = 0; i < shards.pool.length; i++) {
    const s = shards.pool[i];
    bloomCtx.fillStyle = s.color;
    bloomCtx.beginPath();
    bloomCtx.arc(s.x, s.y, s.size * 0.25, 0, Math.PI * 2);
    bloomCtx.fill();
  }
  for (let i = 0; i < fragments.pool.length; i++) {
    const f = fragments.pool[i];
    bloomCtx.globalAlpha = f.alpha * 0.5;
    bloomCtx.fillStyle = f.color;
    bloomCtx.beginPath();
    bloomCtx.arc(f.x, f.y, f.size * 0.4, 0, Math.PI * 2);
    bloomCtx.fill();
  }
  {
    // Tip is at top of sprite (rotated -PI/2 + tilt)
    const tipAngle = -Math.PI / 2 + drone.tilt;
    const tx = drone.x + 22 * Math.cos(tipAngle);
    const ty = drone.y + 22 * Math.sin(tipAngle);
    bloomCtx.globalAlpha = player.overdriveActive ? 0.95 : 0.85;
    bloomCtx.fillStyle = player.overdriveActive ? '#e040fb' : COLOR_PINK;
    bloomCtx.beginPath();
    bloomCtx.arc(tx, ty, player.overdriveActive ? 5 : 4, 0, Math.PI * 2);
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

  // Activation flash — brief full-canvas magenta pulse on Overdrive start
  if (player.overdriveActivationFlash > 0) {
    const t = Math.pow(player.overdriveActivationFlash / 420, 2);
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

  if (stage.current === 10) {
    ctx.save();
    ctx.globalCompositeOperation = 'difference';
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(PLAY_X, PLAY_Y, PLAY_W, PLAY_H);
    ctx.restore();
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
