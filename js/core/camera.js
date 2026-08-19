'use strict';

// ─── CAMERA ───────────────────────────────────────────────────
// Dead zone so small movements don't swim, look-ahead so you can see where
// you're running, and a shake channel for impacts.

class Camera {
  constructor() { this.reset(0, 0, VW, VH); }

  reset(x, y, levelW, levelH) {
    this.x = x; this.y = y;
    this.levelW = levelW; this.levelH = levelH;
    this.shake = 0;
    this.shakeX = 0; this.shakeY = 0;
    this.lookAhead = 0;
    this.locked = false;
  }

  setBounds(levelW, levelH) { this.levelW = levelW; this.levelH = levelH; }

  addShake(amount) { this.shake = Math.min(24, this.shake + amount); }

  /** Snap straight to the target — used on respawn so there's no swoop. */
  snapTo(target) {
    const t = this._target(target, true);
    this.x = t.x; this.y = t.y;
  }

  _target(p, immediate) {
    // Look ahead in the direction of travel, eased so turning isn't jarring.
    const wantAhead = clamp(p.vx * 10, -40, 40);
    if (immediate) this.lookAhead = wantAhead;
    else this.lookAhead = lerp(this.lookAhead, wantAhead, 0.045);

    let tx = p.x + PW / 2 - VW / 2 + this.lookAhead;
    let ty = p.y + PH / 2 - VH / 2 + 14;

    tx = clamp(tx, 0, Math.max(0, this.levelW - VW));
    ty = clamp(ty, 0, Math.max(0, this.levelH - VH));
    return { x: tx, y: ty };
  }

  update(p) {
    const t = this._target(p, false);

    // Horizontal dead zone: the camera only starts moving once the player
    // pushes past a band in the middle of the screen.
    const dzx = 18;
    const dx = t.x - this.x;
    if (Math.abs(dx) > dzx) {
      this.x += (dx - Math.sign(dx) * dzx) * 0.12;
    }

    // Vertical follows harder when grounded, softer in the air, so jumps
    // don't drag the whole view up and down.
    const dy = t.y - this.y;
    const vsp = p.onGround ? 0.10 : 0.05;
    if (Math.abs(dy) > 6) this.y += dy * vsp;

    this.x = clamp(this.x, 0, Math.max(0, this.levelW - VW));
    this.y = clamp(this.y, 0, Math.max(0, this.levelH - VH));

    // Shake decays and alternates so it reads as impact, not drift.
    if (this.shake > 0.2) {
      this.shake *= 0.86;
      this.shakeX = (Math.random() - 0.5) * this.shake;
      this.shakeY = (Math.random() - 0.5) * this.shake;
    } else {
      this.shake = 0; this.shakeX = 0; this.shakeY = 0;
    }
  }

  /** Render offsets, including shake. */
  get rx() { return Math.round(this.x + this.shakeX); }
  get ry() { return Math.round(this.y + this.shakeY); }
}
