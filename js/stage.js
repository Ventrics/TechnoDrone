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
  if (size <= 7.5) return 20;
  if (size <= 10.5) return 18;
  if (size <= 13.5) return 16;
  if (size <= 18.5) return 14;
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
      if (c === 75) streakCallout.show('MAXIMUM CHAIN', '#ffffff', 2200, 3.8);
      else if (c === 50) streakCallout.show('CHAIN x4', '#ff007f', 1800, 3.2);
      else if (c === 30) streakCallout.show('CHAIN x3', '#ffd400', 1600, 2.8);
      else if (c === 15) streakCallout.show('CHAIN x2', '#31afd4', 1400, 2.4);
    }

    if (isElite) {
      const type = ALT_FIRE_TYPES[altFireDropIndex % ALT_FIRE_TYPES.length];
      altFireDropIndex++;
      if (player.altFireType) {
        player.overdriveCharge = Math.min(player.OVERDRIVE_MAX, player.overdriveCharge + 24);
      } else {
        player.activateAltFire(type);
        audio.play('pickupCollect');
        streakCallout.showAltFire(type);
      }
    }

    if (this.totalKills > 0 && this.totalKills % 100 === 0) {
      player.lives = Math.min(5, player.lives + 1);
      audio.play('chainMilestone');
      streakCallout.show(`${this.totalKills} KILLS  +LIFE`, '#ff3366');
      this.flashTimer = 700;
      this.shakeTimer = 300;
      this.shakeIntensity = 6;
    }

    return scoreAward;
  },

  onChainBroken(count, reason = 'damage') {
    if (reason === 'damage') {
      this.chainBreakFlash = 1;
      this.chainBreakCount = count;
      streakCallout.show('CHAIN LOST', '#ff3030', 1400, 2.6);
    }
  },

  _advance() {
    if (this.current === 10) {
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
