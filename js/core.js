function loadSave(storage = localStorage) {
  const defaults = { highScore: 0, runs: [] };
  try {
    const raw = storage.getItem('drone_save');
    if (raw) return Object.assign(defaults, JSON.parse(raw));
  } catch (error) {}
  return defaults;
}

function persistSave(save, storage = localStorage) {
  try {
    storage.setItem('drone_save', JSON.stringify({
      highScore: save.highScore,
      runs: save.runs,
    }));
  } catch (error) {}
}

function _emptyAnalytics() {
  return {
    totalRuns: 0,
    totalScore: 0,
    totalKills: 0,
    completions: 0,
    stageReachCounts: Array(10).fill(0),
    deathStageCounts: Array(10).fill(0),
    lastRun: null,
  };
}

function _normalizeAnalytics(raw) {
  const analytics = Object.assign(_emptyAnalytics(), raw || {});
  analytics.totalRuns = Math.max(0, Math.floor(Number(analytics.totalRuns) || 0));
  analytics.totalScore = Math.max(0, Math.floor(Number(analytics.totalScore) || 0));
  analytics.totalKills = Math.max(0, Math.floor(Number(analytics.totalKills) || 0));
  analytics.completions = Math.max(0, Math.floor(Number(analytics.completions) || 0));
  analytics.stageReachCounts = Array.from({ length: 10 }, (_, i) =>
    Math.max(0, Math.floor(Number(analytics.stageReachCounts?.[i]) || 0))
  );
  analytics.deathStageCounts = Array.from({ length: 10 }, (_, i) =>
    Math.max(0, Math.floor(Number(analytics.deathStageCounts?.[i]) || 0))
  );
  return analytics;
}

function loadAnalytics(storage = localStorage) {
  try {
    const raw = storage.getItem('drone_analytics');
    if (raw) return _normalizeAnalytics(JSON.parse(raw));
  } catch (error) {}
  return _emptyAnalytics();
}

function persistAnalytics(analytics, storage = localStorage) {
  try {
    storage.setItem('drone_analytics', JSON.stringify(_normalizeAnalytics(analytics)));
  } catch (error) {}
}

function loadFurthestStage(storage = localStorage) {
  try {
    return parseInt(storage.getItem('drone_furthest') || '1', 10) || 1;
  } catch (error) {
    return 1;
  }
}

function writeFurthestStage(stageNumber, storage = localStorage) {
  try {
    storage.setItem('drone_furthest', String(stageNumber));
  } catch (error) {}
}

function loadPlayerName(storage = localStorage) {
  try {
    return storage.getItem('drone_player_name') || '';
  } catch (error) {
    return '';
  }
}

function writePlayerName(name, storage = localStorage) {
  try {
    storage.setItem('drone_player_name', name);
  } catch (error) {}
}

let COLOR_BG = DEFAULT_COLOR_BG;

const canvas = document.getElementById('gameCanvas');
const ctx    = canvas.getContext('2d');

// Play area (portrait game zone) and HUD panel dimensions, computed in resize()
let PLAY_W, PLAY_H, PLAY_X, PLAY_Y;
let PANEL_X, PANEL_Y, PANEL_W, PANEL_H;

function resize() {
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;

  // Play area: height-driven, 9:8 aspect ratio (2x the original 9:16 width), centered
  PLAY_H = Math.min(canvas.height * 0.92, 900);
  PLAY_W = Math.round(PLAY_H * (9 / 8));
  PLAY_X = Math.round((canvas.width - PLAY_W) / 2);
  PLAY_Y = Math.round((canvas.height - PLAY_H) / 2);

  // HUD panel fills the space to the right of the play area
  PANEL_X = PLAY_X + PLAY_W + 20;
  PANEL_Y = PLAY_Y;
  PANEL_W = canvas.width - PANEL_X - 20;
  PANEL_H = PLAY_H;

  if (typeof pixiPost !== 'undefined') pixiPost.resize();
}

window.addEventListener('resize', resize);
resize();

function setGlow(color, intensity = 15) {
  ctx.shadowColor = color;
  ctx.shadowBlur  = intensity;
}

function clearGlow() {
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur  = 0;
}

const keys        = {};
const justPressed = {};
let mouseDown     = false;
let mouseRightDown = false;
let mouseX        = 0;
let mouseY        = 0;
let mouseMoved    = false;

window.addEventListener('keydown', e => {
  if (!keys[e.key]) justPressed[e.key] = true;
  keys[e.key] = true;
  if (typeof audio !== 'undefined') audio.init();
});

window.addEventListener('keyup', e => {
  keys[e.key] = false;
  if (e.key.length === 1) {
    keys[e.key.toUpperCase()] = false;
    keys[e.key.toLowerCase()] = false;
  }
});
function resetInputState() {
  for (const key in keys) delete keys[key];
  for (const key in justPressed) delete justPressed[key];
  mouseDown = false;
  mouseRightDown = false;
}

window.addEventListener('blur', resetInputState);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) resetInputState();
});

canvas.addEventListener('mousedown', e => {
  if (e.button === 0) mouseDown = true;
  if (e.button === 2) mouseRightDown = true;
  mouseX = e.offsetX;
  mouseY = e.offsetY;
  if (typeof audio !== 'undefined') audio.init();
});
canvas.addEventListener('mousemove', e => {
  mouseX = e.offsetX;
  mouseY = e.offsetY;
  mouseMoved = true;
});
canvas.addEventListener('contextmenu', e => e.preventDefault());
window.addEventListener('mouseup', e => {
  if (e.button === 0) mouseDown = false;
  if (e.button === 2) mouseRightDown = false;
});

function writeSave() {
  persistSave(save);
}

function recordRunResult(score, kills, stageReached = null, completed = false) {
  const reached = Math.max(1, Math.min(10, Math.floor(Number(
    stageReached ?? (typeof stage !== 'undefined' ? stage.current : 1)
  ) || 1)));
  const run = {
    score: Math.max(0, Math.floor(Number(score) || 0)),
    kills: Math.max(0, Math.floor(Number(kills) || 0)),
    stageReached: reached,
    completed: !!completed,
    endedAt: new Date().toISOString(),
  };

  if (run.score > save.highScore) save.highScore = run.score;
  save.runs.push(run);
  if (save.runs.length > 10) save.runs.shift();

  analytics.totalRuns++;
  analytics.totalScore += run.score;
  analytics.totalKills += run.kills;
  analytics.stageReachCounts[reached - 1]++;
  if (run.completed) analytics.completions++;
  else analytics.deathStageCounts[reached - 1]++;
  analytics.lastRun = run;

  writeSave();
  persistAnalytics(analytics);
}

const save = loadSave();
const analytics = loadAnalytics();
let furthestStage = loadFurthestStage();

let gameState               = 'title';
let titleGridOff            = 0;
let titleSelection          = 0;
let titleSelectionChangedAt = 0;
let titleIntroT             = 0;     // 0–1 progress through chromatic split intro
let titleIntroLive          = true;  // true on first load so intro plays immediately
let titleSnapFired          = false; // one-shot bloom burst flag
let titleSnapDecay          = 0;     // bloom burst decay (1→0)
let titleScanBeamPos        = 0;     // 0–1 normalized scan beam position
let endScreenSelection      = 0;
let endScreenSelectionChangedAt = 0;

let frameNow = performance.now();

function getNow() {
  return frameNow;
}
