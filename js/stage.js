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
  elapsedMs: 0,
  flashTimer: 0,
  FLASH_MS: 5500,
  stageSplashTimer: 0,
  stageSplashNum: 0,
  STAGE_SPLASH_MS: 1100,
  shakeTimer: 0,
  shakeDuration: 0,
  shakeBaseIntensity: 8,
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
  climaxActive: false,
  climaxFired: new Set(),
  OBSTACLE_TRIGGER_AT: 20000,
  OBSTACLE_DURATION: 5200,
  OBSTACLE_TRANSITION_MS: 450,
  BONUS_RING_SCORE: 200,

  _startShake(duration, intensity) {
    this.shakeTimer = duration;
    this.shakeDuration = duration;
    this.shakeBaseIntensity = intensity;
    this.shakeIntensity = intensity;
  },

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

    // Charge the jackpot meter — weighted by kill score, never from the jackpot itself,
    // and only when the kill is real (not a screen-nuke).
    if (typeof shards !== 'undefined' && !fromNuke && enemy && !enemy.isJackpot && !shards.jackpotSpawned) {
      shards.jackpotMeter += scoreValue;
    }

    if (isElite && !fromNuke) {
      const type = ALT_FIRE_TYPES[altFireDropIndex % ALT_FIRE_TYPES.length];
      altFireDropIndex++;
      const ex = (typeof enemy === 'object' && enemy) ? enemy.x : drone.x;
      const ey = (typeof enemy === 'object' && enemy) ? enemy.y : drone.y;
      pickups.spawnEliteOrb(ex, ey, type);
    }

    if (this.totalKills > 0 && this.totalKills % 200 === 0) {
      player.lives = Math.min(6, player.lives + 1);
      audio.play('chainMilestone');
      streakCallout.show(`${this.totalKills} KILLS  +LIFE`, '#ff3366', 1500, 2.2, 'top');
      this.flashTimer = 700;
      this.shakeTimer = 300;
      this.shakeIntensity = 6;
    }

    return scoreAward;
  },

  _queueClimaxEnemies(type, enemies) {
    if (!Array.isArray(enemies) || !enemies.length || typeof shards === 'undefined') return false;
    const list = enemies.filter(Boolean);

    list.forEach(enemy => {
      enemy.isClimaxEnemy = true;
      enemy.climaxType = type;
      shards.pool.push(enemy);
      if (enemy.isTurret && typeof turretIndicators !== 'undefined') {
        turretIndicators.spawn(enemy.x);
      }
    });
    return true;
  },

  _spawnClimaxKamikazePack() {
    if (typeof spawnKamikaze !== 'function') return false;
    const count = 4 + Math.floor(Math.random() * 3);
    const centerX = Math.max(PLAY_X + 52, Math.min(PLAY_X + PLAY_W - 52, drone.x));
    const spacing = 22;
    const enemies = [];
    for (let i = 0; i < count; i++) {
      const offset = (i - (count - 1) / 2) * spacing + (Math.random() - 0.5) * 8;
      const k = spawnKamikaze();
      k.x = Math.max(PLAY_X + 20, Math.min(PLAY_X + PLAY_W - 20, centerX + offset));
      k.y = PLAY_Y - 22 - Math.random() * 20;
      k.chargerHuntVx = k.x < drone.x ? 47 : -47;
      k.vx = k.chargerHuntVx;
      enemies.push(k);
    }
    return this._queueClimaxEnemies('kamikazePack', enemies);
  },

  _spawnClimaxSwarmBurst() {
    if (typeof spawnShardFromEdge !== 'function') return false;
    const count = 8 + Math.floor(Math.random() * 3);
    const enemies = [];
    for (let i = 0; i < count; i++) {
      const x = PLAY_X + 34 + Math.random() * (PLAY_W - 68);
      const vx = (Math.random() - 0.5) * 150;
      const vy = 150 + Math.random() * 90;
      enemies.push(spawnShardFromEdge('top', x, null, { isElite: false, vx, vy }));
    }
    const pushed = this._queueClimaxEnemies('swarmBurst', enemies);
    if (pushed && typeof shards !== 'undefined') shards.spawnTimer = 0;
    return pushed;
  },

  _spawnClimaxEliteEscort() {
    if (typeof spawnShardFromEdge !== 'function') return false;
    const cx = PLAY_X + PLAY_W * (0.34 + Math.random() * 0.32);
    const wingmen = 3 + Math.floor(Math.random() * 2);
    const enemies = [
      spawnShardFromEdge('top', cx, null, { isElite: true, vx: 0, formationDelay: 120 }),
    ];
    for (let i = 0; i < wingmen; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      const rank = Math.floor(i / 2) + 1;
      const dx = side * (58 + rank * 42);
      enemies.push(spawnShardFromEdge('top', cx + dx, null, {
        isElite: false,
        vx: side * -26,
        formationDelay: 80 + i * 60,
      }));
    }
    return this._queueClimaxEnemies('eliteEscort', enemies);
  },

  _spawnClimaxColumnTrain() {
    if (typeof spawnShardFromEdge !== 'function') return false;
    const targetX = drone.x + (Math.random() - 0.5) * PLAY_W * 0.22;
    const x = Math.max(PLAY_X + 36, Math.min(PLAY_X + PLAY_W - 36, targetX));
    const enemies = [];
    for (let i = 0; i < 5; i++) {
      enemies.push(spawnShardFromEdge('top', x, null, {
        isElite: false,
        formationDelay: i * 200,
      }));
    }
    return this._queueClimaxEnemies('columnTrain', enemies);
  },

  _spawnClimaxCrossfire() {
    if (typeof spawnTurret !== 'function') return false;
    const left = spawnTurret(1);
    const right = spawnTurret(3);
    left.x = PLAY_X + PLAY_W * 0.22;
    right.x = PLAY_X + PLAY_W * 0.78;
    left.lockY = PLAY_Y + PLAY_H * 0.24;
    right.lockY = PLAY_Y + PLAY_H * 0.36;
    return this._queueClimaxEnemies('crossfire', [left, right]);
  },

  _spawnClimaxShieldCluster() {
    if (typeof spawnShieldDrone !== 'function' || typeof spawnShardFromEdge !== 'function') return false;
    const cx = PLAY_X + PLAY_W * (0.32 + Math.random() * 0.36);
    const protectees = [-48, 0, 48].map((dx, i) => spawnShardFromEdge('top', cx + dx, null, {
      isElite: i === 1,
      vx: dx * -0.18,
      formationDelay: i * 90,
    }));
    const drones = [spawnShieldDrone(), spawnShieldDrone()];
    drones.forEach((droneEnemy, i) => {
      const target = protectees[Math.min(i, protectees.length - 1)];
      droneEnemy.x = Math.max(PLAY_X + 24, Math.min(PLAY_X + PLAY_W - 24, cx + (i === 0 ? -72 : 72)));
      droneEnemy.y = PLAY_Y - 16 - i * 10;
      droneEnemy.supportTarget = target;
      target.isShieldProtected = true;
    });
    return this._queueClimaxEnemies('shieldCluster', [...protectees, ...drones]);
  },

  _spawnClimaxPincer() {
    if (typeof spawnShardFromEdge !== 'function') return false;
    const enemies = [];
    [0.18, 0.30, 0.42].forEach((yFrac, i) => {
      const y = PLAY_Y + PLAY_H * yFrac;
      enemies.push(spawnShardFromEdge('left', null, y, { isElite: false, formationDelay: i * 80 }));
      enemies.push(spawnShardFromEdge('right', null, y + PLAY_H * 0.035, { isElite: false, formationDelay: i * 80 }));
    });
    return this._queueClimaxEnemies('pincer', enemies);
  },

  _fireStage10ClimaxEvent(entry) {
    if (entry.type === 'callout') {
      streakCallout.show(entry.text, entry.color, entry.duration, entry.scale, entry.zone);
      return true;
    }
    if (entry.type === 'shake') {
      this._startShake(entry.duration, entry.intensity);
      return true;
    }
    if (entry.type === 'kamikazePack') return this._spawnClimaxKamikazePack();
    if (entry.type === 'swarmBurst') return this._spawnClimaxSwarmBurst();
    if (entry.type === 'eliteEscort') return this._spawnClimaxEliteEscort();
    if (entry.type === 'columnTrain') return this._spawnClimaxColumnTrain();
    if (entry.type === 'crossfire') return this._spawnClimaxCrossfire();
    if (entry.type === 'shieldCluster') return this._spawnClimaxShieldCluster();
    if (entry.type === 'pincer') return this._spawnClimaxPincer();
    return false;
  },

  _dispatchStage10Climax() {
    if (this.current !== 10 || typeof STAGE_10_CLIMAX === 'undefined') return;
    const firstStart = STAGE_10_CLIMAX[0]?.t ?? Infinity;
    if (!this.climaxActive && this.elapsedMs >= firstStart) this.climaxActive = true;
    for (let i = 0; i < STAGE_10_CLIMAX.length; i++) {
      if (this.climaxFired.has(i)) continue;
      const entry = STAGE_10_CLIMAX[i];
      if (this.elapsedMs >= entry.t) {
        this.climaxFired.add(i);
        this._fireStage10ClimaxEvent(entry);
      }
    }
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
    this.stageSplashTimer = this.STAGE_SPLASH_MS;
    this.stageSplashNum = this.current;
    this.kills = 0;
    this.timer = STAGE_DURATION;
    this.elapsedMs = 0;
    this.climaxActive = false;
    this.climaxFired = new Set();
    // Remove any live jackpot and reset the meter for the incoming stage
    for (const s of shards.pool) {
      if (s.isJackpot) {
        if (s.jackpotHeartbeatActive) {
          audio.stopLoop('jackpotHeartbeatLoop');
          s.jackpotHeartbeatActive = false;
        }
        window.__TD_LEDGER__?.markRemoved(s, 'stageAdvance');
        shards._destroyEntityGfx?.(s);
      }
    }
    shards.pool = shards.pool.filter(s => !s.isJackpot);
    shards.jackpotSpawned = false;
    shards.jackpotSpawnAt = 5000 + Math.random() * 20000;
    shards.jackpotMeter = 0;
    shards.jackpotMeterTellShown = false;
    shards.jackpotPendingEdge = null;
    shards.jackpotPendingTimer = 0;
    shards.jackpotShimmerEdge = null;
    shards.jackpotShimmerTimer = 0;
    shards.jackpotShimmerDuration = 0;
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
    if (this.stageSplashTimer > 0) this.stageSplashTimer = Math.max(0, this.stageSplashTimer - delta);
    if (this.shakeTimer > 0) {
      this.shakeTimer -= delta;
      const duration = this.shakeDuration || 1500;
      const baseIntensity = this.shakeDuration ? this.shakeBaseIntensity : 8;
      this.shakeIntensity = Math.max(0, baseIntensity * (this.shakeTimer / duration));
      if (this.shakeTimer <= 0) {
        this.shakeTimer = 0;
        this.shakeDuration = 0;
        this.shakeIntensity = 0;
      }
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
      this.elapsedMs = Math.max(0, STAGE_DURATION - this.timer);
      this._dispatchStage10Climax();
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
    this.elapsedMs = 0;
    this.flashTimer = 0;
    this.stageSplashTimer = 0;
    this.stageSplashNum = 0;
    this.shakeTimer = 0;
    this.shakeDuration = 0;
    this.shakeBaseIntensity = 8;
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
    this.climaxActive = false;
    this.climaxFired = new Set();
    COLOR_BG = STAGE_BG_COLORS[0];
    pixiPost.setStage(1);
    pixiPost.setFlowState(false);
  }
};
