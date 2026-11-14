import { GAME_CONFIG } from './gameConfig';

/**
 * Wrong Answers Only!! state machine. Every screen is an explicit phase;
 * actions that don't fit the current phase are ignored. Async results carry
 * `game` + `round`, so a late judge response can never land in a new game,
 * and SUBMIT is only accepted while ANSWERING (no double submissions).
 *
 * NAME_ENTRY → INSTRUCTIONS → LOADING_PROMPT → ANSWERING → JUDGING → ROUND_RESULT
 *        ROUND_RESULT ─ NEXT ─▶ LOADING_PROMPT (next round) | FINAL_RESULT (after the last)
 * FINAL_RESULT ─ PLAY_AGAIN ─▶ LOADING_PROMPT (fresh game) | NEW_PLAYER ─▶ NAME_ENTRY
 */
export const PHASE = {
  NAME_ENTRY: 'NAME_ENTRY',
  INSTRUCTIONS: 'INSTRUCTIONS',
  LOADING_PROMPT: 'LOADING_PROMPT',
  ANSWERING: 'ANSWERING',
  JUDGING: 'JUDGING',
  ROUND_RESULT: 'ROUND_RESULT',
  FINAL_RESULT: 'FINAL_RESULT',
};

export function createInitialState() {
  return { phase: PHASE.NAME_ENTRY, player: '', game: 0, round: 0, prompt: null, used: [], answer: '', rounds: [] };
}

const fresh = (state, prompt) => ({
  ...state,
  phase: PHASE.LOADING_PROMPT,
  game: state.game + 1,
  round: 1,
  prompt,
  used: [prompt.id], // prompt history resets with every new game
  answer: '',
  rounds: [],
});

const current = (state, action) => action.game === state.game && action.round === state.round;

export function wrongAnswersReducer(state, action) {
  switch (action.type) {
    case 'SUBMIT_NAME':
      return state.phase === PHASE.NAME_ENTRY ? { ...state, phase: PHASE.INSTRUCTIONS, player: action.player } : state;

    case 'START_GAME':
      return state.phase === PHASE.INSTRUCTIONS ? fresh(state, action.prompt) : state;

    case 'PLAY_AGAIN':
      return state.phase === PHASE.FINAL_RESULT ? fresh(state, action.prompt) : state;

    case 'PROMPT_READY':
      return state.phase === PHASE.LOADING_PROMPT && current(state, action) ? { ...state, phase: PHASE.ANSWERING } : state;

    case 'SUBMIT':
      return state.phase === PHASE.ANSWERING ? { ...state, phase: PHASE.JUDGING, answer: action.answer } : state;

    case 'TIME_UP': // nothing submitted in time → this round scores 0
      return state.phase === PHASE.ANSWERING && current(state, action)
        ? {
            ...state,
            phase: PHASE.ROUND_RESULT,
            answer: '',
            rounds: [
              ...state.rounds,
              {
                round: state.round,
                question: state.prompt.question,
                answer: '',
                creativity: 0,
                humor: 0,
                originality: 0,
                relevance: 0,
                score: 0,
                feedback: 'Time’s up! The best wrong answer is one that exists.',
                source: 'timeout',
              },
            ],
          }
        : state;

    case 'JUDGED':
      return state.phase === PHASE.JUDGING && current(state, action)
        ? {
            ...state,
            phase: PHASE.ROUND_RESULT,
            rounds: [...state.rounds, { round: state.round, question: state.prompt.question, answer: state.answer, ...action.result }],
          }
        : state;

    case 'NEXT':
      if (state.phase !== PHASE.ROUND_RESULT) return state;
      if (state.round >= GAME_CONFIG.totalRounds) return { ...state, phase: PHASE.FINAL_RESULT };
      return {
        ...state,
        phase: PHASE.LOADING_PROMPT,
        round: state.round + 1,
        prompt: action.prompt,
        used: [...state.used, action.prompt.id],
        answer: '',
      };

    case 'NEW_PLAYER': // nothing from the previous player carries over
      return state.phase === PHASE.FINAL_RESULT ? { ...createInitialState(), game: state.game } : state;

    default:
      return state;
  }
}
