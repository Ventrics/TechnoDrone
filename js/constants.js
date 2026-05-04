const SUPABASE_URL = 'https://zrcqrsvwquycxpdnygfl.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_d6LNSH712skiZNybEooYdQ_rpW3E2nJ';
const DEFAULT_COLOR_BG = '#050505';
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
  '#f5f7ff',  // 1 - cool white
  '#7be3ff',  // 2 - ice cyan
  '#00e5ff',  // 3 - electric cyan
  '#2e3bf0',  // 4 - electric blue
  '#003b8e',  // 5 - deep blue
  '#6366f1',  // 6 - indigo
  '#7c3aed',  // 7 - electric purple
  '#4216d2',  // 8 - deep electric purple
  '#dd32b3',  // 9 - pink
  '#f5f7ff',  // 10 - stark final white
];
const STAGE_ELITE_COLORS = [
  '#ff1133', '#ff1133', '#ff1133', '#ff1133', '#ff1133',
  '#ff1133', '#ff1133', '#ff1133', '#ff1133', '#ff1133',
];
const STAGE_CONFIG = [
  { speed: 170, maxEnemies: 10, spawnInterval: 520, homingChance: 0.65, eliteChance: 0.10,  kamikazeInterval: 0,    turretInterval: 0,    multiEdge: false, formationInterval: 999999, formationChance: 0.0  },
  { speed: 140, maxEnemies: 14, spawnInterval: 500, homingChance: 0.60, eliteChance: 0.10,  kamikazeInterval: 0,    turretInterval: 2500, multiEdge: false, formationInterval: 999999, formationChance: 0.0  },
  { speed: 170, maxEnemies: 16, spawnInterval: 450, homingChance: 0.65, eliteChance: 0.10,  kamikazeInterval: 3500, turretInterval: 6000, multiEdge: false, formationInterval: 999999, formationChance: 0.0  },
  { speed: 200, maxEnemies: 20, spawnInterval: 300, homingChance: 0.70, eliteChance: 0.10, kamikazeInterval: 3000, turretInterval: 5000, shieldDroneInterval: 8000, multiEdge: false, formationInterval: 4000, formationChance: 1.0 },
  { speed: 230, maxEnemies: 20, spawnInterval: 380, homingChance: 0.70, eliteChance: 0.11, kamikazeInterval: 0,    turretInterval: 7000, multiEdge: false, formationInterval: 4000, formationChance: 1.0 },
  { speed: 210, maxEnemies: 16, spawnInterval: 440, homingChance: 0.55, eliteChance: 0.11, kamikazeInterval: 2800, turretInterval: 5000, multiEdge: true,  formationInterval: 3500, formationChance: 1.0 },
  { speed: 268, maxEnemies: 16, spawnInterval: 520, homingChance: 0.60, eliteChance: 0.12, kamikazeInterval: 0,    turretInterval: 5600, multiEdge: true,  formationInterval: 3500, formationChance: 1.0 },
  { speed: 310, maxEnemies: 20, spawnInterval: 380, homingChance: 0.70, eliteChance: 0.12, kamikazeInterval: 1800, turretInterval: 4000, multiEdge: true,  formationInterval: 3000, formationChance: 1.0 },
  { speed: 340, maxEnemies: 20, spawnInterval: 360, homingChance: 0.70, eliteChance: 0.13, kamikazeInterval: 2500, turretInterval: 4000, multiEdge: true,  formationInterval: 3000, formationChance: 1.0 },
  { speed: 370, maxEnemies: 24, spawnInterval: 320, homingChance: 0.75, eliteChance: 0.14, kamikazeInterval: 2000, turretInterval: 3500, multiEdge: true,  formationInterval: 2500, formationChance: 1.0 },
];
const MECHANIC_ASSIGNMENT = {
  1:  [],
  2:  [],
  3:  ['kamikazes'],
  4:  ['shieldDrones', 'kamikazes'],
  5:  [],
  6:  ['kamikazes'],
  7:  [],
  8:  ['kamikazes'],
  9:  ['kamikazes'],
  10: ['kamikazes'],
};
const BULLET_SPEED = 900;
const ELITE_SHIELD_HP = 8;
const ELITE_CORE_HP = 6;
const ELITE_SIZE_MULT = 1.6;
const LASER_DAMAGE_MULT = 2;
const ALT_FIRE_TYPES = ['laser'];
const DEATH_TAUNTS = ['unlucky', 'skill diff', 'are you even trying', 'u suck'];
const PAUSE_ITEMS = ['RESUME', 'MUSIC VOL', 'SFX', 'HOME'];
