// Two independent callout zones:
//   top    — least important (chain milestones, weapon pickups, kill rewards)
//   center — most important (FLOW STATE, CHAIN LOST/EXPIRED)
const streakCallout = {
  top:    { text: '', timer: 0, duration: 0, scale: 1, startScale: 1, color: '#fff' },
  center: { text: '', timer: 0, duration: 0, scale: 1, startScale: 1, color: '#fff' },

  _show(slot, text, color, duration, startScale) {
    slot.text = text;
    slot.color = color;
    slot.timer = duration;
    slot.duration = duration;
    slot.startScale = startScale;
    slot.scale = startScale;
  },

  _updateSlot(slot, delta) {
    if (slot.timer <= 0) return;
    slot.timer -= delta;
    const elapsed = slot.duration - slot.timer;
    if (elapsed < 420) {
      const p = elapsed / 420;
      slot.scale = slot.startScale - ((slot.startScale - 1.0) * (1 - Math.pow(1 - p, 3)));
    } else {
      slot.scale = 1.0;
    }
    if (slot.timer <= 0) slot.text = '';
  },

  _drawSlot(slot, y, baseSize, dim = 1.0) {
    if (slot.timer <= 0 || !slot.text) return;
    const alphaIn  = Math.min(1, (slot.duration - slot.timer) / 220);
    const alphaOut = Math.min(1, slot.timer / 520);
    const alpha    = Math.min(alphaIn, alphaOut) * dim;
    const fontSize = Math.round(baseSize * slot.scale);
    const glowBlur = Math.max(10, 18 * slot.scale);
    const cx = PLAY_X + PLAY_W / 2;

    ctx.font = `bold ${fontSize}px monospace`;
    ctx.shadowColor = slot.color || '#8b5cf6';

    ctx.globalAlpha = alpha * 0.22;
    ctx.shadowBlur  = glowBlur * 1.9;
    ctx.fillStyle   = slot.color || '#8b5cf6';
    ctx.fillText(slot.text, cx, y);

    ctx.globalAlpha = alpha;
    ctx.fillStyle   = '#ffffff';
    ctx.shadowBlur  = glowBlur;
    ctx.fillText(slot.text, cx, y);
  },

  show(text, color, duration = 1500, startScale = 2.0, zone = 'top') {
    this._show(this[zone], text, color, duration, startScale);
  },

  showFlowState() {
    this._show(this.center, 'FLOW STATE', '#d56cff', 2200, 4.35);
  },

  showAltFire(type) {
    if (type === 'spread') this._show(this.top, 'LASER', '#39ff14', 2400, 3.2);
  },

  update(delta) {
    this._updateSlot(this.top, delta);
    this._updateSlot(this.center, delta);
  },

  draw() {
    if (this.top.timer <= 0 && this.center.timer <= 0) return;
    ctx.save();
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';

    // Center slot takes the spotlight — dim top proportionally as center fades in
    const centerPresence = this.center.timer > 0
      ? Math.min(1, (this.center.duration - this.center.timer) / 350)
      : 0;
    const topDim = 1.0 - centerPresence * 0.78;

    this._drawSlot(this.top,    PLAY_Y + PLAY_H * 0.16, 46, topDim);
    this._drawSlot(this.center, PLAY_Y + PLAY_H * 0.42, 68, 1.0);
    ctx.restore();
  },

  reset() {
    this.top    = { text: '', timer: 0, duration: 0, scale: 1, startScale: 1, color: '#fff' };
    this.center = { text: '', timer: 0, duration: 0, scale: 1, startScale: 1, color: '#fff' };
  }
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

function getTutorialStepId() {
  return typeof tutorial !== 'undefined' &&
    tutorial &&
    tutorial.active &&
    tutorial.steps &&
    tutorial.steps[tutorial.stepIndex]
    ? tutorial.steps[tutorial.stepIndex].id
    : null;
}

function tutorialAllowsControl(control) {
  const stepId = getTutorialStepId();
  if (!stepId) return true;
  if (control === 'move') return stepId !== 'release';

  switch (stepId) {
    case 'move':
      return false;
    case 'shoot':
    case 'heat':
    case 'flowState':
      return control === 'fire';
    case 'dash':
    case 'dashKill':
      return control === 'dash';
    case 'refund':
      return control === 'fire' || control === 'dash';
    case 'damage':
      return false;
    case 'spread':
      return control === 'altFire';
    case 'nuke':
      return control === 'nuke';
    case 'release':
      return false;
    default:
      return true;
  }
}

function isAltFireHeld() {
  if (!tutorialAllowsControl('altFire')) return false;
  return mouseRightDown || keys['k'] || keys['K'];
}

function isFireHeld() {
  if (!tutorialAllowsControl('fire')) return false;
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
      flowState: !!opts.flowState,
      laser: !!opts.laser,
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
          this.fire(x, y, baseAngle + a, { damage: Math.max(1, Math.ceil(player.effectiveDamage * 0.9)), len: 42, tint: '#39ff14', laser: true });
        });
        player.spreadFuel = Math.max(0, player.spreadFuel - 10);
      } else {
        this.fire(x, y, baseAngle, player.flowStateActive ? { pierce: 2, flowState: true } : {});
      }
      this.cooldown = player.fireRateCooldown;
      if (!player.flowStateActive) {
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

      if (b.flowState) {
        // === FLOW STATE BULLET — short plasma bolt ===
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

      } else if (b.laser) {
        // === LASER BOLT — neon green plasma beam ===
        const tint = '#39ff14';
        const hot  = '#c8ffc8';

        // 1. Wide diffuse glow halo
        setGlow(tint, 28);
        ctx.strokeStyle = tint;
        ctx.lineWidth   = 9;
        ctx.globalAlpha = 0.18;
        ctx.beginPath();
        ctx.moveTo(b.x - vx * b.len * 1.4, b.y - vy * b.len * 1.4);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();

        // 2. Bolt body — saturated green
        ctx.lineWidth   = 4.5;
        ctx.globalAlpha = 0.88;
        ctx.beginPath();
        ctx.moveTo(b.x - vx * b.len, b.y - vy * b.len);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();

        // 3. Bright inner core
        setGlow(hot, 6);
        ctx.strokeStyle = hot;
        ctx.lineWidth   = 1.8;
        ctx.globalAlpha = 1.0;
        ctx.beginPath();
        ctx.moveTo(b.x - vx * b.len * 0.65, b.y - vy * b.len * 0.65);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();

        // 4. Tip bloom
        ctx.globalAlpha = 0.38;
        ctx.shadowColor = tint;
        ctx.shadowBlur  = 36;
        ctx.fillStyle   = tint;
        ctx.beginPath();
        ctx.arc(b.x, b.y, 5.5, 0, Math.PI * 2);
        ctx.fill();

        // 5. White-hot tip
        ctx.globalAlpha = 1.0;
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur  = 8;
        ctx.fillStyle   = '#ffffff';
        ctx.beginPath();
        ctx.arc(b.x, b.y, 2.2, 0, Math.PI * 2);
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
  eliteOrbs: [],

  spawnAltFireOrb(x, y, type) {
    this.pool.push({ x, y, type, life: 8000, radius: 10 });
  },

  spawnEliteOrb(x, y, type) {
    this.eliteOrbs.push({ x, y, type, life: 16000, phase: 'float' });
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
          player.flowStateCharge = Math.min(player.FLOW_STATE_MAX, player.flowStateCharge + 18);
          audio.play('pickupCollect');
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

    this.eliteOrbs = this.eliteOrbs.filter(orb => {
      orb.life -= delta;
      const dx = drone.x - orb.x;
      const dy = drone.y - orb.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 250) orb.phase = 'pull';
      if (dist > 0) {
        const speed = orb.phase === 'pull' ? 600 : 60;
        orb.x += (dx / dist) * speed * dt;
        orb.y += (dy / dist) * speed * dt;
      }
      if (dist < 25) {
        if (player.altFireType === 'spread') {
          player.spreadFuel = player.SPREAD_MAX_FUEL;
          streakCallout.showAltFire('spread');
        } else {
          player.activateAltFire(orb.type);
          streakCallout.showAltFire(orb.type);
        }
        audio.play('pickupCollect');
        return false;
      }
      return orb.life > 0;
    });

    this.popups = this.popups.filter(t => {
      t.y -= (t.riseSpeed || 40) * dt;
      t.x += (t.driftX || 0) * dt;
      t.life -= delta;
      return t.life > 0;
    });

    while (this.popups.length > 30) {
      this.popups.shift();
    }
  },

  draw() {
    this.pool.forEach(p => {
      const color = p.type === 'spread' ? '#39ff14' : '#a3122a';
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

    const now = getNow();
    this.eliteOrbs.forEach(orb => {
      const pulse = 0.5 + 0.5 * Math.sin(now * 0.006);
      const spinPulse = 0.5 + 0.5 * Math.sin(now * 0.009);
      const coreR = 7 + 2 * pulse;
      const ringR = 14 + 3 * spinPulse;
      const glowR = ringR * 3.5;

      ctx.save();

      // Outer bloom halo
      const haloGrad = ctx.createRadialGradient(orb.x, orb.y, 0, orb.x, orb.y, glowR);
      haloGrad.addColorStop(0,   'rgba(57, 255, 20, 0.22)');
      haloGrad.addColorStop(0.3, 'rgba(57, 255, 20, 0.10)');
      haloGrad.addColorStop(1,   'rgba(57, 255, 20, 0.00)');
      ctx.fillStyle = haloGrad;
      ctx.beginPath();
      ctx.arc(orb.x, orb.y, glowR, 0, Math.PI * 2);
      ctx.fill();

      // Outer ring
      ctx.strokeStyle = '#39ff14';
      ctx.lineWidth = 1.5;
      ctx.shadowColor = '#39ff14';
      ctx.shadowBlur = 18;
      ctx.globalAlpha = 0.7 + 0.3 * spinPulse;
      ctx.beginPath();
      ctx.arc(orb.x, orb.y, ringR, 0, Math.PI * 2);
      ctx.stroke();

      // Inner ring
      ctx.strokeStyle = '#afffaa';
      ctx.lineWidth = 1;
      ctx.shadowBlur = 10;
      ctx.globalAlpha = 0.5 + 0.4 * pulse;
      ctx.beginPath();
      ctx.arc(orb.x, orb.y, ringR * 0.65, 0, Math.PI * 2);
      ctx.stroke();

      // Solid core (white → green gradient)
      ctx.shadowColor = '#39ff14';
      ctx.shadowBlur = 14;
      ctx.globalAlpha = 1;
      const coreGrad = ctx.createRadialGradient(orb.x, orb.y, 0, orb.x, orb.y, coreR);
      coreGrad.addColorStop(0,   '#ffffff');
      coreGrad.addColorStop(0.4, '#afffaa');
      coreGrad.addColorStop(1,   '#39ff14');
      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.arc(orb.x, orb.y, coreR, 0, Math.PI * 2);
      ctx.fill();

      // Pull-phase spokes
      if (orb.phase === 'pull') {
        ctx.globalAlpha = 0.35 + 0.35 * pulse;
        ctx.strokeStyle = '#39ff14';
        ctx.lineWidth = 0.8;
        ctx.shadowBlur = 6;
        for (let i = 0; i < 4; i++) {
          const angle = (now * 0.003) + (i * Math.PI / 2);
          ctx.beginPath();
          ctx.moveTo(orb.x + Math.cos(angle) * coreR * 1.2, orb.y + Math.sin(angle) * coreR * 1.2);
          ctx.lineTo(orb.x + Math.cos(angle) * ringR * 1.4, orb.y + Math.sin(angle) * ringR * 1.4);
          ctx.stroke();
        }
      }

      ctx.restore();
    });

    this.popups.forEach(t => {
      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      if (t.isScore) {
        const maxLife = t.maxLife || Math.max(1, t.life);
        const age = 1 - Math.max(0, t.life) / maxLife;
        const alphaIn = Math.min(1, age / 0.12);
        const alphaOut = Math.min(1, t.life / 240);
        const alpha = Math.min(alphaIn, alphaOut);
        const settle = age < 0.24 ? 1.22 - (age / 0.24) * 0.22 : 1.0;
        const fontSize = Math.round((t.size || (t.elite ? 16 : 13)) * settle);
        const glowBlur = t.elite ? 20 : 14;
        ctx.font = `bold ${fontSize}px monospace`;
        ctx.globalAlpha = alpha * 0.2;
        ctx.fillStyle = t.color;
        ctx.shadowColor = t.color;
        ctx.shadowBlur = glowBlur * 2.2;
        ctx.fillText(t.label, t.x, t.y);

        ctx.globalAlpha = alpha * 0.5;
        ctx.shadowBlur = glowBlur;
        ctx.fillText(t.label, t.x, t.y);

        ctx.globalAlpha = alpha;
        ctx.fillStyle = t.coreColor || '#f4f0ff';
        ctx.shadowColor = t.color;
        ctx.shadowBlur = Math.max(6, glowBlur * 0.55);
        ctx.fillText(t.label, t.x, t.y);
      } else {
        ctx.font = 'bold 18px monospace';
        ctx.globalAlpha = Math.min(1, t.life / 500);
        ctx.fillStyle = t.color;
        ctx.fillText(t.label, t.x, t.y);
      }
      ctx.restore();
    });
  },

  reset() { this.pool = []; this.popups = []; this.eliteOrbs = []; }
};



const screenNuke = {
  active:   false,
  ring:     0,
  maxRing:  0,
  flash:    0,
  rings:    [],

  fire() {
    if (this.active || player.ultUses <= 0) return;
    audio.startLoop('bassPulseLoop');
    player.ultUses--;
    player.ultCharge = 0;
    player.ultReady = player.ultUses > 0;
    this.active  = true;
    this.ring    = 0;
    this.maxRing = Math.sqrt(canvas.width * canvas.width + canvas.height * canvas.height);
    this.flash   = 0.72;
    this.rings = [
      { r:   0, color: '#ffe7f4', width: 3,   speed: 1.06, alphaMult: 0.95, bloom: 5.5 }, // sharp front
      { r: -42, color: '#a3122a', width: 14,  speed: 1.0,  alphaMult: 0.88, bloom: 8.5 }, // heavy main wave
      { r: -96, color: '#ff4d8f', width: 8.5, speed: 0.98, alphaMult: 0.56, bloom: 6.5 }, // magenta tail
      { r: -156, color: '#7b0d20', width: 4.5, speed: 0.94, alphaMult: 0.26, bloom: 4.0 }, // dark low-end tail
    ];
    streakCallout.show('BASE DROP', '#ff5aa5', 1500, 2.65, 'center');
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
      audio.stopLoop('bassPulseLoop');
    }
  },

  draw() {
    if (!this.active) return;

    if (this.flash > 0) {
      ctx.save();
      ctx.globalAlpha = this.flash * 0.18;
      ctx.fillStyle   = '#ff4d8f';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.globalAlpha = this.flash * 0.08;
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
      ctx.globalAlpha = alpha * 0.16;
      ctx.strokeStyle = r.color;
      ctx.lineWidth   = r.width * (r.bloom || 5.5);
      ctx.beginPath();
      ctx.arc(drone.x, drone.y, r.r, 0, Math.PI * 2);
      ctx.stroke();

      // Core ring
      ctx.globalAlpha = alpha * 0.85;
      ctx.lineWidth   = r.width;
      ctx.stroke();

      // Thin highlight for that lo-fi waveform edge
      ctx.globalAlpha = alpha * 0.46;
      ctx.strokeStyle = '#fff3fa';
      ctx.lineWidth   = Math.max(1.5, r.width * 0.22);
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
