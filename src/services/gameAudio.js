/**
 * Fun Spot — Unified Global Audio Manager & Mixing Engine
 *
 * Single persistent audio manager for the entire application.
 * Owns the active background audio element and coordinates volume across
 * the Landing page, general navigation, and all active games:
 *   1. AR Dance Floor
 *   2. Don't Laugh
 *   3. Face Off
 *   4. Look A Like
 *
 * Volume Rules:
 *   - Landing page & general pages: 100% effective volume (multiplier = 1.0)
 *   - Entering an active game / active gameplay / rounds: 50% effective volume (multiplier = 0.5)
 *   - Game completion / results screen: 100% effective volume (multiplier = 1.0)
 *   - Leaving game / returning to navigation: 100% effective volume (multiplier = 1.0)
 *
 * Audio Assets:
 *   - Authorized local background track: /assets/audio/crazy-frog-axel-f.mp3
 *   - If a mode has no dedicated audio file on disk, it seamlessly plays the
 *     authorized global background track at the appropriate state volume without interruption.
 */

export const GLOBAL_TRACK_SRC = '/assets/audio/crazy-frog-axel-f.mp3';
export const GLOBAL_TRACK_TITLE = 'Crazy Frog - Axel F';

export const TRACK_CONFIG = {
  global: {
    id: 'global',
    name: GLOBAL_TRACK_TITLE,
    file: 'crazy-frog-axel-f.mp3',
    src: GLOBAL_TRACK_SRC,
    fullPath: 'public/assets/audio/crazy-frog-axel-f.mp3',
    defaultBgmVolume: 0.35,
    style: 'party_groove',
    description: 'High-energy arcade celebration soundtrack',
    existsOnDisk: true,
  },
  'dont-laugh': {
    id: 'dont-laugh',
    name: "Don't Laugh",
    file: 'dont-laugh-bg.mp3',
    src: '/assets/audio/dont-laugh-bg.mp3',
    fullPath: 'public/assets/audio/dont-laugh-bg.mp3',
    fallbackSrc: GLOBAL_TRACK_SRC,
    defaultBgmVolume: 0.25,
    style: 'upbeat_groove',
    description: 'Upbeat, energetic comedy background groove',
    existsOnDisk: false,
  },
  'face-off': {
    id: 'face-off',
    name: 'Face Off',
    file: 'face-off-bg.mp3',
    src: '/assets/audio/face-off-bg.mp3',
    fullPath: 'public/assets/audio/face-off-bg.mp3',
    fallbackSrc: GLOBAL_TRACK_SRC,
    defaultBgmVolume: 0.20,
    style: 'playful_suspense',
    description: 'Playful, suspenseful expression match soundtrack',
    existsOnDisk: false,
  },
  'look-a-like': {
    id: 'look-a-like',
    name: 'Look A Like',
    file: 'look-a-like-bg.mp3',
    src: '/assets/audio/look-a-like-bg.mp3',
    fullPath: 'public/assets/audio/look-a-like-bg.mp3',
    fallbackSrc: GLOBAL_TRACK_SRC,
    defaultBgmVolume: 0.22,
    style: 'light_arcade',
    description: 'Light, playful arcade entertainment soundtrack',
    existsOnDisk: false,
  },
};

export const DEFAULT_SETTINGS = {
  master: 0.80,          // Master volume (80%)
  dontLaughBgm: 0.25,    // Don't Laugh BGM (25%)
  faceOffBgm: 0.20,      // Face Off BGM (20%)
  lookALikeBgm: 0.22,    // Look A Like BGM (22%)
  sfx: 0.65,             // SFX volume (65%)
  countdownSfx: 0.70,    // Countdown SFX (70%)
  resultsSfx: 0.60,      // Results SFX (60%)
  muted: false,          // Master mute
  paused: false,         // User manual pause
};

const STORAGE_KEY = 'funspot.audio.settings';

function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw);
    return {
      master: typeof parsed.master === 'number' ? Math.max(0, Math.min(1, parsed.master)) : DEFAULT_SETTINGS.master,
      dontLaughBgm: typeof parsed.dontLaughBgm === 'number' ? Math.max(0, Math.min(1, parsed.dontLaughBgm)) : DEFAULT_SETTINGS.dontLaughBgm,
      faceOffBgm: typeof parsed.faceOffBgm === 'number' ? Math.max(0, Math.min(1, parsed.faceOffBgm)) : DEFAULT_SETTINGS.faceOffBgm,
      lookALikeBgm: typeof parsed.lookALikeBgm === 'number' ? Math.max(0, Math.min(1, parsed.lookALikeBgm)) : DEFAULT_SETTINGS.lookALikeBgm,
      sfx: typeof parsed.sfx === 'number' ? Math.max(0, Math.min(1, parsed.sfx)) : DEFAULT_SETTINGS.sfx,
      countdownSfx: typeof parsed.countdownSfx === 'number' ? Math.max(0, Math.min(1, parsed.countdownSfx)) : DEFAULT_SETTINGS.countdownSfx,
      resultsSfx: typeof parsed.resultsSfx === 'number' ? Math.max(0, Math.min(1, parsed.resultsSfx)) : DEFAULT_SETTINGS.resultsSfx,
      muted: Boolean(parsed.muted),
      paused: Boolean(parsed.paused),
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

function saveSettings(settings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Quota exceeded or private browsing
  }
}

// ---------------------------------------------------------------------------
// Procedural Web Audio Fallback Synthesizer
// ---------------------------------------------------------------------------

class ProceduralSynthBGM {
  constructor() {
    this.ctx = null;
    this.outGain = null;
    this.filterNode = null;
    this.isPlaying = false;
    this.style = 'upbeat_groove';
    this.intervalId = null;
    this.step = 0;
  }

  ensureContext() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.outGain = this.ctx.createGain();
        this.filterNode = this.ctx.createBiquadFilter();
        this.filterNode.type = 'lowpass';
        this.filterNode.frequency.value = 2400;
        this.filterNode.connect(this.outGain);
        this.outGain.connect(this.ctx.destination);
      }
    }
  }

  start(style = 'upbeat_groove', volume = 0.2) {
    this.ensureContext();
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }

    this.stop();
    this.style = style;
    this.isPlaying = true;
    this.step = 0;
    this.setVolume(volume);

    let tempoMs = 240;
    if (style === 'dance_beat') tempoMs = 180;
    else if (style === 'upbeat_groove') tempoMs = 220;
    else if (style === 'playful_suspense') tempoMs = 340;
    else if (style === 'light_arcade') tempoMs = 260;

    this.intervalId = setInterval(() => {
      if (!this.isPlaying) return;
      this.playStep();
    }, tempoMs);
    this.playStep();
  }

  playStep() {
    if (!this.ctx || this.ctx.state === 'suspended') return;
    try {
      const now = this.ctx.currentTime;
      const s = this.step % 16;
      this.step++;

      if (this.style === 'upbeat_groove') {
        const bassNotes = [130.81, 130.81, 164.81, 174.61, 196.00, 196.00, 220.00, 196.00];
        const arpNotes = [523.25, 659.25, 783.99, 1046.50, 783.99, 659.25, 880.00, 987.77];

        if (s % 2 === 0) {
          const oscB = this.ctx.createOscillator();
          const gB = this.ctx.createGain();
          oscB.type = 'triangle';
          const f = bassNotes[(s / 2) % bassNotes.length];
          oscB.frequency.setValueAtTime(f, now);
          gB.gain.setValueAtTime(0.08, now);
          gB.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
          oscB.connect(gB).connect(this.filterNode);
          oscB.start(now);
          oscB.stop(now + 0.22);
        }

        if ([0, 3, 6, 8, 11, 14].includes(s)) {
          const oscA = this.ctx.createOscillator();
          const gA = this.ctx.createGain();
          oscA.type = 'sine';
          const f = arpNotes[s % arpNotes.length];
          oscA.frequency.setValueAtTime(f, now);
          gA.gain.setValueAtTime(0.04, now);
          gA.gain.exponentialRampToValueAtTime(0.0005, now + 0.16);
          oscA.connect(gA).connect(this.filterNode);
          oscA.start(now);
          oscA.stop(now + 0.18);
        }
      } else if (this.style === 'playful_suspense') {
        const mysteryBass = [110.00, 110.00, 116.54, 110.00, 123.47, 110.00, 130.81, 123.47];
        const tickNotes = [440.00, 587.33, 698.46, 880.00];

        if (s % 2 === 0) {
          const osc = this.ctx.createOscillator();
          const g = this.ctx.createGain();
          osc.type = 'sawtooth';
          const f = mysteryBass[(s / 2) % mysteryBass.length];
          osc.frequency.setValueAtTime(f, now);
          g.gain.setValueAtTime(0.05, now);
          g.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
          osc.connect(g).connect(this.filterNode);
          osc.start(now);
          osc.stop(now + 0.26);
        }

        if (s % 4 === 1 || s % 4 === 3) {
          const oscT = this.ctx.createOscillator();
          const gT = this.ctx.createGain();
          oscT.type = 'triangle';
          const f = tickNotes[s % tickNotes.length];
          oscT.frequency.setValueAtTime(f, now);
          gT.gain.setValueAtTime(0.025, now);
          gT.gain.exponentialRampToValueAtTime(0.0002, now + 0.08);
          oscT.connect(gT).connect(this.filterNode);
          oscT.start(now);
          oscT.stop(now + 0.09);
        }
      } else if (this.style === 'dance_beat') {
        if (s % 4 === 0) {
          const oscK = this.ctx.createOscillator();
          const gK = this.ctx.createGain();
          oscK.type = 'sine';
          oscK.frequency.setValueAtTime(150, now);
          oscK.frequency.exponentialRampToValueAtTime(38, now + 0.12);
          gK.gain.setValueAtTime(0.12, now);
          gK.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
          oscK.connect(gK).connect(this.filterNode);
          oscK.start(now);
          oscK.stop(now + 0.15);
        }
      } else {
        const notes = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25];
        if (s % 2 === 0) {
          const osc = this.ctx.createOscillator();
          const g = this.ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(notes[s % notes.length], now);
          g.gain.setValueAtTime(0.04, now);
          g.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
          osc.connect(g).connect(this.filterNode);
          osc.start(now);
          osc.stop(now + 0.2);
        }
      }
    } catch {
      // Audio step failure fallback
    }
  }

  setVolume(volume) {
    if (this.outGain && this.ctx) {
      try {
        const v = Math.max(0.0001, Math.min(1, volume));
        this.outGain.gain.setValueAtTime(v, this.ctx.currentTime);
      } catch {}
    }
  }

  stop() {
    this.isPlaying = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}

// ---------------------------------------------------------------------------
// Unified Global Audio Manager Singleton
// ---------------------------------------------------------------------------

class GameAudioManager {
  constructor() {
    this.settings = loadSettings();
    this.currentTrackId = 'global';
    this.activeSourceUrl = GLOBAL_TRACK_SRC;
    this.appState = 'landing'; // 'landing' | 'navigation' | 'game_entered' | 'game_playing' | 'game_completed' | 'game_exited'
    this.stateMultiplier = 1.0; // 1.0 for landing/general/results; 0.5 for active games
    this.isPlaying = false;
    this.autoplayBlocked = false;
    this.assetMissing = false;
    this.assetMissingPath = null;
    this.usingSynthFallback = false;
    this.duckMultiplier = 1.0;
    this.duckTimeout = null;
    this.volumeRampInterval = null;
    this.currentEffectiveVolume = 0;

    this.audioElement = null;
    this.synthBgm = new ProceduralSynthBGM();
    this.listeners = new Set();
    this.interactionHandler = null;

    if (typeof window !== 'undefined') {
      this.initAudioElement();
      this.setupAutoplayUnlock();
    }
  }

  initAudioElement() {
    if (this.audioElement || typeof window === 'undefined') return;

    const audio = new Audio();
    audio.src = GLOBAL_TRACK_SRC;
    audio.loop = true;
    audio.preload = 'auto';
    audio.muted = this.settings.muted;

    audio.addEventListener('play', () => {
      this.isPlaying = true;
      this.autoplayBlocked = false;
      this.notify();
    });

    audio.addEventListener('pause', () => {
      if (!this.isFading) {
        this.isPlaying = false;
        this.notify();
      }
    });

    audio.addEventListener('error', (e) => {
      const config = TRACK_CONFIG[this.currentTrackId] || TRACK_CONFIG.global;
      this.handleAssetError(config);
    });

    this.audioElement = audio;
    this.applyVolume(true);
  }

  // --- State & Volume Rules ---

  /**
   * Set real application/game state and smoothly adjust volume.
   *   - 'landing' / 'navigation': 100% (1.0)
   *   - 'game_entered' / 'game_playing': 50% (0.50)
   *   - 'game_completed' / 'results': 100% (1.0)
   *   - 'game_exited': 100% (1.0)
   */
  setAppState(state) {
    this.appState = state;

    if (state === 'landing' || state === 'navigation' || state === 'game_completed' || state === 'game_exited' || state === 'results') {
      this.stateMultiplier = 1.0;
    } else if (state === 'game_entered' || state === 'game_playing' || state === 'playing') {
      this.stateMultiplier = 0.50;
    }

    this.applyVolume();
    this.notify();
  }

  signalGameEntered(gameId) {
    if (gameId && TRACK_CONFIG[gameId]) {
      this.startTrack(gameId);
    }
    this.setAppState('game_entered');
  }

  signalGameStarted() {
    this.setAppState('game_playing');
  }

  signalGameCompleted() {
    this.setAppState('game_completed');
  }

  signalGameExited() {
    this.setAppState('game_exited');
  }

  getEffectiveBgmVolume() {
    if (this.settings.muted || this.settings.paused) return 0;
    const bgmVol = this.getTrackBgmVolume(this.currentTrackId);
    const target = this.settings.master * bgmVol * this.duckMultiplier * this.stateMultiplier;
    return Math.max(0, Math.min(1, target));
  }

  getEffectiveSfxVolume(customSfxScale = 1.0) {
    if (this.settings.muted) return 0;
    const target = this.settings.master * this.settings.sfx * customSfxScale;
    return Math.max(0, Math.min(1, target));
  }

  getTrackBgmVolume(trackId) {
    if (trackId === 'face-off') return this.settings.faceOffBgm;
    if (trackId === 'look-a-like') return this.settings.lookALikeBgm ?? 0.22;
    if (trackId === 'dont-laugh') return this.settings.dontLaughBgm;
    return 0.35; // Global default
  }

  /**
   * Smoothly apply volume without clicks or abrupt cuts.
   */
  applyVolume(immediate = false) {
    const targetVol = this.getEffectiveBgmVolume();

    if (this.audioElement) {
      this.audioElement.muted = this.settings.muted;
      if (immediate || Math.abs(this.audioElement.volume - targetVol) < 0.02) {
        this.audioElement.volume = targetVol;
        this.currentEffectiveVolume = targetVol;
      } else {
        this.rampVolume(targetVol, 400);
      }
    }

    if (this.usingSynthFallback && this.synthBgm) {
      this.synthBgm.setVolume(targetVol);
    }
  }

  rampVolume(target, durationMs = 400) {
    if (this.volumeRampInterval) {
      clearInterval(this.volumeRampInterval);
      this.volumeRampInterval = null;
    }

    if (!this.audioElement) return;

    const startVol = this.audioElement.volume;
    const steps = 16;
    const stepTime = durationMs / steps;
    const delta = (target - startVol) / steps;
    let step = 0;

    this.volumeRampInterval = setInterval(() => {
      step++;
      const nextVol = Math.max(0, Math.min(1, startVol + delta * step));
      if (this.audioElement) {
        this.audioElement.volume = nextVol;
        this.currentEffectiveVolume = nextVol;
      }
      if (step >= steps) {
        clearInterval(this.volumeRampInterval);
        this.volumeRampInterval = null;
        if (this.audioElement) {
          this.audioElement.volume = target;
          this.currentEffectiveVolume = target;
        }
      }
    }, stepTime);
  }

  // --- Track Playback ---

  startTrack(trackId = 'global') {
    const config = TRACK_CONFIG[trackId] || TRACK_CONFIG.global;
    this.currentTrackId = trackId;

    if (trackId === 'global') {
      this.stateMultiplier = 1.0;
      this.appState = 'landing';
    } else {
      this.stateMultiplier = 0.50;
      this.appState = 'game_entered';
    }

    // Determine actual source URL: if dedicated file doesn't exist on disk, use authorized global track
    const desiredSrc = config.existsOnDisk ? config.src : (config.fallbackSrc || GLOBAL_TRACK_SRC);

    this.initAudioElement();

    if (this.audioElement) {
      // If the audio source is ALREADY the desired file, DO NOT restart!
      // Simply ensure volume matches the active state and resume if not playing.
      if (this.activeSourceUrl !== desiredSrc || !this.audioElement.src.includes(desiredSrc.replace(/^\//, ''))) {
        this.activeSourceUrl = desiredSrc;
        this.audioElement.src = desiredSrc;
        this.audioElement.currentTime = 0;
      }

      this.applyVolume(true);

      if (!this.settings.paused) {
        this.isPlaying = true;
        const promise = this.audioElement.play();
        if (promise !== undefined && promise && typeof promise.then === 'function') {
          promise
            .then(() => {
              this.isPlaying = true;
              this.autoplayBlocked = false;
              this.notify();
            })
            .catch((err) => {
              if (err.name === 'NotAllowedError') {
                this.autoplayBlocked = true;
                this.isPlaying = false;
                this.setupAutoplayUnlock();
                this.notify();
              } else {
                this.handleAssetError(config);
              }
            });
        }
      }
    }

    this.notify();
  }

  stopTrack({ fade = true } = {}) {
    // In Fun Spot's unified audio architecture, background music continues across navigation.
    // If a game explicitly calls stopTrack(), we transition volume back to navigation state rather than cutting audio.
    this.setAppState('navigation');
  }

  pauseTrack() {
    this.settings.paused = true;
    saveSettings(this.settings);
    if (this.audioElement) {
      try { this.audioElement.pause(); } catch {}
    }
    if (this.synthBgm) {
      this.synthBgm.stop();
    }
    this.isPlaying = false;
    this.notify();
  }

  resumeTrack() {
    this.settings.paused = false;
    saveSettings(this.settings);

    this.initAudioElement();
    if (this.usingSynthFallback) {
      const config = TRACK_CONFIG[this.currentTrackId] || TRACK_CONFIG.global;
      this.synthBgm.start(config.style, this.getEffectiveBgmVolume());
      this.isPlaying = true;
      this.notify();
    } else if (this.audioElement) {
      this.applyVolume(true);
      const promise = this.audioElement.play();
      if (promise && typeof promise.then === 'function') {
        promise.then(() => {
          this.isPlaying = true;
          this.autoplayBlocked = false;
          this.notify();
        }).catch((err) => {
          if (err.name === 'NotAllowedError') {
            this.autoplayBlocked = true;
            this.setupAutoplayUnlock();
            this.notify();
          }
        });
      } else {
        this.isPlaying = true;
        this.autoplayBlocked = false;
        this.notify();
      }
    }
  }

  togglePlay() {
    if (this.isPlaying && !this.settings.paused) {
      this.pauseTrack();
    } else {
      this.resumeTrack();
    }
  }

  handleAssetError(config) {
    this.assetMissing = true;
    this.assetMissingPath = config.fullPath;
    this.usingSynthFallback = true;
    console.info(`[GameAudio] Note: Background music file "${config.fullPath}" is not on disk yet. Engaging procedural arcade fallback synthesizer.`);

    if (!this.settings.paused) {
      this.synthBgm.start(config.style, this.getEffectiveBgmVolume());
      this.isPlaying = true;
    }
    this.notify();
  }

  setupAutoplayUnlock() {
    if (this.interactionHandler || typeof window === 'undefined') return;

    this.interactionHandler = () => {
      if (this.interactionHandler) {
        window.removeEventListener('pointerdown', this.interactionHandler);
        window.removeEventListener('keydown', this.interactionHandler);
        window.removeEventListener('click', this.interactionHandler);
        this.interactionHandler = null;
      }
      this.unlockAutoplay();
    };

    window.addEventListener('pointerdown', this.interactionHandler, { once: true, passive: true });
    window.addEventListener('keydown', this.interactionHandler, { once: true, passive: true });
    window.addEventListener('click', this.interactionHandler, { once: true, passive: true });
  }

  unlockAutoplay() {
    this.autoplayBlocked = false;
    if (this.interactionHandler) {
      window.removeEventListener('pointerdown', this.interactionHandler);
      window.removeEventListener('keydown', this.interactionHandler);
      window.removeEventListener('click', this.interactionHandler);
      this.interactionHandler = null;
    }

    if (!this.settings.paused) {
      if (this.usingSynthFallback) {
        const config = TRACK_CONFIG[this.currentTrackId] || TRACK_CONFIG.global;
        this.synthBgm.start(config.style, this.getEffectiveBgmVolume());
        this.isPlaying = true;
        this.notify();
      } else if (this.audioElement) {
        this.applyVolume(true);
        const p = this.audioElement.play();
        if (p && typeof p.then === 'function') {
          p.then(() => {
            this.isPlaying = true;
            this.notify();
          }).catch(() => {});
        } else {
          this.isPlaying = true;
          this.notify();
        }
      }
    }
  }

  /**
   * Duck volume smoothly during laughs, captures, or sound effects
   */
  duck(durationMs = 900, duckRatio = 0.3) {
    if (this.duckTimeout) clearTimeout(this.duckTimeout);
    this.duckMultiplier = duckRatio;
    this.applyVolume();
    this.notify();

    this.duckTimeout = setTimeout(() => {
      let current = this.duckMultiplier;
      const rampSteps = 12;
      const stepDelta = (1.0 - current) / rampSteps;
      const rampTimer = setInterval(() => {
        current = Math.min(1.0, current + stepDelta);
        this.duckMultiplier = current;
        this.applyVolume();
        if (current >= 1.0) {
          clearInterval(rampTimer);
          this.duckMultiplier = 1.0;
          this.applyVolume();
          this.notify();
        }
      }, 30);
    }, durationMs);
  }

  // --- Setting Modifiers ---

  setMasterVolume(val) {
    this.settings.master = Math.max(0, Math.min(1, Number(val) || 0));
    saveSettings(this.settings);
    this.applyVolume();
    this.notify();
  }

  setBgmVolume(trackId, val) {
    const clean = Math.max(0, Math.min(1, Number(val) || 0));
    if (trackId === 'face-off') {
      this.settings.faceOffBgm = clean;
    } else if (trackId === 'look-a-like') {
      this.settings.lookALikeBgm = clean;
    } else {
      this.settings.dontLaughBgm = clean;
    }
    saveSettings(this.settings);
    this.applyVolume();
    this.notify();
  }

  setSfxVolume(val) {
    this.settings.sfx = Math.max(0, Math.min(1, Number(val) || 0));
    saveSettings(this.settings);
    this.notify();
  }

  setMuted(muted) {
    this.settings.muted = Boolean(muted);
    saveSettings(this.settings);
    this.applyVolume();
    this.notify();
  }

  toggleMute() {
    this.setMuted(!this.settings.muted);
  }

  resetDefaults() {
    this.settings = { ...DEFAULT_SETTINGS };
    saveSettings(this.settings);
    this.applyVolume();
    this.notify();
  }

  testMusic(trackId) {
    const targetTrack = trackId || this.currentTrackId || 'global';
    if (this.isPlaying && this.currentTrackId === targetTrack) {
      this.duck(600, 0.25);
    } else {
      this.startTrack(targetTrack);
    }
  }

  getSnapshot() {
    return {
      settings: { ...this.settings },
      currentTrackId: this.currentTrackId,
      activeSourceUrl: this.activeSourceUrl,
      appState: this.appState,
      stateMultiplier: this.stateMultiplier,
      isPlaying: this.isPlaying,
      isPaused: this.settings.paused,
      isMuted: this.settings.muted,
      masterVolume: this.settings.master,
      sfxVolume: this.settings.sfx,
      currentBgmVolume: this.getTrackBgmVolume(this.currentTrackId),
      effectiveBgmVolume: this.getEffectiveBgmVolume(),
      duckMultiplier: this.duckMultiplier,
      assetMissing: this.assetMissing,
      assetMissingPath: this.assetMissingPath,
      usingSynthFallback: this.usingSynthFallback,
      autoplayBlocked: this.autoplayBlocked,
    };
  }

  subscribe(callback) {
    this.listeners.add(callback);
    try {
      callback(this.getSnapshot());
    } catch {}
    return () => {
      this.listeners.delete(callback);
    };
  }

  notify() {
    const snap = this.getSnapshot();
    this.listeners.forEach((fn) => {
      try {
        fn(snap);
      } catch (err) {
        console.warn('[GameAudio] Subscriber error:', err);
      }
    });
  }
}

export const gameAudio = new GameAudioManager();
