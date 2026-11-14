import { describe, expect, it, vi } from 'vitest';
import { PROMPTS, pickPrompt } from '../prompts';
import { bestRound, gameRating, gameScore, weightedScore } from '../scoring';
import { FALLBACK_CAP, fallbackJudge } from '../fallbackJudge';
import { createInitialState, PHASE, wrongAnswersReducer } from '../wrongAnswersMachine';
import { GAME_CONFIG } from '../gameConfig';
import { createJudgeClient } from '../../../services/aiJudge';

describe('prompt pool', () => {
  it('has at least 50 unique, short questions', () => {
    expect(PROMPTS.length).toBeGreaterThanOrEqual(50);
    expect(new Set(PROMPTS.map((p) => p.question)).size).toBe(PROMPTS.length);
    expect(new Set(PROMPTS.map((p) => p.id)).size).toBe(PROMPTS.length);
    for (const { question } of PROMPTS) {
      expect(question.length).toBeLessThanOrEqual(200); // backend limit
      expect(question.endsWith('?')).toBe(true);
    }
  });

  it('never repeats within a game and is not sequential', () => {
    for (let game = 0; game < 300; game += 1) {
      const used = [];
      for (let r = 0; r < GAME_CONFIG.totalRounds; r += 1) used.push(pickPrompt(used).id);
      expect(new Set(used).size).toBe(used.length);
    }
    const firsts = Array.from({ length: 400 }, () => pickPrompt([]).id);
    expect(new Set(firsts).size).toBeGreaterThan(PROMPTS.length * 0.7);
  });

  it('handles a tiny pool without looping forever', () => {
    const pool = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
    expect(pickPrompt(['a', 'b', 'c'], { pool }).id).toBe('a'); // only the last 2 are excluded
    expect(pickPrompt(['a'], { pool: [{ id: 'a' }] }).id).toBe('a');
  });
});

describe('scoring', () => {
  it('uses the 35/30/25/10 weights', () => {
    // 92*0.35 + 88*0.30 + 95*0.25 + 90*0.10 = 32.2+26.4+23.75+9.0 = 91.35 → 91.4
    expect(weightedScore({ creativity: 92, humor: 88, originality: 95, relevance: 90 })).toBe(91.4);
    // 100*0.35 + 0 + 0 + 0 = 35
    expect(weightedScore({ creativity: 100, humor: 0, originality: 0, relevance: 0 })).toBe(35);
    // clamped: creativity=100, humor=0, originality=0, relevance=100 → 35+0+0+10 = 45
    expect(weightedScore({ creativity: 150, humor: -5, originality: NaN, relevance: 100 })).toBe(45);
  });

  it('game score is the average of round scores, one decimal', () => {
    const rounds = [{ score: 92 }, { score: 96 }, { score: 0 }, { score: 88.5 }, { score: 85.7 }];
    expect(gameScore(rounds)).toBe(72.4);
    expect(bestRound(rounds).score).toBe(96);
    expect(gameScore([])).toBe(0);
    expect(gameRating(90)).toMatch(/CREATIVE CHAOS/);
    expect(gameRating(10)).toBeTruthy();
  });
});

describe('fallback (backup) scoring', () => {
  const Q = 'Why does the moon follow your car?';
  it('is labelled and capped so it can never look like a top AI score', () => {
    const r = fallbackJudge(Q, 'Because the moon secretly works for the parking union and follows every car to collect fees! 🚗🌙');
    expect(r.source).toBe('fallback');
    expect(r.final_score).toBeLessThanOrEqual(FALLBACK_CAP);
    expect(r.final_score).toBeGreaterThan(40);
  });

  it('rewards a related answer over an unrelated one, and gibberish scores low', () => {
    const related = fallbackJudge(Q, 'Because the moon wants a free ride in your car.');
    const unrelated = fallbackJudge(Q, 'My laptop has sixteen gigabytes memory.');
    expect(related.relevance).toBeGreaterThan(unrelated.relevance);
    expect(fallbackJudge(Q, 'sdfghjklqwrtp zxcvbnm').final_score).toBeLessThan(10);
  });
});

describe('state machine', () => {
  const prompt = (id) => ({ id, question: `Why ${id}?` });
  const start = () => {
    let s = wrongAnswersReducer(createInitialState(), { type: 'SUBMIT_NAME', player: 'ANUSH' });
    expect(s.phase).toBe(PHASE.INSTRUCTIONS);
    s = wrongAnswersReducer(s, { type: 'START_GAME', prompt: prompt('q1') });
    return wrongAnswersReducer(s, { type: 'PROMPT_READY', game: s.game, round: s.round });
  };
  const judged = (score) => ({ creativity: score, humor: score, originality: score, relevance: score, score, feedback: 'nice', source: 'ai' });

  it('plays all rounds to the final result', () => {
    let s = start();
    for (let r = 1; r <= GAME_CONFIG.totalRounds; r += 1) {
      expect(s.phase).toBe(PHASE.ANSWERING);
      s = wrongAnswersReducer(s, { type: 'SUBMIT', answer: `answer ${r}` });
      expect(wrongAnswersReducer(s, { type: 'SUBMIT', answer: 'again' })).toBe(s); // double submit ignored
      s = wrongAnswersReducer(s, { type: 'JUDGED', game: s.game, round: s.round, result: judged(80 + r) });
      expect(s.phase).toBe(PHASE.ROUND_RESULT);
      s = wrongAnswersReducer(s, { type: 'NEXT', prompt: prompt(`q${r + 1}`) });
      if (s.phase === PHASE.LOADING_PROMPT) s = wrongAnswersReducer(s, { type: 'PROMPT_READY', game: s.game, round: s.round });
    }
    expect(s.phase).toBe(PHASE.FINAL_RESULT);
    expect(s.rounds.map((r) => r.answer)).toEqual(['answer 1', 'answer 2', 'answer 3', 'answer 4', 'answer 5']);
    expect(new Set(s.used).size).toBe(GAME_CONFIG.totalRounds);
  });

  it('ignores a late judge result from an old round or game', () => {
    let s = start();
    s = wrongAnswersReducer(s, { type: 'SUBMIT', answer: 'x' });
    expect(wrongAnswersReducer(s, { type: 'JUDGED', game: s.game - 1, round: s.round, result: judged(99) })).toBe(s);
    expect(wrongAnswersReducer(s, { type: 'JUDGED', game: s.game, round: s.round + 1, result: judged(99) })).toBe(s);
  });

  it('time up with no answer scores 0', () => {
    let s = start();
    s = wrongAnswersReducer(s, { type: 'TIME_UP', game: s.game, round: s.round });
    expect(s.phase).toBe(PHASE.ROUND_RESULT);
    expect(s.rounds[0]).toMatchObject({ score: 0, source: 'timeout' });
  });

  it('play again resets answers and prompt history; new player resets everything', () => {
    let s = start();
    for (let r = 1; r <= GAME_CONFIG.totalRounds; r += 1) {
      s = wrongAnswersReducer(s, { type: 'SUBMIT', answer: 'a' });
      s = wrongAnswersReducer(s, { type: 'JUDGED', game: s.game, round: s.round, result: judged(50) });
      s = wrongAnswersReducer(s, { type: 'NEXT', prompt: prompt(`q${r + 1}`) });
      if (s.phase === PHASE.LOADING_PROMPT) s = wrongAnswersReducer(s, { type: 'PROMPT_READY', game: s.game, round: s.round });
    }
    const again = wrongAnswersReducer(s, { type: 'PLAY_AGAIN', prompt: prompt('q9') });
    expect(again).toMatchObject({ phase: PHASE.LOADING_PROMPT, round: 1, rounds: [], used: ['q9'], player: 'ANUSH' });
    expect(again.game).toBe(s.game + 1);
    const next = wrongAnswersReducer(s, { type: 'NEW_PLAYER' });
    expect(next).toMatchObject({ phase: PHASE.NAME_ENTRY, player: '', rounds: [], used: [] });
  });
});

describe('judge client', () => {
  const json = (status, body) => vi.fn(async () => ({ status, json: async () => body }));
  const AI = { ok: true, source: 'ai', creativity: 92, humor: 88, originality: 95, relevance: 90, final_score: 91.2, feedback: 'Comedically excellent.', attempts: 1 };
  const input = { question: 'Why?', answer: 'Because.' };

  it('returns AI scores and sends only question + answer', async () => {
    const fetchImpl = json(200, AI);
    const r = await createJudgeClient({ endpoint: '/j', fetchImpl }).judge(input);
    expect(r).toMatchObject({ source: 'ai', final_score: 91.2, retried: false });
    expect(JSON.parse(fetchImpl.mock.calls[0][1].body)).toEqual(input);
  });

  it('does not re-request when the backend says the AI is unavailable (it already retried)', async () => {
    const fetchImpl = json(503, { ok: false, reason: 'unavailable' });
    const r = await createJudgeClient({ endpoint: '/j', fetchImpl }).judge(input);
    expect(r).toEqual({ source: 'fallback', reason: 'unavailable' });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('retries once when the backend is unreachable, then falls back', async () => {
    const onRetry = vi.fn();
    const fetchImpl = vi.fn(async () => {
      throw new TypeError('Failed to fetch');
    });
    const r = await createJudgeClient({ endpoint: '/j', fetchImpl }).judge(input, { onRetry });
    expect(r).toEqual({ source: 'fallback', reason: 'unreachable' });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('recovers on the retry', async () => {
    const fetchImpl = vi.fn().mockRejectedValueOnce(new TypeError('Failed to fetch')).mockResolvedValueOnce({ status: 200, json: async () => AI });
    const r = await createJudgeClient({ endpoint: '/j', fetchImpl }).judge(input);
    expect(r).toMatchObject({ source: 'ai', retried: true });
  });

  it('treats malformed or out-of-range responses as unavailable', async () => {
    for (const bad of [{ ...AI, humor: 140 }, { ...AI, feedback: '' }, { ...AI, creativity: 'high' }, { ok: true }]) {
      const r = await createJudgeClient({ endpoint: '/j', fetchImpl: json(200, bad) }).judge(input);
      expect(r.source).toBe('fallback');
    }
  });
});
