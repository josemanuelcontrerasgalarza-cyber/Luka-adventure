'use strict';

// SCREENS & HUD

const Screens = (() => {
  let frame = 0;
  let stars = [];
  let creditY = 0;

  function initStars() {
    stars = [];
    const rng = new RNG(4242);
    for (let i = 0; i < 90; i++) {
      stars.push({
        x: rng.range(0, VW), y: rng.range(0, VH),
        s: rng.chance(0.25) ? 2 : 1,
        v: rng.range(0.06, 0.4),
        b: rng.chance(0.5),
      });
    }
  }

  function drawStars(ctx) {
    for (const s of stars) {
      s.x -= s.v;
      if (s.x < -2) { s.x = VW + 2; s.y = Math.random() * VH; }
      ctx.globalAlpha = s.b ? 0.85 : 0.4;
      ctx.fillStyle = s.b ? '#FFFFFF' : '#9AB0D0';
      ctx.fillRect(s.x | 0, s.y | 0, s.s, s.s);
    }
    ctx.globalAlpha = 1;
  }

  function shadow(ctx, str, x, y, col, sh, size, align = 'center', bold = true) {
    ctx.textAlign = align;
    ctx.font = `${bold ? 'bold ' : ''}${size}px monospace`;
    ctx.fillStyle = sh;  ctx.fillText(str, x + 1, y + 1);
    ctx.fillStyle = col; ctx.fillText(str, x, y);
    ctx.textAlign = 'left';
  }

  // MAIN MENU
  const MENU_ITEMS = ['CONTINUAR', 'NUEVA PARTIDA', 'CONTROLES', 'LOGROS', 'ESTADÍSTICAS', 'CRÉDITOS'];
  let menuIdx = 0;

  function menuItems() {
    return Progress.hasSave() ? MENU_ITEMS : MENU_ITEMS.slice(1);
  }
  function menuMove(d) {
    const n = menuItems().length;
    menuIdx = (menuIdx + d + n) % n;
    Audio.sfx.menuSelect();
  }
  function menuSelection() { return menuItems()[menuIdx]; }
  function resetMenu() { menuIdx = 0; }

  function drawMenu(ctx) {
    frame++;
    const g = ctx.createLinearGradient(0, 0, 0, VH);
    g.addColorStop(0, '#070A1E'); g.addColorStop(1, '#141A46');
    ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
    drawStars(ctx);

    // Silhouette skyline so the menu has depth
    ctx.fillStyle = '#0B1030';
    for (let x = 0; x < VW; x += 6) {
      const h = 20 + Math.sin(x * 0.05) * 8 + Math.sin(x * 0.13) * 5;
      ctx.fillRect(x, VH - h, 6, h);
    }

    const pulse = 0.6 + Math.sin(frame * 0.045) * 0.4;
    ctx.globalAlpha = pulse * 0.35;
    shadow(ctx, 'LUKA', VW / 2, 46, '#3E7BD6', '#3E7BD6', 30);
    ctx.globalAlpha = 1;
    shadow(ctx, 'LUKA', VW / 2, 45, '#FFD95E', '#8A5A10', 29);
    shadow(ctx, 'ADVENTURE', VW / 2, 65, '#FF8C42', '#7A3A10', 15);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#8FB8E8'; ctx.font = '6px monospace';
    ctx.fillText('~ Nueve mundos. Un gato. Un amigo que rescatar. ~', VW / 2, 78);
    ctx.textAlign = 'left';

    // Luka idles at the bottom of the menu
    Spr.drawLuka(ctx, 26, VH - 44, 'idle', frame, 1, false, 0);

    const items = menuItems();
    const y0 = 96, dy = 15;
    for (let i = 0; i < items.length; i++) {
      const y = y0 + i * dy;
      const on = i === menuIdx;
      if (on) {
        ctx.globalAlpha = 0.28;
        ctx.fillStyle = '#4A8AE0';
        ctx.fillRect(VW / 2 - 74, y - 9, 148, 13);
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#FFD95E'; ctx.font = 'bold 8px monospace';
        ctx.fillText('▶', VW / 2 - 84, y);
      }
      shadow(ctx, items[i], VW / 2, y,
             on ? '#FFD95E' : '#9FBEE0', on ? '#5A3A00' : '#1A2A44', on ? 9 : 8);
    }

    const s = Progress.stats();
    const d = Progress.get();
    ctx.textAlign = 'center'; ctx.font = '6px monospace';
    ctx.fillStyle = '#4A6488';
    ctx.fillText(`Mundo ${d.unlockedWorld}/9  ·  ${s.completed}/${s.total} niveles  ·  ${s.percent}%  ·  ${Achieve.unlockedCount()}/${Achieve.all.length} logros`,
                 VW / 2, VH - 16);
    if (d.hardMode) {
      ctx.fillStyle = '#FF4433';
      ctx.fillText('☠ MODO DIFÍCIL ☠', VW / 2, VH - 6);
    }
    ctx.textAlign = 'left';
  }

  // IN-GAME HUD
  function drawHUD(ctx, g) {
    const lvl = g.level;
    const prog = Progress.get();

    ctx.fillStyle = 'rgba(8,10,20,0.9)';
    ctx.fillRect(0, 0, VW, HUD_H);
    ctx.fillStyle = lvl.palette.edge;
    ctx.fillRect(0, HUD_H - 1, VW, 1);

    // Lives
    for (let i = 0; i < Math.min(5, Math.max(prog.lives, 1)); i++) {
      Spr.drawHeartIcon(ctx, 4 + i * 11, 5, i < prog.lives);
    }
    if (prog.lives > 5) {
      ctx.fillStyle = '#FFFFFF'; ctx.font = 'bold 6px monospace';
      ctx.fillText(`+${prog.lives - 5}`, 60, 13);
    }

    // Shards this run
    Spr.drawTunaIcon(ctx, 74, 5);
    ctx.fillStyle = '#FFD95E'; ctx.font = 'bold 7px monospace';
    ctx.fillText(`${g.runCoins}`, 86, 13);

    // Active cores
    let px = 110;
    if (Progress.hasPowerup('djump')) {
      ctx.fillStyle = '#5FC8F5'; ctx.fillRect(px, 5, 12, 10);
      ctx.fillStyle = '#062A3A'; ctx.font = 'bold 5px monospace';
      ctx.fillText('2X', px + 1, 12);
      px += 14;
    }
    for (const t in g.player.cores) {
      const left = g.player.cores[t];
      if (left <= 0) continue;
      const def = POWERUPS[t];
      const blink = left < 90 && (g.frame >> 2) % 2 === 0;
      ctx.globalAlpha = blink ? 0.35 : 1;
      ctx.fillStyle = def.color; ctx.fillRect(px, 5, 16, 10);
      ctx.fillStyle = '#0A0A14'; ctx.font = 'bold 5px monospace';
      ctx.fillText(def.short, px + 1, 12);
      // Duration bar
      ctx.fillStyle = '#0A0A14'; ctx.fillRect(px, 14, 16, 2);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(px, 14, Math.round(16 * (left / def.duration)), 2);
      ctx.globalAlpha = 1;
      px += 18;
    }

    // Level label
    ctx.textAlign = 'center';
    ctx.fillStyle = '#C8D8EC'; ctx.font = '6px monospace';
    ctx.fillText(`${lvl.id} · ${lvl.name}`, VW / 2, 8);

    // Timer
    ctx.fillStyle = '#7A90A8'; ctx.font = '6px monospace';
    ctx.fillText(WorldMap.fmtTime(g.levelTime), VW / 2, 16);
    ctx.textAlign = 'left';

    // Progress bar
    const bw = 76, bx = VW - bw - 5;
    const pct = lvl.exit ? clamp(g.player.x / Math.max(1, lvl.exit.x), 0, 1) : 0;
    ctx.fillStyle = '#1A2030'; ctx.fillRect(bx, 6, bw, 5);
    ctx.fillStyle = lvl.isBoss ? '#FF4433' : lvl.palette.edge;
    ctx.fillRect(bx, 6, Math.round(bw * pct), 5);
    // Luka pip on the bar
    ctx.fillStyle = '#FFD95E';
    ctx.fillRect(bx + Math.round(bw * pct) - 1, 4, 3, 9);

    ctx.fillStyle = '#5A7088'; ctx.font = '5px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`◆${prog.coins}`, VW - 5, 17);
    ctx.textAlign = 'left';

    if (Progress.get().hardMode) {
      ctx.fillStyle = 'rgba(255,40,40,0.5)';
      ctx.fillRect(0, 0, VW, 2);
    }
  }

  // LEVEL INTRO
  function drawLevelIntro(ctx, level, t) {
    const a = t > 100 ? (130 - t) / 30 : t < 30 ? t / 30 : 1;
    ctx.globalAlpha = clamp(a, 0, 1);
    ctx.fillStyle = 'rgba(0,0,0,0.82)';
    ctx.fillRect(0, 0, VW, VH);

    const w = getWorld(level.world);
    shadow(ctx, `MUNDO ${level.world}`, VW / 2, VH / 2 - 34, w.palette.edge, '#000', 8);
    shadow(ctx, level.name, VW / 2, VH / 2 - 14, '#FFFFFF', '#222', 13);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#8FA8C8'; ctx.font = '6px monospace';
    ctx.fillText(level.id + '  ·  ' + archLabel(level.archetype), VW / 2, VH / 2 + 2);

    // Difficulty stars
    const d = Math.round(level.difficulty);
    let s = '';
    for (let i = 1; i <= 10; i++) s += i <= d ? '★' : '☆';
    ctx.fillStyle = '#FFD95E'; ctx.font = '7px monospace';
    ctx.fillText(s, VW / 2, VH / 2 + 16);

    if (level.isBoss) {
      ctx.fillStyle = '#FF4433'; ctx.font = 'bold 8px monospace';
      ctx.fillText(level.isMiniBoss ? '◆ MINI-JEFE ◆' : '★ JEFE ★', VW / 2, VH / 2 + 32);
    }
    ctx.textAlign = 'left';
    ctx.globalAlpha = 1;
  }

  const ARCH_LABEL = {
    intro: 'Introducción', exploration: 'Exploración', vertical: 'Ascenso',
    mechanic: 'Nueva mecánica', speed: 'Velocidad', underground: 'Subterráneo',
    special: 'Especial', precision: 'Precisión', secret: 'Secreto',
    challenge: 'Desafío', vehicle: 'Travesía', puzzle: 'Puzzle',
    miniboss: 'Mini-jefe', advanced: 'Avanzado', boss: 'Jefe',
  };
  function archLabel(a) { return ARCH_LABEL[a] || a; }

  // PAUSE
  let pauseIdx = 0;
  const PAUSE_ITEMS = ['REANUDAR', 'REINICIAR NIVEL', 'MAPA DEL MUNDO', 'MENÚ PRINCIPAL'];
  function pauseMove(d) {
    pauseIdx = (pauseIdx + d + PAUSE_ITEMS.length) % PAUSE_ITEMS.length;
    Audio.sfx.menuSelect();
  }
  function pauseSelection() { return PAUSE_ITEMS[pauseIdx]; }
  function resetPause() { pauseIdx = 0; }

  function drawPause(ctx) {
    ctx.fillStyle = 'rgba(0,0,0,0.72)';
    ctx.fillRect(0, 0, VW, VH);
    shadow(ctx, 'PAUSA', VW / 2, 58, '#FFD95E', '#5A3A00', 16);
    for (let i = 0; i < PAUSE_ITEMS.length; i++) {
      const y = 88 + i * 16;
      const on = i === pauseIdx;
      if (on) {
        ctx.globalAlpha = 0.28; ctx.fillStyle = '#4A8AE0';
        ctx.fillRect(VW / 2 - 76, y - 9, 152, 13); ctx.globalAlpha = 1;
      }
      shadow(ctx, PAUSE_ITEMS[i], VW / 2, y,
             on ? '#FFD95E' : '#9FBEE0', '#1A2A44', on ? 9 : 8);
    }
    ctx.textAlign = 'center'; ctx.fillStyle = '#55708C'; ctx.font = '5px monospace';
    ctx.fillText('↑↓ elegir  ·  ESPACIO confirmar  ·  ESC reanudar', VW / 2, VH - 10);
    ctx.textAlign = 'left';
  }

  // LEVEL CLEAR
  function drawLevelClear(ctx, g, t) {
    ctx.fillStyle = 'rgba(4,20,8,0.86)';
    ctx.fillRect(0, 0, VW, VH);

    shadow(ctx, g.clearedViaSecret ? '¡SALIDA SECRETA!' : '¡NIVEL COMPLETADO!',
           VW / 2, 46, g.clearedViaSecret ? '#C77DFF' : '#5FD16A', '#04200A', 13);
    shadow(ctx, g.level.name, VW / 2, 62, '#FFFFFF', '#222', 8);

    // Score rows appear one by one
    const rows = [
      ['Tiempo',    WorldMap.fmtTime(g.levelTime)],
      ['Monedas',   `${g.levelCoins} / ${g.level.totalCoins}`],
      ['Sin daño',  g.levelNoDamage ? 'SÍ' : 'no'],
      ['Fragmentos', `+${g.runCoins}`],
    ];
    ctx.textAlign = 'left';
    for (let i = 0; i < rows.length; i++) {
      if (t < 20 + i * 14) break;
      const y = 86 + i * 15;
      ctx.fillStyle = '#8FA8C8'; ctx.font = '7px monospace';
      ctx.fillText(rows[i][0], VW / 2 - 66, y);
      ctx.fillStyle = '#FFFFFF'; ctx.font = 'bold 7px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(rows[i][1], VW / 2 + 66, y);
      ctx.textAlign = 'left';
    }

    if (t > 90) {
      ctx.textAlign = 'center';
      ctx.fillStyle = (g.frame >> 4) % 2 ? '#FFD95E' : '#8A7030';
      ctx.font = '7px monospace';
      ctx.fillText('ESPACIO para continuar', VW / 2, VH - 14);
      ctx.textAlign = 'left';
    }
  }

  // GAME OVER
  function drawGameOver(ctx, t) {
    ctx.fillStyle = '#140204'; ctx.fillRect(0, 0, VW, VH);
    drawStars(ctx);
    const flick = (t >> 3) % 2 ? 1 : 0.75;
    ctx.globalAlpha = flick;
    shadow(ctx, 'GAME OVER', VW / 2, 76, '#FF3333', '#3A0000', 20);
    ctx.globalAlpha = 1;
    ctx.textAlign = 'center'; ctx.font = '7px monospace';
    ctx.fillStyle = '#AA8888';
    ctx.fillText('Luka volverá a intentarlo.', VW / 2, 100);
    ctx.fillStyle = '#7A93AC';
    ctx.fillText('ESPACIO  →  Mapa del mundo', VW / 2, 128);
    ctx.fillText('ESC  →  Menú principal', VW / 2, 142);
    ctx.textAlign = 'left';
  }

  // VICTORY
  function drawVictory(ctx, t) {
    const g = ctx.createLinearGradient(0, 0, 0, VH);
    g.addColorStop(0, '#05000E'); g.addColorStop(1, '#2A1652');
    ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
    drawStars(ctx);

    const p = 0.6 + Math.sin(t * 0.05) * 0.4;
    ctx.globalAlpha = p;
    shadow(ctx, '★', VW / 2, 40, '#FFD95E', '#8A5A10', 22);
    ctx.globalAlpha = 1;

    shadow(ctx, '¡VICTORIA!', VW / 2, 66, '#FFD95E', '#5A3A00', 16);
    shadow(ctx, 'Luka rescató a Jaco', VW / 2, 84, '#FFFFFF', '#222', 9);

    ctx.textAlign = 'center'; ctx.font = '6px monospace';
    ctx.fillStyle = '#C77DFF';
    ctx.fillText('THE VOID KING ha sido deshecho.', VW / 2, 102);
    ctx.fillStyle = '#9AE6A0';
    ctx.fillText('Los nueve mundos vuelven a su sitio.', VW / 2, 113);

    const s = Progress.stats();
    ctx.fillStyle = '#FFD95E'; ctx.font = 'bold 7px monospace';
    ctx.fillText(`${s.completed}/${s.total} niveles  ·  ${s.percent}% completado`, VW / 2, 134);
    ctx.fillStyle = '#8FA8C8'; ctx.font = '6px monospace';
    ctx.fillText(`Secretos ${s.secrets}/${s.secretsAvailable}  ·  Reliquias ${s.relics}/9`, VW / 2, 146);

    if (t > 150) {
      ctx.fillStyle = (t >> 4) % 2 ? '#FFFFFF' : '#667788';
      ctx.fillText('ESPACIO para continuar', VW / 2, VH - 14);
    }
    ctx.textAlign = 'left';
  }

  // CONTROLS
  function drawControls(ctx) {
    ctx.fillStyle = '#070A1E'; ctx.fillRect(0, 0, VW, VH);
    drawStars(ctx);
    shadow(ctx, 'CONTROLES', VW / 2, 22, '#FFD95E', '#5A3A00', 12);

    const rows = [
      ['A / ←',        'Mover izquierda'],
      ['D / →',        'Mover derecha'],
      ['ESPACIO / ↑',  'Saltar  (mantén para saltar más alto)'],
      ['ESPACIO ×2',   'Doble salto  (con mejora)'],
      ['J / Z',        'Disparar  (Ember Core)'],
      ['SHIFT / F',    'Invertir gravedad  (Gravity Core)'],
      ['ESC / P',      'Pausa'],
      ['Q / E',        'Cambiar de mundo (en el mapa)'],
    ];
    rows.forEach(([k, v], i) => {
      const y = 42 + i * 14;
      ctx.fillStyle = 'rgba(40,80,140,0.45)';
      ctx.fillRect(20, y - 8, 84, 12);
      ctx.fillStyle = '#9AD8F5'; ctx.font = 'bold 6px monospace';
      ctx.fillText(k, 24, y);
      ctx.fillStyle = '#B8C8DC'; ctx.font = '6px monospace';
      ctx.fillText(v, 112, y);
    });

    ctx.textAlign = 'center'; ctx.fillStyle = '#55708C'; ctx.font = '6px monospace';
    ctx.fillText('ESC → volver', VW / 2, VH - 8);
    ctx.textAlign = 'left';
  }

  // ACHIEVEMENTS
  let achScroll = 0;
  function achScrollBy(d) {
    const rows = Math.ceil(Achieve.all.length / 2);
    achScroll = clamp(achScroll + d, 0, Math.max(0, rows - 9));
  }
  function drawAchievements(ctx) {
    ctx.fillStyle = '#070A1E'; ctx.fillRect(0, 0, VW, VH);
    drawStars(ctx);
    shadow(ctx, 'LOGROS', VW / 2, 16, '#FFD95E', '#5A3A00', 11);

    const d = Progress.get();
    const perRow = 2, colW = VW / perRow;
    const startRow = achScroll, visRows = 9;

    for (let r = 0; r < visRows; r++) {
      for (let c = 0; c < perRow; c++) {
        const i = (startRow + r) * perRow + c;
        if (i >= Achieve.all.length) continue;
        const a = Achieve.all[i];
        const got = !!d.achievements[a.id];
        const x = c * colW + 6, y = 32 + r * 18;

        ctx.fillStyle = got ? 'rgba(255,217,94,0.13)' : 'rgba(255,255,255,0.04)';
        ctx.fillRect(x - 2, y - 8, colW - 10, 16);
        ctx.fillStyle = got ? '#FFD95E' : '#3A4458';
        ctx.font = 'bold 6px monospace';
        ctx.fillText(got ? a.name : '???', x + 2, y);
        ctx.fillStyle = got ? '#93A8BE' : '#2A3242';
        ctx.font = '5px monospace';
        ctx.fillText(got ? a.desc : 'Aún por descubrir', x + 2, y + 8);
      }
    }

    ctx.textAlign = 'center'; ctx.fillStyle = '#8FA8C8'; ctx.font = '6px monospace';
    ctx.fillText(`${Achieve.unlockedCount()} / ${Achieve.all.length}   ·   ↑↓ desplazar   ·   ESC volver`,
                 VW / 2, VH - 6);
    ctx.textAlign = 'left';
  }

  // STATS
  function drawStats(ctx) {
    ctx.fillStyle = '#070A1E'; ctx.fillRect(0, 0, VW, VH);
    drawStars(ctx);
    shadow(ctx, 'ESTADÍSTICAS', VW / 2, 20, '#FFD95E', '#5A3A00', 12);

    const s = Progress.stats();
    const d = Progress.get();
    const rows = [
      ['Completado',            `${s.percent}%`],
      ['Niveles',               `${s.completed} / ${s.total}`],
      ['Salidas secretas',      `${s.secrets} / ${s.secretsAvailable}`],
      ['Reliquias',             `${s.relics} / ${s.relicTotal}`],
      ['Niveles al 100%',       `${s.perfectCoins}`],
      ['Niveles sin daño',      `${s.noDamage}`],
      ['Fragmentos',            `${s.coins}`],
      ['Luka Tokens',           `${s.tokens}`],
      ['Muertes',               `${s.deaths}`],
      ['Partidas terminadas',   `${d.completions}`],
      ['Logros',                `${Achieve.unlockedCount()} / ${Achieve.all.length}`],
    ];
    rows.forEach(([k, v], i) => {
      const y = 40 + i * 13;
      ctx.fillStyle = i % 2 ? 'rgba(255,255,255,0.04)' : 'transparent';
      ctx.fillRect(40, y - 8, VW - 80, 12);
      ctx.fillStyle = '#8FA8C8'; ctx.font = '6px monospace';
      ctx.fillText(k, 46, y);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#FFFFFF'; ctx.font = 'bold 6px monospace';
      ctx.fillText(v, VW - 46, y);
      ctx.textAlign = 'left';
    });

    // 100% bar
    ctx.fillStyle = '#1A2030'; ctx.fillRect(46, VH - 22, VW - 92, 6);
    ctx.fillStyle = '#5FD16A';
    ctx.fillRect(46, VH - 22, Math.round((VW - 92) * s.percent / 100), 6);

    ctx.textAlign = 'center'; ctx.fillStyle = '#55708C'; ctx.font = '5px monospace';
    ctx.fillText('ESC → volver', VW / 2, VH - 6);
    ctx.textAlign = 'left';
  }

  // CREDITS
  const CREDIT_LINES = [
    '', '[ LUKA ADVENTURE ]', '',
    'Un platformer 2D de 16 bits', '', '- - -', '',
    'HISTORIA', 'Jaco fue arrastrado al Vacío.',
    'Luka cruzó nueve mundos para', 'traerlo de vuelta.', '',
    '- - -', '', 'LOS NUEVE MUNDOS', '',
    ...WORLDS.map(w => `${w.id}. ${w.name}`),
    '', '- - -', '', 'JEFES', '',
    ...WORLDS.map(w => (BOSS_DEFS[w.boss] || {}).name || ''),
    '', '- - -', '', 'TECNOLOGÍA', '',
    'HTML5 Canvas · Web Audio API', 'Sin librerías. Sin assets externos.',
    'Todo el pixel art es procedural.', '',
    'Niveles generados con semilla', 'determinista y verificados',
    'como completables.', '',
    '- - -', '', 'Gracias por jugar.', '', '★ ★ ★', '', '',
  ];

  function resetCredits() { creditY = 0; }
  function drawCredits(ctx) {
    frame++;
    creditY += 0.42;
    ctx.fillStyle = '#05000E'; ctx.fillRect(0, 0, VW, VH);
    drawStars(ctx);

    const lh = 13;
    const top = VH - creditY;
    ctx.textAlign = 'center';
    CREDIT_LINES.forEach((line, i) => {
      const y = top + i * lh;
      if (y < -lh || y > VH + lh) return;
      if (line === '[ LUKA ADVENTURE ]') {
        ctx.fillStyle = '#FFD95E'; ctx.font = 'bold 10px monospace';
      } else if (line.startsWith('- - -')) {
        ctx.fillStyle = '#3E4E7A'; ctx.font = '7px monospace';
      } else if (/^[A-ZÍÓÁÉÚ ]{4,}$/.test(line)) {
        ctx.fillStyle = '#9AD8F5'; ctx.font = 'bold 7px monospace';
      } else if (line === '★ ★ ★') {
        ctx.fillStyle = '#FFD95E'; ctx.font = '9px monospace';
      } else {
        ctx.fillStyle = '#B8C8DC'; ctx.font = '6px monospace';
      }
      ctx.fillText(line, VW / 2, y);
    });
    if (creditY > CREDIT_LINES.length * lh + VH) creditY = 0;

    ctx.fillStyle = 'rgba(5,0,14,0.9)';
    ctx.fillRect(0, VH - 14, VW, 14);
    ctx.fillStyle = '#55708C'; ctx.font = '5px monospace';
    ctx.fillText('ESC → volver', VW / 2, VH - 5);
    ctx.textAlign = 'left';
  }

  // TRANSITION
  function drawFade(ctx, a) {
    if (a <= 0) return;
    ctx.globalAlpha = clamp(a, 0, 1);
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, VW, VH);
    ctx.globalAlpha = 1;
  }

  return {
    initStars, drawMenu, menuMove, menuSelection, resetMenu,
    drawHUD, drawLevelIntro, drawPause, pauseMove, pauseSelection, resetPause,
    drawLevelClear, drawGameOver, drawVictory,
    drawControls, drawAchievements, achScrollBy, drawStats,
    drawCredits, resetCredits, drawFade, archLabel,
  };
})();
