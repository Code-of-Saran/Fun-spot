/**
 * AI Mirror state machine. Every screen is an explicit phase; anything not
 * listed is ignored. Timed actions carry their `round`, so a timer left over
 * from a previous character can never affect the next one.
 *
 * IDLE → CAMERA_SETUP → RANDOMIZING_CATEGORY → RANDOMIZING_CHARACTER → CHARACTER_REVEAL
 *      → TRANSFORMING → LIVE_MIRROR → CAPTURE_COUNTDOWN → CAPTURED → RESULT
 *
 * RESULT ─ TRY ANOTHER ─▶ RANDOMIZING_CATEGORY (new character, fresh state)
 * RESULT ─ CAPTURE AGAIN ─▶ LIVE_MIRROR (same character)
 * TRANSFORMING ─ art failed to load ─▶ ASSET_ERROR ─▶ TRANSFORMING | RANDOMIZING_CATEGORY
 */
export const PHASE = {
  IDLE: 'IDLE',
  CAMERA_SETUP: 'CAMERA_SETUP',
  RANDOMIZING_CATEGORY: 'RANDOMIZING_CATEGORY',
  RANDOMIZING_CHARACTER: 'RANDOMIZING_CHARACTER',
  CHARACTER_REVEAL: 'CHARACTER_REVEAL',
  TRANSFORMING: 'TRANSFORMING',
  LIVE_MIRROR: 'LIVE_MIRROR',
  CAPTURE_COUNTDOWN: 'CAPTURE_COUNTDOWN',
  CAPTURED: 'CAPTURED',
  RESULT: 'RESULT',
  ASSET_ERROR: 'ASSET_ERROR',
};

export function createInitialState(recent = []) {
  return { phase: PHASE.IDLE, round: 0, pick: null, recent, capture: null };
}

const sameRound = (state, action) => action.round === state.round;

/** Starts a new round with a freshly drawn character; nothing from the old one survives. */
const newRound = (state, pick) => ({
  ...state,
  phase: PHASE.RANDOMIZING_CATEGORY,
  round: state.round + 1,
  pick,
  recent: [...state.recent, pick.character.id].slice(-5),
  capture: null,
});

export function mirrorReducer(state, action) {
  const { phase } = state;
  switch (action.type) {
    case 'START':
      return phase === PHASE.IDLE ? { ...state, phase: PHASE.CAMERA_SETUP } : state;

    case 'CAMERA_READY':
      return phase === PHASE.CAMERA_SETUP ? newRound(state, action.pick) : state;

    case 'REROLL':
      return [PHASE.LIVE_MIRROR, PHASE.RESULT, PHASE.ASSET_ERROR].includes(phase) ? newRound(state, action.pick) : state;

    case 'CATEGORY_DONE':
      return phase === PHASE.RANDOMIZING_CATEGORY && sameRound(state, action)
        ? { ...state, phase: PHASE.RANDOMIZING_CHARACTER }
        : state;

    case 'CHARACTER_DONE':
      return phase === PHASE.RANDOMIZING_CHARACTER && sameRound(state, action)
        ? { ...state, phase: PHASE.CHARACTER_REVEAL }
        : state;

    case 'TRANSFORM':
      return phase === PHASE.CHARACTER_REVEAL && sameRound(state, action) ? { ...state, phase: PHASE.TRANSFORMING } : state;

    case 'ASSETS_FAILED':
      return phase === PHASE.TRANSFORMING && sameRound(state, action) ? { ...state, phase: PHASE.ASSET_ERROR } : state;

    case 'RETRY_ASSETS':
      return phase === PHASE.ASSET_ERROR ? { ...state, phase: PHASE.TRANSFORMING } : state;

    case 'TRANSFORMED':
      return phase === PHASE.TRANSFORMING && sameRound(state, action) ? { ...state, phase: PHASE.LIVE_MIRROR } : state;

    case 'CAPTURE':
      return phase === PHASE.LIVE_MIRROR ? { ...state, phase: PHASE.CAPTURE_COUNTDOWN } : state;

    case 'SNAPPED':
      return phase === PHASE.CAPTURE_COUNTDOWN && sameRound(state, action)
        ? { ...state, phase: PHASE.CAPTURED, capture: action.capture }
        : state;

    case 'CAPTURE_FAILED':
      return phase === PHASE.CAPTURE_COUNTDOWN ? { ...state, phase: PHASE.LIVE_MIRROR } : state;

    case 'SHOW_RESULT':
      return phase === PHASE.CAPTURED && sameRound(state, action) ? { ...state, phase: PHASE.RESULT } : state;

    case 'CAPTURE_AGAIN':
      return phase === PHASE.RESULT ? { ...state, phase: PHASE.LIVE_MIRROR, capture: null } : state;

    default:
      return state;
  }
}
