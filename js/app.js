
import {
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  DEFAULT_COLOR_BG,
  COLOR_BLUE,
  COLOR_CYAN,
  COLOR_CRIMSON,
  COLOR_PINK,
  LB_COLORS,
  STAGE_DURATION,
  STAGE_MIN_KILLS,
  STAGE_BG_COLORS,
  STAGE_ENEMY_COLORS,
  STAGE_ELITE_COLORS,
  EASY_POOL,
  HARD_POOL,
  HARDEST_POOL,
  BULLET_SPEED,
  BUFF_DURATION,
  BUFF_MAX,
  DEATH_TAUNTS,
  GRAZE_RADIUS,
  GRAZE_COOLDOWN,
  PAUSE_ITEMS,
} from './config.js';
import {
  loadFurthestStage,
  loadPlayerName,
  loadSave,
  writeFurthestStage,
  writePlayerName,
  writeSave as persistSave,
} from './storage.js';

  // ─── COLOR PALETTE ────────────────────────────────────────────────────────────
  let COLOR_BG = DEFAULT_COLOR_BG;

  // ─── CANVAS SETUP ────────────────────────────────────────────────────────────
  const canvas = document.getElementById('gameCanvas');
  const ctx    = canvas.getContext('2d');

  // ─── BLOOM CANVAS ────────────────────────────────────────────────────────────
  const bloomCanvas = document.createElement('canvas');
  const bloomCtx    = bloomCanvas.getContext('2d');

  function resize() {
    canvas.width       = window.innerWidth;
    canvas.height      = window.innerHeight;
    bloomCanvas.width  = Math.ceil(canvas.width  / 2);
    bloomCanvas.height = Math.ceil(canvas.height / 2);
  }
  window.addEventListener('resize', resize);
  resize();

  // ─── GLOW UTILITY ────────────────────────────────────────────────────────────
  function setGlow(color, intensity = 15) {
    ctx.shadowColor = color;
    ctx.shadowBlur  = intensity;
  }
  function clearGlow() {
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur  = 0;
  }

  // ─── INPUT ───────────────────────────────────────────────────────────────────
  const keys        = {};
  const justPressed = {};
  let mouseDown     = false;
  window.addEventListener('keydown', e => {
    if (!keys[e.key]) justPressed[e.key] = true;
    keys[e.key] = true;
  });
  window.addEventListener('keyup', e => keys[e.key] = false);
  canvas.addEventListener('mousedown', e => { if (e.button === 0) mouseDown = true; });
  window.addEventListener('mouseup',   e => { if (e.button === 0) mouseDown = false; });

  // Save system
  function writeSave() {
    persistSave(save);
  }

  const save = loadSave();
  let furthestStage = loadFurthestStage();

  // ─── GAME STATE ───────────────────────────────────────────────────────────────
  let gameState              = 'title';
  let titleGridOff           = 0;
  let titleSelection         = 0;
  let titleSelectionChangedAt = 0;

  let frameNow = performance.now();

  function getNow() {
    return frameNow;
  }

  // Leaderboard background particles
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

  // ─── LEADERBOARD ──────────────────────────────────────────────────────────────
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

  // ─── NAME ENTRY ───────────────────────────────────────────────────────────────
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

  // ─── STAGE SYSTEM ─────────────────────────────────────────────────────────────

  let mechanicAssignment = {};

  function buildMechanicAssignment() {
    const assignment = {};
    const easyShuffled = [...EASY_POOL].sort(() => Math.random() - 0.5);
    for (let i = 1; i <= 4; i++) assignment[i] = [easyShuffled[i - 1]];
    // stage 5 reuses a random easy mechanic (pool only has 4)
    assignment[5] = [easyShuffled[Math.floor(Math.random() * EASY_POOL.length)]];
    assignment[6] = ['dash', 'missiles'];
    const hardShuffled = [...HARD_POOL].sort(() => Math.random() - 0.5);
    assignment[7] = [hardShuffled[0]];
    assignment[8] = [hardShuffled[1]];
    assignment[9] = [hardShuffled[2]];
    const hardestShuffled = [...HARDEST_POOL].sort(() => Math.random() - 0.5);
    assignment[9].push(hardestShuffled[0]);
    assignment[10] = [];
    return assignment;
  }

  function getActiveMechanics() {
    const active = new Set();
    for (let s = 1; s <= stage.current; s++) {
      (mechanicAssignment[s] || []).forEach(m => active.add(m));
    }
    return active;
  }

  mechanicAssignment = buildMechanicAssignment();

  // ─── STAGE OBJECT ─────────────────────────────────────────────────────────────
  const stage = {
    current:        1,
    kills:          0,
    totalKills:     0,
    timer:          STAGE_DURATION,
    flashTimer:     0,
    FLASH_MS:       1800,
    shakeTimer:     0,
    shakeIntensity: 0,
    slowmoTimer:    0,
    labelScale:     1,

    onKill(isElite) {
      this.kills++;
      this.totalKills++;
      player.score += isElite ? 50 : 10;
      player.onKill();

      if (isElite) {
        pickups.spawnGuaranteed(drone.x + 60 + Math.random() * 80, drone.y + (Math.random() - 0.5) * 60);
      }
    },

    _advance() {
      if (this.current === 10) {
        gameState = 'win';
        return;
      }
      this.current++;
      this.kills = 0;
      this.timer = STAGE_DURATION;
      COLOR_BG = STAGE_BG_COLORS[this.current - 1];

      if (this.current === 5 || this.current === 8) {
        player.lives = Math.min(4, player.lives + 1);
      }

      if (this.current > furthestStage) {
        furthestStage = this.current;
        writeFurthestStage(this.current);
      }

      this.flashTimer     = this.FLASH_MS * 0.5;
      this.shakeTimer     = 400;
      this.shakeIntensity = 4;
      this.slowmoTimer    = 0;
      this.labelScale     = 2.0;
    },

    update(delta) {
      if (this.flashTimer    > 0) this.flashTimer -= delta;
      if (this.shakeTimer    > 0) {
        this.shakeTimer    -= delta;
        this.shakeIntensity = 8 * (this.shakeTimer / 1500);
      }
      if (this.slowmoTimer   > 0) this.slowmoTimer -= delta;

      // time-based stage progression
      if (gameState === 'playing') {
        this.timer -= delta;
        if (this.timer <= 0) {
          if (this.kills >= STAGE_MIN_KILLS) {
            this._advance();
          } else {
            // didn't meet minimum — reset timer, keep going
            this.timer = STAGE_DURATION;
          }
        }
      }

      const labelAnimMs = 400;
      const elapsed = this.FLASH_MS - this.flashTimer;
      if (elapsed < labelAnimMs) {
        const p = elapsed / labelAnimMs;
        this.labelScale = 2.5 - 1.5 * (1 - Math.pow(1 - p, 3));
      } else {
        this.labelScale = 1.0;
      }
    },

    drawFlash() {
      if (this.flashTimer <= 0) return;
      const t = this.flashTimer / this.FLASH_MS;
      const stageColor = STAGE_ENEMY_COLORS[Math.min(this.current - 1, 9)];
      ctx.save();
      ctx.globalAlpha = t * 0.25;
      setGlow(stageColor, 60);
      ctx.fillStyle = stageColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      clearGlow();

      const labelAlpha = t > 0.4 ? 1 : t / 0.4;
      ctx.globalAlpha  = labelAlpha;
      ctx.fillStyle    = stageColor;
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';
      setGlow(stageColor, 30);
      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.scale(this.labelScale, this.labelScale);
      ctx.font = 'bold 36px monospace';
      ctx.fillText(`STAGE ${this.current}`, 0, 0);
      // subtitle: show new mechanics
      const mechs = (mechanicAssignment[this.current] || []).filter(Boolean);
      if (mechs.length > 0) {
        ctx.font = '18px monospace';
        ctx.globalAlpha = labelAlpha * 0.7;
        ctx.fillText(mechs.map(m => m.toUpperCase()).join(' + ') + ' ACTIVE', 0, 36);
      }
      // milestone life
      if (this.current === 5 || this.current === 8) {
        ctx.font = 'bold 20px monospace';
        ctx.globalAlpha = labelAlpha;
        ctx.fillStyle = COLOR_CYAN;
        ctx.fillText('+1 LIFE', 0, mechs && mechs.length > 0 ? 64 : 36);
      }
      ctx.restore();
      clearGlow();
      ctx.restore();
    },

    reset() {
      this.current        = 1;
      this.kills          = 0;
      this.totalKills     = 0;
      this.timer          = STAGE_DURATION;
      this.flashTimer     = 0;
      this.shakeTimer     = 0;
      this.shakeIntensity = 0;
      this.slowmoTimer    = 0;
      this.labelScale     = 1;
      COLOR_BG = STAGE_BG_COLORS[0];
      mechanicAssignment = buildMechanicAssignment();
    }
  };

  // ─── KILL STREAK CALLOUTS ─────────────────────────────────────────────────────
  const streakCallout = {
    text:  '',
    timer: 0,
    scale: 1,
    color: '#ffffff',

    MILESTONES: {
      5:  { text: 'x5 CHAIN',        color: COLOR_CYAN },
      10: { text: 'x10 RELENTLESS',  color: COLOR_PINK },
      15: { text: 'x15 UNSTOPPABLE', color: '#ffcc00' },
      20: { text: 'x20 GODLIKE',     color: '#ffffff' },
    },

    check(chain) {
      const m = this.MILESTONES[chain];
      if (m) this.show(m.text, m.color);
    },

    showOverdrive() {
      this.show('OVERDRIVE', '#ff3300');
    },

    show(text, color) {
      this.text  = text;
      this.color = color;
      this.timer = 1500;  // ms
      this.scale = 2.0;   // starts big, shrinks to 1
    },

    update(delta) {
      if (this.timer <= 0) return;
      this.timer -= delta;
      // scale eases from 2 → 1 over first 300ms
      const elapsed = 1500 - this.timer;
      if (elapsed < 300) {
        this.scale = 2.0 - (elapsed / 300);
      } else {
        this.scale = 1.0;
      }
    },

    draw() {
      if (this.timer <= 0) return;
      const alpha = Math.min(1, this.timer / 400);  // fade out in last 400ms
      ctx.save();
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';
      ctx.globalAlpha  = alpha * 0.9;
      ctx.font         = `bold ${Math.round(28 * this.scale)}px monospace`;
      ctx.fillStyle    = this.color;
      ctx.fillText(this.text, canvas.width / 2, canvas.height * 0.35);
      // glow pass
      ctx.globalAlpha = alpha * 0.3;
      ctx.font        = `bold ${Math.round(30 * this.scale)}px monospace`;
      ctx.fillText(this.text, canvas.width / 2, canvas.height * 0.35);
      ctx.restore();
    },

    reset() { this.timer = 0; this.text = ''; }
  };

  // ─── PARALLAX STAR FIELD ──────────────────────────────────────────────────────
  const starField = {
    layers: [],
    init() {
      this.layers = [
        { speed: 20,  stars: [], alpha: 0.15, size: 0.6 },  // far
        { speed: 50,  stars: [], alpha: 0.25, size: 0.9 },  // mid
        { speed: 100, stars: [], alpha: 0.4,  size: 1.2 },  // near
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
            // streak effect during dash
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

  // ─── DRONE TRAIL ─────────────────────────────────────────────────────────────
  const TRAIL_STRANDS = [
    { offset: -6, bloom: COLOR_BLUE, core: '#6ad4ff', bloomWidth: 5,  coreWidth: 0.8 },
    { offset: -3, bloom: COLOR_PINK, core: '#ffaaee', bloomWidth: 7,  coreWidth: 1.2 },
    { offset:  0, bloom: COLOR_CYAN, core: '#ffffff', bloomWidth: 10, coreWidth: 1.8 },
    { offset:  3, bloom: COLOR_PINK, core: '#ffaaee', bloomWidth: 7,  coreWidth: 1.2 },
    { offset:  6, bloom: COLOR_BLUE, core: '#6ad4ff', bloomWidth: 5,  coreWidth: 0.8 },
  ];

  const trail = {
    points: [],
    maxLen: 55,

    add(x, y) {
      this.points.push({ x, y });
      if (this.points.length > this.maxLen) this.points.shift();
    },

    drawStrand(strand) {
      if (this.points.length < 2) return;
      const off = strand.offset;

      ctx.save();
      ctx.lineCap  = 'round';
      ctx.lineJoin = 'round';
      for (let i = 1; i < this.points.length; i++) {
        const t = i / this.points.length;
        ctx.globalAlpha = t * t * 0.45;
        setGlow(strand.bloom, 18);
        ctx.strokeStyle = strand.bloom;
        ctx.lineWidth   = strand.bloomWidth * t;
        ctx.beginPath();
        ctx.moveTo(this.points[i - 1].x, this.points[i - 1].y + off);
        ctx.lineTo(this.points[i].x,     this.points[i].y     + off);
        ctx.stroke();
      }
      ctx.restore();

      ctx.save();
      ctx.lineCap  = 'round';
      ctx.lineJoin = 'round';
      for (let i = 1; i < this.points.length; i++) {
        const t = i / this.points.length;
        ctx.globalAlpha = t * t * 0.95;
        setGlow(strand.core, 8);
        ctx.strokeStyle = strand.core;
        ctx.lineWidth   = strand.coreWidth;
        ctx.beginPath();
        ctx.moveTo(this.points[i - 1].x, this.points[i - 1].y + off);
        ctx.lineTo(this.points[i].x,     this.points[i].y     + off);
        ctx.stroke();
      }
      clearGlow();
      ctx.restore();
    },

    draw() { TRAIL_STRANDS.forEach(s => this.drawStrand(s)); }
  };

  // ─── DASH ─────────────────────────────────────────────────────────────────────
  const dash = {
    cooldown:    0,
    COOLDOWN_MS: 1200,
    COOLDOWN_OFFENSIVE: 2400,
    duration:    0,
    DURATION_MS: 360,
    vx: 0,
    vy: 0,
    SPEED: 620,
    hitEnemy: false,

    update(delta) {
      if (this.cooldown > 0) this.cooldown -= delta;

      // when dash ends, apply offensive cooldown penalty if enemy was hit
      if (this.duration > 0) {
        this.duration -= delta;
        if (this.duration <= 0) {
          this.cooldown = this.hitEnemy ? this.COOLDOWN_OFFENSIVE : this.COOLDOWN_MS;
          this.hitEnemy = false;
        }
      }

      if (justPressed[' '] && this.cooldown <= 0 && this.duration <= 0) {
        let dx = 0, dy = 0;
        if (keys['ArrowUp']    || keys['w'] || keys['W']) dy -= 1;
        if (keys['ArrowDown']  || keys['s'] || keys['S']) dy += 1;
        if (keys['ArrowLeft']  || keys['a'] || keys['A']) dx -= 1;
        if (keys['ArrowRight'] || keys['d'] || keys['D']) dx += 1;
        if (dx === 0 && dy === 0) dx = 1;
        if (dx !== 0 && dy !== 0) { dx *= 0.707; dy *= 0.707; }
        this.vx = dx * this.SPEED;
        this.vy = dy * this.SPEED;
        this.duration = this.DURATION_MS;
        this.hitEnemy = false;
        // cooldown is set when dash ends (see above)
      }
    },

    reset() { this.cooldown = 0; this.duration = 0; this.hitEnemy = false; }
  };

  // ─── DRONE ───────────────────────────────────────────────────────────────────
  const drone = {
    x:      120,
    y:      0,
    width:  48,
    height: 18,
    rotorAngle: 0,
    tilt: 0,

    get speed() { return 280; },

    init() {
      this.y = canvas.height / 2;
    },

    update(delta) {
      const dt = delta / 1000;
      let dx = 0, dy = 0;

      if (keys['ArrowUp']    || keys['w'] || keys['W']) dy -= 1;
      if (keys['ArrowDown']  || keys['s'] || keys['S']) dy += 1;
      if (keys['ArrowLeft']  || keys['a'] || keys['A']) dx -= 1;
      if (keys['ArrowRight'] || keys['d'] || keys['D']) dx += 1;

      if (dx !== 0 && dy !== 0) { dx *= 0.707; dy *= 0.707; }

      let speedX = dx * this.speed;
      let speedY = dy * this.speed;

      if (dash.duration > 0) {
        speedX += dash.vx;
        speedY += dash.vy;
      }

      this.x += speedX * dt;
      this.y += speedY * dt;

      const maxX = canvas.width * 0.35;
      this.x = Math.max(30, Math.min(maxX, this.x));
      this.y = Math.max(30, Math.min(canvas.height - 30, this.y));

      trail.add(this.x, this.y);
      this.tilt += (dy * 0.3 - this.tilt) * 0.15;

      const moving = dx !== 0 || dy !== 0;
      this.rotorAngle += (moving ? 0.45 : 0.25);
    },

    draw() {
      const now        = getNow();
      const buffActive = player.damageBuff > 0;

      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.tilt);

      // ── Engine exhaust — two ports at rear, pulsing ──
      const ePulse = 0.55 + 0.45 * Math.sin(now * 0.008 + this.rotorAngle * 0.5);
      [{ x: -13, y: -5 }, { x: -13, y: 5 }].forEach(ep => {
        // outer bloom
        ctx.save();
        ctx.globalAlpha = 0.22 * ePulse;
        ctx.shadowColor = COLOR_CYAN; ctx.shadowBlur = 32;
        ctx.fillStyle   = COLOR_CYAN;
        ctx.beginPath(); ctx.arc(ep.x, ep.y, 10, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
        // mid corona
        ctx.save();
        ctx.globalAlpha = 0.5 * ePulse;
        ctx.shadowColor = COLOR_CYAN; ctx.shadowBlur = 14;
        ctx.fillStyle   = COLOR_CYAN;
        ctx.beginPath(); ctx.arc(ep.x, ep.y, 5, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
        // bright core
        ctx.save();
        ctx.globalAlpha = 0.85 * ePulse;
        ctx.shadowColor = '#ffffff'; ctx.shadowBlur = 6;
        ctx.fillStyle   = '#ffffff';
        ctx.beginPath(); ctx.arc(ep.x, ep.y, 2, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      });

      // ── Hull — delta-wing triangle ──
      // forward = +x  (drone faces right)
      const hull = [
        { x:  22, y:   0 },   // front tip
        { x:  -5, y: -14 },   // upper wing tip
        { x: -14, y:  -7 },   // upper exhaust shoulder
        { x: -10, y:   0 },   // tail notch
        { x: -14, y:   7 },   // lower exhaust shoulder
        { x:  -5, y:  14 },   // lower wing tip
      ];
      const tracePath = () => {
        ctx.beginPath();
        hull.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
        ctx.closePath();
      };

      // subtle fill
      tracePath();
      ctx.globalAlpha = 0.06;
      ctx.fillStyle   = COLOR_CYAN;
      ctx.fill();

      // outer soft bloom stroke
      tracePath();
      ctx.globalAlpha = 0.28;
      ctx.shadowColor = COLOR_CYAN; ctx.shadowBlur = 32;
      ctx.strokeStyle = COLOR_CYAN; ctx.lineWidth = 4; ctx.lineJoin = 'round';
      ctx.stroke();

      // mid corona stroke
      tracePath();
      ctx.globalAlpha = 0.65;
      ctx.shadowColor = COLOR_CYAN; ctx.shadowBlur = 12;
      ctx.strokeStyle = COLOR_CYAN; ctx.lineWidth = 1.5;
      ctx.stroke();

      // bright white hard core stroke
      tracePath();
      ctx.globalAlpha = 1;
      ctx.shadowColor = '#ffffff'; ctx.shadowBlur = 5;
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 0.7;
      ctx.stroke();

      // ── Interior cockpit detail lines ──
      ctx.globalAlpha = 0.38;
      ctx.shadowColor = COLOR_PINK; ctx.shadowBlur = 8;
      ctx.strokeStyle = COLOR_PINK; ctx.lineWidth = 0.75;
      ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(16,  0); ctx.lineTo(-3, -7);   // cockpit rail top
      ctx.moveTo(16,  0); ctx.lineTo(-3,  7);   // cockpit rail bottom
      ctx.moveTo(-3, -7); ctx.lineTo(-3,  7);   // cross brace
      ctx.stroke();

      // ── Front tip weapon point — triple-layer glow ──
      let tipColor = COLOR_PINK;
      let tipBase  = 18;
      if (buffActive) {
        const p = Math.sin(now * 0.025) * 0.5 + 0.5;
        tipColor = p > 0.5 ? '#ff44cc' : '#ffffff';
        tipBase  = 26 + p * 20;
      }
      // outer bloom
      ctx.globalAlpha = 0.18;
      ctx.shadowColor = tipColor; ctx.shadowBlur = tipBase * 2.2;
      ctx.fillStyle   = tipColor;
      ctx.beginPath(); ctx.arc(22, 0, 6, 0, Math.PI * 2); ctx.fill();
      // mid corona
      ctx.globalAlpha = 0.5;
      ctx.shadowColor = tipColor; ctx.shadowBlur = tipBase;
      ctx.fillStyle   = tipColor;
      ctx.beginPath(); ctx.arc(22, 0, 3.5, 0, Math.PI * 2); ctx.fill();
      // bright core
      ctx.globalAlpha = 1;
      ctx.shadowColor = '#ffffff'; ctx.shadowBlur = 6;
      ctx.fillStyle   = '#ffffff';
      ctx.beginPath(); ctx.arc(22, 0, 1.6, 0, Math.PI * 2); ctx.fill();

      ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0;
      ctx.restore();

      // damage buff bar
      if (buffActive) {
        const barW = 40, barH = 4;
        const bx   = this.x - barW / 2;
        const by   = this.y + 22;
        const frac = Math.min(1, player.damageBuff / 2000);
        ctx.save();
        ctx.globalAlpha = 0.45;
        ctx.fillStyle   = '#222';
        ctx.fillRect(bx, by, barW, barH);
        ctx.globalAlpha = 1;
        setGlow(COLOR_PINK, 10);
        ctx.fillStyle = COLOR_PINK;
        ctx.fillRect(bx, by, barW * frac, barH);
        clearGlow();
        ctx.restore();
      }

      // fire rate buff bar
      if (player.fireRateBuff > 0) {
        const barW = 40, barH = 4;
        const bx   = this.x - barW / 2;
        const by   = this.y + 28;
        const frac = Math.min(1, player.fireRateBuff / 2000);
        ctx.save();
        ctx.globalAlpha = 0.45;
        ctx.fillStyle   = '#222';
        ctx.fillRect(bx, by, barW, barH);
        ctx.globalAlpha = 1;
        setGlow(COLOR_CYAN, 10);
        ctx.fillStyle = COLOR_CYAN;
        ctx.fillRect(bx, by, barW * frac, barH);
        clearGlow();
        ctx.restore();
      }
    }
  };

  drone.init();

  // ─── BULLETS ─────────────────────────────────────────────────────────────────

  const bullets = {
    pool:     [],
    cooldown: 0,

    fire(x, y, angle) {
      this.pool.push({ x, y, angle: angle || 0, len: 22, spawnTime: getNow() });
    },

    update(delta) {
      const dt = delta / 1000;
      if (this.cooldown > 0) this.cooldown -= delta;

      const firing = isFireHeld() && !player.overheated;

      if (firing && this.cooldown <= 0) {
        if (player.spreadBuff > 0) {
          // spread shot: 3 bullets in narrow fan
          this.fire(drone.x + 14, drone.y, -0.14);
          this.fire(drone.x + 14, drone.y,  0);
          this.fire(drone.x + 14, drone.y,  0.14);
        } else {
          this.fire(drone.x + 14, drone.y, 0);
        }
        this.cooldown = player.fireRateCooldown;
        player.heat = Math.min(100, player.heat + player.HEAT_PER_SHOT);
      }

      // bullet speed: 20% faster when standing still (focused fire)
      const speed = isPlayerMoving() ? BULLET_SPEED : BULLET_SPEED * 1.2;
      this.pool = this.pool.filter(b => {
        const a = b.angle || 0;
        b.x += Math.cos(a) * speed * dt;
        b.y += Math.sin(a) * speed * dt;
        return b.x < canvas.width + 40 && b.y > -40 && b.y < canvas.height + 40;
      });
    },

    draw() {
      const dmgBuff  = player.damageBuff   > 0;
      const rateBuff = player.fireRateBuff > 0;
      const anyBuff  = dmgBuff || rateBuff;

      this.pool.forEach(b => {
        ctx.save();
        ctx.lineCap = 'round';
        const len = anyBuff ? 30 : b.len;

        if (dmgBuff && rateBuff) {
          // both active — pink outer, cyan inner
          setGlow('#ffffff', 55);
          ctx.strokeStyle = COLOR_PINK;
          ctx.lineWidth   = 7;
          ctx.globalAlpha = 0.4;
          ctx.beginPath(); ctx.moveTo(b.x - len, b.y); ctx.lineTo(b.x, b.y); ctx.stroke();

          setGlow(COLOR_CYAN, 30);
          ctx.strokeStyle = '#00ffff';
          ctx.lineWidth   = 2.5;
          ctx.globalAlpha = 1;
          ctx.beginPath(); ctx.moveTo(b.x - len, b.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        } else if (dmgBuff) {
          // damage buff — pink/gold
          setGlow('#ffffff', 55);
          ctx.strokeStyle = COLOR_PINK;
          ctx.lineWidth   = 7;
          ctx.globalAlpha = 0.4;
          ctx.beginPath(); ctx.moveTo(b.x - len, b.y); ctx.lineTo(b.x, b.y); ctx.stroke();

          setGlow('#ffdd00', 20);
          ctx.strokeStyle = '#ffdd00';
          ctx.lineWidth   = 2;
          ctx.globalAlpha = 1;
          ctx.beginPath(); ctx.moveTo(b.x - len, b.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        } else if (rateBuff) {
          // fire rate buff — electric cyan
          setGlow(COLOR_CYAN, 40);
          ctx.strokeStyle = COLOR_CYAN;
          ctx.lineWidth   = 5;
          ctx.globalAlpha = 0.4;
          ctx.beginPath(); ctx.moveTo(b.x - len, b.y); ctx.lineTo(b.x, b.y); ctx.stroke();

          setGlow('#00ffff', 20);
          ctx.strokeStyle = '#00ffff';
          ctx.lineWidth   = 2.5;
          ctx.globalAlpha = 1;
          ctx.beginPath(); ctx.moveTo(b.x - len, b.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        } else {
          // normal
          setGlow(COLOR_PINK, 20);
          ctx.strokeStyle = COLOR_PINK;
          ctx.lineWidth   = 3;
          ctx.globalAlpha = 0.35;
          ctx.beginPath(); ctx.moveTo(b.x - len, b.y); ctx.lineTo(b.x, b.y); ctx.stroke();

          setGlow(COLOR_CYAN, 10);
          ctx.strokeStyle = COLOR_CYAN;
          ctx.lineWidth   = 1.5;
          ctx.globalAlpha = 0.8;
          ctx.beginPath(); ctx.moveTo(b.x - len, b.y); ctx.lineTo(b.x, b.y); ctx.stroke();

          setGlow('#ffffff', 6);
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth   = 1;
          ctx.globalAlpha = 1;
          ctx.beginPath(); ctx.moveTo(b.x - len * 0.5, b.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        }

        // tip dot — triple-layer glow
        const tipCol  = anyBuff ? (dmgBuff ? '#ffdd00' : '#00ffff') : COLOR_PINK;
        const tipSz   = anyBuff ? 3 : 2;
        // outer bloom
        ctx.globalAlpha = 0.18;
        ctx.shadowColor = tipCol; ctx.shadowBlur = anyBuff ? 44 : 32;
        ctx.fillStyle   = tipCol;
        ctx.beginPath(); ctx.arc(b.x, b.y, tipSz * 2.6, 0, Math.PI * 2); ctx.fill();
        // mid corona
        ctx.globalAlpha = 0.55;
        ctx.shadowColor = tipCol; ctx.shadowBlur = anyBuff ? 22 : 16;
        ctx.fillStyle   = tipCol;
        ctx.beginPath(); ctx.arc(b.x, b.y, tipSz * 1.4, 0, Math.PI * 2); ctx.fill();
        // bright core
        ctx.globalAlpha = 1;
        ctx.shadowColor = '#ffffff'; ctx.shadowBlur = 5;
        ctx.fillStyle   = '#ffffff';
        ctx.beginPath(); ctx.arc(b.x, b.y, tipSz, 0, Math.PI * 2); ctx.fill();

        // spawn cross-flare — perpendicular streak at tip for first 80ms
        if (b.spawnTime !== undefined) {
          const age = getNow() - b.spawnTime;
          if (age < 80) {
            const fa = 1 - age / 80;
            const fl = 11 * fa;
            ctx.globalAlpha = fa * 0.9;
            ctx.shadowColor = tipCol; ctx.shadowBlur = 14;
            ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.2; ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(b.x,           b.y - fl);
            ctx.lineTo(b.x,           b.y + fl);
            ctx.moveTo(b.x - fl * 0.4, b.y);
            ctx.lineTo(b.x + fl * 0.4, b.y);
            ctx.stroke();
          }
        }

        clearGlow();
        ctx.restore();
      });
    }
  };

  // ─── MISSILES ────────────────────────────────────────────────────────────────
  const missiles = {
    pool:        [],
    cooldown:    0,
    COOLDOWN_MS: 2000,
    SPEED:       700,
    RADIUS:      80,
    DAMAGE:      5,

    update(delta) {
      if (!getActiveMechanics().has('missiles')) return;
      const dt = delta / 1000;
      if (this.cooldown > 0) this.cooldown -= delta;

      if ((justPressed['f'] || justPressed['F']) && this.cooldown <= 0) {
        this.pool.push({ x: drone.x + 14, y: drone.y, exploded: false });
        this.cooldown = this.COOLDOWN_MS;
      }

      this.pool = this.pool.filter(m => {
        if (m.exploded) return false;
        m.x += this.SPEED * dt;
        return m.x < canvas.width + 60;
      });
    },

    explode(m, active) {
      burstParticles.spawn(m.x, m.y, COLOR_PINK);
      for (let i = shards.pool.length - 1; i >= 0; i--) {
        const s = shards.pool[i];
        const dx = s.x - m.x, dy = s.y - m.y;
        if (dx * dx + dy * dy < this.RADIUS * this.RADIUS) {
          s.hp -= this.DAMAGE;
          if (s.hp <= 0) {
            fragments.burst(s.x, s.y, s.color, s.size, s.isElite);
            shards.pool.splice(i, 1);
            stage.onKill(s.isElite);
          } else {
            s.flashTimer = 80;
            s.hpBarTimer = 900;
          }
        }
      }
      m.exploded = true;
    },

    draw() {
      if (!getActiveMechanics().has('missiles')) return;
      this.pool.forEach(m => {
        if (m.exploded) return;
        ctx.save();
        setGlow(COLOR_PINK, 24);
        ctx.fillStyle = COLOR_PINK;
        ctx.beginPath();
        ctx.arc(m.x, m.y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 0.4;
        ctx.strokeStyle = COLOR_PINK;
        ctx.lineWidth   = 2;
        ctx.lineCap     = 'round';
        ctx.beginPath();
        ctx.moveTo(m.x - 30, m.y);
        ctx.lineTo(m.x,      m.y);
        ctx.stroke();
        clearGlow();
        ctx.restore();
      });
    },

    reset() { this.pool = []; this.cooldown = 0; }
  };

  // ─── PICKUPS ─────────────────────────────────────────────────────────────────

  const pickups = {
    pool: [],

    _randomType() {
      const r = Math.random();
      return r < 0.4 ? 'damage' : r < 0.8 ? 'firerate' : 'spread';
    },

    maybeSpawn(x, y) {
      this.pool.push({ x, y, type: this._randomType(), life: 6000 });
    },

    // floating text popups on collect
    popups: [],

    spawnGuaranteed(x, y) {
      this.pool.push({ x, y, type: this._randomType(), life: 8000, radius: 10 });
    },

    update(delta) {
      const dt = delta / 1000;
      this.pool = this.pool.filter(p => {
        p.life -= delta;
        // drift toward player — accelerates as it gets closer
        const dx = drone.x - p.x, dy = drone.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 0) {
          const driftSpeed = 40 + Math.max(0, 200 - dist) * 0.8;
          p.x += (dx / dist) * driftSpeed * dt;
          p.y += (dy / dist) * driftSpeed * dt;
        }
        // pulsing radius
        p.radius = 10 + 3 * Math.sin(getNow() * 0.008);
        // collect
        if (dist < 28) {
          if (p.type === 'damage')   player.damageBuff   = Math.min(BUFF_MAX, player.damageBuff   + BUFF_DURATION);
          if (p.type === 'firerate') player.fireRateBuff = Math.min(BUFF_MAX, player.fireRateBuff + BUFF_DURATION);
          if (p.type === 'spread')   player.spreadBuff   = Math.min(BUFF_MAX, player.spreadBuff   + BUFF_DURATION);
          // spawn floating text popup
          const label = p.type === 'damage' ? 'DMG BOOST'
                      : p.type === 'firerate' ? 'FIRE BOOST'
                      : 'SPREAD SHOT';
          const color = p.type === 'damage' ? COLOR_PINK
                      : p.type === 'firerate' ? COLOR_CYAN
                      : '#ffcc00';
          this.popups.push({ x: drone.x, y: drone.y - 30, label, color, life: 1500 });
          return false;
        }
        return p.life > 0;
      });
      // update popups
      this.popups = this.popups.filter(t => {
        t.y -= 40 * dt;
        t.life -= delta;
        return t.life > 0;
      });
    },

    draw() {
      // draw orbs of light
      this.pool.forEach(p => {
        const color = p.type === 'damage' ? COLOR_PINK
                    : p.type === 'firerate' ? COLOR_CYAN
                    : '#ffcc00';
        const r = p.radius;
        ctx.save();
        // outer glow halo
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 3);
        grad.addColorStop(0, color + 'aa');
        grad.addColorStop(0.4, color + '44');
        grad.addColorStop(1, color + '00');
        ctx.globalAlpha = 0.7;
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r * 3, 0, Math.PI * 2);
        ctx.fill();
        // bright core
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(p.x, p.y, r * 0.4, 0, Math.PI * 2);
        ctx.fill();
        // mid ring
        ctx.globalAlpha = 0.8;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r * 0.7, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });
      // draw floating text popups
      this.popups.forEach(t => {
        ctx.save();
        ctx.textAlign    = 'center';
        ctx.textBaseline = 'middle';
        ctx.font         = 'bold 18px monospace';
        ctx.globalAlpha  = Math.min(1, t.life / 500);
        ctx.fillStyle    = t.color;
        ctx.fillText(t.label, t.x, t.y);
        ctx.restore();
      });
    },

    reset() { this.pool = []; this.popups = []; }
  };

  // ─── PLAYER STATE ────────────────────────────────────────────────────────────

  // ─── GRAZE SYSTEM ───────────────────────────────────────────────────────────
  const graze = {
    sparks: [],
    score:  0,

    check() {
      const isDashing = dash.duration > 0;
      const multiplier = isDashing ? 2 : 1;
      for (const s of shards.pool) {
        if (s._grazeCd > 0) continue;
        const dx = s.x - drone.x, dy = s.y - drone.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const hitDist = s.size * 0.75 + 14;  // actual collision distance
        if (dist > hitDist && dist < hitDist + GRAZE_RADIUS) {
          // graze!
          s._grazeCd = GRAZE_COOLDOWN;
          player.score += 5 * multiplier;
          player.heat   = Math.max(0, player.heat - 8 * multiplier);
          this.score   += multiplier;
          // spawn spark on the near side
          const angle = Math.atan2(dy, dx);
          const sx = drone.x + Math.cos(angle) * 16;
          const sy = drone.y + Math.sin(angle) * 16;
          this.sparks.push({
            x: sx, y: sy,
            vx: Math.cos(angle) * -120 + (Math.random() - 0.5) * 60,
            vy: Math.sin(angle) * -120 + (Math.random() - 0.5) * 60,
            life: 1,
            color: isDashing ? COLOR_CYAN : '#ffffff',
          });
        }
      }
    },

    update(delta) {
      const dt = delta / 1000;
      // tick graze cooldowns on shards
      for (const s of shards.pool) {
        if (s._grazeCd > 0) s._grazeCd -= delta;
      }
      this.sparks = this.sparks.filter(p => {
        p.x    += p.vx * dt;
        p.y    += p.vy * dt;
        p.life -= dt * 4;
        return p.life > 0;
      });
    },

    draw() {
      this.sparks.forEach(p => {
        ctx.save();
        ctx.globalAlpha = p.life;
        ctx.fillStyle   = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });
    },

    reset() { this.sparks = []; this.score = 0; }
  };

  // ─── HELPER: is player pressing movement keys? ──────────────────────────────
  function isPlayerMoving() {
    return !!(keys['ArrowUp'] || keys['w'] || keys['W'] ||
              keys['ArrowDown'] || keys['s'] || keys['S'] ||
              keys['ArrowLeft'] || keys['a'] || keys['A'] ||
              keys['ArrowRight'] || keys['d'] || keys['D']);
  }

  // ─── HELPER: is fire button held? ─────────────────────────────────────────
  function isFireHeld() {
    return mouseDown || keys['j'] || keys['J'];
  }

  const player = {
    score:        0,
    dead:         false,
    lives:        3,
    damageBuff:   0,
    fireRateBuff: 0,
    spreadBuff:   0,
    deathMessage: '',

    // ── Shield ──
    shield:              true,
    shieldRechargeTimer: 0,
    SHIELD_RECHARGE:     12000,  // 12s normal, 8s at 1 life

    // ── Heat System ──
    heat:             0,       // 0-100
    overheated:       false,
    overheatTimer:    0,       // ms remaining in lockout
    HEAT_PER_SHOT:    4,
    HEAT_DECAY:       30,      // per second when not firing
    OVERHEAT_LOCKOUT: 1500,    // ms

    // ── Chain Multiplier ──
    chain:        0,       // current streak count
    chainTimer:   0,       // ms since last kill; resets on kill

    // ── Overdrive ──
    overdriveKills:  0,    // kills without being hit (resets on hit)
    overdriveActive: false,
    overdriveTimer:  0,    // ms remaining

    get chainBonus()  { return Math.min(this.chain * 0.05, 0.5); }, // +5% per chain, cap 50%

    get effectiveDamage() {
      let dmg = 1.2 + (stage.current - 1) * 0.3;
      if (this.damageBuff      > 0)    dmg *= 1.3;
      if (this.chain           > 0)    dmg *= (1 + this.chainBonus);
      if (this.overdriveActive)        dmg *= 1.4;
      return Math.ceil(dmg);
    },

    get fireRateCooldown() {
      let cd = 200;
      if (this.fireRateBuff  > 0)   cd *= 0.7;
      if (!isPlayerMoving())         cd *= 0.7;   // focused fire bonus
      if (this.overdriveActive)      cd *= 0.7;
      return Math.max(60, cd);
    },

    hit() {
      if (this.dead) return;

      // shield absorbs first hit
      if (this.shield) {
        this.shield = false;
        this.shieldRechargeTimer = this.lives === 1
          ? 8000    // faster recharge at 1 life
          : this.SHIELD_RECHARGE;
        // blue flash + smaller shake (not the red life-loss effect)
        stage.flashTimer     = stage.FLASH_MS * 0.2;
        stage.shakeTimer     = 300;
        stage.shakeIntensity = 4;
        return;
      }

      this.chain           = 0;
      this.chainTimer      = 0;
      this.overdriveKills  = 0;
      this.overdriveActive = false;
      this.overdriveTimer  = 0;
      this.lives--;
      if (this.lives <= 0) {
        this.dead = true;
        const isHighScore = this.score > save.highScore;
        if (isHighScore) save.highScore = this.score;
        this.deathMessage = isHighScore
          ? 'LETS GOOOOOO'
          : DEATH_TAUNTS[Math.floor(Math.random() * DEATH_TAUNTS.length)];
        save.runs.push({ score: this.score, kills: stage.totalKills });
        if (save.runs.length > 10) save.runs.shift();
        writeSave();

        if (this.score > 0) {
          if (!loadPlayerName()) {
            gameState = 'nameEntry';
          } else {
            leaderboard.submitScore(this.score, stage.totalKills);
          }
        }
      } else {
        stage.flashTimer     = stage.FLASH_MS * 0.4;
        stage.shakeTimer     = 700;
        stage.shakeIntensity = 10;
      }
    },

    update(delta) {
      if (this.damageBuff   > 0) this.damageBuff   = Math.max(0, this.damageBuff   - delta);
      if (this.fireRateBuff > 0) this.fireRateBuff = Math.max(0, this.fireRateBuff - delta);
      if (this.spreadBuff   > 0) this.spreadBuff   = Math.max(0, this.spreadBuff   - delta);

      // shield recharge
      if (!this.shield && this.shieldRechargeTimer > 0) {
        this.shieldRechargeTimer -= delta;
        if (this.shieldRechargeTimer <= 0) {
          this.shield              = true;
          this.shieldRechargeTimer = 0;
        }
      }

      // heat system
      const dt = delta / 1000;
      if (this.overheated) {
        this.overheatTimer -= delta;
        if (this.overheatTimer <= 0) {
          this.overheated   = false;
          this.overheatTimer = 0;
          this.heat          = 0;
        }
      } else {
        if (!isFireHeld()) {
          this.heat = Math.max(0, this.heat - this.HEAT_DECAY * dt);
        }
        if (this.heat >= 100) {
          this.overheated   = true;
          this.overheatTimer = this.OVERHEAT_LOCKOUT;
        }
      }

      // chain timer — break chain if 1.5s without a kill
      if (this.chain > 0) {
        this.chainTimer += delta;
        if (this.chainTimer >= 2500) {
          this.chain      = 0;
          this.chainTimer = 0;
        }
      }

      // overdrive timer
      if (this.overdriveActive) {
        this.overdriveTimer -= delta;
        if (this.overdriveTimer <= 0) {
          this.overdriveActive = false;
          this.overdriveTimer  = 0;
        }
      }
    },

    // ── Ultimate (Screen Nuke) ──
    ultCharge:  0,
    ULT_MAX:    45,     // kills needed to charge
    ultReady:   false,

    onKill() {
      // chain
      this.chain++;
      this.chainTimer = 0;
      streakCallout.check(this.chain);

      // overdrive progress — two paths: 8 kills no-hit OR 15 chain kills
      if (!this.overdriveActive) {
        this.overdriveKills++;
        if (this.overdriveKills >= 8 || this.chain >= 15) {
          this.overdriveActive = true;
          this.overdriveTimer  = 10000;
          this.overdriveKills  = 0;
          streakCallout.showOverdrive();
        }
      }

      // ult charge
      if (!this.ultReady) {
        this.ultCharge = Math.min(this.ULT_MAX, this.ultCharge + 1);
        if (this.ultCharge >= this.ULT_MAX) this.ultReady = true;
      }
    }
  };

  // ─── SCREEN NUKE (ULTIMATE) ────────────────────────────────────────────────
  const screenNuke = {
    active:   false,
    ring:     0,       // expanding radius
    maxRing:  0,       // max radius to cover screen
    flash:    0,       // white flash alpha
    rings:    [],      // color rings for visual effect

    fire() {
      if (!player.ultReady || this.active) return;
      player.ultReady = false;
      player.ultCharge = 0;
      this.active  = true;
      this.ring    = 0;
      this.maxRing = Math.sqrt(canvas.width * canvas.width + canvas.height * canvas.height);
      this.flash   = 1;
      this.rings   = [
        { r: 0, color: '#ffffff', width: 6, speed: 1.0 },
        { r: 0, color: COLOR_CYAN,   width: 4, speed: 0.85 },
        { r: 0, color: COLOR_PINK,   width: 3, speed: 0.7 },
      ];
      // screen shake
      stage.shakeTimer     = 800;
      stage.shakeIntensity = 14;
      // slow-mo for dramatic effect
      stage.slowmoTimer    = 600;
    },

    update(delta) {
      if (!this.active) return;
      const dt  = delta / 1000;
      const spd = 1800; // px/s expansion speed

      // expand rings
      for (const r of this.rings) {
        r.r += spd * r.speed * dt;
      }
      this.ring = this.rings[0].r;

      // flash fades
      this.flash = Math.max(0, this.flash - dt * 3);

      // kill enemies the leading ring passes over
      for (let i = shards.pool.length - 1; i >= 0; i--) {
        const s  = shards.pool[i];
        const dx = s.x - drone.x, dy = s.y - drone.y;
        const d  = Math.sqrt(dx * dx + dy * dy);
        if (d <= this.ring && !s._nuked) {
          s._nuked = true;
          s.hp     = 0;
          // kill FX
          impactFX.onKill(s.x, s.y, s.color);
          fragments.burst(s.x, s.y, s.color, s.size, s.isElite);
          burstParticles.spawn(s.x, s.y, s.color);
          smokeParticles.spawn(s.x, s.y, s.color);
          stage.onKill(s.isElite);
          shards.pool.splice(i, 1);
        }
      }

      // done when all rings expanded past screen
      if (this.rings[this.rings.length - 1].r > this.maxRing) {
        this.active = false;
        this.rings  = [];
      }
    },

    draw() {
      if (!this.active) return;

      // white flash overlay
      if (this.flash > 0) {
        ctx.save();
        ctx.globalAlpha    = this.flash * 0.4;
        ctx.fillStyle      = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.restore();
      }

      // expanding rings
      for (const r of this.rings) {
        if (r.r <= 0) continue;
        ctx.save();
        ctx.globalAlpha = Math.max(0, 1 - r.r / this.maxRing);
        ctx.strokeStyle = r.color;
        ctx.lineWidth   = r.width;
        ctx.beginPath();
        ctx.arc(drone.x, drone.y, r.r, 0, Math.PI * 2);
        ctx.stroke();
        // bloom pass — wider, dimmer
        ctx.globalAlpha *= 0.3;
        ctx.lineWidth    = r.width * 4;
        ctx.stroke();
        ctx.restore();
      }
    },

    reset() {
      this.active = false;
      this.ring   = 0;
      this.flash  = 0;
      this.rings  = [];
    }
  };

  // ─── CHAIN LIGHTNING ─────────────────────────────────────────────────────────
  const chainLightning = {
    bolts: [],   // { segments: [{x,y}], life, color }
    RANGE: 120,

    // called on each kill when chain >= 8
    trigger(killX, killY) {
      const arcs = player.chain >= 15 ? 2 : 1;
      const used = new Set();

      for (let a = 0; a < arcs; a++) {
        let best = null, bestDist = this.RANGE;
        for (const s of shards.pool) {
          if (used.has(s)) continue;
          const dx = s.x - killX, dy = s.y - killY;
          const d  = Math.sqrt(dx * dx + dy * dy);
          if (d < bestDist) { bestDist = d; best = s; }
        }
        if (!best) break;
        used.add(best);

        // deal damage
        best.hp -= 3;
        best.flashTimer = 200;
        best.hpBarTimer = 1500;
        hitSparks.emit(best.x, best.y, 1, 0, COLOR_CYAN);

        // generate zigzag bolt segments
        const segs = [{ x: killX, y: killY }];
        const steps = 6 + Math.floor(Math.random() * 4);
        for (let i = 1; i < steps; i++) {
          const t  = i / steps;
          const mx = killX + (best.x - killX) * t + (Math.random() - 0.5) * 30;
          const my = killY + (best.y - killY) * t + (Math.random() - 0.5) * 30;
          segs.push({ x: mx, y: my });
        }
        segs.push({ x: best.x, y: best.y });

        this.bolts.push({ segments: segs, life: 1, color: COLOR_CYAN });

        // if target dies from lightning, kill it
        if (best.hp <= 0) {
          impactFX.onKill(best.x, best.y, best.color);
          fragments.burst(best.x, best.y, best.color, best.size, best.isElite);
          burstParticles.spawn(best.x, best.y, best.color);
          stage.onKill(best.isElite);
          const idx = shards.pool.indexOf(best);
          if (idx >= 0) shards.pool.splice(idx, 1);
        }
      }
    },

    update(delta) {
      const dt = delta / 1000;
      this.bolts = this.bolts.filter(b => {
        b.life -= dt * 5;  // fade in ~0.2s
        return b.life > 0;
      });
    },

    draw() {
      for (const b of this.bolts) {
        ctx.save();
        ctx.globalAlpha = b.life * 0.9;
        ctx.strokeStyle = b.color;
        ctx.lineWidth   = 2;
        ctx.beginPath();
        ctx.moveTo(b.segments[0].x, b.segments[0].y);
        for (let i = 1; i < b.segments.length; i++) {
          ctx.lineTo(b.segments[i].x, b.segments[i].y);
        }
        ctx.stroke();
        // bloom pass
        ctx.globalAlpha = b.life * 0.3;
        ctx.lineWidth   = 6;
        ctx.stroke();
        ctx.restore();
      }
    },

    reset() { this.bolts = []; }
  };

  // ─── SHARD SHAPES ────────────────────────────────────────────────────────────
  function makeShardShape(size) {
    const pts   = [];
    const count = 5 + Math.floor(Math.random() * 3);
    for (let i = 0; i < count; i++) {
      const angle  = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.9;
      const radius = size * (0.5 + Math.random() * 0.6);
      pts.push({ x: Math.cos(angle) * radius, y: Math.sin(angle) * radius });
    }
    return pts;
  }

  function makeSharpShard(size) {
    const pts  = [];
    const len  = size * (1.8 + Math.random() * 1.4);
    const wid  = size * (0.18 + Math.random() * 0.22);
    const sides = Math.random() < 0.5 ? 4 : 5;

    if (sides === 4) {
      pts.push({ x:  len * 0.5,  y: 0 });
      pts.push({ x:  len * 0.05, y:  wid + (Math.random() - 0.5) * wid * 0.4 });
      pts.push({ x: -len * 0.5,  y: 0 });
      pts.push({ x:  len * 0.05, y: -wid + (Math.random() - 0.5) * wid * 0.4 });
    } else {
      pts.push({ x:  len * 0.5,  y: 0 });
      pts.push({ x:  len * 0.15, y:  wid });
      pts.push({ x: -len * 0.1,  y:  wid * 0.5 + (Math.random() - 0.5) * wid });
      pts.push({ x: -len * 0.5,  y: 0 });
      pts.push({ x:  len * 0.05, y: -wid });
    }
    return pts;
  }

  // ─── ENEMY HELPERS ────────────────────────────────────────────────────────────
  function getStageEnemyStats() {
    const s = stage.current;
    return {
      color:      STAGE_ENEMY_COLORS[s - 1],
      eliteColor: STAGE_ELITE_COLORS[s - 1],
      speed:      130 + (s - 1) * 39,
      baseHp:     3   + Math.floor((s - 1) * 0.8),
      turnRate:   0.5 + (s - 1) * 0.22,
    };
  }

  function spawnShard() {
    const stats = getStageEnemyStats();
    // elite chance peaks mid-game (stages 4-6), drops in late stages
    const s = stage.current;
    const eliteChance = s <= 6
      ? Math.min(0.30, 0.15 + (s - 1) * 0.03)   // ramps to 30% by stage 6
      : Math.max(0.12, 0.30 - (s - 6) * 0.045);  // drops to ~12% by stage 10
    const isElite = Math.random() < eliteChance;
    const size    = (14 + Math.random() * 18) * (isElite ? 1.4 : 1);
    const color   = isElite ? stats.eliteColor : stats.color;
    const rawSpd  = stats.speed + Math.random() * 80;
    const speed   = player.lives === 1 ? rawSpd * 1.2 : rawSpd;
    const y       = 40 + Math.random() * (canvas.height - 80);
    const initVy  = (Math.random() - 0.5) * 40;
    const spin    = (Math.random() - 0.5) * 0.06;
    const baseHp  = stats.baseHp * (isElite ? 2 : 1);

    return {
      x:          canvas.width + size,
      y,
      size,
      color,
      vx:         -speed,
      vy:         initVy,
      angle:      Math.random() * Math.PI * 2,
      spin,
      pts:        makeShardShape(size),
      hp:         baseHp,
      maxHp:      baseHp,
      isElite,
      isKamikaze: false,
      isMini:     false,
      turnRate:   stats.turnRate,
      flashTimer: 0,
      hpBarTimer: 0,
      lifetime:   8000 + Math.random() * 4000,
      _grazeCd:   0,
    };
  }

  function spawnKamikaze() {
    const speed = (450 + Math.random() * 100) * (player.lives === 1 ? 1.2 : 1);
    const y     = 60 + Math.random() * (canvas.height - 120);
    const angle = Math.atan2(drone.y - y, drone.x - (canvas.width + 20));
    const size  = 10;
    return {
      x:          canvas.width + 20,
      y,
      size,
      color:      '#ff4400',
      vx:         Math.cos(angle) * speed,
      vy:         Math.sin(angle) * speed,
      angle:      Math.random() * Math.PI * 2,
      spin:       0.14,
      pts:        makeShardShape(size),
      hp:         1,
      maxHp:      1,
      isElite:    false,
      isKamikaze: true,
      isMini:     false,
      turnRate:   0,
      flashTimer: 0,
      hpBarTimer: 0,
      _grazeCd:   0,
    };
  }

  function spawnDrift() {
    const stats = getStageEnemyStats();
    const size  = 8 + Math.random() * 10;
    const y     = 30 + Math.random() * (canvas.height - 60);
    // generally leftward with slight vertical spread
    const angle = Math.PI + (Math.random() - 0.5) * 0.7;  // 160°-200°
    const speed = 100 + Math.random() * 100;
    const color = stats.color;
    return {
      x:          canvas.width + size,
      y,
      size,
      color,
      vx:         Math.cos(angle) * speed,
      vy:         Math.sin(angle) * speed,
      angle:      Math.random() * Math.PI * 2,
      spin:       (Math.random() - 0.5) * 0.08,
      pts:        makeShardShape(size),
      hp:         1 + Math.floor(stage.current / 4),
      maxHp:      1 + Math.floor(stage.current / 4),
      isElite:    false,
      isKamikaze: false,
      isDrift:    true,
      isMini:     false,
      turnRate:   0,       // no homing
      flashTimer: 0,
      hpBarTimer: 0,
      _grazeCd:   0,
    };
  }

  function spawnMini(x, y, color) {
    const stats = getStageEnemyStats();
    const speed = stats.speed * 1.5;
    const angle = Math.random() * Math.PI * 2;
    const size  = 7;
    return {
      x, y,
      size,
      color,
      vx:         Math.cos(angle) * speed,
      vy:         Math.sin(angle) * speed,
      angle:      Math.random() * Math.PI * 2,
      spin:       (Math.random() - 0.5) * 0.12,
      pts:        makeShardShape(size),
      hp:         1,
      maxHp:      1,
      isElite:    false,
      isKamikaze: false,
      isMini:     true,
      turnRate:   stats.turnRate * 1.5,
      flashTimer: 0,
      hpBarTimer: 0,
      _grazeCd:   0,
    };
  }

  // ─── GLASS SHARDS (ENEMIES) ──────────────────────────────────────────────────
  const shards = {
    pool:          [],
    spawnTimer:    0,
    kamikazeTimer: 0,

    _makeShard(x, y, stats, isElite) {
      const size   = (14 + Math.random() * 18) * (isElite ? 1.4 : 1);
      const color  = isElite ? stats.eliteColor || stats.color : stats.color;
      const speed  = stats.speed + Math.random() * 30;
      const baseHp = stats.baseHp * (isElite ? 2 : 1);
      return {
        x, y, size, color,
        vx:         -speed,
        vy:         (Math.random() - 0.5) * 40,
        angle:      Math.random() * Math.PI * 2,
        spin:       (Math.random() - 0.5) * 0.06,
        pts:        makeShardShape(size),
        hp:         baseHp,
        maxHp:      baseHp,
        isElite,
        isKamikaze: false,
        isMini:     false,
        turnRate:   stats.turnRate || 0.5,
        flashTimer: 0,
        hpBarTimer: 0,
        lifetime:   12000,
        _grazeCd:   0,
      };
    },

    get spawnInterval() { return Math.max(180, Math.round(600 - stage.current * 40)); },
    get maxEnemies()    { return 12 + stage.current * 3; },
    // homing % increases with stage: 60% at stage 1, 75% at stage 10
    get homingChance()  { return 0.6 + stage.current * 0.015; },

    update(delta) {
      const dt     = delta / 1000;
      const active = getActiveMechanics();

      this.spawnTimer += delta;
      if (this.spawnTimer >= this.spawnInterval && this.pool.length < this.maxEnemies) {
        this.spawnTimer = 0;
        const count = 1 + Math.floor(Math.random() * 3);
        for (let i = 0; i < count && this.pool.length < this.maxEnemies; i++) {
          if (Math.random() < this.homingChance) {
            this.pool.push(spawnShard());
          } else {
            this.pool.push(spawnDrift());
          }
        }
      }

      if (active.has('kamikazes')) {
        if (this.kamikazeTimer > 0) this.kamikazeTimer -= delta;
        if (this.kamikazeTimer <= 0 && this.pool.length < this.maxEnemies) {
          this.pool.push(spawnKamikaze());
          this.kamikazeTimer = Math.max(1500, 4000 - (stage.current - 1) * 200);
        }
      }

      this.pool = this.pool.filter(s => {
        if (!s.isKamikaze) {
          const curAngle = Math.atan2(s.vy, s.vx);
          const tgtAngle = Math.atan2(drone.y - s.y, drone.x - s.x);
          let diff = tgtAngle - curAngle;
          while (diff >  Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          const maxTurn  = s.turnRate * dt;
          const turn     = Math.min(Math.abs(diff), maxTurn) * Math.sign(diff);
          const newAngle = curAngle + turn;
          const spd      = Math.hypot(s.vx, s.vy);
          s.vx = Math.cos(newAngle) * spd;
          s.vy = Math.sin(newAngle) * spd;
        }

        s.x     += s.vx * dt;
        s.y     += s.vy * dt;
        s.angle += s.spin;

        if (s.flashTimer > 0) s.flashTimer -= delta;
        if (s.hpBarTimer > 0) s.hpBarTimer -= delta;
        if (s.lifetime  !== undefined) s.lifetime -= delta;

        return s.x > -80 && (s.lifetime === undefined || s.lifetime > 0);
      });
    },

    draw() {
      this.pool.forEach(s => {
        ctx.save();
        ctx.translate(s.x, s.y);
        ctx.rotate(s.angle);

        const drawColor = s.flashTimer > 0 ? '#ffffff' : s.color;

        ctx.beginPath();
        ctx.moveTo(s.pts[0].x, s.pts[0].y);
        s.pts.forEach(p => ctx.lineTo(p.x, p.y));
        ctx.closePath();

        ctx.fillStyle   = drawColor;
        ctx.globalAlpha = 0.08;
        ctx.fill();

        ctx.globalAlpha = 0.5;
        setGlow(drawColor, s.isElite ? 28 : 18);
        ctx.strokeStyle = drawColor;
        ctx.lineWidth   = s.isElite ? 3.5 : 2.5;
        ctx.stroke();

        ctx.globalAlpha = 1;
        setGlow('#ffffff', 6);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth   = 0.75;
        ctx.stroke();

        const crack = s.pts;
        setGlow(drawColor, 10);
        ctx.strokeStyle = drawColor;
        ctx.lineWidth   = 0.5;
        ctx.globalAlpha = 0.6;
        ctx.beginPath();
        ctx.moveTo(crack[0].x * 0.6, crack[0].y * 0.6);
        ctx.lineTo(crack[Math.floor(crack.length / 2)].x * 0.6,
                   crack[Math.floor(crack.length / 2)].y * 0.6);
        ctx.stroke();

        if (s.isElite) {
          const pulse = Math.sin(getNow() * 0.008) * 0.5 + 0.5;
          ctx.globalAlpha = 0.3 + pulse * 0.45;
          setGlow(s.color, 38);
          ctx.strokeStyle = s.color;
          ctx.lineWidth   = 1.5;
          ctx.beginPath();
          ctx.arc(0, 0, s.size * (1.3 + pulse * 0.15), 0, Math.PI * 2);
          ctx.stroke();
        }

        clearGlow();
        ctx.restore();

        if (s.hpBarTimer > 0 && s.maxHp > 1) {
          const barW  = s.size * 2.2;
          const barH  = 3;
          const barX  = s.x - barW / 2;
          const barY  = s.y - s.size * 1.6;
          const frac  = Math.max(0, s.hp / s.maxHp);
          const fade  = Math.min(1, s.hpBarTimer / 200);
          ctx.save();
          ctx.globalAlpha = fade * 0.85;
          ctx.fillStyle = '#000000';
          ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);
          ctx.fillStyle = '#333333';
          ctx.fillRect(barX, barY, barW, barH);
          const r = Math.round(255 * (1 - frac));
          const g = Math.round(200 * frac);
          ctx.fillStyle = `rgb(${r},${g},0)`;
          ctx.fillRect(barX, barY, barW * frac, barH);
          ctx.restore();
        }
      });
    },

    reset() {
      this.pool          = [];
      this.spawnTimer    = 0;
      this.kamikazeTimer = 0;
    }
  };

  // ─── EXPLOSION FRAGMENTS ─────────────────────────────────────────────────────
  const fragments = {
    pool: [],

    burst(x, y, color, parentSize, isElite) {
      const count = isElite
        ? 10 + Math.floor(Math.random() * 6)
        : 4  + Math.floor(Math.random() * 4);
      // cap pool to prevent lag spikes
      if (this.pool.length > 80) this.pool.splice(0, this.pool.length - 60);
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 300 + Math.random() * 600;
        const size  = parentSize * (0.2 + Math.random() * 0.35);
        this.pool.push({
          x, y,
          vx:    Math.cos(angle) * speed,
          vy:    Math.sin(angle) * speed,
          size,
          color,
          angle: Math.random() * Math.PI * 2,
          spin:  (Math.random() - 0.5) * 0.25,
          alpha: 1,
          decay: 0.9 + Math.random() * 0.6,
          pts:   makeSharpShard(size),
        });
      }
    },

    update(delta) {
      const dt = delta / 1000;
      this.pool = this.pool.filter(f => {
        f.x     += f.vx    * dt;
        f.y     += f.vy    * dt;
        f.vx    *= 0.995;
        f.vy    *= 0.995;
        f.angle += f.spin;
        f.alpha -= f.decay * dt;
        return f.alpha > 0;
      });
    },

    draw() {
      this.pool.forEach(f => {
        ctx.save();
        ctx.translate(f.x, f.y);
        ctx.rotate(f.angle);

        ctx.beginPath();
        ctx.moveTo(f.pts[0].x, f.pts[0].y);
        f.pts.forEach(p => ctx.lineTo(p.x, p.y));
        ctx.closePath();

        ctx.fillStyle   = f.color;
        ctx.globalAlpha = Math.max(0, f.alpha * 0.07);
        ctx.fill();

        ctx.globalAlpha = Math.max(0, f.alpha * 0.6);
        ctx.strokeStyle = f.color;
        ctx.lineWidth   = 2.5;
        ctx.lineJoin    = 'miter';
        ctx.miterLimit  = 10;
        ctx.stroke();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth   = 0.5;
        ctx.globalAlpha = Math.max(0, f.alpha);
        ctx.stroke();
        ctx.restore();
      });
    }
  };

  // ─── STAGE-UP BURST PARTICLES ─────────────────────────────────────────────────
  const burstParticles = {
    pool: [],

    spawn(x, y, color) {
      const count = 8 + Math.floor(Math.random() * 5);
      for (let i = 0; i < count; i++) {
        this.pool.push({
          x, y,
          radius:    4 + Math.random() * 6,
          maxRadius: 30 + Math.random() * 50,
          color,
          alpha:     1,
        });
      }
    },

    update(delta) {
      const dt = delta / 1000;
      this.pool = this.pool.filter(p => {
        p.radius += (p.maxRadius - p.radius) * dt * 4;
        p.alpha  -= dt * 1.5;
        return p.alpha > 0;
      });
    },

    draw() {
      this.pool.forEach(p => {
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.strokeStyle = p.color;
        ctx.lineWidth   = 2;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      });
    },

    reset() { this.pool = []; }
  };

  // ─── HIT SPARKS ──────────────────────────────────────────────────────────────
  const hitSparks = {
    pool: [],

    emit(x, y, vx, vy, color) {
      if (this.pool.length > 40) this.pool.splice(0, this.pool.length - 30);
      const baseAngle = Math.atan2(vy, vx);
      const count = 4 + Math.floor(Math.random() * 3);
      for (let i = 0; i < count; i++) {
        const spread = (Math.random() - 0.5) * Math.PI * 0.6;
        const angle  = baseAngle + spread;
        const speed  = 120 + Math.random() * 180;
        this.pool.push({
          x, y,
          vx:    Math.cos(angle) * speed,
          vy:    Math.sin(angle) * speed,
          life:  1,
          color,
        });
      }
    },

    update(delta) {
      const dt = delta / 1000;
      this.pool = this.pool.filter(p => {
        p.x    += p.vx * dt;
        p.y    += p.vy * dt;
        p.vx   *= 0.88;
        p.vy   *= 0.88;
        p.life -= dt * 6;
        return p.life > 0;
      });
    },

    draw() {
      this.pool.forEach(p => {
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.life * 0.9);
        ctx.strokeStyle = p.color;
        ctx.lineWidth   = 1.5;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - p.vx * 0.015, p.y - p.vy * 0.015);
        ctx.stroke();
        ctx.restore();
      });
    },

    reset() { this.pool = []; }
  };

  // ─── IMPACT FX ───────────────────────────────────────────────────────────────
  const impactFX = {
    flashes: [],   // white expanding flash rings on kill
    rings:   [],   // color ring pulses

    onHit(x, y, color) {
      this.rings.push({ x, y, r: 4, maxR: 38, alpha: 0.75, color });
    },

    onKill(x, y, color) {
      this.flashes.push({ x, y, r: 0, maxR: 30, alpha: 1.0 });
      this.rings.push({ x, y, r: 3, maxR: 55, alpha: 1.0,  color });
      this.rings.push({ x, y, r: 3, maxR: 88, alpha: 0.55, color });
    },

    update(delta) {
      const dt = delta / 1000;
      this.flashes = this.flashes.filter(f => {
        f.r     += (f.maxR - f.r) * dt * 10;
        f.alpha -= dt * 7;
        return f.alpha > 0;
      });
      this.rings = this.rings.filter(r => {
        r.r     += (r.maxR - r.r) * dt * 6;
        r.alpha -= dt * 4.5;
        return r.alpha > 0;
      });
    },

    draw() {
      this.flashes.forEach(f => {
        ctx.save();
        ctx.globalAlpha = Math.max(0, f.alpha);
        ctx.shadowColor = '#ffffff'; ctx.shadowBlur = 22;
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
      });
      this.rings.forEach(r => {
        ctx.save();
        ctx.globalAlpha = Math.max(0, r.alpha * 0.8);
        ctx.shadowColor = r.color; ctx.shadowBlur = 18;
        ctx.strokeStyle = r.color; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
      });
    },

    reset() { this.flashes = []; this.rings = []; }
  };

  // ─── SMOKE PARTICLES ─────────────────────────────────────────────────────────
  const smokeParticles = {
    pool: [],

    spawn(x, y, color) {
      if (this.pool.length > 40) this.pool.splice(0, this.pool.length - 30);
      for (let i = 0; i < 5; i++) {
        this.pool.push({
          x: x + (Math.random() - 0.5) * 12,
          y: y + (Math.random() - 0.5) * 12,
          vx:    (Math.random() - 0.6) * 28,
          vy:    (Math.random() - 0.5) * 22,
          r:     3 + Math.random() * 4,
          alpha: 0.32 + Math.random() * 0.14,
          decay: 0.38 + Math.random() * 0.28,
          color,
        });
      }
    },

    update(delta) {
      const dt = delta / 1000;
      this.pool = this.pool.filter(p => {
        p.x     += p.vx * dt;
        p.y     += p.vy * dt;
        p.r     += dt * 9;
        p.alpha -= p.decay * dt;
        return p.alpha > 0;
      });
    },

    draw() {
      this.pool.forEach(p => {
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.alpha * 0.55);
        ctx.fillStyle   = p.color;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      });
    },

    reset() { this.pool = []; }
  };

  // ─── COLLISION DETECTION ─────────────────────────────────────────────────────
  function circlesTouch(ax, ay, ar, bx, by, br) {
    const dx = ax - bx, dy = ay - by;
    return dx * dx + dy * dy < (ar + br) * (ar + br);
  }

  function checkCollisions() {
    const aliveBullets = [];
    const dmg    = player.effectiveDamage;
    const active = getActiveMechanics();

    // bullet vs shard
    for (const b of bullets.pool) {
      let bulletAlive = true;

      for (let i = shards.pool.length - 1; i >= 0; i--) {
        const s = shards.pool[i];
        if (circlesTouch(b.x, b.y, 8, s.x, s.y, s.size * 0.75)) {
          s.hp -= dmg;
          if (s.hp <= 0) {
            fragments.burst(s.x, s.y, s.color, s.size, s.isElite);
            impactFX.onKill(s.x, s.y, s.color);
            smokeParticles.spawn(s.x, s.y, s.color);
            shards.pool.splice(i, 1);
            stage.onKill(s.isElite);
            if (player.chain >= 8) chainLightning.trigger(s.x, s.y);
          } else {
            s.flashTimer = 80;
            s.hpBarTimer = 900;
            hitSparks.emit(b.x, b.y, 1, 0, s.color);
            impactFX.onHit(b.x, b.y, s.color);
          }
          bulletAlive = false;
          break;
        }
      }

      if (bulletAlive) aliveBullets.push(b);
    }

    bullets.pool = aliveBullets;

    // missile vs shard
    if (active.has('missiles')) {
      for (const m of missiles.pool) {
        if (m.exploded) continue;
        for (let i = shards.pool.length - 1; i >= 0; i--) {
          const s = shards.pool[i];
          if (circlesTouch(m.x, m.y, 8, s.x, s.y, s.size * 0.75)) {
            missiles.explode(m, active);
            break;
          }
        }
      }
    }

    // shard touches drone → dash-kill or lose a life
    for (let i = shards.pool.length - 1; i >= 0; i--) {
      const s = shards.pool[i];
      if (circlesTouch(s.x, s.y, s.size * 0.75, drone.x, drone.y, 14)) {
        if (dash.duration > 0) {
          // dash-kill: deal 5 damage, grant +2 chain, mark offensive dash
          s.hp -= 5;
          dash.hitEnemy = true;
          player.chain += 2;
          player.chainTimer = 0;
          hitSparks.emit(s.x, s.y, -1, 0, COLOR_CYAN);
          impactFX.onHit(s.x, s.y, COLOR_CYAN);
          if (s.hp <= 0) {
            fragments.burst(s.x, s.y, s.color, s.size, s.isElite);
            impactFX.onKill(s.x, s.y, s.color);
            smokeParticles.spawn(s.x, s.y, s.color);
            shards.pool.splice(i, 1);
            stage.onKill(s.isElite);
            if (player.chain >= 8) chainLightning.trigger(s.x, s.y);
          } else {
            s.flashTimer = 80;
            s.hpBarTimer = 900;
          }
        } else {
          if (s.isKamikaze) {
            fragments.burst(s.x, s.y, s.color, s.size, false);
            burstParticles.spawn(s.x, s.y, s.color);
          }
          shards.pool.splice(i, 1);
          player.hit();
        }
      }
    }
    graze.check();
  }

  // ─── HUD ─────────────────────────────────────────────────────────────────────
  function drawHUD() {
    const stageColor = STAGE_ENEMY_COLORS[Math.min(stage.current - 1, 9)];
    const hudColor   = stageColor === '#ffffff' ? '#aaaaaa' : stageColor;
    const active     = getActiveMechanics();

    ctx.save();

    // ── Stage timer bar (top of screen) ──
    if (gameState !== 'tutorial') {
      const timeFrac = Math.max(0, stage.timer / STAGE_DURATION);
      ctx.globalAlpha = 0.25;
      ctx.fillStyle   = hudColor;
      ctx.fillRect(0, 0, canvas.width, 3);
      ctx.globalAlpha = 0.8;
      ctx.fillStyle   = stage.kills >= STAGE_MIN_KILLS ? COLOR_CYAN : hudColor;
      ctx.fillRect(0, 0, canvas.width * timeFrac, 3);
    }
    ctx.globalAlpha = 1;

    ctx.font         = 'bold 21px monospace';
    ctx.textBaseline = 'top';
    setGlow(hudColor, 10);
    ctx.fillStyle = hudColor;

    // top-left: lives, stage, kills
    ctx.textAlign = 'left';
    ctx.fillText(`LIVES  ${player.lives}`,                   20, 20);

    // shield indicator next to lives
    {
      const shieldX = 130, shieldY = 28, shieldR = 8;
      if (player.shield) {
        // active shield — bright cyan arc
        ctx.globalAlpha = 0.9;
        setGlow(COLOR_CYAN, 12);
        ctx.strokeStyle = COLOR_CYAN;
        ctx.lineWidth   = 2.5;
        ctx.beginPath();
        ctx.arc(shieldX, shieldY, shieldR, -Math.PI * 0.8, Math.PI * 0.8);
        ctx.stroke();
        clearGlow();
      } else if (player.shieldRechargeTimer > 0) {
        // recharging — dim arc with sweeping fill
        const maxT = player.lives === 1 ? 8000 : player.SHIELD_RECHARGE;
        const progress = 1 - player.shieldRechargeTimer / maxT;
        const arcSpan  = Math.PI * 1.6;
        // dim background arc
        ctx.globalAlpha = 0.2;
        ctx.strokeStyle = COLOR_CYAN;
        ctx.lineWidth   = 2;
        ctx.beginPath();
        ctx.arc(shieldX, shieldY, shieldR, -Math.PI * 0.8, Math.PI * 0.8);
        ctx.stroke();
        // bright progress arc
        ctx.globalAlpha = 0.7;
        ctx.strokeStyle = COLOR_CYAN;
        ctx.lineWidth   = 2.5;
        ctx.beginPath();
        ctx.arc(shieldX, shieldY, shieldR, -Math.PI * 0.8, -Math.PI * 0.8 + arcSpan * progress);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
    ctx.fillText(`STAGE  ${stage.current} / 10`,             20, 50);
    const timeLeft = Math.max(0, Math.ceil(stage.timer / 1000));
    const killsOk  = stage.kills >= STAGE_MIN_KILLS;
    ctx.fillText(`TIME  ${timeLeft}s   KILLS  ${stage.kills}/${STAGE_MIN_KILLS}`, 20, 80);
    if (killsOk) {
      ctx.fillStyle = COLOR_CYAN;
      ctx.fillText(' ✓', 20 + ctx.measureText(`TIME  ${timeLeft}s   KILLS  ${stage.kills}/${STAGE_MIN_KILLS}`).width, 80);
      ctx.fillStyle = hudColor;
    }

    // incoming mechanics label
    const incoming = [...active].filter(m => m !== 'dash' && m !== 'missiles' && m !== 'kamikazes' && m !== 'splitters' && m !== 'pickups');
    if (incoming.length > 0) {
      ctx.font        = '16px monospace';
      ctx.globalAlpha = 0.55;
      ctx.fillText(`ACTIVE: ${incoming.join(' · ')}`, 20, 112);
      ctx.globalAlpha = 1;
      ctx.font        = 'bold 21px monospace';
    }

    // top-right: score
    ctx.textAlign = 'right';
    ctx.fillText(`SCORE  ${player.score}`, canvas.width - 20, 20);

    // dash cooldown (always available)
    {
      const dashReady = dash.cooldown <= 0;
      setGlow(dashReady ? COLOR_CYAN : '#888888', dashReady ? 12 : 4);
      ctx.fillStyle = dashReady ? COLOR_CYAN : '#888888';
      ctx.fillText(
        dashReady ? '[SPC] DASH' : `[SPC] ${(dash.cooldown / 1000).toFixed(1)}s`,
        canvas.width - 20, 40
      );
      ctx.fillStyle = hudColor;
      setGlow(hudColor, 10);
    }

    // missile cooldown
    if (active.has('missiles')) {
      const missileReady = missiles.cooldown <= 0;
      setGlow(missileReady ? COLOR_PINK : '#888888', missileReady ? 12 : 4);
      ctx.fillStyle = missileReady ? COLOR_PINK : '#888888';
      ctx.fillText(
        missileReady ? '[F] MISSILE' : `[F] ${(missiles.cooldown / 1000).toFixed(1)}s`,
        canvas.width - 20, 80
      );
    }

    // chain multiplier
    if (player.chain > 0) {
      ctx.textAlign    = 'left';
      ctx.textBaseline = 'top';
      setGlow('#ffdd00', 14);
      ctx.fillStyle   = '#ffdd00';
      ctx.font        = 'bold 18px monospace';
      ctx.globalAlpha = 0.9;
      ctx.fillText(`CHAIN  x${player.chain}  +${Math.round(player.chainBonus * 100)}%`, 20, 115);
      clearGlow();
    }

    // overdrive
    if (player.overdriveActive) {
      const pulse = 0.75 + 0.25 * Math.sin(getNow() * 0.01);
      const secs  = (player.overdriveTimer / 1000).toFixed(1);
      ctx.textAlign    = 'left';
      ctx.textBaseline = 'top';
      setGlow('#ff6600', 24);
      ctx.fillStyle   = '#ff6600';
      ctx.font        = 'bold 20px monospace';
      ctx.globalAlpha = pulse;
      ctx.fillText(`OVERDRIVE  ${secs}s`, 20, player.chain > 0 ? 140 : 115);
      clearGlow();
    } else if (player.overdriveKills > 0) {
      ctx.textAlign    = 'left';
      ctx.textBaseline = 'top';
      ctx.fillStyle   = '#888888';
      ctx.font        = '13px monospace';
      ctx.globalAlpha = 0.45;
      ctx.fillText(`OVERDRIVE  ${player.overdriveKills}/8  ${player.chain >= 5 ? `CHAIN ${player.chain}/15` : ''}`, 20, player.chain > 0 ? 140 : 115);
    }

    // buff timer bars (large, bold, impossible to miss)
    let buffY = (player.chain > 0 || player.overdriveActive || player.overdriveKills > 0) ? 165 : 115;
    const barW = 200, barH = 10;
    ctx.textAlign    = 'left';
    ctx.textBaseline = 'top';

    function drawBuffBar(label, timer, maxTime, color) {
      const frac = timer / maxTime;
      const secs = (timer / 1000).toFixed(1);
      const expiring = timer < 2000;
      const flash = expiring ? (Math.sin(getNow() * 0.02) > 0 ? 1 : 0.4) : 0.95;
      ctx.font = 'bold 16px monospace';
      ctx.globalAlpha = flash;
      ctx.fillStyle   = color;
      ctx.fillText(`${label}  ${secs}s`, 20, buffY);
      buffY += 20;
      ctx.globalAlpha = 0.2;
      ctx.fillStyle   = color;
      ctx.fillRect(20, buffY, barW, barH);
      ctx.globalAlpha = flash;
      ctx.fillStyle   = color;
      ctx.fillRect(20, buffY, barW * Math.min(1, frac), barH);
      buffY += 18;
    }

    if (player.damageBuff   > 0) drawBuffBar('DMG BOOST',   player.damageBuff,   BUFF_MAX, COLOR_PINK);
    if (player.fireRateBuff > 0) drawBuffBar('FIRE BOOST',  player.fireRateBuff, BUFF_MAX, COLOR_CYAN);
    if (player.spreadBuff   > 0) drawBuffBar('SPREAD SHOT', player.spreadBuff,   BUFF_MAX, '#ffcc00');

    // ── Screen-edge buff glow (bold, unmissable) ──
    const W = canvas.width, H = canvas.height;
    const edgeThick = 20;
    if (player.damageBuff > 0) {
      const pulse = 0.12 + 0.08 * Math.sin(getNow() * 0.005);
      ctx.globalAlpha = pulse;
      const lg = ctx.createLinearGradient(0, 0, edgeThick, 0);
      lg.addColorStop(0, COLOR_PINK); lg.addColorStop(1, 'transparent');
      ctx.fillStyle = lg;
      ctx.fillRect(0, 0, edgeThick, H);
      const rg = ctx.createLinearGradient(W, 0, W - edgeThick, 0);
      rg.addColorStop(0, COLOR_PINK); rg.addColorStop(1, 'transparent');
      ctx.fillStyle = rg;
      ctx.fillRect(W - edgeThick, 0, edgeThick, H);
    }
    if (player.fireRateBuff > 0) {
      const pulse = 0.12 + 0.08 * Math.sin(getNow() * 0.006);
      ctx.globalAlpha = pulse;
      const tg = ctx.createLinearGradient(0, 0, 0, edgeThick);
      tg.addColorStop(0, COLOR_CYAN); tg.addColorStop(1, 'transparent');
      ctx.fillStyle = tg;
      ctx.fillRect(0, 0, W, edgeThick);
      const bg = ctx.createLinearGradient(0, H, 0, H - edgeThick);
      bg.addColorStop(0, COLOR_CYAN); bg.addColorStop(1, 'transparent');
      ctx.fillStyle = bg;
      ctx.fillRect(0, H - edgeThick, W, edgeThick);
    }
    if (player.spreadBuff > 0) {
      const pulse = 0.15 + 0.1 * Math.sin(getNow() * 0.007);
      ctx.globalAlpha = pulse;
      ctx.fillStyle = '#ffcc00';
      // corner accents
      const cs = 40;
      ctx.fillRect(0, 0, cs, 3); ctx.fillRect(0, 0, 3, cs);
      ctx.fillRect(W - cs, 0, cs, 3); ctx.fillRect(W - 3, 0, 3, cs);
      ctx.fillRect(0, H - 3, cs, 3); ctx.fillRect(0, H - cs, 3, cs);
      ctx.fillRect(W - cs, H - 3, cs, 3); ctx.fillRect(W - 3, H - cs, 3, cs);
    }
    ctx.globalAlpha = 1;

    // ── Heat bar (bottom-center) ──
    {
      const heatW = 200, heatH = 6;
      const hx = (canvas.width - heatW) / 2;
      const hy = canvas.height - 40;
      const frac = player.heat / 100;

      // background track
      ctx.globalAlpha = 0.2;
      ctx.fillStyle   = '#ffffff';
      ctx.fillRect(hx, hy, heatW, heatH);

      // filled portion — color based on heat level
      const heatColor = player.overheated ? '#ff0000'
                      : frac > 0.8 ? '#ff3300'
                      : frac > 0.5 ? '#ff8800'
                      : COLOR_CYAN;
      ctx.globalAlpha = 0.9;
      ctx.fillStyle   = heatColor;
      ctx.fillRect(hx, hy, heatW * frac, heatH);

      // label
      ctx.font         = '12px monospace';
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'top';
      ctx.globalAlpha  = 0.6;
      ctx.fillStyle    = '#ffffff';
      if (player.overheated) {
        const flash = Math.sin(getNow() * 0.015) > 0 ? 1 : 0.3;
        ctx.globalAlpha = flash;
        ctx.fillStyle   = '#ff0000';
        ctx.fillText('OVERHEAT', canvas.width / 2, hy + heatH + 4);
      } else if (frac > 0) {
        ctx.fillText('HEAT', canvas.width / 2, hy + heatH + 4);
      }

      // focused fire indicator
      if (!isPlayerMoving() && isFireHeld()) {
        ctx.globalAlpha = 0.5 + 0.3 * Math.sin(getNow() * 0.008);
        ctx.fillStyle   = COLOR_CYAN;
        ctx.fillText('FOCUSED', canvas.width / 2, hy - 14);
      }
    }

    // ── Ultimate charge indicator (below heat bar) ──
    {
      const ultW = 120, ultH = 4;
      const ux = (canvas.width - ultW) / 2;
      const uy = canvas.height - 22;
      const frac = player.ultCharge / player.ULT_MAX;

      // background track
      ctx.globalAlpha = 0.15;
      ctx.fillStyle   = '#ffffff';
      ctx.fillRect(ux, uy, ultW, ultH);

      // filled portion
      ctx.globalAlpha = player.ultReady ? (0.7 + 0.3 * Math.sin(getNow() * 0.006)) : 0.8;
      ctx.fillStyle   = player.ultReady ? '#ffffff' : COLOR_PINK;
      ctx.fillRect(ux, uy, ultW * frac, ultH);

      // label
      ctx.font         = '10px monospace';
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'top';
      if (player.ultReady) {
        const flash = 0.5 + 0.5 * Math.sin(getNow() * 0.008);
        ctx.globalAlpha = flash;
        ctx.fillStyle   = '#ffffff';
        ctx.fillText('Q — NUKE READY', canvas.width / 2, uy + ultH + 2);
      } else if (frac > 0) {
        ctx.globalAlpha = 0.4;
        ctx.fillStyle   = '#ffffff';
        ctx.fillText(`ULT ${Math.floor(frac * 100)}%`, canvas.width / 2, uy + ultH + 2);
      }
    }

    // ESC hint bottom-right
    ctx.textAlign    = 'right';
    ctx.textBaseline = 'bottom';
    ctx.font         = '14px monospace';
    ctx.globalAlpha  = 0.3;
    clearGlow();
    ctx.fillStyle = '#ffffff';
    ctx.fillText('[ESC] PAUSE', canvas.width - 20, canvas.height - 16);

    // fire hint bottom-left
    ctx.textAlign    = 'left';
    ctx.globalAlpha  = 0.3;
    ctx.fillStyle    = '#ffffff';
    ctx.fillText('[J / MOUSE] FIRE', 20, canvas.height - 16);

    clearGlow();
    ctx.restore();
  }

  // ─── VIGNETTE + SCANLINES ────────────────────────────────────────────────────
  // ─── CACHED OVERLAY CANVASES (rebuilt on resize) ──────────────────────────
  let _vignetteCanvas = null;
  let _scanlineCanvas = null;
  let _overlayW = 0, _overlayH = 0;

  function _buildOverlayCache() {
    const W = canvas.width, H = canvas.height;
    if (_overlayW === W && _overlayH === H && _vignetteCanvas) return;
    _overlayW = W; _overlayH = H;

    // vignette
    _vignetteCanvas = document.createElement('canvas');
    _vignetteCanvas.width = W; _vignetteCanvas.height = H;
    const vc = _vignetteCanvas.getContext('2d');
    const vg = vc.createRadialGradient(W / 2, H / 2, H * 0.22, W / 2, H / 2, Math.max(W, H) * 0.78);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,0.72)');
    vc.fillStyle = vg;
    vc.fillRect(0, 0, W, H);

    // scanlines
    _scanlineCanvas = document.createElement('canvas');
    _scanlineCanvas.width = W; _scanlineCanvas.height = H;
    const sc = _scanlineCanvas.getContext('2d');
    sc.globalAlpha = 0.028;
    sc.fillStyle   = '#000000';
    for (let y = 0; y < H; y += 4) sc.fillRect(0, y, W, 2);
  }

  function drawVignetteAndScanlines() {
    _buildOverlayCache();
    ctx.drawImage(_vignetteCanvas, 0, 0);
    ctx.drawImage(_scanlineCanvas, 0, 0);

    // last-life red danger vignette
    if (player.lives === 1) {
      const W = canvas.width, H = canvas.height;
      const rg = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) * 0.7);
      rg.addColorStop(0, 'rgba(180,0,0,0.18)');
      rg.addColorStop(1, 'rgba(180,0,0,0)');
      ctx.save();
      ctx.fillStyle = rg;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }
  }

  // ─── TITLE SCREEN ────────────────────────────────────────────────────────────
  // ─── TUTORIAL ───────────────────────────────────────────────────────────────
  const tutorial = {
    steps: [
      { text: 'MOVE — WASD',               duration: 3000, spawn: 'slow2' },
      { text: 'SHOOT — HOLD J or MOUSE',   duration: 3500, spawn: 'enemies3' },
      { text: 'DASH — SPACEBAR',           duration: 3000, spawn: 'dashTarget' },
      { text: 'MANAGE HEAT — RELEASE TO COOL', duration: 3500, spawn: 'many' },
      { text: 'HUNT ELITES FOR BUFFS',     duration: 3500, spawn: 'elite' },
    ],
    stepIndex: 0,
    stepTimer: 0,
    fadeAlpha: 0,
    active: false,

    start() {
      this.stepIndex = 0;
      this.stepTimer = 0;
      this.fadeAlpha = 0;
      this.active    = true;
      player.lives   = 99;   // invulnerable during tutorial
      player.shield  = true;
      shards.reset();
      bullets.pool = [];
      this._doSpawn();
    },

    _doSpawn() {
      const step = this.steps[this.stepIndex];
      if (!step) return;
      const cx = canvas.width / 2, cy = canvas.height / 2;
      const stats = getStageEnemyStats();
      if (step.spawn === 'slow2') {
        for (let i = 0; i < 2; i++) {
          shards.pool.push(shards._makeShard(
            canvas.width + 40, cy + (i - 0.5) * 120,
            Object.assign({}, stats, { speed: 60, baseHp: 2 }), false
          ));
        }
      } else if (step.spawn === 'enemies3') {
        for (let i = 0; i < 3; i++) {
          shards.pool.push(shards._makeShard(
            canvas.width + 40, cy + (i - 1) * 100,
            Object.assign({}, stats, { speed: 80, baseHp: 2 }), false
          ));
        }
      } else if (step.spawn === 'dashTarget') {
        shards.pool.push(shards._makeShard(
          drone.x + 150, drone.y,
          Object.assign({}, stats, { speed: 0, baseHp: 4 }), false
        ));
      } else if (step.spawn === 'many') {
        for (let i = 0; i < 6; i++) {
          shards.pool.push(shards._makeShard(
            canvas.width + 40 + i * 30, cy + (Math.random() - 0.5) * 300,
            Object.assign({}, stats, { speed: 90, baseHp: 1 }), false
          ));
        }
      } else if (step.spawn === 'elite') {
        shards.pool.push(shards._makeShard(
          canvas.width + 40, cy,
          Object.assign({}, stats, { speed: 70, baseHp: 3 }), true
        ));
      }
    },

    update(delta) {
      if (!this.active) return;
      this.stepTimer += delta;
      const step = this.steps[this.stepIndex];
      if (!step) { this.finish(); return; }

      // fade text in/out
      const t = this.stepTimer / step.duration;
      this.fadeAlpha = t < 0.15 ? t / 0.15
                     : t > 0.85 ? 1 - (t - 0.85) / 0.15
                     : 1;

      if (this.stepTimer >= step.duration) {
        this.stepIndex++;
        this.stepTimer = 0;
        if (this.stepIndex < this.steps.length) this._doSpawn();
      }
    },

    draw() {
      if (!this.active) return;
      const step = this.steps[this.stepIndex];
      if (!step) return;
      ctx.save();
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';
      ctx.font         = 'bold 36px monospace';
      ctx.globalAlpha  = this.fadeAlpha * 0.9;
      ctx.fillStyle    = '#ffffff';
      ctx.fillText(step.text, canvas.width / 2, canvas.height * 0.2);
      ctx.restore();
    },

    finish() {
      this.active  = false;
      player.lives = 3;
      player.shield = true;
      player.shieldRechargeTimer = 0;
      shards.reset();
      graze.reset();
      bullets.pool = [];
      pickups.reset();
      fragments.pool = [];
      localStorage.setItem('drone_tutorial_done', '1');
      gameState = 'playing';
      stage.reset();
    }
  };

  function _resetAllState() {
    player.score        = 0;
    player.dead         = false;
    player.lives        = 3;
    player.damageBuff      = 0;
    player.fireRateBuff    = 0;
    player.chain           = 0;
    player.chainTimer      = 0;
    player.overdriveKills  = 0;
    player.overdriveActive = false;
    player.overdriveTimer  = 0;
    player.heat            = 0;
    player.overheated      = false;
    player.overheatTimer   = 0;
    player.shield              = true;
    player.shieldRechargeTimer = 0;
    player.spreadBuff          = 0;
    player.ultCharge           = 0;
    player.ultReady            = false;
    shards.reset();
    graze.reset();
    chainLightning.reset();
    screenNuke.reset();
    streakCallout.reset();
    bullets.pool        = [];
    bullets.cooldown    = 0;
    missiles.reset();
    pickups.reset();
    fragments.pool      = [];
    burstParticles.reset();
    hitSparks.reset();
    impactFX.reset();
    smokeParticles.reset();
    trail.points        = [];
    stage.reset();
    drone.init();
    drone.tilt          = 0;
    dash.reset();
  }

  function startGame() {
    _resetAllState();

    // first-time tutorial
    if (!localStorage.getItem('drone_tutorial_done')) {
      gameState = 'tutorial';
      tutorial.start();
      return;
    }

    gameState = 'playing';
  }

  function updateTitle(delta) {
    titleGridOff += delta * 0.022;
    const t = getNow() * 0.001;
    drone.x          = 72;
    drone.y          = canvas.height - 82 + Math.sin(t * 0.7) * 8;
    drone.tilt       = Math.sin(t * 0.7) * 0.06;
    drone.rotorAngle += 0.28;
    trail.add(drone.x, drone.y);

    if (justPressed['ArrowUp'] || justPressed['ArrowDown'] || justPressed['w'] || justPressed['W'] || justPressed['s'] || justPressed['S']) {
      titleSelection = 1 - titleSelection;
      titleSelectionChangedAt = getNow();
    }

    if (justPressed['Enter'] || justPressed[' ']) {
      if (titleSelection === 0) startGame();
      else {
        gameState = 'leaderboard';
        leaderboard.fetchScores();
      }
    }
  }

  function drawStageNodes() {
    const W = canvas.width, H = canvas.height;
    const nodeCount   = 10;
    const nodeSpacing = 32;
    const totalWidth  = (nodeCount - 1) * nodeSpacing;
    const startX      = W / 2 - totalWidth / 2;
    const y           = H - 200;

    ctx.save();
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'bottom';
    ctx.font         = '11px monospace';
    ctx.globalAlpha  = 0.6;
    setGlow(COLOR_CYAN, 6);
    ctx.fillStyle = COLOR_CYAN;
    ctx.fillText('STAGES', W / 2, y - 14);

    clearGlow();
    ctx.globalAlpha = 0.2;
    ctx.strokeStyle = COLOR_CYAN;
    ctx.lineWidth   = 1;
    ctx.beginPath();
    ctx.moveTo(startX, y);
    ctx.lineTo(startX + totalWidth, y);
    ctx.stroke();

    for (let i = 0; i < nodeCount; i++) {
      const nx      = startX + i * nodeSpacing;
      const reached = (i + 1) <= furthestStage;
      ctx.save();
      ctx.globalAlpha = reached ? 1 : 0.25;
      if (reached) {
        setGlow(COLOR_CYAN, 16);
        ctx.fillStyle = COLOR_CYAN;
      } else {
        clearGlow();
        ctx.fillStyle = '#555555';
      }
      ctx.beginPath();
      ctx.arc(nx, y, 5, 0, Math.PI * 2);
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
    const t   = now * 0.001;

    // ── Background ───────────────────────────────────────────────
    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, W, H);

    // ── Perspective tunnel grid ──────────────────────────────────────
    ctx.save();
    setGlow(COLOR_CYAN, 2);
    ctx.strokeStyle = COLOR_CYAN;

    // Radial spokes from vanishing point at screen centre
    const numSpokes = 28;
    for (let i = 0; i < numSpokes; i++) {
      const angle = (i / numSpokes) * Math.PI * 2;
      const dx = Math.cos(angle), dy = Math.sin(angle);
      let tMax = 9999;
      if (dx > 0)      tMax = Math.min(tMax, (W - cx) / dx);
      else if (dx < 0) tMax = Math.min(tMax, -cx / dx);
      if (dy > 0)      tMax = Math.min(tMax, (H - cy) / dy);
      else if (dy < 0) tMax = Math.min(tMax, -cy / dy);
      ctx.globalAlpha = 0.038;
      ctx.lineWidth   = 0.5;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + dx * tMax, cy + dy * tMax);
      ctx.stroke();
    }

    // Concentric rings rushing outward — tunnel/hyperspace feel
    const maxR     = Math.sqrt(cx * cx + cy * cy) * 1.55;
    const numRings = 12;
    const ringOff  = (titleGridOff * 0.22) % 1;
    for (let i = 0; i < numRings; i++) {
      const phase = ((i / numRings) + ringOff) % 1;
      const r     = maxR * Math.pow(phase, 1.7);
      const a     = phase < 0.12
        ? (phase / 0.12) * 0.09
        : (1 - phase) * 0.09;
      ctx.globalAlpha = a;
      ctx.lineWidth   = 0.7;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
    }
    clearGlow();
    ctx.restore();

    // ── Scanline texture at 2% opacity ────────────────────────────────────
    ctx.save();
    ctx.fillStyle   = '#000000';
    ctx.globalAlpha = 0.02;
    for (let sy = 0; sy < H; sy += 2) {
      ctx.fillRect(0, sy, W, 1);
    }
    ctx.restore();

    // ── Radial pulse rings breathing outward behind title ────────────────────
    ctx.save();
    const titleCY = cy - 14;
    ctx.strokeStyle = COLOR_CYAN;
    ctx.lineWidth   = 1.8;
    for (let ring = 0; ring < 2; ring++) {
      const phase  = ((now * 0.00038) + ring * 0.5) % 1;
      const pR     = phase * 250;
      const pAlpha = phase < 0.1 ? (phase / 0.1) * 0.28 : (1 - phase) * 0.28;
      ctx.globalAlpha = pAlpha;
      setGlow(COLOR_BLUE, 20);
      ctx.beginPath();
      ctx.arc(cx, titleCY, pR, 0, Math.PI * 2);
      ctx.stroke();
    }
    clearGlow();
    ctx.restore();

    // ── Trail atmosphere ──────────────────────────────────────────────────────
    trail.draw();

    // ── Idle ship — glowing low-poly triangle, lower-left ───────────────────────
    ctx.save();
    const shipBobY   = H - 82 + Math.sin(t * 0.7) * 8;
    const flickerRaw = Math.sin(t * 7.3) * 0.5 + Math.sin(t * 13.1) * 0.3 + Math.sin(t * 3.7) * 0.2;
    const flicker    = 0.5 + flickerRaw * 0.32;
    ctx.translate(72, shipBobY);
    ctx.rotate(Math.sin(t * 0.7) * 0.06);

    // Engine bloom behind ship
    ctx.globalAlpha = flicker * 0.45;
    setGlow(COLOR_PINK, 28);
    ctx.fillStyle = COLOR_PINK;
    ctx.beginPath();
    ctx.arc(-18, 0, 9 + flickerRaw * 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Low-poly triangle body
    ctx.globalAlpha = 1;
    ctx.shadowColor = COLOR_CYAN;
    ctx.shadowBlur  = 14;
    ctx.lineWidth   = 1.5;
    ctx.strokeStyle = COLOR_CYAN;
    ctx.fillStyle   = 'rgba(0, 79, 255, 0.22)';
    ctx.beginPath();
    ctx.moveTo( 28,   0);   // nose
    ctx.lineTo(-20,  18);   // bottom wing
    ctx.lineTo(-12,   0);   // rear indent
    ctx.lineTo(-20, -18);   // top wing
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Engine core flicker
    ctx.globalAlpha = flicker;
    setGlow(COLOR_PINK, 18);
    ctx.fillStyle = '#ffaaee';
    ctx.beginPath();
    ctx.arc(-14, 0, 2.5 + flickerRaw * 1.5, 0, Math.PI * 2);
    ctx.fill();

    clearGlow();
    ctx.restore();

    // ── Triple-layer glow title ───────────────────────────────────────────────
    ctx.save();
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.font         = 'bold 74px monospace';
    const ty1 = cy - 50, ty2 = cy + 22;

    // Layer 1 — wide soft bloom (shadowBlur 60, alpha 0.2)
    ctx.globalAlpha = 0.2;
    ctx.shadowColor = COLOR_CYAN;
    ctx.shadowBlur  = 60;
    ctx.fillStyle   = COLOR_CYAN;
    ctx.fillText('TECHNO', cx, ty1);
    ctx.fillText('DRONE',  cx, ty2);

    // Layer 2 — medium corona (shadowBlur 20, alpha 0.5)
    ctx.globalAlpha = 0.5;
    ctx.shadowBlur  = 20;
    ctx.fillText('TECHNO', cx, ty1);
    ctx.fillText('DRONE',  cx, ty2);

    // Layer 3 — tight bright core (shadowBlur 6, alpha 1.0)
    ctx.globalAlpha = 1.0;
    ctx.shadowBlur  = 6;
    ctx.fillText('TECHNO', cx, ty1);
    ctx.fillText('DRONE',  cx, ty2);

    clearGlow();

    // Subtitle
    setGlow(COLOR_PINK, 16);
    ctx.fillStyle   = COLOR_PINK;
    ctx.globalAlpha = 0.88;
    ctx.font        = 'bold 22px monospace';
    ctx.fillText('ELIMINATE ALL TARGETS', cx, ty2 + 60);
    clearGlow();
    ctx.restore();

    // ── Menu items with sliding left-edge accent bar ────────────────────────
    ctx.save();
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.font         = 'bold 20px monospace';
    const pulse    = Math.sin(now * 0.0032) * 0.35 + 0.65;
    const barProg  = Math.min(1, (now - titleSelectionChangedAt) / 200);
    const barEase  = 1 - Math.pow(1 - barProg, 3); // ease-out cubic

    const menuDefs = [
      { label: 'PRESS ENTER TO START', y: H - 120, idx: 0, color: '#ffffff',  glow: '#ffffff'  },
      { label: 'LEADERBOARD',          y: H - 80,  idx: 1, color: COLOR_CYAN, glow: COLOR_CYAN },
    ];

    menuDefs.forEach(item => {
      const isSel    = titleSelection === item.idx;
      const tw       = ctx.measureText(item.label).width;
      const barRestX = cx - tw / 2 - 18;

      ctx.globalAlpha = isSel ? pulse : 0.5;
      setGlow(isSel ? item.glow : 'transparent', isSel ? 10 : 0);
      ctx.fillStyle = isSel ? item.color : '#888888';
      ctx.fillText(isSel ? '> ' + item.label + ' <' : item.label, cx, item.y);

      // Accent bar slides in from the left on selection
      if (isSel) {
        const barX = (barRestX - 26) + 26 * barEase;
        ctx.globalAlpha = barEase * pulse;
        setGlow(item.color, 14);
        ctx.fillStyle = item.color;
        ctx.fillRect(barX, item.y - 11, 3, 22);
      }
    });

    clearGlow();

    // High score
    if (save.highScore > 0) {
      setGlow('#ffffff', 8);
      ctx.fillStyle    = '#ffffff';
      ctx.globalAlpha  = 0.4;
      ctx.font         = '18px monospace';
      ctx.textAlign    = 'right';
      ctx.textBaseline = 'top';
      ctx.fillText('BEST  ' + save.highScore, W - 20, 20);
      clearGlow();
    }

    ctx.restore();

    drawStageNodes();
  }

  // ─── DEATH SCREEN ─────────────────────────────────────────────────────────────
  function drawDeathScreen() {
    const cx = canvas.width  / 2;
    const H  = canvas.height;

    ctx.save();
    ctx.fillStyle = COLOR_BG;
    ctx.fillRect(0, 0, canvas.width, H);
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';

    const isHighScore = player.score > 0 && player.score >= save.highScore;
    const titleColor  = isHighScore ? COLOR_CYAN : COLOR_CRIMSON;
    setGlow(titleColor, 40);
    ctx.fillStyle = titleColor;
    ctx.font      = 'bold 52px monospace';
    ctx.fillText(player.deathMessage || 'unlucky', cx, H * 0.18);

    clearGlow();
    setGlow(COLOR_CYAN, 14);
    ctx.fillStyle = COLOR_CYAN;
    ctx.font      = '15px monospace';
    ctx.fillText(`SCORE  ${player.score}   |   KILLS  ${stage.totalKills}`, cx, H * 0.30);
    ctx.fillText(`STAGE REACHED: ${stage.current} / 10`, cx, H * 0.37);

    ctx.font        = '13px monospace';
    ctx.globalAlpha = 0.6;
    ctx.fillText(`BEST  ${save.highScore}`, cx, H * 0.43);
    ctx.globalAlpha = 1;

    const history = save.runs.slice(-5);
    if (history.length > 1) {
      clearGlow();
      ctx.fillStyle   = COLOR_CYAN;
      ctx.globalAlpha = 0.35;
      ctx.font        = '11px monospace';
      history.forEach((r, i) => {
        const runNum = save.runs.length - history.length + i + 1;
        ctx.fillText(`run ${runNum}  ${r.score} pts  ${r.kills} kills`, cx, H * 0.52 + i * 16);
      });
      ctx.globalAlpha = 1;
    }

    clearGlow();
    const pulse = 0.5 + 0.5 * Math.sin(getNow() * 0.003);
    ctx.globalAlpha = pulse * 0.6 + 0.2;
    ctx.fillStyle   = '#ffffff';
    ctx.font        = '13px monospace';
    ctx.fillText('[ R — start new run ]', cx, H * 0.72);

    clearGlow();
    ctx.restore();
  }

  // ─── WIN SCREEN ───────────────────────────────────────────────────────────────
  function drawWinScreen() {
    const cx = canvas.width  / 2;
    const cy = canvas.height / 2;

    ctx.save();
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';

    setGlow(COLOR_CYAN, 60);
    ctx.fillStyle = COLOR_CYAN;
    ctx.font      = 'bold 80px monospace';
    ctx.fillText('YOU WIN', cx, cy - 30);

    clearGlow();
    ctx.fillStyle   = '#ffffff';
    ctx.globalAlpha = 0.5;
    ctx.font        = '16px monospace';
    ctx.fillText(`SCORE  ${player.score}   |   KILLS  ${stage.totalKills}`, cx, cy + 50);

    const pulse = 0.5 + 0.5 * Math.sin(getNow() * 0.003);
    ctx.globalAlpha = pulse * 0.5 + 0.2;
    ctx.font = '13px monospace';
    ctx.fillText('[ R — play again ]', cx, cy + 90);

    clearGlow();
    ctx.restore();
  }

  // ─── PAUSE ───────────────────────────────────────────────────────────────────
  let paused       = false;
  let pauseSel     = 0; // 0: resume, 1: sound, 2: home
  let soundEnabled = true;

  function drawPauseMenu() {
    const W = canvas.width, H = canvas.height;
    const cx = W / 2, cy = H / 2;

    // dim overlay
    ctx.save();
    ctx.globalAlpha = 0.6;
    ctx.fillStyle   = '#000000';
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 1;

    // panel
    const pw = 320, ph = 260;
    const px = cx - pw / 2, py = cy - ph / 2;
    ctx.fillStyle = '#0a0a0a';
    ctx.strokeStyle = COLOR_CYAN;
    setGlow(COLOR_CYAN, 20);
    ctx.lineWidth = 1.5;
    ctx.strokeRect(px, py, pw, ph);
    clearGlow();
    ctx.fillRect(px, py, pw, ph);

    // title
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.font         = 'bold 28px monospace';
    setGlow(COLOR_CYAN, 30);
    ctx.fillStyle = COLOR_CYAN;
    ctx.fillText('PAUSED', cx, py + 44);

    // separator
    ctx.globalAlpha = 0.3;
    ctx.strokeStyle = COLOR_CYAN;
    ctx.lineWidth   = 0.8;
    ctx.beginPath();
    ctx.moveTo(px + 30, py + 72);
    ctx.lineTo(px + pw - 30, py + 72);
    ctx.stroke();
    ctx.globalAlpha = 1;

    // menu items
    PAUSE_ITEMS.forEach((item, i) => {
      const iy      = py + 110 + i * 52;
      const sel     = i === pauseSel;
      let label     = item;
      if (item === 'SOUND') label = soundEnabled ? 'SOUND  ON' : 'SOUND  OFF';

      setGlow(sel ? '#ffffff' : COLOR_CYAN, sel ? 18 : 6);
      ctx.fillStyle   = sel ? '#ffffff' : COLOR_CYAN;
      ctx.globalAlpha = sel ? 1 : 0.5;
      ctx.font        = `${sel ? 'bold ' : ''}21px monospace`;
      ctx.fillText(sel ? `> ${label} <` : label, cx, iy);
      ctx.globalAlpha = 1;
    });

    clearGlow();
    ctx.restore();
  }

  window.addEventListener('keydown', e => {
    if (gameState !== 'playing' || player.dead) return;
    if (e.key === 'Escape') {
      paused = !paused;
      pauseSel = 0;
    }
    if (!paused) return;
    if (e.key === 'ArrowUp'   || e.key === 'w' || e.key === 'W') pauseSel = (pauseSel - 1 + PAUSE_ITEMS.length) % PAUSE_ITEMS.length;
    if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') pauseSel = (pauseSel + 1) % PAUSE_ITEMS.length;
    if (e.key === 'Enter') {
      if (pauseSel === 0) { paused = false; }
      if (pauseSel === 1) { soundEnabled = !soundEnabled; }
      if (pauseSel === 2) { paused = false; pauseSel = 0; gameState = 'title'; delete justPressed['Enter']; }
    }
  });

  // ─── GAME LOOP ───────────────────────────────────────────────────────────────
  let lastTime = 0;

  function update(delta) {
    if (gameState === 'title')       { updateTitle(delta); return; }
    if (gameState === 'leaderboard') { leaderboard.update(delta); return; }
    if (gameState === 'win')         { return; }
    if (paused)                      { return; }

    if (player.dead) {
      if (gameState === 'nameEntry') nameEntry.update(delta);
      return;
    }

    const effectiveDelta = stage.slowmoTimer > 0 ? delta * 0.25 : delta;
    starField.update(delta);  // always real-time, not slow-mo
    dash.update(effectiveDelta);
    drone.update(effectiveDelta);
    bullets.update(effectiveDelta);
    missiles.update(effectiveDelta);

    // tutorial: skip normal shard spawning, use tutorial's scripted spawns
    if (gameState === 'tutorial') {
      tutorial.update(delta);
      // still update shard movement, fragments, etc. — just skip shard.update's spawning
      const dt = effectiveDelta / 1000;
      shards.pool = shards.pool.filter(s => {
        if (!s.isKamikaze) {
          const curAngle = Math.atan2(s.vy, s.vx);
          const tgtAngle = Math.atan2(drone.y - s.y, drone.x - s.x);
          let diff = tgtAngle - curAngle;
          while (diff >  Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          const maxTurn  = (s.turnRate || 0.5) * dt;
          const turn     = Math.min(Math.abs(diff), maxTurn) * Math.sign(diff);
          const newAngle = curAngle + turn;
          const spd      = Math.hypot(s.vx, s.vy);
          s.vx = Math.cos(newAngle) * spd;
          s.vy = Math.sin(newAngle) * spd;
        }
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        s.angle += s.spin;
        if (s.flashTimer > 0) s.flashTimer -= effectiveDelta;
        if (s.hpBarTimer > 0) s.hpBarTimer -= effectiveDelta;
        return s.x > -80;
      });
    } else {
      shards.update(effectiveDelta);
    }

    fragments.update(effectiveDelta);
    burstParticles.update(effectiveDelta);
    hitSparks.update(effectiveDelta);
    impactFX.update(effectiveDelta);
    smokeParticles.update(effectiveDelta);
    pickups.update(effectiveDelta);
    if (gameState !== 'tutorial') stage.update(delta);
    player.update(effectiveDelta);
    checkCollisions();
    graze.update(effectiveDelta);
    chainLightning.update(effectiveDelta);
    screenNuke.update(effectiveDelta);
    streakCallout.update(effectiveDelta);

    // Q key fires screen nuke
    if (justPressed['q'] || justPressed['Q']) {
      screenNuke.fire();
    }
  }

  function render() {
    if (gameState === 'title')       { drawTitleScreen(); return; }
    if (gameState === 'leaderboard') { leaderboard.draw(); return; }
    if (gameState === 'win')         { drawWinScreen(); return; }

    if (player.dead) {
      drawDeathScreen();
      if (gameState === 'nameEntry') nameEntry.drawOverlay();
      return;
    }

    ctx.fillStyle = COLOR_BG;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    starField.draw();

    ctx.save();
    if (stage.shakeTimer > 0 && stage.shakeIntensity > 0) {
      const sx = (Math.random() * 2 - 1) * stage.shakeIntensity;
      const sy = (Math.random() * 2 - 1) * stage.shakeIntensity;
      ctx.translate(sx, sy);
    }

    trail.draw();
    shards.draw();
    burstParticles.draw();
    hitSparks.draw();
    fragments.draw();
    smokeParticles.draw();
    impactFX.draw();
    graze.draw();
    pickups.draw();
    bullets.draw();
    missiles.draw();
    drone.draw();
    chainLightning.draw();
    screenNuke.draw();

    ctx.restore();

    // ── Bloom composite pass (half-res for performance) ────────────────────────
    bloomCtx.clearRect(0, 0, bloomCanvas.width, bloomCanvas.height);
    bloomCtx.save();
    bloomCtx.scale(0.5, 0.5);
    // bullet tips
    bloomCtx.globalAlpha = 0.9;
    bloomCtx.fillStyle   = COLOR_PINK;
    for (let i = 0; i < bullets.pool.length; i++) {
      const b = bullets.pool[i];
      bloomCtx.beginPath(); bloomCtx.arc(b.x, b.y, 3, 0, Math.PI * 2); bloomCtx.fill();
    }
    // enemy cores
    bloomCtx.globalAlpha = 0.28;
    for (let i = 0; i < shards.pool.length; i++) {
      const s = shards.pool[i];
      bloomCtx.fillStyle = s.color;
      bloomCtx.beginPath(); bloomCtx.arc(s.x, s.y, s.size * 0.25, 0, Math.PI * 2); bloomCtx.fill();
    }
    // explosion fragment cores
    for (let i = 0; i < fragments.pool.length; i++) {
      const f = fragments.pool[i];
      bloomCtx.globalAlpha = f.alpha * 0.5;
      bloomCtx.fillStyle   = f.color;
      bloomCtx.beginPath(); bloomCtx.arc(f.x, f.y, f.size * 0.4, 0, Math.PI * 2); bloomCtx.fill();
    }
    // ship tip
    { const tx = drone.x + 22 * Math.cos(drone.tilt);
      const ty = drone.y + 22 * Math.sin(drone.tilt);
      bloomCtx.globalAlpha = 0.85;
      bloomCtx.fillStyle   = COLOR_PINK;
      bloomCtx.beginPath(); bloomCtx.arc(tx, ty, 4, 0, Math.PI * 2); bloomCtx.fill();
    }
    bloomCtx.restore();
    // composite blurred bloom onto main canvas (drawn scaled up from half-res)
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.5;
    ctx.filter      = 'blur(10px)';
    ctx.drawImage(bloomCanvas, 0, 0, canvas.width, canvas.height);
    ctx.filter      = 'none';
    ctx.restore();

    stage.drawFlash();
    drawVignetteAndScanlines();
    drawHUD();
    streakCallout.draw();
    if (gameState === 'tutorial') tutorial.draw();
    if (paused) drawPauseMenu();
  }

  // ─── RESTART ─────────────────────────────────────────────────────────────────
  canvas.addEventListener('click', (e) => {
    if (gameState === 'title') {
      const cy = canvas.height - 50;
      if (e.offsetY > cy - 20 && e.offsetY < cy + 20) {
        gameState = 'leaderboard';
        leaderboard.fetchScores();
      } else {
        startGame();
      }
    }
  });

  window.addEventListener('keydown', e => {
    if ((e.key === 'r' || e.key === 'R') && (player.dead || gameState === 'win') && gameState !== 'nameEntry') {
      _resetAllState();
      gameState = 'playing';
    }
  });

  function loop(timestamp) {
    frameNow = timestamp;
    const delta = Math.min(timestamp - lastTime, 100);
    lastTime = timestamp;
    update(delta);
    render();
    for (const k in justPressed) delete justPressed[k];
    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);

