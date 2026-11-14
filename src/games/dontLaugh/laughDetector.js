import { clamp01, dist } from '../../vision/landmarks';
import { LAUGH } from './gameConfig';

/**
 * "AI Laugh Meter" — a practical heuristic, NOT a scientifically validated
 * laugh classifier. It combines deterministic face metrics:
 *
 *   smile    mouth-smile blendshapes + mouth widening + mouth corners lifting
 *   open     jaw opening + lip gap
 *   squint   cheek/eye squint (the "real laugh" eyes)
 *   shake    small vertical head bobbing (laughing shakes the head)
 *
 * Opening, squint and shake only count when the player is also smiling, so
 * talking, a surprised "O" mouth or moving around don't fill the meter.
 * Everything is measured relative to a neutral-face calibration.
 */

// Face mesh indices
const F = { TOP: 10, CHIN: 152, RIGHT_SIDE: 234, LEFT_SIDE: 454, RIGHT_EYE: 33, LEFT_EYE: 263, NOSE: 1, UPPER_LIP: 13, LOWER_LIP: 14, MOUTH_RIGHT: 61, MOUTH_LEFT: 291 };

const avg = (a, b) => ((a ?? 0) + (b ?? 0)) / 2;

/** Per-frame measurements (scale- and tilt-independent). */
export function extractLaughFeatures(points, blendshapes) {
  const pRightSide = points[F.RIGHT_SIDE];
  const pLeftSide = points[F.LEFT_SIDE];
  const pTop = points[F.TOP];
  const pChin = points[F.CHIN];
  const pRightEye = points[F.RIGHT_EYE];
  const pLeftEye = points[F.LEFT_EYE];
  const upper = points[F.UPPER_LIP];
  const lower = points[F.LOWER_LIP];
  const pMouthRight = points[F.MOUTH_RIGHT];
  const pMouthLeft = points[F.MOUTH_LEFT];
  const pNose = points[F.NOSE];

  const faceWidth = dist(pRightSide, pLeftSide);
  const faceHeight = dist(pTop, pChin);

  // "up" axis of the face, so a tilted head doesn't look like a smile
  const eyeDx = pRightEye.x - pLeftEye.x;
  const eyeDy = pRightEye.y - pLeftEye.y;
  const len = Math.hypot(eyeDx, eyeDy) || 1;
  const upX = eyeDy / len;
  const upY = -eyeDx / len;

  const upperAlong = upper.x * upX + upper.y * upY;
  const lowerAlong = lower.x * upX + lower.y * upY;
  const lipCenter = (upperAlong + lowerAlong) / 2;

  const mouthRightAlong = pMouthRight.x * upX + pMouthRight.y * upY;
  const mouthLeftAlong = pMouthLeft.x * upX + pMouthLeft.y * upY;
  const corners = (mouthRightAlong + mouthLeftAlong) / 2;

  const noseAlong = pNose.x * upX + pNose.y * upY;
  const b = blendshapes ?? {};

  return {
    smile: avg(b.mouthSmileLeft, b.mouthSmileRight),
    jaw: b.jawOpen ?? 0,
    squint: (avg(b.cheekSquintLeft, b.cheekSquintRight) + avg(b.eyeSquintLeft, b.eyeSquintRight)) / 2,
    mouthWidth: dist(pMouthRight, pMouthLeft) / faceWidth,
    mouthOpen: dist(upper, lower) / faceHeight,
    cornerLift: (corners - lipCenter) / faceHeight, // > 0 when the corners rise above the lip centre
    noseY: noseAlong / faceHeight,
  };
}

/** Typical neutral values (used when calibration is skipped or fails). */
export const DEFAULT_BASELINE = { smile: 0.05, jaw: 0.02, squint: 0.15, mouthWidth: 0.4, mouthOpen: 0.01, cornerLift: 0 };

// A player who was already smiling during calibration can't make the game impossible.
const BASELINE_LIMITS = {
  smile: [0, 0.3],
  jaw: [0, 0.15],
  squint: [0, 0.45],
  mouthWidth: [0.3, 0.48],
  mouthOpen: [0, 0.035],
  cornerLift: [-0.03, 0.015],
};

/** Collects neutral-face samples; the baseline is a low percentile per metric (robust to a brief grin). */
export function createCalibrator() {
  const samples = [];
  return {
    add(features) {
      samples.push(features);
    },
    get count() {
      return samples.length;
    },
    baseline() {
      if (samples.length < 5) return { ...DEFAULT_BASELINE };
      const result = {};
      for (const [key, [lo, hi]] of Object.entries(BASELINE_LIMITS)) {
        const values = samples.map((s) => s[key]).sort((a, b) => a - b);
        const p30 = values[Math.floor((values.length - 1) * 0.3)];
        result[key] = Math.min(hi, Math.max(lo, p30));
      }
      return result;
    },
  };
}

/** Instant (unsmoothed) laugh score 0–1 for one frame. */
export function scoreLaugh(f, base, shake = 0) {
  const smile = clamp01(
    0.55 * clamp01((f.smile - base.smile) / Math.max(0.25, 0.85 - base.smile)) +
      0.25 * clamp01((f.mouthWidth / base.mouthWidth - 1) / 0.2) +
      0.2 * clamp01((f.cornerLift - base.cornerLift) / 0.04),
  );
  const open = 0.5 * clamp01((f.jaw - base.jaw) / 0.35) + 0.5 * clamp01((f.mouthOpen - base.mouthOpen) / 0.08);
  const squint = clamp01((f.squint - base.squint) / 0.35);
  const gate = clamp01(smile * 1.6);
  return clamp01(0.6 * smile + 0.22 * open * gate + 0.1 * squint * gate + 0.08 * clamp01(shake) * gate);
}

/**
 * Streams features over time:
 *  - exponential smoothing (LAUGH.SMOOTHING_MS)
 *  - confirmation only after the smoothed score stays ≥ trigger for LAUGH.CONFIRM_MS
 *  - head-bob "shake" from the last ~0.6 s of nose positions (zero-allocation ring buffer)
 */
export function createLaughDetector({ baseline = DEFAULT_BASELINE, trigger = LAUGH.TRIGGER, confirmMs = LAUGH.CONFIRM_MS, smoothingMs = LAUGH.SMOOTHING_MS } = {}) {
  let smoothed = 0;
  let lastT = null;
  let aboveSince = null;
  let peak = 0;

  // Power-of-2 capacity ring buffer: zero heap allocations & zero array shifts
  const NOSE_CAPACITY = 32;
  const noseT = new Float64Array(NOSE_CAPACITY);
  const noseY = new Float32Array(NOSE_CAPACITY);
  let noseHead = 0;
  let noseCount = 0;

  return {
    /**
     * @param {object|null} features from extractLaughFeatures, or null when no face is visible
     * @returns {{ raw: number, level: number, confirmed: boolean, peak: number }}
     */
    update(features, t) {
      const dt = lastT === null ? 0 : Math.max(0, t - lastT);
      lastT = t;

      let raw = 0;
      if (features) {
        noseT[noseHead] = t;
        noseY[noseHead] = features.noseY;
        noseHead = (noseHead + 1) & (NOSE_CAPACITY - 1);
        if (noseCount < NOSE_CAPACITY) noseCount++;

        let valid = 0;
        let sum = 0;
        for (let i = 0; i < noseCount; i++) {
          const idx = (noseHead - 1 - i + NOSE_CAPACITY) & (NOSE_CAPACITY - 1);
          if (t - noseT[idx] > 600) break;
          valid++;
          sum += noseY[idx];
        }

        let std = 0;
        if (valid > 0) {
          const mean = sum / valid;
          let sqDiffSum = 0;
          for (let i = 0; i < valid; i++) {
            const idx = (noseHead - 1 - i + NOSE_CAPACITY) & (NOSE_CAPACITY - 1);
            sqDiffSum += (noseY[idx] - mean) ** 2;
          }
          std = Math.sqrt(sqDiffSum / valid);
        }
        raw = scoreLaugh(features, baseline, std / 0.02);
      } else {
        noseCount = 0;
        noseHead = 0;
      }

      const k = dt === 0 ? 0 : 1 - Math.exp(-dt / smoothingMs);
      smoothed += (raw - smoothed) * k;
      peak = Math.max(peak, smoothed);

      if (smoothed >= trigger && features) aboveSince ??= t;
      else aboveSince = null;

      return { raw, level: smoothed, confirmed: aboveSince !== null && t - aboveSince >= confirmMs, peak };
    },
  };
}

/** Laugh level (0–1) → meter percentage, with the trigger shown at LAUGH.METER_AT_TRIGGER %. */
export const meterPercent = (level, trigger = LAUGH.TRIGGER) => Math.min(100, Math.round((level / trigger) * LAUGH.METER_AT_TRIGGER));
