'use strict';

// ─── DETERMINISTIC SEEDED RNG ─────────────────────────────────
// Levels must be identical on every playthrough, so no Math.random()
// is allowed anywhere in level generation. mulberry32 is small, fast
// and has good distribution for our purposes.

class RNG {
  constructor(seed) {
    this.seed = (seed >>> 0) || 1;
    this.state = this.seed;
  }

  reset() { this.state = this.seed; }

  /** float in [0,1) */
  next() {
    this.state = (this.state + 0x6D2B79F5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** float in [min,max) */
  range(min, max) { return min + this.next() * (max - min); }

  /** integer in [min,max] inclusive */
  int(min, max) { return Math.floor(this.range(min, max + 1)); }

  /** true with probability p */
  chance(p) { return this.next() < p; }

  /** random element of an array */
  pick(arr) { return arr[Math.floor(this.next() * arr.length)]; }

  /** random element honouring a parallel weights array */
  weighted(arr, weights) {
    let total = 0;
    for (const w of weights) total += w;
    let r = this.next() * total;
    for (let i = 0; i < arr.length; i++) {
      r -= weights[i];
      if (r <= 0) return arr[i];
    }
    return arr[arr.length - 1];
  }

  /** in-place Fisher-Yates */
  shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      const t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }
}

/** Stable string -> 32-bit hash, so "W3L07" always seeds the same level. */
function hashSeed(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// ─── MATH HELPERS ─────────────────────────────────────────────
const clamp  = (v, lo, hi) => v < lo ? lo : v > hi ? hi : v;
const lerp   = (a, b, t) => a + (b - a) * t;
const approach = (cur, target, step) => {
  if (cur < target) return Math.min(cur + step, target);
  if (cur > target) return Math.max(cur - step, target);
  return target;
};
const dist2 = (ax, ay, bx, by) => {
  const dx = ax - bx, dy = ay - by;
  return dx * dx + dy * dy;
};
const aabb = (a, b) =>
  a.x < b.x + b.w && a.x + a.w > b.x &&
  a.y < b.y + b.h && a.y + a.h > b.y;

// ─── JUMP REACH SOLVER ────────────────────────────────────────
// The generator must never place a gap or ledge Luka cannot clear.
// These derive the true reach from the physics constants, per level
// (gravity varies between worlds).

function jumpReach(gravity, jumpVy = JUMP_VY, speed = PLAYER_SPD) {
  const g = gravity;
  // Peak height of a full-power jump: v^2 / 2g
  const height = (jumpVy * jumpVy) / (2 * g);
  // Frames spent rising, then falling back to launch height
  const riseFrames = Math.abs(jumpVy) / g;
  const airFrames  = riseFrames * 2;
  // Horizontal travel over the whole arc (a little is lost to accel)
  const dist = speed * airFrames * 0.92;
  return { height, dist, riseFrames, airFrames };
}

/** Safe design limits with margin, so levels are comfortable not frame-perfect. */
function reachLimits(gravity, hasDoubleJump) {
  const r = jumpReach(gravity);
  let maxRise = r.height * 0.60;   // never demand more than 60% of peak
  let maxGap  = r.dist   * 0.68;   // ample landing room
  if (hasDoubleJump) {
    maxRise *= 1.55;
    maxGap  *= 1.35;
  }
  return {
    maxRise: Math.floor(maxRise),
    maxGap:  Math.floor(maxGap),
    maxDrop: Math.floor(r.height * 2.2), // falling is cheap
  };
}
