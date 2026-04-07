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
let mouseRightDown = false;
let mouseX        = 0;
let mouseY        = 0;
let mouseMoved    = false;

window.addEventListener('keydown', e => {
  if (!keys[e.key]) justPressed[e.key] = true;
  keys[e.key] = true;
  if (typeof audio !== 'undefined') audio.init();
});

window.addEventListener('keyup', e => keys[e.key] = false);
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

const save = loadSave();
if (save.highScore !== 0) {
  save.highScore = 0;
  writeSave();
}
let furthestStage = loadFurthestStage();
if (furthestStage !== 1) {
  furthestStage = 1;
  writeFurthestStage(1);
}
if (loadPlayerName()) {
  writePlayerName('');
}

let gameState               = 'title';
let titleGridOff            = 0;
let titleSelection          = 0;
let titleSelectionChangedAt = 0;
let endScreenSelection      = 0;
let endScreenSelectionChangedAt = 0;

let frameNow = performance.now();

function getNow() {
  return frameNow;
}
