/**
 * Every Don't Laugh timing/tuning value lives here.
 * (Thresholds were tuned on test footage — fine-tune on the expo laptop's camera.)
 */
export const GAME = {
  ROUND_SECONDS: 45, // survive this long to win (45s)
  CALIBRATION_MS: 2400, // neutral-face sampling before the first round
  COUNTDOWN_STEP_MS: 800, // 3 · 2 · 1 · GO!
  CAMERA_RESOLUTION: { width: 1280, height: 720 },
};

export const LAUGH = {
  TRIGGER: 0.62, // smoothed laugh score that counts as "laughing"…
  CONFIRM_MS: 200, // …when held this long (optimized from 350ms: fast reaction while safely filtering blips)
  SMOOTHING_MS: 90, // time constant of the score's exponential smoothing (optimized from 180ms: fast rise time)
  METER_AT_TRIGGER: 85, // the meter shows the trigger point at 85%
};

export const BUFFER = {
  SECONDS: 2.5, // rolling window of recent camera frames
  FPS: 10, // frames kept per second
  MAX_WIDTH: 640, // buffered frames are downscaled to this width
  BEST_WINDOW_MS: 2000, // when caught, pick the strongest frame from this far back
};

/** Meter bands shown to the crowd. */
export const METER_STATES = [
  { max: 25, label: 'SAFE', tone: 'safe' },
  { max: 50, label: 'CAREFUL', tone: 'careful' },
  { max: 75, label: "DON'T LAUGH!", tone: 'warn' },
  { max: 101, label: 'CRITICAL', tone: 'critical' },
];

export const meterState = (percent) => METER_STATES.find((s) => percent <= s.max) ?? METER_STATES.at(-1);
