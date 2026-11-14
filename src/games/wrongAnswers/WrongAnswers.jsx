import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import PageContainer from '../../components/layout/PageContainer';
import { judgeClient } from '../../services/aiJudge';
import { isOnlineLeaderboardConfigured, leaderboard, rememberLastEntry } from '../../services/leaderboard';
import { sfx } from '../../utils/sfx';
import { createInitialState, PHASE, wrongAnswersReducer } from './wrongAnswersMachine';
import { GAME_CONFIG } from './gameConfig';
import { pickPrompt } from './prompts';
import { fallbackJudge } from './fallbackJudge';
import { gameScore } from './scoring';
import NameScreen from './components/NameScreen';
import Instructions from './components/Instructions';
import PromptReveal from './components/PromptReveal';
import AnswerScreen from './components/AnswerScreen';
import JudgingScreen from './components/JudgingScreen';
import RoundResult from './components/RoundResult';
import FinalResult from './components/FinalResult';
import './WrongAnswers.css';

const BOARD = 'wrong-answers';

/**
 * ❌ WRONG ANSWERS ONLY!! — random question → player's intentionally wrong
 * answer → AI judge (creativity 35 · humour 30 · incorrectness 25 · relevance 10)
 * → five rounds → average score → Wrong Answers leaderboard.
 */
export default function WrongAnswers() {
  const [state, dispatch] = useReducer(wrongAnswersReducer, undefined, createInitialState);
  const { phase, game, round, prompt, player, rounds } = state;
  const [judgeStatus, setJudgeStatus] = useState(null);
  const [retrying, setRetrying] = useState(false);
  const [save, setSave] = useState({ game: 0, status: 'saving' });
  const judgedKeys = useRef(new Set());
  const savedGames = useRef(new Set());

  // Tell the player up-front whether real AI judging is available.
  useEffect(() => {
    if (phase !== PHASE.INSTRUCTIONS) return undefined;
    let cancelled = false;
    judgeClient.status().then((status) => !cancelled && setJudgeStatus(status));
    return () => {
      cancelled = true;
    };
  }, [phase]);

  // ---- judging: exactly one request per submitted answer ----
  useEffect(() => {
    if (phase !== PHASE.JUDGING) return undefined;
    const key = `${game}:${round}`;
    if (judgedKeys.current.has(key)) return undefined; // StrictMode / re-render safe
    judgedKeys.current.add(key);
    const { question } = prompt;
    const { answer } = state;
    setRetrying(false);

    // No AI key on this server → don't send requests that can only fail; go straight to backup scoring.
    const verdictPromise =
      judgeStatus === 'not_configured'
        ? Promise.resolve({ source: 'fallback', reason: 'not_configured' })
        : judgeClient.judge({ question, answer }, { onRetry: () => setRetrying(true) });
    verdictPromise.then((verdict) => {
      const scored = verdict.source === 'ai' ? verdict : fallbackJudge(question, answer);
      sfx.point();
      dispatch({
        type: 'JUDGED',
        game,
        round,
        result: {
          creativity: scored.creativity,
          humor: scored.humor,
          originality: scored.originality,
          relevance: scored.relevance,
          score: scored.final_score,
          feedback: scored.feedback,
          source: scored.source,
          retried: Boolean(verdict.retried),
        },
      });
    });
    return undefined;
  }, [phase, game, round, prompt, state, judgeStatus]);

  // ---- leaderboard: save once per finished game; never blocks the result ----
  useEffect(() => {
    if (phase !== PHASE.FINAL_RESULT || savedGames.current.has(game)) return;
    savedGames.current.add(game);
    setSave({ game, status: 'saving' });
    leaderboard
      .submitScore({ playerName: player, gameMode: 'wrong_answers', score: gameScore(rounds) })
      .then(async (saved) => {
        let rank = null;
        if (saved.entry) {
          rememberLastEntry(BOARD, saved.entry.id);
          const board = await leaderboard.fetchLeaderboard(BOARD).catch(() => null);
          const index = board?.entries.findIndex((e) => e.id === saved.entry.id) ?? -1;
          rank = index >= 0 ? index + 1 : null;
        }
        setSave({ game, status: saved.status, rank, serverConfigured: isOnlineLeaderboardConfigured });
      })
      .catch(() => setSave({ game, status: 'failed' }));
  }, [phase, game, player, rounds]);

  // ---- actions ----
  const startGame = () => {
    sfx.unlock();
    dispatch({ type: 'START_GAME', prompt: pickPrompt([]) });
  };
  const playAgain = () => {
    sfx.unlock();
    dispatch({ type: 'PLAY_AGAIN', prompt: pickPrompt([]) });
  };
  const next = () => dispatch({ type: 'NEXT', prompt: pickPrompt(state.used) });
  const promptReady = useCallback(() => dispatch({ type: 'PROMPT_READY', game, round }), [game, round]);
  const submit = useCallback((answer) => dispatch({ type: 'SUBMIT', answer }), []);
  const timeUp = useCallback(() => {
    sfx.timeout();
    dispatch({ type: 'TIME_UP', game, round });
  }, [game, round]);

  // ---------------- screens ----------------
  const hud = round > 0 && phase !== PHASE.FINAL_RESULT && (
    <header className="wa-hud wa-panel">
      <span className="wa-hud__mode">WRONG ANSWERS ONLY!!</span>
      <span className="wa-hud__round">
        ROUND {round} / {GAME_CONFIG.totalRounds}
      </span>
      <span className="wa-hud__player">
        {player} · <strong>{gameScore(rounds).toFixed(1)}</strong> avg
      </span>
    </header>
  );

  let screen;
  switch (phase) {
    case PHASE.NAME_ENTRY:
      screen = <NameScreen onSubmit={(name) => dispatch({ type: 'SUBMIT_NAME', player: name })} />;
      break;
    case PHASE.INSTRUCTIONS:
      screen = <Instructions player={player} judgeStatus={judgeStatus} onStart={startGame} />;
      break;
    case PHASE.LOADING_PROMPT:
      screen = <PromptReveal key={`${game}-${round}`} round={round} onDone={promptReady} />;
      break;
    case PHASE.ANSWERING:
      screen = <AnswerScreen key={`${game}-${round}`} question={prompt.question} onSubmit={submit} onTimeUp={timeUp} />;
      break;
    case PHASE.JUDGING:
      screen = <JudgingScreen question={prompt.question} answer={state.answer} retrying={retrying} />;
      break;
    case PHASE.ROUND_RESULT:
      screen = <RoundResult key={`${game}-${round}`} round={round} result={rounds.at(-1)} onNext={next} />;
      break;
    case PHASE.FINAL_RESULT:
      screen = (
        <FinalResult
          key={game}
          player={player}
          rounds={rounds}
          save={save.game === game ? save : { status: 'saving' }}
          onPlayAgain={playAgain}
          onNewPlayer={() => dispatch({ type: 'NEW_PLAYER' })}
        />
      );
      break;
    default:
      screen = null;
  }

  return (
    <PageContainer narrow className="wrong-answers-page">
      {hud}
      {screen}
    </PageContainer>
  );
}
