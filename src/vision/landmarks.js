/**
 * Landmark helpers shared by every detector.
 *
 * Frames are produced by `toFrame` (vision/frame.js): x is MIRRORED (matches the
 * mirrored video the player sees — the player's left is screen-left) and scaled
 * by the video aspect ratio so x and y use the same unit (fractions of video height).
 */

/** MediaPipe Pose indices (player's own left/right). */
export const POSE = {
  NOSE: 0,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
  LEFT_HEEL: 29,
  RIGHT_HEEL: 30,
  LEFT_FOOT_INDEX: 31,
  RIGHT_FOOT_INDEX: 32,
};

/** MediaPipe Hand indices. */
export const HAND = {
  WRIST: 0,
  THUMB_IP: 3,
  THUMB_TIP: 4,
  INDEX_MCP: 5,
  INDEX_PIP: 6,
  INDEX_TIP: 8,
  MIDDLE_MCP: 9,
  MIDDLE_PIP: 10,
  MIDDLE_TIP: 12,
  RING_PIP: 14,
  RING_TIP: 16,
  PINKY_MCP: 17,
  PINKY_PIP: 18,
  PINKY_TIP: 20,
};

export const clamp01 = (value) => Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));
export const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export const mid = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
export const isVisible = (point, min = 0.5) => Boolean(point) && (point.v ?? 1) >= min;

/** Arms/hands are often partly occluded, so they get a looser visibility bar. */
export const LIMB_VISIBILITY = 0.3;

/**
 * Body reference frame for one pose: shoulder midpoint as origin and a body
 * `scale` (≈ shoulder width) so thresholds work at any distance from the camera.
 * Returns null when the upper body isn't reliably visible.
 */
export function readBody(pose) {
  if (!pose) return null;
  const ls = pose[POSE.LEFT_SHOULDER];
  const rs = pose[POSE.RIGHT_SHOULDER];
  if (!isVisible(ls) || !isVisible(rs)) return null;

  let scale = dist(ls, rs);
  const lh = pose[POSE.LEFT_HIP];
  const rh = pose[POSE.RIGHT_HIP];
  if (isVisible(lh) && isVisible(rh)) {
    // Turning sideways shrinks shoulder width; torso length keeps the scale sane.
    scale = Math.max(scale, dist(mid(ls, rs), mid(lh, rh)) * 0.65);
  }
  if (scale < 0.02) return null;

  const origin = mid(ls, rs);
  return {
    lm: pose,
    scale,
    origin,
    /** Landmark in body units: origin = shoulder midpoint, 1 unit ≈ shoulder width. */
    local(index) {
      const p = pose[index];
      return { x: (p.x - origin.x) / scale, y: (p.y - origin.y) / scale, v: p.v };
    },
  };
}

/** Tracks how long a condition has held, tolerating brief single-frame dropouts. */
export function createHoldTimer(graceMs = 150) {
  let heldMs = 0;
  let lastT = null;
  let lastActiveT = null;
  return {
    update(active, t) {
      const dt = lastT === null ? 0 : Math.min(t - lastT, 100);
      lastT = t;
      if (active) {
        heldMs += dt;
        lastActiveT = t;
      } else if (lastActiveT === null || t - lastActiveT > graceMs) {
        heldMs = 0;
      }
      return heldMs;
    },
    get heldMs() {
      return heldMs;
    },
  };
}

/**
 * Counts direction reversals of a 1-D signal with hysteresis: a reversal only
 * registers after the signal travels `threshold` back from its last extreme,
 * so landmark jitter never counts as movement.
 */
export function createReversalCounter(threshold) {
  let dir = 0;
  let start = null;
  let extreme = null;
  let previousExtreme = null;
  let reversals = 0;
  return {
    /** @returns {{ reversed: boolean, amplitude: number }} */
    push(value) {
      if (start === null) {
        start = value;
        extreme = value;
        previousExtreme = value;
        return { reversed: false, amplitude: 0 };
      }
      if (dir === 0) {
        if (Math.abs(value - start) > threshold) {
          dir = Math.sign(value - start);
          extreme = value;
        }
        return { reversed: false, amplitude: 0 };
      }
      if ((value - extreme) * dir > 0) {
        extreme = value;
        return { reversed: false, amplitude: 0 };
      }
      if (Math.abs(extreme - value) > threshold) {
        const amplitude = Math.abs(extreme - previousExtreme);
        previousExtreme = extreme;
        extreme = value;
        dir = -dir;
        reversals += 1;
        return { reversed: true, amplitude };
      }
      return { reversed: false, amplitude: 0 };
    },
    get reversals() {
      return reversals;
    },
  };
}

/**
 * Speed of the FASTEST of a set of landmarks, in body-units/second, measured
 * against positions ~`windowMs` ago (not frame-to-frame) so detector jitter
 * averages out. Using the fastest point means one moving arm still counts as movement.
 */
export function createMotionTracker(indices, windowMs = 300) {
  const history = [];
  return {
    /** @returns {number|null} speed, or null until enough history exists */
    update(body, t) {
      const points = indices.map((i) =>
        isVisible(body.lm[i], LIMB_VISIBILITY) ? { x: body.lm[i].x, y: body.lm[i].y } : null,
      );
      history.push({ t, points, scale: body.scale });
      while (history.length > 2 && t - history[1].t >= windowMs) history.shift();

      const past = history[0];
      const elapsed = (t - past.t) / 1000;
      if (elapsed < (windowMs / 1000) * 0.6) return null;

      let fastest = null;
      points.forEach((p, i) => {
        const q = past.points[i];
        if (p && q) fastest = Math.max(fastest ?? 0, dist(p, q));
      });
      return fastest === null ? null : fastest / body.scale / elapsed;
    },
    reset() {
      history.length = 0;
    },
  };
}
