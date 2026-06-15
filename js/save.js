'use strict';

const SaveManager = (() => {
  const KEY = 'luka_adventure_save';

  const defaults = {
    highestWorld: 1,
    totalTuna: 0,
    achievements: {},
    hasDoubleJump: false,
    hasSpeedBoost: false,
    hasShield: false,
    hardMode: false,
    musicOn: true,
    sfxOn: true,
    playtime: 0,
    easterEggFound: false,
    timesCompleted: 0,
  };

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return { ...defaults };
      return { ...defaults, ...JSON.parse(raw) };
    } catch(e) {
      return { ...defaults };
    }
  }

  function save(data) {
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch(e) {}
  }

  function reset() {
    localStorage.removeItem(KEY);
    return { ...defaults };
  }

  return { load, save, reset };
})();
