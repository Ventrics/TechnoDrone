function getStarStageMultipliers() {
  const s = (typeof stage !== 'undefined' && stage.current) ? stage.current : 1;
  const t = (s - 1) / 9;
  return {
    speedMult: 1 + t * 4.5,
    brightMult: 1 + t * 1.2,
    countFrac: 0.38 + t * 0.62,
  };
}

const starField = {
  layers: [],
  streaks: [],
  init() {
    this.layers = [
      { count: 60, speed: 18,  minR: 0.3, maxR: 0.6,  alpha: 0.22, twinkle: false },
      { count: 50, speed: 40,  minR: 0.4, maxR: 0.8,  alpha: 0.32, twinkle: false },
      { count: 35, speed: 72,  minR: 0.5, maxR: 1.0,  alpha: 0.46, twinkle: true  },
      { count: 20, speed: 126, minR: 0.7, maxR: 1.4,  alpha: 0.66, twinkle: true  },
      { count: 8,  speed: 204, minR: 1.0, maxR: 2.0,  alpha: 0.88, twinkle: true  },
    ];
    for (const layer of this.layers) {
      layer.stars = [];
      for (let i = 0; i < layer.count; i++) {
        layer.stars.push({
          x: PLAY_X + Math.random() * PLAY_W,
          y: PLAY_Y + Math.random() * PLAY_H,
          r: layer.minR + Math.random() * (layer.maxR - layer.minR),
          twinkleOffset: Math.random() * Math.PI * 2,
          color: Math.random() < 0.1 ? COLOR_CYAN : '#ffffff',
        });
      }
    }
  },

  _spawnStreak() {
    this.streaks.push({
      x: PLAY_X + Math.random() * PLAY_W,
      y: PLAY_Y - 20,
      len: 40 + Math.random() * 40,
      vy: 500 + Math.random() * 300,
      life: 1,
      decay: 1.2,
    });
  },

  update(delta) {
    const dt = delta / 1000;
    const { speedMult, countFrac } = getStarStageMultipliers();

    for (const layer of this.layers) {
      const visible = Math.max(1, Math.floor(layer.stars.length * countFrac));
      for (let i = 0; i < visible; i++) {
        const s = layer.stars[i];
        s.y += layer.speed * speedMult * dt;
        if (s.y > PLAY_Y + PLAY_H + 5) {
          s.x = PLAY_X + Math.random() * PLAY_W;
          s.y = PLAY_Y - 2;
        }
      }
    }

    if (Math.random() < delta / 4000 && this.streaks.length < 3) {
      this._spawnStreak();
    }

    this.streaks = this.streaks.filter(streak => {
      streak.y += streak.vy * dt;
      streak.life -= streak.decay * dt;
      return streak.life > 0 && streak.y < PLAY_Y + PLAY_H + 100;
    });
  },

  draw() {
    const { brightMult, countFrac } = getStarStageMultipliers();
    const showNebula = typeof gameState !== 'undefined' && (gameState === 'playing' || gameState === 'tutorial');

    if (showNebula) {
      // Nebula centered at top-center of play area (where enemies come from)
      const nCX = PLAY_X + PLAY_W * 0.5;
      const nCY = PLAY_Y + PLAY_H * 0.2;
      const grad = ctx.createRadialGradient(nCX, nCY, 0, nCX, nCY, PLAY_W * 0.55);
      grad.addColorStop(0,   'rgba(0, 40, 60, 0.10)');
      grad.addColorStop(0.5, 'rgba(0, 20, 35, 0.05)');
      grad.addColorStop(1,   'rgba(0,  0,  0, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(PLAY_X, PLAY_Y, PLAY_W, PLAY_H);
    }

    for (const layer of this.layers) {
      const visible = Math.max(1, Math.floor(layer.stars.length * countFrac));
      for (let i = 0; i < visible; i++) {
        const s = layer.stars[i];
        const alpha = layer.twinkle
          ? layer.alpha * (0.7 + 0.3 * Math.sin(frameNow * 0.002 + s.twinkleOffset))
          : layer.alpha;
        ctx.globalAlpha = Math.min(0.92, alpha * brightMult);
        ctx.fillStyle = s.color;
        ctx.fillRect(s.x, s.y, s.r, s.r);
      }
    }

    ctx.save();
    ctx.globalAlpha = 1;
    this.streaks.forEach(streak => {
      ctx.globalAlpha = streak.life * 0.6;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(streak.x, streak.y);
      ctx.lineTo(streak.x, streak.y + streak.len); // vertical downward streak
      ctx.stroke();
    });
    ctx.restore();

    ctx.globalAlpha = 1;
  },
};

starField.init();
