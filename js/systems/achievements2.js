'use strict';

// ACHIEVEMENTS
// Thirty goals spanning progression, mastery and curiosity. Each declares a
// `test` against the Progress data, so evaluation is one pass over a table.

const ACHIEVEMENTS = [
  { id: 'first_step',  name: 'Primer Paso',        desc: 'Completa tu primer nivel',
    test: s => s.completed >= 1 },
  { id: 'ten_levels',  name: 'Caminante',          desc: 'Completa 10 niveles',
    test: s => s.completed >= 10 },
  { id: 'fifty',       name: 'Veterano',           desc: 'Completa 50 niveles',
    test: s => s.completed >= 50 },
  { id: 'hundred',     name: 'Centurión',          desc: 'Completa 100 niveles',
    test: s => s.completed >= 100 },
  { id: 'all_levels',  name: 'Cartógrafo',         desc: 'Completa los 135 niveles',
    test: s => s.completed >= s.total },

  { id: 'w1_clear',    name: 'Prado Domado',       desc: 'Vence al Guardián de Piedra',
    test: (s, d) => !!d.relics[1] },
  { id: 'w2_clear',    name: 'Sed Saciada',        desc: 'Vence al Escorpión MK-II',
    test: (s, d) => !!d.relics[2] },
  { id: 'w3_clear',    name: 'Luz en la Mina',     desc: 'Vence al Gólem de Cristal',
    test: (s, d) => !!d.relics[3] },
  { id: 'w4_clear',    name: 'Bosque en Calma',    desc: 'Vence a la Flor Ancestral',
    test: (s, d) => !!d.relics[4] },
  { id: 'w5_clear',    name: 'Deshielo',           desc: 'Vence al Titán de Hielo',
    test: (s, d) => !!d.relics[5] },
  { id: 'w6_clear',    name: 'Cielo Despejado',    desc: 'Vence al Guardián Celeste',
    test: (s, d) => !!d.relics[6] },
  { id: 'w7_clear',    name: 'Máquina Detenida',   desc: 'Vence al Motor de Fundición',
    test: (s, d) => !!d.relics[7] },
  { id: 'w8_clear',    name: 'Ceniza Fría',        desc: 'Vence a Nacido de Ceniza',
    test: (s, d) => !!d.relics[8] },
  { id: 'w9_clear',    name: 'Rey Destronado',     desc: 'Vence a THE VOID KING',
    test: (s, d) => !!d.relics[9] },

  { id: 'all_relics',  name: 'Portador de Reliquias', desc: 'Consigue las 9 reliquias',
    test: s => s.relics >= s.relicTotal },
  { id: 'first_secret',name: 'Ojo Agudo',          desc: 'Encuentra una salida secreta',
    test: s => s.secrets >= 1 },
  { id: 'five_secrets',name: 'Explorador',         desc: 'Encuentra 5 salidas secretas',
    test: s => s.secrets >= 5 },
  { id: 'all_secrets', name: 'Nada Oculto',        desc: 'Encuentra todas las salidas secretas',
    test: s => s.secretsAvailable > 0 && s.secrets >= s.secretsAvailable },

  { id: 'perfect_1',   name: 'Meticuloso',         desc: 'Recoge todas las monedas de un nivel',
    test: s => s.perfectCoins >= 1 },
  { id: 'perfect_10',  name: 'Coleccionista',      desc: '10 niveles al 100% de monedas',
    test: s => s.perfectCoins >= 10 },
  { id: 'perfect_50',  name: 'Avaro',              desc: '50 niveles al 100% de monedas',
    test: s => s.perfectCoins >= 50 },

  { id: 'nodmg_1',     name: 'Intocable',          desc: 'Completa un nivel sin recibir daño',
    test: s => s.noDamage >= 1 },
  { id: 'nodmg_25',    name: 'Fantasma',           desc: '25 niveles sin recibir daño',
    test: s => s.noDamage >= 25 },

  { id: 'shards_100',  name: 'Buen Bolsillo',      desc: 'Acumula 100 fragmentos',
    test: s => s.coins >= 100 },
  { id: 'shards_1000', name: 'Fortuna',            desc: 'Acumula 1000 fragmentos',
    test: s => s.coins >= 1000 },
  { id: 'token_1',     name: 'Reliquia Menor',     desc: 'Consigue un Luka Token',
    test: s => s.tokens >= 1 },

  { id: 'deaths_50',   name: 'Persistente',        desc: 'Muere 50 veces y sigue adelante',
    test: s => s.deaths >= 50 },
  { id: 'hard_unlock', name: 'Sin Piedad',         desc: 'Desbloquea el Modo Difícil',
    test: (s, d) => !!d.hardUnlocked },
  { id: 'hard_clear',  name: 'Leyenda',            desc: 'Termina el juego en Modo Difícil',
    test: (s, d) => !!d.hardMode && !!d.relics[9] },
  { id: 'hundred_pct', name: '100%',               desc: 'Completa el juego al 100%',
    test: s => s.percent >= 100 },
];

const Achieve = (() => {
  const queue = [];
  let showing = null;
  let timer = 0;

  function check() {
    const data = Progress.get();
    const s = Progress.stats();
    let any = false;
    for (const a of ACHIEVEMENTS) {
      if (data.achievements[a.id]) continue;
      let ok = false;
      try { ok = a.test(s, data); } catch (e) { ok = false; }
      if (ok) {
        data.achievements[a.id] = true;
        queue.push(a);
        any = true;
      }
    }
    if (any) Progress.save();
    return any;
  }

  function update() {
    if (timer > 0 && --timer === 0) showing = null;
    if (!showing && queue.length) {
      showing = queue.shift();
      timer = 200;
      Audio.sfx.achievement();
    }
  }

  function draw(ctx) {
    if (!showing) return;
    const a = 1 - Math.max(0, (30 - timer) / 30);
    const slide = timer > 170 ? (200 - timer) / 30 : 1;
    const bx = VW - 176;
    const by = HUD_H + 6 - (1 - slide) * 30;

    ctx.globalAlpha = a;
    ctx.fillStyle = 'rgba(0,0,0,0.88)';
    ctx.fillRect(bx, by, 170, 32);
    ctx.fillStyle = '#FFD95E';
    ctx.fillRect(bx, by, 170, 1);
    ctx.fillRect(bx, by + 31, 170, 1);
    ctx.fillRect(bx, by, 2, 32);

    ctx.fillStyle = '#FFD95E';
    ctx.font = 'bold 6px monospace';
    ctx.fillText('★ LOGRO DESBLOQUEADO', bx + 7, by + 10);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 7px monospace';
    ctx.fillText(showing.name, bx + 7, by + 21);
    ctx.fillStyle = '#99AABB';
    ctx.font = '5px monospace';
    ctx.fillText(showing.desc, bx + 7, by + 29);
    ctx.globalAlpha = 1;
  }

  function unlockedCount() {
    const d = Progress.get();
    return ACHIEVEMENTS.filter(a => d.achievements[a.id]).length;
  }

  return { check, update, draw, unlockedCount, all: ACHIEVEMENTS };
})();
