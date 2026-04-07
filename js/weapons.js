const streakCallout = {
  text:  '',
  timer: 0,
  duration: 1500,
  scale: 1,
  startScale: 2.0,
  color: '#ffffff',

  showOverdrive() {
    this.show('OVERDRIVE', '#d56cff');
  },

  showAltFire(type) {
    if (type === 'spread') this.show('SPREAD SHOT', '#ffd400', 2100, 3.0);
    else if (type === 'bass') this.show('BASS PULSE', '#a3122a', 2100, 3.0);
  },

  show(text, color, duration = 1500, startScale = 2.0) {
    this.text  = text;
    this.color = color;
    this.timer = duration;
    this.duration = duration;
    this.startScale = startScale;
    this.scale = startScale;
  },

  update(delta) {
    if (this.timer <= 0) return;
    this.timer -= delta;
    const elapsed = this.duration - this.timer;
    if (elapsed < 300) {
      this.scale = this.startScale - ((this.startScale - 1.0) * (elapsed / 300));
    } else {
      this.scale = 1.0;
    }
  },

  draw() {
    if (this.timer <= 0) return;
    const alpha = Math.min(1, this.timer / 400);
    ctx.save();
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.globalAlpha  = alpha * 0.9;
    ctx.font         = `bold ${Math.round(28 * this.scale)}px monospace`;
    ctx.fillStyle    = this.color;
    ctx.fillText(this.text, PLAY_X + PLAY_W / 2, PLAY_Y + PLAY_H * 0.35);
    ctx.globalAlpha = alpha * 0.3;
    ctx.font        = `bold ${Math.round(30 * this.scale)}px monospace`;
    ctx.fillText(this.text, PLAY_X + PLAY_W / 2, PLAY_Y + PLAY_H * 0.35);
    ctx.restore();
  },

  reset() { this.timer = 0; this.text = ''; this.duration = 1500; this.scale = 1; this.startScale = 2.0; }
};

function isPlayerMoving() {
  return !!(keys['ArrowLeft'] || keys['a'] || keys['A'] ||
            keys['ArrowRight'] || keys['d'] || keys['D']);
}

function isTutorialNukeStep() {
  return typeof tutorial !== 'undefined' &&
    tutorial &&
    tutorial.active &&
    tutorial.steps &&
    tutorial.steps[tutorial.stepIndex] &&
    tutorial.steps[tutorial.stepIndex].id === 'nuke';
}

function isTutorialDamageStep() {
  return typeof tutorial !== 'undefined' &&
    tutorial &&
    tutorial.active &&
    tutorial.steps &&
    tutorial.steps[tutorial.stepIndex] &&
    tutorial.steps[tutorial.stepIndex].id === 'damage';
}

function isAltFireHeld() {
  return mouseRightDown || keys['k'] || keys['K'];
}

function isFireHeld() {
  if (isTutorialNukeStep() || isTutorialDamageStep()) return false;
  return mouseDown || keys['j'] || keys['J'];
}

const bullets = {
  pool:     [],
  cooldown: 0,

  fire(x, y, angle = 0, opts = {}) {
    this.pool.push({
      x,
      y,
      angle,
      len: opts.len || 22,
      damage: opts.damage || player.effectiveDamage,
      speedMul: opts.speedMul || 1,
      pierce: opts.pierce || 0,
      hitRadius: opts.hitRadius || 8,
      tint: opts.tint || null,
      heavy: !!opts.heavy,
      overdriving: !!opts.overdriving,
      spawnTime: getNow()
    });
  },

  fireAlt() {},

  update(delta) {
    const dt = delta / 1000;
    if (this.cooldown > 0) this.cooldown -= delta;

    const spreadActive = !isTutorialNukeStep() && !isTutorialDamageStep() && player.altFireType === 'spread' && player.spreadFuel > 0 && isAltFireHeld() && !player.overheated;
    const primaryFiring = isFireHeld() && !player.overheated && !spreadActive;
    if ((primaryFiring || spreadActive) && this.cooldown <= 0) {
      // Fire upward: tip of sprite is above drone.y after -PI/2 rotation
      const x = drone.x, y = drone.y - 14;
      const baseAngle = -Math.PI / 2; // straight up
      if (spreadActive) {
        [-0.22, -0.11, 0, 0.11, 0.22].forEach(a => {
          this.fire(x, y, baseAngle + a, { damage: Math.max(1, Math.ceil(player.effectiveDamage * 0.9)), len: 24, tint: '#ffcc00' });
        });
        player.spreadFuel = Math.max(0, player.spreadFuel - 10);
      } else {
        this.fire(x, y, baseAngle, player.overdriveActive ? { pierce: 2, overdriving: true } : {});
      }
      this.cooldown = player.fireRateCooldown;
      if (!player.overdriveActive) {
        player.heat = Math.min(100, player.heat + player.HEAT_PER_SHOT);
      }
      audio.play('shoot');
    }

    const baseSpeed = isPlayerMoving() ? BULLET_SPEED : BULLET_SPEED * 1.2;
    this.pool = this.pool.filter(b => {
      const speed = baseSpeed * (b.speedMul || 1);
      const a = b.angle || 0;
      b.x += Math.cos(a) * speed * dt;
      b.y += Math.sin(a) * speed * dt;
      // Cull bullets that exit the top of the play area or sides
      return b.y > PLAY_Y - 50 && b.y < PLAY_Y + PLAY_H + 50 && b.x > PLAY_X - 50 && b.x < PLAY_X + PLAY_W + 50;
    });
  },

  draw() {
    this.pool.forEach(b => {
      const angle = b.angle || 0;
      const vx = Math.cos(angle);
      const vy = Math.sin(angle);
      ctx.save();
      ctx.lineCap = 'round';

      if (b.overdriving) {
        // === OVERDRIVE BULLET — short plasma bolt ===
        // Outer plasma glow (wide, short)
        setGlow('#cc44ff', 20);
        ctx.strokeStyle = '#cc44ff';
        ctx.lineWidth   = 11;
        ctx.globalAlpha = 0.28;
        ctx.beginPath();
        ctx.moveTo(b.x - vx * b.len * 0.45, b.y - vy * b.len * 0.45);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();

        // Hot magenta core (short stub)
        setGlow('#e040fb', 12);
        ctx.strokeStyle = '#e040fb';
        ctx.lineWidth   = 5.5;
        ctx.globalAlpha = 0.85;
        ctx.beginPath();
        ctx.moveTo(b.x - vx * b.len * 0.28, b.y - vy * b.len * 0.28);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();

        // Plasma bloom around tip
        ctx.globalAlpha = 0.18;
        ctx.shadowColor = '#e040fb';
        ctx.shadowBlur  = 30;
        ctx.fillStyle   = '#e040fb';
        ctx.beginPath();
        ctx.arc(b.x, b.y, 9, 0, Math.PI * 2);
        ctx.fill();

        // White-hot tip
        ctx.globalAlpha = 1.0;
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur  = 7;
        ctx.fillStyle   = '#ffffff';
        ctx.beginPath();
        ctx.arc(b.x, b.y, 3.2, 0, Math.PI * 2);
        ctx.fill();

      } else {
        // === NORMAL BULLET — precision needle ===
        const tint = b.tint || (b.heavy ? COLOR_PINK : COLOR_CYAN);
        const len  = b.len;

        // 1. Long dim wake — conveys speed
        setGlow(tint, b.heavy ? 16 : 10);
        ctx.strokeStyle = tint;
        ctx.lineWidth   = b.heavy ? 4.5 : 3;
        ctx.globalAlpha = 0.10;
        ctx.beginPath();
        ctx.moveTo(b.x - vx * len * 2.4, b.y - vy * len * 2.4);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();

        // 2. Short hot body — the actual "mass" of the bullet
        ctx.lineWidth   = b.heavy ? 4 : 2.8;
        ctx.globalAlpha = 0.48;
        ctx.beginPath();
        ctx.moveTo(b.x - vx * len * 0.85, b.y - vy * len * 0.85);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();

        // 3. White needle core — sharp precision line
        setGlow('#ffffff', 4);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth   = b.heavy ? 1.8 : 1.2;
        ctx.globalAlpha = 0.95;
        ctx.beginPath();
        ctx.moveTo(b.x - vx * len * 0.50, b.y - vy * len * 0.50);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();

        // 4. Tip glow halo
        ctx.globalAlpha = 0.20;
        ctx.shadowColor = tint;
        ctx.shadowBlur  = b.heavy ? 30 : 20;
        ctx.fillStyle   = tint;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.heavy ? 5 : 3.8, 0, Math.PI * 2);
        ctx.fill();

        // 5. White-hot tip — the focal point
        ctx.globalAlpha = 1.0;
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur  = 5;
        ctx.fillStyle   = '#ffffff';
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.heavy ? 2.8 : 2.0, 0, Math.PI * 2);
        ctx.fill();

        // 6. Muzzle spark — brief perpendicular flash on young bullets
        const age = getNow() - b.spawnTime;
        if (age < 55) {
          const t  = 1 - age / 55;
          const px = -vy, py = vx; // perpendicular to travel
          const fl = 8 * t;
          ctx.globalAlpha = 0.75 * t;
          ctx.shadowColor = '#ffffff';
          ctx.shadowBlur  = 6;
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth   = 1.4;
          ctx.beginPath();
          ctx.moveTo(b.x - px * fl, b.y - py * fl);
          ctx.lineTo(b.x + px * fl, b.y + py * fl);
          ctx.stroke();
        }
      }

      clearGlow();
      ctx.restore();
    });
  }
};

const pickups = {
  pool: [],
  popups: [],

  spawnAltFireOrb(x, y, type) {
    this.pool.push({ x, y, type, life: 8000, radius: 10 });
  },

  update(delta) {
    const dt = delta / 1000;
    this.pool = this.pool.filter(p => {
      p.life -= delta;
      const dx = drone.x - p.x, dy = drone.y - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 0) {
        const driftSpeed = 40 + Math.max(0, 200 - dist) * 0.8;
        p.x += (dx / dist) * driftSpeed * dt;
        p.y += (dy / dist) * driftSpeed * dt;
      }
      p.radius = 10 + 3 * Math.sin(getNow() * 0.008);

      if (dist < 28) {
        if (player.altFireType) {
          player.overdriveCharge = Math.min(player.OVERDRIVE_MAX, player.overdriveCharge + 18);
          audio.play('pickupCollect');
          streakCallout.show('OVERDRIVE +', '#d56cff', 1200, 2.5);
          return false;
        }
        const canCollect = player.altFireCooldown <= 0;
        if (!canCollect) return p.life > 0;
        audio.play('pickupCollect');
        player.activateAltFire(p.type);
        streakCallout.showAltFire(p.type);
        return false;
      }
      return p.life > 0;
    });

    this.popups = this.popups.filter(t => {
      t.y -= 40 * dt;
      t.life -= delta;
      return t.life > 0;
    });

    while (this.popups.length > 30) {
      this.popups.shift();
    }
  },

  draw() {
    this.pool.forEach(p => {
      const color = p.type === 'spread' ? '#ffcc00' : '#a3122a';
      const r = p.radius;
      ctx.save();
      const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 3);
      grad.addColorStop(0, color + 'aa');
      grad.addColorStop(0.4, color + '44');
      grad.addColorStop(1, color + '00');
      ctx.globalAlpha = 0.75;
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r * 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.9;
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(p.x, p.y, r * 0.35, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    this.popups.forEach(t => {
      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      if (t.isScore) {
        ctx.font = t.elite ? 'bold 16px monospace' : '13px monospace';
        ctx.globalAlpha = Math.min(1, t.life / 300) * 0.85;
      } else {
        ctx.font = 'bold 18px monospace';
        ctx.globalAlpha = Math.min(1, t.life / 500);
      }
      ctx.fillStyle = t.color;
      ctx.fillText(t.label, t.x, t.y);
      ctx.restore();
    });
  },

  reset() { this.pool = []; this.popups = []; }
};

const bassPulse = {
  waves: [],
  tickTimer: 0,
  TICK_INTERVAL: 90,
  RANGE: 450,
  CONE_ANGLE: Math.PI / 180 * 34,
  startupProgress: 0,
  STARTUP_MS: 150,

  update(delta) {
    if (player.altFireType !== 'bass') {
      this.waves = [];
      this.tickTimer = 0;
      if (this.startupProgress > 0) audio.stopLoop('bassPulseLoop');
      this.startupProgress = 0;
      return;
    }

    const dt = delta / 1000;
    const holding = !isTutorialNukeStep() && !isTutorialDamageStep() && isAltFireHeld() && !player.overheated;
    const hasFuel = player.bassFuel > 0;

    if (holding && hasFuel) {
      if (this.startupProgress === 0) audio.startLoop('bassPulseLoop');
      this.startupProgress = Math.min(1, this.startupProgress + delta / this.STARTUP_MS);
      player.bassFuel = Math.max(0, player.bassFuel - 24 * dt);

      this.tickTimer -= delta;
      if (this.tickTimer <= 0) {
        this.tickTimer = this.TICK_INTERVAL;
        if (!player.overdriveActive) {
          player.heat = Math.min(100, player.heat + 1.6);
        }
        this._dealDamage();
        this.waves.push({
          radius: 14,
          life: 520,
          width: 10 + this.startupProgress * 4,
          alpha: 0.56,
          arc: this.CONE_ANGLE * 0.95
        });
      }

      if (player.bassFuel <= 0) {
        player.altFireType = null;
        player.bassFuel = 0;
        audio.stopLoop('bassPulseLoop');
      }
    } else {
      if (this.startupProgress > 0) audio.stopLoop('bassPulseLoop');
      this.startupProgress = Math.max(0, this.startupProgress - delta / (this.STARTUP_MS * 0.7));
    }

    this.waves = this.waves.filter(w => {
      w.life -= delta;
      w.radius += delta * 0.75;
      w.alpha = Math.max(0, w.life / 520) * 0.56;
      return w.life > 0;
    });
  },

  _dealDamage() {
    const effectiveRange = this.RANGE * this.startupProgress;
    const dmg = Math.max(1, Math.ceil(player.effectiveDamage * 0.75));
    for (let i = shards.pool.length - 1; i >= 0; i--) {
      const s = shards.pool[i];
      const dx = s.x - drone.x;
      const dy = s.y - drone.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > effectiveRange) continue;
      // Cone points upward (-PI/2); check angle from upward direction
      const angleToEnemy = Math.atan2(dy, dx);
      const angleDiff = Math.abs(((angleToEnemy - (-Math.PI / 2) + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
      if (angleDiff > this.CONE_ANGLE) continue;
      const killed = applyDamageToShard(s, dmg);
      hitSparks.emit(s.x, s.y, 1, 0, '#a3122a');
      if (killed) destroyShard(s);
    }
  },

  draw() {
    if (player.altFireType !== 'bass') return;
    const holding = !isTutorialNukeStep() && !isTutorialDamageStep() && isAltFireHeld() && player.bassFuel > 0 && !player.overheated;
    const reach = this.startupProgress;

    if (holding || reach > 0) {
      const effectiveRange = this.RANGE * reach;
      const pulse = getNow() * 0.02;
      const waveColor = '#a3122a';
      const waveHot = '#ff5a6f';
      const waveCore = '#ffd3da';
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // Cone origin is just above the drone tip (points upward)
      const ox = drone.x, oy = drone.y - 14;
      const BASE = -Math.PI / 2; // upward

      this.waves.forEach(w => {
        const alpha = w.alpha;

        ctx.globalAlpha = alpha * 0.5;
        setGlow(waveColor, 18);
        ctx.strokeStyle = waveColor;
        ctx.lineWidth = 16;
        ctx.beginPath();
        ctx.arc(ox, oy, w.radius, BASE - w.arc, BASE + w.arc);
        ctx.stroke();

        ctx.globalAlpha = alpha * 0.9;
        setGlow(waveHot, 10);
        ctx.strokeStyle = waveHot;
        ctx.lineWidth = 10;
        ctx.beginPath();
        ctx.arc(ox, oy, w.radius, BASE - w.arc * 0.96, BASE + w.arc * 0.96);
        ctx.stroke();

        ctx.globalAlpha = alpha * 0.7;
        setGlow(waveCore, 4);
        ctx.strokeStyle = waveCore;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(ox, oy, w.radius, BASE - w.arc * 0.88, BASE + w.arc * 0.88);
        ctx.stroke();
      });

      ctx.globalAlpha = 0.09 + reach * 0.08;
      const fillGrad = ctx.createRadialGradient(ox, oy, 0, ox, oy, effectiveRange);
      fillGrad.addColorStop(0, 'rgba(210,120,255,0.28)');
      fillGrad.addColorStop(0.32, 'rgba(177,76,255,0.14)');
      fillGrad.addColorStop(0.68, 'rgba(177,76,255,0.08)');
      fillGrad.addColorStop(1, 'rgba(177,76,255,0)');
      ctx.fillStyle = fillGrad;
      ctx.beginPath();
      ctx.moveTo(ox, oy);
      for (let i = 0; i <= 18; i++) {
        const t = i / 18;
        const ang = BASE - this.CONE_ANGLE + (this.CONE_ANGLE * 2 * t);
        const edgeBulge = 0.34 + 0.34 * Math.sin(t * Math.PI);
        const noseTaper = 0.54 + 0.42 * t;
        const radius = effectiveRange * (edgeBulge + 0.12) * noseTaper;
        ctx.lineTo(ox + Math.cos(ang) * radius, oy + Math.sin(ang) * radius);
      }
      ctx.closePath();
      ctx.fill();

      clearGlow();
      ctx.restore();
    }
  },

  reset() {
    this.waves = [];
    this.tickTimer = 0;
    this.startupProgress = 0;
  }
};

const screenNuke = {
  active:   false,
  ring:     0,
  maxRing:  0,
  flash:    0,
  rings:    [],

  fire() {
    if (this.active || player.ultUses <= 0) return;
    audio.play('nuke');
    player.ultUses--;
    player.ultCharge = 0;
    player.ultReady = player.ultUses > 0;
    this.active  = true;
    this.ring    = 0;
    this.maxRing = Math.sqrt(canvas.width * canvas.width + canvas.height * canvas.height);
    this.flash   = 1;
    const _wc = STAGE_ENEMY_COLORS[Math.min(stage.current - 1, 9)];
    this.rings = [
      { r:    0, color: '#ffffff', width: 3,   speed: 1.0, alphaMult: 1.00 }, // shock front
      { r:  -60, color: _wc,      width: 9,   speed: 1.0, alphaMult: 0.85 }, // main pressure wave
      { r: -120, color: _wc,      width: 5.5, speed: 1.0, alphaMult: 0.50 }, // secondary
      { r: -185, color: _wc,      width: 3,   speed: 1.0, alphaMult: 0.25 }, // tertiary
      { r: -250, color: _wc,      width: 1.5, speed: 1.0, alphaMult: 0.10 }, // ghost trail
    ];
    stage.shakeTimer     = 800;
    stage.shakeIntensity = 14;
    stage.slowmoTimer    = 600;
  },

  update(delta) {
    if (!this.active) return;
    const dt  = delta / 1000;
    const spd = 1800;

    for (const r of this.rings) {
      r.r += spd * r.speed * dt;
    }
    this.ring = this.rings[0].r;
    this.flash = Math.max(0, this.flash - dt * 3);

    for (let i = shards.pool.length - 1; i >= 0; i--) {
      const s  = shards.pool[i];
      const dx = s.x - drone.x, dy = s.y - drone.y;
      const d  = Math.sqrt(dx * dx + dy * dy);
      if (d <= this.ring && !s._nuked) {
        s._nuked = true;
        s.shieldHp = 0;
        s.hp       = 0;
        impactFX.onKill(s.x, s.y, s.color);
        fragments.burst(s.x, s.y, s.color, s.size, s.isElite);
        burstParticles.spawn(s.x, s.y, s.color);
        smokeParticles.spawn(s.x, s.y, s.color);
        stage.onKill(s, true);
        shards.pool.splice(i, 1);
      }
    }

    if (this.rings[this.rings.length - 1].r > this.maxRing) {
      this.active = false;
      this.rings  = [];
    }
  },

  draw() {
    if (!this.active) return;

    if (this.flash > 0) {
      ctx.save();
      ctx.globalAlpha = this.flash * 0.4;
      ctx.fillStyle   = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.restore();
    }

    for (const r of this.rings) {
      if (r.r <= 0) continue;
      const fade  = Math.max(0, 1 - r.r / this.maxRing);
      const alpha = fade * (r.alphaMult || 1.0);
      ctx.save();
      // Glow bloom pass
      ctx.globalAlpha = alpha * 0.2;
      ctx.strokeStyle = r.color;
      ctx.lineWidth   = r.width * 6;
      ctx.beginPath();
      ctx.arc(drone.x, drone.y, r.r, 0, Math.PI * 2);
      ctx.stroke();
      // Core ring
      ctx.globalAlpha = alpha;
      ctx.lineWidth   = r.width;
      ctx.stroke();
      ctx.restore();
    }
  },

  reset() {
    this.active = false;
    this.ring   = 0;
    this.flash  = 0;
    this.rings  = [];
  }
};

const chainLightning = {
  bolts: [],
  RANGE: 120,

  trigger(killX, killY) {
    const arcs = player.chain >= 15 ? 2 : 1;
    const used = new Set();

    for (let a = 0; a < arcs; a++) {
      let best = null, bestDist = this.RANGE;
      for (const s of shards.pool) {
        if (used.has(s)) continue;
        const dx = s.x - killX, dy = s.y - killY;
        const d  = Math.sqrt(dx * dx + dy * dy);
        if (d < bestDist) { bestDist = d; best = s; }
      }
      if (!best) break;
      used.add(best);

      const killed = applyDamageToShard(best, 3);
      best.flashTimer = 200;
      best.hpBarTimer = 1500;
      hitSparks.emit(best.x, best.y, 1, 0, COLOR_CYAN);

      const segs = [{ x: killX, y: killY }];
      const steps = 6 + Math.floor(Math.random() * 4);
      for (let i = 1; i < steps; i++) {
        const t  = i / steps;
        const mx = killX + (best.x - killX) * t + (Math.random() - 0.5) * 30;
        const my = killY + (best.y - killY) * t + (Math.random() - 0.5) * 30;
        segs.push({ x: mx, y: my });
      }
      segs.push({ x: best.x, y: best.y });

      this.bolts.push({ segments: segs, life: 1, color: COLOR_CYAN });
      if (killed) destroyShard(best);
    }
  },

  update(delta) {
    const dt = delta / 1000;
    this.bolts = this.bolts.filter(b => {
      b.life -= dt * 5;
      return b.life > 0;
    });
  },

  draw() {
    for (const b of this.bolts) {
      ctx.save();
      ctx.globalAlpha = b.life * 0.9;
      ctx.strokeStyle = b.color;
      ctx.lineWidth   = 2;
      ctx.beginPath();
      ctx.moveTo(b.segments[0].x, b.segments[0].y);
      for (let i = 1; i < b.segments.length; i++) {
        ctx.lineTo(b.segments[i].x, b.segments[i].y);
      }
      ctx.stroke();
      ctx.globalAlpha = b.life * 0.3;
      ctx.lineWidth   = 6;
      ctx.stroke();
      ctx.restore();
    }
  },

  reset() { this.bolts = []; }
};
