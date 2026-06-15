'use strict';

const Input = (() => {
  const keys = {};
  const justPressed = {};
  const justReleased = {};

  window.addEventListener('keydown', e => {
    const k = e.code;
    if (!keys[k]) justPressed[k] = true;
    keys[k] = true;
    // Prevent scroll on arrow/space keys during gameplay
    if (['Space','ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(k)) {
      e.preventDefault();
    }
  });

  window.addEventListener('keyup', e => {
    const k = e.code;
    keys[k] = false;
    justReleased[k] = true;
  });

  function clear() {
    for (const k in justPressed)  delete justPressed[k];
    for (const k in justReleased) delete justReleased[k];
  }

  function down(code) { return !!keys[code]; }
  function pressed(code) { return !!justPressed[code]; }
  function released(code) { return !!justReleased[code]; }

  // Game action helpers
  const LEFT    = () => down('ArrowLeft')  || down('KeyA');
  const RIGHT   = () => down('ArrowRight') || down('KeyD');
  const JUMP    = () => pressed('Space') || pressed('ArrowUp') || pressed('KeyW');
  const PAUSE   = () => pressed('Escape') || pressed('KeyP');
  const CONFIRM = () => pressed('Space') || pressed('Enter') || pressed('KeyZ');
  const BACK    = () => pressed('Escape') || pressed('KeyX');
  const UP      = () => pressed('ArrowUp')   || pressed('KeyW');
  const DOWN    = () => pressed('ArrowDown') || pressed('KeyS');

  return { clear, down, pressed, released, LEFT, RIGHT, JUMP, PAUSE, CONFIRM, BACK, UP, DOWN };
})();
