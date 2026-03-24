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

window.addEventListener('keydown', e => {
  if (!keys[e.key]) justPressed[e.key] = true;
  keys[e.key] = true;
});

window.addEventListener('keyup', e => keys[e.key] = false);
canvas.addEventListener('mousedown', e => { if (e.button === 0) mouseDown = true; });
window.addEventListener('mouseup',   e => { if (e.button === 0) mouseDown = false; });

function writeSave() {
  persistSave(save);
}

const save = loadSave();
let furthestStage = loadFurthestStage();

let gameState               = 'title';
let titleGridOff            = 0;
let titleSelection          = 0;
let titleSelectionChangedAt = 0;

let frameNow = performance.now();

function getNow() {
  return frameNow;
}
