import { describe, expect, it } from 'vitest';
import { createHandsUpDetector } from '../detectors/handsUp';
import { createWaveDetector } from '../detectors/wave';
import { createClapDetector } from '../detectors/clap';
import { createFreezeDetector } from '../detectors/freeze';
import { createSuperheroDetector } from '../detectors/superhero';
import { createChickenFlapDetector } from '../detectors/chickenFlap';
import { createPointingDetector } from '../detectors/pointing';
import { countExtendedFingers, createFingerCountDetector } from '../detectors/fingerCount';
import { createRobotDetector } from '../detectors/robot';
import { detectors } from '../detectors';
import { makeHand, run } from './synthetic';

const ARMS_DOWN = {};
const HANDS_UP = { le: [-0.8, -0.6], lw: [-0.7, -1.4], re: [0.8, -0.6], rw: [0.7, -1.4] };
const HANDS_ON_HIPS = { le: [-1.0, 0.8], lw: [-0.5, 1.4], re: [1.0, 0.8], rw: [0.5, 1.4] };
const lerp = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
const tri = (tSec, hz) => Math.abs(((tSec * hz) % 1) * 2 - 1); // 1 → 0 → 1 triangle wave

describe('🙌 hands up', () => {
  it('completes when both hands stay up for the hold time', () => {
    const r = run(createHandsUpDetector({ holdMs: 1000 }), 2, () => HANDS_UP, { jitter: 0.03 });
    expect(r.done).toBe(true);
    expect(r.accuracy).toBeGreaterThan(0.8);
  });
  it('does not complete with arms down', () => {
    const r = run(createHandsUpDetector(), 3, () => ARMS_DOWN);
    expect(r.done).toBe(false);
    expect(r.progress).toBe(0);
  });
  it('does not complete with only one hand up', () => {
    const r = run(createHandsUpDetector(), 3, () => ({ le: HANDS_UP.le, lw: HANDS_UP.lw }));
    expect(r.done).toBe(false);
    expect(r.hint).toMatch(/BOTH/);
  });
  it('does not progress when nobody is in frame', () => {
    const r = run(createHandsUpDetector(), 2, () => null);
    expect(r.progress).toBe(0);
  });
});

describe('👋 wave', () => {
  const waving = (tSec) => ({ re: [0.9, -0.3], rw: [0.9 + (tri(tSec, 1.5) - 0.5) * 0.7, -1.1] });
  it('completes after ~3 s of continuous waving', () => {
    const r = run(createWaveDetector({ activeMs: 3000 }), 6, waving, { jitter: 0.02 });
    expect(r.done).toBe(true);
    expect(r.eventCount).toBeGreaterThanOrEqual(2);
  });
  it('does not count a hand swinging below the elbow', () => {
    const r = run(createWaveDetector(), 6, (t) => ({ rw: [0.7 + (tri(t, 1.5) - 0.5) * 0.7, 1.45] }));
    expect(r.done).toBe(false);
  });
  it('does not count a raised hand held still', () => {
    const r = run(createWaveDetector(), 6, () => ({ re: [0.9, -0.3], rw: [0.9, -1.1] }), { jitter: 0.03 });
    expect(r.done).toBe(false);
    expect(r.progress).toBe(0);
  });
});

describe('👏 clap', () => {
  const clapping = (hz) => (tSec) => {
    const k = tri(tSec, hz); // 1 = apart, 0 = together
    return { lw: [-0.05 - 0.6 * k, 0.9], rw: [0.05 + 0.6 * k, 0.9] };
  };
  it('counts 5 claps', () => {
    const r = run(createClapDetector({ count: 5 }), 6, clapping(1.5), { jitter: 0.02 });
    expect(r.done).toBe(true);
    expect(r.count).toBe(5);
  });
  it('reports partial progress for fewer claps', () => {
    const r = run(createClapDetector({ count: 5 }), 1.9, clapping(1.5));
    expect(r.count).toBeGreaterThanOrEqual(2);
    expect(r.count).toBeLessThan(5);
    expect(r.done).toBe(false);
  });
  it('does not double-count jitter around the threshold', () => {
    // hands held together but trembling across the "close" line
    const r = run(createClapDetector(), 4, (t) => ({ lw: [-0.2 - 0.05 * Math.sin(t * 40), 0.9], rw: [0.2, 0.9] }));
    expect(r.count).toBe(0);
  });
});

describe('🗿 freeze', () => {
  it('completes when the player stays still for 3 s (with detector jitter)', () => {
    const r = run(createFreezeDetector({ holdMs: 3000 }), 5, () => ARMS_DOWN, { jitter: 0.02 });
    expect(r.done).toBe(true);
  });
  it('fails while the player keeps moving', () => {
    const r = run(createFreezeDetector(), 5, (t) => ({ lw: [-0.7 + Math.sin(t * 6) * 0.5, 1.45], rw: [0.7, 1.45] }));
    expect(r.done).toBe(false);
    expect(r.progress).toBeLessThan(0.5);
  });
});

describe('🦸 superhero', () => {
  it('accepts hands-on-hips with small differences', () => {
    const r = run(createSuperheroDetector(), 2, () => HANDS_ON_HIPS, { jitter: 0.1 });
    expect(r.done).toBe(true);
  });
  it('accepts the flying pose', () => {
    const r = run(createSuperheroDetector(), 2, () => ({ ...HANDS_ON_HIPS, le: [-0.6, -0.8], lw: [-0.6, -1.5] }));
    expect(r.done).toBe(true);
  });
  it('rejects a neutral stance', () => {
    const r = run(createSuperheroDetector(), 3, () => ARMS_DOWN);
    expect(r.done).toBe(false);
  });
});

describe('🐔 chicken flap', () => {
  const flapping = (tSec) => {
    const k = tri(tSec, 1.5); // 1 = elbows down, 0 = elbows up
    return { le: [-0.9, 0.15 + 0.6 * k], re: [0.9, 0.15 + 0.6 * k], lw: [-0.4, 0.3], rw: [0.4, 0.3] };
  };
  it('counts 6 flaps', () => {
    const r = run(createChickenFlapDetector({ count: 6 }), 8, flapping, { jitter: 0.02 });
    expect(r.done).toBe(true);
    expect(r.accuracy).toBeGreaterThan(0.6);
  });
  it('ignores arms held still', () => {
    const r = run(createChickenFlapDetector(), 6, () => ARMS_DOWN, { jitter: 0.03 });
    expect(r.count).toBe(0);
  });
});

describe('👉 pointing', () => {
  const pointLeft = { le: [-1.3, 0], lw: [-2.1, -0.05] };
  it('detects pointing to the player’s LEFT', () => {
    expect(run(createPointingDetector({ direction: 'left' }), 2, () => pointLeft).done).toBe(true);
  });
  it('rejects the wrong direction and says so', () => {
    const r = run(createPointingDetector({ direction: 'right' }), 2, () => pointLeft);
    expect(r.done).toBe(false);
    expect(r.hint).toMatch(/Other way/);
  });
  it('accepts cross-body pointing', () => {
    const r = run(createPointingDetector({ direction: 'left' }), 2, () => ({ re: [-0.2, 0.1], rw: [-1.6, 0.0] }));
    expect(r.done).toBe(true);
  });
});

describe('✋ finger count', () => {
  const hands = {
    0: {},
    1: { index: true },
    2: { index: true, middle: true },
    3: { index: true, middle: true, ring: true },
    4: { index: true, middle: true, ring: true, pinky: true },
    5: { thumb: true, index: true, middle: true, ring: true, pinky: true },
  };
  it.each(Object.entries(hands))('counts %s fingers', (n, spec) => {
    expect(countExtendedFingers(makeHand(spec))).toBe(Number(n));
  });
  it('counts a thumbs-up-style thumb', () => {
    expect(countExtendedFingers(makeHand({ thumb: true }))).toBe(1);
  });
  it('completes when the target count is held', () => {
    const r = run(createFingerCountDetector({ target: 3 }), 2, () => ARMS_DOWN, {
      handsAt: () => [{ lm: makeHand(hands[3]), handedness: 'Right' }],
    });
    expect(r.done).toBe(true);
  });
  it('does not complete with the wrong count', () => {
    const r = run(createFingerCountDetector({ target: 3 }), 2, () => ARMS_DOWN, {
      handsAt: () => [{ lm: makeHand(hands[2]), handedness: 'Left' }],
    });
    expect(r.done).toBe(false);
    expect(r.hint).toMatch(/I see 2 fingers/);
  });
});

describe('🤖 robot', () => {
  // stop 300 ms → sharp 250 ms move → stop … alternating between two poses
  const robotic = (tSec) => {
    const cycle = 0.55;
    const step = Math.floor(tSec / cycle);
    const phase = (tSec % cycle) / cycle;
    const from = step % 2 ? HANDS_UP : ARMS_DOWN;
    const to = step % 2 ? ARMS_DOWN : HANDS_UP;
    const k = phase < 0.55 ? 0 : Math.min(1, (phase - 0.55) / 0.45);
    const blend = (key, fallback) => lerp(from[key] ?? fallback, to[key] ?? fallback, k);
    return { le: blend('le', [-0.65, 0.75]), re: blend('re', [0.65, 0.75]), lw: blend('lw', [-0.7, 1.45]), rw: blend('rw', [0.7, 1.45]) };
  };
  it('counts stop-go robot beats', () => {
    const r = run(createRobotDetector({ beats: 6, minSpanMs: 3500 }), 8, robotic, { jitter: 0.01 });
    expect(r.done).toBe(true);
  });
  it('does not reward smooth continuous movement', () => {
    const smooth = (t) => ({ lw: [-0.7 + Math.sin(t * 3) * 0.8, 0.6 + Math.cos(t * 3) * 0.8], rw: [0.7, 1.45] });
    const r = run(createRobotDetector(), 8, smooth);
    expect(r.done).toBe(false);
    expect(r.count).toBe(0);
  });
});

describe('🔥 combo', () => {
  const steps = [
    { detector: 'handsUp', params: { holdMs: 600 }, label: 'HANDS UP' },
    { detector: 'freeze', params: { holdMs: 1000 }, label: 'FREEZE' },
  ];
  it('advances through the steps in order', () => {
    const combo = detectors.combo({ steps });
    const first = run(combo, 0.9, () => HANDS_UP); // step 1 done, step 2 just started
    expect(first.done).toBe(false);
    expect(first.stepState).toBe('COMBO_STEP_2');
    const second = run(combo, 3, () => ARMS_DOWN, { start: 3000, jitter: 0.01 });
    expect(second.done).toBe(true);
    expect(second.stepState).toBe('SUCCESS');
  });
  it('does not skip a step done out of order', () => {
    const combo = detectors.combo({ steps: [...steps].reverse() });
    // hands up first does not satisfy the leading FREEZE step while moving
    const r = run(combo, 2, (t) => (t < 1 ? HANDS_UP : ARMS_DOWN));
    expect(r.stepState).toBe('COMBO_STEP_1');
  });
});
