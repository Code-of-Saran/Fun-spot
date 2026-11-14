import { clamp01, createReversalCounter, isVisible, LIMB_VISIBILITY, POSE, readBody } from '../../../vision/landmarks';

const FLAP = 0.2; // min vertical elbow travel (body units) per half-flap

/**
 * 🐔 Elbows (wrists as a fallback) moving up and down relative to the shoulders.
 * Both arms are averaged into one signal; one flap = up + down (2 reversals).
 * Accuracy rewards big, symmetric flaps.
 */
export function createChickenFlapDetector({ count = 6 } = {}) {
  const both = createReversalCounter(FLAP);
  const leftRange = { min: Infinity, max: -Infinity };
  const rightRange = { min: Infinity, max: -Infinity };
  let flaps = 0;
  let amplitudeSum = 0;
  let amplitudeN = 0;

  const armHeight = (body, elbowIndex, wristIndex, shoulderIndex) => {
    const shoulder = body.local(shoulderIndex);
    const elbow = body.local(elbowIndex);
    if (isVisible(elbow, LIMB_VISIBILITY)) return elbow.y - shoulder.y;
    const wrist = body.local(wristIndex);
    return isVisible(wrist, LIMB_VISIBILITY) ? wrist.y - shoulder.y : null;
  };
  const track = (range, value) => {
    range.min = Math.min(range.min, value);
    range.max = Math.max(range.max, value);
  };

  return {
    update(frame) {
      const events = [];
      const body = readBody(frame.pose);
      let hint = 'Flap those wings!';

      const left = body && armHeight(body, POSE.LEFT_ELBOW, POSE.LEFT_WRIST, POSE.LEFT_SHOULDER);
      const right = body && armHeight(body, POSE.RIGHT_ELBOW, POSE.RIGHT_WRIST, POSE.RIGHT_SHOULDER);

      if (left == null || right == null) {
        hint = body ? 'Keep both elbows in view' : 'Step into the frame';
      } else {
        track(leftRange, left);
        track(rightRange, right);
        const { reversed, amplitude } = both.push((left + right) / 2);
        if (reversed) {
          amplitudeSum += amplitude;
          amplitudeN += 1;
          if (both.reversals % 2 === 0) {
            flaps += 1;
            events.push({ type: 'rep' });
          }
        }
      }

      const spanL = leftRange.max - leftRange.min;
      const spanR = rightRange.max - rightRange.min;
      const symmetry = spanL > 0 && spanR > 0 ? Math.min(spanL, spanR) / Math.max(spanL, spanR) : 0;
      const size = amplitudeN ? clamp01(amplitudeSum / amplitudeN / 0.5) : 0;

      return {
        progress: clamp01(flaps / count),
        accuracy: size * (0.6 + 0.4 * symmetry),
        done: flaps >= count,
        hint,
        count: flaps,
        target: count,
        events,
      };
    },
  };
}
