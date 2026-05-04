// js/testing/seededRandom.js — seedable mulberry32 RNG, replaces Math.random when ?bot=1.
(function () {
  var params = new URLSearchParams(location.search);
  if (params.get('bot') !== '1') return;

  function parseSeed(raw) {
    var n = parseInt(raw, 10);
    if (!isFinite(n) || isNaN(n)) n = 1;
    // Force positive 32-bit integer
    return (n >>> 0) || 1;
  }

  var BOT_RNG_SALT = 0xB0715EED;

  function mixSeed(baseSeed, salt) {
    var x = (parseSeed(baseSeed) ^ salt) >>> 0;
    x = Math.imul(x ^ (x >>> 16), 0x7FEB352D);
    x = Math.imul(x ^ (x >>> 15), 0x846CA68B);
    x = (x ^ (x >>> 16)) >>> 0;
    return x || 1;
  }

  function createMulberry32(initialSeed) {
    var rngSeed = parseSeed(initialSeed);
    var state = rngSeed;

    return {
      random: function () {
        state = (state + 0x6D2B79F5) | 0;
        var t = state;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      },
      reset: function (n) {
        rngSeed = parseSeed(n);
        state = rngSeed;
      },
      getSeed: function () {
        return rngSeed;
      }
    };
  }

  var seed = parseSeed(params.get('seed'));
  var gameRng = createMulberry32(seed);
  var botRng = createMulberry32(mixSeed(seed, BOT_RNG_SALT));

  function reset(n) {
    seed = parseSeed(n);
    gameRng.reset(seed);
    botRng.reset(mixSeed(seed, BOT_RNG_SALT));
  }

  function getSeed() {
    return seed;
  }

  // Replace global Math.random with the seeded version.
  Math.random = gameRng.random;

  window.__TD_BOT_MODE__ = true;
  window.__TD_BOT_RNG__ = {
    random: botRng.random,
    reset: function (n) {
      botRng.reset(mixSeed(n == null ? seed : n, BOT_RNG_SALT));
    },
    getSeed: botRng.getSeed
  };
  window.__TD_SEED__ = {
    random: gameRng.random,
    reset: reset,
    getSeed: getSeed,
    botRandom: botRng.random,
    resetBot: window.__TD_BOT_RNG__.reset,
    getBotSeed: botRng.getSeed
  };

  // Stub fetch so leaderboard submission / score loading is a harmless no-op.
  // Returns a minimal Response-shaped object: ok=false + empty json so ui.js
  // error paths take over (sets error flags, doesn't crash).
  var _realFetch = window.fetch ? window.fetch.bind(window) : null;
  window.__TD_REAL_FETCH__ = _realFetch;
  window.fetch = function () {
    return Promise.resolve({
      ok: false,
      status: 0,
      statusText: 'bot-mode-stub',
      json: function () { return Promise.resolve([]); },
      text: function () { return Promise.resolve(''); }
    });
  };
})();
