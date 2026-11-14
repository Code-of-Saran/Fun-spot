import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import PageContainer from '../../components/layout/PageContainer';
import CyberButton from '../../components/common/CyberButton';
import BackButton from '../../components/common/BackButton';
import LoadingScreen from '../../components/common/LoadingScreen';
import { useCamera } from '../../vision/useCamera';
import { disposeVision, preloadVision, useVisionLoop } from '../../vision/useVisionLoop';
import { drawSkeleton } from '../../vision/drawSkeleton';
import { readBody } from '../../vision/landmarks';
import { isOnlineLeaderboardConfigured, leaderboard, rememberLastEntry } from '../../services/leaderboard';
import { isMuted, setMuted, sfx } from '../../utils/sfx';
import { createInitialState, gameReducer, OUTCOME, PHASE } from './gameMachine';
import { pickChallenge } from './challengeEngine';
import { computeScore } from './scoring';
import { getFeedback } from './feedback';
import { useChallengeRun } from './useChallengeRun';
import NameEntry from './components/NameEntry';
import Randomizer from './components/Randomizer';
import ChallengeCard from './components/ChallengeCard';
import CameraPanel from './components/CameraPanel';
import CountdownOverlay from './components/CountdownOverlay';
import LiveStats from './components/LiveStats';
import ResultScreen from './components/ResultScreen';
import './RandomGame.css';

const SESSION_KEY = 'funspot.random.session';
const CAMERA_PHASES = [PHASE.REVEAL, PHASE.COUNTDOWN, PHASE.PLAYING];
const ARENA_PHASES = [...CAMERA_PHASES, PHASE.SCORING];
const SCORING_MS = 1300;

/** Recent challenge ids survive a refresh (no repeats); the player's name deliberately does not. */
function loadRecent() {
  try {
    const { recent = [] } = JSON.parse(sessionStorage.getItem(SESSION_KEY) ?? '{}');
    return Array.isArray(recent) ? recent.map(String) : [];
  } catch {
    return [];
  }
}

/**
 * 🎲 RANDOM — orchestrates the game state machine, camera, vision loop,
 * detectors, scoring and leaderboard. Each concern lives in its own module.
 */
export default function RandomGame() {
  const [state, dispatch] = useReducer(gameReducer, undefined, () => createInitialState('', loadRecent()));
  const { phase, round, challenge, player } = state;

  const camera = useCamera();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [bodyDetected, setBodyDetected] = useState(false);
  const bodyRef = useRef(false);
  const [save, setSave] = useState({ round: 0, status: 'saving' });
  const [muted, setMutedState] = useState(isMuted);

  const wantsCamera = CAMERA_PHASES.includes(phase);
  const startCamera = camera.start;
  const stopCamera = camera.stop;

  // ---- challenge history (survives a page refresh; names don't) ----
  useEffect(() => {
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify({ recent: state.recent }));
    } catch {
      // not essential
    }
  }, [state.recent]);

  // ---- camera: only on while it's needed; released when leaving the page ----
  useEffect(() => {
    if (wantsCamera) startCamera();
    else stopCamera();
  }, [wantsCamera, startCamera, stopCamera]);

  useEffect(() => () => disposeVision(), []);

  useEffect(() => {
    if (phase === PHASE.RANDOMIZING) preloadVision({ hands: challenge.needsHands });
  }, [phase, challenge]);

  // ---- gameplay ----
  const run = useChallengeRun({
    challenge,
    active: phase === PHASE.PLAYING,
    onFinish: (result) => dispatch({ type: 'FINISH', round, run: result }),
  });
  const runOnFrame = run.onFrame;

  const handleFrame = useCallback(
    (frame) => {
      const ctx = canvasRef.current?.getContext('2d');
      if (ctx) drawSkeleton(ctx, frame);
      const detected = Boolean(readBody(frame.pose));
      if (detected !== bodyRef.current) {
        bodyRef.current = detected;
        setBodyDetected(detected);
      }
      runOnFrame(frame);
    },
    [runOnFrame],
  );

  const vision = useVisionLoop({
    videoRef,
    enabled: wantsCamera && camera.status === 'ready',
    needsHands: Boolean(challenge?.needsHands),
    onFrame: handleFrame,
  });

  // camera or vision dies mid-round → back to the reveal screen to recover
  useEffect(() => {
    if ((camera.status === 'error' || vision.status === 'error') && (phase === PHASE.COUNTDOWN || phase === PHASE.PLAYING)) {
      dispatch({ type: 'ABORT' });
    }
  }, [camera.status, vision.status, phase]);

  // ---- scoring + saving (the leaderboard can never block or break the game) ----
  const savedRounds = useRef(new Set());
  useEffect(() => {
    if (phase !== PHASE.SCORING) return undefined;
    const score = computeScore({ ...state.run, completed: state.run.outcome === OUTCOME.SUCCESS });
    const result = { ...score, outcome: state.run.outcome, feedback: getFeedback(score.total) };

    if (!savedRounds.current.has(round)) {
      savedRounds.current.add(round);
      setSave({ round, status: 'saving' });
      leaderboard
        .submitScore({ playerName: player, gameMode: 'random', score: score.total })
        .then(async (saved) => {
          let rank = null;
          if (saved.entry) {
            rememberLastEntry('random', saved.entry.id);
            const board = await leaderboard.fetchLeaderboard('random').catch(() => null);
            const index = board?.entries.findIndex((e) => e.id === saved.entry.id) ?? -1;
            rank = index >= 0 ? index + 1 : null;
          }
          setSave({ round, status: saved.status, rank, serverConfigured: isOnlineLeaderboardConfigured });
        })
        .catch(() => setSave({ round, status: 'failed' }));
    }

    const timer = setTimeout(() => dispatch({ type: 'SCORED', round, result }), SCORING_MS);
    return () => clearTimeout(timer);
  }, [phase, round, state.run, player]);

  // ---- actions ----
  const startGame = (name) => {
    sfx.unlock();
    dispatch({ type: 'START', player: name, challenge: pickChallenge(state.recent) });
  };
  const playAgain = () => {
    sfx.unlock();
    dispatch({ type: 'PLAY_AGAIN', challenge: pickChallenge(state.recent) });
  };
  const revealDone = useCallback(() => {
    sfx.reveal();
    dispatch({ type: 'REVEAL', round });
  }, [round]);
  const go = useCallback(() => dispatch({ type: 'GO', round }), [round]);
  const toggleMute = () => {
    setMuted(!muted);
    setMutedState(!muted);
  };

  // ---- screens ----
  if (phase === PHASE.NAME_ENTRY) {
    return (
      <PageContainer narrow className="random-page">
        <NameEntry initialName={player} onStart={startGame} />
      </PageContainer>
    );
  }

  if (phase === PHASE.RANDOMIZING) {
    return (
      <PageContainer narrow className="random-page">
        <Randomizer key={round} onDone={revealDone} />
      </PageContainer>
    );
  }

  if (phase === PHASE.RESULT) {
    return (
      <PageContainer narrow className="random-page">
        <ResultScreen
          key={round}
          player={player}
          challenge={challenge}
          result={state.result}
          save={save.round === round ? save : { status: 'saving' }}
          onPlayAgain={playAgain}
          onChangePlayer={() => dispatch({ type: 'CHANGE_PLAYER' })}
        />
      </PageContainer>
    );
  }

  // REVEAL · COUNTDOWN · PLAYING · SCORING share one arena so the camera stays mounted.
  const ready = camera.status === 'ready' && vision.status === 'ready';
  const playing = phase === PHASE.PLAYING;

  return (
    <PageContainer className="random-page random-page--arena">
      <header className="rg-hud rg-panel">
        <span className="rg-hud__mode">🎲 RANDOM</span>
        <span className="rg-hud__player">
          PLAYER <strong>{player}</strong>
        </span>
        <span className="rg-hud__phase">{(playing && run.snapshot.stepState) || phase}</span>
        <button type="button" className="rg-hud__mute" onClick={toggleMute} aria-pressed={muted} aria-label={muted ? 'Unmute sound' : 'Mute sound'}>
          {muted ? '🔇' : '🔊'}
        </button>
        <BackButton label="EXIT" />
      </header>

      <div className="rg-arena">
        <div className="rg-arena__camera">
          <CameraPanel camera={camera} vision={vision} videoRef={videoRef} canvasRef={canvasRef} bodyDetected={bodyDetected}>
            {(phase === PHASE.COUNTDOWN || playing) && ready && <CountdownOverlay key={round} onGo={go} />}
            {playing && (
              <div className="rg-floaters" aria-hidden="true">
                {run.floaters.map((f) => (
                  <span key={f.id} className="rg-floaters__item">
                    +{f.value}
                  </span>
                ))}
              </div>
            )}
          </CameraPanel>
          {phase === PHASE.SCORING && (
            <div className="rg-scoring">
              <LoadingScreen message="CALCULATING SCORE..." />
            </div>
          )}
        </div>

        <aside className="rg-arena__side rg-panel theme-gold">
          <ChallengeCard challenge={challenge} activeStep={playing ? run.snapshot.stepIndex : null} compact={playing} />

          {phase === PHASE.REVEAL && (
            <div className="rg-ready">
              <p className="rg-ready__tip">
                Step back until your head, shoulders and arms fit inside the frame{challenge.needsHands ? ', then hold your hand up to the camera.' : '.'}
              </p>
              <CyberButton onClick={() => dispatch({ type: 'READY' })} disabled={!ready} icon="⟶" className="rg-ready__btn">
                {ready ? "I'M READY" : camera.status === 'ready' ? 'LOADING VISION…' : 'WAITING FOR CAMERA…'}
              </CyberButton>
            </div>
          )}

          {phase === PHASE.COUNTDOWN && <p className="rg-ready__tip rg-ready__tip--big">GET READY…</p>}

          {(playing || phase === PHASE.SCORING) && <LiveStats challenge={challenge} snapshot={run.snapshot} />}
        </aside>
      </div>
    </PageContainer>
  );
}
