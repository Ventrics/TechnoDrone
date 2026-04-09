function _lerpColor(hex1, hex2, t) {
  const r1 = parseInt(hex1.slice(1,3),16), g1 = parseInt(hex1.slice(3,5),16), b1 = parseInt(hex1.slice(5,7),16);
  const r2 = parseInt(hex2.slice(1,3),16), g2 = parseInt(hex2.slice(3,5),16), b2 = parseInt(hex2.slice(5,7),16);
  const r = Math.round(r1 + (r2-r1)*t), g = Math.round(g1 + (g2-g1)*t), b = Math.round(b1 + (b2-b1)*t);
  return '#' + r.toString(16).padStart(2,'0') + g.toString(16).padStart(2,'0') + b.toString(16).padStart(2,'0');
}

function makeRegularPolygon(size, sides, rotation = -Math.PI / 2) {
  const pts = [];
  for (let i = 0; i < sides; i++) {
    const angle = rotation + (i / sides) * Math.PI * 2;
    pts.push({ x: Math.cos(angle) * size, y: Math.sin(angle) * size });
  }
  return pts;
}

function makeShardShape(size) {
  return makeRegularPolygon(size, 3);
}

function makeArrowheadShape(size) {
  return [
    { x: size * 1.7, y: 0 },
    { x: size * 0.3, y: size * 0.9 },
    { x: -size * 0.85, y: size * 0.45 },
    { x: -size * 0.45, y: 0 },
    { x: -size * 0.85, y: -size * 0.45 },
    { x: size * 0.3, y: -size * 0.9 },
  ];
}

function tracePolygonPath(points, scale = 1) {
  ctx.beginPath();
  ctx.moveTo(points[0].x * scale, points[0].y * scale);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x * scale, points[i].y * scale);
  ctx.closePath();
}

function makeSharpShard(size) {
  const pts = [];
  const len = size * (1.8 + Math.random() * 1.4);
  const wid = size * (0.18 + Math.random() * 0.22);
  const sides = Math.random() < 0.5 ? 4 : 5;

  if (sides === 4) {
    pts.push({ x: len * 0.5, y: 0 });
    pts.push({ x: len * 0.05, y: wid + (Math.random() - 0.5) * wid * 0.4 });
    pts.push({ x: -len * 0.5, y: 0 });
    pts.push({ x: len * 0.05, y: -wid + (Math.random() - 0.5) * wid * 0.4 });
  } else {
    pts.push({ x: len * 0.5, y: 0 });
    pts.push({ x: len * 0.15, y: wid });
    pts.push({ x: -len * 0.1, y: wid * 0.5 + (Math.random() - 0.5) * wid });
    pts.push({ x: -len * 0.5, y: 0 });
    pts.push({ x: len * 0.05, y: -wid });
  }
  return pts;
}

function getStageEnemyStats() {
  const s = stage.current;
  const cfg = STAGE_CONFIG[s - 1];

  // Last 10s of a stage: smoothly blend newly spawned enemies toward the next stage color
  const TRANSITION_MS = 10000;
  let color = STAGE_ENEMY_COLORS[s - 1];
  if (s < 10 && stage.timer < TRANSITION_MS) {
    const blend = (1 - stage.timer / TRANSITION_MS) * 0.5; // 0 → 0.5
    color = _lerpColor(color, STAGE_ENEMY_COLORS[s], blend);
  }

  return {
    color,
    eliteColor: STAGE_ELITE_COLORS[s - 1],
    speed: cfg.speed,
    baseHp: s === 1 ? 2 : 3 + Math.floor((s - 1) * 0.55),
    turnRate: 0.5 + (s - 1) * 0.22,
  };
}

function spawnShard() {
  const stats = getStageEnemyStats();
  const cfg = STAGE_CONFIG[stage.current - 1];
  const isElite = Math.random() < cfg.eliteChance;
  // Top-down: all enemies spawn from the top edge
  const x = PLAY_X + 30 + Math.random() * (PLAY_W - 60);
  return shards._makeShard(x, PLAY_Y - 30, stats, isElite, true, 'top');
}

function spawnKamikaze() {
  const size = 10;

  // Spawn offset away from player X
  const side = drone.x - (PLAY_X + PLAY_W / 2) > 0 ? -1 : 1; // opposite side from player
  const offsetX = (80 + Math.random() * 100) * side;
  const spawnX = Math.max(PLAY_X + 20, Math.min(PLAY_X + PLAY_W - 20, (PLAY_X + PLAY_W / 2) + offsetX));
  const huntVx = spawnX < drone.x ? 55 : -55;

  return {
    x: spawnX,
    y: PLAY_Y - 20,
    size,
    color: '#ff2200',
    vx: huntVx,
    vy: 30,
    angle: Math.random() * Math.PI * 2,
    spin: 0.14,
    pts: makeArrowheadShape(size),
    hp: 1,
    maxHp: 1,
    isElite: false,
    isKamikaze: true,
    isCharger: true,
    chargerState: 'hunt',
    chargerHuntVx: huntVx,
    chargerLockedX: null,
    chargerTelegraphTimer: 0,
    chargerChargeSpeed: 640,
    isMini: false,
    flashTimer: 0,
    hpBarTimer: 0,
    lifetime: 12000,
  };
}

function spawnDrift() {
  const stats = getStageEnemyStats();
  const size = 12 + Math.random() * 8;
  const speed = 100 + Math.random() * 100;
  const color = stats.color;
  // Top-down: spawn from top edge, drift downward with slight horizontal jitter
  const x = PLAY_X + size + Math.random() * (PLAY_W - size * 2);
  const y = PLAY_Y - size;
  const angle = Math.PI * 0.5 + (Math.random() - 0.5) * 0.6;
  return {
    x,
    y,
    size,
    color,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    angle: Math.random() * Math.PI * 2,
    spin: (Math.random() - 0.5) * 0.08,
    pts: makeShardShape(size),
    hp: 1 + Math.floor(stage.current / 4),
    maxHp: 1 + Math.floor(stage.current / 4),
    isElite: false,
    isKamikaze: false,
    isDrift: true,
    isMini: false,
    turnRate: 0,
    flashTimer: 0,
    hpBarTimer: 0,
    _grazeCd: 0,
  };
}

function spawnMini(x, y, color) {
  const stats = getStageEnemyStats();
  const speed = stats.speed * 1.5;
  const angle = Math.random() * Math.PI * 2;
  const size = 12;
  return {
    x, y,
    size,
    color,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    angle: Math.random() * Math.PI * 2,
    spin: (Math.random() - 0.5) * 0.12,
    pts: makeShardShape(size),
    hp: 1,
    maxHp: 1,
    isElite: false,
    isKamikaze: false,
    isMini: true,
    turnRate: stats.turnRate * 1.5,
    flashTimer: 0,
    hpBarTimer: 0,
    _grazeCd: 0,
  };
}

const OBSTACLE_GATE_PATTERNS = {
  3: [0.32, 0.68, 0.42],
  6: [0.62, 0.28, 0.70],
  9: [0.40, 0.72, 0.30],
};

function createObstacleGatePiece(x, y, width, height, isTarget, rowId) {
  return {
    x, y,
    size: Math.max(width, height) * 0.5,
    gateWidth: width,
    gateHeight: height,
    color: isTarget ? '#ff2244' : '#f4f3ff',
    vx: 0,
    vy: 330,
    angle: 0,
    spin: 0,
    pts: null,
    hp: isTarget ? 1 : 9999,
    maxHp: isTarget ? 1 : 9999,
    isElite: false,
    isKamikaze: false,
    isMini: false,
    isGatePiece: true,
    isGateTarget: isTarget,
    isGateBlocker: !isTarget,
    gateRowId: rowId,
    turnRate: 0,
    flashTimer: 0,
    hpBarTimer: 0,
    lifetime: 12000,
    shieldHp: 0,
    maxShieldHp: 0,
    _grazeCd: 0,
  };
}

function spawnObstacleGateRow(rowIndex = 0) {
  const pattern = OBSTACLE_GATE_PATTERNS[stage.current] || OBSTACLE_GATE_PATTERNS[3];
  const targetCenter = pattern[rowIndex % pattern.length];
  const rowId = `${stage.current}-${rowIndex}-${Date.now()}`;
  const y = PLAY_Y - 18;
  const h = 28;
  const targetW = PLAY_W * 0.22;
  const targetX = PLAY_X + PLAY_W * targetCenter;
  const targetLeft = Math.max(PLAY_X + 80, Math.min(PLAY_X + PLAY_W - 80 - targetW, targetX - targetW * 0.5));
  const targetRight = targetLeft + targetW;

  const leftW = Math.max(0, targetLeft - PLAY_X);
  const rightW = Math.max(0, PLAY_X + PLAY_W - targetRight);

  if (leftW > 0) {
    shards.pool.push(createObstacleGatePiece(PLAY_X + leftW * 0.5, y, leftW, h, false, rowId));
  }
  shards.pool.push(createObstacleGatePiece(targetLeft + targetW * 0.5, y, targetW, h, true, rowId));
  if (rightW > 0) {
    shards.pool.push(createObstacleGatePiece(targetRight + rightW * 0.5, y, rightW, h, false, rowId));
  }
}

function clearObstacleGateRows() {
  shards.pool = shards.pool.filter(s => !s.isGatePiece);
}

// X zones for turret placement — horizontal spread across play area
const TURRET_X_ZONES = [0.12, 0.30, 0.50, 0.70, 0.88];
const TURRET_SPAWN_SCHEDULES = {
  2:  [2000, 7000, 12000, 18000, 24000],
  3:  [4000, 10000, 16000, 22000],
  4:  [3000, 9000, 15000, 21000],
  5:  [4000, 12000, 20000],
  6:  [6000, 15000, 25000],
  7:  [3000, 8000, 14000, 20000],
  8:  [2000, 7000, 12000, 18000, 24000],
  9:  [2000, 7000, 12000, 18000, 24000],
  10: [2000, 6000, 11000, 17000, 23000],
};

// Lock Y rows: alternate between near top (22%) and mid-top (38%) for depth variation
const TURRET_LOCK_Y = [0.22, 0.38, 0.22, 0.38, 0.22];

const SHIELD_DRONE_SPAWN_SCHEDULES = {
  4: [5000, 13000, 21000],
};

function getBacklineYLimit() {
  return PLAY_Y + PLAY_H * 0.42;
}

function spawnTurret(zoneIndex) {
  // Top-down: turrets spread horizontally across the play area, drift down, lock to a Y row
  const zoneFrac = TURRET_X_ZONES[zoneIndex % TURRET_X_ZONES.length] || 0.5;
  const bandWidth = PLAY_W * 0.12;
  const centerX = PLAY_X + PLAY_W * zoneFrac;
  const x = Math.max(PLAY_X + 30, Math.min(PLAY_X + PLAY_W - 30, centerX + (Math.random() - 0.5) * bandWidth));
  const lockFrac = TURRET_LOCK_Y[zoneIndex % TURRET_LOCK_Y.length];
  const isStage7 = stage.current === 7;
  const lockY = Math.min(PLAY_Y + PLAY_H * (isStage7 ? Math.min(lockFrac, 0.24) : lockFrac), getBacklineYLimit());
  const turretFireTimerMax = stage.current >= 8 ? 900 : stage.current >= 5 ? 1200 : 1500;
  return {
    x,
    y: PLAY_Y - 30,
    lockY,
    size: 13,
    color: '#ff2200',
    vx: 0,
    vy: 280,
    isTurret: true,
    turretLocked: false,
    turretFireTimer: turretFireTimerMax,
    turretCharging: false,
    turretChargeTimer: 0,
    hp: 7,
    maxHp: 7,
    isElite: false,
    isKamikaze: false,
    isMini: false,
    angle: 0,
    spin: 0.04,
    shieldHp: 0,
    maxShieldHp: 0,
    turnRate: 0,
    flashTimer: 0,
    hpBarTimer: 0,
    _grazeCd: 0,
  };
}

function spawnShieldDrone() {
  return {
    x: PLAY_X + 20 + Math.random() * (PLAY_W - 40),
    y: PLAY_Y - 20,
    size: 10,
    color: '#00eeff',
    vx: 0,
    vy: 180,
    isShieldDrone: true,
    supportTarget: null,
    retargetTimer: 0,
    orbitAngle: Math.random() * Math.PI * 2,
    ringAngle: 0,
    hp: 2,
    maxHp: 2,
    isElite: false,
    isKamikaze: false,
    isMini: false,
    isTurret: false,
    angle: 0,
    spin: 0.07,
    shieldHp: 0,
    maxShieldHp: 0,
    turnRate: 0,
    flashTimer: 0,
    hpBarTimer: 0,
    _grazeCd: 0,
  };
}

function spawnShardFromEdge(edge, xOverride, yOverride, overrides = {}) {
  const stats = getStageEnemyStats();
  const cfg = STAGE_CONFIG[stage.current - 1];
  const isElite = overrides.isElite ?? (Math.random() < cfg.eliteChance * 0.5);
  let sx, sy, baseVx, baseVy;
  const spd = stats.speed;
  if (edge === 'left') {
    sx = PLAY_X - 30;
    sy = yOverride ?? (PLAY_Y + 40 + Math.random() * PLAY_H * 0.45);
    baseVx = spd * 0.8;
    baseVy = spd * 0.35;
  } else if (edge === 'right') {
    sx = PLAY_X + PLAY_W + 30;
    sy = yOverride ?? (PLAY_Y + 40 + Math.random() * PLAY_H * 0.45);
    baseVx = -spd * 0.8;
    baseVy = spd * 0.35;
  } else { // 'top'
    sx = xOverride ?? (PLAY_X + 30 + Math.random() * (PLAY_W - 60));
    sy = PLAY_Y - 30;
    baseVx = (Math.random() - 0.5) * spd * 0.35;
    baseVy = spd * 0.85;
  }
  const shard = shards._makeShard(sx, sy, stats, isElite, true, 'top');
  shard.vx = overrides.vx ?? baseVx;
  shard.vy = overrides.vy ?? baseVy;
  const delay = overrides.formationDelay ?? 0;
  if (delay > 0) {
    shard.formationDelay = delay;
    shard.formationDelayActive = true;
    shard._savedVx = shard.vx;
    shard._savedVy = shard.vy;
    shard.vx = 0;
    shard.vy = 0;
  } else {
    shard.formationDelay = 0;
    shard.formationDelayActive = false;
  }
  return shard;
}

function spawnFormationLineRush() {
  const count = 4 + Math.round(Math.random());
  for (let i = 0; i < count; i++) {
    const x = PLAY_X + PLAY_W * ((i + 0.5) / count);
    const inwardVx = (x < PLAY_X + PLAY_W / 2) ? 20 : -20;
    const s = spawnShardFromEdge('top', x, null, { vx: inwardVx });
    shards.pool.push(s);
  }
}

function spawnFormationVWing() {
  const cx = PLAY_X + PLAY_W / 2;
  const positions = [
    { dx: 0,    dy: 0,   vx: 0   },
    { dx: -60,  dy: 20,  vx: 30  },
    { dx: 60,   dy: 20,  vx: -30 },
    { dx: -120, dy: 40,  vx: 45  },
    { dx: 120,  dy: 40,  vx: -45 },
  ];
  positions.forEach(p => {
    const s = spawnShardFromEdge('top', cx + p.dx, PLAY_Y - 30 + p.dy, { vx: p.vx });
    shards.pool.push(s);
  });
}

function spawnFormationSwarmBurst() {
  const count = 6 + Math.floor(Math.random() * 3);
  const cx = PLAY_X + PLAY_W * (0.3 + Math.random() * 0.4);
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    const spreadVx = Math.cos(angle) * 90;
    const spreadVy = Math.max(30, Math.sin(angle) * 60 + 80);
    const jx = cx + (Math.random() - 0.5) * 24;
    const s = spawnShardFromEdge('top', jx, null, { vx: spreadVx, vy: spreadVy });
    shards.pool.push(s);
  }
}

function spawnFormationPincer() {
  const yPositions = [0.18, 0.30, 0.42];
  yPositions.forEach(yFrac => {
    const y = PLAY_Y + PLAY_H * yFrac;
    const sl = spawnShardFromEdge('left', null, y, {});
    const sr = spawnShardFromEdge('right', null, y, {});
    shards.pool.push(sl, sr);
  });
}

function spawnFormationColumnTrain() {
  const targetX = drone.x + (Math.random() - 0.5) * PLAY_W * 0.25;
  const x = Math.max(PLAY_X + 30, Math.min(PLAY_X + PLAY_W - 30, targetX));
  for (let i = 0; i < 4; i++) {
    const s = spawnShardFromEdge('top', x, null, { formationDelay: i * 160 });
    shards.pool.push(s);
  }
}

function spawnFormation() {
  const s = stage.current;
  const pool = [];
  if (s >= 4) { pool.push('lineRush', 'vWing'); }
  if (s >= 6) { pool.push('swarmBurst', 'swarmBurst', 'vWing'); }
  if (s >= 8) { pool.push('pincer', 'columnTrain'); }
  if (!pool.length) return;
  const pick = pool[Math.floor(Math.random() * pool.length)];
  if (pick === 'lineRush') spawnFormationLineRush();
  else if (pick === 'vWing') spawnFormationVWing();
  else if (pick === 'swarmBurst') spawnFormationSwarmBurst();
  else if (pick === 'pincer') spawnFormationPincer();
  else if (pick === 'columnTrain') spawnFormationColumnTrain();
  shards.formationCooldown = 2000;
}

// Screen-edge indicator when turrets spawn
const turretIndicators = {
  pool: [],
  spawn(x) {
    this.pool.push({ x, life: 1.0 });
  },
  update(delta) {
    const dt = delta / 1000;
    this.pool = this.pool.filter(ind => {
      ind.life -= dt * 1.5;
      return ind.life > 0;
    });
  },
  draw() {
    this.pool.forEach(ind => {
      const y = PLAY_Y + 4;
      ctx.save();
      ctx.globalAlpha = ind.life * 0.7;
      setGlow('#ff6600', 20);
      ctx.fillStyle = '#ff6600';
      ctx.beginPath();
      ctx.moveTo(ind.x - 20, y);
      ctx.lineTo(ind.x, y + 4);
      ctx.lineTo(ind.x + 20, y);
      ctx.closePath();
      ctx.fill();
      // Vertical streak downward
      ctx.globalAlpha = ind.life * 0.25;
      ctx.fillRect(ind.x - 1.5, PLAY_Y, 3, 80);
      clearGlow();
      ctx.restore();
    });
  },
  reset() { this.pool = []; }
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

const shards = {
  pool: [],
  spawnTimer: 0,
  kamikazeTimer: 0,
  turretTimer: 0,
  shieldDroneTimer: 0,
  formationTimer: 0,
  formationCooldown: 0,

  _makeShard(x, y, stats, isElite, enableMechanics = false, edge = 'right') {
    const size = (16 + Math.random() * 16) * (isElite ? 1.4 : 1);
    const color = isElite ? stats.eliteColor || stats.color : stats.color;
    const rawSpd = stats.speed + Math.random() * 80;
    const speed = player.lives === 1 ? rawSpd * 1.2 : rawSpd;
    const baseHp = Math.max(1, stats.baseHp * (isElite ? 2 : 1) - (!isElite && stage.current === 7 ? 1 : 0));
    let vx, vy;
    if (edge === 'top') {
      // Downward, small horizontal drift
      vx = (Math.random() - 0.5) * speed * 0.35;
      vy = speed * 0.85 + Math.random() * speed * 0.15;
    } else {
      // Legacy fallback (shouldn't be used in top-down mode)
      vx = -speed;
      vy = (Math.random() - 0.5) * 40;
    }
    const shard = {
      x, y, size, color,
      vx,
      vy,
      angle: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 0.06,
      pts: isElite ? makeRegularPolygon(size, 6) : makeShardShape(size),
      hp: baseHp,
      maxHp: baseHp,
      isElite,
      isKamikaze: false,
      isMini: false,
      turnRate: stats.turnRate || 0.5,
      flashTimer: 0,
      hpBarTimer: 0,
      lifetime: 18000 + Math.random() * 4000,
      formationDelay: 0,
      formationDelayActive: false,
      _savedVx: 0,
      _savedVy: 0,
    };
    if (enableMechanics) this._applyMechanics(shard, getActiveMechanics());
    return shard;
  },

  _applyMechanics(shard, active) {
    shard.shieldHp = active.has('shielded') ? (shard.isElite ? 3 : 2) : 0;
    shard.maxShieldHp = shard.shieldHp;
  },

  get spawnInterval() { return STAGE_CONFIG[stage.current - 1].spawnInterval; },
  get maxEnemies() { return STAGE_CONFIG[stage.current - 1].maxEnemies; },
  get homingChance() { return STAGE_CONFIG[stage.current - 1].homingChance; },

  update(delta) {
    const dt = delta / 1000;
    const active = getActiveMechanics();

    if (!stage.obstacleActive) {
      this.spawnTimer += delta;
      if (this.spawnTimer >= this.spawnInterval && this.pool.length < this.maxEnemies) {
        this.spawnTimer = 0;
        const count = stage.current === 1
          ? 2 + Math.floor(Math.random() * 2)
          : 1 + Math.floor(Math.random() * 3);
        for (let i = 0; i < count && this.pool.length < this.maxEnemies; i++) {
          if (Math.random() < this.homingChance) {
            this.pool.push(spawnShard());
          } else {
            this.pool.push(spawnDrift());
          }
        }
      }

      if (active.has('kamikazes')) {
        if (this.kamikazeTimer > 0) this.kamikazeTimer -= delta;
        if (this.kamikazeTimer <= 0 && this.pool.length < this.maxEnemies) {
          this.pool.push(spawnKamikaze());
          this.kamikazeTimer = STAGE_CONFIG[stage.current - 1].kamikazeInterval || 2500;
        }
      }

      // Turret spawning — fixed schedule within the stage
      const turretInterval = STAGE_CONFIG[stage.current - 1].turretInterval;
      if (turretInterval > 0) {
        const elapsed = STAGE_DURATION - stage.timer;
        const turretSpawnTimes = TURRET_SPAWN_SCHEDULES[stage.current] || [];
        for (let ti = 0; ti < turretSpawnTimes.length; ti++) {
          const t = turretSpawnTimes[ti];
          if (elapsed >= t && elapsed < t + delta) {
            const liveTurrets = this.pool.filter(s => s.isTurret).length;
            if (liveTurrets >= 2) break;
            const turret = spawnTurret(ti);
            const zoneBand = PLAY_W * 0.12;
            const zoneCount = this.pool.filter(s => s.isTurret && Math.abs(s.x - turret.x) < zoneBand).length;
            if (zoneCount < 2) {
              this.pool.push(turret);
              turretIndicators.spawn(turret.x);
            }
          }
        }
      }

      // Formation spawning
      const fCfg = STAGE_CONFIG[stage.current - 1];
      if (fCfg.formationChance > 0) {
        this.formationTimer += delta;
        if (this.formationCooldown > 0) this.formationCooldown -= delta;
        if (this.formationTimer >= fCfg.formationInterval && this.formationCooldown <= 0) {
          this.formationTimer = 0;
          spawnFormation();
        }
      }

      // Shield drone spawning — fixed schedule per stage
      const shieldDroneSpawnTimes = SHIELD_DRONE_SPAWN_SCHEDULES[stage.current] || [];
      if (shieldDroneSpawnTimes.length > 0) {
        const elapsed = STAGE_DURATION - stage.timer;
        for (let i = 0; i < shieldDroneSpawnTimes.length; i++) {
          const t = shieldDroneSpawnTimes[i];
          if (elapsed >= t && elapsed < t + delta) {
            const activeDrones = this.pool.filter(s => s.isShieldDrone).length;
            if (activeDrones < 2) this.pool.push(spawnShieldDrone());
          }
        }
      }
    }
    turretIndicators.update(delta);

    this.pool = this.pool.filter(s => {
      if (s.isGatePiece) {
        s.y += s.vy * dt;
        if (s.flashTimer > 0) s.flashTimer -= delta;
        if (s.hpBarTimer > 0) s.hpBarTimer -= delta;
        if (s.lifetime !== undefined) s.lifetime -= delta;
        return s.y < PLAY_Y + PLAY_H + 80 && (s.lifetime === undefined || s.lifetime > 0);
      }

      // Formation delay — freeze shard in place until delay expires
      if (s.formationDelayActive) {
        s.formationDelay -= delta;
        if (s.formationDelay <= 0) {
          s.formationDelayActive = false;
          s.vx = s._savedVx;
          s.vy = s._savedVy;
        }
        if (s.flashTimer > 0) s.flashTimer -= delta;
        if (s.hpBarTimer > 0) s.hpBarTimer -= delta;
        s.lifetime -= delta;
        return s.y < PLAY_Y + PLAY_H + 80 && s.x > PLAY_X - 120 && s.x < PLAY_X + PLAY_W + 120 && s.lifetime > 0;
      }

      // Shield drone update — before all other logic
      if (s.isShieldDrone) {
        s.angle += s.spin;
        s.ringAngle -= 0.04;
        if (s.retargetTimer > 0) s.retargetTimer -= delta;

        // Validate existing target
        if (s.supportTarget && (s.supportTarget.hp <= 0 || !shards.pool.includes(s.supportTarget))) {
          s.supportTarget.isShieldProtected = false;
          s.supportTarget = null;
          s.retargetTimer = 400;
        }

        // Acquire target if none — priority: locked turrets > elites > anything
        if (!s.supportTarget && s.retargetTimer <= 0) {
          let best = null;
          const priority = t => {
            if (t.isTurret && t.turretLocked) return 3;
            if (t.isElite) return 2;
            return 1;
          };
          for (const t of shards.pool) {
            if (t === s || t.isShieldDrone) continue;
            if (!best || priority(t) > priority(best)) best = t;
          }
          if (best) {
            s.supportTarget = best;
            best.isShieldProtected = true;
          }
        }

        // Move: orbit target or patrol horizontally near top of arena
        if (s.supportTarget) {
          s.orbitAngle += 2.0 * dt;
          const orbitR = 44;
          const tx = s.supportTarget.x + Math.cos(s.orbitAngle) * orbitR;
          const ty = s.supportTarget.y + Math.sin(s.orbitAngle) * orbitR;
          const dx = tx - s.x, dy = ty - s.y;
          const dist = Math.hypot(dx, dy);
          if (dist > 2) {
            const spd = Math.min(dist * 6, 300);
            s.vx = (dx / dist) * spd;
            s.vy = (dy / dist) * spd;
          } else {
            s.vx = 0; s.vy = 0;
          }
        } else {
          // Patrol: drift slowly sideways at upper third of arena, stay on screen
          if (!s._patrolDir) s._patrolDir = Math.random() < 0.5 ? 1 : -1;
          const patrolY = PLAY_Y + PLAY_H * 0.22;
          const dyPatrol = patrolY - s.y;
          s.vx = s._patrolDir * 55;
          s.vy = Math.sign(dyPatrol) * Math.min(Math.abs(dyPatrol) * 3, 80);
          // Bounce off side walls
          if (s.x < PLAY_X + 30) s._patrolDir = 1;
          if (s.x > PLAY_X + PLAY_W - 30) s._patrolDir = -1;
        }

        s.x += s.vx * dt;
        s.y += s.vy * dt;
        // Clamp to play area — drones never leave
        s.x = Math.max(PLAY_X + 12, Math.min(PLAY_X + PLAY_W - 12, s.x));
        s.y = Math.max(PLAY_Y + 12, Math.min(PLAY_Y + PLAY_H - 12, s.y));
        if (s.flashTimer > 0) s.flashTimer -= delta;
        if (s.hpBarTimer > 0) s.hpBarTimer -= delta;
        return true;
      }

      // Turret update — skip all normal movement/homing
      if (s.isTurret) {
        if (!s.turretLocked) {
          s.y += s.vy * dt;
          if (s.y > s.lockY) s.y = s.lockY;
          if (s.y >= s.lockY) {
            s.turretLocked = true;
            s.vy = 0;
            s.spin = 0;
          } else {
            s.angle += s.spin;
          }
        } else {
          // Firing logic
          s.turretFireTimer -= delta;
          if (s.turretCharging) {
            s.turretChargeTimer -= delta;
            if (s.turretChargeTimer <= 0) {
              s.turretCharging = false;
              enemyBullets.fire(s.x, s.y, drone.x, drone.y, { isTurret: true });
              audio.play('turretFire');
            }
          } else if (s.turretFireTimer <= 0) {
            s.turretCharging = true;
            s.turretChargeTimer = 300;
            s.turretFireTimer = stage.current >= 8 ? 900 : stage.current >= 5 ? 1200 : 1500;
          }
        }
        if (s.flashTimer > 0) s.flashTimer -= delta;
        if (s.hpBarTimer > 0) s.hpBarTimer -= delta;
        return true;
      }

      // Charger state machine
      if (s.isCharger) {
        const alignTol = Math.max(10, 20 - stage.current);
        if (s.chargerState === 'hunt') {
          // Lateral hunt toward player X
          s.vx = s.chargerHuntVx;
          s.vy = 30;
          s.x += s.vx * dt;
          s.y += s.vy * dt;
          // Wall bounce
          if (s.x < PLAY_X + 12) { s.chargerHuntVx = Math.abs(s.chargerHuntVx); s.vx = s.chargerHuntVx; }
          if (s.x > PLAY_X + PLAY_W - 12) { s.chargerHuntVx = -Math.abs(s.chargerHuntVx); s.vx = s.chargerHuntVx; }
          // Recalculate hunt direction continuously
          s.chargerHuntVx = s.x < drone.x ? 55 : -55;
          // Align check
          if (Math.abs(s.x - drone.x) < alignTol) {
            s.chargerState = 'telegraph';
            s.chargerLockedX = s.x;
            s.chargerTelegraphTimer = 350;
            s.vx = 0;
            s.vy = 0;
            audio.play('sniperWarning');
          }
        } else if (s.chargerState === 'telegraph') {
          s.x = s.chargerLockedX;
          s.vx = 0;
          s.vy = 0;
          s.chargerTelegraphTimer -= delta;
          s.flashTimer = 40;
          if (s.chargerTelegraphTimer <= 0) {
            s.chargerState = 'charge';
            s.vx = 0;
            s.vy = s.chargerChargeSpeed;
          }
        } else if (s.chargerState === 'charge') {
          s.x += s.vx * dt;
          s.y += s.vy * dt;
        }
        s.angle += s.spin;
        if (s.flashTimer > 0) s.flashTimer -= delta;
        if (s.hpBarTimer > 0) s.hpBarTimer -= delta;
        s.lifetime -= delta;
        return s.y < PLAY_Y + PLAY_H + 80 && s.lifetime > 0;
      }

      if (!s.isKamikaze && s.y < PLAY_Y + PLAY_H * 0.5) {
        const curAngle = Math.atan2(s.vy, s.vx);
        const tgtAngle = Math.atan2(drone.y - s.y, drone.x - s.x);
        let diff = tgtAngle - curAngle;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        const maxTurn = s.turnRate * dt;
        const turn = Math.min(Math.abs(diff), maxTurn) * Math.sign(diff);
        const newAngle = curAngle + turn;
        const spd = Math.hypot(s.vx, s.vy);
        s.vx = Math.cos(newAngle) * spd;
        s.vy = Math.sin(newAngle) * spd;
      }

      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.angle += s.spin;

      if (s.flashTimer > 0) s.flashTimer -= delta;
      if (s.hpBarTimer > 0) s.hpBarTimer -= delta;
      if (s.lifetime !== undefined) s.lifetime -= delta;

      return s.y < PLAY_Y + PLAY_H + 80 && s.x > PLAY_X - 120 && s.x < PLAY_X + PLAY_W + 120 && (s.lifetime === undefined || s.lifetime > 0);
    });
  },

  draw() {
    this.pool.forEach(s => {
      ctx.save();
      ctx.translate(s.x, s.y);
      if (s.isGatePiece) {
        const gateColor = s.flashTimer > 0 ? '#ffffff' : s.color;
        const w = s.gateWidth;
        const h = s.gateHeight;
        const t = getNow() * 0.018 + s.x * 0.01;
        const edgeColor = s.isGateTarget ? '#ffd6df' : '#dfe5ff';
        const accentColor = s.isGateTarget ? '#ff294f' : '#9fc4ff';
        const bodyColor = s.isGateTarget ? '#25070f' : '#0d1222';
        const fillAlpha = s.isGateTarget ? 0.28 : 0.14;

        ctx.globalAlpha = fillAlpha;
        setGlow(gateColor, s.isGateTarget ? 20 : 8);
        ctx.fillStyle = bodyColor;
        ctx.fillRect(-w * 0.5, -h * 0.5, w, h);

        ctx.globalAlpha = s.isGateTarget ? 0.9 : 0.55;
        ctx.strokeStyle = edgeColor;
        ctx.lineWidth = s.isGateTarget ? 1.5 : 1;
        ctx.strokeRect(-w * 0.5, -h * 0.5, w, h);

        ctx.globalAlpha = s.isGateTarget ? 0.9 : 0.5;
        ctx.fillStyle = accentColor;
        ctx.fillRect(-w * 0.5, -h * 0.5, w, 2);
        ctx.fillRect(-w * 0.5, h * 0.5 - 2, w, 2);

        ctx.beginPath();
        const points = 7;
        for (let i = 0; i <= points; i++) {
          const px = -w * 0.5 + (w / points) * i;
          const py = Math.sin(t + i * 0.95) * (h * (s.isGateTarget ? 0.18 : 0.12));
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.globalAlpha = s.isGateTarget ? 0.95 : 0.55;
        setGlow(accentColor, s.isGateTarget ? 14 : 8);
        ctx.strokeStyle = accentColor;
        ctx.lineWidth = s.isGateTarget ? 2.2 : 1.4;
        ctx.stroke();

        if (s.isGateTarget) {
          ctx.globalAlpha = 0.16;
          ctx.fillStyle = accentColor;
          ctx.fillRect(-w * 0.5, -h * 0.5, w, h);

          ctx.globalAlpha = 0.85;
          ctx.fillStyle = '#fff7fa';
          ctx.fillRect(-w * 0.01, -h * 0.32, w * 0.02, h * 0.64);
        }
        clearGlow();
        ctx.restore();
        return;
      }
      const isKamikaze = !!s.isKamikaze;
      const facingAngle = isKamikaze ? Math.atan2(s.vy, s.vx) : s.angle;
      ctx.rotate(facingAngle);
      const drawColor = s.flashTimer > 0 ? '#ffffff' : (isKamikaze ? '#ff6600' : s.color);
      const flicker = isKamikaze ? 0.75 + 0.25 * Math.sin(getNow() * 0.025 + s.x * 0.01) : 1;

      // Shield drone: counter-rotating diamond
      if (s.isShieldDrone) {
        const r = s.size;

        // Wide bloom
        ctx.globalAlpha = 0.12;
        setGlow(drawColor, 24);
        ctx.fillStyle = drawColor;
        ctx.beginPath();
        ctx.moveTo(0, -r * 1.6); ctx.lineTo(r * 1.6, 0);
        ctx.lineTo(0, r * 1.6);  ctx.lineTo(-r * 1.6, 0);
        ctx.closePath(); ctx.fill();

        // Mid corona stroke
        ctx.globalAlpha = 0.6;
        setGlow(drawColor, 10);
        ctx.strokeStyle = drawColor;
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(0, -r); ctx.lineTo(r, 0);
        ctx.lineTo(0, r);  ctx.lineTo(-r, 0);
        ctx.closePath(); ctx.stroke();

        // Counter-rotating outer ring
        ctx.save();
        ctx.rotate(s.ringAngle);
        ctx.globalAlpha = 0.45;
        ctx.strokeStyle = drawColor;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, -r * 1.5); ctx.lineTo(r * 1.5, 0);
        ctx.lineTo(0, r * 1.5);  ctx.lineTo(-r * 1.5, 0);
        ctx.closePath(); ctx.stroke();
        ctx.restore();

        // Hard white core dot
        ctx.globalAlpha = 1;
        setGlow('#ffffff', 5);
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(0, 0, 2, 0, Math.PI * 2);
        ctx.fill();

        clearGlow();
        ctx.restore();

        // Tether to target (world coords, drawn outside local transform)
        if (s.supportTarget) {
          const now = getNow();
          ctx.save();
          ctx.globalAlpha = 0.65;
          ctx.strokeStyle = '#00ccff';
          ctx.lineWidth = 1.5;
          ctx.setLineDash([7, 5]);
          ctx.lineDashOffset = -(now * 0.055) % 12;
          setGlow('#00ccff', 8);
          ctx.beginPath();
          ctx.moveTo(s.x, s.y);
          ctx.lineTo(s.supportTarget.x, s.supportTarget.y);
          ctx.stroke();
          ctx.setLineDash([]);
          clearGlow();
          ctx.restore();
        }

        // HP bar
        if (s.hpBarTimer > 0) {
          const barW = s.size * 2.2, barH = 3;
          const barX = s.x - barW / 2, barY = s.y - s.size * 2;
          const frac = Math.max(0, s.hp / s.maxHp);
          const fade = Math.min(1, s.hpBarTimer / 200);
          ctx.save();
          ctx.globalAlpha = fade * 0.85;
          ctx.fillStyle = '#000000';
          ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);
          ctx.fillStyle = '#333333';
          ctx.fillRect(barX, barY, barW, barH);
          const rc = Math.round(255 * (1 - frac)), gc = Math.round(200 * frac);
          ctx.fillStyle = `rgb(${rc},${gc},0)`;
          ctx.fillRect(barX, barY, barW * frac, barH);
          ctx.restore();
        }
        return;
      }

      // Turret: octagon with center dot
      if (s.isTurret) {
        const turretPts = makeRegularPolygon(s.size * 1.9, 8, Math.PI / 8);

        // Wide bloom pass
        ctx.globalAlpha = 0.15;
        setGlow(drawColor, 28);
        ctx.fillStyle = drawColor;
        tracePolygonPath(turretPts, 1.08);
        ctx.fill();

        // Mid corona pass
        ctx.globalAlpha = 0.55;
        setGlow(drawColor, 12);
        ctx.strokeStyle = drawColor;
        ctx.lineWidth = 2;
        tracePolygonPath(turretPts);
        ctx.stroke();

        // Hard white edge and center dot
        ctx.globalAlpha = 1;
        setGlow('#ffffff', 5);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 0.7;
        tracePolygonPath(turretPts);
        ctx.stroke();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(0, 0, 2.2, 0, Math.PI * 2);
        ctx.fill();

        // Targeting ring when locked
        if (s.turretLocked) {
          ctx.globalAlpha = 0.18;
          setGlow(drawColor, 6);
          ctx.strokeStyle = drawColor;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(0, 0, Math.max(0.1, s.size * 2), 0, Math.PI * 2);
          ctx.stroke();
        }

        // Charging: pulsing white center dot
        if (s.turretCharging) {
          const chargeAlpha = 1 - (s.turretChargeTimer / 300);
          ctx.globalAlpha = chargeAlpha;
          setGlow('#ffffff', 16);
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(0, 0, 4, 0, Math.PI * 2);
          ctx.fill();
        }

        // Shield drone protection shell on turret
        if (s.isShieldProtected) {
          const shellPulse = 0.5 + 0.5 * Math.sin(getNow() * 0.007 + s.x * 0.02);
          ctx.globalAlpha = 0.45 + shellPulse * 0.35;
          setGlow('#00ccff', 24);
          ctx.strokeStyle = '#00ccff';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(0, 0, Math.max(0.1, s.size * 3.5), 0, Math.PI * 2);
          ctx.stroke();
        }

        clearGlow();
        ctx.restore();

        // HP bar for turrets
        if (s.hpBarTimer > 0) {
          const barW = s.size * 2.2;
          const barH = 3;
          const barX = s.x - barW / 2;
          const barY = s.y - s.size * 1.6;
          const frac = Math.max(0, s.hp / s.maxHp);
          const fade = Math.min(1, s.hpBarTimer / 200);
          ctx.save();
          ctx.globalAlpha = fade * 0.85;
          ctx.fillStyle = '#000000';
          ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);
          ctx.fillStyle = '#333333';
          ctx.fillRect(barX, barY, barW, barH);
          const r = Math.round(255 * (1 - frac));
          const g = Math.round(200 * frac);
          ctx.fillStyle = `rgb(${r},${g},0)`;
          ctx.fillRect(barX, barY, barW * frac, barH);
          ctx.restore();
        }
        return;
      }

      {
        if (isKamikaze) {
          tracePolygonPath(s.pts, 1.35);
          ctx.fillStyle = '#ff4400';
          ctx.globalAlpha = 0.06;
          ctx.fill();
        }
        // Outer bloom — inflated halo gives the shard volumetric depth
        tracePolygonPath(s.pts, 1.28);
        ctx.fillStyle = drawColor;
        ctx.globalAlpha = 0.05;
        ctx.fill();

        tracePolygonPath(s.pts);

        ctx.fillStyle = drawColor;
        ctx.globalAlpha = (isKamikaze ? 0.1 : 0.08) * flicker;
        ctx.fill();

        ctx.globalAlpha = (isKamikaze ? 0.62 : 0.5) * flicker;
        setGlow(drawColor, isKamikaze ? 18 : (s.isElite ? 28 : 18));
        ctx.strokeStyle = drawColor;
        ctx.lineWidth = isKamikaze ? 2.8 : (s.isElite ? 3.5 : 2.5);
        ctx.stroke();

        // Premium edge light pass: adds a soft top-facing sheen without changing the silhouette.
        ctx.save();
        ctx.clip();
        const sheen = ctx.createLinearGradient(
          -s.size * 1.4, -s.size * 1.6,
          s.size * 1.1, s.size * 0.9
        );
        sheen.addColorStop(0, 'rgba(255,255,255,0.32)');
        sheen.addColorStop(0.45, 'rgba(255,255,255,0.12)');
        sheen.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.globalAlpha = s.isElite ? 0.36 : 0.24;
        ctx.fillStyle = sheen;
        ctx.fillRect(-s.size * 2, -s.size * 2, s.size * 4, s.size * 4);
        ctx.restore();

        ctx.globalAlpha = (s.isElite ? 0.55 : 0.38) * flicker;
        setGlow('#ffffff', isKamikaze ? 6 : (s.isElite ? 8 : 5));
        ctx.strokeStyle = 'rgba(255,255,255,0.7)';
        ctx.lineWidth = s.isElite ? 1.2 : 0.9;
        ctx.stroke();
      }

      ctx.globalAlpha = 1;

      {
        const crack = s.pts;
        setGlow(drawColor, isKamikaze ? 12 : 10);
        ctx.strokeStyle = drawColor;
        ctx.lineWidth = 0.5;
        ctx.globalAlpha = (isKamikaze ? 0.72 : 0.6) * flicker;
        ctx.beginPath();
        ctx.moveTo(crack[0].x * 0.6, crack[0].y * 0.6);
        ctx.lineTo(crack[Math.floor(crack.length / 2)].x * 0.6, crack[Math.floor(crack.length / 2)].y * 0.6);
        ctx.stroke();
      }

      if (s.isElite) {
        const pulse = Math.sin(getNow() * 0.008) * 0.5 + 0.5;
        const eliteRingRadius = Math.max(0.1, s.size * (1.3 + pulse * 0.15));
        ctx.globalAlpha = 0.3 + pulse * 0.45;
        setGlow(s.color, 38);
        ctx.strokeStyle = s.color;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(0, 0, eliteRingRadius, 0, Math.PI * 2);
        ctx.stroke();
      }

      if (s.maxShieldHp > 0 && s.shieldHp > 0) {
        const shieldPulse = 0.65 + 0.35 * Math.sin(getNow() * 0.01 + s.x * 0.01);
        const shieldRadius = Math.max(0.1, s.size * 1.05);
        ctx.globalAlpha = 0.35 + shieldPulse * 0.25;
        setGlow('#ffffff', 16);
        ctx.strokeStyle = '#9be7ff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, shieldRadius, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Shield drone protection shell
      if (s.isShieldProtected) {
        const shellPulse = 0.5 + 0.5 * Math.sin(getNow() * 0.007 + s.x * 0.02);
        const shellRadius = Math.max(0.1, s.size * 1.9);
        ctx.globalAlpha = 0.45 + shellPulse * 0.35;
        setGlow('#00ccff', 22);
        ctx.strokeStyle = '#00ccff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, shellRadius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 0.1 + shellPulse * 0.1;
        ctx.fillStyle = '#00ccff';
        ctx.fill();
      }

      clearGlow();
      ctx.restore();

      if (isKamikaze) {
        const spd = Math.hypot(s.vx, s.vy);
        if (spd > 10) {
          const nx = -s.vx / spd;
          const ny = -s.vy / spd;
          const trailLen = 18 + Math.min(14, spd * 0.025 + s.size * 0.18);
          ctx.save();
          ctx.globalAlpha = 0.35 * flicker;
          ctx.strokeStyle = '#ff6600';
          ctx.lineWidth = 2;
          ctx.shadowColor = '#ff4400';
          ctx.shadowBlur = 8;
          ctx.beginPath();
          ctx.moveTo(s.x, s.y);
          ctx.lineTo(s.x + nx * trailLen, s.y + ny * trailLen);
          ctx.stroke();
          ctx.shadowBlur = 0;
          ctx.restore();
        }
        if (s.isCharger && s.chargerState === 'telegraph') {
          const telegraphProgress = 1 - s.chargerTelegraphTimer / 350;
          const ringR = s.size * (2.5 - telegraphProgress * 1.5);
          ctx.save();
          ctx.globalAlpha = 0.7 * (1 - telegraphProgress * 0.3);
          ctx.strokeStyle = '#ff6600';
          ctx.shadowColor = '#ff6600';
          ctx.shadowBlur = 12;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(s.x, s.y, ringR, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }
      }

      if (s.hpBarTimer > 0 && (s.maxHp > 1 || s.maxShieldHp > 0)) {
        const barW = s.size * 2.2;
        const barH = 3;
        const barX = s.x - barW / 2;
        const barY = s.y - s.size * 1.6;
        const frac = Math.max(0, s.hp / s.maxHp);
        const fade = Math.min(1, s.hpBarTimer / 200);
        ctx.save();
        ctx.globalAlpha = fade * 0.85;
        ctx.fillStyle = '#000000';
        ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);
        ctx.fillStyle = '#333333';
        ctx.fillRect(barX, barY, barW, barH);
        const r = Math.round(255 * (1 - frac));
        const g = Math.round(200 * frac);
        ctx.fillStyle = `rgb(${r},${g},0)`;
        ctx.fillRect(barX, barY, barW * frac, barH);
        if (s.maxShieldHp > 0 && s.shieldHp > 0) {
          const shieldFrac = Math.max(0, s.shieldHp / s.maxShieldHp);
          ctx.fillStyle = '#0d1c24';
          ctx.fillRect(barX, barY - 5, barW, 2);
          ctx.fillStyle = '#9be7ff';
          ctx.fillRect(barX, barY - 5, barW * shieldFrac, 2);
        }
        ctx.restore();
      }
    });
  },

  reset() {
    this.pool = [];
    this.spawnTimer = 0;
    this.kamikazeTimer = 0;
    this.turretTimer = 0;
    this.shieldDroneTimer = 0;
    this.formationTimer = 0;
    this.formationCooldown = 0;
  }
};

const enemyBullets = {
  pool: [],

  fire(x, y, targetX, targetY, opts = {}) {
    const angle = Math.atan2(targetY - y, targetX - x);
    const isTurret = !!opts.isTurret;
    const turretSpeed = stage.current >= 8 ? 520 : stage.current >= 5 ? 460 : 380;
    const speed = isTurret ? turretSpeed : 320 + stage.current * 14;
    this.pool.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 30000,
      isTurret
    });
  },

  update(delta) {
    const dt = delta / 1000;
    this.pool = this.pool.filter(b => {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= delta;
      return b.life > 0 && b.x > PLAY_X - 40 && b.x < PLAY_X + PLAY_W + 40 && b.y > PLAY_Y - 40 && b.y < PLAY_Y + PLAY_H + 40;
    });
  },

  draw() {
    this.pool.forEach(b => {
      ctx.save();
      if (b.isTurret) {
        // Amber sphere — distinct from regular enemy bullets (orange trail)
        setGlow('#ffcc00', 20);
        ctx.fillStyle = '#ffcc00';
        ctx.beginPath();
        ctx.arc(b.x, b.y, 5, 0, Math.PI * 2);
        ctx.fill();
        setGlow('#ffffff', 8);
        ctx.fillStyle = '#fff8cc';
        ctx.beginPath();
        ctx.arc(b.x - 1.2, b.y - 1.2, 1.8, 0, Math.PI * 2);
        ctx.fill();
      } else {
        const color = '#ff3030';
        setGlow(color, 12);
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(b.x - b.vx * 0.03, b.y - b.vy * 0.03);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
      clearGlow();
      ctx.restore();
    });
  },

  reset() {
    this.pool = [];
  }
};

const mapHazards = {
  pool: [],
  spawnTimer: 999999,
  update() {},
  draw() {},
  reset() { this.pool = []; },
};


const surgeNode = {
  pool: [],
  update() {},
  draw() {},
  reset() { this.pool = []; },
};

function circlesTouch(ax, ay, ar, bx, by, br) {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy < (ar + br) * (ar + br);
}

function rectCircleTouch(cx, cy, cr, rx, ry, rw, rh) {
  const closestX = clamp(cx, rx - rw * 0.5, rx + rw * 0.5);
  const closestY = clamp(cy, ry - rh * 0.5, ry + rh * 0.5);
  const dx = cx - closestX;
  const dy = cy - closestY;
  return dx * dx + dy * dy < cr * cr;
}

function applyDamageToShard(s, damage, options = {}) {
  if (s.isShieldProtected && !options.bypassShield) {
    impactFX.onHit(s.x, s.y, '#00ccff');
    audio.play('shieldHit');
    return false;
  }
  if (!options.bypassShield && s.shieldHp > 0) {
    s.shieldHp = Math.max(0, s.shieldHp - damage);
    s.flashTimer = 80;
    s.hpBarTimer = 900;
    impactFX.onHit(s.x, s.y, '#9be7ff');
    audio.play(s.shieldHp <= 0 ? 'shieldBreak' : 'shieldHit');
    return false;
  }
  s.hp -= damage;
  if (s.hp <= 0) return true;
  s.flashTimer = 80;
  s.hpBarTimer = 900;
  audio.play('enemyHit');
  return false;
}

function destroyShard(s) {
  // If this is a shield drone dying, release its target
  if (s.isShieldDrone && s.supportTarget) {
    s.supportTarget.isShieldProtected = false;
    s.supportTarget = null;
  }
  // If any shield drone was protecting this shard, release it
  for (const d of shards.pool) {
    if (d.isShieldDrone && d.supportTarget === s) {
      d.supportTarget = null;
      d.retargetTimer = 400;
    }
  }
  audio.play(s.isElite ? 'eliteDeath' : 'enemyDeath');
  fragments.burst(s.x, s.y, s.color, s.size, s.isElite);
  impactFX.onKill(s.x, s.y, s.color);
  smokeParticles.spawn(s.x, s.y, s.color);
  const idx = shards.pool.indexOf(s);
  if (idx >= 0) shards.pool.splice(idx, 1);
  if (s.isGatePiece) return;
  const scoreVal = stage.onKill(s);
  const chainColor = player.chain >= 75 ? '#ffffff'
    : player.chain >= 50 ? '#ff33cc'
    : player.chain >= 30 ? '#aa88ff'
    : player.chain >= 15 ? '#31afd4'
    : (s.isElite ? '#ffcc00' : '#d9d4ff');
  const popupSize = s.isElite ? 32
    : scoreVal >= 20 ? 28
    : scoreVal >= 16 ? 25
    : scoreVal >= 12 ? 22
    : 20;
  const awayFromPlayer = Math.sign(s.x - drone.x) || (Math.random() > 0.5 ? 1 : -1);
  pickups.popups.push({
    x: s.x + (Math.random() - 0.5) * 12,
    y: s.y - 8,
    label: '+' + scoreVal,
    color: chainColor,
    coreColor: '#f4f0ff',
    size: popupSize,
    life: s.isElite ? 820 : 680,
    maxLife: s.isElite ? 820 : 680,
    driftX: awayFromPlayer * (s.isElite ? 18 : 12),
    riseSpeed: s.isElite ? 54 : 46,
    isScore: true,
    elite: s.isElite
  });
}

function checkCollisions() {
  const aliveBullets = [];

  for (const b of bullets.pool) {
    let bulletAlive = true;

    for (let i = shards.pool.length - 1; i >= 0; i--) {
      const s = shards.pool[i];
      const hitR = s.isTurret ? s.size * 2.5 : s.isShieldDrone ? s.size * 3.0 : s.size * 0.75;
      const bulletHit = s.isGatePiece
        ? rectCircleTouch(b.x, b.y, b.hitRadius || 8, s.x, s.y, s.gateWidth, s.gateHeight)
        : circlesTouch(b.x, b.y, b.hitRadius || 8, s.x, s.y, hitR);
      if (bulletHit) {
        if (s.isGateBlocker) {
          s.flashTimer = 70;
          hitSparks.emit(b.x, b.y, 1, 0, '#f4f3ff');
          impactFX.onHit(b.x, b.y, '#f4f3ff');
          bulletAlive = false;
          break;
        }
        const shielded = s.shieldHp > 0;
        const killed = applyDamageToShard(s, b.damage || player.effectiveDamage);
        hitSparks.emit(b.x, b.y, 1, 0, shielded ? '#9be7ff' : s.color);
        impactFX.onHit(b.x, b.y, shielded ? '#9be7ff' : s.color);
        if (killed) destroyShard(s);
        if (b.pierce > 0) {
          b.pierce--;
        } else {
          bulletAlive = false;
          break;
        }
      }
    }

    if (bulletAlive) aliveBullets.push(b);
  }
  bullets.pool = aliveBullets;

  enemyBullets.pool = enemyBullets.pool.filter(b => {
    if (circlesTouch(b.x, b.y, 7, drone.x, drone.y, 14)) {
      player.hit();
      return false;
    }
    return true;
  });

  for (let i = shards.pool.length - 1; i >= 0; i--) {
    const s = shards.pool[i];
    const bodyR = s.isTurret ? s.size * 2.5 : s.size * 0.75;
    const playerHit = s.isGatePiece
      ? rectCircleTouch(drone.x, drone.y, 14, s.x, s.y, s.gateWidth, s.gateHeight)
      : circlesTouch(s.x, s.y, bodyR, drone.x, drone.y, 14);
    if (playerHit) {
      if (s.isGatePiece) {
        player.hit();
        continue;
      }
      if (dash.duration > 0) {
        dash.hitEnemy = true;
        hitSparks.emit(s.x, s.y, -1, 0, COLOR_CYAN);
        impactFX.onHit(s.x, s.y, COLOR_CYAN);
        s.shieldHp = 0;
        s.hp = 0;
        destroyShard(s);
      } else {
        if (s.isKamikaze) {
          fragments.burst(s.x, s.y, s.color, s.size, false);
          burstParticles.spawn(s.x, s.y, s.color);
        }
        shards.pool.splice(i, 1);
        player.hit();
      }
    }
  }
}
