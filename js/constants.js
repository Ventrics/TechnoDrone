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
  '#050505', '#050a1a', '#050f12', '#08051a', '#0d0514',
  '#020d1f', '#150305', '#150510', '#080808', '#000000',
];
const STAGE_ENEMY_COLORS = [
  '#ffffff', '#31afd4', '#004fff', '#ff007f', '#902d41',
  '#31afd4', '#ff007f', '#cc44ff', '#904040', '#ffffff',
];
const STAGE_ELITE_COLORS = [
  '#902d41', '#ff007f', '#902d41', '#31afd4', '#004fff',
  '#ff007f', '#31afd4', '#ff0000', '#cc44ff', '#ff007f',
];
const EASY_POOL = ['debris', 'kamikazes', 'bombers', 'pickups'];
const HARD_POOL = ['snipers', 'shielded'];
const HARDEST_POOL = ['darkness'];
const STAGE_CONFIG = [
  { speed: 170, maxEnemies: 14, spawnInterval: 420, homingChance: 0.65, eliteChance: 0.06, kamikazeInterval: 0,    multiEdge: false },
  { speed: 140, maxEnemies: 14, spawnInterval: 500, homingChance: 0.60, eliteChance: 0.15, kamikazeInterval: 0,    multiEdge: false },
  { speed: 170, maxEnemies: 16, spawnInterval: 450, homingChance: 0.65, eliteChance: 0.15, kamikazeInterval: 3500, multiEdge: false },
  { speed: 200, maxEnemies: 20, spawnInterval: 300, homingChance: 0.70, eliteChance: 0.20, kamikazeInterval: 3000, multiEdge: false },
  { speed: 230, maxEnemies: 20, spawnInterval: 380, homingChance: 0.70, eliteChance: 0.30, kamikazeInterval: 0,    multiEdge: false },
  { speed: 260, maxEnemies: 22, spawnInterval: 350, homingChance: 0.55, eliteChance: 0.20, kamikazeInterval: 1800, multiEdge: true  },
  { speed: 280, maxEnemies: 18, spawnInterval: 420, homingChance: 0.65, eliteChance: 0.15, kamikazeInterval: 0,    multiEdge: true  },
  { speed: 310, maxEnemies: 20, spawnInterval: 380, homingChance: 0.70, eliteChance: 0.15, kamikazeInterval: 0,    multiEdge: true  },
  { speed: 340, maxEnemies: 20, spawnInterval: 360, homingChance: 0.70, eliteChance: 0.20, kamikazeInterval: 2500, multiEdge: true  },
  { speed: 370, maxEnemies: 24, spawnInterval: 320, homingChance: 0.75, eliteChance: 0.25, kamikazeInterval: 2000, multiEdge: true  },
];
const MECHANIC_ASSIGNMENT = {
  1:  [],
  2:  [],
  3:  ['kamikazes'],
  4:  ['kamikazes'],
  5:  [],
  6:  ['kamikazes'],
  7:  ['snipers'],
  8:  ['snipers', 'shielded'],
  9:  ['darkness', 'kamikazes', 'snipers'],
  10: ['darkness', 'snipers', 'shielded', 'kamikazes'],
};
const BULLET_SPEED = 900;
const ALT_FIRE_TYPES = ['spread', 'flame'];
const ALT_FIRE_LABELS = { spread: 'SPREAD', flame: 'FLAME' };
const DEATH_TAUNTS = ['unlucky', 'skill diff', 'are you even trying', 'u suck'];
const GRAZE_RADIUS = 22;
const GRAZE_COOLDOWN = 150;
const PAUSE_ITEMS = ['RESUME', 'SOUND', 'HOME'];
