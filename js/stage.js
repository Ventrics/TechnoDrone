let altFireDropIndex = 0;

function getActiveMechanics() {
  return new Set(MECHANIC_ASSIGNMENT[stage.current] || []);
}

function getEnemyScoreValue(enemy) {
  if (!enemy) return 10;
  if (typeof enemy === 'boolean') return enemy ? 100 : 10;
  if (enemy.isBonusRing) return 0;
  if (enemy.isGatePiece) return 0;
  // Bonus — jackpot
  if (enemy.isJackpot)      return 500;
  // Top tier — high-threat specialists
  if (enemy.isTurret)      return 200;
  if (enemy.isShieldDrone) return 175;
  if (enemy.isKamikaze)    return 150;
  // Mid tier
  if (enemy.isElite)       return 100;
  // Base tier — size-based shard value (bigger = more points, they're tankier)
  const size = enemy.size || 20;
  if (size <= 23) return 10;   // small (20px base)
  if (size <= 29) return 18;   // medium (26px base)
  return 25;                   // large (32px base)
}

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
  obstacleActive: false,
  obstacleTimer: 0,
  obstacleTransitionTimer: 0,
  obstacleSpawnTimer: 0,
  obstacleRowsSpawned: 0,
  obstacleTriggered: false,
  finaleActive: false,
  finaleClearDelay: 0,
  OBSTACLE_TRIGGER_AT: 20000,
  OBSTACLE_DURATION: 5200,
  OBSTACLE_TRANSITION_MS: 450,
  BONUS_RING_SCORE: 200,

  onKill(enemy, fromNuke = false) {
    if (enemy && enemy.isBonusRing) return 0;
    if (enemy && enemy.isGatePiece) return 0;
    const isElite = !!(typeof enemy === 'boolean' ? enemy : enemy?.isElite);
    const scoreValue = getEnemyScoreValue(enemy);
    this.kills++;
    this.totalKills++;
    player.onKill(isElite, fromNuke);
    const scoreAward = fromNuke ? 0 : scoreValue;
    if (!fromNuke) {
      player.score += scoreAward;
    }

    if (isElite && !fromNuke) {
      const type = ALT_FIRE_TYPES[altFireDropIndex % ALT_FIRE_TYPES.length];
      altFireDropIndex++;
      const ex = (typeof enemy === 'object' && enemy) ? enemy.x : drone.x;
      const ey = (typeof enemy === 'object' && enemy) ? enemy.y : drone.y;
      pickups.spawnEliteOrb(ex, ey, type);
    }

    if (this.totalKills > 0 && this.totalKills % 200 === 0) {
      player.lives = Math.min(5, player.lives + 1);
      audio.play('chainMilestone');
      streakCallout.show(`${this.totalKills} KILLS  +LIFE`, '#ff3366', 1500, 2.2, 'top');
      this.flashTimer = 700;
      this.shakeTimer = 300;
      this.shakeIntensity = 6;
    }

    return scoreAward;
  },

  _isObstacleStage() {
    return this.current === 3 || this.current === 6 || this.current === 9;
  },

  _startObstacleWave() {
    this.obstacleActive = true;
    this.obstacleTimer = this.OBSTACLE_DURATION;
    this.obstacleTransitionTimer = this.OBSTACLE_TRANSITION_MS;
    this.obstacleSpawnTimer = 0;
    this.obstacleRowsSpawned = 0;
    this.obstacleTriggered = true;

    streakCallout.show('BONUS RINGS', '#f5c542', 1700, 2.5, 'center');
    if (typeof startBonusRingWave === 'function') {
      startBonusRingWave();
    }
  },

  _endObstacleWave() {
    this.obstacleActive = false;
    this.obstacleTimer = 0;
    this.obstacleTransitionTimer = 0;
    this.obstacleSpawnTimer = 0;
    this.obstacleRowsSpawned = 0;
    if (typeof stopBonusRingWave === 'function') stopBonusRingWave();
  },

  onBonusRingCollect(ring) {
    const scoreAward = ring?.scoreValue || this.BONUS_RING_SCORE;
    player.score += scoreAward;
    return scoreAward;
  },

  _spawnFinalEnemy() {
    if (typeof spawnShard !== 'function') return;
    const finalEnemy = spawnShard();
    finalEnemy.isElite = true;
    finalEnemy.isFinaleEnemy = true;
    finalEnemy.x = PLAY_X + PLAY_W * 0.5;
    finalEnemy.y = PLAY_Y - 42;
    finalEnemy.vx = 0;
    finalEnemy.vy = 170;
    finalEnemy.size = Math.max(finalEnemy.size * 1.65, 34);
    finalEnemy.color = '#f5f7ff';
    finalEnemy.hp = 22;
    finalEnemy.maxHp = 22;
    finalEnemy.turnRate = 0.78;
    finalEnemy.lifetime = 40000;
    if (typeof makeRegularPolygon === 'function') {
      finalEnemy.pts = makeRegularPolygon(finalEnemy.size, 8, Math.PI / 8);
    }
    shards.pool.push(finalEnemy);
  },

  _beginFinale() {
    this._endObstacleWave();
    if (typeof clearBonusRings === 'function') clearBonusRings();
    this.finaleActive = true;
    this.finaleClearDelay = 0;
    this.obstacleActive = true; // freeze further enemy spawning while current threats remain active
    this.obstacleTriggered = true;
    this.timer = 0;
    this._spawnFinalEnemy();
    if (typeof beginMissionCompleteSequence === 'function') beginMissionCompleteSequence();
  },

  _advance() {
    this._endObstacleWave();
    if (this.current === 10) {
      this._beginFinale();
      return;
    }
    this.current++;
    audio.play('stageAdvance');
    this.kills = 0;
    this.timer = STAGE_DURATION;
    // Remove any live jackpot and arm a new one for the incoming stage
    shards.pool = shards.pool.filter(s => !s.isJackpot);
    shards.jackpotSpawned = false;
    shards.jackpotSpawnAt = 5000 + Math.random() * 20000;
    COLOR_BG = STAGE_BG_COLORS[this.current - 1];
    pixiPost.setStage(this.current);


    if (this.current > furthestStage) {
      furthestStage = this.current;
      writeFurthestStage(this.current);
    }

    this.flashTimer = this.FLASH_MS;
    this.shakeTimer = 400;
    this.shakeIntensity = 4;
    this.slowmoTimer = 0;
    this.labelScale = 2.0;
    this.obstacleTriggered = false;
  },

  update(delta) {
    if (this.flashTimer > 0) this.flashTimer -= delta;
    if (this.shakeTimer > 0) {
      this.shakeTimer -= delta;
      this.shakeIntensity = 8 * (this.shakeTimer / 1500);
    }
    if (this.slowmoTimer > 0) this.slowmoTimer -= delta;

    if (gameState === 'playing') {
      const elapsed = STAGE_DURATION - this.timer;
      if (!this.obstacleActive && !this.obstacleTriggered && this._isObstacleStage() && elapsed >= this.OBSTACLE_TRIGGER_AT) {
        this._startObstacleWave();
      }

      if (this.obstacleActive) {
        this.obstacleTimer -= delta;
        if (typeof updateBonusRingWave === 'function') updateBonusRingWave(delta);
        if (this.obstacleTimer <= 0 || (typeof isBonusRingWaveComplete === 'function' && isBonusRingWaveComplete())) {
          this._endObstacleWave();
        }
      }
      this.timer -= delta;
      if (this.timer <= 0) this._advance();
    }

    if (gameState === 'finale') {
      const liveEnemies = shards.pool.filter(s => !s.isGatePiece && !s.isBonusRing).length;
      const arenaClear = liveEnemies === 0 && enemyBullets.pool.length === 0 && !screenNuke.active;
      this.finaleClearDelay = arenaClear ? this.finaleClearDelay + delta : 0;
      if (this.finaleClearDelay >= 550 && typeof startMissionCompleteScreen === 'function') {
        this.finaleActive = false;
        this.obstacleActive = false;
        startMissionCompleteScreen();
      }
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
    this.obstacleActive = false;
    this.obstacleTimer = 0;
    this.obstacleTransitionTimer = 0;
    this.obstacleSpawnTimer = 0;
    this.obstacleRowsSpawned = 0;
    this.obstacleTriggered = false;
    this.finaleActive = false;
    this.finaleClearDelay = 0;
    COLOR_BG = STAGE_BG_COLORS[0];
    pixiPost.setStage(1);
    pixiPost.setFlowState(false);
  }
};
