import { pick, randomInt, shuffle } from './randomUtils';

/**
 * The Random challenge pool. The engine picks from this list — the UI never
 * chooses a challenge. Fields:
 *  - duration: time limit (s)          - minTime: fastest realistic finish (s), for the speed bonus
 *  - detector: key in detectors/index  - params: detector settings
 *  - needsHands: also run the Hand model (heavier, so only when required)
 *  - randomize(rng): optional per-round variation → { params, title?, instruction? }
 */
export const CHALLENGES = [
  {
    id: 'hands-up',
    title: 'HANDS UP',
    icon: '🙌',
    instruction: 'Raise both hands above your shoulders.',
    category: 'pose',
    difficulty: 'easy',
    duration: 5,
    minTime: 1,
    detector: 'handsUp',
    params: { holdMs: 1000 },
  },
  {
    id: 'wave',
    title: 'WAVE',
    icon: '👋',
    instruction: 'Wave your hand continuously for 3 seconds.',
    category: 'motion',
    difficulty: 'easy',
    duration: 8,
    minTime: 3,
    detector: 'wave',
    params: { activeMs: 3000, minReversals: 4 },
  },
  {
    id: 'clap',
    title: 'CLAP 5 TIMES',
    icon: '👏',
    instruction: 'Clap your hands 5 times — open wide between claps!',
    category: 'hands',
    difficulty: 'easy',
    duration: 8,
    minTime: 2,
    detector: 'clap',
    params: { count: 5 },
  },
  {
    id: 'freeze',
    title: 'FREEZE',
    icon: '🗿',
    instruction: "Don't move for 3 seconds.",
    category: 'control',
    difficulty: 'medium',
    duration: 6,
    minTime: 3,
    detector: 'freeze',
    params: { holdMs: 3000 },
  },
  {
    id: 'superhero',
    title: 'SUPERHERO POSE',
    icon: '🦸',
    instruction: 'Strike a superhero pose! Fists on hips — or one fist to the sky.',
    category: 'pose',
    difficulty: 'medium',
    duration: 6,
    minTime: 1,
    detector: 'superhero',
    params: { holdMs: 1000 },
  },
  {
    id: 'chicken',
    title: 'CHICKEN FLAP',
    icon: '🐔',
    instruction: 'Flap your arms like a chicken — 6 big flaps!',
    category: 'motion',
    difficulty: 'easy',
    duration: 8,
    minTime: 2.5,
    detector: 'chickenFlap',
    params: { count: 6 },
  },
  {
    id: 'point',
    title: 'POINT',
    icon: '👉',
    instruction: 'Point with your arm stretched out.',
    category: 'pose',
    difficulty: 'easy',
    duration: 5,
    minTime: 1,
    detector: 'pointing',
    params: { holdMs: 1000 },
    randomize: (rng) => {
      const direction = pick(['left', 'right'], rng);
      return {
        params: { direction },
        icon: direction === 'left' ? '👈' : '👉',
        title: `POINT ${direction.toUpperCase()}`,
        instruction: `Stretch your arm out and point to YOUR ${direction.toUpperCase()}.`,
      };
    },
  },
  {
    id: 'fingers',
    title: 'FINGER COUNT',
    icon: '✋',
    instruction: 'Show the right number of fingers on one hand.',
    category: 'hands',
    difficulty: 'medium',
    duration: 6,
    minTime: 0.7,
    detector: 'fingerCount',
    needsHands: true,
    params: { holdMs: 700 },
    randomize: (rng) => {
      const target = 1 + randomInt(5, rng);
      return {
        params: { target },
        title: `SHOW ${target} FINGER${target === 1 ? '' : 'S'}`,
        instruction: `Hold up exactly ${target} finger${target === 1 ? '' : 's'} on one hand, facing the camera.`,
      };
    },
  },
  {
    id: 'robot',
    title: 'ROBOT MODE',
    icon: '🤖',
    instruction: 'Move like a robot for 4 seconds — sharp moves, sudden stops!',
    category: 'motion',
    difficulty: 'hard',
    duration: 8,
    minTime: 3.5,
    detector: 'robot',
    params: { beats: 6, minSpanMs: 3500 },
  },
  {
    id: 'combo',
    title: 'COMBO CHALLENGE',
    icon: '🔥',
    instruction: 'Complete every move in order!',
    category: 'combo',
    difficulty: 'hard',
    duration: 14,
    minTime: 4,
    detector: 'combo',
    params: {},
    randomize: (rng) => buildCombo(rng),
  },
];

/** Short versions of challenges that can be chained in a combo. */
const COMBO_STEPS = [
  { id: 'clap', label: 'CLAP ×3', icon: '👏', detector: 'clap', params: { count: 3 }, minTime: 1.2 },
  { id: 'hands-up', label: 'HANDS UP', icon: '🙌', detector: 'handsUp', params: { holdMs: 800 }, minTime: 0.8 },
  { id: 'freeze', label: 'FREEZE 2s', icon: '🗿', detector: 'freeze', params: { holdMs: 2000 }, minTime: 2 },
  { id: 'wave', label: 'WAVE', icon: '👋', detector: 'wave', params: { activeMs: 1500, minReversals: 3 }, minTime: 1.5 },
  { id: 'superhero', label: 'HERO POSE', icon: '🦸', detector: 'superhero', params: { holdMs: 800 }, minTime: 0.8 },
  {
    id: 'point',
    label: 'POINT',
    icon: '👉',
    detector: 'pointing',
    params: { holdMs: 800 },
    minTime: 0.8,
    randomize: (rng) => {
      const direction = pick(['left', 'right'], rng);
      return { label: `POINT ${direction.toUpperCase()}`, icon: direction === 'left' ? '👈' : '👉', params: { direction } };
    },
  },
];

/**
 * 2–3 distinct steps in random order. Distinct steps guarantee no step repeats
 * back-to-back, and every step is achievable from any previous pose.
 */
export function buildCombo(rng) {
  const length = 2 + randomInt(2, rng);
  const steps = shuffle(COMBO_STEPS, rng)
    .slice(0, length)
    .map(({ randomize, ...step }) => {
      const extra = randomize?.(rng) ?? {};
      return { ...step, ...extra, params: { ...step.params, ...extra.params } };
    });
  return {
    params: { steps },
    duration: 6 + steps.length * 3,
    minTime: steps.reduce((sum, step) => sum + step.minTime, 0),
    instruction: `Do these ${steps.length} moves in order!`,
  };
}
