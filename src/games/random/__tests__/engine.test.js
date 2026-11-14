import { describe, expect, it } from 'vitest';
import { CHALLENGES } from '../challenges';
import { createChallengeDetector, pickChallenge, resolveChallenge } from '../challengeEngine';
import { computeScore, liveScore, MAX_SCORE } from '../scoring';
import { createInitialState, gameReducer, OUTCOME, PHASE } from '../gameMachine';
import { getFeedback } from '../feedback';

describe('challenge engine', () => {
  it('has at least 10 challenges, each with a working detector', () => {
    expect(CHALLENGES.length).toBeGreaterThanOrEqual(10);
    for (const definition of CHALLENGES) {
      expect(() => createChallengeDetector(resolveChallenge(definition))).not.toThrow();
    }
  });

  it('never repeats any of the previous 2 challenges and covers the whole pool', () => {
    const history = [];
    const seen = new Set();
    for (let i = 0; i < 3000; i += 1) {
      const challenge = pickChallenge(history);
      expect(history.slice(-2)).not.toContain(challenge.id);
      history.push(challenge.id);
      seen.add(challenge.id);
    }
    expect(seen.size).toBe(CHALLENGES.length);
  });

  it('randomizes parameters', () => {
    const directions = new Set();
    const targets = new Set();
    const comboLengths = new Set();
    for (let i = 0; i < 4000; i += 1) {
      const c = pickChallenge();
      if (c.id === 'point') directions.add(c.params.direction);
      if (c.id === 'fingers') targets.add(c.params.target);
      if (c.id === 'combo') {
        const ids = c.params.steps.map((s) => s.id);
        comboLengths.add(ids.length);
        expect(new Set(ids).size).toBe(ids.length); // no repeated step
        expect(c.duration).toBeGreaterThan(c.minTime);
      }
    }
    expect([...directions].sort()).toEqual(['left', 'right']);
    expect([...targets].sort()).toEqual([1, 2, 3, 4, 5]);
    expect([...comboLengths].sort()).toEqual([2, 3]);
  });

  it('gives every round a fresh detector with clean state', () => {
    const challenge = pickChallenge();
    const a = createChallengeDetector(challenge);
    const b = createChallengeDetector(challenge);
    expect(a).not.toBe(b);
  });
});

describe('scoring', () => {
  const base = { durationMs: 8000, minTimeMs: 2000 };
  it('stays within 0–1000', () => {
    expect(computeScore({ ...base, completed: true, progress: 1, accuracy: 1, elapsedMs: 2000 }).total).toBe(MAX_SCORE);
    expect(computeScore({ ...base, completed: false, progress: 0, accuracy: 0, elapsedMs: 8000 }).total).toBe(0);
    expect(computeScore({ ...base, completed: false, progress: NaN, accuracy: Infinity, elapsedMs: 8000 }).total).toBe(0);
  });
  it('weights completion 70 / accuracy 20 / speed 10', () => {
    const slowPerfect = computeScore({ ...base, completed: true, progress: 1, accuracy: 1, elapsedMs: 8000 });
    expect(slowPerfect.total).toBe(900);
    const half = computeScore({ ...base, completed: false, progress: 0.5, accuracy: 1, elapsedMs: 8000 });
    expect(half.total).toBe(450);
    expect(half.percent).toBe(50);
  });
  it('rewards faster completion without making speed dominant', () => {
    const fast = computeScore({ ...base, completed: true, progress: 1, accuracy: 0.8, elapsedMs: 3000 });
    const slow = computeScore({ ...base, completed: true, progress: 1, accuracy: 0.8, elapsedMs: 7000 });
    expect(fast.total).toBeGreaterThan(slow.total);
    expect(fast.total - slow.total).toBeLessThanOrEqual(100);
  });
  it('live score never exceeds the final score of a completed run', () => {
    expect(liveScore(1, 1)).toBe(900);
  });
  it('feedback is tiered', () => {
    expect(getFeedback(950).tier).toBe('high');
    expect(getFeedback(600).tier).toBe('medium');
    expect(getFeedback(100).tier).toBe('low');
  });
});

describe('game state machine', () => {
  const challenge = { id: 'clap' };
  const start = () => gameReducer(createInitialState(), { type: 'START', player: 'ANUSH', challenge });

  it('walks the full happy path', () => {
    let s = start();
    expect(s.phase).toBe(PHASE.RANDOMIZING);
    s = gameReducer(s, { type: 'REVEAL', round: s.round });
    s = gameReducer(s, { type: 'READY' });
    expect(s.phase).toBe(PHASE.COUNTDOWN);
    s = gameReducer(s, { type: 'GO', round: s.round });
    s = gameReducer(s, { type: 'FINISH', round: s.round, run: { outcome: OUTCOME.SUCCESS } });
    expect(s.phase).toBe(PHASE.SCORING);
    s = gameReducer(s, { type: 'SCORED', round: s.round, result: { total: 900 } });
    expect(s.phase).toBe(PHASE.RESULT);
    s = gameReducer(s, { type: 'PLAY_AGAIN', challenge: { id: 'wave' } });
    expect(s.phase).toBe(PHASE.RANDOMIZING);
    expect(s.round).toBe(2);
    expect(s.player).toBe('ANUSH');
    expect(s.run).toBeNull();
    expect(s.recent).toEqual(['clap', 'wave']);
  });

  it('ignores stale timers from a previous round', () => {
    let s = start();
    const staleRound = s.round;
    s = gameReducer(s, { type: 'REVEAL', round: s.round });
    s = gameReducer(s, { type: 'READY' });
    s = gameReducer(s, { type: 'GO', round: s.round });
    s = gameReducer(s, { type: 'FINISH', round: s.round, run: {} });
    s = gameReducer(s, { type: 'SCORED', round: s.round, result: {} });
    s = gameReducer(s, { type: 'PLAY_AGAIN', challenge });
    const before = s;
    expect(gameReducer(s, { type: 'REVEAL', round: staleRound })).toBe(before);
  });

  it('rejects out-of-order transitions', () => {
    const s = start();
    expect(gameReducer(s, { type: 'GO', round: s.round })).toBe(s);
    expect(gameReducer(s, { type: 'FINISH', round: s.round, run: {} })).toBe(s);
    expect(gameReducer(s, { type: 'START', challenge })).toBe(s);
  });
});
