import { clamp01, createHoldTimer, isVisible, LIMB_VISIBILITY, POSE, readBody } from '../../../vision/landmarks';

/**
 * Target poses in body units (origin = shoulder midpoint, 1 ≈ shoulder width,
 * x = screen/mirror space so the player's left arm is negative x, y grows downward).
 * Any one of them counts — players strike superhero poses differently.
 */
const ON_HIPS = { le: [-1.05, 0.85], lw: [-0.55, 1.45], re: [1.05, 0.85], rw: [0.55, 1.45] };
export const SUPERHERO_TARGETS = {
  hipsHero: ON_HIPS,
  flyLeft: { ...ON_HIPS, le: [-0.6, -0.75], lw: [-0.65, -1.55] },
  flyRight: { ...ON_HIPS, re: [0.6, -0.75], rw: [0.65, -1.55] },
  powerFlex: { le: [-1.2, 0.0], lw: [-1.1, -0.85], re: [1.2, 0.0], rw: [1.1, -0.85] },
};

// Elbows carry the pose (arms hanging by the sides put the wrists near the hips too),
// so they weigh double.
const JOINTS = [
  ['le', POSE.LEFT_ELBOW, 2],
  ['lw', POSE.LEFT_WRIST, 1],
  ['re', POSE.RIGHT_ELBOW, 2],
  ['rw', POSE.RIGHT_WRIST, 1],
];
const TOTAL_WEIGHT = JOINTS.reduce((sum, [, , w]) => sum + w, 0);
const SIGMA = 0.3; // tolerance: a joint 0.3 shoulder-widths off still scores ≈ 0.6
const PASS = 0.65;

/** Similarity 0–1 between the player's arm joints and one target pose. */
export function poseSimilarity(body, target) {
  let total = 0;
  for (const [key, index, weight] of JOINTS) {
    const p = body.local(index);
    if (!isVisible(p, LIMB_VISIBILITY)) continue; // missing joint scores 0
    const [tx, ty] = target[key];
    const d2 = (p.x - tx) ** 2 + (p.y - ty) ** 2;
    total += weight * Math.exp(-d2 / (2 * SIGMA * SIGMA));
  }
  return total / TOTAL_WEIGHT;
}

/** 🦸 Match any superhero target pose with similarity ≥ PASS for `holdMs`. */
export function createSuperheroDetector({ holdMs = 1000 } = {}) {
  const hold = createHoldTimer();
  let best = 0;
  let bestSimilarity = 0;

  return {
    update(frame) {
      const body = readBody(frame.pose);
      if (!body) {
        hold.update(false, frame.t);
        return state(0, 'Step into the frame — show your whole upper body');
      }
      const similarity = Math.max(...Object.values(SUPERHERO_TARGETS).map((target) => poseSimilarity(body, target)));
      bestSimilarity = Math.max(bestSimilarity, similarity);
      const held = hold.update(similarity >= PASS, frame.t);
      best = Math.max(best, clamp01(held / holdMs));

      let hint = 'Fists on hips, chest out — or one fist to the sky!';
      if (similarity >= PASS) hint = 'HEROIC! Hold that pose!';
      else if (similarity >= PASS - 0.15) hint = 'Almost… elbows out wide!';
      return state(similarity, hint);
    },
  };

  function state(similarity, hint) {
    return {
      progress: best,
      accuracy: bestSimilarity,
      done: best >= 1,
      hint,
      similarity,
      events: [],
    };
  }
}
