import { clamp01 } from '../../vision/landmarks';

export const MAX_SCORE = 1000;
export const WEIGHTS = { completion: 0.7, accuracy: 0.2, speed: 0.1 };

/**
 * Final score on a 0–1000 scale:
 *   completion × 70%  — how much of the challenge was done (1 when completed)
 * + accuracy   × 20%  — how well it matched the target, weighted by completion
 *                       (so a perfect 0.1 s of effort can't earn the full 20%)
 * + speed      × 10%  — only for completed challenges; measured against the
 *                       fastest realistic time (`minTime`) so slow-by-design
 *                       challenges like FREEZE aren't punished
 */
export function computeScore({ completed, progress, accuracy, elapsedMs, durationMs, minTimeMs = 0 }) {
  const completion = completed ? 1 : clamp01(progress);
  const quality = clamp01(accuracy);
  const window = Math.max(1, durationMs - minTimeMs);
  const speed = completed ? clamp01((durationMs - elapsedMs) / window) : 0;

  const total = Math.round(
    MAX_SCORE * (WEIGHTS.completion * completion + WEIGHTS.accuracy * quality * completion + WEIGHTS.speed * speed),
  );
  return {
    total: Math.min(MAX_SCORE, Math.max(0, total)),
    completion,
    accuracy: quality,
    speed,
    percent: Math.round(completion * 100),
  };
}

/** Live score shown while playing (no speed bonus until the challenge is done). */
export function liveScore(progress, accuracy) {
  const completion = clamp01(progress);
  return Math.round(MAX_SCORE * (WEIGHTS.completion * completion + WEIGHTS.accuracy * clamp01(accuracy) * completion));
}
