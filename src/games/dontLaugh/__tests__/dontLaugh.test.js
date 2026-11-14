import { describe, expect, it, vi } from 'vitest';
import { createCalibrator, createLaughDetector, DEFAULT_BASELINE, extractLaughFeatures, meterPercent, scoreLaugh } from '../laughDetector';
import { createFrameBuffer } from '../frameBuffer';
import { CONTENT, createContentDeck, pickContent } from '../content';
import { createInitialState, dontLaughReducer, PHASE } from '../dontLaughMachine';
import { LAUGH, meterState } from '../gameConfig';
import { createCaptureUploader } from '../../../services/dontLaughCapture';

// ---------- synthetic faces (mirrored convention: 263 screen-left, 33 screen-right) ----------
function face({ mouthWidth = 0.4, mouthOpen = 0.01, cornerLift = 0, roll = 0, noseDy = 0, cx = 0.6, size = 0.3 } = {}) {
  const fw = size;
  const fh = size * 1.2;
  const pts = Array.from({ length: 478 }, () => ({ x: cx, y: 0.5, z: 0 }));
  const lipY = 0.35 * fh;
  const set = (i, x, y) => {
    pts[i] = {
      x: cx + x * Math.cos(roll) - y * Math.sin(roll),
      y: 0.5 + x * Math.sin(roll) + y * Math.cos(roll),
      z: 0,
    };
  };
  set(10, 0, -0.55 * fh);
  set(152, 0, 0.65 * fh);
  set(454, -fw / 2, 0);
  set(234, fw / 2, 0);
  set(263, -0.31 * fw, -0.1 * fh);
  set(33, 0.31 * fw, -0.1 * fh);
  set(1, 0, 0.15 * fh + noseDy * fh);
  set(13, 0, lipY - (mouthOpen * fh) / 2);
  set(14, 0, lipY + (mouthOpen * fh) / 2);
  set(61, (mouthWidth * fw) / 2, lipY - cornerLift * fh);
  set(291, (-mouthWidth * fw) / 2, lipY - cornerLift * fh);
  return pts;
}

const blend = ({ smile = 0.04, jaw = 0.02, squint = 0.15 } = {}) => ({
  mouthSmileLeft: smile,
  mouthSmileRight: smile,
  jawOpen: jaw,
  cheekSquintLeft: squint,
  cheekSquintRight: squint,
  eyeSquintLeft: squint,
  eyeSquintRight: squint,
});

const NEUTRAL = () => extractLaughFeatures(face(), blend());
const SMALL_SMILE = () => extractLaughFeatures(face({ mouthWidth: 0.43, cornerLift: 0.012 }), blend({ smile: 0.4, squint: 0.2 }));
const LAUGH_F = (t = 0) =>
  extractLaughFeatures(
    face({ mouthWidth: 0.49, mouthOpen: 0.1, cornerLift: 0.045, noseDy: Math.sin(t / 60) * 0.03 }),
    blend({ smile: 0.9, jaw: 0.5, squint: 0.6 }),
  );

/** Runs a detector over `ms` of frames at 30 fps; `at(t)` returns features or null. */
function run(detector, ms, at, start = 0) {
  let last;
  let confirmedAt = null;
  for (let t = start; t <= start + ms; t += 33) {
    last = detector.update(at(t), t);
    if (last.confirmed && confirmedAt === null) confirmedAt = t;
  }
  return { ...last, confirmedAt };
}

describe('laugh features & score', () => {
  it('neutral face scores ~0 → SAFE', () => {
    const raw = scoreLaugh(NEUTRAL(), DEFAULT_BASELINE);
    expect(raw).toBeLessThan(0.08);
    expect(meterState(meterPercent(raw)).label).toBe('SAFE');
  });

  it('a small smile is noticeable but below the trigger', () => {
    const raw = scoreLaugh(SMALL_SMILE(), DEFAULT_BASELINE);
    expect(raw).toBeGreaterThan(0.15);
    expect(raw).toBeLessThan(LAUGH.TRIGGER - 0.1);
  });

  it('a clear laugh scores high', () => {
    expect(scoreLaugh(LAUGH_F(), DEFAULT_BASELINE, 0.6)).toBeGreaterThan(0.8);
  });

  it('an open mouth without a smile (talking / surprise) stays low', () => {
    const f = extractLaughFeatures(face({ mouthWidth: 0.34, mouthOpen: 0.12 }), blend({ jaw: 0.6 }));
    expect(scoreLaugh(f, DEFAULT_BASELINE, 1)).toBeLessThan(0.15);
  });

  it('is not fooled by head tilt or position', () => {
    const tilted = extractLaughFeatures(face({ roll: 0.35, cx: 0.3, size: 0.45 }), blend());
    expect(scoreLaugh(tilted, DEFAULT_BASELINE)).toBeLessThan(0.08);
    const tiltedLaugh = extractLaughFeatures(
      face({ roll: -0.3, mouthWidth: 0.49, mouthOpen: 0.1, cornerLift: 0.045 }),
      blend({ smile: 0.9, jaw: 0.5, squint: 0.6 }),
    );
    expect(scoreLaugh(tiltedLaugh, DEFAULT_BASELINE)).toBeGreaterThan(0.75);
  });
});

describe('temporal smoothing & confirmation', () => {
  it('a sustained laugh is confirmed — but not on the first frame', () => {
    const r = run(createLaughDetector(), 2000, (t) => (t < 500 ? NEUTRAL() : LAUGH_F(t)));
    expect(r.confirmedAt).not.toBeNull();
    expect(r.confirmedAt - 500).toBeGreaterThanOrEqual(LAUGH.CONFIRM_MS);
    expect(r.confirmedAt - 500).toBeLessThan(1200);
  });

  it('neutral and a small smile never trigger', () => {
    expect(run(createLaughDetector(), 5000, NEUTRAL).confirmedAt).toBeNull();
    expect(run(createLaughDetector(), 5000, SMALL_SMILE).confirmedAt).toBeNull();
  });

  it('head movement without laughing does not trigger', () => {
    const moving = (t) => extractLaughFeatures(face({ noseDy: Math.sin(t / 50) * 0.08, cx: 0.5 + Math.sin(t / 300) * 0.2 }), blend());
    expect(run(createLaughDetector(), 5000, moving).confirmedAt).toBeNull();
  });

  it('a brief false positive (150 ms) is smoothed away', () => {
    const blip = (t) => (t > 1000 && t < 1150 ? LAUGH_F(t) : NEUTRAL());
    const r = run(createLaughDetector(), 3000, blip);
    expect(r.confirmedAt).toBeNull();
    expect(r.peak).toBeGreaterThan(0.2); // the meter still twitched
  });

  it('losing the face drains the meter instead of triggering', () => {
    const r = run(createLaughDetector(), 3000, (t) => (t < 300 ? LAUGH_F(t) : null));
    expect(r.confirmedAt).toBeNull();
    expect(r.level).toBeLessThan(0.05);
  });
});

describe('calibration', () => {
  it('adapts to a naturally wide mouth / resting smile', () => {
    const resting = () => extractLaughFeatures(face({ mouthWidth: 0.45, cornerLift: 0.01 }), blend({ smile: 0.2 }));
    const calibrator = createCalibrator();
    for (let i = 0; i < 40; i += 1) calibrator.add(resting());
    const baseline = calibrator.baseline();
    expect(scoreLaugh(resting(), DEFAULT_BASELINE)).toBeGreaterThan(0.12); // would look "smiley" uncalibrated
    expect(scoreLaugh(resting(), baseline)).toBeLessThan(0.05);
  });

  it('a grin during calibration cannot make the game impossible', () => {
    const calibrator = createCalibrator();
    for (let i = 0; i < 40; i += 1) calibrator.add(LAUGH_F(i * 33));
    const baseline = calibrator.baseline();
    expect(baseline.smile).toBeLessThanOrEqual(0.3);
    expect(scoreLaugh(LAUGH_F(), baseline, 0.6)).toBeGreaterThan(LAUGH.TRIGGER);
  });

  it('falls back to defaults with too few samples', () => {
    expect(createCalibrator().baseline()).toEqual(DEFAULT_BASELINE);
  });
});

describe('rolling frame buffer', () => {
  const fakeCanvas = (width, height) => ({ width, height, id: Symbol('canvas') });
  const video = { videoWidth: 1280, videoHeight: 720 };

  it('keeps only the last ~2.5 s at ~10 fps, downscaled, with bounded memory', () => {
    const created = vi.fn(fakeCanvas);
    const buffer = createFrameBuffer({ createCanvas: created, draw: () => {} });
    for (let t = 0; t <= 10000; t += 33) buffer.push(video, t, 0);
    expect(buffer.size).toBeLessThanOrEqual(buffer.capacity);
    expect(Math.min(...buffer.timestamps())).toBeGreaterThanOrEqual(10000 - 2500);
    expect(created.mock.calls.length).toBeLessThanOrEqual(buffer.capacity + 1); // canvases are recycled
    expect(created.mock.calls[0]).toEqual([640, 360]);
  });

  it('picks the strongest laugh frame in the recent window, not the latest', () => {
    const buffer = createFrameBuffer({ createCanvas: fakeCanvas, draw: () => {} });
    const score = (t) => (t < 3000 ? 0.05 : t < 3600 ? 0.4 + (t - 3000) / 1000 : 0.7); // peak ≈ t=3590
    for (let t = 0; t <= 4000; t += 33) buffer.push(video, t, score(t));
    const best = buffer.best(4000);
    expect(best.score).toBeGreaterThan(0.95);
    expect(best.t).toBeGreaterThan(3400);
    expect(best.t).toBeLessThan(3700);
  });

  it('ignores frames older than the window and survives clear()', () => {
    const buffer = createFrameBuffer({ createCanvas: fakeCanvas, draw: () => {} });
    for (let t = 0; t <= 2400; t += 33) buffer.push(video, t, t < 100 ? 1 : 0.1);
    expect(buffer.best(2400, 2000).t).toBeGreaterThan(300);
    buffer.clear();
    expect(buffer.size).toBe(0);
    expect(buffer.best(2400)).toBeNull();
  });
});

describe('content pool', () => {
  it('has plenty of items with captions', () => {
    expect(CONTENT.length).toBeGreaterThanOrEqual(10);
    for (const item of CONTENT) {
      expect(item.src).toBeTruthy();
      expect(item.top && item.bottom).toBeTruthy();
      expect(item.duration).toBeGreaterThan(2);
    }
  });

  it('never repeats the previous 2 items and skips broken assets', () => {
    const brokenId = CONTENT[0].id;
    const recent = [];
    const broken = new Set([brokenId]);
    for (let i = 0; i < 2000; i += 1) {
      const item = pickContent(recent, { broken });
      expect(recent.slice(-2)).not.toContain(item.id);
      expect(item.id).not.toBe(brokenId);
      recent.push(item.id);
    }
    expect(new Set(recent).size).toBe(CONTENT.length - 1);
  });

  it('copes with tiny or fully broken pools', () => {
    const pool = [{ id: 'a' }];
    expect(pickContent(['a', 'a'], { pool }).id).toBe('a');
    expect(pickContent([], { pool, broken: new Set(['a']) })).toBeNull();
  });

  it('createContentDeck guarantees without-replacement full cycle across all GIFs', () => {
    const deck = createContentDeck(CONTENT);
    const poolSize = CONTENT.length;
    expect(poolSize).toBe(27);

    // Cycle 1: every item drawn must be distinct until deck is exhausted
    const cycle1 = [];
    for (let i = 0; i < poolSize; i += 1) {
      const item = deck.next();
      expect(cycle1.map((c) => c.id)).not.toContain(item.id);
      cycle1.push(item);
    }
    expect(new Set(cycle1.map((c) => c.id)).size).toBe(poolSize);

    // Cycle 2: first item of new cycle should NOT immediately repeat the last item of cycle 1
    const nextItem = deck.next();
    expect(nextItem.id).not.toBe(cycle1[cycle1.length - 1].id);

    // Cycle 2 completes full without-replacement cycle
    const cycle2 = [nextItem];
    for (let i = 1; i < poolSize; i += 1) {
      const item = deck.next();
      expect(cycle2.map((c) => c.id)).not.toContain(item.id);
      cycle2.push(item);
    }
    expect(new Set(cycle2.map((c) => c.id)).size).toBe(poolSize);
  });

  it('createContentDeck skips broken items and survives empty/single-item pools', () => {
    const broken = new Set(['gif-baby-driving', 'gif-weird']);
    const deck = createContentDeck(CONTENT, { broken });
    for (let i = 0; i < CONTENT.length - 2; i += 1) {
      const item = deck.next();
      expect(broken.has(item.id)).toBe(false);
    }

    const singleDeck = createContentDeck([{ id: 'solo', duration: 5 }]);
    expect(singleDeck.next().id).toBe('solo');
    expect(singleDeck.next().id).toBe('solo');

    const emptyDeck = createContentDeck([]);
    expect(emptyDeck.next()).toBeNull();
  });
});

describe('state machine', () => {
  const play = () => {
    let s = createInitialState();
    s = dontLaughReducer(s, { type: 'SUBMIT_NAME', player: 'ANUSH' });
    expect(s.phase).toBe(PHASE.NOTICE);
    s = dontLaughReducer(s, { type: 'ACCEPT_NOTICE' });
    s = dontLaughReducer(s, { type: 'CAMERA_READY' });
    expect(s.phase).toBe(PHASE.CALIBRATION);
    s = dontLaughReducer(s, { type: 'CALIBRATED', round: s.round, baseline: DEFAULT_BASELINE });
    s = dontLaughReducer(s, { type: 'GO', round: s.round });
    expect(s.phase).toBe(PHASE.PLAYING);
    return s;
  };

  it('caught path: a laugh fires exactly once', () => {
    let s = play();
    s = dontLaughReducer(s, { type: 'LAUGH', round: s.round, lastedMs: 7400, peak: 0.8 });
    expect(s.phase).toBe(PHASE.LAUGH_DETECTED);
    expect(dontLaughReducer(s, { type: 'LAUGH', round: s.round, lastedMs: 9000 })).toBe(s); // duplicate ignored
    expect(dontLaughReducer(s, { type: 'TIMEOUT', round: s.round })).toBe(s);
    s = dontLaughReducer(s, { type: 'CAPTURE', round: s.round });
    s = dontLaughReducer(s, { type: 'CAPTURED', round: s.round, capture: { url: 'blob:x' } });
    expect(s.phase).toBe(PHASE.RESULT);
    expect(s.result).toMatchObject({ lastedMs: 7400, capture: { url: 'blob:x' } });
  });

  it('survival path and replay (calibration kept, fresh round)', () => {
    let s = play();
    s = dontLaughReducer(s, { type: 'TIMEOUT', round: s.round, lastedMs: 20000, peak: 0.3 });
    expect(s.phase).toBe(PHASE.SURVIVED);
    s = dontLaughReducer(s, { type: 'SHOW_RESULT', round: s.round });
    expect(s.outcome).toBe('survived');
    const round = s.round;
    s = dontLaughReducer(s, { type: 'PLAY_AGAIN' });
    expect(s.phase).toBe(PHASE.CAMERA_SETUP);
    expect(s.result).toBeNull();
    s = dontLaughReducer(s, { type: 'CAMERA_READY' });
    expect(s.phase).toBe(PHASE.COUNTDOWN); // baseline reused
    expect(s.round).toBe(round + 1);
    expect(dontLaughReducer(s, { type: 'GO', round })).toBe(s); // stale timer ignored
  });
});

describe('capture uploader', () => {
  const ok = (filename) => vi.fn(async () => ({ ok: true, status: 201, json: async () => ({ ok: true, filename }) }));
  const down = vi.fn(async () => {
    throw new TypeError('Failed to fetch');
  });
  const blob = new Blob(['x'], { type: 'image/jpeg' });

  it('returns the saved filename', async () => {
    const uploader = createCaptureUploader({ endpoint: '/api', fetchImpl: ok('laugh_1.jpg') });
    await expect(uploader.upload(blob)).resolves.toEqual({ status: 'saved', filename: 'laugh_1.jpg' });
  });

  it('keeps the photo locally when the backend is down, then retries', async () => {
    let backendUp = false;
    const fetchImpl = vi.fn((...args) => (backendUp ? ok('laugh_2.jpg')(...args) : down()));
    const uploader = createCaptureUploader({ endpoint: '/api', fetchImpl });
    const result = await uploader.upload(blob);
    expect(result.status).toBe('local');
    expect(uploader.pendingCount).toBe(1);
    backendUp = true;
    await expect(uploader.retry(result.id)).resolves.toEqual({ status: 'saved', filename: 'laugh_2.jpg' });
    expect(uploader.pendingCount).toBe(0);
  });

  it('treats server rejections as "kept locally" without throwing', async () => {
    const fetchImpl = vi.fn(async () => ({ ok: false, status: 415, json: async () => ({ error: 'Only JPEG…' }) }));
    const uploader = createCaptureUploader({ endpoint: '/api', fetchImpl });
    await expect(uploader.upload(blob)).resolves.toMatchObject({ status: 'local', error: 'Only JPEG…' });
  });
});
