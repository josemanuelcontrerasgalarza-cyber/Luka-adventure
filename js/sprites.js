'use strict';

// All procedural sprite drawing functions.
// Each draws at given (x,y) in world/canvas space.
// ctx.save/restore used for flipping.

const Spr = (() => {

  // Draw a "pixel" at integer coords (1x1 or 2x2 unit square)
  function px(ctx, c, x, y, s = 1) {
    ctx.fillStyle = c;
    ctx.fillRect(x, y, s, s);
  }

  // ─── LUKA ─────────────────────────────────────────────────
  function drawLuka(ctx, x, y, state, frame, facing, shielded, invulFrame) {
    if (invulFrame > 0 && Math.floor(invulFrame / 6) % 2 === 1) return;

    ctx.save();
    const fx = Math.floor(x);
    const fy = Math.floor(y);

    if (facing < 0) {
      ctx.translate(fx + PW, fy);
      ctx.scale(-1, 1);
    } else {
      ctx.translate(fx, fy);
    }

    const t = frame;

    // Leg animation for run
    let legL = 0, legR = 0;
    if (state === 'run') {
      legL = Math.sin(t * 0.35) * 3 | 0;
      legR = -legL;
    }

    // Body bob for idle
    let bob = 0;
    if (state === 'idle') {
      bob = Math.sin(t * 0.05) > 0 ? 0 : 1;
    }

    // Jump/fall offset
    let bodyOff = 0;
    if (state === 'jump') bodyOff = -1;

    const yy = bob + bodyOff;

    // ── Shield ──────────────────────────────────────────────
    if (shielded) {
      ctx.globalAlpha = 0.4;
      ctx.fillStyle = '#00CCFF';
      ctx.beginPath();
      ctx.arc(7, 10, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // ── Tail ────────────────────────────────────────────────
    ctx.fillStyle = COL.L_BODY;
    if (state === 'run') {
      const tw = (Math.sin(t * 0.4) * 2) | 0;
      ctx.fillRect(12, 12 + yy, 3, 1);
      ctx.fillRect(14, 11 + yy + tw, 2, 1);
      ctx.fillRect(15, 10 + yy + tw, 1, 1);
    } else {
      ctx.fillRect(12, 13 + yy, 3, 1);
      ctx.fillRect(14, 12 + yy, 2, 1);
      ctx.fillRect(15, 11 + yy, 1, 1);
    }

    // ── Ears ─────────────────────────────────────────────────
    ctx.fillStyle = COL.L_BODY;
    ctx.fillRect(1, 0 + yy, 3, 3);  // left ear
    ctx.fillRect(9, 0 + yy, 3, 3);  // right ear

    // Ear inner
    ctx.fillStyle = '#FFBBAA';
    ctx.fillRect(2, 1 + yy, 1, 2);
    ctx.fillRect(10, 1 + yy, 1, 2);

    // ── Head ─────────────────────────────────────────────────
    ctx.fillStyle = COL.L_BODY;
    ctx.fillRect(0, 2 + yy, 13, 8);

    // Face (lighter)
    ctx.fillStyle = COL.L_FACE;
    ctx.fillRect(2, 3 + yy, 9, 7);

    // Cheeks
    ctx.fillStyle = COL.L_BODY;
    ctx.fillRect(1, 4 + yy, 1, 4);
    ctx.fillRect(11, 4 + yy, 1, 4);

    // ── Eyes ─────────────────────────────────────────────────
    const blink = (t % 200 > 185) ? 0 : 2;
    if (state === 'hurt') {
      // X eyes
      ctx.fillStyle = '#FF0000';
      ctx.fillRect(3, 4 + yy, 1, 1); ctx.fillRect(4, 5 + yy, 1, 1);
      ctx.fillRect(4, 4 + yy, 1, 1); ctx.fillRect(3, 5 + yy, 1, 1);
      ctx.fillRect(8, 4 + yy, 1, 1); ctx.fillRect(9, 5 + yy, 1, 1);
      ctx.fillRect(9, 4 + yy, 1, 1); ctx.fillRect(8, 5 + yy, 1, 1);
    } else {
      ctx.fillStyle = COL.L_EYE;
      if (blink > 0) {
        ctx.fillRect(3, 5 + yy, 2, blink);
        ctx.fillRect(8, 5 + yy, 2, blink);
        // Eye shine
        ctx.fillStyle = COL.WHITE;
        ctx.fillRect(4, 5 + yy, 1, 1);
        ctx.fillRect(9, 5 + yy, 1, 1);
      } else {
        ctx.fillRect(3, 6 + yy, 2, 1);
        ctx.fillRect(8, 6 + yy, 2, 1);
      }
    }

    // ── Nose ─────────────────────────────────────────────────
    ctx.fillStyle = COL.L_NOSE;
    ctx.fillRect(6, 7 + yy, 2, 1);

    // Mouth
    ctx.fillStyle = COL.L_MOUTH;
    ctx.fillRect(5, 8 + yy, 1, 1);
    ctx.fillRect(8, 8 + yy, 1, 1);

    // ── Body ─────────────────────────────────────────────────
    ctx.fillStyle = COL.L_BODY;
    ctx.fillRect(1, 10 + yy, 11, 7);
    ctx.fillRect(2, 9 + yy, 9, 1);

    // Belly
    ctx.fillStyle = COL.L_FACE;
    ctx.fillRect(3, 11 + yy, 7, 4);

    // Stripe
    ctx.fillStyle = COL.L_DARK;
    ctx.fillRect(2, 13 + yy, 1, 3);
    ctx.fillRect(10, 13 + yy, 1, 3);

    // ── Legs ─────────────────────────────────────────────────
    ctx.fillStyle = COL.L_BODY;
    // Left leg
    ctx.fillRect(2, 17 + yy - Math.max(0, legL), 3, 3 + Math.max(0, legL));
    // Right leg
    ctx.fillRect(8, 17 + yy - Math.max(0, legR), 3, 3 + Math.max(0, legR));

    // Paws
    ctx.fillStyle = COL.L_FACE;
    ctx.fillRect(1, 19 + yy, 4, 1);
    ctx.fillRect(8, 19 + yy, 4, 1);

    // ── Victory pose ─────────────────────────────────────────
    if (state === 'victory') {
      const victf = Math.floor(t * 0.1) % 2;
      ctx.fillStyle = COL.L_BODY;
      // Arms up
      ctx.fillRect(-2, 9 + yy, 2, 4);
      ctx.fillRect(13, 9 + yy, 2, 4);
      // Stars
      ctx.fillStyle = COL.GOLD;
      if (victf === 0) {
        ctx.fillRect(-4, 7 + yy, 1, 1);
        ctx.fillRect(16, 7 + yy, 1, 1);
      } else {
        ctx.fillRect(-5, 6 + yy, 2, 2);
        ctx.fillRect(16, 6 + yy, 2, 2);
      }
    }

    ctx.restore();
  }

  // ─── VACUUM ROBOT (World 1) ───────────────────────────────
  function drawVacuum(ctx, x, y, frame) {
    ctx.save();
    ctx.translate(Math.floor(x), Math.floor(y));
    const t = frame;

    // Body (grey box)
    ctx.fillStyle = '#888888';
    ctx.fillRect(0, 2, 14, 10);
    ctx.fillStyle = '#AAAAAA';
    ctx.fillRect(1, 3, 12, 8);

    // Eye (red LED)
    ctx.fillStyle = '#FF2200';
    ctx.fillRect(5, 5, 4, 3);
    ctx.fillStyle = '#FF6600';
    ctx.fillRect(6, 6, 2, 1);

    // Nozzle
    ctx.fillStyle = '#555555';
    ctx.fillRect(14, 6, 3, 2);
    ctx.fillStyle = '#333333';
    ctx.fillRect(17, 5, 2, 4);

    // Suction effect
    if ((t >> 2) % 2 === 0) {
      ctx.fillStyle = 'rgba(200,200,200,0.4)';
      ctx.fillRect(19, 6, 2, 2);
    }

    // Wheels
    ctx.fillStyle = '#333333';
    ctx.fillRect(1, 12, 4, 3);
    ctx.fillRect(9, 12, 4, 3);

    // Wheel animation
    ctx.fillStyle = '#555555';
    const roll = (t * 2) % 4;
    ctx.fillRect(2, 12 + roll % 2, 2, 1);
    ctx.fillRect(10, 12 + ((roll + 2) % 4) % 2, 2, 1);

    ctx.restore();
  }

  // ─── SCHOOL DRONE (World 2) ───────────────────────────────
  function drawDrone(ctx, x, y, frame) {
    ctx.save();
    ctx.translate(Math.floor(x), Math.floor(y));
    const propSpin = Math.floor(frame * 0.5) % 2;

    // Propellers (left)
    ctx.fillStyle = '#555577';
    ctx.fillRect(-5, 3 + propSpin, 5, 1);
    // Propellers (right)
    ctx.fillRect(14, 3 + (propSpin === 0 ? 1 : 0), 5, 1);

    // Body
    ctx.fillStyle = '#8888CC';
    ctx.fillRect(1, 2, 11, 8);
    ctx.fillStyle = '#AAAAEE';
    ctx.fillRect(2, 3, 9, 6);

    // School symbol (book)
    ctx.fillStyle = '#444466';
    ctx.fillRect(4, 4, 5, 4);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(5, 5, 3, 2);

    // Camera lens
    ctx.fillStyle = '#222222';
    ctx.fillRect(4, 10, 5, 3);
    ctx.fillStyle = '#4444AA';
    ctx.fillRect(5, 11, 3, 1);

    ctx.restore();
  }

  // ─── PATROL ROBOT (World 3) ───────────────────────────────
  function drawPatrol(ctx, x, y, frame, facing) {
    ctx.save();
    ctx.translate(Math.floor(x), Math.floor(y));
    if (facing < 0) { ctx.translate(14, 0); ctx.scale(-1, 1); }
    const walkf = Math.floor(frame * 0.2) % 2;

    // Head
    ctx.fillStyle = '#666666';
    ctx.fillRect(2, 0, 10, 6);
    // Visor
    ctx.fillStyle = '#FF4400';
    ctx.fillRect(3, 2, 8, 3);
    ctx.fillStyle = '#FF8800';
    ctx.fillRect(4, 2, 6, 2);

    // Body
    ctx.fillStyle = '#555555';
    ctx.fillRect(0, 6, 14, 9);
    ctx.fillStyle = '#777777';
    ctx.fillRect(1, 7, 12, 7);

    // Badge
    ctx.fillStyle = '#2222AA';
    ctx.fillRect(4, 8, 6, 4);
    ctx.fillStyle = '#4444FF';
    ctx.fillRect(5, 9, 4, 2);

    // Legs
    ctx.fillStyle = '#444444';
    ctx.fillRect(2, 15, 3, 4 + walkf);
    ctx.fillRect(9, 15, 3, 4 + (1-walkf));

    // Feet
    ctx.fillStyle = '#333333';
    ctx.fillRect(1, 18 + walkf, 5, 2);
    ctx.fillRect(8, 18 + (1-walkf), 5, 2);

    // Arm / baton
    ctx.fillStyle = '#666666';
    ctx.fillRect(14, 7, 2, 6);
    ctx.fillStyle = '#888888';
    ctx.fillRect(15, 12, 1, 3);

    ctx.restore();
  }

  // ─── VIRUS (World 4) ──────────────────────────────────────
  function drawVirus(ctx, x, y, frame) {
    ctx.save();
    ctx.translate(Math.floor(x), Math.floor(y));
    const t = frame;
    const pulse = Math.sin(t * 0.2) * 0.5 + 0.5;

    // Glitch effect
    if ((t >> 3) % 4 === 0) {
      ctx.fillStyle = `rgba(0,255,200,${0.3 + pulse * 0.3})`;
      ctx.fillRect(-2 + ((t >> 1) % 5), -1, 16 + (t % 3), 16);
    }

    // Body
    ctx.fillStyle = `rgb(${180 + pulse*40|0},0,${200 + pulse*55|0})`;
    ctx.fillRect(2, 2, 10, 10);

    // Spikes
    ctx.fillStyle = '#FF00FF';
    ctx.fillRect(0, 5, 2, 4);    // left
    ctx.fillRect(12, 5, 2, 4);   // right
    ctx.fillRect(5, 0, 4, 2);    // top
    ctx.fillRect(5, 12, 4, 2);   // bottom

    // Eye
    ctx.fillStyle = '#00FFCC';
    ctx.fillRect(4, 5, 2, 4);
    ctx.fillRect(8, 5, 2, 4);

    // Corruption marks
    ctx.fillStyle = '#FF00FF';
    ctx.fillRect(5, 7, 4, 1);

    // Pixel glitch lines
    if ((t >> 2) % 3 === 0) {
      ctx.fillStyle = '#00FFFF';
      ctx.fillRect(2, 3 + (t % 8), 3, 1);
    }

    ctx.restore();
  }

  // ─── SPACE BOT (World 5) ──────────────────────────────────
  function drawSpacebot(ctx, x, y, frame, facing) {
    ctx.save();
    ctx.translate(Math.floor(x), Math.floor(y));
    if (facing < 0) { ctx.translate(14, 0); ctx.scale(-1, 1); }

    const float = Math.sin(frame * 0.08) * 2 | 0;

    // Jetpack flames
    if ((frame >> 3) % 2 === 0) {
      ctx.fillStyle = '#FF8800';
      ctx.fillRect(4, 16, 2, 2);
      ctx.fillRect(8, 16, 2, 2);
      ctx.fillStyle = '#FFFF00';
      ctx.fillRect(5, 17, 1, 1);
      ctx.fillRect(9, 17, 1, 1);
    }

    // Helmet
    ctx.fillStyle = '#AAAACC';
    ctx.fillRect(2, 0 + float, 10, 8);
    ctx.fillStyle = '#CCCCFF';
    ctx.fillRect(3, 1 + float, 8, 6);
    ctx.fillStyle = 'rgba(100,150,255,0.5)';
    ctx.fillRect(4, 2 + float, 6, 4);
    // Eyes (green LED)
    ctx.fillStyle = '#00FF88';
    ctx.fillRect(4, 3 + float, 2, 2);
    ctx.fillRect(8, 3 + float, 2, 2);

    // Body (space suit)
    ctx.fillStyle = '#8899BB';
    ctx.fillRect(1, 8 + float, 12, 8);
    ctx.fillStyle = '#AABBDD';
    ctx.fillRect(2, 9 + float, 10, 6);

    // Chest controls
    ctx.fillStyle = '#FF4400';
    ctx.fillRect(4, 10 + float, 2, 2);
    ctx.fillStyle = '#00FF00';
    ctx.fillRect(7, 10 + float, 2, 2);

    // Arms
    ctx.fillStyle = '#7788AA';
    ctx.fillRect(-1, 9 + float, 2, 5);
    ctx.fillRect(13, 9 + float, 2, 5);

    // Jetpack
    ctx.fillStyle = '#556677';
    ctx.fillRect(4, 14 + float, 6, 3);

    ctx.restore();
  }

  // ─── KERNEL-X BOSS ────────────────────────────────────────
  function drawBoss(ctx, x, y, phase, frame, hp, maxHp) {
    ctx.save();
    ctx.translate(Math.floor(x), Math.floor(y));
    const t = frame;

    const shake = (t % 3 === 0 && phase >= 2) ? (Math.random() * 4 - 2 | 0) : 0;

    // Body (main)
    ctx.fillStyle = phase === 1 ? '#556677' : phase === 2 ? '#775566' : '#775555';
    ctx.fillRect(4 + shake, 12, 56, 52);

    // Darker panel
    ctx.fillStyle = phase >= 2 ? '#553333' : '#445566';
    ctx.fillRect(8 + shake, 16, 48, 44);

    // Shoulder armor
    ctx.fillStyle = '#334455';
    ctx.fillRect(0 + shake, 18, 8, 28);
    ctx.fillRect(56 + shake, 18, 8, 28);

    // Head/camera pod
    ctx.fillStyle = '#223344';
    ctx.fillRect(16 + shake, 0, 32, 14);

    // Main eye (camera)
    const eyePulse = Math.sin(t * 0.1) * 0.5 + 0.5;
    ctx.fillStyle = phase === 3
      ? `rgb(${255 * eyePulse|0},0,0)`
      : phase === 2
        ? `rgb(${200*eyePulse|0},${100*eyePulse|0},0)`
        : `rgb(0,${150+100*eyePulse|0},${255*eyePulse|0})`;
    ctx.fillRect(24 + shake, 2, 16, 10);
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.fillRect(25 + shake, 3, 6, 4);

    // Core reactor
    ctx.fillStyle = `rgba(${phase===3?255:0},${phase<=2?200:50},${phase===1?255:50},${0.6 + eyePulse * 0.4})`;
    ctx.fillRect(22 + shake, 28, 20, 20);
    ctx.fillStyle = `rgba(255,255,255,0.3)`;
    ctx.fillRect(24 + shake, 30, 8, 6);

    // Arms (pistons)
    const armL = Math.sin(t * 0.05) * 5 | 0;
    const armR = Math.cos(t * 0.05) * 5 | 0;

    ctx.fillStyle = '#445566';
    ctx.fillRect(-12 + shake, 20 + armL, 12, 8);
    ctx.fillRect(64 + shake, 20 + armR, 12, 8);

    // Claws
    ctx.fillStyle = '#223344';
    ctx.fillRect(-16 + shake, 22 + armL, 5, 5);
    ctx.fillRect(75 + shake, 22 + armR, 5, 5);

    // Leg/tracks
    ctx.fillStyle = '#334455';
    ctx.fillRect(8 + shake, 60, 48, 8);
    ctx.fillStyle = '#223344';
    ctx.fillRect(6 + shake, 62, 52, 4);

    // Track pads
    ctx.fillStyle = '#445566';
    for (let i = 0; i < 7; i++) {
      ctx.fillRect(8 + i * 8 + ((t * 2) % 8) + shake - 4, 63, 5, 2);
    }

    // Phase 2/3 damage cracks
    if (phase >= 2) {
      ctx.fillStyle = '#FF4400';
      ctx.fillRect(15 + shake, 22, 3, 12);
      ctx.fillRect(45 + shake, 30, 2, 8);
    }
    if (phase >= 3) {
      ctx.fillStyle = '#FF2200';
      ctx.fillRect(20 + shake, 18, 4, 20);
      ctx.fillRect(40 + shake, 20, 3, 15);
      // Sparks
      if ((t >> 2) % 3 === 0) {
        ctx.fillStyle = '#FFFF00';
        ctx.fillRect(22 + (Math.random() * 20 | 0) + shake, 18 + (Math.random() * 30 | 0), 1, 1);
      }
    }

    ctx.restore();
  }

  // ─── COLLECTIBLES ─────────────────────────────────────────
  function drawTuna(ctx, x, y, frame) {
    ctx.save();
    ctx.translate(Math.floor(x), Math.floor(y));
    const t = frame;
    const bob = Math.sin(t * 0.08) * 1.5 | 0;

    // Fish body
    ctx.fillStyle = '#99CCFF';
    ctx.fillRect(1, 2 + bob, 8, 5);
    ctx.fillStyle = '#BBDDFF';
    ctx.fillRect(2, 3 + bob, 6, 3);

    // Tail
    ctx.fillStyle = '#7799EE';
    ctx.fillRect(8, 1 + bob, 3, 2);
    ctx.fillRect(8, 5 + bob, 3, 2);

    // Eye
    ctx.fillStyle = '#111111';
    ctx.fillRect(2, 3 + bob, 2, 2);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(2, 3 + bob, 1, 1);

    // Shine
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillRect(3, 2 + bob, 2, 1);

    ctx.restore();
  }

  function drawCoin(ctx, x, y, frame) {
    ctx.save();
    ctx.translate(Math.floor(x), Math.floor(y));
    const spin = Math.floor(frame * 0.15) % 4;
    const bob = Math.sin(frame * 0.1) * 1.5 | 0;

    if (spin === 0) {
      ctx.fillStyle = '#FFD700';
      ctx.fillRect(1, 1 + bob, 6, 7);
      ctx.fillStyle = '#FFC000';
      ctx.fillRect(2, 2 + bob, 4, 5);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(2, 2 + bob, 1, 2);
      ctx.fillStyle = '#AA8800';
      ctx.fillRect(3, 4 + bob, 2, 1);
    } else if (spin === 1 || spin === 3) {
      ctx.fillStyle = '#FFD700';
      ctx.fillRect(3, 1 + bob, 2, 7);
    } else {
      ctx.fillStyle = '#FFD700';
      ctx.fillRect(1, 1 + bob, 6, 7);
      ctx.fillStyle = '#FFEE88';
      ctx.fillRect(4, 2 + bob, 2, 5);
    }

    ctx.restore();
  }

  function drawHeart(ctx, x, y, frame) {
    ctx.save();
    ctx.translate(Math.floor(x), Math.floor(y));
    const bob = Math.sin(frame * 0.12) * 1.5 | 0;
    const pulse = Math.sin(frame * 0.15) > 0 ? 0 : 1;

    ctx.fillStyle = '#FF3333';
    ctx.fillRect(1, 2 + bob - pulse, 3, 4 + pulse);
    ctx.fillRect(6, 2 + bob - pulse, 3, 4 + pulse);
    ctx.fillRect(0, 3 + bob - pulse, 10, 3 + pulse);
    ctx.fillRect(1, 5 + bob, 8, 2);
    ctx.fillRect(2, 6 + bob, 6, 2);
    ctx.fillRect(3, 7 + bob, 4, 2);
    ctx.fillRect(4, 8 + bob, 2, 1);

    // Shine
    ctx.fillStyle = '#FF9999';
    ctx.fillRect(2, 3 + bob, 2, 1);

    ctx.restore();
  }

  function drawPowerup(ctx, x, y, type, frame) {
    ctx.save();
    ctx.translate(Math.floor(x), Math.floor(y));
    const t = frame;
    const glow = Math.sin(t * 0.1) * 0.5 + 0.5;
    const bob = Math.sin(t * 0.09) * 1.5 | 0;

    // Glow aura
    ctx.globalAlpha = glow * 0.3;
    ctx.fillStyle = type === CT.PU_DJUMP ? '#00CCFF'
                  : type === CT.PU_SPEED  ? '#FFAA00'
                  : '#00FF88';
    ctx.fillRect(-2, -2 + bob, 16, 16);
    ctx.globalAlpha = 1;

    // Box
    ctx.fillStyle = type === CT.PU_DJUMP ? '#0088CC'
                  : type === CT.PU_SPEED  ? '#CC6600'
                  : '#006644';
    ctx.fillRect(1, 1 + bob, 10, 10);
    ctx.fillStyle = type === CT.PU_DJUMP ? '#00AAFF'
                  : type === CT.PU_SPEED  ? '#FFAA00'
                  : '#00BB66';
    ctx.fillRect(2, 2 + bob, 8, 8);

    // Symbol
    ctx.fillStyle = '#FFFFFF';
    if (type === CT.PU_DJUMP) {
      // Double arrow up
      ctx.fillRect(5, 3 + bob, 2, 5);
      ctx.fillRect(3, 5 + bob, 6, 1);
      ctx.fillRect(4, 4 + bob, 4, 1);
    } else if (type === CT.PU_SPEED) {
      // Lightning bolt
      ctx.fillRect(6, 2 + bob, 2, 4);
      ctx.fillRect(4, 5 + bob, 4, 1);
      ctx.fillRect(4, 6 + bob, 2, 3);
    } else {
      // Shield
      ctx.fillRect(4, 3 + bob, 4, 6);
      ctx.fillRect(3, 4 + bob, 6, 4);
      ctx.fillRect(5, 8 + bob, 2, 1);
    }

    ctx.restore();
  }

  // ─── CHECKPOINT FLAG ──────────────────────────────────────
  function drawCheckpoint(ctx, x, y, activated, frame) {
    ctx.save();
    ctx.translate(Math.floor(x), Math.floor(y));

    // Pole
    ctx.fillStyle = '#888888';
    ctx.fillRect(4, 0, 2, 30);

    // Flag
    const wave = Math.sin(frame * 0.12) * 2;
    if (!activated) {
      ctx.fillStyle = '#888888';
    } else {
      ctx.fillStyle = '#33FF33';
    }
    ctx.fillRect(6, 2, 10, 2 + wave);
    ctx.fillRect(6, 4 + wave, 10, 2);
    ctx.fillRect(6, 6 + wave*0.5, 10, 2);

    ctx.restore();
  }

  // ─── GOAL / EXIT ──────────────────────────────────────────
  function drawGoal(ctx, x, y, frame) {
    ctx.save();
    ctx.translate(Math.floor(x), Math.floor(y));
    const t = frame;

    // Portal ring
    const pulse = Math.sin(t * 0.08) * 0.3 + 0.7;
    ctx.globalAlpha = pulse;
    ctx.fillStyle = '#FFD700';
    ctx.fillRect(0, 0, 24, 2);
    ctx.fillRect(0, 30, 24, 2);
    ctx.fillRect(0, 0, 2, 32);
    ctx.fillRect(22, 0, 2, 32);

    // Inner glow
    ctx.globalAlpha = pulse * 0.5;
    ctx.fillStyle = '#FFFFAA';
    ctx.fillRect(2, 2, 20, 28);
    ctx.globalAlpha = 1;

    // Star
    ctx.fillStyle = '#FFD700';
    ctx.fillRect(10, 12, 4, 8);
    ctx.fillRect(7, 15, 10, 2);
    // Star diagonals
    ctx.fillRect(8, 13, 1, 1); ctx.fillRect(15, 13, 1, 1);
    ctx.fillRect(8, 18, 1, 1); ctx.fillRect(15, 18, 1, 1);

    ctx.restore();
  }

  // ─── PARTICLES ────────────────────────────────────────────
  function drawStar(ctx, x, y, size, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, size, size);
  }

  // ─── PLATFORM DECORATIONS ─────────────────────────────────
  function drawSofaDecor(ctx, x, y, w) {
    // Sofa cushions
    ctx.fillStyle = '#CC9955';
    for (let i = 0; i < Math.floor(w / 30); i++) {
      ctx.fillRect(x + 4 + i*30, y - 4, 24, 4);
    }
    // Buttons
    ctx.fillStyle = '#AA7733';
    for (let i = 0; i < Math.floor(w / 30); i++) {
      ctx.fillRect(x + 15 + i*30, y - 2, 2, 2);
    }
  }

  function drawDeskDecor(ctx, x, y, w) {
    // Book on desk
    ctx.fillStyle = '#DD4444';
    ctx.fillRect(x + 4, y - 8, 6, 8);
    ctx.fillStyle = '#BB2222';
    ctx.fillRect(x + 4, y - 8, 1, 8);
    // Pencil
    ctx.fillStyle = '#FFDD44';
    ctx.fillRect(x + 14, y - 10, 2, 10);
    ctx.fillStyle = '#FF9933';
    ctx.fillRect(x + 14, y - 12, 2, 2);
  }

  // ─── BACKGROUND ELEMENTS ──────────────────────────────────
  function drawWindow(ctx, x, y) {
    ctx.fillStyle = '#AADDFF';
    ctx.fillRect(x, y, 32, 28);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(x + 1, y, 30, 14);
    ctx.fillRect(x + 1, y + 14, 30, 14);
    ctx.fillStyle = '#8888AA';
    ctx.fillRect(x + 15, y, 2, 28);
    ctx.fillRect(x, y + 13, 32, 2);
  }

  function drawBookcase(ctx, x, y) {
    ctx.fillStyle = '#8B6914';
    ctx.fillRect(x, y, 30, 60);
    const colors = ['#FF4444','#4444FF','#44AA44','#FF8800','#AA44FF'];
    for (let shelf = 0; shelf < 4; shelf++) {
      for (let book = 0; book < 3; book++) {
        ctx.fillStyle = colors[(shelf * 3 + book) % colors.length];
        ctx.fillRect(x + 4 + book * 8, y + 4 + shelf * 14, 6, 12);
      }
      ctx.fillStyle = '#5D4E07';
      ctx.fillRect(x, y + 14 + shelf * 14, 30, 2);
    }
  }

  function drawBuilding(ctx, x, y, w, h, color, winColor) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
    // Windows
    ctx.fillStyle = winColor;
    for (let wy = y + 6; wy < y + h - 10; wy += 14) {
      for (let wx = x + 5; wx < x + w - 8; wx += 12) {
        ctx.fillRect(wx, wy, 8, 8);
      }
    }
  }

  function drawDigitalPlatform(ctx, x, y, w, frame) {
    const t = frame;
    const glitch = (t >> 4) % 5 === 0;

    ctx.fillStyle = '#0033AA';
    ctx.fillRect(x, y, w, 8);
    ctx.fillStyle = '#0055FF';
    ctx.fillRect(x, y + 1, w, 2);

    // Circuit pattern
    ctx.fillStyle = '#00AAFF';
    for (let i = 0; i < w; i += 12) {
      ctx.fillRect(x + i, y, 4, 1);
      if (i + 6 < w) ctx.fillRect(x + i + 6, y + 3, 2, 3);
    }

    // Glitch
    if (glitch) {
      ctx.fillStyle = 'rgba(0,255,255,0.4)';
      ctx.fillRect(x + (t % 20), y, 8, 8);
    }
  }

  function drawAsteroid(ctx, x, y, w, h) {
    ctx.fillStyle = '#555566';
    ctx.fillRect(x + 2, y, w - 4, h);
    ctx.fillRect(x, y + 3, w, h - 6);
    ctx.fillStyle = '#777788';
    ctx.fillRect(x + 4, y + 1, w - 8, 2);
    ctx.fillRect(x + 3, y + 2, w - 6, 1);
    // Craters
    ctx.fillStyle = '#444455';
    ctx.fillRect(x + 5, y + h/2|0, 4, 3);
    ctx.fillRect(x + w - 10, y + h/2+2|0, 3, 3);
  }

  function drawStar2(ctx, x, y, size, twinkle) {
    ctx.fillStyle = twinkle ? '#FFFFFF' : '#CCCCCC';
    ctx.fillRect(x, y, size, size);
  }

  // ─── HUD ICONS ────────────────────────────────────────────
  function drawHeartIcon(ctx, x, y, full) {
    ctx.fillStyle = full ? '#FF3333' : '#552222';
    ctx.fillRect(x+1, y+1, 3, 4);
    ctx.fillRect(x+6, y+1, 3, 4);
    ctx.fillRect(x, y+2, 10, 3);
    ctx.fillRect(x+1, y+4, 8, 2);
    ctx.fillRect(x+2, y+5, 6, 2);
    ctx.fillRect(x+3, y+6, 4, 2);
    ctx.fillRect(x+4, y+7, 2, 1);
  }

  function drawTunaIcon(ctx, x, y) {
    ctx.fillStyle = '#99CCFF';
    ctx.fillRect(x+1, y+2, 6, 4);
    ctx.fillStyle = '#7799EE';
    ctx.fillRect(x+7, y+1, 2, 2);
    ctx.fillRect(x+7, y+5, 2, 2);
    ctx.fillStyle = '#111111';
    ctx.fillRect(x+2, y+3, 1, 1);
  }

  return {
    drawLuka, drawVacuum, drawDrone, drawPatrol, drawVirus, drawSpacebot,
    drawBoss, drawTuna, drawCoin, drawHeart, drawPowerup,
    drawCheckpoint, drawGoal, drawStar, drawStar2,
    drawSofaDecor, drawDeskDecor,
    drawWindow, drawBookcase, drawBuilding, drawDigitalPlatform, drawAsteroid,
    drawHeartIcon, drawTunaIcon,
  };
})();
