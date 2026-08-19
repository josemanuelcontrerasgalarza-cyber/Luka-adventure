'use strict';

// LUKA
// Movement is the whole game, so this is where the polish goes:
// acceleration curves, coyote time, jump buffering, variable jump height,
// and air control that is looser than ground control but still responsive.

const COYOTE_FRAMES = 7;    // grace after walking off a ledge
const BUFFER_FRAMES = 8;    // grace for pressing jump slightly early
const ACCEL_GROUND  = 0.55;
const ACCEL_AIR     = 0.34;
const TURN_BOOST    = 1.8;  // turning around is snappier than accelerating
const JUMP_CUT      = 0.45; // releasing jump early shortens the arc

class Luka {
  constructor(x, y) { this.respawn(x, y); this.hard = false; }

  respawn(x, y) {
    this.x = x; this.y = y;
    this.vx = 0; this.vy = 0;
    this.facing = 1;
    this.onGround = false;
    this.state = 'idle';
    this.frame = 0;

    this.coyote = 0;
    this.buffer = 0;
    this.jumpHeld = false;
    this.djumpUsed = false;
    this.dashUsed = false;
    this.dashTimer = 0;

    this.invul = 0;
    this.hurtLock = 0;
    this.dead = false;
    this.deadTimer = 0;

    this.gravityDir = 1;      // Gravity Core flips this
    this.ridingPlat = null;
    this.inWater = false;
    this.inSand = false;
    this.onIce = false;
    this.windForce = 0;

    this.cores = {};          // type -> frames remaining
    this.shootCooldown = 0;
    this.echo = null;

    this.stepTimer = 0;
  }

  // Core (power-up) helpers
  giveCore(type) {
    const def = POWERUPS[type];
    if (!def) return;
    if (def.permanent) { Progress.grantPowerup(type); return; }
    this.cores[type] = def.duration;
    if (def.grants && def.grants.echo) {
      this.echo = { x: this.x, y: this.y, life: def.duration };
    }
  }
  hasCore(type) { return (this.cores[type] || 0) > 0; }
  grants(flag) {
    for (const t in this.cores) {
      if (this.cores[t] > 0 && POWERUPS[t] && POWERUPS[t].grants && POWERUPS[t].grants[flag]) return true;
    }
    return false;
  }
  get shielded() { return this.grants('shield'); }
  get canDoubleJump() { return Progress.hasPowerup('djump'); }

  get bounds() { return { x: this.x, y: this.y, w: PW, h: PH }; }
  get cx() { return this.x + PW / 2; }
  get cy() { return this.y + PH / 2; }

  // Main update
  update(level, ctx) {
    this.frame++;
    if (this.dead) { this.deadTimer++; return; }

    // Timers
    if (this.invul > 0) this.invul--;
    if (this.hurtLock > 0) this.hurtLock--;
    if (this.shootCooldown > 0) this.shootCooldown--;
    for (const t in this.cores) {
      if (this.cores[t] > 0 && --this.cores[t] === 0) {
        Audio.sfx.menuSelect();
      }
    }
    if (this.echo) {
      this.echo.life--;
      if (this.echo.life <= 0) this.echo = null;
    }

    this._sampleZones(level);

    const grav = level.gravity * (this.inWater ? 0.35 : 1) * this.gravityDir;
    const control = this.hurtLock > 0 ? 0 : 1;

    // Horizontal input
    const left  = control && Input.LEFT();
    const right = control && Input.RIGHT();
    const speedCap = PLAYER_SPD
      * (this.grants('dash') ? 1.18 : 1)
      * (this.inWater ? 0.72 : 1)
      * (this.inSand  ? 0.55 : 1);

    const accel = (this.onGround ? ACCEL_GROUND : ACCEL_AIR)
                * (this.onIce ? 0.35 : 1);

    if (left && !right) {
      const boost = this.vx > 0 ? TURN_BOOST : 1;
      this.vx -= accel * boost;
      if (this.vx < -speedCap) this.vx = Math.max(this.vx, -speedCap * 1.6);
      this.facing = -1;
    } else if (right && !left) {
      const boost = this.vx < 0 ? TURN_BOOST : 1;
      this.vx += accel * boost;
      if (this.vx > speedCap) this.vx = Math.min(this.vx, speedCap * 1.6);
      this.facing = 1;
    } else {
      // Friction: ice keeps your momentum, ground eats it.
      const f = this.onGround ? (this.onIce ? 0.985 : level.friction) : 0.94;
      this.vx *= f;
      if (Math.abs(this.vx) < 0.06) this.vx = 0;
    }
    // Soft cap: you can exceed it briefly (conveyors, wind) but it decays.
    if (Math.abs(this.vx) > speedCap) this.vx *= 0.94;

    this.vx += this.windForce;

    // Jump: coyote time + input buffering
    if (control && Input.JUMP()) this.buffer = BUFFER_FRAMES;
    if (this.buffer > 0) this.buffer--;
    if (this.coyote > 0) this.coyote--;

    const jumpPressed = this.buffer > 0;
    if (jumpPressed) {
      if (this.onGround || this.coyote > 0) {
        this._doJump(JUMP_VY, level);
        this.buffer = 0; this.coyote = 0;
      } else if (this.inWater) {
        this.vy = JUMP_VY * 0.55 * this.gravityDir;
        this.buffer = 0;
        Audio.sfx.jump();
      } else if (this.canDoubleJump && !this.djumpUsed) {
        this._doJump(DJUMP_VY, level, true);
        this.djumpUsed = true;
        this.buffer = 0;
      } else if (this.grants('dash') && !this.dashUsed) {
        // Wind Core: a horizontal burst instead of a second jump.
        this.dashUsed = true;
        this.dashTimer = 12;
        this.vx = this.facing * PLAYER_SPD * 2.6;
        this.vy *= 0.35;
        this.buffer = 0;
        Audio.sfx.doubleJump();
        Particles.emit(this.cx, this.cy, {
          count: 10, color: ['#9AE6A0', '#FFFFFF'], speed: 3,
          angle: this.facing > 0 ? Math.PI : 0, spread: 1, life: 20, gravity: 0,
        });
      }
    }

    // Variable jump height: let go early and the arc is cut short.
    const holding = control && (Input.down('Space') || Input.down('ArrowUp') || Input.down('KeyW'));
    if (!holding && this.jumpHeld) {
      if (this.gravityDir > 0 && this.vy < 0) this.vy *= JUMP_CUT;
      if (this.gravityDir < 0 && this.vy > 0) this.vy *= JUMP_CUT;
      this.jumpHeld = false;
    }
    if (!holding) this.jumpHeld = false;

    if (this.dashTimer > 0) this.dashTimer--;

    // Gravity Core flip
    if (this.grants('gravityFlip') && control &&
        (Input.pressed('ShiftLeft') || Input.pressed('KeyF'))) {
      this.gravityDir *= -1;
      this.vy = 0;
      Audio.sfx.powerup();
      Particles.emitStar(this.cx, this.cy);
    }

    // Ember Core: shoot
    if (this.grants('shoot') && control &&
        (Input.pressed('KeyJ') || Input.pressed('KeyZ')) && this.shootCooldown <= 0) {
      this.shootCooldown = 18;
      ctx.playerShot(this.cx, this.cy, this.facing * 4.2, 0);
      Audio.sfx.shoot();
    }

    // Vertical integration
    if (this.dashTimer > 0) {
      this.vy *= 0.6;                       // dash suspends you briefly
    } else {
      this.vy += grav;
    }
    const maxFall = this.inWater ? 2.4 : MAX_FALL;
    this.vy = clamp(this.vy, -maxFall * 1.6, maxFall);

    // Move & collide
    const wasGround = this.onGround;
    this.x += this.vx;
    this._collideX(level);

    this.y += this.vy;
    this.onGround = false;
    this.ridingPlat = null;
    this._collideY(level);

    // Carried along by moving platforms and conveyors.
    if (this.ridingPlat) {
      if (this.ridingPlat.dx) this.x += this.ridingPlat.dx;
      if (this.ridingPlat.dy) this.y += this.ridingPlat.dy;
      if (this.ridingPlat.conveyor) {
        this.x += this.ridingPlat.conveyorDir * this.ridingPlat.conveyorSpeed;
      }
    }

    // Landing
    if (this.onGround) {
      this.djumpUsed = false;
      this.dashUsed = false;
      this.coyote = COYOTE_FRAMES;
      if (!wasGround && Math.abs(this.vy) < 1) {
        Audio.sfx.land();
        Particles.emitDust(this.cx, this.y + PH, this.vx);
      }
    } else if (wasGround) {
      this.coyote = COYOTE_FRAMES;
    }

    // Level bounds
    if (this.x < 0) { this.x = 0; this.vx = 0; }
    if (this.x + PW > level.width) { this.x = level.width - PW; this.vx = 0; }
    if (this.y < -40) { this.y = -40; this.vy = 0; }

    this._animate();
  }

  _doJump(power, level, isDouble) {
    this.vy = power * this.gravityDir
            * (level.gravity / GRAVITY < 0.8 ? 0.86 : 1);  // low-g worlds don't launch you off-screen
    this.onGround = false;
    this.jumpHeld = true;
    if (isDouble) {
      Audio.sfx.doubleJump();
      Particles.emitStar(this.cx, this.y + PH);
    } else {
      Audio.sfx.jump();
      Particles.emitDust(this.cx, this.y + PH, this.vx);
    }
  }

  // Zone sampling
  _sampleZones(level) {
    this.inWater = false;
    this.inSand = false;
    this.onIce = false;
    this.windForce = 0;
    const b = this.bounds;
    for (const z of level.zones) {
      if (!aabb(b, z)) continue;
      switch (z.kind) {
        case 'water':     this.inWater = true; break;
        case 'quicksand': this.inSand  = true; break;
        case 'ice':       this.onIce   = true; break;
        case 'wind':      this.windForce += z.force; break;
      }
    }
  }

  // Collision
  _solidPlatforms(level) { return level.platforms; }

  _collideX(level) {
    const b = this.bounds;
    for (const g of level.grounds) {
      // Ground blocks sideways movement only where it is genuinely a wall.
      if (b.y + b.h > g.y + 4 && b.y < g.y + g.h &&
          this.x + PW > g.x && this.x < g.x + g.w) {
        if (this.vx > 0 && this.x + PW - this.vx <= g.x + 1) {
          this.x = g.x - PW; this.vx = 0;
        } else if (this.vx < 0 && this.x - this.vx >= g.x + g.w - 1) {
          this.x = g.x + g.w; this.vx = 0;
        }
      }
    }
    for (const p of this._solidPlatforms(level)) {
      if (p.gone || (p.phase && !p.phaseOn)) continue;
      if (p.type !== 'ceiling' && !p.solid) continue;   // only walls/ceilings block X
      const px = p.rx !== undefined ? p.rx : p.x;
      const py = p.ry !== undefined ? p.ry : p.y;
      if (this.y + PH > py && this.y < py + p.h &&
          this.x + PW > px && this.x < px + p.w) {
        if (this.vx > 0) { this.x = px - PW; this.vx = 0; }
        else if (this.vx < 0) { this.x = px + p.w; this.vx = 0; }
      }
    }
  }

  _collideY(level) {
    const goingDown = this.gravityDir > 0 ? this.vy >= 0 : this.vy <= 0;

    // Solid ground: blocks from both sides.
    for (const g of level.grounds) {
      if (this.x + PW <= g.x || this.x >= g.x + g.w) continue;
      if (this.vy >= 0 && this.y + PH > g.y && this.y + PH < g.y + g.h + MAX_FALL + 4) {
        this.y = g.y - PH; this.vy = 0; this.onGround = true;
      } else if (this.vy < 0 && this.y < g.y + g.h && this.y + PH > g.y + g.h) {
        this.y = g.y + g.h; this.vy = 0;
      }
    }

    // Platforms: one-way from above (unless flagged solid).
    for (const p of this._solidPlatforms(level)) {
      if (p.gone) continue;
      if (p.phase && !p.phaseOn) continue;
      const px = p.rx !== undefined ? p.rx : p.x;
      const py = p.ry !== undefined ? p.ry : p.y;
      if (this.x + PW - 2 <= px || this.x + 2 >= px + p.w) continue;

      if (p.type === 'ceiling') {
        if (this.vy < 0 && this.y < py + p.h && this.y + PH > py) {
          this.y = py + p.h; this.vy = 0;
        }
        continue;
      }

      if (this.gravityDir > 0) {
        if (this.vy < 0) continue;
        const prevBottom = this.y + PH - this.vy;
        if (this.y + PH > py && prevBottom <= py + 3) {
          this.y = py - PH; this.vy = 0; this.onGround = true;
          this.ridingPlat = p;
          if (p.crumble && p.crumbleLeft === undefined) {
            p.crumbleLeft = p.crumbleTime || 42;
          }
        }
      } else {
        // Inverted gravity: land on the underside.
        if (this.vy > 0) continue;
        const prevTop = this.y - this.vy;
        if (this.y < py + p.h && prevTop >= py + p.h - 3) {
          this.y = py + p.h; this.vy = 0; this.onGround = true;
          this.ridingPlat = p;
        }
      }
    }
  }

  // Damage
  /** Returns true if a life was actually lost. */
  hurt(fromX) {
    if (this.invul > 0 || this.dead) return false;
    if (this.shielded) {
      // Aegis eats the hit and burns out.
      for (const t in this.cores) {
        if (POWERUPS[t] && POWERUPS[t].grants && POWERUPS[t].grants.shield) this.cores[t] = 0;
      }
      this.invul = 50;
      Audio.sfx.shieldHit();
      Particles.emitExplosion(this.cx, this.cy);
      return false;
    }
    this.invul = INVUL_FRAMES;
    this.hurtLock = 26;
    this.vy = -4.4 * this.gravityDir;
    this.vx = (fromX !== undefined && fromX > this.x ? -1 : 1) * 3.2;
    Audio.sfx.hurt();
    Particles.emitHurt(this.cx, this.cy);
    return true;
  }

  kill() {
    if (this.dead) return;
    this.dead = true;
    this.deadTimer = 0;
    this.vy = -6;
    Audio.sfx.die();
    Particles.emitHurt(this.cx, this.cy);
  }

  bounce(power = -5.4) { this.vy = power * this.gravityDir; this.djumpUsed = false; }

  // Animation
  _animate() {
    if (this.dead) { this.state = 'hurt'; return; }
    if (this.hurtLock > 0) { this.state = 'hurt'; return; }
    if (this.dashTimer > 0) { this.state = 'jump'; return; }
    if (!this.onGround) {
      this.state = (this.gravityDir > 0 ? this.vy < 0 : this.vy > 0) ? 'jump' : 'fall';
      return;
    }
    const sp = Math.abs(this.vx);
    if (sp > 0.35) {
      this.state = 'run';
      if (++this.stepTimer % 14 === 0) {
        Particles.emitDust(this.cx, this.y + PH, -this.vx);
      }
    } else {
      this.state = 'idle';
    }
  }

  draw(ctx, camX, camY) {
    // Echo Core: a translucent double trailing behind.
    if (this.echo) {
      ctx.globalAlpha = 0.35;
      Spr.drawLuka(ctx, this.echo.x - camX, this.echo.y - camY,
                   'idle', this.frame, this.facing, false, 0);
      ctx.globalAlpha = 1;
      this.echo.x = approach(this.echo.x, this.x - this.facing * 26, 1.4);
      this.echo.y = approach(this.echo.y, this.y, 1.4);
    }

    if (this.dead) {
      const dy = this.deadTimer * this.deadTimer * 0.06 - this.deadTimer * 1.6;
      Spr.drawLuka(ctx, this.x - camX, this.y - camY + dy,
                   'hurt', this.frame, this.facing, false, 0);
      return;
    }

    ctx.save();
    if (this.gravityDir < 0) {
      // Flip Luka when gravity is inverted.
      ctx.translate(0, Math.round(this.y - camY) * 2 + PH);
      ctx.scale(1, -1);
    }
    Spr.drawLuka(ctx, this.x - camX, this.y - camY,
                 this.state, this.frame, this.facing, this.shielded, this.invul);
    ctx.restore();

    // Active-core aura
    const active = Object.keys(this.cores).filter(t => this.cores[t] > 0);
    if (active.length) {
      const t = active[0];
      const def = POWERUPS[t];
      const left = this.cores[t];
      // Blink out over the last second.
      if (left > 60 || (this.frame >> 2) % 2 === 0) {
        ctx.globalAlpha = 0.22 + Math.sin(this.frame * 0.12) * 0.1;
        ctx.fillStyle = def.color;
        ctx.fillRect(Math.round(this.x - camX) - 2, Math.round(this.y - camY) - 2, PW + 4, PH + 4);
        ctx.globalAlpha = 1;
      }
    }
  }
}
