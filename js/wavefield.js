// Wave grid background — title screen only
// Canvas port of the SVG wave-background component, using the game's color palette.

const waveField = (() => {

  // --- Minimal 2D simplex noise (Stefan Gustavson / public domain) ---
  function createNoise2D() {
    const F2 = 0.5 * (Math.sqrt(3) - 1);
    const G2 = (3 - Math.sqrt(3)) / 6;
    const grad3 = [
      [1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],
      [1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],
      [0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1],
    ];
    const p = [];
    for (let i = 0; i < 256; i++) p[i] = Math.floor(Math.random() * 256);
    const perm = new Array(512);
    for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
    const dot = (g, x, y) => g[0]*x + g[1]*y;

    return function noise2D(xin, yin) {
      const s  = (xin + yin) * F2;
      const i  = Math.floor(xin + s);
      const j  = Math.floor(yin + s);
      const t  = (i + j) * G2;
      const x0 = xin - (i - t), y0 = yin - (j - t);
      let i1, j1;
      if (x0 > y0) { i1 = 1; j1 = 0; } else { i1 = 0; j1 = 1; }
      const x1 = x0 - i1 + G2,   y1 = y0 - j1 + G2;
      const x2 = x0 - 1 + 2*G2,  y2 = y0 - 1 + 2*G2;
      const ii = i & 255, jj = j & 255;
      const gi0 = perm[ii +      perm[jj     ]] % 12;
      const gi1 = perm[ii + i1 + perm[jj + j1]] % 12;
      const gi2 = perm[ii + 1  + perm[jj + 1 ]] % 12;
      let t0 = 0.5 - x0*x0 - y0*y0;
      let n0 = t0 < 0 ? 0 : ((t0 *= t0) * t0 * dot(grad3[gi0], x0, y0));
      let t1 = 0.5 - x1*x1 - y1*y1;
      let n1 = t1 < 0 ? 0 : ((t1 *= t1) * t1 * dot(grad3[gi1], x1, y1));
      let t2 = 0.5 - x2*x2 - y2*y2;
      let n2 = t2 < 0 ? 0 : ((t2 *= t2) * t2 * dot(grad3[gi2], x2, y2));
      return 70 * (n0 + n1 + n2);
    };
  }

  // --- Config ---
  const X_GAP = 24;  // wider spacing = fewer lines = faster
  const Y_GAP = 18;  // fewer points per line = faster

  // --- State ---
  let lines = [];
  let noise = null;
  let _w = 0, _h = 0;

  // Cached bounding rect — only updated on resize, not every mousemove
  let _rect = null;

  // Mouse / touch tracking
  let mx = -10, my = 0;
  let mlx = 0, mly = 0;
  let msx = 0, msy = 0;
  let mvs = 0, ma = 0;
  let mset = false;

  // --- Build point grid ---
  function rebuild() {
    _w = canvas.width;
    _h = canvas.height;
    _rect = canvas.getBoundingClientRect();

    const oW = _w + 200;
    const oH = _h + 30;
    const totalLines = Math.ceil(oW / X_GAP);
    const totalPts   = Math.ceil(oH / Y_GAP);
    const x0 = (_w - X_GAP * totalLines) / 2;
    const y0 = (_h - Y_GAP * totalPts)   / 2;

    lines = [];
    for (let i = 0; i < totalLines; i++) {
      const pts = [];
      for (let j = 0; j < totalPts; j++) {
        pts.push({
          x: x0 + X_GAP * i,
          y: y0 + Y_GAP * j,
          wx: 0, wy: 0,
          cx: 0, cy: 0,
          cvx: 0, cvy: 0,
        });
      }
      lines.push(pts);
    }
  }

  // --- Mouse / touch handlers ---
  function onPointer(x, y) {
    if (!_rect) return;
    mx = x - _rect.left;
    my = y - _rect.top;
    if (!mset) { msx = mx; msy = my; mlx = mx; mly = my; mset = true; }
  }

  // --- Public: init ---
  function init() {
    noise = createNoise2D();
    rebuild();
    window.addEventListener('resize', () => { _rect = canvas.getBoundingClientRect(); });
    window.addEventListener('mousemove', e => onPointer(e.clientX, e.clientY));
    canvas.addEventListener('touchmove', e => {
      onPointer(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: true });
  }

  // --- Public: update (call from updateTitle) ---
  function update(delta) {
    if (canvas.width !== _w || canvas.height !== _h) rebuild();

    // Smooth mouse
    msx += (mx - msx) * 0.1;
    msy += (my - msy) * 0.1;

    const dx = mx - mlx, dy = my - mly;
    const d  = Math.hypot(dx, dy);
    mvs += (d - mvs) * 0.1;
    mvs  = Math.min(100, mvs);
    mlx  = mx; mly = my;
    ma   = Math.atan2(dy, dx);

    const time  = frameNow;
    const l     = Math.max(175, mvs);
    const l2    = l * l;                  // squared influence radius — avoids sqrt for far points
    const cosMA = Math.cos(ma);           // pre-computed once per frame
    const sinMA = Math.sin(ma);

    for (const pts of lines) {
      for (const p of pts) {
        // Simplex wave
        const move = noise(
          (p.x + time * 0.008) * 0.003,
          (p.y + time * 0.003) * 0.002
        ) * 8;
        p.wx = Math.cos(move) * 12;
        p.wy = Math.sin(move) * 6;

        // Cursor influence — squared distance check skips sqrt for most points
        const pdx = p.x - msx, pdy = p.y - msy;
        const pd2 = pdx * pdx + pdy * pdy;
        if (pd2 < l2) {
          const pd = Math.sqrt(pd2);
          const s  = 1 - pd / l;
          const f  = Math.cos(pd * 0.001) * s;
          p.cvx += cosMA * f * l * mvs * 0.00035;
          p.cvy += sinMA * f * l * mvs * 0.00035;
        }

        // Spring restore — skip if already settled
        const active = p.cvx * p.cvx + p.cvy * p.cvy + p.cx * p.cx + p.cy * p.cy > 0.0001;
        if (active) {
          p.cvx += -p.cx * 0.01;
          p.cvy += -p.cy * 0.01;
          p.cvx *= 0.95;
          p.cvy *= 0.95;
          p.cx = Math.min(50, Math.max(-50, p.cx + p.cvx));
          p.cy = Math.min(50, Math.max(-50, p.cy + p.cvy));
        }
      }
    }
  }

  // --- Public: draw (call from drawTitleScreen, before vignette) ---
  function draw() {
    ctx.save();
    ctx.lineWidth = 1;

    // Batch ALL purple lines into one path — single stroke call
    ctx.strokeStyle = '#6d28d9';
    ctx.globalAlpha = 0.11;
    ctx.beginPath();
    for (let li = 0; li < lines.length; li++) {
      if (li % 16 === 8) continue;  // skip pink lines in this pass
      const pts = lines[li];
      if (pts.length < 2) continue;
      const fp = pts[0];
      ctx.moveTo(fp.x + fp.wx, fp.y + fp.wy);
      for (let i = 1; i < pts.length; i++) {
        const p = pts[i];
        ctx.lineTo(p.x + p.wx + p.cx, p.y + p.wy + p.cy);
      }
    }
    ctx.stroke();

    // Batch ALL red accent lines — single stroke call
    ctx.strokeStyle = '#818cf8';
    ctx.globalAlpha = 0.08;
    ctx.beginPath();
    for (let li = 8; li < lines.length; li += 16) {
      const pts = lines[li];
      if (pts.length < 2) continue;
      const fp = pts[0];
      ctx.moveTo(fp.x + fp.wx, fp.y + fp.wy);
      for (let i = 1; i < pts.length; i++) {
        const p = pts[i];
        ctx.lineTo(p.x + p.wx + p.cx, p.y + p.wy + p.cy);
      }
    }
    ctx.stroke();

    ctx.restore();
  }

  return { init, update, draw };
})();

waveField.init();
