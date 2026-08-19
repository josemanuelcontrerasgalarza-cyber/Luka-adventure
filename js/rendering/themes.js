'use strict';

// THEME RENDERING
// Each world gets its own sky, three parallax layers, ground texture and
// ambient particles. All drawn procedurally — no image assets to load.

const Themes = (() => {

  // Cached parallax silhouettes per theme, generated once from a fixed seed.
  const shapeCache = new Map();

  function shapesFor(theme, layer, width) {
    const key = theme + ':' + layer;
    if (shapeCache.has(key)) return shapeCache.get(key);
    const rng = new RNG(hashSeed(key));
    const out = [];
    const span = 1400;                       // shapes tile every `span` px
    const count = layer === 0 ? 10 : layer === 1 ? 14 : 18;

    for (let i = 0; i < count; i++) {
      out.push({
        x: rng.range(0, span),
        w: rng.range(30, 110) * (1 - layer * 0.2),
        h: rng.range(24, 80) * (1 - layer * 0.15),
        v: rng.range(0, 1),
      });
    }
    shapeCache.set(key, { span, items: out });
    return shapeCache.get(key);
  }

  // Sky
  function drawSky(ctx, level) {
    const p = level.palette;
    const g = ctx.createLinearGradient(0, 0, 0, VH);
    g.addColorStop(0, p.sky[0]);
    g.addColorStop(1, p.sky[1]);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, VW, VH);
  }

  // Parallax
  const LAYER_SPEED = [0.15, 0.32, 0.55];

  function drawParallax(ctx, level, camX, camY, frame) {
    const p = level.palette;
    const colors = [p.far, p.mid, p.near];
    const theme = level.theme;

    for (let L = 0; L < 3; L++) {
      const { span, items } = shapesFor(theme, L, level.width);
      const off = (camX * LAYER_SPEED[L]) % span;
      const baseY = VH - 20 - L * 4 + camY * 0.06;
      ctx.fillStyle = colors[L];

      // Draw two tiles so the band never runs out on screen.
      for (let tile = -1; tile <= 1; tile++) {
        for (const s of items) {
          const sx = Math.round(s.x - off + tile * span);
          if (sx > VW + 120 || sx + s.w < -120) continue;
          drawShape(ctx, theme, L, sx, baseY, s, frame, p);
        }
      }
    }
  }

  function drawShape(ctx, theme, L, x, baseY, s, frame, p) {
    const w = Math.round(s.w), h = Math.round(s.h);
    switch (theme) {
      case 'meadow': {
        // Rolling hills with the odd tree.
        ctx.fillRect(x, baseY - h, w, h + 24);
        if (L === 2 && s.v > 0.6) {
          ctx.fillRect(x + w / 2 - 2, baseY - h - 16, 4, 16);
          ctx.fillRect(x + w / 2 - 9, baseY - h - 26, 18, 12);
        }
        break;
      }
      case 'desert': {
        // Dunes, plus pyramids in the far layer.
        if (L === 0 && s.v > 0.55) {
          for (let i = 0; i < h; i += 2) {
            const ww = Math.round(w * (1 - i / h));
            ctx.fillRect(x + (w - ww) / 2, baseY - h + i, ww, 2);
          }
        } else {
          ctx.fillRect(x, baseY - h * 0.6, w, h + 24);
        }
        break;
      }
      case 'cavern': {
        // Stalactites above, stalagmites below.
        if (s.v > 0.5) {
          for (let i = 0; i < h; i += 2) {
            const ww = Math.round(w * (1 - i / h) * 0.6);
            ctx.fillRect(x + (w - ww) / 2, HUD_H + i, ww, 2);
          }
        } else {
          for (let i = 0; i < h; i += 2) {
            const ww = Math.round(w * (i / h) * 0.6);
            ctx.fillRect(x + (w - ww) / 2, baseY - h + i, ww, 2);
          }
          ctx.fillRect(x, baseY, w, 24);
        }
        break;
      }
      case 'forest': {
        // Trunks and canopy blobs.
        ctx.fillRect(x + w / 2 - 4 - L, baseY - h - 20, 8 + L * 2, h + 44);
        ctx.fillRect(x, baseY - h - 34, w, 22);
        ctx.fillRect(x + 6, baseY - h - 42, w - 12, 12);
        break;
      }
      case 'frozen': {
        // Jagged glaciers.
        for (let i = 0; i < h; i += 2) {
          const ww = Math.round(w * (1 - i / h) * 0.9);
          ctx.fillRect(x + (w - ww) / 2, baseY - h + i, ww, 2);
        }
        ctx.fillRect(x, baseY, w, 24);
        break;
      }
      case 'sky': {
        // Cloud banks and floating rock.
        const drift = Math.sin(frame * 0.004 + s.x) * 6;
        ctx.fillRect(x + drift, baseY - h - 30, w, h * 0.5);
        ctx.fillRect(x + drift + 8, baseY - h - 38, w - 16, h * 0.4);
        if (L === 2 && s.v > 0.7) {
          ctx.fillRect(x + drift + w / 4, baseY - h + 6, w / 2, 10);
        }
        break;
      }
      case 'clockwork': {
        // Towers and slowly turning gears.
        ctx.fillRect(x, baseY - h, w * 0.7, h + 24);
        if (s.v > 0.5) {
          const cx = x + w * 0.8, cy = baseY - h * 0.7, r = 8 + L * 3;
          const a = frame * 0.01 * (L + 1);
          for (let i = 0; i < 6; i++) {
            const t = a + (Math.PI * 2 / 6) * i;
            ctx.fillRect(cx + Math.cos(t) * r - 2, cy + Math.sin(t) * r - 2, 4, 4);
          }
          ctx.fillRect(cx - 3, cy - 3, 6, 6);
        }
        break;
      }
      case 'volcano': {
        // Cones with glowing caldera.
        for (let i = 0; i < h; i += 2) {
          const ww = Math.round(w * (1 - i / h));
          ctx.fillRect(x + (w - ww) / 2, baseY - h + i, ww, 2);
        }
        ctx.fillRect(x, baseY, w, 24);
        if (L === 0 && s.v > 0.7) {
          ctx.save();
          ctx.fillStyle = '#FF7A29';
          ctx.globalAlpha = 0.5 + Math.sin(frame * 0.05) * 0.3;
          ctx.fillRect(x + w / 2 - 3, baseY - h - 4, 6, 6);
          ctx.restore();
        }
        break;
      }
      case 'void':
      default: {
        // Broken geometry adrift.
        const wobble = Math.sin(frame * 0.02 + s.x * 0.1) * 4;
        ctx.fillRect(x, baseY - h + wobble, w, h * 0.4);
        ctx.fillRect(x + w * 0.2, baseY - h * 0.4 + wobble, w * 0.5, h * 0.3);
        break;
      }
    }
  }

  // Ground & platforms
  function drawGround(ctx, level, camX, camY) {
    const p = level.palette;
    for (const g of level.grounds) {
      const x = Math.round(g.x - camX);
      const y = Math.round(g.y - camY);
      if (x + g.w < -8 || x > VW + 8) continue;

      ctx.fillStyle = p.dirt;
      ctx.fillRect(x, y, g.w, g.h);
      ctx.fillStyle = p.ground;
      ctx.fillRect(x, y, g.w, Math.min(10, g.h));
      ctx.fillStyle = p.edge;
      ctx.fillRect(x, y, g.w, 2);

      groundTexture(ctx, level.theme, x, y, g.w, g.h, p);
    }
  }

  function groundTexture(ctx, theme, x, y, w, h, p) {
    ctx.fillStyle = p.dirt;
    const start = Math.max(0, -x);
    const end = Math.min(w, VW - x);
    switch (theme) {
      case 'meadow':
        ctx.fillStyle = p.edge;
        for (let i = start; i < end; i += 7) ctx.fillRect(x + i, y - 2, 1, 2);
        break;
      case 'desert':
        ctx.fillStyle = 'rgba(255,255,255,0.14)';
        for (let i = start; i < end; i += 12) ctx.fillRect(x + i, y + 6, 7, 1);
        break;
      case 'cavern':
        ctx.fillStyle = p.edge;
        for (let i = start; i < end; i += 26) ctx.fillRect(x + i, y + 4, 2, 3);
        break;
      case 'frozen':
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        for (let i = start; i < end; i += 16) ctx.fillRect(x + i, y + 3, 5, 1);
        break;
      case 'clockwork':
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        for (let i = start; i < end; i += 10) ctx.fillRect(x + i, y + 4, 5, 2);
        break;
      case 'volcano':
        ctx.fillStyle = '#FF7A29';
        for (let i = start; i < end; i += 30) ctx.fillRect(x + i, y + 7, 8, 1);
        break;
      case 'void':
        ctx.fillStyle = p.edge;
        for (let i = start; i < end; i += 18) ctx.fillRect(x + i, y + 5, 1, 4);
        break;
    }
  }

  function drawPlatform(ctx, plat, level, camX, camY, frame) {
    if (plat.gone) return;
    const p = level.palette;
    const x = Math.round(plat.rx !== undefined ? plat.rx - camX : plat.x - camX);
    const y = Math.round(plat.ry !== undefined ? plat.ry - camY : plat.y - camY);
    const w = plat.w, h = plat.h;
    if (x + w < -8 || x > VW + 8) return;

    // Blinking platforms fade rather than pop.
    if (plat.phase) {
      const on = plat.phaseOn;
      ctx.globalAlpha = on ? 1 : 0.22;
    }
    // Crumbling platforms shake as they go.
    let sx = 0;
    if (plat.crumble && plat.crumbleLeft !== undefined && plat.crumbleLeft < 30) {
      sx = ((frame >> 1) % 2) ? 1 : -1;
    }

    if (plat.type === 'ceiling') {
      ctx.fillStyle = p.dirt;
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = p.ground;
      ctx.fillRect(x, y + h - 2, w, 2);
      ctx.globalAlpha = 1;
      return;
    }

    ctx.fillStyle = plat.crumble ? '#8A6A4A'
                  : plat.conveyor ? '#5A5A6E'
                  : p.plat;
    ctx.fillRect(x + sx, y, w, h);

    ctx.fillStyle = plat.phase ? p.accent : p.edge;
    ctx.fillRect(x + sx, y, w, 2);

    // Behaviour tells
    if (plat.conveyor) {
      ctx.fillStyle = '#FFB627';
      const dir = plat.conveyorDir;
      const off = (frame * 1.4 * dir) % 10;
      for (let i = -10; i < w + 10; i += 10) {
        const bx = x + i + (dir > 0 ? off : off + 10);
        if (bx > x && bx < x + w - 3) ctx.fillRect(Math.round(bx), y + 3, 3, 2);
      }
    }
    if (plat.moving) {
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(x + sx, y + h - 2, w, 2);
      ctx.fillStyle = p.accent;
      ctx.fillRect(x + sx + w / 2 - 3, y + 2, 6, 2);
    }
    if (plat.crumble) {
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      for (let i = 4; i < w; i += 9) ctx.fillRect(x + sx + i, y + 3, 2, 3);
    }
    ctx.globalAlpha = 1;
  }

  // Hazards
  function drawHazard(ctx, hz, camX, camY, frame) {
    const x = Math.round(hz.x - camX), y = Math.round(hz.y - camY);
    if (x + hz.w < -8 || x > VW + 8) return;

    switch (hz.kind) {
      case 'spike':
        ctx.fillStyle = '#B8C2CE';
        for (let i = 0; i < hz.w; i += 6) {
          ctx.fillRect(x + i + 2, y + 4, 2, 6);
          ctx.fillRect(x + i + 1, y + 6, 4, 4);
        }
        ctx.fillStyle = '#6E7A8A';
        ctx.fillRect(x, y + hz.h - 3, hz.w, 3);
        break;
      case 'lava': {
        const wob = Math.sin(frame * 0.08) * 1.5;
        ctx.fillStyle = '#FF4400';
        ctx.fillRect(x, y + 2, hz.w, hz.h);
        ctx.fillStyle = '#FFC93C';
        for (let i = 0; i < hz.w; i += 8) {
          ctx.fillRect(x + i, y + 2 + Math.sin(frame * 0.09 + i * 0.3) * 1.5 + wob, 6, 2);
        }
        break;
      }
      case 'water':
        ctx.globalAlpha = 0.55;
        ctx.fillStyle = '#3EA8C8';
        ctx.fillRect(x, y + 2, hz.w, hz.h);
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#9AD8F5';
        for (let i = 0; i < hz.w; i += 10) {
          ctx.fillRect(x + i, y + 2 + Math.sin(frame * 0.07 + i * 0.4) * 1.5, 6, 1);
        }
        break;
    }
  }

  // Zones
  function drawZone(ctx, z, camX, camY, frame) {
    const x = Math.round(z.x - camX), y = Math.round(z.y - camY);
    if (x + z.w < -8 || x > VW + 8) return;

    switch (z.kind) {
      case 'water':
        ctx.globalAlpha = 0.32;
        ctx.fillStyle = '#3EA8C8';
        ctx.fillRect(x, y, z.w, z.h);
        ctx.globalAlpha = 0.8;
        ctx.fillStyle = '#9AD8F5';
        for (let i = 0; i < z.w; i += 12) {
          ctx.fillRect(x + i, y + Math.sin(frame * 0.06 + i * 0.3) * 2, 7, 1);
        }
        ctx.globalAlpha = 1;
        break;
      case 'ice':
        ctx.globalAlpha = 0.35;
        ctx.fillStyle = '#DCEFFA';
        ctx.fillRect(x, y + z.h - 6, z.w, 6);
        ctx.globalAlpha = 1;
        break;
      case 'quicksand':
        ctx.fillStyle = '#B08A4E';
        ctx.fillRect(x, y, z.w, z.h);
        ctx.fillStyle = '#C6A06A';
        for (let i = 0; i < z.w; i += 9) {
          ctx.fillRect(x + i, y + 2 + Math.sin(frame * 0.04 + i * 0.5) * 1.5, 5, 2);
        }
        break;
      case 'wind': {
        ctx.globalAlpha = 0.18;
        ctx.fillStyle = '#FFFFFF';
        const dir = z.force > 0 ? 1 : -1;
        for (let i = 0; i < 8; i++) {
          const ly = y + ((i * 37 + frame * 0.6) % z.h);
          const lx = x + ((frame * 2.4 * dir + i * 90) % z.w + z.w) % z.w;
          ctx.fillRect(Math.round(lx), Math.round(ly), 16, 1);
        }
        ctx.globalAlpha = 1;
        break;
      }
      case 'switch':
        ctx.fillStyle = z.on ? '#5FD16A' : '#FF4433';
        ctx.fillRect(x, y, z.w, z.h);
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(x + 3, y + 3, z.w - 6, 3);
        break;
      case 'gate':
        if (z.open) return;
        ctx.fillStyle = '#6E6E82';
        ctx.fillRect(x, y, z.w, z.h);
        ctx.fillStyle = '#FFB627';
        for (let i = 4; i < z.h; i += 10) ctx.fillRect(x, y + i, z.w, 2);
        break;
    }
  }

  // Ambient weather
  const amb = [];
  function initAmbient(level) {
    amb.length = 0;
    const rng = new RNG(hashSeed('amb' + level.id));
    const kinds = {
      meadow: 'leaf', desert: 'sand', cavern: 'drip', forest: 'spore',
      frozen: 'snow', sky: 'cloudwisp', clockwork: 'spark',
      volcano: 'ember', void: 'glitch',
    };
    const kind = kinds[level.theme];
    if (!kind) return;
    const n = kind === 'snow' || kind === 'sand' ? 46 : 26;
    for (let i = 0; i < n; i++) {
      amb.push({
        kind,
        x: rng.range(0, VW), y: rng.range(0, VH),
        vx: rng.range(-0.6, 0.6), vy: rng.range(0.2, 0.9),
        s: rng.chance(0.3) ? 2 : 1,
        p: rng.range(0, Math.PI * 2),
      });
    }
  }

  function drawAmbient(ctx, frame) {
    for (const a of amb) {
      switch (a.kind) {
        case 'snow':
          a.x += Math.sin(frame * 0.02 + a.p) * 0.4; a.y += a.vy * 0.6;
          ctx.fillStyle = '#FFFFFF'; ctx.globalAlpha = 0.75; break;
        case 'sand':
          a.x += 1.4 + a.vx; a.y += Math.sin(frame * 0.05 + a.p) * 0.3;
          ctx.fillStyle = '#F0D9A8'; ctx.globalAlpha = 0.4; break;
        case 'leaf':
          a.x += Math.sin(frame * 0.03 + a.p) * 0.5 - 0.2; a.y += a.vy * 0.5;
          ctx.fillStyle = '#A8D06A'; ctx.globalAlpha = 0.55; break;
        case 'spore':
          a.x += Math.sin(frame * 0.02 + a.p) * 0.3; a.y -= a.vy * 0.25;
          ctx.fillStyle = '#9AE6A0'; ctx.globalAlpha = 0.4 + Math.sin(frame * 0.05 + a.p) * 0.3; break;
        case 'ember':
          a.x += Math.sin(frame * 0.04 + a.p) * 0.4; a.y -= a.vy * 0.8;
          ctx.fillStyle = (frame + a.p * 10) % 20 < 10 ? '#FF7A29' : '#FFC93C';
          ctx.globalAlpha = 0.7; break;
        case 'spark':
          a.y += a.vy * 1.5; a.x += a.vx;
          ctx.fillStyle = '#FFB627'; ctx.globalAlpha = 0.6; break;
        case 'drip':
          a.y += a.vy * 1.6;
          ctx.fillStyle = '#8FE3F0'; ctx.globalAlpha = 0.5; break;
        case 'glitch':
          a.x += a.vx * 3; a.y += Math.sin(frame * 0.1 + a.p) * 1.2;
          ctx.fillStyle = (frame >> 2) % 2 ? '#00F5D4' : '#C77DFF';
          ctx.globalAlpha = 0.5; break;
        default:
          a.y += a.vy; ctx.fillStyle = '#FFFFFF'; ctx.globalAlpha = 0.4;
      }
      if (a.y > VH) { a.y = -4; a.x = Math.random() * VW; }
      if (a.y < -6) { a.y = VH + 2; }
      if (a.x > VW + 6) a.x = -4;
      if (a.x < -6) a.x = VW + 4;
      ctx.fillRect(a.x | 0, a.y | 0, a.s, a.s);
    }
    ctx.globalAlpha = 1;
  }

  return {
    drawSky, drawParallax, drawGround, drawPlatform,
    drawHazard, drawZone, initAmbient, drawAmbient,
  };
})();
