const SUPABASE_URL = 'https://zrcqrsvwquycxpdnygfl.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_d6LNSH712skiZNybEooYdQ_rpW3E2nJ';
const DEFAULT_COLOR_BG = '#050505';
const COLOR_BLUE = '#004fff';
const COLOR_CYAN = '#31afd4';
const COLOR_CRIMSON = '#902d41';
const COLOR_PINK = '#ff007f';
const LB_COLORS = ['#004fff', '#31afd4', '#ff007f', '#cc44ff', '#ffffff'];
const STAGE_DURATION = 30000;
const STAGE_BG_COLORS = [
  '#000000', '#000000', '#000000', '#000000', '#000000',
  '#000000', '#000000', '#000000', '#000000', '#000000',
];
const STAGE_ENEMY_COLORS = [
  '#a0c4ff',  // 1 - periwinkle (intro)
  '#31afd4',  // 2 - cyan
  '#7b2fff',  // 3 - deep violet
  '#ffd400',  // 4 - gold
  '#6ea8ff',  // 5 - electric periwinkle
  '#00e5c4',  // 6 - teal
  '#cc44ff',  // 7 - purple
  '#00ff9f',  // 8 - neon mint
  '#e040fb',  // 9 - magenta
  '#ffffff',  // 10 - white (finale)
];
const STAGE_ELITE_COLORS = [
  '#cc1a2a', '#cc1a2a', '#cc1a2a', '#cc1a2a', '#cc1a2a',
  '#cc1a2a', '#cc1a2a', '#cc1a2a', '#cc1a2a', '#cc1a2a',
];
const EASY_POOL = ['debris', 'kamikazes', 'bombers', 'pickups'];
const HARD_POOL = ['snipers', 'shielded'];
const HARDEST_POOL = [];
const STAGE_CONFIG = [
  { speed: 170, maxEnemies: 14, spawnInterval: 420, homingChance: 0.65, eliteChance: 0.06, kamikazeInterval: 0,    turretInterval: 0,    multiEdge: false },
  { speed: 140, maxEnemies: 14, spawnInterval: 500, homingChance: 0.60, eliteChance: 0.15, kamikazeInterval: 0,    turretInterval: 2500, multiEdge: false },
  { speed: 170, maxEnemies: 16, spawnInterval: 450, homingChance: 0.65, eliteChance: 0.15, kamikazeInterval: 3500, turretInterval: 6000, multiEdge: false },
  { speed: 200, maxEnemies: 20, spawnInterval: 300, homingChance: 0.70, eliteChance: 0.20, kamikazeInterval: 3000, turretInterval: 5000, shieldDroneInterval: 8000, multiEdge: false },
  { speed: 230, maxEnemies: 20, spawnInterval: 380, homingChance: 0.70, eliteChance: 0.30, kamikazeInterval: 0,    turretInterval: 7000, multiEdge: false },
  { speed: 210, maxEnemies: 16, spawnInterval: 440, homingChance: 0.55, eliteChance: 0.20, kamikazeInterval: 2800, turretInterval: 5000, multiEdge: true  },
  { speed: 268, maxEnemies: 16, spawnInterval: 520, homingChance: 0.60, eliteChance: 0.12, kamikazeInterval: 0,    turretInterval: 5600, multiEdge: true  },
  { speed: 310, maxEnemies: 20, spawnInterval: 380, homingChance: 0.70, eliteChance: 0.15, kamikazeInterval: 1800, turretInterval: 4000, multiEdge: true  },
  { speed: 340, maxEnemies: 20, spawnInterval: 360, homingChance: 0.70, eliteChance: 0.20, kamikazeInterval: 2500, turretInterval: 4000, multiEdge: true  },
  { speed: 370, maxEnemies: 24, spawnInterval: 320, homingChance: 0.75, eliteChance: 0.25, kamikazeInterval: 2000, turretInterval: 3500, multiEdge: true  },
];
const MECHANIC_ASSIGNMENT = {
  1:  [],
  2:  [],
  3:  ['kamikazes'],
  4:  ['shieldDrones', 'kamikazes'],
  5:  ['snipers'],
  6:  ['snipers', 'kamikazes'],
  7:  ['snipers', 'shielded'],
  8:  ['snipers', 'shielded', 'kamikazes'],
  9:  ['snipers', 'shielded', 'kamikazes'],
  10: ['snipers', 'shielded', 'kamikazes'],
};
const BULLET_SPEED = 900;
const ALT_FIRE_TYPES = ['spread', 'bass'];
const ALT_FIRE_LABELS = { spread: 'SPREAD', bass: 'BASS PULSE' };
const DEATH_TAUNTS = ['unlucky', 'skill diff', 'are you even trying', 'u suck'];
const PAUSE_ITEMS = ['RESUME', 'MUSIC VOL', 'SFX', 'HOME'];
