/**
 * Leaderboard input rules. The same rules are enforced in the database
 * (supabase/migrations/) — this copy gives instant feedback
 * in the UI and stops bad data before any network call.
 */
export const NAME_MAX_LENGTH = 20;

/**
 * Stored game modes and their score rules. Only these may be submitted.
 *   random        — legacy board (Phase 2); no longer shown in UI but kept for existing Supabase rows
 *   wrong_answers — 0–100 with one decimal (average of AI-judged rounds)
 */
export const SCORE_RULES = {
  random: { min: 0, max: 1000, decimals: 0 },
  wrong_answers: { min: 0, max: 100, decimals: 1 },
  face_off: { min: 0, max: 100, decimals: 1 },
};
/** Leaderboard route id → stored game_mode. */
export const BOARD_GAME_MODES = {
  random: 'random',
  'wrong-answers': 'wrong_answers',
  'face-off': 'face_off',
};

const NAME_PATTERN = /^[\p{L}\p{M}\p{N} ._'-]+$/u;

/** Trims, collapses whitespace and strips control characters. */
export function normalizePlayerName(raw) {
  return String(raw ?? '')
    .normalize('NFC')
    .replace(/\p{Cc}/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** @returns {{ ok: true, value: string } | { ok: false, error: string }} */
export function validatePlayerName(raw) {
  const value = normalizePlayerName(raw);
  if (!value) return { ok: false, error: 'Please enter your name.' };
  if ([...value].length > NAME_MAX_LENGTH) return { ok: false, error: `Max ${NAME_MAX_LENGTH} characters.` };
  if (!NAME_PATTERN.test(value)) return { ok: false, error: "Letters, numbers, spaces and . _ - ' only." };
  return { ok: true, value };
}

/** @returns {{ ok: true, value: { playerName: string, gameMode: string, score: number } } | { ok: false, error: string }} */
export function validateScoreEntry(input) {
  if (!input || typeof input !== 'object') return { ok: false, error: 'Invalid entry.' };
  const name = validatePlayerName(input.playerName);
  if (!name.ok) return name;
  const rule = SCORE_RULES[input.gameMode];
  if (!rule || !Object.hasOwn(SCORE_RULES, input.gameMode)) return { ok: false, error: 'Invalid game mode.' };
  const { score } = input;
  const factor = 10 ** rule.decimals;
  if (
    typeof score !== 'number' ||
    !Number.isFinite(score) ||
    score < rule.min ||
    score > rule.max ||
    Math.abs(Math.round(score * factor) - score * factor) > 1e-6 // e.g. 92.4 ok, 92.45 not
  ) {
    return { ok: false, error: 'Invalid score.' };
  }
  return { ok: true, value: { playerName: name.value, gameMode: input.gameMode, score } };
}
