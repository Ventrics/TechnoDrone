const dash = {
  cooldown: 0,
  COOLDOWN_MS: 1200,
  COOLDOWN_OFFENSIVE: 800,
  duration: 0,
  DURATION_MS: 320,
  HEAT_REFUND: 35,
  vx: 0,
  vy: 0,
  SPEED: 680,
  hitEnemy: false,
  surgeDir: 0,  // +1 = right | -1 = left

  update(delta) {
    if (this.cooldown > 0) this.cooldown -= delta;

    if (this.duration > 0) {
      this.duration -= delta;
      if (this.duration <= 0) {
        this.cooldown = this.hitEnemy ? this.COOLDOWN_OFFENSIVE : this.COOLDOWN_MS;
        this.hitEnemy = false;
        this.vx = 0;
        this.vy = 0;
      }
    }

    if (justPressed[' '] && this.cooldown <= 0 && this.duration <= 0) {
      const leftHeld  = keys['ArrowLeft']  || keys['a'] || keys['A'];
      const rightHeld = keys['ArrowRight'] || keys['d'] || keys['D'];

      if (rightHeld && !leftHeld) {
        this.surgeDir = 1;
        this.vx = this.SPEED;
      } else if (leftHeld && !rightHeld) {
        this.surgeDir = -1;
        this.vx = -this.SPEED;
      } else {
        return;
      }
      this.duration = this.DURATION_MS;
      this.hitEnemy = false;
      player.heat = Math.max(0, player.heat - this.HEAT_REFUND);
      player.dashHeatFlashTimer = player.DASH_HEAT_FLASH_MS;
      audio.play('dash');
    }
  },

  reset() {
    this.cooldown = 0;
    this.duration = 0;
    this.hitEnemy = false;
    this.surgeDir = 0;
    this.vx = 0;
    this.vy = 0;
  }
};

const drone = {
  x: 120,
  y: 0,
  width: 48,
  height: 18,
  rotorAngle: 0,
  tilt: 0,

  get speed() { return player.overdriveActive ? 336 : 280; },

  init() {
    this.x = PLAY_X + PLAY_W / 2;
    this.y = PLAY_Y + PLAY_H - 60;
  },

  update(delta) {
    const dt = delta / 1000;
    let dx = 0;

    if (keys['ArrowLeft'] || keys['a'] || keys['A']) dx -= 1;
    if (keys['ArrowRight'] || keys['d'] || keys['D']) dx += 1;

    let speedX = dx * this.speed;

    if (dash.duration > 0) {
      speedX += dash.vx;
    }

    this.x += speedX * dt;

    // Lock to play area, fixed Y at bottom
    this.x = Math.max(PLAY_X + 30, Math.min(PLAY_X + PLAY_W - 30, this.x));
    this.y = PLAY_Y + PLAY_H - 60;

    // Lean into dash direction, fading out as dash completes
    const dashLean = dash.duration > 0
      ? dash.surgeDir * 0.45 * (dash.duration / dash.DURATION_MS)
      : 0;
    this.tilt += ((dx * 0.3 + dashLean) - this.tilt) * 0.18;

    const moving = dx !== 0;
    this.rotorAngle += (moving ? 0.45 : 0.25);
  },

  draw() {
    const now = getNow();
    const nearDeath = player.lives === 1 && !player.dead;
    const dashActive = dash.duration > 0;
    const dashPhase  = dashActive ? 1 - dash.duration / dash.DURATION_MS : 0;
    const hullFlicker  = nearDeath
      ? (Math.sin(now * 0.018) > 0.3 ? 1 : 0.65)
      : 1;
    const prevDrawX    = this._drawX ?? this.x;
    const prevDrawY    = this._drawY ?? this.y;
    const drawMotion   = Math.hypot(this.x - prevDrawX, this.y - prevDrawY);
    const motionFrac   = Math.max(0, Math.min(1, drawMotion / 10));
    const engineDrive  = Math.min(1,
      motionFrac * 1.25 +
      (dashActive ? 0.28 : 0) +
      (player.overdriveActive ? 0.32 : 0)
    );
    const panelColor   = player.overheated ? '#ff6633'
      : nearDeath ? '#ff3300'
      : player.overdriveActive ? '#d94cff'
      : COLOR_CYAN;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(-Math.PI / 2); // point upward (top-down orientation)
    ctx.rotate(this.tilt);
    {
      const shipGlow = player.overheated ? '#ff3300'
        : nearDeath ? '#ff3300'
        : player.overdriveActive ? '#cc44ff'
        : (dash.duration > 0 ? '#ffffff' : COLOR_CYAN);
      const shipGlowAlpha = player.overheated ? 0.28
        : nearDeath ? 0.24
        : player.overdriveActive ? 0.26
        : (dash.duration > 0 ? 0.22 : 0.14);
      const shipGlowRadius = player.overheated ? 30
        : nearDeath ? 18 + 6 * Math.abs(Math.sin(now * 0.012))
        : player.overdriveActive ? 30
        : (dash.duration > 0 ? 24 : 18);
      ctx.save();
      ctx.globalAlpha = shipGlowAlpha * hullFlicker;
      ctx.shadowColor = shipGlow;
      ctx.shadowBlur = shipGlowRadius;
      ctx.fillStyle = shipGlow;
      ctx.beginPath();
      ctx.ellipse(0, 0, 20, 14, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    const ePulse = (0.55 + 0.45 * Math.sin(now * 0.008 + this.rotorAngle * 0.5)) * (0.7 + engineDrive * 0.7);
    [{ x: -13, y: -5 }, { x: -13, y: 5 }].forEach(ep => {
      ctx.save();
      const exhaustLen = 10 + engineDrive * 18;
      ctx.globalAlpha = 0.14 + engineDrive * 0.16;
      ctx.shadowColor = panelColor;
      ctx.shadowBlur = 22 + engineDrive * 14;
      ctx.strokeStyle = panelColor;
      ctx.lineWidth = 1 + engineDrive * 0.7;
      ctx.beginPath();
      ctx.moveTo(ep.x - 2, ep.y);
      ctx.lineTo(ep.x - exhaustLen, ep.y);
      ctx.stroke();

      const exhaustColor = player.overdriveActive ? '#e040fb' : COLOR_CYAN;
      ctx.globalAlpha = (player.overdriveActive ? 0.28 : 0.18) * ePulse;
      ctx.shadowColor = exhaustColor;
      ctx.shadowBlur = (player.overdriveActive ? 48 : 32) + engineDrive * 10;
      ctx.fillStyle = exhaustColor;
      ctx.beginPath();
      ctx.ellipse(ep.x - engineDrive * 3, ep.y, 8 + engineDrive * 3, 5 + engineDrive * 2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.globalAlpha = (player.overdriveActive ? 0.58 : 0.42) * ePulse;
      ctx.shadowColor = exhaustColor;
      ctx.shadowBlur = (player.overdriveActive ? 22 : 14) + engineDrive * 8;
      ctx.fillStyle = exhaustColor;
      ctx.beginPath();
      ctx.ellipse(ep.x - engineDrive * 2, ep.y, 4.5 + engineDrive * 1.5, 3.5 + engineDrive, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.globalAlpha = 0.8 * ePulse;
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 6;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(ep.x - engineDrive, ep.y, 1.8 + engineDrive * 0.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      if (player.overheated) {
        const flamePulse = 0.55 + 0.45 * (Math.sin(now * 0.024 + ep.y * 0.4) * 0.5 + 0.5);
        ctx.save();
        ctx.globalAlpha = 0.28 + flamePulse * 0.22;
        ctx.shadowColor = '#ff3300';
        ctx.shadowBlur = 26;
        ctx.fillStyle = '#ff3300';
        ctx.beginPath();
        ctx.moveTo(ep.x - 10, ep.y);
        ctx.quadraticCurveTo(ep.x - 22 - flamePulse * 12, ep.y - 4.5, ep.x - 30 - flamePulse * 12, ep.y);
        ctx.quadraticCurveTo(ep.x - 22 - flamePulse * 10, ep.y + 4.5, ep.x - 10, ep.y);
        ctx.fill();
        ctx.restore();

        ctx.save();
        ctx.globalAlpha = 0.5 + flamePulse * 0.18;
        ctx.shadowColor = '#ff8800';
        ctx.shadowBlur = 14;
        ctx.fillStyle = '#ff8800';
        ctx.beginPath();
        ctx.moveTo(ep.x - 9, ep.y);
        ctx.quadraticCurveTo(ep.x - 18 - flamePulse * 8, ep.y - 2.8, ep.x - 24 - flamePulse * 8, ep.y);
        ctx.quadraticCurveTo(ep.x - 18 - flamePulse * 7, ep.y + 2.8, ep.x - 9, ep.y);
        ctx.fill();
        ctx.restore();
      }
    });

    const hull = [
      { x: 22, y: 0 },
      { x: -5, y: -14 },
      { x: -14, y: -7 },
      { x: -10, y: 0 },
      { x: -14, y: 7 },
      { x: -5, y: 14 },
    ];
    const tracePath = () => {
      ctx.beginPath();
      hull.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
      ctx.closePath();
    };

    tracePath();
    ctx.globalAlpha = 0.06 * hullFlicker;
    ctx.fillStyle = COLOR_CYAN;
    ctx.fill();

    tracePath();
    ctx.globalAlpha = 0.28 * hullFlicker;
    ctx.shadowColor = COLOR_CYAN;
    ctx.shadowBlur = 32;
    ctx.strokeStyle = COLOR_CYAN;
    ctx.lineWidth = 4;
    ctx.lineJoin = 'round';
    ctx.stroke();

    tracePath();
    ctx.globalAlpha = 0.65 * hullFlicker;
    ctx.shadowColor = COLOR_CYAN;
    ctx.shadowBlur = 12;
    ctx.strokeStyle = COLOR_CYAN;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    tracePath();
    ctx.globalAlpha = hullFlicker;
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 5;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 0.7;
    ctx.stroke();

    // Overdrive ship ascension — outer magenta bloom layered on hull
    if (player.overdriveActive) {
      const odPulse = 0.6 + 0.4 * (Math.sin(getNow() * 0.018) * 0.5 + 0.5);
      tracePath();
      ctx.globalAlpha = 0.35 * odPulse * hullFlicker;
      ctx.shadowColor = '#cc44ff';
      ctx.shadowBlur = 18;
      ctx.strokeStyle = '#cc44ff';
      ctx.lineWidth = 5;
      ctx.stroke();
    }

    ctx.globalAlpha = 0.38;
    ctx.shadowColor = COLOR_PINK;
    ctx.shadowBlur = 8;
    ctx.strokeStyle = COLOR_PINK;
    ctx.lineWidth = 0.75;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(16, 0); ctx.lineTo(-3, -7);
    ctx.moveTo(16, 0); ctx.lineTo(-3, 7);
    ctx.moveTo(-3, -7); ctx.lineTo(-3, 7);
    ctx.stroke();

    if (nearDeath) {
      ctx.save();
      ctx.globalAlpha = 0.4 * hullFlicker;
      ctx.strokeStyle = '#ff2200';
      ctx.lineWidth = 0.8;
      ctx.setLineDash([2, 3]);
      ctx.beginPath(); ctx.moveTo(8, -3); ctx.lineTo(14, 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(6, 3); ctx.lineTo(11, -1); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-2, -1); ctx.lineTo(4, 4); ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }

    ctx.save();
    ctx.globalAlpha = (0.14 + engineDrive * 0.12) * hullFlicker;
    ctx.shadowColor = panelColor;
    ctx.shadowBlur = 10 + engineDrive * 10;
    ctx.strokeStyle = panelColor;
    ctx.lineWidth = 0.85;
    ctx.beginPath();
    ctx.moveTo(12, 0);
    ctx.lineTo(-9, 0);
    ctx.moveTo(5, -8);
    ctx.lineTo(-10, -4);
    ctx.moveTo(5, 8);
    ctx.lineTo(-10, 4);
    ctx.stroke();
    ctx.restore();

    // Heat arc around ship
    {
      const heatFrac = player.overdriveActive
        ? Math.max(0, player.overdriveTimer / player.OVERDRIVE_DURATION)
        : player.heat / 100;
      const heatColor = player.overdriveActive ? '#cc44ff'
        : player.overheated ? '#ff0000'
        : heatFrac > 0.8 ? '#ff3300'
        : heatFrac > 0.5 ? '#ff8800'
        : COLOR_CYAN;
      const arcRadius = 26;
      const arcStart = Math.PI;
      const arcSpan = Math.PI * 2;
      const arcEnd = arcStart + arcSpan;

      ctx.save();
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';

      // Background track
      ctx.globalAlpha = 0.12;
      ctx.strokeStyle = '#333';
      ctx.beginPath();
      ctx.arc(0, 0, arcRadius, arcStart, arcEnd);
      ctx.stroke();

      if (player.dashHeatFlashTimer > 0) {
        const flashFrac = player.dashHeatFlashTimer / player.DASH_HEAT_FLASH_MS;
        ctx.globalAlpha = 0.18 + flashFrac * 0.55;
        ctx.strokeStyle = '#9be7ff';
        ctx.shadowColor = '#9be7ff';
        ctx.shadowBlur = 14;
        ctx.lineWidth = 4.5;
        ctx.beginPath();
        ctx.arc(0, 0, arcRadius + 1.5, arcStart, arcEnd);
        ctx.stroke();
        ctx.lineWidth = 2.5;
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
      }

      // Filled heat arc
      if (heatFrac > 0) {
        if (player.overdriveActive) {
          ctx.globalAlpha = 0.55 + 0.35 * (Math.sin(getNow() * 0.02) * 0.5 + 0.5);
        } else if (player.overheated) {
          ctx.globalAlpha = 0.35 + 0.65 * (Math.sin(getNow() * 0.015) * 0.5 + 0.5);
        } else {
          ctx.globalAlpha = 0.9;
        }
        ctx.strokeStyle = heatColor;
        ctx.shadowColor = heatColor;
        ctx.shadowBlur = player.overdriveActive ? 16 : 8;
        ctx.beginPath();
        ctx.arc(0, 0, arcRadius, arcStart, arcStart + arcSpan * heatFrac);
        ctx.stroke();
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
      }

      ctx.restore();
    }

    let tipColor = COLOR_PINK;
    let tipBase = 18;
    if (player.overdriveActive || player.altFireType) {
      const p = Math.sin(now * 0.025) * 0.5 + 0.5;
      tipColor = player.overdriveActive ? (p > 0.5 ? '#cc44ff' : '#9be7ff')
        : player.altFireType === 'spread' ? '#ffcc00'
        : player.altFireType === 'bass' ? '#b14cff'
        : (p > 0.5 ? '#ff44cc' : '#ffffff');
      tipBase = player.overdriveActive ? 34 + p * 24 : 26 + p * 20;
    }
    ctx.globalAlpha = 0.18;
    ctx.shadowColor = tipColor;
    ctx.shadowBlur = tipBase * 2.2;
    ctx.fillStyle = tipColor;
    ctx.beginPath();
    ctx.arc(22, 0, 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = 0.5;
    ctx.shadowColor = tipColor;
    ctx.shadowBlur = tipBase;
    ctx.fillStyle = tipColor;
    ctx.beginPath();
    ctx.arc(22, 0, 3.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = 1;
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 6;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(22, 0, 1.6, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.restore();

    // Dash afterimage — layered ghost copies instead of speed lines
    if (dashActive) {
      const ghostIntensity = Math.pow(Math.max(0, 1 - dashPhase * 1.4), 1.2);
      const ghostHull = [
        { x: 22, y: 0 }, { x: -5, y: -14 }, { x: -14, y: -7 },
        { x: -10, y: 0 }, { x: -14, y: 7 },  { x: -5, y: 14 },
      ];
      for (let g = 1; g <= 4; g++) {
        const trailOffset = g * 18;
        const gx = this.x - dash.surgeDir * trailOffset;
        const scale = 1 - g * 0.05;
        ctx.save();
        ctx.translate(gx, this.y);
        ctx.rotate(-Math.PI / 2);
        ctx.rotate(this.tilt);
        ctx.scale(scale, scale);
        ctx.globalAlpha = (0.24 / g) * ghostIntensity;
        ctx.fillStyle = g === 1 ? 'rgba(180, 245, 255, 0.30)' : 'rgba(65, 217, 255, 0.18)';
        ctx.shadowColor = '#41d9ff';
        ctx.shadowBlur = 14;
        ctx.beginPath();
        ghostHull.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
        ctx.closePath();
        ctx.fill();

        ctx.globalAlpha = (0.34 / g) * ghostIntensity;
        ctx.strokeStyle = g === 1 ? '#d5f6ff' : '#7ae7ff';
        ctx.lineWidth = g === 1 ? 1.4 : 1;
        ctx.beginPath();
        ghostHull.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
        ctx.closePath();
        ctx.stroke();

        ctx.globalAlpha = (0.18 / g) * ghostIntensity;
        ctx.fillStyle = '#9be7ff';
        ctx.beginPath();
        ctx.arc(12, 0, 4.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.shadowBlur = 0;
        ctx.shadowColor = 'transparent';
        ctx.globalAlpha = 1;
        ctx.restore();
      }
    }

    if (dashActive) {
      const wakeIntensity = Math.max(0, 1 - dashPhase * 1.15);
      const wakeLen = 44 + wakeIntensity * 20;
      const wakeH = 14 + wakeIntensity * 4;
      const wakeX = this.x - dash.surgeDir * (26 + wakeLen * 0.5);
      ctx.save();
      ctx.translate(wakeX, this.y);
      const wake = ctx.createLinearGradient(-wakeLen / 2, 0, wakeLen / 2, 0);
      if (dash.surgeDir > 0) {
        wake.addColorStop(0, 'rgba(65,217,255,0.00)');
        wake.addColorStop(0.55, 'rgba(65,217,255,0.10)');
        wake.addColorStop(1, 'rgba(180,245,255,0.24)');
      } else {
        wake.addColorStop(0, 'rgba(180,245,255,0.24)');
        wake.addColorStop(0.45, 'rgba(65,217,255,0.10)');
        wake.addColorStop(1, 'rgba(65,217,255,0.00)');
      }
      ctx.globalAlpha = 0.55 * wakeIntensity;
      ctx.fillStyle = wake;
      ctx.beginPath();
      ctx.ellipse(0, 0, wakeLen / 2, wakeH, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    this._drawX = this.x;
    this._drawY = this.y;
  }
};

drone.init();

const player = {
  score: 0,
  dead: false,
  lives: 3,
  deathMessage: '',
  invincibleTimer: 0,
  INVINCIBLE_DURATION: 300,
  altFireType: null,
  spreadFuel: 0,
  SPREAD_MAX_FUEL: 200,
  bassFuel: 0,
  BASS_MAX_FUEL: 100,
  altFireCooldown: 0,
  ALT_FIRE_COOLDOWN: 5000,
  hitFlashTimer: 0,
  HIT_FLASH_MS: 600,
  dashHeatFlashTimer: 0,
  DASH_HEAT_FLASH_MS: 160,

  heat: 0,
  overheated: false,
  overheatTimer: 0,
  HEAT_PER_SHOT: 4,
  HEAT_DECAY: 30,
  OVERHEAT_LOCKOUT: 1500,

  overdriveCharge: 0,
  OVERDRIVE_MAX: 100,
  overdriveActive: false,
  overdriveTimer: 0,
  OVERDRIVE_DURATION: 5000,
  overdriveActivationFlash: 0,

  ultCharge: 0,
  ULT_MAX: 45,
  ultReady: true,
  ultUses: 3,

  get effectiveDamage() {
    let dmg = 1.2 + (stage.current - 1) * 0.45;
    if (this.overdriveActive) dmg *= 1.2;
    return Math.ceil(dmg);
  },

  get fireRateCooldown() {
    let cd = 200;
    if (!isPlayerMoving()) cd *= 0.75;
    if (this.overdriveActive) cd *= 0.85;
    return Math.max(70, cd);
  },

  activateAltFire(type) {
    this.altFireType = type;
    this.altFireCooldown = this.ALT_FIRE_COOLDOWN;
    if (type === 'spread') {
      this.spreadFuel = this.SPREAD_MAX_FUEL;
      this.bassFuel = 0;
    } else if (type === 'bass') {
      this.bassFuel = this.BASS_MAX_FUEL;
      this.spreadFuel = 0;
    }
  },

  hit() {
    if (this.dead || this.invincibleTimer > 0) return;

    this.overdriveCharge = 0;
    this.overdriveActive = false;
    this.overdriveTimer = 0;
    this.lives--;
    this.invincibleTimer = this.INVINCIBLE_DURATION;
    this.hitFlashTimer = this.HIT_FLASH_MS;

    if (this.lives <= 0) {
      this.dead = true;
      audio.play('playerDeath');
      audio.playMusic('death');
      const isHighScore = this.score > save.highScore;
      if (isHighScore) save.highScore = this.score;
      this.deathMessage = isHighScore
        ? 'LETS GOOOOOO'
        : DEATH_TAUNTS[Math.floor(Math.random() * DEATH_TAUNTS.length)];
      save.runs.push({ score: this.score, kills: stage.totalKills });
      if (save.runs.length > 10) save.runs.shift();
      writeSave();

      if (this.score > 0) {
        const savedName = loadPlayerName();
        if (savedName) {
          leaderboard.submitScore(this.score, stage.totalKills);
        } else {
          nameEntry.name = '';
          gameState = 'nameEntry';
        }
      }
    } else {
      audio.play('playerHit');
      stage.shakeTimer = 900;
      stage.shakeIntensity = 14;
    }
  },

  update(delta) {
    this.ultReady = this.ultUses > 0;
    if (this.invincibleTimer > 0) this.invincibleTimer = Math.max(0, this.invincibleTimer - delta);
    if (this.altFireCooldown > 0) this.altFireCooldown = Math.max(0, this.altFireCooldown - delta);
    if (this.hitFlashTimer > 0) this.hitFlashTimer = Math.max(0, this.hitFlashTimer - delta);
    if (this.dashHeatFlashTimer > 0) this.dashHeatFlashTimer = Math.max(0, this.dashHeatFlashTimer - delta);
    if (this.overdriveActivationFlash > 0) this.overdriveActivationFlash = Math.max(0, this.overdriveActivationFlash - delta);
    const nearDeath = this.lives === 1 && !this.dead;

    const dt = delta / 1000;
    if (this.overheated) {
      this.overheatTimer -= delta;
      if (this.overheatTimer <= 0) {
        this.overheated = false;
        this.overheatTimer = 0;
        this.heat = 0;
      }
    } else {
      const bassFiring = this.altFireType === 'bass' && this.bassFuel > 0 && (keys['k'] || keys['K']);
      if (!isFireHeld() && !bassFiring) {
        this.heat = Math.max(0, this.heat - this.HEAT_DECAY * (this.overdriveActive ? 3 : 1) * dt);
      }
      if (this.heat >= 100) {
        this.overheated = true;
        this.overheatTimer = this.OVERHEAT_LOCKOUT;
        audio.play('overheat');
      }
    }

    if (nearDeath && Math.random() < 0.15 && typeof smokeParticles !== 'undefined') {
      smokeParticles.spawn(this.x - 8, this.y, '#444444');
    }

    if (this.altFireType === 'spread' && this.spreadFuel <= 0) {
      this.spreadFuel = 0;
      this.altFireType = null;
    }
    if (this.altFireType === 'bass' && this.bassFuel <= 0) {
      this.bassFuel = 0;
      this.altFireType = null;
    }

    if (this.overdriveActive) {
      this.overdriveTimer -= delta;
      if (this.overdriveTimer <= 0) {
        this.overdriveActive = false;
        this.overdriveTimer = 0;
        audio.play('overdriveEnd');
      }
    } else if (this.overdriveCharge >= this.OVERDRIVE_MAX) {
      this.overdriveActive = true;
      this.overdriveTimer = this.OVERDRIVE_DURATION;
      this.overdriveCharge = 0;
      this.overdriveActivationFlash = 420;
      audio.play('overdriveActivate');
      streakCallout.showOverdrive();
    }
  },

  onKill(isElite = false, fromNuke = false) {
    if (!this.overdriveActive) {
      let gain = isElite ? 18 : 4;
      this.overdriveCharge = Math.min(this.OVERDRIVE_MAX, this.overdriveCharge + gain);
    }

  }
};
