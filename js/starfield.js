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

    this._syncPixiScene();
  },

  draw() {
    ctx.globalAlpha = 1;
  },
};

starField.init();
