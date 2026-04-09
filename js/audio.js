// js/audio.js
// Standalone Web Audio API Synthesis Engine for TechnoDrone
// Generates all sounds procedurally. Defines 'audio' global.

window.audio = (function() {
  let ctx = null;
  let masterGain, sfxGain, musicGain;
  let isMuted = false;
  let _masterVol = 1.0, _sfxVol = 1.0, _musicVol = 0.20;
  let _pendingMusic = null;

  // Commissioned soundtrack
  let _bgmEl = null;
  // Base volume for _bgmEl when slider is at 100%. Keep conservative — user can turn up.
  const BGM_BASE_VOL = 0.30;

  // Loaded audio pools (WAV files via HTMLAudioElement — works on file://)
  const audioPools = {};

  // Track active sound nodes for polyphony limit
  const activeVoices = {}; // name -> [{stop: fn, cleanup: fn}]
  const voiceCaps = {
    shoot: 4, enemyHit: 6, enemyDeath: 4, shieldHit: 4,
    sniperWarning: 3
  };
  const activeLoops = {}; // name -> fn

  let currentMusicName = null;
  let musicVoices = []; // active oscillators/lfo pairs

  // Load stored audio settings immediately so init() and setters pick them up.
  try {
    const storedMasterVol = localStorage.getItem('drone_master_vol');
    const storedSfxOn     = localStorage.getItem('drone_sfx_on');
    const storedMusicVol  = localStorage.getItem('drone_music_vol');
    const storedMusicOn   = localStorage.getItem('drone_music_on');
    if (storedMasterVol !== null) _masterVol = Math.max(0, Math.min(1, parseInt(storedMasterVol, 10) / 100));
    if (storedSfxOn === '0') _sfxVol = 0;
    if (storedMusicVol !== null) _musicVol = Math.max(0, Math.min(1, parseInt(storedMusicVol, 10) / 100));
    else if (storedMusicOn === '0') _musicVol = 0;
  } catch (error) {}

  // Apply current volume state directly to the BGM element.
  // Used because createMediaElementAudioSource is blocked on file:// protocol.
  function _applyBgmVol() {
    if (_bgmEl) _bgmEl.volume = isMuted ? 0 : Math.min(1, BGM_BASE_VOL * _musicVol * _masterVol);
  }
  
  // --- Core Graph Creation ---
  function init() {
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume().catch(()=>{});
      return;
    }
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) {
      console.warn("Web Audio API not supported.");
      return;
    }
    
    ctx = new AudioContext();
    masterGain = ctx.createGain();
    sfxGain = ctx.createGain();
    musicGain = ctx.createGain();

    masterGain.gain.value = _masterVol;
    sfxGain.gain.value = _sfxVol * 0.9;
    musicGain.gain.value = 1.0;

    sfxGain.connect(masterGain);
    musicGain.connect(masterGain);
    masterGain.connect(ctx.destination);

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    // Load WAV files using Audio element pools (works on file://)
    _loadPool('shoot', 'sounds/shoot.wav', 4);

    // Commissioned soundtrack — routed through Web Audio graph for unified processing
    _bgmEl = new Audio('Techno Drone V1 Master Chain .mp3');
    _bgmEl.loop = true;
    _bgmEl.preload = 'auto';
    _bgmEl.load();

    // Note: createMediaElementAudioSource is blocked on file:// (Chrome cross-origin).
    // BGM volume is controlled directly via _bgmEl.volume through _applyBgmVol().
    _applyBgmVol();
  }

  function _loadPool(name, path, size) {
    const pool = { elements: [], idx: 0 };
    for (let i = 0; i < size; i++) {
      const el = new Audio(path);
      el.preload = 'auto';
      el.load();
      pool.elements.push(el);
    }
    audioPools[name] = pool;
  }

  function _playPool(name, volume, opts = {}) {
    const pool = audioPools[name];
    if (!pool) return null;
    const el = pool.elements[pool.idx % pool.elements.length];
    pool.idx++;
    const effectiveVolume = isMuted ? 0 : Math.min(1, Math.max(0, (volume || 1.0) * _masterVol * _sfxVol));
    const playbackRate = Math.max(0.08, Math.min(4, opts.playbackRate || 1));
    el.pause();
    el.currentTime = 0;
    el.muted = isMuted || effectiveVolume <= 0;
    el.volume = effectiveVolume;
    el.playbackRate = playbackRate;
    if ('preservesPitch' in el) el.preservesPitch = false;
    if ('mozPreservesPitch' in el) el.mozPreservesPitch = false;
    if ('webkitPreservesPitch' in el) el.webkitPreservesPitch = false;
    el.play().catch((err) => {
      console.warn(`[audio] failed to play pooled sound "${name}" from ${el.currentSrc || el.src}`, err);
    });
    return null;
  }

  // Helper generators
  let _noiseBuffer = null;
  function getNoiseBuffer() {
    if (!ctx) return null;
    if (!_noiseBuffer) {
      const size = ctx.sampleRate * 2.0; // 2 seconds of noise
      _noiseBuffer = ctx.createBuffer(1, size, ctx.sampleRate);
      const output = _noiseBuffer.getChannelData(0);
      for (let i = 0; i < size; i++) {
        output[i] = Math.random() * 2 - 1;
      }
    }
    return _noiseBuffer;
  }

  function createNoise(gainEnv, dur, filterType, filterFreq, q, sweepTo, sweepDur) {
    if (!ctx) return null;
    const t = ctx.currentTime;
    
    const src = ctx.createBufferSource();
    src.buffer = getNoiseBuffer();
    src.loop = true;
    
    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0, t);
    gainEnv(gainNode.gain, t);
    
    let lastNode = src;
    let filter = null;
    
    if (filterType) {
      filter = ctx.createBiquadFilter();
      filter.type = filterType;
      filter.frequency.setValueAtTime(filterFreq, t);
      if (q !== undefined) filter.Q.value = q;
      if (sweepTo) {
        filter.frequency.linearRampToValueAtTime(sweepTo, t + sweepDur);
      }
      lastNode.connect(filter);
      lastNode = filter;
    }
    
    lastNode.connect(gainNode);
    gainNode.connect(sfxGain);
    
    src.start(t);
    src.stop(t + dur);
    
    return {
      stop: () => { try { src.stop(); } catch(e){} },
      cleanup: () => { 
        setTimeout(() => {
          src.disconnect();
          if (filter) filter.disconnect();
          gainNode.disconnect();
        }, 100);
      }
    };
  }

  function createOsc(type, freq, gainEnv, dur, sweepTo, sweepDur, exp) {
    if (!ctx) return null;
    const t = ctx.currentTime;
    
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (sweepTo) {
      if (exp) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(sweepTo, 0.01), t + sweepDur);
      } else {
        osc.frequency.linearRampToValueAtTime(sweepTo, t + sweepDur);
      }
    }
    
    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0, t);
    gainEnv(gainNode.gain, t);
    
    osc.connect(gainNode);
    gainNode.connect(sfxGain);
    
    osc.start(t);
    osc.stop(t + dur);
    
    return {
      stop: () => { try { osc.stop(); } catch(e){} },
      cleanup: () => {
        setTimeout(() => {
          osc.disconnect(); gainNode.disconnect();
        }, 100);
      }
    };
  }


  // Procedural Recipes Definitions
  const recipes = {
    // Player Sound Effects
    shoot: () => _playPool('shoot', 0.72, { playbackRate: 0.84 }),
    dash: () => createNoise((g,t)=>{
      g.setValueAtTime(0.2, t); g.linearRampToValueAtTime(0, t+0.3);
    }, 0.3, 'bandpass', 2000, 2, 400, 0.25),
    overheat: () => createOsc('sawtooth', 120, (g,t)=>{
      g.setValueAtTime(0, t);
      for(let i=0; i<3; i++){ g.setValueAtTime(0.12, t + i*0.133); g.setValueAtTime(0, t + i*0.133 + 0.1); }
    }, 0.4),
    nuke: () => {
      return [
        createOsc('sine', 40, (g,t)=>{
          g.setValueAtTime(0, t); g.linearRampToValueAtTime(0.3, t+0.01); g.exponentialRampToValueAtTime(0.01, t+1.2);
        }, 1.2),
        createOsc('sine', 200, (g,t)=>{
          g.setValueAtTime(0.08, t); g.linearRampToValueAtTime(0, t+0.6);
        }, 0.6, 2000, 0.6),
        createNoise((g,t)=>{
          g.setValueAtTime(0.15, t); g.linearRampToValueAtTime(0, t+0.3);
        }, 0.3)
      ];
    },
    
    // Combat Feedback Effects
    enemyHit: () => createOsc('triangle', 1200, (g,t)=>{
      g.setValueAtTime(0.08, t); g.linearRampToValueAtTime(0, t+0.05);
    }, 0.05, 600, 0.04),
    enemyDeath: () => [
      createNoise((g,t)=>{ g.setValueAtTime(0.2, t); g.exponentialRampToValueAtTime(0.01, t+0.15); }, 0.15),
      createOsc('sine', 300, (g,t)=>{ g.setValueAtTime(0.2, t); g.exponentialRampToValueAtTime(0.01, t+0.1); }, 0.1)
    ],
    eliteDeath: () => {
      return [
      createNoise((g,t)=>{ g.setValueAtTime(0.25, t); g.exponentialRampToValueAtTime(0.01, t+0.25); }, 0.25),
      createOsc('sine', 300, (g,t)=>{ g.setValueAtTime(0.2, t); g.exponentialRampToValueAtTime(0.01, t+0.15); }, 0.15),
      createOsc('sine', 60, (g,t)=>{ g.setValueAtTime(0.15, t); g.exponentialRampToValueAtTime(0.01, t+0.3); }, 0.3)
      ];
    },
    shieldHit: () => [
      createOsc('sine', 2400, (g,t)=>{ g.setValueAtTime(0.1, t); g.exponentialRampToValueAtTime(0.01, t+0.06); }, 0.06),
      createOsc('sine', 3600, (g,t)=>{ g.setValueAtTime(0.1, t); g.exponentialRampToValueAtTime(0.01, t+0.04); }, 0.04)
    ],
    shieldBreak: () => [
      createNoise((g,t)=>{ g.setValueAtTime(0.2, t); g.exponentialRampToValueAtTime(0.01, t+0.2); }, 0.2, 'highpass', 3000),
      createOsc('sine', 3000, (g,t)=>{ g.setValueAtTime(0.1, t); g.exponentialRampToValueAtTime(0.01, t+0.15); }, 0.2, 500, 0.15)
    ],
    playerHit: () => [
      createOsc('sine', 150, (g,t)=>{ g.setValueAtTime(0.25, t); g.exponentialRampToValueAtTime(0.01, t+0.3); }, 0.4),
      createOsc('sawtooth', 220, (g,t)=>{
        g.setValueAtTime(0, t);
        for(let i=0; i<3; i++){ g.setValueAtTime(0.1, t + i*0.133); g.setValueAtTime(0, t + i*0.133 + 0.1); }
      }, 0.4)
    ],
    playerDeath: () => {
      return [
        createOsc('sawtooth', 440, (g,t)=>{ g.setValueAtTime(0.2, t); g.linearRampToValueAtTime(0.01, t+1.5); }, 1.5, 80, 1.5),
        createNoise((g,t)=>{ g.setValueAtTime(0.05, t); g.linearRampToValueAtTime(0.01, t+0.8); }, 1.5)
      ];
    },
    // Pickups & State Changes
    pickupCollect: () => createOsc('sine', 800, (g,t)=>{
      g.setValueAtTime(0.12, t); g.linearRampToValueAtTime(0, t+0.15);
    }, 0.15, 2400, 0.12),
    flowStateActivate: () => [
      createOsc('sawtooth', 200, (g,t)=>{ g.setValueAtTime(0.15, t); g.linearRampToValueAtTime(0, t+0.3); }, 0.3, 1200, 0.3),
      createOsc('sine', 600, (g,t)=>{
        g.setValueAtTime(0, t);
        for(let i=0; i<4; i++){ g.setValueAtTime(0.08, t+i*0.125); g.setValueAtTime(0, t+i*0.125+0.1); }
      }, 0.5)
    ],
    flowStateEnd: () => createOsc('sine', 1000, (g,t)=>{
      g.setValueAtTime(0.1, t); g.linearRampToValueAtTime(0, t+0.25);
    }, 0.25, 300, 0.25),
    
    stageAdvance: () => [
      createOsc('sine', 523, (g,t)=>{ g.setValueAtTime(0.15, t); g.linearRampToValueAtTime(0, t+0.1); }, 0.1),
      { // Staggered second chord note
        start: () => {
          setTimeout(()=>{
            if(!ctx) return;
            const n = createOsc('sine', 784, (g,t)=>{ g.setValueAtTime(0.15, t); g.linearRampToValueAtTime(0, t+0.15); }, 0.15);
            if(n) {
              setTimeout(() => { n.cleanup(); }, 300);
            }
          }, 100);
        }
      }
    ],
    chainMilestone: () => {
      [600, 800, 1000].forEach((freq, i) => {
        setTimeout(()=>{
          const n = createOsc('sine', freq, (g,t)=>{ g.setValueAtTime(0.1, t); g.linearRampToValueAtTime(0, t+0.04); }, 0.04);
          if(n) {
            setTimeout(() => { n.cleanup(); }, 200);
          }
        }, i * 50);
      });
      return [];
    },
    
    // UI Sounds
    menuSelect: () => createOsc('sine', 1000, (g,t)=>{ g.setValueAtTime(0.08, t); g.linearRampToValueAtTime(0, t+0.03); }, 0.03),
    menuConfirm: () => {
      if(!ctx) return null;
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, t);
      osc.frequency.setValueAtTime(1600, t+0.02);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.1, t+0.01);
      g.gain.linearRampToValueAtTime(0, t+0.04);
      osc.connect(g); g.connect(sfxGain);
      osc.start(t); osc.stop(t+0.04);
      return { stop:()=>{try{osc.stop();}catch(e){}}, cleanup: ()=>{setTimeout(()=>{osc.disconnect();g.disconnect();},100);}};
    },
    
    // Enemy Sounds
    sniperWarning: () => [
      createNoise((g,t)=>{ g.setValueAtTime(0.1, t); g.exponentialRampToValueAtTime(0.01, t+0.06); }, 0.06),
      createOsc('sine', 700, (g,t)=>{ g.setValueAtTime(0.08, t); g.exponentialRampToValueAtTime(0.01, t+0.04); }, 0.04)
    ],
    sniperFire: () => [
      createNoise((g,t)=>{ g.setValueAtTime(0.18, t); g.exponentialRampToValueAtTime(0.01, t+0.08); }, 0.08),
      createOsc('sine', 500, (g,t)=>{ g.setValueAtTime(0.1, t); g.exponentialRampToValueAtTime(0.01, t+0.05); }, 0.05)
    ],
    turretFire: () => [
      createNoise((g,t)=>{ g.setValueAtTime(0.1, t); g.exponentialRampToValueAtTime(0.01, t+0.06); }, 0.06),
      createOsc('sine', 700, (g,t)=>{ g.setValueAtTime(0.08, t); g.exponentialRampToValueAtTime(0.01, t+0.04); }, 0.04)
    ]
  };

  function play(name) {
    if (!ctx || isMuted || !recipes[name]) return;
    if (ctx.state === 'suspended') ctx.resume().catch(()=>{});
    
    let arr = activeVoices[name] || [];
    if (voiceCaps[name] && arr.length >= voiceCaps[name]) {
      const oldest = arr.shift();
      if (oldest) { oldest.stop(); oldest.cleanup(); }
    }
    
    const nodes = recipes[name]();
    if (!nodes) return;
    
    const list = Array.isArray(nodes) ? nodes : [nodes];
    const wrappers = list.filter(n => n && n.stop);
    
    if (wrappers.length > 0) {
      if (voiceCaps[name]) {
        arr.push(...wrappers);
        activeVoices[name] = arr;
      }
      setTimeout(() => {
        wrappers.forEach(w => {
          w.cleanup();
          const pArr = activeVoices[name];
          if(pArr) { 
            const idx = pArr.indexOf(w); 
            if (idx > -1) pArr.splice(idx, 1);
          }
        });
      }, 2000);
    }
    
    // Some recipes return a start function via timeout
    list.forEach(n => { if (n && n.start) n.start(); });
  }

  function startLoop(name) {
    if (!ctx || isMuted) return;
    if (ctx.state === 'suspended') ctx.resume().catch(()=>{});
    if (activeLoops[name]) return;
    
    if (name === 'bassPulseLoop') {
      const t = ctx.currentTime;
      const sub = ctx.createOscillator();
      sub.type = 'sine';
      sub.frequency.value = 48;
      const body = ctx.createOscillator();
      body.type = 'sine';
      body.frequency.value = 96;
      const noise = ctx.createBufferSource();
      noise.buffer = getNoiseBuffer();
      noise.loop = true;
      const noiseFilter = ctx.createBiquadFilter();
      noiseFilter.type = 'lowpass';
      noiseFilter.frequency.value = 180;
      noiseFilter.Q.value = 0.5;
      const noiseGain = ctx.createGain();
      noiseGain.gain.value = 0.012;

      const lfo = ctx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.value = 2.2;

      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 8;

      const gainNode = ctx.createGain();
      gainNode.gain.setValueAtTime(0, t);
      gainNode.gain.linearRampToValueAtTime(0.1, t + 0.07);

      sub.connect(gainNode);
      body.connect(gainNode);
      noise.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(gainNode);

      lfo.connect(lfoGain);
      lfoGain.connect(body.detune);

      gainNode.connect(sfxGain);

      sub.start(t);
      body.start(t);
      noise.start(t);
      lfo.start(t);

      activeLoops[name] = () => {
        const ts = ctx.currentTime;
        gainNode.gain.cancelScheduledValues(ts);
        gainNode.gain.setValueAtTime(gainNode.gain.value, ts);
        gainNode.gain.linearRampToValueAtTime(0, ts + 0.08);
        setTimeout(() => {
          try { sub.stop(); body.stop(); noise.stop(); lfo.stop(); }catch(e){}
          sub.disconnect();
          body.disconnect();
          noise.disconnect();
          noiseFilter.disconnect();
          noiseGain.disconnect();
          lfo.disconnect();
          lfoGain.disconnect();
          gainNode.disconnect();
        }, 140);
      };
    }
  }

  function stopLoop(name) {
    if (activeLoops[name]) {
      activeLoops[name]();
      delete activeLoops[name];
    }
  }
  
  // --- Music System ---
  function createMusicVoice(type, freq, gainVal, pulseFreq=null, pulseDepth=0) {
    if (!ctx) return null;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = freq;
    
    const gainNode = ctx.createGain();
    gainNode.gain.value = gainVal;
    
    osc.connect(gainNode);
    gainNode.connect(musicGain);
    
    let lfo = null, lfoGain = null;
    if (pulseFreq) {
      lfo = ctx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.value = pulseFreq;
      lfoGain = ctx.createGain();
      lfoGain.gain.value = pulseDepth;
      if (pulseDepth > 1) { // Large values mean detune/pitch mod
        lfo.connect(lfoGain);
        lfoGain.connect(osc.detune);
      } else {
        lfo.connect(lfoGain);
        lfoGain.connect(gainNode.gain);
      }
      lfo.start();
    }
    
    osc.start();
    return { osc, gainNode, lfo, lfoGain, baseGain: gainVal };
  }

  function stopMusic(fadeMs = 500) {
    if (!ctx) return;
    if (_bgmEl && !_bgmEl.paused) {
      _bgmEl.pause();
      _bgmEl.currentTime = 0;
    }
    const fSec = fadeMs / 1000;
    musicVoices.forEach(v => {
      if(!v || !v.gainNode) return;
      v.gainNode.gain.cancelScheduledValues(t);
      v.gainNode.gain.setValueAtTime(v.gainNode.gain.value, t);
      v.gainNode.gain.linearRampToValueAtTime(0, t + fSec);
      setTimeout(() => {
        try{ v.osc.stop(); if(v.lfo)v.lfo.stop(); }catch(e){}
        v.osc.disconnect(); v.gainNode.disconnect();
      }, fadeMs + 100);
    });
    musicVoices = [];
    currentMusicName = null;
  }

  function playMusic(name) {
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume().catch(()=>{});
    currentMusicName = name;
    if (isMuted) { _pendingMusic = name; return; }
    if (name !== 'gameplay') {
      stopMusic(0);
      return;
    }
    // Start the soundtrack if not already playing — it loops through all game states
    if (_bgmEl && _bgmEl.paused) {
      _applyBgmVol();
      _bgmEl.play().catch(() => {});
    } else {
      _applyBgmVol();
    }
  }

  let _lastMusicStage = -1;
  function updateMusicIntensity(stageNum) {
    if (!ctx || currentMusicName !== 'gameplay') return;
    const stageChanged = stageNum !== _lastMusicStage;
    _lastMusicStage = stageNum;

    const t = ctx.currentTime + 0.1;

    if (musicVoices.length >= 3) {
      const sub = musicVoices[0];
      const mid = musicVoices[1];
      const tick = musicVoices[2];

      sub.osc.frequency.setTargetAtTime(65*(1+stageNum*0.05), t, 0.2);
      if(sub.lfo) sub.lfo.frequency.setTargetAtTime(1.5+stageNum*0.3, t, 0.2);

      mid.osc.frequency.setTargetAtTime(130*(1+stageNum*0.08), t, 0.2);
      if(tick.lfo) tick.lfo.frequency.setTargetAtTime(2+stageNum*0.4, t, 0.2);
    }

  }

  return {
    init, play, startLoop, stopLoop, playMusic, stopMusic, updateMusicIntensity,
    setMasterVolume: (vol) => {
      _masterVol = Math.max(0, Math.min(1, vol));
      if (masterGain) masterGain.gain.value = isMuted ? 0 : _masterVol;
      _applyBgmVol();
    },
    setSfxVolume:  (vol) => { _sfxVol = Math.max(0, Math.min(1, vol)); if (sfxGain) sfxGain.gain.value = _sfxVol * 0.9; },
    setMusicVolume:(vol) => {
      _musicVol = Math.max(0, Math.min(1, vol));
      _applyBgmVol();
    },
    toggleMute: () => {
      isMuted = !isMuted;
      if (masterGain) masterGain.gain.value = isMuted ? 0 : _masterVol;
      _applyBgmVol();
      if (!isMuted && _pendingMusic) {
        const pending = _pendingMusic;
        _pendingMusic = null;
        playMusic(pending);
      }
      return isMuted;
    },
    registerSound: (name, path) => { console.warn('audio.registerSound not yet implemented:', name, path); },
    registerMusic: (name, path) => { console.warn('audio.registerMusic not yet implemented:', name, path); },
    get isMuted() { return isMuted; }
  };
})();
