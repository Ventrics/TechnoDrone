// pixi-post.js -- GPU compositor and native Pixi scene foundation.
// The game still renders most content to Canvas2D for now; this module
// exposes native Pixi layers so individual systems can migrate safely.

const pixiPost = (() => {
  let app = null;
  let baseTexture = null;
  let glowTexture = null;
  let canvasGlowSprite = null;
  let canvasSprite = null;

  let contentRoot = null;
  let bgRoot = null;
  let bgLayer = null;
  let worldRoot = null;
  let particleLayer = null;
  let entityLayer = null;
  let playerLayer = null;
  let fxLayer = null;
  let hudLayer = null;
  let playMask = null;
  let overlayRoot = null;
  let stageOverlay = null;
  let flowOverlay = null;
  let dangerOverlay = null;
  let titleGlowLayer = null;
  let titleWordmark = null;
  let transitionLayer = null;
  let transitionOverlay = null;

  let pauseActive = false;
  let pauseBlurFilter = null;
  let pauseLayer = null;
  let pauseBgGraphics = null;
  let pauseSelHighlightGfx = null;
  let pauseHeaderText = null;
  let pauseSubtitleText = null;
  let pauseDividerGfx = null;
  let pauseItemTexts = [];
  let pauseItemGlowFilters = [];

  let colorFilter = null;
  let glowFilter = null;
  let caFilter = null;
  let glitchFilter = null;
  let pixelateFilter = null;
  let titleBloomFilter = null;

  let caIntensity = 0;
  let shakeIntensity = 0;
  let flowBlend = 0;
  let flowTarget = 0;
  let stageLevel = 1;
  let nearDeath = false;
  let ready = false;

  let activeTransition = null;
  let deathBurstActive = false;
  let deathBurstStart = 0;
  let deathBurstDuration = 520;
  let deathWashDuration = 420;
  let deathPixelatePeak = 6;

  const nativeLayerFlags = {
    bg: false,
    particles: false,
    entities: false,
    player: false,
    fx: false,
    hud: false,
  };

  function hexToInt(hex) {
    return parseInt(String(hex || '#000000').replace('#', ''), 16);
  }

  function _isPixiReady() {
    return typeof PIXI !== 'undefined';
  }

  function _getRendererResolution() {
    return Math.min(1.25, Math.max(1, (window.devicePixelRatio || 1) * 0.9));
  }

  function _applyNativeLayerVisibility() {
    if (!ready) return;
    bgRoot.visible = nativeLayerFlags.bg;
    particleLayer.visible = nativeLayerFlags.particles;
    entityLayer.visible = nativeLayerFlags.entities;
    playerLayer.visible = nativeLayerFlags.player;
    fxLayer.visible = nativeLayerFlags.fx;
    hudLayer.visible = nativeLayerFlags.hud;
  }

  function _rebuildPlayMask() {
    if (!playMask) return;
    const maskX = typeof PLAY_X === 'number' ? PLAY_X : 0;
    const maskY = typeof PLAY_Y === 'number' ? PLAY_Y : 0;
    const maskW = typeof PLAY_W === 'number' ? PLAY_W : canvas.width;
    const maskH = typeof PLAY_H === 'number' ? PLAY_H : canvas.height;
    playMask.clear();
    playMask.beginFill(0xffffff, 1);
    playMask.drawRect(maskX, maskY, maskW, maskH);
    playMask.endFill();
  }

  function _rebuildColorGrade() {
    if (!colorFilter) return;
    const flowAmount = Math.max(0, Math.min(1, flowBlend));
    const stageAmount = Math.max(0, Math.min(1, (stageLevel - 1) / 9));
    const nearDeathAmount = nearDeath ? 1 : 0;
    const pauseAmount = pauseActive ? 1 : 0;

    colorFilter.reset();
    colorFilter.brightness(1.02 + 0.03 * flowAmount + 0.01 * stageAmount - 0.08 * pauseAmount, false);
    colorFilter.contrast(0.12 + 0.05 * flowAmount + 0.02 * stageAmount, false);
    colorFilter.saturate(0.22 + 0.2 * flowAmount + 0.07 * stageAmount + 0.03 * nearDeathAmount - 0.55 * pauseAmount, false);
    if (flowAmount > 0.001) colorFilter.hue(12 * flowAmount, false);
  }

  function _getStageColor() {
    if (typeof STAGE_ENEMY_COLORS === 'undefined' || !Array.isArray(STAGE_ENEMY_COLORS) || !STAGE_ENEMY_COLORS.length) {
      return 0x8b5cf6;
    }
    const index = Math.max(0, Math.min(STAGE_ENEMY_COLORS.length - 1, stageLevel - 1));
    return hexToInt(STAGE_ENEMY_COLORS[index]);
  }

  function _syncTitleWordmarkLayout() {
    if (!titleGlowLayer || !titleWordmark) return;
    const widthScale = canvas.width / 1920;
    const heightScale = canvas.height / 1080;
    const scale = Math.max(0.72, Math.min(1.2, Math.min(widthScale, heightScale)));
    titleWordmark.scale.set(scale);
    titleWordmark.position.set(canvas.width * 0.5, canvas.height * 0.28);
    titleWordmark.alpha = 0.52;
    titleGlowLayer.filterArea = new PIXI.Rectangle(0, 0, canvas.width, canvas.height);
  }

  function _setPixelateSize(size, filter = pixelateFilter) {
    if (!filter) return;
    if (filter.pixelSize && typeof filter.pixelSize.set === 'function') {
      filter.pixelSize.set(size, size);
    } else {
      filter.pixelSize = [size, size];
    }
  }

  function _setContentFilters(extraFilters) {
    if (!contentRoot || !colorFilter || !caFilter) return;
    const filters = [colorFilter, caFilter];
    if (pauseActive && pauseBlurFilter) filters.push(pauseBlurFilter);
    if (Array.isArray(extraFilters)) {
      for (const filter of extraFilters) {
        if (filter && !filters.includes(filter)) filters.push(filter);
      }
    }
    contentRoot.filters = filters;
  }

  function _syncPauseMenuLayout() {
    if (!pauseLayer || !app) return;
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;

    if (pauseBgGraphics) {
      pauseBgGraphics.clear();
      pauseBgGraphics.beginFill(0x000000, 0.78);
      pauseBgGraphics.drawRect(0, 0, canvas.width, canvas.height);
      pauseBgGraphics.endFill();
    }
    if (pauseHeaderText) {
      pauseHeaderText.x = cx;
      pauseHeaderText.y = cy - 100;
    }
    if (pauseSubtitleText) {
      pauseSubtitleText.x = cx;
      pauseSubtitleText.y = cy - 68;
    }
    if (pauseDividerGfx) {
      pauseDividerGfx.clear();
      pauseDividerGfx.lineStyle(1, 0xffffff, 0.12);
      pauseDividerGfx.moveTo(cx - 160, cy - 54);
      pauseDividerGfx.lineTo(cx + 160, cy - 54);
    }
    pauseItemTexts.forEach((text, i) => {
      text.x = cx;
      text.y = cy - 34 + i * 42;
    });
    if (pauseLayer.filters && pauseLayer.filters.length) {
      pauseLayer.filterArea = new PIXI.Rectangle(0, 0, canvas.width, canvas.height);
    }
  }

  function _createTitleBloomFilter() {
    if (typeof PIXI.filters.AdvancedBloomFilter === 'function') {
      const bloom = new PIXI.filters.AdvancedBloomFilter({
        bloomScale: 1.1,
        blur: 10,
        brightness: 1.0,
        threshold: 0.45,
        quality: 3,
      });
      bloom.padding = 36;
      return bloom;
    }

    if (typeof PIXI.filters.GlowFilter === 'function') {
      const glow = new PIXI.filters.GlowFilter({
        distance: 18,
        outerStrength: 3,
        innerStrength: 0.2,
        color: 0xc4b5fd,
        quality: 0.5,
      });
      glow.padding = 36;
      return glow;
    }

    return null;
  }

  function _createGlitchFilter() {
    if (typeof PIXI.filters.GlitchFilter !== 'function') return null;
    const filter = new PIXI.filters.GlitchFilter();
    filter.slices = 5;
    filter.offset = 12;
    filter.fillMode = 2;
    return filter;
  }

  function _createPixelateFilter() {
    if (typeof PIXI.filters.PixelateFilter !== 'function') return null;
    const filter = new PIXI.filters.PixelateFilter(1);
    _setPixelateSize(1, filter);
    return filter;
  }

  function _startTransitionState(type, onMidpoint, onComplete) {
    if (activeTransition || !ready) return false;

    const normalizedType = (type === 'glitch' || type === 'pixelate' || type === 'crt-off') ? type : 'fade';
    const duration = normalizedType === 'glitch'
      ? 420
      : normalizedType === 'pixelate'
        ? 430
        : normalizedType === 'crt-off'
          ? 520
          : 360;
    const midpoint = normalizedType === 'glitch'
      ? 160
      : normalizedType === 'crt-off'
        ? 320
        : duration / 2;

    activeTransition = {
      type: normalizedType,
      startTime: performance.now(),
      duration,
      midpoint,
      onMidpoint: typeof onMidpoint === 'function' ? onMidpoint : null,
      onComplete: typeof onComplete === 'function' ? onComplete : null,
      midpointFired: false,
      completeFired: false,
      baseScaleX: contentRoot.scale.x,
      baseScaleY: contentRoot.scale.y,
    };

    if (transitionLayer) {
      transitionLayer.visible = true;
      transitionLayer.renderable = true;
    }

    if (normalizedType === 'glitch') {
      caIntensity = 13;
    } else if (normalizedType === 'pixelate' && pixelateFilter) {
      _setPixelateSize(1);
    }

    return true;
  }

  function _finishTransitionState() {
    if (!activeTransition) return;
    const onComplete = activeTransition.onComplete;
    contentRoot.scale.set(activeTransition.baseScaleX, activeTransition.baseScaleY);
    activeTransition = null;
    if (transitionOverlay) transitionOverlay.clear();
    if (transitionLayer) {
      transitionLayer.visible = false;
      transitionLayer.renderable = false;
    }
    if (typeof onComplete === 'function') {
      try {
        onComplete();
      } catch (err) {
        console.error('[pixi-post] transition completion callback failed:', err);
      }
    }
  }

  function _updateTransitionRender(now, extraFilters) {
    if (!activeTransition || !transitionOverlay) return;

    const state = activeTransition;
    const elapsed = now - state.startTime;
    const duration = state.duration;
    const t = Math.max(0, Math.min(1, elapsed / duration));

    if (!state.midpointFired && elapsed >= state.midpoint) {
      state.midpointFired = true;
      if (typeof state.onMidpoint === 'function') {
        try {
          state.onMidpoint();
        } catch (err) {
          console.error('[pixi-post] transition midpoint callback failed:', err);
        }
      }
    }

    transitionOverlay.clear();

    if (state.type === 'fade') {
      const peak = 1 - Math.abs(t * 2 - 1);
      const eased = Math.pow(Math.max(0, peak), 0.82);
      transitionOverlay.beginFill(0x000000, eased);
      transitionOverlay.drawRect(0, 0, canvas.width, canvas.height);
      transitionOverlay.endFill();
    } else if (state.type === 'glitch') {
      const flashWindow = Math.min(1, elapsed / 150);
      const flashAlpha = flashWindow < 0.5 ? flashWindow * 0.5 : (1 - flashWindow) * 0.5;
      transitionOverlay.beginFill(0xffffff, Math.max(0, flashAlpha));
      transitionOverlay.drawRect(0, 0, canvas.width, canvas.height);
      transitionOverlay.endFill();

      if (glitchFilter && elapsed < 240) {
        extraFilters.push(glitchFilter);
      }

      caIntensity = Math.max(caIntensity, 13 * Math.max(0, 1 - elapsed / 320));
    } else if (state.type === 'pixelate') {
      const pulse = t < 0.5 ? t / 0.5 : (1 - t) / 0.5;
      const pixelSize = Math.max(1, Math.round(1 + 15 * Math.max(0, pulse)));
      if (pixelateFilter) {
        _setPixelateSize(pixelSize);
        extraFilters.push(pixelateFilter);
      }
      const alpha = 0.72 * Math.max(0, 1 - Math.abs(t * 2 - 1) * 0.9);
      transitionOverlay.beginFill(0x000000, alpha);
      transitionOverlay.drawRect(0, 0, canvas.width, canvas.height);
      transitionOverlay.endFill();
    } else if (state.type === 'crt-off') {
      const squish = Math.min(1, elapsed / 320);
      const scaleY = state.baseScaleY * (1 - 0.96 * squish);
      const scaleX = state.baseScaleX * (1 + 0.05 * squish);
      contentRoot.scale.set(scaleX, scaleY);

      const flash = Math.max(0, 1 - Math.abs((elapsed - 320) / 120));
      if (flash > 0.001) {
        transitionOverlay.beginFill(0xffffff, Math.min(0.45, flash * 0.45));
        transitionOverlay.drawRect(0, 0, canvas.width, canvas.height);
        transitionOverlay.endFill();
      }

      const fadeToBlack = elapsed > 320 ? Math.max(0, 1 - (elapsed - 320) / 160) : 0.18 * (1 - squish);
      if (fadeToBlack > 0.001) {
        transitionOverlay.beginFill(0x000000, fadeToBlack);
        transitionOverlay.drawRect(0, 0, canvas.width, canvas.height);
        transitionOverlay.endFill();
      }
    }

    if (elapsed >= duration) {
      _finishTransitionState();
    }
  }

  function _updateDeathBurst(now, extraFilters) {
    if (!deathBurstActive) return;

    const elapsed = now - deathBurstStart;
    const t = Math.max(0, Math.min(1, elapsed / deathBurstDuration));
    const pulse = Math.sin(Math.PI * t);
    const pixelSize = Math.max(1, Math.round(1 + Math.max(0, deathPixelatePeak - 1) * pulse));

    if (pixelateFilter) {
      _setPixelateSize(pixelSize);
      extraFilters.push(pixelateFilter);
    }

    caIntensity = Math.max(caIntensity, 14 * Math.max(0, 1 - t));

    if (elapsed >= deathBurstDuration) {
      deathBurstActive = false;
    }
  }

  function _rebuildOverlayPass() {
    if (!overlayRoot || !stageOverlay || !flowOverlay || !dangerOverlay) return;

    const now = performance.now();
    const playX = typeof PLAY_X === 'number' ? PLAY_X : 0;
    const playY = typeof PLAY_Y === 'number' ? PLAY_Y : 0;
    const playW = typeof PLAY_W === 'number' ? PLAY_W : canvas.width;
    const playH = typeof PLAY_H === 'number' ? PLAY_H : canvas.height;
    const flowPulse = 0.45 + 0.55 * (Math.sin(now * 0.0042) * 0.5 + 0.5);
    const stageColor = _getStageColor();
    const flowMagenta = 0xd56cff;
    const flowCyan = 0x66e7ff;

    stageOverlay.clear();
    const stageWashAlpha = 0.015 + Math.min(0.024, ((stageLevel - 1) / 9) * 0.024);
    stageOverlay.beginFill(stageColor, stageWashAlpha);
    stageOverlay.drawRect(0, 0, canvas.width, canvas.height);
    stageOverlay.endFill();

    if (deathBurstActive) {
      const elapsed = now - deathBurstStart;
      const redAlpha = 0.25 * Math.max(0, 1 - elapsed / deathWashDuration);
      if (redAlpha > 0.001) {
        stageOverlay.beginFill(0xff0000, redAlpha);
        stageOverlay.drawRect(0, 0, canvas.width, canvas.height);
        stageOverlay.endFill();
      }
    }

    flowOverlay.clear();
    if (flowBlend > 0.001) {
      const veilAlpha = flowBlend * (0.026 + 0.03 * flowPulse);
      const edgeAlpha = flowBlend * (0.055 + 0.035 * flowPulse);
      flowOverlay.beginFill(flowMagenta, veilAlpha);
      flowOverlay.drawRect(0, 0, canvas.width, canvas.height);
      flowOverlay.endFill();

      flowOverlay.beginFill(flowCyan, edgeAlpha * 0.22);
      flowOverlay.drawRect(playX, playY, playW, 14);
      flowOverlay.drawRect(playX, playY + playH - 14, playW, 14);
      flowOverlay.drawRect(playX, playY, 14, playH);
      flowOverlay.drawRect(playX + playW - 14, playY, 14, playH);
      flowOverlay.endFill();
    }

    dangerOverlay.clear();
    if (nearDeath) {
      const pulse = 0.5 + 0.5 * Math.sin(now * 0.005);

      dangerOverlay.lineStyle(2, 0xff2200, 0.45 + 0.35 * pulse);
      dangerOverlay.drawRect(playX, playY, playW, playH);
      dangerOverlay.lineStyle(0);
    }
  }

  function init() {
    if (!_isPixiReady()) {
      console.warn('[pixi-post] PixiJS not loaded - post-processing disabled.');
      return;
    }

    app = new PIXI.Application({
      width: canvas.width,
      height: canvas.height,
      backgroundColor: 0x000000,
      antialias: false,
      resolution: _getRendererResolution(),
      autoDensity: true,
    });
    app.ticker.stop();

    app.view.id = 'pixi-canvas';
    document.body.insertBefore(app.view, canvas);

    baseTexture = PIXI.BaseTexture.from(canvas);
    glowTexture = new PIXI.Texture(baseTexture);
    canvasGlowSprite = new PIXI.Sprite(glowTexture);
    canvasSprite = new PIXI.Sprite(new PIXI.Texture(baseTexture));
    canvasGlowSprite.width = canvas.width;
    canvasGlowSprite.height = canvas.height;
    canvasSprite.width = canvas.width;
    canvasSprite.height = canvas.height;
    canvasGlowSprite.blendMode = PIXI.BLEND_MODES.SCREEN;
    canvasGlowSprite.alpha = 0.13;

    contentRoot = new PIXI.Container();
    bgRoot = new PIXI.Container();
    bgLayer = new PIXI.Container();
    worldRoot = new PIXI.Container();
    particleLayer = new PIXI.Container();
    entityLayer = new PIXI.Container();
    playerLayer = new PIXI.Container();
    fxLayer = new PIXI.Container();
    hudLayer = new PIXI.Container();
    playMask = new PIXI.Graphics();
    overlayRoot = new PIXI.Container();
    stageOverlay = new PIXI.Graphics();
    flowOverlay = new PIXI.Graphics();
    dangerOverlay = new PIXI.Graphics();
    titleGlowLayer = new PIXI.Container();
    transitionLayer = new PIXI.Container();
    transitionOverlay = new PIXI.Graphics();

    bgRoot.addChild(bgLayer);
    worldRoot.addChild(particleLayer, entityLayer, playerLayer);
    overlayRoot.addChild(stageOverlay, flowOverlay, dangerOverlay);
    contentRoot.addChild(bgRoot, canvasGlowSprite, canvasSprite, worldRoot, fxLayer, overlayRoot, playMask);

    titleWordmark = new PIXI.Text('Techno Drone', {
      fontFamily: '"cc-running-with-scissors-up", "anatol-mn", monospace',
      fontSize: 96,
      fill: '#f3e9ff',
      letterSpacing: 8,
      align: 'center',
    });
    titleWordmark.anchor.set(0.5, 0.5);
    titleWordmark.tint = 0xd8c0ff;
    titleGlowLayer.addChild(titleWordmark);
    titleBloomFilter = _createTitleBloomFilter();
    if (titleBloomFilter) {
      titleGlowLayer.filters = [titleBloomFilter];
    }
    titleGlowLayer.visible = false;
    titleGlowLayer.renderable = false;
    _syncTitleWordmarkLayout();

    transitionLayer.addChild(transitionOverlay);
    transitionLayer.visible = false;
    transitionLayer.renderable = false;

    // ---- Pause overlay (native PixiJS) ----
    pauseBlurFilter = typeof PIXI.BlurFilter === 'function'
      ? new PIXI.BlurFilter(12, 4)
      : null;
    if (pauseBlurFilter) pauseBlurFilter.repeatEdgePixels = true;

    pauseLayer = new PIXI.Container();
    pauseLayer.visible = false;
    pauseLayer.renderable = false;

    pauseBgGraphics = new PIXI.Graphics();
    pauseLayer.addChild(pauseBgGraphics);

    pauseSelHighlightGfx = new PIXI.Graphics();
    pauseLayer.addChild(pauseSelHighlightGfx);

    const _pauseFont = '"manifold-extd-cf", "Eurostile Extended", "Eurostile Extended #2", "Microgramma D Extended", monospace';
    pauseHeaderText = new PIXI.Text('PAUSED', {
      fontFamily: _pauseFont,
      fontSize: 34,
      fontWeight: 'bold',
      fill: '#31afd4',
      letterSpacing: 4,
    });
    pauseHeaderText.anchor.set(0.5, 0.5);
    pauseLayer.addChild(pauseHeaderText);

    pauseSubtitleText = new PIXI.Text('SYSTEM HOLD // SESSION FROZEN', {
      fontFamily: _pauseFont,
      fontSize: 11,
      fill: '#f3f0ff',
      letterSpacing: 2,
    });
    pauseSubtitleText.anchor.set(0.5, 0.5);
    pauseSubtitleText.alpha = 0.32;
    pauseLayer.addChild(pauseSubtitleText);

    pauseDividerGfx = new PIXI.Graphics();
    pauseLayer.addChild(pauseDividerGfx);

    ['RESUME', 'MUSIC VOL', 'SFX', 'HOME'].forEach(() => {
      const text = new PIXI.Text('', {
        fontFamily: _pauseFont,
        fontSize: 21,
        fontWeight: 'normal',
        fill: '#31afd4',
        letterSpacing: 2,
      });
      text.anchor.set(0.5, 0.5);
      text.alpha = 0.62;
      pauseItemTexts.push(text);
      pauseItemGlowFilters.push(null);
      pauseLayer.addChild(text);
    });

    if (typeof PIXI.filters !== 'undefined' && typeof PIXI.filters.AdvancedBloomFilter === 'function') {
      const pauseBloom = new PIXI.filters.AdvancedBloomFilter({
        bloomScale: 0.9,
        blur: 8,
        brightness: 1.0,
        threshold: 0.3,
        quality: 3,
      });
      pauseBloom.padding = 24;
      pauseLayer.filters = [pauseBloom];
    }
    _syncPauseMenuLayout();

    app.stage.addChild(contentRoot, titleGlowLayer, pauseLayer, hudLayer, transitionLayer);

    bgRoot.mask = playMask;
    canvasGlowSprite.mask = playMask;
    worldRoot.mask = playMask;
    playMask.renderable = false;

    colorFilter = new PIXI.ColorMatrixFilter();
    glowFilter = typeof PIXI.BlurFilter === 'function'
      ? new PIXI.BlurFilter(2, 1)
      : null;
    if (glowFilter) {
      glowFilter.repeatEdgePixels = true;
      canvasGlowSprite.filters = [glowFilter];
    }
    caFilter = new PIXI.filters.RGBSplitFilter([0, 0], [0, 0], [0, 0]);
    glitchFilter = _createGlitchFilter();
    pixelateFilter = _createPixelateFilter();
    _setContentFilters([]);
    _rebuildColorGrade();
    _rebuildPlayMask();
    _rebuildOverlayPass();

    ready = true;
    _applyNativeLayerVisibility();
  }

  function resize() {
    if (!ready) return;
    app.renderer.resolution = _getRendererResolution();
    app.renderer.resize(canvas.width, canvas.height);
    canvasGlowSprite.width = canvas.width;
    canvasGlowSprite.height = canvas.height;
    canvasSprite.width = canvas.width;
    canvasSprite.height = canvas.height;
    baseTexture.setSize(canvas.width, canvas.height);
    _syncTitleWordmarkLayout();
    _syncPauseMenuLayout();
    _rebuildPlayMask();
    _rebuildOverlayPass();
  }

  function triggerHit() {
    if (!ready) return;
    caIntensity = 4.5;
  }

  function triggerDeath() {
    if (!ready) return;
    deathBurstActive = true;
    deathBurstStart = performance.now();
    caIntensity = 18;
    _setPixelateSize(1);
  }

  function triggerShake(intensity) {
    if (!ready) return;
    shakeIntensity = intensity;
  }

  function setFlowState(active) {
    if (!ready) return;
    flowTarget = active ? 1 : 0;
  }

  function setStage(n) {
    if (!ready) return;
    stageLevel = typeof n === 'number' ? n : stageLevel;
  }

  function setNearDeath(active) {
    if (!ready) return;
    nearDeath = !!active;
  }

  function setTitleWordmark(visible) {
    if (!ready || !titleGlowLayer) return;
    titleGlowLayer.visible = false;
    titleGlowLayer.renderable = false;
  }

  function isTitleWordmarkActive() {
    return false;
  }

  function setPaused(active) {
    if (!ready) return;
    pauseActive = !!active;
    if (pauseLayer) {
      pauseLayer.visible = pauseActive;
      pauseLayer.renderable = pauseActive;
    }
    _rebuildColorGrade();
  }

  function updatePauseMenu(sel, labels) {
    if (!ready || !pauseActive || !pauseLayer || !pauseSelHighlightGfx) return;
    const cx = canvas.width / 2;
    pauseSelHighlightGfx.clear();

    pauseItemTexts.forEach((text, i) => {
      const label = (labels && labels[i] != null) ? labels[i] : text.text;
      const isSel = i === sel;
      text.text = label;
      text.style.fontWeight = isSel ? 'bold' : 'normal';
      text.style.fill = isSel ? '#ffffff' : '#31afd4';
      text.alpha = isSel ? 1.0 : 0.62;

      if (isSel) {
        const chipW = 320, chipH = 34;
        const chipX = cx - chipW / 2;
        const chipY = text.y - chipH / 2;
        pauseSelHighlightGfx.beginFill(0x000840, 0.38);
        pauseSelHighlightGfx.drawRoundedRect(chipX, chipY, chipW, chipH, 10);
        pauseSelHighlightGfx.endFill();
        pauseSelHighlightGfx.lineStyle(1.2, 0x31afd4, 0.85);
        pauseSelHighlightGfx.drawRoundedRect(chipX, chipY, chipW, chipH, 10);
        pauseSelHighlightGfx.lineStyle(0);
      }
    });
  }

  function startTransition(type, onMidpoint, onComplete) {
    return _startTransitionState(type, onMidpoint, onComplete);
  }

  function setNativeLayerEnabled(layerName, enabled) {
    if (!(layerName in nativeLayerFlags)) return;
    nativeLayerFlags[layerName] = !!enabled;
    _applyNativeLayerVisibility();
  }

  function isNativeLayerEnabled(layerName) {
    return !!nativeLayerFlags[layerName];
  }

  function render() {
    if (!ready) return;

    caIntensity *= 0.82;
    if (caIntensity < 0.05) caIntensity = 0;

    const now = performance.now();

    const extraFilters = [];
    if (activeTransition) {
      _updateTransitionRender(now, extraFilters);
    }
    if (deathBurstActive) {
      _updateDeathBurst(now, extraFilters);
    }
    _setContentFilters(extraFilters);

    const ca = caIntensity;
    caFilter.red = [-ca, 0];
    caFilter.blue = [ca, ca * 0.3];

    if (shakeIntensity > 0.1) {
      contentRoot.x = (Math.random() - 0.5) * 2 * shakeIntensity;
      contentRoot.y = (Math.random() - 0.5) * 2 * shakeIntensity;
    } else {
      contentRoot.x = 0;
      contentRoot.y = 0;
    }
    shakeIntensity = 0;

    flowBlend += (flowTarget - flowBlend) * 0.06;
    if (Math.abs(flowTarget - flowBlend) < 0.005) flowBlend = flowTarget;
    _rebuildColorGrade();
    _rebuildOverlayPass();

    if (canvasGlowSprite) {
      canvasGlowSprite.alpha = 0.13 + 0.04 * flowBlend + 0.014 * Math.min(1, (stageLevel - 1) / 9) + 0.01 * Math.min(1, caIntensity / 5);
    }

    baseTexture.update();
    app.renderer.render(app.stage);
  }

  function getBgLayer() {
    return nativeLayerFlags.bg ? bgLayer : null;
  }

  function getParticleLayer() {
    return nativeLayerFlags.particles ? particleLayer : null;
  }

  function getEntityLayer() {
    return nativeLayerFlags.entities ? entityLayer : null;
  }

  function getPlayerLayer() {
    return nativeLayerFlags.player ? playerLayer : null;
  }

  function getFxLayer() {
    return nativeLayerFlags.fx ? fxLayer : null;
  }

  function getHudLayer() {
    return nativeLayerFlags.hud ? hudLayer : null;
  }

  return {
    hexToInt,
    init,
    resize,
    render,
    triggerHit,
    triggerDeath,
    triggerShake,
    setFlowState,
    setStage,
    setNearDeath,
    setTitleWordmark,
    isTitleWordmarkActive,
    setPaused,
    updatePauseMenu,
    startTransition,
    setNativeLayerEnabled,
    isNativeLayerEnabled,
    getBgLayer,
    getParticleLayer,
    getEntityLayer,
    getPlayerLayer,
    getFxLayer,
    getHudLayer,
  };
})();

pixiPost.init();
