// js/testing/configOverride.js — loads tests/configs/<name>.json and mutates live tuning knobs before first frame.
(function () {
  if (window.__TD_BOT_MODE__ !== true) return;

  var params = new URLSearchParams(location.search);
  var name = params.get('config') || 'baseline';

  window.__TD_CONFIG__ = {
    name: name,
    loaded: false,
    applied: false,
    overrides: null,
    error: null,
    apply: function () { applyOverrides(); },
  };

  var overrides = null;

  // ─── Load ───────────────────────────────────────────────────────────────
  // Try fetch first; fall back to XHR for browsers that reject fetch on file://.
  function loadConfig(cb) {
    var url = 'tests/configs/' + name + '.json';

    function handleText(text) {
      try {
        overrides = JSON.parse(text);
        window.__TD_CONFIG__.loaded = true;
        window.__TD_CONFIG__.overrides = overrides;
        cb(null);
      } catch (e) {
        cb(e);
      }
    }

    function tryXhr() {
      try {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);
        xhr.onload = function () {
          if (xhr.status === 200 || xhr.status === 0) handleText(xhr.responseText);
          else cb(new Error('XHR ' + xhr.status + ' for ' + url));
        };
        xhr.onerror = function () { cb(new Error('XHR error for ' + url)); };
        xhr.send();
      } catch (e) {
        cb(e);
      }
    }

    if (typeof fetch === 'function') {
      fetch(url).then(function (r) {
        if (!r.ok) throw new Error('fetch ' + r.status);
        return r.text();
      }).then(handleText).catch(function () {
        // fetch on file:// often rejects — fall back
        tryXhr();
      });
    } else {
      tryXhr();
    }
  }

  // ─── Apply ──────────────────────────────────────────────────────────────
  function applyOverrides() {
    if (!overrides) {
      console.warn('[configOverride] no overrides loaded, skipping apply');
      return;
    }
    if (window.__TD_CONFIG__.applied) return;

    var applied = { stageConfig: [], player: {}, dash: {}, flowState: {}, enemyHp: {} };

    // 1) STAGE_CONFIG — array of 10 dicts, indexed by stage-1.
    //    Override entries have a `stage` field (1-based) + any keys to merge.
    if (Array.isArray(overrides.stageConfig) && typeof STAGE_CONFIG !== 'undefined') {
      overrides.stageConfig.forEach(function (entry) {
        if (!entry || typeof entry.stage !== 'number') return;
        var idx = entry.stage - 1;
        if (idx < 0 || idx >= STAGE_CONFIG.length) return;
        var target = STAGE_CONFIG[idx];
        var changes = {};
        Object.keys(entry).forEach(function (k) {
          if (k === 'stage') return;
          target[k] = entry[k];   // mutate in place so game code sees it
          changes[k] = entry[k];
        });
        applied.stageConfig.push({ stage: entry.stage, changes: changes });
      });
    }

    // 2) player object — heat constants, flow duration, etc.
    if (overrides.player && typeof player !== 'undefined') {
      Object.keys(overrides.player).forEach(function (k) {
        player[k] = overrides.player[k];
        applied.player[k] = overrides.player[k];
      });
    }

    // 3) dash object — COOLDOWN_MS, COOLDOWN_OFFENSIVE, DURATION_MS, HEAT_REFUND, SPEED
    if (overrides.dash && typeof dash !== 'undefined') {
      Object.keys(overrides.dash).forEach(function (k) {
        dash[k] = overrides.dash[k];
        applied.dash[k] = overrides.dash[k];
      });
    }

    // 4) flowState — map into player.FLOW_STATE_* fields
    if (overrides.flowState && typeof player !== 'undefined') {
      Object.keys(overrides.flowState).forEach(function (k) {
        player[k] = overrides.flowState[k];
        applied.flowState[k] = overrides.flowState[k];
      });
    }

    // 5) enemyHp — best-effort hook. turretHp maps into TURRET_HP array if it
    //    exists; baseFormula is informational (game uses inline formula).
    if (overrides.enemyHp) {
      if (typeof overrides.enemyHp.turretHp === 'number') {
        if (typeof window.TURRET_HP !== 'undefined' && Array.isArray(window.TURRET_HP)) {
          for (var i = 0; i < window.TURRET_HP.length; i++) window.TURRET_HP[i] = overrides.enemyHp.turretHp;
        }
        applied.enemyHp.turretHp = overrides.enemyHp.turretHp;
      }
      if (typeof overrides.enemyHp.kamikazeHp === 'number' &&
          typeof window.KAMIKAZE_HP !== 'undefined' && Array.isArray(window.KAMIKAZE_HP)) {
        for (var j = 0; j < window.KAMIKAZE_HP.length; j++) window.KAMIKAZE_HP[j] = overrides.enemyHp.kamikazeHp;
        applied.enemyHp.kamikazeHp = overrides.enemyHp.kamikazeHp;
      }
    }

    window.__TD_CONFIG__.applied = true;
    window.__TD_CONFIG__.appliedDetail = applied;
    console.log('[configOverride] applied config "' + (overrides.name || name) + '":', applied);
  }

  // ─── Bootstrap ──────────────────────────────────────────────────────────
  // Kick off the load immediately so the JSON is parsed by the time the clock
  // fires onBeforeFirstFrame. If fetch hasn't resolved yet we still apply in
  // the hook (async microtasks get a chance to settle via simClock's pump()).
  loadConfig(function (err) {
    if (err) {
      window.__TD_CONFIG__.error = String(err && err.message || err);
      console.error('[configOverride] load failed for "' + name + '":', err);
    }
  });

  if (window.__TD_CLOCK__ && typeof window.__TD_CLOCK__.onBeforeFirstFrame === 'function') {
    window.__TD_CLOCK__.onBeforeFirstFrame(function () {
      // If load hasn't finished yet, give microtasks one chance to settle.
      if (!overrides) {
        // Synchronous XHR fallback — blocking but only runs on pre-first-frame
        // in bot mode, so it's acceptable.
        try {
          var xhr = new XMLHttpRequest();
          xhr.open('GET', 'tests/configs/' + name + '.json', false);
          xhr.send();
          if (xhr.status === 200 || xhr.status === 0) {
            overrides = JSON.parse(xhr.responseText);
            window.__TD_CONFIG__.loaded = true;
            window.__TD_CONFIG__.overrides = overrides;
          }
        } catch (e) {
          console.error('[configOverride] sync XHR fallback failed:', e);
        }
      }
      applyOverrides();
    });
  } else {
    console.warn('[configOverride] __TD_CLOCK__ missing — overrides will not apply');
  }
})();
