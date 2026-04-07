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
  submitMessage: '',
  submitOk: false,

  async fetchScores() {
    this.loading = true;
    this.error = false;
    this.loadTime = 0;
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/leaderboard?select=*&order=score.desc&limit=100`, {
        headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` }
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
    if (!name) {
      this.submitOk = false;
      this.submitMessage = 'NO CALLSIGN - SCORE NOT SUBMITTED';
      return;
    }
    try {
      const checkRes = await fetch(`${SUPABASE_URL}/rest/v1/leaderboard?player_name=eq.${encodeURIComponent(name)}&select=id,score`, {
        headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` }
      });
      if (!checkRes.ok) {
        const text = await checkRes.text();
        this.submitOk = false;
        this.submitMessage = `CHECK FAILED ${checkRes.status}`;
        console.error('Leaderboard check failed:', checkRes.status, text);
        return;
      }
      const records = await checkRes.json();

      if (records.length > 0) {
        const bestRecord = records.reduce((max, r) => r.score > max.score ? r : max, records[0]);
        const otherIds = records.filter(r => r.id !== bestRecord.id).map(r => r.id);

        if (score > bestRecord.score) {
          const patchRes = await fetch(`${SUPABASE_URL}/rest/v1/leaderboard?id=eq.${bestRecord.id}`, {
            method: 'PATCH',
            headers: {
              apikey: SUPABASE_ANON_KEY,
              Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
              'Content-Type': 'application/json',
              Prefer: 'return=minimal'
            },
            body: JSON.stringify({ score, kills, created_at: new Date().toISOString() })
          });
          if (!patchRes.ok) {
            const text = await patchRes.text();
            this.submitOk = false;
            this.submitMessage = `UPDATE FAILED ${patchRes.status}`;
            console.error('Leaderboard update failed:', patchRes.status, text);
            return;
          }
        }

        if (otherIds.length > 0) {
          await fetch(`${SUPABASE_URL}/rest/v1/leaderboard?id=in.(${otherIds.join(',')})`, {
            method: 'DELETE',
            headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` }
          });
        }
      } else {
        const postRes = await fetch(`${SUPABASE_URL}/rest/v1/leaderboard`, {
          method: 'POST',
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
            Prefer: 'return=minimal'
          },
          body: JSON.stringify({ player_name: name, score, kills })
        });
        if (!postRes.ok) {
          const text = await postRes.text();
          this.submitOk = false;
          this.submitMessage = `INSERT FAILED ${postRes.status}`;
          console.error('Leaderboard insert failed:', postRes.status, text);
          return;
        }
      }

      const existingIndex = this.scores.findIndex(entry => entry.player_name === name);
      if (existingIndex >= 0) {
        if (score >= this.scores[existingIndex].score) {
          this.scores[existingIndex] = Object.assign({}, this.scores[existingIndex], { score, kills });
        }
      } else {
        this.scores.push({ player_name: name, score, kills });
      }
      this.scores.sort((a, b) => b.score - a.score);
      this.scores = this.scores.slice(0, 20);
      this.loadTime = getNow();
      this.submitOk = true;
      this.submitMessage = 'SCORE SUBMITTED';

      await this.fetchScores();
    } catch (e) {
      this.error = true;
      this.submitOk = false;
      this.submitMessage = 'SUBMIT ERROR';
      console.error('Leaderboard submit exception:', e);
    }
  },

  update(delta) {
    titleGridOff += delta * 0.022;
    updateLbBg(delta);
    if (justPressed['Escape'] || justPressed['Backspace']) {
      audio.play('menuConfirm');
      audio.playMusic('title');
      gameState = 'title';
    }
  },

  draw() {
    const W = canvas.width, H = canvas.height;
    const cx = W / 2;
    const now = getNow();
    const cy = H / 2;
    const layoutScale = Math.max(0.72, Math.min(1.08, Math.min(W / 1280, H / 720)));
    const compact = W < 920;
    const headingY = cy - 250 * layoutScale;
    const subLabelY = headingY + 68 * layoutScale;
    const dividerY = subLabelY + 34 * layoutScale;
    const startY = dividerY + 40 * layoutScale;
    const rowHeight = compact ? 26 : 30;
    const dividerWidth = Math.min(W * 0.58, 520 * layoutScale);
    const leftX = cx - Math.min(300 * layoutScale, W * 0.24);
    const nameX = cx - Math.min(210 * layoutScale, W * 0.165);
    const scoreX = cx + Math.min(180 * layoutScale, W * 0.16);
    const killsX = cx + Math.min(300 * layoutScale, W * 0.24);
    const headerFont = Math.round(Math.max(56, Math.min(88, 88 * layoutScale)));
    const labelFont = Math.round(Math.max(11, Math.min(13, 13 * layoutScale)));
    const rowFont = Math.round(Math.max(15, Math.min(18, 18 * layoutScale)));

    drawLbBg();

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const heading = 'LEADERBOARD';
    const headingLetters = heading.split('');
    const flicker = 0.9 + 0.1 * Math.sin(now * 0.014) * Math.sin(now * 0.029);
    const glitchPulse = 0.5 + 0.5 * Math.sin(now * 0.013);
    ctx.font = `bold ${headerFont}px monospace`;
    const spacing = Math.max(4, headerFont * 0.04);
    const widths = headingLetters.map(ch => ch === ' ' ? headerFont * 0.42 : ctx.measureText(ch).width);
    const totalWidth = widths.reduce((sum, width) => sum + width, 0) + spacing * (headingLetters.length - 1);
    const drawHeadingLayer = (alphaBase, blur, fill, glow, dropoutScale) => {
      let drawX = cx - totalWidth / 2;
      ctx.fillStyle = fill;
      ctx.shadowColor = glow;
      ctx.shadowBlur = blur;
      headingLetters.forEach((ch, i) => {
        const charWidth = widths[i];
        const charCenter = drawX + charWidth / 2;
        const noise = 0.76 + 0.24 * (0.5 + 0.5 * Math.sin(now * 0.021 + i * 0.9));
        const dropout = ch === ' ' ? 1 : Math.max(0.46, 1 - dropoutScale * glitchPulse * ((i % 3) === 1 ? 0.5 : 0.16));
        ctx.globalAlpha = alphaBase * flicker * noise * dropout;
        ctx.fillText(ch, charCenter, headingY);
        drawX += charWidth + spacing;
      });
    };
    drawHeadingLayer(0.04, 86, '#4216d2', '#4216d2', 0.12);
    drawHeadingLayer(0.14, 42, '#dd32b3', '#fb29fd', 0.18);
    drawHeadingLayer(0.56, 20, '#2e3bf0', '#2e3bf0', 0.22);
    drawHeadingLayer(1.0, 8, '#d9d4ff', '#2e3bf0', 0.28);
    ctx.shadowBlur = 0;
    ctx.shadowColor = 'transparent';

    ctx.globalAlpha = 0.72;
    ctx.fillStyle = '#d9d4ff';
    ctx.font = `bold ${labelFont}px monospace`;
    ctx.fillText('GLOBAL SIGNAL // TOP PILOTS', cx, subLabelY);

    ctx.globalAlpha = 0.16;
    ctx.strokeStyle = '#2e3bf0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - dividerWidth / 2, dividerY);
    ctx.lineTo(cx + dividerWidth / 2, dividerY);
    ctx.stroke();

    ctx.globalAlpha = 0.42;
    ctx.textAlign = 'left';
    ctx.fillStyle = '#dd32b3';
    ctx.font = `bold ${labelFont}px monospace`;
    ctx.fillText('RANK', leftX, startY);
    ctx.fillText('CALLSIGN', nameX, startY);
    ctx.textAlign = 'right';
    ctx.fillText('SCORE', scoreX, startY);
    ctx.fillText('KILLS', killsX, startY);
    clearGlow();

    if (this.loading) {
      const pulse = 0.5 + 0.5 * Math.sin(now * 0.004);
      setGlow('#2e3bf0', 20);
      ctx.globalAlpha = 0.5 + pulse * 0.5;
      ctx.textAlign = 'center';
      ctx.fillStyle = '#d9d4ff';
      ctx.font = `bold ${Math.round(Math.max(18, 22 * layoutScale))}px monospace`;
      ctx.fillText('FETCHING DATA...', cx, H * 0.49);
    } else if (this.error) {
      setGlow(COLOR_CRIMSON, 25);
      ctx.textAlign = 'center';
      ctx.fillStyle = COLOR_CRIMSON;
      ctx.font = `bold ${Math.round(Math.max(18, 22 * layoutScale))}px monospace`;
      ctx.fillText('CONNECTION FAILED', cx, H * 0.49);
    } else {
      const localName = loadPlayerName();
      const timeSinceLoad = now - (this.loadTime || now);
      ctx.font = `bold ${rowFont}px monospace`;

      this.scores.forEach((entry, i) => {
        const delay = i * 20;
        const animTime = Math.max(0, timeSinceLoad - delay);
        const animDuration = 400;
        let progress = animTime / animDuration;
        if (progress > 1) progress = 1;

        const easeProgress = 1 - Math.pow(1 - progress, 4);
        if (easeProgress <= 0) return;

        const y = startY + 26 + i * rowHeight;
        const isMe = entry.player_name === localName;
        const xOffset = (1 - easeProgress) * 50;
        const currentAlpha = easeProgress;

        ctx.save();
        ctx.translate(xOffset, 0);
        ctx.globalAlpha = currentAlpha;

        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';

        if (i === 0) {
          const pulse = 0.5 + 0.5 * Math.sin(now * 0.005);
          setGlow('#fb29fd', 12 + pulse * 15);
          ctx.fillStyle = '#fb29fd';
        } else if (isMe) {
          setGlow('#dd32b3', 15);
          ctx.fillStyle = '#dd32b3';
        } else if (i === 1) {
          setGlow('#d9d4ff', 10);
          ctx.fillStyle = '#d9d4ff';
        } else if (i === 2) {
          setGlow('#2e3bf0', 8);
          ctx.fillStyle = '#2e3bf0';
        } else {
          setGlow(i % 2 === 0 ? '#2e3bf0' : '#4216d2', 8);
          ctx.fillStyle = '#d9d4ff';
        }

        const textY = y - 2 + rowHeight / 2;
        if (isMe) {
          ctx.globalAlpha = currentAlpha * 0.14;
          ctx.strokeStyle = '#dd32b3';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(leftX - 8, textY + rowHeight * 0.45);
          ctx.lineTo(killsX + 8, textY + rowHeight * 0.45);
          ctx.stroke();
          ctx.globalAlpha = currentAlpha;
        }
        ctx.fillText((i + 1) + '.', leftX, textY);
        ctx.fillText(entry.player_name, nameX, textY);
        ctx.textAlign = 'right';
        ctx.fillText(entry.score, scoreX, textY);
        ctx.fillText(entry.kills, killsX, textY);
        clearGlow();
        ctx.restore();
      });
    }

    clearGlow();
    ctx.textAlign = 'center';
    const pulse2 = 0.6 + 0.4 * Math.sin(now * 0.002);
    const footerHintSize = Math.round(Math.max(12, 13 * layoutScale));
    const footerStatusSize = Math.round(Math.max(11, 12 * layoutScale));
    const footerHintY = H - 28;
    const footerStatusY = footerHintY - Math.max(24, footerHintSize + 10);

    ctx.textBaseline = 'bottom';
    ctx.globalAlpha = pulse2;
    setGlow('#2e3bf0', 10);
    ctx.fillStyle = '#d9d4ff';
    ctx.font = `bold ${footerHintSize}px monospace`;
    ctx.fillText('[ ESC OR BACKSPACE TO RETURN ]', cx, footerHintY);

    if (this.submitMessage) {
      ctx.textBaseline = 'middle';
      ctx.globalAlpha = 0.92;
      setGlow(this.submitOk ? '#2e3bf0' : '#ff5544', 12);
      ctx.fillStyle = this.submitOk ? '#d9d4ff' : '#ff8a80';
      ctx.font = `bold ${footerStatusSize}px monospace`;
      ctx.fillText(this.submitMessage, cx, footerStatusY);
    }

    clearGlow();
    ctx.restore();
  }
};

const BAD_WORDS = [
  'fuck','shit','ass','bitch','cunt','dick','cock','pussy','fag','faggot',
  'nigger','nigga','nig','spic','chink','kike','gook','wetback','cracker',
  'retard','tranny','slut','whore','bastard','piss','cum','rape','nazi',
  'kkk','coon','jigaboo','beaner','towelhead','raghead','dyke','homo',
];

function containsBadWord(name) {
  const lower = name.toLowerCase();
  return BAD_WORDS.some(w => lower.includes(w));
}

const nameEntry = {
  name: loadPlayerName() || '',
  rejectTimer: 0,
  update(delta) {
    if (this.rejectTimer > 0) this.rejectTimer -= delta;
    if (justPressed['Enter']) {
      if (this.name.length > 0) {
        if (containsBadWord(this.name)) {
          this.rejectTimer = 2000;
        } else {
          writePlayerName(this.name);
          leaderboard.submitMessage = 'SUBMITTING SCORE...';
          leaderboard.submitOk = true;
          gameState = 'leaderboard';
          leaderboard.submitScore(player.score, stage.totalKills);
          leaderboard.fetchScores();
        }
      }
    } else if (justPressed['Backspace']) {
      this.name = this.name.slice(0, -1);
      this.rejectTimer = 0;
    } else {
      for (const k in justPressed) {
        if (k.length === 1 && /[a-zA-Z0-9]/.test(k) && this.name.length < 12) {
          this.name += k.toUpperCase();
          this.rejectTimer = 0;
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
    const rejected = this.rejectTimer > 0;
    ctx.fillStyle = rejected ? '#ff3333' : '#ffffff';
    if (rejected) { ctx.shadowColor = '#ff0000'; ctx.shadowBlur = 16; }
    ctx.font = 'bold 48px monospace';
    const cursor = (Math.floor(getNow() / 500) % 2 === 0) ? '_' : '';
    ctx.fillText(this.name + cursor, cx, cy + 20);
    ctx.shadowBlur = 0;

    ctx.font = '14px monospace';
    ctx.fillStyle = rejected ? '#ff6666' : '#888888';
    const hint = rejected ? 'INVALID CALLSIGN' : this.name.length > 0 ? 'PRESS ENTER TO CONFIRM' : 'TYPE YOUR CALLSIGN';
    ctx.fillText(hint, cx, cy + 80);
    ctx.restore();
  }
};

function drawStageNodes(options = {}) {
  const W = canvas.width, H = canvas.height;
  const layoutScale = Math.max(0.72, Math.min(1.08, Math.min(W / 1280, H / 720)));
  const compact = W < 920;
  const nodeCount   = 10;
  const progressScale = options.scale ?? 1;
  const nodeSpacing = (compact ? 26 : 38) * progressScale;
  const totalWidth  = (nodeCount - 1) * nodeSpacing;
  const startX      = W / 2 - totalWidth / 2;
  const y           = options.y ?? (H * 0.82);
  const labelOffset = (compact ? 22 : 28) * progressScale;
  const nodeRadius = (compact ? 5.5 : 7.5) * Math.max(1, progressScale * 0.95);
  const lineInset = nodeRadius + 6 * progressScale;

  ctx.save();
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'bottom';
  ctx.font         = `bold ${Math.round(Math.max(10, 12 * layoutScale * progressScale))}px monospace`;
  ctx.globalAlpha  = 0.64;
  setGlow('#b566ff', 10);
  ctx.fillStyle = '#9933ff';
  ctx.fillText('RUN PROGRESSION', W / 2, y - labelOffset);

  clearGlow();
  ctx.globalAlpha = 0.28;
  ctx.strokeStyle = '#6d2ab0';
  ctx.lineWidth   = Math.max(2, 2.4 * progressScale);
  ctx.beginPath();
  ctx.moveTo(startX + lineInset, y);
  ctx.lineTo(startX + totalWidth - lineInset, y);
  ctx.stroke();

  for (let i = 0; i < nodeCount; i++) {
    const nx      = startX + i * nodeSpacing;
    const reached = (i + 1) <= furthestStage;
    ctx.save();
    ctx.globalAlpha = reached ? 1 : 0.18;
    if (reached) {
      setGlow('#9933ff', 18);
      ctx.fillStyle = '#cc88ff';
    } else {
      clearGlow();
      ctx.fillStyle = '#555555';
    }
    ctx.beginPath();
    ctx.arc(nx, y, nodeRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  clearGlow();
  ctx.restore();
}

function drawTitleScreen() {
  const W = canvas.width, H = canvas.height;
  const cx = W / 2, cy = H / 2;
  const now = getNow();
  const layout = getTitleScreenLayout();
  const { headingY, startRunY, tutorialY, leaderboardY, dividerY, statsY, statXs, stageNodesY, layoutScale, compact, dividerWidth } = layout;
  const flicker = 0.9 + 0.1 * Math.sin(now * 0.014) * Math.sin(now * 0.029);
  const menuPulse = 0.6 + 0.4 * Math.sin(now * 0.0032);
  const barProg  = Math.min(1, (now - titleSelectionChangedAt) / 220);
  const barEase  = 1 - Math.pow(1 - barProg, 3);
  const headingFontSize = Math.round(Math.max(74, Math.min(126, 126 * layoutScale)));
  const actionFontSize = Math.round(Math.max(28, Math.min(42, 42 * layoutScale)));
  const statValueFontSize = Math.round(Math.max(20, Math.min(28, 28 * layoutScale)));
  const statLabelFontSize = Math.round(Math.max(10, Math.min(11, 11 * layoutScale)));

  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, W, H);
  waveField.draw();
  starField.draw();

  const vignette = ctx.createRadialGradient(cx, cy * 0.92, Math.min(W, H) * 0.12, cx, cy, Math.max(W, H) * 0.76);
  vignette.addColorStop(0, 'rgba(99,60,180,0.06)');
  vignette.addColorStop(0.45, 'rgba(16,8,28,0.08)');
  vignette.addColorStop(1, 'rgba(0,0,0,0.72)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, W, H);

  ctx.save();
  ctx.globalAlpha = 0.08;
  ctx.fillStyle = '#818cf8';
  for (let y = 0; y < H; y += 4) ctx.fillRect(0, y, W, 1);
  ctx.restore();

  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const drawNeonWord = (text, y, fontSize, palette, dropoutScale = 0.3) => {
    ctx.font = `${fontSize}px "anatol-mn", sans-serif`;
    const letters = text.split('');
    const spacing = Math.max(3, fontSize * 0.04);
    const widths = letters.map(ch => ch === ' ' ? fontSize * 0.42 : ctx.measureText(ch).width);
    const totalWidth = widths.reduce((sum, width) => sum + width, 0) + spacing * (letters.length - 1);
    let drawX = cx - totalWidth / 2;

    const drawLayer = (alphaBase, blur, fill, glowColor, dropout) => {
      drawX = cx - totalWidth / 2;
      ctx.fillStyle = fill;
      ctx.shadowColor = glowColor;
      ctx.shadowBlur = blur;
      letters.forEach((ch, i) => {
        const charWidth = widths[i];
        const charCenter = drawX + charWidth / 2;
        const noise = 0.76 + 0.24 * (0.5 + 0.5 * Math.sin(now * 0.021 + i * 0.9));
        const drop = ch === ' ' ? 1 : Math.max(0.52, 1 - dropout * (0.5 + 0.5 * Math.sin(now * 0.013 + i * 0.5)) * ((i % 3) === 1 ? 0.42 : 0.16));
        ctx.globalAlpha = alphaBase * flicker * noise * drop;
        ctx.fillText(ch, charCenter, y);
        drawX += charWidth + spacing;
      });
    };

    drawLayer(0.04, 90, palette[0], palette[1], dropoutScale * 0.4);
    drawLayer(0.12, 50, palette[1], palette[2], dropoutScale * 0.6);
    drawLayer(0.55, 24, palette[2], palette[2], dropoutScale * 0.8);
    drawLayer(1.0, 8, palette[3], palette[3], dropoutScale);
    ctx.shadowBlur = 0;
    ctx.shadowColor = 'transparent';
  };

  drawNeonWord('Techno Drone', headingY, headingFontSize, ['#5b21b6', '#6d28d9', '#8b5cf6', '#c4b5fd']);
  ctx.shadowBlur = 0;
  ctx.shadowColor = 'transparent';

  const options = [
    { label: 'START RUN', y: startRunY },
    { label: 'TUTORIAL', y: tutorialY },
    { label: 'LEADERBOARD', y: leaderboardY }
  ];

  options.forEach((option, idx) => {
    const isSelected = titleSelection === idx;
    const isHovered = isTitleOptionHovered(idx);
    const isActive = isSelected || isHovered;
    ctx.globalAlpha = isActive ? (0.18 + menuPulse * 0.06) : 0.05;
    ctx.fillStyle = 'rgba(139,92,246,0.10)';
    const glowWidth = getTitleOptionWidth(option.label, actionFontSize) + 48 * layoutScale;
    ctx.fillRect(cx - glowWidth / 2, option.y - 22 * layoutScale, glowWidth, 44 * layoutScale);
    drawTitleActionText(option.label, option.y, actionFontSize, isActive);
  });

  ctx.globalAlpha = 0.18;
  ctx.strokeStyle = '#818cf8';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx - dividerWidth / 2, dividerY);
  ctx.lineTo(cx + dividerWidth / 2, dividerY);
  ctx.stroke();

  const stats = [
    { label: 'BEST SCORE', value: `${save.highScore}`, color: '#a5b4fc' }
  ];

  stats.forEach((stat, i) => {
    const sx = cx;
    ctx.globalAlpha = 0.52;
    ctx.fillStyle = stat.color;
    ctx.font = `bold ${statLabelFontSize}px monospace`;
    ctx.fillText(stat.label, sx, statsY - 16 * layoutScale);

    ctx.globalAlpha = 1;
    setGlow(stat.color, 10);
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${statValueFontSize}px monospace`;
    ctx.fillText(stat.value, sx, statsY + 14 * layoutScale);
    clearGlow();
  });

  drawStageNodes({ y: stageNodesY, scale: compact ? 0.88 : 0.96 });
  ctx.restore();
}

function getTitleOptionWidth(label, fontSize) {
  ctx.save();
  ctx.font = `bold ${fontSize}px monospace`;
  const width = ctx.measureText(label).width;
  ctx.restore();
  return width;
}

function drawTitleActionText(label, y, fontSize, isActive) {
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `bold ${fontSize}px monospace`;

  if (isActive) {
    ctx.globalAlpha = 0.24;
    setGlow('#8b5cf6', 28);
    ctx.fillStyle = '#8b5cf6';
    ctx.fillText(label, canvas.width / 2, y);
  }

  ctx.globalAlpha = 1;
  setGlow(isActive ? '#8b5cf6' : 'transparent', isActive ? 12 : 0);
  ctx.fillStyle = '#ffffff';
  ctx.fillText(label, canvas.width / 2, y);
  clearGlow();
  ctx.restore();
}

function isTitleOptionHovered(idx) {
  const layout = getTitleScreenLayout();
  const actionFontSize = Math.round(Math.max(28, Math.min(42, 42 * layout.layoutScale)));
  const options = [
    { label: 'START RUN', y: layout.startRunY },
    { label: 'TUTORIAL', y: layout.tutorialY },
    { label: 'LEADERBOARD', y: layout.leaderboardY }
  ];
  const option = options[idx];
  if (!option) return false;
  const hitPaddingX = 32 * layout.layoutScale;
  const hitPaddingY = 22 * layout.layoutScale;
  const width = getTitleOptionWidth(option.label, actionFontSize);
  return (
    Math.abs(mouseX - canvas.width / 2) <= (width / 2 + hitPaddingX) &&
    Math.abs(mouseY - option.y) <= hitPaddingY
  );
}

function getTitleScreenLayout() {
  const W = canvas.width, H = canvas.height;
  const cx = W / 2, cy = H / 2;
  const layoutScale = Math.max(0.72, Math.min(1.08, Math.min(W / 1280, H / 720)));
  const compact = W < 920;
  const headingY = cy - 122 * layoutScale;
  const startRunY = cy + 18 * layoutScale;
  const tutorialY = startRunY + 34 * layoutScale;
  const leaderboardY = tutorialY + 34 * layoutScale;
  const dividerY = leaderboardY + 34 * layoutScale;
  const statsY = dividerY + 42 * layoutScale;
  const dividerWidth = Math.min(W * 0.52, 320 * layoutScale);
  const statGap = compact ? Math.min(180 * layoutScale, W * 0.34) : Math.min(220 * layoutScale, W * 0.28);
  const statXs = [cx - statGap / 2, cx + statGap / 2];
  const stageNodesY = statsY + 76 * layoutScale;

  return {
    headingY,
    startRunY,
    tutorialY,
    leaderboardY,
    dividerY,
    statsY,
    dividerWidth,
    statXs,
    stageNodesY,
    layoutScale,
    compact
  };
}

function drawEndScreen(title, accentColor, subtitle, prompt) {
  const W = canvas.width, H = canvas.height;
  const cx = W / 2, cy = H / 2;
  const now = getNow();
  const pulse = 0.6 + 0.4 * Math.sin(now * 0.003);
  const panelW = Math.min(620, W - 120);
  const panelH = 420;
  const px = cx - panelW / 2;
  const py = cy - panelH / 2;
  const scoreIsBest = player.score > 0 && player.score >= save.highScore;

  ctx.save();
  ctx.fillStyle = '#030303';
  ctx.fillRect(0, 0, W, H);
  starField.draw();

  ctx.globalAlpha = 0.08;
  ctx.strokeStyle = COLOR_CYAN;
  ctx.lineWidth = 1;
  for (let y = 0; y < H; y += 4) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }

  const bgGrad = ctx.createLinearGradient(px, py, px + panelW, py + panelH);
  bgGrad.addColorStop(0, 'rgba(5,12,22,0.92)');
  bgGrad.addColorStop(1, 'rgba(10,4,14,0.92)');
  ctx.globalAlpha = 1;
  ctx.fillStyle = bgGrad;
  ctx.fillRect(px, py, panelW, panelH);

  ctx.globalAlpha = 0.24;
  ctx.fillStyle = accentColor;
  ctx.fillRect(px, py, panelW, 4);

  setGlow(COLOR_CYAN, 24);
  ctx.strokeStyle = COLOR_CYAN;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(px, py, panelW, panelH);
  clearGlow();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  ctx.globalAlpha = 0.18;
  setGlow(accentColor, 50);
  ctx.fillStyle = accentColor;
  ctx.font = 'bold 72px monospace';
  ctx.fillText(title, cx, py + 70);

  ctx.globalAlpha = 1;
  setGlow('#ffffff', 10);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 54px monospace';
  ctx.fillText(title, cx, py + 70);
  clearGlow();

  if (subtitle) {
    ctx.globalAlpha = 0.82;
    ctx.fillStyle = accentColor;
    ctx.font = 'bold 18px monospace';
    ctx.fillText(subtitle, cx, py + 118);
  }

  ctx.globalAlpha = 0.25;
  ctx.strokeStyle = COLOR_CYAN;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(px + 40, py + 146);
  ctx.lineTo(px + panelW - 40, py + 146);
  ctx.stroke();

  setGlow(scoreIsBest ? COLOR_CYAN : COLOR_PINK, 18);
  ctx.fillStyle = scoreIsBest ? COLOR_CYAN : '#ffffff';
  ctx.font = '12px monospace';
  ctx.fillText('FINAL SCORE', cx, py + 184);
  ctx.font = 'bold 46px monospace';
  ctx.fillText(String(player.score), cx, py + 228);
  clearGlow();

  const statY = py + 292;
  const statGap = 150;
  const statItems = [
    { label: 'STAGE', value: `${Math.min(stage.current, 10)} / 10`, color: COLOR_CYAN },
    { label: 'KILLS', value: `${stage.totalKills}`, color: COLOR_PINK },
    { label: 'BEST', value: `${save.highScore}`, color: '#ffffff' },
  ];

  statItems.forEach((item, i) => {
    const sx = cx + (i - 1) * statGap;
    ctx.globalAlpha = 0.16;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(sx - 56, statY - 30, 112, 70);

    ctx.globalAlpha = 0.9;
    ctx.fillStyle = item.color;
    ctx.font = 'bold 12px monospace';
    ctx.fillText(item.label, sx, statY - 10);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px monospace';
    ctx.fillText(item.value, sx, statY + 18);
  });

  const history = save.runs.slice(-4);
  if (history.length > 1) {
    ctx.globalAlpha = 0.32;
    ctx.fillStyle = COLOR_CYAN;
    ctx.font = '11px monospace';
    history.forEach((r, i) => {
      const runNum = save.runs.length - history.length + i + 1;
      ctx.fillText(`RUN ${runNum}  ${r.score}  ${r.kills}K`, cx, py + 354 + i * 14);
    });
  }

  ctx.globalAlpha = pulse * 0.7 + 0.2;
  setGlow(accentColor, 14);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 14px monospace';
  ctx.fillText(prompt, cx, py + panelH - 28);
  clearGlow();

  ctx.restore();
}

function drawDeathScreen() {
  const W = canvas.width, H = canvas.height;
  const cx = W / 2, cy = H / 2;
  const now = getNow();
  const scoreIsBest = player.score > 0 && player.score >= save.highScore;
  const layoutScale = Math.max(0.72, Math.min(1.08, Math.min(W / 1280, H / 720)));
  const compact = W < 920;
  const headingY = cy - 160 * layoutScale;
  const labelY = cy + 18 * layoutScale;
  const scoreY = cy + 78 * layoutScale;
  const dividerY = cy + 114 * layoutScale;
  const statsY = cy + 156 * layoutScale;
  const controlsY = cy + 235 * layoutScale;
  const flicker = 0.88 + 0.12 * Math.sin(now * 0.017) * Math.sin(now * 0.031);
  const pulse = 0.6 + 0.4 * Math.sin(now * 0.003);
  const selectPulse = 0.65 + 0.35 * Math.sin(now * 0.005);
  const selectProg = Math.min(1, (now - endScreenSelectionChangedAt) / 180);
  const selectEase = 1 - Math.pow(1 - selectProg, 3);
  const glitchPulse = 0.5 + 0.5 * Math.sin(now * 0.013);
  const headingFontSize = Math.round(Math.max(68, Math.min(110, 110 * layoutScale)));
  const scoreFontSize = Math.round(Math.max(42, Math.min(64, 64 * layoutScale)));
  const statValueFontSize = Math.round(Math.max(20, Math.min(28, 28 * layoutScale)));
  const statLabelFontSize = Math.round(Math.max(10, Math.min(11, 11 * layoutScale)));
  const controlFontSize = Math.round(Math.max(12, Math.min(14, 14 * layoutScale)));
  const bestTagFontSize = Math.round(Math.max(11, Math.min(13, 13 * layoutScale)));
  const dividerWidth = Math.min(W * 0.52, 320 * layoutScale);
  const statGap = compact ? Math.min(120 * layoutScale, W * 0.24) : Math.min(180 * layoutScale, W * 0.21);
  const statXs = [cx - statGap, cx, cx + statGap];

  ctx.save();

  ctx.fillStyle = '#030303';
  ctx.fillRect(0, 0, W, H);
  starField.draw();

  const vignette = ctx.createRadialGradient(cx, cy * 0.92, Math.min(W, H) * 0.12, cx, cy, Math.max(W, H) * 0.76);
  vignette.addColorStop(0, 'rgba(255,32,0,0.05)');
  vignette.addColorStop(0.45, 'rgba(18,0,0,0.08)');
  vignette.addColorStop(1, 'rgba(0,0,0,0.72)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, W, H);

  ctx.globalAlpha = 0.08;
  ctx.fillStyle = COLOR_CYAN;
  for (let y = 0; y < H; y += 4) ctx.fillRect(0, y, W, 1);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const heading = 'GAME OVER';
  const headingLetters = heading.split('');
  ctx.font = `bold ${headingFontSize}px monospace`;
  const spacing = Math.max(4, headingFontSize * 0.04);
  const letterWidths = headingLetters.map(ch => ch === ' ' ? headingFontSize * 0.42 : ctx.measureText(ch).width);
  const totalHeadingWidth = letterWidths.reduce((sum, width) => sum + width, 0) + spacing * (headingLetters.length - 1);
  let drawX = cx - totalHeadingWidth / 2;

  const drawNeonHeading = (alphaBase, blur, fill, glowColor, dropoutScale) => {
    drawX = cx - totalHeadingWidth / 2;
    ctx.fillStyle = fill;
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = blur;
    headingLetters.forEach((ch, i) => {
      const charWidth = letterWidths[i];
      const charCenter = drawX + charWidth / 2;
      const noise = 0.76 + 0.24 * (0.5 + 0.5 * Math.sin(now * 0.021 + i * 0.9));
      const dropout = ch === ' ' ? 1 : Math.max(0.42, 1 - dropoutScale * glitchPulse * ((i % 3) === 1 ? 0.55 : 0.18));
      ctx.globalAlpha = alphaBase * flicker * noise * dropout;
      ctx.fillText(ch, charCenter, headingY);
      drawX += charWidth + spacing;
    });
  };

  drawNeonHeading(0.04, 90, '#ff0000', '#ff0000', 0.12);
  drawNeonHeading(0.12, 50, '#ff2200', '#ff0000', 0.18);
  drawNeonHeading(0.55, 24, '#ff3300', '#ff2200', 0.24);
  drawNeonHeading(1.0, 8, '#ff5544', '#ff5544', 0.3);
  ctx.shadowBlur = 0;
  ctx.shadowColor = 'transparent';

  ctx.globalAlpha = 0.5;
  ctx.fillStyle = COLOR_CYAN;
  ctx.font = `${Math.round(Math.max(11, 12 * layoutScale))}px monospace`;
  ctx.fillText('FINAL SCORE', cx, labelY);

  if (scoreIsBest) {
    const bestPulse = 0.72 + 0.28 * (0.5 + 0.5 * Math.sin(now * 0.008));
    ctx.globalAlpha = 0.88 * bestPulse;
    setGlow(COLOR_CYAN, 14 + bestPulse * 10);
    ctx.fillStyle = '#d9ffff';
    ctx.font = `bold ${bestTagFontSize}px monospace`;
    ctx.fillText('NEW ALL-TIME BEST', cx, labelY - 22 * layoutScale);
    clearGlow();
  }

  ctx.globalAlpha = 1;
  setGlow(scoreIsBest ? COLOR_CYAN : COLOR_PINK, scoreIsBest ? 24 : 20);
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${scoreFontSize}px monospace`;
  ctx.fillText(`${player.score}`, cx, scoreY);
  clearGlow();

  ctx.globalAlpha = 0.18;
  ctx.strokeStyle = COLOR_CYAN;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx - dividerWidth / 2, dividerY);
  ctx.lineTo(cx + dividerWidth / 2, dividerY);
  ctx.stroke();

  const stats = [
    { label: 'STAGE', value: `${Math.min(stage.current, 10)} / 10`, color: COLOR_CYAN },
    { label: 'KILLS', value: `${stage.totalKills}`, color: COLOR_PINK },
    { label: 'ALL-TIME BEST', value: `${save.highScore}`, color: '#aaaaaa' }
  ];

  stats.forEach((stat, i) => {
    const sx = statXs[i];
    ctx.globalAlpha = 0.52;
    ctx.fillStyle = stat.color;
    ctx.font = `bold ${statLabelFontSize}px monospace`;
    ctx.fillText(stat.label, sx, statsY - 16 * layoutScale);

    ctx.globalAlpha = 1;
    setGlow(stat.color, i === 2 ? 8 : 10);
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${statValueFontSize}px monospace`;
    ctx.fillText(stat.value, sx, statsY + 14 * layoutScale);
    clearGlow();
  });

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `bold ${controlFontSize}px monospace`;
  const options = [
    { label: '[ R - START NEW RUN ]', y: controlsY, activeGlow: COLOR_PINK, activeFill: '#ffffff', idleFill: '#8f8f8f' },
    { label: '[ M - MAIN MENU ]', y: controlsY + 30 * layoutScale, activeGlow: '#bbbbbb', activeFill: '#d7d7d7', idleFill: '#7a7a7a' }
  ];

  options.forEach((option, idx) => {
    const isSelected = endScreenSelection === idx;
    const tw = ctx.measureText(option.label).width;

    if (isSelected) {
      const cardW = tw + 36 * layoutScale;
      const cardH = 24 * layoutScale;
      const cardX = cx - cardW / 2;
      const cardY = option.y - cardH / 2;
      const cardGlow = ctx.createLinearGradient(cardX, cardY, cardX + cardW, cardY);
      cardGlow.addColorStop(0, 'rgba(255,255,255,0)');
      cardGlow.addColorStop(0.5, idx === 0 ? 'rgba(255,0,127,0.10)' : 'rgba(255,255,255,0.08)');
      cardGlow.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.globalAlpha = 0.45 * selectEase;
      ctx.fillStyle = cardGlow;
      ctx.fillRect(cardX, cardY, cardW, cardH);
    }

    ctx.globalAlpha = isSelected ? (pulse * 0.85 + 0.1) : 0.28;
    setGlow(isSelected ? option.activeGlow : 'transparent', isSelected ? 12 : 0);
    ctx.fillStyle = isSelected ? option.activeFill : option.idleFill;
    ctx.fillText(option.label, cx, option.y);

    if (isSelected) {
      const bracketOffset = tw / 2 + 20 * layoutScale;
      const slide = (1 - selectEase) * 12;
      ctx.globalAlpha = 0.6 + selectPulse * 0.4;
      ctx.fillStyle = option.activeFill;
      setGlow(option.activeGlow, 14);
      ctx.fillText('[', cx - bracketOffset + slide, option.y);
      ctx.fillText(']', cx + bracketOffset - slide, option.y);
    }
    clearGlow();
  });

  ctx.globalAlpha = 1;
  clearGlow();
  ctx.restore();
}

function drawWinScreen() {
  drawEndScreen(
    'MISSION COMPLETE',
    COLOR_CYAN,
    'ALL 10 STAGES CLEARED',
    '[ R - PLAY AGAIN ]'
  );
}

let paused       = false;
let pauseSel     = 0;
let soundEnabled = true;

function drawPauseMenu() {
  const W = canvas.width, H = canvas.height;
  const cx = W / 2, cy = H / 2;

  ctx.save();
  ctx.globalAlpha = 0.78;
  ctx.fillStyle   = '#020206';
  ctx.fillRect(0, 0, W, H);
  const ambient = ctx.createRadialGradient(cx, cy - 12, 40, cx, cy, 340);
  ambient.addColorStop(0, 'rgba(129, 235, 255, 0.10)');
  ambient.addColorStop(0.38, 'rgba(90, 160, 255, 0.05)');
  ambient.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.globalAlpha = 1;
  ctx.fillStyle = ambient;
  ctx.fillRect(0, 0, W, H);

  const pw = 392, ph = 342;
  const px = cx - pw / 2, py = cy - ph / 2;

  const panelGrad = ctx.createLinearGradient(px, py, px + pw, py + ph);
  panelGrad.addColorStop(0, 'rgba(7, 12, 22, 0.78)');
  panelGrad.addColorStop(0.52, 'rgba(4, 8, 18, 0.72)');
  panelGrad.addColorStop(1, 'rgba(8, 12, 25, 0.80)');
  ctx.fillStyle = panelGrad;
  _roundRect(ctx, px, py, pw, ph, 18);
  ctx.fill();

  ctx.globalAlpha = 0.16;
  setGlow(COLOR_CYAN, 30);
  ctx.strokeStyle = COLOR_CYAN;
  ctx.lineWidth = 2;
  _roundRect(ctx, px, py, pw, ph, 18);
  ctx.stroke();
  clearGlow();

  ctx.globalAlpha = 0.4;
  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.lineWidth = 1;
  _roundRect(ctx, px + 7, py + 7, pw - 14, ph - 14, 14);
  ctx.stroke();
  ctx.globalAlpha = 1;

  ctx.globalAlpha = 0.12;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(px + 26, py + 82, pw - 52, 1);
  ctx.globalAlpha = 1;

  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.font         = 'bold 34px monospace';
  setGlow(COLOR_CYAN, 34);
  ctx.fillStyle = COLOR_CYAN;
  ctx.fillText('PAUSED', cx, py + 52);
  ctx.globalAlpha = 0.32;
  ctx.fillStyle = '#f3f0ff';
  clearGlow();
  ctx.font = '11px monospace';
  ctx.fillText('SYSTEM HOLD // SESSION FROZEN', cx, py + 76);
  ctx.globalAlpha = 1;

  PAUSE_ITEMS.forEach((item, i) => {
    const iy      = py + 120 + i * 42;
    const sel     = i === pauseSel;
    let label     = item;
    
    if (item === 'MUSIC VOL') {
      const vol = parseInt(localStorage.getItem('drone_music_vol') || '20', 10);
      const bars = Math.round(vol / 10);
      label = `MUSIC VOL  [${'|'.repeat(bars)}${' '.repeat(10 - bars)}]`;
    } else if (item === 'SFX') {
      const sfxOn = localStorage.getItem('drone_sfx_on') !== '0';
      label = `SFX        [${sfxOn ? 'ON ' : 'OFF'}]`;
    }

    if (sel) {
      const chipW = Math.min(318, Math.max(220, ctx.measureText(label).width + 48));
      const chipX = cx - chipW / 2;
      const chipY = iy - 17;
      ctx.globalAlpha = 0.38;
      ctx.fillStyle = '#000840';
      _roundRect(ctx, chipX, chipY, chipW, 34, 10);
      ctx.fill();
      ctx.globalAlpha = 0.85;
      setGlow(COLOR_CYAN, 16);
      ctx.strokeStyle = COLOR_CYAN;
      ctx.lineWidth = 1.2;
      _roundRect(ctx, chipX, chipY, chipW, 34, 10);
      ctx.stroke();
      clearGlow();
    }

    setGlow(sel ? '#ffffff' : COLOR_CYAN, sel ? 22 : 8);
    ctx.fillStyle   = sel ? '#ffffff' : COLOR_CYAN;
    ctx.globalAlpha = sel ? 1 : 0.62;
    ctx.font        = `${sel ? 'bold ' : ''}21px monospace`;
    ctx.fillText(label, cx, iy);
    ctx.globalAlpha = 1;
  });

  clearGlow();
  ctx.restore();
}

function drawCenterWatermark() {
  return;
}

function _drawDiamond(ix, iy, iconH, filled, pulse) {
  ctx.beginPath();
  ctx.moveTo(ix, iy - iconH);
  ctx.lineTo(ix + iconH * 0.6, iy);
  ctx.lineTo(ix, iy + iconH);
  ctx.lineTo(ix - iconH * 0.6, iy);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

function _divider(tx, cy, barW, alpha = 0.12) {
  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(tx, cy, barW, 1);
  ctx.globalAlpha = 1;
  return cy + 20;
}

function _label(tx, cy, text, color = '#555555', size = 11) {
  ctx.font = `${size}px monospace`;
  ctx.fillStyle = color;
  clearGlow();
  ctx.fillText(text, tx, cy);
  return cy + size + 5;
}

function _bar(tx, cy, barW, frac, color, trackAlpha = 0.14, h = 8) {
  ctx.globalAlpha = trackAlpha;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(tx, cy, barW, h);
  ctx.globalAlpha = 1;
  if (frac > 0) {
    ctx.fillStyle = color;
    ctx.fillRect(tx, cy, barW * Math.max(0, Math.min(1, frac)), h);
  }
  return cy + h + 6;
}

function drawHUD() {
  if (PANEL_W < 120) return;

  const hudNavy   = '#000840';
  const hudBlue   = '#2e3bf0';
  const hudPurple = '#4216d2';
  const hudPink   = '#dd32b3';
  const hudHot    = '#fb29fd';
  const hudColor   = hudBlue;
  const hudMuted   = '#8f78d8';
  const infoColor  = '#f3f0ff';
  const infoGlow   = '#c9b8ff';
  const scoreColor = infoColor;
  const scoreGlow  = infoGlow;
  const killsColor = '#d9d4ff';
  const killsGlow  = '#b8a8ff';
  const livesColor = '#49f2c2';
  const livesLabelColor = '#8cf5d7';
  const nukeColor  = hudPink;
  const nukeReadyColor = hudHot;
  const nukeLabelColor = '#f08fe0';
  const spreadColor = '#ffd400';
  const spreadHighlight = '#fff0a8';
  const bassColor = '#a3122a';
  const bassHighlight = '#ff9aad';
  const overdriveFrac = player.overdriveActive
    ? player.overdriveTimer / player.OVERDRIVE_DURATION
    : player.overdriveCharge / player.OVERDRIVE_MAX;
  const heatFrac   = Math.max(0, Math.min(1, player.heat / 100));
  const heatColor  = heatFrac > 0.75 ? hudHot : heatFrac > 0.45 ? hudPink : hudBlue;
  const heatPulse  = 0.55 + 0.45 * Math.sin(getNow() * 0.012);
  const nukeUsesLeft = player.ultUses;

  ctx.save();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  const px = PANEL_X, py = PANEL_Y, pw = PANEL_W, ph = PANEL_H;
  const pad = Math.max(20, Math.min(34, pw * 0.07));
  const tx  = px + pad;
  const barW = pw - pad * 2;
  ctx.globalAlpha = 1;

  const traceSlantedBox = (x, y, w, h, cut = 8) => {
    const c = Math.max(2, Math.min(cut, Math.min(w, h) * 0.45));
    ctx.beginPath();
    ctx.moveTo(x + c, y);
    ctx.lineTo(x + w, y);
    ctx.lineTo(x + w - c, y + h);
    ctx.lineTo(x, y + h);
    ctx.closePath();
  };

  const drawHudLabel = (text, x, y, color = hudMuted, glow = color, size = 13, alpha = 0.86) => {
    ctx.save();
    ctx.font = `bold ${size}px monospace`;
    ctx.globalAlpha = alpha;
    setGlow(glow, 10);
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
    clearGlow();
    ctx.restore();
    return y + size + 6;
  };

  const drawPremiumBar = (x, y, width, frac, color, h = 12) => {
    const clamped = Math.max(0, Math.min(1, frac));
    ctx.save();
    ctx.globalAlpha = 0.28;
    ctx.fillStyle = hudNavy;
    traceSlantedBox(x, y, width, h, h * 0.72);
    ctx.fill();

    if (clamped > 0) {
      const fillW = Math.max(h, width * clamped);
      ctx.globalAlpha = 0.88;
      ctx.fillStyle = color;
      setGlow(color, 10);
      traceSlantedBox(x, y, fillW, h, h * 0.72);
      ctx.fill();

      ctx.globalAlpha = 0.22;
      ctx.fillStyle = '#ffffff';
      traceSlantedBox(x, y, fillW, Math.max(2, h * 0.18), Math.max(2, h * 0.18));
      ctx.fill();
      clearGlow();
    }
    ctx.restore();
    return y + h + 10;
  };

  const drawSegmentRow = (x, y, width, count, filledCount, color, label, activeReady = false, labelColor = hudMuted) => {
    const gap = 10;
    const segW = (width - gap * (count - 1)) / count;
    ctx.save();
    y = drawHudLabel(label, x, y, labelColor, color, 13, 0.84);
    for (let i = 0; i < count; i++) {
      const sx = x + i * (segW + gap);
      const filled = i < filledCount;
      const isPulse = activeReady && filled && i === filledCount - 1;
      ctx.globalAlpha = filled ? (isPulse ? 0.95 : 0.82) : 0.34;
      ctx.fillStyle = filled ? color : hudNavy;
      if (filled) setGlow(color, isPulse ? 16 : 8);
      traceSlantedBox(sx, y, segW, 12, 6);
      ctx.fill();
      clearGlow();
    }
    ctx.restore();
    return y + 26;
  };

  let cy = py + pad;

  cy = drawHudLabel('STAGE', tx, cy, '#7aa8ff', hudColor, 13, 0.82);
  ctx.font = `bold ${Math.min(34, Math.max(26, Math.floor(barW * 0.14)))}px monospace`;
  ctx.fillStyle = hudColor;
  setGlow(hudColor, 14);
  ctx.fillText(`${stage.current}`, tx, cy);
  clearGlow();
  cy += 52;

  cy = drawHudLabel('SCORE', tx, cy, '#cfc3ff', scoreGlow, 13, 0.84);
  ctx.font = `bold ${Math.min(46, Math.max(34, Math.floor(barW * 0.2)))}px monospace`;
  ctx.fillStyle = scoreColor;
  setGlow(scoreGlow, 20);
  ctx.fillText(player.score.toLocaleString(), tx, cy);
  clearGlow();
  cy += 48;

  cy = drawHudLabel('KILLS', tx, cy, '#bdaeff', killsGlow, 13, 0.84);
  ctx.font = `bold ${Math.min(46, Math.max(34, Math.floor(barW * 0.2)))}px monospace`;
  ctx.fillStyle = killsColor;
  setGlow(killsGlow, 18);
  ctx.fillText(String(stage.kills), tx, cy);
  clearGlow();
  cy += 48;

  cy = drawSegmentRow(tx, cy, barW, 3, Math.max(0, Math.min(3, player.lives)), livesColor, 'LIVES', false, livesLabelColor);
  cy += 6;
  cy = drawSegmentRow(tx, cy, barW, 3, Math.max(0, Math.min(3, nukeUsesLeft)), player.ultReady ? nukeReadyColor : nukeColor, 'NUKE', player.ultReady, nukeLabelColor);
  cy += 6;

  cy = drawHudLabel('HEAT', tx, cy, heatFrac > 0.45 ? heatColor : hudMuted, heatColor, 13, 0.84);
  if (heatFrac > 0.75) setGlow(heatColor, 10 * heatPulse);
  cy = drawPremiumBar(tx, cy, barW, heatFrac, heatColor, 14);
  clearGlow();
  cy += 8;
  const activeLabels = [];
  if (player.altFireType === 'spread') activeLabels.push('SPREAD SHOT');
  if (player.altFireType === 'bass') activeLabels.push('BASS PULSE');

  

  if (activeLabels.length < 0) {
    ctx.font = '14px monospace';
    ctx.fillStyle = '#4b445f';
    ctx.fillText('—', tx, cy);
    cy += 22;
  } else {
    activeLabels.forEach(label => {
      const chipColor = label === 'SPREAD SHOT'
        ? spreadColor
        : label === 'BASS PULSE'
          ? bassColor
          : hudColor;
      ctx.globalAlpha = 0.12;
      ctx.fillStyle = '#ffffff';
      traceSlantedBox(tx, cy - 2, barW, 28, 9);
      ctx.fill();
      ctx.globalAlpha = 0.92;
      setGlow(chipColor, 12);
      ctx.font = 'bold 14px monospace';
      ctx.fillStyle = chipColor;
      ctx.fillText(label, tx + 14, cy + 5);
      clearGlow();
      cy += 34;

      if (label === 'SPREAD SHOT') {
        const spreadFrac = Math.max(0, player.spreadFuel / player.SPREAD_MAX_FUEL);
        cy = drawPremiumBar(tx, cy - 2, barW, spreadFrac, spreadColor, 12);
        cy += 8;
      } else if (label === 'BASS PULSE') {
        const bassFrac = Math.max(0, player.bassFuel / player.BASS_MAX_FUEL);
        cy = drawPremiumBar(tx, cy - 2, barW, bassFrac, bassColor, 12);
        cy += 8;
      }
    });
  }

  clearGlow();
  ctx.restore();
}

let _vignetteCanvas = null;
let _scanlineCanvas = null;
let _overlayW = 0, _overlayH = 0;

function _buildOverlayCache() {
  const W = PLAY_W, H = PLAY_H;
  if (_overlayW === W && _overlayH === H && _vignetteCanvas && _scanlineCanvas) return;
  _overlayW = W;
  _overlayH = H;

  _vignetteCanvas = document.createElement('canvas');
  _vignetteCanvas.width = W;
  _vignetteCanvas.height = H;
  const vc = _vignetteCanvas.getContext('2d');
  const vg = vc.createRadialGradient(W / 2, H / 2, H * 0.22, W / 2, H / 2, Math.max(W, H) * 0.78);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,0.72)');
  vc.fillStyle = vg;
  vc.fillRect(0, 0, W, H);

  _scanlineCanvas = document.createElement('canvas');
  _scanlineCanvas.width = W;
  _scanlineCanvas.height = H;
  const sc = _scanlineCanvas.getContext('2d');
  sc.globalAlpha = 0.028;
  sc.fillStyle = '#000000';
  for (let y = 0; y < H; y += 4) sc.fillRect(0, y, W, 2);
}

function drawVignetteAndScanlines() {
  _buildOverlayCache();
  ctx.drawImage(_vignetteCanvas, PLAY_X, PLAY_Y);
  ctx.drawImage(_scanlineCanvas, PLAY_X, PLAY_Y);

  if (player.lives === 1) {
    const cx = PLAY_X + PLAY_W / 2, cy = PLAY_Y + PLAY_H / 2;
    const rg = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(PLAY_W, PLAY_H) * 0.7);
    rg.addColorStop(0, 'rgba(180,0,0,0.18)');
    rg.addColorStop(1, 'rgba(180,0,0,0)');
    ctx.save();
    ctx.beginPath();
    ctx.rect(PLAY_X, PLAY_Y, PLAY_W, PLAY_H);
    ctx.clip();
    ctx.fillStyle = rg;
    ctx.fillRect(PLAY_X, PLAY_Y, PLAY_W, PLAY_H);
    ctx.restore();
  }
}


let runtimeErrorMessage = '';

function reportRuntimeError(err) {
  const message = err && err.stack ? err.stack : String(err);
  runtimeErrorMessage = message;
  document.body.setAttribute('data-runtime-error', message);
  console.error(err);
}

function drawRuntimeErrorOverlay() {
  if (!runtimeErrorMessage) return;
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.88)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#ff5555';
  ctx.font = 'bold 18px monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  const lines = runtimeErrorMessage.split(/\r?\n/).slice(0, 8);
  ctx.fillText('RUNTIME ERROR', 20, 20);
  ctx.fillStyle = '#ffffff';
  lines.forEach((line, i) => ctx.fillText(line, 20, 56 + i * 22));
  ctx.restore();
}


const tutorial = {
  STEP_COMPLETE_HOLD_MS: 450,
  steps: [
    { id: 'move', title: 'MOVE - A / D', subtitle: 'SWEEP LEFT AND RIGHT THROUGH BOTH MARKERS', focus: null, accent: COLOR_CYAN, minTime: 2200 },
    { id: 'shoot', title: 'FIRE - HOLD J OR MOUSE', subtitle: 'KILL 5 // STAND STILL TO FIRE FASTER', focus: null, accent: '#ffffff', minTime: 2800 },
    { id: 'heat', title: 'FIRING BUILDS HEAT', subtitle: 'RELEASE FIRE TO COOL BACK DOWN', focus: 'shipArc', accent: '#ff8800', minTime: 2600 },
    { id: 'dash', title: 'DASH - SPACE + A / D', subtitle: 'DASH THROUGH THE SIDE TARGETS ON YOUR LANE', focus: null, accent: COLOR_CYAN, minTime: 2600 },
    { id: 'refund', title: 'DASH VENTS HEAT', subtitle: 'BUILD HEAT, THEN DASH TO DUMP IT', focus: 'shipArc', accent: '#9be7ff', minTime: 2200 },
    { id: 'overdrive', title: 'KILLS FILL OVERDRIVE', subtitle: 'PURPLE STATE = FASTER FIRE, SPEED, NO HEAT', focus: 'overdrive', accent: '#cc44ff', minTime: 2600 },
    { id: 'damage', title: 'TAKING DAMAGE KILLS OVERDRIVE', subtitle: 'LET ONE SHOT HIT YOU', focus: 'overdrive', accent: '#ff5544', minTime: 3200 },
    { id: 'spread', title: 'SPREAD SHOT - WIDE CLEAR', subtitle: 'HOLD K OR RIGHT CLICK TO SHRED THE SWARM', focus: null, accent: '#ffcc00', minTime: 2200 },
    { id: 'bass', title: 'BASS PULSE - CLOSE BURST', subtitle: 'HOLD K OR RIGHT CLICK TO BLAST ANYTHING CLOSE', focus: null, accent: '#a3122a', minTime: 2200 },
    { id: 'nuke', title: 'Q - NUKE', subtitle: 'PRESS Q TO WIPE THE SCREEN // ONLY 3 PER RUN', focus: 'nuke', accent: COLOR_PINK, minTime: 2200 },
    { id: 'release', title: 'HOLD LANES. MANAGE HEAT. CHASE OVERDRIVE.', subtitle: 'GOOD LUCK', focus: null, accent: '#ffffff', minTime: 6200 }
  ],
  stepIndex: 0,
  stepTimer: 0,
  fadeAlpha: 0,
  active: false,
  prevDroneX: 0,
  prevDroneY: 0,
  prevBulletCount: 0,
  prevDashActive: false,
  prevOverdriveActive: false,
  stepState: null,

  start() {
    this.active = true;
    this.stepIndex = 0;
    this.stepTimer = 0;
    this.fadeAlpha = 0;
    this.prevDroneX = drone.x;
    this.prevDroneY = drone.y;
    this.prevBulletCount = 0;
    this.prevDashActive = false;
    this.prevOverdriveActive = false;
    player.lives = 99;
    player.invincibleTimer = 999999;
    player.score = 0;
    stage.kills = 0;
    stage.totalKills = 0;
    this._beginStep(0);
  },

  _clearArena() {
    shards.reset();
    bullets.pool = [];
    bullets.cooldown = 0;
    enemyBullets.reset();
    pickups.reset();
    fragments.pool = [];
    burstParticles.reset();
    hitSparks.reset();
    impactFX.reset();
    smokeParticles.reset();
    bassPulse.reset();
    screenNuke.reset();
    turretIndicators.reset();
    streakCallout.reset();
  },

  _spawnWave(count, opts = {}) {
    const stats = getStageEnemyStats();
    const edge = opts.edge ?? 'top';
    const baseX = opts.baseX ?? (PLAY_X + PLAY_W / 2);
    const baseY = opts.baseY ?? (PLAY_Y - 34);
    const spreadY = opts.spreadY ?? 0;
    const spreadX = opts.spreadX ?? 180;
    for (let i = 0; i < count; i++) {
      const offsetY = count === 1 ? 0 : (-spreadY / 2 + (spreadY * i / Math.max(1, count - 1)));
      const offsetX = count === 1 ? 0 : (-spreadX / 2 + (spreadX * i / Math.max(1, count - 1)));
      shards.pool.push(shards._makeShard(
        baseX + offsetX,
        baseY + offsetY,
        Object.assign({}, stats, {
          speed: opts.speed ?? 80,
          baseHp: opts.hp ?? 1
        }),
        !!opts.elite,
        false,
        edge
      ));
    }
  },

  _spawnStaticTarget(x, y, hp = 8, elite = false) {
    const stats = getStageEnemyStats();
    shards.pool.push(shards._makeShard(
      x,
      y,
      Object.assign({}, stats, { speed: 0, baseHp: hp }),
      elite
    ));
  },

  _spawnAltOrb(type, x, y) {
    pickups.spawnAltFireOrb(x, y, type);
  },

  _spawnTutorialHitShot() {
    enemyBullets.fire(drone.x - 110, PLAY_Y + 50, drone.x - 18, drone.y, { isSniper: true });
    enemyBullets.fire(drone.x + 110, PLAY_Y + 50, drone.x + 18, drone.y, { isSniper: true });
  },

  _beginStep(index) {
    this.stepIndex = index;
    this.stepTimer = 0;
    this.fadeAlpha = 0;
    this.stepState = {
      distanceMoved: 0,
      shotsFired: 0,
      dashes: 0,
      startKills: stage.kills,
      startLives: player.lives,
      startHeat: player.heat,
      startUltUses: player.ultUses,
      heated: false,
      completedAt: null,
      overdriveSeenAt: null,
      overdriveWaveSpawned: false,
      damageRespawnTimer: 0,
      moveZones: [],
      spreadCollected: false,
      spreadUsed: false,
      bassCollected: false,
      bassUsed: false
    };
    this.prevDroneX = drone.x;
    this.prevDroneY = drone.y;
    this.prevBulletCount = bullets.pool.length;
    this.prevDashActive = dash.duration > 0;
    this.prevOverdriveActive = player.overdriveActive;

    this._clearArena();
    this._setupStep(this.steps[index]);
  },

  _setupStep(step) {
    if (!step) return;

    audio.stopLoop('bassPulseLoop');
    player.hitFlashTimer = 0;
    player.dashHeatFlashTimer = 0;
    player.altFireType = null;
    player.spreadFuel = 0;
    player.bassFuel = 0;
    player.altFireCooldown = 0;
    player.overheated = false;
    player.overheatTimer = 0;
    player.invincibleTimer = step.id === 'damage' ? 0 : 999999;

    const centerY = canvas.height / 2;

    switch (step.id) {
      case 'move':
        player.heat = 0;
        player.overdriveCharge = 0;
        player.overdriveActive = false;
        player.overdriveTimer = 0;
        player.ultCharge = 0;
        player.ultReady = true;
        player.ultUses = 3;
        this.stepState.moveZones = [
          { x: drone.x - 180, y: drone.y, r: 24, hit: false },
          { x: drone.x + 180, y: drone.y, r: 24, hit: false }
        ];
        break;
      case 'shoot':
        this._spawnWave(6, { speed: 74, hp: 1, spreadX: 260, baseY: PLAY_Y - 28 });
        break;
      case 'heat':
        player.heat = 0;
        this._spawnStaticTarget(drone.x - 90, centerY - 70, 18, false);
        this._spawnStaticTarget(drone.x + 110, centerY - 10, 18, false);
        break;
      case 'dash':
        this._spawnStaticTarget(PLAY_X + 90, drone.y, 8, false);
        this._spawnStaticTarget(PLAY_X + PLAY_W - 90, drone.y, 8, false);
        break;
      case 'refund':
        player.heat = 64;
        this.stepState.startHeat = player.heat;
        this._spawnWave(3, { baseX: PLAY_X + PLAY_W / 2, speed: 52, hp: 6, spreadX: 220, baseY: PLAY_Y - 24 });
        break;
      case 'overdrive':
        player.heat = 0;
        player.overdriveActive = false;
        player.overdriveTimer = 0;
        player.overdriveCharge = 92;
        this._spawnWave(4, { speed: 88, hp: 1, spreadX: 220, baseY: PLAY_Y - 28 });
        break;
      case 'damage':
        player.heat = 0;
        player.overdriveCharge = 0;
        player.overdriveActive = true;
        player.overdriveTimer = 4000;
        this.stepState.startLives = player.lives;
        this.stepState.damageRespawnTimer = 1400;
        break;
      case 'spread':
        player.heat = 0;
        player.activateAltFire('spread');
        this.stepState.spreadCollected = true;
        this._spawnWave(12, { speed: 88, hp: 1, spreadX: 320, baseY: PLAY_Y - 34 });
        break;
      case 'bass':
        player.heat = 0;
        player.activateAltFire('bass');
        this.stepState.bassCollected = true;
        this._spawnWave(12, { speed: 82, hp: 1, spreadX: 280, baseY: PLAY_Y - 34 });
        break;
      case 'nuke':
        player.heat = 0;
        player.ultUses = 3;
        player.ultCharge = 0;
        player.ultReady = true;
        this.stepState.startUltUses = player.ultUses;
        this._spawnWave(8, { speed: 38, hp: 1, spreadX: 320, baseY: PLAY_Y - 30 });
        break;
      case 'release':
        player.heat = 0;
        break;
    }
  },

  _isStepComplete(step) {
    if (!step) return false;
    if (this.stepTimer < (step.minTime || 0)) return false;
    const killsThisStep = stage.kills - this.stepState.startKills;

    switch (step.id) {
      case 'move': return this.stepState.moveZones.length > 0 && this.stepState.moveZones.every(z => z.hit);
      case 'shoot': return killsThisStep >= 5;
      case 'heat': return this.stepState.heated && player.heat <= 15;
      case 'dash': return this.stepState.dashes >= 1;
      case 'refund': return this.stepState.dashes >= 1 && player.heat <= this.stepState.startHeat - 8;
      case 'overdrive': return this.stepState.overdriveSeenAt !== null && this.stepTimer - this.stepState.overdriveSeenAt >= 5000;
      case 'damage': return player.lives < this.stepState.startLives && !player.overdriveActive;
      case 'spread': return this.stepState.spreadCollected && this.stepState.spreadUsed && killsThisStep >= 10;
      case 'bass': return this.stepState.bassCollected && this.stepState.bassUsed && killsThisStep >= 10;
      case 'nuke': return player.ultUses < this.stepState.startUltUses && shards.pool.length === 0 && enemyBullets.pool.length === 0;
      case 'release': return this.stepTimer >= 1500;
      default: return false;
    }
  },

  _drawTutorialLines(text, centerX, centerY, maxWidth, color, glowColor, baseSize) {
    const words = text.split(' ');
    const lines = [];
    let current = '';

    ctx.save();
    let fontSize = baseSize;
    for (; fontSize >= 22; fontSize -= 2) {
      ctx.font = `bold ${fontSize}px monospace`;
      lines.length = 0;
      current = '';
      for (const word of words) {
        const candidate = current ? `${current} ${word}` : word;
        if (ctx.measureText(candidate).width <= maxWidth || current === '') {
          current = candidate;
        } else {
          lines.push(current);
          current = word;
        }
      }
      if (current) lines.push(current);
      if (lines.length <= 2) break;
    }

    const lineHeight = fontSize + 6;
    const totalHeight = lines.length * lineHeight;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `bold ${fontSize}px monospace`;
    ctx.fillStyle = color;
    setGlow(glowColor, 10);
    lines.forEach((line, i) => {
      const y = centerY - totalHeight / 2 + i * lineHeight + lineHeight / 2;
      ctx.fillText(line, centerX, y);
    });
    clearGlow();
    ctx.restore();
  },

  _drawFocus(focus, accent) {
    if (!focus) return;
    const pulse = 0.55 + 0.45 * (Math.sin(getNow() * 0.01) * 0.5 + 0.5);
    ctx.save();
    ctx.globalAlpha = 0.25 + pulse * 0.25;
    ctx.strokeStyle = accent;
    ctx.lineWidth = 2;
    setGlow(accent, 18);

    if (focus === 'ship' || focus === 'shipArc') {
      ctx.beginPath();
      ctx.arc(drone.x, drone.y, focus === 'shipArc' ? 34 : 42, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      let x = drone.x - 66, y = drone.y - 34, w = 132, h = 68;
      if (focus === 'overdrive') {
        const inset = Math.max(18, PLAY_W * 0.06);
        x = PLAY_X + inset - 10;
        y = PLAY_Y + PLAY_H - 28;
        w = PLAY_W - inset * 2 + 20;
        h = 38;
      }
      if (focus === 'fire') {
        x = drone.x - 86;
        y = drone.y - 54;
        w = 172;
        h = 108;
      }
      if (focus === 'altFire') {
        x = PANEL_X + 18;
        y = PANEL_Y + 300;
        w = PANEL_W - 36;
        h = 96;
      }
      if (focus === 'dash') {
        x = drone.x - 120;
        y = drone.y - 44;
        w = 240;
        h = 88;
      }
      if (focus === 'nuke') {
        x = PANEL_X + 18;
        y = PANEL_Y + 190;
        w = PANEL_W - 36;
        h = 46;
      }
      _roundRect(ctx, x, y, w, h, 8);
      ctx.stroke();
    }

    clearGlow();
    ctx.restore();
  },

  update(delta) {
    if (!this.active) return;
    const step = this.steps[this.stepIndex];
    if (!step) { this.finish(); return; }

    this.stepTimer += delta;
    const entryT = Math.min(1, this.stepTimer / 220);
    this.fadeAlpha += (entryT - this.fadeAlpha) * 0.22;

    const dx = drone.x - this.prevDroneX;
    const dy = drone.y - this.prevDroneY;
    this.stepState.distanceMoved += Math.hypot(dx, dy);
    this.prevDroneX = drone.x;
    this.prevDroneY = drone.y;

    const bulletDiff = bullets.pool.length - this.prevBulletCount;
    if (bulletDiff > 0) this.stepState.shotsFired += bulletDiff;
    this.prevBulletCount = bullets.pool.length;

    const dashActive = dash.duration > 0;
    if (dashActive && !this.prevDashActive) this.stepState.dashes++;
    this.prevDashActive = dashActive;

    if (player.heat >= 45) this.stepState.heated = true;
    if (step.id === 'move' && this.stepState.moveZones.length > 0) {
      this.stepState.moveZones.forEach(zone => {
        if (!zone.hit && Math.hypot(drone.x - zone.x, drone.y - zone.y) <= zone.r + 10) {
          zone.hit = true;
          audio.play('menuSelect');
        }
      });
    }
    if (player.altFireType === 'spread') this.stepState.spreadCollected = true;
    if (player.altFireType === 'spread' && player.spreadFuel < player.SPREAD_MAX_FUEL) this.stepState.spreadUsed = true;
    if (player.altFireType === 'bass') this.stepState.bassCollected = true;
    if (player.altFireType === 'bass' && player.bassFuel < player.BASS_MAX_FUEL - 4) this.stepState.bassUsed = true;

    if (player.overdriveActive && !this.prevOverdriveActive && step.id === 'overdrive' && this.stepState.overdriveSeenAt === null) {
      this.stepState.overdriveSeenAt = this.stepTimer;
      if (!this.stepState.overdriveWaveSpawned) {
        this.stepState.overdriveWaveSpawned = true;
        this._spawnWave(8, { speed: 96, hp: 1, spreadX: 320, baseY: PLAY_Y - 34 });
      }
    }
    if (step.id === 'damage' && player.lives >= this.stepState.startLives) {
      this.stepState.damageRespawnTimer -= delta;
      if (this.stepState.damageRespawnTimer <= 0 && enemyBullets.pool.length === 0) {
        this._spawnTutorialHitShot();
        this.stepState.damageRespawnTimer = 1400;
      }
    }
    this.prevOverdriveActive = player.overdriveActive;

    if (this._isStepComplete(step) && this.stepState.completedAt === null) {
      this.stepState.completedAt = this.stepTimer;
      audio.play('menuConfirm');
    }

    if (this.stepState.completedAt !== null &&
        this.stepTimer - this.stepState.completedAt >= this.STEP_COMPLETE_HOLD_MS) {
      if (this.stepIndex >= this.steps.length - 1) this.finish();
      else this._beginStep(this.stepIndex + 1);
    }
  },

  draw() {
    if (!this.active) return;
    const step = this.steps[this.stepIndex];
    if (!step) return;
    const isReleaseStep = step.id === 'release';

    this._drawFocus(step.focus, step.accent);
    if (step.id === 'move' && this.stepState.moveZones.length > 0) {
      ctx.save();
      this.stepState.moveZones.forEach(zone => {
        const pulse = 0.55 + 0.45 * (Math.sin(getNow() * 0.012 + zone.x * 0.02) * 0.5 + 0.5);
        ctx.globalAlpha = zone.hit ? 0.18 : 0.34 + pulse * 0.16;
        ctx.fillStyle = zone.hit ? 'rgba(49,175,212,0.18)' : 'rgba(49,175,212,0.10)';
        ctx.strokeStyle = zone.hit ? '#8cf2ff' : COLOR_CYAN;
        ctx.lineWidth = zone.hit ? 2.5 : 2;
        setGlow(zone.hit ? '#8cf2ff' : COLOR_CYAN, zone.hit ? 16 : 12);
        ctx.beginPath();
        ctx.arc(zone.x, zone.y, zone.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(zone.x, zone.y, zone.r * 0.45, 0, Math.PI * 2);
        ctx.stroke();
        clearGlow();
      });
      ctx.restore();
    }

    const accent = step.accent || COLOR_CYAN;

    if (isReleaseStep) {
      const cx = PLAY_X + PLAY_W / 2;
      const cy = PLAY_Y + PLAY_H * 0.39;
      const pulse = 0.6 + 0.4 * Math.sin(getNow() * 0.0032);
      const flicker = 0.9 + 0.1 * Math.sin(getNow() * 0.014) * Math.sin(getNow() * 0.029);
      const headingSize = Math.round(Math.max(40, Math.min(64, PLAY_W * 0.074)));
      const subtitleSize = Math.round(Math.max(18, Math.min(26, PLAY_W * 0.03)));
      const lineW = Math.min(PLAY_W * 0.54, 440);
      const hudBlue = '#2e3bf0';
      const hudPurple = '#4216d2';
      const hudPink = '#dd32b3';
      const hudHot = '#fb29fd';
      const hudLite = '#d9d4ff';
      const titleLines = [
        'HOLD LANES',
        'MANAGE HEAT',
        'CHASE OVERDRIVE'
      ];
      const drawSpacedLine = (text, y, opts = {}) => {
        const spacing = opts.spacing ?? Math.max(3, headingSize * 0.05);
        const alpha = opts.alpha ?? 1;
        const fill = opts.fill ?? '#ffffff';
        const glow = opts.glow ?? fill;
        const blur = opts.blur ?? 0;
        const dropoutScale = opts.dropoutScale ?? 0;
        const chars = text.split('');
        const widths = chars.map(ch => ch === ' ' ? headingSize * 0.4 : ctx.measureText(ch).width);
        const totalWidth = widths.reduce((sum, width) => sum + width, 0) + spacing * (chars.length - 1);
        let drawX = cx - totalWidth / 2;
        ctx.globalAlpha = alpha * this.fadeAlpha;
        ctx.fillStyle = fill;
        ctx.shadowColor = glow;
        ctx.shadowBlur = blur;
        chars.forEach((ch, idx) => {
          const charWidth = widths[idx];
          const charCenter = drawX + charWidth / 2;
          const noise = 0.8 + 0.2 * (0.5 + 0.5 * Math.sin(getNow() * 0.021 + idx * 0.9));
          const dropout = ch === ' ' ? 1 : Math.max(0.55, 1 - dropoutScale * flicker * ((idx % 3) === 1 ? 0.45 : 0.18));
          ctx.globalAlpha = alpha * this.fadeAlpha * noise * dropout;
          ctx.fillText(ch, charCenter, y);
          drawX += charWidth + spacing;
        });
      };

      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      ctx.globalAlpha = 0.16 * this.fadeAlpha;
      ctx.strokeStyle = hudBlue;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx - lineW / 2, cy + 58);
      ctx.lineTo(cx + lineW / 2, cy + 58);
      ctx.stroke();

      ctx.globalAlpha = 0.1 * this.fadeAlpha;
      ctx.strokeStyle = hudPink;
      ctx.beginPath();
      ctx.moveTo(cx - lineW * 0.32, cy - 96);
      ctx.lineTo(cx + lineW * 0.32, cy - 96);
      ctx.stroke();

      ctx.font = `bold ${headingSize}px monospace`;
      titleLines.forEach((line, i) => {
        const lineY = cy - 58 + i * 48;
        drawSpacedLine(line, lineY, {
          spacing: Math.max(4, headingSize * 0.055),
          alpha: 0.16 * pulse,
          fill: hudPurple,
          glow: hudPurple,
          blur: 34,
          dropoutScale: 0.08
        });
        drawSpacedLine(line, lineY, {
          spacing: Math.max(4, headingSize * 0.055),
          alpha: 0.42 * flicker,
          fill: hudPink,
          glow: hudHot,
          blur: 20,
          dropoutScale: 0.12
        });
        drawSpacedLine(line, lineY, {
          spacing: Math.max(4, headingSize * 0.055),
          alpha: 0.98,
          fill: hudLite,
          glow: hudBlue,
          blur: 10,
          dropoutScale: 0.04
        });
      });
      ctx.shadowBlur = 0;
      ctx.shadowColor = 'transparent';

      ctx.font = `bold ${subtitleSize}px monospace`;
      ctx.globalAlpha = 0.92 * this.fadeAlpha;
      setGlow(hudPink, 12);
      ctx.fillStyle = hudLite;
      ctx.fillText(step.subtitle, cx, cy + 96);
      clearGlow();
      ctx.restore();
      return;
    }

    const panelW = Math.min(PLAY_W - 72, 700);
    const panelX = PLAY_X + (PLAY_W - panelW) / 2;
    const panelY = PLAY_Y + 58;
    const hudBlue = '#2e3bf0';
    const hudPurple = '#4216d2';
    const hudPink = '#dd32b3';
    const hudHot = '#fb29fd';
    const hudLite = '#d9d4ff';
    const accentColor = accent === '#ffffff' ? hudLite : accent;
    const titleColor = step.id === 'heat'
      ? hudLite
      : step.id === 'nuke'
        ? hudLite
        : accentColor;
    const titleGlow = step.id === 'heat'
      ? hudPink
      : step.id === 'nuke'
        ? hudHot
        : accentColor;

    ctx.save();
    const accentW = Math.min(220, panelW * 0.34);
    const accentX = panelX + (panelW - accentW) / 2;
    const accentY = panelY + 4;
    ctx.globalAlpha = 0.18 * this.fadeAlpha;
    ctx.strokeStyle = hudBlue;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(panelX + panelW * 0.12, panelY + 72);
    ctx.lineTo(panelX + panelW * 0.88, panelY + 72);
    ctx.stroke();

    ctx.globalAlpha = 0.14 * this.fadeAlpha;
    ctx.strokeStyle = hudPink;
    ctx.beginPath();
    ctx.moveTo(accentX, accentY);
    ctx.lineTo(accentX + accentW, accentY);
    ctx.stroke();

    ctx.globalAlpha = 0.78 * this.fadeAlpha;
    setGlow(accentColor, 14);
    ctx.strokeStyle = accentColor;
    ctx.beginPath();
    ctx.moveTo(accentX + accentW * 0.18, accentY);
    ctx.lineTo(accentX + accentW * 0.82, accentY);
    ctx.stroke();
    clearGlow();

    ctx.globalAlpha = 0.95 * this.fadeAlpha;
    this._drawTutorialLines(step.title, PLAY_X + PLAY_W / 2, panelY + 30, panelW - 84, titleColor, titleGlow, 34);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 18px monospace';
    ctx.fillStyle = hudLite;
    setGlow(accentColor, 12);
    ctx.fillText(step.subtitle, PLAY_X + PLAY_W / 2, panelY + 56);

    ctx.font = '12px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = hudPink;
    clearGlow();
    setGlow(hudPink, 8);
    ctx.fillText(`STEP ${this.stepIndex + 1} / ${this.steps.length}`, PLAY_X + PLAY_W / 2, panelY - 10);
    clearGlow();
    ctx.restore();
  },

  finish() {
    this.active = false;
    localStorage.setItem('drone_tutorial_done', '1');
    _resetAllState();
    gameState = 'playing';
  },

  cancel() {
    this.active = false;
    _resetAllState();
    gameState = 'title';
    titleSelection = 0;
    titleSelectionChangedAt = getNow();
    audio.playMusic('title');
  }
};

function _resetAllState() {
  audio.stopLoop('bassPulseLoop');
  player.score = 0;
  player.dead = false;
  player.lives = 3;
  player.overdriveCharge = 0;
  player.overdriveActive = false;
  player.overdriveTimer = 0;
  player.heat = 0;
  player.overheated = false;
  player.overheatTimer = 0;
  player.hitFlashTimer = 0;
  player.ultCharge = 0;
  player.ultReady = true;
  player.ultUses = 3;
  player.altFireType = null;
  player.spreadFuel = 0;
  player.bassFuel = 0;
  player.altFireCooldown = 0;
  player.invincibleTimer = 0;
  altFireDropIndex = 0;
  shards.reset();
  bassPulse.reset();
  if (typeof laser !== 'undefined' && laser && typeof laser.reset === 'function') laser.reset();
  screenNuke.reset();
  turretIndicators.reset();
  streakCallout.reset();
  bullets.pool = [];
  bullets.cooldown = 0;
  enemyBullets.reset();
  pickups.reset();
  fragments.pool = [];
  burstParticles.reset();
  hitSparks.reset();
  impactFX.reset();
  smokeParticles.reset();

  stage.reset();
  drone.init();
  drone.tilt = 0;
  dash.reset();
}

function startGame() {
  _resetAllState();

  if (!localStorage.getItem('drone_tutorial_done')) {
    gameState = 'tutorial';
    tutorial.start();
    audio.playMusic('gameplay');
    return;
  }

  gameState = 'playing';
  audio.playMusic('gameplay');
}

function startTutorialFromDevMenu() {
  _resetAllState();
  gameState = 'tutorial';
  tutorial.start();
  audio.playMusic('gameplay');
}

function updateTitle(delta) {
  waveField.update(delta);
  titleGridOff += delta * 0.022;
  const titleOptionCount = 3;
  const keyboardNavigated =
    justPressed['ArrowUp'] || justPressed['ArrowDown'] ||
    justPressed['w'] || justPressed['W'] ||
    justPressed['s'] || justPressed['S'];

  if (keyboardNavigated) {
    const direction = (justPressed['ArrowUp'] || justPressed['w'] || justPressed['W']) ? -1 : 1;
    titleSelection = (titleSelection + direction + titleOptionCount) % titleOptionCount;
    titleSelectionChangedAt = getNow();
    audio.play('menuSelect');
    mouseMoved = false;
  }

  const hoveredSelection = mouseMoved
    ? (isTitleOptionHovered(0) ? 0 : (isTitleOptionHovered(1) ? 1 : (isTitleOptionHovered(2) ? 2 : -1)))
    : -1;
  if (hoveredSelection !== -1 && hoveredSelection !== titleSelection) {
    titleSelection = hoveredSelection;
    titleSelectionChangedAt = getNow();
  }

  if (justPressed['Enter'] || justPressed[' ']) {
    audio.play('menuConfirm');
    if (titleSelection === 0) startGame();
    else if (titleSelection === 1) {
      tutorial.start();
      gameState = 'tutorial';
      audio.playMusic('gameplay');
    } else {
      gameState = 'leaderboard';
      leaderboard.fetchScores();
    }
  }
}

// --- DEV MENU ---
const DEV_BTN_W = 110, DEV_BTN_H = 54, DEV_COLS = 5, DEV_ROWS = 2;

function drawDevMenu() {
  const W = canvas.width, H = canvas.height;
  ctx.fillStyle = '#050508';
  ctx.fillRect(0, 0, W, H);

  // Grid lines (subtle)
  ctx.strokeStyle = 'rgba(255,255,255,0.04)';
  ctx.lineWidth = 1;
  for (let x = 0; x < W; x += 60) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
  for (let y = 0; y < H; y += 60) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

  // Title
  ctx.save();
  ctx.font = 'bold 13px monospace';
  ctx.textAlign = 'center';
  ctx.letterSpacing = '4px';
  ctx.fillStyle = '#ff3366';
  ctx.fillText('DEV — STAGE SELECT', W / 2, 52);
  ctx.restore();

  // Stage buttons
  const totalW = DEV_COLS * DEV_BTN_W + (DEV_COLS - 1) * 16;
  const startX = (W - totalW) / 2;
  const startY = H / 2 - DEV_ROWS * (DEV_BTN_H + 16) / 2 - 20;

  for (let i = 0; i < 10; i++) {
    const col = i % DEV_COLS, row = Math.floor(i / DEV_COLS);
    const bx = startX + col * (DEV_BTN_W + 16);
    const by = startY + row * (DEV_BTN_H + 16);
    _drawDevBtn(ctx, bx, by, DEV_BTN_W, DEV_BTN_H, i + 1);
  }

  // Fast Stage toggle
  const toggleY = startY + DEV_ROWS * (DEV_BTN_H + 16) + 20;
  const toggleW = 220, toggleH = 40;
  const toggleX = W / 2 - toggleW / 2;
  ctx.save();
  ctx.strokeStyle = devFastStage ? '#00ffcc' : 'rgba(255,255,255,0.2)';
  ctx.lineWidth = 1.5;
  ctx.fillStyle = devFastStage ? 'rgba(0,255,204,0.1)' : 'rgba(255,255,255,0.04)';
  _roundRect(ctx, toggleX, toggleY, toggleW, toggleH, 6);
  ctx.fill(); ctx.stroke();
  ctx.font = 'bold 11px monospace';
  ctx.textAlign = 'center';
  ctx.fillStyle = devFastStage ? '#00ffcc' : 'rgba(255,255,255,0.5)';
  ctx.fillText('FAST STAGE  ' + (devFastStage ? '[ON]' : '[OFF]'), W / 2, toggleY + 25);
  ctx.restore();

  // Tutorial button
  const tutorialY = toggleY + toggleH + 16;
  const tutorialW = 220, tutorialH = 40;
  const tutorialX = W / 2 - tutorialW / 2;
  ctx.save();
  ctx.strokeStyle = 'rgba(170,85,255,0.55)';
  ctx.lineWidth = 1.5;
  ctx.fillStyle = 'rgba(170,85,255,0.1)';
  _roundRect(ctx, tutorialX, tutorialY, tutorialW, tutorialH, 6);
  ctx.fill(); ctx.stroke();
  ctx.font = 'bold 11px monospace';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#aa55ff';
  ctx.fillText('PLAY TUTORIAL', W / 2, tutorialY + 25);
  ctx.restore();

  // Back button
  const backY = tutorialY + tutorialH + 16;
  const backW = 120, backH = 36;
  const backX = W / 2 - backW / 2;
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth = 1;
  ctx.fillStyle = 'rgba(255,255,255,0.05)';
  _roundRect(ctx, backX, backY, backW, backH, 6);
  ctx.fill(); ctx.stroke();
  ctx.font = '11px monospace';
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.fillText('[ESC]  BACK', W / 2, backY + 23);
  ctx.restore();
}

function _drawDevBtn(ctx, x, y, w, h, stageNum) {
  const colors = ['#ff3366','#ff6600','#ffcc00','#00ff88','#00ccff',
                  '#aa55ff','#ff55cc','#ff3333','#44aaff','#ffffff'];
  const col = colors[stageNum - 1];

  ctx.save();
  ctx.fillStyle = `rgba(${_hexToRgb(col)},0.08)`;
  ctx.strokeStyle = `rgba(${_hexToRgb(col)},0.55)`;
  ctx.lineWidth = 1.5;
  _roundRect(ctx, x, y, w, h, 7);
  ctx.fill(); ctx.stroke();

  ctx.font = 'bold 22px monospace';
  ctx.textAlign = 'center';
  ctx.fillStyle = col;
  ctx.fillText(stageNum, x + w / 2, y + h / 2 + 4);

  ctx.font = '9px monospace';
  ctx.fillStyle = `rgba(${_hexToRgb(col)},0.6)`;
  ctx.fillText('STAGE', x + w / 2, y + h / 2 - 14);
  ctx.restore();
}

function _hexToRgb(hex) {
  const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
  return `${r},${g},${b}`;
}

function _roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function handleDevMenuClick(e) {
  const W = canvas.width, H = canvas.height;
  const totalW = DEV_COLS * DEV_BTN_W + (DEV_COLS - 1) * 16;
  const startX = (W - totalW) / 2;
  const startY = H / 2 - DEV_ROWS * (DEV_BTN_H + 16) / 2 - 20;

  // Stage buttons
  for (let i = 0; i < 10; i++) {
    const col = i % DEV_COLS, row = Math.floor(i / DEV_COLS);
    const bx = startX + col * (DEV_BTN_W + 16);
    const by = startY + row * (DEV_BTN_H + 16);
    if (e.offsetX >= bx && e.offsetX <= bx + DEV_BTN_W &&
        e.offsetY >= by && e.offsetY <= by + DEV_BTN_H) {
      audio.play('menuConfirm');
      devJumpToStage(i + 1);
      return;
    }
  }

  // Fast Stage toggle
  const toggleY = startY + DEV_ROWS * (DEV_BTN_H + 16) + 20;
  const toggleW = 220, toggleH = 40;
  const toggleX = W / 2 - toggleW / 2;
  if (e.offsetX >= toggleX && e.offsetX <= toggleX + toggleW &&
      e.offsetY >= toggleY && e.offsetY <= toggleY + toggleH) {
    devFastStage = !devFastStage;
    audio.play('menuSelect');
    return;
  }

  // Tutorial button
  const tutorialY = toggleY + toggleH + 16;
  const tutorialW = 220, tutorialH = 40;
  const tutorialX = W / 2 - tutorialW / 2;
  if (e.offsetX >= tutorialX && e.offsetX <= tutorialX + tutorialW &&
      e.offsetY >= tutorialY && e.offsetY <= tutorialY + tutorialH) {
    audio.play('menuConfirm');
    startTutorialFromDevMenu();
    return;
  }

  // Back button
  const backY = tutorialY + tutorialH + 16;
  const backW = 120, backH = 36;
  const backX = W / 2 - backW / 2;
  if (e.offsetX >= backX && e.offsetX <= backX + backW &&
      e.offsetY >= backY && e.offsetY <= backY + backH) {
    gameState = 'title';
    audio.play('menuSelect');
  }
}

// --- AUDIO CONTROLS STATE INITIALIZER ---
(function initAudioState() {
  const masterVol = localStorage.getItem('drone_master_vol');
  const sfxOn = localStorage.getItem('drone_sfx_on');
  const musicVol = localStorage.getItem('drone_music_vol');
  const musicOn = localStorage.getItem('drone_music_on');

  if (masterVol !== null) audio.setMasterVolume(parseInt(masterVol, 10) / 100);
  if (sfxOn === '0') audio.setSfxVolume(0);
  if (musicVol !== null) audio.setMusicVolume(parseInt(musicVol, 10) / 100);
  else if (musicOn === '0') audio.setMusicVolume(0);
})();
