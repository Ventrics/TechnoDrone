const SAVE_KEY = 'drone_save';
const STAGE_KEY = 'drone_furthest';
const PLAYER_NAME_KEY = 'drone_player_name';

export function loadSave(storage = localStorage) {
  const defaults = { highScore: 0, runs: [] };
  try {
    const raw = storage.getItem(SAVE_KEY);
    if (raw) return Object.assign(defaults, JSON.parse(raw));
  } catch (error) {}
  return defaults;
}

export function writeSave(save, storage = localStorage) {
  try {
    storage.setItem(SAVE_KEY, JSON.stringify({
      highScore: save.highScore,
      runs: save.runs,
    }));
  } catch (error) {}
}

export function loadFurthestStage(storage = localStorage) {
  try {
    return parseInt(storage.getItem(STAGE_KEY) || '1', 10) || 1;
  } catch (error) {
    return 1;
  }
}

export function writeFurthestStage(stageNumber, storage = localStorage) {
  try {
    storage.setItem(STAGE_KEY, String(stageNumber));
  } catch (error) {}
}

export function loadPlayerName(storage = localStorage) {
  try {
    return storage.getItem(PLAYER_NAME_KEY) || '';
  } catch (error) {
    return '';
  }
}

export function writePlayerName(name, storage = localStorage) {
  try {
    storage.setItem(PLAYER_NAME_KEY, name);
  } catch (error) {}
}
