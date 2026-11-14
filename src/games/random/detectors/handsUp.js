import { clamp01, createHoldTimer, isVisible, LIMB_VISIBILITY, POSE, readBody } from '../../../vision/landmarks';

const MARGIN = 0.3; // wrist this far (body units) above its shoulder = "up"; level arms don't count

/** 🙌 Both wrists above the shoulders, held for `holdMs`. */
export function createHandsUpDetector({ holdMs = 1000 } = {}) {
  const hold = createHoldTimer();
  let best = 0;
  let accuracySum = 0;
  let accuracyN = 0;

  return {
    update(frame) {
      const body = readBody(frame.pose);
      if (!body) {
        hold.update(false, frame.t);
        return state('Step into the frame so I can see your shoulders');
      }
      const left = body.local(POSE.LEFT_WRIST);
      const right = body.local(POSE.RIGHT_WRIST);
      const ls = body.local(POSE.LEFT_SHOULDER);
      const rs = body.local(POSE.RIGHT_SHOULDER);
      const leftUp = isVisible(left, LIMB_VISIBILITY) && ls.y - left.y > MARGIN;
      const rightUp = isVisible(right, LIMB_VISIBILITY) && rs.y - right.y > MARGIN;

      const held = hold.update(leftUp && rightUp, frame.t);
      if (leftUp && rightUp) {
        accuracySum += clamp01(Math.min(ls.y - left.y, rs.y - right.y) / 0.8);
        accuracyN += 1;
      }
      best = Math.max(best, clamp01(held / holdMs));

      if (leftUp && rightUp) return state('Hold it up there!');
      if (leftUp || rightUp) return state('BOTH hands up!');
      return state('Raise both hands above your shoulders');
    },
  };

  function state(hint) {
    return {
      progress: best,
      accuracy: accuracyN ? accuracySum / accuracyN : 0,
      done: best >= 1,
      hint,
      events: [],
    };
  }
}
