'use strict';

const Achievements = (() => {
  const defs = [
    { id: ACH.FIRST_TUNA,  name: '¡Primer Atún!',      desc: 'Recoge tu primer atún',              icon: '🐟' },
    { id: ACH.TUNA_10,     name: 'Pescador Junior',     desc: 'Recoge 10 atunes en total',          icon: '🎣' },
    { id: ACH.TUNA_50,     name: 'Rey del Atún',        desc: 'Recoge 50 atunes en total',          icon: '👑' },
    { id: ACH.FIRST_DEATH, name: 'Primera Caída',       desc: 'Pierde una vida por primera vez',    icon: '💀' },
    { id: ACH.NO_DAMAGE_1, name: 'Intocable',           desc: 'Completa un mundo sin daño',         icon: '🛡️' },
    { id: ACH.BEAT_BOSS,   name: '¡KERNEL Derrotado!',  desc: 'Derrota al jefe final KERNEL-X',     icon: '🤖' },
    { id: ACH.ALL_WORLDS,  name: 'Explorador Total',    desc: 'Completa los 5 mundos',              icon: '🌍' },
    { id: ACH.SPEED_RUN,   name: 'Velocidad Máxima',    desc: 'Recoge el power-up de velocidad',    icon: '⚡' },
    { id: ACH.PACIFIST,    name: 'Diplomático',         desc: 'Completa un nivel sin matar enemigos', icon: '✌️' },
    { id: ACH.COLLECTOR,   name: 'Coleccionista',       desc: 'Recoge todos los coins de un nivel', icon: '💰' },
  ];

  // Pending notification queue
  const queue = [];
  let notifTimer = 0;
  let current = null;

  function unlock(id, saveData) {
    if (saveData.achievements[id]) return false;
    saveData.achievements[id] = true;
    const def = defs.find(d => d.id === id);
    if (def) queue.push(def);
    Audio.sfx.achievement();
    return true;
  }

  function checkAll(gameState, saveData) {
    const tuna = gameState.totalTuna;
    const lvl  = gameState.currentLevelId;
    const ach  = saveData.achievements;

    if (tuna >= 1  && !ach[ACH.FIRST_TUNA])  unlock(ACH.FIRST_TUNA,  saveData);
    if (tuna >= 10 && !ach[ACH.TUNA_10])     unlock(ACH.TUNA_10,     saveData);
    if (tuna >= 50 && !ach[ACH.TUNA_50])     unlock(ACH.TUNA_50,     saveData);
    if (gameState.speedBoostCollected && !ach[ACH.SPEED_RUN]) unlock(ACH.SPEED_RUN, saveData);
  }

  function update() {
    if (notifTimer > 0) {
      notifTimer--;
      if (notifTimer === 0) current = null;
    }
    if (!current && queue.length > 0) {
      current = queue.shift();
      notifTimer = 180;
    }
  }

  function draw(ctx) {
    if (!current || notifTimer <= 0) return;

    const alpha = notifTimer > 150 ? (180 - notifTimer) / 30
                : notifTimer < 30   ? notifTimer / 30
                : 1;

    ctx.globalAlpha = alpha;
    const bx = VW - 185;
    const by = HUD_H + 4;

    ctx.fillStyle = 'rgba(0,0,0,0.85)';
    ctx.fillRect(bx, by, 180, 36);
    ctx.strokeStyle = COL.GOLD;
    ctx.lineWidth = 1;
    ctx.strokeRect(bx, by, 180, 36);

    ctx.fillStyle = COL.GOLD;
    ctx.font = 'bold 7px monospace';
    ctx.fillText('¡LOGRO DESBLOQUEADO!', bx + 6, by + 10);

    ctx.fillStyle = COL.WHITE;
    ctx.font = '6px monospace';
    ctx.fillText(current.name, bx + 6, by + 22);
    ctx.fillStyle = '#AAAAAA';
    ctx.fillText(current.desc, bx + 6, by + 31);

    ctx.globalAlpha = 1;
  }

  function getAll() { return defs; }
  function isUnlocked(id, saveData) { return !!saveData.achievements[id]; }
  function count(saveData) { return Object.keys(saveData.achievements).length; }

  return { unlock, checkAll, update, draw, getAll, isUnlocked, count };
})();
