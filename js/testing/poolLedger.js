// js/testing/poolLedger.js — silent-removal detector for shards.pool.
// Loaded only in bot mode. Each frame, diffs shards.pool against the previous
// frame; any entity that left without a markRemoved() reason records a violation.
(function () {
  if (window.__TD_BOT_MODE__ !== true) return;
  if (!window.__TD_CLOCK__) {
    console.warn('[poolLedger] __TD_CLOCK__ missing — ledger disabled');
    return;
  }

  var SAMPLE_CAP = 25;

  function classify(e) {
    if (!e) return 'unknown';
    if (e.isFinaleEnemy) return 'finaleEnemy';
    if (e.isJackpot) return 'jackpot';
    if (e.isBonusRing) return 'bonusRing';
    if (e.isGatePiece) return 'gatePiece';
    if (e.isTurret) return 'turret';
    if (e.isShieldDrone) return 'shieldDrone';
    if (e.isKamikaze) return 'kamikaze';
    if (e.isClimaxEnemy) return 'climaxEnemy';
    if (e.isElite) return 'elite';
    return 'shard';
  }

  var ledger = {
    enabled: true,
    pendingRemovals: new Map(),
    knownPool: new Set(),
    violationsTotal: 0,
    violationsByEntityType: {},
    violationsByStage: {},
    violationsByReason: {},
    samples: [],
    SAMPLE_CAP: SAMPLE_CAP,

    markRemoved: function (entity, reason) {
      if (!entity) return;
      this.pendingRemovals.set(entity, reason || 'unknown');
    },

    recordViolation: function (entity) {
      this.violationsTotal++;
      var type = classify(entity);
      var stageNum = (typeof stage !== 'undefined' && stage && stage.current) || 0;
      this.violationsByEntityType[type] = (this.violationsByEntityType[type] || 0) + 1;
      this.violationsByStage[stageNum] = (this.violationsByStage[stageNum] || 0) + 1;
      if (this.samples.length < SAMPLE_CAP) {
        var elapsedMs = (typeof stage !== 'undefined' && stage && typeof stage.elapsedMs === 'number') ? stage.elapsedMs : 0;
        this.samples.push({
          entityType: type,
          stage: stageNum,
          elapsedMs: elapsedMs,
          x: Math.round(entity && entity.x || 0),
          y: Math.round(entity && entity.y || 0),
          wasElite: !!(entity && entity.isElite),
          wasClimaxEnemy: !!(entity && entity.isClimaxEnemy),
        });
      }
    },

    checkFrame: function () {
      if (typeof shards === 'undefined' || !shards || !shards.pool) return;
      var current = new Set(shards.pool);
      var pending = this.pendingRemovals;
      var self = this;
      this.knownPool.forEach(function (entity) {
        if (!current.has(entity) && !pending.has(entity)) {
          self.recordViolation(entity);
        }
      });
      this.knownPool = current;
      this.pendingRemovals = new Map();
    },

    snapshot: function () {
      return {
        total: this.violationsTotal,
        byEntityType: JSON.parse(JSON.stringify(this.violationsByEntityType)),
        byStage: JSON.parse(JSON.stringify(this.violationsByStage)),
        byReason: JSON.parse(JSON.stringify(this.violationsByReason)),
        samples: this.samples.slice(),
      };
    },
  };

  window.__TD_LEDGER__ = ledger;
  window.__TD_CLOCK__.onAfterFrame(function () {
    try { ledger.checkFrame(); } catch (e) { console.error('[poolLedger] checkFrame', e); }
  });
  console.log('[poolLedger] installed');
})();
