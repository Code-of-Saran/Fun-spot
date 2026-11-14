import { clamp01, dist, isVisible, LIMB_VISIBILITY, POSE, readBody } from '../../../vision/landmarks';

const CLOSE = 0.4; // wrists closer than this (body units) = hands together
const APART = 0.65; // hands must separate past this before the next clap counts
const MIN_GAP_MS = 180; // debounce: one physical clap can't count twice

/** 👏 Counts close → apart → close wrist transitions. */
export function createClapDetector({ count = 5 } = {}) {
  let claps = 0;
  let armed = false;
  let lastClapT = -Infinity;
  let peakApart = 0;
  let qualitySum = 0;

  return {
    update(frame) {
      const events = [];
      const body = readBody(frame.pose);
      const left = body?.lm[POSE.LEFT_WRIST];
      const right = body?.lm[POSE.RIGHT_WRIST];
      let hint = 'Clap! Clap! Clap!';

      if (!body || !isVisible(left, LIMB_VISIBILITY) || !isVisible(right, LIMB_VISIBILITY)) {
        hint = 'Keep both hands in view';
      } else {
        const d = dist(left, right) / body.scale;
        if (d > APART) {
          armed = true;
          peakApart = Math.max(peakApart, d);
        } else if (armed && d < CLOSE && frame.t - lastClapT >= MIN_GAP_MS) {
          claps += 1;
          armed = false;
          lastClapT = frame.t;
          qualitySum += clamp01(peakApart / 1.1);
          peakApart = 0;
          events.push({ type: 'rep' });
        }
        if (!armed && claps === 0) hint = 'Open your arms, then clap';
      }

      return {
        progress: clamp01(claps / count),
        accuracy: claps ? qualitySum / claps : 0,
        done: claps >= count,
        hint,
        count: claps,
        target: count,
        events,
      };
    },
  };
}
