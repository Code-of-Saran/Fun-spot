import { clamp01, createHoldTimer, isVisible, LIMB_VISIBILITY, POSE, readBody } from '../../../vision/landmarks';

const REACH = 1.3; // wrist must be this far sideways from the shoulder midpoint (body units)
const MAX_DROP = 0.7; // and roughly level with the shoulders

/**
 * 👉 Point LEFT or RIGHT — from the player's point of view, which matches the
 * mirrored screen. Either hand counts (including cross-body pointing).
 */
export function createPointingDetector({ direction = 'left', holdMs = 1000 } = {}) {
  const sign = direction === 'left' ? -1 : 1;
  const hold = createHoldTimer();
  let best = 0;
  let qualitySum = 0;
  let qualityN = 0;

  return {
    update(frame) {
      const body = readBody(frame.pose);
      if (!body) {
        hold.update(false, frame.t);
        return state('Step into the frame');
      }

      let matched = 0;
      let wrongWay = false;
      for (const index of [POSE.LEFT_WRIST, POSE.RIGHT_WRIST]) {
        const wrist = body.local(index);
        if (!isVisible(wrist, LIMB_VISIBILITY) || Math.abs(wrist.y) > MAX_DROP) continue;
        if (wrist.x * sign > REACH) {
          matched = Math.max(matched, clamp01((Math.abs(wrist.x) - 1) / 0.8) * clamp01(1 - Math.abs(wrist.y) / 1.2));
        } else if (wrist.x * -sign > REACH) {
          wrongWay = true;
        }
      }

      const held = hold.update(matched > 0, frame.t);
      if (matched > 0) {
        qualitySum += matched;
        qualityN += 1;
      }
      best = Math.max(best, clamp01(held / holdMs));

      const side = direction.toUpperCase();
      if (matched > 0) return state('Locked on! Hold it…');
      if (wrongWay) return state(`Other way! Your ${side}!`);
      return state(`Stretch an arm out to your ${side}`);
    },
  };

  function state(hint) {
    return {
      progress: best,
      accuracy: qualityN ? qualitySum / qualityN : 0,
      done: best >= 1,
      hint,
      events: [],
    };
  }
}
