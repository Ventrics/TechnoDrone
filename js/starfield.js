function getStarStageMultipliers() {
  const s = (typeof stage !== 'undefined' && stage.current) ? stage.current : 1;
  const t = (s - 1) / 9;
  return {
    speedMult: 1 + t * 4.5,
    brightMult: 1 + t * 1.2,
    countFrac: 0.38 + t * 0.62,
  };
}

function _starHasPixiLayer() {
  return typeof PIXI !== 'undefined' &&
    typeof pixiPost !== 'undefined' &&
    typeof pixiPost.getBgLayer === 'function' &&
    !!pixiPost.getBgLayer();
}

function _starDestroyDisplayObject(displayObject) {
  if (!displayObject) return;
  if (displayObject.parent) displayObject.parent.removeChild(displayObject);
  if (typeof displayObject.destroy === 'function') displayObject.destroy({ children: true });
}

function _starHex(color) {
  return typeof pixiPost !== 'undefined' && typeof pixiPost.hexToInt === 'function'
    ? pixiPost.hexToInt(color)
    : parseInt(String(color || '#000000').replace('#', ''), 16);
}

const starField = {
  layers: [],
  streaks: [],
  _pixiRoot: null,
  _pixiNebula: null,
  _pixiLayerContainers: [],
  _pixiBoundsKey: '',

  _shouldDrawAurora() {
    const inActivePlayState = typeof gameState !== 'undefined' &&
      (gameState === 'playing' || gameState === 'tutorial');
    const playerAlive = typeof player === 'undefined' || !player.dead;
    return inActivePlayState && playerAlive;
  },

  init() {
    this.layers = [
      { count: 60, speed: 18, minR: 0.3, maxR: 0.6, alpha: 0.22, twinkle: false },
      { count: 50, speed: 40, minR: 0.4, maxR: 0.8, alpha: 0.32, twinkle: false },
      { count: 35, speed: 72, minR: 0.5, maxR: 1.0, alpha: 0.46, twinkle: true },
      { count: 20, speed: 126, minR: 0.7, maxR: 1.4, alpha: 0.66, twinkle: true },
      { count: 8, speed: 204, minR: 1.0, maxR: 2.0, alpha: 0.88, twinkle: true },
    ];

    this.layers.forEach(layer => {
      layer.stars = [];
      for (let i = 0; i < layer.count; i++) {
        layer.stars.push({
          x: PLAY_X + Math.random() * PLAY_W,
          y: PLAY_Y + Math.random() * PLAY_H,
          r: layer.minR + Math.random() * (layer.maxR - layer.minR),
          twinkleOffset: Math.random() * Math.PI * 2,
          color: Math.random() < 0.1 ? COLOR_CYAN : '#ffffff',
          _pixi: null,
        });
      }
    });

    // Aurora atmosphere - two slow drifting curtains of color.
    // cx / width / amp are fractions of PLAY_W for resolution-independence.
    // Dual-frequency wave motion keeps the shape organic and non-repeating.
    this.aurora = [
      {
        cx: 0.26, width: 0.30, amp: 0.10,
        freq: 3.2, freq2: 1.7,
        phase: 0.0, phase2: 0.0,
        phaseSpeed: 0.00025, phase2Speed: 0.00014,
        rgb: [55, 18, 110],
        alpha: 0.12,
      },
      {
        cx: 0.48, width: 0.24, amp: 0.06,
        freq: 2.8, freq2: 1.5,
        phase: Math.PI * 0.35, phase2: Math.PI * 0.18,
        phaseSpeed: 0.00018, phase2Speed: 0.00011,
        rgb: [55, 18, 110],
        alpha: 0.055,
      },
      {
        cx: 0.74, width: 0.28, amp: 0.09,
        freq: 3.9, freq2: 2.1,
        phase: Math.PI, phase2: Math.PI * 0.6,
        phaseSpeed: 0.00022, phase2Speed: 0.00013,
        rgb: [0, 80, 90],
        alpha: 0.10,
      },
      {
        cx: 0.62, width: 0.22, amp: 0.05,
        freq: 2.5, freq2: 1.3,
        phase: Math.PI * 1.2, phase2: Math.PI * 0.9,
        phaseSpeed: 0.00016, phase2Speed: 0.00009,
        rgb: [0, 80, 90],
        alpha: 0.045,
      },
    ];

    this._ensurePixiScene(true);
    this._syncPixiScene();
  },

  _currentBoundsKey() {
    return [PLAY_X, PLAY_Y, PLAY_W, PLAY_H].join(':');
  },

  _clearPixiScene() {
    this.layers.forEach(layer => {
      (layer.stars || []).forEach(star => {
        if (star._pixi) _starDestroyDisplayObject(star._pixi);
        star._pixi = null;
      });
    });
    this.streaks.forEach(streak => {
      if (streak._pixi) _starDestroyDisplayObject(streak._pixi);
      streak._pixi = null;
    });
    if (this._pixiRoot) _starDestroyDisplayObject(this._pixiRoot);
    this._pixiRoot = null;
    this._pixiNebula = null;
    this._pixiLayerContainers = [];
    this._pixiBoundsKey = '';
  },

  _drawNebulaToGraphics(graphics) {
    graphics.clear();
    const centerX = PLAY_X + PLAY_W * 0.5;
    const centerY = PLAY_Y + PLAY_H * 0.2;
    graphics.beginFill(0x00283c, 0.1);
    graphics.drawCircle(centerX, centerY, PLAY_W * 0.18);
    graphics.endFill();
    graphics.beginFill(0x001423, 0.05);
    graphics.drawCircle(centerX, centerY, PLAY_W * 0.34);
    graphics.endFill();
    graphics.beginFill(0x000814, 0.03);
    graphics.drawCircle(centerX, centerY, PLAY_W * 0.5);
    graphics.endFill();
  },

  _ensurePixiScene(forceRebuild = false) {
    if (!_starHasPixiLayer()) return;

    const nextBoundsKey = this._currentBoundsKey();
    if (!forceRebuild && this._pixiRoot && this._pixiBoundsKey === nextBoundsKey) return;

    this._clearPixiScene();

    this._pixiRoot = new PIXI.Container();
    this._pixiNebula = new PIXI.Graphics();
    this._drawNebulaToGraphics(this._pixiNebula);
    this._pixiRoot.addChild(this._pixiNebula);

    this.layers.forEach(layer => {
      const container = new PIXI.Container();
      this._pixiLayerContainers.push(container);
      this._pixiRoot.addChild(container);
      layer.stars.forEach(star => {
        const sprite = new PIXI.Sprite(PIXI.Texture.WHITE);
        sprite.tint = _starHex(star.color);
        sprite.width = Math.max(1, star.r);
        sprite.height = Math.max(1, star.r);
        container.addChild(sprite);
        star._pixi = sprite;
      });
    });

    this.streaks.forEach(streak => {
      streak._pixi = new PIXI.Graphics();
      this._pixiRoot.addChild(streak._pixi);
    });

    pixiPost.getBgLayer().addChild(this._pixiRoot);
    this._pixiBoundsKey = nextBoundsKey;
  },

  _syncPixiScene() {
    if (!this._pixiRoot) return;

    // Pixi starfield content is intentionally suppressed; the Canvas aurora
    // provides the playfield atmosphere for the current visual baseline.
    this._pixiRoot.visible = false;

    this._pixiLayerContainers.forEach(container => {
      container.visible = false;
      container.children.forEach(sprite => { sprite.visible = false; });
    });

    if (this._pixiNebula) this._pixiNebula.visible = false;

    this.streaks.forEach(streak => {
      if (!streak._pixi) return;
      streak._pixi.clear();
      streak._pixi.visible = false;
    });
  },

  _drawAuroraUnderlay() {
    const leftWash = ctx.createRadialGradient(
      PLAY_X + PLAY_W * 0.30,
      PLAY_Y + PLAY_H * 0.54,
      0,
      PLAY_X + PLAY_W * 0.30,
      PLAY_Y + PLAY_H * 0.54,
      PLAY_W * 0.72
    );
    leftWash.addColorStop(0, 'rgba(55,18,110,0.115)');
    leftWash.addColorStop(0.42, 'rgba(55,18,110,0.062)');
    leftWash.addColorStop(1, 'rgba(55,18,110,0)');
    ctx.fillStyle = leftWash;
    ctx.fillRect(PLAY_X, PLAY_Y, PLAY_W, PLAY_H);

    const rightWash = ctx.createRadialGradient(
      PLAY_X + PLAY_W * 0.74,
      PLAY_Y + PLAY_H * 0.50,
      0,
      PLAY_X + PLAY_W * 0.74,
      PLAY_Y + PLAY_H * 0.50,
      PLAY_W * 0.68
    );
    rightWash.addColorStop(0, 'rgba(0,80,90,0.105)');
    rightWash.addColorStop(0.45, 'rgba(0,80,90,0.055)');
    rightWash.addColorStop(1, 'rgba(0,80,90,0)');
    ctx.fillStyle = rightWash;
    ctx.fillRect(PLAY_X, PLAY_Y, PLAY_W, PLAY_H);

    const topVeil = ctx.createLinearGradient(0, PLAY_Y, 0, PLAY_Y + PLAY_H * 0.82);
    topVeil.addColorStop(0, 'rgba(28,10,58,0.055)');
    topVeil.addColorStop(0.38, 'rgba(12,26,36,0.040)');
    topVeil.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = topVeil;
    ctx.fillRect(PLAY_X, PLAY_Y, PLAY_W, PLAY_H);

    const centerBreath = ctx.createRadialGradient(
      PLAY_X + PLAY_W * 0.50,
      PLAY_Y + PLAY_H * 0.44,
      0,
      PLAY_X + PLAY_W * 0.50,
      PLAY_Y + PLAY_H * 0.44,
      PLAY_W * 0.48
    );
    centerBreath.addColorStop(0, 'rgba(20,22,36,0.045)');
    centerBreath.addColorStop(1, 'rgba(20,22,36,0)');
    ctx.fillStyle = centerBreath;
    ctx.fillRect(PLAY_X, PLAY_Y, PLAY_W, PLAY_H);
  },

  // Draw a single aurora band using horizontal-gradient slices.
  // Each slice is a trapezoid with a transparent-to-color-to-transparent
  // gradient so there are no hard edges.
  _drawAuroraBand(band) {
    const [r, g, b] = band.rgb;
    const slices = 30;
    const auroraH = PLAY_H * 0.94;
    const bandWidth = band.width * PLAY_W;

    for (let i = 0; i < slices; i++) {
      const t0 = i / slices;
      const t1 = (i + 1) / slices;
      const y0 = PLAY_Y + t0 * auroraH;
      const y1 = PLAY_Y + t1 * auroraH;

      const wave = t =>
        Math.sin(t * band.freq + band.phase) * band.amp * PLAY_W +
        Math.sin(t * band.freq2 + band.phase2) * band.amp * PLAY_W * 0.45;

      const cx0 = PLAY_X + band.cx * PLAY_W + wave(t0);
      const cx1 = PLAY_X + band.cx * PLAY_W + wave(t1);
      const cx = (cx0 + cx1) * 0.5;

      const tMid = (t0 + t1) * 0.5;
      const envelope = Math.pow(Math.sin(Math.PI * tMid), 0.48);
      const topFade = 0.65 + (1 - tMid) * 0.35;
      const alpha = band.alpha * envelope * topFade;
      if (alpha < 0.003) continue;

      const grad = ctx.createLinearGradient(cx - bandWidth, 0, cx + bandWidth, 0);
      grad.addColorStop(0, `rgba(${r},${g},${b},0)`);
      grad.addColorStop(0.22, `rgba(${r},${g},${b},${(alpha * 0.45).toFixed(3)})`);
      grad.addColorStop(0.38, `rgba(${r},${g},${b},${alpha.toFixed(3)})`);
      grad.addColorStop(0.5, `rgba(${r},${g},${b},${(alpha * 1.4).toFixed(3)})`);
      grad.addColorStop(0.62, `rgba(${r},${g},${b},${alpha.toFixed(3)})`);
      grad.addColorStop(0.78, `rgba(${r},${g},${b},${(alpha * 0.45).toFixed(3)})`);
      grad.addColorStop(1, `rgba(${r},${g},${b},0)`);

      ctx.beginPath();
      ctx.moveTo(cx0 - bandWidth, y0);
      ctx.lineTo(cx0 + bandWidth, y0);
      ctx.lineTo(cx1 + bandWidth, y1);
      ctx.lineTo(cx1 - bandWidth, y1);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();
    }
  },

  update(delta) {
    const dt = delta / 1000;
    const { speedMult } = getStarStageMultipliers();

    if (this._pixiBoundsKey !== this._currentBoundsKey()) this.init();
    else this._ensurePixiScene();

    // Preserve star data updates in case the system is re-used later, but do
    // not render the dots in the current aurora-only atmosphere pass.
    this.layers.forEach(layer => {
      for (let i = 0; i < layer.stars.length; i++) {
        const star = layer.stars[i];
        star.y += layer.speed * speedMult * dt;
        if (star.y > PLAY_Y + PLAY_H + 5) {
          star.x = PLAY_X + Math.random() * PLAY_W;
          star.y = PLAY_Y - 2;
        }
      }
    });

    if (this.streaks.length) {
      this.streaks.forEach(streak => {
        _starDestroyDisplayObject(streak._pixi);
        streak._pixi = null;
      });
      this.streaks = [];
    }

    if (this.aurora) {
      this.aurora.forEach(band => {
        band.phase += band.phaseSpeed * delta;
        band.phase2 += band.phase2Speed * delta;
      });
    }

    this._syncPixiScene();
  },

  draw() {
    const shouldDrawAurora = this._shouldDrawAurora();

    if (shouldDrawAurora && this.aurora) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(PLAY_X, PLAY_Y, PLAY_W, PLAY_H);
      ctx.clip();
      this._drawAuroraUnderlay();
      this.aurora.forEach(band => this._drawAuroraBand(band));
      ctx.restore();
    }

    ctx.globalAlpha = 1;
  },
};

starField.init();
