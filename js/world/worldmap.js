'use strict';

// WORLD MAP
// The overworld: 15 nodes per world laid out on a winding path. You walk
// Luka between unlocked nodes and press jump to drop into a level. Secret
// exits carve extra branches into the path, so the map itself records what
// you found.

const WorldMap = (() => {

  const NODE_R = 6;
  const layouts = new Map();   // worldId -> { nodes, links }

  /**
   * Serpentine layout: three rows of five, alternating direction, with
   * seeded jitter so no two worlds trace the same line.
   */
  function layoutFor(worldId) {
    if (layouts.has(worldId)) return layouts.get(worldId);

    const rng = new RNG(hashSeed('map' + worldId));
    const nodes = [];
    const cols = 5, rows = 3;
    const x0 = 44, x1 = VW - 44;
    const y0 = 66, y1 = VH - 46;

    for (let i = 0; i < LEVELS_PER_WORLD; i++) {
      const row = Math.floor(i / cols);
      let col = i % cols;
      if (row % 2 === 1) col = cols - 1 - col;     // snake back

      const bx = lerp(x0, x1, cols === 1 ? 0.5 : col / (cols - 1));
      const by = lerp(y0, y1, rows === 1 ? 0.5 : row / (rows - 1));

      const levelNum = i + 1;
      const arch = archetypeFor(levelNum);
      nodes.push({
        id: makeLevelId(worldId, levelNum),
        levelNum,
        arch,
        x: Math.round(bx + rng.range(-7, 7)),
        y: Math.round(by + rng.range(-6, 6)),
        kind: arch === 'boss'     ? 'boss'
            : arch === 'miniboss' ? 'miniboss'
            : arch === 'secret'   ? 'secret'
            : 'normal',
      });
    }

    // Main path links consecutive nodes.
    const links = [];
    for (let i = 0; i < nodes.length - 1; i++) {
      links.push({ a: i, b: i + 1, secret: false });
    }
    // Secret shortcuts: level 9 -> 12, and exploration branches.
    links.push({ a: 8, b: 11, secret: true });
    if (LEVELS_PER_WORLD > 13) links.push({ a: 1, b: 3, secret: true });

    const layout = { nodes, links };
    layouts.set(worldId, layout);
    return layout;
  }

  // State
  let worldId = 1;
  let cursor  = 0;          // index into nodes
  let frame   = 0;
  let lukaX = 0, lukaY = 0; // animated marker position
  let moving = false;
  let stars  = [];

  function init(wId, focusLevelId) {
    worldId = wId;
    const lay = layoutFor(worldId);
    cursor = 0;
    if (focusLevelId) {
      const i = lay.nodes.findIndex(n => n.id === focusLevelId);
      if (i >= 0) cursor = i;
    } else {
      // Land on the furthest unlocked node.
      for (let i = lay.nodes.length - 1; i >= 0; i--) {
        if (Progress.isUnlocked(lay.nodes[i].id)) { cursor = i; break; }
      }
    }
    lukaX = lay.nodes[cursor].x;
    lukaY = lay.nodes[cursor].y;
    stars = [];
    const rng = new RNG(hashSeed('mapstars' + wId));
    for (let i = 0; i < 40; i++) {
      stars.push({ x: rng.range(0, VW), y: rng.range(HUD_H, VH), s: rng.chance(0.25) ? 2 : 1 });
    }
  }

  function currentNode() { return layoutFor(worldId).nodes[cursor]; }

  /** Nodes you're allowed to walk to from here: neighbours on any known link. */
  function neighbours(idx) {
    const lay = layoutFor(worldId);
    const out = [];
    for (const l of lay.links) {
      // A secret link only exists once you've found that secret exit.
      if (l.secret) {
        const from = lay.nodes[l.a];
        const rec = Progress.get().levels[from.id];
        if (!rec || !rec.secretFound) continue;
      }
      if (l.a === idx) out.push(l.b);
      if (l.b === idx) out.push(l.a);
    }
    return out.filter(i => Progress.isUnlocked(lay.nodes[i].id));
  }

  /** Move toward whichever reachable neighbour best matches the input direction. */
  function step(dx, dy) {
    const lay = layoutFor(worldId);
    const here = lay.nodes[cursor];
    const opts = neighbours(cursor);
    let best = -1, bestScore = -Infinity;

    for (const i of opts) {
      const n = lay.nodes[i];
      const vx = n.x - here.x, vy = n.y - here.y;
      const len = Math.hypot(vx, vy) || 1;
      const score = (vx / len) * dx + (vy / len) * dy;
      if (score > 0.35 && score > bestScore) { bestScore = score; best = i; }
    }
    if (best >= 0) {
      cursor = best;
      moving = true;
      Audio.sfx.menuSelect();
      return true;
    }
    return false;
  }

  function update() {
    frame++;
    const n = currentNode();
    lukaX = approach(lukaX, n.x, 2.4);
    lukaY = approach(lukaY, n.y, 2.4);
    if (Math.abs(lukaX - n.x) < 0.5 && Math.abs(lukaY - n.y) < 0.5) moving = false;

    if (!moving) {
      if (Input.pressed('ArrowLeft')  || Input.pressed('KeyA')) step(-1, 0);
      if (Input.pressed('ArrowRight') || Input.pressed('KeyD')) step(1, 0);
      if (Input.pressed('ArrowUp')    || Input.pressed('KeyW')) step(0, -1);
      if (Input.pressed('ArrowDown')  || Input.pressed('KeyS')) step(0, 1);
    }
    return null;
  }

  /** Switch to an adjacent world from the map (Q/E), if unlocked. */
  function changeWorld(dir) {
    const target = clamp(worldId + dir, 1, WORLDS.length);
    if (target === worldId) return false;
    if (target > Progress.get().unlockedWorld) return false;
    init(target);
    Audio.sfx.menuConfirm();
    return true;
  }

  // Rendering
  function draw(ctx) {
    const w = getWorld(worldId);
    const pal = w.palette;
    const lay = layoutFor(worldId);
    const prog = Progress.get();

    // Backdrop in the world's own colours.
    const g = ctx.createLinearGradient(0, 0, 0, VH);
    g.addColorStop(0, pal.sky[0]);
    g.addColorStop(1, pal.sky[1]);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, VW, VH);

    // Ambient specks
    ctx.globalAlpha = 0.30;
    ctx.fillStyle = pal.edge;
    for (const s of stars) {
      const tw = Math.sin(frame * 0.05 + s.x) > 0 ? 1 : 0.4;
      ctx.globalAlpha = 0.28 * tw;
      ctx.fillRect(s.x | 0, s.y | 0, s.s, s.s);
    }
    ctx.globalAlpha = 1;

    // Rolling hills so the map doesn't read as a flat menu.
    ctx.fillStyle = pal.far;
    for (let x = 0; x < VW; x += 8) {
      const hh = 26 + Math.sin((x + worldId * 40) * 0.03) * 10;
      ctx.fillRect(x, VH - hh, 8, hh);
    }
    ctx.fillStyle = pal.near;
    for (let x = 0; x < VW; x += 8) {
      const hh = 14 + Math.sin((x * 0.05) + 2 + worldId) * 6;
      ctx.fillRect(x, VH - hh, 8, hh);
    }

    // Paths
    for (const l of lay.links) {
      const a = lay.nodes[l.a], b = lay.nodes[l.b];
      let visible = true;
      if (l.secret) {
        const rec = prog.levels[a.id];
        visible = !!(rec && rec.secretFound);
      }
      if (!visible) continue;

      const walkable = Progress.isUnlocked(a.id) && Progress.isUnlocked(b.id);
      ctx.fillStyle = l.secret ? (walkable ? '#FFD95E' : '#7A6A30')
                              : (walkable ? pal.edge  : 'rgba(0,0,0,0.28)');
      dottedLine(ctx, a.x, a.y, b.x, b.y, l.secret ? 3 : 2);
    }

    // Nodes
    for (let i = 0; i < lay.nodes.length; i++) {
      const n = lay.nodes[i];
      const unlocked  = Progress.isUnlocked(n.id);
      const completed = Progress.isCompleted(n.id);
      const rec = prog.levels[n.id];

      let fill = '#3A3A46';
      if (unlocked) {
        fill = n.kind === 'boss'     ? '#FF4433'
             : n.kind === 'miniboss' ? '#FF8C42'
             : n.kind === 'secret'   ? '#C77DFF'
             : completed             ? '#5FD16A'
                                     : '#FFFFFF';
      }

      // Node body
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.fillRect(n.x - NODE_R - 1, n.y - NODE_R - 1, NODE_R * 2 + 2, NODE_R * 2 + 2);
      ctx.fillStyle = fill;
      ctx.fillRect(n.x - NODE_R, n.y - NODE_R, NODE_R * 2, NODE_R * 2);

      if (unlocked) {
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.fillRect(n.x - NODE_R, n.y - NODE_R, NODE_R * 2, 2);
      }

      // Marks: cleared flag, secret found, all coins
      if (completed) {
        ctx.fillStyle = '#0A3A12';
        ctx.fillRect(n.x - 2, n.y - 3, 1, 6);
        ctx.fillRect(n.x - 1, n.y - 3, 4, 3);
      }
      if (rec && rec.secretFound) {
        ctx.fillStyle = '#C77DFF';
        ctx.fillRect(n.x + NODE_R - 1, n.y - NODE_R - 3, 3, 3);
      }
      if (rec && rec.allCoins) {
        ctx.fillStyle = '#FFD95E';
        ctx.fillRect(n.x - NODE_R - 2, n.y - NODE_R - 3, 3, 3);
      }

      // Level number
      if (unlocked) {
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 5px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(String(n.levelNum), n.x + 1, n.y + 2);
        ctx.textAlign = 'left';
      } else {
        ctx.fillStyle = '#11111A';
        ctx.fillRect(n.x - 2, n.y - 1, 4, 4);
        ctx.fillRect(n.x - 1, n.y - 3, 2, 3);
      }
    }

    // Luka marker
    const bob = Math.sin(frame * 0.14) * 2;
    Spr.drawLuka(ctx, lukaX - PW / 2, lukaY - PH - 4 + bob, moving ? 'run' : 'idle',
                 frame, 1, false, 0);

    // Header
    ctx.fillStyle = 'rgba(0,0,0,0.62)';
    ctx.fillRect(0, 0, VW, 30);
    ctx.fillStyle = pal.edge;
    ctx.fillRect(0, 30, VW, 1);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 9px monospace';
    ctx.fillText(`MUNDO ${worldId} — ${w.name}`, VW / 2, 12);
    ctx.fillStyle = pal.edge;
    ctx.font = '6px monospace';
    ctx.fillText(w.subtitle, VW / 2, 22);
    ctx.textAlign = 'left';

    // World switch arrows
    if (worldId > 1) {
      ctx.fillStyle = '#FFFFFF'; ctx.font = 'bold 8px monospace';
      ctx.fillText('◄ Q', 6, 14);
    }
    if (worldId < Progress.get().unlockedWorld) {
      ctx.fillStyle = '#FFFFFF'; ctx.font = 'bold 8px monospace';
      ctx.textAlign = 'right';
      ctx.fillText('E ►', VW - 6, 14);
      ctx.textAlign = 'left';
    }

    // Footer: selected level info
    const n = currentNode();
    const unlocked = Progress.isUnlocked(n.id);
    const rec = prog.levels[n.id];

    ctx.fillStyle = 'rgba(0,0,0,0.72)';
    ctx.fillRect(0, VH - 26, VW, 26);

    ctx.fillStyle = unlocked ? '#FFD95E' : '#666677';
    ctx.font = 'bold 7px monospace';
    let label;
    if (!unlocked) {
      label = `${n.id} — BLOQUEADO`;
    } else {
      const lvl = LevelCache.get(n.id, { hasDoubleJump: Progress.hasPowerup('djump') });
      const tag = n.kind === 'boss' ? ' ★JEFE' : n.kind === 'miniboss' ? ' ◆MINI' : '';
      label = `${n.id}  ${lvl ? lvl.name : ''}${tag}`;
    }
    ctx.fillText(label, 6, VH - 15);

    ctx.font = '6px monospace';
    ctx.fillStyle = '#AABBCC';
    if (unlocked && rec && rec.completed) {
      const t = rec.bestTime != null ? fmtTime(rec.bestTime) : '--:--';
      ctx.fillText(`✔ Completado  ·  Mejor: ${t}  ·  Monedas: ${rec.bestCoins}` +
                   (rec.secretFound ? '  ·  ✦Secreto' : ''), 6, VH - 5);
    } else if (unlocked) {
      ctx.fillText('ESPACIO entrar   ·   Flechas moverse   ·   ESC menú', 6, VH - 5);
    } else {
      ctx.fillText('Completa el nivel anterior para desbloquear', 6, VH - 5);
    }

    // Lives + shards, top-right
    ctx.textAlign = 'right';
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 7px monospace';
    ctx.fillText(`♥ ${prog.lives}   ◆ ${prog.coins}`, VW - 6, 26);
    ctx.textAlign = 'left';
  }

  function dottedLine(ctx, x0, y0, x1, y1, size) {
    const dx = x1 - x0, dy = y1 - y0;
    const len = Math.hypot(dx, dy);
    const steps = Math.max(2, Math.floor(len / 6));
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      ctx.fillRect(Math.round(x0 + dx * t) - (size >> 1),
                   Math.round(y0 + dy * t) - (size >> 1), size, size);
    }
  }

  function fmtTime(frames) {
    const s = Math.floor(frames / 60);
    return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  }

  return {
    init, update, draw, changeWorld,
    get worldId() { return worldId; },
    get selectedId() { return currentNode().id; },
    get selectedUnlocked() { return Progress.isUnlocked(currentNode().id); },
    isSettled() { return !moving; },
    fmtTime,
  };
})();
