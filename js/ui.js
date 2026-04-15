const TITLE_WORDMARK_FONT = '"cc-running-with-scissors-up", "anatol-mn", sans-serif';
const UI_DISPLAY_FONT = '"manifold-extd-cf", "Eurostile Extended", "Eurostile Extended #2", "Microgramma D Extended", "Microgramma", sans-serif';

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

  ctx.fillStyle = '#04050a';
  ctx.fillRect(0, 0, W, H);

  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, '#06040d');
  sky.addColorStop(0.28, '#110820');
  sky.addColorStop(0.6, '#180b2c');
  sky.addColorStop(1, '#04050a');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  const topGlow = ctx.createRadialGradient(cx, H * 0.18, 0, cx, H * 0.18, Math.max(W, H) * 0.5);
  topGlow.addColorStop(0, 'rgba(139,92,246,0.14)');
  topGlow.addColorStop(0.45, 'rgba(46,59,240,0.08)');
  topGlow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = topGlow;
  ctx.fillRect(0, 0, W, H);

  const horizonY = H * 0.72;
  const gridDrift = (titleGridOff * 0.016) % 1;
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, horizonY - 6, W, H - horizonY + 6);
  ctx.clip();
  ctx.globalAlpha = 0.82;
  ctx.strokeStyle = 'rgba(49,175,212,0.22)';
  ctx.lineWidth = 1;

  for (let i = 0; i < 11; i++) {
    const t = (i / 10 + gridDrift) % 1;
    const y = horizonY + Math.pow(t, 1.8) * (H - horizonY + 80);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }

  const vanishingX = cx;
  const bottomSpread = W * 0.58;
  for (let i = -7; i <= 7; i++) {
    const x = cx + i * (bottomSpread / 7);
    ctx.beginPath();
    ctx.moveTo(x, H + 40);
    ctx.lineTo(vanishingX + i * 12, horizonY);
    ctx.stroke();
  }
  ctx.restore();

  const horizonGlow = ctx.createLinearGradient(0, horizonY - 16, 0, horizonY + 24);
  horizonGlow.addColorStop(0, 'rgba(0,0,0,0)');
  horizonGlow.addColorStop(0.42, 'rgba(49,175,212,0.08)');
  horizonGlow.addColorStop(0.68, 'rgba(139,92,246,0.10)');
  horizonGlow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = horizonGlow;
  ctx.fillRect(0, horizonY - 16, W, 40);

  const vignette = ctx.createRadialGradient(cx, cy * 0.86, Math.min(W, H) * 0.12, cx, cy, Math.max(W, H) * 0.78);
  vignette.addColorStop(0, 'rgba(46,59,240,0.04)');
  vignette.addColorStop(0.45, 'rgba(12,8,24,0.12)');
  vignette.addColorStop(1, 'rgba(0,0,0,0.78)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, W, H);

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
      _returnFromLeaderboard();
    }
  },

  draw() {
    const W = canvas.width, H = canvas.height;
    const cx = W / 2;
    const now = getNow();
    const cy = H / 2;
    const layoutScale = Math.max(0.72, Math.min(1.08, Math.min(W / 1280, H / 720)));
    const headingY = cy - 250 * layoutScale;
    const topBlockY = headingY + 110 * layoutScale;
    const topCardY = topBlockY + 26 * layoutScale;
    const lowerListY = topCardY + 168 * layoutScale;
    const compact = W < 920;
    const headerFont = Math.round(Math.max(56, Math.min(88, 88 * layoutScale)));
    const labelFont = Math.round(Math.max(11, Math.min(13, 13 * layoutScale)));
    const rowFont = Math.round(Math.max(15, Math.min(18, 18 * layoutScale)));
    const localName = loadPlayerName();

    drawLbBg();

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const heading = 'LEADERBOARD';
    const headingLetters = heading.split('');
    const flicker = 0.9 + 0.1 * Math.sin(now * 0.014) * Math.sin(now * 0.029);
    const glitchPulse = 0.5 + 0.5 * Math.sin(now * 0.013);
    ctx.font = `${headerFont}px ${TITLE_WORDMARK_FONT}`;
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
    drawHeadingLayer(0.12, 42, '#dd32b3', '#fb29fd', 0.18);
    drawHeadingLayer(0.34, 18, '#ffffff', '#31afd4', 0.22);
    drawHeadingLayer(1.0, 8, '#ffffff', '#ffffff', 0.28);
    ctx.shadowBlur = 0;
    ctx.shadowColor = 'transparent';

    if (this.loading) {
      const pulse = 0.5 + 0.5 * Math.sin(now * 0.004);
      setGlow('#31afd4', 20);
      ctx.globalAlpha = 0.5 + pulse * 0.5;
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${Math.round(Math.max(18, 22 * layoutScale))}px ${UI_DISPLAY_FONT}`;
      ctx.fillText('FETCHING DATA...', cx, H * 0.49);
    } else if (this.error) {
      setGlow(COLOR_CRIMSON, 25);
      ctx.textAlign = 'center';
      ctx.fillStyle = COLOR_CRIMSON;
      ctx.font = `bold ${Math.round(Math.max(18, 22 * layoutScale))}px ${UI_DISPLAY_FONT}`;
      ctx.fillText('CONNECTION FAILED', cx, H * 0.49);
    } else {
      const timeSinceLoad = now - (this.loadTime || now);
      const leader = this.scores[0];
      const rest = this.scores.slice(1, 10);

      if (leader) {
        const delay = 0;
        const animTime = Math.max(0, timeSinceLoad - delay);
        const animDuration = 400;
        let progress = animTime / animDuration;
        if (progress > 1) progress = 1;
        const easeProgress = 1 - Math.pow(1 - progress, 4);
        if (easeProgress > 0) {
        const x = cx;
        const y = topCardY + 10 * layoutScale;
        const xOffset = (1 - easeProgress) * 36;
        const currentAlpha = easeProgress;
        const accent = '#ffd15c';
        const glow = '#31afd4';

        ctx.save();
        ctx.translate(xOffset, 0);
        ctx.globalAlpha = currentAlpha;

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        setGlow('#ffe86a', 24);
        ctx.fillStyle = '#fff27d';
        ctx.font = `bold ${Math.round(Math.max(22, 54 * layoutScale))}px ${UI_DISPLAY_FONT}`;
        ctx.fillText(`#1 ${leader.player_name}`, x, y - 2 * layoutScale);
        ctx.font = `bold ${Math.round(Math.max(13, 15 * layoutScale))}px ${UI_DISPLAY_FONT}`;
        ctx.globalAlpha = currentAlpha * 0.82;
        ctx.fillStyle = '#ffffff';
        ctx.fillText(`${leader.score} SCORE`, x, y + 36 * layoutScale);
        ctx.globalAlpha = currentAlpha * 0.62;
        ctx.fillText(`${leader.kills} KILLS`, x, y + 58 * layoutScale);
        clearGlow();
        ctx.restore();
        }
      }

      if (rest.length > 0) {
        ctx.globalAlpha = 0.85;
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${Math.round(labelFont * 1.2)}px ${UI_DISPLAY_FONT}`;
        ctx.fillText('RANKINGS', cx, lowerListY - 26 * layoutScale);

        const listW = Math.min(620 * layoutScale, W * 0.7);
        const rowH = compact ? 28 : 32;
        const listLeft = cx - listW / 2;
        const rankX = listLeft + 16;
        const nameX = listLeft + 72;
        const scoreX = listLeft + listW - 104;
        const killsX = listLeft + listW - 16;

        rest.forEach((entry, idx) => {
          const i = idx + 1;
          const delay = i * 20;
          const animTime = Math.max(0, timeSinceLoad - delay);
          const animDuration = 420;
          let progress = animTime / animDuration;
          if (progress > 1) progress = 1;
          const easeProgress = 1 - Math.pow(1 - progress, 4);
          if (easeProgress <= 0) return;

          const y = lowerListY + idx * rowH;
          const isMe = entry.player_name === localName;
          const xOffset = (1 - easeProgress) * 30;

          ctx.save();
          ctx.translate(xOffset, 0);
          ctx.globalAlpha = easeProgress;
          ctx.textBaseline = 'middle';
          ctx.textAlign = 'left';

          setGlow(isMe ? '#fb29fd' : '#31afd4', isMe ? 10 : 6);
          ctx.fillStyle = '#ffffff';
          ctx.font = `bold ${rowFont}px ${UI_DISPLAY_FONT}`;
          ctx.fillText(`#${i + 1}`, rankX, y);
          ctx.fillText(entry.player_name, nameX, y);
          ctx.textAlign = 'right';
          ctx.fillText(entry.score, scoreX, y);
          ctx.fillText(entry.kills, killsX, y);
          clearGlow();
          ctx.restore();
        });
      }
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
    setGlow('#31afd4', 10);
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${footerHintSize}px ${UI_DISPLAY_FONT}`;
    ctx.fillText('[ ESC OR BACKSPACE TO RETURN ]', cx, footerHintY);

    if (this.submitMessage) {
      ctx.textBaseline = 'middle';
      ctx.globalAlpha = 0.92;
      setGlow(this.submitOk ? '#31afd4' : '#ff5544', 12);
      ctx.fillStyle = this.submitOk ? '#ffffff' : '#ffb8b0';
      ctx.font = `bold ${footerStatusSize}px ${UI_DISPLAY_FONT}`;
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
      _confirmNameEntry();
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
    ctx.font = `bold 36px ${UI_DISPLAY_FONT}`;
    ctx.fillText('ENTER YOUR CALLSIGN:', cx, cy - 40);

    clearGlow();
    const rejected = this.rejectTimer > 0;
    ctx.fillStyle = rejected ? '#ff3333' : '#ffffff';
    if (rejected) { ctx.shadowColor = '#ff0000'; ctx.shadowBlur = 16; }
    ctx.font = `bold 48px ${UI_DISPLAY_FONT}`;
    const cursor = (Math.floor(getNow() / 500) % 2 === 0) ? '_' : '';
    ctx.fillText(this.name + cursor, cx, cy + 20);
    ctx.shadowBlur = 0;

    ctx.font = `14px ${UI_DISPLAY_FONT}`;
    ctx.fillStyle = rejected ? '#ff6666' : '#888888';
    const hint = rejected ? 'INVALID CALLSIGN' : this.name.length > 0 ? 'PRESS ENTER TO CONFIRM' : 'TYPE YOUR CALLSIGN';
    ctx.fillText(hint, cx, cy + 80);

    if (this.name.length > 0) {
      ctx.font = `bold 12px ${UI_DISPLAY_FONT}`;
      ctx.fillStyle = '#6fa8ff';
      ctx.fillText('[ BACKSPACE ]', cx, cy + 116);
    }
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
  ctx.font         = `bold ${Math.round(Math.max(10, 12 * layoutScale * progressScale))}px ${UI_DISPLAY_FONT}`;
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
  const { headingY, startRunY, tutorialY, leaderboardY, statsY, stageNodesY, layoutScale, compact } = layout;
  const flicker = 0.9 + 0.1 * Math.sin(now * 0.014) * Math.sin(now * 0.029);
  const menuPulse = 0.6 + 0.4 * Math.sin(now * 0.0032);
  const headingFontSize = Math.round(Math.max(72, Math.min(118, 118 * layoutScale)));
  const actionFontSize = Math.round(Math.max(28, Math.min(42, 42 * layoutScale)));
  const statValueFontSize = Math.round(Math.max(20, Math.min(28, 28 * layoutScale)));
  const statLabelFontSize = Math.round(Math.max(10, Math.min(11, 11 * layoutScale)));

  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, W, H);
  waveField.draw();
  starField.draw();

  const backdrop = ctx.createLinearGradient(0, 0, 0, H);
  backdrop.addColorStop(0, '#05040b');
  backdrop.addColorStop(0.28, '#13081f');
  backdrop.addColorStop(0.62, '#1f0c31');
  backdrop.addColorStop(1, '#05040b');
  ctx.fillStyle = backdrop;
  ctx.fillRect(0, 0, W, H);

  const topGlow = ctx.createRadialGradient(cx, H * 0.2, 0, cx, H * 0.2, Math.max(W, H) * 0.54);
  topGlow.addColorStop(0, 'rgba(251,41,253,0.16)');
  topGlow.addColorStop(0.42, 'rgba(139,92,246,0.09)');
  topGlow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = topGlow;
  ctx.fillRect(0, 0, W, H);

  const sideGlowLeft = ctx.createRadialGradient(W * 0.18, H * 0.58, 0, W * 0.18, H * 0.58, Math.max(W, H) * 0.34);
  sideGlowLeft.addColorStop(0, 'rgba(66,22,210,0.16)');
  sideGlowLeft.addColorStop(1, 'rgba(66,22,210,0)');
  ctx.fillStyle = sideGlowLeft;
  ctx.fillRect(0, 0, W, H);

  const sideGlowRight = ctx.createRadialGradient(W * 0.82, H * 0.52, 0, W * 0.82, H * 0.52, Math.max(W, H) * 0.34);
  sideGlowRight.addColorStop(0, 'rgba(221,50,179,0.13)');
  sideGlowRight.addColorStop(1, 'rgba(221,50,179,0)');
  ctx.fillStyle = sideGlowRight;
  ctx.fillRect(0, 0, W, H);

  const horizonY = H * 0.76;
  const gridColor = 'rgba(125,98,255,0.22)';
  const gridDrift = (now * 0.00008) % 1;
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, horizonY - 6, W, H - horizonY + 6);
  ctx.clip();
  ctx.globalAlpha = 1;
  ctx.strokeStyle = gridColor;
  ctx.lineWidth = 1;

  for (let i = 0; i < 11; i++) {
    const t = (i / 10 + gridDrift) % 1;
    const y = horizonY + Math.pow(t, 1.8) * (H - horizonY + 80);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }

  const vanishingX = cx;
  const bottomSpread = W * 0.56;
  for (let i = -7; i <= 7; i++) {
    const x = cx + i * (bottomSpread / 7);
    ctx.beginPath();
    ctx.moveTo(x, H + 40);
    ctx.lineTo(vanishingX + i * 10, horizonY);
    ctx.stroke();
  }
  ctx.restore();

  const horizonGlow = ctx.createLinearGradient(0, horizonY - 18, 0, horizonY + 24);
  horizonGlow.addColorStop(0, 'rgba(0,0,0,0)');
  horizonGlow.addColorStop(0.45, 'rgba(129,140,248,0.16)');
  horizonGlow.addColorStop(0.6, 'rgba(221,50,179,0.18)');
  horizonGlow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = horizonGlow;
  ctx.fillRect(0, horizonY - 18, W, 42);

  const vignette = ctx.createRadialGradient(cx, cy * 0.88, Math.min(W, H) * 0.16, cx, cy, Math.max(W, H) * 0.8);
  vignette.addColorStop(0, 'rgba(99,60,180,0.04)');
  vignette.addColorStop(0.45, 'rgba(16,8,28,0.12)');
  vignette.addColorStop(1, 'rgba(0,0,0,0.82)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, W, H);

  ctx.save();
  ctx.globalAlpha = 0.05;
  ctx.fillStyle = '#c4b5fd';
  for (let y = 0; y < H; y += 4) ctx.fillRect(0, y, W, 1);
  ctx.restore();

  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const drawNeonWord = (text, y, fontSize, palette, dropoutScale = 0.3) => {
    ctx.font = `${fontSize}px ${TITLE_WORDMARK_FONT}`;
    const letters = text.split('');
    const spacing = Math.max(2, fontSize * 0.02);
    const widths = letters.map(ch => ch === ' ' ? fontSize * 0.3 : ctx.measureText(ch).width);
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
    const glowWidth = getTitleOptionWidth(option.label, actionFontSize) + 96 * layoutScale;
    const chipH = 50 * layoutScale;
    if (isActive) {
      const chipGrad = ctx.createLinearGradient(cx - glowWidth / 2, option.y, cx + glowWidth / 2, option.y);
      chipGrad.addColorStop(0, 'rgba(66,22,210,0.10)');
      chipGrad.addColorStop(0.5, 'rgba(221,50,179,0.14)');
      chipGrad.addColorStop(1, 'rgba(46,59,240,0.10)');
      ctx.globalAlpha = 0.95;
      ctx.fillStyle = chipGrad;
      ctx.fillRect(cx - glowWidth / 2, option.y - chipH / 2, glowWidth, chipH);

      ctx.globalAlpha = 0.36 + menuPulse * 0.12;
      ctx.fillStyle = '#fb29fd';
      ctx.fillRect(cx - glowWidth / 2, option.y - chipH / 2, 3, chipH);
      ctx.fillRect(cx + glowWidth / 2 - 3, option.y - chipH / 2, 3, chipH);

      ctx.globalAlpha = 0.18 + menuPulse * 0.08;
      ctx.strokeStyle = '#8b5cf6';
      ctx.lineWidth = 1;
      ctx.strokeRect(cx - glowWidth / 2, option.y - chipH / 2, glowWidth, chipH);
    }
    drawTitleActionText(option.label, option.y, actionFontSize, isActive);
  });

  const stats = [
    { label: 'BEST SCORE', value: `${save.highScore}`, color: '#a5b4fc' }
  ];

  stats.forEach((stat, i) => {
    const sx = cx;
    ctx.globalAlpha = 0.52;
    ctx.fillStyle = stat.color;
    ctx.font = `bold ${statLabelFontSize}px ${UI_DISPLAY_FONT}`;
    ctx.fillText(stat.label, sx, statsY - 16 * layoutScale);

    ctx.globalAlpha = 1;
    setGlow(stat.color, 10);
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${statValueFontSize}px ${UI_DISPLAY_FONT}`;
    ctx.fillText(stat.value, sx, statsY + 14 * layoutScale);
    clearGlow();
  });

  drawStageNodes({ y: stageNodesY, scale: compact ? 0.88 : 0.96 });
  ctx.restore();
}

function getTitleOptionWidth(label, fontSize) {
  ctx.save();
  ctx.font = `bold ${fontSize}px ${UI_DISPLAY_FONT}`;
  const width = ctx.measureText(label).width;
  ctx.restore();
  return width;
}

function drawTitleActionText(label, y, fontSize, isActive) {
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `bold ${fontSize}px ${UI_DISPLAY_FONT}`;

  if (isActive) {
    ctx.globalAlpha = 0.18;
    setGlow('#dd32b3', 30);
    ctx.fillStyle = '#dd32b3';
    ctx.fillText(label, canvas.width / 2, y);
  }

  ctx.globalAlpha = 1;
  setGlow(isActive ? '#8b5cf6' : 'transparent', isActive ? 14 : 0);
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
  const headingY = cy - 152 * layoutScale;
  const startRunY = cy - 6 * layoutScale;
  const tutorialY = startRunY + 46 * layoutScale;
  const leaderboardY = tutorialY + 46 * layoutScale;
  const statsY = leaderboardY + 82 * layoutScale;
  const statGap = compact ? Math.min(180 * layoutScale, W * 0.34) : Math.min(220 * layoutScale, W * 0.28);
  const statXs = [cx - statGap / 2, cx + statGap / 2];
  const stageNodesY = statsY + 88 * layoutScale;

  return {
    headingY,
    startRunY,
    tutorialY,
    leaderboardY,
    statsY,
    statXs,
    stageNodesY,
    layoutScale,
    compact
  };
}

function _measureCenteredTextBounds(label, cx, y, font, paddingX = 24, paddingY = 14) {
  ctx.save();
  ctx.font = font;
  const width = ctx.measureText(label).width;
  ctx.restore();
  return {
    x: cx - width / 2 - paddingX,
    y: y - paddingY,
    width: width + paddingX * 2,
    height: paddingY * 2,
  };
}

function getPauseMenuClickTargets() {
  const W = canvas.width, H = canvas.height;
  const cx = W / 2, cy = H / 2;
  const pw = 392, ph = 342;
  const px = cx - pw / 2, py = cy - ph / 2;
  return PAUSE_ITEMS.map((item, i) => {
    const iy = py + 120 + i * 42;
    let label = item;
    if (item === 'MUSIC VOL') {
      const vol = parseInt(localStorage.getItem('drone_music_vol') || '20', 10);
      const bars = Math.round(vol / 10);
      label = `MUSIC VOL  [${'|'.repeat(bars)}${' '.repeat(10 - bars)}]`;
    } else if (item === 'SFX') {
      const sfxOn = localStorage.getItem('drone_sfx_on') !== '0';
      label = `SFX        [${sfxOn ? 'ON ' : 'OFF'}]`;
    }

    ctx.save();
    ctx.font = `${i === pauseSel ? 'bold ' : ''}21px ${UI_DISPLAY_FONT}`;
    const chipW = Math.min(318, Math.max(220, ctx.measureText(label).width + 48));
    ctx.restore();

    return {
      item,
      index: i,
      x: cx - chipW / 2,
      y: iy - 17,
      width: chipW,
      height: 34,
      centerY: iy,
    };
  });
}

function getLeaderboardClickTargets() {
  const H = canvas.height;
  const cx = canvas.width / 2;
  const layoutScale = Math.max(0.72, Math.min(1.08, Math.min(canvas.width / 1280, H / 720)));
  const footerHintSize = Math.round(Math.max(12, 13 * layoutScale));
  const font = `bold ${footerHintSize}px ${UI_DISPLAY_FONT}`;
  return [
    {
      action: 'return',
      ..._measureCenteredTextBounds('[ ESC OR BACKSPACE TO RETURN ]', cx, H - 28, font, 28 * layoutScale, 16 * layoutScale),
    }
  ];
}

function getNameEntryClickTargets() {
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  const confirmLabel = nameEntry.name.length > 0 ? 'PRESS ENTER TO CONFIRM' : 'TYPE YOUR CALLSIGN';
  return [
    {
      action: 'confirm',
      enabled: nameEntry.name.length > 0,
      ..._measureCenteredTextBounds(confirmLabel, cx, cy + 80, `14px ${UI_DISPLAY_FONT}`, 24, 14),
    },
    {
      action: 'delete',
      enabled: nameEntry.name.length > 0,
      ..._measureCenteredTextBounds('[ BACKSPACE ]', cx, cy + 116, `bold 12px ${UI_DISPLAY_FONT}`, 20, 12),
    }
  ];
}

function getClickTargetAt(targets, x, y) {
  return targets.find(target =>
    x >= target.x &&
    x <= target.x + target.width &&
    y >= target.y &&
    y <= target.y + target.height &&
    target.enabled !== false
  ) || null;
}

let paused       = false;
let pauseSel     = 0;
let soundEnabled = true;

function drawPauseMenu() {
  const vol = parseInt(localStorage.getItem('drone_music_vol') || '20', 10);
  const bars = Math.round(vol / 10);
  const sfxOn = localStorage.getItem('drone_sfx_on') !== '0';
  const labels = [
    'RESUME',
    `MUSIC VOL  [${'|'.repeat(bars)}${' '.repeat(10 - bars)}]`,
    `SFX        [${sfxOn ? 'ON ' : 'OFF'}]`,
    'HOME',
  ];

  if (typeof pixiPost !== 'undefined' && typeof pixiPost.updatePauseMenu === 'function') {
    pixiPost.updatePauseMenu(pauseSel, labels);
    return;
  }

  // Canvas fallback (no PixiJS)
  const W = canvas.width, H = canvas.height;
  const cx = W / 2, cy = H / 2;
  const pw = 392, ph = 342;
  const px = cx - pw / 2, py = cy - ph / 2;

  ctx.save();
  ctx.globalAlpha = 0.78;
  ctx.fillStyle = '#020206';
  ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = 1;

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `bold 34px ${UI_DISPLAY_FONT}`;
  setGlow(COLOR_CYAN, 34);
  ctx.fillStyle = COLOR_CYAN;
  ctx.fillText('PAUSED', cx, cy - 100);
  clearGlow();

  PAUSE_ITEMS.forEach((item, i) => {
    const iy  = cy - 34 + i * 42;
    const sel = i === pauseSel;
    setGlow(sel ? '#ffffff' : COLOR_CYAN, sel ? 22 : 8);
    ctx.fillStyle   = sel ? '#ffffff' : COLOR_CYAN;
    ctx.globalAlpha = sel ? 1 : 0.62;
    ctx.font        = `${sel ? 'bold ' : ''}21px ${UI_DISPLAY_FONT}`;
    ctx.fillText(labels[i], cx, iy);
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
  ctx.font = `${size}px ${UI_DISPLAY_FONT}`;
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

function _drawPlayAreaCorners() {
  if (typeof PLAY_X === 'undefined') return;
  const stageColor = STAGE_ENEMY_COLORS[Math.min(stage.current - 1, 9)];
  const flowActive = player.flowStateActive;
  const now = getNow();
  const pulse = flowActive
    ? (0.60 + 0.30 * (Math.sin(now * 0.018) * 0.5 + 0.5))
    : 0.52;
  const armLen = 18;
  const off = 2; // extend just outside the border line

  ctx.save();
  ctx.globalAlpha = pulse;
  setGlow(stageColor, flowActive ? 18 : 10);
  ctx.strokeStyle = stageColor;
  ctx.lineWidth = 1.8;
  ctx.lineCap = 'square';

  const corners = [
    { x: PLAY_X - off,           y: PLAY_Y - off,           dx: -1, dy: -1 },
    { x: PLAY_X + PLAY_W + off,  y: PLAY_Y - off,           dx:  1, dy: -1 },
    { x: PLAY_X - off,           y: PLAY_Y + PLAY_H + off,  dx: -1, dy:  1 },
    { x: PLAY_X + PLAY_W + off,  y: PLAY_Y + PLAY_H + off,  dx:  1, dy:  1 },
  ];
  corners.forEach(({ x, y, dx, dy }) => {
    ctx.beginPath();
    ctx.moveTo(x + dx * armLen, y);
    ctx.lineTo(x, y);
    ctx.lineTo(x, y + dy * armLen);
    ctx.stroke();
  });

  clearGlow();
  ctx.restore();
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
  const textPrimary = '#d9d4ff';
  const textBright = '#f3f0ff';
  const scoreLabelColor = '#9db2ff';
  const scoreColor = textBright;
  const scoreGlow  = hudBlue;
  const killsLabelColor = '#f0a9de';
  const killsColor = '#f6ddff';
  const killsGlow  = hudPink;
  const livesColor = '#31afd4';
  const livesLabelColor = '#8fdcff';
  const livesValueColor = '#d9f3ff';
  const nukeColor  = hudPink;
  const nukeReadyColor = hudHot;
  const nukeLabelColor = '#f0a9de';
  const nukeValueColor = '#f6ddff';
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

  const uiScale = 1.3;

  const drawHudLabel = (text, x, y, color = hudMuted, glow = color, size = 13, alpha = 0.86) => {
    ctx.save();
    ctx.font = `bold ${Math.round(size * uiScale)}px ${UI_DISPLAY_FONT}`;
    ctx.globalAlpha = alpha;
    setGlow(glow, 10);
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
    clearGlow();
    ctx.restore();
    return y + Math.round(size * uiScale) + 8;
  };

  const drawArcadeCounter = (x, y, width, label, value, labelColor, accent, valueColor, valueSize, secondary = false) => {
    ctx.save();
    const labelY = y;
    const valueY = y + Math.round((secondary ? 26 : 31) * uiScale);

    ctx.font = `bold ${Math.round(13 * uiScale)}px ${UI_DISPLAY_FONT}`;
    ctx.globalAlpha = 0.84;
    ctx.fillStyle = labelColor;
    setGlow(accent, 10);
    ctx.fillText(label, x, labelY);
    clearGlow();

    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.font = `bold ${Math.round(valueSize * uiScale)}px ${UI_DISPLAY_FONT}`;
    ctx.globalAlpha = 1;
    ctx.fillStyle = valueColor;
    setGlow(accent, Math.max(16, valueSize * uiScale * (secondary ? 0.34 : 0.4)));
    ctx.fillText(value, x, valueY);

    ctx.globalAlpha = secondary ? 0.22 : 0.28;
    ctx.fillStyle = textBright;
    ctx.fillText(value, x + Math.max(1, valueSize * uiScale * 0.016), valueY - 1);
    clearGlow();

    ctx.restore();
    return valueY + Math.round(valueSize * uiScale) + Math.round((secondary ? 26 : 34) * uiScale);
  };

  const drawStatusCluster = (x, y, width, count, filledCount, color, label, activeReady = false, labelColor = hudMuted, valueColor = '#ffffff') => {
    const gap = 12;
    const indicatorWidth = Math.min(width, 240);
    const cellW = Math.max(48, Math.floor((indicatorWidth - gap * (count - 1)) / count));
    const cellH = 16;
    const pulse = 0.72 + 0.28 * (Math.sin(getNow() * 0.015) * 0.5 + 0.5);
    ctx.save();
    const labelY = y;
    ctx.font = `bold ${Math.round(13 * uiScale)}px ${UI_DISPLAY_FONT}`;
    ctx.globalAlpha = 0.82;
    ctx.fillStyle = labelColor;
    setGlow(color, 10);
    ctx.fillText(label, x, labelY);
    clearGlow();

    ctx.textAlign = 'right';
    ctx.font = `bold ${Math.round(18 * uiScale)}px ${UI_DISPLAY_FONT}`;
    ctx.globalAlpha = 0.94;
    ctx.fillStyle = valueColor;
    setGlow(color, activeReady ? 14 : 10);
    ctx.fillText(String(filledCount), x + indicatorWidth, labelY - 2);
    clearGlow();

    ctx.textAlign = 'left';
    const rowY = labelY + Math.round(28 * uiScale);
    for (let i = 0; i < count; i++) {
      const px = x + i * (cellW + gap);
      const filled = i < filledCount;
      const cellAlpha = filled ? (activeReady ? pulse : 0.9) : 0.2;

      ctx.globalAlpha = filled ? cellAlpha * 0.16 : 0.08;
      ctx.fillStyle = filled ? color : '#101427';
      traceSlantedBox(px, rowY + 3, cellW, cellH, 6);
      ctx.fill();

      ctx.globalAlpha = filled ? cellAlpha * 0.9 : 0.16;
      ctx.fillStyle = filled ? color : '#1f2440';
      if (filled) setGlow(color, activeReady ? 14 : 8);
      traceSlantedBox(px + 2, rowY + 5, cellW - 4, cellH - 4, 5);
      ctx.fill();

      if (filled) {
        ctx.globalAlpha = 0.32 * cellAlpha;
        ctx.fillStyle = '#ffffff';
        traceSlantedBox(px + 5, rowY + 7, cellW - 11, 3, 2);
        ctx.fill();
      }
      clearGlow();
    }
    ctx.restore();
    return rowY + cellH + Math.round(18 * uiScale);
  };

  const drawStageReadout = (x, y, width) => {
    const stageValue = `${Math.min(stage.current, 10)}`;
    ctx.save();
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    ctx.font = `bold ${Math.round(12 * uiScale)}px ${UI_DISPLAY_FONT}`;
    ctx.globalAlpha = 0.78;
    ctx.fillStyle = scoreLabelColor;
    setGlow(hudBlue, 10);
    ctx.fillText('STAGE', x, y);
    clearGlow();

    ctx.textAlign = 'right';
    ctx.font = `bold ${Math.round(22 * uiScale)}px ${UI_DISPLAY_FONT}`;
    ctx.globalAlpha = 0.94;
    ctx.fillStyle = textPrimary;
    setGlow(hudPurple, 12);
    ctx.fillText(stageValue, x + width, y - 3);
    clearGlow();

    ctx.restore();
    return y + Math.round(34 * uiScale);
  };

  const totalRunMs = STAGE_DURATION * 10;
  const currentStageIndex = Math.max(0, Math.min(9, stage.current - 1));
  const runElapsedMs = currentStageIndex * STAGE_DURATION + (STAGE_DURATION - Math.max(0, Math.min(STAGE_DURATION, stage.timer)));
  const runProgress = Math.max(0, Math.min(1, runElapsedMs / totalRunMs));
  const scoreFontSize = Math.round((Math.min(52, Math.max(34, Math.floor(barW * 0.22)))) + runProgress * Math.min(8, Math.max(4, barW * 0.025)));
  const killsFontSize = Math.round(Math.min(46, Math.max(26, Math.floor(barW * 0.17))));

  let cy = py + pad;

  cy = drawArcadeCounter(tx, cy, barW, 'SCORE', player.score.toLocaleString(), scoreLabelColor, scoreGlow, scoreColor, scoreFontSize, false);
  cy = drawArcadeCounter(tx, cy, barW, 'KILLS', stage.totalKills.toLocaleString(), killsLabelColor, killsGlow, killsColor, killsFontSize, true);

  cy += Math.round(10 * uiScale);
  cy = drawStatusCluster(tx, cy, Math.min(barW, 240), 3, Math.max(0, Math.min(3, player.lives)), livesColor, 'LIVES', false, livesLabelColor, livesValueColor);
  cy += Math.round(2 * uiScale);
  cy = drawStatusCluster(tx, cy, Math.min(barW, 240), 3, Math.max(0, Math.min(3, nukeUsesLeft)), player.ultReady ? nukeReadyColor : nukeColor, 'BASE DROP', player.ultReady, nukeLabelColor, nukeValueColor);
  cy += Math.round(10 * uiScale);
  cy = drawStageReadout(tx, cy, Math.min(barW, 240));

  _drawPlayAreaCorners();
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
  // Vignette, scanlines, and near-death red vignette are now handled by
  // the GPU CRTFilter in pixi-post.js. setNearDeath() is called each frame
  // from game.js. Nothing to draw here on the Canvas 2D side.
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
  ctx.font = `bold 18px ${UI_DISPLAY_FONT}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  const lines = runtimeErrorMessage.split(/\r?\n/).slice(0, 8);
  ctx.fillText('RUNTIME ERROR', 20, 20);
  ctx.fillStyle = '#ffffff';
  lines.forEach((line, i) => ctx.fillText(line, 20, 56 + i * 22));
  ctx.restore();
}

function startScreenTransition(type, onMidpoint, onComplete) {
  if (typeof pixiPost !== 'undefined' && typeof pixiPost.startTransition === 'function') {
    const started = pixiPost.startTransition(type, onMidpoint, onComplete);
    if (started) return true;
  }
  if (typeof onMidpoint === 'function') onMidpoint();
  if (typeof onComplete === 'function') onComplete();
  return false;
}

function startTutorialRun() {
  startScreenTransition('fade', () => {
    _resetAllState();
    gameState = 'tutorial';
    tutorial.start();
    audio.playMusic('gameplay');
  });
}

function openLeaderboardFromTitle() {
  startScreenTransition('fade', () => {
    gameState = 'leaderboard';
    leaderboard.fetchScores();
  });
}

function startGame() {
  if (!localStorage.getItem('drone_tutorial_done')) {
    startTutorialRun();
    return;
  }

  startScreenTransition('fade', () => {
    _resetAllState();
    gameState = 'playing';
    audio.playMusic('gameplay');
  });
}

function startTutorialFromDevMenu() {
  startTutorialRun();
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
    else if (titleSelection === 1) startTutorialRun();
    else openLeaderboardFromTitle();
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
  ctx.font = `bold 13px ${UI_DISPLAY_FONT}`;
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
  ctx.font = `bold 11px ${UI_DISPLAY_FONT}`;
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
  ctx.font = `bold 11px ${UI_DISPLAY_FONT}`;
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
  ctx.font = `11px ${UI_DISPLAY_FONT}`;
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

  ctx.font = `bold 22px ${UI_DISPLAY_FONT}`;
  ctx.textAlign = 'center';
  ctx.fillStyle = col;
  ctx.fillText(stageNum, x + w / 2, y + h / 2 + 4);

  ctx.font = `9px ${UI_DISPLAY_FONT}`;
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
