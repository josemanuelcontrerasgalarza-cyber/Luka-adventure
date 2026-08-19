'use strict';

// BOSS SYSTEM
// A boss is a definition: size, HP, look, and a list of phases. Each phase
// names the attacks it rotates through and how aggressive it is. Attacks are
// reusable routines, so 18 bosses share one engine but fight differently.

// Reusable attack routines
// Each attack is { enter(b), tick(b, ctx), duration } — `b` is the boss.

const BOSS_ATTACKS = {

  // Barrels across the arena, turning at the walls.
  charge: {
    duration: 110,
    enter(b) { b.telegraph = 28; b.vx = 0; },
    tick(b, ctx) {
      if (b.telegraph > 0) { b.telegraph--; b.vx *= 0.8; return; }
      if (b.vx === 0) b.vx = (ctx.player.x > b.x ? 1 : -1) * (2.4 + b.phase * 0.8);
      b.x += b.vx;
      if (b.x <= 16) { b.x = 16; b.vx = Math.abs(b.vx); ctx.shake(10); }
      if (b.x + b.w >= ctx.level.width - 16) {
        b.x = ctx.level.width - 16 - b.w; b.vx = -Math.abs(b.vx); ctx.shake(10);
      }
    },
  },

  // Leaps and slams down, sending shockwaves along the floor.
  slam: {
    duration: 120,
    enter(b) { b.vy = -8.5 - b.phase * 0.4; b.slammed = false; },
    tick(b, ctx) {
      if (!b.slammed && b.onGround && b.vy === 0 && b.stateAge > 12) {
        b.slammed = true;
        ctx.shake(24);
        Audio.sfx.explosion();
        Particles.emitExplosion(b.x + b.w / 2, b.y + b.h);
        for (const dir of [-1, 1]) {
          ctx.fire(b.x + b.w / 2, b.y + b.h - 6, dir * 2.6, -0.8, '#FF8C42', 7);
        }
      }
      // Drift toward the player while airborne.
      if (!b.onGround) b.x += clamp(ctx.player.x - b.x, -1.6, 1.6);
    },
  },

  // Fan of projectiles.
  spread: {
    duration: 92,
    enter(b) { b.shots = 0; },
    tick(b, ctx) {
      if (b.stateAge % 30 !== 0 || b.shots >= 2 + b.phase) return;
      b.shots++;
      const n = 3 + b.phase;
      for (let i = 0; i < n; i++) {
        const a = Math.PI * 0.15 + (Math.PI * 0.7 / (n - 1)) * i;
        ctx.fire(b.x + b.w / 2, b.y + b.h * 0.5,
                 Math.cos(a) * 2.2 * (ctx.player.x < b.x ? -1 : 1),
                 Math.sin(a) * 1.6, b.projColor, 6);
      }
      Audio.sfx.shoot();
    },
  },

  // Tracks the player and fires straight at them.
  aimed: {
    duration: 96,
    enter(b) { b.shots = 0; },
    tick(b, ctx) {
      if (b.stateAge % 22 !== 0 || b.shots >= 3 + b.phase) return;
      b.shots++;
      const dx = ctx.player.x - (b.x + b.w / 2);
      const dy = ctx.player.y - (b.y + b.h / 2);
      const d = Math.hypot(dx, dy) || 1;
      const sp = 2.4 + b.phase * 0.35;
      ctx.fire(b.x + b.w / 2, b.y + b.h / 2, (dx / d) * sp, (dy / d) * sp, b.projColor, 6);
      Audio.sfx.shoot();
    },
  },

  // Vertical beam: locks onto you, then sweeps across the arena.
  laser: {
    duration: 140,
    enter(b) {
      b.laserX = b.x + b.w / 2;
      b.laserOn = false;
      b.laserDir = 0;
      b.laserWarn = 0;
    },
    tick(b, ctx) {
      const WARN = 44;
      const STOP = 128;               // beam shuts off before the state ends
      if (b.stateAge < WARN) {
        b.laserX = ctx.player.x + PW / 2;        // telegraph tracks you
        b.laserWarn = 1 - b.stateAge / WARN;
      } else if (b.stateAge === WARN) {
        b.laserOn = true;
        b.laserWarn = 0;
        b.laserDir = ctx.player.x > b.x ? -1 : 1; // then sweeps past you
        Audio.sfx.shieldOn();
        ctx.shake(8);
      } else if (b.laserOn) {
        b.laserX += b.laserDir * (0.8 + b.phase * 0.4);
        b.laserX = clamp(b.laserX, 8, ctx.level.width - 8);
        if (b.stateAge >= STOP) b.laserOn = false;
      }
    },
    exit(b) { b.laserOn = false; b.laserWarn = 0; },
  },

  // Calls in minions.
  summon: {
    duration: 100,
    enter(b) { b.summoned = false; },
    tick(b, ctx) {
      if (b.summoned || b.stateAge < 30) return;
      b.summoned = true;
      const n = 1 + b.phase;
      for (let i = 0; i < n; i++) {
        ctx.summon(b.minion, b.x + b.w / 2 + (i - n / 2) * 30, b.y + b.h - 20);
      }
      Audio.sfx.bossPhase();
    },
  },

  // Slow homing orbs — you have to keep moving.
  homing: {
    duration: 110,
    enter(b) { b.shots = 0; },
    tick(b, ctx) {
      if (b.stateAge % 34 !== 0 || b.shots >= 2 + b.phase) return;
      b.shots++;
      ctx.fire(b.x + b.w / 2, b.y + b.h / 2, 0, -1.2, b.projColor, 7, { homing: 0.045 });
      Audio.sfx.shoot();
    },
  },

  // Rain from above, telegraphed by falling markers.
  rain: {
    duration: 130,
    enter(b) { b.drops = 0; },
    tick(b, ctx) {
      if (b.stateAge % 16 !== 0 || b.drops >= 5 + b.phase * 2) return;
      b.drops++;
      const x = 30 + b.rand() * (ctx.level.width - 60);
      ctx.fire(x, 20, 0, 1.6 + b.phase * 0.3, b.projColor, 6);
    },
  },

  // Blinks to a new spot, then attacks — Void-flavoured.
  blink: {
    duration: 90,
    enter(b) { b.blinked = false; },
    tick(b, ctx) {
      if (b.blinked || b.stateAge < 26) return;
      b.blinked = true;
      Particles.emitGlitch(b.x + b.w / 2, b.y + b.h / 2);
      const side = ctx.player.x > ctx.level.width / 2 ? -1 : 1;
      b.x = clamp(ctx.level.width / 2 + side * 140 - b.w / 2, 16, ctx.level.width - 16 - b.w);
      Particles.emitGlitch(b.x + b.w / 2, b.y + b.h / 2);
      Audio.sfx.glitch();
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI * 2 / 6) * i;
        ctx.fire(b.x + b.w / 2, b.y + b.h / 2, Math.cos(a) * 2, Math.sin(a) * 2, b.projColor, 6);
      }
    },
  },

  // Turns invulnerable and recovers a sliver — only in final phases.
  guard: {
    duration: 90,
    enter(b) { b.guarding = true; },
    tick(b, ctx) {
      if (b.stateAge % 20 === 0) {
        ctx.fire(b.x + b.w / 2, b.y + b.h / 2,
                 (ctx.player.x > b.x ? 1 : -1) * 2.6, -0.5, b.projColor, 5);
      }
    },
    exit(b) { b.guarding = false; },
  },

  // A breather. Every good boss gives you a window.
  rest: {
    duration: 70,
    enter(b) { b.vulnerable = true; },
    tick(b) { b.vx *= 0.85; },
    exit(b) { b.vulnerable = false; },
  },
};

// Boss roster
// look.form drives the silhouette; phases drive the fight.

const BOSS_DEFS = {
  // MINI-BOSSES (one per world)
  thistle: {
    name: 'CARDO', title: 'Guardián del Prado', hp: 60, w: 40, h: 40, mini: true,
    look: { form: 'beast', body: '#6E9B4A', accent: '#3F6B2A', eye: '#FFE066' },
    proj: '#A8D06A', minion: 'walker',
    phases: [{ attacks: ['charge', 'rest', 'spread'] },
             { attacks: ['charge', 'aimed', 'summon', 'rest'] }],
  },
  sand_wraith: {
    name: 'ESPECTRO DE ARENA', title: 'Sombra de las Dunas', hp: 75, w: 38, h: 44, mini: true,
    look: { form: 'wraith', body: '#D9B072', accent: '#9C7440', eye: '#FF8C42' },
    proj: '#F0D9A8', minion: 'burrower',
    phases: [{ attacks: ['blink', 'aimed', 'rest'] },
             { attacks: ['blink', 'spread', 'summon', 'rest'] }],
  },
  shard_hound: {
    name: 'SABUESO DE ESQUIRLA', title: 'Cazador de la Mina', hp: 85, w: 44, h: 34, mini: true,
    look: { form: 'beast', body: '#5C5470', accent: '#332E42', eye: '#5FF3D1' },
    proj: '#8FE3F0', minion: 'bat',
    phases: [{ attacks: ['charge', 'charge', 'rest'] },
             { attacks: ['charge', 'slam', 'spread', 'rest'] }],
  },
  moss_stalker: {
    name: 'ACECHADOR DE MUSGO', title: 'Ojo del Bosque', hp: 95, w: 40, h: 46, mini: true,
    look: { form: 'wraith', body: '#3B5E42', accent: '#1E3A2C', eye: '#C77DFF' },
    proj: '#9AE6A0', minion: 'ghost',
    phases: [{ attacks: ['blink', 'homing', 'rest'] },
             { attacks: ['blink', 'summon', 'aimed', 'rest'] }],
  },
  frost_fang: {
    name: 'COLMILLO HELADO', title: 'Bestia del Glaciar', hp: 105, w: 46, h: 38, mini: true,
    look: { form: 'beast', body: '#B4DCEE', accent: '#5A8AB4', eye: '#5FC8F5' },
    proj: '#DCEFFA', minion: 'roller',
    phases: [{ attacks: ['charge', 'rain', 'rest'] },
             { attacks: ['charge', 'slam', 'rain', 'rest'] }],
  },
  gale_sentry: {
    name: 'CENTINELA DEL VENDAVAL', title: 'Ojo de la Tormenta', hp: 115, w: 42, h: 42, mini: true,
    look: { form: 'orb', body: '#E2DCCB', accent: '#A8A292', eye: '#FFE066' },
    proj: '#FFF6D8', minion: 'flyer',
    phases: [{ attacks: ['homing', 'spread', 'rest'] },
             { attacks: ['homing', 'summon', 'laser', 'rest'] }],
  },
  cog_sentinel: {
    name: 'CENTINELA DENTADO', title: 'Vigía de la Fundición', hp: 125, w: 46, h: 44, mini: true,
    look: { form: 'machine', body: '#8A8A9E', accent: '#43434F', eye: '#FF6B35' },
    proj: '#FFB627', minion: 'turret',
    phases: [{ attacks: ['laser', 'aimed', 'rest'] },
             { attacks: ['laser', 'charge', 'summon', 'rest'] }],
  },
  magma_hound: {
    name: 'SABUESO DE MAGMA', title: 'Perro de la Caldera', hp: 135, w: 48, h: 38, mini: true,
    look: { form: 'beast', body: '#7A2617', accent: '#3A1108', eye: '#FFC93C' },
    proj: '#FF7A29', minion: 'exploder',
    phases: [{ attacks: ['charge', 'rain', 'rest'] },
             { attacks: ['charge', 'slam', 'rain', 'summon', 'rest'] }],
  },
  null_echo: {
    name: 'ECO NULO', title: 'Reflejo del Vacío', hp: 150, w: 40, h: 46, mini: true,
    look: { form: 'wraith', body: '#4B2A85', accent: '#1B0F38', eye: '#00F5D4' },
    proj: '#C77DFF', minion: 'teleporter',
    phases: [{ attacks: ['blink', 'homing', 'rest'] },
             { attacks: ['blink', 'spread', 'laser', 'rest'] },
             { attacks: ['blink', 'homing', 'summon', 'aimed'] }],
  },

  // WORLD BOSSES
  stone_guardian: {
    name: 'GUARDIÁN DE PIEDRA', title: 'Custodio de las Ruinas', hp: 120, w: 56, h: 58,
    look: { form: 'golem', body: '#8A7A5E', accent: '#5A4A34', eye: '#FFD95E' },
    proj: '#C0A870', minion: 'walker',
    phases: [
      { attacks: ['charge', 'rest', 'spread', 'rest'] },
      { attacks: ['slam', 'charge', 'aimed', 'rest'] },
      { attacks: ['slam', 'spread', 'summon', 'charge', 'rest'] },
    ],
  },
  scorpion_mk2: {
    name: 'ESCORPIÓN MK-II', title: 'Máquina de las Dunas', hp: 145, w: 60, h: 50,
    look: { form: 'machine', body: '#C4813F', accent: '#7A4A18', eye: '#FF4433' },
    proj: '#FF8C42', minion: 'roller',
    phases: [
      { attacks: ['charge', 'aimed', 'rest'] },
      { attacks: ['charge', 'rain', 'spread', 'rest'] },
      { attacks: ['laser', 'charge', 'rain', 'summon', 'rest'] },
    ],
  },
  crystal_golem: {
    name: 'GÓLEM DE CRISTAL', title: 'Corazón de la Mina', hp: 170, w: 58, h: 60,
    look: { form: 'golem', body: '#5C5470', accent: '#2E2A3E', eye: '#5FF3D1' },
    proj: '#8FE3F0', minion: 'bat',
    phases: [
      { attacks: ['slam', 'spread', 'rest'] },
      { attacks: ['slam', 'charge', 'rain', 'rest'] },
      { attacks: ['slam', 'laser', 'summon', 'spread', 'rest'] },
    ],
  },
  ancient_bloom: {
    name: 'FLOR ANCESTRAL', title: 'Raíz del Bosque', hp: 195, w: 56, h: 62,
    look: { form: 'bloom', body: '#3B5E42', accent: '#1E3A2C', eye: '#C77DFF' },
    proj: '#9AE6A0', minion: 'ghost',
    phases: [
      { attacks: ['homing', 'summon', 'rest'] },
      { attacks: ['homing', 'rain', 'blink', 'rest'] },
      { attacks: ['homing', 'laser', 'summon', 'spread', 'rest'] },
    ],
  },
  ice_titan: {
    name: 'TITÁN DE HIELO', title: 'Señor del Glaciar', hp: 220, w: 62, h: 64,
    look: { form: 'golem', body: '#B4DCEE', accent: '#5A8AB4', eye: '#5FC8F5' },
    proj: '#DCEFFA', minion: 'roller',
    phases: [
      { attacks: ['slam', 'rain', 'rest'] },
      { attacks: ['slam', 'charge', 'rain', 'spread', 'rest'] },
      { attacks: ['slam', 'laser', 'rain', 'summon', 'charge'] },
    ],
  },
  celestial_warden: {
    name: 'GUARDIÁN CELESTE', title: 'Centinela de las Nubes', hp: 245, w: 58, h: 58,
    look: { form: 'orb', body: '#E2DCCB', accent: '#8A8272', eye: '#FFE066' },
    proj: '#FFF6D8', minion: 'flyer',
    phases: [
      { attacks: ['homing', 'spread', 'rest'] },
      { attacks: ['laser', 'homing', 'summon', 'rest'] },
      { attacks: ['laser', 'rain', 'homing', 'blink', 'spread'] },
    ],
  },
  foundry_engine: {
    name: 'MOTOR DE FUNDICIÓN', title: 'Corazón de la Ciudad', hp: 275, w: 64, h: 62,
    look: { form: 'machine', body: '#6B6B7B', accent: '#33333F', eye: '#FF6B35' },
    proj: '#FFB627', minion: 'turret',
    phases: [
      { attacks: ['laser', 'aimed', 'rest'] },
      { attacks: ['laser', 'charge', 'summon', 'spread', 'rest'] },
      { attacks: ['laser', 'rain', 'charge', 'summon', 'aimed'] },
    ],
  },
  ashborn: {
    name: 'NACIDO DE CENIZA', title: 'Demonio del Abismo', hp: 305, w: 62, h: 66,
    look: { form: 'demon', body: '#7A2617', accent: '#3A1108', eye: '#FFC93C' },
    proj: '#FF7A29', minion: 'exploder',
    phases: [
      { attacks: ['slam', 'rain', 'rest'] },
      { attacks: ['slam', 'charge', 'rain', 'spread', 'rest'] },
      { attacks: ['slam', 'laser', 'rain', 'summon', 'homing'] },
    ],
  },

  // THE FINAL BOSS
  void_king: {
    name: 'THE VOID KING', title: 'El que deshace', hp: 420, w: 68, h: 72,
    look: { form: 'void', body: '#4B2A85', accent: '#0E0820', eye: '#00F5D4' },
    proj: '#C77DFF', minion: 'teleporter',
    final: true,
    // Five acts — the fight visibly escalates and the arena changes with it.
    phases: [
      { attacks: ['spread', 'aimed', 'rest'],                          arena: 'calm'  },
      { attacks: ['blink', 'homing', 'spread', 'rest'],                arena: 'tilt'  },
      { attacks: ['laser', 'rain', 'blink', 'summon', 'rest'],         arena: 'storm' },
      { attacks: ['laser', 'homing', 'rain', 'charge', 'summon'],      arena: 'chaos' },
      { attacks: ['blink', 'laser', 'rain', 'spread', 'homing', 'summon'], arena: 'collapse' },
    ],
  },
};

// BOSS INSTANCE
class GameBoss {
  constructor(defId, level, hardMode) {
    this.def = BOSS_DEFS[defId] || BOSS_DEFS.stone_guardian;
    this.id = defId;
    this.w = this.def.w;
    this.h = this.def.h;
    this.x = level.width / 2 - this.w / 2;
    this.y = level.height - 30 - this.h;

    this.maxHp = Math.round(this.def.hp * (hardMode ? 1.35 : 1));
    this.hp = this.maxHp;
    this.phaseCount = this.def.phases.length;
    this.phase = 1;

    this.vx = 0; this.vy = 0;
    this.onGround = false;
    this.frame = 0;
    this.alive = true;
    this.defeated = false;
    this.dying = false;
    this.deathTimer = 0;

    this.attack = null;
    this.attackName = null;
    this.stateAge = 0;
    this.queue = [];
    this.intro = 96;
    this.hitFlash = 0;
    this.telegraph = 0;
    this.guarding = false;
    this.vulnerable = false;
    this.projColor = this.def.proj || '#FFD95E';
    this.minion = this.def.minion || 'walker';

    this.laserOn = false;
    this.laserX = 0;
    this.laserWarn = 0;

    this._seed = hashSeed(defId);
  }

  rand() {
    this._seed = (Math.imul(this._seed ^ (this._seed >>> 15), 2246822507) + 1) >>> 0;
    return (this._seed >>> 8) / 16777216;
  }

  get phaseDef() { return this.def.phases[clamp(this.phase - 1, 0, this.phaseCount - 1)]; }
  get arenaMood() { return this.phaseDef.arena || null; }

  /** HP fraction at which each phase begins. */
  _phaseForHp() {
    const frac = this.hp / this.maxHp;
    const step = 1 / this.phaseCount;
    const p = this.phaseCount - Math.floor(frac / step);
    return clamp(p, 1, this.phaseCount);
  }

  _nextAttack() {
    if (!this.queue.length) {
      this.queue = this.phaseDef.attacks.slice();
      // Deterministic-ish rotation so fights don't feel scripted.
      if (this.queue.length > 2 && this.rand() < 0.5) this.queue.push(this.queue.shift());
    }
    this.attackName = this.queue.shift();
    this.attack = BOSS_ATTACKS[this.attackName] || BOSS_ATTACKS.rest;
    this.stateAge = 0;
    if (this.attack.enter) this.attack.enter(this);
  }

  update(ctx) {
    if (!this.alive) return null;
    this.frame++;
    if (this.hitFlash > 0) this.hitFlash--;

    if (this.dying) {
      this.deathTimer--;
      this.vx *= 0.9;
      if (this.frame % 6 === 0) {
        Particles.emitExplosion(this.x + this.rand() * this.w, this.y + this.rand() * this.h);
      }
      if (this.deathTimer <= 0) this.defeated = true;
      return null;
    }

    // Intro pause so the player can read the arena.
    if (this.intro > 0) { this.intro--; this._physics(ctx); return null; }

    if (!this.attack) this._nextAttack();

    this.stateAge++;
    if (this.attack.tick) this.attack.tick(this, ctx);
    if (this.stateAge >= this.attack.duration) {
      if (this.attack.exit) this.attack.exit(this);
      this.attack = null;
    }

    this._physics(ctx);

    // Contact damage
    if (this._touches(ctx.player)) return 'damage';

    // Laser column damage
    if (this.laserOn) {
      const b = ctx.player.bounds;
      if (b.x + b.w > this.laserX - 3 && b.x < this.laserX + 3) return 'damage';
    }
    return null;
  }

  _physics(ctx) {
    this.vy += ctx.level.gravity * 0.9;
    if (this.vy > 10) this.vy = 10;
    this.y += this.vy;
    const floor = ctx.level.height - 30;
    if (this.y + this.h >= floor) {
      this.y = floor - this.h;
      this.vy = 0;
      this.onGround = true;
    } else {
      this.onGround = false;
    }
    this.x = clamp(this.x, 12, ctx.level.width - 12 - this.w);
  }

  _touches(p) {
    const b = p.bounds;
    return this.x < b.x + b.w - 3 && this.x + this.w > b.x + 3 &&
           this.y < b.y + b.h && this.y + this.h > b.y;
  }

  /** True when the player is falling onto the boss's head. */
  isStompedBy(p) {
    return p.vy > 0 &&
           p.y + PH < this.y + 16 &&
           p.y + PH > this.y - 8 &&
           p.x + PW > this.x + 6 &&
           p.x < this.x + this.w - 6;
  }

  damage(amount) {
    if (this.dying || this.guarding || this.intro > 0) return false;
    this.hp = Math.max(0, this.hp - amount);
    this.hitFlash = 10;
    Audio.sfx.bossHit();
    Particles.emitBossHit(this.x + this.w / 2, this.y + this.h / 3);

    if (this.hp <= 0) {
      this.dying = true;
      this.deathTimer = this.def.final ? 240 : 150;
      this.laserOn = false;
      Audio.sfx.explosion();
      return true;
    }
    const np = this._phaseForHp();
    if (np > this.phase) {
      this.phase = np;
      this.queue = [];
      this.attack = null;
      Audio.sfx.bossPhase();
      Particles.emitExplosion(this.x + this.w / 2, this.y + this.h / 2);
    }
    return false;
  }

  // Rendering
  draw(ctx2d, camX, camY) {
    if (this.defeated) return;
    const L = this.def.look;
    const shake = this.dying || this.phase >= 3 ? (this.rand() * 3 - 1.5) : 0;
    const x = Math.round(this.x - camX + shake);
    const y = Math.round(this.y - camY);
    const w = this.w, h = this.h;
    const t = this.frame;

    // Laser column
    if (this.laserWarn > 0 && !this.laserOn) {
      ctx2d.globalAlpha = 0.35 * this.laserWarn;
      ctx2d.fillStyle = '#FF4433';
      ctx2d.fillRect(Math.round(this.laserX - camX - 2), 0, 4, VH);
      ctx2d.globalAlpha = 1;
    }
    if (this.laserOn) {
      ctx2d.globalAlpha = 0.9;
      ctx2d.fillStyle = this.projColor;
      ctx2d.fillRect(Math.round(this.laserX - camX - 3), 0, 6, VH);
      ctx2d.fillStyle = '#FFFFFF';
      ctx2d.fillRect(Math.round(this.laserX - camX - 1), 0, 2, VH);
      ctx2d.globalAlpha = 1;
    }

    ctx2d.save();
    ctx2d.translate(x, y);

    if (this.intro > 0) ctx2d.globalAlpha = 0.4 + 0.6 * (1 - this.intro / 96);
    if (this.dying && (t >> 2) % 2 === 0) ctx2d.globalAlpha = 0.5;

    const body = this.hitFlash > 0 ? '#FFFFFF' : L.body;
    const acc  = this.hitFlash > 0 ? '#DDDDDD' : L.accent;

    // Silhouette by form
    switch (L.form) {
      case 'golem':
        ctx2d.fillStyle = acc;  ctx2d.fillRect(0, h * 0.2, w, h * 0.8);
        ctx2d.fillStyle = body; ctx2d.fillRect(4, h * 0.24, w - 8, h * 0.7);
        ctx2d.fillStyle = acc;  ctx2d.fillRect(w * 0.2, 0, w * 0.6, h * 0.26);
        // Fists
        ctx2d.fillStyle = body;
        ctx2d.fillRect(-8, h * 0.34 + Math.sin(t * 0.05) * 4, 10, 14);
        ctx2d.fillRect(w - 2, h * 0.34 + Math.cos(t * 0.05) * 4, 10, 14);
        break;

      case 'machine':
        ctx2d.fillStyle = acc;  ctx2d.fillRect(0, 0, w, h);
        ctx2d.fillStyle = body; ctx2d.fillRect(3, 3, w - 6, h - 10);
        ctx2d.fillStyle = acc;
        for (let i = 0; i < w; i += 10) ctx2d.fillRect(i + ((t * 2) % 10) - 5, h - 7, 6, 4);
        ctx2d.fillStyle = '#FFB627';
        ctx2d.fillRect(w * 0.15, h * 0.6, w * 0.7, 3);
        break;

      case 'beast':
        ctx2d.fillStyle = body; ctx2d.fillRect(2, h * 0.25, w - 4, h * 0.6);
        ctx2d.fillRect(w * 0.55, h * 0.05, w * 0.42, h * 0.4);   // head
        ctx2d.fillStyle = acc;
        ctx2d.fillRect(4, h * 0.85, 8, h * 0.15);
        ctx2d.fillRect(w - 14, h * 0.85, 8, h * 0.15);
        ctx2d.fillRect(w * 0.6, h * 0.02, 5, 6);                 // ears
        ctx2d.fillRect(w * 0.85, h * 0.02, 5, 6);
        break;

      case 'wraith': {
        ctx2d.fillStyle = body;
        ctx2d.fillRect(w * 0.1, 0, w * 0.8, h * 0.75);
        for (let i = 0; i < w; i += 5) {
          const d = 6 + Math.sin(t * 0.08 + i * 0.4) * 5;
          ctx2d.fillRect(i, h * 0.7, 4, d);
        }
        ctx2d.fillStyle = acc;
        ctx2d.fillRect(w * 0.16, h * 0.1, w * 0.68, h * 0.2);
        break;
      }

      case 'orb': {
        const r = w / 2;
        ctx2d.fillStyle = body;
        for (let dy = -r; dy <= r; dy++) {
          const dx = Math.sqrt(Math.max(0, r * r - dy * dy)) | 0;
          ctx2d.fillRect(r - dx, r + dy, dx * 2, 1);
        }
        ctx2d.fillStyle = acc;
        const ring = (t * 0.03);
        for (let i = 0; i < 8; i++) {
          const a = ring + (Math.PI * 2 / 8) * i;
          ctx2d.fillRect(r + Math.cos(a) * (r + 5) - 2, r + Math.sin(a) * (r + 5) - 2, 4, 4);
        }
        break;
      }

      case 'bloom':
        ctx2d.fillStyle = acc;  ctx2d.fillRect(w * 0.35, h * 0.4, w * 0.3, h * 0.6);
        ctx2d.fillStyle = body;
        for (let i = 0; i < 6; i++) {
          const a = (t * 0.01) + (Math.PI * 2 / 6) * i;
          ctx2d.fillRect(w / 2 + Math.cos(a) * 16 - 7, h * 0.28 + Math.sin(a) * 12 - 7, 14, 14);
        }
        ctx2d.fillStyle = acc;
        ctx2d.fillRect(w * 0.32, h * 0.2, w * 0.36, h * 0.24);
        break;

      case 'demon':
        ctx2d.fillStyle = body; ctx2d.fillRect(2, h * 0.2, w - 4, h * 0.8);
        ctx2d.fillStyle = acc;
        ctx2d.fillRect(w * 0.1, 0, 6, h * 0.26);                 // horns
        ctx2d.fillRect(w * 0.8, 0, 6, h * 0.26);
        ctx2d.fillStyle = '#FF7A29';
        for (let i = 0; i < 4; i++) {
          ctx2d.fillRect(6 + i * (w / 4), h * 0.45 + Math.sin(t * 0.1 + i) * 3, 4, 12);
        }
        break;

      case 'void':
      default: {
        // A hole in reality with a crown.
        ctx2d.fillStyle = '#000000';
        ctx2d.fillRect(2, 4, w - 4, h - 6);
        ctx2d.fillStyle = body;
        for (let i = 0; i < 14; i++) {
          const a = t * 0.02 + i * 0.9;
          const rr = 6 + (i % 5) * 5;
          ctx2d.fillRect(w / 2 + Math.cos(a) * rr - 2, h / 2 + Math.sin(a * 1.3) * rr - 2, 4, 4);
        }
        ctx2d.fillStyle = acc;
        ctx2d.fillRect(0, h * 0.9, w, h * 0.1);
        // Crown
        ctx2d.fillStyle = this.projColor;
        for (let i = 0; i < 5; i++) ctx2d.fillRect(6 + i * (w - 12) / 4 - 2, -8, 4, 10);
        ctx2d.fillRect(4, -2, w - 8, 4);
        break;
      }
    }

    // Eyes
    const pulse = 0.6 + Math.sin(t * 0.09) * 0.4;
    ctx2d.globalAlpha *= 1;
    ctx2d.fillStyle = L.eye;
    const ew = Math.max(4, w * 0.13);
    const ey = h * 0.18;
    ctx2d.fillRect(w * 0.26, ey, ew, ew * 0.8);
    ctx2d.fillRect(w * 0.62, ey, ew, ew * 0.8);
    ctx2d.globalAlpha = pulse;
    ctx2d.fillStyle = '#FFFFFF';
    ctx2d.fillRect(w * 0.27, ey + 1, 2, 2);
    ctx2d.fillRect(w * 0.63, ey + 1, 2, 2);
    ctx2d.globalAlpha = 1;

    // Telegraph flash before a charge
    if (this.telegraph > 0 && (t >> 2) % 2 === 0) {
      ctx2d.globalAlpha = 0.3;
      ctx2d.fillStyle = '#FF4433';
      ctx2d.fillRect(0, 0, w, h);
      ctx2d.globalAlpha = 1;
    }
    // Guard shimmer
    if (this.guarding) {
      ctx2d.globalAlpha = 0.35 + Math.sin(t * 0.2) * 0.15;
      ctx2d.fillStyle = '#9AD8F5';
      ctx2d.fillRect(-4, -4, w + 8, h + 8);
      ctx2d.globalAlpha = 1;
    }

    ctx2d.restore();
  }

  /** Health bar and phase pips, drawn in screen space. */
  drawHUD(ctx2d) {
    if (this.defeated) return;
    const barW = 210, barH = 9;
    const bx = (VW - barW) / 2, by = HUD_H + 8;

    ctx2d.fillStyle = 'rgba(0,0,0,0.65)';
    ctx2d.fillRect(bx - 3, by - 11, barW + 6, barH + 15);

    ctx2d.fillStyle = '#2A0A0A';
    ctx2d.fillRect(bx, by, barW, barH);

    const pct = this.hp / this.maxHp;
    const col = this.phase >= this.phaseCount ? '#FF2200'
              : this.phase >= 2               ? '#FF8C42'
                                              : '#FF5555';
    ctx2d.fillStyle = col;
    ctx2d.fillRect(bx, by, Math.round(barW * pct), barH);
    ctx2d.fillStyle = 'rgba(255,255,255,0.22)';
    ctx2d.fillRect(bx, by, Math.round(barW * pct), 3);

    // Phase dividers
    ctx2d.fillStyle = 'rgba(0,0,0,0.55)';
    for (let i = 1; i < this.phaseCount; i++) {
      ctx2d.fillRect(bx + Math.round(barW * (i / this.phaseCount)), by, 1, barH);
    }

    ctx2d.fillStyle = '#FFFFFF';
    ctx2d.font = 'bold 7px monospace';
    ctx2d.textAlign = 'center';
    ctx2d.fillText(this.def.name, VW / 2, by - 3);
    ctx2d.textAlign = 'left';

    ctx2d.fillStyle = '#FFD95E';
    ctx2d.font = '6px monospace';
    ctx2d.fillText(`FASE ${this.phase}/${this.phaseCount}`, bx, by + barH + 8);
  }
}
