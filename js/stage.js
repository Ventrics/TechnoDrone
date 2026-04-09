let altFireDropIndex = 0;
let mechanicAssignment = {};

function buildMechanicAssignment() {
  return MECHANIC_ASSIGNMENT;
}

function getActiveMechanics() {
  return new Set(MECHANIC_ASSIGNMENT[stage.current] || []);
}

function getEnemyScoreValue(enemy) {
  if (!enemy) return 10;
  if (typeof enemy === 'boolean') return enemy ? 50 : 10;
  if (enemy.isElite) return 50;

  const size = enemy.size || 14;
  if (size <= 12.5) return 18;
  if (size <= 15.5) return 16;
  if (size <= 19.5) return 14;
  if (size <= 24) return 12;
  return 9;
}

mechanicAssignment = buildMechanicAssignment();

const stage = {
  current: 1,
  kills: 0,
  totalKills: 0,
  timer: STAGE_DURATION,
  flashTimer: 0,
  FLASH_MS: 5500,
  shakeTimer: 0,
  shakeIntensity: 0,
  slowmoTimer: 0,
  labelScale: 1,
  chainBreakFlash: 0,
  chainBreakCount: 0,

  onKill(enemy, fromNuke = false) {
    const isElite = !!(typeof enemy === 'boolean' ? enemy : enemy?.isElite);
    const scoreValue = getEnemyScoreValue(enemy);
    this.kills++;
    this.totalKills++;
    player.onKill(isElite, fromNuke);
    const scoreAward = fromNuke ? 0 : scoreValue * player.chainMultiplier;
    if (!fromNuke) {
      player.score += scoreAward;
      const c = player.chain;
      if (c === 75) streakCallout.show('MAXIMUM CHAIN', '#ffffff', 2200, 3.2, 'top');
      else if (c === 50) streakCallout.show('CHAIN x4', '#ff33cc', 1800, 2.8, 'top');
      else if (c === 30) streakCallout.show('CHAIN x3', '#aa88ff', 1600, 2.6, 'top');
      else if (c === 15) streakCallout.show('CHAIN x2', '#31afd4', 1400, 2.4, 'top');
    }

    if (isElite && !fromNuke) {
      const type = ALT_FIRE_TYPES[altFireDropIndex % ALT_FIRE_TYPES.length];
      altFireDropIndex++;
      const ex = (typeof enemy === 'object' && enemy) ? enemy.x : drone.x;
      const ey = (typeof enemy === 'object' && enemy) ? enemy.y : drone.y;
      pickups.spawnEliteOrb(ex, ey, type);
    }

    if (this.totalKills > 0 && this.totalKills % 100 === 0) {
      player.lives = Math.min(5, player.lives + 1);
      audio.play('chainMilestone');
      streakCallout.show(`${this.totalKills} KILLS  +LIFE`, '#ff3366', 1500, 2.2, 'top');
      this.flashTimer = 700;
      this.shakeTimer = 300;
      this.shakeIntensity = 6;
    }

    return scoreAward;
  },

  onChainBroken(count, reason = 'damage') {
    this.chainBreakFlash = 1;
    this.chainBreakCount = count;
    if (reason === 'damage') {
      streakCallout.show('CHAIN LOST', '#ff3030', 1400, 2.6, 'center');
    } else if (reason === 'timeout') {
      streakCallout.show('CHAIN EXPIRED', '#ff6600', 1200, 2.2, 'center');
    }
  },

  _advance() {
    if (this.current === 10) {
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
      dash.reset();
      player.altFireType = null;
      player.spreadFuel = 0;
      player.flowStateActive = false;
      player.flowStateTimer = 0;
      player.flowStateCharge = player.FLOW_STATE_MAX;
      gameState = 'win';
      audio.playMusic('win');
      return;
    }
    this.current++;
    audio.play('stageAdvance');
    this.kills = 0;
    this.timer = STAGE_DURATION;
    COLOR_BG = STAGE_BG_COLORS[this.current - 1];

    if (this.current === 5 || this.current === 8) {
      player.lives = Math.min(4, player.lives + 1);
    }

    if (this.current > furthestStage) {
      furthestStage = this.current;
      writeFurthestStage(this.current);
    }

    this.flashTimer = this.FLASH_MS;
    this.shakeTimer = 400;
    this.shakeIntensity = 4;
    this.slowmoTimer = 0;
    this.labelScale = 2.0;
  },

  update(delta) {
    if (this.flashTimer > 0) this.flashTimer -= delta;
    if (this.shakeTimer > 0) {
      this.shakeTimer -= delta;
      this.shakeIntensity = 8 * (this.shakeTimer / 1500);
    }
    if (this.chainBreakFlash > 0) this.chainBreakFlash = Math.max(0, this.chainBreakFlash - delta / 500);
    if (this.slowmoTimer > 0) this.slowmoTimer -= delta;

    if (gameState === 'playing') {
      this.timer -= delta;
      if (this.timer <= 0) this._advance();
    }


    const labelAnimMs = 400;
    const elapsed = this.FLASH_MS - this.flashTimer;
    if (elapsed < labelAnimMs) {
      const p = elapsed / labelAnimMs;
      this.labelScale = 2.5 - 1.5 * (1 - Math.pow(1 - p, 3));
    } else {
      this.labelScale = 1.0;
    }
  },

  drawFlash() {
    return;
  },

  reset() {
    this.current = 1;
    this.kills = 0;
    this.totalKills = 0;
    this.timer = STAGE_DURATION;
    this.flashTimer = 0;
    this.shakeTimer = 0;
    this.shakeIntensity = 0;
    this.slowmoTimer = 0;
    this.labelScale = 1;
    this.chainBreakFlash = 0;
    this.chainBreakCount = 0;
    COLOR_BG = STAGE_BG_COLORS[0];
    mechanicAssignment = buildMechanicAssignment();
  }
};
