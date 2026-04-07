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
  return {
    color: STAGE_ENEMY_COLORS[s - 1],
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
  const speed = (450 + Math.random() * 100) * (player.lives === 1 ? 1.2 : 1);
  // Top-down: spawn from top edge
  const x = PLAY_X + 20 + Math.random() * (PLAY_W - 40);
  const y = PLAY_Y - 20;
  const angle = Math.atan2(drone.y - y, drone.x - x);
  const size = 10;
  return {
    x,
    y,
    size,
    color: '#ff4400',
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    angle: Math.random() * Math.PI * 2,
    spin: 0.14,
    pts: makeArrowheadShape(size),
    hp: 1,
    maxHp: 1,
    isElite: false,
    isKamikaze: true,
    isMini: false,
    turnRate: 0,
    flashTimer: 0,
    hpBarTimer: 0,
    _grazeCd: 0,
  };
}

function spawnDrift() {
  const stats = getStageEnemyStats();
  const size = 8 + Math.random() * 10;
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
  const size = 7;
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

// X zones for turret placement — horizontal spread across play area
const TURRET_X_ZONES = [0.12, 0.30, 0.50, 0.70, 0.88];
const TURRET_SPAWN_SCHEDULES = {
  2:  [2000, 7000, 12000, 18000, 24000],
  3:  [4000, 10000, 16000, 22000],
  4:  [3000, 9000, 15000, 21000],
  5:  [4000, 12000, 20000],
  6:  [3000, 8000, 14000, 20000],
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

function spawnTurret(zoneIndex) {
  // Top-down: turrets spread horizontally across the play area, drift down, lock to a Y row
  const zoneFrac = TURRET_X_ZONES[zoneIndex % TURRET_X_ZONES.length] || 0.5;
  const bandWidth = PLAY_W * 0.12;
  const centerX = PLAY_X + PLAY_W * zoneFrac;
  const x = Math.max(PLAY_X + 30, Math.min(PLAY_X + PLAY_W - 30, centerX + (Math.random() - 0.5) * bandWidth));
  const lockFrac = TURRET_LOCK_Y[zoneIndex % TURRET_LOCK_Y.length];
  return {
    x,
    y: PLAY_Y - 30,
    lockY: PLAY_Y + PLAY_H * lockFrac,
    size: 13,
    color: '#ff2200',
    vx: 0,
    vy: 280,
    isTurret: true,
    turretLocked: false,
    turretFireTimer: 1500,
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
    color: '#00ccff',
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
    isSniper: false,
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

  _makeShard(x, y, stats, isElite, enableMechanics = false, edge = 'right') {
    const size = (14 + Math.random() * 18) * (isElite ? 1.4 : 1);
    const color = isElite ? stats.eliteColor || stats.color : stats.color;
    const rawSpd = stats.speed + Math.random() * 80;
    const speed = player.lives === 1 ? rawSpd * 1.2 : rawSpd;
    const baseHp = stats.baseHp * (isElite ? 2 : 1);
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
    };
    if (enableMechanics) this._applyMechanics(shard, getActiveMechanics());
    return shard;
  },

  _applyMechanics(shard, active) {
    shard.isSniper = active.has('snipers') && !shard.isElite && !shard.isMini && Math.random() < 0.28;
    if (shard.isSniper) shard.color = '#ff2200';
    shard.sniperCooldown = shard.isSniper ? 700 + Math.random() * 900 : 0;
    shard.sniperWindup = 0;
    shard.shieldHp = active.has('shielded') ? (shard.isElite ? 3 : 2) : 0;
    shard.maxShieldHp = shard.shieldHp;
  },

  get spawnInterval() { return STAGE_CONFIG[stage.current - 1].spawnInterval; },
  get maxEnemies() { return STAGE_CONFIG[stage.current - 1].maxEnemies; },
  get homingChance() { return STAGE_CONFIG[stage.current - 1].homingChance; },

  update(delta) {
    const dt = delta / 1000;
    const active = getActiveMechanics();

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
          const turret = spawnTurret(ti);
          // Max 2 turrets per X zone (zone band = 12% of play width)
          const zoneBand = PLAY_W * 0.12;
          const zoneCount = this.pool.filter(s => s.isTurret && Math.abs(s.x - turret.x) < zoneBand).length;
          if (zoneCount < 2) {
            this.pool.push(turret);
            turretIndicators.spawn(turret.x);
          }
        }
      }
    }
    turretIndicators.update(delta);

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

    this.pool = this.pool.filter(s => {
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

        // Acquire target if none — priority: locked turrets > snipers > elites > anything
        if (!s.supportTarget && s.retargetTimer <= 0) {
          let best = null;
          const priority = t => {
            if (t.isTurret && t.turretLocked) return 4;
            if (t.isSniper) return 3;
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
            s.turretFireTimer = 1200;
          }
        }
        if (s.flashTimer > 0) s.flashTimer -= delta;
        if (s.hpBarTimer > 0) s.hpBarTimer -= delta;
        return true;
      }

      if (s.isSniper) {
        if (s.sniperWindup > 0) {
          s.sniperWindup -= delta;
          s.vx *= 0.92;
          s.vy *= 0.92;
          if (s.sniperWindup <= 0) {
            enemyBullets.fire(s.x, s.y, drone.x, drone.y, { isSniper: true });
            impactFX.onHit(s.x, s.y, '#ffffff');
            audio.play('sniperFire');
            s.sniperCooldown = 1400 + Math.random() * 1000;
            s.sniperWindup = 0;
          }
        } else {
          s.sniperCooldown -= delta;
          if (s.sniperCooldown <= 0) {
            s.sniperWindup = 450;
            s.sniperCooldown = 999999;
            audio.play('sniperWarning');
          }
        }
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

      return s.y < PLAY_Y + PLAY_H + 80 && (s.lifetime === undefined || s.lifetime > 0);
    });
  },

  draw() {
    this.pool.forEach(s => {
      ctx.save();
      ctx.translate(s.x, s.y);
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
          ctx.arc(0, 0, s.size * 2, 0, Math.PI * 2);
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
          ctx.arc(0, 0, s.size * 3.5, 0, Math.PI * 2);
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

      // Sniper: crosshair / reticle
      if (s.isSniper) {
        const r = s.size * 1.05;
        const tickInner = r * 1.25;
        const tickOuter = r * 1.7;

        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);

        ctx.fillStyle = drawColor;
        ctx.globalAlpha = 0.10;
        ctx.fill();

        ctx.globalAlpha = 0.6;
        setGlow(drawColor, 22);
        ctx.strokeStyle = drawColor;
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.globalAlpha = 1;
        setGlow('#ffffff', 6);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 0.7;
        ctx.stroke();

        // Reticle ticks
        ctx.globalAlpha = 0.3;
        setGlow(drawColor, 8);
        ctx.strokeStyle = drawColor;
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        ctx.moveTo(tickInner, 0);  ctx.lineTo(tickOuter, 0);
        ctx.moveTo(-tickInner, 0); ctx.lineTo(-tickOuter, 0);
        ctx.moveTo(0, tickInner);  ctx.lineTo(0, tickOuter);
        ctx.moveTo(0, -tickInner); ctx.lineTo(0, -tickOuter);
        ctx.stroke();
      } else {
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

      if (!s.isSniper) {
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
        ctx.globalAlpha = 0.3 + pulse * 0.45;
        setGlow(s.color, 38);
        ctx.strokeStyle = s.color;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(0, 0, s.size * (1.3 + pulse * 0.15), 0, Math.PI * 2);
        ctx.stroke();
      }

      if (s.maxShieldHp > 0 && s.shieldHp > 0) {
        const shieldPulse = 0.65 + 0.35 * Math.sin(getNow() * 0.01 + s.x * 0.01);
        ctx.globalAlpha = 0.35 + shieldPulse * 0.25;
        setGlow('#ffffff', 16);
        ctx.strokeStyle = '#9be7ff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, s.size * 1.05, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Shield drone protection shell
      if (s.isShieldProtected) {
        const shellPulse = 0.5 + 0.5 * Math.sin(getNow() * 0.007 + s.x * 0.02);
        ctx.globalAlpha = 0.45 + shellPulse * 0.35;
        setGlow('#00ccff', 22);
        ctx.strokeStyle = '#00ccff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, s.size * 1.9, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 0.1 + shellPulse * 0.1;
        ctx.fillStyle = '#00ccff';
        ctx.fill();
      }

      if (s.isSniper && s.sniperWindup > 0) {
        const windup = 1 - s.sniperWindup / 450;
        const chargeColor = '#ff4422';

        // Expanding charge ring — shrinks inward as windup completes
        const ringRadius = s.size * (2.5 - windup * 1.5);
        ctx.globalAlpha = windup * 0.5;
        setGlow(chargeColor, 20);
        ctx.strokeStyle = chargeColor;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(0, 0, ringRadius, 0, Math.PI * 2);
        ctx.stroke();

        // Pulsing core — brightens as it charges
        const pulse = Math.sin(getNow() * 0.04) * 0.3 + 0.7;
        ctx.globalAlpha = windup * pulse;
        setGlow(chargeColor, 28 * windup);
        ctx.fillStyle = chargeColor;
        ctx.beginPath();
        ctx.arc(0, 0, s.size * 0.6 * windup, 0, Math.PI * 2);
        ctx.fill();

        // Full-bright flash right before firing
        if (windup > 0.85) {
          ctx.globalAlpha = (windup - 0.85) / 0.15;
          setGlow('#ffffff', 30);
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(0, 0, s.size * 0.4, 0, Math.PI * 2);
          ctx.fill();
        }
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
  }
};

const enemyBullets = {
  pool: [],

  fire(x, y, targetX, targetY, opts = {}) {
    const angle = Math.atan2(targetY - y, targetX - x);
    const isSniper = !!opts.isSniper;
    const isTurret = !!opts.isTurret;
    const speed = isSniper ? 420 + stage.current * 20
      : isTurret ? 260
      : 320 + stage.current * 14;
    this.pool.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 30000,
      isSniper,
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
        // Amber sphere — distinct from sniper (red) and regular (orange trail)
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
        const color = b.isSniper ? '#ff4422' : '#ff8844';
        const tailScale = b.isSniper ? 0.08 : 0.03;
        const lineWidth = b.isSniper ? 3.5 : 2;
        setGlow(color, b.isSniper ? 18 : 12);
        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(b.x - b.vx * tailScale, b.y - b.vy * tailScale);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
        if (b.isSniper) {
          setGlow('#ffffff', 10);
          ctx.fillStyle = '#fff4da';
          ctx.beginPath();
          ctx.arc(b.x, b.y, 2.4, 0, Math.PI * 2);
          ctx.fill();
        }
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
  stage.onKill(s);

  const scoreVal = getEnemyScoreValue(s);
  pickups.popups.push({
    x: s.x + (Math.random() - 0.5) * 12,
    y: s.y - 8,
    label: '+' + scoreVal,
    color: s.isElite ? '#ffcc00' : '#ffffff',
    life: s.isElite ? 700 : 550,
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
      if (circlesTouch(b.x, b.y, b.hitRadius || 8, s.x, s.y, hitR)) {
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
    if (circlesTouch(s.x, s.y, bodyR, drone.x, drone.y, 14)) {
      if (dash.duration > 0) {
        const killed = applyDamageToShard(s, 5, { bypassShield: true });
        dash.hitEnemy = true;
        hitSparks.emit(s.x, s.y, -1, 0, COLOR_CYAN);
        impactFX.onHit(s.x, s.y, COLOR_CYAN);
        if (killed) {
          destroyShard(s);
        } else {
          s.flashTimer = 80;
          s.hpBarTimer = 900;
        }
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
