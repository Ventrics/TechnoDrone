function _fxHasPixiLayer() {
  return typeof PIXI !== 'undefined' &&
    typeof pixiPost !== 'undefined' &&
    typeof pixiPost.getParticleLayer === 'function' &&
    !!pixiPost.getParticleLayer();
}

function _fxNativeParticlesEnabled() {
  return typeof pixiPost !== 'undefined' &&
    typeof pixiPost.isNativeLayerEnabled === 'function' &&
    pixiPost.isNativeLayerEnabled('particles');
}

function _fxHex(color) {
  return typeof pixiPost !== 'undefined' && typeof pixiPost.hexToInt === 'function'
    ? pixiPost.hexToInt(color)
    : parseInt(String(color || '#000000').replace('#', ''), 16);
}

function _fxDestroyDisplayObject(item) {
  if (!item || !item._pixi) return;
  const displayObject = item._pixi;
  if (displayObject.parent) displayObject.parent.removeChild(displayObject);
  if (typeof displayObject.destroy === 'function') displayObject.destroy({ children: true });
  item._pixi = null;
}

function _fxPruneOrphans(pool, tracked) {
  if (!tracked) return;
  tracked.forEach(item => {
    if (!pool.includes(item)) {
      _fxDestroyDisplayObject(item);
      tracked.delete(item);
    }
  });
}

function _fxPolygonPoints(points) {
  const flat = [];
  points.forEach(point => {
    flat.push(point.x, point.y);
  });
  return flat;
}

function _fxEnsureFragmentGfx(fragment, tracked) {
  if (!_fxHasPixiLayer() || fragment._pixi) return;
  const gfx = new PIXI.Graphics();
  const poly = _fxPolygonPoints(fragment.pts);
  const color = _fxHex(fragment.color);
  gfx.beginFill(color, 0.07);
  gfx.drawPolygon(poly);
  gfx.endFill();
  gfx.lineStyle(2.5, color, 0.6);
  gfx.drawPolygon(poly);
  gfx.lineStyle(0.5, 0xffffff, 1);
  gfx.drawPolygon(poly);
  gfx.x = fragment.x;
  gfx.y = fragment.y;
  gfx.rotation = fragment.angle;
  gfx.alpha = Math.max(0, fragment.alpha);
  pixiPost.getParticleLayer().addChild(gfx);
  fragment._pixi = gfx;
  tracked.add(fragment);
}

function _fxSyncFragmentGfx(fragment) {
  if (!fragment._pixi) return;
  fragment._pixi.x = fragment.x;
  fragment._pixi.y = fragment.y;
  fragment._pixi.rotation = fragment.angle;
  fragment._pixi.alpha = Math.max(0, fragment.alpha);
}

function _fxEnsureCircleGfx(item, tracked) {
  if (!_fxHasPixiLayer() || item._pixi) return;
  item._pixi = new PIXI.Graphics();
  pixiPost.getParticleLayer().addChild(item._pixi);
  tracked.add(item);
}

function _fxSyncBurstGfx(particle) {
  if (!particle._pixi) return;
  const radius = Math.max(0.1, particle.radius || 0);
  particle._pixi.clear();
  particle._pixi.lineStyle(2, _fxHex(particle.color), Math.max(0, particle.alpha));
  particle._pixi.drawCircle(particle.x, particle.y, radius);
}

function _fxSyncSparkGfx(spark) {
  if (!spark._pixi) return;
  spark._pixi.clear();
  spark._pixi.lineStyle(1.5, _fxHex(spark.color), Math.max(0, spark.life * 0.9));
  spark._pixi.moveTo(spark.x, spark.y);
  spark._pixi.lineTo(spark.x - spark.vx * 0.015, spark.y - spark.vy * 0.015);
}

function _fxSyncImpactFlashGfx(flash) {
  if (!flash._pixi) return;
  const radius = Math.max(0.1, flash.r || 0);
  const color = _fxHex(flash.color || '#ffffff');
  const fillColor = _fxHex(flash.fillColor || flash.color || '#ffffff');
  flash._pixi.clear();
  if ((flash.fillAlpha || 0) > 0) {
    flash._pixi.beginFill(fillColor, Math.max(0, flash.alpha * flash.fillAlpha));
    flash._pixi.drawCircle(flash.x, flash.y, radius * (flash.fillScale || 1.15));
    flash._pixi.endFill();
  }
  flash._pixi.lineStyle(flash.lineWidth || 2, color, Math.max(0, flash.alpha * (flash.lineAlpha || 1)));
  flash._pixi.drawCircle(flash.x, flash.y, radius);
  if ((flash.coreAlpha || 0) > 0 && (flash.coreScale || 0) > 0) {
    flash._pixi.beginFill(0xffffff, Math.max(0, flash.alpha * flash.coreAlpha));
    flash._pixi.drawCircle(flash.x, flash.y, radius * flash.coreScale);
    flash._pixi.endFill();
  }
}

function _fxSyncImpactRingGfx(ring) {
  if (!ring._pixi) return;
  const radius = Math.max(0.1, ring.r || 0);
  const color = _fxHex(ring.color);
  const width = ring.width || 1.5;
  ring._pixi.clear();
  ring._pixi.lineStyle(width * (ring.haloWidthMult || 2.5), color, Math.max(0, ring.alpha * (ring.haloAlpha || 0.22)));
  ring._pixi.drawCircle(ring.x, ring.y, radius);
  ring._pixi.lineStyle(width, color, Math.max(0, ring.alpha * (ring.coreAlpha || 0.88)));
  ring._pixi.drawCircle(ring.x, ring.y, radius);
  if (ring.highlight !== false) {
    ring._pixi.lineStyle(Math.max(0.75, width * 0.22), 0xffffff, Math.max(0, ring.alpha * (ring.highlightAlpha || 0.45)));
    ring._pixi.drawCircle(ring.x, ring.y, radius);
  }
}

function _fxSyncSmokeGfx(smoke) {
  if (!smoke._pixi) return;
  smoke._pixi.clear();
  smoke._pixi.beginFill(_fxHex(smoke.color), Math.max(0, smoke.alpha * 0.55));
  smoke._pixi.drawCircle(smoke.x, smoke.y, Math.max(0.1, smoke.r || 0));
  smoke._pixi.endFill();
}

const fragments = {
  pool: [],
  _tracked: new Set(),

  burst(x, y, color, parentSize, isElite) {
    const count = isElite
      ? 10 + Math.floor(Math.random() * 6)
      : 4 + Math.floor(Math.random() * 4);
    if (this.pool.length > 80) this.pool.splice(0, this.pool.length - 60);
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 300 + Math.random() * 600;
      const size = parentSize * (0.2 + Math.random() * 0.35);
      const fragment = {
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size,
        color,
        angle: Math.random() * Math.PI * 2,
        spin: (Math.random() - 0.5) * 0.25,
        alpha: 1,
        decay: 0.9 + Math.random() * 0.6,
        pts: makeSharpShard(size),
      };
      this.pool.push(fragment);
      _fxEnsureFragmentGfx(fragment, this._tracked);
    }
  },

  update(delta) {
    const dt = delta / 1000;
    _fxPruneOrphans(this.pool, this._tracked);

    const nextPool = [];
    this.pool.forEach(fragment => {
      fragment.x += fragment.vx * dt;
      fragment.y += fragment.vy * dt;
      fragment.vx *= 0.995;
      fragment.vy *= 0.995;
      fragment.angle += fragment.spin;
      fragment.alpha -= fragment.decay * dt;
      if (fragment.alpha > 0) {
        _fxEnsureFragmentGfx(fragment, this._tracked);
        _fxSyncFragmentGfx(fragment);
        nextPool.push(fragment);
      } else {
        _fxDestroyDisplayObject(fragment);
        this._tracked.delete(fragment);
      }
    });

    this.pool = nextPool;
  },

  draw() {
    if (_fxNativeParticlesEnabled()) return;
    this.pool.forEach(fragment => {
      ctx.save();
      ctx.translate(fragment.x, fragment.y);
      ctx.rotate(fragment.angle);

      ctx.beginPath();
      ctx.moveTo(fragment.pts[0].x, fragment.pts[0].y);
      fragment.pts.forEach(point => ctx.lineTo(point.x, point.y));
      ctx.closePath();

      ctx.fillStyle = fragment.color;
      ctx.globalAlpha = Math.max(0, fragment.alpha * 0.07);
      ctx.fill();

      ctx.globalAlpha = Math.max(0, fragment.alpha * 0.6);
      ctx.strokeStyle = fragment.color;
      ctx.lineWidth = 2.5;
      ctx.lineJoin = 'miter';
      ctx.miterLimit = 10;
      ctx.stroke();

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 0.5;
      ctx.globalAlpha = Math.max(0, fragment.alpha);
      ctx.stroke();
      ctx.restore();
    });
  }
};

const burstParticles = {
  pool: [],
  _tracked: new Set(),

  spawn(x, y, color) {
    const count = 8 + Math.floor(Math.random() * 5);
    for (let i = 0; i < count; i++) {
      const particle = {
        x, y,
        radius: 4 + Math.random() * 6,
        maxRadius: 30 + Math.random() * 50,
        color,
        alpha: 1,
      };
      this.pool.push(particle);
      _fxEnsureCircleGfx(particle, this._tracked);
      _fxSyncBurstGfx(particle);
    }
  },

  update(delta) {
    const dt = delta / 1000;
    _fxPruneOrphans(this.pool, this._tracked);

    const nextPool = [];
    this.pool.forEach(particle => {
      particle.radius += (particle.maxRadius - particle.radius) * dt * 4;
      particle.alpha -= dt * 1.5;
      if (particle.alpha > 0) {
        _fxEnsureCircleGfx(particle, this._tracked);
        _fxSyncBurstGfx(particle);
        nextPool.push(particle);
      } else {
        _fxDestroyDisplayObject(particle);
        this._tracked.delete(particle);
      }
    });

    this.pool = nextPool;
  },

  draw() {
    if (_fxNativeParticlesEnabled()) return;
    this.pool.forEach(particle => {
      ctx.save();
      ctx.globalAlpha = Math.max(0, particle.alpha);
      ctx.strokeStyle = particle.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, Math.max(0.1, particle.radius || 0), 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    });
  },

  reset() {
    this.pool.forEach(_fxDestroyDisplayObject);
    this.pool = [];
    this._tracked.clear();
  }
};

const hitSparks = {
  pool: [],
  _tracked: new Set(),

  emit(x, y, vx, vy, color) {
    if (this.pool.length > 40) this.pool.splice(0, this.pool.length - 30);
    const baseAngle = Math.atan2(vy, vx);
    const count = 4 + Math.floor(Math.random() * 3);
    for (let i = 0; i < count; i++) {
      const spread = (Math.random() - 0.5) * Math.PI * 0.6;
      const angle = baseAngle + spread;
      const speed = 120 + Math.random() * 180;
      const spark = {
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        color,
      };
      this.pool.push(spark);
      _fxEnsureCircleGfx(spark, this._tracked);
      _fxSyncSparkGfx(spark);
    }
  },

  update(delta) {
    const dt = delta / 1000;
    _fxPruneOrphans(this.pool, this._tracked);

    const nextPool = [];
    this.pool.forEach(spark => {
      spark.x += spark.vx * dt;
      spark.y += spark.vy * dt;
      spark.vx *= 0.88;
      spark.vy *= 0.88;
      spark.life -= dt * 6;
      if (spark.life > 0) {
        _fxEnsureCircleGfx(spark, this._tracked);
        _fxSyncSparkGfx(spark);
        nextPool.push(spark);
      } else {
        _fxDestroyDisplayObject(spark);
        this._tracked.delete(spark);
      }
    });

    this.pool = nextPool;
  },

  draw() {
    if (_fxNativeParticlesEnabled()) return;
    this.pool.forEach(spark => {
      ctx.save();
      ctx.globalAlpha = Math.max(0, spark.life * 0.9);
      ctx.strokeStyle = spark.color;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(spark.x, spark.y);
      ctx.lineTo(spark.x - spark.vx * 0.015, spark.y - spark.vy * 0.015);
      ctx.stroke();
      ctx.restore();
    });
  },

  reset() {
    this.pool.forEach(_fxDestroyDisplayObject);
    this.pool = [];
    this._tracked.clear();
  }
};

const impactFX = {
  flashes: [],
  rings: [],
  _flashTracked: new Set(),
  _ringTracked: new Set(),

  onHit(x, y, color) {
    const flash = {
      x, y,
      r: 0,
      maxR: 14,
      alpha: 0.72,
      delay: 0,
      color: '#ffffff',
      fillColor: color,
      fillAlpha: 0.18,
      fillScale: 1.35,
      lineWidth: 1.4,
      lineAlpha: 0.95,
      coreAlpha: 0.28,
      coreScale: 0.18,
    };
    this.flashes.push(flash);
    _fxEnsureCircleGfx(flash, this._flashTracked);
    _fxSyncImpactFlashGfx(flash);

    const ringStack = [
      { r: 2, maxR: 20, alpha: 0.86, color: '#ffffff', delay: 0, width: 1.15, haloAlpha: 0.08, coreAlpha: 0.88, highlight: false },
      { r: 4, maxR: 38, alpha: 0.76, color, delay: 0, width: 1.9, haloAlpha: 0.26, coreAlpha: 0.92, highlightAlpha: 0.5 },
    ];
    ringStack.forEach(ringData => {
      const ring = { x, y, ...ringData };
      this.rings.push(ring);
      _fxEnsureCircleGfx(ring, this._ringTracked);
      _fxSyncImpactRingGfx(ring);
    });
  },

  onKill(x, y, color) {
    const flash = {
      x, y,
      r: 0,
      maxR: 30,
      alpha: 1.0,
      delay: 0,
      color: '#ffffff',
      fillColor: color,
      fillAlpha: 0.26,
      fillScale: 1.28,
      lineWidth: 2.2,
      lineAlpha: 1.0,
      coreAlpha: 0.52,
      coreScale: 0.2,
    };
    this.flashes.push(flash);
    _fxEnsureCircleGfx(flash, this._flashTracked);
    _fxSyncImpactFlashGfx(flash);

    const ringStack = [
      { r: 2, maxR: 28, alpha: 1.0, color: '#ffffff', delay: 0, width: 1.4, haloAlpha: 0.1, coreAlpha: 0.95, highlight: false },
      { r: 4, maxR: 44, alpha: 0.9, color, delay: 60, width: 2.6, haloAlpha: 0.3, coreAlpha: 0.96, highlightAlpha: 0.58 },
      { r: 8, maxR: 66, alpha: 0.62, color, delay: 130, width: 2.1, haloAlpha: 0.24, coreAlpha: 0.74, highlightAlpha: 0.42 },
      { r: 14, maxR: 92, alpha: 0.38, color, delay: 210, width: 1.6, haloAlpha: 0.18, coreAlpha: 0.52, highlightAlpha: 0.3 },
    ];
    ringStack.forEach(ringData => {
      const ring = { x, y, ...ringData };
      this.rings.push(ring);
      _fxEnsureCircleGfx(ring, this._ringTracked);
      _fxSyncImpactRingGfx(ring);
    });
  },

  update(delta) {
    const dt = delta / 1000;
    _fxPruneOrphans(this.flashes, this._flashTracked);
    _fxPruneOrphans(this.rings, this._ringTracked);

    const nextFlashes = [];
    this.flashes.forEach(flash => {
      if ((flash.delay || 0) > 0) {
        flash.delay -= delta;
        _fxEnsureCircleGfx(flash, this._flashTracked);
        if (flash._pixi) flash._pixi.visible = false;
        nextFlashes.push(flash);
        return;
      }

      flash.r += (flash.maxR - flash.r) * dt * 10;
      flash.alpha -= dt * 7;
      if (flash.alpha > 0) {
        _fxEnsureCircleGfx(flash, this._flashTracked);
        if (flash._pixi) flash._pixi.visible = true;
        _fxSyncImpactFlashGfx(flash);
        nextFlashes.push(flash);
      } else {
        _fxDestroyDisplayObject(flash);
        this._flashTracked.delete(flash);
      }
    });
    this.flashes = nextFlashes;

    const nextRings = [];
    this.rings.forEach(ring => {
      if ((ring.delay || 0) > 0) {
        ring.delay -= delta;
        _fxEnsureCircleGfx(ring, this._ringTracked);
        if (ring._pixi) ring._pixi.visible = false;
        nextRings.push(ring);
        return;
      }

      ring.r += (ring.maxR - ring.r) * dt * 6;
      ring.alpha -= dt * 4.5;
      if (ring.alpha > 0) {
        _fxEnsureCircleGfx(ring, this._ringTracked);
        if (ring._pixi) ring._pixi.visible = true;
        _fxSyncImpactRingGfx(ring);
        nextRings.push(ring);
      } else {
        _fxDestroyDisplayObject(ring);
        this._ringTracked.delete(ring);
      }
    });
    this.rings = nextRings;
  },

  draw() {
    if (_fxNativeParticlesEnabled()) return;
    this.flashes.forEach(flash => {
      const radius = Math.max(0.1, flash.r || 0);
      const fillRadius = radius * (flash.fillScale || 1.15);
      ctx.save();
      ctx.globalAlpha = Math.max(0, flash.alpha * (flash.fillAlpha || 0));
      ctx.shadowColor = flash.fillColor || flash.color || '#ffffff';
      ctx.shadowBlur = 28;
      ctx.fillStyle = flash.fillColor || flash.color || '#ffffff';
      ctx.beginPath();
      ctx.arc(flash.x, flash.y, fillRadius, 0, Math.PI * 2);
      ctx.fill();

      if ((flash.coreAlpha || 0) > 0 && (flash.coreScale || 0) > 0) {
        ctx.globalAlpha = Math.max(0, flash.alpha * flash.coreAlpha);
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = 10;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(flash.x, flash.y, radius * flash.coreScale, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalAlpha = Math.max(0, flash.alpha * (flash.lineAlpha || 1));
      ctx.shadowColor = flash.color || '#ffffff';
      ctx.shadowBlur = 22;
      ctx.strokeStyle = flash.color || '#ffffff';
      ctx.lineWidth = flash.lineWidth || 2;
      ctx.beginPath();
      ctx.arc(flash.x, flash.y, radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    });

    this.rings.forEach(ring => {
      const radius = Math.max(0.1, ring.r || 0);
      const width = ring.width || 1.5;
      ctx.save();
      ctx.lineCap = 'round';
      ctx.globalAlpha = Math.max(0, ring.alpha * (ring.haloAlpha || 0.22));
      ctx.shadowColor = ring.color;
      ctx.shadowBlur = 22;
      ctx.strokeStyle = ring.color;
      ctx.lineWidth = width * (ring.haloWidthMult || 2.5);
      ctx.beginPath();
      ctx.arc(ring.x, ring.y, radius, 0, Math.PI * 2);
      ctx.stroke();

      ctx.globalAlpha = Math.max(0, ring.alpha * (ring.coreAlpha || 0.88));
      ctx.shadowBlur = 12;
      ctx.lineWidth = width;
      ctx.beginPath();
      ctx.arc(ring.x, ring.y, radius, 0, Math.PI * 2);
      ctx.stroke();

      if (ring.highlight !== false) {
        ctx.globalAlpha = Math.max(0, ring.alpha * (ring.highlightAlpha || 0.45));
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = 8;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = Math.max(0.8, width * 0.2);
        ctx.beginPath();
        ctx.arc(ring.x, ring.y, radius, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    });
  },

  reset() {
    this.flashes.forEach(_fxDestroyDisplayObject);
    this.rings.forEach(_fxDestroyDisplayObject);
    this.flashes = [];
    this.rings = [];
    this._flashTracked.clear();
    this._ringTracked.clear();
  }
};

const smokeParticles = {
  pool: [],
  _tracked: new Set(),

  spawn(x, y, color) {
    if (this.pool.length > 40) this.pool.splice(0, this.pool.length - 30);
    for (let i = 0; i < 5; i++) {
      const smoke = {
        x: x + (Math.random() - 0.5) * 12,
        y: y + (Math.random() - 0.5) * 12,
        vx: (Math.random() - 0.6) * 28,
        vy: (Math.random() - 0.5) * 22,
        r: 3 + Math.random() * 4,
        alpha: 0.32 + Math.random() * 0.14,
        decay: 0.38 + Math.random() * 0.28,
        color,
      };
      this.pool.push(smoke);
      _fxEnsureCircleGfx(smoke, this._tracked);
      _fxSyncSmokeGfx(smoke);
    }
  },

  update(delta) {
    const dt = delta / 1000;
    _fxPruneOrphans(this.pool, this._tracked);

    const nextPool = [];
    this.pool.forEach(smoke => {
      smoke.x += smoke.vx * dt;
      smoke.y += smoke.vy * dt;
      smoke.r += dt * 9;
      smoke.alpha -= smoke.decay * dt;
      if (smoke.alpha > 0) {
        _fxEnsureCircleGfx(smoke, this._tracked);
        _fxSyncSmokeGfx(smoke);
        nextPool.push(smoke);
      } else {
        _fxDestroyDisplayObject(smoke);
        this._tracked.delete(smoke);
      }
    });

    this.pool = nextPool;
  },

  draw() {
    if (_fxNativeParticlesEnabled()) return;
    this.pool.forEach(smoke => {
      ctx.save();
      ctx.globalAlpha = Math.max(0, smoke.alpha * 0.55);
      ctx.fillStyle = smoke.color;
      ctx.beginPath();
      ctx.arc(smoke.x, smoke.y, Math.max(0.1, smoke.r || 0), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  },

  reset() {
    this.pool.forEach(_fxDestroyDisplayObject);
    this.pool = [];
    this._tracked.clear();
  }
};
