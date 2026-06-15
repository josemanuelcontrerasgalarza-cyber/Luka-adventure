'use strict';

// All UI: menus, HUD, transitions
const UI = (() => {
  // ─── STATE ────────────────────────────────────────────────
  let menuCursor  = 0;
  let creditScroll = 0;
  let frame = 0;
  let bgStars = [];
  let menuAnimFrame = 0;
  const MENU_ITEMS = ['JUGAR', 'CONTROLES', 'LOGROS', 'CRÉDITOS'];
  const CREDIT_LINES = [
    '',
    '[ LUKA ADVENTURE ]',
    '',
    'Un juego de aventura pixel art',
    'inspirado en el GBA y SNES.',
    '',
    '─────────────────────',
    '',
    'HISTORIA',
    'Luka es un gato aventurero',
    'que busca a su amigo Jaco',
    'secuestrado por robots.',
    '',
    '─────────────────────',
    '',
    'CONTROLES',
    'A / ← : Mover izquierda',
    'D / → : Mover derecha',
    'ESPACIO / ↑ : Saltar',
    'P / ESC : Pausar',
    '',
    '─────────────────────',
    '',
    'MUNDOS',
    '1. La Casa - Aspiradoras',
    '2. El Colegio - Drones',
    '3. La Ciudad - Robots Patrulla',
    '4. El Internet - Virus',
    '5. El Espacio - Robots Espaciales',
    '',
    'Jefe: KERNEL-X',
    '',
    '─────────────────────',
    '',
    'MECÁNICAS',
    '• Sistema de vidas y checkpoints',
    '• Doble salto desbloqueable',
    '• Boost de velocidad',
    '• Escudo temporal',
    '• Sistema de logros',
    '',
    '─────────────────────',
    '',
    'TECNOLOGÍA',
    'HTML5 Canvas + Web Audio API',
    'Sin librerías externas',
    '100% Vanilla JavaScript',
    '',
    '─────────────────────',
    '',
    '¡Gracias por jugar!',
    '',
    'Rescata a Jaco,',
    'vence a KERNEL-X.',
    '',
    '★ ★ ★',
    '',
  ];

  function initStars() {
    bgStars = [];
    for (let i = 0; i < 80; i++) {
      bgStars.push({
        x: Math.random() * VW,
        y: Math.random() * VH,
        size: Math.random() < 0.3 ? 2 : 1,
        speed: Math.random() * 0.4 + 0.1,
        bright: Math.random() > 0.5,
      });
    }
  }

  function updateMenu(dir) {
    menuCursor = (menuCursor + dir + MENU_ITEMS.length) % MENU_ITEMS.length;
    Audio.sfx.menuSelect();
  }

  function selectMenu() {
    return menuCursor;
  }

  // ─── DRAWING HELPERS ──────────────────────────────────────
  function text(ctx, str, x, y, color, size, align = 'left') {
    ctx.fillStyle = color;
    ctx.font = `${size}px monospace`;
    ctx.textAlign = align;
    ctx.fillText(str, x, y);
    ctx.textAlign = 'left';
  }

  function textBold(ctx, str, x, y, color, size, align = 'left') {
    ctx.fillStyle = color;
    ctx.font = `bold ${size}px monospace`;
    ctx.textAlign = align;
    ctx.fillText(str, x, y);
    ctx.textAlign = 'left';
  }

  function shadowText(ctx, str, x, y, color, shadowColor, size, align = 'center') {
    ctx.textAlign = align;
    ctx.fillStyle = shadowColor;
    ctx.font = `bold ${size}px monospace`;
    ctx.fillText(str, x + 1, y + 1);
    ctx.fillStyle = color;
    ctx.fillText(str, x, y);
    ctx.textAlign = 'left';
  }

  function drawBgStars(ctx) {
    for (const s of bgStars) {
      ctx.fillStyle = s.bright ? '#FFFFFF' : '#AAAACC';
      ctx.globalAlpha = s.bright ? 0.9 : 0.5;
      ctx.fillRect(s.x | 0, s.y | 0, s.size, s.size);
    }
    ctx.globalAlpha = 1;
  }

  function moveBgStars() {
    for (const s of bgStars) {
      s.x -= s.speed;
      if (s.x < 0) {
        s.x = VW;
        s.y = Math.random() * VH;
      }
    }
  }

  // ─── MAIN MENU ────────────────────────────────────────────
  function drawMainMenu(ctx, saveData) {
    frame++;
    menuAnimFrame++;
    moveBgStars();

    // Background gradient
    const grad = ctx.createLinearGradient(0, 0, 0, VH);
    grad.addColorStop(0, '#000820');
    grad.addColorStop(1, '#001840');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, VW, VH);

    drawBgStars(ctx);

    // Ground glow
    ctx.fillStyle = 'rgba(0,100,200,0.15)';
    ctx.fillRect(0, VH - 30, VW, 30);

    // Title shadow/glow
    const pulse = Math.sin(menuAnimFrame * 0.04) * 0.3 + 0.7;
    ctx.globalAlpha = pulse * 0.4;
    ctx.fillStyle = '#4488FF';
    ctx.font = 'bold 30px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('LUKA', VW/2 + 1, 50 + 1);
    ctx.fillText('ADVENTURE', VW/2 + 1, 72 + 1);
    ctx.globalAlpha = 1;

    // Title
    shadowText(ctx, 'LUKA', VW/2, 50, '#FFD700', '#CC6600', 28);
    shadowText(ctx, 'ADVENTURE', VW/2, 72, '#FF8800', '#884400', 16);

    // Subtitle
    ctx.textAlign = 'center';
    ctx.fillStyle = '#88CCFF';
    ctx.font = '6px monospace';
    ctx.fillText('~ Rescata a Jaco ~', VW/2, 84);
    ctx.textAlign = 'left';

    // Menu items
    const startY = 105;
    const lineH = 18;
    for (let i = 0; i < MENU_ITEMS.length; i++) {
      const active = i === menuCursor;
      const y = startY + i * lineH;

      if (active) {
        // Selection bg
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = '#4488FF';
        ctx.fillRect(VW/2 - 60, y - 10, 120, 14);
        ctx.globalAlpha = 1;

        // Arrow
        const arrowX = VW/2 - 68;
        ctx.fillStyle = COL.GOLD;
        ctx.font = 'bold 9px monospace';
        ctx.textAlign = 'left';
        ctx.fillText('►', arrowX, y);
      }

      shadowText(ctx, MENU_ITEMS[i], VW/2, y,
        active ? COL.GOLD : '#AACCFF',
        active ? '#664400' : '#224466',
        active ? 9 : 8
      );
    }

    // Save info
    const unlocked = Object.keys(saveData.achievements || {}).length;
    const achTotal = Achievements.getAll().length;
    ctx.fillStyle = '#446688';
    ctx.font = '6px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`Mundo ${saveData.highestWorld || 1}/5  |  Atunes: ${saveData.totalTuna || 0}  |  Logros: ${unlocked}/${achTotal}`, VW/2, VH - 30);

    if (saveData.hardMode) {
      ctx.fillStyle = '#FF4444';
      ctx.fillText('[ MODO DIFÍCIL ACTIVO ]', VW/2, VH - 20);
    }

    ctx.fillStyle = '#334455';
    ctx.fillText('v1.0  |  ©2024 Luka Adventure', VW/2, VH - 10);
    ctx.textAlign = 'left';
  }

  // ─── WORLD INTRO ──────────────────────────────────────────
  function drawWorldIntro(ctx, level, timer) {
    const alpha = timer > 120 ? (180 - timer) / 60 : timer < 60 ? timer / 60 : 1;
    ctx.globalAlpha = alpha;

    ctx.fillStyle = 'rgba(0,0,0,0.85)';
    ctx.fillRect(0, 0, VW, VH);

    shadowText(ctx, level.name,     VW/2, VH/2 - 20, COL.GOLD,  '#664400', 14);
    shadowText(ctx, level.subtitle, VW/2, VH/2,       COL.WHITE, '#222222', 10);

    // World icon
    ctx.fillStyle = COL.GOLD;
    ctx.font = 'bold 7px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Prepárate...', VW/2, VH/2 + 20);
    ctx.textAlign = 'left';

    ctx.globalAlpha = 1;
  }

  // ─── HUD ──────────────────────────────────────────────────
  function drawHUD(ctx, lives, tuna, worldId, worldName, progress, saveData, hasShield, speedBoost, hasDoubleJump) {
    // HUD bar
    ctx.fillStyle = '#111111';
    ctx.fillRect(0, 0, VW, HUD_H);
    ctx.fillStyle = '#333333';
    ctx.fillRect(0, HUD_H - 1, VW, 1);

    // Lives
    for (let i = 0; i < START_LIVES; i++) {
      Spr.drawHeartIcon(ctx, 4 + i * 14, 4, i < lives);
    }

    // Life count
    ctx.fillStyle = lives > 1 ? '#FFFFFF' : '#FF4444';
    ctx.font = 'bold 7px monospace';
    ctx.fillText(`x${lives}`, 46, 13);

    // Tuna icon + count
    Spr.drawTunaIcon(ctx, 65, 4);
    ctx.fillStyle = COL.GOLD;
    ctx.font = 'bold 7px monospace';
    ctx.fillText(`x${tuna}`, 77, 13);

    // Power-up indicators
    let px = 110;
    if (hasDoubleJump) {
      ctx.fillStyle = '#00AAFF';
      ctx.fillRect(px, 5, 8, 10);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '5px monospace';
      ctx.fillText('2J', px + 1, 13);
      px += 12;
    }
    if (hasShield) {
      ctx.fillStyle = '#00FF88';
      ctx.fillRect(px, 5, 8, 10);
      ctx.fillStyle = '#000000';
      ctx.font = '5px monospace';
      ctx.fillText('★', px, 13);
      px += 12;
    }
    if (speedBoost) {
      ctx.fillStyle = '#FF8800';
      ctx.fillRect(px, 5, 8, 10);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '5px monospace';
      ctx.fillText('⚡', px, 13);
    }

    // World name
    ctx.fillStyle = '#AABBCC';
    ctx.font = '6px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(worldName, VW/2, 13);

    // Progress bar
    const barX = VW - 90;
    const barW = 85;
    const barH = 5;
    ctx.fillStyle = '#333333';
    ctx.fillRect(barX, 7, barW, barH);
    ctx.fillStyle = worldId === 6 ? '#FF4444' : COL.GOLD;
    ctx.fillRect(barX, 7, barW * Math.min(1, progress) | 0, barH);
    ctx.fillStyle = '#555555';
    ctx.fillRect(barX, 7, barW, 1);

    ctx.textAlign = 'left';
  }

  // ─── PAUSE SCREEN ─────────────────────────────────────────
  function drawPause(ctx) {
    ctx.globalAlpha = 0.65;
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, VW, VH);
    ctx.globalAlpha = 1;

    shadowText(ctx, 'PAUSA', VW/2, VH/2 - 20, COL.GOLD, '#664400', 16);
    ctx.font = '7px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#AACCFF';
    ctx.fillText('ESC / P  →  Reanudar', VW/2, VH/2 + 2);
    ctx.fillStyle = '#667799';
    ctx.fillText('Espacio  →  Menú principal', VW/2, VH/2 + 16);
    ctx.textAlign = 'left';
  }

  // ─── GAME OVER ────────────────────────────────────────────
  function drawGameOver(ctx, score) {
    frame++;
    // Dark bg
    const grad = ctx.createLinearGradient(0, 0, 0, VH);
    grad.addColorStop(0, '#100000');
    grad.addColorStop(1, '#200000');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, VW, VH);

    drawBgStars(ctx);

    const flicker = Math.sin(frame * 0.15) > 0 ? 1 : 0.7;
    ctx.globalAlpha = flicker;
    shadowText(ctx, 'GAME OVER', VW/2, VH/2 - 25, '#FF3333', '#440000', 18);
    ctx.globalAlpha = 1;

    ctx.font = '7px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#AAAAAA';
    ctx.fillText(`Atunes: ${score}`, VW/2, VH/2 + 5);

    ctx.fillStyle = '#6688AA';
    ctx.fillText('Espacio / Enter  →  Reintentar', VW/2, VH/2 + 22);
    ctx.fillText('ESC  →  Menú principal', VW/2, VH/2 + 34);
    ctx.textAlign = 'left';
  }

  // ─── VICTORY / LEVEL COMPLETE ─────────────────────────────
  function drawLevelComplete(ctx, worldName, tuna, timer) {
    frame++;
    const grad = ctx.createLinearGradient(0, 0, 0, VH);
    grad.addColorStop(0, '#002000');
    grad.addColorStop(1, '#004400');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, VW, VH);
    drawBgStars(ctx);

    const alpha = timer > 120 ? (180 - timer) / 60 : 1;
    ctx.globalAlpha = alpha;

    shadowText(ctx, '¡NIVEL COMPLETO!', VW/2, VH/2 - 30, '#33FF33', '#004400', 12);
    shadowText(ctx, worldName,          VW/2, VH/2 - 12, COL.GOLD,  '#664400', 9);

    ctx.font = '7px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = COL.WHITE;
    ctx.fillText(`Atunes: ${tuna}`, VW/2, VH/2 + 10);

    if (timer < 120) {
      ctx.fillStyle = '#88CCFF';
      ctx.fillText('Continuando...', VW/2, VH/2 + 26);
    }

    ctx.globalAlpha = 1;
    ctx.textAlign = 'left';
  }

  // ─── FINAL VICTORY ────────────────────────────────────────
  function drawVictory(ctx, totalTuna, timer) {
    frame++;
    const grad = ctx.createLinearGradient(0, 0, 0, VH);
    grad.addColorStop(0, '#001030');
    grad.addColorStop(1, '#002060');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, VW, VH);
    drawBgStars(ctx);

    const pulse = Math.sin(frame * 0.06) * 0.3 + 0.7;
    ctx.globalAlpha = pulse;
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 22px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('★', VW/2, 55);
    ctx.globalAlpha = 1;

    shadowText(ctx, '¡VICTORIA!',  VW/2, 78,  COL.GOLD,  '#664400', 14);
    shadowText(ctx, '¡Luka rescató a Jaco!', VW/2, 96, '#FFFFFF', '#222222', 7);

    ctx.textAlign = 'center';
    ctx.font = '6px monospace';
    ctx.fillStyle = '#AACCFF';
    ctx.fillText('KERNEL-X ha sido derrotado.', VW/2, 115);
    ctx.fillText('La ciudad está a salvo.', VW/2, 126);

    ctx.fillStyle = COL.GOLD;
    ctx.fillText(`Total Atunes: ${totalTuna}`, VW/2, 145);

    if (timer < 240) {
      ctx.fillStyle = '#66AAFF';
      ctx.fillText('Espacio → Menú principal', VW/2, VH - 22);
    }

    ctx.textAlign = 'left';
  }

  // ─── CONTROLS SCREEN ──────────────────────────────────────
  function drawControls(ctx) {
    ctx.fillStyle = COL.MENUBG;
    ctx.fillRect(0, 0, VW, VH);
    drawBgStars(ctx);

    shadowText(ctx, 'CONTROLES', VW/2, 24, COL.GOLD, '#664400', 11, 'center');

    const entries = [
      ['A / ←',          'Mover izquierda'],
      ['D / →',          'Mover derecha'],
      ['ESPACIO / ↑',    'Saltar'],
      ['ESPACIO (aire)', 'Doble salto*'],
      ['ESC / P',        'Pausar'],
      ['ENTER / Z',      'Confirmar'],
    ];

    const startY = 45;
    entries.forEach(([key, action], i) => {
      const y = startY + i * 16;
      // Key bg
      ctx.fillStyle = 'rgba(0,50,100,0.5)';
      ctx.fillRect(30, y - 9, 75, 13);
      ctx.fillStyle = '#AADDFF';
      ctx.font = 'bold 7px monospace';
      ctx.fillText(key, 33, y);

      ctx.fillStyle = '#AAAAAA';
      ctx.font = '7px monospace';
      ctx.fillText(action, 115, y);
    });

    ctx.fillStyle = '#556677';
    ctx.font = '6px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('*Doble salto requiere power-up', VW/2, startY + entries.length * 16 + 8);

    ctx.fillStyle = '#AABBCC';
    ctx.fillText('Coleccionables:', VW/2, startY + entries.length * 16 + 25);
    ctx.fillStyle = '#99CCFF';
    ctx.fillText('🐟 Atún = +1 punto', VW/2, startY + entries.length * 16 + 38);
    ctx.fillStyle = COL.GOLD;
    ctx.fillText('🪙 Moneda = +5 puntos', VW/2, startY + entries.length * 16 + 50);
    ctx.fillStyle = '#FF9999';
    ctx.fillText('❤️ Corazón = +1 vida', VW/2, startY + entries.length * 16 + 62);

    ctx.fillStyle = '#556677';
    ctx.fillText('ESC → Volver al menú', VW/2, VH - 12);
    ctx.textAlign = 'left';
  }

  // ─── ACHIEVEMENTS SCREEN ──────────────────────────────────
  function drawAchievements(ctx, saveData) {
    ctx.fillStyle = COL.MENUBG;
    ctx.fillRect(0, 0, VW, VH);
    drawBgStars(ctx);

    shadowText(ctx, 'LOGROS', VW/2, 20, COL.GOLD, '#664400', 11, 'center');

    const all = Achievements.getAll();
    const startY = 35;
    const lineH = 17;
    const cols = 2;
    const colW = VW / cols;

    all.forEach((ach, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = col * colW + 8;
      const y = startY + row * lineH;
      const unlocked = Achievements.isUnlocked(ach.id, saveData);

      if (unlocked) {
        ctx.fillStyle = 'rgba(255,215,0,0.15)';
        ctx.fillRect(x - 2, y - 9, colW - 12, lineH - 2);
      }

      ctx.fillStyle = unlocked ? COL.GOLD : '#444444';
      ctx.font = 'bold 7px monospace';
      ctx.fillText(unlocked ? ach.name : '???', x + 2, y);

      ctx.fillStyle = unlocked ? '#AAAAAA' : '#333333';
      ctx.font = '5px monospace';
      ctx.fillText(unlocked ? ach.desc : '¡Aún por desbloquear!', x + 2, y + 8);
    });

    const total = Achievements.count(saveData);
    const max   = all.length;
    ctx.fillStyle = '#556677';
    ctx.font = '6px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`${total} / ${max} logros desbloqueados`, VW/2, VH - 20);
    ctx.fillText('ESC → Volver al menú', VW/2, VH - 10);
    ctx.textAlign = 'left';
  }

  // ─── CREDITS SCREEN ───────────────────────────────────────
  function drawCredits(ctx) {
    frame++;
    creditScroll += 0.5;

    ctx.fillStyle = '#000010';
    ctx.fillRect(0, 0, VW, VH);
    drawBgStars(ctx);

    ctx.fillStyle = '#001020';
    ctx.fillRect(0, 0, VW, VH * 0.08);
    ctx.fillRect(0, VH * 0.92, VW, VH * 0.08);

    ctx.save();
    ctx.rect(0, VH * 0.08, VW, VH * 0.84);
    ctx.clip();

    const lineH = 14;
    const startY = VH - creditScroll;
    CREDIT_LINES.forEach((line, i) => {
      const y = startY + i * lineH;
      if (y < -lineH || y > VH + lineH) return;
      const isHeader = line.startsWith('[') || line.startsWith('─');
      const isTitle  = line === '[ LUKA ADVENTURE ]';
      ctx.textAlign = 'center';
      if (isTitle) {
        ctx.fillStyle = COL.GOLD;
        ctx.font = 'bold 9px monospace';
      } else if (isHeader) {
        ctx.fillStyle = '#AAAAFF';
        ctx.font = 'bold 7px monospace';
      } else if (line.startsWith('•') || line.startsWith('1.') || line.match(/^\d\./)) {
        ctx.fillStyle = '#88CCFF';
        ctx.font = '6px monospace';
      } else if (line === '★ ★ ★') {
        ctx.fillStyle = COL.GOLD;
        ctx.font = '8px monospace';
      } else {
        ctx.fillStyle = '#CCCCCC';
        ctx.font = '6px monospace';
      }
      ctx.fillText(line, VW/2, y);
    });

    ctx.restore();

    // Reset when done
    if (creditScroll > CREDIT_LINES.length * lineH + VH) {
      creditScroll = 0;
    }

    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(0,0,50,0.8)';
    ctx.fillRect(0, VH - 18, VW, 18);
    ctx.fillStyle = '#445566';
    ctx.font = '6px monospace';
    ctx.fillText('ESC → Volver al menú', VW/2, VH - 6);
    ctx.textAlign = 'left';
  }

  // ─── TRANSITION ───────────────────────────────────────────
  function drawTransition(ctx, alpha) {
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, VW, VH);
    ctx.globalAlpha = 1;
  }

  // ─── EASTER EGG HINT ──────────────────────────────────────
  function drawEasterEggNotif(ctx) {
    ctx.fillStyle = 'rgba(0,0,0,0.8)';
    ctx.fillRect(VW/2 - 100, VH/2 - 20, 200, 40);
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 8px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('¡EASTER EGG ENCONTRADO!', VW/2, VH/2 - 5);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '6px monospace';
    ctx.fillText('Has desbloqueado el Modo Difícil', VW/2, VH/2 + 10);
    ctx.textAlign = 'left';
  }

  // ─── HARD MODE BANNER ─────────────────────────────────────
  function drawHardModeBanner(ctx) {
    const t = Date.now() * 0.004;
    ctx.globalAlpha = 0.6;
    ctx.fillStyle = '#FF0000';
    ctx.fillRect(0, 0, VW, 8);
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#FF4444';
    ctx.font = 'bold 5px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('☠ MODO DIFÍCIL ☠', VW/2, 6);
    ctx.textAlign = 'left';
  }

  return {
    initStars, updateMenu, selectMenu,
    drawMainMenu, drawWorldIntro, drawHUD,
    drawPause, drawGameOver, drawLevelComplete, drawVictory,
    drawControls, drawAchievements, drawCredits,
    drawTransition, drawEasterEggNotif, drawHardModeBanner,
    get menuCursor() { return menuCursor; },
    resetCreditScroll() { creditScroll = 0; },
  };
})();
