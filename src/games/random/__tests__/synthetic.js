/**
 * Synthetic landmark generators for detector tests.
 * Poses are described in BODY units (origin = shoulder midpoint, 1 = shoulder
 * width, player's left = negative x, y down) and converted to frame space.
 */
const ORIGIN = { x: 0.66, y: 0.4 };
const SCALE = 0.2;
const ASPECT = 4 / 3;

const DEFAULT_BODY = {
  nose: [0, -0.9],
  ls: [-0.5, 0],
  rs: [0.5, 0],
  le: [-0.65, 0.75],
  re: [0.65, 0.75],
  lw: [-0.7, 1.45],
  rw: [0.7, 1.45],
  lh: [-0.35, 1.4],
  rh: [0.35, 1.4],
};

const INDEX = { nose: 0, ls: 11, rs: 12, le: 13, re: 14, lw: 15, rw: 16, lh: 23, rh: 24 };

/** @param {Partial<typeof DEFAULT_BODY>} parts @param {number} jitter body-unit noise */
export function makePose(parts = {}, { jitter = 0, hidden = [] } = {}) {
  const spec = { ...DEFAULT_BODY, ...parts };
  const lm = Array.from({ length: 33 }, () => ({ x: ORIGIN.x, y: ORIGIN.y + 2 * SCALE, z: 0, v: 0.9 }));
  for (const [key, index] of Object.entries(INDEX)) {
    const [bx, by] = spec[key];
    const noise = () => (Math.random() * 2 - 1) * jitter;
    lm[index] = {
      x: ORIGIN.x + (bx + noise()) * SCALE,
      y: ORIGIN.y + (by + noise()) * SCALE,
      z: 0,
      v: hidden.includes(key) ? 0.05 : 0.95,
    };
  }
  return lm;
}

export const frame = (t, pose, hands = []) => ({ t, aspect: ASPECT, pose, hands });

/** Feeds `seconds` of frames at `fps` into a detector; `poseAt(tSec)` returns body parts. */
export function run(detector, seconds, poseAt, { fps = 30, start = 0, jitter = 0, handsAt } = {}) {
  let last;
  const events = [];
  const frames = Math.round(seconds * fps);
  for (let i = 0; i <= frames; i += 1) {
    const tSec = i / fps;
    const parts = poseAt(tSec);
    const pose = parts === null ? null : makePose(parts, { jitter });
    last = detector.update(frame(start + tSec * 1000, pose, handsAt ? handsAt(tSec) : []));
    events.push(...last.events);
    if (last.done) break;
  }
  return { ...last, eventCount: events.length };
}

/** 21 hand landmarks, palm facing camera, fingers up; `extended` = which fingers are out. */
export function makeHand({ thumb = false, index = false, middle = false, ring = false, pinky = false } = {}) {
  const base = { x: 0.6, y: 0.5 };
  const p = (x, y) => ({ x: base.x + x, y: base.y + y, z: 0, v: 1 });
  const finger = (x, out) =>
    out ? [p(x, -0.1), p(x, -0.15), p(x, -0.18), p(x, -0.21)] : [p(x, -0.1), p(x, -0.14), p(x, -0.11), p(x, -0.09)];
  const thumbPts = thumb
    ? [p(-0.03, -0.03), p(-0.05, -0.05), p(-0.07, -0.07), p(-0.1, -0.09)]
    : [p(-0.03, -0.03), p(-0.04, -0.05), p(-0.03, -0.07), p(0.0, -0.08)];
  return [
    p(0, 0),
    ...thumbPts,
    ...finger(-0.03, index),
    ...finger(0, middle),
    ...finger(0.025, ring),
    ...finger(0.05, pinky),
  ];
}
