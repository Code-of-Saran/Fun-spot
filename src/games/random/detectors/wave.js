import { clamp01, createReversalCounter, isVisible, LIMB_VISIBILITY, POSE, readBody } from '../../../vision/landmarks';

const SWING = 0.15; // min side-to-side wrist travel (body units) per half-wave
const ACTIVE_WINDOW = 800; // a reversal keeps the wave "active" this long
const RESET_AFTER = 1200; // pausing longer than this restarts the wave timer

/**
 * 👋 A raised hand swinging side to side. Each side is tracked independently
 * (wrist x relative to its elbow) and the player must keep waving for `activeMs`.
 */
export function createWaveDetector({ activeMs = 3000, minReversals = 4 } = {}) {
  const sides = [
    { wrist: POSE.LEFT_WRIST, elbow: POSE.LEFT_ELBOW, counter: createReversalCounter(SWING) },
    { wrist: POSE.RIGHT_WRIST, elbow: POSE.RIGHT_ELBOW, counter: createReversalCounter(SWING) },
  ];
  let reversals = 0;
  let lastReversalT = -Infinity;
  let waveMs = 0;
  let lastT = null;
  let best = 0;
  let amplitudeSum = 0;
  let amplitudeN = 0;

  return {
    update(frame) {
      const dt = lastT === null ? 0 : Math.min(frame.t - lastT, 100);
      lastT = frame.t;
      const events = [];
      const body = readBody(frame.pose);
      let raised = false;

      if (body) {
        for (const side of sides) {
          const wrist = body.local(side.wrist);
          const elbow = body.local(side.elbow);
          if (!isVisible(wrist, LIMB_VISIBILITY) || !isVisible(elbow, LIMB_VISIBILITY)) continue;
          if (wrist.y > elbow.y) continue; // hand must be up
          raised = true;
          const { reversed, amplitude } = side.counter.push(wrist.x - elbow.x);
          if (reversed) {
            reversals += 1;
            lastReversalT = frame.t;
            amplitudeSum += amplitude;
            amplitudeN += 1;
            if (reversals % 2 === 0) events.push({ type: 'rep' });
          }
        }
      }

      const sinceReversal = frame.t - lastReversalT;
      if (raised && sinceReversal <= ACTIVE_WINDOW) waveMs += dt;
      else if (sinceReversal > RESET_AFTER) waveMs = 0;

      best = Math.max(best, Math.min(clamp01(waveMs / activeMs), clamp01(reversals / minReversals)));
      const done = waveMs >= activeMs && reversals >= minReversals;

      let hint = 'Keep waving!';
      if (!body) hint = 'Step into the frame';
      else if (!raised) hint = 'Raise a hand and wave side to side';
      else if (sinceReversal > ACTIVE_WINDOW) hint = 'Bigger waves!';

      return {
        progress: done ? 1 : best,
        accuracy: amplitudeN ? clamp01(amplitudeSum / amplitudeN / 0.5) : 0,
        done,
        hint,
        events,
      };
    },
  };
}
