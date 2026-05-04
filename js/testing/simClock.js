// js/testing/simClock.js — fixed-timestep sim clock + hook registry for headless playtests.
(function () {
  if (window.__TD_BOT_MODE__ !== true) return;

  var params = new URLSearchParams(location.search);
  var speed = parseInt(params.get('speed'), 10);
  if (!isFinite(speed) || isNaN(speed)) speed = 10;
  speed = Math.max(1, Math.min(50, speed));

  var STEP_MS = 1000 / 60; // 16.666...
  var simTimeMs = 0;
  var ticks = 0;
  var pendingCallback = null;
  var running = false;
  var stopped = false;
  var firstFrameFired = false;

  var hooks = {
    beforeFirst: [],
    frame: [],
    afterFrame: []
  };

  function addHook(list) {
    return function (fn) {
      if (typeof fn === 'function') list.push(fn);
    };
  }

  function runHooks(list) {
    for (var i = 0; i < list.length; i++) {
      try { list[i](); } catch (e) { console.error('[simClock] hook error:', e); }
    }
  }

  // Patch performance.now so any ms-based reads advance in sim time, not wall time.
  // game.js sets frameNow = timestamp each loop, so gameplay already uses sim time;
  // this patch catches any stray reads (pixi-post effects, etc.).
  var _realPerfNow = performance.now.bind(performance);
  var _realDateNow = Date.now.bind(Date);
  performance.now = function () { return simTimeMs; };
  // Leave Date.now alone: timestamps in saves should stay real.

  // Capture the game's rAF callback instead of letting the browser schedule it.
  var _realRAF = window.requestAnimationFrame.bind(window);
  var _realCAF = window.cancelAnimationFrame
    ? window.cancelAnimationFrame.bind(window)
    : function () {};
  var nextRafId = 1;

  window.requestAnimationFrame = function (cb) {
    pendingCallback = cb;
    var id = nextRafId++;
    // Kick the driver once a callback is first queued.
    if (!running && !stopped) startDriver();
    return id;
  };
  window.cancelAnimationFrame = function (id) {
    pendingCallback = null;
  };

  // Watchdog: if no rAF callback arrives within ~100ms wall time, warn.
  var watchdogStart = _realPerfNow();
  var watchdogFired = false;
  function checkWatchdog() {
    if (watchdogFired || pendingCallback) return;
    if (_realPerfNow() - watchdogStart > 100) {
      watchdogFired = true;
      console.warn('[simClock] no requestAnimationFrame callback within 100ms wall clock');
    }
  }
  setTimeout(checkWatchdog, 120);

  // Render skip — wrap common render entry points to no-op.
  // game.js calls render() and pixiPost.render() inside its loop. We stub
  // pixiPost.render after first frame; game.render is harder to null out
  // from here because it's a script-scope function, not a window global.
  // Best-effort: if render is ever exposed on window, wrap it.
  function installRenderSkip() {
    if (typeof window.pixiPost === 'object' && window.pixiPost && typeof window.pixiPost.render === 'function') {
      window.pixiPost.render = function () {};
    }
    if (typeof window.render === 'function') {
      window.render = function () {};
    }
  }

  function tick() {
    if (stopped) return;
    if (!pendingCallback) {
      // No callback queued — could be between title-screen frames; bail and retry.
      return;
    }

    var cb = pendingCallback;
    pendingCallback = null;

    if (!firstFrameFired) {
      firstFrameFired = true;
      installRenderSkip();
      runHooks(hooks.beforeFirst);
    }

    runHooks(hooks.frame);

    try {
      cb(simTimeMs);
    } catch (e) {
      console.error('[simClock] game loop error:', e);
      stopped = true;
      return;
    }

    // Re-apply render skip in case game code reassigned it.
    installRenderSkip();

    runHooks(hooks.afterFrame);

    ticks++;
    simTimeMs += STEP_MS;
  }

  function pump() {
    if (stopped) { running = false; return; }
    for (var i = 0; i < speed; i++) {
      if (stopped) break;
      tick();
    }
    // Yield to the event loop so the page stays responsive and
    // microtasks (fetch responses, etc.) can settle.
    setTimeout(pump, 0);
  }

  function startDriver() {
    if (running || stopped) return;
    running = true;
    setTimeout(pump, 0);
  }

  window.__TD_CLOCK__ = {
    onBeforeFirstFrame: addHook(hooks.beforeFirst),
    onFrame: addHook(hooks.frame),
    onAfterFrame: addHook(hooks.afterFrame),
    step: function () { tick(); },
    stop: function () { stopped = true; running = false; },
    getTicks: function () { return ticks; },
    getSimTimeMs: function () { return simTimeMs; },
    getSpeed: function () { return speed; },
    STEP_MS: STEP_MS,
    _realPerformanceNow: _realPerfNow,
    _realDateNow: _realDateNow
  };
})();
