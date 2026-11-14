/**
 * Tiny arcade sound kit synthesized with the Web Audio API — no audio files to
 * load or lose. Every call is fire-and-forget and silently does nothing when
 * audio is unavailable or muted.
 *
 * Integrated with gameAudio for Master volume, SFX volume, and ducking.
 */
import { gameAudio } from '../services/gameAudio';

const MUTE_KEY = 'funspot.muted';
let context = null;
let muted = (() => {
  try {
    return localStorage.getItem(MUTE_KEY) === '1' || gameAudio.settings.muted;
  } catch {
    return false;
  }
})();

function audio() {
  if (muted || gameAudio.settings.muted) return null;
  try {
    if (!context) {
      const AudioContextClass = window.AudioContext ?? window.webkitAudioContext;
      if (!AudioContextClass) return null;
      context = new AudioContextClass();
    }
    if (context.state === 'suspended') context.resume().catch(() => {});
    return context;
  } catch {
    return null;
  }
}

function tone({ freq, to, type = 'square', duration = 0.12, volume = 0.06, delay = 0 }) {
  const ctx = audio();
  if (!ctx) return;
  try {
    const sfxScale = gameAudio ? gameAudio.getEffectiveSfxVolume() / 0.52 : 1.0;
    const finalVolume = Math.max(0.0001, volume * sfxScale);
    const start = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    if (to) osc.frequency.exponentialRampToValueAtTime(to, start + duration);
    gain.gain.setValueAtTime(finalVolume, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start(start);
    osc.stop(start + duration + 0.02);
  } catch {
    // never let sound break the game
  }
}

export const sfx = {
  /** Call from a click/keypress so browsers allow audio later. */
  unlock: () => audio(),
  shuffle: () => tone({ freq: 520 + Math.random() * 380, type: 'triangle', duration: 0.05, volume: 0.04 }),
  reveal: () => {
    gameAudio.duck(700, 0.4);
    [523, 659, 784, 1047].forEach((freq, i) => tone({ freq, delay: i * 0.08, duration: 0.14 }));
  },
  tick: () => tone({ freq: 660, duration: 0.1, volume: 0.07 }),
  go: () => tone({ freq: 880, to: 1760, type: 'sawtooth', duration: 0.35, volume: 0.06 }),
  point: () => tone({ freq: 988, to: 1480, type: 'triangle', duration: 0.09, volume: 0.06 }),
  step: () => [784, 1175].forEach((freq, i) => tone({ freq, delay: i * 0.07, type: 'triangle', duration: 0.12 })),
  complete: () => {
    gameAudio.duck(1000, 0.3);
    [523, 659, 784, 1047, 1319].forEach((freq, i) => tone({ freq, delay: i * 0.09, type: 'triangle', duration: 0.2, volume: 0.07 }));
  },
  timeout: () => {
    gameAudio.duck(800, 0.35);
    tone({ freq: 392, to: 147, type: 'sawtooth', duration: 0.5, volume: 0.05 });
  },
  score: () => tone({ freq: 1200, type: 'square', duration: 0.03, volume: 0.025 }),
  whoosh: () => tone({ freq: 180, to: 1400, type: 'sawtooth', duration: 0.55, volume: 0.04 }),
  powerUp: () => [660, 990, 1320].forEach((freq, i) => tone({ freq, delay: i * 0.05, type: 'triangle', duration: 0.12, volume: 0.05 })),
  shutter: () => {
    gameAudio.duck(900, 0.25);
    tone({ freq: 2200, to: 400, type: 'square', duration: 0.06, volume: 0.06 });
    tone({ freq: 1600, to: 300, type: 'square', duration: 0.08, volume: 0.05, delay: 0.07 });
  },
};

export const isMuted = () => muted || gameAudio.settings.muted;

export function setMuted(value) {
  muted = Boolean(value);
  gameAudio.setMuted(muted);
  try {
    localStorage.setItem(MUTE_KEY, value ? '1' : '0');
  } catch {
    // preference just won't persist
  }
}
