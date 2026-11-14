import { createHandsUpDetector } from './handsUp';
import { createWaveDetector } from './wave';
import { createClapDetector } from './clap';
import { createFreezeDetector } from './freeze';
import { createSuperheroDetector } from './superhero';
import { createChickenFlapDetector } from './chickenFlap';
import { createPointingDetector } from './pointing';
import { createFingerCountDetector } from './fingerCount';
import { createRobotDetector } from './robot';
import { createComboDetector } from './combo';

/**
 * Detector registry, keyed by the `detector` field of a challenge.
 * Every detector exposes `update(frame)` → { progress 0–1, accuracy 0–1, done, hint, events[] }.
 */
export const detectors = {
  handsUp: createHandsUpDetector,
  wave: createWaveDetector,
  clap: createClapDetector,
  freeze: createFreezeDetector,
  superhero: createSuperheroDetector,
  chickenFlap: createChickenFlapDetector,
  pointing: createPointingDetector,
  fingerCount: createFingerCountDetector,
  robot: createRobotDetector,
  combo: (params) => createComboDetector(params, detectors),
};
