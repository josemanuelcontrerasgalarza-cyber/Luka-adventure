'use strict';

// THE NINE WORLDS OF LUKA ADVENTURE
// Every world owns: a palette, a parallax recipe, a gravity/friction
// profile, an enemy roster, the mechanics it teaches, and its bosses.
// Adding world 10 means appending one object here — nothing else.

const LEVELS_PER_WORLD = 15;

// Level archetypes, in fixed slot order 1..15. The generator reads the
// archetype to decide what kind of geometry to build.
const ARCHETYPES = [
  'intro',        // 1  — teach the world's core idea, very forgiving
  'exploration',  // 2  — wide, branching, collectible-dense
  'vertical',     // 3  — climb a tower
  'mechanic',     // 4  — introduces the world's signature mechanic
  'speed',        // 5  — long flat runs, momentum
  'underground',  // 6  — tight corridors, low ceilings
  'special',      // 7  — the world's "element" level (water/lava/wind…)
  'precision',    // 8  — small platforms, exact jumps
  'secret',       // 9  — hides a secret exit
  'challenge',    // 10 — dense enemies, no free space
  'vehicle',      // 11 — ride/auto-scroll section
  'puzzle',       // 12 — switches, keys, doors
  'miniboss',     // 13 — mini-boss arena
  'advanced',     // 14 — everything at once
  'boss',         // 15 — world boss arena
];

const WORLDS = [
  {
    id: 1,
    name: "Luka's Meadow",
    subtitle: 'Praderas y ruinas antiguas',
    theme: 'meadow',
    difficulty: 1,
    gravityScale: 1.0,
    friction: 0.75,
    music: 'w1',
    palette: {
      sky:    ['#8FD3F4', '#C8E9F7'],
      far:    '#7FB88A',
      mid:    '#5D9E6B',
      near:   '#3F7A4F',
      ground: '#6B9B4A',
      dirt:   '#7A5230',
      plat:   '#8A6239',
      edge:   '#A8D06A',
      accent: '#FFD95E',
    },
    mechanics: ['walk', 'jump', 'stomp', 'breakable', 'moving_platform'],
    enemies:  ['walker', 'hopper', 'flyer', 'charger', 'spiker'],
    miniBoss: 'thistle',
    boss:     'stone_guardian',
    relic:    'Meadow Relic',
  },

  {
    id: 2,
    name: 'Sunset Desert',
    subtitle: 'Arena, pirámides y tormentas',
    theme: 'desert',
    difficulty: 2,
    gravityScale: 1.0,
    friction: 0.80,
    music: 'w2',
    palette: {
      sky:    ['#F6B26B', '#F9DDA4'],
      far:    '#D89A5C',
      mid:    '#C4813F',
      near:   '#A66A31',
      ground: '#D9B072',
      dirt:   '#9C7440',
      plat:   '#C69C6D',
      edge:   '#F0D9A8',
      accent: '#FF8C42',
    },
    mechanics: ['quicksand', 'sandstorm', 'crumble', 'moving_platform'],
    enemies:  ['walker', 'burrower', 'shooter', 'roller', 'armored', 'turret'],
    miniBoss: 'sand_wraith',
    boss:     'scorpion_mk2',
    relic:    'Sun Relic',
  },

  {
    id: 3,
    name: 'Crystal Caverns',
    subtitle: 'Minas profundas y cristal vivo',
    theme: 'cavern',
    difficulty: 3,
    gravityScale: 1.0,
    friction: 0.75,
    music: 'w3',
    palette: {
      sky:    ['#131B3A', '#22305C'],
      far:    '#2C3A66',
      mid:    '#3A4B7A',
      near:   '#4A5D8F',
      ground: '#4A4258',
      dirt:   '#332E42',
      plat:   '#5C5470',
      edge:   '#8FE3F0',
      accent: '#5FF3D1',
    },
    mechanics: ['minecart', 'falling_rock', 'crystal_switch', 'elevator'],
    enemies:  ['walker', 'bouncer', 'climber', 'exploder', 'bat', 'armored'],
    miniBoss: 'shard_hound',
    boss:     'crystal_golem',
    relic:    'Prism Relic',
  },

  {
    id: 4,
    name: 'Mystic Forest',
    subtitle: 'Niebla, hongos y espíritus',
    theme: 'forest',
    difficulty: 4,
    gravityScale: 0.95,
    friction: 0.75,
    music: 'w4',
    palette: {
      sky:    ['#16281F', '#284A38'],
      far:    '#1E3A2C',
      mid:    '#2A5140',
      near:   '#376954',
      ground: '#3B5E42',
      dirt:   '#2A3E2E',
      plat:   '#6B4E3D',
      edge:   '#9AE6A0',
      accent: '#C77DFF',
    },
    mechanics: ['phase_platform', 'fog', 'vine', 'illusion'],
    enemies:  ['ghost', 'chaser', 'teleporter', 'splitter', 'flyer', 'spiker'],
    miniBoss: 'moss_stalker',
    boss:     'ancient_bloom',
    relic:    'Verdant Relic',
  },

  {
    id: 5,
    name: 'Frozen Kingdom',
    subtitle: 'Glaciares y avalanchas',
    theme: 'frozen',
    difficulty: 5,
    gravityScale: 1.0,
    friction: 0.955,          // ice — very low friction
    music: 'w5',
    palette: {
      sky:    ['#A8D8F0', '#DCEFFA'],
      far:    '#8FBCD9',
      mid:    '#6E9EC4',
      near:   '#4E7FA8',
      ground: '#CFE8F5',
      dirt:   '#8FA9BD',
      plat:   '#B4DCEE',
      edge:   '#FFFFFF',
      accent: '#5FC8F5',
    },
    mechanics: ['ice_floor', 'brittle_ice', 'avalanche', 'freeze_water'],
    enemies:  ['roller', 'walker', 'shielder', 'jumper', 'shooter', 'bouncer'],
    miniBoss: 'frost_fang',
    boss:     'ice_titan',
    relic:    'Glacier Relic',
  },

  {
    id: 6,
    name: 'Sky Ruins',
    subtitle: 'Islas flotantes y viento',
    theme: 'sky',
    difficulty: 6,
    gravityScale: 0.78,
    friction: 0.78,
    music: 'w6',
    palette: {
      sky:    ['#6FA8DC', '#BFD9F2'],
      far:    '#9FC4E8',
      mid:    '#7FA8CE',
      near:   '#5F87AE',
      ground: '#D6D2C4',
      dirt:   '#A8A292',
      plat:   '#E2DCCB',
      edge:   '#FFF6D8',
      accent: '#FFE066',
    },
    mechanics: ['wind', 'glide', 'floating_island', 'long_fall'],
    enemies:  ['flyer', 'chaser', 'hoverbomb', 'turret', 'jumper', 'ghost'],
    miniBoss: 'gale_sentry',
    boss:     'celestial_warden',
    relic:    'Zephyr Relic',
  },

  {
    id: 7,
    name: 'Clockwork City',
    subtitle: 'Engranajes, prensas y láseres',
    theme: 'clockwork',
    difficulty: 7,
    gravityScale: 1.0,
    friction: 0.75,
    music: 'w7',
    palette: {
      sky:    ['#2A2438', '#41386B'],
      far:    '#3A3250',
      mid:    '#4A4266',
      near:   '#5A527C',
      ground: '#6B6B7B',
      dirt:   '#43434F',
      plat:   '#8A8A9E',
      edge:   '#FFB627',
      accent: '#FF6B35',
    },
    mechanics: ['conveyor', 'gear', 'laser', 'press', 'switch_gravity'],
    enemies:  ['turret', 'roller', 'armored', 'exploder', 'shooter', 'spinner'],
    miniBoss: 'cog_sentinel',
    boss:     'foundry_engine',
    relic:    'Gear Relic',
  },

  {
    id: 8,
    name: 'Volcanic Abyss',
    subtitle: 'Lava ascendente y erupciones',
    theme: 'volcano',
    difficulty: 8,
    gravityScale: 1.0,
    friction: 0.75,
    music: 'w8',
    palette: {
      sky:    ['#2B0A0A', '#6E1B12'],
      far:    '#451410',
      mid:    '#5E1C13',
      near:   '#7A2617',
      ground: '#3A2320',
      dirt:   '#241512',
      plat:   '#55332B',
      edge:   '#FF7A29',
      accent: '#FFC93C',
    },
    mechanics: ['rising_lava', 'crumble', 'fireball', 'eruption'],
    enemies:  ['exploder', 'shooter', 'jumper', 'armored', 'bouncer', 'turret'],
    miniBoss: 'magma_hound',
    boss:     'ashborn',
    relic:    'Ember Relic',
  },

  {
    id: 9,
    name: 'The Void',
    subtitle: 'Donde la realidad se deshace',
    theme: 'void',
    difficulty: 10,
    gravityScale: 0.62,
    friction: 0.72,
    music: 'w9',
    palette: {
      sky:    ['#05000E', '#170A2E'],
      far:    '#1B0F38',
      mid:    '#2A1652',
      near:   '#3B1F6E',
      ground: '#1A1030',
      dirt:   '#0E0820',
      plat:   '#4B2A85',
      edge:   '#C77DFF',
      accent: '#00F5D4',
    },
    mechanics: ['gravity_flip', 'phase_platform', 'portal', 'distortion'],
    enemies:  ['ghost', 'teleporter', 'splitter', 'chaser', 'hoverbomb', 'spinner', 'shielder'],
    miniBoss: 'null_echo',
    boss:     'void_king',
    relic:    'Void Relic',
  },
];

function getWorld(id) { return WORLDS.find(w => w.id === id); }

/** "W3L07" -> { world:3, level:7 } */
function parseLevelId(id) {
  const m = /^W(\d+)L(\d+)$/.exec(id);
  if (!m) return null;
  return { world: +m[1], level: +m[2] };
}

function makeLevelId(world, level) {
  return `W${world}L${String(level).padStart(2, '0')}`;
}

/** Every main level id in play order. */
function allLevelIds() {
  const out = [];
  for (const w of WORLDS) {
    for (let l = 1; l <= LEVELS_PER_WORLD; l++) out.push(makeLevelId(w.id, l));
  }
  return out;
}

function archetypeFor(levelNum) {
  return ARCHETYPES[clamp(levelNum - 1, 0, ARCHETYPES.length - 1)];
}

/**
 * Difficulty 1..10 for a specific level: worlds ramp, and within a world
 * later levels are harder. Boss levels get a bump.
 */
function difficultyFor(worldId, levelNum) {
  const w = getWorld(worldId);
  const base = w ? w.difficulty : 1;
  const within = (levelNum - 1) / (LEVELS_PER_WORLD - 1); // 0..1
  let d = base + within * 1.6;
  const arch = archetypeFor(levelNum);
  if (arch === 'boss') d += 0.8;
  if (arch === 'miniboss') d += 0.4;
  if (arch === 'intro') d -= 0.8;
  return clamp(d, 1, 10);
}
