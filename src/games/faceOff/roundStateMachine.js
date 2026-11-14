/**
 * FUN SPOT — FACE OFF: AI EXPRESSION MATCH
 * Round State Machine & Lifecycle Transitions
 */

export const ROUND_STATE = {
  CONSENT: 'consent',
  INITIALIZING: 'initializing',
  CAMERA_READY: 'camera_ready',
  LOADING_REFERENCE: 'loading_reference',
  ANALYZING_REFERENCE: 'analyzing_reference',
  READY: 'ready',
  COUNTDOWN: 'countdown',
  CAPTURING: 'capturing',
  ANALYZING_CAPTURE: 'analyzing_capture',
  SHOWING_RESULT: 'showing_result',
  RETRY_REQUIRED: 'retry_required',
  ERROR: 'error',
  SUMMARY: 'summary',
};

export const ROUND_STATE_LABELS = {
  [ROUND_STATE.CONSENT]: 'Awaiting Consent',
  [ROUND_STATE.INITIALIZING]: 'Initializing Camera & AI',
  [ROUND_STATE.CAMERA_READY]: 'Camera Ready',
  [ROUND_STATE.LOADING_REFERENCE]: 'Loading Reference Image',
  [ROUND_STATE.ANALYZING_REFERENCE]: 'Analyzing Reference Target',
  [ROUND_STATE.READY]: 'Ready to Match',
  [ROUND_STATE.COUNTDOWN]: 'Countdown Active',
  [ROUND_STATE.CAPTURING]: 'Capturing Photo Frame',
  [ROUND_STATE.ANALYZING_CAPTURE]: 'Evaluating Facial Match',
  [ROUND_STATE.SHOWING_RESULT]: 'Results Displayed',
  [ROUND_STATE.RETRY_REQUIRED]: 'Retry Required',
  [ROUND_STATE.ERROR]: 'System Error',
  [ROUND_STATE.SUMMARY]: 'Session Complete',
};

/**
 * Returns true if the stage should render the camera arena
 */
export function isArenaStage(state) {
  return [
    ROUND_STATE.INITIALIZING,
    ROUND_STATE.CAMERA_READY,
    ROUND_STATE.LOADING_REFERENCE,
    ROUND_STATE.ANALYZING_REFERENCE,
    ROUND_STATE.READY,
    ROUND_STATE.COUNTDOWN,
    ROUND_STATE.CAPTURING,
    ROUND_STATE.ANALYZING_CAPTURE,
    ROUND_STATE.RETRY_REQUIRED,
    ROUND_STATE.ERROR,
  ].includes(state);
}

/**
 * Returns true if live face tracking should run during this state
 */
export function isTrackingActive(state) {
  return state === ROUND_STATE.READY || state === ROUND_STATE.COUNTDOWN;
}

/**
 * Check whether all prerequisites are met to enable the Start Challenge button
 */
export function checkReadiness({ isVideoReady, isCameraActive, isModelReady, isReferenceReady }) {
  return {
    video: Boolean(isVideoReady),
    camera: Boolean(isCameraActive),
    model: Boolean(isModelReady),
    reference: Boolean(isReferenceReady),
    allReady: Boolean(isVideoReady && isCameraActive && isModelReady && isReferenceReady),
  };
}

