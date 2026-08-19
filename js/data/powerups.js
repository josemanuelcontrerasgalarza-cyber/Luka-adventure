'use strict';

// THE CORES
// Eight timed power-ups plus one permanent unlock. Each changes what Luka
// can *do*, not just his stats, and each has a level-interaction: Titan
// breaks blocks, Shadow passes phase walls, Gravity flips the world.

const POWERUPS = {
  djump: {
    name: 'Doble Salto', short: '2X', permanent: true,
    color: '#5FC8F5', accent: '#1E6A88', icon: 'arrows',
    desc: 'Un segundo salto en el aire. Para siempre.',
  },
  ember: {
    name: 'Ember Core', short: 'EMB', duration: 900,
    color: '#FF7A29', accent: '#8E3520', icon: 'flame',
    desc: 'Dispara proyectiles de energía.',
    grants: { shoot: true },
  },
  frost: {
    name: 'Frost Core', short: 'FRS', duration: 900,
    color: '#5FC8F5', accent: '#2E6A9E', icon: 'crystal',
    desc: 'Congela enemigos al contacto.',
    grants: { freeze: true },
  },
  shadow: {
    name: 'Shadow Core', short: 'SHD', duration: 720,
    color: '#8A5AD8', accent: '#3E2060', icon: 'ghost',
    desc: 'Atraviesa muros de sombra.',
    grants: { phaseWalls: true },
  },
  wind: {
    name: 'Wind Core', short: 'WND', duration: 900,
    color: '#9AE6A0', accent: '#3E8A6E', icon: 'swirl',
    desc: 'Impulso aéreo horizontal.',
    grants: { dash: true },
  },
  titan: {
    name: 'Titan Core', short: 'TTN', duration: 780,
    color: '#FFB627', accent: '#8A5A10', icon: 'fist',
    desc: 'Rompe bloques y aplasta blindados.',
    grants: { smash: true, heavy: true },
  },
  gravity: {
    name: 'Gravity Core', short: 'GRV', duration: 600,
    color: '#C77DFF', accent: '#5A2E8A', icon: 'updown',
    desc: 'Invierte tu gravedad a voluntad.',
    grants: { gravityFlip: true },
  },
  echo: {
    name: 'Echo Core', short: 'ECO', duration: 720,
    color: '#00F5D4', accent: '#00806E', icon: 'double',
    desc: 'Un eco tuyo distrae a los enemigos.',
    grants: { echo: true },
  },
  shield: {
    name: 'Aegis Core', short: 'AEG', duration: 660,
    color: '#9AD8F5', accent: '#2E5A7A', icon: 'shield',
    desc: 'Absorbe un golpe.',
    grants: { shield: true },
  },
  voidcore: {
    name: 'Void Core', short: 'VOID', duration: 540,
    color: '#C77DFF', accent: '#0E0820', icon: 'void',
    desc: 'Todo a la vez. Extremadamente raro.',
    grants: { shoot: true, dash: true, smash: true, shield: true },
    rare: true,
  },
};

// Which cores each world hands out, in the order levels reach them.
const POWERUP_POOL_FOR_WORLD = {
  meadow:    ['djump', 'ember', 'shield'],
  desert:    ['ember', 'wind', 'shield'],
  cavern:    ['titan', 'ember', 'shield'],
  forest:    ['shadow', 'frost', 'wind'],
  frozen:    ['frost', 'titan', 'shield'],
  sky:       ['wind', 'echo', 'shield'],
  clockwork: ['titan', 'ember', 'gravity'],
  volcano:   ['frost', 'shield', 'titan'],
  void:      ['gravity', 'echo', 'voidcore'],
};

/** Draw a power-up crate. Icons are tiny but each reads distinctly. */
function drawPowerupCrate(ctx, x, y, type, frame) {
  const p = POWERUPS[type] || POWERUPS.ember;
  const bob = Math.round(Math.sin(frame * 0.08) * 2);
  const glow = 0.4 + Math.sin(frame * 0.1) * 0.3;

  ctx.save();
  ctx.translate(Math.round(x), Math.round(y) + bob);

  // Aura
  ctx.globalAlpha = glow * 0.45;
  ctx.fillStyle = p.color;
  ctx.fillRect(-3, -3, 18, 18);
  ctx.globalAlpha = 1;

  // Crate
  ctx.fillStyle = p.accent; ctx.fillRect(0, 0, 12, 12);
  ctx.fillStyle = p.color;  ctx.fillRect(1, 1, 10, 10);
  ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(1, 1, 10, 2);

  // Icon
  ctx.fillStyle = '#FFFFFF';
  switch (p.icon) {
    case 'arrows':
      ctx.fillRect(5, 3, 2, 6); ctx.fillRect(3, 5, 6, 1); ctx.fillRect(4, 4, 4, 1);
      break;
    case 'flame':
      ctx.fillRect(5, 2, 2, 5); ctx.fillRect(4, 5, 4, 4); ctx.fillRect(5, 9, 2, 1);
      break;
    case 'crystal':
      ctx.fillRect(5, 2, 2, 8); ctx.fillRect(3, 4, 6, 4); ctx.fillRect(4, 3, 4, 6);
      break;
    case 'ghost':
      ctx.fillRect(3, 3, 6, 5); ctx.fillRect(3, 8, 2, 2); ctx.fillRect(7, 8, 2, 2);
      break;
    case 'swirl':
      ctx.fillRect(3, 4, 6, 1); ctx.fillRect(4, 6, 5, 1); ctx.fillRect(3, 8, 4, 1);
      break;
    case 'fist':
      ctx.fillRect(3, 4, 6, 5); ctx.fillRect(4, 3, 4, 1); ctx.fillRect(2, 6, 1, 2);
      break;
    case 'updown':
      ctx.fillRect(5, 2, 2, 8); ctx.fillRect(4, 3, 4, 1); ctx.fillRect(4, 8, 4, 1);
      break;
    case 'double':
      ctx.fillRect(3, 4, 3, 5); ctx.fillRect(7, 4, 3, 5);
      break;
    case 'shield':
      ctx.fillRect(4, 3, 4, 6); ctx.fillRect(3, 4, 6, 4); ctx.fillRect(5, 9, 2, 1);
      break;
    case 'void':
      ctx.fillStyle = '#000';
      ctx.fillRect(4, 4, 4, 4);
      ctx.fillStyle = '#FFF';
      ctx.fillRect(3, 3, 1, 1); ctx.fillRect(8, 8, 1, 1);
      ctx.fillRect(8, 3, 1, 1); ctx.fillRect(3, 8, 1, 1);
      break;
  }
  ctx.restore();
}
