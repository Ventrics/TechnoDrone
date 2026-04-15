function getDeathScreenClickTargets() {
  const W = canvas.width, H = canvas.height;
  const cx = W / 2, cy = H / 2;
  const layoutScale = Math.max(0.72, Math.min(1.08, Math.min(W / 1280, H / 720)));
  const controlsY = cy + 235 * layoutScale;
  const controlFontSize = Math.round(Math.max(12, Math.min(14, 14 * layoutScale)));
  const font = `bold ${controlFontSize}px ${UI_DISPLAY_FONT}`;
  return [
    {
      action: 'restart',
      selection: 0,
      ..._measureCenteredTextBounds('[ R - START NEW RUN ]', cx, controlsY, font, 28 * layoutScale, 14 * layoutScale),
    },
    {
      action: 'menu',
      selection: 1,
      ..._measureCenteredTextBounds('[ M - MAIN MENU ]', cx, controlsY + 30 * layoutScale, font, 28 * layoutScale, 14 * layoutScale),
    }
  ];
}

function getWinScreenClickTargets() {
  const W = canvas.width, H = canvas.height;
  const cx = W / 2, cy = H / 2;
  const now = getNow();
  const layoutScale = Math.max(0.72, Math.min(1.08, Math.min(W / 1280, H / 720)));
  const elapsed = Math.max(0, now - (missionCompleteSequence?.startedAt || now));
  const controlsDelay = 2120;
  const controlsProgress = Math.max(0, Math.min(1, (elapsed - controlsDelay) / 360));
  if (controlsProgress <= 0) return [];
  const controlsY = cy + 326 * layoutScale;
  const controlFontSize = Math.round(Math.max(12, Math.min(14, 14 * layoutScale)));
  const font = `bold ${controlFontSize}px ${UI_DISPLAY_FONT}`;
  return [
    {
      action: 'restart',
      selection: 0,
      ..._measureCenteredTextBounds('[ R - PLAY AGAIN ]', cx, controlsY, font, 28 * layoutScale, 14 * layoutScale),
    },
    {
      action: 'menu',
      selection: 1,
      ..._measureCenteredTextBounds('[ M - MAIN MENU ]', cx, controlsY + 30 * layoutScale, font, 28 * layoutScale, 14 * layoutScale),
    }
  ];
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
  ctx.font = `${headingFontSize}px ${TITLE_WORDMARK_FONT}`;
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
  ctx.font = `${Math.round(Math.max(11, 12 * layoutScale))}px ${UI_DISPLAY_FONT}`;
  ctx.fillText('FINAL SCORE', cx, labelY);

  if (scoreIsBest) {
    const bestPulse = 0.72 + 0.28 * (0.5 + 0.5 * Math.sin(now * 0.008));
    ctx.globalAlpha = 0.88 * bestPulse;
    setGlow(COLOR_CYAN, 14 + bestPulse * 10);
    ctx.fillStyle = '#d9ffff';
    ctx.font = `bold ${bestTagFontSize}px ${UI_DISPLAY_FONT}`;
    ctx.fillText('NEW ALL-TIME BEST', cx, labelY - 22 * layoutScale);
    clearGlow();
  }

  ctx.globalAlpha = 1;
  setGlow(scoreIsBest ? COLOR_CYAN : COLOR_PINK, scoreIsBest ? 24 : 20);
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${scoreFontSize}px ${UI_DISPLAY_FONT}`;
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
    ctx.font = `bold ${statLabelFontSize}px ${UI_DISPLAY_FONT}`;
    ctx.fillText(stat.label, sx, statsY - 16 * layoutScale);

    ctx.globalAlpha = 1;
    setGlow(stat.color, i === 2 ? 8 : 10);
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${statValueFontSize}px ${UI_DISPLAY_FONT}`;
    ctx.fillText(stat.value, sx, statsY + 14 * layoutScale);
    clearGlow();
  });

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `bold ${controlFontSize}px ${UI_DISPLAY_FONT}`;
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
  const W = canvas.width, H = canvas.height;
  const cx = W / 2, cy = H / 2;
  const now = getNow();
  const layoutScale = Math.max(0.72, Math.min(1.08, Math.min(W / 1280, H / 720)));
  const elapsed = Math.max(0, now - (missionCompleteSequence?.startedAt || now));
  const droneIntroMs = 1200;
  const headingDelay = 520;
  const subtitleDelay = 1180;
  const scoreDelay = 1500;
  const killsDelay = 1780;
  const controlsDelay = 2120;
  const headingY = cy - 140 * layoutScale;
  const subtitleY = cy - 58 * layoutScale;
  const bandY = cy + 18 * layoutScale;
  const scoreLabelY = cy + 70 * layoutScale;
  const scoreY = cy + 132 * layoutScale;
  const killsLabelY = cy + 220 * layoutScale;
  const killsY = cy + 268 * layoutScale;
  const controlsY = cy + 326 * layoutScale;
  const pulse = 0.62 + 0.38 * Math.sin(now * 0.004);
  const heroColor = '#d9d4ff';
  const heroGlow = '#8b5cf6';
  const accent = '#fb29fd';
  const accentBlue = '#31afd4';
  const headingFontSize = Math.round(Math.max(88, Math.min(156, 156 * layoutScale)));
  const scoreFontSize = Math.round(Math.max(72, Math.min(118, 118 * layoutScale)));
  const killsFontSize = Math.round(Math.max(42, Math.min(68, 68 * layoutScale)));
  const controlFontSize = Math.round(Math.max(12, Math.min(14, 14 * layoutScale)));
  const selectPulse = 0.65 + 0.35 * Math.sin(now * 0.005);
  const selectProg = Math.min(1, (now - endScreenSelectionChangedAt) / 180);
  const selectEase = 1 - Math.pow(1 - selectProg, 3);
  const heroProgress = Math.max(0, Math.min(1, elapsed / droneIntroMs));
  const heroEase = 1 - Math.pow(1 - heroProgress, 3);
  const heroTargetY = cy + 12 * layoutScale;
  const heroY = H + 160 - (H + 160 - heroTargetY) * heroEase;
  const heroX = missionCompleteSequence?.heroX || cx;
  const heroTilt = -0.12 + 0.12 * heroEase + Math.sin(now * 0.0035) * 0.05;
  const heroAlpha = 0.3 + 0.7 * heroEase;
  const reveal = (delay, duration = 420) => Math.max(0, Math.min(1, (elapsed - delay) / duration));

  ctx.save();
  ctx.fillStyle = '#020204';
  ctx.fillRect(0, 0, W, H);

  const vignette = ctx.createRadialGradient(cx, cy * 0.92, Math.min(W, H) * 0.12, cx, cy, Math.max(W, H) * 0.8);
  vignette.addColorStop(0, 'rgba(139,92,246,0.06)');
  vignette.addColorStop(0.38, 'rgba(10,6,24,0.06)');
  vignette.addColorStop(1, 'rgba(0,0,0,0.78)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, W, H);

  const horizonBand = ctx.createLinearGradient(0, bandY - 46, 0, bandY + 52);
  horizonBand.addColorStop(0, 'rgba(0,0,0,0)');
  horizonBand.addColorStop(0.28, 'rgba(110,72,220,0.05)');
  horizonBand.addColorStop(0.5, 'rgba(172,111,255,0.16)');
  horizonBand.addColorStop(0.72, 'rgba(72,170,224,0.06)');
  horizonBand.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = horizonBand;
  ctx.fillRect(0, bandY - 46, W, 98);

  const horizonLine = ctx.createLinearGradient(0, 0, W, 0);
  horizonLine.addColorStop(0, 'rgba(0,0,0,0)');
  horizonLine.addColorStop(0.18, 'rgba(112,70,225,0.42)');
  horizonLine.addColorStop(0.5, 'rgba(214,175,255,0.72)');
  horizonLine.addColorStop(0.82, 'rgba(112,70,225,0.42)');
  horizonLine.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = horizonLine;
  ctx.fillRect(0, bandY, W, 2);

  ctx.globalAlpha = 0.07;
  ctx.fillStyle = accentBlue;
  for (let y = 0; y < H; y += 4) ctx.fillRect(0, y, W, 1);
  ctx.globalAlpha = 1;

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const ambientBand = ctx.createLinearGradient(0, heroY - 90, 0, heroY + 160);
  ambientBand.addColorStop(0, 'rgba(0,0,0,0)');
  ambientBand.addColorStop(0.5, 'rgba(139,92,246,0.12)');
  ambientBand.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.globalAlpha = heroAlpha;
  ctx.fillStyle = ambientBand;
  ctx.fillRect(0, heroY - 110, W, 280);

  ctx.save();
  ctx.globalAlpha = heroAlpha;
  const prevX = drone.x, prevY = drone.y, prevTilt = drone.tilt, prevDrawX = drone._drawX, prevDrawY = drone._drawY;
  drone.x = heroX;
  drone.y = heroY;
  drone.tilt = heroTilt;
  drone._drawX = heroX;
  drone._drawY = heroY;
  drone.draw();
  drone.x = prevX;
  drone.y = prevY;
  drone.tilt = prevTilt;
  drone._drawX = prevDrawX;
  drone._drawY = prevDrawY;
  ctx.restore();

  const heading = 'MISSION COMPLETE';
  ctx.font = `${headingFontSize}px "anatol-mn", sans-serif`;
  const letters = heading.split('');
  const spacing = Math.max(4, headingFontSize * 0.04);
  const widths = letters.map(ch => ch === ' ' ? headingFontSize * 0.42 : ctx.measureText(ch).width);
  const totalWidth = widths.reduce((sum, width) => sum + width, 0) + spacing * (letters.length - 1);
  const headingProgress = reveal(headingDelay, 560);
  const drawLayer = (alphaBase, blur, fill, glowColor) => {
    let drawX = cx - totalWidth / 2;
    ctx.fillStyle = fill;
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = blur;
    letters.forEach((ch, i) => {
      const charWidth = widths[i];
      const charCenter = drawX + charWidth / 2;
      const charDelay = headingDelay + i * 34;
      const charProgress = Math.max(0, Math.min(1, (elapsed - charDelay) / 260));
      const charEase = 1 - Math.pow(1 - charProgress, 3);
      const noise = 0.82 + 0.18 * (0.5 + 0.5 * Math.sin(now * 0.018 + i * 0.8));
      const charY = headingY - (1 - charEase) * 80;
      ctx.globalAlpha = alphaBase * noise * charEase;
      ctx.fillText(ch, charCenter, charY);
      drawX += charWidth + spacing;
    });
  };

  if (headingProgress > 0) {
    drawLayer(0.08, 56, accent, heroGlow);
    drawLayer(0.24, 30, heroGlow, heroGlow);
    drawLayer(1.0, 10, heroColor, accentBlue);
  }
  ctx.shadowBlur = 0;
  ctx.shadowColor = 'transparent';

  const subtitleProgress = reveal(subtitleDelay, 360);
  if (subtitleProgress > 0) {
    ctx.globalAlpha = 0.9 * subtitleProgress;
    ctx.font = `${Math.round(Math.max(14, 16 * layoutScale))}px ${UI_DISPLAY_FONT}`;
    setGlow(accentBlue, 12);
    ctx.fillStyle = '#e6f7ff';
    ctx.fillText('ALL 10 STAGES CLEARED', cx, subtitleY);
    clearGlow();
  }

  const scoreProgress = reveal(scoreDelay, 420);
  if (scoreProgress > 0) {
    ctx.globalAlpha = 0.6 * scoreProgress;
    ctx.font = `${Math.round(Math.max(12, 13 * layoutScale))}px ${UI_DISPLAY_FONT}`;
    ctx.fillStyle = accentBlue;
    ctx.fillText('FINAL SCORE', cx, scoreLabelY);

    ctx.globalAlpha = pulse * scoreProgress;
    setGlow(heroGlow, 22);
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${scoreFontSize}px ${UI_DISPLAY_FONT}`;
    ctx.fillText(player.score.toLocaleString(), cx, scoreY);
    clearGlow();
  }

  const killsProgress = reveal(killsDelay, 420);
  if (killsProgress > 0) {
    ctx.globalAlpha = 0.6 * killsProgress;
    ctx.font = `${Math.round(Math.max(12, 13 * layoutScale))}px ${UI_DISPLAY_FONT}`;
    ctx.fillStyle = accent;
    ctx.fillText('KILLS', cx, killsLabelY);

    ctx.globalAlpha = 0.96 * killsProgress;
    setGlow(accent, 16);
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${killsFontSize}px ${UI_DISPLAY_FONT}`;
    ctx.fillText(stage.totalKills.toLocaleString(), cx, killsY);
    clearGlow();
  }

  ctx.font = `bold ${controlFontSize}px ${UI_DISPLAY_FONT}`;
  const options = [
    { label: '[ R - PLAY AGAIN ]', y: controlsY, activeGlow: accent, activeFill: '#ffffff', idleFill: '#8f8f8f' },
    { label: '[ M - MAIN MENU ]', y: controlsY + 30 * layoutScale, activeGlow: '#bbbbbb', activeFill: '#d7d7d7', idleFill: '#7a7a7a' }
  ];

  const controlsProgress = reveal(controlsDelay, 360);
  options.forEach((option, idx) => {
    if (controlsProgress <= 0) return;
    const isSelected = endScreenSelection === idx;
    const tw = ctx.measureText(option.label).width;
    if (isSelected) {
      const cardW = tw + 36 * layoutScale;
      const cardH = 24 * layoutScale;
      const cardX = cx - cardW / 2;
      const cardY = option.y - cardH / 2;
      ctx.globalAlpha = 0.2 * selectEase * controlsProgress;
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.fillRect(cardX, cardY, cardW, cardH);
    }

    ctx.globalAlpha = (isSelected ? (pulse * 0.85 + 0.1) : 0.3) * controlsProgress;
    setGlow(isSelected ? option.activeGlow : 'transparent', isSelected ? 12 : 0);
    ctx.fillStyle = isSelected ? option.activeFill : option.idleFill;
    ctx.fillText(option.label, cx, option.y);
    if (isSelected) {
      const bracketOffset = tw / 2 + 20 * layoutScale;
      const slide = (1 - selectEase) * 12;
      ctx.globalAlpha = (0.6 + selectPulse * 0.4) * controlsProgress;
      ctx.fillStyle = option.activeFill;
      setGlow(option.activeGlow, 14);
      ctx.fillText('[', cx - bracketOffset + slide, option.y);
      ctx.fillText(']', cx + bracketOffset - slide, option.y);
    }
    clearGlow();
  });

  ctx.restore();
}
