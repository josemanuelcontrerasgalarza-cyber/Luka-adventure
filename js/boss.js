'use strict';

class Boss {
  constructor() {
    this.x = 300;
    this.y = 110;
    this.w = 64;
    this.h = 68;
    this.maxHp = 150;
    this.hp = this.maxHp;
    this.frame = 0;
    this.phase = 1;
    this.alive = true;
    this.defeated = false;

    // State machine
    this.state = 'enter'; // enter, idle, charge, laser, slam, projectile, hurt, die
    this.stateTimer = 120;
    this.actionTimer = 0;
    this.cooldownTimer = 0;

    this.vx = 0;
    this.vy = 0;
    this.onGround = false;

    this.laserActive = false;
    this.laserTimer = 0;
    this.laserX = 0;

    this.projectiles = [];
    this.attackPattern = 0;

    // Screen shake
    this.shakeTimer = 0;

    // Hit flash
    this.hitFlash = 0;
  }

  get phaseHpThresholds() {
    return [
      this.maxHp,
      Math.floor(this.maxHp * 0.67),
      Math.floor(this.maxHp * 0.33),
      0,
    ];
  }

  updatePhase() {
    const prev = this.phase;
    if (this.hp > this.phaseHpThresholds[1]) this.phase = 1;
    else if (this.hp > this.phaseHpThresholds[2]) this.phase = 2;
    else this.phase = 3;

    if (this.phase > prev) {
      this.stateTimer = 80;
      this.state = 'phase_change';
      Audio.sfx.bossPhase();
      Particles.emitExplosion(this.x + this.w/2, this.y + this.h/2);
    }
  }

  update(level, player, projectileArr) {
    if (!this.alive) return;
    this.frame++;

    if (this.hitFlash > 0) this.hitFlash--;
    if (this.shakeTimer > 0) this.shakeTimer--;

    // Apply gravity
    this.vy += GRAVITY * 0.8;
    if (this.vy > 8) this.vy = 8;
    this.y += this.vy;

    // Ground collision
    const ground = level.grounds[0];
    if (this.y + this.h > ground.y) {
      this.y = ground.y - this.h;
      this.vy = 0;
      if (!this.onGround) {
        this.onGround = true;
        this.shakeTimer = 20;
        Particles.emitExplosion(this.x + this.w/2, this.y + this.h);
      }
    } else {
      this.onGround = false;
    }

    // X movement
    this.x += this.vx;
    if (this.x < 20) { this.x = 20; this.vx = Math.abs(this.vx); }
    if (this.x + this.w > level.width - 20) { this.x = level.width - 20 - this.w; this.vx = -Math.abs(this.vx); }

    this.stateTimer--;

    // Projectiles
    this.projectiles.forEach(p => p.update());
    this.projectiles = this.projectiles.filter(p => p.alive);
    // Copy to external array
    projectileArr.length = 0;
    this.projectiles.forEach(p => projectileArr.push(p));

    // Laser update
    if (this.laserActive) {
      this.laserTimer--;
      if (this.laserTimer <= 0) this.laserActive = false;
    }

    // State machine
    switch (this.state) {
      case 'enter':
        if (this.stateTimer <= 0) this._nextAction();
        break;

      case 'idle':
        if (this.stateTimer <= 0) this._nextAction();
        break;

      case 'charge':
        this._doCharge(player);
        break;

      case 'laser':
        this._doLaser(player);
        break;

      case 'slam':
        this._doSlam(player);
        break;

      case 'projectile':
        this._doProjectile(player);
        break;

      case 'phase_change':
        if (this.stateTimer <= 0) {
          this.state = 'idle';
          this.stateTimer = 60;
        }
        break;

      case 'hurt':
        this.vx *= 0.9;
        if (this.stateTimer <= 0) this._nextAction();
        break;

      case 'die':
        this._doDeath();
        break;
    }

    // Check player contact damage
    if (this.touchesPlayer(player) && this.state !== 'die') {
      return 'damage';
    }

    // Check projectile hits on player
    for (const proj of this.projectiles) {
      if (proj.alive && proj.touchesPlayer(player)) {
        proj.alive = false;
        return 'damage';
      }
    }

    // Laser damage (column)
    if (this.laserActive) {
      const b = player.bounds;
      if (b.x + b.w > this.laserX && b.x < this.laserX + 4) {
        return 'damage';
      }
    }

    return null;
  }

  _nextAction() {
    this.cooldownTimer = 0;
    const phase = this.phase;
    const rng = Math.random();

    if (phase === 1) {
      if (rng < 0.5) this._startCharge();
      else this._startProjectile(3);
    } else if (phase === 2) {
      if (rng < 0.35) this._startCharge();
      else if (rng < 0.65) this._startLaser();
      else this._startProjectile(5);
    } else {
      if (rng < 0.25) this._startCharge();
      else if (rng < 0.5) this._startLaser();
      else if (rng < 0.7) this._startSlam();
      else this._startProjectile(8);
    }
  }

  _startCharge() {
    this.state = 'charge';
    this.stateTimer = 40;
    this.actionTimer = 40;
    Audio.sfx.shoot();
  }

  _doCharge(player) {
    if (this.actionTimer > 20) {
      // Wind up
      this.vx *= 0.8;
    } else if (this.actionTimer > 0) {
      // Charge
      const dir = player.x > this.x ? 1 : -1;
      this.vx = dir * (this.phase === 3 ? 5 : 3.5);
    }
    this.actionTimer--;
    if (this.stateTimer <= 0) {
      this.vx = 0;
      this.state = 'idle';
      this.stateTimer = 45 - this.phase * 5;
    }
  }

  _startLaser() {
    this.state = 'laser';
    this.stateTimer = 80;
    this.actionTimer = 80;
    this.laserActive = false;
    Audio.sfx.shieldOn();
  }

  _doLaser(player) {
    if (this.actionTimer > 40) {
      // Warning phase - laser not active
      this.laserX = player.x;
    } else if (this.actionTimer === 40) {
      // Fire!
      this.laserActive = true;
      this.laserTimer = 40;
      this.laserX = player.x;
      Particles.emitExplosion(this.laserX, this.y + this.h);
    }
    this.actionTimer--;
    if (this.stateTimer <= 0) {
      this.laserActive = false;
      this.state = 'idle';
      this.stateTimer = 60;
    }
  }

  _startSlam() {
    this.state = 'slam';
    this.stateTimer = 60;
    this.actionTimer = 60;
    this.vy = -8;
  }

  _doSlam(player) {
    this.actionTimer--;
    if (this.onGround && this.actionTimer < 40) {
      // On landing - shockwave
      if (this.actionTimer === 39) {
        this.shakeTimer = 25;
        Particles.emitExplosion(this.x + this.w/2, this.y + this.h);
        Audio.sfx.explosion();
        // Shockwave projectiles
        for (let i = -2; i <= 2; i++) {
          if (i === 0) continue;
          this.projectiles.push(new Projectile(
            this.x + this.w/2, this.y + this.h - 4,
            i * 2.5, -1,
            '#FF8800', 6, 'boss'
          ));
        }
      }
      if (this.stateTimer <= 0) {
        this.state = 'idle';
        this.stateTimer = 50;
      }
    }
  }

  _startProjectile(count) {
    this.state = 'projectile';
    this.stateTimer = count * 15 + 30;
    this.actionTimer = count;
    this._fireProjectileWave(count);
  }

  _fireProjectileWave(count) {
    const cx = this.x + this.w / 2;
    const cy = this.y + this.h / 3;
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI / (count + 1)) * (i + 1) + Math.PI;
      const spd = this.phase === 3 ? 4 : 2.8;
      this.projectiles.push(new Projectile(
        cx, cy,
        Math.cos(angle) * spd,
        Math.sin(angle) * spd + 0.5,
        this.phase === 3 ? '#FF2200' : this.phase === 2 ? '#FF8800' : '#FFCC00',
        this.phase === 3 ? 8 : 6,
        'boss'
      ));
    }
    Audio.sfx.shoot();
  }

  _doProjectile(player) {
    if (this.stateTimer <= 0) {
      this.state = 'idle';
      this.stateTimer = 50;
    }
  }

  _doDeath() {
    if (this.stateTimer <= 0 && !this.defeated) {
      this.defeated = true;
    }
    if ((this.frame % 10) < 5) {
      Particles.emitExplosion(
        this.x + Math.random() * this.w,
        this.y + Math.random() * this.h
      );
    }
  }

  takeDamage(amount) {
    if (!this.alive || this.state === 'die') return;
    this.hp -= amount;
    this.hitFlash = 12;
    Audio.sfx.bossHit();
    Particles.emitBossHit(this.x + this.w/2, this.y + this.h/4);

    if (this.hp <= 0) {
      this.hp = 0;
      this.alive = true;
      this.state = 'die';
      this.stateTimer = 180;
      this.vx = 0;
      Audio.sfx.explosion();
    } else {
      this.updatePhase();
      if (this.state !== 'phase_change') {
        this.state = 'hurt';
        this.stateTimer = 15;
        this.vx = (Math.random() - 0.5) * 4;
      }
    }
  }

  touchesPlayer(player) {
    const b = player.bounds;
    return this.x < b.x + b.w - 3
        && this.x + this.w > b.x + 3
        && this.y < b.y + b.h
        && this.y + this.h > b.y;
  }

  // Can player stomp (jump on top of) boss?
  isPlayerAbove(player) {
    return player.vy > 0
        && player.y + PH < this.y + 15
        && player.x + PW > this.x + 8
        && player.x < this.x + this.w - 8;
  }

  draw(ctx, camX) {
    if (this.state === 'die' && this.defeated) return;

    const sx = this.shakeTimer > 0 ? (Math.random() * 4 - 2 | 0) : 0;

    // Laser warning / active
    if (this.state === 'laser') {
      if (this.actionTimer > 40) {
        // Warning stripe (red flash)
        ctx.globalAlpha = ((40 - this.actionTimer) / 40) * 0.4;
        ctx.fillStyle = '#FF4400';
        ctx.fillRect(this.laserX - camX, HUD_H, 4, VH);
        ctx.globalAlpha = 1;
      } else if (this.laserActive) {
        ctx.globalAlpha = 0.9;
        ctx.fillStyle = '#FF2200';
        ctx.fillRect(this.laserX - camX, HUD_H, 4, VH);
        ctx.fillStyle = '#FFFF00';
        ctx.fillRect(this.laserX - camX + 1, HUD_H, 2, VH);
        ctx.globalAlpha = 1;
      }
    }

    // Hit flash
    if (this.hitFlash > 0 && Math.floor(this.hitFlash / 3) % 2 === 0) {
      ctx.globalAlpha = 0.7;
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(this.x - camX + sx, this.y, this.w, this.h);
      ctx.globalAlpha = 1;
    }

    Spr.drawBoss(ctx, this.x - camX + sx, this.y, this.phase, this.frame, this.hp, this.maxHp);

    // Draw projectiles
    for (const p of this.projectiles) {
      p.draw(ctx, camX);
    }

    // HP bar
    this._drawHPBar(ctx);
  }

  _drawHPBar(ctx) {
    const barW = 200;
    const barH = 12;
    const bx = (VW - barW) / 2;
    const by = HUD_H + 6;

    // Background
    ctx.fillStyle = '#222222';
    ctx.fillRect(bx - 2, by - 2, barW + 4, barH + 4);

    // HP fill
    const pct = Math.max(0, this.hp / this.maxHp);
    const col = this.phase === 3 ? '#FF2200' : this.phase === 2 ? '#FF8800' : '#FF4444';
    ctx.fillStyle = '#440000';
    ctx.fillRect(bx, by, barW, barH);
    ctx.fillStyle = col;
    ctx.fillRect(bx, by, barW * pct | 0, barH);
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.fillRect(bx, by, barW * pct | 0, barH / 2 | 0);

    // Label
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 7px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('KERNEL-X', VW / 2, by - 2);
    ctx.textAlign = 'left';

    // Phase dots
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = i < this.phase - 1 ? '#FF4400' : '#FF8800';
      ctx.fillRect(bx + barW + 6 + i * 8, by + 2, 5, 8);
    }
  }
}
