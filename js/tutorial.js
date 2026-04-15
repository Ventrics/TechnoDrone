const tutorial = {
  STEP_COMPLETE_HOLD_MS: 350,
  steps: [
    { id: 'move',       title: 'MOVE',                    subtitle: '',                     focus: null,        accent: '#39ff14', minTime: 250 },
    { id: 'shoot',      title: 'SHOOT',                   subtitle: '',                     focus: 'fire',      accent: '#ff1133', minTime: 250 },
    { id: 'heat',       title: 'SHOOT TO BUILD HEAT',     subtitle: '',                     focus: 'shipArc',   accent: '#ff8800', minTime: 350 },
    { id: 'dash',       title: 'DASH KILLS ALL ENEMIES',  subtitle: '',                     focus: 'dash',      accent: '#ff1133', minTime: 250 },
    { id: 'dashRefund', title: 'DASH REFUNDS HEAT',       subtitle: 'BUILD HEAT THEN DASH', focus: 'shipArc',   accent: '#9be7ff', minTime: 250 },
    { id: 'flowCharge', title: 'KILLS CHARGE FLOW STATE', subtitle: 'FASTER MOVEMENT  FASTER SHOOTING',                     focus: 'flowState', accent: '#d56cff', minTime: 350, holdMs: 1000 },
    { id: 'flowLoss',   title: 'LOSE FLOW STATE WHEN HIT', subtitle: '',                    focus: null,        accent: '#ff1133', minTime: 350, holdMs: 1000 },
    { id: 'laserDrop',  title: 'ELITES DROP LASER',       subtitle: '',                     focus: 'fire',      accent: '#39ff14', minTime: 350, holdMs: 700 },
    { id: 'colorRead',  title: 'READ THE COLORS',   subtitle: '',                          focus: null,        accent: '#f5c542', minTime: 350 },
    { id: 'baseDrop',   title: 'CLEAR THE SCREEN',  subtitle: '',                     focus: null,        accent: '#a3122a', minTime: 250, holdMs: 650 },
  ],
  stepIndex: 0,
  stepTimer: 0,
  fadeAlpha: 0,
  active: false,
  prevDroneX: 0,
  prevDroneY: 0,
  prevBulletCount: 0,
  prevDashActive: false,
  prevFlowStateActive: false,
  stepState: null,

  start() {
    this.active = true;
    this.stepIndex = 0;
    this.stepTimer = 0;
    this.fadeAlpha = 0;
    this.prevDroneX = drone.x;
    this.prevDroneY = drone.y;
    this.prevBulletCount = 0;
    this.prevDashActive = false;
    this.prevFlowStateActive = false;
    player.lives = 99;
    player.invincibleTimer = 999999;
    player.score = 0;
    stage.kills = 0;
    stage.totalKills = 0;
    this._beginStep(0);
  },

  _clearArena() {
    shards.reset();
    bullets.pool = [];
    bullets.cooldown = 0;
    enemyBullets.reset();
    pickups.reset();
    fragments.pool = [];
    burstParticles.reset();
    hitSparks.reset();
    impactFX.reset();
    smokeParticles.reset();
    screenNuke.reset();
    turretIndicators.reset();
    streakCallout.reset();
  },

  _spawnWave(count, opts = {}) {
    const stats = getStageEnemyStats();
    const edge = opts.edge ?? 'top';
    const baseX = opts.baseX ?? (PLAY_X + PLAY_W / 2);
    const baseY = opts.baseY ?? (PLAY_Y - 34);
    const spreadY = opts.spreadY ?? 0;
    const spreadX = opts.spreadX ?? 180;
    for (let i = 0; i < count; i++) {
      const offsetY = count === 1 ? 0 : (-spreadY / 2 + (spreadY * i / Math.max(1, count - 1)));
      const offsetX = count === 1 ? 0 : (-spreadX / 2 + (spreadX * i / Math.max(1, count - 1)));
      shards.pool.push(shards._makeShard(
        baseX + offsetX,
        baseY + offsetY,
        Object.assign({}, stats, {
          speed: opts.speed ?? 80,
          baseHp: opts.hp ?? 1
        }),
        !!opts.elite,
        false,
        edge
      ));
    }
  },

  _spawnStaticTarget(x, y, hp = 8, elite = false, size = null) {
    const stats = getStageEnemyStats();
    const target = shards._makeShard(
      x,
      y,
      Object.assign({}, stats, { speed: 0, baseHp: hp }),
      elite
    );
    target.vx = 0;
    target.vy = 0;
    if (size) {
      target.size = size;
      if (typeof makeShardShape === 'function') target.pts = makeShardShape(size);
    }
    target.tutorialStatic = true;
    shards.pool.push(target);
    return target;
  },

  _spawnBonusRing(ringIndex) {
    spawnBonusRing(3, ringIndex, { vy: 205, size: 32, innerRadius: 19, lifetime: 7000 });
  },

  _spawnTutorialHitShot() {
    enemyBullets.fire(drone.x, PLAY_Y + 54, drone.x, drone.y, { isTurret: true, size: 18, hitRadius: 24 });
  },

  _beginStep(index) {
    this.stepIndex = index;
    this.stepTimer = 0;
    this.fadeAlpha = 0;
    this.stepState = {
      distanceMoved: 0,
      shotsFired: 0,
      dashes: 0,
      dashLeft: false,
      dashRight: false,
      startKills: stage.kills,
      startScore: player.score,
      startHeat: player.heat,
      startUltUses: player.ultUses,
      startLives: player.lives,
      heated: false,
      completedAt: null,
      skipTimer: 0,
      moveZones: [],
      dashTargets: [],
      flowSeenAt: null,
      hitShotTimer: 0,
      ringSpawnDelay: 0,
      ringSpawned: false,
      ringCollected: false,
      laserCollected: false,
      redTarget: null,
      redThreat: null,
    };
    this.prevDroneX = drone.x;
    this.prevDroneY = drone.y;
    this.prevBulletCount = bullets.pool.length;
    this.prevDashActive = dash.duration > 0;
    this.prevFlowStateActive = player.flowStateActive;

    this._clearArena();
    this._setupStep(this.steps[index]);
  },

  _setupStep(step) {
    if (!step) return;

    player.hitFlashTimer = 0;
    player.dashHeatFlashTimer = 0;
    player.altFireType = null;
    player.laserFuel = 0;
    player.altFireCooldown = 0;
    player.overheated = false;
    player.overheatTimer = 0;
    player.invincibleTimer = 999999;
    player.flowStateActive = false;
    player.flowStateTimer = 0;

    const cx = PLAY_X + PLAY_W / 2;

    switch (step.id) {
      case 'move':
        player.heat = 0;
        player.flowStateCharge = 0;
        player.ultCharge = 0;
        player.ultReady = true;
        player.ultUses = 3;
        this.stepState.moveZones = [
          { x: drone.x - 180, y: drone.y, r: 24, hit: false },
          { x: drone.x + 180, y: drone.y, r: 24, hit: false }
        ];
        break;
      case 'shoot':
        player.heat = 0;
        this._spawnStaticTarget(cx - 170, PLAY_Y + PLAY_H * 0.28, 6, false, 42);
        this._spawnStaticTarget(cx, PLAY_Y + PLAY_H * 0.2, 6, false, 48);
        this._spawnStaticTarget(cx + 170, PLAY_Y + PLAY_H * 0.28, 6, false, 42);
        break;
      case 'heat':
        player.heat = 0;
        break;
      case 'dash':
        player.heat = 0;
        dash.reset();
        this.stepState.dashTargets = [
          this._spawnStaticTarget(PLAY_X + 84, drone.y, 4, false),
          this._spawnStaticTarget(PLAY_X + PLAY_W - 84, drone.y, 4, false)
        ];
        break;
      case 'dashRefund':
        player.heat = 68;
        this.stepState.startHeat = 68;
        dash.reset();
        break;
      case 'flowCharge':
        player.heat = 0;
        player.flowStateCharge = 95;
        this._spawnWave(14, { speed: 72, hp: 1, spreadX: 520, baseY: PLAY_Y - 28, spreadY: 48 });
        break;
      case 'flowLoss':
        player.heat = 0;
        player.flowStateCharge = 100;
        player.flowStateActive = true;
        player.flowStateTimer = player.FLOW_STATE_DURATION;
        player.invincibleTimer = 0;
        this.stepState.startLives = player.lives;
        this.stepState.hitShotTimer = 850;
        break;
      case 'laserDrop':
        player.heat = 0;
        player.altFireType = null;
        player.laserFuel = 0;
        player.altFireCooldown = 0;
        this._spawnStaticTarget(cx - 190, PLAY_Y + PLAY_H * 0.24, 8, true, 46);
        this._spawnStaticTarget(cx, PLAY_Y + PLAY_H * 0.17, 8, true, 52);
        this._spawnStaticTarget(cx + 190, PLAY_Y + PLAY_H * 0.24, 8, true, 46);
        break;
      case 'colorRead': {
        player.heat = 0;
        player.flowStateCharge = 0;
        player.flowStateActive = false;
        player.flowStateTimer = 0;
        this.stepState.moveZones = [
          { x: PLAY_X + PLAY_W * 0.28, y: drone.y, r: 24, hit: false }
        ];
        const turret = spawnTurret(4);
        turret.x = PLAY_X + PLAY_W * 0.84;
        turret.y = PLAY_Y + PLAY_H * 0.18;
        turret.lockY = turret.y;
        turret.vy = 0;
        turret.turretLocked = true;
        turret.turretFireTimer = 650;
        turret.tutorialStatic = true;
        shards.pool.push(turret);
        this.stepState.redTarget = turret;

        const kamikaze = spawnKamikaze();
        kamikaze.x = PLAY_X + PLAY_W * 0.18;
        kamikaze.y = PLAY_Y + PLAY_H * 0.08;
        kamikaze.vx = 42;
        kamikaze.vy = 18;
        kamikaze.chargerHuntVx = kamikaze.vx;
        shards.pool.push(kamikaze);
        this.stepState.redThreat = kamikaze;
        this.stepState.ringSpawnDelay = 500;
        this.stepState.ringSpawned = false;
        break;
      }
      case 'baseDrop':
        player.heat = 0;
        player.ultUses = 1;
        player.ultCharge = 0;
        player.ultReady = true;
        this.stepState.startUltUses = player.ultUses;
        this._spawnWave(10, { speed: 36, hp: 1, spreadX: 360, baseY: PLAY_Y - 30 });
        break;
    }
  },

  _isStepComplete(step) {
    if (!step) return false;
    if (this.stepTimer < (step.minTime || 0)) return false;
    switch (step.id) {
      case 'move':
        return this.stepState.moveZones.every(z => z.hit);
      case 'shoot':
        return !shards.pool.some(s => s.tutorialStatic);
      case 'heat':
        return this.stepState.heated && player.heat <= 12;
      case 'dash':
        return !shards.pool.some(s => s.tutorialStatic);
      case 'dashRefund':
        return this.stepState.dashes >= 1 && player.heat <= this.stepState.startHeat - 8;
      case 'flowCharge':
        return player.flowStateActive
          && stage.kills - this.stepState.startKills >= 14
          && shards.pool.length === 0;
      case 'flowLoss':
        return !player.flowStateActive && player.lives < this.stepState.startLives;
      case 'laserDrop':
        return this.stepState.laserCollected
          && !shards.pool.some(s => s.tutorialStatic);
      case 'colorRead':
        return this.stepState.moveZones.every(z => z.hit)
          && (!this.stepState.redTarget || !shards.pool.includes(this.stepState.redTarget))
          && this.stepState.ringCollected;
      case 'baseDrop':
        return player.ultUses < this.stepState.startUltUses
          && shards.pool.length === 0
          && enemyBullets.pool.length === 0
          && !screenNuke.active;
      default:
        return false;
    }
  },

  _layoutTutorialLines(text, maxWidth, baseSize, minSize = 18, maxLines = 2) {
    const paragraphs = String(text || '').split('\n');
    const lines = [];

    let fontSize = baseSize;
    for (; fontSize >= minSize; fontSize -= 2) {
      ctx.font = `bold ${fontSize}px ${UI_DISPLAY_FONT}`;
      lines.length = 0;
      for (const paragraph of paragraphs) {
        const words = paragraph.split(' ');
        let current = '';
        for (const word of words) {
          const candidate = current ? `${current} ${word}` : word;
          if (ctx.measureText(candidate).width <= maxWidth || current === '') {
            current = candidate;
          } else {
            lines.push(current);
            current = word;
          }
        }
        if (current) lines.push(current);
      }
      if (lines.length <= maxLines) break;
    }

    return {
      fontSize,
      lineHeight: fontSize + 6,
      lines: [...lines],
      totalHeight: lines.length * (fontSize + 6),
    };
  },

  _drawTutorialLines(text, centerX, centerY, maxWidth, color, glowColor, baseSize, minSize = 18, maxLines = 2) {
    ctx.save();
    const layout = this._layoutTutorialLines(text, maxWidth, baseSize, minSize, maxLines);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `bold ${layout.fontSize}px ${UI_DISPLAY_FONT}`;
    ctx.fillStyle = color;
    setGlow(glowColor, 10);
    layout.lines.forEach((line, i) => {
      const y = centerY - layout.totalHeight / 2 + i * layout.lineHeight + layout.lineHeight / 2;
      ctx.fillText(line, centerX, y);
    });
    clearGlow();
    ctx.restore();
  },

  _drawSegmentLine(segments, centerX, centerY, fontSize, alpha = 1) {
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.font = `bold ${fontSize}px ${UI_DISPLAY_FONT}`;
    const totalWidth = segments.reduce((sum, seg) => sum + ctx.measureText(seg.text).width, 0);
    let drawX = centerX - totalWidth / 2;
    segments.forEach(seg => {
      const color = seg.color || '#f4f0ff';
      const glow = seg.glow || (color === '#f5c542' ? '#f5c542' : '#31afd4');
      ctx.fillStyle = color;
      setGlow(glow, seg.blur || 10);
      ctx.fillText(seg.text, drawX, centerY);
      clearGlow();
      drawX += ctx.measureText(seg.text).width;
    });
    ctx.restore();
  },

  _drawTutorialCopy(copy, centerX, centerY, maxWidth) {
    const titleLayout = copy.title
      ? this._layoutTutorialLines(copy.title, maxWidth, copy.titleSize || 58, 28, 2)
      : null;
    const subtitleLayout = copy.subtitle
      ? this._layoutTutorialLines(copy.subtitle, maxWidth, copy.subtitleSize || 30, 18, 2)
      : null;
    const progressLayout = copy.progress
      ? this._layoutTutorialLines(copy.progress, maxWidth, copy.progressSize || 24, 18, 2)
      : null;

    const gapAfterTitle = titleLayout && (subtitleLayout || progressLayout) ? 14 : 0;
    const gapAfterSubtitle = subtitleLayout && progressLayout ? 10 : 0;
    const totalHeight =
      (titleLayout?.totalHeight || 0) +
      gapAfterTitle +
      (subtitleLayout?.totalHeight || 0) +
      gapAfterSubtitle +
      (progressLayout?.totalHeight || 0);

    let blockTop = centerY - totalHeight / 2;

    const drawLayout = (layout, color, glowColor, blur, alpha = 1) => {
      if (!layout) return;
      ctx.save();
      ctx.globalAlpha *= alpha;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `bold ${layout.fontSize}px ${UI_DISPLAY_FONT}`;
      ctx.fillStyle = color;
      setGlow(glowColor, blur);
      layout.lines.forEach((line, i) => {
        const y = blockTop + i * layout.lineHeight + layout.lineHeight / 2;
        ctx.fillText(line, centerX, y);
      });
      clearGlow();
      ctx.restore();
      blockTop += layout.totalHeight;
    };

    drawLayout(titleLayout, '#f4f0ff', '#31afd4', 12, 1);
    if (titleLayout) blockTop += gapAfterTitle;
    const subtitleColor = copy.subtitleColor || '#e8e2ff';
    const subtitleGlow = subtitleColor === '#d56cff' ? '#d56cff' : '#31afd4';
    drawLayout(subtitleLayout, subtitleColor, subtitleGlow, 8, 0.92);
    if (subtitleLayout) blockTop += gapAfterSubtitle;
    drawLayout(progressLayout, '#f4f0ff', '#31afd4', 8, 0.9);
  },

  _drawFocus(focus, accent) {
    if (!focus) return;
    const pulse = 0.55 + 0.45 * (Math.sin(getNow() * 0.01) * 0.5 + 0.5);
    ctx.save();
    ctx.globalAlpha = 0.25 + pulse * 0.25;
    ctx.strokeStyle = accent;
    ctx.lineWidth = 2;
    setGlow(accent, 18);

    if (focus === 'ship' || focus === 'shipArc') {
      const shipX = drone._drawX ?? drone.x;
      const shipY = drone._drawY ?? drone.y;
      ctx.beginPath();
      ctx.arc(shipX, shipY, focus === 'shipArc' ? 37.5 : 42, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      let x = drone.x - 66, y = drone.y - 34, w = 132, h = 68;
      if (focus === 'flowState') {
        const inset = Math.max(18, PLAY_W * 0.06);
        x = PLAY_X + inset - 10;
        y = PLAY_Y + PLAY_H - 28;
        w = PLAY_W - inset * 2 + 20;
        h = 38;
      }
      if (focus === 'fire') {
        const targets = shards.pool.filter(s => s.tutorialStatic);
        if (targets.length > 0) {
          const left = Math.min(...targets.map(t => t.x - t.size * 1.8));
          const right = Math.max(...targets.map(t => t.x + t.size * 1.8));
          const top = Math.min(...targets.map(t => t.y - t.size * 1.8));
          const bottom = Math.max(...targets.map(t => t.y + t.size * 1.8));
          x = left - 18;
          y = top - 18;
          w = right - left + 36;
          h = bottom - top + 36;
        } else {
          x = drone.x - 86;
          y = drone.y - 54;
          w = 172;
          h = 108;
        }
      }
      if (focus === 'dash') {
        x = drone.x - 120;
        y = drone.y - 44;
        w = 240;
        h = 88;
      }
      if (focus === 'baseDrop') {
        x = PANEL_X + 18;
        y = PANEL_Y + 190;
        w = PANEL_W - 36;
        h = 46;
      }
      _roundRect(ctx, x, y, w, h, 8);
      ctx.stroke();
    }

    clearGlow();
    ctx.restore();
  },

  _getStepTitle(step) {
    if (!step) return '';
    if (step.id === 'heat' && this.stepState.heated) return 'RELEASE TO COOL';
    return step.title;
  },

  _getTutorialCopy(step) {
    if (!step) return { title: '', subtitle: '', progress: '' };
    const copy = {
      title: this._getStepTitle(step),
      subtitle: step.subtitle || '',
      subtitleColor: '#e8e2ff',
      progress: '',
    };

    if (step.id === 'move') {
      const leftHit = this.stepState.moveZones[0]?.hit ? '1' : '0';
      const rightHit = this.stepState.moveZones[1]?.hit ? '1' : '0';
      copy.progress = `LEFT ${leftHit} / 1   RIGHT ${rightHit} / 1`;
      return copy;
    }
    if (step.id === 'shoot') {
      return copy;
    }
    if (step.id === 'heat') {
      return copy;
    }
    if (step.id === 'dash') {
      return copy;
    }
    if (step.id === 'flowCharge') {
      copy.subtitleColor = '#d56cff';
      return copy;
    }
    if (step.id === 'flowLoss') {
      return copy;
    }
    if (step.id === 'laserDrop') {
      return copy;
    }
    if (step.id === 'colorRead') {
      copy.subtitle = '';
      return copy;
    }
    return copy;
  },

  update(delta) {
    if (!this.active) return;
    const step = this.steps[this.stepIndex];
    if (!step) { this.finish(); return; }

    this.stepTimer += delta;
    const entryT = Math.min(1, this.stepTimer / 220);
    this.fadeAlpha += (entryT - this.fadeAlpha) * 0.22;

    const dx = drone.x - this.prevDroneX;
    const dy = drone.y - this.prevDroneY;
    this.stepState.distanceMoved += Math.hypot(dx, dy);
    this.prevDroneX = drone.x;
    this.prevDroneY = drone.y;

    const bulletDiff = bullets.pool.length - this.prevBulletCount;
    if (bulletDiff > 0) this.stepState.shotsFired += bulletDiff;
    this.prevBulletCount = bullets.pool.length;

    const dashActive = dash.duration > 0;
    if (dashActive && !this.prevDashActive) {
      this.stepState.dashes++;
      if (dash.surgeDir < 0) this.stepState.dashLeft = true;
      if (dash.surgeDir > 0) this.stepState.dashRight = true;
    }
    this.prevDashActive = dashActive;

    if (player.heat >= 45) this.stepState.heated = true;

    if (step.id === 'move' || step.id === 'colorRead') {
      this.stepState.moveZones.forEach(zone => {
        if (!zone.hit && Math.hypot(drone.x - zone.x, drone.y - zone.y) <= zone.r + 10) {
          zone.hit = true;
          audio.play('menuSelect');
        }
      });
    }

    if (step.id === 'flowCharge' && player.flowStateActive && !this.prevFlowStateActive) {
      this.stepState.flowSeenAt = this.stepTimer;
      streakCallout.showFlowState();
      if (enemyBullets.pool.length > 0) enemyBullets.reset();
    }

    if (step.id === 'flowLoss') {
      if (player.lives === this.stepState.startLives) {
        player.flowStateActive = true;
        player.flowStateTimer = Math.max(player.flowStateTimer, 1200);
        if (player.invincibleTimer > 0) player.invincibleTimer = 0;
        this.stepState.hitShotTimer -= delta;
        if (this.stepState.hitShotTimer <= 0 && enemyBullets.pool.length === 0) {
          this._spawnTutorialHitShot();
          this.stepState.hitShotTimer = 1400;
        }
      } else {
        player.flowStateActive = false;
        player.flowStateTimer = 0;
        player.flowStateCharge = 0;
      }
    }

    if (step.id === 'colorRead' && !this.stepState.ringSpawned) {
      this.stepState.ringSpawnDelay -= delta;
      if (this.stepState.ringSpawnDelay <= 0) {
        this._spawnBonusRing(1);
        this.stepState.ringSpawned = true;
      }
    }

    if (step.id === 'colorRead' && !this.stepState.ringCollected) {
      this.stepState.ringCollected = player.score > this.stepState.startScore;
    }

    if (step.id === 'laserDrop' && !this.stepState.laserCollected) {
      this.stepState.laserCollected = player.altFireType === 'laser';
    }

    this.prevFlowStateActive = player.flowStateActive;

    if (this.stepState.completedAt === null) {
      this.stepState.skipTimer += delta;
    }
    if (this.stepState.skipTimer >= 8000 &&
        this.stepState.completedAt === null &&
        (justPressed['Enter'] || justPressed['Return'])) {
      audio.play('menuConfirm');
      if (this.stepIndex >= this.steps.length - 1) this.finish();
      else this._beginStep(this.stepIndex + 1);
      return;
    }

    if (this._isStepComplete(step) && this.stepState.completedAt === null) {
      this.stepState.completedAt = this.stepTimer;
      audio.play('menuConfirm');
    }

    const completeHoldMs = step.holdMs || this.STEP_COMPLETE_HOLD_MS;
    if (this.stepState.completedAt !== null &&
        this.stepTimer - this.stepState.completedAt >= completeHoldMs) {
      if (this.stepIndex >= this.steps.length - 1) this.finish();
      else this._beginStep(this.stepIndex + 1);
    }
  },

  draw() {
    if (!this.active) return;
    const step = this.steps[this.stepIndex];
    if (!step) return;

    this._drawFocus(step.focus, step.accent);

    if ((step.id === 'move' || step.id === 'colorRead') && this.stepState.moveZones.length > 0) {
      ctx.save();
      this.stepState.moveZones.forEach(zone => {
        const pulse = 0.55 + 0.45 * (Math.sin(getNow() * 0.012 + zone.x * 0.02) * 0.5 + 0.5);
        const zGreen = '#39ff14';
        const zGreenHit = '#a8ff3e';
        ctx.globalAlpha = zone.hit ? 0.18 : 0.34 + pulse * 0.16;
        ctx.fillStyle = zone.hit ? 'rgba(57,255,20,0.15)' : 'rgba(57,255,20,0.08)';
        ctx.strokeStyle = zone.hit ? zGreenHit : zGreen;
        ctx.lineWidth = zone.hit ? 2.5 : 2;
        setGlow(zone.hit ? zGreenHit : zGreen, zone.hit ? 18 : 12);
        ctx.beginPath();
        ctx.arc(zone.x, zone.y, zone.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(zone.x, zone.y, zone.r * 0.45, 0, Math.PI * 2);
        ctx.stroke();
        clearGlow();
      });
      ctx.restore();
    }

    if (step.id === 'dash' && this.stepState.dashTargets.length > 0) {
      ctx.save();
      this.stepState.dashTargets.forEach(target => {
        if (!target || !shards.pool.includes(target)) return;
        const pulse = 0.55 + 0.45 * (Math.sin(getNow() * 0.012 + target.x * 0.02) * 0.5 + 0.5);
        const color = '#ff1133';
        ctx.globalAlpha = 0.25 + pulse * 0.12;
        ctx.fillStyle = 'rgba(255,17,51,0.06)';
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        setGlow(color, 12);
        ctx.beginPath();
        ctx.arc(target.x, target.y, Math.max(24, target.size * 1.5), 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(target.x, target.y, Math.max(12, target.size * 0.72), 0, Math.PI * 2);
        ctx.stroke();
        clearGlow();
      });
      ctx.restore();
    }

    if (step.id === 'colorRead') {
      const cx = PLAY_X + PLAY_W / 2;
      const panelY = Math.min(PLAY_Y + PLAY_H * 0.68, drone.y - 150);
      const lines = [
        { title: 'GREEN', subtitle: 'SAFE', color: '#39ff14' },
        { title: 'RED', subtitle: 'DANGER', color: '#ff1133' },
        { title: 'GOLD', subtitle: 'BONUS', color: '#f5c542' }
      ];
      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.globalAlpha = 0.95 * this.fadeAlpha;
      const groupSpacing = Math.min(220, PLAY_W * 0.26);
      lines.forEach((line, idx) => {
        const groupX = cx + (idx - 1) * groupSpacing;
        this._drawTutorialLines(line.title, groupX, panelY - 4, 180, '#f4f0ff', line.color, 34, 24, 1);
        this._drawTutorialLines(line.subtitle, groupX, panelY + 24, 180, '#d7d0ea', line.color, 18, 15, 1);
      });
      ctx.restore();
    }

    const panelW = Math.min(PLAY_W - 96, 760);
    const panelY = Math.min(PLAY_Y + PLAY_H * 0.68, drone.y - 150);
    const hudPink = '#dd32b3';
    const skipGreen = '#39ff14';
    const cx = PLAY_X + PLAY_W / 2;

    ctx.save();
    ctx.globalAlpha = 0.95 * this.fadeAlpha;

    if (step.id === 'move') {
      this._drawTutorialLines('MOVE', cx, panelY - 10, panelW - 56, '#f4f0ff', '#31afd4', 58, 28, 1);
      this._drawSegmentLine([
        { text: 'A', color: '#f5c542' },
        { text: ' / ', color: '#e8e2ff' },
        { text: 'D', color: '#f5c542' },
      ], cx, panelY + 52, 46, 0.95);
    } else if (step.id === 'shoot') {
      this._drawTutorialLines('SHOOT', cx, panelY - 10, panelW - 56, '#f4f0ff', '#31afd4', 58, 28, 1);
      this._drawSegmentLine([
        { text: 'J', color: '#f5c542' },
        { text: ' - ', color: '#e8e2ff' },
        { text: 'LEFT CLICK', color: '#f5c542' },
      ], cx, panelY + 52, 30, 0.92);
    } else if (step.id === 'dash') {
      this._drawTutorialLines('DASH KILLS ALL ENEMIES', cx, panelY - 10, panelW - 56, '#f4f0ff', '#31afd4', 50, 28, 2);
      this._drawSegmentLine([
        { text: 'SPACE', color: '#f5c542' },
        { text: ' - ', color: '#e8e2ff' },
        { text: 'A', color: '#f5c542' },
        { text: ' / ', color: '#e8e2ff' },
        { text: 'D', color: '#f5c542' },
      ], cx, panelY + 58, 28, 0.92);
    } else if (step.id === 'laserDrop') {
      this._drawTutorialLines('ELITES DROP LASER', cx, panelY - 10, panelW - 56, '#f4f0ff', '#31afd4', 54, 28, 2);
      this._drawSegmentLine([
        { text: 'K', color: '#f5c542' },
        { text: ' / ', color: '#e8e2ff' },
        { text: 'RIGHT CLICK', color: '#f5c542' },
        { text: ' TO FIRE', color: '#e8e2ff' },
      ], cx, panelY + 52, 28, 0.92);
    } else if (step.id === 'baseDrop') {
      this._drawTutorialLines('CLEAR THE SCREEN', cx, panelY - 10, panelW - 56, '#f4f0ff', '#31afd4', 54, 28, 2);
      this._drawSegmentLine([
        { text: 'PRESS ', color: '#e8e2ff' },
        { text: 'Q', color: '#f5c542' },
      ], cx, panelY + 52, 28, 0.92);
    } else if (step.id !== 'colorRead') {
      const copy = this._getTutorialCopy(step);
      this._drawTutorialCopy(copy, cx, panelY + 12, panelW - 56);
    }

    ctx.font = `bold 13px ${UI_DISPLAY_FONT}`;
    ctx.textAlign = 'center';
    ctx.globalAlpha = 0.9 * this.fadeAlpha;
    ctx.fillStyle = hudPink;
    clearGlow();
    setGlow(hudPink, 8);
    ctx.fillText(`STEP ${this.stepIndex + 1} / ${this.steps.length}`, cx, panelY - 104);
    clearGlow();

    if (this.stepState.skipTimer >= 8000 && this.stepState.completedAt === null) {
      const skipAlpha = 0.55 + 0.45 * Math.sin(getNow() * 0.006);
      ctx.globalAlpha = skipAlpha * this.fadeAlpha;
      ctx.font = `bold 11px ${UI_DISPLAY_FONT}`;
      ctx.textAlign = 'center';
      ctx.fillStyle = skipGreen;
      setGlow(skipGreen, 10);
      ctx.fillText('ENTER TO SKIP', cx, panelY + 148);
      clearGlow();
    }

    ctx.restore();
  },

  finish() {
    this.active = false;
    localStorage.setItem('drone_tutorial_done', '1');
    startScreenTransition('fade', () => {
      _resetAllState();
      gameState = 'playing';
    });
  },

  cancel() {
    this.active = false;
    startScreenTransition('fade', () => {
      _resetAllState();
      gameState = 'title';
      titleSelection = 0;
      titleSelectionChangedAt = getNow();
      audio.playMusic('title');
    });
  }
};

function _resetAllState() {
  player.score = 0;
  player.dead = false;
  player.deathPresentationPending = false;
  player.lives = 3;
  player.flowStateCharge = 0;
  player.flowStateActive = false;
  player.flowStateTimer = 0;
  player.heat = 0;
  player.overheated = false;
  player.overheatTimer = 0;
  player.hitFlashTimer = 0;
  player.ultCharge = 0;
  player.ultReady = true;
  player.ultUses = 3;
  player.altFireType = null;
  player.laserFuel = 0;
  player.altFireCooldown = 0;
  player.invincibleTimer = 0;
  altFireDropIndex = 0;
  shards.reset();
  if (typeof laser !== 'undefined' && laser && typeof laser.reset === 'function') laser.reset();
  screenNuke.reset();
  turretIndicators.reset();
  streakCallout.reset();
  bullets.pool = [];
  bullets.cooldown = 0;
  enemyBullets.reset();
  pickups.reset();
  fragments.pool = [];
  burstParticles.reset();
  hitSparks.reset();
  impactFX.reset();
  smokeParticles.reset();

  stage.reset();
  drone.init();
  drone.tilt = 0;
  dash.reset();
  stage10WipeProgress = 0;
}
