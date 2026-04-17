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
  if (size <= 22) return makeRegularPolygon(size, 3);  // SMALL â†’ triangle
  if (size <= 28) return makeRegularPolygon(size, 4);  // MED   â†’ diamond
  return makeRegularPolygon(size, 5);                   // LARGE â†’ pentagon
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

function makeJackpotShape(size) {
  return makeRegularPolygon(size * 1.42, 16, Math.PI / 16);
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
    const blend = (1 - stage.timer / TRANSITION_MS) * 0.5; // 0 â†’ 0.5
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
  const size = 28;

  // Spawn offset away from player X
  const side = drone.x - (PLAY_X + PLAY_W / 2) > 0 ? -1 : 1; // opposite side from player
  const offsetX = (80 + Math.random() * 100) * side;
  const spawnX = Math.max(PLAY_X + 20, Math.min(PLAY_X + PLAY_W - 20, (PLAY_X + PLAY_W / 2) + offsetX));
  const huntVx = spawnX < drone.x ? 47 : -47;

  return {
    x: spawnX,
    y: PLAY_Y - 20,
    size,
    color: '#ff1133',
    vx: huntVx,
    vy: 26,
    angle: Math.random() * Math.PI * 2,
    spin: 0.10,
    pts: makeArrowheadShape(size),
    hp: KAMIKAZE_HP[stage.current - 1] ?? 2,
    maxHp: KAMIKAZE_HP[stage.current - 1] ?? 2,
    isElite: false,
    isKamikaze: true,
    isCharger: true,
    chargerState: 'hunt',
    chargerHuntVx: huntVx,
    chargerLockedX: null,
    chargerTelegraphTimer: 0,
    chargerChargeSpeed: 544,
    isMini: false,
    flashTimer: 0,
    hpBarTimer: 0,
    lifetime: 12000,
  };
}

function spawnDrift() {
  const stats = getStageEnemyStats();
  const size = 20 + Math.random() * 8;
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
  };
}


const BONUS_RING_PATTERNS = {
  3: [
    { xRatio: 0.26, delay: 300, vy: 220 },
    { xRatio: 0.68, delay: 1300, vy: 230 },
    { xRatio: 0.42, delay: 2380, vy: 240 },
    { xRatio: 0.74, delay: 3460, vy: 248 },
  ],
  6: [
    { xRatio: 0.70, delay: 260, vy: 228 },
    { xRatio: 0.28, delay: 1260, vy: 238 },
    { xRatio: 0.56, delay: 2220, vy: 248 },
    { xRatio: 0.34, delay: 3160, vy: 258 },
    { xRatio: 0.76, delay: 4100, vy: 268 },
  ],
  9: [
    { xRatio: 0.30, delay: 220, vy: 238 },
    { xRatio: 0.74, delay: 1180, vy: 248 },
    { xRatio: 0.50, delay: 2120, vy: 258 },
    { xRatio: 0.24, delay: 3040, vy: 268 },
    { xRatio: 0.68, delay: 3960, vy: 278 },
  ],
};

const bonusRingWaveState = {
  active: false,
  stage: 0,
  elapsed: 0,
  spawned: 0,
};

function getBonusRingPattern(stageNumber = stage.current) {
  return BONUS_RING_PATTERNS[stageNumber] || BONUS_RING_PATTERNS[3];
}

function createBonusRing(x, y, opts = {}) {
  const size = opts.size || 30;
  return {
    x, y,
    size,
    innerRadius: opts.innerRadius || 18,
    pickupRadius: opts.pickupRadius || size * 1.24,
    color: opts.color || '#f5c542',
    glowColor: opts.glowColor || '#fff1a6',
    vx: 0,
    vy: opts.vy || 300,
    angle: 0,
    spin: opts.spin || 0.055,
    ringAngle: Math.random() * Math.PI * 2,
    pulseOffset: Math.random() * Math.PI * 2,
    pts: null,
    hp: 1,
    maxHp: 1,
    isElite: false,
    isKamikaze: false,
    isMini: false,
    isGatePiece: false,
    isBonusRing: true,
    scoreValue: opts.scoreValue || 200,
    turnRate: 0,
    flashTimer: 0,
    hpBarTimer: 0,
    lifetime: opts.lifetime || 8200,
    shieldHp: 0,
    maxShieldHp: 0,
  };
}

function spawnBonusRing(stageNumber = stage.current, ringIndex = 0, overrides = {}) {
  const pattern = getBonusRingPattern(stageNumber);
  const entry = pattern[ringIndex % pattern.length];
  if (!entry) return null;
  const x = PLAY_X + PLAY_W * entry.xRatio;
  const ring = createBonusRing(x, PLAY_Y - 40, {
    vy: entry.vy,
    scoreValue: 200,
    ...overrides
  });
  shards.pool.push(ring);
  return ring;
}

function startBonusRingWave() {
  bonusRingWaveState.active = true;
  bonusRingWaveState.stage = stage.current;
  bonusRingWaveState.elapsed = 0;
  bonusRingWaveState.spawned = 0;
}

function updateBonusRingWave(delta) {
  if (!bonusRingWaveState.active) return;
  bonusRingWaveState.elapsed += delta;
  const pattern = getBonusRingPattern(bonusRingWaveState.stage);
  while (
    bonusRingWaveState.spawned < pattern.length &&
    bonusRingWaveState.elapsed >= pattern[bonusRingWaveState.spawned].delay
  ) {
    spawnBonusRing(bonusRingWaveState.stage, bonusRingWaveState.spawned);
    bonusRingWaveState.spawned++;
  }
  if (bonusRingWaveState.spawned >= pattern.length && !shards.pool.some(s => s.isBonusRing)) {
    bonusRingWaveState.active = false;
  }
}
function isBonusRingWaveComplete() {
  return !bonusRingWaveState.active;
}

function stopBonusRingWave() {
  bonusRingWaveState.active = false;
  bonusRingWaveState.elapsed = 0;
  bonusRingWaveState.spawned = 0;
}

function clearBonusRings() {
  shards.pool = shards.pool.filter(s => !s.isBonusRing);
}

function getBonusRingPickupRadius(ring) {
  return ring.pickupRadius || ring.size * 1.24;
}

function getBonusRingContactPoint(ring) {
  const dx = drone.x - ring.x;
  const dy = drone.y - ring.y;
  const dist = Math.hypot(dx, dy);
  const nx = dist > 0.001 ? dx / dist : 0;
  const ny = dist > 0.001 ? dy / dist : 1;
  const radius = getBonusRingPickupRadius(ring);
  return {
    x: ring.x + nx * radius,
    y: ring.y + ny * radius,
    nx,
    ny,
  };
}

function collectBonusRing(ring) {
  const idx = shards.pool.indexOf(ring);
  if (idx >= 0) shards.pool.splice(idx, 1);
  const scoreAward = stage.onBonusRingCollect(ring);
  const contact = getBonusRingContactPoint(ring);
  audio.play('enemyHit');
  hitSparks.emit(contact.x, contact.y, contact.nx, contact.ny, ring.glowColor || ring.color);
  impactFX.onHit(ring.x, ring.y, ring.color);
  pickups.popups.push({
    x: ring.x,
    y: ring.y - 6,
    label: '+' + scoreAward,
    color: ring.color,
    coreColor: '#ffffff',
      size: 33,
    life: 900,
    maxLife: 900,
    driftX: 0,
    riseSpeed: 72,
    isScore: true,
    elite: false
  });
}

// HP per stage â€” scales faster than bullet damage so late-stage kamikazes require Flow State/laser/nuke
const KAMIKAZE_HP = [2, 3, 5, 7, 10, 16, 22, 30, 42, 55];

const SHIELD_DRONE_SPAWN_SCHEDULES = {
  4:  [5000, 13000, 21000],
  8:  [8000, 20000],
  9:  [6000, 18000],
  10: [5000, 14000],
};

const STAGE_10_CLIMAX = [
  { t: 14000, type: 'callout',      text: 'FINAL PUSH', color: '#ff2244', duration: 2000, scale: 3.2, zone: 'center' },
  { t: 14000, type: 'shake',        intensity: 10, duration: 600 },
  { t: 14200, type: 'kamikazePack' },
  { t: 15000, type: 'swarmBurst' },
  { t: 15800, type: 'eliteEscort' },
  { t: 16600, type: 'columnTrain' },
  { t: 17200, type: 'kamikazePack' },
  { t: 18000, type: 'crossfire' },
  { t: 18800, type: 'shieldCluster' },
  { t: 19600, type: 'kamikazePack' },
  { t: 20400, type: 'swarmBurst' },
  { t: 21000, type: 'pincer' },
  { t: 22000, type: 'eliteEscort' },
];

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
  };
}

function spawnJackpot() {
  const jackpotMaxY = PLAY_Y + PLAY_H * 0.30;
  const edges = ['top', 'left', 'right'];
  const edge = edges[Math.floor(Math.random() * edges.length)];
  let x, y, vx, vy;
  if (edge === 'top') {
    x = PLAY_X + 60 + Math.random() * (PLAY_W - 120);
    y = PLAY_Y - 20;
    vx = (Math.random() - 0.5) * 180;
    vy = 140 + Math.random() * 60;
  } else if (edge === 'left') {
    x = PLAY_X - 20;
    y = PLAY_Y + 40 + Math.random() * Math.max(30, jackpotMaxY - PLAY_Y - 80);
    vx = 95 + Math.random() * 40;
    vy = (Math.random() - 0.5) * 80;
  } else {
    x = PLAY_X + PLAY_W + 20;
    y = PLAY_Y + 40 + Math.random() * Math.max(30, jackpotMaxY - PLAY_Y - 80);
    vx = -(95 + Math.random() * 40);
    vy = (Math.random() - 0.5) * 80;
  }
  return {
    x, y,
    size: 15.8,
    color: '#ffd700',
    vx, vy,
    pts: makeJackpotShape(15.8),
    isJackpot: true,
    jackpotLife: 12500,
    jackpotEscaping: false,
    jackpotEscapeVx: 0,
    jackpotEscapeVy: 0,
    jackpotJitterTimer: 0,
    angle: Math.random() * Math.PI * 2,
    spin: 0.06,
    hp: Math.round(4 + (stage.current - 1) * 0.7),
    maxHp: Math.round(4 + (stage.current - 1) * 0.7),
    isElite: false,
    isKamikaze: false,
    isMini: false,
    isTurret: false,
    isShieldDrone: false,
    isGatePiece: false,
    shieldHp: 0,
    maxShieldHp: 0,
    turnRate: 0,
    flashTimer: 0,
    hpBarTimer: 0,
    formationDelay: 0,
    formationDelayActive: false,
    _savedVx: 0,
    _savedVy: 0,
    lifetime: undefined,
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
  // Point arrives first, wings fan in behind â€” all spawn from offscreen top edge
  const positions = [
    { dx: 0,    vx: 0,   delay: 0   },
    { dx: -60,  vx: 30,  delay: 100 },
    { dx: 60,   vx: -30, delay: 100 },
    { dx: -120, vx: 45,  delay: 200 },
    { dx: 120,  vx: -45, delay: 200 },
  ];
  positions.forEach(p => {
    const s = spawnShardFromEdge('top', cx + p.dx, null, { vx: p.vx, formationDelay: p.delay });
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

function spawnFormationKamikazePack() {
  [-130, 0, 130].forEach(dx => {
    const spawnX = Math.max(PLAY_X + 20, Math.min(PLAY_X + PLAY_W - 20, drone.x + dx));
    const k = spawnKamikaze();
    k.x = spawnX;
    k.chargerHuntVx = spawnX < drone.x ? 47 : -47;
    k.vx = k.chargerHuntVx;
    shards.pool.push(k);
  });
}

function spawnFormationEliteEscort() {
  const cx = PLAY_X + PLAY_W * (0.35 + Math.random() * 0.3);
  const elite = spawnShardFromEdge('top', cx, null, { isElite: true, formationDelay: 600, vx: 0 });
  const left  = spawnShardFromEdge('top', cx - 100, null, { vx: 25 });
  const right = spawnShardFromEdge('top', cx + 100, null, { vx: -25 });
  shards.pool.push(elite, left, right);
}

function spawnFormationShieldCluster() {
  const cx = PLAY_X + PLAY_W * (0.3 + Math.random() * 0.4);
  [cx - 55, cx - 18, cx + 18, cx + 55].forEach((x, i) => {
    const vx = [-12, -4, 4, 12][i];
    const s = spawnShardFromEdge('top', x, null, { vx, formationDelay: i * 120 });
    shards.pool.push(s);
  });
}

function spawnFormationCrossfire() {
  [0.22, 0.40].forEach(f => {
    shards.pool.push(spawnShardFromEdge('left', null, PLAY_Y + PLAY_H * f, {}));
  });
  [0.31, 0.50].forEach(f => {
    shards.pool.push(spawnShardFromEdge('right', null, PLAY_Y + PLAY_H * f, {}));
  });
}

// Diagonal flock â€” 5-6 enemies sweep across from one side like a crow formation
function spawnFormationMigration() {
  const fromLeft = Math.random() < 0.5;
  const edge = fromLeft ? 'left' : 'right';
  const crossVx = fromLeft ? 95 : -95;
  const count = 5 + Math.round(Math.random());
  for (let i = 0; i < count; i++) {
    // Each bird slightly deeper into the arena â€” creates diagonal flock line
    const yFrac = 0.04 + i * 0.07 + (Math.random() - 0.5) * 0.03;
    const y = PLAY_Y + PLAY_H * Math.min(yFrac, 0.52);
    const vx = crossVx + (Math.random() - 0.5) * 20;
    const vy = 150 + (Math.random() - 0.5) * 40;
    const s = spawnShardFromEdge(edge, null, y, { vx, vy, formationDelay: i * 150 });
    shards.pool.push(s);
  }
}

// Sine wave column â€” 5 enemies in an S-curve X pattern, staggered entry, snake-like descent
function spawnFormationSerpent() {
  const cx = PLAY_X + PLAY_W * (0.3 + Math.random() * 0.4);
  const waveAmp = 55;
  for (let i = 0; i < 5; i++) {
    const phase = (i / 5) * Math.PI * 2;
    const x = Math.max(PLAY_X + 30, Math.min(PLAY_X + PLAY_W - 30, cx + Math.sin(phase) * waveAmp));
    const vx = Math.cos(phase) * 30; // lateral drift matches wave curvature
    const s = spawnShardFromEdge('top', x, null, { vx, formationDelay: i * 180 });
    shards.pool.push(s);
  }
}

function spawnFormation() {
  const s = stage.current;
  const pool = [];
  if (s >= 4) pool.push('lineRush', 'vWing');
  if (s >= 6) pool.push('swarmBurst', 'swarmBurst', 'kamikazePack', 'migration');
  if (s >= 7) pool.push('eliteEscort', 'serpent');
  if (s >= 8) pool.push('pincer', 'columnTrain', 'crossfire');
  if (!pool.length) return;
  const pick = pool[Math.floor(Math.random() * pool.length)];
  if      (pick === 'lineRush')    spawnFormationLineRush();
  else if (pick === 'vWing')       spawnFormationVWing();
  else if (pick === 'swarmBurst')  spawnFormationSwarmBurst();
  else if (pick === 'pincer')      spawnFormationPincer();
  else if (pick === 'columnTrain') spawnFormationColumnTrain();
  else if (pick === 'kamikazePack') spawnFormationKamikazePack();
  else if (pick === 'eliteEscort') spawnFormationEliteEscort();
  else if (pick === 'crossfire')   spawnFormationCrossfire();
  else if (pick === 'migration')   spawnFormationMigration();
  else if (pick === 'serpent')     spawnFormationSerpent();
  shards.formationCooldown = 2000;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

// â”€â”€â”€ PixiJS Entity Rendering Utilities â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Convert '#rrggbb' hex string to PIXI integer color (0xrrggbb)
function _hexInt(hex) { return parseInt(hex.replace('#', ''), 16); }

// Lazy layer accessors â€” return PIXI layers when scene manager exposes them, null until then
function _pixi_entityLayer() {
  return (typeof pixiPost !== 'undefined' && typeof pixiPost.getEntityLayer === 'function')
    ? pixiPost.getEntityLayer() : null;
}

// Draw a polygon on a PIXI.Graphics object using a points array.
// Uses drawPolygon (flat number array) â€” auto-closes and renders fill+stroke correctly.
function _gfxPolyPath(g, pts, scale) {
  scale = scale || 1;
  const flat = [];
  for (let i = 0; i < pts.length; i++) { flat.push(pts[i].x * scale, pts[i].y * scale); }
  g.drawPolygon(flat);
}

// Draw a regular polygon (star inner/outer) for jackpot
function _gfxStarPath(g, cx, cy, outerR, innerR, pts, startAngle) {
  for (let i = 0; i < pts * 2; i++) {
    const a = startAngle + i * (Math.PI / pts) - Math.PI / 2;
    const rad = i % 2 === 0 ? outerR : innerR;
    const x = cx + Math.cos(a) * rad;
    const y = cy + Math.sin(a) * rad;
    i === 0 ? g.moveTo(x, y) : g.lineTo(x, y);
  }
  g.closePath();
}

const shards = {
  pool: [],
  spawnTimer: 0,
  kamikazeTimer: 0,
  turretTimer: 0,
  shieldDroneTimer: 0,
  formationTimer: 0,
  formationCooldown: 0,
  jackpotSpawned: false,
  jackpotSpawnAt: 0,

  _makeShard(x, y, stats, isElite, enableMechanics = false, edge = 'right') {
    const BASE_SIZES = [20, 26, 32];
    const size = BASE_SIZES[Math.floor(Math.random() * BASE_SIZES.length)] * (isElite ? 1.4 : 1);
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

      // Turret spawning â€” fixed schedule within the stage
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

      // Shield drone spawning â€” fixed schedule per stage
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

      // Jackpot â€” once per stage, random window 5â€“25s in
      if (!this.jackpotSpawned) {
        const elapsed = STAGE_DURATION - stage.timer;
        if (elapsed >= this.jackpotSpawnAt) {
          this.jackpotSpawned = true;
          this.pool.push(spawnJackpot());
          streakCallout.show('JACKPOT DETECTED', '#ffb020', 1400, 1.6, 'top');
        }
      }
    }

    // Stage 10 scripted climax â€” fires at fixed timestamps, bypasses formationCooldown
    if (stage.current === 10) {
      const elapsed = STAGE_DURATION - stage.timer;
      for (const entry of STAGE_10_CLIMAX) {
        if (elapsed >= entry.t && elapsed < entry.t + delta) {
          if (entry.type === 'callout')
            streakCallout.show(entry.text, entry.color, entry.duration, entry.scale, entry.zone);
          else if (entry.type === 'shake') {
            stage.shakeTimer = entry.duration;
            stage.shakeIntensity = entry.intensity;
          }
          else if (entry.type === 'kamikazePack')  spawnFormationKamikazePack();
          else if (entry.type === 'swarmBurst')    spawnFormationSwarmBurst();
          else if (entry.type === 'eliteEscort')   spawnFormationEliteEscort();
          else if (entry.type === 'columnTrain')   spawnFormationColumnTrain();
          else if (entry.type === 'crossfire')     spawnFormationCrossfire();
          else if (entry.type === 'shieldCluster') spawnFormationShieldCluster();
          else if (entry.type === 'pincer')        spawnFormationPincer();
        }
      }
    }

    turretIndicators.update(delta);

    // Snapshot pool before filter for Pixi gfx cleanup
    const _pixi_prevPool = this.pool.slice();
    this.pool = this.pool.filter(s => {
      if (s.isBonusRing) {
        s.y += s.vy * dt;
        s.angle += s.spin;
        s.ringAngle -= 0.035;
        if (s.flashTimer > 0) s.flashTimer -= delta;
        if (s.hpBarTimer > 0) s.hpBarTimer -= delta;
        if (s.lifetime !== undefined) s.lifetime -= delta;
        return s.y < PLAY_Y + PLAY_H + s.size + 40 && (s.lifetime === undefined || s.lifetime > 0);
      }

      if (s.isGatePiece) {
        s.y += s.vy * dt;
        if (s.flashTimer > 0) s.flashTimer -= delta;
        if (s.hpBarTimer > 0) s.hpBarTimer -= delta;
        if (s.lifetime !== undefined) s.lifetime -= delta;
        return s.y < PLAY_Y + PLAY_H + 80 && (s.lifetime === undefined || s.lifetime > 0);
      }

      // Formation delay â€” freeze shard in place until delay expires
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

      // Shield drone update â€” before all other logic
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

        // Acquire target if none â€” priority: locked turrets > elites > anything
        if (!s.supportTarget && s.retargetTimer <= 0) {
          let best = null;
          const priority = t => {
            if (t.isTurret && t.turretLocked) return 3;
            if (t.isElite) return 2;
            return 1;
          };
          for (const t of shards.pool) {
            if (t === s || t.isShieldDrone || t.isJackpot || t.isBonusRing) continue;
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
        // Clamp to play area â€” drones never leave
        s.x = Math.max(PLAY_X + 12, Math.min(PLAY_X + PLAY_W - 12, s.x));
        s.y = Math.max(PLAY_Y + 12, Math.min(PLAY_Y + PLAY_H - 12, s.y));
        if (s.flashTimer > 0) s.flashTimer -= delta;
        if (s.hpBarTimer > 0) s.hpBarTimer -= delta;
        return true;
      }

      // Turret update â€” skip all normal movement/homing
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

      // Jackpot update
      if (s.isJackpot) {
        const jackpotMaxY = PLAY_Y + PLAY_H * 0.30;
        s.jackpotLife -= delta;
        s.angle += s.spin;
        s.jackpotJitterTimer -= delta;
        if (s.flashTimer > 0) s.flashTimer -= delta;

        if (s.jackpotLife <= 2400 && !s.jackpotEscaping) {
          s.jackpotEscaping = true;
          const toLeft   = s.x - PLAY_X;
          const toRight  = (PLAY_X + PLAY_W) - s.x;
          const toTop    = s.y - PLAY_Y;
          const minD = Math.min(toLeft, toRight, toTop);
          const escSpd = 620;
          if      (minD === toTop)    { s.jackpotEscapeVx = 0;       s.jackpotEscapeVy = -escSpd; }
          else if (minD === toLeft)   { s.jackpotEscapeVx = -escSpd; s.jackpotEscapeVy = 0; }
          else                        { s.jackpotEscapeVx = escSpd;  s.jackpotEscapeVy = 0; }
          streakCallout.show('JACKPOT ESCAPED', '#ff8800', 1100, 1.4, 'top');
        }

        if (s.jackpotEscaping) {
          s.vx = s.jackpotEscapeVx;
          s.vy = s.jackpotEscapeVy;
        } else {
          // Hide: steer toward nearest enemy cluster
          const others = shards.pool.filter(e => !e.isJackpot && !e.isGatePiece && !e.isBonusRing);
          if (others.length > 0) {
            const sorted = others.slice().sort((a, b) =>
              Math.hypot(a.x - s.x, a.y - s.y) - Math.hypot(b.x - s.x, b.y - s.y)
            );
            const cluster = sorted.slice(0, Math.min(5, sorted.length));
            const cx = cluster.reduce((sum, e) => sum + e.x, 0) / cluster.length;
            const cy = Math.min(
              jackpotMaxY - 26,
              cluster.reduce((sum, e) => sum + e.y, 0) / cluster.length
            );
            const ddx = cx - s.x, ddy = cy - s.y;
            const dist = Math.hypot(ddx, ddy);
            if (dist > 40) {
              s.vx += (ddx / dist) * 150 * dt;
              s.vy += (ddy / dist) * 150 * dt;
            }
          } else {
            // No enemies â€” drift toward upper middle
            const ddx = (PLAY_X + PLAY_W * 0.5) - s.x;
            const ddy = (PLAY_Y + PLAY_H * 0.2) - s.y;
            const dist = Math.hypot(ddx, ddy);
            if (dist > 30) {
              s.vx += (ddx / dist) * 95 * dt;
              s.vy += (ddy / dist) * 95 * dt;
            }
          }

          // Random direction jitter
          if (s.jackpotJitterTimer <= 0) {
            s.jackpotJitterTimer = 320 + Math.random() * 420;
            s.vx += (Math.random() - 0.5) * 150;
            s.vy += (Math.random() - 0.5) * 150;
          }

          // Speed cap
          const spd = Math.hypot(s.vx, s.vy);
          if (spd > 240) { s.vx = (s.vx / spd) * 240; s.vy = (s.vy / spd) * 240; }

          // Bounce off arena walls
          if (s.x < PLAY_X + 18) s.vx = Math.abs(s.vx) + 24;
          if (s.x > PLAY_X + PLAY_W - 18) s.vx = -(Math.abs(s.vx) + 24);
          if (s.y < PLAY_Y + 18) s.vy = Math.abs(s.vy) + 24;
          if (s.y > jackpotMaxY) {
            s.y = jackpotMaxY;
            s.vy = -Math.max(Math.abs(s.vy) + 40, 130);
          }
        }

        s.x += s.vx * dt;
        s.y += s.vy * dt;

        if (s.jackpotEscaping) {
          return s.x > PLAY_X - 150 && s.x < PLAY_X + PLAY_W + 150 &&
                 s.y > PLAY_Y - 150 && s.y < PLAY_Y + PLAY_H + 150;
        }
        return true;
      }

      // Charger state machine
      if (s.isCharger) {
        const alignTol = Math.max(10, 20 - stage.current);
        if (s.chargerState === 'hunt') {
          // Lateral hunt toward player X
          s.vx = s.chargerHuntVx;
          s.vy = 26;
          s.x += s.vx * dt;
          s.y += s.vy * dt;
          // Wall bounce
          if (s.x < PLAY_X + 12) { s.chargerHuntVx = Math.abs(s.chargerHuntVx); s.vx = s.chargerHuntVx; }
          if (s.x > PLAY_X + PLAY_W - 12) { s.chargerHuntVx = -Math.abs(s.chargerHuntVx); s.vx = s.chargerHuntVx; }
          // Recalculate hunt direction continuously
          s.chargerHuntVx = s.x < drone.x ? 47 : -47;
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

    // Destroy Pixi gfx for entities removed from pool this frame
    if (_pixi_prevPool.length !== this.pool.length) {
      const _alive = new Set(this.pool);
      for (const _s of _pixi_prevPool) {
        if (!_alive.has(_s)) this._destroyEntityGfx(_s);
      }
    }
  },

  draw() {
    if (_pixi_entityLayer()) { this.syncGfx(); return; }
    // â”€â”€ Canvas2D fallback â€” active until scene manager provides getEntityLayer() â”€â”€
    this.pool.forEach(s => {
      ctx.save();
      ctx.translate(s.x, s.y);
      if (s.isBonusRing) {
        const pulse = 0.72 + 0.28 * (Math.sin(getNow() * 0.01 + s.pulseOffset) * 0.5 + 0.5);
        const outerR = s.size * (1.05 + pulse * 0.18);
        const innerR = s.innerRadius;
        const orbitR = outerR + 8;
        ctx.rotate(s.angle);

        ctx.globalAlpha = 0.16 + pulse * 0.12;
        setGlow(s.color, 22);
        ctx.fillStyle = s.color;
        ctx.beginPath();
        ctx.arc(0, 0, outerR + 8, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = 0.95;
        ctx.strokeStyle = s.glowColor;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, outerR, 0, Math.PI * 2);
        ctx.stroke();

        ctx.globalAlpha = 0.82;
        ctx.strokeStyle = s.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, innerR, 0, Math.PI * 2);
        ctx.stroke();

        ctx.globalAlpha = 0.8;
        ctx.strokeStyle = '#f3fff0';
        ctx.lineWidth = 1.6;
        for (let i = 0; i < 4; i++) {
          const a = s.ringAngle + i * (Math.PI * 0.5);
          ctx.beginPath();
          ctx.arc(Math.cos(a) * orbitR, Math.sin(a) * orbitR, 2.6, 0, Math.PI * 2);
          ctx.stroke();
        }

        ctx.globalAlpha = 0.2;
        ctx.strokeStyle = s.color;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(-outerR - 16, 0);
        ctx.lineTo(outerR + 16, 0);
        ctx.stroke();
        clearGlow();
        ctx.restore();
        return;
      }

      if (s.isGatePiece) {
        const gateColor = s.flashTimer > 0 ? '#ffffff' : s.color;
        const w = s.gateWidth;
        const h = s.gateHeight;
        const t = getNow() * 0.018 + s.x * 0.01;
        const isSafe = !!s.isGateSafe;
        const edgeColor = isSafe ? '#ccffd8' : '#ffd6df';
        const accentColor = isSafe ? '#39ff14' : '#ff294f';
        const bodyColor = isSafe ? '#07180b' : '#25070f';
        const fillAlpha = isSafe ? 0.24 : 0.18;

        ctx.globalAlpha = fillAlpha;
        setGlow(gateColor, isSafe ? 18 : 10);
        ctx.fillStyle = bodyColor;
        ctx.fillRect(-w * 0.5, -h * 0.5, w, h);

        ctx.globalAlpha = isSafe ? 0.88 : 0.74;
        ctx.strokeStyle = edgeColor;
        ctx.lineWidth = isSafe ? 1.5 : 1.35;
        ctx.strokeRect(-w * 0.5, -h * 0.5, w, h);

        ctx.globalAlpha = isSafe ? 0.88 : 0.72;
        ctx.fillStyle = accentColor;
        ctx.fillRect(-w * 0.5, -h * 0.5, w, 2);
        ctx.fillRect(-w * 0.5, h * 0.5 - 2, w, 2);

        ctx.beginPath();
        const points = 7;
        for (let i = 0; i <= points; i++) {
          const px = -w * 0.5 + (w / points) * i;
          const py = Math.sin(t + i * 0.95) * (h * (isSafe ? 0.18 : 0.12));
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.globalAlpha = isSafe ? 0.95 : 0.84;
        setGlow(accentColor, isSafe ? 14 : 12);
        ctx.strokeStyle = accentColor;
        ctx.lineWidth = isSafe ? 2.2 : 1.9;
        ctx.stroke();

        if (isSafe) {
          ctx.globalAlpha = 0.16;
          ctx.fillStyle = accentColor;
          ctx.fillRect(-w * 0.5, -h * 0.5, w, h);

          ctx.globalAlpha = 0.85;
          ctx.fillStyle = '#fff7fa';
          ctx.fillRect(-w * 0.01, -h * 0.32, w * 0.02, h * 0.64);
        } else {
          ctx.globalAlpha = 0.18;
          ctx.fillStyle = accentColor;
          ctx.fillRect(-w * 0.5, -h * 0.5 + 4, w, h - 8);
        }
        clearGlow();
        ctx.restore();
        return;
      }
      const isKamikaze = !!s.isKamikaze;
      const facingAngle = isKamikaze ? Math.atan2(s.vy, s.vx) : s.angle;
      ctx.rotate(facingAngle);
      const drawColor = s.flashTimer > 0 ? '#ffffff' : s.color;
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

      // Jackpot
      if (s.isJackpot) {
        {
        const r = s.size;
        const now = getNow();
        const pulse = 0.5 + 0.5 * Math.sin(now * 0.008);
        const amber = s.flashTimer > 0 ? '#ffffff' : '#ffb020';
        const amberBrt = s.flashTimer > 0 ? '#ffffff' : '#ffe090';
        const chipR = r * 1.42;
        const faceR = r * 1.02;
        const coreR = r * 0.58;
        const insetOuterR = chipR * 0.94;
        const insetInnerR = chipR * 0.72;

        ctx.globalAlpha = 0.14 + pulse * 0.07;
        setGlow(amber, 22);
        ctx.fillStyle = amber;
        ctx.beginPath();
        ctx.arc(0, 0, chipR * 1.08, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = 0.94;
        setGlow(amber, 18);
        ctx.fillStyle = '#d79820';
        ctx.beginPath();
        ctx.arc(0, 0, chipR, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = 0.95;
        setGlow(amberBrt, 14);
        ctx.strokeStyle = amberBrt;
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.arc(0, 0, chipR, 0, Math.PI * 2);
        ctx.stroke();

        ctx.globalAlpha = 0.82;
        ctx.strokeStyle = '#fff0b8';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(0, 0, chipR * 0.84, 0, Math.PI * 2);
        ctx.stroke();

        ctx.globalAlpha = 0.92;
        ctx.fillStyle = '#fff3cc';
        for (let i = 0; i < 6; i++) {
          const a = s.angle + i * (Math.PI / 3);
          const c = Math.cos(a);
          const si = Math.sin(a);
          const px = -si;
          const py = c;
          ctx.beginPath();
          ctx.moveTo(c * insetOuterR + px * chipR * 0.14, si * insetOuterR + py * chipR * 0.14);
          ctx.lineTo(c * insetOuterR - px * chipR * 0.14, si * insetOuterR - py * chipR * 0.14);
          ctx.lineTo(c * insetInnerR - px * chipR * 0.10, si * insetInnerR - py * chipR * 0.10);
          ctx.lineTo(c * insetInnerR + px * chipR * 0.10, si * insetInnerR + py * chipR * 0.10);
          ctx.closePath();
          ctx.fill();
        }

        ctx.globalAlpha = 0.96;
        setGlow('#ffd66b', 10);
        ctx.fillStyle = '#f5c55e';
        ctx.beginPath();
        ctx.arc(0, 0, faceR, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = 0.96;
        ctx.strokeStyle = '#fff1bf';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.arc(0, 0, faceR, 0, Math.PI * 2);
        ctx.stroke();

        ctx.globalAlpha = 0.9;
        ctx.strokeStyle = '#fff6dc';
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        ctx.arc(0, 0, coreR * 1.18, 0, Math.PI * 2);
        ctx.stroke();

        ctx.globalAlpha = 1;
        setGlow('#ffffff', 12);
        ctx.fillStyle = '#fff9ef';
        ctx.beginPath();
        ctx.arc(0, 0, coreR, 0, Math.PI * 2);
        ctx.fill();

        clearGlow();
        ctx.restore(); // back to world coords

        // Segmented HP bar (world coords, always visible)
        {
          const segs = s.maxHp;
          const segW = 9, segH = 4, segGap = 2;
          const totalW = segs * segW + (segs - 1) * segGap;
          const barX = s.x - totalW / 2;
          const barY = s.y - r * 1.7 - 10;
          ctx.save();
          for (let i = 0; i < segs; i++) {
            const sx = barX + i * (segW + segGap);
            const filled = i < s.hp;
            ctx.globalAlpha = filled ? 0.95 : 0.25;
            ctx.shadowColor = filled ? '#ffb020' : 'transparent';
            ctx.shadowBlur = filled ? 6 : 0;
            ctx.fillStyle = filled ? '#ffb020' : '#554400';
            ctx.fillRect(sx, barY, segW, segH);
          }
          ctx.shadowBlur = 0;
          ctx.restore();
        }

        return;
        }

        const r = s.size;
        const now = getNow();
        const pulse = 0.5 + 0.5 * Math.sin(now * 0.008);
        const amber   = s.flashTimer > 0 ? '#ffffff' : '#ffb020';
        const amberBrt = s.flashTimer > 0 ? '#ffffff' : '#ffe090';
        const bodyAngle  = s.angle;

        // Star body â€” filled subtle amber
        const outerR = r * 1.485;
        const innerR = r * 0.594;
        const pts = 5;
        ctx.globalAlpha = 0.22 + pulse * 0.10;
        setGlow(amber, 18);
        ctx.fillStyle = amber;
        ctx.beginPath();
        for (let i = 0; i < pts * 2; i++) {
          const a = bodyAngle + i * (Math.PI / pts) - Math.PI / 2;
          const rad = i % 2 === 0 ? outerR : innerR;
          i === 0 ? ctx.moveTo(Math.cos(a) * rad, Math.sin(a) * rad)
                  : ctx.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
        }
        ctx.closePath();
        ctx.fill();

        // Star stroke
        ctx.globalAlpha = 0.95;
        setGlow(amberBrt, 14);
        ctx.strokeStyle = amberBrt;
        ctx.lineWidth = 2.0;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        for (let i = 0; i < pts * 2; i++) {
          const a = bodyAngle + i * (Math.PI / pts) - Math.PI / 2;
          const rad = i % 2 === 0 ? outerR : innerR;
          i === 0 ? ctx.moveTo(Math.cos(a) * rad, Math.sin(a) * rad)
                  : ctx.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
        }
        ctx.closePath();
        ctx.stroke();

        // Center core dot
        ctx.globalAlpha = 1;
        setGlow('#ffffff', 12);
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.arc(0, 0, r * 0.20, 0, Math.PI * 2); ctx.fill();

        clearGlow();
        ctx.restore(); // back to world coords

        // Segmented HP bar (world coords, always visible)
        {
          const segs = s.maxHp;
          const segW = 9, segH = 4, segGap = 2;
          const totalW = segs * segW + (segs - 1) * segGap;
          const barX = s.x - totalW / 2;
          const barY = s.y - r * 1.7 - 10;
          ctx.save();
          for (let i = 0; i < segs; i++) {
            const sx = barX + i * (segW + segGap);
            const filled = i < s.hp;
            ctx.globalAlpha = filled ? 0.95 : 0.25;
            ctx.shadowColor = filled ? '#ffb020' : 'transparent';
            ctx.shadowBlur = filled ? 6 : 0;
            ctx.fillStyle = filled ? '#ffb020' : '#554400';
            ctx.fillRect(sx, barY, segW, segH);
          }
          ctx.shadowBlur = 0;
          ctx.restore();
        }

        // Motion trail (world coords)
        const tSpd = Math.hypot(s.vx, s.vy);
        if (tSpd > 25) {
          const nx = -s.vx / tSpd, ny = -s.vy / tSpd;
          const tLen = s.jackpotEscaping ? 90 : 28 + Math.min(40, tSpd * 0.07);
          const trailAlpha = s.jackpotEscaping ? 0.88 : 0.52 + pulse * 0.18;
          ctx.save();
          const tGrad = ctx.createLinearGradient(s.x, s.y, s.x + nx * tLen, s.y + ny * tLen);
          tGrad.addColorStop(0, `rgba(255,176,32,${trailAlpha.toFixed(2)})`);
          tGrad.addColorStop(1, 'rgba(255,176,32,0)');
          ctx.strokeStyle = tGrad;
          ctx.lineWidth = s.jackpotEscaping ? 4.5 : 3;
          ctx.lineCap = 'round';
          ctx.shadowColor = '#ffb020';
          ctx.shadowBlur = s.jackpotEscaping ? 22 : 13;
          ctx.globalAlpha = 1;
          ctx.beginPath();
          ctx.moveTo(s.x, s.y);
          ctx.lineTo(s.x + nx * tLen, s.y + ny * tLen);
          ctx.stroke();
          ctx.shadowBlur = 0;
          ctx.restore();
        }

        return;
      }

      {
        if (isKamikaze) {
          tracePolygonPath(s.pts, 1.35);
          ctx.fillStyle = '#ff2200';
          ctx.globalAlpha = 0.06;
          ctx.fill();
        }
        // Outer bloom â€” inflated halo gives the shard volumetric depth
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

        // Inner counter-rotating hexagon detail
        const innerPts = makeRegularPolygon(s.size * 0.48, 6, -s.angle * 2);
        ctx.beginPath();
        for (let i = 0; i < innerPts.length; i++) {
          const p = innerPts[i];
          i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y);
        }
        ctx.closePath();
        ctx.globalAlpha = 0.30 + pulse * 0.20;
        setGlow(s.color, 10);
        ctx.strokeStyle = s.color;
        ctx.lineWidth = 1.0;
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
          ctx.strokeStyle = '#ff2200';
          ctx.lineWidth = 2;
          ctx.shadowColor = '#ff2200';
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
          ctx.strokeStyle = '#ff2200';
          ctx.shadowColor = '#ff2200';
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
    this.jackpotSpawned = false;
    this.jackpotSpawnAt = 5000 + Math.random() * 20000;
    // Destroy all live Pixi gfx on reset
    for (const _s of this.pool) this._destroyEntityGfx(_s);
  },

  // â”€â”€â”€ PixiJS Gfx Lifecycle â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  _initEntityGfx(s) {
    if (typeof PIXI === 'undefined') return;
    const layer = _pixi_entityLayer();
    // Body container: positioned + rotated, holds all shape geometry
    const body = new PIXI.Container();
    body.addChild(s._gBody = new PIXI.Graphics());
    s._gfxBody = body;
    // Overlay: world-space graphics for HP bars, trails, tethers (no container rotation)
    s._gfxOverlay = new PIXI.Graphics();
    if (layer) {
      layer.addChild(body);
      layer.addChild(s._gfxOverlay);
    }
  },

  _destroyEntityGfx(s) {
    if (s._gfxBody) {
      if (s._gfxBody.parent) s._gfxBody.parent.removeChild(s._gfxBody);
      s._gfxBody.destroy({ children: true });
      s._gfxBody = null;
      s._gBody = null;
    }
    if (s._gfxOverlay) {
      if (s._gfxOverlay.parent) s._gfxOverlay.parent.removeChild(s._gfxOverlay);
      s._gfxOverlay.destroy();
      s._gfxOverlay = null;
    }
  },

  syncGfx() {
    const layer = _pixi_entityLayer();
    if (!layer || typeof PIXI === 'undefined') return;
    this.pool.forEach(s => {
      if (!s._gfxBody) this._initEntityGfx(s);
      // Re-parent if layer became available after init
      if (s._gfxBody && !s._gfxBody.parent) {
        layer.addChild(s._gfxBody);
        layer.addChild(s._gfxOverlay);
      }
      if (s._gfxBody) this._syncEntityGfx(s);
    });
  },

  _syncEntityGfx(s) {
    const g = s._gBody;
    const ov = s._gfxOverlay;
    const now = getNow();
    const body = s._gfxBody;

    // â”€â”€ Bonus Ring â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    if (s.isBonusRing) {
      body.x = s.x; body.y = s.y; body.rotation = s.angle;
      const pulse = 0.72 + 0.28 * (Math.sin(now * 0.01 + s.pulseOffset) * 0.5 + 0.5);
      const outerR = s.size * (1.05 + pulse * 0.18);
      const innerR = s.innerRadius;
      const orbitR = outerR + 8;
      const ci = _hexInt(s.color), gi = _hexInt(s.glowColor);
      g.clear();
      g.beginFill(ci, 0.16 + pulse * 0.12); g.drawCircle(0, 0, outerR + 8); g.endFill();
      g.lineStyle(3, gi, 0.95); g.drawCircle(0, 0, outerR);
      g.lineStyle(2, ci, 0.82); g.drawCircle(0, 0, innerR);
      g.lineStyle(1.6, 0xf3fff0, 0.8);
      for (let i = 0; i < 4; i++) {
        const a = s.ringAngle + i * Math.PI * 0.5;
        g.drawCircle(Math.cos(a) * orbitR, Math.sin(a) * orbitR, 2.6);
      }
      g.lineStyle(1.2, ci, 0.2);
      g.moveTo(-(outerR + 16), 0); g.lineTo(outerR + 16, 0);
      ov.clear();
      return;
    }

    // â”€â”€ Gate Piece â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    if (s.isGatePiece) {
      body.x = s.x; body.y = s.y; body.rotation = 0;
      const gateColor = s.flashTimer > 0 ? '#ffffff' : s.color;
      const isSafe = !!s.isGateSafe;
      const edgeColor = isSafe ? '#ccffd8' : '#ffd6df';
      const accentColor = isSafe ? '#39ff14' : '#ff294f';
      const bodyColor  = isSafe ? '#07180b' : '#25070f';
      const ci = _hexInt(gateColor), aci = _hexInt(accentColor), bci = _hexInt(bodyColor), eci = _hexInt(edgeColor);
      const w = s.gateWidth, h = s.gateHeight;
      const t = now * 0.018 + s.x * 0.01;
      g.clear();
      g.beginFill(bci, isSafe ? 0.24 : 0.18); g.drawRect(-w*0.5, -h*0.5, w, h); g.endFill();
      g.lineStyle(isSafe ? 1.5 : 1.35, eci, isSafe ? 0.88 : 0.74);
      g.drawRect(-w*0.5, -h*0.5, w, h);
      g.beginFill(aci, isSafe ? 0.88 : 0.72); g.drawRect(-w*0.5, -h*0.5, w, 2); g.endFill();
      g.beginFill(aci, isSafe ? 0.88 : 0.72); g.drawRect(-w*0.5, h*0.5-2, w, 2); g.endFill();
      // Animated sine wave line
      g.lineStyle(isSafe ? 2.2 : 1.9, aci, isSafe ? 0.95 : 0.84);
      const points = 7;
      for (let i = 0; i <= points; i++) {
        const px = -w*0.5 + (w/points)*i;
        const py = Math.sin(t + i * 0.95) * (h * (isSafe ? 0.18 : 0.12));
        i === 0 ? g.moveTo(px, py) : g.lineTo(px, py);
      }
      if (isSafe) {
        g.beginFill(aci, 0.16); g.drawRect(-w*0.5, -h*0.5, w, h); g.endFill();
        g.beginFill(0xfff7fa, 0.85); g.drawRect(-w*0.01, -h*0.32, w*0.02, h*0.64); g.endFill();
      } else {
        g.beginFill(aci, 0.18); g.drawRect(-w*0.5, -h*0.5+4, w, h-8); g.endFill();
      }
      ov.clear();
      return;
    }

    // â”€â”€ Shield Drone â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    if (s.isShieldDrone) {
      const isKamikaze = false;
      const facingAngle = s.angle;
      body.x = s.x; body.y = s.y; body.rotation = facingAngle;
      const drawColor = s.flashTimer > 0 ? '#ffffff' : s.color;
      const ci = _hexInt(drawColor);
      const r = s.size;
      g.clear();
      // Wide bloom fill
      g.beginFill(ci, 0.12);
      g.moveTo(0, -r*1.6); g.lineTo(r*1.6, 0); g.lineTo(0, r*1.6); g.lineTo(-r*1.6, 0); g.closePath();
      g.endFill();
      // Mid corona stroke
      g.lineStyle(1.8, ci, 0.6);
      g.moveTo(0, -r); g.lineTo(r, 0); g.lineTo(0, r); g.lineTo(-r, 0); g.closePath();
      // Counter-rotating outer diamond
      const ra = s.ringAngle;
      g.lineStyle(1, ci, 0.45);
      g.moveTo(Math.cos(ra - Math.PI*0.5)*r*1.5, Math.sin(ra - Math.PI*0.5)*r*1.5);
      g.lineTo(Math.cos(ra)*r*1.5, Math.sin(ra)*r*1.5);
      g.lineTo(Math.cos(ra + Math.PI*0.5)*r*1.5, Math.sin(ra + Math.PI*0.5)*r*1.5);
      g.lineTo(Math.cos(ra + Math.PI)*r*1.5, Math.sin(ra + Math.PI)*r*1.5);
      g.closePath();
      // White core dot
      g.lineStyle(0); g.beginFill(0xffffff, 1); g.drawCircle(0, 0, 2); g.endFill();

      ov.clear();
      // Tether to target (world coords)
      if (s.supportTarget) {
        ov.lineStyle(1.5, 0x00ccff, 0.65);
        ov.moveTo(s.x, s.y);
        ov.lineTo(s.supportTarget.x, s.supportTarget.y);
      }
      // HP bar
      if (s.hpBarTimer > 0) {
        const barW = s.size*2.2, barH = 3;
        const barX = s.x - barW/2, barY = s.y - s.size*2;
        const frac = Math.max(0, s.hp/s.maxHp);
        const fade = Math.min(1, s.hpBarTimer/200);
        ov.beginFill(0x000000, fade*0.85); ov.drawRect(barX-1, barY-1, barW+2, barH+2); ov.endFill();
        ov.beginFill(0x333333, fade*0.85); ov.drawRect(barX, barY, barW, barH); ov.endFill();
        const rc = Math.round(255*(1-frac)), gc = Math.round(200*frac);
        ov.beginFill((rc<<16)|gc<<8, fade*0.85); ov.drawRect(barX, barY, barW*frac, barH); ov.endFill();
      }
      return;
    }

    // â”€â”€ Turret â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    if (s.isTurret) {
      body.x = s.x; body.y = s.y;
      body.rotation = s.turretLocked ? 0 : s.angle;
      const drawColor = s.flashTimer > 0 ? '#ffffff' : s.color;
      const ci = _hexInt(drawColor);
      const turretPts = makeRegularPolygon(s.size * 1.9, 8, Math.PI / 8);
      g.clear();
      // Wide bloom fill (scaled up)
      g.beginFill(ci, 0.15);
      _gfxPolyPath(g, turretPts, 1.08);
      g.endFill();
      // Mid corona stroke
      g.lineStyle(2, ci, 0.55);
      _gfxPolyPath(g, turretPts, 1);
      // Hard white edge
      g.lineStyle(0.7, 0xffffff, 1);
      _gfxPolyPath(g, turretPts, 1);
      // Center dot
      g.beginFill(0xffffff, 1); g.drawCircle(0, 0, 2.2); g.endFill();
      // Targeting ring when locked
      if (s.turretLocked) {
        g.lineStyle(1, ci, 0.18);
        g.drawCircle(0, 0, Math.max(0.1, s.size * 2));
      }
      // Charging glow
      if (s.turretCharging) {
        const ca = 1 - (s.turretChargeTimer / 300);
        g.beginFill(0xffffff, ca);
        g.drawCircle(0, 0, 4);
        g.endFill();
      }
      // Shield drone protection shell
      if (s.isShieldProtected) {
        const sp = 0.5 + 0.5 * Math.sin(now * 0.007 + s.x * 0.02);
        g.lineStyle(2, 0x00ccff, 0.45 + sp * 0.35);
        g.drawCircle(0, 0, Math.max(0.1, s.size * 3.5));
      }

      ov.clear();
      if (s.hpBarTimer > 0) {
        const barW = s.size*2.2, barH = 3;
        const barX = s.x - barW/2, barY = s.y - s.size*1.6;
        const frac = Math.max(0, s.hp/s.maxHp);
        const fade = Math.min(1, s.hpBarTimer/200);
        ov.beginFill(0x000000, fade*0.85); ov.drawRect(barX-1, barY-1, barW+2, barH+2); ov.endFill();
        ov.beginFill(0x333333, fade*0.85); ov.drawRect(barX, barY, barW, barH); ov.endFill();
        const rc = Math.round(255*(1-frac)), gc = Math.round(200*frac);
        ov.beginFill((rc<<16)|(gc<<8), fade*0.85); ov.drawRect(barX, barY, barW*frac, barH); ov.endFill();
      }
      return;
    }

    // â”€â”€ Jackpot â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    if (s.isJackpot) {
      {
      body.x = s.x;
      body.y = s.y;
      body.rotation = 0;
      const r = s.size;
      const pulse = 0.5 + 0.5 * Math.sin(now * 0.008);
      const amber = s.flashTimer > 0 ? 0xffffff : 0xffb020;
      const amberB = s.flashTimer > 0 ? 0xffffff : 0xffe090;
      const chipR = r * 1.42;
      const faceR = r * 1.02;
      const coreR = r * 0.58;
      const insetOuterR = chipR * 0.94;
      const insetInnerR = chipR * 0.72;
      g.clear();
      g.beginFill(amber, 0.14 + pulse * 0.07);
      g.drawCircle(0, 0, chipR * 1.08);
      g.endFill();
      g.beginFill(0xd79820, 0.94);
      g.drawCircle(0, 0, chipR);
      g.endFill();
      g.lineStyle(2.2, amberB, 0.95);
      g.drawCircle(0, 0, chipR);
      g.lineStyle(1.2, 0xfff0b8, 0.82);
      g.drawCircle(0, 0, chipR * 0.84);
      g.beginFill(0xfff3cc, 0.92);
      for (let i = 0; i < 6; i++) {
        const a = s.angle + i * (Math.PI / 3);
        const c = Math.cos(a);
        const si = Math.sin(a);
        const px = -si;
        const py = c;
        g.moveTo(c * insetOuterR + px * chipR * 0.14, si * insetOuterR + py * chipR * 0.14);
        g.lineTo(c * insetOuterR - px * chipR * 0.14, si * insetOuterR - py * chipR * 0.14);
        g.lineTo(c * insetInnerR - px * chipR * 0.10, si * insetInnerR - py * chipR * 0.10);
        g.lineTo(c * insetInnerR + px * chipR * 0.10, si * insetInnerR + py * chipR * 0.10);
        g.closePath();
      }
      g.endFill();
      g.beginFill(0xf5c55e, 0.96);
      g.drawCircle(0, 0, faceR);
      g.endFill();
      g.lineStyle(1.4, 0xfff1bf, 0.96);
      g.drawCircle(0, 0, faceR);
      g.lineStyle(1.1, 0xfff6dc, 0.9);
      g.drawCircle(0, 0, coreR * 1.18);
      g.beginFill(0xfff9ef, 1);
      g.drawCircle(0, 0, coreR);
      g.endFill();

      ov.clear();
      {
        const segs = s.maxHp, segW = 9, segH = 4, segGap = 2;
        const totalW = segs * segW + (segs - 1) * segGap;
        const barX = s.x - totalW / 2, barY = s.y - r * 1.7 - 10;
        for (let i = 0; i < segs; i++) {
          const sx = barX + i * (segW + segGap);
          const filled = i < s.hp;
          ov.beginFill(filled ? 0xffb020 : 0x554400, filled ? 0.95 : 0.25);
          ov.drawRect(sx, barY, segW, segH);
          ov.endFill();
        }
      }
      return;
      }

      body.x = s.x; body.y = s.y; body.rotation = 0;
      const r = s.size;
      const pulse = 0.5 + 0.5 * Math.sin(now * 0.008);
      const amber  = s.flashTimer > 0 ? 0xffffff : 0xffb020;
      const amberB = s.flashTimer > 0 ? 0xffffff : 0xffe090;
      const outerR = r * 1.485, innerR2 = r * 0.594;
      g.clear();
      // Star fill (bloom)
      g.beginFill(amber, 0.22 + pulse * 0.10);
      _gfxStarPath(g, 0, 0, outerR, innerR2, 5, s.angle);
      g.endFill();
      // Star stroke
      g.lineStyle(2, amberB, 0.95);
      _gfxStarPath(g, 0, 0, outerR, innerR2, 5, s.angle);
      // Core dot
      g.beginFill(0xffffff, 1); g.drawCircle(0, 0, r*0.20); g.endFill();

      ov.clear();
      // Segmented HP bar
      {
        const segs = s.maxHp, segW = 9, segH = 4, segGap = 2;
        const totalW = segs * segW + (segs-1) * segGap;
        const barX = s.x - totalW/2, barY = s.y - r*1.7 - 10;
        for (let i = 0; i < segs; i++) {
          const sx = barX + i*(segW+segGap);
          const filled = i < s.hp;
          ov.beginFill(filled ? 0xffb020 : 0x554400, filled ? 0.95 : 0.25);
          ov.drawRect(sx, barY, segW, segH);
          ov.endFill();
        }
      }
      // Motion trail
      const tSpd = Math.hypot(s.vx, s.vy);
      if (tSpd > 25) {
        const nx = -s.vx/tSpd, ny = -s.vy/tSpd;
        const tLen = s.jackpotEscaping ? 90 : 28 + Math.min(40, tSpd*0.07);
        const ta = s.jackpotEscaping ? 0.88 : 0.52 + pulse*0.18;
        ov.lineStyle(s.jackpotEscaping ? 4.5 : 3, 0xffb020, ta);
        ov.moveTo(s.x, s.y);
        ov.lineTo(s.x + nx*tLen, s.y + ny*tLen);
      }
      return;
    }

    // â”€â”€ Standard Shard / Kamikaze / Drift â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const isKamikaze = !!s.isKamikaze;
    const facingAngle = isKamikaze ? Math.atan2(s.vy, s.vx) : s.angle;
    body.x = s.x; body.y = s.y; body.rotation = facingAngle;
    const drawColor = s.flashTimer > 0 ? '#ffffff' : s.color;
    const ci = _hexInt(drawColor);
    const flicker = isKamikaze ? (0.75 + 0.25 * Math.sin(now * 0.025 + s.x * 0.01)) : 1;

    g.clear();
    if (s.pts) {
      // Outer bloom inflated fill
      if (isKamikaze) {
        g.beginFill(0xff2200, 0.06);
        _gfxPolyPath(g, s.pts, 1.35);
        g.endFill();
      }
      g.beginFill(ci, 0.05);
      _gfxPolyPath(g, s.pts, 1.28);
      g.endFill();

      // Body fill + corona stroke
      g.beginFill(ci, (isKamikaze ? 0.1 : 0.08) * flicker);
      _gfxPolyPath(g, s.pts, 1);
      g.endFill();
      g.lineStyle(isKamikaze ? 2.8 : (s.isElite ? 3.5 : 2.5), ci, (isKamikaze ? 0.62 : 0.5) * flicker);
      _gfxPolyPath(g, s.pts, 1);

      // Hard white edge
      g.lineStyle(s.isElite ? 1.2 : 0.9, 0xffffff, (s.isElite ? 0.55 : 0.38) * flicker);
      _gfxPolyPath(g, s.pts, 1);

      // Interior crack line
      g.lineStyle(0.5, ci, (isKamikaze ? 0.72 : 0.6) * flicker);
      g.moveTo(s.pts[0].x * 0.6, s.pts[0].y * 0.6);
      const mid = Math.floor(s.pts.length / 2);
      g.lineTo(s.pts[mid].x * 0.6, s.pts[mid].y * 0.6);
    }

    // Elite ring + inner hexagon
    if (s.isElite) {
      const ep = Math.sin(now * 0.008) * 0.5 + 0.5;
      const eliteR = Math.max(0.1, s.size * (1.3 + ep * 0.15));
      g.lineStyle(1.5, ci, 0.3 + ep * 0.45);
      g.drawCircle(0, 0, eliteR);
      const innerPts = makeRegularPolygon(s.size * 0.48, 6, -s.angle * 2);
      g.lineStyle(1.0, ci, 0.30 + ep * 0.20);
      _gfxPolyPath(g, innerPts, 1);
    }

    // Intrinsic shield ring (mechanic)
    if (s.maxShieldHp > 0 && s.shieldHp > 0) {
      const sp = 0.65 + 0.35 * Math.sin(now * 0.01 + s.x * 0.01);
      g.lineStyle(2, 0x9be7ff, 0.35 + sp * 0.25);
      g.drawCircle(0, 0, Math.max(0.1, s.size * 1.05));
    }

    // Shield drone protection shell
    if (s.isShieldProtected) {
      const sp = 0.5 + 0.5 * Math.sin(now * 0.007 + s.x * 0.02);
      g.lineStyle(2, 0x00ccff, 0.45 + sp * 0.35);
      g.drawCircle(0, 0, Math.max(0.1, s.size * 1.9));
      g.beginFill(0x00ccff, 0.1 + sp * 0.1);
      g.drawCircle(0, 0, Math.max(0.1, s.size * 1.9));
      g.endFill();
    }

    ov.clear();
    // Kamikaze trail (world coords)
    if (isKamikaze) {
      const spd = Math.hypot(s.vx, s.vy);
      if (spd > 10) {
        const nx = -s.vx/spd, ny = -s.vy/spd;
        const tLen = 18 + Math.min(14, spd*0.025 + s.size*0.18);
        ov.lineStyle(2, 0xff2200, 0.35 * flicker);
        ov.moveTo(s.x, s.y);
        ov.lineTo(s.x + nx*tLen, s.y + ny*tLen);
      }
      // Telegraph charge ring
      if (s.isCharger && s.chargerState === 'telegraph') {
        const tp = 1 - s.chargerTelegraphTimer / 350;
        const rr = s.size * (2.5 - tp * 1.5);
        ov.lineStyle(2, 0xff2200, 0.7 * (1 - tp * 0.3));
        ov.drawCircle(s.x, s.y, rr);
      }
    }

    // HP bar (world coords, visible when recently hit)
    if (s.hpBarTimer > 0 && (s.maxHp > 1 || s.maxShieldHp > 0)) {
      const barW = s.size*2.2, barH = 3;
      const barX = s.x - barW/2, barY = s.y - s.size*1.6;
      const frac = Math.max(0, s.hp/s.maxHp);
      const fade = Math.min(1, s.hpBarTimer/200);
      ov.beginFill(0x000000, fade*0.85); ov.drawRect(barX-1, barY-1, barW+2, barH+2); ov.endFill();
      ov.beginFill(0x333333, fade*0.85); ov.drawRect(barX, barY, barW, barH); ov.endFill();
      const rc = Math.round(255*(1-frac)), gc = Math.round(200*frac);
      ov.beginFill((rc<<16)|(gc<<8), fade*0.85); ov.drawRect(barX, barY, barW*frac, barH); ov.endFill();
      if (s.maxShieldHp > 0 && s.shieldHp > 0) {
        const sf = Math.max(0, s.shieldHp/s.maxShieldHp);
        ov.beginFill(0x0d1c24, fade*0.85); ov.drawRect(barX, barY-5, barW, 2); ov.endFill();
        ov.beginFill(0x9be7ff, fade*0.85); ov.drawRect(barX, barY-5, barW*sf, 2); ov.endFill();
      }
    }
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
      isTurret,
      size: opts.size || (isTurret ? 5.75 : 8),
      hitRadius: opts.hitRadius || 8
    });
  },

  update(delta) {
    const dt = delta / 1000;
    const _pixi_prevEB = this.pool.slice();
    this.pool = this.pool.filter(b => {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= delta;
      return b.life > 0 && b.x > PLAY_X - 40 && b.x < PLAY_X + PLAY_W + 40 && b.y > PLAY_Y - 40 && b.y < PLAY_Y + PLAY_H + 40;
    });
    if (_pixi_prevEB.length !== this.pool.length) {
      const _ebAlive = new Set(this.pool);
      for (const _b of _pixi_prevEB) {
        if (!_ebAlive.has(_b)) this._destroyBulletGfx(_b);
      }
    }
  },

  draw() {
    if (_pixi_entityLayer()) { this.syncGfx(); return; }
    // â”€â”€ Canvas2D fallback â”€â”€
    this.pool.forEach(b => {
      ctx.save();
      if (b.isTurret) {
        // Red sphere â€” same threat lane as elite/turret enemies
        setGlow('#ff2244', 22);
        ctx.fillStyle = '#ff2244';
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.size || 5.75, 0, Math.PI * 2);
        ctx.fill();
        setGlow('#ffffff', 8);
        ctx.fillStyle = '#fff1f4';
        ctx.beginPath();
        ctx.arc(b.x - (b.size || 5.75) * 0.24, b.y - (b.size || 5.75) * 0.24, Math.max(2.07, (b.size || 5.75) * 0.36), 0, Math.PI * 2);
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
    for (const _b of this.pool) this._destroyBulletGfx(_b);
    this.pool = [];
    stopBonusRingWave();
  },

  // â”€â”€â”€ Pixi Gfx Lifecycle â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  _initBulletGfx(b) {
    if (typeof PIXI === 'undefined') return;
    const layer = _pixi_entityLayer();
    b._gfx = new PIXI.Graphics();
    if (layer) layer.addChild(b._gfx);
  },

  _destroyBulletGfx(b) {
    if (b._gfx) {
      if (b._gfx.parent) b._gfx.parent.removeChild(b._gfx);
      b._gfx.destroy();
      b._gfx = null;
    }
  },

  syncGfx() {
    const layer = _pixi_entityLayer();
    if (!layer || typeof PIXI === 'undefined') return;
    this.pool.forEach(b => {
      if (!b._gfx) this._initBulletGfx(b);
      if (b._gfx && !b._gfx.parent) layer.addChild(b._gfx);
      if (!b._gfx) return;
      const g = b._gfx;
      g.clear();
      if (b.isTurret) {
        const sz = b.size || 5.75;
        // Red sphere bloom
        g.beginFill(0xff2244, 1); g.drawCircle(b.x, b.y, sz); g.endFill();
        // Specular highlight
        g.beginFill(0xfff1f4, 1);
        g.drawCircle(b.x - sz*0.24, b.y - sz*0.24, Math.max(2.07, sz*0.36));
        g.endFill();
      } else {
        // Enemy needle â€” trail line + tip
        g.lineStyle(2, 0xff3030, 0.9);
        g.moveTo(b.x - b.vx * 0.03, b.y - b.vy * 0.03);
        g.lineTo(b.x, b.y);
        // Bloom halo
        g.lineStyle(5, 0xff3030, 0.18);
        g.moveTo(b.x - b.vx * 0.035, b.y - b.vy * 0.035);
        g.lineTo(b.x, b.y);
      }
    });
  }
};


function circlesTouch(ax, ay, ar, bx, by, br) {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy < (ar + br) * (ar + br);
}

function pointToSegmentDistanceSq(px, py, ax, ay, bx, by) {
  const abx = bx - ax;
  const aby = by - ay;
  const abLenSq = abx * abx + aby * aby;
  if (abLenSq <= 0.00001) {
    const dx = px - ax;
    const dy = py - ay;
    return dx * dx + dy * dy;
  }
  const t = clamp(((px - ax) * abx + (py - ay) * aby) / abLenSq, 0, 1);
  const qx = ax + abx * t;
  const qy = ay + aby * t;
  const dx = px - qx;
  const dy = py - qy;
  return dx * dx + dy * dy;
}

function segmentOrientation(ax, ay, bx, by, cx, cy) {
  return (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
}

function onSegment(ax, ay, bx, by, px, py) {
  const epsilon = 0.0001;
  return px >= Math.min(ax, bx) - epsilon && px <= Math.max(ax, bx) + epsilon
    && py >= Math.min(ay, by) - epsilon && py <= Math.max(ay, by) + epsilon;
}

function segmentsIntersect(ax, ay, bx, by, cx, cy, dx, dy) {
  const o1 = segmentOrientation(ax, ay, bx, by, cx, cy);
  const o2 = segmentOrientation(ax, ay, bx, by, dx, dy);
  const o3 = segmentOrientation(cx, cy, dx, dy, ax, ay);
  const o4 = segmentOrientation(cx, cy, dx, dy, bx, by);
  const epsilon = 0.0001;

  if (((o1 > epsilon && o2 < -epsilon) || (o1 < -epsilon && o2 > epsilon))
    && ((o3 > epsilon && o4 < -epsilon) || (o3 < -epsilon && o4 > epsilon))) {
    return true;
  }

  if (Math.abs(o1) <= epsilon && onSegment(ax, ay, bx, by, cx, cy)) return true;
  if (Math.abs(o2) <= epsilon && onSegment(ax, ay, bx, by, dx, dy)) return true;
  if (Math.abs(o3) <= epsilon && onSegment(cx, cy, dx, dy, ax, ay)) return true;
  if (Math.abs(o4) <= epsilon && onSegment(cx, cy, dx, dy, bx, by)) return true;
  return false;
}

function segmentToSegmentDistanceSq(ax, ay, bx, by, cx, cy, dx, dy) {
  if (segmentsIntersect(ax, ay, bx, by, cx, cy, dx, dy)) return 0;
  return Math.min(
    pointToSegmentDistanceSq(ax, ay, cx, cy, dx, dy),
    pointToSegmentDistanceSq(bx, by, cx, cy, dx, dy),
    pointToSegmentDistanceSq(cx, cy, ax, ay, bx, by),
    pointToSegmentDistanceSq(dx, dy, ax, ay, bx, by)
  );
}

function pointInPolygon(px, py, points) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const xi = points[i].x;
    const yi = points[i].y;
    const xj = points[j].x;
    const yj = points[j].y;
    const intersects = ((yi > py) !== (yj > py))
      && (px < ((xj - xi) * (py - yi)) / ((yj - yi) || 0.00001) + xi);
    if (intersects) inside = !inside;
  }
  return inside;
}

function getShardCollisionAngle(s) {
  return s.isKamikaze ? Math.atan2(s.vy, s.vx) : s.angle;
}

function getShardPolygonWorldPoints(s) {
  const angle = getShardCollisionAngle(s);
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return s.pts.map(p => ({
    x: s.x + p.x * cos - p.y * sin,
    y: s.y + p.x * sin + p.y * cos
  }));
}

function circleTouchesPolygon(cx, cy, cr, points) {
  if (pointInPolygon(cx, cy, points)) return true;
  const rr = cr * cr;
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    if (pointToSegmentDistanceSq(cx, cy, a.x, a.y, b.x, b.y) <= rr) return true;
  }
  return false;
}

function segmentTouchesPolygon(ax, ay, bx, by, radius, points) {
  if (circleTouchesPolygon(ax, ay, radius, points) || circleTouchesPolygon(bx, by, radius, points)) {
    return true;
  }
  const rr = radius * radius;
  for (let i = 0; i < points.length; i++) {
    const p0 = points[i];
    const p1 = points[(i + 1) % points.length];
    if (segmentToSegmentDistanceSq(ax, ay, bx, by, p0.x, p0.y, p1.x, p1.y) <= rr) return true;
  }
  return false;
}

function usesPolygonCollision(s) {
  return Array.isArray(s.pts) && s.pts.length >= 3 && !s.isTurret && !s.isShieldDrone;
}

function getPlayerBulletCollisionSegment(b) {
  const angle = b.angle || 0;
  const vx = Math.cos(angle);
  const vy = Math.sin(angle);
  const bodyLen = b.laser ? b.len * 0.95 : b.flowState ? b.len * 0.5 : b.len * 0.6;
  const prevX = typeof b.prevX === 'number' ? b.prevX : b.x;
  const prevY = typeof b.prevY === 'number' ? b.prevY : b.y;
  const radius = Math.max(3.4, (b.hitRadius || 8) * (b.laser ? 0.5 : b.flowState ? 0.54 : 0.5));
  return {
    ax: prevX - vx * bodyLen,
    ay: prevY - vy * bodyLen,
    bx: b.x,
    by: b.y,
    radius
  };
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
  // Jackpot kill â€” special handling
  if (s.isJackpot) {
    audio.play('eliteDeath');
    fragments.burst(s.x, s.y, '#ffb020', s.size * 2.5, true);
    impactFX.onKill(s.x, s.y, '#ffb020');
    smokeParticles.spawn(s.x, s.y, '#ffb020');
    shards._destroyEntityGfx(s);
    const jackpotIdx = shards.pool.indexOf(s);
    if (jackpotIdx >= 0) shards.pool.splice(jackpotIdx, 1);
    const jackpotScore = stage.onKill(s);
    streakCallout.show('JACKPOT!', '#ffb020', 2200, 2.0, 'center');
    pickups.popups.push({
      x: s.x,
      y: s.y - 10,
      label: '+' + jackpotScore,
      color: '#ffb020',
      coreColor: '#ffffff',
      size: 51,
      life: 1200,
      maxLife: 1200,
      driftX: 0,
      riseSpeed: 64,
      isScore: true,
      elite: true
    });
    return;
  }

  audio.play(s.isElite ? 'eliteDeath' : 'enemyDeath');
  fragments.burst(s.x, s.y, s.color, s.size, s.isElite);
  impactFX.onKill(s.x, s.y, s.color);
  smokeParticles.spawn(s.x, s.y, s.color);
  shards._destroyEntityGfx(s);
  const idx = shards.pool.indexOf(s);
  if (idx >= 0) shards.pool.splice(idx, 1);
  if (s.isGatePiece || s.isBonusRing) return;
  const scoreVal = stage.onKill(s);
  const scoreColor = (s.isTurret || s.isShieldDrone || s.isKamikaze) ? '#ff7744'
    : s.isElite ? '#ffcc00'
    : '#d9d4ff';
  const popupSize = s.isTurret ? 42
    : s.isShieldDrone ? 40
    : s.isKamikaze ? 37
    : s.isElite ? 35
    : scoreVal >= 20 ? 31
    : scoreVal >= 15 ? 28
    : scoreVal >= 10 ? 24
    : 22;
  const awayFromPlayer = Math.sign(s.x - drone.x) || (Math.random() > 0.5 ? 1 : -1);
  pickups.popups.push({
    x: s.x + (Math.random() - 0.5) * 12,
    y: s.y - 8,
    label: '+' + scoreVal,
    color: scoreColor,
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
      const hitR = s.isJackpot ? s.size * 0.6
        : s.isTurret ? s.size * 2.5
        : s.isShieldDrone ? s.size * 3.0
        : s.size * 0.75;
      const bulletBody = getPlayerBulletCollisionSegment(b);
      const polygonPoints = usesPolygonCollision(s) ? getShardPolygonWorldPoints(s) : null;
      const bulletHit = s.isBonusRing
        ? false
        : s.isGatePiece
        ? rectCircleTouch(b.x, b.y, b.hitRadius || 8, s.x, s.y, s.gateWidth, s.gateHeight)
        : polygonPoints
        ? segmentTouchesPolygon(bulletBody.ax, bulletBody.ay, bulletBody.bx, bulletBody.by, bulletBody.radius, polygonPoints)
        : circlesTouch(b.x, b.y, b.hitRadius || 8, s.x, s.y, hitR);
      if (bulletHit) {
        if (s.isGatePiece) {
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
    else if (b._gfx) bullets._destroyBulletGfx?.(b); // player bullet Pixi cleanup
  }
  bullets.pool = aliveBullets;

  const _prevEB2 = enemyBullets.pool.slice();
  enemyBullets.pool = enemyBullets.pool.filter(b => {
    if (circlesTouch(b.x, b.y, b.hitRadius || 8, drone.x, drone.y, 14)) {
      player.hit();
      return false;
    }
    return true;
  });
  if (_prevEB2.length !== enemyBullets.pool.length) {
    const _ebAlive2 = new Set(enemyBullets.pool);
    for (const _b of _prevEB2) {
      if (!_ebAlive2.has(_b)) enemyBullets._destroyBulletGfx(_b);
    }
  }

  for (let i = shards.pool.length - 1; i >= 0; i--) {
    const s = shards.pool[i];
    if (s.isJackpot) continue;
    const bodyR = s.isTurret ? s.size * 2.5 : s.size * 0.75;
    const polygonPoints = usesPolygonCollision(s) ? getShardPolygonWorldPoints(s) : null;
    const playerHit = s.isBonusRing
      ? circlesTouch(s.x, s.y, getBonusRingPickupRadius(s), drone.x, drone.y, 14)
      : s.isGatePiece
      ? rectCircleTouch(drone.x, drone.y, 14, s.x, s.y, s.gateWidth, s.gateHeight)
      : polygonPoints
      ? circleTouchesPolygon(drone.x, drone.y, 14, polygonPoints)
      : circlesTouch(s.x, s.y, bodyR, drone.x, drone.y, 14);
    if (playerHit) {
      if (s.isBonusRing) {
        collectBonusRing(s);
        continue;
      }
      if (s.isGateBlocker) {
        player.hit();
        continue;
      }
      if (s.isGateSafe) continue;
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
        shards._destroyEntityGfx(s);
        shards.pool.splice(i, 1);
        player.hit();
      }
    }
  }
}
