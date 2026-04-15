// Turret scheduling and spawn helpers extracted from enemies.js.
// Loaded before js/enemies.js so the shared globals are available there.

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
    if (_pixi_entityLayer()) { this.syncGfx(); return; }
    // Canvas2D fallback
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
      ctx.globalAlpha = ind.life * 0.25;
      ctx.fillRect(ind.x - 1.5, PLAY_Y, 3, 80);
      clearGlow();
      ctx.restore();
    });
  },

  syncGfx() {
    const layer = _pixi_entityLayer();
    if (!layer || typeof PIXI === 'undefined') return;
    if (!this._gfx) { this._gfx = new PIXI.Graphics(); layer.addChild(this._gfx); }
    const g = this._gfx;
    g.clear();
    this.pool.forEach(ind => {
      const y = PLAY_Y + 4;
      // Arrow head
      g.beginFill(0xff6600, ind.life * 0.7);
      g.moveTo(ind.x - 20, y);
      g.lineTo(ind.x, y + 4);
      g.lineTo(ind.x + 20, y);
      g.closePath();
      g.endFill();
      // Vertical streak
      g.beginFill(0xff6600, ind.life * 0.25);
      g.drawRect(ind.x - 1.5, PLAY_Y, 3, 80);
      g.endFill();
    });
  },

  reset() {
    if (this._gfx) { this._gfx.clear(); }
    this.pool = [];
  }
};
