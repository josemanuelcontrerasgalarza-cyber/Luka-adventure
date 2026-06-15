'use strict';

// ─── PLAYER ──────────────────────────────────────────────────
class Player {
  constructor(x, y) {
    this.reset(x, y);
  }

  reset(x, y) {
    this.x = x; this.y = y;
    this.vx = 0; this.vy = 0;
    this.onGround = false;
    this.facing = 1;
    this.state = 'idle';
    this.frame = 0;
    this.invulTimer = 0;
    this.doubleJumpUsed = false;
    this.wasOnGround = false;
    this.shieldTimer = 0;
    this.speedBoostTimer = 0;
    this.hurtCooldown = 0;
    this.stepFrame = 0;
  }

  get spd() {
    return PLAYER_SPD * (this.speedBoostTimer > 0 ? 1.6 : 1);
  }

  get shielded() {
    return this.shieldTimer > 0;
  }

  get invulnerable() {
    return this.invulTimer > 0;
  }

  update(level, saveData) {
    const onGnd = this.onGround;

    // Horizontal movement
    let moving = false;
    if (Input.LEFT()) {
      this.vx -= 1.5;
      if (this.vx < -this.spd) this.vx = -this.spd;
      this.facing = -1;
      moving = true;
    } else if (Input.RIGHT()) {
      this.vx += 1.5;
      if (this.vx > this.spd) this.vx = this.spd;
      this.facing = 1;
      moving = true;
    } else {
      this.vx *= this.onGround ? FRICTION : 0.92;
      if (Math.abs(this.vx) < 0.1) this.vx = 0;
    }

    // Jump
    if (Input.JUMP()) {
      if (this.onGround) {
        this.vy = JUMP_VY;
        this.onGround = false;
        Audio.sfx.jump();
        Particles.emitDust(this.x + PW/2, this.y + PH, this.vx);
      } else if (saveData.hasDoubleJump && !this.doubleJumpUsed) {
        this.vy = DJUMP_VY;
        this.doubleJumpUsed = true;
        Audio.sfx.doubleJump();
        Particles.emitStar(this.x + PW/2, this.y + PH/2);
      }
    }

    // Apply gravity (reduced in space world)
    const grav = level.gravity || GRAVITY;
    this.vy += grav;
    if (this.vy > MAX_FALL) this.vy = MAX_FALL;

    // Move and collide
    this.x += this.vx;
    this._collideX(level);
    this.y += this.vy;
    this.onGround = false;
    this._collideY(level);

    // Land dust
    if (this.onGround && !onGnd && Math.abs(this.vy) > 2) {
      Particles.emitDust(this.x + PW/2, this.y + PH, this.vx);
      Audio.sfx.land();
    }
    if (this.onGround) this.doubleJumpUsed = false;

    // World bounds
    if (this.x < 0) { this.x = 0; this.vx = 0; }
    if (this.x + PW > level.width) { this.x = level.width - PW; this.vx = 0; }

    // Timers
    if (this.invulTimer > 0) this.invulTimer--;
    if (this.shieldTimer > 0) this.shieldTimer--;
    if (this.speedBoostTimer > 0) this.speedBoostTimer--;
    if (this.hurtCooldown > 0) this.hurtCooldown--;

    // Animation state
    this.frame++;
    const speed = Math.abs(this.vx);
    if (this.hurtCooldown > 60) {
      this.state = 'hurt';
    } else if (!this.onGround) {
      this.state = this.vy < 0 ? 'jump' : 'fall';
    } else if (speed > 0.3) {
      this.state = 'run';
      if (speed > 0.5 && this.frame % 12 < 6) {
        Particles.emitDust(this.x + PW/2, this.y + PH, -this.vx);
      }
    } else {
      this.state = 'idle';
    }
  }

  _collideX(level) {
    for (const p of level.platforms) {
      if (!this._overlapsX(p)) continue;
      if (!this._overlapsY(p)) continue;
      if (this.vx > 0) { this.x = p.x - PW; this.vx = 0; }
      else if (this.vx < 0) { this.x = p.x + p.w; this.vx = 0; }
    }
    for (const g of level.grounds) {
      if (this.x + PW > g.x && this.x < g.x + g.w) {
        // No X collision with ground
      }
    }
  }

  _collideY(level) {
    // Check ground tiles
    for (const g of level.grounds) {
      if (this.x + PW > g.x && this.x < g.x + g.w) {
        if (this.vy >= 0 && this.y + PH > g.y && this.y + PH < g.y + g.h + MAX_FALL + 2) {
          this.y = g.y - PH;
          this.vy = 0;
          this.onGround = true;
        } else if (this.vy < 0 && this.y < g.y + g.h && this.y > g.y) {
          this.y = g.y + g.h;
          this.vy = 0;
        }
      }
    }
    // Check platforms
    for (const p of level.platforms) {
      if (this.x + PW - 2 <= p.x || this.x + 2 >= p.x + p.w) continue;
      if (this.vy >= 0 && this.y + PH > p.y && this.y + PH <= p.y + p.h + MAX_FALL + 2) {
        const prevBottom = this.y + PH - this.vy;
        if (prevBottom <= p.y + 2) {
          this.y = p.y - PH;
          this.vy = 0;
          this.onGround = true;
        }
      }
    }
  }

  _overlapsX(r) {
    return this.x + PW - 1 > r.x && this.x + 1 < r.x + r.w;
  }

  _overlapsY(r) {
    return this.y + PH > r.y && this.y < r.y + r.h;
  }

  takeDamage(lives) {
    if (this.invulnerable || this.hurtCooldown > 0) return lives;
    if (this.shielded) {
      this.shieldTimer = 0;
      Audio.sfx.shieldHit();
      Particles.emitExplosion(this.x + PW/2, this.y + PH/2);
      this.invulTimer = 40;
      return lives;
    }
    lives--;
    this.invulTimer = INVUL_FRAMES;
    this.hurtCooldown = 80;
    this.vy = -4;
    this.vx = -this.facing * 3;
    Audio.sfx.hurt();
    Particles.emitHurt(this.x + PW/2, this.y + PH/2);
    return lives;
  }

  get bounds() {
    return { x: this.x, y: this.y, w: PW, h: PH };
  }

  draw(ctx, camX) {
    Spr.drawLuka(
      ctx,
      this.x - camX,
      this.y,
      this.state,
      this.frame,
      this.facing,
      this.shielded,
      this.invulTimer
    );
  }
}

// ─── BASE ENEMY ──────────────────────────────────────────────
class Enemy {
  constructor(x, y, type, patrolMin, patrolMax) {
    this.x = x;
    this.y = y;
    this.type = type;
    this.patrolMin = patrolMin;
    this.patrolMax = patrolMax;
    this.vx = 1;
    this.vy = 0;
    this.frame = 0;
    this.facing = 1;
    this.alive = true;
    this.hp = 1;
    this.w = 14;
    this.h = 14;
    this.onGround = false;
    this.stunTimer = 0;
    this._init();
  }

  _init() {}

  update(level, player) {
    if (!this.alive) return;
    this.frame++;
    if (this.stunTimer > 0) { this.stunTimer--; return; }
    this._behavior(level, player);
  }

  _behavior(level, player) {
    // Override in subclass
  }

  _patrolMove(speed) {
    this.x += this.vx * speed;
    if (this.x <= this.patrolMin) { this.x = this.patrolMin; this.vx = 1; this.facing = 1; }
    if (this.x >= this.patrolMax) { this.x = this.patrolMax; this.vx = -1; this.facing = -1; }
  }

  _applyGravity(level) {
    this.vy += GRAVITY;
    if (this.vy > MAX_FALL) this.vy = MAX_FALL;
    this.y += this.vy;
    for (const g of level.grounds) {
      if (this.x + this.w > g.x && this.x < g.x + g.w) {
        if (this.vy >= 0 && this.y + this.h > g.y && this.y + this.h <= g.y + 20) {
          this.y = g.y - this.h;
          this.vy = 0;
          this.onGround = true;
        }
      }
    }
    for (const p of level.platforms) {
      if (this.x + this.w > p.x && this.x < p.x + p.w) {
        if (this.vy >= 0 && this.y + this.h > p.y && this.y + this.h <= p.y + p.h + 12) {
          const prevBottom = this.y + this.h - this.vy;
          if (prevBottom <= p.y + 2) {
            this.y = p.y - this.h;
            this.vy = 0;
            this.onGround = true;
          }
        }
      }
    }
  }

  touchesPlayer(player) {
    const b = player.bounds;
    return this.x < b.x + b.w - 2
        && this.x + this.w > b.x + 2
        && this.y < b.y + b.h
        && this.y + this.h > b.y;
  }

  die() {
    this.alive = false;
    Particles.emitExplosion(this.x + this.w/2, this.y + this.h/2);
    Audio.sfx.explosion();
  }

  get bounds() {
    return { x: this.x, y: this.y, w: this.w, h: this.h };
  }

  draw(ctx, camX) {
    // Override in subclass
  }
}

// ─── VACUUM (World 1) ─────────────────────────────────────────
class Vacuum extends Enemy {
  _init() {
    this.w = 20;
    this.h = 15;
  }

  _behavior(level, player) {
    this.onGround = false;
    this._applyGravity(level);
    this._patrolMove(1);
  }

  draw(ctx, camX) {
    if (!this.alive) return;
    Spr.drawVacuum(ctx, this.x - camX, this.y, this.frame);
  }
}

// ─── DRONE (World 2) ──────────────────────────────────────────
class Drone extends Enemy {
  _init() {
    this.w = 18;
    this.h = 13;
    this.baseY = this.y;
    this.hoverTimer = 0;
  }

  _behavior(level, player) {
    this.hoverTimer++;
    this.y = this.baseY + Math.sin(this.hoverTimer * 0.05) * 18;
    this._patrolMove(0.8);
    this.facing = this.vx > 0 ? 1 : -1;
  }

  draw(ctx, camX) {
    if (!this.alive) return;
    Spr.drawDrone(ctx, this.x - camX, this.y, this.frame);
  }
}

// ─── PATROL BOT (World 3) ─────────────────────────────────────
class PatrolBot extends Enemy {
  _init() {
    this.w = 14;
    this.h = 20;
    this.stopTimer = 0;
    this.stopped = false;
  }

  _behavior(level, player) {
    this.onGround = false;
    this._applyGravity(level);

    if (this.stopped) {
      this.stopTimer--;
      if (this.stopTimer <= 0) this.stopped = false;
      return;
    }

    // Stop briefly when player is near
    const dx = player.x - this.x;
    if (Math.abs(dx) < 40 && Math.abs(player.y - this.y) < 30) {
      if (Math.random() < 0.005) {
        this.stopped = true;
        this.stopTimer = 40;
        this.vx = dx > 0 ? 1 : -1;
        this.facing = this.vx;
        return;
      }
    }

    this._patrolMove(1.2);
    this.facing = this.vx > 0 ? 1 : -1;
  }

  draw(ctx, camX) {
    if (!this.alive) return;
    Spr.drawPatrol(ctx, this.x - camX, this.y, this.frame, this.facing);
  }
}

// ─── VIRUS (World 4) ──────────────────────────────────────────
class Virus extends Enemy {
  _init() {
    this.w = 14;
    this.h = 14;
    this.teleportTimer = 60 + Math.random() * 90;
    this.visible = true;
    this.blinkTimer = 0;
  }

  _behavior(level, player) {
    this.onGround = false;
    this.vy += GRAVITY * 0.3; // light gravity
    if (this.vy > 3) this.vy = 3;
    this.y += this.vy;

    // Hover oscillation
    this.y += Math.sin(this.frame * 0.1) * 0.5;
    this._patrolMove(1.1);

    // Teleport
    this.teleportTimer--;
    if (this.teleportTimer <= 0) {
      this.x = this.patrolMin + Math.random() * (this.patrolMax - this.patrolMin);
      this.y = this.y - 20 - Math.random() * 30;
      this.teleportTimer = 80 + Math.random() * 80;
      this.blinkTimer = 30;
      Particles.emitGlitch(this.x + this.w/2, this.y + this.h/2);
      Audio.sfx.glitch();
    }

    if (this.blinkTimer > 0) this.blinkTimer--;
    this.visible = !(this.blinkTimer > 0 && this.blinkTimer % 6 < 3);
  }

  draw(ctx, camX) {
    if (!this.alive || !this.visible) return;
    Spr.drawVirus(ctx, this.x - camX, this.y, this.frame);
  }
}

// ─── SPACE BOT (World 5) ──────────────────────────────────────
class SpaceBot extends Enemy {
  _init() {
    this.w = 14;
    this.h = 18;
    this.baseY = this.y;
  }

  _behavior(level, player) {
    // Low gravity
    this.vy += GRAVITY * 0.3;
    if (this.vy > 3) this.vy = 3;
    this.y += this.vy;

    // Land on ground
    for (const g of level.grounds) {
      if (this.x + this.w > g.x && this.x < g.x + g.w) {
        if (this.y + this.h > g.y && this.y < g.y + 10) {
          this.y = g.y - this.h;
          this.vy = 0;
        }
      }
    }
    for (const p of level.platforms) {
      if (this.x + this.w > p.x && this.x < p.x + p.w) {
        if (this.vy >= 0 && this.y + this.h > p.y && this.y + this.h < p.y + 20) {
          const prev = this.y + this.h - this.vy;
          if (prev <= p.y + 2) { this.y = p.y - this.h; this.vy = 0; }
        }
      }
    }

    // Float up occasionally
    if (Math.random() < 0.01) this.vy = -2;

    this._patrolMove(0.7);
    this.facing = this.vx > 0 ? 1 : -1;
  }

  draw(ctx, camX) {
    if (!this.alive) return;
    Spr.drawSpacebot(ctx, this.x - camX, this.y, this.frame, this.facing);
  }
}

// ─── PROJECTILE ───────────────────────────────────────────────
class Projectile {
  constructor(x, y, vx, vy, color, size, source) {
    this.x = x; this.y = y;
    this.vx = vx; this.vy = vy;
    this.color = color;
    this.size = size;
    this.alive = true;
    this.source = source; // 'boss'
    this.age = 0;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vy += 0.05;
    this.age++;
    if (this.age > 300 || this.x < -100 || this.x > 5000 || this.y > VH + 50) {
      this.alive = false;
    }
  }

  touchesPlayer(player) {
    const b = player.bounds;
    return this.x < b.x + b.w && this.x + this.size > b.x
        && this.y < b.y + b.h && this.y + this.size > b.y;
  }

  draw(ctx, camX) {
    if (!this.alive) return;
    const pulse = Math.sin(this.age * 0.3) * 0.5 + 0.5;
    ctx.globalAlpha = 0.7 + pulse * 0.3;
    ctx.fillStyle = this.color;
    ctx.fillRect(this.x - camX | 0, this.y | 0, this.size, this.size);
    ctx.globalAlpha = 1;
  }
}

// Factory
function makeEnemy(data, worldId) {
  switch (data.type) {
    case ET.VACUUM:   return new Vacuum(data.x, data.y, data.type, data.px, data.py);
    case ET.DRONE:    return new Drone(data.x, data.y, data.type, data.px, data.py);
    case ET.PATROL:   return new PatrolBot(data.x, data.y, data.type, data.px, data.py);
    case ET.VIRUS:    return new Virus(data.x, data.y, data.type, data.px, data.py);
    case ET.SPACEBOT: return new SpaceBot(data.x, data.y, data.type, data.px, data.py);
    default: return new Vacuum(data.x, data.y, data.type, data.px, data.py);
  }
}
