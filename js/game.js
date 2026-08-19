'use strict';

// GAME
// Owns the loop, the state machine and the live level. Everything else
// (levels, enemies, bosses, UI, progress) lives in its own module and is
// wired together here.

const GS = {
  LOADING: 'loading', MENU: 'menu', MAP: 'map', INTRO: 'intro',
  PLAY: 'play', PAUSE: 'pause', DEAD: 'dead', CLEAR: 'clear',
  GAMEOVER: 'gameover', VICTORY: 'victory',
  CONTROLS: 'controls', ACHIEVE: 'achieve', STATS: 'stats', CREDITS: 'credits',
};

const Game = (() => {
  let canvas, ctx;
  let state = GS.LOADING;
  let frame = 0;
  let lastTime = 0, accumulator = 0;
  const STEP = 1000 / 60;

  // Live level state
  let level = null;
  let player = null;
  let boss = null;
  let camera = new Camera();
  let enemies = [];
  let shots = [];          // pooled projectiles
  let collectibles = [];
  let powerups = [];
  let checkpoints = [];
  let secrets = [];

  let spawnX = 0, spawnY = 0;
  let levelTime = 0;
  let levelCoins = 0;
  let levelNoDamage = true;
  let runCoins = 0;
  let clearedViaSecret = false;
  let secretTarget = null;

  let introTimer = 0;
  let clearTimer = 0;
  let overTimer = 0;
  let victoryTimer = 0;
  let deadTimer = 0;

  // Transition
  let fade = 0, fadeDir = 0, fadeCb = null;

  // Konami
  let konami = [];
  const KONAMI = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown',
                  'ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','KeyB','KeyA'];

  // INIT
  function init() {
    canvas = document.getElementById('game-canvas');
    ctx = canvas.getContext('2d', { alpha: false });
    canvas.width = VW; canvas.height = VH;
    ctx.imageSmoothingEnabled = false;

    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('keydown', onKeyDown);

    Audio.init();
    Screens.initStars();
    Progress.load();
    Achieve.check();

    runLoadingBar();
  }

  function resize() {
    // Integer scaling keeps every pixel square; fall back to fractional only
    // when the window is smaller than one whole pixel-doubling.
    const sx = window.innerWidth / VW;
    const sy = window.innerHeight / VH;
    let s = Math.min(sx, sy);
    if (s >= 1) s = Math.floor(s);
    canvas.style.width  = Math.round(VW * s) + 'px';
    canvas.style.height = Math.round(VH * s) + 'px';
    ctx.imageSmoothingEnabled = false;
  }

  function runLoadingBar() {
    const fill = document.querySelector('.loading-fill');
    let pct = 0;
    const iv = setInterval(() => {
      pct = Math.min(100, pct + 12 + Math.random() * 16);
      if (fill) fill.style.width = pct + '%';
      if (pct >= 100) {
        clearInterval(iv);
        setTimeout(() => {
          const ls = document.getElementById('loading-screen');
          if (ls) { ls.classList.add('hidden'); setTimeout(() => ls.style.display = 'none', 500); }
          state = GS.MENU;
          Audio.playMusic('menu');
        }, 260);
      }
    }, 90);
  }

  function onKeyDown(e) {
    konami.push(e.code);
    if (konami.length > 10) konami.shift();
    if (konami.join() === KONAMI.join()) {
      const d = Progress.get();
      d.hardUnlocked = true;
      d.hardMode = !d.hardMode;
      Progress.save();
      Audio.sfx.easterEgg();
      Achieve.check();
      konami = [];
    }
  }

  // TRANSITIONS
  function transition(cb) { fadeDir = 1; fadeCb = cb; }

  function updateFade() {
    if (fadeDir === 1) {
      fade += 0.075;
      if (fade >= 1) { fade = 1; fadeDir = -1; if (fadeCb) { fadeCb(); fadeCb = null; } }
    } else if (fadeDir === -1) {
      fade -= 0.06;
      if (fade <= 0) { fade = 0; fadeDir = 0; }
    }
  }

  // LEVEL LOADING
  function loadLevel(levelId, fromCheckpoint) {
    const src = LevelCache.get(levelId, { hasDoubleJump: Progress.hasPowerup('djump') });
    if (!src) return false;

    // Deep-ish clone of the mutable bits: the cached level is a template and
    // must not accumulate crumbled platforms or collected coins between runs.
    level = Object.assign({}, src);
    level.platforms = src.platforms.map(p => Object.assign({}, p));
    level.zones     = src.zones.map(z => Object.assign({}, z));
    level.grounds   = src.grounds;
    level.hazards   = src.hazards;

    collectibles = src.collectibles.map(c => Object.assign({ taken: false }, c));
    powerups     = src.powerups.map(p => Object.assign({ taken: false }, p));
    checkpoints  = src.checkpoints.map(c => Object.assign({ on: false }, c));
    secrets      = src.secrets.map(s => Object.assign({}, s));

    enemies = src.enemies.map(spec => new GameEnemy(spec, level));
    shots.length = 0;

    boss = src.isBoss ? new GameBoss(src.bossId, level, Progress.get().hardMode) : null;

    if (!fromCheckpoint) {
      spawnX = src.spawn.x; spawnY = src.spawn.y;
      levelTime = 0;
      levelCoins = 0;
      levelNoDamage = true;
      runCoins = 0;
      Progress.noteAttempt(levelId);
    }

    player = new Luka(spawnX, spawnY);
    camera.reset(0, 0, level.width, level.height);
    camera.snapTo(player);

    clearedViaSecret = false;
    secretTarget = null;

    Particles.clear();
    Themes.initAmbient(level);
    Audio.playMusic(level.music);
    return true;
  }

  function startLevel(levelId) {
    transition(() => {
      spawnX = -1;
      if (loadLevel(levelId, false)) {
        state = GS.INTRO;
        introTimer = 130;
      } else {
        state = GS.MAP;
      }
    });
  }

  // ENEMY / BOSS CONTEXT
  function makeCtx() {
    return {
      level, player,
      shake: (n) => camera.addShake(n),
      fire: (x, y, vx, vy, color, size, opts) => spawnShot(x, y, vx, vy, color, size, 'enemy', opts),
      explode: (e, radius) => {
        Particles.emitExplosion(e.x + e.w / 2, e.y + e.h / 2);
        Audio.sfx.explosion();
        camera.addShake(10);
        const cx = e.x + e.w / 2, cy = e.y + e.h / 2;
        if (dist2(cx, cy, player.cx, player.cy) < radius * radius) hurtPlayer(cx);
      },
      summon: (type, x, y) => {
        if (enemies.length > 40) return;
        enemies.push(new GameEnemy({
          type, x, y, px: Math.max(10, x - 60), py: Math.min(level.width - 30, x + 60), baseY: y,
        }, level));
      },
      split: (e) => {
        for (let i = 0; i < (e.def.splits || 2); i++) {
          enemies.push(new GameEnemy({
            type: 'splitterling',
            x: e.x + i * 12 - 6, y: e.y,
            px: Math.max(6, e.px - 20), py: Math.min(level.width - 20, e.py + 20),
            baseY: e.y,
          }, level));
        }
      },
      playerShot: (x, y, vx, vy) => spawnShot(x, y, vx, vy, '#FF7A29', 4, 'player'),
    };
  }

  // Projectile pool
  function spawnShot(x, y, vx, vy, color, size, owner, opts) {
    let s = null;
    for (const p of shots) if (!p.alive) { s = p; break; }
    if (!s) {
      if (shots.length > 90) return;
      s = {}; shots.push(s);
    }
    s.x = x; s.y = y; s.vx = vx; s.vy = vy;
    s.color = color; s.size = size; s.owner = owner;
    s.alive = true; s.age = 0;
    s.homing = (opts && opts.homing) || 0;
  }

  function updateShots() {
    for (const s of shots) {
      if (!s.alive) continue;
      if (s.homing) {
        const dx = player.cx - s.x, dy = player.cy - s.y;
        const d = Math.hypot(dx, dy) || 1;
        s.vx += (dx / d) * s.homing;
        s.vy += (dy / d) * s.homing;
        const sp = Math.hypot(s.vx, s.vy);
        if (sp > 3) { s.vx = s.vx / sp * 3; s.vy = s.vy / sp * 3; }
      } else if (s.owner === 'enemy') {
        s.vy += 0.028;
      }
      s.x += s.vx; s.y += s.vy;
      s.age++;

      if (s.age > 340 || s.x < -40 || s.x > level.width + 40 || s.y > level.height + 40 || s.y < -60) {
        s.alive = false; continue;
      }

      const box = { x: s.x - s.size / 2, y: s.y - s.size / 2, w: s.size, h: s.size };

      if (s.owner === 'enemy') {
        if (aabb(box, player.bounds)) { s.alive = false; hurtPlayer(s.x); }
      } else {
        // Player shots hurt enemies and the boss.
        for (const e of enemies) {
          if (!e.alive) continue;
          if (aabb(box, e.bounds)) {
            s.alive = false;
            e.damage(1, makeCtx());
            break;
          }
        }
        if (s.alive && boss && !boss.dying && aabb(box, { x: boss.x, y: boss.y, w: boss.w, h: boss.h })) {
          s.alive = false;
          boss.damage(Progress.get().hardMode ? 3 : 5);
        }
      }
    }
  }

  // PLATFORM BEHAVIOURS
  function updatePlatforms() {
    for (const p of level.platforms) {
      p.dx = 0; p.dy = 0;

      if (p.moving) {
        const prevX = p.rx !== undefined ? p.rx : p.x;
        const prevY = p.ry !== undefined ? p.ry : p.y;
        const t = (frame * 0.014 * p.speed) + (p.phase || 0);
        const k = (Math.sin(t) + 1) / 2;
        if (p.axis === 'y') {
          p.ry = lerp(p.from, p.to, k);
          p.rx = p.x;
        } else {
          p.rx = lerp(p.from, p.to, k);
          p.ry = p.y;
        }
        p.dx = p.rx - prevX;
        p.dy = p.ry - prevY;
      }

      if (p.phase) {
        const t = (frame + (p.offset || 0)) % (p.period || 150);
        p.phaseOn = t < (p.period || 150) * 0.6;
      }

      if (p.crumble && p.crumbleLeft !== undefined && !p.gone) {
        p.crumbleLeft--;
        if (p.crumbleLeft <= 0) {
          p.gone = true;
          p.respawn = 150;
          Particles.emit(p.x + p.w / 2, p.y + 4, {
            count: 10, color: ['#8A6A4A', '#5A4430'], speed: 2, life: 30, gravity: 0.3,
          });
          Audio.sfx.land();
        }
      }
      if (p.gone && p.respawn !== undefined) {
        if (--p.respawn <= 0) {
          p.gone = false;
          p.crumbleLeft = undefined;
          p.respawn = undefined;
        }
      }
    }
  }

  // GAMEPLAY UPDATE
  function updatePlay() {
    levelTime++;
    const c = makeCtx();

    updatePlatforms();
    player.update(level, c);
    updateShots();

    // Enemies
    for (const e of enemies) {
      if (!e.alive) continue;
      e.update(level, player, c);
      if (!e.alive) continue;
      if (!e.dangerous) continue;

      if (aabb(e.bounds, player.bounds)) {
        const stomping = player.vy > 0 && player.gravityDir > 0 &&
                         player.y + PH < e.y + e.h * 0.6 &&
                         player.y + PH > e.y - 8;

        if (stomping && e.canStomp()) {
          e.damage(99, c);
          player.bounce(-5.6);
          runCoins += 2;
          camera.addShake(3);
        } else if (player.grants('smash')) {
          // Titan Core smashes anything, armour included.
          e.damage(99, c);
          camera.addShake(5);
        } else if (player.grants('freeze')) {
          // Frost Core: touching an enemy locks it in place instead of hurting you.
          e.frozen = 180;
          Particles.emit(e.x + e.w / 2, e.y + e.h / 2, {
            count: 8, color: ['#5FC8F5', '#DCEFFA', '#FFFFFF'],
            speed: 2, life: 24, gravity: 0.05,
          });
        } else if (e.def.shielded && Math.sign(player.x - e.x) === e.shieldSide) {
          // Blocked by the shield — bounce off, no damage.
          player.vx = Math.sign(player.x - e.x) * 2.4;
          Audio.sfx.shieldHit();
        } else {
          hurtPlayer(e.x);
        }
      }
    }
    // Compact the enemy list occasionally instead of every frame.
    if (frame % 120 === 0) enemies = enemies.filter(e => e.alive);

    // Boss
    if (boss) {
      const stomped = boss.isStompedBy(player) && player.invul <= 0;
      if (stomped) {
        boss.damage(Progress.get().hardMode ? 6 : 10);
        player.bounce(-6.4);
        player.invul = Math.max(player.invul, 26);
        camera.addShake(6);
      }
      const res = boss.update(c);
      if (!stomped && res === 'damage') hurtPlayer(boss.x + boss.w / 2);

      if (boss.defeated) { onBossDefeated(); return; }
    }

    // Hazards
    for (const hz of level.hazards) {
      if (aabb(hz, player.bounds)) {
        if (hz.kind === 'lava' || hz.kind === 'spike') hurtPlayer(player.x);
        break;
      }
    }

    // Collectibles
    for (const col of collectibles) {
      if (col.taken) continue;
      if (aabb({ x: col.x, y: col.y, w: 10, h: 10 }, player.bounds)) {
        col.taken = true;
        if (col.type === CT.COIN) {
          levelCoins++; runCoins += 5;
          Audio.sfx.coin(); Particles.emitCoin(col.x, col.y);
        } else if (col.type === CT.HEART) {
          const d = Progress.get();
          d.lives = Math.min(9, d.lives + 1);
          Audio.sfx.heart(); Particles.emitHeart(col.x, col.y);
        } else {
          runCoins++;
          Audio.sfx.tuna(); Particles.emitTuna(col.x, col.y);
        }
      }
    }

    // Power-ups
    for (const pu of powerups) {
      if (pu.taken) continue;
      if (aabb({ x: pu.x, y: pu.y, w: 12, h: 12 }, player.bounds)) {
        pu.taken = true;
        player.giveCore(pu.type);
        Audio.sfx.powerup();
        Particles.emitPowerup(pu.x, pu.y);
        camera.addShake(4);
      }
    }

    // Checkpoints
    for (const cp of checkpoints) {
      if (cp.on) continue;
      if (Math.abs(player.cx - cp.x) < 16 && Math.abs(player.y - cp.y) < 44) {
        cp.on = true;
        spawnX = cp.x - PW / 2; spawnY = cp.y - 4;
        Audio.sfx.checkpoint();
        Particles.emitCheckpoint(cp.x, cp.y);
      }
    }

    // Zones: switches and gates
    for (const z of level.zones) {
      if (z.kind === 'switch' && !z.on && aabb(z, player.bounds)) {
        z.on = true;
        Audio.sfx.checkpoint();
        Particles.emitStar(z.x, z.y);
        for (const g of level.zones) if (g.kind === 'gate' && g.key === z.key) g.open = true;
      }
      if (z.kind === 'gate' && !z.open) {
        // A closed gate is a solid wall.
        const b = player.bounds;
        if (aabb(z, b)) {
          if (player.vx > 0) player.x = z.x - PW;
          else if (player.vx < 0) player.x = z.x + z.w;
          player.vx = 0;
        }
      }
    }

    // Secret exits
    for (const s of secrets) {
      if (aabb(s, player.bounds)) {
        clearedViaSecret = true;
        secretTarget = s.leadsTo;
        onLevelClear();
        return;
      }
    }

    // Normal exit
    if (level.exit &&
        aabb({ x: level.exit.x, y: level.exit.y, w: 24, h: 34 }, player.bounds)) {
      onLevelClear();
      return;
    }

    // Death
    // Falling out of the level costs a life just like taking a hit does;
    // the damage path already deducted one, this branch handles the pit.
    if (player.y > level.height + 40 && !player.dead) {
      const d = Progress.get();
      d.lives--;
      Progress.save();
      levelNoDamage = false;
      player.kill();
    }
    if (player.dead && ++deadTimer > 60) {
      onPlayerDeath();
      return;
    }

    camera.update(player);
    Particles.update();
    Achieve.update();
  }

  function hurtPlayer(fromX) {
    if (!player.hurt(fromX)) return;
    levelNoDamage = false;
    camera.addShake(8);
    const d = Progress.get();
    d.lives--;
    Progress.save();
    if (d.lives <= 0) player.kill();
  }

  function onPlayerDeath() {
    deadTimer = 0;
    Progress.noteDeath(level.id);
    const d = Progress.get();

    if (d.lives <= 0) {
      Audio.sfx.gameOver();
      Audio.stopMusic();
      state = GS.GAMEOVER;
      overTimer = 0;
      d.lives = START_LIVES;   // refill for the next attempt
      Progress.save();
      return;
    }
    // Respawn at the last checkpoint.
    transition(() => {
      loadLevel(level.id, true);
      state = GS.PLAY;
    });
  }

  function onLevelClear() {
    Audio.sfx.levelComplete();
    Audio.stopMusic();
    state = GS.CLEAR;
    clearTimer = 0;

    const allCoins = level.totalCoins > 0 && levelCoins >= level.totalCoins;
    const res = Progress.complete(level.id, {
      time: levelTime,
      coins: runCoins,
      allCoins,
      noDamage: levelNoDamage,
      secretExit: clearedViaSecret,
      secretTarget,
      tokens: (allCoins && levelNoDamage) ? 1 : 0,
    });
    Progress.get().lives = Math.max(Progress.get().lives, 1);
    Achieve.check();
    lastClear = res;
  }
  let lastClear = null;

  function onBossDefeated() {
    Audio.stopMusic();
    const isFinal = level.world === WORLDS.length && archetypeFor(level.levelNum) === 'boss';
    Progress.complete(level.id, {
      time: levelTime, coins: runCoins, allCoins: true,
      noDamage: levelNoDamage, secretExit: false, secretTarget: null,
      tokens: 1,
    });
    Achieve.check();

    if (isFinal) {
      state = GS.VICTORY;
      victoryTimer = 0;
      Audio.playMusic('menu');
    } else {
      Audio.sfx.levelComplete();
      state = GS.CLEAR;
      clearTimer = 0;
    }
  }

  // STATE MACHINE
  function update() {
    frame++;
    updateFade();
    if (fadeDir === 1) { Input.clear(); return; }   // freeze during fade-out

    switch (state) {
      case GS.MENU: updateMenu(); break;

      case GS.MAP: {
        WorldMap.update();
        if (Input.pressed('KeyQ')) WorldMap.changeWorld(-1);
        if (Input.pressed('KeyE')) WorldMap.changeWorld(1);
        if (Input.CONFIRM() && WorldMap.selectedUnlocked && WorldMap.isSettled()) {
          Audio.sfx.menuConfirm();
          startLevel(WorldMap.selectedId);
        }
        if (Input.BACK()) {
          transition(() => { state = GS.MENU; Screens.resetMenu(); Audio.playMusic('menu'); });
        }
        break;
      }

      case GS.INTRO:
        if (--introTimer <= 0 || Input.CONFIRM()) state = GS.PLAY;
        break;

      case GS.PLAY:
        if (Input.PAUSE()) { state = GS.PAUSE; Screens.resetPause(); break; }
        updatePlay();
        break;

      case GS.PAUSE: updatePause(); break;

      case GS.CLEAR: {
        clearTimer++;
        Particles.update();
        Achieve.update();
        if (clearTimer > 90 && Input.CONFIRM()) {
          transition(() => {
            WorldMap.init(level.world, level.id);
            state = GS.MAP;
            Audio.playMusic('map');
          });
        }
        break;
      }

      case GS.GAMEOVER: {
        overTimer++;
        if (overTimer > 40) {
          if (Input.CONFIRM()) {
            transition(() => {
              WorldMap.init(level.world, level.id);
              state = GS.MAP;
              Audio.playMusic('map');
            });
          } else if (Input.BACK()) {
            transition(() => { state = GS.MENU; Screens.resetMenu(); Audio.playMusic('menu'); });
          }
        }
        break;
      }

      case GS.VICTORY: {
        victoryTimer++;
        Particles.update();
        if (victoryTimer > 150 && Input.CONFIRM()) {
          transition(() => { state = GS.CREDITS; Screens.resetCredits(); });
        }
        break;
      }

      case GS.CONTROLS:
      case GS.STATS:
        if (Input.BACK() || Input.CONFIRM()) { state = GS.MENU; Audio.sfx.menuSelect(); }
        break;

      case GS.ACHIEVE:
        if (Input.pressed('ArrowUp')   || Input.pressed('KeyW')) Screens.achScrollBy(-1);
        if (Input.pressed('ArrowDown') || Input.pressed('KeyS')) Screens.achScrollBy(1);
        if (Input.BACK()) { state = GS.MENU; Audio.sfx.menuSelect(); }
        break;

      case GS.CREDITS:
        if (Input.BACK() || Input.CONFIRM()) { state = GS.MENU; Audio.sfx.menuSelect(); }
        break;
    }

    Input.clear();
  }

  function updateMenu() {
    if (Input.pressed('ArrowUp')   || Input.pressed('KeyW')) Screens.menuMove(-1);
    if (Input.pressed('ArrowDown') || Input.pressed('KeyS')) Screens.menuMove(1);
    if (!Input.CONFIRM()) return;

    Audio.resume();
    Audio.sfx.menuConfirm();
    const sel = Screens.menuSelection();

    switch (sel) {
      case 'CONTINUAR': {
        const d = Progress.get();
        const p = parseLevelId(d.lastLevel) || { world: 1 };
        transition(() => {
          WorldMap.init(clamp(p.world, 1, d.unlockedWorld), d.lastLevel);
          state = GS.MAP;
          Audio.playMusic('map');
        });
        break;
      }
      case 'NUEVA PARTIDA': {
        Progress.reset();
        LevelCache.clear();
        transition(() => {
          WorldMap.init(1, 'W1L01');
          state = GS.MAP;
          Audio.playMusic('map');
        });
        break;
      }
      case 'CONTROLES':     state = GS.CONTROLS; break;
      case 'LOGROS':        state = GS.ACHIEVE;  break;
      case 'ESTADÍSTICAS':  state = GS.STATS;    break;
      case 'CRÉDITOS':      state = GS.CREDITS; Screens.resetCredits(); break;
    }
  }

  function updatePause() {
    if (Input.PAUSE()) { state = GS.PLAY; return; }
    if (Input.pressed('ArrowUp')   || Input.pressed('KeyW')) Screens.pauseMove(-1);
    if (Input.pressed('ArrowDown') || Input.pressed('KeyS')) Screens.pauseMove(1);
    if (!Input.CONFIRM()) return;

    Audio.sfx.menuConfirm();
    switch (Screens.pauseSelection()) {
      case 'REANUDAR': state = GS.PLAY; break;
      case 'REINICIAR NIVEL':
        transition(() => { spawnX = -1; loadLevel(level.id, false); state = GS.PLAY; });
        break;
      case 'MAPA DEL MUNDO':
        transition(() => {
          WorldMap.init(level.world, level.id);
          state = GS.MAP; Audio.playMusic('map');
        });
        break;
      case 'MENÚ PRINCIPAL':
        transition(() => { state = GS.MENU; Screens.resetMenu(); Audio.playMusic('menu'); });
        break;
    }
  }

  // RENDER
  function draw() {
    switch (state) {
      case GS.LOADING:
        ctx.fillStyle = '#05000E'; ctx.fillRect(0, 0, VW, VH);
        break;

      case GS.MENU:     Screens.drawMenu(ctx); break;
      case GS.MAP:      WorldMap.draw(ctx); break;
      case GS.CONTROLS: Screens.drawControls(ctx); break;
      case GS.ACHIEVE:  Screens.drawAchievements(ctx); break;
      case GS.STATS:    Screens.drawStats(ctx); break;
      case GS.CREDITS:  Screens.drawCredits(ctx); break;
      case GS.GAMEOVER: Screens.drawGameOver(ctx, overTimer); break;
      case GS.VICTORY:  Screens.drawVictory(ctx, victoryTimer); break;

      case GS.INTRO:
        drawWorld();
        Screens.drawLevelIntro(ctx, level, introTimer);
        break;

      case GS.CLEAR:
        drawWorld();
        Screens.drawLevelClear(ctx, api, clearTimer);
        Achieve.draw(ctx);
        break;

      case GS.PLAY:
      case GS.PAUSE:
        drawWorld();
        Screens.drawHUD(ctx, api);
        if (boss && !boss.defeated) boss.drawHUD(ctx);
        Achieve.draw(ctx);
        if (state === GS.PAUSE) Screens.drawPause(ctx);
        break;
    }
    Screens.drawFade(ctx, fade);
  }

  function drawWorld() {
    if (!level) { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, VW, VH); return; }
    const cx = camera.rx, cy = camera.ry;

    Themes.drawSky(ctx, level);
    Themes.drawParallax(ctx, level, cx, cy, frame);

    // Platforms behind, ground in front, so ledges read cleanly.
    for (const p of level.platforms) Themes.drawPlatform(ctx, p, level, cx, cy, frame);
    Themes.drawGround(ctx, level, cx, cy);
    for (const hz of level.hazards) Themes.drawHazard(ctx, hz, cx, cy, frame);
    for (const z of level.zones)    Themes.drawZone(ctx, z, cx, cy, frame);

    // Checkpoints
    for (const cp of checkpoints) {
      Spr.drawCheckpoint(ctx, cp.x - cx - 5, cp.y - cy, cp.on, frame);
    }

    // Exit portal
    if (level.exit) Spr.drawGoal(ctx, level.exit.x - cx, level.exit.y - cy, frame);

    // Secret exits shimmer faintly — findable, not obvious.
    for (const s of secrets) {
      const a = 0.25 + Math.sin(frame * 0.07) * 0.15;
      ctx.globalAlpha = a;
      ctx.fillStyle = '#C77DFF';
      ctx.fillRect(Math.round(s.x - cx), Math.round(s.y - cy), s.w, s.h);
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#C77DFF';
      ctx.fillRect(Math.round(s.x - cx), Math.round(s.y - cy), s.w, 1);
    }

    // Pickups
    for (const c of collectibles) {
      if (c.taken) continue;
      const x = c.x - cx, y = c.y - cy;
      if (x < -16 || x > VW + 16) continue;
      if (c.type === CT.COIN)       Spr.drawCoin(ctx, x, y, frame);
      else if (c.type === CT.HEART) Spr.drawHeart(ctx, x, y, frame);
      else                          Spr.drawTuna(ctx, x, y, frame);
    }
    for (const p of powerups) {
      if (!p.taken) drawPowerupCrate(ctx, p.x - cx, p.y - cy, p.type, frame);
    }

    // Entities
    for (const e of enemies) {
      if (!e.alive) continue;
      const sx = e.x - cx;
      if (sx < -40 || sx > VW + 40) continue;   // simple culling
      drawEnemy(ctx, e, cx, cy);
    }

    if (boss) boss.draw(ctx, cx, cy);

    // Projectiles
    for (const s of shots) {
      if (!s.alive) continue;
      const pulse = 0.75 + Math.sin(s.age * 0.3) * 0.25;
      ctx.globalAlpha = pulse;
      ctx.fillStyle = s.color;
      ctx.fillRect(Math.round(s.x - cx - s.size / 2), Math.round(s.y - cy - s.size / 2), s.size, s.size);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(Math.round(s.x - cx - 1), Math.round(s.y - cy - 1), 2, 2);
      ctx.globalAlpha = 1;
    }

    if (player) player.draw(ctx, cx, cy);

    Particles.draw(ctx, cx, cy);
    Themes.drawAmbient(ctx, frame);
  }

  // LOOP
  function loop(now) {
    requestAnimationFrame(loop);
    if (!lastTime) lastTime = now;
    let dt = now - lastTime;
    lastTime = now;
    if (dt > 200) dt = STEP;          // tab was backgrounded — don't fast-forward
    accumulator += dt;

    let steps = 0;
    while (accumulator >= STEP && steps < 5) {
      update();
      accumulator -= STEP;
      steps++;
    }
    draw();
  }

  function start() { requestAnimationFrame(loop); }

  // Exposed for the UI layer (it reads live run state).
  const api = {
    init, start,
    get level() { return level; },
    get player() { return player; },
    get frame() { return frame; },
    get levelTime() { return levelTime; },
    get levelCoins() { return levelCoins; },
    get runCoins() { return runCoins; },
    get levelNoDamage() { return levelNoDamage; },
    get clearedViaSecret() { return clearedViaSecret; },
    get state() { return state; },
  };
  return api;
})();
