import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { gameAudio, TRACK_CONFIG, DEFAULT_SETTINGS } from '../gameAudio';

describe('Game Audio & Mixing Service (Don\'t Laugh & Face Off)', () => {
  let playSpy;
  let pauseSpy;

  beforeEach(() => {
    localStorage.clear();
    gameAudio.resetDefaults();
    playSpy = vi.fn().mockResolvedValue(undefined);
    pauseSpy = vi.fn();

    global.Audio = class MockAudio {
      constructor() {
        this.src = '';
        this.loop = false;
        this.volume = 1;
        this.muted = false;
        this.currentTime = 0;
        this._listeners = {};
      }
      play() {
        return playSpy();
      }
      pause() {
        pauseSpy();
      }
      addEventListener(event, fn) {
        this._listeners[event] = this._listeners[event] || [];
        this._listeners[event].push(fn);
      }
      removeEventListener(event, fn) {
        if (!this._listeners[event]) return;
        this._listeners[event] = this._listeners[event].filter((f) => f !== fn);
      }
      dispatchEvent(event) {
        (this._listeners[event.type] || []).forEach((fn) => fn(event));
      }
    };
  });

  afterEach(() => {
    gameAudio.stopTrack({ fade: false });
    vi.restoreAllMocks();
  });

  it('configures both required game tracks accurately', () => {
    expect(TRACK_CONFIG['dont-laugh'].src).toBe('/assets/audio/dont-laugh-bg.mp3');
    expect(TRACK_CONFIG['dont-laugh'].fullPath).toBe('public/assets/audio/dont-laugh-bg.mp3');
    expect(TRACK_CONFIG['dont-laugh'].defaultBgmVolume).toBe(0.25);

    expect(TRACK_CONFIG['face-off'].src).toBe('/assets/audio/face-off-bg.mp3');
    expect(TRACK_CONFIG['face-off'].fullPath).toBe('public/assets/audio/face-off-bg.mp3');
    expect(TRACK_CONFIG['face-off'].defaultBgmVolume).toBe(0.20);
  });

  it('initializes with exact required default volumes', () => {
    const snap = gameAudio.getSnapshot();
    expect(snap.settings.master).toBe(0.80);
    expect(snap.settings.dontLaughBgm).toBe(0.25);
    expect(snap.settings.faceOffBgm).toBe(0.20);
    expect(snap.settings.sfx).toBe(0.65);
    expect(snap.settings.muted).toBe(false);
  });

  it('computes effective BGM and SFX volumes proportionally', () => {
    // Master = 0.8, Don't Laugh BGM = 0.25, Active Game 50% rule -> Effective BGM = 0.8 * 0.25 * 0.5 = 0.10
    gameAudio.startTrack('dont-laugh');
    expect(gameAudio.getEffectiveBgmVolume()).toBeCloseTo(0.10, 2);

    // Master = 0.8, SFX = 0.65 -> Effective SFX = 0.8 * 0.65 = 0.52
    expect(gameAudio.getEffectiveSfxVolume()).toBeCloseTo(0.52, 2);
  });

  it('updates and persists master volume within [0, 1]', () => {
    gameAudio.setMasterVolume(0.5);
    expect(gameAudio.getSnapshot().settings.master).toBe(0.5);
    expect(JSON.parse(localStorage.getItem('funspot.audio.settings')).master).toBe(0.5);

    gameAudio.setMasterVolume(1.8);
    expect(gameAudio.getSnapshot().settings.master).toBe(1.0);

    gameAudio.setMasterVolume(-0.4);
    expect(gameAudio.getSnapshot().settings.master).toBe(0.0);
  });

  it('updates game-specific BGM volume independently', () => {
    gameAudio.setBgmVolume('dont-laugh', 0.40);
    expect(gameAudio.getSnapshot().settings.dontLaughBgm).toBe(0.40);
    expect(gameAudio.getSnapshot().settings.faceOffBgm).toBe(0.20);

    gameAudio.setBgmVolume('face-off', 0.35);
    expect(gameAudio.getSnapshot().settings.faceOffBgm).toBe(0.35);
    expect(gameAudio.getSnapshot().settings.dontLaughBgm).toBe(0.40);
  });

  it('updates and persists SFX volume', () => {
    gameAudio.setSfxVolume(0.75);
    expect(gameAudio.getSnapshot().settings.sfx).toBe(0.75);
    expect(JSON.parse(localStorage.getItem('funspot.audio.settings')).sfx).toBe(0.75);
  });

  it('toggles mute and silences effective volume', () => {
    gameAudio.startTrack('dont-laugh');
    expect(gameAudio.getEffectiveBgmVolume()).toBeGreaterThan(0);

    gameAudio.toggleMute();
    expect(gameAudio.getSnapshot().isMuted).toBe(true);
    expect(gameAudio.getEffectiveBgmVolume()).toBe(0);
    expect(gameAudio.getEffectiveSfxVolume()).toBe(0);

    gameAudio.toggleMute();
    expect(gameAudio.getSnapshot().isMuted).toBe(false);
    expect(gameAudio.getEffectiveBgmVolume()).toBeGreaterThan(0);
  });

  it('ducks BGM volume smoothly during sound effects and returns', () => {
    vi.useFakeTimers();
    gameAudio.startTrack('dont-laugh');
    const normalVol = gameAudio.getEffectiveBgmVolume();

    // Trigger ducking
    gameAudio.duck(500, 0.25);
    expect(gameAudio.getSnapshot().duckMultiplier).toBe(0.25);
    expect(gameAudio.getEffectiveBgmVolume()).toBeCloseTo(normalVol * 0.25, 2);

    // Fast-forward past hold duration and ramp
    vi.advanceTimersByTime(500 + 400);
    expect(gameAudio.getSnapshot().duckMultiplier).toBe(1.0);
    expect(gameAudio.getEffectiveBgmVolume()).toBeCloseTo(normalVol, 2);

    vi.useRealTimers();
  });

  it('activates procedural Web Audio fallback synthesizer on asset load error', () => {
    gameAudio.startTrack('dont-laugh');
    // Simulate error event on HTMLAudioElement
    gameAudio.audioElement.dispatchEvent(typeof Event === 'function' ? new Event('error') : { type: 'error' });

    const snap = gameAudio.getSnapshot();
    expect(snap.assetMissing).toBe(true);
    expect(snap.assetMissingPath).toBe('public/assets/audio/dont-laugh-bg.mp3');
    expect(snap.usingSynthFallback).toBe(true);
    expect(snap.isPlaying).toBe(true);
  });

  it('resets all audio settings cleanly to defaults', () => {
    gameAudio.setMasterVolume(0.1);
    gameAudio.setBgmVolume('dont-laugh', 0.9);
    gameAudio.setSfxVolume(0.2);
    gameAudio.setMuted(true);

    gameAudio.resetDefaults();
    const snap = gameAudio.getSnapshot();
    expect(snap.settings.master).toBe(DEFAULT_SETTINGS.master);
    expect(snap.settings.dontLaughBgm).toBe(DEFAULT_SETTINGS.dontLaughBgm);
    expect(snap.settings.faceOffBgm).toBe(DEFAULT_SETTINGS.faceOffBgm);
    expect(snap.settings.sfx).toBe(DEFAULT_SETTINGS.sfx);
    expect(snap.settings.muted).toBe(false);
  });
});

