// ─── PixiJS Player Rendering Utilities ───────────────────────────────────────
function _hexIntP(hex) { return parseInt(hex.replace('#', ''), 16); }
function _pixi_playerLayer() {
  return (typeof pixiPost !== 'undefined' && typeof pixiPost.getPlayerLayer === 'function')
    ? pixiPost.getPlayerLayer() : null;
}
function _pixi_fxLayerP() {
  return (typeof pixiPost !== 'undefined' && typeof pixiPost.getFxLayer === 'function')
    ? pixiPost.getFxLayer() : null;
}

const dash = {
  cooldown: 0,
  COOLDOWN_MS: 1020,
  COOLDOWN_OFFENSIVE: 680,
  duration: 0,
  DURATION_MS: 320,
  HEAT_REFUND: 35,
  vx: 0,
  vy: 0,
  SPEED: 680,
  hitEnemy: false,
  surgeDir: 0,  // +1 = right | -1 = left

  update(delta) {
    if (this.cooldown > 0) this.cooldown -= delta;

    if (this.duration > 0) {
      this.duration -= delta;
      if (this.duration <= 0) {
        this.cooldown = this.hitEnemy ? this.COOLDOWN_OFFENSIVE : this.COOLDOWN_MS;
        this.hitEnemy = false;
        this.vx = 0;
        this.vy = 0;
      }
    }

    if (tutorialAllowsControl('dash') && justPressed[' '] && this.cooldown <= 0 && this.duration <= 0) {
      const leftHeld  = keys['ArrowLeft']  || keys['a'] || keys['A'];
      const rightHeld = keys['ArrowRight'] || keys['d'] || keys['D'];

      if (rightHeld && !leftHeld) {
        this.surgeDir = 1;
        this.vx = this.SPEED;
      } else if (leftHeld && !rightHeld) {
        this.surgeDir = -1;
        this.vx = -this.SPEED;
      } else {
        return;
      }
      this.duration = this.DURATION_MS;
      this.hitEnemy = false;
      player.heat = Math.max(0, player.heat - this.HEAT_REFUND);
      player.dashHeatFlashTimer = player.DASH_HEAT_FLASH_MS;
      audio.play('dash');
    }
  },

  reset() {
    this.cooldown = 0;
    this.duration = 0;
    this.hitEnemy = false;
    this.surgeDir = 0;
    this.vx = 0;
    this.vy = 0;
  }
};

const drone = {
  x: 120,
  y: 0,
  width: 48,
  height: 18,
  rotorAngle: 0,
  tilt: 0,

  get speed() { return player.flowStateActive ? 436.8 : 364; },

  init() {
    this.x = PLAY_X + PLAY_W / 2;
    this.y = PLAY_Y + PLAY_H - 60;
    this._renderX = this.x;
    this._renderY = this.y;
    this._renderTilt = this.tilt;
    this._drawX = this.x;
    this._drawY = this.y;
  },

  _syncVisualPose() {
    if (typeof this._renderX !== 'number' || typeof this._renderY !== 'number') {
      this._renderX = this.x;
      this._renderY = this.y;
      this._renderTilt = this.tilt;
      this._drawX = this.x;
      this._drawY = this.y;
    }

    const prevDrawX = this._drawX ?? this._renderX;
    const prevDrawY = this._drawY ?? this._renderY;
    const followRate = dash.duration > 0 ? 0.5 : 0.42;

    this._renderX += (this.x - this._renderX) * followRate;
    this._renderY += (this.y - this._renderY) * 0.45;

    const lagX = this.x - this._renderX;
    const visualLean = Math.max(-0.07, Math.min(0.07, lagX * 0.005));
    this._renderTilt += ((this.tilt + visualLean) - this._renderTilt) * 0.32;

    const drawMotion = Math.hypot(this._renderX - prevDrawX, this._renderY - prevDrawY);
    this._drawX = this._renderX;
    this._drawY = this._renderY;

    return {
      drawX: this._renderX,
      drawY: this._renderY,
      drawTilt: this._renderTilt,
      drawMotion,
    };
  },

  update(delta) {
    const dt = delta / 1000;
    let dx = 0;

    if (tutorialAllowsControl('move')) {
      if (keys['ArrowLeft'] || keys['a'] || keys['A']) dx -= 1;
      if (keys['ArrowRight'] || keys['d'] || keys['D']) dx += 1;
    }

    let speedX = dx * this.speed;

    if (dash.duration > 0) {
      speedX += dash.vx;
    }

    this.x += speedX * dt;

    // Lock to play area, fixed Y at bottom
    this.x = Math.max(PLAY_X + 30, Math.min(PLAY_X + PLAY_W - 30, this.x));
    this.y = PLAY_Y + PLAY_H - 60;

    // Lean into dash direction, fading out as dash completes
    const dashLean = dash.duration > 0
      ? dash.surgeDir * 0.45 * (dash.duration / dash.DURATION_MS)
      : 0;
    this.tilt += ((dx * 0.3 + dashLean) - this.tilt) * 0.18;

    const moving = dx !== 0;
    this.rotorAngle += (moving ? 0.45 : 0.25);
  },

  // ─── PixiJS Gfx ────────────────────────────────────────────────────────────
  initGfx() {
    if (typeof PIXI === 'undefined') return;
    const layer = _pixi_playerLayer();
    if (!layer) return;

    // Root container — positioned + rotated each frame
    this._gfxRoot = new PIXI.Container();

    // Layer stack (bottom → top)
    this._gGlow       = new PIXI.Graphics(); // outer glow ellipse
    this._gEngines    = new PIXI.Graphics(); // exhaust trail + engine glow + core dots
    this._gHull       = new PIXI.Graphics(); // hull fill + 4 stroke passes
    this._gFlow       = new PIXI.Graphics(); // flow state outer bloom stroke
    this._gPanel      = new PIXI.Graphics(); // internal panel lines
    this._gHeat       = new PIXI.Graphics(); // heat arc + flow timer ring
    this._gTip        = new PIXI.Graphics(); // tip glow dots
    this._gNearDeath  = new PIXI.Graphics(); // near-death dashed scars

    [this._gGlow, this._gEngines, this._gHull, this._gFlow,
     this._gPanel, this._gHeat, this._gTip, this._gNearDeath
    ].forEach(g => this._gfxRoot.addChild(g));

    // Dash afterimages + wake — separate from root (no rotation)
    this._gDashDecals = new PIXI.Graphics();

    layer.addChild(this._gfxRoot);
    layer.addChild(this._gDashDecals);
  },

  syncGfx() {
    const layer = _pixi_playerLayer();
    if (!layer || !this._gfxRoot || typeof PIXI === 'undefined') return;

    const visualPose = this._syncVisualPose();
    const now      = getNow();
    const nearDeath = player.lives === 1 && !player.dead;
    const dashActive = dash.duration > 0;
    const dashPhase  = dashActive ? 1 - dash.duration / dash.DURATION_MS : 0;
    const hullFlicker = nearDeath
      ? (Math.sin(now * 0.018) > 0.3 ? 1 : 0.65)
      : 1;
    const motionFrac = Math.max(0, Math.min(1, visualPose.drawMotion / 10));
    const engineDrive = Math.min(1,
      motionFrac * 1.25 +
      (dashActive ? 0.28 : 0) +
      (player.flowStateActive ? 0.32 : 0)
    );
    const panelColor = player.overheated ? '#ff6633'
      : nearDeath ? '#ff3300'
      : player.flowStateActive ? '#d94cff'
      : COLOR_CYAN;
    const panelCI = _hexIntP(panelColor);

    // Position + rotation of root container
    this._gfxRoot.x = visualPose.drawX;
    this._gfxRoot.y = visualPose.drawY;
    this._gfxRoot.rotation = -Math.PI / 2 + visualPose.drawTilt;

    // ── Glow ellipse ─────────────────────────────────────────────────────────
    {
      const g = this._gGlow; g.clear();
      const shipGlow = player.overheated ? '#ff3300'
        : nearDeath ? '#ff3300'
        : player.flowStateActive ? '#cc44ff'
        : (dashActive ? '#ffffff' : COLOR_CYAN);
      const shipGlowAlpha = player.overheated ? 0.28 : nearDeath ? 0.24
        : player.flowStateActive ? 0.26 : (dashActive ? 0.22 : 0.14);
      const shipGlowR = player.overheated ? 30
        : nearDeath ? 18 + 6 * Math.abs(Math.sin(now * 0.012))
        : player.flowStateActive ? 30
        : (dashActive ? 24 : 18);
      const ci = _hexIntP(shipGlow);
      g.beginFill(ci, shipGlowAlpha * hullFlicker);
      g.drawEllipse(0, 0, 20, 14);
      g.endFill();
    }

    // ── Engine exhausts (2 nozzles) ──────────────────────────────────────────
    {
      const g = this._gEngines; g.clear();
      const ePulse = (0.55 + 0.45 * Math.sin(now * 0.008 + this.rotorAngle * 0.5)) * (0.7 + engineDrive * 0.7);
      const exhaustColor = player.flowStateActive ? '#e040fb' : COLOR_CYAN;
      const exhaustCI = _hexIntP(exhaustColor);
      const exhaustLen = 10 + engineDrive * 18;

      [{ x: -13, y: -5 }, { x: -13, y: 5 }].forEach(ep => {
        // Exhaust trail
        g.lineStyle(1 + engineDrive * 0.7, panelCI, (0.14 + engineDrive * 0.16));
        g.moveTo(ep.x - 2, ep.y);
        g.lineTo(ep.x - exhaustLen, ep.y);

        // Glow ellipse
        g.beginFill(exhaustCI, (player.flowStateActive ? 0.28 : 0.18) * ePulse);
        g.drawEllipse(ep.x - engineDrive * 3, ep.y, 8 + engineDrive * 3, 5 + engineDrive * 2);
        g.endFill();

        // Inner bright ellipse
        g.beginFill(exhaustCI, (player.flowStateActive ? 0.58 : 0.42) * ePulse);
        g.drawEllipse(ep.x - engineDrive * 2, ep.y, 4.5 + engineDrive * 1.5, 3.5 + engineDrive);
        g.endFill();

        // White core dot
        g.beginFill(0xffffff, 0.8 * ePulse);
        g.drawCircle(ep.x - engineDrive, ep.y, 1.8 + engineDrive * 0.6);
        g.endFill();

        // Overheat flame shapes
        if (player.overheated) {
          const fp = 0.55 + 0.45 * (Math.sin(now * 0.024 + ep.y * 0.4) * 0.5 + 0.5);
          g.beginFill(0xff3300, 0.28 + fp * 0.22);
          g.moveTo(ep.x - 10, ep.y);
          g.quadraticCurveTo(ep.x - 22 - fp * 12, ep.y - 4.5, ep.x - 30 - fp * 12, ep.y);
          g.quadraticCurveTo(ep.x - 22 - fp * 10, ep.y + 4.5, ep.x - 10, ep.y);
          g.closePath();
          g.endFill();
          g.beginFill(0xff8800, 0.5 + fp * 0.18);
          g.moveTo(ep.x - 9, ep.y);
          g.quadraticCurveTo(ep.x - 18 - fp * 8, ep.y - 2.8, ep.x - 24 - fp * 8, ep.y);
          g.quadraticCurveTo(ep.x - 18 - fp * 7, ep.y + 2.8, ep.x - 9, ep.y);
          g.closePath();
          g.endFill();
        }
      });
    }

    // ── Hull (4-pass polygon) ─────────────────────────────────────────────────
    {
      const g = this._gHull; g.clear();
      const hull = [
        { x: 26, y: 0 }, { x: -4, y: -15 }, { x: -14, y: -6 },
        { x: -12, y: 0 }, { x: -14, y: 6 },  { x: -4, y: 15 },
      ];
      const hullFlat = hull.flatMap(p => [p.x, p.y]);
      const cyanCI = _hexIntP(COLOR_CYAN);

      // Pass 1: dim fill (no stroke)
      g.lineStyle(0);
      g.beginFill(cyanCI, 0.06 * hullFlicker);
      g.drawPolygon(hullFlat);
      g.endFill();

      // Pass 2: wide corona stroke (no fill)
      g.lineStyle(3, cyanCI, 0.28 * hullFlicker);
      g.drawPolygon(hullFlat);

      // Pass 3: mid stroke
      g.lineStyle(1.2, cyanCI, 0.65 * hullFlicker);
      g.drawPolygon(hullFlat);

      // Pass 4: white cap
      g.lineStyle(0.6, 0xffffff, hullFlicker);
      g.drawPolygon(hullFlat);
    }

    // ── Flow state outer bloom stroke ─────────────────────────────────────────
    {
      const g = this._gFlow; g.clear();
      if (player.flowStateActive) {
        const hullF = [26,0, -4,-15, -14,-6, -12,0, -14,6, -4,15];
        const odPulse = 0.6 + 0.4 * (Math.sin(now * 0.018) * 0.5 + 0.5);
        g.lineStyle(5, 0xcc44ff, 0.35 * odPulse * hullFlicker);
        g.drawPolygon(hullF);
      }
    }

    // ── Panel lines + near-death scars ────────────────────────────────────────
    {
      const g = this._gPanel; g.clear();
      const pinkCI = _hexIntP(COLOR_PINK);
      g.lineStyle(0.75, pinkCI, 0.38);
      g.moveTo(20, 0); g.lineTo(-3, -8);
      g.moveTo(20, 0); g.lineTo(-3, 8);
      g.moveTo(-3, -8); g.lineTo(-3, 8);

      g.lineStyle(0.85, panelCI, (0.14 + engineDrive * 0.12) * hullFlicker);
      g.moveTo(12, 0); g.lineTo(-9, 0);
      g.moveTo(5, -8); g.lineTo(-10, -4);
      g.moveTo(5, 8); g.lineTo(-10, 4);
    }

    {
      const g = this._gNearDeath; g.clear();
      if (nearDeath) {
        g.lineStyle(0.8, 0xff2200, 0.4 * hullFlicker);
        // Dashed scarring — approximate with short line segments
        g.moveTo(8, -3); g.lineTo(11, -1); // gap
        g.moveTo(12, 0); g.lineTo(14, 2);
        g.moveTo(6, 3); g.lineTo(9, 1);
        g.moveTo(10, -1.5); g.lineTo(11, -1);
        g.moveTo(-2, -1); g.lineTo(1, 1);
        g.moveTo(2, 2); g.lineTo(4, 4);
      }
    }

    // ── Heat arc + flow timer ring ────────────────────────────────────────────
    {
      const g = this._gHeat; g.clear();
      const heatFrac = player.heat / 100;
      const heatColor = player.overheated ? '#ff0000'
        : heatFrac > 0.8 ? '#ff3300'
        : heatFrac > 0.5 ? '#ff8800'
        : COLOR_CYAN;
      const arcR = 26;
      const arcStart = Math.PI;
      const arcSpan  = Math.PI * 2;

      // Background track
      g.lineStyle(2.5, 0x333333, 0.12);
      g.arc(0, 0, arcR, arcStart, arcStart + arcSpan);

      // Dash heat flash ring
      if (player.dashHeatFlashTimer > 0) {
        const ff = player.dashHeatFlashTimer / player.DASH_HEAT_FLASH_MS;
        g.lineStyle(4.5, 0x9be7ff, 0.18 + ff * 0.55);
        g.arc(0, 0, arcR + 1.5, arcStart, arcStart + arcSpan);
      }

      // Heat fill arc
      if (heatFrac > 0) {
        const heatAlpha = player.overheated
          ? 0.35 + 0.65 * (Math.sin(now * 0.015) * 0.5 + 0.5)
          : 0.9;
        g.lineStyle(2.5, _hexIntP(heatColor), heatAlpha);
        g.arc(0, 0, arcR, arcStart, arcStart + arcSpan * heatFrac);
      }

      // Flow state timer ring (outer, separate)
      if (player.flowStateActive) {
        const flowFrac = Math.max(0, player.flowStateTimer / player.FLOW_STATE_DURATION);
        const flowPulse = 0.55 + 0.35 * (Math.sin(now * 0.02) * 0.5 + 0.5);
        g.lineStyle(2, 0xcc44ff, flowPulse);
        g.arc(0, 0, arcR + 6, arcStart, arcStart + arcSpan * flowFrac);
      }
    }

    // ── Tip glow (weapon mount) ────────────────────────────────────────────────
    {
      const g = this._gTip; g.clear();
      let tipColor = COLOR_PINK;
      let tipBase = 18;
      if (player.flowStateActive || player.altFireType) {
        const p = Math.sin(now * 0.025) * 0.5 + 0.5;
        tipColor = player.flowStateActive
          ? (p > 0.5 ? '#cc44ff' : '#9be7ff')
          : player.altFireType === 'laser' ? '#39ff14'
          : (p > 0.5 ? '#ff44cc' : '#ffffff');
        tipBase = player.flowStateActive ? 34 + p * 24 : 26 + p * 20;
      }
      const tipCI = _hexIntP(tipColor);
      // Outer glow
      g.beginFill(tipCI, 0.18); g.drawCircle(26, 0, 6); g.endFill();
      // Bright core
      g.beginFill(tipCI, 0.5); g.drawCircle(26, 0, 3.5); g.endFill();
      // White hot
      g.beginFill(0xffffff, 1); g.drawCircle(26, 0, 1.6); g.endFill();

      // Flow state wing gun glow points
      if (player.flowStateActive) {
        const wPulse = 0.5 + 0.5 * (Math.sin(now * 0.022) * 0.5 + 0.5);
        [-14, 14].forEach(wy => {
          g.beginFill(tipCI, 0.18 * wPulse); g.drawCircle(14, wy, 5); g.endFill();
          g.beginFill(tipCI, 0.55 * wPulse); g.drawCircle(14, wy, 2.8); g.endFill();
          g.beginFill(0xffffff, 1); g.drawCircle(14, wy, 1.2); g.endFill();
        });
      }
    }

    // ── Dash afterimages + wake (world-space, no hull rotation) ───────────────
    {
      const g = this._gDashDecals; g.clear();
      if (dashActive) {
        const ghostIntensity = Math.pow(Math.max(0, 1 - dashPhase * 1.4), 1.2);
        const ghostHull = [
          { x: 22, y: 0 }, { x: -5, y: -14 }, { x: -14, y: -7 },
          { x: -10, y: 0 }, { x: -14, y: 7 },  { x: -5, y: 14 },
        ];
        const cosR  = Math.cos(-Math.PI / 2 + this.tilt);
        const sinR  = Math.sin(-Math.PI / 2 + this.tilt);
        const xform = (p) => ({
          x: p.x * cosR - p.y * sinR,
          y: p.x * sinR + p.y * cosR
        });

        for (let gi = 1; gi <= 4; gi++) {
          const trailOffset = gi * 18;
          const gx = visualPose.drawX - dash.surgeDir * trailOffset;
          const scale = 1 - gi * 0.05;
          const ga = (0.24 / gi) * ghostIntensity;
          g.beginFill(gi === 1 ? 0xb4f5ff : 0x41d9ff, ga * 0.30);
          ghostHull.forEach((p, idx) => {
            const tp = xform({ x: p.x * scale, y: p.y * scale });
            idx === 0 ? g.moveTo(gx + tp.x, visualPose.drawY + tp.y) : g.lineTo(gx + tp.x, visualPose.drawY + tp.y);
          });
          g.closePath(); g.endFill();

          const strokeA = (0.34 / gi) * ghostIntensity;
          g.lineStyle(gi === 1 ? 1.4 : 1, gi === 1 ? 0xd5f6ff : 0x7ae7ff, strokeA);
          ghostHull.forEach((p, idx) => {
            const tp = xform({ x: p.x * scale, y: p.y * scale });
            idx === 0 ? g.moveTo(gx + tp.x, visualPose.drawY + tp.y) : g.lineTo(gx + tp.x, visualPose.drawY + tp.y);
          });
          g.closePath();
        }

        // Wake ellipse
        const wakeIntensity = Math.max(0, 1 - dashPhase * 1.15);
        const wakeLen = 44 + wakeIntensity * 20;
        const wakeH   = 14 + wakeIntensity * 4;
        const wakeX   = visualPose.drawX - dash.surgeDir * (26 + wakeLen * 0.5);
        g.beginFill(dash.surgeDir > 0 ? 0xb4f5ff : 0x41d9ff, 0.55 * wakeIntensity * 0.18);
        g.drawEllipse(wakeX, visualPose.drawY, wakeLen / 2, wakeH);
        g.endFill();
      }
    }
  },

  draw() {
    const layer = _pixi_playerLayer();
    if (layer) {
      if (!this._gfxRoot) this.initGfx();
      if (this._gfxRoot) { this.syncGfx(); return; }
    }
    // ── Canvas2D fallback — active until scene manager provides getPlayerLayer() ──
    const visualPose = this._syncVisualPose();
    const now = getNow();
    const nearDeath = player.lives === 1 && !player.dead;
    const dashActive = dash.duration > 0;
    const dashPhase  = dashActive ? 1 - dash.duration / dash.DURATION_MS : 0;
    const hullFlicker  = nearDeath
      ? (Math.sin(now * 0.018) > 0.3 ? 1 : 0.65)
      : 1;
    const motionFrac   = Math.max(0, Math.min(1, visualPose.drawMotion / 10));
    const engineDrive  = Math.min(1,
      motionFrac * 1.25 +
      (dashActive ? 0.28 : 0) +
      (player.flowStateActive ? 0.32 : 0)
    );
    const panelColor   = player.overheated ? '#ff6633'
      : nearDeath ? '#ff3300'
      : player.flowStateActive ? '#d94cff'
      : COLOR_CYAN;

    ctx.save();
    ctx.translate(visualPose.drawX, visualPose.drawY);
    ctx.rotate(-Math.PI / 2); // point upward (top-down orientation)
    ctx.rotate(visualPose.drawTilt);
    {
      const shipGlow = player.overheated ? '#ff3300'
        : nearDeath ? '#ff3300'
        : player.flowStateActive ? '#cc44ff'
        : (dash.duration > 0 ? '#ffffff' : COLOR_CYAN);
      const shipGlowAlpha = player.overheated ? 0.28
        : nearDeath ? 0.24
        : player.flowStateActive ? 0.26
        : (dash.duration > 0 ? 0.22 : 0.14);
      const shipGlowRadius = player.overheated ? 30
        : nearDeath ? 18 + 6 * Math.abs(Math.sin(now * 0.012))
        : player.flowStateActive ? 30
        : (dash.duration > 0 ? 24 : 18);
      ctx.save();
      ctx.globalAlpha = shipGlowAlpha * hullFlicker;
      ctx.shadowColor = shipGlow;
      ctx.shadowBlur = shipGlowRadius;
      ctx.fillStyle = shipGlow;
      ctx.beginPath();
      ctx.ellipse(0, 0, 20, 14, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    const ePulse = (0.55 + 0.45 * Math.sin(now * 0.008 + this.rotorAngle * 0.5)) * (0.7 + engineDrive * 0.7);
    [{ x: -13, y: -5 }, { x: -13, y: 5 }].forEach(ep => {
      ctx.save();
      const exhaustLen = 10 + engineDrive * 18;
      ctx.globalAlpha = 0.14 + engineDrive * 0.16;
      ctx.shadowColor = panelColor;
      ctx.shadowBlur = 22 + engineDrive * 14;
      ctx.strokeStyle = panelColor;
      ctx.lineWidth = 1 + engineDrive * 0.7;
      ctx.beginPath();
      ctx.moveTo(ep.x - 2, ep.y);
      ctx.lineTo(ep.x - exhaustLen, ep.y);
      ctx.stroke();

      const exhaustColor = player.flowStateActive ? '#e040fb' : COLOR_CYAN;
      ctx.globalAlpha = (player.flowStateActive ? 0.28 : 0.18) * ePulse;
      ctx.shadowColor = exhaustColor;
      ctx.shadowBlur = (player.flowStateActive ? 48 : 32) + engineDrive * 10;
      ctx.fillStyle = exhaustColor;
      ctx.beginPath();
      ctx.ellipse(ep.x - engineDrive * 3, ep.y, 8 + engineDrive * 3, 5 + engineDrive * 2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.globalAlpha = (player.flowStateActive ? 0.58 : 0.42) * ePulse;
      ctx.shadowColor = exhaustColor;
      ctx.shadowBlur = (player.flowStateActive ? 22 : 14) + engineDrive * 8;
      ctx.fillStyle = exhaustColor;
      ctx.beginPath();
      ctx.ellipse(ep.x - engineDrive * 2, ep.y, 4.5 + engineDrive * 1.5, 3.5 + engineDrive, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.globalAlpha = 0.8 * ePulse;
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 6;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(ep.x - engineDrive, ep.y, 1.8 + engineDrive * 0.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      if (player.overheated) {
        const flamePulse = 0.55 + 0.45 * (Math.sin(now * 0.024 + ep.y * 0.4) * 0.5 + 0.5);
        ctx.save();
        ctx.globalAlpha = 0.28 + flamePulse * 0.22;
        ctx.shadowColor = '#ff3300';
        ctx.shadowBlur = 26;
        ctx.fillStyle = '#ff3300';
        ctx.beginPath();
        ctx.moveTo(ep.x - 10, ep.y);
        ctx.quadraticCurveTo(ep.x - 22 - flamePulse * 12, ep.y - 4.5, ep.x - 30 - flamePulse * 12, ep.y);
        ctx.quadraticCurveTo(ep.x - 22 - flamePulse * 10, ep.y + 4.5, ep.x - 10, ep.y);
        ctx.fill();
        ctx.restore();

        ctx.save();
        ctx.globalAlpha = 0.5 + flamePulse * 0.18;
        ctx.shadowColor = '#ff8800';
        ctx.shadowBlur = 14;
        ctx.fillStyle = '#ff8800';
        ctx.beginPath();
        ctx.moveTo(ep.x - 9, ep.y);
        ctx.quadraticCurveTo(ep.x - 18 - flamePulse * 8, ep.y - 2.8, ep.x - 24 - flamePulse * 8, ep.y);
        ctx.quadraticCurveTo(ep.x - 18 - flamePulse * 7, ep.y + 2.8, ep.x - 9, ep.y);
        ctx.fill();
        ctx.restore();
      }
    });

    const hull = [
      { x: 26, y: 0 },
      { x: -4, y: -15 },
      { x: -14, y: -6 },
      { x: -12, y: 0 },
      { x: -14, y: 6 },
      { x: -4, y: 15 },
    ];
    const tracePath = () => {
      ctx.beginPath();
      hull.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
      ctx.closePath();
    };

    tracePath();
    ctx.globalAlpha = 0.06 * hullFlicker;
    ctx.fillStyle = COLOR_CYAN;
    ctx.fill();

    tracePath();
    ctx.globalAlpha = 0.28 * hullFlicker;
    ctx.shadowColor = COLOR_CYAN;
    ctx.shadowBlur = 32;
    ctx.strokeStyle = COLOR_CYAN;
    ctx.lineWidth = 3;
    ctx.lineJoin = 'round';
    ctx.stroke();

    tracePath();
    ctx.globalAlpha = 0.65 * hullFlicker;
    ctx.shadowColor = COLOR_CYAN;
    ctx.shadowBlur = 12;
    ctx.strokeStyle = COLOR_CYAN;
    ctx.lineWidth = 1.2;
    ctx.stroke();

    tracePath();
    ctx.globalAlpha = hullFlicker;
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 5;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 0.6;
    ctx.stroke();

    // Flow State ship ascension — outer magenta bloom layered on hull
    if (player.flowStateActive) {
      const odPulse = 0.6 + 0.4 * (Math.sin(getNow() * 0.018) * 0.5 + 0.5);
      tracePath();
      ctx.globalAlpha = 0.35 * odPulse * hullFlicker;
      ctx.shadowColor = '#cc44ff';
      ctx.shadowBlur = 18;
      ctx.strokeStyle = '#cc44ff';
      ctx.lineWidth = 5;
      ctx.stroke();
    }

    ctx.globalAlpha = 0.38;
    ctx.shadowColor = COLOR_PINK;
    ctx.shadowBlur = 8;
    ctx.strokeStyle = COLOR_PINK;
    ctx.lineWidth = 0.75;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(20, 0); ctx.lineTo(-3, -8);
    ctx.moveTo(20, 0); ctx.lineTo(-3, 8);
    ctx.moveTo(-3, -8); ctx.lineTo(-3, 8);
    ctx.stroke();

    if (nearDeath) {
      ctx.save();
      ctx.globalAlpha = 0.4 * hullFlicker;
      ctx.strokeStyle = '#ff2200';
      ctx.lineWidth = 0.8;
      ctx.setLineDash([2, 3]);
      ctx.beginPath(); ctx.moveTo(8, -3); ctx.lineTo(14, 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(6, 3); ctx.lineTo(11, -1); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-2, -1); ctx.lineTo(4, 4); ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }

    ctx.save();
    ctx.globalAlpha = (0.14 + engineDrive * 0.12) * hullFlicker;
    ctx.shadowColor = panelColor;
    ctx.shadowBlur = 10 + engineDrive * 10;
    ctx.strokeStyle = panelColor;
    ctx.lineWidth = 0.85;
    ctx.beginPath();
    ctx.moveTo(12, 0);
    ctx.lineTo(-9, 0);
    ctx.moveTo(5, -8);
    ctx.lineTo(-10, -4);
    ctx.moveTo(5, 8);
    ctx.lineTo(-10, 4);
    ctx.stroke();
    ctx.restore();

    // Heat arc around ship
    {
      const heatFrac = player.heat / 100;
      const heatColor = player.overheated ? '#ff0000'
        : heatFrac > 0.8 ? '#ff3300'
        : heatFrac > 0.5 ? '#ff8800'
        : COLOR_CYAN;
      const arcRadius = 26;
      const arcStart = Math.PI;
      const arcSpan = Math.PI * 2;
      const arcEnd = arcStart + arcSpan;

      ctx.save();
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';

      // Background track
      ctx.globalAlpha = 0.12;
      ctx.strokeStyle = '#333';
      ctx.beginPath();
      ctx.arc(0, 0, arcRadius, arcStart, arcEnd);
      ctx.stroke();

      if (player.dashHeatFlashTimer > 0) {
        const flashFrac = player.dashHeatFlashTimer / player.DASH_HEAT_FLASH_MS;
        ctx.globalAlpha = 0.18 + flashFrac * 0.55;
        ctx.strokeStyle = '#9be7ff';
        ctx.shadowColor = '#9be7ff';
        ctx.shadowBlur = 14;
        ctx.lineWidth = 4.5;
        ctx.beginPath();
        ctx.arc(0, 0, arcRadius + 1.5, arcStart, arcEnd);
        ctx.stroke();
        ctx.lineWidth = 2.5;
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
      }

      // Filled heat arc
      if (heatFrac > 0) {
        if (player.overheated) {
          ctx.globalAlpha = 0.35 + 0.65 * (Math.sin(getNow() * 0.015) * 0.5 + 0.5);
        } else {
          ctx.globalAlpha = 0.9;
        }
        ctx.strokeStyle = heatColor;
        ctx.shadowColor = heatColor;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(0, 0, arcRadius, arcStart, arcStart + arcSpan * heatFrac);
        ctx.stroke();
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
      }

      // Flow State timer ring — separate outer arc so heat stays readable
      if (player.flowStateActive) {
        const flowFrac = Math.max(0, player.flowStateTimer / player.FLOW_STATE_DURATION);
        const flowPulse = 0.55 + 0.35 * (Math.sin(getNow() * 0.02) * 0.5 + 0.5);
        ctx.globalAlpha = flowPulse;
        ctx.strokeStyle = '#cc44ff';
        ctx.shadowColor = '#cc44ff';
        ctx.shadowBlur = 16;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, arcRadius + 6, arcStart, arcStart + arcSpan * flowFrac);
        ctx.stroke();
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
      }

      ctx.restore();
    }

    let tipColor = COLOR_PINK;
    let tipBase = 18;
    if (player.flowStateActive || player.altFireType) {
      const p = Math.sin(now * 0.025) * 0.5 + 0.5;
      tipColor = player.flowStateActive ? (p > 0.5 ? '#cc44ff' : '#9be7ff')
        : player.altFireType === 'laser' ? '#39ff14'
        : (p > 0.5 ? '#ff44cc' : '#ffffff');
      tipBase = player.flowStateActive ? 34 + p * 24 : 26 + p * 20;
    }
    ctx.globalAlpha = 0.18;
    ctx.shadowColor = tipColor;
    ctx.shadowBlur = tipBase * 2.2;
    ctx.fillStyle = tipColor;
    ctx.beginPath();
    ctx.arc(26, 0, 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = 0.5;
    ctx.shadowColor = tipColor;
    ctx.shadowBlur = tipBase;
    ctx.fillStyle = tipColor;
    ctx.beginPath();
    ctx.arc(26, 0, 3.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = 1;
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 6;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(26, 0, 1.6, 0, Math.PI * 2);
    ctx.fill();

    // Flow state dual wing gun glow points — match bullet spawn positions
    if (player.flowStateActive) {
      const wPulse = 0.5 + 0.5 * (Math.sin(now * 0.022) * 0.5 + 0.5);
      [-14, 14].forEach(wy => {
        ctx.globalAlpha = 0.18 * wPulse;
        ctx.shadowColor = tipColor;
        ctx.shadowBlur = 18;
        ctx.fillStyle = tipColor;
        ctx.beginPath();
        ctx.arc(14, wy, 5, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = 0.55 * wPulse;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(14, wy, 2.8, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = 1;
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = 5;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(14, wy, 1.2, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.restore();

    // Dash afterimage — layered ghost copies instead of speed lines
    if (dashActive) {
      const ghostIntensity = Math.pow(Math.max(0, 1 - dashPhase * 1.4), 1.2);
      const ghostHull = [
        { x: 22, y: 0 }, { x: -5, y: -14 }, { x: -14, y: -7 },
        { x: -10, y: 0 }, { x: -14, y: 7 },  { x: -5, y: 14 },
      ];
      for (let g = 1; g <= 4; g++) {
        const trailOffset = g * 18;
        const gx = visualPose.drawX - dash.surgeDir * trailOffset;
        const scale = 1 - g * 0.05;
        ctx.save();
        ctx.translate(gx, visualPose.drawY);
        ctx.rotate(-Math.PI / 2);
        ctx.rotate(visualPose.drawTilt);
        ctx.scale(scale, scale);
        ctx.globalAlpha = (0.24 / g) * ghostIntensity;
        ctx.fillStyle = g === 1 ? 'rgba(180, 245, 255, 0.30)' : 'rgba(65, 217, 255, 0.18)';
        ctx.shadowColor = '#41d9ff';
        ctx.shadowBlur = 14;
        ctx.beginPath();
        ghostHull.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
        ctx.closePath();
        ctx.fill();

        ctx.globalAlpha = (0.34 / g) * ghostIntensity;
        ctx.strokeStyle = g === 1 ? '#d5f6ff' : '#7ae7ff';
        ctx.lineWidth = g === 1 ? 1.4 : 1;
        ctx.beginPath();
        ghostHull.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
        ctx.closePath();
        ctx.stroke();

        ctx.globalAlpha = (0.18 / g) * ghostIntensity;
        ctx.fillStyle = '#9be7ff';
        ctx.beginPath();
        ctx.arc(12, 0, 4.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.shadowBlur = 0;
        ctx.shadowColor = 'transparent';
        ctx.globalAlpha = 1;
        ctx.restore();
      }
    }

    if (dashActive) {
      const wakeIntensity = Math.max(0, 1 - dashPhase * 1.15);
      const wakeLen = 44 + wakeIntensity * 20;
      const wakeH = 14 + wakeIntensity * 4;
      const wakeX = visualPose.drawX - dash.surgeDir * (26 + wakeLen * 0.5);
      ctx.save();
      ctx.translate(wakeX, visualPose.drawY);
      const wake = ctx.createLinearGradient(-wakeLen / 2, 0, wakeLen / 2, 0);
      if (dash.surgeDir > 0) {
        wake.addColorStop(0, 'rgba(65,217,255,0.00)');
        wake.addColorStop(0.55, 'rgba(65,217,255,0.10)');
        wake.addColorStop(1, 'rgba(180,245,255,0.24)');
      } else {
        wake.addColorStop(0, 'rgba(180,245,255,0.24)');
        wake.addColorStop(0.45, 'rgba(65,217,255,0.10)');
        wake.addColorStop(1, 'rgba(65,217,255,0.00)');
      }
      ctx.globalAlpha = 0.55 * wakeIntensity;
      ctx.fillStyle = wake;
      ctx.beginPath();
      ctx.ellipse(0, 0, wakeLen / 2, wakeH, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
};

drone.init();

const player = {
  score: 0,
  dead: false,
  deathPresentationPending: false,
  lives: 3,
  deathMessage: '',
  invincibleTimer: 0,
  INVINCIBLE_DURATION: 300,
  altFireType: null,
  laserFuel: 0,
  LASER_MAX_FUEL: 100,

  altFireCooldown: 0,
  ALT_FIRE_COOLDOWN: 5000,
  hitFlashTimer: 0,
  HIT_FLASH_MS: 600,
  dashHeatFlashTimer: 0,
  DASH_HEAT_FLASH_MS: 160,

  heat: 0,
  overheated: false,
  overheatTimer: 0,
  HEAT_PER_SHOT: 4,
  HEAT_DECAY: 30,
  OVERHEAT_LOCKOUT: 1500,

  flowStateCharge: 0,
  FLOW_STATE_MAX: 100,
  flowStateActive: false,
  flowStateTimer: 0,
  FLOW_STATE_DURATION: 7500,
  flowStateActivationFlash: 0,

  ultCharge: 0,
  ULT_MAX: 45,
  ultReady: true,
  ultUses: 3,

  get effectiveDamage() {
    let dmg = 1.2 + (stage.current - 1) * 0.45;
    if (this.flowStateActive) dmg *= 1.2;
    return Math.ceil(dmg);
  },

  get fireRateCooldown() {
    let cd = 200;
    if (!isPlayerMoving()) cd *= 0.75;
    if (this.flowStateActive) cd *= 0.85;
    return Math.max(70, cd);
  },

  activateAltFire(type) {
    this.altFireType = type;
    this.altFireCooldown = this.ALT_FIRE_COOLDOWN;
    if (type === 'laser') {
      this.laserFuel = this.LASER_MAX_FUEL;
    }
  },

  hit() {
    if (this.dead || this.invincibleTimer > 0) return;

    if (this.flowStateActive) {
      // Deactivate flow state — losing it mid-state is the dramatic penalty
      this.flowStateActive = false;
      this.flowStateTimer = 0;
      pixiPost.setFlowState(false);
    }
    this.lives--;
    this.invincibleTimer = this.INVINCIBLE_DURATION;
    this.hitFlashTimer = this.HIT_FLASH_MS;
    pixiPost.triggerHit();

    if (this.lives <= 0) {
      this.dead = true;
      this.deathPresentationPending = true;
      audio.play('playerDeath');
      audio.playMusic('death');
      const isHighScore = this.score > save.highScore;
      if (isHighScore) save.highScore = this.score;
      this.deathMessage = isHighScore
        ? 'LETS GOOOOOO'
        : DEATH_TAUNTS[Math.floor(Math.random() * DEATH_TAUNTS.length)];
      save.runs.push({ score: this.score, kills: stage.totalKills });
      if (save.runs.length > 10) save.runs.shift();
      writeSave();
      if (typeof pixiPost !== 'undefined' && typeof pixiPost.triggerDeath === 'function') {
        pixiPost.triggerDeath();
      }

      const savedName = this.score > 0 ? loadPlayerName() : '';
      const revealDeathState = () => {
        this.deathPresentationPending = false;
        if (this.score > 0 && !savedName) {
          gameState = 'nameEntry';
        }
      };
      startScreenTransition('glitch', revealDeathState);

      if (this.score > 0) {
        if (savedName) {
          leaderboard.submitScore(this.score, stage.totalKills);
        } else {
          nameEntry.name = '';
        }
      }
    } else {
      audio.play('playerHit');
      stage.shakeTimer = 900;
      stage.shakeIntensity = 14;
    }
  },

  update(delta) {
    this.ultReady = this.ultUses > 0;
    if (this.invincibleTimer > 0) this.invincibleTimer = Math.max(0, this.invincibleTimer - delta);
    if (this.altFireCooldown > 0) this.altFireCooldown = Math.max(0, this.altFireCooldown - delta);
    if (this.hitFlashTimer > 0) this.hitFlashTimer = Math.max(0, this.hitFlashTimer - delta);
    if (this.dashHeatFlashTimer > 0) this.dashHeatFlashTimer = Math.max(0, this.dashHeatFlashTimer - delta);
    if (this.flowStateActivationFlash > 0) this.flowStateActivationFlash = Math.max(0, this.flowStateActivationFlash - delta);
    const nearDeath = this.lives === 1 && !this.dead;

    const dt = delta / 1000;
    if (this.overheated) {
      this.overheatTimer -= delta;
      if (this.overheatTimer <= 0) {
        this.overheated = false;
        this.overheatTimer = 0;
        this.heat = 0;
      }
    } else {
      if (!isFireHeld()) {
        this.heat = Math.max(0, this.heat - this.HEAT_DECAY * (this.flowStateActive ? 3 : 1) * dt);
      }
      if (this.heat >= 100) {
        this.overheated = true;
        this.overheatTimer = this.OVERHEAT_LOCKOUT;
        audio.play('overheat');
      }
    }

    if (nearDeath && Math.random() < 0.15 && typeof smokeParticles !== 'undefined') {
      smokeParticles.spawn(drone.x - 8, drone.y, '#444444');
    }

    if (this.altFireType === 'laser' && this.laserFuel <= 0) {
      this.laserFuel = 0;
      this.altFireType = null;
    }


    if (this.flowStateActive) {
      this.flowStateTimer -= delta;
      if (this.flowStateTimer <= 0) {
        this.flowStateActive = false;
        this.flowStateTimer = 0;
        audio.play('flowStateEnd');
        pixiPost.setFlowState(false);
      }
    } else if (this.flowStateCharge >= this.FLOW_STATE_MAX) {
      this.flowStateActive = true;
      this.flowStateTimer = this.FLOW_STATE_DURATION;
      this.flowStateCharge = 0;
      this.flowStateActivationFlash = 420;
      audio.play('flowStateActivate');
      streakCallout.showFlowState();
      pixiPost.setFlowState(true);
    }
  },

  onKill(isElite = false, fromNuke = false) {
    if (!this.flowStateActive) {
      const s = stage.current;
      const stageScale = s <= 2 ? 0.5 : s <= 4 ? 0.75 : 1.0;
      const gain = Math.round((isElite ? 18 : 4) * stageScale);
      this.flowStateCharge = Math.min(this.FLOW_STATE_MAX, this.flowStateCharge + gain);
    }

  }
};
