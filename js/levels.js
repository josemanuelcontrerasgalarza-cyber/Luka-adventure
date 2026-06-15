'use strict';

// Ground level for all worlds (y-coordinate where floor top sits)
const GROUND_Y = 195;

// Helper to spread tuna along a segment
function tunasAt(x1, x2, y, spacing = 30) {
  const out = [];
  for (let x = x1; x <= x2; x += spacing) {
    out.push({ x, y, type: CT.TUNA });
  }
  return out;
}

// ─── WORLD 1: CASA ────────────────────────────────────────────
const WORLD_1 = {
  id: 1,
  name: 'Mundo 1',
  subtitle: 'La Casa',
  bgMusic: 'world1',
  width: 3000,
  gravity: GRAVITY,
  // Background decor (drawn by renderer)
  bgDecor: [
    { type: 'window', x: 120, y: 60 },
    { type: 'window', x: 460, y: 55 },
    { type: 'window', x: 850, y: 60 },
    { type: 'window', x: 1300, y: 55 },
    { type: 'window', x: 1800, y: 60 },
    { type: 'window', x: 2400, y: 55 },
    { type: 'bookcase', x: 700, y: 135 },
    { type: 'bookcase', x: 1500, y: 135 },
    { type: 'bookcase', x: 2200, y: 135 },
  ],
  grounds: [{ x: 0, y: GROUND_Y, w: 3000, h: 30 }],
  platforms: [
    // Sofa 1
    { x: 180, y: 183, w: 110, h: 12, type: PLT.SOFA },
    // Table 1
    { x: 380, y: 168, w: 70, h: 8,  type: PLT.TABLE },
    // Sofa 2
    { x: 560, y: 183, w: 100, h: 12, type: PLT.SOFA },
    // High shelf
    { x: 750, y: 148, w: 50,  h: 6,  type: PLT.SHELF },
    // Table 2
    { x: 920, y: 168, w: 80,  h: 8,  type: PLT.TABLE },
    // Sofa 3
    { x: 1100, y: 183, w: 120, h: 12, type: PLT.SOFA },
    // High shelf
    { x: 1330, y: 145, w: 50,  h: 6,  type: PLT.SHELF },
    // Middle shelf
    { x: 1280, y: 165, w: 55,  h: 6,  type: PLT.SHELF },
    // Low shelf
    { x: 1380, y: 178, w: 50,  h: 6,  type: PLT.SHELF },
    // Table 3
    { x: 1540, y: 160, w: 90,  h: 8,  type: PLT.TABLE },
    // Sofa 4
    { x: 1730, y: 183, w: 110, h: 12, type: PLT.SOFA },
    // Stacked shelves
    { x: 1960, y: 175, w: 55,  h: 6,  type: PLT.SHELF },
    { x: 1940, y: 155, w: 55,  h: 6,  type: PLT.SHELF },
    { x: 1960, y: 135, w: 55,  h: 6,  type: PLT.SHELF },
    // Table 4
    { x: 2130, y: 162, w: 80,  h: 8,  type: PLT.TABLE },
    // Sofa 5
    { x: 2340, y: 183, w: 130, h: 12, type: PLT.SOFA },
    // Final shelves
    { x: 2600, y: 160, w: 60,  h: 6,  type: PLT.SHELF },
    { x: 2700, y: 140, w: 60,  h: 6,  type: PLT.SHELF },
    { x: 2800, y: 165, w: 60,  h: 6,  type: PLT.SHELF },
  ],
  enemies: [
    { x: 250,  y: GROUND_Y-15, type: ET.VACUUM, px: 180, py: 380 },
    { x: 600,  y: GROUND_Y-15, type: ET.VACUUM, px: 500, py: 720 },
    { x: 1000, y: GROUND_Y-15, type: ET.VACUUM, px: 880, py: 1150 },
    { x: 1650, y: GROUND_Y-15, type: ET.VACUUM, px: 1550, py: 1850 },
    { x: 2100, y: GROUND_Y-15, type: ET.VACUUM, px: 2000, py: 2250 },
    { x: 2450, y: GROUND_Y-15, type: ET.VACUUM, px: 2300, py: 2650 },
    // Platform enemies
    { x: 390,  y: 160, type: ET.VACUUM, px: 380, py: 440 },
    { x: 1540, y: 152, type: ET.VACUUM, px: 1540, py: 1620 },
  ],
  collectibles: [
    ...tunasAt(200, 280, 173),
    ...tunasAt(420, 440, 158),
    ...tunasAt(600, 680, 173),
    { x: 775, y: 138, type: CT.TUNA },
    ...tunasAt(950, 990, 158),
    ...tunasAt(1140, 1200, 173),
    { x: 1300, y: 135, type: CT.COIN },
    ...tunasAt(1560, 1620, 150),
    { x: 1790, y: 173, type: CT.TUNA },
    ...tunasAt(1960, 2000, 165),
    { x: 1960, y: 125, type: CT.COIN },
    ...tunasAt(2160, 2200, 152),
    { x: 2450, y: 173, type: CT.TUNA },
    { x: 2620, y: 150, type: CT.TUNA },
    { x: 2715, y: 130, type: CT.COIN },
    { x: 2820, y: 155, type: CT.TUNA },
    // Heart
    { x: 1550, y: 120, type: CT.HEART },
  ],
  powerups: [
    { x: 760, y: 128, type: CT.PU_DJUMP },
    { x: 2700, y: 100, type: CT.PU_SPEED },
  ],
  checkpoints: [
    { x: 1400, y: GROUND_Y - 20 },
  ],
  start: { x: 50, y: GROUND_Y - PH },
  end:   { x: 2920, y: GROUND_Y - 32 },
};

// ─── WORLD 2: COLEGIO ─────────────────────────────────────────
const WORLD_2 = {
  id: 2,
  name: 'Mundo 2',
  subtitle: 'El Colegio',
  bgMusic: 'world2',
  width: 3200,
  gravity: GRAVITY,
  bgDecor: [
    { type: 'blackboard', x: 200, y: 80 },
    { type: 'blackboard', x: 900, y: 80 },
    { type: 'blackboard', x: 1700, y: 80 },
    { type: 'blackboard', x: 2600, y: 80 },
  ],
  grounds: [{ x: 0, y: GROUND_Y, w: 3200, h: 30 }],
  platforms: [
    // Desks
    { x: 150, y: 183, w: 80, h: 12, type: PLT.DESK },
    { x: 310, y: 178, w: 80, h: 12, type: PLT.DESK },
    { x: 470, y: 168, w: 70, h: 8,  type: PLT.BOOK },
    { x: 620, y: 178, w: 80, h: 12, type: PLT.DESK },
    { x: 780, y: 168, w: 60, h: 8,  type: PLT.BOOK },
    { x: 850, y: 150, w: 60, h: 8,  type: PLT.BOOK },
    { x: 1000, y: 183, w: 90, h: 12, type: PLT.DESK },
    { x: 1150, y: 165, w: 70, h: 8,  type: PLT.BOOK },
    { x: 1280, y: 148, w: 60, h: 8,  type: PLT.BOOK },
    { x: 1420, y: 168, w: 80, h: 12, type: PLT.DESK },
    { x: 1580, y: 178, w: 80, h: 12, type: PLT.DESK },
    { x: 1730, y: 155, w: 70, h: 8,  type: PLT.BOOK },
    { x: 1860, y: 135, w: 60, h: 8,  type: PLT.BOOK },
    { x: 2000, y: 183, w: 90, h: 12, type: PLT.DESK },
    { x: 2180, y: 168, w: 70, h: 8,  type: PLT.BOOK },
    { x: 2310, y: 150, w: 60, h: 8,  type: PLT.BOOK },
    { x: 2430, y: 130, w: 60, h: 8,  type: PLT.BOOK },
    { x: 2560, y: 178, w: 80, h: 12, type: PLT.DESK },
    { x: 2700, y: 163, w: 70, h: 8,  type: PLT.BOOK },
    { x: 2840, y: 148, w: 60, h: 8,  type: PLT.BOOK },
    { x: 2970, y: 168, w: 80, h: 12, type: PLT.DESK },
  ],
  enemies: [
    { x: 300,  y: 130, type: ET.DRONE, px: 200, py: 450 },
    { x: 650,  y: 120, type: ET.DRONE, px: 550, py: 850 },
    { x: 1050, y: 130, type: ET.DRONE, px: 950, py: 1200 },
    { x: 1500, y: 115, type: ET.DRONE, px: 1350, py: 1700 },
    { x: 1900, y: 125, type: ET.DRONE, px: 1750, py: 2100 },
    { x: 2250, y: 110, type: ET.DRONE, px: 2100, py: 2500 },
    { x: 2700, y: 120, type: ET.DRONE, px: 2600, py: 2900 },
    // Ground drones (low)
    { x: 500,  y: 165, type: ET.DRONE, px: 450, py: 620 },
    { x: 2080, y: 160, type: ET.DRONE, px: 2000, py: 2200 },
  ],
  collectibles: [
    ...tunasAt(170, 220, 173),
    ...tunasAt(330, 380, 168),
    ...tunasAt(490, 530, 158),
    ...tunasAt(640, 690, 168),
    { x: 860, y: 140, type: CT.TUNA },
    { x: 1295, y: 138, type: CT.COIN },
    ...tunasAt(1040, 1080, 173),
    ...tunasAt(1165, 1210, 155),
    { x: 1750, y: 145, type: CT.TUNA },
    { x: 1875, y: 125, type: CT.TUNA },
    { x: 2445, y: 120, type: CT.COIN },
    ...tunasAt(2190, 2230, 158),
    ...tunasAt(2710, 2750, 153),
    { x: 2855, y: 138, type: CT.TUNA },
    { x: 2990, y: 158, type: CT.TUNA },
    { x: 1860, y: 100, type: CT.HEART },
  ],
  powerups: [
    { x: 1290, y: 108, type: CT.PU_SHIELD },
    { x: 2430, y: 90,  type: CT.PU_SPEED },
  ],
  checkpoints: [
    { x: 1550, y: GROUND_Y - 20 },
  ],
  start: { x: 50, y: GROUND_Y - PH },
  end:   { x: 3120, y: GROUND_Y - 32 },
};

// ─── WORLD 3: CIUDAD ──────────────────────────────────────────
const WORLD_3 = {
  id: 3,
  name: 'Mundo 3',
  subtitle: 'La Ciudad',
  bgMusic: 'world3',
  width: 3600,
  gravity: GRAVITY,
  bgDecor: [
    { type: 'building', x: 0,    y: 60,  w: 100, h: 135, color: '#2A3244', win: '#FFEE66' },
    { type: 'building', x: 110,  y: 80,  w: 80,  h: 115, color: '#1A2234', win: '#88BBFF' },
    { type: 'building', x: 200,  y: 50,  w: 120, h: 145, color: '#2C3850', win: '#FFEE66' },
    { type: 'building', x: 450,  y: 70,  w: 90,  h: 125, color: '#1E2C44', win: '#88BBFF' },
    { type: 'building', x: 680,  y: 55,  w: 110, h: 140, color: '#2A3A58', win: '#FFEE66' },
    { type: 'building', x: 900,  y: 65,  w: 100, h: 130, color: '#1A2840', win: '#88BBFF' },
    { type: 'building', x: 1100, y: 45,  w: 130, h: 150, color: '#283348', win: '#FFEE66' },
    { type: 'building', x: 1400, y: 60,  w: 95,  h: 135, color: '#1E2C44', win: '#88BBFF' },
    { type: 'building', x: 1600, y: 50,  w: 120, h: 145, color: '#2A3850', win: '#FFEE66' },
    { type: 'building', x: 1900, y: 70,  w: 85,  h: 125, color: '#1A2234', win: '#88BBFF' },
    { type: 'building', x: 2100, y: 55,  w: 110, h: 140, color: '#283348', win: '#FFEE66' },
    { type: 'building', x: 2400, y: 60,  w: 100, h: 135, color: '#2A3244', win: '#88BBFF' },
    { type: 'building', x: 2600, y: 45,  w: 130, h: 150, color: '#1E2C44', win: '#FFEE66' },
    { type: 'building', x: 2900, y: 65,  w: 95,  h: 130, color: '#2C3850', win: '#88BBFF' },
    { type: 'building', x: 3100, y: 50,  w: 120, h: 145, color: '#283348', win: '#FFEE66' },
    { type: 'building', x: 3350, y: 60,  w: 100, h: 135, color: '#1A2840', win: '#88BBFF' },
  ],
  grounds: [{ x: 0, y: GROUND_Y, w: 3600, h: 30 }],
  platforms: [
    // Building tops / fire escapes
    { x: 100,  y: 160, w: 70,  h: 8,  type: PLT.BUILDING },
    { x: 250,  y: 145, w: 60,  h: 8,  type: PLT.FIREESCAPE },
    { x: 370,  y: 160, w: 60,  h: 8,  type: PLT.BUILDING },
    { x: 490,  y: 140, w: 60,  h: 8,  type: PLT.FIREESCAPE },
    { x: 620,  y: 120, w: 70,  h: 8,  type: PLT.BUILDING },
    { x: 750,  y: 145, w: 60,  h: 8,  type: PLT.FIREESCAPE },
    { x: 880,  y: 160, w: 70,  h: 8,  type: PLT.BUILDING },
    { x: 1020, y: 130, w: 80,  h: 8,  type: PLT.BUILDING },
    { x: 1160, y: 108, w: 70,  h: 8,  type: PLT.FIREESCAPE },
    { x: 1310, y: 130, w: 60,  h: 8,  type: PLT.BUILDING },
    { x: 1450, y: 155, w: 70,  h: 8,  type: PLT.FIREESCAPE },
    { x: 1590, y: 130, w: 80,  h: 8,  type: PLT.BUILDING },
    { x: 1730, y: 108, w: 70,  h: 8,  type: PLT.FIREESCAPE },
    { x: 1880, y: 130, w: 70,  h: 8,  type: PLT.BUILDING },
    { x: 2020, y: 155, w: 60,  h: 8,  type: PLT.FIREESCAPE },
    { x: 2150, y: 125, w: 80,  h: 8,  type: PLT.BUILDING },
    { x: 2310, y: 108, w: 70,  h: 8,  type: PLT.FIREESCAPE },
    { x: 2460, y: 130, w: 70,  h: 8,  type: PLT.BUILDING },
    { x: 2600, y: 155, w: 60,  h: 8,  type: PLT.FIREESCAPE },
    { x: 2730, y: 125, w: 80,  h: 8,  type: PLT.BUILDING },
    { x: 2880, y: 105, w: 70,  h: 8,  type: PLT.FIREESCAPE },
    { x: 3030, y: 130, w: 70,  h: 8,  type: PLT.BUILDING },
    { x: 3180, y: 155, w: 60,  h: 8,  type: PLT.FIREESCAPE },
    { x: 3310, y: 125, w: 80,  h: 8,  type: PLT.BUILDING },
    { x: 3460, y: 150, w: 70,  h: 8,  type: PLT.BUILDING },
  ],
  enemies: [
    { x: 200,  y: GROUND_Y-20, type: ET.PATROL, px: 100, py: 380 },
    { x: 500,  y: GROUND_Y-20, type: ET.PATROL, px: 400, py: 680 },
    { x: 900,  y: GROUND_Y-20, type: ET.PATROL, px: 800, py: 1100 },
    { x: 1200, y: GROUND_Y-20, type: ET.PATROL, px: 1100, py: 1400 },
    { x: 1600, y: GROUND_Y-20, type: ET.PATROL, px: 1450, py: 1780 },
    { x: 2000, y: GROUND_Y-20, type: ET.PATROL, px: 1850, py: 2200 },
    { x: 2400, y: GROUND_Y-20, type: ET.PATROL, px: 2200, py: 2650 },
    { x: 2800, y: GROUND_Y-20, type: ET.PATROL, px: 2650, py: 3050 },
    { x: 3200, y: GROUND_Y-20, type: ET.PATROL, px: 3050, py: 3450 },
    // Platform patrols
    { x: 270,  y: 137, type: ET.PATROL, px: 250, py: 310 },
    { x: 1020, y: 122, type: ET.PATROL, px: 1020, py: 1100 },
    { x: 2160, y: 117, type: ET.PATROL, px: 2150, py: 2230 },
  ],
  collectibles: [
    ...tunasAt(115, 160, 150),
    ...tunasAt(265, 305, 135),
    ...tunasAt(500, 540, 130),
    { x: 635, y: 110, type: CT.COIN },
    ...tunasAt(760, 800, 135),
    ...tunasAt(895, 940, 150),
    { x: 1170, y: 98, type: CT.TUNA },
    { x: 1320, y: 120, type: CT.TUNA },
    { x: 1745, y: 98, type: CT.COIN },
    ...tunasAt(1595, 1660, 120),
    { x: 1900, y: 120, type: CT.TUNA },
    { x: 2165, y: 115, type: CT.TUNA },
    { x: 2325, y: 98, type: CT.COIN },
    { x: 2475, y: 120, type: CT.TUNA },
    { x: 2745, y: 115, type: CT.TUNA },
    { x: 2895, y: 95, type: CT.COIN },
    { x: 3195, y: 120, type: CT.TUNA },
    { x: 3475, y: 140, type: CT.TUNA },
    { x: 1465, y: 115, type: CT.HEART },
  ],
  powerups: [
    { x: 1165, y: 68, type: CT.PU_DJUMP },
    { x: 2880, y: 65, type: CT.PU_SHIELD },
  ],
  checkpoints: [
    { x: 1750, y: GROUND_Y - 20 },
  ],
  start: { x: 50, y: GROUND_Y - PH },
  end:   { x: 3520, y: GROUND_Y - 32 },
};

// ─── WORLD 4: INTERNET ────────────────────────────────────────
const WORLD_4 = {
  id: 4,
  name: 'Mundo 4',
  subtitle: 'El Internet',
  bgMusic: 'world4',
  width: 3200,
  gravity: GRAVITY * 0.85,
  bgDecor: [
    { type: 'matrix', x: 0, y: 0 },
  ],
  grounds: [
    { x: 0, y: GROUND_Y, w: 200, h: 30 },
    { x: 3000, y: GROUND_Y, w: 200, h: 30 },
  ],
  platforms: [
    // Digital floating platforms
    { x: 180,  y: 185, w: 60,  h: 8,  type: PLT.DIGITAL },
    { x: 300,  y: 165, w: 60,  h: 8,  type: PLT.DIGITAL },
    { x: 420,  y: 148, w: 55,  h: 8,  type: PLT.DIGITAL },
    { x: 540,  y: 165, w: 55,  h: 8,  type: PLT.DIGITAL },
    { x: 660,  y: 145, w: 60,  h: 8,  type: PLT.DIGITAL },
    { x: 780,  y: 165, w: 55,  h: 8,  type: PLT.DIGITAL },
    { x: 900,  y: 140, w: 60,  h: 8,  type: PLT.DIGITAL },
    { x: 1020, y: 120, w: 55,  h: 8,  type: PLT.DIGITAL },
    { x: 1140, y: 140, w: 55,  h: 8,  type: PLT.DIGITAL },
    { x: 1260, y: 160, w: 60,  h: 8,  type: PLT.DIGITAL },
    { x: 1380, y: 140, w: 55,  h: 8,  type: PLT.DIGITAL },
    { x: 1500, y: 118, w: 60,  h: 8,  type: PLT.DIGITAL },
    { x: 1620, y: 138, w: 55,  h: 8,  type: PLT.DIGITAL },
    { x: 1740, y: 158, w: 55,  h: 8,  type: PLT.DIGITAL },
    { x: 1860, y: 135, w: 60,  h: 8,  type: PLT.DIGITAL },
    { x: 1980, y: 115, w: 60,  h: 8,  type: PLT.DIGITAL },
    { x: 2100, y: 140, w: 55,  h: 8,  type: PLT.DIGITAL },
    { x: 2220, y: 160, w: 55,  h: 8,  type: PLT.DIGITAL },
    { x: 2340, y: 135, w: 60,  h: 8,  type: PLT.DIGITAL },
    { x: 2460, y: 115, w: 60,  h: 8,  type: PLT.DIGITAL },
    { x: 2580, y: 140, w: 55,  h: 8,  type: PLT.DIGITAL },
    { x: 2700, y: 160, w: 55,  h: 8,  type: PLT.DIGITAL },
    { x: 2820, y: 135, w: 60,  h: 8,  type: PLT.DIGITAL },
    { x: 2940, y: 160, w: 60,  h: 8,  type: PLT.DIGITAL },
  ],
  enemies: [
    { x: 310,  y: 155, type: ET.VIRUS, px: 290, py: 430 },
    { x: 550,  y: 155, type: ET.VIRUS, px: 530, py: 660 },
    { x: 800,  y: 130, type: ET.VIRUS, px: 780, py: 960 },
    { x: 1030, y: 110, type: ET.VIRUS, px: 1010, py: 1160 },
    { x: 1270, y: 150, type: ET.VIRUS, px: 1250, py: 1400 },
    { x: 1510, y: 108, type: ET.VIRUS, px: 1490, py: 1640 },
    { x: 1750, y: 148, type: ET.VIRUS, px: 1730, py: 1880 },
    { x: 1990, y: 105, type: ET.VIRUS, px: 1970, py: 2120 },
    { x: 2230, y: 150, type: ET.VIRUS, px: 2210, py: 2360 },
    { x: 2470, y: 105, type: ET.VIRUS, px: 2450, py: 2600 },
    { x: 2710, y: 150, type: ET.VIRUS, px: 2690, py: 2840 },
  ],
  collectibles: [
    ...tunasAt(195, 235, 175),
    ...tunasAt(315, 350, 155),
    ...tunasAt(435, 470, 138),
    { x: 675, y: 135, type: CT.COIN },
    ...tunasAt(810, 845, 130),
    { x: 1035, y: 110, type: CT.TUNA },
    { x: 1395, y: 130, type: CT.TUNA },
    { x: 1515, y: 108, type: CT.COIN },
    ...tunasAt(1755, 1790, 125),
    { x: 1995, y: 105, type: CT.TUNA },
    { x: 2355, y: 125, type: CT.COIN },
    { x: 2475, y: 105, type: CT.TUNA },
    { x: 2715, y: 150, type: CT.TUNA },
    { x: 2955, y: 150, type: CT.TUNA },
    { x: 2105, y: 80, type: CT.HEART },
  ],
  powerups: [
    { x: 1510, y: 78, type: CT.PU_DJUMP },
    { x: 2460, y: 75, type: CT.PU_SHIELD },
  ],
  checkpoints: [
    { x: 1580, y: GROUND_Y - 20 },
  ],
  start: { x: 50, y: GROUND_Y - PH },
  end:   { x: 3100, y: GROUND_Y - 32 },
};

// ─── WORLD 5: ESPACIO ─────────────────────────────────────────
const WORLD_5 = {
  id: 5,
  name: 'Mundo 5',
  subtitle: 'El Espacio',
  bgMusic: 'world5',
  width: 3000,
  gravity: GRAVITY * 0.35,
  bgDecor: [
    { type: 'stars', count: 100 },
    { type: 'planet', x: 300, y: 60, r: 30, color: '#AA6644' },
    { type: 'planet', x: 900, y: 40, r: 20, color: '#4466AA' },
    { type: 'planet', x: 1600, y: 70, r: 25, color: '#AA4466' },
    { type: 'planet', x: 2300, y: 45, r: 22, color: '#44AA66' },
  ],
  grounds: [
    { x: 0, y: GROUND_Y, w: 160, h: 30 },
    { x: 2860, y: GROUND_Y, w: 200, h: 30 },
  ],
  platforms: [
    // Asteroids and space stations
    { x: 140,  y: 180, w: 70,  h: 10, type: PLT.ASTEROID },
    { x: 260,  y: 160, w: 70,  h: 10, type: PLT.ASTEROID },
    { x: 390,  y: 140, w: 80,  h: 12, type: PLT.STATION },
    { x: 530,  y: 160, w: 65,  h: 10, type: PLT.ASTEROID },
    { x: 660,  y: 135, w: 80,  h: 12, type: PLT.STATION },
    { x: 800,  y: 115, w: 70,  h: 10, type: PLT.ASTEROID },
    { x: 930,  y: 140, w: 80,  h: 12, type: PLT.STATION },
    { x: 1070, y: 118, w: 65,  h: 10, type: PLT.ASTEROID },
    { x: 1200, y: 138, w: 80,  h: 12, type: PLT.STATION },
    { x: 1340, y: 115, w: 65,  h: 10, type: PLT.ASTEROID },
    { x: 1470, y: 95,  w: 80,  h: 12, type: PLT.STATION },
    { x: 1610, y: 120, w: 65,  h: 10, type: PLT.ASTEROID },
    { x: 1740, y: 138, w: 80,  h: 12, type: PLT.STATION },
    { x: 1880, y: 115, w: 65,  h: 10, type: PLT.ASTEROID },
    { x: 2010, y: 95,  w: 80,  h: 12, type: PLT.STATION },
    { x: 2150, y: 118, w: 65,  h: 10, type: PLT.ASTEROID },
    { x: 2280, y: 138, w: 80,  h: 12, type: PLT.STATION },
    { x: 2420, y: 115, w: 65,  h: 10, type: PLT.ASTEROID },
    { x: 2550, y: 135, w: 80,  h: 12, type: PLT.STATION },
    { x: 2690, y: 160, w: 65,  h: 10, type: PLT.ASTEROID },
    { x: 2820, y: 175, w: 70,  h: 10, type: PLT.ASTEROID },
  ],
  enemies: [
    { x: 280,  y: 145, type: ET.SPACEBOT, px: 260, py: 400 },
    { x: 540,  y: 145, type: ET.SPACEBOT, px: 530, py: 660 },
    { x: 810,  y: 100, type: ET.SPACEBOT, px: 800, py: 935 },
    { x: 1080, y: 103, type: ET.SPACEBOT, px: 1070, py: 1210 },
    { x: 1350, y: 100, type: ET.SPACEBOT, px: 1340, py: 1480 },
    { x: 1620, y: 105, type: ET.SPACEBOT, px: 1610, py: 1760 },
    { x: 1890, y: 100, type: ET.SPACEBOT, px: 1880, py: 2030 },
    { x: 2160, y: 103, type: ET.SPACEBOT, px: 2150, py: 2300 },
    { x: 2430, y: 100, type: ET.SPACEBOT, px: 2420, py: 2570 },
    { x: 2700, y: 145, type: ET.SPACEBOT, px: 2690, py: 2840 },
  ],
  collectibles: [
    ...tunasAt(155, 200, 170),
    ...tunasAt(275, 315, 150),
    ...tunasAt(405, 460, 130),
    { x: 675, y: 125, type: CT.COIN },
    ...tunasAt(815, 860, 105),
    { x: 945, y: 130, type: CT.TUNA },
    { x: 1085, y: 108, type: CT.TUNA },
    { x: 1215, y: 128, type: CT.COIN },
    { x: 1355, y: 105, type: CT.TUNA },
    { x: 1485, y: 85,  type: CT.TUNA },
    { x: 1625, y: 110, type: CT.TUNA },
    { x: 1755, y: 128, type: CT.COIN },
    { x: 1895, y: 105, type: CT.TUNA },
    { x: 2025, y: 85,  type: CT.TUNA },
    { x: 2165, y: 108, type: CT.TUNA },
    { x: 2295, y: 128, type: CT.COIN },
    { x: 2435, y: 105, type: CT.TUNA },
    { x: 2565, y: 125, type: CT.TUNA },
    { x: 2705, y: 150, type: CT.TUNA },
    { x: 2835, y: 165, type: CT.TUNA },
    { x: 1745, y: 70,  type: CT.HEART },
  ],
  powerups: [
    { x: 1480, y: 55,  type: CT.PU_DJUMP },
    { x: 2015, y: 55,  type: CT.PU_SPEED },
  ],
  checkpoints: [
    { x: 1500, y: GROUND_Y - 20 },
  ],
  start: { x: 50, y: GROUND_Y - PH },
  end:   { x: 2920, y: GROUND_Y - 32 },
};

// ─── BOSS LEVEL ───────────────────────────────────────────────
const BOSS_LEVEL = {
  id: 6,
  name: 'Jefe Final',
  subtitle: 'KERNEL-X',
  bgMusic: 'boss',
  width: 800,
  gravity: GRAVITY,
  bgDecor: [],
  grounds: [{ x: 0, y: GROUND_Y, w: 800, h: 30 }],
  platforms: [
    { x: 50,  y: 165, w: 60, h: 6, type: PLT.DIGITAL },
    { x: 680, y: 165, w: 60, h: 6, type: PLT.DIGITAL },
    { x: 340, y: 145, w: 80, h: 6, type: PLT.DIGITAL },
  ],
  enemies: [],
  collectibles: [],
  powerups: [],
  checkpoints: [],
  start: { x: 60, y: GROUND_Y - PH },
  end:   { x: 400, y: GROUND_Y - 20 },
};

const LEVELS = [WORLD_1, WORLD_2, WORLD_3, WORLD_4, WORLD_5, BOSS_LEVEL];

function getLevel(id) {
  return LEVELS.find(l => l.id === id) || LEVELS[0];
}
