import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { landingMusic, AUDIO_SRC, TRACK_TITLE } from '../landingMusic';
import { gameAudio } from '../gameAudio';

describe('Landing Page Background Music Service', () => {
  let playSpy;
  let pauseSpy;

  beforeEach(() => {
    localStorage.clear();
    gameAudio.resetDefaults();
    playSpy = vi.fn().mockResolvedValue(undefined);
    pauseSpy = vi.fn();

    // Mock HTMLAudioElement
    global.Audio = class MockAudio {
      constructor() {
        this.src = '';
        this.loop = false;
        this.volume = 1;
        this.muted = false;
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
    vi.restoreAllMocks();
  });

  it('configures the required Axel F audio track', () => {
    expect(AUDIO_SRC).toBe('/assets/audio/crazy-frog-axel-f.mp3');
    expect(TRACK_TITLE).toBe('Crazy Frog - Axel F');
  });

  it('initializes with reasonable default volume', () => {
    const state = landingMusic.getState();
    expect(state.volume).toBeGreaterThan(0);
  });

  it('allows setting volume and clamps between 0 and 1', () => {
    landingMusic.setVolume(0.5);
    expect(landingMusic.getState().volume).toBe(0.5);

    landingMusic.setVolume(1.5);
    expect(landingMusic.getState().volume).toBe(1.0);

    landingMusic.setVolume(-0.2);
    expect(landingMusic.getState().volume).toBe(0);
  });

  it('allows toggling mute and persists to localStorage', () => {
    const initialMuted = landingMusic.getState().isMuted;
    landingMusic.toggleMute();
    expect(landingMusic.getState().isMuted).toBe(!initialMuted);
    expect(JSON.parse(localStorage.getItem('funspot.audio.settings')).muted).toBe(!initialMuted);

    landingMusic.toggleMute();
    expect(landingMusic.getState().isMuted).toBe(initialMuted);
  });

  it('smoothly transitions application volume when entering game mode without cutting playback', () => {
    landingMusic.enterLanding();
    expect(gameAudio.getSnapshot().stateMultiplier).toBe(1.0);

    // Leaving landing page transitions to game entered state at 50% volume
    landingMusic.leaveLanding();
    expect(gameAudio.getSnapshot().stateMultiplier).toBe(0.50);
  });

  it('pauses and resumes on user toggle', () => {
    landingMusic.enterLanding();
    landingMusic.togglePlay(); // pause
    expect(landingMusic.getState().isPaused).toBe(true);

    landingMusic.togglePlay(); // resume
    expect(landingMusic.getState().isPaused).toBe(false);
  });
});
