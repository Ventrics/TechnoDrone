const fragments = {
  pool: [],

  burst(x, y, color, parentSize, isElite) {
    const count = isElite
      ? 10 + Math.floor(Math.random() * 6)
      : 4  + Math.floor(Math.random() * 4);
    if (this.pool.length > 80) this.pool.splice(0, this.pool.length - 60);
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 300 + Math.random() * 600;
      const size  = parentSize * (0.2 + Math.random() * 0.35);
      this.pool.push({
        x, y,
        vx:    Math.cos(angle) * speed,
        vy:    Math.sin(angle) * speed,
        size,
        color,
        angle: Math.random() * Math.PI * 2,
        spin:  (Math.random() - 0.5) * 0.25,
        alpha: 1,
        decay: 0.9 + Math.random() * 0.6,
        pts:   makeSharpShard(size),
      });
    }
  },

  update(delta) {
    const dt = delta / 1000;
    this.pool = this.pool.filter(f => {
      f.x     += f.vx    * dt;
      f.y     += f.vy    * dt;
      f.vx    *= 0.995;
      f.vy    *= 0.995;
      f.angle += f.spin;
      f.alpha -= f.decay * dt;
      return f.alpha > 0;
    });
  },

  draw() {
    this.pool.forEach(f => {
      ctx.save();
      ctx.translate(f.x, f.y);
      ctx.rotate(f.angle);

      ctx.beginPath();
      ctx.moveTo(f.pts[0].x, f.pts[0].y);
      f.pts.forEach(p => ctx.lineTo(p.x, p.y));
      ctx.closePath();

      ctx.fillStyle   = f.color;
      ctx.globalAlpha = Math.max(0, f.alpha * 0.07);
      ctx.fill();

      ctx.globalAlpha = Math.max(0, f.alpha * 0.6);
      ctx.strokeStyle = f.color;
      ctx.lineWidth   = 2.5;
      ctx.lineJoin    = 'miter';
      ctx.miterLimit  = 10;
      ctx.stroke();

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth   = 0.5;
      ctx.globalAlpha = Math.max(0, f.alpha);
      ctx.stroke();
      ctx.restore();
    });
  }
};

const burstParticles = {
  pool: [],

  spawn(x, y, color) {
    const count = 8 + Math.floor(Math.random() * 5);
    for (let i = 0; i < count; i++) {
      this.pool.push({
        x, y,
        radius:    4 + Math.random() * 6,
        maxRadius: 30 + Math.random() * 50,
        color,
        alpha:     1,
      });
    }
  },

  update(delta) {
    const dt = delta / 1000;
    this.pool = this.pool.filter(p => {
      p.radius += (p.maxRadius - p.radius) * dt * 4;
      p.alpha  -= dt * 1.5;
      return p.alpha > 0;
    });
  },

  draw() {
    this.pool.forEach(p => {
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.alpha);
      ctx.strokeStyle = p.color;
      ctx.lineWidth   = 2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    });
  },

  reset() { this.pool = []; }
};

const hitSparks = {
  pool: [],

  emit(x, y, vx, vy, color) {
    if (this.pool.length > 40) this.pool.splice(0, this.pool.length - 30);
    const baseAngle = Math.atan2(vy, vx);
    const count = 4 + Math.floor(Math.random() * 3);
    for (let i = 0; i < count; i++) {
      const spread = (Math.random() - 0.5) * Math.PI * 0.6;
      const angle  = baseAngle + spread;
      const speed  = 120 + Math.random() * 180;
      this.pool.push({
        x, y,
        vx:    Math.cos(angle) * speed,
        vy:    Math.sin(angle) * speed,
        life:  1,
        color,
      });
    }
  },

  update(delta) {
    const dt = delta / 1000;
    this.pool = this.pool.filter(p => {
      p.x    += p.vx * dt;
      p.y    += p.vy * dt;
      p.vx   *= 0.88;
      p.vy   *= 0.88;
      p.life -= dt * 6;
      return p.life > 0;
    });
  },

  draw() {
    this.pool.forEach(p => {
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.life * 0.9);
      ctx.strokeStyle = p.color;
      ctx.lineWidth   = 1.5;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x - p.vx * 0.015, p.y - p.vy * 0.015);
      ctx.stroke();
      ctx.restore();
    });
  },

  reset() { this.pool = []; }
};

const impactFX = {
  flashes: [],
  rings:   [],

  onHit(x, y, color) {
    this.rings.push({ x, y, r: 4, maxR: 38, alpha: 0.75, color });
  },

  onKill(x, y, color) {
    this.flashes.push({ x, y, r: 0, maxR: 30, alpha: 1.0, delay: 0 });
    const ringStack = [
      { r: 2,  maxR: 28, alpha: 1.0,  color: '#ffffff', delay: 0   },
      { r: 4,  maxR: 44, alpha: 0.9,  color,             delay: 60  },
      { r: 8,  maxR: 66, alpha: 0.62, color,             delay: 130 },
      { r: 14, maxR: 92, alpha: 0.38, color,             delay: 210 },
    ];
    ringStack.forEach(ring => this.rings.push({ x, y, ...ring }));
  },

  update(delta) {
    const dt = delta / 1000;
    this.flashes = this.flashes.filter(f => {
      if ((f.delay || 0) > 0) { f.delay -= delta; return true; }
      f.r     += (f.maxR - f.r) * dt * 10;
      f.alpha -= dt * 7;
      return f.alpha > 0;
    });
    this.rings = this.rings.filter(r => {
      if ((r.delay || 0) > 0) { r.delay -= delta; return true; }
      r.r     += (r.maxR - r.r) * dt * 6;
      r.alpha -= dt * 4.5;
      return r.alpha > 0;
    });
  },

  draw() {
    this.flashes.forEach(f => {
      ctx.save();
      ctx.globalAlpha = Math.max(0, f.alpha);
      ctx.shadowColor = '#ffffff'; ctx.shadowBlur = 22;
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    });
    this.rings.forEach(r => {
      ctx.save();
      ctx.globalAlpha = Math.max(0, r.alpha * 0.8);
      ctx.shadowColor = r.color; ctx.shadowBlur = 18;
      ctx.strokeStyle = r.color; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    });
  },

  reset() { this.flashes = []; this.rings = []; }
};

const smokeParticles = {
  pool: [],

  spawn(x, y, color) {
    if (this.pool.length > 40) this.pool.splice(0, this.pool.length - 30);
    for (let i = 0; i < 5; i++) {
      this.pool.push({
        x: x + (Math.random() - 0.5) * 12,
        y: y + (Math.random() - 0.5) * 12,
        vx:    (Math.random() - 0.6) * 28,
        vy:    (Math.random() - 0.5) * 22,
        r:     3 + Math.random() * 4,
        alpha: 0.32 + Math.random() * 0.14,
        decay: 0.38 + Math.random() * 0.28,
        color,
      });
    }
  },

  update(delta) {
    const dt = delta / 1000;
    this.pool = this.pool.filter(p => {
      p.x     += p.vx * dt;
      p.y     += p.vy * dt;
      p.r     += dt * 9;
      p.alpha -= p.decay * dt;
      return p.alpha > 0;
    });
  },

  draw() {
    this.pool.forEach(p => {
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.alpha * 0.55);
      ctx.fillStyle   = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    });
  },

  reset() { this.pool = []; }
};
