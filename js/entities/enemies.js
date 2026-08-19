'use strict';

// ENEMY SYSTEM
// Data-driven: an enemy is a definition (size, stats, look) plus a named
// behaviour. Adding a new enemy is one entry in ENEMY_DEFS — no new class.
// The behaviours below are genuinely different, not 22 reskins of "walks
// left and right".

const ENEMY_DEFS = {
  // Ground
  walker: {
    w: 16, h: 14, hp: 1, speed: 0.75, stompable: true,
    look: { shape: 'blob', body: '#C1554E', accent: '#8E3A34', eye: '#FFF', legs: 2 },
  },
  charger: {
    w: 18, h: 16, hp: 1, speed: 0.6, stompable: true, sight: 130,
    look: { shape: 'blob', body: '#B4462E', accent: '#7A2C1B', eye: '#FFD95E', horn: true, legs: 2 },
  },
  hopper: {
    w: 15, h: 15, hp: 1, speed: 0.55, stompable: true,
    look: { shape: 'round', body: '#59A85C', accent: '#357A38', eye: '#FFF', legs: 2 },
  },
  jumper: {
    w: 17, h: 18, hp: 1, speed: 0.4, stompable: true,
    look: { shape: 'tall', body: '#7A5AA8', accent: '#523A78', eye: '#C7F5FF', legs: 2 },
  },
  roller: {
    w: 16, h: 16, hp: 1, speed: 1.9, stompable: true,
    look: { shape: 'round', body: '#8A8A9E', accent: '#5A5A6E', eye: '#FF6B35', spin: true },
  },
  armored: {
    w: 18, h: 17, hp: 3, speed: 0.55, stompable: false,
    look: { shape: 'box', body: '#6E7A8A', accent: '#3E4A5A', eye: '#FF4433', plate: true, legs: 2 },
  },
  spiker: {
    w: 16, h: 16, hp: 1, speed: 0, stompable: false, stationary: true,
    look: { shape: 'round', body: '#7A4E8A', accent: '#4E2E5A', eye: '#FFE066', spikes: true },
  },
  exploder: {
    w: 15, h: 15, hp: 1, speed: 0.9, stompable: true, fuse: 44, sight: 95,
    look: { shape: 'round', body: '#D9603C', accent: '#8E3520', eye: '#FFF', fuseWick: true },
  },
  burrower: {
    w: 16, h: 15, hp: 1, speed: 0, stompable: true, stationary: true, sight: 110,
    look: { shape: 'blob', body: '#C09A5E', accent: '#8A6A38', eye: '#3A2A1A' },
  },
  splitter: {
    w: 18, h: 17, hp: 1, speed: 0.7, stompable: true, splits: 2,
    look: { shape: 'blob', body: '#6ABF9E', accent: '#3E8A6E', eye: '#FFF', legs: 2 },
  },
  splitterling: {
    w: 10, h: 10, hp: 1, speed: 1.2, stompable: true, hidden: true,
    look: { shape: 'blob', body: '#8ED8BC', accent: '#4E9A7E', eye: '#FFF' },
  },
  shielder: {
    w: 17, h: 17, hp: 2, speed: 0.5, stompable: false, shielded: true,
    look: { shape: 'box', body: '#5A8AB4', accent: '#2E5A7A', eye: '#FFF', shield: true, legs: 2 },
  },

  // Flying
  flyer: {
    w: 18, h: 12, hp: 1, speed: 0.85, stompable: true, fly: true, amp: 26,
    look: { shape: 'wide', body: '#C77DFF', accent: '#8A4EC0', eye: '#FFF', wings: true },
  },
  chaser: {
    w: 16, h: 14, hp: 1, speed: 0.55, stompable: true, fly: true, sight: 190,
    look: { shape: 'round', body: '#E05A8A', accent: '#9A2E56', eye: '#FFE066', wings: true },
  },
  bat: {
    w: 15, h: 11, hp: 1, speed: 1.15, stompable: true, fly: true, amp: 40,
    look: { shape: 'wide', body: '#4A3A5A', accent: '#2A1E36', eye: '#FF4433', wings: true },
  },
  ghost: {
    w: 16, h: 18, hp: 1, speed: 0.42, stompable: false, fly: true, phasing: true, sight: 240,
    look: { shape: 'ghost', body: '#B8C8E8', accent: '#7A8AB8', eye: '#2A2A4A' },
  },
  hoverbomb: {
    w: 16, h: 14, hp: 1, speed: 0.9, stompable: true, fly: true, sight: 150,
    look: { shape: 'round', body: '#4A4A5E', accent: '#2A2A3A', eye: '#FF6B35', prop: true },
  },
  teleporter: {
    w: 15, h: 16, hp: 1, speed: 0, stompable: true, fly: true, blink: 110,
    look: { shape: 'tall', body: '#8A5AD8', accent: '#4E2E8A', eye: '#00F5D4' },
  },
  spinner: {
    w: 14, h: 14, hp: 1, speed: 1.0, stompable: false, fly: true, orbit: 34,
    look: { shape: 'box', body: '#FFB627', accent: '#B47A10', eye: '#3A2A00', spin: true, spikes: true },
  },
  climber: {
    w: 14, h: 16, hp: 1, speed: 0.7, stompable: true, fly: true, vertical: true,
    look: { shape: 'tall', body: '#7A9A4E', accent: '#4E6A2E', eye: '#FFF', legs: 4 },
  },
  bouncer: {
    w: 15, h: 15, hp: 1, speed: 1.3, stompable: true, fly: true, diagonal: true,
    look: { shape: 'round', body: '#5FC8F5', accent: '#2E8AB4', eye: '#FFF' },
  },

  // Shooters
  shooter: {
    w: 17, h: 16, hp: 1, speed: 0.45, stompable: true, fireRate: 105, sight: 200,
    look: { shape: 'box', body: '#A85A3C', accent: '#6E3520', eye: '#FFD95E', barrel: true, legs: 2 },
  },
  turret: {
    w: 18, h: 16, hp: 2, speed: 0, stompable: false, stationary: true, fireRate: 78, burst: 3, sight: 230,
    look: { shape: 'box', body: '#6E6E82', accent: '#3E3E4E', eye: '#FF4433', barrel: true },
  },
  swimmer: {
    w: 17, h: 12, hp: 1, speed: 0.8, stompable: true, fly: true, amp: 20,
    look: { shape: 'wide', body: '#3EA8C8', accent: '#1E6A88', eye: '#FFF', fin: true },
  },
};

// BEHAVIOUR IMPLEMENTATIONS
// Each receives (e, level, player, ctx) where ctx exposes spawn/fire hooks.

const ENEMY_BEHAVIOUR = {

  walker(e, lvl) { e.patrol(e.def.speed); e.gravity(lvl); },

  charger(e, lvl, p) {
    e.gravity(lvl);
    if (e.state === 'charge') {
      e.x += e.facing * e.def.speed * 4.2;
      if (--e.timer <= 0) { e.state = 'idle'; e.timer = 50; }
      if (e.x < e.px || e.x > e.py) { e.state = 'idle'; e.timer = 50; }
      e.x = clamp(e.x, e.px, e.py);
      return;
    }
    // Line of sight: same rough height, within range, and facing them.
    const dx = p.x - e.x;
    if (Math.abs(dx) < e.def.sight && Math.abs(p.y - e.y) < 26 && e.timer <= 0) {
      e.facing = dx > 0 ? 1 : -1;
      e.state = 'charge';
      e.timer = 46;
      Particles.emitDust(e.x + e.w / 2, e.y + e.h, -e.facing);
    } else {
      e.timer--;
      e.patrol(e.def.speed);
    }
  },

  hopper(e, lvl) {
    e.gravity(lvl);
    if (e.onGround) {
      if (--e.timer <= 0) { e.vy = -4.6; e.timer = 46; }
    }
    if (!e.onGround) e.x += e.facing * e.def.speed * 1.6;
    if (e.x <= e.px) { e.x = e.px; e.facing = 1; }
    if (e.x >= e.py) { e.x = e.py; e.facing = -1; }
  },

  jumper(e, lvl) {
    e.gravity(lvl);
    if (e.onGround && --e.timer <= 0) {
      e.vy = -7.4;
      e.facing = e.rngSign();
      e.timer = 74;
    }
    if (!e.onGround) e.x = clamp(e.x + e.facing * 0.9, e.px, e.py);
  },

  roller(e, lvl) {
    e.gravity(lvl);
    e.x += e.facing * e.def.speed;
    if (e.x <= e.px) { e.x = e.px; e.facing = 1;  Particles.emitDust(e.x, e.y + e.h, -1); }
    if (e.x >= e.py) { e.x = e.py; e.facing = -1; Particles.emitDust(e.x, e.y + e.h, 1); }
    e.spin += e.facing * 0.28;
  },

  armored(e, lvl) { e.patrol(e.def.speed); e.gravity(lvl); },

  spiker(e) {
    // Spikes extend and retract, telegraphed clearly.
    e.spikeOut = (e.frame % 120) > 60;
  },

  exploder(e, lvl, p, ctx) {
    e.gravity(lvl);
    const near = dist2(e.x, e.y, p.x, p.y) < e.def.sight * e.def.sight;
    if (e.state === 'fuse') {
      e.timer--;
      if (e.timer <= 0) {
        ctx.explode(e, 34);
        e.alive = false;
      }
      return;
    }
    if (near) {
      const dx = p.x - e.x;
      e.facing = dx > 0 ? 1 : -1;
      e.x = clamp(e.x + e.facing * e.def.speed * 1.7, e.px - 40, e.py + 40);
      if (dist2(e.x, e.y, p.x, p.y) < 26 * 26) {
        e.state = 'fuse';
        e.timer = e.def.fuse;
      }
    } else {
      e.patrol(e.def.speed);
    }
  },

  burrower(e, lvl, p) {
    // Hides underground; erupts when the player walks overhead.
    const near = Math.abs(p.x - e.x) < e.def.sight * 0.35 && Math.abs(p.y - e.baseY) < 60;
    if (e.state === 'up') {
      if (--e.timer <= 0) e.state = 'sinking';
    } else if (e.state === 'sinking') {
      e.buried = Math.min(1, e.buried + 0.06);
      if (e.buried >= 1) { e.state = 'hidden'; e.timer = 40; }
    } else if (e.state === 'hidden') {
      e.timer--;
      if (near && e.timer <= 0) {
        e.state = 'rising';
        Particles.emit(e.x + e.w / 2, e.baseY + e.h, {
          count: 8, color: ['#C09A5E', '#8A6A38'], speed: 2, life: 22, gravity: 0.2,
        });
      }
    } else if (e.state === 'rising') {
      e.buried = Math.max(0, e.buried - 0.08);
      if (e.buried <= 0) { e.state = 'up'; e.timer = 90; }
    }
    e.y = e.baseY + e.buried * e.h;
    e.harmless = e.buried > 0.6;
  },

  splitter(e, lvl) { e.patrol(e.def.speed); e.gravity(lvl); },
  splitterling(e, lvl) { e.patrol(e.def.speed); e.gravity(lvl); },

  shielder(e, lvl, p) {
    e.gravity(lvl);
    e.patrol(e.def.speed);
    // Shield always faces the player — you must get behind it.
    e.shieldSide = p.x > e.x ? 1 : -1;
  },

  flyer(e, lvl, p, ctx) {
    e.x += e.facing * e.def.speed;
    if (e.x <= e.px) { e.x = e.px; e.facing = 1; }
    if (e.x >= e.py) { e.x = e.py; e.facing = -1; }
    e.y = e.baseY + Math.sin(e.frame * 0.055) * e.def.amp;
  },

  chaser(e, lvl, p) {
    const d2 = dist2(e.x, e.y, p.x, p.y);
    if (d2 < e.def.sight * e.def.sight) {
      const d = Math.sqrt(d2) || 1;
      e.vx = approach(e.vx, ((p.x - e.x) / d) * e.def.speed * 1.9, 0.05);
      e.vy = approach(e.vy, ((p.y - e.y) / d) * e.def.speed * 1.9, 0.05);
    } else {
      e.vx = approach(e.vx, 0, 0.04);
      e.vy = approach(e.vy, Math.sin(e.frame * 0.04) * 0.3, 0.04);
    }
    e.x += e.vx; e.y += e.vy;
    e.facing = e.vx >= 0 ? 1 : -1;
    e.y = clamp(e.y, 26, lvl.height - 30);
  },

  bat(e, lvl, p) {
    // Sleeps until you get close, then swoops in a wide arc.
    if (!e.woke) {
      if (Math.abs(p.x - e.x) < 90) { e.woke = true; }
      return;
    }
    e.x += e.facing * e.def.speed;
    if (e.x <= e.px) { e.x = e.px; e.facing = 1; }
    if (e.x >= e.py) { e.x = e.py; e.facing = -1; }
    e.y = e.baseY + Math.sin(e.frame * 0.09) * e.def.amp;
  },

  ghost(e, lvl, p) {
    // Drifts through geometry. Slow but relentless — you outrun it.
    const dx = p.x - e.x, dy = p.y - e.y;
    const d = Math.hypot(dx, dy) || 1;
    e.vx = approach(e.vx, (dx / d) * e.def.speed, 0.014);
    e.vy = approach(e.vy, (dy / d) * e.def.speed, 0.014);
    e.x += e.vx; e.y += e.vy;
    e.facing = e.vx >= 0 ? 1 : -1;
    e.alphaPulse = 0.55 + Math.sin(e.frame * 0.06) * 0.2;
  },

  hoverbomb(e, lvl, p, ctx) {
    if (e.state === 'drop') {
      e.vy += lvl.gravity * 0.9;
      e.y += e.vy;
      if (e.onGroundCheck(lvl)) {
        ctx.explode(e, 30);
        e.alive = false;
      }
      return;
    }
    // Track above the player, then drop.
    const dx = p.x - e.x;
    e.x += clamp(dx, -e.def.speed * 1.5, e.def.speed * 1.5);
    e.y = approach(e.y, Math.max(34, p.y - 62), 0.5);
    if (Math.abs(dx) < 10 && ++e.timer > 46) {
      e.state = 'drop';
      e.vy = 0;
    }
  },

  teleporter(e, lvl, p) {
    e.timer--;
    if (e.timer === 22) e.fading = true;
    if (e.timer <= 0) {
      Particles.emitGlitch(e.x + e.w / 2, e.y + e.h / 2);
      // Reappear near the player but never on top of them.
      const side = p.x > e.x ? -1 : 1;
      e.x = clamp(p.x + side * (56 + e.rand() * 40), e.px - 60, e.py + 60);
      e.y = clamp(p.y - 20 + (e.rand() - 0.5) * 50, 32, lvl.height - 40);
      e.timer = e.def.blink;
      e.fading = false;
      Audio.sfx.glitch();
    }
  },

  spinner(e, lvl) {
    // Orbits a fixed anchor — a moving wall you time your way past.
    e.angle += 0.035 * e.def.speed;
    e.x = e.anchorX + Math.cos(e.angle) * e.def.orbit;
    e.y = e.anchorY + Math.sin(e.angle) * e.def.orbit;
    e.spin += 0.2;
  },

  climber(e, lvl) {
    // Runs up and down a vertical track.
    e.y += e.facing * e.def.speed;
    if (e.y <= e.climbTop)    { e.y = e.climbTop;    e.facing = 1; }
    if (e.y >= e.climbBottom) { e.y = e.climbBottom; e.facing = -1; }
  },

  bouncer(e, lvl) {
    e.x += e.vx; e.y += e.vy;
    if (e.x <= e.px)  { e.x = e.px;  e.vx = Math.abs(e.vx); }
    if (e.x >= e.py)  { e.x = e.py;  e.vx = -Math.abs(e.vx); }
    if (e.y <= 30)    { e.y = 30;    e.vy = Math.abs(e.vy); }
    if (e.y >= e.baseY + 6) { e.y = e.baseY + 6; e.vy = -Math.abs(e.vy); }
  },

  shooter(e, lvl, p, ctx) {
    e.gravity(lvl);
    e.patrol(e.def.speed);
    if (Math.abs(p.x - e.x) < e.def.sight && --e.fireTimer <= 0) {
      e.fireTimer = e.def.fireRate;
      const dir = p.x > e.x ? 1 : -1;
      e.facing = dir;
      ctx.fire(e.x + e.w / 2, e.y + e.h / 2, dir * 2.0, -0.4, '#FFD95E', 5);
    }
  },

  turret(e, lvl, p, ctx) {
    const d2 = dist2(e.x, e.y, p.x, p.y);
    if (d2 > e.def.sight * e.def.sight) return;
    const dx = p.x - e.x, dy = p.y - e.y;
    e.aim = Math.atan2(dy, dx);
    e.facing = dx > 0 ? 1 : -1;
    if (--e.fireTimer <= 0) {
      e.burstLeft = e.def.burst;
      e.fireTimer = e.def.fireRate;
    }
    if (e.burstLeft > 0 && e.frame % 9 === 0) {
      e.burstLeft--;
      ctx.fire(e.x + e.w / 2, e.y + e.h / 2,
               Math.cos(e.aim) * 2.4, Math.sin(e.aim) * 2.4, '#FF6B35', 5);
    }
  },

  swimmer(e, lvl) {
    e.x += e.facing * e.def.speed;
    if (e.x <= e.px) { e.x = e.px; e.facing = 1; }
    if (e.x >= e.py) { e.x = e.py; e.facing = -1; }
    e.y = e.baseY + Math.sin(e.frame * 0.07) * e.def.amp;
  },
};

// ENEMY INSTANCE
class GameEnemy {
  constructor(spec, level) {
    this.type = spec.type;
    this.def  = ENEMY_DEFS[spec.type] || ENEMY_DEFS.walker;
    this.x = spec.x; this.y = spec.y;
    this.w = this.def.w; this.h = this.def.h;
    this.px = spec.px !== undefined ? spec.px : spec.x - 50;
    this.py = spec.py !== undefined ? spec.py : spec.x + 50;
    this.baseY = spec.baseY !== undefined ? spec.baseY : spec.y;

    this.hp = this.def.hp;
    this.vx = 0; this.vy = 0;
    this.facing = 1;
    this.frame = 0;
    this.alive = true;
    this.onGround = false;
    this.state = 'idle';
    this.timer = 0;
    this.fireTimer = (this.def.fireRate || 60) >> 1;
    this.burstLeft = 0;
    this.spin = 0;
    this.angle = 0;
    this.buried = this.type === 'burrower' ? 1 : 0;
    this.harmless = false;
    this.spikeOut = false;
    this.woke = false;
    this.fading = false;
    this.alphaPulse = 1;
    this.shieldSide = 1;
    this.hitFlash = 0;
    this.frozen = 0;

    // Deterministic per-enemy noise so behaviour varies without Math.random.
    this._seed = hashSeed(`${spec.type}:${spec.x}:${spec.y}`);

    // Type-specific setup
    if (this.type === 'spinner') {
      this.anchorX = this.x; this.anchorY = this.y;
    }
    if (this.type === 'climber') {
      this.climbTop = Math.max(30, this.y - 60);
      this.climbBottom = this.y;
    }
    if (this.type === 'bouncer') {
      this.vx = this.def.speed; this.vy = this.def.speed * 0.8;
      this.baseY = this.y;
    }
    if (this.type === 'burrower') {
      this.state = 'hidden';
      this.baseY = this.y;
      this.y = this.baseY + this.h;
    }
  }

  rand() {
    this._seed = (Math.imul(this._seed ^ (this._seed >>> 15), 2246822507) + 1) >>> 0;
    return (this._seed >>> 8) / 16777216;
  }
  rngSign() { return this.rand() < 0.5 ? -1 : 1; }

  patrol(speed) {
    this.x += this.facing * speed;
    if (this.x <= this.px) { this.x = this.px; this.facing = 1; }
    if (this.x >= this.py) { this.x = this.py; this.facing = -1; }
  }

  gravity(lvl) {
    this.vy += lvl.gravity;
    if (this.vy > MAX_FALL) this.vy = MAX_FALL;
    this.y += this.vy;
    this.onGround = false;
    this._land(lvl);
  }

  _land(lvl) {
    for (const g of lvl.grounds) {
      if (this.x + this.w > g.x && this.x < g.x + g.w) {
        if (this.vy >= 0 && this.y + this.h > g.y && this.y + this.h < g.y + 24) {
          this.y = g.y - this.h; this.vy = 0; this.onGround = true;
        }
      }
    }
    for (const p of lvl.platforms) {
      if (p.type === 'ceiling' || p.gone) continue;
      if (this.x + this.w > p.x && this.x < p.x + p.w) {
        if (this.vy >= 0 && this.y + this.h > p.y && this.y + this.h < p.y + p.h + 14) {
          const prev = this.y + this.h - this.vy;
          if (prev <= p.y + 2) { this.y = p.y - this.h; this.vy = 0; this.onGround = true; }
        }
      }
    }
  }

  onGroundCheck(lvl) {
    for (const g of lvl.grounds) {
      if (this.x + this.w > g.x && this.x < g.x + g.w && this.y + this.h >= g.y) return true;
    }
    for (const p of lvl.platforms) {
      if (p.type === 'ceiling' || p.gone) continue;
      if (this.x + this.w > p.x && this.x < p.x + p.w &&
          this.y + this.h >= p.y && this.y + this.h < p.y + p.h + 10) return true;
    }
    return this.y > lvl.height;
  }

  update(lvl, player, ctx) {
    if (!this.alive) return;
    this.frame++;
    if (this.hitFlash > 0) this.hitFlash--;

    // Frost Core: held in place, but still falls, so it can't hover mid-air.
    if (this.frozen > 0) {
      this.frozen--;
      if (!this.def.fly) this.gravity(lvl);
      return;
    }

    const fn = ENEMY_BEHAVIOUR[this.type];
    if (fn) fn(this, lvl, player, ctx);
    if (this.y > lvl.height + 60) this.alive = false;
  }

  /** Returns true if the hit killed it. */
  damage(amount, ctx) {
    this.hp -= amount;
    this.hitFlash = 8;
    if (this.hp <= 0) {
      this.alive = false;
      Particles.emitExplosion(this.x + this.w / 2, this.y + this.h / 2);
      Audio.sfx.explosion();
      if (this.def.splits && ctx) ctx.split(this);
      return true;
    }
    Audio.sfx.bossHit();
    return false;
  }

  /** Can the player stomp this from above right now? */
  canStomp() {
    if (!this.def.stompable) return false;
    if (this.type === 'spiker' && this.spikeOut) return false;
    if (this.type === 'burrower' && this.buried > 0.4) return false;
    return true;
  }

  get bounds() { return { x: this.x, y: this.y, w: this.w, h: this.h }; }

  get dangerous() {
    if (this.harmless) return false;
    if (this.type === 'burrower' && this.buried > 0.6) return false;
    return true;
  }
}

// ENEMY RENDERING
// One parameterised drawer covers every enemy. `look` decides the silhouette,
// so a bat and a turret read as completely different creatures.

function drawEnemy(ctx, e, camX, camY) {
  if (!e.alive) return;
  const L = e.def.look;
  const x = Math.round(e.x - camX);
  const y = Math.round(e.y - camY);
  const w = e.w, h = e.h;
  const t = e.frame;

  ctx.save();
  ctx.translate(x, y);

  if (e.type === 'ghost') ctx.globalAlpha = e.alphaPulse;
  if (e.fading) ctx.globalAlpha = 0.35;
  if (e.state === 'fuse') {
    // Flash faster as the fuse burns down.
    const rate = Math.max(2, Math.floor(e.timer / 6));
    if (Math.floor(t / rate) % 2 === 0) ctx.globalAlpha *= 0.55;
  }

  const flip = e.facing < 0;
  if (flip) { ctx.translate(w, 0); ctx.scale(-1, 1); }

  const body = e.hitFlash > 0 ? '#FFFFFF' : L.body;

  // Wings behind the body
  if (L.wings) {
    const flap = Math.sin(t * 0.35) * 3;
    ctx.fillStyle = L.accent;
    ctx.fillRect(-5, 3 + flap, 6, 3);
    ctx.fillRect(w - 1, 3 - flap, 6, 3);
  }
  if (L.prop) {
    const s = Math.floor(t * 0.5) % 2;
    ctx.fillStyle = L.accent;
    ctx.fillRect(-4, 1 + s, w + 8, 1);
  }

  // Silhouette
  ctx.fillStyle = body;
  switch (L.shape) {
    case 'round':
      ctx.fillRect(2, 0, w - 4, h);
      ctx.fillRect(0, 2, w, h - 4);
      break;
    case 'tall':
      ctx.fillRect(2, 0, w - 4, h);
      ctx.fillRect(1, 3, w - 2, h - 5);
      break;
    case 'wide':
      ctx.fillRect(0, 2, w, h - 4);
      ctx.fillRect(2, 0, w - 4, h);
      break;
    case 'box':
      ctx.fillRect(0, 0, w, h);
      break;
    case 'ghost': {
      ctx.fillRect(1, 0, w - 2, h - 4);
      ctx.fillRect(0, 3, w, h - 7);
      // Ragged hem
      for (let i = 0; i < w; i += 4) {
        const d = (Math.sin(t * 0.1 + i) > 0) ? 3 : 1;
        ctx.fillRect(i, h - 4, 3, d);
      }
      break;
    }
    default: // blob
      ctx.fillRect(1, 1, w - 2, h - 1);
      ctx.fillRect(3, 0, w - 6, h);
  }

  // Shading
  ctx.fillStyle = L.accent;
  ctx.fillRect(1, h - 4, w - 2, 3);

  // Armour plating
  if (L.plate) {
    ctx.fillStyle = '#AEBACA';
    ctx.fillRect(2, 3, w - 4, 4);
    ctx.fillStyle = L.accent;
    ctx.fillRect(2, 7, w - 4, 1);
  }

  // Spikes
  if (L.spikes) {
    const out = (e.type === 'spiker') ? (e.spikeOut ? 4 : 1) : 3;
    ctx.fillStyle = e.type === 'spiker' && e.spikeOut ? '#FFE066' : L.accent;
    for (let i = 2; i < w - 2; i += 5) {
      ctx.fillRect(i, -out, 2, out);
      ctx.fillRect(i, h, 2, out);
    }
    ctx.fillRect(-out, 4, out, 2);
    ctx.fillRect(w, 4, out, 2);
  }

  // Legs
  if (L.legs) {
    ctx.fillStyle = L.accent;
    const step = Math.floor(t * 0.2) % 2;
    const n = L.legs;
    for (let i = 0; i < n; i++) {
      const lx = 2 + i * Math.max(3, (w - 6) / Math.max(1, n - 1));
      ctx.fillRect(lx, h, 2, 2 + ((i + step) % 2));
    }
  }

  // Horn / barrel / fin
  if (L.horn) {
    ctx.fillStyle = '#FFF2C4';
    ctx.fillRect(w - 3, -3, 2, 4);
  }
  if (L.barrel) {
    ctx.fillStyle = L.accent;
    if (e.type === 'turret' && e.aim !== undefined) {
      const bx = Math.cos(e.facing < 0 ? Math.PI - e.aim : e.aim) * 7;
      const by = Math.sin(e.aim) * 7;
      ctx.fillRect(w / 2 + bx - 2, h / 2 + by - 2, 5, 4);
    } else {
      ctx.fillRect(w - 2, 5, 5, 3);
    }
  }
  if (L.fin) {
    ctx.fillStyle = L.accent;
    ctx.fillRect(-4, 3, 4, 5);
    ctx.fillRect(w / 2 - 2, -3, 4, 3);
  }
  if (L.fuseWick) {
    ctx.fillStyle = '#3A2A1A';
    ctx.fillRect(w / 2 - 1, -4, 2, 4);
    ctx.fillStyle = (t >> 2) % 2 ? '#FFE066' : '#FF6B35';
    ctx.fillRect(w / 2 - 1, -6, 2, 2);
  }

  // Eyes
  if (L.eye) {
    ctx.fillStyle = L.eye;
    const ey = Math.floor(h * 0.32);
    ctx.fillRect(Math.floor(w * 0.52), ey, 3, 3);
    if (L.shape !== 'wide') ctx.fillRect(Math.floor(w * 0.22), ey, 3, 3);
    ctx.fillStyle = '#111';
    ctx.fillRect(Math.floor(w * 0.53) + 1, ey + 1, 1, 1);
    if (L.shape !== 'wide') ctx.fillRect(Math.floor(w * 0.23) + 1, ey + 1, 1, 1);
  }

  ctx.restore();

  // Frozen: encased in ice
  if (e.frozen > 0) {
    ctx.save();
    // Flash as it is about to thaw.
    ctx.globalAlpha = e.frozen < 40 && (t >> 2) % 2 === 0 ? 0.25 : 0.55;
    ctx.fillStyle = '#9AD8F5';
    ctx.fillRect(x - 2, y - 2, w + 4, h + 4);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(x - 1, y - 1, 2, 3);
    ctx.fillRect(x + w - 2, y + h - 3, 2, 3);
    ctx.restore();
  }

  // Shield (drawn unflipped so it can face the player)
  if (L.shield) {
    ctx.save();
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = '#9AD8F5';
    const sx = e.shieldSide > 0 ? x + w : x - 4;
    ctx.fillRect(sx, y + 1, 4, h - 2);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(sx + 1, y + 3, 2, 3);
    ctx.restore();
  }

  // Spin overlay for rollers and saw blades
  if (L.spin) {
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = '#FFFFFF';
    const a = e.spin;
    ctx.fillRect(x + w / 2 + Math.cos(a) * (w / 3) - 1,
                 y + h / 2 + Math.sin(a) * (h / 3) - 1, 2, 2);
    ctx.fillRect(x + w / 2 - Math.cos(a) * (w / 3) - 1,
                 y + h / 2 - Math.sin(a) * (h / 3) - 1, 2, 2);
    ctx.restore();
  }

  ctx.globalAlpha = 1;
}
