# Stage-Scaled Star Field — Implementation

Paste this prompt into your implementation agent.

---

## Prompt

File to edit: `C:/Users/brian/Downloads/Anti gravity/Projects/TechnoDrone/index.html`

Make three changes to the background star system:
1. Remove the dash speed-up effect entirely
2. Scale star speed, brightness, and density with stage progression (slow/sparse on stage 1, hyper-speed/dense on stage 10)
3. Add gameplay shooting stars (like the leaderboard has) that grow in frequency and speed by stage

Do NOT touch the leaderboard shooting star system (`lbShooting`). That is separate.

---

## Change 1 — Remove Dash Speedup

**In `starField.update()` (around line 865):**

Remove:
```javascript
const isDashing = dash.duration > 0;
const speedMult = isDashing ? 8 : 1;
```

Change:
```javascript
s.x -= layer.speed * speedMult * dt;
```
To:
```javascript
s.x -= layer.speed * dt;
```

**In `starField.draw()` (around line 881):**

Remove the entire `if (isDashing)` branch. Always draw stars as plain filled rectangles (normal size, normal alpha). Delete:
```javascript
const isDashing = dash.duration > 0;
// ...
if (isDashing) {
  ctx.globalAlpha = layer.alpha * 0.7;
  ctx.fillRect(s.x, s.y, layer.size + layer.speed * 0.15, layer.size * 0.5);
} else {
  ctx.fillRect(s.x, s.y, layer.size, layer.size);
}
```

Replace with just:
```javascript
ctx.globalAlpha = layer.alpha;
ctx.fillRect(s.x, s.y, layer.size, layer.size);
```

---

## Change 2 — Stage-Scaled Star Field

### Init: bump max star count per layer

In `starField.init()`, change the per-layer count from 60-90 to **140 stars per layer** (always init at max, stage controls how many are drawn):

```javascript
const count = 140;
for (let i = 0; i < count; i++) { ... }
```

### Add a helper to compute per-stage multipliers

Add this function near the star field object (or as a method on it):

```javascript
function getStarStageMultipliers() {
  const s = (typeof stage !== 'undefined' && stage.current) ? stage.current : 1;
  const t = (s - 1) / 9; // 0 at stage 1, 1 at stage 10
  return {
    speedMult:  1 + t * 4.5,        // 1.0× → 5.5×
    brightMult: 1 + t * 1.2,        // 1.0× → 2.2×
    countFrac:  0.38 + t * 0.62,    // 38% → 100% of pool
  };
}
```

### Update: apply speed multiplier

In `starField.update()`, compute multipliers and apply to speed:

```javascript
update(delta) {
  const dt = delta / 1000;
  const { speedMult, countFrac } = getStarStageMultipliers();
  for (const layer of this.layers) {
    const visible = Math.floor(layer.stars.length * countFrac);
    for (let i = 0; i < visible; i++) {
      const s = layer.stars[i];
      s.x -= layer.speed * speedMult * dt;
      if (s.x < -5) {
        s.x = canvas.width + Math.random() * 20;
        s.y = Math.random() * canvas.height;
      }
    }
  }
},
```

### Draw: apply brightness + count multipliers

```javascript
draw() {
  const { brightMult, countFrac } = getStarStageMultipliers();
  for (const layer of this.layers) {
    ctx.fillStyle = '#ffffff';
    const visible = Math.floor(layer.stars.length * countFrac);
    for (let i = 0; i < visible; i++) {
      const s = layer.stars[i];
      ctx.globalAlpha = Math.min(0.92, layer.alpha * brightMult); // cap near 1.0
      ctx.fillRect(s.x, s.y, layer.size, layer.size);
    }
  }
  ctx.globalAlpha = 1;
},
```

---

## Change 3 — Gameplay Shooting Stars (new system)

Add a new object `gameStars` for in-game background shooting stars. These are decorative only — no gameplay interaction.

### Star definition

```javascript
function _newGameStar() {
  const s = (typeof stage !== 'undefined' && stage.current) ? stage.current : 1;
  const baseSpeed = 280 + s * 60;  // 340px/s stage 1 → 880px/s stage 10
  const len = 40 + Math.random() * (30 + s * 12);  // longer tails at higher stages
  return {
    x: canvas.width + len,
    y: Math.random() * canvas.height,
    vx: -(baseSpeed + Math.random() * 120),
    vy: (Math.random() - 0.5) * 30,
    len,
    alpha: 0,
    life: 0,
    maxLife: 800 + Math.random() * 600,
  };
}
```

### Pool & update

```javascript
const gameStars = {
  pool: [],
  spawnTimer: 0,

  getSpawnInterval() {
    const s = (typeof stage !== 'undefined' && stage.current) ? stage.current : 1;
    if (s <= 2) return Infinity;           // none stages 1–2
    if (s <= 4) return 3200 - s * 200;    // rare stages 3–4
    return Math.max(400, 2800 - s * 220); // frequent by stage 10 (~400ms)
  },

  update(delta) {
    const dt = delta / 1000;

    // spawn
    this.spawnTimer += delta;
    const interval = this.getSpawnInterval();
    if (this.spawnTimer >= interval && this.pool.length < 12) {
      this.pool.push(_newGameStar());
      this.spawnTimer = 0;
    }

    // update
    this.pool = this.pool.filter(s => {
      s.life += delta;
      const t = s.life / s.maxLife;
      s.alpha = t < 0.1 ? t / 0.1 : t > 0.75 ? 1 - (t - 0.75) / 0.25 : 1;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      return s.life < s.maxLife && s.x > -s.len - 50;
    });
  },

  draw() {
    this.pool.forEach(s => {
      if (s.alpha <= 0) return;
      const mag = Math.hypot(s.vx, s.vy);
      const nx = s.vx / mag, ny = s.vy / mag;
      ctx.save();
      ctx.globalAlpha = s.alpha * 0.6;
      const grad = ctx.createLinearGradient(
        s.x - nx * s.len, s.y - ny * s.len,
        s.x, s.y
      );
      grad.addColorStop(0, 'rgba(255,255,255,0)');
      grad.addColorStop(1, 'rgba(255,255,255,1)');
      ctx.strokeStyle = grad;
      ctx.lineWidth = 1.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(s.x - nx * s.len, s.y - ny * s.len);
      ctx.lineTo(s.x, s.y);
      ctx.stroke();
      // bright head dot
      ctx.globalAlpha = s.alpha * 0.9;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(s.x, s.y, 1.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  },
};
```

### Wire into game loop

Call `gameStars.update(delta)` and `gameStars.draw()` in the gameplay draw/update path, **after** `starField.update/draw` and **before** enemies/player draw. Reset `gameStars.pool = []` and `gameStars.spawnTimer = 0` on stage change or game reset.

---

## Scaling Reference Table

| Stage | Speed mult | Brightness | Star density | Shooting stars |
|-------|-----------|-----------|--------------|----------------|
| 1 | 1.0× | 1.0× | 38% | None |
| 2 | 1.5× | 1.13× | 45% | None |
| 3 | 2.0× | 1.27× | 52% | Rare (~3s) |
| 4 | 2.5× | 1.40× | 59% | Occasional (~2.4s) |
| 5 | 3.0× | 1.53× | 66% | Moderate (~1.7s) |
| 6 | 3.5× | 1.67× | 72% | Frequent (~1.2s) |
| 7 | 4.0× | 1.80× | 79% | Fast (~0.9s) |
| 8 | 4.5× | 1.93× | 86% | Dense (~0.7s) |
| 9 | 5.0× | 2.07× | 93% | Very dense (~0.55s) |
| 10 | 5.5× | 2.20× | 100% | Rapid (~0.4s) |

---

## Notes
- Keep `gameStars` shooting stars white only — no colored tints in gameplay. Cyan/pink tints could be confused with enemy bullets or buff indicators.
- No `shadowBlur` on `gameStars` draw calls — use gradient + alpha only to stay within the existing performance budget.
- Near-layer star alpha is capped at 0.92 to prevent total white wash at stage 10.
- The `gameStars` system is completely separate from `lbShooting` — do not touch leaderboard code.
