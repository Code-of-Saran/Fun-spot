/**
 * Random game state machine. Every screen is an explicit phase and only the
 * transitions listed here are possible; anything else is ignored. Timed actions
 * carry the `round` they belong to, so a stale timer from a previous round can
 * never change the current one.
 *
 * NAME_ENTRY → RANDOMIZING → REVEAL → COUNTDOWN → PLAYING → SCORING → RESULT
 *                  ↑                                                   │
 *                  └──────────────── PLAY_AGAIN ───────────────────────┘
 * (PLAYING ends as SUCCESS or TIMEOUT; combo steps live inside the detector.)
 */
export const PHASE = {
  NAME_ENTRY: 'NAME_ENTRY',
  RANDOMIZING: 'RANDOMIZING',
  REVEAL: 'REVEAL',
  COUNTDOWN: 'COUNTDOWN',
  PLAYING: 'PLAYING',
  SCORING: 'SCORING',
  RESULT: 'RESULT',
};

export const OUTCOME = { SUCCESS: 'SUCCESS', TIMEOUT: 'TIMEOUT' };

export function createInitialState(player = '', recent = []) {
  return { phase: PHASE.NAME_ENTRY, player, round: 0, challenge: null, recent, run: null, result: null };
}

const sameRound = (state, action) => action.round === state.round;

export function gameReducer(state, action) {
  switch (action.type) {
    case 'START':
    case 'PLAY_AGAIN':
      if (state.phase !== PHASE.NAME_ENTRY && state.phase !== PHASE.RESULT) return state;
      return {
        ...state,
        phase: PHASE.RANDOMIZING,
        player: action.player ?? state.player,
        round: state.round + 1,
        challenge: action.challenge,
        recent: [...state.recent, action.challenge.id].slice(-5),
        run: null,
        result: null,
      };

    case 'REVEAL':
      return state.phase === PHASE.RANDOMIZING && sameRound(state, action) ? { ...state, phase: PHASE.REVEAL } : state;

    case 'READY':
      return state.phase === PHASE.REVEAL ? { ...state, phase: PHASE.COUNTDOWN } : state;

    case 'GO':
      return state.phase === PHASE.COUNTDOWN && sameRound(state, action) ? { ...state, phase: PHASE.PLAYING } : state;

    case 'FINISH':
      return state.phase === PHASE.PLAYING && sameRound(state, action)
        ? { ...state, phase: PHASE.SCORING, run: action.run }
        : state;

    case 'SCORED':
      return state.phase === PHASE.SCORING && sameRound(state, action)
        ? { ...state, phase: PHASE.RESULT, result: action.result }
        : state;

    // Camera/vision failure mid-round: back to the reveal screen (same challenge) to recover.
    case 'ABORT':
      return [PHASE.COUNTDOWN, PHASE.PLAYING].includes(state.phase) ? { ...state, phase: PHASE.REVEAL, run: null } : state;

    case 'CHANGE_PLAYER':
      return state.phase === PHASE.RESULT || state.phase === PHASE.REVEAL
        ? { ...state, phase: PHASE.NAME_ENTRY, player: '', challenge: null, run: null, result: null }
        : state;

    default:
      return state;
  }
}
