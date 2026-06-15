'use strict';

// ─── VIRTUAL RESOLUTION ──────────────────────────────────────
const VW = 400;
const VH = 225;
const HUD_H = 20;

// ─── PHYSICS ─────────────────────────────────────────────────
const GRAVITY       = 0.45;
const JUMP_VY       = -8.8;
const DJUMP_VY      = -7.2;
const PLAYER_SPD    = 2.6;
const MAX_FALL      = 10;
const FRICTION      = 0.75;

// ─── PLAYER ──────────────────────────────────────────────────
const PW = 14;
const PH = 20;
const INVUL_FRAMES = 120;
const START_LIVES   = 3;

// ─── GAME STATES ─────────────────────────────────────────────
const ST = {
  LOADING:    'loading',
  MENU:       'menu',
  WORLDINTRO: 'worldintro',
  PLAYING:    'playing',
  PAUSED:     'paused',
  GAMEOVER:   'gameover',
  VICTORY:    'victory',
  CREDITS:    'credits',
  CONTROLS:   'controls',
  ACHIEVE:    'achievements',
};

// ─── COLLECTIBLE TYPES ────────────────────────────────────────
const CT = {
  TUNA:      'tuna',
  COIN:      'coin',
  HEART:     'heart',
  PU_DJUMP:  'pu_djump',
  PU_SPEED:  'pu_speed',
  PU_SHIELD: 'pu_shield',
};

// ─── ENEMY TYPES ─────────────────────────────────────────────
const ET = {
  VACUUM:    'vacuum',
  DRONE:     'drone',
  PATROL:    'patrol',
  VIRUS:     'virus',
  SPACEBOT:  'spacebot',
};

// ─── PLATFORM TYPES ──────────────────────────────────────────
const PLT = {
  GROUND:    'ground',
  SOFA:      'sofa',
  TABLE:     'table',
  SHELF:     'shelf',
  DESK:      'desk',
  BOOK:      'book',
  BUILDING:  'building',
  FIREESCAPE:'fireescape',
  DIGITAL:   'digital',
  ASTEROID:  'asteroid',
  STATION:   'station',
  CLOUD:     'cloud',
};

// ─── WORLD PALETTE ───────────────────────────────────────────
const WP = {
  1: { sky1:'#87CEEB', sky2:'#B8D4E8', floor:'#8B6914', plat:'#A0522D', accent:'#D2691E' },
  2: { sky1:'#C8DCF0', sky2:'#E8F0F8', floor:'#707888', plat:'#8890A0', accent:'#FFFFFF' },
  3: { sky1:'#1A2540', sky2:'#2C3E60', floor:'#484848', plat:'#585858', accent:'#FFD700' },
  4: { sky1:'#000010', sky2:'#000030', floor:'#001133', plat:'#0033AA', accent:'#00FFFF' },
  5: { sky1:'#000008', sky2:'#000015', floor:'#111133', plat:'#222244', accent:'#AAAAFF' },
};

// ─── COLORS ──────────────────────────────────────────────────
const COL = {
  // UI
  BLACK:   '#000000',
  WHITE:   '#FFFFFF',
  GOLD:    '#FFD700',
  RED:     '#FF3333',
  GREEN:   '#33DD33',
  CYAN:    '#00FFFF',
  BLUE:    '#3366FF',
  PURPLE:  '#AA33FF',
  ORANGE:  '#FF8800',

  // Luka
  L_BODY:  '#E8840A',
  L_FACE:  '#FFAA44',
  L_EYE:   '#111111',
  L_NOSE:  '#FF9999',
  L_MOUTH: '#883300',
  L_DARK:  '#B56000',
  L_WHITE: '#FFFAEE',

  // UI BG
  MENUBG:  '#000820',
  PANELBG: 'rgba(0,0,0,0.7)',
  HUDBAR:  '#111111',
};

// ─── ACHIEVEMENT IDS ─────────────────────────────────────────
const ACH = {
  FIRST_TUNA:  'first_tuna',
  TUNA_10:     'tuna_10',
  TUNA_50:     'tuna_50',
  FIRST_DEATH: 'first_death',
  NO_DAMAGE_1: 'no_damage_1',
  BEAT_BOSS:   'beat_boss',
  ALL_WORLDS:  'all_worlds',
  SPEED_RUN:   'speed_run',
  PACIFIST:    'pacifist',
  COLLECTOR:   'collector',
};
