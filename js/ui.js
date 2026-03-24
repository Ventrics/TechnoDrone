const lbStars = Array.from({ length: 80 }, () => ({
  x: Math.random() * 1920,
  y: Math.random() * 1080,
  r: Math.random() * 1.8 + 0.3,
  alpha: Math.random() * 0.6 + 0.2,
  twinkleSpeed: Math.random() * 0.003 + 0.001,
  twinkleOffset: Math.random() * Math.PI * 2,
  color: LB_COLORS[Math.floor(Math.random() * LB_COLORS.length)],
}));

const lbShooting = Array.from({ length: 8 }, () => _newShootingStar());

function _newShootingStar() {
  const color = LB_COLORS[Math.floor(Math.random() * LB_COLORS.length)];
  return {
    x: Math.random() * 1920,
    y: Math.random() * 1080 * 0.6,
    vx: (Math.random() * 6 + 5) * (Math.random() < 0.5 ? 1 : -1),
    vy: Math.random() * 3 + 1,
    len: Math.random() * 120 + 60,
    alpha: 0,
    life: 0,
    maxLife: Math.random() * 1200 + 600,
    color,
  };
}

const lbOrbs = Array.from({ length: 6 }, (_, i) => ({
  angle: (i / 6) * Math.PI * 2,
  radius: 180 + Math.random() * 80,
  speed: (Math.random() * 0.0004 + 0.0002) * (Math.random() < 0.5 ? 1 : -1),
  size: Math.random() * 60 + 30,
  color: LB_COLORS[i % LB_COLORS.length],
  alpha: Math.random() * 0.12 + 0.05,
}));

function updateLbBg(delta) {
  const now = getNow();
  lbStars.forEach(s => {
    s.alpha = 0.3 + 0.4 * (0.5 + 0.5 * Math.sin(now * s.twinkleSpeed + s.twinkleOffset));
  });
  lbShooting.forEach((s, i) => {
    s.life += delta;
    const t = s.life / s.maxLife;
    s.alpha = t < 0.15 ? t / 0.15 : t > 0.75 ? 1 - (t - 0.75) / 0.25 : 1;
    s.x += s.vx * delta * 0.06;
    s.y += s.vy * delta * 0.06;
    if (s.life >= s.maxLife) lbShooting[i] = _newShootingStar();
  });
  lbOrbs.forEach(o => { o.angle += o.speed * delta; });
}

function drawLbBg() {
  const W = canvas.width, H = canvas.height;
  const cx = W / 2, cy = H / 2;

  ctx.fillStyle = '#050505';
  ctx.fillRect(0, 0, W, H);

  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(W, H) * 0.7);
  grad.addColorStop(0,   'rgba(0,79,255,0.07)');
  grad.addColorStop(0.5, 'rgba(49,175,212,0.03)');
  grad.addColorStop(1,   'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  const G   = 64;
  const off = titleGridOff % G;
  ctx.save();
  ctx.lineWidth   = 0.6;
  ctx.globalAlpha = 0.09;
  setGlow(COLOR_CYAN, 4);
  ctx.strokeStyle = COLOR_CYAN;
  for (let x = -G + off; x < W + G; x += G) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
  }
  for (let y = -G + off; y < H + G; y += G) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }
  clearGlow();
  ctx.restore();

  lbOrbs.forEach(o => {
    const ox = cx + Math.cos(o.angle) * o.radius * (W / 1200);
    const oy = cy + Math.sin(o.angle) * o.radius * 0.5 * (H / 800);
    const og = ctx.createRadialGradient(ox, oy, 0, ox, oy, o.size);
    og.addColorStop(0, o.color + 'cc');
    og.addColorStop(1, o.color + '00');
    ctx.save();
    ctx.globalAlpha = o.alpha;
    ctx.fillStyle = og;
    ctx.beginPath();
    ctx.arc(ox, oy, o.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });

  lbStars.forEach(s => {
    const sx = (s.x / 1920) * W;
    const sy = (s.y / 1080) * H;
    ctx.save();
    ctx.globalAlpha = s.alpha;
    setGlow(s.color, 6);
    ctx.fillStyle = s.color;
    ctx.beginPath();
    ctx.arc(sx, sy, s.r, 0, Math.PI * 2);
    ctx.fill();
    clearGlow();
    ctx.restore();
  });

  lbShooting.forEach(s => {
    if (s.alpha <= 0) return;
    const sx = (s.x / 1920) * W;
    const sy = (s.y / 1080) * H;
    const mag = Math.hypot(s.vx, s.vy);
    const nx  = s.vx / mag, ny = s.vy / mag;
    const tailScale = W / 1920;
    ctx.save();
    ctx.globalAlpha = s.alpha * 0.9;
    const sg = ctx.createLinearGradient(
      sx - nx * s.len * tailScale, sy - ny * s.len * tailScale,
      sx, sy
    );
    sg.addColorStop(0, s.color + '00');
    sg.addColorStop(1, s.color);
    setGlow(s.color, 14);
    ctx.strokeStyle = sg;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(sx - nx * s.len * tailScale, sy - ny * s.len * tailScale);
    ctx.lineTo(sx, sy);
    ctx.stroke();
    ctx.globalAlpha = s.alpha;
    ctx.fillStyle = '#ffffff';
    setGlow(s.color, 20);
    ctx.beginPath();
    ctx.arc(sx, sy, 2, 0, Math.PI * 2);
    ctx.fill();
    clearGlow();
    ctx.restore();
  });
}

const leaderboard = {
  scores: [],
  loading: false,
  error: false,

  async fetchScores() {
    this.loading = true;
    this.error = false;
    this.loadTime = 0;
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/leaderboard?select=*&order=score.desc&limit=100`, {
        headers: { apikey: SUPABASE_ANON_KEY }
      });
      if (!res.ok) throw new Error();
      const rawScores = await res.json();

      const uniqueScores = [];
      const seenNames = new Set();
      for (const entry of rawScores) {
        if (!seenNames.has(entry.player_name)) {
          seenNames.add(entry.player_name);
          uniqueScores.push(entry);
        }
      }

      this.scores = uniqueScores.slice(0, 20);
      this.loadTime = getNow();
    } catch (e) {
      this.error = true;
    } finally {
      this.loading = false;
    }
  },

  async submitScore(score, kills) {
    if (score <= 0) return;
    const name = loadPlayerName();
    if (!name) return;
    try {
      const checkRes = await fetch(`${SUPABASE_URL}/rest/v1/leaderboard?player_name=eq.${encodeURIComponent(name)}&select=id,score`, {
        headers: { apikey: SUPABASE_ANON_KEY }
      });
      if (!checkRes.ok) return;
      const records = await checkRes.json();

      if (records.length > 0) {
        const bestRecord = records.reduce((max, r) => r.score > max.score ? r : max, records[0]);
        const otherIds = records.filter(r => r.id !== bestRecord.id).map(r => r.id);

        if (score > bestRecord.score) {
          await fetch(`${SUPABASE_URL}/rest/v1/leaderboard?id=eq.${bestRecord.id}`, {
            method: 'PATCH',
            headers: {
              apikey: SUPABASE_ANON_KEY,
              'Content-Type': 'application/json',
              Prefer: 'return=minimal'
            },
            body: JSON.stringify({ score, kills, created_at: new Date().toISOString() })
          });
        }

        if (otherIds.length > 0) {
          await fetch(`${SUPABASE_URL}/rest/v1/leaderboard?id=in.(${otherIds.join(',')})`, {
            method: 'DELETE',
            headers: { apikey: SUPABASE_ANON_KEY }
          });
        }
      } else {
        await fetch(`${SUPABASE_URL}/rest/v1/leaderboard`, {
          method: 'POST',
          headers: {
            apikey: SUPABASE_ANON_KEY,
            'Content-Type': 'application/json',
            Prefer: 'return=minimal'
          },
          body: JSON.stringify({ player_name: name, score, kills })
        });
      }
    } catch (e) {}
  },

  update(delta) {
    titleGridOff += delta * 0.022;
    updateLbBg(delta);
    if (justPressed['Escape'] || justPressed['Backspace']) {
      gameState = 'title';
    }
  },

  draw() {
    const W = canvas.width, H = canvas.height;
    const cx = W / 2;
    const now = getNow();

    drawLbBg();

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    ctx.font = 'bold 48px monospace';
    setGlow(COLOR_CYAN, 60);
    ctx.fillStyle = COLOR_CYAN;
    ctx.fillText('GLOBAL LEADERBOARD', cx, 44);
    setGlow('#ffffff', 20);
    ctx.fillStyle = '#ffffff';
    ctx.fillText('GLOBAL LEADERBOARD', cx, 44);

    ctx.globalAlpha = 0.8;
    setGlow(COLOR_CYAN, 15);
    ctx.strokeStyle = COLOR_CYAN;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - 300, 108);
    ctx.lineTo(cx + 300, 108);
    ctx.stroke();
    ctx.globalAlpha = 1;

    clearGlow();
    ctx.font = '15px monospace';

    if (this.loading) {
      const pulse = 0.5 + 0.5 * Math.sin(now * 0.004);
      setGlow(COLOR_CYAN, 20);
      ctx.globalAlpha = 0.5 + pulse * 0.5;
      ctx.fillStyle = COLOR_CYAN;
      ctx.fillText('FETCHING DATA...', cx, H * 0.45);
    } else if (this.error) {
      setGlow(COLOR_CRIMSON, 25);
      ctx.fillStyle = COLOR_CRIMSON;
      ctx.fillText('CONNECTION FAILED', cx, H * 0.45);
    } else {
      const startY = 130;
      const rowHeight = 30;
      const localName = loadPlayerName();

      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.font = 'bold 13px monospace';
      ctx.globalAlpha = 0.4;
      ctx.fillStyle = COLOR_CYAN;
      ctx.textAlign = 'left';
      ctx.fillText('RANK',     cx - 280, startY);
      ctx.fillText('CALLSIGN', cx - 200, startY);
      ctx.textAlign = 'right';
      ctx.fillText('SCORE', cx + 180, startY);
      ctx.fillText('KILLS', cx + 280, startY);

      ctx.strokeStyle = COLOR_CYAN;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx - 290, startY + 20);
      ctx.lineTo(cx + 290, startY + 20);
      ctx.stroke();
      ctx.restore();

      const timeSinceLoad = now - (this.loadTime || now);
      ctx.font = '15px monospace';

      this.scores.forEach((entry, i) => {
        const delay = i * 20;
        const animTime = Math.max(0, timeSinceLoad - delay);
        const animDuration = 400;
        let progress = animTime / animDuration;
        if (progress > 1) progress = 1;

        const easeProgress = 1 - Math.pow(1 - progress, 4);
        if (easeProgress <= 0) return;

        const y = startY + 30 + i * rowHeight;
        const isMe = entry.player_name === localName;
        const xOffset = (1 - easeProgress) * 50;
        const currentAlpha = easeProgress;

        ctx.save();
        ctx.translate(xOffset, 0);
        ctx.globalAlpha = currentAlpha;

        if (isMe) {
          ctx.fillStyle = 'rgba(255, 0, 127, 0.08)';
          ctx.fillRect(cx - 290, y - 6, 580, rowHeight);
          ctx.fillStyle = COLOR_PINK;
          ctx.fillRect(cx - 290, y - 6, 4, rowHeight);
        } else {
          ctx.fillStyle = i % 2 === 0 ? '#000000' : 'rgba(0,79,255,0.04)';
          ctx.fillRect(cx - 290, y - 6, 580, rowHeight);
        }

        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';

        if (i === 0) {
          const pulse = 0.5 + 0.5 * Math.sin(now * 0.005);
          setGlow('#ffd700', 10 + pulse * 15);
          ctx.fillStyle = '#ffd700';
        } else if (isMe) {
          setGlow(COLOR_PINK, 15);
          ctx.fillStyle = COLOR_PINK;
        } else if (i === 1) {
          setGlow('#c0c0c0', 10);
          ctx.fillStyle = '#c0c0c0';
        } else if (i === 2) {
          setGlow('#cd7f32', 8);
          ctx.fillStyle = '#cd7f32';
        } else {
          clearGlow();
          ctx.fillStyle = i % 2 === 0 ? '#ffffff' : COLOR_CYAN;
        }

        const textY = y - 6 + rowHeight / 2;
        ctx.fillText((i + 1) + '.', cx - 280, textY);
        ctx.fillText(entry.player_name, cx - 200, textY);
        ctx.textAlign = 'right';
        ctx.fillText(entry.score, cx + 180, textY);
        ctx.fillText(entry.kills, cx + 280, textY);
        ctx.restore();
      });
    }

    clearGlow();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    const pulse2 = 0.6 + 0.4 * Math.sin(now * 0.002);
    ctx.globalAlpha = pulse2;
    setGlow(COLOR_CYAN, 10);
    ctx.fillStyle = COLOR_CYAN;
    ctx.font = '13px monospace';
    ctx.fillText('[ ESC OR BACKSPACE TO RETURN ]', cx, H - 30);

    clearGlow();
    ctx.restore();
  }
};

const nameEntry = {
  name: '',
  update(delta) {
    if (justPressed['Enter']) {
      if (this.name.length > 0) {
        writePlayerName(this.name);
        gameState = 'playing';
        leaderboard.submitScore(player.score, stage.totalKills);
      }
    } else if (justPressed['Backspace']) {
      this.name = this.name.slice(0, -1);
    } else {
      for (const k in justPressed) {
        if (k.length === 1 && /[a-zA-Z0-9]/.test(k) && this.name.length < 12) {
          this.name += k.toUpperCase();
        }
      }
    }
  },
  drawOverlay() {
    ctx.save();
    ctx.fillStyle = 'rgba(5, 5, 5, 0.85)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    setGlow(COLOR_CYAN, 20);
    ctx.fillStyle = COLOR_CYAN;
    ctx.font = 'bold 36px monospace';
    ctx.fillText('ENTER YOUR CALLSIGN:', cx, cy - 40);

    clearGlow();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 48px monospace';
    const cursor = (Math.floor(getNow() / 500) % 2 === 0) ? '_' : '';
    ctx.fillText(this.name + cursor, cx, cy + 20);

    ctx.font = '14px monospace';
    ctx.fillStyle = '#888888';
    ctx.fillText('PRESS ENTER TO CONFIRM', cx, cy + 80);
    ctx.restore();
  }
};
