import { clamp01, createMotionTracker, POSE, readBody } from '../../../vision/landmarks';

const ARMS = [POSE.LEFT_ELBOW, POSE.RIGHT_ELBOW, POSE.LEFT_WRIST, POSE.RIGHT_WRIST];
const STILL_BELOW = 0.6; // arm speed (body units/s) that counts as a stop
const MOVING_ABOVE = 1.2; // arm speed that counts as a move (gap = hysteresis)
const MIN_STOP_MS = 120; // a robot pauses between moves…
const MAX_MOVE_MS = 700; // …and each move is short and sudden

/**
 * 🤖 Robot dancing = repeated stop → short sharp move → stop.
 * A "beat" is one such move bracketed by stops; smooth, continuous motion
 * never produces beats. Needs `beats` beats spread over at least `minSpanMs`.
 */
export function createRobotDetector({ beats: targetBeats = 6, minSpanMs = 3500 } = {}) {
  const motion = createMotionTracker(ARMS, 150);
  let mode = 'unknown'; // still | moving | unknown
  let modeSince = 0;
  let stoppedBefore = false;
  let peak = 0;
  let beats = 0;
  let firstBeatT = null;
  let lastBeatT = null;
  let sharpnessSum = 0;
  let tooSmooth = false;

  return {
    update(frame) {
      const events = [];
      const body = readBody(frame.pose);
      if (!body) {
        motion.reset();
        mode = 'unknown';
        return state('Step into the frame', events);
      }
      const speed = motion.update(body, frame.t);
      if (speed === null) return state('Robot mode: sharp moves, sudden stops!', events);

      if (mode !== 'still' && speed < STILL_BELOW) {
        if (mode === 'moving' && stoppedBefore) {
          const moveMs = frame.t - modeSince;
          if (moveMs <= MAX_MOVE_MS) {
            beats += 1;
            firstBeatT ??= frame.t;
            lastBeatT = frame.t;
            sharpnessSum += clamp01(peak / 2.5);
            tooSmooth = false;
            events.push({ type: 'rep' });
          } else {
            tooSmooth = true;
          }
        }
        mode = 'still';
        modeSince = frame.t;
      } else if (mode !== 'moving' && speed > MOVING_ABOVE) {
        stoppedBefore = mode === 'still' && frame.t - modeSince >= MIN_STOP_MS;
        mode = 'moving';
        modeSince = frame.t;
        peak = speed;
      } else if (mode === 'moving') {
        peak = Math.max(peak, speed);
      }

      let hint = 'Beep boop! Move… and STOP!';
      if (tooSmooth) hint = 'Too smooth! Robots move in sharp steps';
      else if (mode === 'moving' && frame.t - modeSince > MAX_MOVE_MS) hint = 'Now STOP — robots pause!';
      return state(hint, events);
    },
  };

  function state(hint, events) {
    const span = firstBeatT === null ? 0 : lastBeatT - firstBeatT;
    const done = beats >= targetBeats && span >= minSpanMs;
    return {
      progress: done ? 1 : 0.5 * clamp01(beats / targetBeats) + 0.5 * clamp01(span / minSpanMs),
      accuracy: beats ? sharpnessSum / beats : 0,
      done,
      hint,
      count: beats,
      target: targetBeats,
      events,
    };
  }
}
