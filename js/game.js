'use strict';

// ─── GAME ENGINE ─────────────────────────────────────────────
const Game = (() => {

  // Canvas & rendering
  let canvas, ctx;
  let scale = 1;

  // State
  let state = ST.LOADING;
  let frame = 0;

  // Save data (persistent)
  let saveData = {};

  // Session state
  let lives = START_LIVES;
  let tuna = 0;
  let currentLevelId = 1;
  let checkpointX = -1, checkpointY = -1;
  let noDamageThisLevel = true;
  let enemiesKilledThisLevel = 0;
  let coinsThisLevel = 0;
  let totalCoinsThisLevel = 0;
  let speedBoostCollected = false;
  let sessionTunaStart = 0;
  let playtimeStart = 0;

  // World instances
  let player = null;
  let enemies = [];
  let collectibles = [];
  let powerups = [];
  let currentLevel = null;
  let boss = null;
  let bossProjectiles = [];

  // Transition
  let transAlpha = 0;
  let transDir = 0; // 1=fade in, -1=fade out
  let transCallback = null;

  // Timers
  let introTimer = 0;
  let completeTimer = 0;
  let victoryTimer = 0;
  let easterEggTimer = 0;
  let pauseToMenu = false;

  // Background star cache for each world
  let worldBgData = null;
  let bgFrame = 0;

  // Matrix rain for world 4
  let matrixCols = [];

  // ─── INIT ─────────────────────────────────────────────────
  function init() {
    canvas = document.getElementById('game-canvas');
    ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    // Resize handling
    resize();
    window.addEventListener('resize', resize);

    // Init subsystems
    Audio.init();
    UI.initStars();
    saveData = SaveManager.load();

    // Start loading sequence
    state = ST.LOADING;
    _doLoadingSequence();
  }

  function resize() {
    const scaleX = window.innerWidth  / VW;
    const scaleY = window.innerHeight / VH;
    scale = Math.min(scaleX, scaleY);
    const w = VW * scale | 0;
    const h = VH * scale | 0;
    canvas.style.width  = w + 'px';
    canvas.style.height = h + 'px';
    canvas.width  = VW;
    canvas.height = VH;
    ctx.imageSmoothingEnabled = false;
  }

  function _doLoadingSequence() {
    const fill = document.querySelector('.loading-fill');
    let pct = 0;
    const iv = setInterval(() => {
      pct += Math.random() * 15 + 5;
      if (pct >= 100) {
        pct = 100;
        clearInterval(iv);
        setTimeout(() => {
          const ls = document.getElementById('loading-screen');
          ls.classList.add('hidden');
          setTimeout(() => { ls.style.display = 'none'; }, 500);
          state = ST.MENU;
          Audio.playMusic('menu');
        }, 300);
      }
      if (fill) fill.style.width = Math.min(100, pct) + '%';
    }, 80);
  }

  // ─── LEVEL LOADING ────────────────────────────────────────
  function loadLevel(id) {
    currentLevelId = id;
    currentLevel = getLevel(id);
    enemies = [];
    collectibles = [];
    powerups = [];
    bossProjectiles = [];
    boss = null;
    noDamageThisLevel = true;
    enemiesKilledThisLevel = 0;
    coinsThisLevel = 0;

    // Count total coins
    totalCoinsThisLevel = (currentLevel.collectibles || []).filter(c => c.type === CT.COIN).length;

    const startX = checkpointX > 0 ? checkpointX : currentLevel.start.x;
    const startY = checkpointY > 0 ? checkpointY : currentLevel.start.y;
    player = new Player(startX, startY);

    // Restore save data upgrades
    player.shieldTimer = 0;
    player.speedBoostTimer = 0;

    // Create enemies
    for (const ed of (currentLevel.enemies || [])) {
      enemies.push(makeEnemy(ed, id));
    }

    // Create collectibles
    for (const cd of (currentLevel.collectibles || [])) {
      collectibles.push({ ...cd, collected: false });
    }

    // Create power-ups
    for (const pd of (currentLevel.powerups || [])) {
      powerups.push({ ...pd, collected: false });
    }

    // Boss level
    if (id === 6) {
      boss = new Boss();
    }

    // Init matrix rain for world 4
    if (id === 4) _initMatrix();

    // Background star/data
    worldBgData = _buildBgData(currentLevel);

    Audio.playMusic(currentLevel.bgMusic);
  }

  function _buildBgData(level) {
    const data = { stars: [], planets: [], buildings: [], decor: [] };
    for (const d of (level.bgDecor || [])) {
      if (d.type === 'stars') {
        for (let i = 0; i < (d.count || 80); i++) {
          data.stars.push({
            x: Math.random() * level.width,
            y: Math.random() * (VH * 0.8),
            size: Math.random() < 0.2 ? 2 : 1,
            twinkle: Math.random() > 0.7,
            phase: Math.random() * Math.PI * 2,
          });
        }
      } else if (d.type === 'planet') {
        data.planets.push(d);
      } else if (d.type === 'building') {
        data.buildings.push(d);
      } else {
        data.decor.push(d);
      }
    }
    return data;
  }

  function _initMatrix() {
    matrixCols = [];
    const cols = Math.ceil(VW / 8);
    for (let i = 0; i < cols; i++) {
      matrixCols.push({
        y: Math.random() * VH,
        speed: 1 + Math.random() * 2,
        chars: Array.from({length: 20}, () =>
          String.fromCharCode(0x30 + Math.floor(Math.random() * 10))
        ),
      });
    }
  }

  // ─── CAMERA ───────────────────────────────────────────────
  let camX = 0, camTarget = 0;

  function updateCamera() {
    if (!player) return;
    camTarget = player.x - VW / 3;
    if (camTarget < 0) camTarget = 0;
    const maxCam = currentLevel.width - VW;
    if (camTarget > maxCam) camTarget = maxCam;
    camX += (camTarget - camX) * 0.1;
    camX = Math.max(0, Math.min(maxCam, camX));
  }

  // ─── TRANSITION ───────────────────────────────────────────
  function startTransition(cb) {
    transDir = 1;
    transAlpha = 0;
    transCallback = cb;
  }

  function updateTransition() {
    if (transDir === 1) {
      transAlpha += 0.05;
      if (transAlpha >= 1) {
        transAlpha = 1;
        if (transCallback) { transCallback(); transCallback = null; }
        transDir = -1;
      }
    } else if (transDir === -1) {
      transAlpha -= 0.04;
      if (transAlpha <= 0) {
        transAlpha = 0;
        transDir = 0;
      }
    }
  }

  // ─── GAMEPLAY UPDATE ──────────────────────────────────────
  function updatePlaying() {
    if (!player || !currentLevel) return;
    bgFrame++;

    // Player
    player.update(currentLevel, saveData);

    // Camera
    updateCamera();

    // Enemies
    for (const e of enemies) {
      if (!e.alive) continue;
      e.update(currentLevel, player);

      // Enemy <-> Player collision
      if (e.touchesPlayer(player)) {
        // Check stomp
        const stomped = player.vy > 0
          && player.y + PH < e.y + e.h * 0.5
          && player.y + PH > e.y - 6;
        if (stomped) {
          e.die();
          player.vy = -5;
          enemiesKilledThisLevel++;
          tuna += 2;
          Audio.sfx.explosion();
          Particles.emitExplosion(e.x + e.w/2, e.y + e.h/2);
        } else {
          const prev = lives;
          lives = player.takeDamage(lives);
          if (lives < prev) {
            noDamageThisLevel = false;
            Achievements.unlock(ACH.FIRST_DEATH, saveData);
          }
        }
      }
    }

    // Boss
    if (boss) {
      // Stomp takes priority over body contact damage
      const stomped = boss.isPlayerAbove(player) && player.vy > 0 && !player.invulnerable;
      if (stomped) {
        boss.takeDamage(saveData.hardMode ? 5 : 10);
        player.vy = -6;
        player.invulTimer = Math.max(player.invulTimer, 30);
      }

      const result = boss.update(currentLevel, player, bossProjectiles);
      if (!stomped && result === 'damage') {
        const prev = lives;
        lives = player.takeDamage(lives);
        if (lives < prev) noDamageThisLevel = false;
      }

      if (boss.state === 'die' && boss.defeated) {
        _onBossDefeated();
      }
    }

    // Collectibles
    for (const c of collectibles) {
      if (c.collected) continue;
      const pb = player.bounds;
      if (pb.x < c.x + 10 && pb.x + pb.w > c.x && pb.y < c.y + 10 && pb.y + pb.h > c.y) {
        c.collected = true;
        _collectItem(c);
      }
    }

    // Power-ups
    for (const pu of powerups) {
      if (pu.collected) continue;
      const pb = player.bounds;
      if (pb.x < pu.x + 12 && pb.x + pb.w > pu.x && pb.y < pu.y + 12 && pb.y + pb.h > pu.y) {
        pu.collected = true;
        _collectPowerup(pu);
      }
    }

    // Checkpoints
    for (const cp of (currentLevel.checkpoints || [])) {
      if (!cp._activated) {
        if (player.x + PW > cp.x && player.x < cp.x + 10 && Math.abs(player.y - cp.y) < 40) {
          cp._activated = true;
          checkpointX = cp.x;
          checkpointY = cp.y;
          Audio.sfx.checkpoint();
          Particles.emitCheckpoint(cp.x, cp.y);
        }
      }
    }

    // Goal / exit
    const end = currentLevel.end;
    if (end && player.x + PW > end.x && player.x < end.x + 24
            && player.y + PH > end.y && player.y < end.y + 32) {
      if (currentLevelId < 6) {
        _onLevelComplete();
      }
    }

    // Death by falling
    if (player.y > VH + 50) {
      _loseLife();
    }

    // Check achievements
    const gsInfo = { totalTuna: saveData.totalTuna + tuna, currentLevelId, speedBoostCollected };
    Achievements.checkAll(gsInfo, saveData);

    // Particles
    Particles.update();
    Achievements.update();

    // Pause check
    if (Input.PAUSE()) {
      state = ST.PAUSED;
      pauseToMenu = false;
    }
  }

  function _collectItem(c) {
    if (c.type === CT.TUNA) {
      tuna++;
      Audio.sfx.tuna();
      Particles.emitTuna(c.x, c.y);
    } else if (c.type === CT.COIN) {
      tuna += 5;
      coinsThisLevel++;
      Audio.sfx.coin();
      Particles.emitCoin(c.x, c.y);
    } else if (c.type === CT.HEART) {
      if (lives < START_LIVES + 2) {
        lives++;
        Audio.sfx.heart();
        Particles.emitHeart(c.x, c.y);
        Achievements.unlock(ACH.COLLECTOR, saveData);
      }
    }
  }

  function _collectPowerup(pu) {
    Audio.sfx.powerup();
    Particles.emitPowerup(pu.x, pu.y);

    if (pu.type === CT.PU_DJUMP) {
      saveData.hasDoubleJump = true;
    } else if (pu.type === CT.PU_SPEED) {
      player.speedBoostTimer = 600;
      speedBoostCollected = true;
      saveData.hasSpeedBoost = true;
      Achievements.unlock(ACH.SPEED_RUN, saveData);
    } else if (pu.type === CT.PU_SHIELD) {
      player.shieldTimer = 400;
      saveData.hasShield = true;
      Audio.sfx.shieldOn();
    }
    SaveManager.save(saveData);
  }

  function _onLevelComplete() {
    Audio.sfx.levelComplete();
    state = ST.VICTORY;
    completeTimer = 240;
    player.state = 'victory';

    // Achievement checks
    if (noDamageThisLevel) Achievements.unlock(ACH.NO_DAMAGE_1, saveData);
    if (enemiesKilledThisLevel === 0) Achievements.unlock(ACH.PACIFIST, saveData);
    if (coinsThisLevel >= totalCoinsThisLevel && totalCoinsThisLevel > 0) {
      Achievements.unlock(ACH.COLLECTOR, saveData);
    }

    if (currentLevelId >= saveData.highestWorld) {
      saveData.highestWorld = Math.min(6, currentLevelId + 1);
    }

    if (currentLevelId === 5) {
      Achievements.unlock(ACH.ALL_WORLDS, saveData);
    }

    saveData.totalTuna = (saveData.totalTuna || 0) + tuna;
    SaveManager.save(saveData);
  }

  function _onBossDefeated() {
    Achievements.unlock(ACH.BEAT_BOSS, saveData);
    saveData.totalTuna = (saveData.totalTuna || 0) + tuna;
    saveData.timesCompleted = (saveData.timesCompleted || 0) + 1;
    if (saveData.timesCompleted >= 1) saveData.hardMode = true; // Unlock hard mode
    SaveManager.save(saveData);
    state = ST.VICTORY;
    victoryTimer = 300;
  }

  function _loseLife() {
    lives--;
    noDamageThisLevel = false;
    player.invulTimer = INVUL_FRAMES;

    if (lives <= 0) {
      Audio.sfx.gameOver();
      Audio.stopMusic();
      state = ST.GAMEOVER;
    } else {
      Audio.sfx.die();
      const rx = checkpointX > 0 ? checkpointX : currentLevel.start.x;
      const ry = checkpointY > 0 ? checkpointY : currentLevel.start.y;
      player.reset(rx, ry);
    }
  }

  // ─── EASTER EGG ───────────────────────────────────────────
  let konami = [];
  const KONAMI = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','KeyB','KeyA'];

  function checkKonami(code) {
    konami.push(code);
    if (konami.length > 10) konami.shift();
    if (konami.join(',') === KONAMI.join(',')) {
      if (!saveData.easterEggFound) {
        saveData.easterEggFound = true;
        saveData.hardMode = true;
        SaveManager.save(saveData);
        easterEggTimer = 180;
        Audio.sfx.easterEgg();
      }
      konami = [];
    }
  }

  // ─── MAIN UPDATE ──────────────────────────────────────────
  function update() {
    frame++;
    updateTransition();

    switch (state) {
      case ST.MENU: {
        if (Input.UP())      UI.updateMenu(-1);
        if (Input.DOWN())    UI.updateMenu(1);
        if (Input.CONFIRM()) {
          const sel = UI.selectMenu();
          Audio.sfx.menuConfirm();
          if (sel === 0) { // JUGAR
            Audio.resume();
            startTransition(() => {
              tuna = 0;
              lives = saveData.hardMode ? 2 : START_LIVES;
              currentLevelId = saveData.highestWorld || 1;
              checkpointX = checkpointY = -1;
              loadLevel(currentLevelId);
              camX = 0;
              state = ST.WORLDINTRO;
              introTimer = 180;
            });
          } else if (sel === 1) { state = ST.CONTROLS; }
          else if (sel === 2) { state = ST.ACHIEVE; }
          else if (sel === 3) { state = ST.CREDITS; UI.resetCreditScroll(); }
        }
        break;
      }

      case ST.WORLDINTRO: {
        introTimer--;
        if (introTimer <= 0 || Input.CONFIRM()) {
          state = ST.PLAYING;
        }
        break;
      }

      case ST.PLAYING: {
        updatePlaying();
        if (easterEggTimer > 0) easterEggTimer--;
        break;
      }

      case ST.PAUSED: {
        if (Input.PAUSE()) { state = ST.PLAYING; }
        if (Input.CONFIRM() && pauseToMenu) {
          startTransition(() => {
            state = ST.MENU;
            Audio.playMusic('menu');
            checkpointX = checkpointY = -1;
          });
        }
        if (Input.pressed('Space')) {
          pauseToMenu = !pauseToMenu;
        }
        if (Input.BACK()) {
          startTransition(() => {
            state = ST.MENU;
            Audio.playMusic('menu');
            checkpointX = checkpointY = -1;
          });
        }
        break;
      }

      case ST.GAMEOVER: {
        if (Input.CONFIRM()) {
          startTransition(() => {
            tuna = 0;
            lives = saveData.hardMode ? 2 : START_LIVES;
            checkpointX = checkpointY = -1;
            loadLevel(currentLevelId);
            camX = 0;
            state = ST.WORLDINTRO;
            introTimer = 180;
            Audio.playMusic(currentLevel.bgMusic);
          });
        }
        if (Input.BACK()) {
          startTransition(() => {
            state = ST.MENU;
            Audio.playMusic('menu');
          });
        }
        break;
      }

      case ST.VICTORY: {
        bgFrame++;
        Particles.update();
        Achievements.update();

        if (currentLevelId === 6) {
          // Final victory
          victoryTimer--;
          if (victoryTimer < 200 && Input.CONFIRM()) {
            startTransition(() => {
              state = ST.MENU;
              Audio.playMusic('menu');
            });
          }
        } else {
          // Level complete
          completeTimer--;
          if (completeTimer <= 0) {
            startTransition(() => {
              checkpointX = checkpointY = -1;
              currentLevelId++;
              tuna = 0;
              loadLevel(currentLevelId);
              camX = 0;
              state = ST.WORLDINTRO;
              introTimer = 180;
            });
          }
        }
        break;
      }

      case ST.CONTROLS:
      case ST.ACHIEVE:
      case ST.CREDITS: {
        if (Input.BACK()) {
          state = ST.MENU;
          Audio.playMusic('menu');
        }
        break;
      }
    }

    Input.clear();
  }

  // ─── BACKGROUND DRAWING ───────────────────────────────────
  function drawBackground(ctx, level, camX) {
    const wp = WP[level.id] || WP[1];

    // Sky gradient
    const grad = ctx.createLinearGradient(0, 0, 0, VH);
    grad.addColorStop(0, wp.sky1);
    grad.addColorStop(1, wp.sky2);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, VW, VH);

    if (level.id === 5) {
      // Space stars
      if (worldBgData) {
        bgFrame++;
        for (const s of worldBgData.stars) {
          const sx = (s.x - camX * 0.3) % level.width;
          const twinkle = s.twinkle && Math.sin(bgFrame * 0.1 + s.phase) > 0.5;
          Spr.drawStar2(ctx, sx | 0, s.y | 0, s.size, twinkle);
        }
        for (const p of worldBgData.planets) {
          const px = p.x - camX * 0.2;
          if (px > -50 && px < VW + 50) {
            ctx.fillStyle = p.color;
            // Draw planet as circle
            for (let dy = -p.r; dy <= p.r; dy++) {
              const dx = Math.sqrt(p.r * p.r - dy * dy) | 0;
              ctx.fillRect(px - dx, p.y + dy, dx * 2, 1);
            }
            ctx.fillStyle = 'rgba(255,255,255,0.1)';
            for (let dy = -p.r; dy <= -p.r/2; dy++) {
              const dx = Math.sqrt(p.r*p.r - dy*dy) | 0;
              ctx.fillRect(px - dx, p.y + dy, dx * 0.6 | 0, 1);
            }
          }
        }
      }
    } else if (level.id === 4) {
      // Matrix rain (very subtle)
      if (matrixCols.length > 0 && bgFrame % 3 === 0) {
        ctx.globalAlpha = 0.07;
        ctx.fillStyle = '#00FF44';
        ctx.font = '8px monospace';
        matrixCols.forEach((col, i) => {
          col.y += col.speed;
          if (col.y > VH) col.y = 0;
          ctx.fillText(col.chars[Math.floor(col.y / 8) % col.chars.length], i * 8, col.y | 0);
        });
        ctx.globalAlpha = 1;
      }
    } else if (level.id === 3) {
      // City background buildings (parallax)
      if (worldBgData) {
        for (const b of worldBgData.buildings) {
          const bx = b.x - camX * 0.4;
          if (bx > -b.w - 10 && bx < VW + 10) {
            Spr.drawBuilding(ctx, bx | 0, b.y, b.w, b.h, b.color, b.win);
          }
        }
      }
    } else if (level.id === 1) {
      // House wallpaper pattern
      ctx.globalAlpha = 0.06;
      ctx.fillStyle = '#885533';
      const wallOff = (camX * 0.3) % 20;
      for (let wx = -wallOff; wx < VW; wx += 20) {
        for (let wy = HUD_H; wy < GROUND_Y; wy += 20) {
          ctx.fillRect(wx, wy, 8, 8);
        }
      }
      ctx.globalAlpha = 1;

      // Background decor (windows, bookcases)
      if (worldBgData) {
        for (const d of worldBgData.decor) {
          const dx = d.x - camX * 0.5;
          if (dx > -40 && dx < VW + 40) {
            if (d.type === 'window') Spr.drawWindow(ctx, dx | 0, d.y);
            else if (d.type === 'bookcase') Spr.drawBookcase(ctx, dx | 0, d.y);
          }
        }
      }
    } else if (level.id === 2) {
      // School blackboard background
      if (worldBgData) {
        for (const d of worldBgData.decor) {
          const dx = d.x - camX * 0.5;
          if (dx > -80 && dx < VW + 80) {
            ctx.fillStyle = '#2A4028';
            ctx.fillRect(dx | 0, d.y, 120, 55);
            ctx.fillStyle = '#365034';
            ctx.fillRect((dx + 2) | 0, d.y + 2, 116, 51);
            // Chalk text (squiggles)
            ctx.fillStyle = 'rgba(255,255,255,0.3)';
            ctx.font = '5px monospace';
            ctx.fillText('2+2=4  E=mc²', (dx + 5) | 0, d.y + 20);
            ctx.fillText('Luka + Jaco', (dx + 5) | 0, d.y + 35);
          }
        }
      }
    }
  }

  function drawGround(ctx, level, camX) {
    const wp = WP[level.id] || WP[1];

    for (const g of level.grounds) {
      const gx = g.x - camX;
      if (gx + g.w < 0 || gx > VW) continue;

      // Ground fill
      ctx.fillStyle = wp.floor;
      ctx.fillRect(gx | 0, g.y, g.w, g.h);

      // Ground top edge
      ctx.fillStyle = wp.accent;
      ctx.fillRect(gx | 0, g.y, g.w, 2);

      // Ground texture
      if (level.id === 1) {
        ctx.fillStyle = '#6B4C10';
        for (let bx = Math.max(0, gx) - (gx % 24); bx < gx + g.w && bx < VW; bx += 24) {
          ctx.fillRect(bx | 0, g.y, 1, g.h);
        }
      } else if (level.id === 3) {
        ctx.fillStyle = '#383838';
        for (let bx = Math.max(0, gx); bx < gx + g.w && bx < VW; bx += 8) {
          ctx.fillRect(bx | 0, g.y, 4, 2);
        }
      } else if (level.id === 4) {
        ctx.fillStyle = '#002266';
        for (let bx = Math.max(0, gx); bx < gx + g.w && bx < VW; bx += 12) {
          ctx.fillRect(bx | 0, g.y, 8, 2);
        }
      }
    }
  }

  function drawPlatform(ctx, p, camX, lvId) {
    const px = p.x - camX | 0;
    if (px + p.w < 0 || px > VW) return;

    const wp = WP[lvId] || WP[1];

    switch (p.type) {
      case PLT.SOFA:
        // Brown sofa
        ctx.fillStyle = '#8B5E3C';
        ctx.fillRect(px, p.y, p.w, p.h);
        ctx.fillStyle = '#A0714F';
        ctx.fillRect(px, p.y, p.w, 3);
        ctx.fillStyle = '#6B4423';
        ctx.fillRect(px, p.y + p.h - 3, p.w, 3);
        // Cushions
        ctx.fillStyle = '#CC9955';
        for (let i = 4; i < p.w - 4; i += 24) {
          ctx.fillRect(px + i, p.y - 5, Math.min(20, p.w - i - 4), 5);
        }
        ctx.fillStyle = '#AA7733';
        for (let i = 4; i < p.w - 4; i += 24) {
          ctx.fillRect(px + i + 8, p.y - 3, 4, 2);
        }
        // Arms
        ctx.fillStyle = '#7A4A1E';
        ctx.fillRect(px, p.y - 8, 6, p.h + 8);
        ctx.fillRect(px + p.w - 6, p.y - 8, 6, p.h + 8);
        break;

      case PLT.TABLE:
        ctx.fillStyle = '#8B6914';
        ctx.fillRect(px, p.y, p.w, p.h);
        ctx.fillStyle = '#A07820';
        ctx.fillRect(px, p.y, p.w, 2);
        ctx.fillStyle = '#6B5010';
        ctx.fillRect(px + 4, p.y + p.h, 4, 12);
        ctx.fillRect(px + p.w - 8, p.y + p.h, 4, 12);
        break;

      case PLT.SHELF:
        ctx.fillStyle = '#5D3E0A';
        ctx.fillRect(px, p.y, p.w, p.h);
        ctx.fillStyle = '#8B6014';
        ctx.fillRect(px, p.y, p.w, 2);
        // Books on shelf
        const bookColors = ['#CC3333','#3366CC','#44AA44','#AA4444','#8844AA'];
        for (let i = 2; i < p.w - 4; i += 7) {
          ctx.fillStyle = bookColors[Math.floor(i / 7) % bookColors.length];
          ctx.fillRect(px + i, p.y - 10, 5, 10);
        }
        break;

      case PLT.DESK:
        ctx.fillStyle = '#8B7355';
        ctx.fillRect(px, p.y, p.w, p.h);
        ctx.fillStyle = '#A08060';
        ctx.fillRect(px, p.y, p.w, 2);
        ctx.fillStyle = '#6B5035';
        ctx.fillRect(px + 4, p.y + p.h, 4, 15);
        ctx.fillRect(px + p.w - 8, p.y + p.h, 4, 15);
        // Pencil
        ctx.fillStyle = '#FFDD44';
        ctx.fillRect(px + p.w - 18, p.y - 12, 2, 12);
        ctx.fillStyle = '#FF9933';
        ctx.fillRect(px + p.w - 18, p.y - 14, 2, 2);
        break;

      case PLT.BOOK:
        ctx.fillStyle = '#4455AA';
        ctx.fillRect(px, p.y, p.w, p.h);
        ctx.fillStyle = '#6677CC';
        ctx.fillRect(px, p.y, p.w, 2);
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '5px monospace';
        ctx.fillText('Libro', px + 2, p.y + 6);
        break;

      case PLT.BUILDING:
        ctx.fillStyle = '#445566';
        ctx.fillRect(px, p.y, p.w, p.h);
        ctx.fillStyle = '#556677';
        ctx.fillRect(px, p.y, p.w, 2);
        // Ledge
        ctx.fillStyle = '#667788';
        ctx.fillRect(px - 2, p.y, p.w + 4, 3);
        break;

      case PLT.FIREESCAPE:
        ctx.fillStyle = '#AA8844';
        ctx.fillRect(px, p.y, p.w, p.h);
        ctx.fillStyle = '#886622';
        // Grating lines
        for (let i = 0; i < p.w; i += 6) {
          ctx.fillRect(px + i, p.y + 2, 2, p.h - 2);
        }
        break;

      case PLT.DIGITAL:
        Spr.drawDigitalPlatform(ctx, px, p.y, p.w, bgFrame);
        break;

      case PLT.ASTEROID:
        Spr.drawAsteroid(ctx, px, p.y, p.w, p.h);
        break;

      case PLT.STATION:
        ctx.fillStyle = '#334455';
        ctx.fillRect(px, p.y, p.w, p.h);
        ctx.fillStyle = '#445566';
        ctx.fillRect(px, p.y, p.w, 3);
        // Solar panels
        ctx.fillStyle = '#1A3366';
        ctx.fillRect(px - 8, p.y + 2, 8, p.h - 4);
        ctx.fillRect(px + p.w, p.y + 2, 8, p.h - 4);
        ctx.fillStyle = '#2244AA';
        ctx.fillRect(px - 7, p.y + 3, 6, p.h - 6);
        ctx.fillRect(px + p.w + 1, p.y + 3, 6, p.h - 6);
        break;

      default:
        ctx.fillStyle = wp.plat;
        ctx.fillRect(px, p.y, p.w, p.h);
        ctx.fillStyle = wp.accent;
        ctx.fillRect(px, p.y, p.w, 2);
    }
  }

  // ─── MAIN DRAW ────────────────────────────────────────────
  function draw() {
    ctx.clearRect(0, 0, VW, VH);

    switch (state) {
      case ST.LOADING:
        ctx.fillStyle = '#000020';
        ctx.fillRect(0, 0, VW, VH);
        break;

      case ST.MENU:
        UI.drawMainMenu(ctx, saveData);
        if (easterEggTimer > 0) UI.drawEasterEggNotif(ctx);
        break;

      case ST.CONTROLS:
        UI.drawControls(ctx);
        break;

      case ST.ACHIEVE:
        UI.drawAchievements(ctx, saveData);
        break;

      case ST.CREDITS:
        UI.drawCredits(ctx);
        break;

      case ST.WORLDINTRO:
        if (currentLevel) {
          drawBackground(ctx, currentLevel, 0);
          drawGround(ctx, currentLevel, 0);
        }
        UI.drawWorldIntro(ctx, currentLevel || {name:'Mundo 1',subtitle:''}, introTimer);
        break;

      case ST.PLAYING:
      case ST.PAUSED: {
        if (!currentLevel) break;

        // Background
        drawBackground(ctx, currentLevel, camX);

        // Platforms
        for (const p of currentLevel.platforms) {
          drawPlatform(ctx, p, camX, currentLevel.id);
        }

        // Checkpoints
        for (const cp of (currentLevel.checkpoints || [])) {
          Spr.drawCheckpoint(ctx, cp.x - camX, cp.y, cp._activated, bgFrame);
        }

        // Goal
        const end = currentLevel.end;
        if (end) Spr.drawGoal(ctx, end.x - camX, end.y, bgFrame);

        // Ground
        drawGround(ctx, currentLevel, camX);

        // Collectibles
        for (const c of collectibles) {
          if (c.collected) continue;
          if (c.type === CT.TUNA)   Spr.drawTuna(ctx, c.x - camX, c.y, bgFrame);
          else if (c.type === CT.COIN) Spr.drawCoin(ctx, c.x - camX, c.y, bgFrame);
          else if (c.type === CT.HEART) Spr.drawHeart(ctx, c.x - camX, c.y, bgFrame);
        }

        // Power-ups
        for (const pu of powerups) {
          if (!pu.collected) Spr.drawPowerup(ctx, pu.x - camX, pu.y, pu.type, bgFrame);
        }

        // Enemies
        for (const e of enemies) {
          e.draw(ctx, camX);
        }

        // Boss
        if (boss && !boss.defeated) boss.draw(ctx, camX);

        // Player
        if (player) player.draw(ctx, camX);

        // Particles
        Particles.draw(ctx, camX);

        // HUD
        UI.drawHUD(
          ctx, lives, tuna,
          currentLevelId,
          currentLevel.name + ': ' + currentLevel.subtitle,
          (player ? player.x / currentLevel.width : 0),
          saveData,
          player && player.shieldTimer > 0,
          player && player.speedBoostTimer > 0,
          saveData.hasDoubleJump
        );

        // Hard mode banner
        if (saveData.hardMode) UI.drawHardModeBanner(ctx);

        // Achievement notification
        Achievements.draw(ctx);

        if (state === ST.PAUSED) UI.drawPause(ctx);

        // Easter egg hint in world
        if (state === ST.PLAYING && !saveData.easterEggFound) {
          const hintX = (currentLevel.width * 0.9) - camX;
          if (hintX > 0 && hintX < VW) {
            ctx.globalAlpha = 0.3;
            ctx.fillStyle = '#FFD700';
            ctx.font = '5px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('?', hintX | 0, 100);
            ctx.textAlign = 'left';
            ctx.globalAlpha = 1;
          }
        }
        break;
      }

      case ST.GAMEOVER:
        UI.drawGameOver(ctx, (saveData.totalTuna || 0) + tuna);
        break;

      case ST.VICTORY: {
        if (currentLevelId === 6) {
          UI.drawVictory(ctx, (saveData.totalTuna || 0) + tuna, victoryTimer);
        } else {
          if (currentLevel) {
            drawBackground(ctx, currentLevel, camX);
            for (const p of currentLevel.platforms) drawPlatform(ctx, p, camX, currentLevel.id);
            drawGround(ctx, currentLevel, camX);
            if (player) player.draw(ctx, camX);
            Particles.draw(ctx, camX);
          }
          UI.drawLevelComplete(ctx, currentLevel ? currentLevel.name + ' - ' + currentLevel.subtitle : '', tuna, completeTimer);
        }
        Achievements.draw(ctx);
        break;
      }
    }

    // Transition overlay
    if (transAlpha > 0) UI.drawTransition(ctx, transAlpha);
  }

  // ─── GAME LOOP ────────────────────────────────────────────
  function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
  }

  // ─── KEY EVENT (for Konami) ────────────────────────────────
  function _onKeyDown(e) {
    checkKonami(e.code);
  }

  function start() {
    window.addEventListener('keydown', _onKeyDown);
    requestAnimationFrame(loop);
  }

  return { init, start };
})();
