import { BUFFER } from './gameConfig';

const defaultCanvas = (w, h) => {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  return canvas;
};

/** Draws the (mirrored, downscaled) camera frame — what the player sees. */
const defaultDraw = (canvas, video) => {
  const ctx = canvas.getContext('2d');
  ctx.save();
  ctx.translate(canvas.width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  ctx.restore();
};

/**
 * Rolling buffer of the last few seconds of camera frames, each tagged with
 * its instant laugh score. Bounded memory: a fixed pool of small canvases is
 * reused, so old frames are overwritten instead of piling up.
 *
 *   push()      — at most BUFFER.FPS frames/s; frames older than BUFFER.SECONDS are recycled
 *   best()      — the strongest-expression frame in the recent window (latest wins ties)
 */
export function createFrameBuffer({
  seconds = BUFFER.SECONDS,
  fps = BUFFER.FPS,
  maxWidth = BUFFER.MAX_WIDTH,
  createCanvas = defaultCanvas,
  draw = defaultDraw,
} = {}) {
  const capacity = Math.ceil(seconds * fps) + 1;
  const minGapMs = 1000 / fps - 5; // small tolerance for frame-timing jitter
  const pool = [];
  let entries = []; // oldest → newest: { t, score, canvas }
  let lastPushT = -Infinity;

  function canvasFor(width, height) {
    const reusable = pool.pop();
    if (reusable && reusable.width === width && reusable.height === height) return reusable;
    return createCanvas(width, height);
  }

  return {
    /** @returns {boolean} whether the frame was stored */
    push(video, t, score) {
      if (t - lastPushT < minGapMs) return false;
      const vw = video.videoWidth;
      const vh = video.videoHeight;
      if (!vw || !vh) return false;
      lastPushT = t;

      const scale = Math.min(1, maxWidth / vw);
      while (entries.length && (entries.length >= capacity || t - entries[0].t > seconds * 1000)) {
        pool.push(entries.shift().canvas);
      }
      const canvas = canvasFor(Math.round(vw * scale), Math.round(vh * scale));
      draw(canvas, video);
      entries.push({ t, score, canvas });
      return true;
    },

    /** Strongest laugh frame within `windowMs` before `t` (falls back to the newest frame). */
    best(t, windowMs = BUFFER.BEST_WINDOW_MS) {
      let best = null;
      for (const entry of entries) {
        if (entry.t < t - windowMs || entry.t > t) continue;
        if (!best || entry.score >= best.score) best = entry;
      }
      return best ?? entries.at(-1) ?? null;
    },

    get size() {
      return entries.length;
    },
    get capacity() {
      return capacity;
    },
    /** Timestamps currently held (for tests/diagnostics). */
    timestamps() {
      return entries.map((e) => e.t);
    },

    clear() {
      entries.forEach((e) => pool.push(e.canvas));
      entries = [];
      lastPushT = -Infinity;
    },
  };
}
