import { describe, expect, it } from 'vitest';
import { CATEGORIES, CHARACTERS } from '../characters';
import { pickCharacter } from '../randomCharacter';
import { createInitialState, mirrorReducer, PHASE } from '../mirrorMachine';
import { computeFaceGeometry, createFaceSmoother, FACE } from '../faceGeometry';
import { characterSources, spriteKey } from '../effects/assets';
import { mannequinGeometry } from '../effects/preview';

// ---------- synthetic face (aspect units, mirrored like toFaceFrame) ----------
const BASE = {
  [FACE.TOP]: [0, -0.62],
  [FACE.CHIN]: [0, 0.58],
  [FACE.LEFT_SIDE]: [-0.5, 0],
  [FACE.RIGHT_SIDE]: [0.5, 0],
  [FACE.LEFT_EYE_OUTER]: [-0.31, -0.12],
  [FACE.LEFT_EYE_INNER]: [-0.11, -0.12],
  [FACE.RIGHT_EYE_OUTER]: [0.31, -0.12],
  [FACE.RIGHT_EYE_INNER]: [0.11, -0.12],
  [FACE.LEFT_IRIS]: [-0.2, -0.12],
  [FACE.RIGHT_IRIS]: [0.2, -0.12],
  [FACE.NOSE_TIP]: [0, 0.15],
  [FACE.SUBNASAL]: [0, 0.22],
  [FACE.LIP_TOP]: [0, 0.27],
  [FACE.UPPER_LIP_INNER]: [0, 0.3],
  [FACE.LOWER_LIP_INNER]: [0, 0.31],
  [FACE.LEFT_CHEEK]: [-0.28, 0.12],
  [FACE.RIGHT_CHEEK]: [0.28, 0.12],
};

/** Face at (cx, cy), `width` wide, rolled by `roll` rad, nose pushed sideways by `yawShift`. */
function face({ cx = 0.66, cy = 0.5, width = 0.3, roll = 0, yawShift = 0 } = {}) {
  const points = Array.from({ length: 478 }, () => ({ x: cx, y: cy, z: 0 }));
  for (const [index, [bx, by]] of Object.entries(BASE)) {
    const x0 = (bx + (Number(index) === FACE.NOSE_TIP ? yawShift : 0)) * width;
    const y0 = by * width;
    points[index] = {
      x: cx + x0 * Math.cos(roll) - y0 * Math.sin(roll),
      y: cy + x0 * Math.sin(roll) + y0 * Math.cos(roll),
      z: 0,
    };
  }
  return points;
}

describe('character config', () => {
  it('has all three categories populated', () => {
    for (const category of CATEGORIES) {
      expect(CHARACTERS.filter((c) => c.category === category.id).length).toBeGreaterThanOrEqual(4);
    }
  });

  it('has unique ids and valid layers', () => {
    const anchors = Object.keys(mannequinGeometry(100).anchors);
    expect(new Set(CHARACTERS.map((c) => c.id)).size).toBe(CHARACTERS.length);
    for (const character of CHARACTERS) {
      expect(CATEGORIES.map((c) => c.id)).toContain(character.category);
      expect(character.layers.length).toBeGreaterThan(0);
      for (const layer of character.layers) {
        const names = Array.isArray(layer.anchor) ? layer.anchor : [layer.anchor];
        names.forEach((name) => expect(anchors).toContain(name));
        if (layer.kind !== 'googly') expect(typeof layer.asset).toBe('string');
        if (layer.pair && Array.isArray(layer.anchor)) expect(layer.anchor).toHaveLength(2);
      }
      for (const source of characterSources(character)) expect(spriteKey(source)).toBeTruthy();
    }
  });
});

describe('random character draw', () => {
  it('never repeats any of the last 2 characters and reaches every character and category', () => {
    const recent = [];
    const seen = new Set();
    const categories = new Set();
    for (let i = 0; i < 3000; i += 1) {
      const { category, character } = pickCharacter(recent);
      expect(recent.slice(-2)).not.toContain(character.id);
      expect(character.category).toBe(category.id);
      recent.push(character.id);
      seen.add(character.id);
      categories.add(category.id);
    }
    expect(seen.size).toBe(CHARACTERS.length);
    expect(categories.size).toBe(CATEGORIES.length);
  }, 15000);

  it('picks the category at random (not a fixed rotation)', () => {
    const sequence = Array.from({ length: 60 }, () => pickCharacter().category.id).join(',');
    const rotation = Array.from({ length: 20 }, () => 'anime,cartoon,indian').join(',');
    expect(sequence).not.toBe(rotation);
  });

  it('still works with tiny pools (no infinite loop)', () => {
    const solo = [{ id: 'only', category: 'anime' }];
    expect(pickCharacter(['only', 'only'], Math.random, solo).character.id).toBe('only');
    const two = [
      { id: 'a', category: 'anime' },
      { id: 'b', category: 'cartoon' },
    ];
    expect(pickCharacter(['a', 'b'], Math.random, two).character.id).toBe('a'); // only 'b' is excluded
  });
});

describe('mirror state machine', () => {
  const pick = (id) => ({ category: CATEGORIES[0], character: { id } });

  it('walks the whole flow and replays with a fresh round', () => {
    let s = createInitialState();
    s = mirrorReducer(s, { type: 'START' });
    expect(s.phase).toBe(PHASE.CAMERA_SETUP);
    s = mirrorReducer(s, { type: 'CAMERA_READY', pick: pick('ninja') });
    expect(s.phase).toBe(PHASE.RANDOMIZING_CATEGORY);
    for (const type of ['CATEGORY_DONE', 'CHARACTER_DONE', 'TRANSFORM', 'TRANSFORMED']) s = mirrorReducer(s, { type, round: s.round });
    expect(s.phase).toBe(PHASE.LIVE_MIRROR);
    s = mirrorReducer(s, { type: 'CAPTURE' });
    s = mirrorReducer(s, { type: 'SNAPPED', round: s.round, capture: { url: 'blob:x' } });
    s = mirrorReducer(s, { type: 'SHOW_RESULT', round: s.round });
    expect(s.phase).toBe(PHASE.RESULT);
    expect(s.capture.url).toBe('blob:x');

    const again = mirrorReducer(s, { type: 'CAPTURE_AGAIN' });
    expect(again.phase).toBe(PHASE.LIVE_MIRROR);
    expect(again.capture).toBeNull();

    const next = mirrorReducer(s, { type: 'REROLL', pick: pick('samurai') });
    expect(next.phase).toBe(PHASE.RANDOMIZING_CATEGORY);
    expect(next.round).toBe(s.round + 1);
    expect(next.capture).toBeNull();
    expect(next.pick.character.id).toBe('samurai');
    expect(next.recent).toEqual(['ninja', 'samurai']);
  });

  it('ignores stale timers and out-of-order actions', () => {
    let s = mirrorReducer(createInitialState(), { type: 'START' });
    s = mirrorReducer(s, { type: 'CAMERA_READY', pick: pick('a') });
    const stale = s.round - 1;
    expect(mirrorReducer(s, { type: 'CATEGORY_DONE', round: stale })).toBe(s);
    expect(mirrorReducer(s, { type: 'CAPTURE' })).toBe(s);
    expect(mirrorReducer(s, { type: 'TRANSFORMED', round: s.round })).toBe(s);
  });

  it('recovers from asset errors', () => {
    let s = mirrorReducer(createInitialState(), { type: 'START' });
    s = mirrorReducer(s, { type: 'CAMERA_READY', pick: pick('a') });
    for (const type of ['CATEGORY_DONE', 'CHARACTER_DONE', 'TRANSFORM', 'ASSETS_FAILED']) s = mirrorReducer(s, { type, round: s.round });
    expect(s.phase).toBe(PHASE.ASSET_ERROR);
    expect(mirrorReducer(s, { type: 'RETRY_ASSETS' }).phase).toBe(PHASE.TRANSFORMING);
    expect(mirrorReducer(s, { type: 'REROLL', pick: pick('b') }).phase).toBe(PHASE.RANDOMIZING_CATEGORY);
  });
});

describe('face geometry', () => {
  const H = 720;
  it('measures position and size in pixels', () => {
    const g = computeFaceGeometry(face({ cx: 0.66, cy: 0.5, width: 0.3 }), null, H);
    expect(g.width).toBeCloseTo(0.3 * H, 3);
    expect(g.anchors.center.x).toBeCloseTo(0.66 * H, 3);
    expect(g.anchors.top.y).toBeLessThan(g.anchors.eyes.y);
    expect(g.anchors.eyes.y).toBeLessThan(g.anchors.nose.y);
    expect(g.anchors.nose.y).toBeLessThan(g.anchors.chin.y);
    expect(g.anchors.leftEye.x).toBeLessThan(g.anchors.rightEye.x);
  });

  it('follows the face when it moves and scales with distance', () => {
    const near = computeFaceGeometry(face({ cx: 0.4, width: 0.45 }), null, H);
    const far = computeFaceGeometry(face({ cx: 0.9, width: 0.2 }), null, H);
    expect(near.anchors.center.x).toBeLessThan(far.anchors.center.x);
    expect(near.width / far.width).toBeCloseTo(0.45 / 0.2, 3);
  });

  it('reads head tilt (roll) and turn (yaw)', () => {
    expect(computeFaceGeometry(face({ roll: 0.3 }), null, H).roll).toBeCloseTo(0.3, 3);
    expect(computeFaceGeometry(face({ roll: -0.25 }), null, H).roll).toBeCloseTo(-0.25, 3);
    expect(computeFaceGeometry(face(), null, H).yaw).toBeCloseTo(0, 3);
    expect(computeFaceGeometry(face({ yawShift: 0.12 }), null, H).yaw).toBeGreaterThan(0.3);
    expect(computeFaceGeometry(face({ yawShift: -0.12 }), null, H).yaw).toBeLessThan(-0.3);
  });

  it('uses blendshapes for blinks and mouth', () => {
    const g = computeFaceGeometry(face(), { eyeBlinkLeft: 0.9, eyeBlinkRight: 0.1, jawOpen: 0.7 }, H);
    expect(g.blinkLeft).toBe(0.9);
    expect(g.mouthOpen).toBe(0.7);
  });

  it('smooths jitter but snaps back after the face was lost', () => {
    const smoother = createFaceSmoother();
    const a = computeFaceGeometry(face({ cx: 0.5 }), null, H);
    const b = computeFaceGeometry(face({ cx: 0.502 }), null, H); // 1–2 px of jitter
    smoother.update(a, 0);
    const smoothed = smoother.update(b, 33);
    expect(smoothed.anchors.center.x).toBeGreaterThan(a.anchors.center.x);
    expect(smoothed.anchors.center.x).toBeLessThan(b.anchors.center.x);
    const far = computeFaceGeometry(face({ cx: 1.0 }), null, H);
    expect(smoother.update(far, 2000).anchors.center.x).toBeCloseTo(far.anchors.center.x, 3);
  });
});
