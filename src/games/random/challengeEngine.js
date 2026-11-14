import { CHALLENGES } from './challenges';
import { detectors } from './detectors';
import { pick, secureRandom } from './randomUtils';
import { createId } from '../../utils/id';

/** How many previous challenges are excluded from the next pick. */
export const NO_REPEAT_WINDOW = 2;

/**
 * Randomly picks the next challenge, never one of the last NO_REPEAT_WINDOW,
 * and resolves its random variations (direction, finger count, combo steps…).
 *
 * @param {string[]} recentIds ids of recently played challenges, oldest first
 */
export function pickChallenge(recentIds = [], rng = secureRandom) {
  const recent = new Set(recentIds.slice(-NO_REPEAT_WINDOW));
  const pool = CHALLENGES.filter((challenge) => !recent.has(challenge.id));
  return resolveChallenge(pick(pool.length ? pool : CHALLENGES, rng), rng);
}

/** Turns a challenge definition into a concrete, playable round. */
export function resolveChallenge(definition, rng = secureRandom) {
  const { randomize, ...base } = definition;
  const variation = randomize?.(rng) ?? {};
  return {
    ...base,
    ...variation,
    uid: createId(),
    params: { ...base.params, ...variation.params },
    needsHands: Boolean(base.needsHands),
  };
}

export function createChallengeDetector(challenge) {
  const factory = detectors[challenge.detector];
  if (!factory) throw new Error(`Unknown detector: ${challenge.detector}`);
  return factory(challenge.params);
}
