import { useCallback, useEffect, useRef, useState } from 'react';
import { createChallengeDetector } from './challengeEngine';
import { liveScore } from './scoring';
import { OUTCOME } from './gameMachine';
import { sfx } from '../../utils/sfx';

const UI_TICK_MS = 100; // HUD refresh rate — detection itself runs every camera frame
const FLOAT_STEP = 100; // show "+points" for silent progress (holds) every 100 points

const idleSnapshot = (challenge) => ({
  remainingMs: (challenge?.duration ?? 0) * 1000,
  progress: 0,
  accuracy: 0,
  score: 0,
  hint: '',
  count: null,
  target: null,
  stepIndex: 0,
  stepState: null,
});

/**
 * Runs one challenge while `active`: a fresh detector per round, a timer, and a
 * throttled HUD snapshot. Feed camera frames to `onFrame`. Calls `onFinish`
 * exactly once with { outcome, progress, accuracy, elapsedMs, durationMs, minTimeMs }.
 */
export function useChallengeRun({ challenge, active, onFinish }) {
  const [snapshot, setSnapshot] = useState(() => idleSnapshot(challenge));
  const [floaters, setFloaters] = useState([]);
  const runRef = useRef(null);
  const onFinishRef = useRef(onFinish);

  useEffect(() => {
    onFinishRef.current = onFinish;
  });

  useEffect(() => {
    if (!active || !challenge) return undefined;

    const durationMs = challenge.duration * 1000;
    const run = {
      detector: createChallengeDetector(challenge),
      startedAt: performance.now(),
      state: null,
      finished: false,
      shownScore: 0,
      floatId: 0,
    };

    const snap = (remainingMs) => {
      const s = run.state;
      return {
        remainingMs,
        progress: s?.progress ?? 0,
        accuracy: s?.accuracy ?? 0,
        score: s ? liveScore(s.progress, s.accuracy) : 0,
        hint: s?.hint ?? '',
        count: s?.count ?? null,
        target: s?.target ?? null,
        stepIndex: s?.stepIndex ?? 0,
        stepState: s?.stepState ?? null,
      };
    };

    const timer = setInterval(() => {
      const remaining = Math.max(0, durationMs - (performance.now() - run.startedAt));
      setSnapshot(snap(remaining));
      if (remaining <= 0) run.finish(OUTCOME.TIMEOUT);
    }, UI_TICK_MS);

    run.finish = (outcome) => {
      if (run.finished) return;
      run.finished = true;
      clearInterval(timer);
      const elapsedMs = Math.min(durationMs, performance.now() - run.startedAt);
      setSnapshot(snap(Math.max(0, durationMs - elapsedMs)));
      if (outcome === OUTCOME.SUCCESS) sfx.complete();
      else sfx.timeout();
      onFinishRef.current({
        outcome,
        progress: run.state?.progress ?? 0,
        accuracy: run.state?.accuracy ?? 0,
        elapsedMs,
        durationMs,
        minTimeMs: (challenge.minTime ?? 0) * 1000,
      });
    };

    run.float = (value) => {
      const id = ++run.floatId;
      setFloaters((list) => [...list.slice(-4), { id, value }]);
      setTimeout(() => setFloaters((list) => list.filter((f) => f.id !== id)), 1100);
    };

    runRef.current = run;
    setSnapshot(snap(durationMs));
    setFloaters([]);

    return () => {
      run.finished = true;
      clearInterval(timer);
      if (runRef.current === run) runRef.current = null;
    };
  }, [active, challenge]);

  const onFrame = useCallback((frame) => {
    const run = runRef.current;
    if (!run || run.finished || frame.t < run.startedAt) return; // nothing counts before GO
    const state = run.detector.update(frame);
    run.state = state;

    const score = liveScore(state.progress, state.accuracy);
    const gained = score - run.shownScore;
    const scored = state.events.length > 0;
    if (gained > 0 && (scored || gained >= FLOAT_STEP)) {
      run.shownScore = score;
      run.float(gained);
    }
    if (state.events.some((e) => e.type === 'step')) sfx.step();
    else if (scored) sfx.point();

    if (state.done) run.finish(OUTCOME.SUCCESS);
  }, []);

  return { snapshot, floaters, onFrame };
}
