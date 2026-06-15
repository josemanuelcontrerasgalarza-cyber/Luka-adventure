'use strict';

const Audio = (() => {
  let ctx = null;
  let masterGain = null;
  let musicGain = null;
  let sfxGain = null;
  let musicTimeouts = [];
  let musicOscillators = [];
  let currentTrack = null;
  let musicEnabled = true;
  let sfxEnabled = true;

  // ─── NOTE FREQUENCIES (Hz) ───────────────────────────────
  const REST = 0;
  const C3=130.81, D3=146.83, E3=164.81, F3=174.61, G3=196.00, A3=220.00, B3=246.94;
  const C4=261.63, D4=293.66, E4=329.63, F4=349.23, G4=392.00, A4=440.00, Bb4=466.16, B4=493.88;
  const C5=523.25, D5=587.33, E5=659.25, F5=698.46, G5=783.99, A5=880.00;
  const C6=1046.5;

  // ─── MUSIC TRACKS ────────────────────────────────────────
  // Each note: [frequency, beats]  (REST=0 for silence)
  const TRACKS = {
    menu: {
      tempo: 150,
      melody: [
        [E4,0.5],[G4,0.5],[A4,0.5],[G4,0.5],
        [E4,0.5],[D4,0.5],[C4,1.0],
        [D4,0.5],[F4,0.5],[G4,0.5],[F4,0.5],
        [D4,0.5],[C4,0.5],[B3,1.0],
      ],
      bass: [
        [C3,1],[G3,1],[A3,1],[F3,1],
        [C3,1],[G3,1],[A3,1],[F3,1],
      ],
    },
    world1: {
      tempo: 140,
      melody: [
        [G4,0.5],[A4,0.5],[B4,0.5],[C5,0.5],
        [B4,1],[A4,0.5],[G4,0.5],
        [E4,0.5],[G4,0.5],[A4,1],[G4,0.5],[E4,0.5],
        [D4,1],[G4,1],
      ],
      bass:[
        [G3,1],[C4,1],[D4,1],[G3,1],
        [G3,1],[C4,1],[D4,1],[G3,1],
      ],
    },
    world2: {
      tempo: 160,
      melody:[
        [C5,0.5],[D5,0.5],[E5,0.5],[F5,0.5],
        [E5,1],[D5,1],
        [C5,0.5],[B4,0.5],[A4,0.5],[G4,0.5],
        [A4,1],[B4,1],
      ],
      bass:[
        [C4,1],[F4,1],[G4,1],[C4,1],
        [C4,1],[F4,1],[G4,1],[C4,1],
      ],
    },
    world3:{
      tempo: 170,
      melody:[
        [D5,0.5],[E5,0.5],[F5,0.5],[G5,0.5],
        [A5,1],[G5,0.5],[F5,0.5],
        [E5,0.5],[D5,0.5],[C5,1],[D5,0.5],[E5,0.5],
        [F5,2],
      ],
      bass:[
        [D4,1],[G4,1],[A4,1],[D4,1],
        [D4,1],[G4,1],[A4,1],[D4,1],
      ],
    },
    world4:{
      tempo: 180,
      melody:[
        [A4,0.5],[C5,0.5],[D5,0.5],[F5,0.5],
        [A5,1],[F5,1],
        [D5,0.5],[C5,0.5],[A4,1],[C5,0.5],[D5,0.5],
        [F5,2],
      ],
      bass:[
        [A3,1],[D4,1],[E4,1],[A3,1],
        [A3,1],[D4,1],[E4,1],[A3,1],
      ],
    },
    world5:{
      tempo: 120,
      melody:[
        [G4,1],[B4,1],[D5,1],[F5,1],
        [E5,0.5],[D5,0.5],[C5,0.5],[B4,0.5],[A4,2],
        [G4,1],[E4,1],[G4,1],[A4,1],
        [B4,2],[D5,2],
      ],
      bass:[
        [G3,2],[D4,2],[G3,2],[D4,2],
        [G3,2],[D4,2],[E4,2],[G4,2],
      ],
    },
    boss:{
      tempo: 200,
      melody:[
        [B4,0.25],[B4,0.25],[B4,0.25],[REST,0.25],
        [B4,0.25],[C5,0.5],[B4,0.5],[A4,0.25],[G4,1],
        [G4,0.25],[G4,0.25],[G4,0.25],[REST,0.25],
        [G4,0.25],[A4,0.5],[G4,0.5],[F4,0.25],[E4,1],
      ],
      bass:[
        [E3,0.5],[G3,0.5],[B3,0.5],[E3,0.5],
        [E3,0.5],[G3,0.5],[A3,0.5],[E3,0.5],
        [E3,0.5],[G3,0.5],[B3,0.5],[E3,0.5],
        [E3,0.5],[A3,0.5],[G3,0.5],[E3,0.5],
      ],
    },
    gameover:{
      tempo: 80,
      melody:[
        [C5,1],[B4,1],[Bb4,1],[A4,1],
        [G4,2],[REST,2],
      ],
      bass:[
        [C4,1],[G3,1],[F3,1],[E3,1],
        [C3,4],
      ],
    },
  };

  // ─── INIT ────────────────────────────────────────────────
  function init() {
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      masterGain = ctx.createGain(); masterGain.gain.value = 0.6;
      musicGain  = ctx.createGain(); musicGain.gain.value  = 0.35;
      sfxGain    = ctx.createGain(); sfxGain.gain.value    = 0.8;
      masterGain.connect(ctx.destination);
      musicGain.connect(masterGain);
      sfxGain.connect(masterGain);
    } catch(e) {
      ctx = null;
    }
  }

  function resume() {
    if (ctx && ctx.state === 'suspended') ctx.resume();
  }

  // ─── SFX PRIMITIVES ──────────────────────────────────────
  function tone(freq, type, duration, vol, delay = 0) {
    if (!ctx || !sfxEnabled) return;
    resume();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type || 'square';
    o.frequency.value = freq;
    const now = ctx.currentTime;
    g.gain.setValueAtTime(0, now + delay);
    g.gain.linearRampToValueAtTime(vol || 0.3, now + delay + 0.005);
    g.gain.exponentialRampToValueAtTime(0.001, now + delay + duration);
    o.connect(g);
    g.connect(sfxGain);
    o.start(now + delay);
    o.stop(now + delay + duration + 0.01);
  }

  function noise(duration, vol, delay = 0) {
    if (!ctx || !sfxEnabled) return;
    resume();
    const bufSize = Math.ceil(ctx.sampleRate * duration);
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    const g = ctx.createGain();
    src.buffer = buf;
    const now = ctx.currentTime;
    g.gain.setValueAtTime(vol || 0.2, now + delay);
    g.gain.exponentialRampToValueAtTime(0.001, now + delay + duration);
    src.connect(g);
    g.connect(sfxGain);
    src.start(now + delay);
  }

  // ─── SOUND EFFECTS ───────────────────────────────────────
  const sfx = {
    jump()       { tone(200,'square',0.06,0.25); tone(350,'square',0.08,0.2,0.04); tone(500,'square',0.06,0.15,0.09); },
    doubleJump() { tone(350,'square',0.06,0.2); tone(600,'square',0.08,0.2,0.04); tone(800,'square',0.05,0.15,0.1); },
    tuna()       { tone(660,'square',0.07,0.25); tone(880,'square',0.07,0.2,0.07); tone(1100,'square',0.1,0.15,0.12); },
    coin()       { tone(880,'square',0.05,0.2); tone(1100,'square',0.07,0.2,0.05); tone(1320,'square',0.1,0.2,0.1); },
    heart()      { [550,660,770,880].forEach((f,i) => tone(f,'square',0.08,0.2,i*0.07)); },
    hurt()       { tone(200,'sawtooth',0.1,0.4); tone(150,'sawtooth',0.1,0.3,0.05); noise(0.15,0.1); },
    die()        {
      [400,300,200,120].forEach((f,i) => tone(f,'sawtooth',0.05+i*0.05,0.3,i*0.08));
      noise(0.4,0.15,0.05);
    },
    land()       { noise(0.05,0.15); tone(80,'square',0.05,0.2); },
    powerup()    { [440,520,600,680,760,840].forEach((f,i) => tone(f,'square',0.1,0.2,i*0.06)); },
    checkpoint() { [523,659,784].forEach((f,i) => tone(f,'square',0.1,0.2,i*0.1)); },
    bossHit()    { noise(0.08,0.3); tone(150,'sawtooth',0.08,0.3,0.02); },
    bossPhase()  {
      tone(80,'sawtooth',0.2,0.4);
      noise(0.3,0.3);
      [200,170,140,110].forEach((f,i) => tone(f,'square',0.1,0.3,i*0.1));
    },
    levelComplete() {
      [523,659,784,1047].forEach((f,i) => tone(f,'square',0.15,0.25,i*0.12));
      tone(1047,'square',0.4,0.3,0.5);
    },
    gameOver()   { [392,330,262,196].forEach((f,i) => tone(f,'sawtooth',0.25,0.3,i*0.2)); },
    menuSelect() { tone(440,'square',0.05,0.2); tone(550,'square',0.05,0.15,0.04); },
    menuConfirm(){ [523,659,784].forEach((f,i) => tone(f,'square',0.07,0.2,i*0.07)); },
    achievement(){ [523,659,784,1047,1319].forEach((f,i) => tone(f,'square',0.12,0.25,i*0.08)); },
    glitch()     { for(let i=0;i<5;i++) tone(Math.random()*800+200,'sawtooth',0.03,0.2,i*0.04); },
    shoot()      { tone(880,'square',0.06,0.2); tone(660,'square',0.08,0.15,0.04); },
    explosion()  { noise(0.3,0.4); tone(80,'sawtooth',0.2,0.3); tone(60,'sawtooth',0.3,0.3,0.1); },
    easterEgg()  { [392,440,494,523,587,659,698,784].forEach((f,i) => tone(f,'square',0.15,0.2,i*0.1)); },
    shieldOn()   { [440,660,880].forEach((f,i) => tone(f,'sine',0.1,0.2,i*0.05)); },
    shieldHit()  { tone(660,'square',0.05,0.3); tone(440,'square',0.08,0.2,0.04); },
  };

  // ─── MUSIC ENGINE ────────────────────────────────────────
  function stopMusic() {
    musicTimeouts.forEach(id => clearTimeout(id));
    musicTimeouts = [];
    musicOscillators.forEach(o => { try { o.stop(0); } catch(e){} });
    musicOscillators = [];
    currentTrack = null;
  }

  function playMusic(name) {
    if (!ctx || !musicEnabled) return;
    if (currentTrack === name) return;
    stopMusic();
    currentTrack = name;
    const track = TRACKS[name];
    if (!track) return;
    resume();
    if (track.melody) _scheduleVoice(track.melody, track.tempo, 'square',   0.18);
    if (track.bass)   _scheduleVoice(track.bass,   track.tempo, 'triangle', 0.10);
  }

  function _scheduleVoice(notes, tempo, waveType, gainVal) {
    const bps    = tempo / 60;
    const beatSec = 1 / bps;
    const trackId = currentTrack; // capture at time of call

    let scheduleTime = ctx.currentTime + 0.05;

    function scheduleLoop() {
      if (currentTrack !== trackId) return;

      const loopStart = scheduleTime;
      notes.forEach(([freq, beats]) => {
        const dur = beats * beatSec;
        if (freq > 0) {
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.type = waveType;
          o.frequency.value = freq;
          g.gain.setValueAtTime(0, scheduleTime);
          g.gain.linearRampToValueAtTime(gainVal, scheduleTime + 0.01);
          g.gain.setValueAtTime(gainVal, scheduleTime + dur * 0.75);
          g.gain.linearRampToValueAtTime(0, scheduleTime + dur * 0.9);
          o.connect(g);
          g.connect(musicGain);
          o.start(scheduleTime);
          o.stop(scheduleTime + dur);
          musicOscillators.push(o);
        }
        scheduleTime += dur;
      });

      const totalSec = notes.reduce((s, [, b]) => s + b * beatSec, 0);
      const waitMs   = (scheduleTime - ctx.currentTime - 0.05) * 1000;
      const id = setTimeout(scheduleLoop, Math.max(0, waitMs));
      musicTimeouts.push(id);
    }

    scheduleLoop();
  }

  function setMusicEnabled(val) {
    musicEnabled = val;
    if (!val) stopMusic();
  }

  function setSfxEnabled(val) { sfxEnabled = val; }

  return { init, resume, sfx, playMusic, stopMusic, setMusicEnabled, setSfxEnabled };
})();
