import { clamp01, createHoldTimer, dist, HAND } from '../../../vision/landmarks';

const FINGERS = [
  [HAND.INDEX_TIP, HAND.INDEX_PIP],
  [HAND.MIDDLE_TIP, HAND.MIDDLE_PIP],
  [HAND.RING_TIP, HAND.RING_PIP],
  [HAND.PINKY_TIP, HAND.PINKY_PIP],
];

/**
 * Extended fingers on one hand. Uses distances, not directions, so it works for
 * left or right hands and any hand rotation:
 *  - a finger is extended when its tip is clearly farther from the wrist than its PIP joint;
 *  - the thumb is extended when its tip sits away from the palm (index knuckle)
 *    and beyond its own IP joint relative to the pinky knuckle.
 */
export function countExtendedFingers(lm) {
  const wrist = lm[HAND.WRIST];
  const palm = dist(wrist, lm[HAND.MIDDLE_MCP]);
  if (palm <= 0) return 0;

  let count = 0;
  for (const [tip, pip] of FINGERS) {
    if (dist(lm[tip], wrist) > dist(lm[pip], wrist) * 1.12) count += 1;
  }
  const thumbTip = lm[HAND.THUMB_TIP];
  const thumbOut =
    dist(thumbTip, lm[HAND.INDEX_MCP]) > palm * 0.6 &&
    dist(thumbTip, lm[HAND.PINKY_MCP]) > dist(lm[HAND.THUMB_IP], lm[HAND.PINKY_MCP]) * 1.05;
  if (thumbOut) count += 1;
  return count;
}

const WINDOW = 20; // recent hand frames used for the stability (accuracy) score

/** ✋ Show exactly `target` fingers on one hand for `holdMs`. */
export function createFingerCountDetector({ target = 3, holdMs = 700 } = {}) {
  const hold = createHoldTimer(200);
  const recent = [];
  let best = 0;
  let bestStability = 0;

  return {
    update(frame) {
      if (!frame.hands.length) {
        hold.update(false, frame.t);
        return state('Show your hand to the camera', null);
      }
      const counts = frame.hands.map((hand) => countExtendedFingers(hand.lm));
      const matched = counts.includes(target);
      const seen = matched ? target : Math.max(...counts);

      recent.push(matched);
      if (recent.length > WINDOW) recent.shift();
      const stability = recent.filter(Boolean).length / recent.length;
      if (matched) bestStability = Math.max(bestStability, stability);

      const held = hold.update(matched, frame.t);
      best = Math.max(best, clamp01(held / holdMs));

      if (matched) return state('Perfect — hold still!', seen);
      return state(`I see ${seen} finger${seen === 1 ? '' : 's'} — show ${target}!`, seen);
    },
  };

  function state(hint, seen) {
    return {
      progress: best,
      accuracy: bestStability,
      done: best >= 1,
      hint,
      count: seen,
      target,
      events: [],
    };
  }
}
