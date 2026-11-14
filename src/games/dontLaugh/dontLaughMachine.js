/**
 * Don't Laugh state machine. Each screen is an explicit phase; anything not
 * listed is ignored. Timed actions carry their `round`, so a timer from an old
 * round can never change the current one — and LAUGH can only fire once per
 * round (PLAYING → LAUGH_DETECTED), which makes duplicate captures impossible.
 *
 * NAME_ENTRY → NOTICE → CAMERA_SETUP → CALIBRATION → COUNTDOWN → PLAYING
 *   PLAYING ─ laugh ─▶ LAUGH_DETECTED → CAPTURING → RESULT (caught)
 *   PLAYING ─ time ──▶ SURVIVED → RESULT (survived)
 * RESULT ─ PLAY AGAIN ─▶ COUNTDOWN (same player, calibration kept)
 */
export const PHASE = {
  NAME_ENTRY: 'NAME_ENTRY',
  NOTICE: 'NOTICE',
  CAMERA_SETUP: 'CAMERA_SETUP',
  CALIBRATION: 'CALIBRATION',
  COUNTDOWN: 'COUNTDOWN',
  PLAYING: 'PLAYING',
  LAUGH_DETECTED: 'LAUGH_DETECTED',
  CAPTURING: 'CAPTURING',
  SURVIVED: 'SURVIVED',
  RESULT: 'RESULT',
};

export function createInitialState(player = 'user') {
  return { phase: PHASE.CAMERA_SETUP, player: player || 'user', round: 0, baseline: null, outcome: null, result: null };
}

const sameRound = (state, action) => action.round === state.round;
const at = (state, ...phases) => phases.includes(state.phase);

export function dontLaughReducer(state, action) {
  switch (action.type) {
    case 'SUBMIT_NAME':
      return at(state, PHASE.NAME_ENTRY, PHASE.CAMERA_SETUP) ? { ...state, phase: PHASE.NOTICE, player: action.player } : state;

    case 'ACCEPT_NOTICE':
      return at(state, PHASE.NOTICE) ? { ...state, phase: PHASE.CAMERA_SETUP } : state;

    case 'BACK_TO_NAME': // same person fixing their name
      return at(state, PHASE.NOTICE) ? { ...state, phase: PHASE.NAME_ENTRY } : state;

    case 'NEW_PLAYER': // next participant: nothing from the previous player carries over
      return at(state, PHASE.RESULT) ? { ...createInitialState(), round: state.round } : state;

    case 'CAMERA_READY':
      return at(state, PHASE.CAMERA_SETUP) ? { ...state, phase: state.baseline ? PHASE.COUNTDOWN : PHASE.CALIBRATION, round: state.round + 1 } : state;

    case 'CALIBRATED':
      return at(state, PHASE.CALIBRATION) && sameRound(state, action)
        ? { ...state, phase: PHASE.COUNTDOWN, baseline: action.baseline }
        : state;

    case 'GO':
      return at(state, PHASE.COUNTDOWN) && sameRound(state, action) ? { ...state, phase: PHASE.PLAYING } : state;

    case 'LAUGH':
      return at(state, PHASE.PLAYING) && sameRound(state, action)
        ? { ...state, phase: PHASE.LAUGH_DETECTED, outcome: 'caught', result: { lastedMs: action.lastedMs, peak: action.peak } }
        : state;

    case 'CAPTURE':
      return at(state, PHASE.LAUGH_DETECTED) && sameRound(state, action) ? { ...state, phase: PHASE.CAPTURING } : state;

    case 'CAPTURED':
      return at(state, PHASE.CAPTURING) && sameRound(state, action)
        ? { ...state, phase: PHASE.RESULT, result: { ...state.result, capture: action.capture } }
        : state;

    case 'TIMEOUT':
      return at(state, PHASE.PLAYING) && sameRound(state, action)
        ? { ...state, phase: PHASE.SURVIVED, outcome: 'survived', result: { lastedMs: action.lastedMs, peak: action.peak } }
        : state;

    case 'SHOW_RESULT':
      return at(state, PHASE.SURVIVED) && sameRound(state, action) ? { ...state, phase: PHASE.RESULT } : state;

    case 'PLAY_AGAIN':
      return at(state, PHASE.RESULT) ? { ...state, phase: PHASE.CAMERA_SETUP, outcome: null, result: null } : state;

    default:
      return state;
  }
}
