'use strict';

const Particles = (() => {
  const pool = [];

  function emit(x, y, opts = {}) {
    const count = opts.count || 6;
    for (let i = 0; i < count; i++) {
      const angle = opts.angle !== undefined
        ? opts.angle + (Math.random() - 0.5) * (opts.spread || Math.PI)
        : Math.random() * Math.PI * 2;
      const speed = opts.speed || (1 + Math.random() * 2);
      pool.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: opts.life || (20 + Math.random() * 20),
        maxLife: opts.life || 40,
        color: Array.isArray(opts.color)
          ? opts.color[Math.floor(Math.random() * opts.color.length)]
          : (opts.color || '#FFFFFF'),
        size: opts.size || (1 + Math.random() * 2),
        gravity: opts.gravity !== undefined ? opts.gravity : 0.1,
        alpha: 1,
      });
    }
  }

  function emitDust(x, y, dx) {
    emit(x, y, {
      count: 3,
      color: ['#AAAAAA', '#CCCCCC', '#888888'],
      size: 1,
      speed: 1,
      angle: dx < 0 ? 0 : Math.PI,
      spread: Math.PI * 0.5,
      life: 15,
      gravity: 0,
    });
  }

  function emitCoin(x, y) {
    emit(x, y, {
      count: 8,
      color: ['#FFD700', '#FFC000', '#FFEE88', '#FFFFFF'],
      size: 2,
      speed: 3,
      gravity: 0.2,
      life: 30,
    });
  }

  function emitTuna(x, y) {
    emit(x, y, {
      count: 8,
      color: ['#99CCFF', '#BBDDFF', '#FFFFFF', '#7799EE'],
      size: 2,
      speed: 2.5,
      gravity: 0.15,
      life: 28,
    });
  }

  function emitHurt(x, y) {
    emit(x, y, {
      count: 12,
      color: ['#FF3333', '#FF6666', '#FF0000', '#FFAA00'],
      size: 2,
      speed: 3.5,
      gravity: 0.2,
      life: 35,
    });
  }

  function emitHeart(x, y) {
    emit(x, y, {
      count: 10,
      color: ['#FF3333', '#FF6666', '#FF9999', '#FFFFFF'],
      size: 2,
      speed: 2.5,
      angle: -Math.PI / 2,
      spread: Math.PI,
      gravity: 0.15,
      life: 35,
    });
  }

  function emitExplosion(x, y) {
    emit(x, y, {
      count: 20,
      color: ['#FF4400', '#FF8800', '#FFCC00', '#FFFFFF', '#FF2200'],
      size: 3,
      speed: 5,
      gravity: 0.3,
      life: 45,
    });
  }

  function emitGlitch(x, y) {
    emit(x, y, {
      count: 10,
      color: ['#00FFFF', '#FF00FF', '#00FF88', '#FFFFFF'],
      size: 1,
      speed: 4,
      gravity: 0,
      life: 20,
    });
  }

  function emitStar(x, y) {
    emit(x, y, {
      count: 12,
      color: ['#FFD700', '#FFFFFF', '#FFEE88', '#AAAAFF'],
      size: 2,
      speed: 3,
      angle: -Math.PI / 2,
      spread: Math.PI * 1.5,
      gravity: 0.1,
      life: 40,
    });
  }

  function emitPowerup(x, y) {
    emit(x, y, {
      count: 16,
      color: ['#00FFCC', '#FFFFFF', '#00CCFF', '#AAFFFF'],
      size: 2,
      speed: 4,
      gravity: -0.05,
      life: 45,
    });
  }

  function emitCheckpoint(x, y) {
    emit(x, y, {
      count: 15,
      color: ['#33FF33', '#FFFFFF', '#88FF88', '#FFFF00'],
      size: 2,
      speed: 3,
      angle: -Math.PI / 2,
      spread: Math.PI * 1.2,
      gravity: 0.2,
      life: 40,
    });
  }

  function emitBossHit(x, y) {
    emit(x, y, {
      count: 14,
      color: ['#FF4400', '#FF8800', '#FFCC00', '#FFFFFF'],
      size: 3,
      speed: 4,
      gravity: 0.2,
      life: 40,
    });
  }

  function update() {
    for (let i = pool.length - 1; i >= 0; i--) {
      const p = pool[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.gravity;
      p.vx *= 0.98;
      p.life--;
      p.alpha = p.life / p.maxLife;
      if (p.life <= 0) pool.splice(i, 1);
    }
  }

  function draw(ctx, camX) {
    for (const p of pool) {
      ctx.globalAlpha = Math.max(0, p.alpha);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - camX - p.size * 0.5 | 0, p.y - p.size * 0.5 | 0, p.size, p.size);
    }
    ctx.globalAlpha = 1;
  }

  function clear() { pool.length = 0; }

  return { emit, emitDust, emitCoin, emitTuna, emitHurt, emitHeart,
           emitExplosion, emitGlitch, emitStar, emitPowerup,
           emitCheckpoint, emitBossHit, update, draw, clear };
})();
