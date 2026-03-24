const starField = {
  layers: [],
  init() {
    this.layers = [
      { speed: 20,  stars: [], alpha: 0.15, size: 0.6 },
      { speed: 50,  stars: [], alpha: 0.25, size: 0.9 },
      { speed: 100, stars: [], alpha: 0.4,  size: 1.2 },
    ];
    for (const layer of this.layers) {
      const count = 60 + Math.floor(Math.random() * 30);
      for (let i = 0; i < count; i++) {
        layer.stars.push({
          x: Math.random() * 2000,
          y: Math.random() * 1200,
        });
      }
    }
  },

  update(delta) {
    const dt = delta / 1000;
    const isDashing = dash.duration > 0;
    const speedMult = isDashing ? 8 : 1;

    for (const layer of this.layers) {
      for (const s of layer.stars) {
        s.x -= layer.speed * speedMult * dt;
        if (s.x < -5) {
          s.x = canvas.width + Math.random() * 20;
          s.y = Math.random() * canvas.height;
        }
      }
    }
  },

  draw() {
    const isDashing = dash.duration > 0;
    for (const layer of this.layers) {
      ctx.fillStyle = '#ffffff';
      for (const s of layer.stars) {
        ctx.globalAlpha = layer.alpha;
        if (isDashing) {
          ctx.globalAlpha = layer.alpha * 0.7;
          ctx.fillRect(s.x, s.y, layer.size + layer.speed * 0.15, layer.size * 0.5);
        } else {
          ctx.fillRect(s.x, s.y, layer.size, layer.size);
        }
      }
    }
    ctx.globalAlpha = 1;
  },
};

starField.init();
