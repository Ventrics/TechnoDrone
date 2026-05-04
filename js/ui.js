const TITLE_WORDMARK_FONT = '"cc-running-with-scissors-up", "anatol-mn", sans-serif';
const UI_DISPLAY_FONT = '"manifold-extd-cf", "Eurostile Extended", "Eurostile Extended #2", "Microgramma D Extended", "Microgramma", sans-serif';

// --- Shared floating dust particle factory ---
function _newDustParticle(colors, resetAtBottom) {
  return {
    x: Math.random() * 1920,
    y: resetAtBottom ? 1080 + Math.random() * 80 : Math.random() * 1080,
    vx: (Math.random() - 0.5) * 0.15,
    vy: -(Math.random() * 0.14 + 0.03),
    r: Math.random() * 1.5 + 0.25,
    alpha: Math.random() * 0.65 + 0.2,
    twinkleSpeed: Math.random() * 0.004 + 0.001,
    twinkleOffset: Math.random() * Math.PI * 2,
    color: colors[Math.floor(Math.random() * colors.length)],
  };
}

function _updateDust(dustArr, colors, delta) {
  const now = getNow();
  dustArr.forEach((p, i) => {
    p.x += p.vx * delta * 0.06;
    p.y += p.vy * delta * 0.06;
    p.alpha = 0.2 + 0.6 * (0.5 + 0.5 * Math.sin(now * p.twinkleSpeed + p.twinkleOffset));
    if (p.y < -10) dustArr[i] = _newDustParticle(colors, true);
  });
}

function _drawDust(dustArr, W, H) {
  dustArr.forEach(p => {
    const px = (p.x / 1920) * W;
    const py = (p.y / 1080) * H;
    ctx.save();
    ctx.globalAlpha = p.alpha * 0.88;
    ctx.shadowColor = p.color;
    ctx.shadowBlur = 5;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(px, py, p.r * (W / 1920), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
}

// --- Title screen dust ---
const _DUST_COLORS = ['#ffffff', '#ffffff', '#c4b5fd', '#a78bfa', '#818cf8'];
const titleDust = Array.from({ length: 200 }, () => _newDustParticle(_DUST_COLORS, false));
function updateTitleDust(delta) { _updateDust(titleDust, _DUST_COLORS, delta); }

// --- Leaderboard screen dust ---
const _LB_DUST_COLORS = ['#ffffff', '#ffffff', '#31afd4', '#6366f1', '#8b5cf6'];
const lbDust = Array.from({ length: 160 }, () => _newDustParticle(_LB_DUST_COLORS, false));
function updateLbDust(delta) { _updateDust(lbDust, _LB_DUST_COLORS, delta); }

// --- Game Over screen dust ---
const _DEATH_DUST_COLORS = ['#ffffff', '#ff5544', '#ff3300', '#ff9966', '#ffffff'];
const deathDust = Array.from({ length: 160 }, () => _newDustParticle(_DEATH_DUST_COLORS, false));
function updateDeathDust(delta) { _updateDust(deathDust, _DEATH_DUST_COLORS, delta); }

// --- Mission Complete screen dust ---
const _WIN_DUST_COLORS = ['#ffffff', '#d8b4fe', '#fb29fd', '#a78bfa', '#ffffff'];
const winDust = Array.from({ length: 160 }, () => _newDustParticle(_WIN_DUST_COLORS, false));
function updateWinDust(delta) { _updateDust(winDust, _WIN_DUST_COLORS, delta); }

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
  updateLbDust(delta);
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

  ctx.fillStyle = '#010103';
  ctx.fillRect(0, 0, W, H);

  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, '#020106');
  sky.addColorStop(0.28, '#060312');
  sky.addColorStop(0.6, '#0a041a');
  sky.addColorStop(1, '#010103');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  const topGlow = ctx.createRadialGradient(cx, H * 0.18, 0, cx, H * 0.18, Math.max(W, H) * 0.5);
  topGlow.addColorStop(0, 'rgba(49,175,212,0.18)');
  topGlow.addColorStop(0.45, 'rgba(99,102,241,0.10)');
  topGlow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = topGlow;
  ctx.fillRect(0, 0, W, H);

  _drawDust(lbDust, W, H);

  const vignette = ctx.createRadialGradient(cx, cy * 0.86, Math.min(W, H) * 0.12, cx, cy, Math.max(W, H) * 0.78);
  vignette.addColorStop(0, 'rgba(0,0,0,0)');
  vignette.addColorStop(0.5, 'rgba(0,0,0,0.16)');
  vignette.addColorStop(1, 'rgba(0,0,0,0.88)');
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
    if (score <= 0) return false;
    const name = loadPlayerName();
    if (!name) {
      this.submitOk = false;
      this.submitMessage = 'NO CALLSIGN - SCORE NOT SUBMITTED';
      return false;
    }
    try {
      let remoteAlreadyBetter = false;
      const checkRes = await fetch(`${SUPABASE_URL}/rest/v1/leaderboard?player_name=eq.${encodeURIComponent(name)}&select=id,score`, {
        headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` }
      });
      if (!checkRes.ok) {
        const text = await checkRes.text();
        this.submitOk = false;
        this.submitMessage = `CHECK FAILED ${checkRes.status}`;
        console.error('Leaderboard check failed:', checkRes.status, text);
        return false;
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
            return false;
          }
        } else {
          remoteAlreadyBetter = true;
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
          return false;
        }
      }

      if (!remoteAlreadyBetter) {
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
      }
      this.loadTime = getNow();
      this.submitOk = true;
      this.submitMessage = remoteAlreadyBetter ? 'BEST ALREADY ON LEADERBOARD' : 'SCORE SUBMITTED';

      await this.fetchScores();
      return true;
    } catch (e) {
      this.error = true;
      this.submitOk = false;
      this.submitMessage = 'SUBMIT ERROR';
      console.error('Leaderboard submit exception:', e);
      return false;
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

let pendingLeaderboardSubmission = null;

function normalizeLeaderboardRun(score, kills) {
  return {
    score: Math.max(0, Math.floor(Number(score) || 0)),
    kills: Math.max(0, Math.floor(Number(kills) || 0)),
  };
}

function betterLeaderboardRun(current, candidate) {
  if (!candidate) return current;
  if (!current) return candidate;
  return candidate.score >= current.score ? candidate : current;
}

function getBestSavedLeaderboardRun() {
  const savedBest = normalizeLeaderboardRun(save.highScore, 0);
  const runs = Array.isArray(save.runs) ? save.runs : [];
  return runs.reduce((best, run) => {
    const candidate = normalizeLeaderboardRun(run.score, run.kills);
    return betterLeaderboardRun(best, candidate);
  }, savedBest);
}

function queueLeaderboardSubmission(score, kills) {
  const snapshot = normalizeLeaderboardRun(score, kills);
  if (snapshot.score <= 0) return null;
  pendingLeaderboardSubmission = betterLeaderboardRun(pendingLeaderboardSubmission, snapshot);
  return pendingLeaderboardSubmission;
}

function clearLeaderboardSubmission(snapshot) {
  if (!pendingLeaderboardSubmission || !snapshot) return;
  if (snapshot.score >= pendingLeaderboardSubmission.score) {
    pendingLeaderboardSubmission = null;
  }
}

function submitLeaderboardRun(score, kills) {
  const snapshot = queueLeaderboardSubmission(score, kills);
  if (!snapshot) return false;
  if (!loadPlayerName()) {
    nameEntry.name = '';
    return false;
  }
  leaderboard.submitScore(snapshot.score, snapshot.kills).then(ok => {
    if (ok) clearLeaderboardSubmission(snapshot);
  });
  return true;
}

function getQueuedLeaderboardRun() {
  let best = pendingLeaderboardSubmission || normalizeLeaderboardRun(0, 0);
  if (typeof player !== 'undefined' && typeof stage !== 'undefined') {
    const activeRun = normalizeLeaderboardRun(player.score, stage.totalKills);
    best = betterLeaderboardRun(best, activeRun);
  }
  best = betterLeaderboardRun(best, getBestSavedLeaderboardRun());
  return best;
}

function openLeaderboardWithBestSync() {
  const snapshot = getQueuedLeaderboardRun();
  if (snapshot.score > 0 && !loadPlayerName()) {
    queueLeaderboardSubmission(snapshot.score, snapshot.kills);
    nameEntry.name = '';
    gameState = 'nameEntry';
    return;
  }

  gameState = 'leaderboard';
  if (snapshot.score > 0) {
    leaderboard.submitOk = true;
    leaderboard.submitMessage = 'SYNCING BEST SCORE...';
    const submitted = submitLeaderboardRun(snapshot.score, snapshot.kills);
    if (!submitted) leaderboard.fetchScores();
    return;
  }

  leaderboard.fetchScores();
}

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
    if (justPressed['Escape'] && pendingLeaderboardSubmission && !player.dead) {
      pendingLeaderboardSubmission = null;
      gameState = 'leaderboard';
      leaderboard.fetchScores();
      return;
    }
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

    if (pendingLeaderboardSubmission && !player.dead) {
      ctx.font = `bold 12px ${UI_DISPLAY_FONT}`;
      ctx.fillStyle = '#6fa8ff';
      ctx.fillText('[ ESC TO SKIP ]', cx, cy + (this.name.length > 0 ? 148 : 116));
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
  backdrop.addColorStop(0, '#020104');
  backdrop.addColorStop(0.28, '#07030f');
  backdrop.addColorStop(0.62, '#0d0519');
  backdrop.addColorStop(1, '#020104');
  ctx.fillStyle = backdrop;
  ctx.fillRect(0, 0, W, H);

  const topGlow = ctx.createRadialGradient(cx, H * 0.2, 0, cx, H * 0.2, Math.max(W, H) * 0.54);
  topGlow.addColorStop(0, 'rgba(139,92,246,0.22)');
  topGlow.addColorStop(0.42, 'rgba(109,40,217,0.10)');
  topGlow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = topGlow;
  ctx.fillRect(0, 0, W, H);

  const sideGlowLeft = ctx.createRadialGradient(W * 0.18, H * 0.55, 0, W * 0.18, H * 0.55, Math.max(W, H) * 0.32);
  sideGlowLeft.addColorStop(0, 'rgba(109,40,217,0.12)');
  sideGlowLeft.addColorStop(1, 'rgba(109,40,217,0)');
  ctx.fillStyle = sideGlowLeft;
  ctx.fillRect(0, 0, W, H);

  const sideGlowRight = ctx.createRadialGradient(W * 0.82, H * 0.5, 0, W * 0.82, H * 0.5, Math.max(W, H) * 0.32);
  sideGlowRight.addColorStop(0, 'rgba(139,92,246,0.10)');
  sideGlowRight.addColorStop(1, 'rgba(139,92,246,0)');
  ctx.fillStyle = sideGlowRight;
  ctx.fillRect(0, 0, W, H);

  // Floating dust particles
  _drawDust(titleDust, W, H);

  const vignette = ctx.createRadialGradient(cx, cy * 0.88, Math.min(W, H) * 0.16, cx, cy, Math.max(W, H) * 0.8);
  vignette.addColorStop(0, 'rgba(0,0,0,0)');
  vignette.addColorStop(0.5, 'rgba(0,0,0,0.18)');
  vignette.addColorStop(1, 'rgba(0,0,0,0.88)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, W, H);

  ctx.save();
  ctx.globalAlpha = 0.03;
  ctx.fillStyle = '#a855f7';
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

  // Chromatic split intro — R/B ghosts converge into the main text
  if (titleIntroLive && titleIntroT < 1) {
    const progress   = Math.max(0, (titleIntroT - 0.5) / 0.5);
    const eased      = 1 - Math.pow(progress, 2.5);
    const chromOff   = eased * 18 * layoutScale;
    const ghostAlpha = Math.max(0, 1 - titleIntroT * 1.8) * 0.52;
    if (chromOff > 0.3 && ghostAlpha > 0.01) {
      ctx.save();
      ctx.font = `${headingFontSize}px ${TITLE_WORDMARK_FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = ghostAlpha;
      ctx.fillStyle = '#ff3377';
      ctx.shadowColor = '#ff0055';
      ctx.shadowBlur = 22;
      ctx.fillText('Techno Drone', cx - chromOff, headingY);
      ctx.fillStyle = '#3366ff';
      ctx.shadowColor = '#0033ff';
      ctx.fillText('Techno Drone', cx + chromOff, headingY);
      ctx.restore();
    }
  }

  drawNeonWord('Techno Drone', headingY, headingFontSize, ['#4c1d95', '#7c3aed', '#a855f7', '#e9d5ff']);

  // Snap bloom burst on convergence
  if (titleSnapDecay > 0) {
    ctx.save();
    ctx.font = `${headingFontSize}px ${TITLE_WORDMARK_FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#e9d5ff';
    ctx.shadowBlur = 36 * titleSnapDecay;
    ctx.globalAlpha = titleSnapDecay * 0.7;
    ctx.fillText('Techno Drone', cx, headingY);
    ctx.restore();
  }

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

function _crtTracePath(x, y, w, h, r) {
  const rad = Math.max(0, Math.min(r, Math.min(w, h) * 0.5));
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.lineTo(x + w - rad, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rad);
  ctx.lineTo(x + w, y + h - rad);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rad, y + h);
  ctx.lineTo(x + rad, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rad);
  ctx.lineTo(x, y + rad);
  ctx.quadraticCurveTo(x, y, x + rad, y);
  ctx.closePath();
}

// CRT bezel cache — the bezel is static, so we render it once to an offscreen
// canvas and just blit it each frame instead of redrawing ~270 scanline rects.
let _crtBezelCache = null;
let _crtBezelCacheKey = '';

function _crtTracePathOn(c, x, y, w, h, r) {
  const rad = Math.max(0, Math.min(r, Math.min(w, h) * 0.5));
  c.beginPath();
  c.moveTo(x + rad, y);
  c.lineTo(x + w - rad, y);
  c.quadraticCurveTo(x + w, y, x + w, y + rad);
  c.lineTo(x + w, y + h - rad);
  c.quadraticCurveTo(x + w, y + h, x + w - rad, y + h);
  c.lineTo(x + rad, y + h);
  c.quadraticCurveTo(x, y + h, x, y + h - rad);
  c.lineTo(x, y + rad);
  c.quadraticCurveTo(x, y, x + rad, y);
  c.closePath();
}

function _renderCRTBezelToCache(w, h) {
  const off = document.createElement('canvas');
  off.width = w;
  off.height = h;
  const octx = off.getContext('2d');

  // Outer dark bezel "case"
  _crtTracePathOn(octx, 0, 0, w, h, 8);
  octx.fillStyle = '#04060c';
  octx.globalAlpha = 0.92;
  octx.fill();

  // Inset screen area (subtle gradient suggesting curved CRT glass)
  const sx = 4, sy = 4, sw = w - 8, sh = h - 8;
  const grad = octx.createLinearGradient(0, sy, 0, sy + sh);
  grad.addColorStop(0,    'rgba(8, 14, 28, 0.95)');
  grad.addColorStop(0.5,  'rgba(12, 20, 38, 0.92)');
  grad.addColorStop(1,    'rgba(6, 10, 22, 0.96)');
  _crtTracePathOn(octx, sx, sy, sw, sh, 6);
  octx.fillStyle = grad;
  octx.globalAlpha = 1;
  octx.fill();

  // Faint scanline overlay (clipped to screen area)
  octx.save();
  _crtTracePathOn(octx, sx, sy, sw, sh, 6);
  octx.clip();
  octx.globalAlpha = 0.045;
  octx.fillStyle = '#000000';
  for (let ly = sy; ly < sy + sh; ly += 3) {
    octx.fillRect(sx, ly, sw, 1);
  }
  // Subtle horizontal screen-glow band (top hot-spot, like CRT phosphor)
  const hot = octx.createLinearGradient(0, sy, 0, sy + sh * 0.55);
  hot.addColorStop(0, 'rgba(120, 180, 255, 0.06)');
  hot.addColorStop(1, 'rgba(120, 180, 255, 0)');
  octx.globalAlpha = 1;
  octx.fillStyle = hot;
  octx.fillRect(sx, sy, sw, sh * 0.55);
  octx.restore();

  // Outer hairline border (cyan accent — the bezel edge)
  _crtTracePathOn(octx, 0.5, 0.5, w - 1, h - 1, 8);
  octx.globalAlpha = 0.42;
  octx.shadowColor = '#31afd4';
  octx.shadowBlur = 6;
  octx.strokeStyle = '#31afd4';
  octx.lineWidth = 1;
  octx.stroke();
  octx.shadowBlur = 0;

  // Inner hairline (the screen's edge)
  _crtTracePathOn(octx, sx + 0.5, sy + 0.5, sw - 1, sh - 1, 6);
  octx.globalAlpha = 0.20;
  octx.strokeStyle = '#7ce0ff';
  octx.lineWidth = 1;
  octx.stroke();

  return off;
}

function _drawCRTBezel(x, y, w, h, flicker = 0) {
  const key = `${w | 0}x${h | 0}`;
  if (!_crtBezelCache || _crtBezelCacheKey !== key) {
    _crtBezelCache = _renderCRTBezelToCache(w | 0, h | 0);
    _crtBezelCacheKey = key;
  }
  ctx.drawImage(_crtBezelCache, x | 0, y | 0);
  // Optional flow-state flicker — single cheap fillRect, not a per-row redraw
  if (flicker > 0) {
    ctx.save();
    ctx.globalAlpha = 0.05 * flicker;
    ctx.fillStyle = '#7ce0ff';
    ctx.fillRect(x + 4, y + 4, w - 8, h - 8);
    ctx.restore();
  }
}

function _drawCRTCell(x, y, w, h, accent = '#31afd4') {
  ctx.save();
  // Cell border (very subtle — the sub-display frame)
  _crtTracePath(x + 0.5, y + 0.5, w - 1, h - 1, 4);
  ctx.globalAlpha = 0.26;
  ctx.strokeStyle = accent;
  ctx.lineWidth = 1;
  ctx.stroke();
  // Tiny corner brackets at top-left and bottom-right for instrument feel
  ctx.globalAlpha = 0.55;
  ctx.shadowColor = accent;
  ctx.shadowBlur = 4;
  ctx.strokeStyle = accent;
  ctx.lineWidth = 1.2;
  const bL = 8;
  ctx.beginPath();
  ctx.moveTo(x + 2, y + bL);
  ctx.lineTo(x + 2, y + 2);
  ctx.lineTo(x + bL, y + 2);
  ctx.moveTo(x + w - bL, y + h - 2);
  ctx.lineTo(x + w - 2, y + h - 2);
  ctx.lineTo(x + w - 2, y + h - bL);
  ctx.stroke();
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

  // CRT terminal bezel + scanlines (drawn behind all content)
  _drawCRTBezel(px, py, pw, ph, 0);

  const traceSlantedBox = (x, y, w, h, cut = 8) => {
    const c = Math.max(2, Math.min(cut, Math.min(w, h) * 0.45));
    ctx.beginPath();
    ctx.moveTo(x + c, y);
    ctx.lineTo(x + w, y);
    ctx.lineTo(x + w - c, y + h);
    ctx.lineTo(x, y + h);
    ctx.closePath();
  };

  const traceDroneIcon = (cx, cy, w, h, flipped = false) => {
    const halfW = w / 2;
    const halfH = h / 2;
    const dir = flipped ? -1 : 1;
    ctx.beginPath();
    ctx.moveTo(cx,                cy - halfH * dir);
    ctx.lineTo(cx + halfW * 0.92, cy + halfH * dir * 0.78);
    ctx.lineTo(cx + halfW * 0.45, cy + halfH * dir * 0.42);
    ctx.lineTo(cx,                cy + halfH * dir);
    ctx.lineTo(cx - halfW * 0.45, cy + halfH * dir * 0.42);
    ctx.lineTo(cx - halfW * 0.92, cy + halfH * dir * 0.78);
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
    const cellW = Math.max(28, Math.floor((indicatorWidth - gap * (count - 1)) / count));
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

  const drawDroneCluster = (x, y, width, count, filledCount, color, label, activeReady = false, labelColor = hudMuted, valueColor = '#ffffff', flipped = false) => {
    const gap = 6;
    const indicatorWidth = Math.min(width, 240);
    const cellW = Math.max(20, Math.floor((indicatorWidth - gap * (count - 1)) / count));
    const cellH = Math.round(26 * uiScale);
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
      const cx = x + i * (cellW + gap) + cellW / 2;
      const cy = rowY + cellH / 2;
      const filled = i < filledCount;
      const cellAlpha = filled ? (activeReady ? pulse : 0.95) : 0.32;

      if (filled) {
        ctx.globalAlpha = cellAlpha * 0.22;
        ctx.fillStyle = color;
        traceDroneIcon(cx, cy + 1, cellW, cellH, flipped);
        ctx.fill();

        ctx.globalAlpha = cellAlpha;
        ctx.fillStyle = color;
        setGlow(color, activeReady ? 14 : 10);
        traceDroneIcon(cx, cy, cellW, cellH, flipped);
        ctx.fill();
        clearGlow();

        ctx.globalAlpha = cellAlpha * 0.85;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 0.8;
        traceDroneIcon(cx, cy, cellW, cellH, flipped);
        ctx.stroke();
      } else {
        ctx.globalAlpha = cellAlpha;
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        setGlow(color, 4);
        traceDroneIcon(cx, cy, cellW, cellH, flipped);
        ctx.stroke();
        clearGlow();
      }
    }
    ctx.restore();
    return rowY + cellH + Math.round(18 * uiScale);
  };

  const drawHighScoreLine = (x, y) => {
    ctx.save();
    ctx.font = `bold ${Math.round(11 * uiScale)}px ${UI_DISPLAY_FONT}`;
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = scoreLabelColor;
    setGlow(scoreGlow, 8);
    ctx.fillText('HIGH SCORE', x, y);
    clearGlow();

    const valueY = y + Math.round(15 * uiScale);
    ctx.font = `bold ${Math.round(17 * uiScale)}px ${UI_DISPLAY_FONT}`;
    ctx.globalAlpha = 0.88;
    ctx.fillStyle = textPrimary;
    setGlow(scoreGlow, 10);
    ctx.fillText((save && save.highScore ? save.highScore : 0).toLocaleString(), x, valueY);
    clearGlow();
    ctx.restore();
    return valueY + Math.round(17 * uiScale) + Math.round(20 * uiScale);
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

  // Cell 1: SCORE + HIGH SCORE
  const cell1Top = cy - Math.round(8 * uiScale);
  cy = drawArcadeCounter(tx, cy, barW, 'SCORE', player.score.toLocaleString(), scoreLabelColor, scoreGlow, scoreColor, scoreFontSize, false);
  cy = drawHighScoreLine(tx, cy - Math.round(18 * uiScale));
  const cell1Bot = cy - Math.round(6 * uiScale);

  // Cell 2: KILLS
  const cell2Top = cell1Bot + Math.round(4 * uiScale);
  cy = cell2Top + Math.round(8 * uiScale);
  cy = drawArcadeCounter(tx, cy, barW, 'KILLS', stage.totalKills.toLocaleString(), killsLabelColor, killsGlow, killsColor, killsFontSize, true);
  const cell2Bot = cy - Math.round(8 * uiScale);

  // Cell 3: STATUS (LIVES + BASS DROP)
  const cell3Top = cell2Bot + Math.round(4 * uiScale);
  cy = cell3Top + Math.round(10 * uiScale);
  cy = drawDroneCluster(tx, cy, Math.min(barW, 240), 6, Math.max(0, Math.min(6, player.lives)), livesColor, 'LIVES', false, livesLabelColor, livesValueColor, false);
  cy += Math.round(4 * uiScale);
  // Hairline divider between LIVES and BASS DROP inside the status cell
  ctx.save();
  ctx.globalAlpha = 0.18;
  ctx.strokeStyle = '#7ce0ff';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(tx + 4, cy - Math.round(2 * uiScale));
  ctx.lineTo(tx + barW - 4, cy - Math.round(2 * uiScale));
  ctx.stroke();
  ctx.restore();
  cy = drawDroneCluster(tx, cy, Math.min(barW, 240), 3, Math.max(0, Math.min(3, nukeUsesLeft)), player.ultReady ? nukeReadyColor : nukeColor, 'BASS DROP', player.ultReady, nukeLabelColor, nukeValueColor, true);
  const cell3Bot = cy - Math.round(2 * uiScale);

  // Draw cell frames on top (hairline + corner brackets — instrument-cluster feel)
  const cellX = tx - Math.round(10 * uiScale);
  const cellW = barW + Math.round(20 * uiScale);
  _drawCRTCell(cellX, cell1Top, cellW, cell1Bot - cell1Top, scoreGlow);
  _drawCRTCell(cellX, cell2Top, cellW, cell2Bot - cell2Top, killsGlow);
  _drawCRTCell(cellX, cell3Top, cellW, cell3Bot - cell3Top, livesColor);

  _drawPlayAreaCorners();
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
    openLeaderboardWithBestSync();
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
  updateTitleDust(delta);
  titleGridOff += delta * 0.022;
  titleScanBeamPos = (titleScanBeamPos + delta * 0.0002) % 1;
  if (titleIntroLive && titleIntroT < 1) {
    titleIntroT = Math.min(1, titleIntroT + delta * 0.0008);
    if (!titleSnapFired && titleIntroT >= 0.92) {
      titleSnapFired = true;
      titleSnapDecay = 1.0;
    }
  }
  if (titleSnapDecay > 0) {
    titleSnapDecay = Math.max(0, titleSnapDecay - delta * 0.010);
  }
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
const DEV_COLS = 5, DEV_ROWS = 2;

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

function getDevAnalyticsSnapshot() {
  const runs = Array.isArray(save.runs) ? save.runs : [];
  const base = typeof analytics !== 'undefined' ? analytics : null;
  const stageReachCounts = Array(10).fill(0);
  const deathStageCounts = Array(10).fill(0);
  let totalRuns = 0;
  let totalScore = 0;
  let totalKills = 0;
  let completions = 0;

  if (base && base.totalRuns > 0) {
    totalRuns = base.totalRuns;
    totalScore = base.totalScore || 0;
    totalKills = base.totalKills || 0;
    completions = base.completions || 0;
    for (let i = 0; i < 10; i++) {
      stageReachCounts[i] = Math.max(0, Math.floor(Number(base.stageReachCounts?.[i]) || 0));
      deathStageCounts[i] = Math.max(0, Math.floor(Number(base.deathStageCounts?.[i]) || 0));
    }
  } else {
    runs.forEach(run => {
      totalRuns++;
      totalScore += Math.max(0, Math.floor(Number(run.score) || 0));
      totalKills += Math.max(0, Math.floor(Number(run.kills) || 0));
      const reached = Math.max(1, Math.min(10, Math.floor(Number(run.stageReached) || 0)));
      if (reached) stageReachCounts[reached - 1]++;
      if (run.completed) completions++;
      else if (reached) deathStageCounts[reached - 1]++;
    });
  }

  const stageSamples = stageReachCounts.reduce((sum, count) => sum + count, 0);
  const weightedStageTotal = stageReachCounts.reduce((sum, count, i) => sum + count * (i + 1), 0);
  const avgStage = stageSamples > 0 ? weightedStageTotal / stageSamples : 0;
  const mostReachedIndex = stageReachCounts.reduce((best, count, i) =>
    count > stageReachCounts[best] ? i : best, 0);

  return {
    totalRuns,
    totalScore,
    totalKills,
    completions,
    avgStage,
    mostReachedStage: stageReachCounts[mostReachedIndex] > 0 ? mostReachedIndex + 1 : 0,
    stageReachCounts,
    deathStageCounts,
    lastRun: base?.lastRun || runs[runs.length - 1] || null,
  };
}

function getDevMenuLayout() {
  const W = canvas.width, H = canvas.height;
  const layoutScale = Math.max(0.76, Math.min(1.04, Math.min(W / 1280, H / 720)));
  const contentW = Math.min(W - 56 * layoutScale, 1180 * layoutScale);
  const gap = 28 * layoutScale;
  const leftW = Math.min(640 * layoutScale, contentW * 0.58);
  const rightW = contentW - leftW - gap;
  const leftX = (W - contentW) / 2;
  const rightX = leftX + leftW + gap;
  const topY = Math.max(92 * layoutScale, H * 0.15);
  const stageGap = 13 * layoutScale;
  const stageBtnW = (leftW - stageGap * (DEV_COLS - 1)) / DEV_COLS;
  const stageBtnH = 54 * layoutScale;
  const stageButtons = [];

  for (let i = 0; i < 10; i++) {
    const col = i % DEV_COLS;
    const row = Math.floor(i / DEV_COLS);
    stageButtons.push({
      action: 'stage',
      value: i + 1,
      x: leftX + col * (stageBtnW + stageGap),
      y: topY + 48 * layoutScale + row * (stageBtnH + stageGap),
      width: stageBtnW,
      height: stageBtnH,
    });
  }

  const actionY = topY + 48 * layoutScale + DEV_ROWS * (stageBtnH + stageGap) + 22 * layoutScale;
  const actionGap = 12 * layoutScale;
  const actionBtnW = (leftW - actionGap * 2) / 3;
  const actionBtnH = 42 * layoutScale;
  const actionButtons = [
    {
      action: 'fast',
      label: `FAST STAGE ${devFastStage ? 'ON' : 'OFF'}`,
      color: devFastStage ? '#00ffcc' : '#6f7d91',
      x: leftX,
      y: actionY,
      width: actionBtnW,
      height: actionBtnH,
    },
    {
      action: 'tutorial',
      label: 'TUTORIAL',
      color: '#aa55ff',
      x: leftX + actionBtnW + actionGap,
      y: actionY,
      width: actionBtnW,
      height: actionBtnH,
    },
    {
      action: 'back',
      label: 'TITLE',
      color: '#b8c7d9',
      x: leftX + (actionBtnW + actionGap) * 2,
      y: actionY,
      width: actionBtnW,
      height: actionBtnH,
    },
  ];

  const screenGap = 12 * layoutScale;
  const screenBtnW = (rightW - screenGap) / 2;
  const screenBtnH = 44 * layoutScale;
  const screenTop = topY + 48 * layoutScale;
  const screenButtons = [
    { action: 'screen', value: 'death', label: 'GAME OVER', color: '#ff5544' },
    { action: 'screen', value: 'win', label: 'MISSION COMPLETE', color: '#d8b4fe' },
    { action: 'screen', value: 'leaderboard', label: 'LEADERBOARD', color: '#31afd4' },
    { action: 'screen', value: 'pause', label: 'PAUSE MENU', color: '#a5b4fc' },
  ].map((button, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    return {
      ...button,
      x: rightX + col * (screenBtnW + screenGap),
      y: screenTop + row * (screenBtnH + screenGap),
      width: screenBtnW,
      height: screenBtnH,
    };
  });

  return {
    W,
    H,
    layoutScale,
    leftX,
    leftW,
    rightX,
    rightW,
    topY,
    stageButtons,
    actionButtons,
    screenButtons,
    analyticsY: screenTop + 2 * (screenBtnH + screenGap) + 30 * layoutScale,
  };
}

function _drawDevSectionTitle(label, x, y, color) {
  ctx.save();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.globalAlpha = 0.78;
  setGlow(color, 12);
  ctx.fillStyle = color;
  ctx.font = `bold 12px ${UI_DISPLAY_FONT}`;
  ctx.fillText(label, x, y);
  clearGlow();
  ctx.restore();
}

function _drawDevActionBtn(button, label, color, active) {
  const rgb = _hexToRgb(color);
  ctx.save();
  ctx.fillStyle = active ? `rgba(${rgb},0.16)` : `rgba(${rgb},0.08)`;
  ctx.strokeStyle = active ? `rgba(${rgb},0.78)` : `rgba(${rgb},0.46)`;
  ctx.lineWidth = active ? 1.7 : 1.2;
  _roundRect(ctx, button.x, button.y, button.width, button.height, 7);
  ctx.fill();
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `bold ${Math.max(9, Math.round(10 * (button.height / 42)))}px ${UI_DISPLAY_FONT}`;
  ctx.fillStyle = active ? '#ffffff' : color;
  setGlow(color, active ? 12 : 6);
  ctx.fillText(label, button.x + button.width / 2, button.y + button.height / 2 + 1);
  clearGlow();
  ctx.restore();
}

function _drawDevAnalyticsPanel(x, y, w, h, scale) {
  const snapshot = getDevAnalyticsSnapshot();
  const maxBar = Math.max(1, ...snapshot.stageReachCounts, ...snapshot.deathStageCounts);
  const panelH = Math.max(260 * scale, h);

  ctx.save();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.globalAlpha = 0.92;

  const panelGrad = ctx.createLinearGradient(x, y, x + w, y + panelH);
  panelGrad.addColorStop(0, 'rgba(49,175,212,0.07)');
  panelGrad.addColorStop(1, 'rgba(170,85,255,0.05)');
  ctx.fillStyle = panelGrad;
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 1;
  _roundRect(ctx, x, y, w, panelH, 8);
  ctx.fill();
  ctx.stroke();

  const pad = 18 * scale;
  let cy = y + pad;
  ctx.fillStyle = '#31afd4';
  setGlow('#31afd4', 10);
  ctx.font = `bold ${Math.round(12 * scale)}px ${UI_DISPLAY_FONT}`;
  ctx.fillText('LOCAL RUN ANALYTICS', x + pad, cy);
  clearGlow();

  if (snapshot.totalRuns <= 0) {
    ctx.globalAlpha = 0.62;
    ctx.fillStyle = '#b8c7d9';
    ctx.font = `${Math.round(12 * scale)}px ${UI_DISPLAY_FONT}`;
    ctx.fillText('NO TRACKED RUNS YET', x + pad, cy + 38 * scale);
    ctx.restore();
    return;
  }

  cy += 36 * scale;
  const clearRate = Math.round((snapshot.completions / Math.max(1, snapshot.totalRuns)) * 100);
  const stats = [
    ['RUNS', snapshot.totalRuns.toString()],
    ['AVG STAGE', snapshot.avgStage > 0 ? snapshot.avgStage.toFixed(1) : '--'],
    ['CLEARS', `${snapshot.completions} (${clearRate}%)`],
    ['FURTHEST', `${furthestStage} / 10`],
    ['AVG SCORE', Math.round(snapshot.totalScore / Math.max(1, snapshot.totalRuns)).toLocaleString()],
    ['AVG KILLS', Math.round(snapshot.totalKills / Math.max(1, snapshot.totalRuns)).toLocaleString()],
  ];

  const colW = (w - pad * 2) / 2;
  stats.forEach((stat, i) => {
    const sx = x + pad + (i % 2) * colW;
    const sy = cy + Math.floor(i / 2) * 34 * scale;
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = '#8ea0b8';
    ctx.font = `${Math.round(9 * scale)}px ${UI_DISPLAY_FONT}`;
    ctx.fillText(stat[0], sx, sy);
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${Math.round(15 * scale)}px ${UI_DISPLAY_FONT}`;
    ctx.fillText(stat[1], sx, sy + 16 * scale);
  });

  cy += 122 * scale;
  ctx.globalAlpha = 0.68;
  ctx.fillStyle = '#d8b4fe';
  ctx.font = `bold ${Math.round(10 * scale)}px ${UI_DISPLAY_FONT}`;
  ctx.fillText('STAGE REACHED / DEATHS', x + pad, cy);
  cy += 22 * scale;

  const rowGap = 13 * scale;
  const labelW = 28 * scale;
  const countW = 30 * scale;
  const barW = w - pad * 2 - labelW - countW;
  for (let i = 0; i < 10; i++) {
    const by = cy + i * rowGap;
    const reached = snapshot.stageReachCounts[i];
    const deaths = snapshot.deathStageCounts[i];
    const reachedW = barW * (reached / maxBar);
    const deathW = barW * (deaths / maxBar);

    ctx.globalAlpha = 0.42;
    ctx.fillStyle = '#8ea0b8';
    ctx.font = `${Math.round(9 * scale)}px ${UI_DISPLAY_FONT}`;
    ctx.fillText(`S${i + 1}`, x + pad, by);

    ctx.globalAlpha = 0.12;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x + pad + labelW, by - 4 * scale, barW, 7 * scale);

    if (reached > 0) {
      ctx.globalAlpha = 0.78;
      ctx.fillStyle = '#31afd4';
      ctx.fillRect(x + pad + labelW, by - 4 * scale, reachedW, 7 * scale);
    }
    if (deaths > 0) {
      ctx.globalAlpha = 0.86;
      ctx.fillStyle = '#ff5544';
      ctx.fillRect(x + pad + labelW, by - 1 * scale, deathW, 4 * scale);
    }

    ctx.globalAlpha = 0.62;
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'right';
    ctx.fillText(`${reached}`, x + pad + labelW + barW + countW, by);
    ctx.textAlign = 'left';
  }

  if (snapshot.lastRun) {
    const lastY = Math.min(y + panelH - 20 * scale, cy + 10 * rowGap + 24 * scale);
    const stageText = snapshot.lastRun.stageReached ? `S${snapshot.lastRun.stageReached}` : 'S?';
    const resultText = snapshot.lastRun.completed ? 'CLEAR' : 'END';
    ctx.globalAlpha = 0.58;
    ctx.fillStyle = '#8ea0b8';
    ctx.font = `${Math.round(9 * scale)}px ${UI_DISPLAY_FONT}`;
    ctx.fillText('LAST RUN', x + pad, lastY);
    ctx.globalAlpha = 0.95;
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${Math.round(11 * scale)}px ${UI_DISPLAY_FONT}`;
    ctx.fillText(`${resultText} ${stageText} / ${snapshot.lastRun.score || 0} PTS / ${snapshot.lastRun.kills || 0} K`, x + pad + 78 * scale, lastY);
  }

  ctx.restore();
}

function drawDevMenu() {
  const layout = getDevMenuLayout();
  const { W, H, layoutScale, leftX, rightX, rightW, topY } = layout;
  ctx.fillStyle = '#050508';
  ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = 'rgba(255,255,255,0.04)';
  ctx.lineWidth = 1;
  for (let x = 0; x < W; x += 60) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
  for (let y = 0; y < H; y += 60) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  setGlow('#ff3366', 16);
  ctx.font = `bold ${Math.round(13 * layoutScale)}px ${UI_DISPLAY_FONT}`;
  ctx.fillStyle = '#ff6688';
  ctx.fillText('DEV CONTROL ROOM', W / 2, 42 * layoutScale);
  clearGlow();

  ctx.globalAlpha = 0.56;
  ctx.font = `${Math.round(10 * layoutScale)}px ${UI_DISPLAY_FONT}`;
  ctx.fillStyle = '#8ea0b8';
  ctx.fillText('TYPE DEV OR DEVI ON TITLE - ESC RETURNS FROM THIS SCREEN', W / 2, 67 * layoutScale);
  ctx.restore();

  _drawDevSectionTitle('STAGE JUMP', leftX, topY, '#ff3366');
  layout.stageButtons.forEach(button => {
    _drawDevBtn(ctx, button.x, button.y, button.width, button.height, button.value);
  });

  layout.actionButtons.forEach(button => {
    _drawDevActionBtn(button, button.label, button.color, button.action === 'fast' && devFastStage);
  });

  _drawDevSectionTitle('SCREEN PREVIEWS', rightX, topY, '#31afd4');
  layout.screenButtons.forEach(button => {
    _drawDevActionBtn(button, button.label, button.color, false);
  });

  _drawDevAnalyticsPanel(rightX, layout.analyticsY, rightW, H - layout.analyticsY - 32 * layoutScale, layoutScale);
}

function handleDevMenuClick(e) {
  const layout = getDevMenuLayout();
  const target = getClickTargetAt([
    ...layout.stageButtons,
    ...layout.actionButtons,
    ...layout.screenButtons,
  ], e.offsetX, e.offsetY);

  if (!target) return;
  if (target.action === 'stage') {
    audio.play('menuConfirm');
    devJumpToStage(target.value);
    return;
  }
  if (target.action === 'fast') {
    devFastStage = !devFastStage;
    audio.play('menuSelect');
    return;
  }
  if (target.action === 'tutorial') {
    audio.play('menuConfirm');
    startTutorialFromDevMenu();
    return;
  }
  if (target.action === 'back') {
    gameState = 'title';
    titleIntroT = 0; titleIntroLive = true; titleSnapFired = false; titleSnapDecay = 0;
    audio.play('menuSelect');
    audio.playMusic('title');
    return;
  }
  if (target.action === 'screen') {
    audio.play('menuConfirm');
    devPreviewScreen(target.value);
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
