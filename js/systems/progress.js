'use strict';

// PROGRESS & SAVE
// One save slot in localStorage, holding per-level records so the world map
// can show what is beaten, what still hides a secret, and the 100% figure.

const Progress = (() => {
  const KEY = 'luka_adventure_v2';

  function blank() {
    return {
      version: 2,
      created: 0,
      lives: START_LIVES,
      coins: 0,          // Crystal Shards (the running currency)
      tokens: 0,         // Luka Tokens (rare)
      keys: 0,           // Ancient Keys
      relics: {},        // worldId -> true
      unlockedWorld: 1,
      unlockedLevels: { 'W1L01': true },
      levels: {},        // id -> record
      powerups: { djump: false },
      achievements: {},
      hardMode: false,
      hardUnlocked: false,
      completions: 0,
      playtime: 0,
      settings: { music: true, sfx: true },
      lastLevel: 'W1L01',
    };
  }

  function levelRecord() {
    return {
      completed: false,
      secretFound: false,
      allCoins: false,
      noDamage: false,
      bestTime: null,
      bestCoins: 0,
      deaths: 0,
      attempts: 0,
    };
  }

  let data = blank();

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.version === 2) {
          data = Object.assign(blank(), parsed);
          data.levels   = parsed.levels   || {};
          data.powerups = Object.assign({ djump: false }, parsed.powerups || {});
          data.settings = Object.assign({ music: true, sfx: true }, parsed.settings || {});
          return data;
        }
      }
    } catch (e) { /* corrupt save — fall through to a fresh one */ }
    data = blank();
    return data;
  }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) {}
  }

  function reset() { data = blank(); save(); return data; }
  function hasSave() {
    try { return !!localStorage.getItem(KEY); } catch (e) { return false; }
  }
  function get() { return data; }

  // Level records
  function record(levelId) {
    if (!data.levels[levelId]) data.levels[levelId] = levelRecord();
    return data.levels[levelId];
  }

  function isUnlocked(levelId) { return !!data.unlockedLevels[levelId]; }
  function isCompleted(levelId) {
    const r = data.levels[levelId];
    return !!(r && r.completed);
  }

  function unlock(levelId) {
    if (!levelId) return false;
    if (data.unlockedLevels[levelId]) return false;
    data.unlockedLevels[levelId] = true;
    return true;
  }

  function noteAttempt(levelId) {
    const r = record(levelId);
    r.attempts++;
    data.lastLevel = levelId;
  }

  function noteDeath(levelId) { record(levelId).deaths++; }

  /**
   * Called on level clear. Returns what was newly unlocked so the world map
   * can animate it.
   */
  function complete(levelId, stats) {
    const r = record(levelId);
    const firstClear = !r.completed;
    r.completed = true;
    if (stats.secretExit) r.secretFound = true;
    if (stats.allCoins)   r.allCoins    = true;
    if (stats.noDamage)   r.noDamage    = true;
    if (r.bestTime === null || stats.time < r.bestTime) r.bestTime = stats.time;
    if (stats.coins > r.bestCoins) r.bestCoins = stats.coins;

    data.coins += stats.coins;
    if (stats.tokens) data.tokens += stats.tokens;

    const parsed = parseLevelId(levelId);
    const newly = [];

    // Normal progression: the next level in this world.
    if (parsed.level < LEVELS_PER_WORLD) {
      const nextId = makeLevelId(parsed.world, parsed.level + 1);
      if (unlock(nextId)) newly.push(nextId);
    }

    // Secret exit jumps ahead.
    if (stats.secretExit && stats.secretTarget) {
      if (unlock(stats.secretTarget)) newly.push(stats.secretTarget);
    }

    // Beating a world boss opens the next world.
    if (archetypeFor(parsed.level) === 'boss') {
      data.relics[parsed.world] = true;
      const nextWorld = parsed.world + 1;
      if (nextWorld <= WORLDS.length) {
        if (nextWorld > data.unlockedWorld) data.unlockedWorld = nextWorld;
        const firstId = makeLevelId(nextWorld, 1);
        if (unlock(firstId)) newly.push(firstId);
      } else {
        // World 9 boss down: the run is finished.
        data.completions++;
        data.hardUnlocked = true;
      }
    }

    save();
    return { firstClear, newly };
  }

  // Power-ups
  function grantPowerup(type) {
    if (POWERUPS[type] && POWERUPS[type].permanent) {
      data.powerups[type] = true;
      save();
      return true;
    }
    return false;
  }
  function hasPowerup(type) { return !!data.powerups[type]; }

  // Completion stats
  function stats() {
    const ids = allLevelIds();
    let completed = 0, secrets = 0, perfectCoins = 0, noDamage = 0, deaths = 0;
    let secretsAvailable = 0;

    for (const id of ids) {
      const r = data.levels[id];
      if (!r) continue;
      if (r.completed)   completed++;
      if (r.secretFound) secrets++;
      if (r.allCoins)    perfectCoins++;
      if (r.noDamage)    noDamage++;
      deaths += r.deaths;
    }
    // Secret exits exist on 'secret' archetypes plus some exploration levels;
    // we count what the player has actually discovered against known ones.
    for (const id of ids) {
      const p = parseLevelId(id);
      if (archetypeFor(p.level) === 'secret') secretsAvailable++;
    }

    const relicCount = Object.keys(data.relics).length;
    // 100% = all levels + all secrets + all relics, weighted.
    const total = ids.length + secretsAvailable + WORLDS.length;
    const got   = completed + secrets + relicCount;
    return {
      completed, total: ids.length,
      secrets, secretsAvailable,
      perfectCoins, noDamage, deaths,
      relics: relicCount, relicTotal: WORLDS.length,
      coins: data.coins, tokens: data.tokens,
      percent: Math.floor((got / total) * 100),
    };
  }

  return {
    load, save, reset, hasSave, get,
    record, isUnlocked, isCompleted, unlock,
    noteAttempt, noteDeath, complete,
    grantPowerup, hasPowerup, stats,
  };
})();
