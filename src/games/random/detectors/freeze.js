import { clamp01, createHoldTimer, createMotionTracker, POSE, readBody } from '../../../vision/landmarks';

const TRACKED = [
  POSE.NOSE,
  POSE.LEFT_SHOULDER,
  POSE.RIGHT_SHOULDER,
  POSE.LEFT_ELBOW,
  POSE.RIGHT_ELBOW,
  POSE.LEFT_WRIST,
  POSE.RIGHT_WRIST,
];
const STILL_SPEED = 0.5; // fastest body point, body units per second — below this counts as frozen

/** 🗿 Body speed stays under the threshold for `holdMs`. Any movement resets it. */
export function createFreezeDetector({ holdMs = 3000 } = {}) {
  const motion = createMotionTracker(TRACKED, 300);
  const hold = createHoldTimer(0);
  let best = 0;
  let stillnessSum = 0;
  let stillnessN = 0;

  return {
    update(frame) {
      const body = readBody(frame.pose);
      if (!body) {
        motion.reset();
        hold.update(false, frame.t);
        return state('Step into the frame');
      }
      const speed = motion.update(body, frame.t);
      if (speed === null) return state('Freeze!');

      const still = speed < STILL_SPEED;
      const held = hold.update(still, frame.t);
      if (still) {
        stillnessSum += clamp01(1 - speed / STILL_SPEED);
        stillnessN += 1;
      }
      best = Math.max(best, clamp01(held / holdMs));
      return state(still ? 'Statue mode… hold it!' : 'Movement detected — FREEZE!');
    },
  };

  function state(hint) {
    return {
      progress: best,
      accuracy: stillnessN ? stillnessSum / stillnessN : 0,
      done: best >= 1,
      hint,
      events: [],
    };
  }
}
