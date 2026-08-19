'use strict';

// PROCEDURAL LEVEL GENERATOR
// Deterministic: the same level id always builds the exact same level.
// Levels are assembled from CHUNKS. Every chunk receives the surface the
// player is standing on when they enter, and returns the surface they will
// stand on when they leave. Chunks are forbidden from emitting a jump wider
// or higher than the physics-derived limits, so a generated level is
// completable by construction — there is no "maybe" about it.

const TILE = 16;

const LevelGen = (() => {

  // Build context
  class Builder {
    constructor(opts) {
      this.rng      = opts.rng;
      this.world    = opts.world;
      this.archetype= opts.archetype;
      this.diff     = opts.difficulty;
      this.limits   = opts.limits;
      this.height   = opts.height;
      this.baseY    = opts.height - 30;   // top of the default floor

      this.grounds     = [];
      this.platforms   = [];
      this.hazards     = [];
      this.zones       = [];
      this.enemies     = [];
      this.collectibles= [];
      this.powerups    = [];
      this.checkpoints = [];
      this.decor       = [];
      this.secrets     = [];

      this.x = 0;
      this.y = this.baseY;
      this.surfaces = [];   // every walkable top, for entity placement
    }

    // Emit a solid floor segment and record it as walkable.
    ground(x, y, w) {
      const h = this.height - y;
      this.grounds.push({ x, y, w, h });
      this.surfaces.push({ x, y, w, kind: 'ground' });
      return { x, y, w };
    }

    // Emit a platform. `props` carries behaviour (moving/crumble/…).
    plat(x, y, w, props = {}) {
      const p = Object.assign({ x, y, w, h: 8, type: 'plat' }, props);
      this.platforms.push(p);
      // Only stable platforms are safe places to spawn things on.
      if (!props.crumble && !props.phase && !props.moving) {
        this.surfaces.push({ x, y, w, kind: 'plat' });
      }
      return p;
    }

    hazard(x, y, w, h, kind) {
      this.hazards.push({ x, y, w, h, kind });
    }

    zone(x, y, w, h, kind, extra = {}) {
      this.zones.push(Object.assign({ x, y, w, h, kind }, extra));
    }

    coin(x, y, type = CT.TUNA) {
      this.collectibles.push({ x: Math.round(x), y: Math.round(y), type });
    }

    // A gentle arc of pickups across a gap — the classic "you can make it" cue.
    coinArc(x0, x1, y, peak = 26, n = 5, type = CT.TUNA) {
      for (let i = 0; i < n; i++) {
        const t = n === 1 ? 0.5 : i / (n - 1);
        const cx = lerp(x0, x1, t);
        const cy = y - Math.sin(t * Math.PI) * peak;
        this.coin(cx, cy, type);
      }
    }

    coinRow(x, y, n, spacing = 20, type = CT.TUNA) {
      for (let i = 0; i < n; i++) this.coin(x + i * spacing, y, type);
    }

    // Reach-safe helpers
    // Chunks must never invent a height or a gap the player cannot clear,
    // so heights are always requested through these.

    /** A platform top that is reachable from a surface at `fromY`. */
    liftY(fromY, minLift, maxLift) {
      const cap = Math.floor(this.limits.maxRise * 0.88);
      const lo = Math.min(minLift, cap);
      const hi = Math.min(maxLift, cap);
      const lift = hi <= lo ? lo : this.rng.int(lo, hi);
      return clamp(fromY - lift, 70, this.baseY - 8);
    }

    /** A horizontal gap that is always jumpable on flat ground. */
    safeGap(lo = 0.35, hi = 0.8) {
      return Math.floor(this.limits.maxGap * this.rng.range(lo, hi));
    }

    /**
     * The widest gap still clearable when the landing is `rise` px higher.
     * Height and distance trade against each other in one arc, so a jump that
     * also climbs cannot be as long — this mirrors the reachability test.
     */
    gapBudget(rise) {
      if (rise <= 0) return Math.floor(this.limits.maxGap * 1.15);
      const t = clamp(rise / this.limits.maxRise, 0, 1);
      return Math.floor(this.limits.maxGap * (1 - t * 0.45) * 0.88);
    }
  }

  // Chunk library
  // Each returns the width it consumed. `b.x`/`b.y` are advanced by the caller.

  const CHUNKS = {

    // Plain run of floor. The breathing room between ideas.
    flat(b) {
      const w = b.rng.int(120, 220);
      b.ground(b.x, b.y, w);
      if (b.rng.chance(0.5)) {
        b.coinRow(b.x + 30, b.y - 26, b.rng.int(2, 4));
      }
      return w;
    },

    // A pit you clear in a single jump. The landing height is chosen first,
    // then the width is taken from what that height leaves in the budget.
    gap(b) {
      const x0 = b.x;
      const lead = b.rng.int(50, 90);
      b.ground(x0, b.y, lead);

      const rise = b.rng.int(-24, Math.floor(b.limits.maxRise * 0.5));
      const ly = clamp(b.y - rise, 90, b.baseY);
      const actualRise = b.y - ly;

      const maxW = b.gapBudget(actualRise);
      const gapW = b.rng.int(Math.floor(maxW * 0.5), maxW);
      const landW = b.rng.int(90, 150);

      b.ground(x0 + lead + gapW, ly, landW);
      b.coinArc(x0 + lead + 8, x0 + lead + gapW - 8, Math.min(b.y, ly) - 14);
      b.y = ly;
      return lead + gapW + landW;
    },

    // A wider pit, bridged by stepping stones.
    gapPlatforms(b) {
      const x0 = b.x;
      const lead = b.rng.int(50, 80);
      b.ground(x0, b.y, lead);

      const steps = b.rng.int(2, 3);
      const stepW = b.rng.int(42, 62);
      // Stride is stone width plus a jumpable gap — never more.
      const stride = stepW + b.safeGap(0.4, 0.72);
      let px = x0 + lead + b.safeGap(0.3, 0.6);
      let py = b.y;

      for (let i = 0; i < steps; i++) {
        py = clamp(py + b.rng.int(-16, 10), 86, b.baseY - 14);
        py = Math.max(py, b.liftY(py + 16, 0, 30));   // keep each step in reach
        b.plat(px, py, stepW);
        b.coin(px + stepW / 2 - 4, py - 22);
        px += stride;
      }

      const landX = px - stride + stepW + b.safeGap(0.35, 0.7);
      const landW = b.rng.int(90, 140);
      const ly = clamp(py + b.rng.int(-8, 30), 90, b.baseY);
      b.ground(landX, ly, landW);
      b.y = ly;
      return (landX + landW) - x0;
    },

    // Stepped climb. Each step obeys maxRise.
    stairsUp(b) {
      const steps = b.rng.int(3, 5);
      const stepW = b.rng.int(48, 70);
      const rise  = Math.floor(b.limits.maxRise * b.rng.range(0.42, 0.66));
      let px = b.x, py = b.y;
      for (let i = 0; i < steps; i++) {
        b.plat(px, py, stepW);
        if (b.rng.chance(0.55)) b.coin(px + stepW / 2 - 4, py - 20);
        px += stepW + b.rng.int(10, 26);
        py = Math.max(80, py - rise);
      }
      b.ground(px, py, b.rng.int(80, 120));
      b.y = py;
      return (px + 120) - b.x;
    },

    stairsDown(b) {
      const steps = b.rng.int(3, 4);
      const stepW = b.rng.int(52, 76);
      let px = b.x, py = b.y;
      for (let i = 0; i < steps; i++) {
        b.plat(px, py, stepW);
        px += stepW + b.rng.int(12, 30);
        py = Math.min(b.baseY, py + b.rng.int(18, 34));
      }
      b.ground(px, py, b.rng.int(90, 140));
      b.y = py;
      return (px + 140) - b.x;
    },

    // Floating platforms above solid floor — safe practice, since a miss
    // just drops you back onto the floor.
    platformRun(b) {
      const w = b.rng.int(200, 300);
      b.ground(b.x, b.y, w);
      let px = b.x + b.rng.int(24, 44);
      let py = b.y;
      const n = b.rng.int(2, 4);
      for (let i = 0; i < n; i++) {
        const pw = b.rng.int(44, 70);
        py = b.liftY(i === 0 ? b.y : py, 26, 46);
        b.plat(px, py, pw);
        b.coinRow(px + 10, py - 20, b.rng.int(1, 3), 18);
        px += pw + b.safeGap(0.3, 0.6);
        if (px > b.x + w - 60) break;
      }
      return w;
    },

    // Zig-zag climb — the backbone of vertical levels. The horizontal shift
    // between consecutive ledges is capped by reach, so the zigzag never
    // widens into a jump Luka cannot make.
    tower(b) {
      const pw = b.rng.int(52, 72);
      const shift = Math.floor(b.limits.maxGap * 0.55);
      const jitter = 8;
      const w = pw + shift + jitter + b.rng.int(12, 30);

      b.ground(b.x, b.y, Math.min(w, 84));

      const rise = Math.floor(b.limits.maxRise * b.rng.range(0.48, 0.66));
      const steps = b.rng.int(3, 5);
      const ceil = 72;
      let py = b.y;
      let side = b.rng.chance(0.5) ? 0 : 1;
      let lastX = b.x;

      for (let i = 0; i < steps; i++) {
        const nextY = py - rise;
        if (nextY < ceil) break;              // stop before punching the ceiling
        py = nextY;
        const px = b.x + (side ? shift : 0) + b.rng.int(0, jitter);
        b.plat(px, py, pw);
        b.coin(px + pw / 2 - 4, py - 20);
        lastX = px + pw;
        side ^= 1;
      }

      // Landing shelf sits within reach of the topmost ledge.
      const landX = Math.min(b.x + w, lastX + b.rng.int(8, Math.max(9, shift)));
      b.ground(landX, py, b.rng.int(80, 120));
      b.y = py;
      return (landX + 120) - b.x;
    },

    // Low ceiling forces you to stay grounded.
    corridor(b) {
      const w = b.rng.int(160, 240);
      b.ground(b.x, b.y, w);
      const ceilY = b.y - b.rng.int(40, 52);
      b.platforms.push({ x: b.x, y: ceilY, w, h: 10, type: 'ceiling', solid: true });
      b.coinRow(b.x + 24, b.y - 22, Math.floor(w / 26));
      return w;
    },

    // Moving platforms over a pit. The platform's *nearest* position is what
    // matters for reach, so `from` is always the reachable end.
    movingRun(b) {
      const x0 = b.x;
      const lead = b.rng.int(50, 80);
      b.ground(x0, b.y, lead);

      const n = b.rng.int(1, 2);
      let px = x0 + lead + b.safeGap(0.3, 0.55);
      const span = b.safeGap(0.45, 0.62);

      for (let i = 0; i < n; i++) {
        const pw = b.rng.int(44, 60);
        const py = b.liftY(b.y, 0, 30);
        const vertical = b.rng.chance(0.35);
        b.plat(px, py, pw, {
          moving: true,
          axis: vertical ? 'y' : 'x',
          from: vertical ? py : px,
          to:   vertical ? clamp(py - b.rng.int(36, 60), 70, b.baseY - 10)
                         : px + b.rng.int(40, 70),
          speed: b.rng.range(0.5, 0.95),
          phase: b.rng.range(0, Math.PI * 2),
        });
        px += pw + span;
      }
      const landW = b.rng.int(90, 130);
      b.ground(px, b.y, landW);
      return (px + landW) - x0;
    },

    // Platforms that fall apart under you — keep moving.
    crumbleRun(b) {
      const x0 = b.x;
      const lead = b.rng.int(50, 80);
      b.ground(x0, b.y, lead);

      const n = b.rng.int(3, 4);
      const pw = b.rng.int(38, 52);
      const stride = pw + b.safeGap(0.3, 0.45);
      let px = x0 + lead + b.safeGap(0.25, 0.45);

      for (let i = 0; i < n; i++) {
        b.plat(px, b.liftY(b.y, 0, 20), pw, { crumble: true, crumbleTime: 42 });
        b.coin(px + pw / 2 - 4, b.y - 30);
        px += stride;
      }
      const landW = b.rng.int(90, 130);
      b.ground(px, b.y, landW);
      return (px + landW) - x0;
    },

    // Platforms that blink in and out on a timer.
    phaseRun(b) {
      const x0 = b.x;
      const lead = b.rng.int(50, 80);
      b.ground(x0, b.y, lead);

      const n = b.rng.int(3, 4);
      const pw = b.rng.int(44, 60);
      const stride = pw + b.safeGap(0.28, 0.42);
      let px = x0 + lead + b.safeGap(0.22, 0.4);

      for (let i = 0; i < n; i++) {
        b.plat(px, b.liftY(b.y, 0, 24), pw, {
          phase: true, period: 150, offset: (i % 2) * 75,
        });
        px += stride;
      }
      const landW = b.rng.int(90, 130);
      b.ground(px, b.y, landW);
      return (px + landW) - x0;
    },

    // Ground-level hazard you hop over or platform past.
    hazardRow(b) {
      const lead = b.rng.int(46, 70);
      b.ground(b.x, b.y, lead);
      const hw = b.rng.int(40, Math.floor(b.limits.maxGap * 0.7));
      const kind = b.world.theme === 'volcano' ? 'lava'
                 : b.world.theme === 'cavern'  ? 'spike'
                 : b.world.theme === 'frozen'  ? 'water'
                 : 'spike';
      // Floor continues under the hazard so it reads as a trap, not a pit.
      b.ground(b.x + lead, b.y, hw);
      b.hazard(b.x + lead, b.y - 8, hw, 10, kind);
      const landW = b.rng.int(80, 130);
      b.ground(b.x + lead + hw, b.y, landW);
      b.coinArc(b.x + lead, b.x + lead + hw, b.y - 20, 22, 4);
      return lead + hw + landW;
    },

    // Belts that shove you along — Clockwork City's signature.
    conveyorRun(b) {
      const w = b.rng.int(170, 240);
      b.ground(b.x, b.y, w);
      const dir = b.rng.chance(0.5) ? 1 : -1;
      b.plat(b.x + 20, b.y - 34, w - 40, {
        conveyor: true, conveyorDir: dir, conveyorSpeed: 1.1,
      });
      b.coinRow(b.x + 40, b.y - 56, b.rng.int(3, 5));
      return w;
    },

    // Ice sheet — Frozen Kingdom.
    iceRun(b) {
      const w = b.rng.int(180, 260);
      b.ground(b.x, b.y, w);
      b.zone(b.x, b.y - 24, w, 26, 'ice');
      if (b.rng.chance(0.6)) {
        b.plat(b.x + b.rng.int(40, 90), b.y - b.rng.int(46, 68), b.rng.int(46, 66));
      }
      b.coinRow(b.x + 30, b.y - 24, b.rng.int(3, 5));
      return w;
    },

    // Wind pushes you sideways — Sky Ruins.
    windRun(b) {
      const x0 = b.x;
      const w = b.rng.int(180, 250);
      const dir = b.rng.chance(0.5) ? 1 : -1;
      b.zone(x0, 40, w, b.height - 60, 'wind', { force: dir * 0.09 });

      const n = b.rng.int(2, 3);
      let px = x0 + b.rng.int(16, 34);
      let py = b.y;
      for (let i = 0; i < n; i++) {
        const pw = b.rng.int(50, 72);
        py = b.liftY(i === 0 ? b.y : py, 14, 40);
        b.plat(px, py, pw);
        px += pw + b.safeGap(0.35, 0.6);
      }
      const landW = b.rng.int(80, 120);
      b.ground(px, b.y, landW);
      return (px + landW) - x0;
    },

    // Water — swim physics inside the zone. Water buoys you, but the ledges
    // above it still have to be reachable from the floor if you drain out.
    waterRun(b) {
      const w = b.rng.int(200, 280);
      const surfaceY = b.y - 40;
      b.ground(b.x, b.y, w);
      b.zone(b.x, surfaceY, w, b.y - surfaceY, 'water');

      const n = b.rng.int(2, 3);
      let px = b.x + b.rng.int(30, 60);
      let py = b.y;
      for (let i = 0; i < n; i++) {
        const pw = b.rng.int(44, 62);
        py = b.liftY(i === 0 ? b.y : py, 24, 42);
        b.plat(px, py, pw);
        px += pw + b.safeGap(0.35, 0.7);
        if (px > b.x + w - 50) break;
      }
      b.coinRow(b.x + 40, surfaceY + 16, b.rng.int(4, 6), 24);
      return w;
    },

    // Quicksand slows and sinks you — Sunset Desert.
    quicksandRun(b) {
      const w = b.rng.int(150, 220);
      b.ground(b.x, b.y, w);
      b.zone(b.x, b.y - 18, w, 20, 'quicksand');
      // The escape ledge must be jumpable from inside the sand.
      const py = b.liftY(b.y, 30, 46);
      b.plat(b.x + b.rng.int(30, 60), py, b.rng.int(46, 68));
      b.coinRow(b.x + 40, b.y - 40, b.rng.int(2, 4));
      return w;
    },

    // Switch opens a gate further along — the puzzle beat.
    switchGate(b) {
      const w = b.rng.int(220, 300);
      b.ground(b.x, b.y, w);
      const gateX = b.x + Math.floor(w * 0.72);
      const key = 'sw' + b.rng.int(1000, 9999);
      // The switch sits somewhere awkward but reachable.
      const swY = clamp(b.y - b.rng.int(40, 76), 80, b.baseY - 20);
      b.plat(b.x + Math.floor(w * 0.24), swY + 10, 56);
      b.zone(b.x + Math.floor(w * 0.26), swY - 12, 14, 14, 'switch', { key });
      b.zone(gateX, b.y - 54, 12, 54, 'gate', { key });
      b.coinRow(b.x + 40, b.y - 26, 3);
      return w;
    },

    // A safe shelf that always gets the checkpoint.
    restStop(b) {
      const w = b.rng.int(110, 160);
      b.ground(b.x, b.y, w);
      b.checkpoints.push({ x: b.x + Math.floor(w / 2), y: b.y - 30 });
      return w;
    },
  };

  // Which chunks each archetype likes
  const ARCH_CHUNKS = {
    intro:       { flat: 4, gap: 2, platformRun: 3, stairsUp: 1 },
    exploration: { flat: 2, platformRun: 4, stairsUp: 2, stairsDown: 2, gapPlatforms: 2, tower: 1 },
    vertical:    { tower: 6, stairsUp: 3, platformRun: 2, flat: 1 },
    mechanic:    { flat: 2, platformRun: 2, gap: 2 },   // signature chunk injected below
    speed:       { flat: 5, gap: 3, stairsDown: 2, hazardRow: 1 },
    underground: { corridor: 4, flat: 2, gap: 2, hazardRow: 2, platformRun: 1 },
    special:     { flat: 2, platformRun: 2 },           // signature chunk injected below
    precision:   { gapPlatforms: 4, crumbleRun: 2, tower: 2, gap: 2 },
    secret:      { flat: 2, platformRun: 3, stairsUp: 2, gapPlatforms: 2, tower: 1 },
    challenge:   { flat: 3, gap: 2, hazardRow: 2, movingRun: 2, platformRun: 2, crumbleRun: 1 },
    vehicle:     { flat: 6, gap: 3, hazardRow: 2 },
    puzzle:      { switchGate: 4, flat: 2, platformRun: 2, corridor: 1 },
    miniboss:    { flat: 3, platformRun: 1 },
    advanced:    { gapPlatforms: 2, movingRun: 2, crumbleRun: 2, tower: 2, hazardRow: 2, platformRun: 2, phaseRun: 1 },
    boss:        { flat: 2 },
  };

  // Each world contributes one signature chunk to `mechanic` / `special`.
  const WORLD_SIGNATURE = {
    meadow:    'movingRun',
    desert:    'quicksandRun',
    cavern:    'crumbleRun',
    forest:    'phaseRun',
    frozen:    'iceRun',
    sky:       'windRun',
    clockwork: 'conveyorRun',
    volcano:   'hazardRow',
    void:      'phaseRun',
  };

  const WORLD_ELEMENT = {
    meadow:    'waterRun',
    desert:    'quicksandRun',
    cavern:    'waterRun',
    forest:    'waterRun',
    frozen:    'iceRun',
    sky:       'windRun',
    clockwork: 'conveyorRun',
    volcano:   'hazardRow',
    void:      'phaseRun',
  };

  // Target level width per archetype (px).
  const ARCH_WIDTH = {
    intro: 1500, exploration: 2600, vertical: 1700, mechanic: 1900,
    speed: 2800, underground: 2000, special: 2000, precision: 1900,
    secret: 2300, challenge: 2400, vehicle: 2900, puzzle: 2100,
    miniboss: 900, advanced: 2700, boss: 820,
  };

  // Enemy & pickup population

  function populateEnemies(b) {
    const arch = b.archetype;
    if (arch === 'boss' || arch === 'miniboss') return;

    const roster = b.world.enemies;
    // Density scales with difficulty but stays sane.
    const per1000 = lerp(2.2, 7.0, (b.diff - 1) / 9);
    const target  = Math.round((b.x / 1000) * per1000);

    // Only place on surfaces wide enough to patrol and not right at spawn.
    const usable = b.surfaces.filter(s => s.w >= 46 && s.x > 260);
    if (!usable.length) return;

    b.rng.shuffle(usable);
    let placed = 0;
    for (const s of usable) {
      if (placed >= target) break;
      const type = b.rng.pick(roster);
      const def  = ENEMY_DEFS[type];
      if (!def) continue;

      const margin = 6;
      const ex = s.x + margin + b.rng.range(0, Math.max(1, s.w - def.w - margin * 2));
      const flying = def.fly;
      const ey = flying ? clamp(s.y - b.rng.int(34, 70), 40, b.height - 60)
                        : s.y - def.h;

      b.enemies.push({
        type,
        x: Math.round(ex),
        y: Math.round(ey),
        px: s.x + 2,
        py: s.x + s.w - def.w - 2,
        baseY: Math.round(ey),
      });
      placed++;
    }
  }

  function populatePickups(b) {
    // A special coin on a hard-to-reach high platform.
    const high = b.platforms
      .filter(p => !p.crumble && !p.phase && !p.moving && p.type !== 'ceiling')
      .sort((a, c) => a.y - c.y);
    if (high.length) {
      const p = high[0];
      b.coin(p.x + p.w / 2 - 4, p.y - 22, CT.COIN);
    }
    if (high.length > 3) {
      const p = high[b.rng.int(1, Math.min(3, high.length - 1))];
      b.coin(p.x + p.w / 2 - 4, p.y - 22, CT.COIN);
    }
    // A heart appears on tougher levels as a mercy.
    if (b.diff >= 4 && b.rng.chance(0.45) && high.length > 1) {
      const p = high[b.rng.int(0, high.length - 1)];
      b.collectibles.push({ x: Math.round(p.x + p.w / 2 - 5), y: Math.round(p.y - 22), type: CT.HEART });
    }
  }

  function placePowerup(b, levelNum) {
    // Power-up crates show up on a predictable cadence so progression feels fair.
    const slots = b.surfaces.filter(s => s.kind === 'plat' && s.x > b.x * 0.25);
    if (!slots.length) return;
    const s = b.rng.pick(slots);
    const pool = POWERUP_POOL_FOR_WORLD[b.world.theme] || ['ember'];
    const type = pool[(levelNum - 1) % pool.length];
    b.powerups.push({ x: Math.round(s.x + s.w / 2 - 6), y: Math.round(s.y - 16), type });
  }

  // Secret exits
  function placeSecret(b, levelId, target) {
    // Tucked above the highest platform in the back half of the level.
    const cands = b.platforms.filter(p =>
      p.x > b.x * 0.45 && !p.crumble && !p.phase && p.type !== 'ceiling');
    if (!cands.length) return;
    cands.sort((a, c) => a.y - c.y);
    const p = cands[0];
    const sx = Math.round(p.x + p.w / 2 - 12);
    const sy = Math.round(clamp(p.y - 46, 34, b.height - 80));
    // Give the player a ledge to actually stand on to reach it.
    b.plat(sx - 14, sy + 30, 52, { secretLedge: true });
    b.secrets.push({ x: sx, y: sy, w: 24, h: 32, leadsTo: target });
    b.coin(sx + 6, sy - 14, CT.COIN);
  }

  // Main entry point

  /**
   * Build a fully-formed level object for an id like "W3L07".
   * `opts.hasDoubleJump` widens the allowed gaps for late-game levels.
   */
  function build(levelId, opts = {}) {
    const parsed = parseLevelId(levelId);
    if (!parsed) return null;
    const world = getWorld(parsed.world);
    if (!world) return null;

    const levelNum  = parsed.level;
    const archetype = archetypeFor(levelNum);
    const diff      = difficultyFor(parsed.world, levelNum);
    const rng       = new RNG(hashSeed(levelId));
    const gravity   = GRAVITY * world.gravityScale;

    // Later worlds assume you have the double jump, and are built to use it.
    const assumeDJ  = opts.hasDoubleJump === true;
    const limits    = reachLimits(gravity, assumeDJ);

    const tall   = (archetype === 'vertical' || archetype === 'tower');
    const height = tall ? 360 : VH;

    const b = new Builder({ rng, world, archetype, difficulty: diff, limits, height });

    // Opening safe ledge — you never spawn into a hazard.
    b.ground(0, b.baseY, 200);
    b.x = 200;

    if (archetype === 'boss' || archetype === 'miniboss') {
      return buildArena(b, levelId, world, archetype, parsed);
    }

    // Assemble chunks until we hit the target width
    const weightsBase = Object.assign({}, ARCH_CHUNKS[archetype] || ARCH_CHUNKS.intro);
    if (archetype === 'mechanic') weightsBase[WORLD_SIGNATURE[world.theme]] = 8;
    if (archetype === 'special')  weightsBase[WORLD_ELEMENT[world.theme]]   = 8;
    // Harder levels get more of the nasty chunk types.
    if (diff >= 5) { weightsBase.crumbleRun = (weightsBase.crumbleRun || 0) + 1;
                     weightsBase.movingRun  = (weightsBase.movingRun  || 0) + 1; }
    if (diff >= 7) { weightsBase.phaseRun   = (weightsBase.phaseRun   || 0) + 1;
                     weightsBase.hazardRow  = (weightsBase.hazardRow  || 0) + 1; }

    const names   = Object.keys(weightsBase).filter(n => CHUNKS[n]);
    const weights = names.map(n => weightsBase[n]);

    const targetW   = ARCH_WIDTH[archetype] || 2000;
    const restAt    = Math.floor(targetW * 0.5);
    let   restDone  = false;
    let   guard     = 0;

    while (b.x < targetW && guard++ < 200) {
      // Drop a checkpoint at the midpoint of every level.
      if (!restDone && b.x >= restAt) {
        b.x += CHUNKS.restStop(b);
        restDone = true;
        continue;
      }
      const name = rng.weighted(names, weights);
      b.x += CHUNKS[name](b);
    }
    if (!restDone) {
      b.x += CHUNKS.restStop(b);
    }

    // Closing run-up to the goal — always flat and safe.
    b.ground(b.x, b.y, 200);
    const exitX = b.x + 120;
    const exitY = b.y - 32;
    b.x += 200;

    const width = b.x;

    populateEnemies(b);
    populatePickups(b);
    placePowerup(b, levelNum);

    // Secret exits live on the 'secret' archetype plus a couple of others.
    let secretTarget = null;
    if (archetype === 'secret') {
      secretTarget = makeLevelId(parsed.world, Math.min(LEVELS_PER_WORLD, levelNum + 3));
      placeSecret(b, levelId, secretTarget);
    } else if (archetype === 'exploration' && rng.chance(0.5)) {
      secretTarget = makeLevelId(parsed.world, Math.min(LEVELS_PER_WORLD, levelNum + 2));
      placeSecret(b, levelId, secretTarget);
    }

    return {
      id: levelId,
      world: parsed.world,
      levelNum,
      name: levelName(world, archetype, levelNum),
      archetype,
      difficulty: diff,
      theme: world.theme,
      palette: world.palette,
      music: world.music,

      width,
      height,
      gravity,
      friction: world.friction,

      grounds:     b.grounds,
      platforms:   b.platforms,
      hazards:     b.hazards,
      zones:       b.zones,
      enemies:     b.enemies,
      collectibles:b.collectibles,
      powerups:    b.powerups,
      checkpoints: b.checkpoints,
      secrets:     b.secrets,

      spawn: { x: 60, y: b.baseY - PH },
      exit:  { x: exitX, y: exitY },

      totalCoins: b.collectibles.filter(c => c.type === CT.COIN).length,
      isBoss:     false,
    };
  }

  // Boss / mini-boss arenas
  function buildArena(b, levelId, world, archetype, parsed) {
    const isMini = archetype === 'miniboss';
    const w = isMini ? 640 : 780;

    b.grounds.length = 0;
    b.surfaces.length = 0;
    b.ground(0, b.baseY, w);

    // A couple of ledges so the fight has verticality.
    b.plat(60, b.baseY - 56, 76);
    b.plat(w - 136, b.baseY - 56, 76);
    if (!isMini) b.plat(w / 2 - 50, b.baseY - 96, 100);

    const bossId = isMini ? world.miniBoss : world.boss;

    return {
      id: levelId,
      world: parsed.world,
      levelNum: parsed.level,
      name: (BOSS_DEFS[bossId] && BOSS_DEFS[bossId].name) || 'Guardián',
      archetype,
      difficulty: difficultyFor(parsed.world, parsed.level),
      theme: world.theme,
      palette: world.palette,
      music: isMini ? 'miniboss' : 'boss',

      width: w,
      height: b.height,
      gravity: GRAVITY * world.gravityScale,
      friction: world.friction,

      grounds: b.grounds,
      platforms: b.platforms,
      hazards: [],
      zones: [],
      enemies: [],
      collectibles: [],
      powerups: [],
      checkpoints: [],
      secrets: [],

      spawn: { x: 50, y: b.baseY - PH },
      exit: null,

      bossId,
      isBoss: true,
      isMiniBoss: isMini,
      totalCoins: 0,
    };
  }

  // Level naming
  const NAME_POOL = {
    meadow:    ['Sendero', 'Colina', 'Ruina', 'Arroyo', 'Claro', 'Prado', 'Muralla'],
    desert:    ['Duna', 'Oasis', 'Pirámide', 'Cañón', 'Tormenta', 'Sepulcro', 'Meseta'],
    cavern:    ['Veta', 'Galería', 'Abismo', 'Prisma', 'Túnel', 'Cámara', 'Fosa'],
    forest:    ['Raíz', 'Bruma', 'Micelio', 'Copa', 'Sendero', 'Umbral', 'Arboleda'],
    frozen:    ['Glaciar', 'Ventisca', 'Grieta', 'Lago', 'Cornisa', 'Iglú', 'Cumbre'],
    sky:       ['Corriente', 'Isla', 'Torre', 'Nimbo', 'Arco', 'Baluarte', 'Cima'],
    clockwork: ['Engranaje', 'Foso', 'Prensa', 'Circuito', 'Taller', 'Turbina', 'Reactor'],
    volcano:   ['Caldera', 'Colada', 'Fisura', 'Ceniza', 'Fragua', 'Cráter', 'Brasa'],
    void:      ['Fractura', 'Eco', 'Umbral', 'Deriva', 'Nulo', 'Espejo', 'Colapso'],
  };
  const ARCH_SUFFIX = {
    intro: 'Despertar', exploration: 'Extraviado', vertical: 'Ascenso',
    mechanic: 'Mecanismo', speed: 'Carrera', underground: 'Subsuelo',
    special: 'Corriente', precision: 'Filo', secret: 'Susurro',
    challenge: 'Asedio', vehicle: 'Travesía', puzzle: 'Enigma',
    miniboss: 'Centinela', advanced: 'Convergencia', boss: 'Confrontación',
  };

  function levelName(world, archetype, levelNum) {
    const pool = NAME_POOL[world.theme] || NAME_POOL.meadow;
    const base = pool[(levelNum * 3) % pool.length];
    return `${base} ${ARCH_SUFFIX[archetype] || ''}`.trim();
  }

  // Solvability check
  // A linear left-to-right scan gives false alarms whenever platforms stack
  // or overlap, because the player can climb between them in any order. So
  // this builds the real surface graph and breadth-first searches it: an edge
  // exists only where a jump is actually within reach. If the exit is not
  // reachable from the spawn, the level is broken — no judgement call.

  /** Horizontal distance the player must cross between two spans (0 if overlapping). */
  function spanGap(a, b) {
    if (b.x > a.x + a.w) return b.x - (a.x + a.w);
    if (a.x > b.x + b.w) return a.x - (b.x + b.w);
    return 0;
  }

  function canReach(from, to, limits) {
    const gap = spanGap(from, to);
    const rise = from.y - to.y;               // positive = `to` is higher

    if (rise > 0) {
      // Climbing: both the height and the horizontal distance must fit,
      // and the further you jump the less height you have left.
      if (rise > limits.maxRise) return false;
      const budget = limits.maxGap * (1 - (rise / limits.maxRise) * 0.45);
      return gap <= budget;
    }
    // Dropping: falling buys extra airtime, so gaps can be wider.
    const drop = -rise;
    if (drop > limits.maxDrop) return false;
    return gap <= limits.maxGap * 1.35;
  }

  function validate(level) {
    const problems = [];
    // Audited without the double jump — the strictest assumption.
    const limits = reachLimits(level.gravity, false);

    const nodes = []
      .concat(level.grounds.map(g => ({ x: g.x, y: g.y, w: g.w })))
      .concat(level.platforms
        .filter(p => p.type !== 'ceiling')
        .map(p => ({ x: p.x, y: p.y, w: p.w })));

    if (!nodes.length) { problems.push('sin superficies'); return problems; }

    // Start: the surface Luka spawns on.
    const sx = level.spawn.x, sy = level.spawn.y + PH;
    let start = -1, startDy = Infinity;
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      if (sx + PW < n.x || sx > n.x + n.w) continue;
      const dy = n.y - sy;
      if (dy >= -4 && dy < startDy) { startDy = dy; start = i; }
    }
    if (start < 0) { problems.push('el spawn no cae sobre ninguna superficie'); return problems; }

    // Goal: any surface under the exit (boss arenas have no exit to reach).
    const goals = new Set();
    if (level.exit) {
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        if (level.exit.x + 24 >= n.x && level.exit.x <= n.x + n.w && n.y >= level.exit.y - 8) {
          goals.add(i);
        }
      }
      if (!goals.size) { problems.push('la salida no está sobre ninguna superficie'); return problems; }
    }

    // BFS over the reachability graph.
    const seen = new Uint8Array(nodes.length);
    const queue = [start];
    seen[start] = 1;
    let reachedGoal = goals.size === 0;
    let visited = 1;

    while (queue.length) {
      const i = queue.shift();
      if (goals.has(i)) reachedGoal = true;
      const a = nodes[i];
      for (let j = 0; j < nodes.length; j++) {
        if (seen[j]) continue;
        // Cheap reject before the full test.
        if (Math.abs(nodes[j].x - a.x) > level.width) continue;
        if (!canReach(a, nodes[j], limits)) continue;
        seen[j] = 1; visited++;
        queue.push(j);
      }
    }

    if (!reachedGoal) {
      problems.push('la salida no es alcanzable desde el spawn');
    }
    // A large marooned island usually means a chunk emitted bad geometry.
    const stranded = nodes.length - visited;
    if (stranded > nodes.length * 0.35 && stranded > 4) {
      problems.push(`${stranded}/${nodes.length} superficies inalcanzables`);
    }
    return problems;
  }

  return { build, validate, CHUNKS, ARCHETYPES: ARCH_CHUNKS };
})();

// LEVEL CACHE
// Generation is cheap, but caching keeps retries instant and makes the
// object identity stable for the current level.
const LevelCache = (() => {
  const cache = new Map();
  function get(levelId, opts) {
    const key = levelId + (opts && opts.hasDoubleJump ? ':dj' : '');
    if (!cache.has(key)) cache.set(key, LevelGen.build(levelId, opts));
    return cache.get(key);
  }
  function clear() { cache.clear(); }
  return { get, clear };
})();
