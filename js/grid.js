// Reactive grid background — Geometry Wars-style displaced grid lines.
// Replaces the static arena-floor PNG. Cyan grid that bends around the player
// and ripples on bullet impacts and enemy deaths. Shifts magenta during flow state.

const reactiveGrid = (() => {
  const SPACING = 50;          // rest distance between grid intersections (px)
  const REPEL_RADIUS = 130;    // ship's repulsion falloff
  const REPEL_STRENGTH = 7;    // peak displacement (px) at ship center
  const PULSE_RADIUS = 220;    // impact ripple radius
  const PULSE_STRENGTH = 14;   // impact peak displacement
  const SPRING_K = 0.10;       // spring constant pulling intersections back
  const DAMPING = 0.84;        // velocity damping per frame
  const PULSE_LIFE_MS = 360;   // impact ripples fade over this duration

  let cols = 0, rows = 0;
  let nodes = null;            // flat array of {rx, ry, x, y, vx, vy}
  let pulses = [];             // {x, y, startedAt, strength, life}
  let lastBounds = null;

  function _ensureGrid() {
    const bx = PLAY_X - SPACING;
    const by = PLAY_Y - SPACING;
    const bw = PLAY_W + SPACING * 2;
    const bh = PLAY_H + SPACING * 2;
    if (lastBounds && lastBounds.x === bx && lastBounds.y === by &&
        lastBounds.w === bw && lastBounds.h === bh) return;

    cols = Math.ceil(bw / SPACING) + 1;
    rows = Math.ceil(bh / SPACING) + 1;
    nodes = new Array(cols * rows);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const rx = bx + c * SPACING;
        const ry = by + r * SPACING;
        nodes[r * cols + c] = { rx, ry, x: rx, y: ry, vx: 0, vy: 0 };
      }
    }
    lastBounds = { x: bx, y: by, w: bw, h: bh };
  }

  function pulse(x, y, strength = 1) {
    if (typeof x !== 'number' || typeof y !== 'number') return;
    pulses.push({
      x, y,
      startedAt: getNow(),
      strength: Math.max(0.4, Math.min(2.5, strength)),
      life: PULSE_LIFE_MS,
    });
    if (pulses.length > 32) pulses.splice(0, pulses.length - 32);
  }

  function update(delta) {
    _ensureGrid();
    if (!nodes) return;

    const now = getNow();
    // Decay & cull old pulses
    pulses = pulses.filter(p => now - p.startedAt < p.life);

    const px = (typeof drone !== 'undefined' && drone) ? drone.x : -9999;
    const py = (typeof drone !== 'undefined' && drone) ? drone.y : -9999;
    const repelR2 = REPEL_RADIUS * REPEL_RADIUS;

    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];

      // Spring back to rest
      n.vx += (n.rx - n.x) * SPRING_K;
      n.vy += (n.ry - n.y) * SPRING_K;

      // Player radial repulsion
      const ddx = n.rx - px;
      const ddy = n.ry - py;
      const d2 = ddx * ddx + ddy * ddy;
      if (d2 < repelR2 && d2 > 0.001) {
        const d = Math.sqrt(d2);
        const f = (1 - d / REPEL_RADIUS);
        const push = REPEL_STRENGTH * f * f;
        n.vx += (ddx / d) * push * 0.18;
        n.vy += (ddy / d) * push * 0.18;
      }

      // Pulse impulses
      for (let p = 0; p < pulses.length; p++) {
        const pl = pulses[p];
        const age = now - pl.startedAt;
        if (age > pl.life) continue;
        const lifeFrac = 1 - age / pl.life;
        const radius = PULSE_RADIUS * (0.35 + 0.65 * (age / pl.life));
        const dx = n.rx - pl.x;
        const dy = n.ry - pl.y;
        const d = Math.sqrt(dx * dx + dy * dy) || 0.01;
        // Ripple band — strongest at the expanding ring's leading edge
        const bandDist = Math.abs(d - radius);
        const bandWidth = 60;
        if (bandDist < bandWidth) {
          const bandFalloff = 1 - bandDist / bandWidth;
          const push = PULSE_STRENGTH * pl.strength * lifeFrac * bandFalloff;
          n.vx += (dx / d) * push * 0.22;
          n.vy += (dy / d) * push * 0.22;
        }
      }

      n.vx *= DAMPING;
      n.vy *= DAMPING;
      n.x += n.vx;
      n.y += n.vy;
    }
  }

  function draw() {
    _ensureGrid();
    if (!nodes) return;

    const flowActive = !!(typeof player !== 'undefined' && player && player.flowStateActive);
    const baseColor = flowActive ? '#fb29fd' : '#31afd4';
    const haloAlpha = flowActive ? 0.07 : 0.04;
    const coreAlpha = flowActive ? 0.16 : 0.11;

    ctx.save();
    // Clip to playfield
    ctx.beginPath();
    ctx.rect(PLAY_X, PLAY_Y, PLAY_W, PLAY_H);
    ctx.clip();

    // Build the path once, stroke it twice (cheap halo + core — no shadowBlur)
    ctx.beginPath();
    for (let r = 0; r < rows; r++) {
      const rowOffset = r * cols;
      const first = nodes[rowOffset];
      ctx.moveTo(first.x, first.y);
      for (let c = 1; c < cols; c++) {
        const n = nodes[rowOffset + c];
        ctx.lineTo(n.x, n.y);
      }
    }
    for (let c = 0; c < cols; c++) {
      const first = nodes[c];
      ctx.moveTo(first.x, first.y);
      for (let r = 1; r < rows; r++) {
        const n = nodes[r * cols + c];
        ctx.lineTo(n.x, n.y);
      }
    }
    ctx.strokeStyle = baseColor;
    ctx.lineWidth = 2.4;
    ctx.globalAlpha = haloAlpha;
    ctx.stroke();
    ctx.lineWidth = 1;
    ctx.globalAlpha = coreAlpha;
    ctx.stroke();

    ctx.restore();
  }

  function reset() {
    if (!nodes) return;
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      n.x = n.rx;
      n.y = n.ry;
      n.vx = 0;
      n.vy = 0;
    }
    pulses = [];
  }

  return { update, draw, pulse, reset };
})();

// Hook into existing FX entry points so the grid reacts to gameplay
(() => {
  if (typeof impactFX !== 'undefined' && impactFX && typeof impactFX.onHit === 'function') {
    const _onHit = impactFX.onHit.bind(impactFX);
    impactFX.onHit = function(x, y, color) {
      reactiveGrid.pulse(x, y, 0.7);
      return _onHit(x, y, color);
    };
  }
  if (typeof burstParticles !== 'undefined' && burstParticles && typeof burstParticles.spawn === 'function') {
    const _spawn = burstParticles.spawn.bind(burstParticles);
    burstParticles.spawn = function(x, y, color) {
      reactiveGrid.pulse(x, y, 1.4);
      return _spawn(x, y, color);
    };
  }
})();
