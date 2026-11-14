import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import PageContainer from '../../components/layout/PageContainer';
import CyberButton from '../../components/common/CyberButton';
import ErrorScreen from '../../components/common/ErrorScreen';
import CameraFeed from '../../components/camera/CameraFeed';
import { useCamera } from '../../vision/useCamera';
import { disposeFaceLandmarker, preloadFace, useFaceTracking } from '../../vision/face';
import { isMuted, setMuted, sfx } from '../../utils/sfx';
import { createInitialState, mirrorReducer, PHASE } from './mirrorMachine';
import { pickCharacter } from './randomCharacter';
import { createMirrorEngine } from './mirrorEngine';
import { createCharacterRenderer } from './effects/renderer';
import { loadCharacterAssets } from './effects/assets';
import { captureMirror } from './capture';
import MirrorStart from './components/MirrorStart';
import MirrorRandomizer from './components/MirrorRandomizer';
import CharacterReveal from './components/CharacterReveal';
import TransformSequence from './components/TransformSequence';
import CaptureCountdown from './components/CaptureCountdown';
import CaptureResult from './components/CaptureResult';
import './AIMirror.css';

const RECENT_KEY = 'funspot.mirror.recent';
const CAMERA_RESOLUTION = { width: 1280, height: 720 };
const MIN_TRANSFORM_MS = 2100;
const CAMERA_CHECK_MS = 1200;
const FREEZE_MS = 1000;

/** Phases that show the live camera (the stream itself stays open for the whole session). */
const ARENA_PHASES = [PHASE.CAMERA_SETUP, PHASE.TRANSFORMING, PHASE.LIVE_MIRROR, PHASE.CAPTURE_COUNTDOWN, PHASE.CAPTURED];
const ENGINE_MODE = {
  [PHASE.CAMERA_SETUP]: 'check',
  [PHASE.TRANSFORMING]: 'scan',
  [PHASE.LIVE_MIRROR]: 'character',
  [PHASE.CAPTURE_COUNTDOWN]: 'character',
  [PHASE.CAPTURED]: 'character',
};

const CAMERA_ERRORS = {
  denied: { title: '📷 CAMERA ACCESS NEEDED', message: 'AI Mirror requires your camera. Allow camera access in your browser, then try again.' },
  unavailable: { title: '📷 NO CAMERA FOUND', message: 'AI Mirror requires a camera. Connect a webcam, then try again.' },
  busy: { title: '📷 CAMERA IS BUSY', message: 'Another app or tab is using the camera. Close it and try again.' },
  insecure: { title: '🔒 SECURE CONNECTION NEEDED', message: 'Open Fun Spot from http://localhost or an https:// address to use the camera.' },
  unsupported: { title: '📷 CAMERA NOT SUPPORTED', message: 'This browser can’t use a webcam. Try the latest Chrome or Edge.' },
};

function loadRecent() {
  try {
    const recent = JSON.parse(sessionStorage.getItem(RECENT_KEY) ?? '[]');
    return Array.isArray(recent) ? recent.map(String) : [];
  } catch {
    return [];
  }
}

/** Loads (and caches) the art for the current round's character. */
function useCharacterAssets(character, round) {
  const [attempt, setAttempt] = useState(0);
  const [assets, setAssets] = useState({ key: null, status: 'idle', sprites: null });
  const key = character ? `${round}:${attempt}` : null;

  useEffect(() => {
    if (!character) return undefined;
    let cancelled = false;
    setAssets({ key, status: 'loading', sprites: null });
    loadCharacterAssets(character)
      .then((sprites) => !cancelled && setAssets({ key, status: 'ready', sprites }))
      .catch((error) => {
        console.warn('Character art failed to load:', error);
        if (!cancelled) setAssets({ key, status: 'error', sprites: null });
      });
    return () => {
      cancelled = true;
    };
  }, [character, key]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  return { ...(assets.key === key ? assets : { status: 'loading', sprites: null }), retry };
}

/**
 * 🪞 AI MIRROR — random character + real-time face-tracked AR + photo capture.
 * No score and no leaderboard: it's a pure entertainment mode.
 */
export default function AIMirror() {
  const [state, dispatch] = useReducer(mirrorReducer, undefined, () => createInitialState(loadRecent()));
  const { phase, round, pick, capture } = state;
  const character = pick?.character;

  const camera = useCamera(CAMERA_RESOLUTION);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const assets = useCharacterAssets(character, round);

  const [faceVisible, setFaceVisible] = useState(false);
  const [notice, setNotice] = useState(null); // short toasts: power-up / tracking resumed / capture failed
  const [muted, setMutedState] = useState(isMuted);
  const noticeTimer = useRef(0);

  const flash = useCallback((text) => {
    setNotice({ text, id: Date.now() });
    clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(null), 1400);
  }, []);

  // One engine for the whole session; it talks to React only on events.
  const engine = useMemo(
    () =>
      createMirrorEngine({
        onFaceChange: (visible) => setFaceVisible(visible),
        onBurst: () => {
          sfx.powerUp();
          flash('✨ POWER UP!');
        },
      }),
    [flash],
  );

  const inArena = ARENA_PHASES.includes(phase);
  const startCamera = camera.start;
  const stopCamera = camera.stop;

  // ---- camera: on from START until the player leaves the page ----
  useEffect(() => {
    if (phase !== PHASE.IDLE) startCamera();
    else stopCamera();
  }, [phase, startCamera, stopCamera]);

  useEffect(
    () => () => {
      disposeFaceLandmarker();
      clearTimeout(noticeTimer.current);
    },
    [],
  );

  useEffect(() => {
    try {
      sessionStorage.setItem(RECENT_KEY, JSON.stringify(state.recent));
    } catch {
      // not essential
    }
  }, [state.recent]);

  // ---- face tracking + AR ----
  useEffect(() => {
    engine.setMode(ENGINE_MODE[phase] ?? 'check');
  }, [engine, phase]);

  useEffect(() => {
    // fresh renderer per round, so nothing carries over between characters
    engine.setRenderer(assets.status === 'ready' ? createCharacterRenderer(character, assets.sprites) : null);
  }, [engine, character, assets.status, assets.sprites]);

  const wasVisible = useRef(false);
  useEffect(() => {
    if (faceVisible && !wasVisible.current && phase === PHASE.LIVE_MIRROR) flash('✓ TRACKING RESUMED');
    wasVisible.current = faceVisible;
  }, [faceVisible, phase, flash]);

  const handleFrame = useCallback(
    (frame) => {
      if (canvasRef.current) engine.process(frame, canvasRef.current);
    },
    [engine],
  );

  const tracking = useFaceTracking({
    videoRef,
    enabled: inArena && phase !== PHASE.CAPTURED && camera.status === 'ready',
    onFrame: handleFrame,
  });

  // ---- flow ----
  const start = () => {
    sfx.unlock();
    preloadFace();
    dispatch({ type: 'START' });
  };

  useEffect(() => {
    if (phase !== PHASE.CAMERA_SETUP || camera.status !== 'ready') return undefined;
    const timer = setTimeout(() => dispatch({ type: 'CAMERA_READY', pick: pickCharacter(state.recent) }), CAMERA_CHECK_MS);
    return () => clearTimeout(timer);
  }, [phase, camera.status, state.recent]);

  const categoryDone = useCallback(() => dispatch({ type: 'CATEGORY_DONE', round }), [round]);
  const characterDone = useCallback(() => {
    sfx.reveal();
    dispatch({ type: 'CHARACTER_DONE', round });
  }, [round]);
  const transform = useCallback(() => {
    sfx.whoosh();
    dispatch({ type: 'TRANSFORM', round });
  }, [round]);

  // TRANSFORMING ends once the minimum animation has played AND art + face model are ready.
  const [minTransformDone, setMinTransformDone] = useState(false);
  useEffect(() => {
    if (phase !== PHASE.TRANSFORMING) return undefined;
    setMinTransformDone(false);
    const timer = setTimeout(() => setMinTransformDone(true), MIN_TRANSFORM_MS);
    return () => clearTimeout(timer);
  }, [phase, round]);

  useEffect(() => {
    if (phase !== PHASE.TRANSFORMING) return;
    if (assets.status === 'error') dispatch({ type: 'ASSETS_FAILED', round });
    else if (minTransformDone && assets.status === 'ready' && tracking.status === 'ready') {
      sfx.reveal();
      dispatch({ type: 'TRANSFORMED', round });
    }
  }, [phase, round, assets.status, tracking.status, minTransformDone]);

  const reroll = () => {
    sfx.unlock();
    dispatch({ type: 'REROLL', pick: pickCharacter(state.recent) });
  };

  const snap = useCallback(() => {
    sfx.shutter();
    captureMirror({ video: videoRef.current, overlay: canvasRef.current, character, category: pick?.category })
      .then((result) => dispatch({ type: 'SNAPPED', round, capture: result }))
      .catch((error) => {
        console.warn('Capture failed:', error);
        flash('⚠️ CAPTURE FAILED — TRY AGAIN');
        dispatch({ type: 'CAPTURE_FAILED' });
      });
  }, [character, pick, round, flash]);

  useEffect(() => {
    if (phase !== PHASE.CAPTURED) return undefined;
    const timer = setTimeout(() => dispatch({ type: 'SHOW_RESULT', round }), FREEZE_MS);
    return () => clearTimeout(timer);
  }, [phase, round]);

  // Release photo memory when a capture is replaced or the page closes.
  useEffect(() => {
    if (!capture) return undefined;
    return () => URL.revokeObjectURL(capture.url);
  }, [capture]);

  const toggleMute = () => {
    setMuted(!muted);
    setMutedState(!muted);
  };

  // ---------------- screens ----------------
  if (phase === PHASE.IDLE) {
    return (
      <PageContainer narrow className="mirror-page">
        <MirrorStart onStart={start} />
      </PageContainer>
    );
  }

  if (phase === PHASE.RANDOMIZING_CATEGORY || phase === PHASE.RANDOMIZING_CHARACTER) {
    const isCategory = phase === PHASE.RANDOMIZING_CATEGORY;
    return (
      <PageContainer narrow className="mirror-page">
        <MirrorRandomizer
          key={`${round}-${phase}`}
          stage={isCategory ? 'category' : 'character'}
          pick={pick}
          onDone={isCategory ? categoryDone : characterDone}
        />
      </PageContainer>
    );
  }

  if (phase === PHASE.CHARACTER_REVEAL) {
    return (
      <PageContainer narrow className="mirror-page">
        <CharacterReveal key={round} pick={pick} sprites={assets.status === 'ready' ? assets.sprites : null} onTransform={transform} />
      </PageContainer>
    );
  }

  if (phase === PHASE.ASSET_ERROR) {
    return (
      <PageContainer narrow className="mirror-page">
        <div className="mr-panel mr-error-panel">
          <ErrorScreen
            code="ASSETS"
            title="⚠️ CHARACTER LOAD ERROR"
            message="The character effect could not be loaded."
            onRetry={() => {
              assets.retry();
              dispatch({ type: 'RETRY_ASSETS' });
            }}
            retryLabel="TRY AGAIN"
            homeLabel="HOME"
          />
          <div className="page-actions">
            <CyberButton onClick={reroll} variant="ghost" icon="🎲">
              RANDOMIZE AGAIN
            </CyberButton>
          </div>
        </div>
      </PageContainer>
    );
  }

  if (phase === PHASE.RESULT && capture) {
    return (
      <PageContainer narrow className="mirror-page">
        <CaptureResult key={capture.url} pick={pick} capture={capture} onTryAnother={reroll} onCaptureAgain={() => dispatch({ type: 'CAPTURE_AGAIN' })} />
      </PageContainer>
    );
  }

  // ---------------- arena: camera setup · transforming · live mirror · capture ----------------
  const cameraError = camera.status === 'error' ? (CAMERA_ERRORS[camera.error?.kind] ?? CAMERA_ERRORS.unavailable) : null;
  const settings = camera.stream?.getVideoTracks()[0]?.getSettings?.();
  const aspectRatio = settings?.width && settings?.height ? `${settings.width} / ${settings.height}` : '16 / 9';
  const live = phase === PHASE.LIVE_MIRROR;
  const showCostume = phase !== PHASE.CAMERA_SETUP && phase !== PHASE.TRANSFORMING;

  return (
    <PageContainer className="mirror-page mirror-page--arena">
      <header className="mr-hud mr-panel">
        <span className="mr-hud__mode">🪞 AI MIRROR</span>
        {character && phase !== PHASE.CAMERA_SETUP && (
          <span className="mr-hud__character">
            YOU GOT <strong>{character.icon} {character.name}</strong>
          </span>
        )}
        <button type="button" className="mr-hud__mute" onClick={toggleMute} aria-pressed={muted} aria-label={muted ? 'Unmute sound' : 'Mute sound'}>
          {muted ? '🔇' : '🔊'}
        </button>
        <CyberButton to="/" variant="ghost" size="sm" icon="⌂" iconPosition="start">
          HOME
        </CyberButton>
      </header>

      <div className="mr-stage" style={{ '--stage-aspect': aspectRatio }}>
        {cameraError && (
          <div className="mr-panel mr-stage__error">
            <ErrorScreen compact code="CAMERA" title={cameraError.title} message={cameraError.message} onRetry={camera.start} retryLabel="TRY AGAIN" homeLabel="HOME" />
          </div>
        )}
        {!cameraError && tracking.status === 'error' && (
          <div className="mr-panel mr-stage__error">
            <ErrorScreen
              compact
              code="VISION"
              title="⚠️ VISION SYSTEM UNAVAILABLE"
              message="Face tracking could not start."
              onRetry={tracking.retry}
              homeLabel="HOME"
            />
          </div>
        )}
        {!cameraError && tracking.status !== 'error' && (
          <CameraFeed
            stream={camera.stream}
            videoRef={videoRef}
            canvasRef={canvasRef}
            aspectRatio={aspectRatio}
            className={`mr-camera${live ? ' mr-camera--live' : ''}`}
            videoStyle={showCostume && character ? { filter: character.filter } : undefined}
            label="Your camera (mirrored)"
          >
            {camera.status !== 'ready' && (
              <div className="mr-camera__wait">
                <span aria-hidden="true">📷</span>
                <p className="mr-camera__wait-title">CAMERA ACCESS NEEDED</p>
                <p>
                  Click <strong>Allow</strong> when your browser asks to use the camera.
                </p>
              </div>
            )}

            {phase === PHASE.CAMERA_SETUP && camera.status === 'ready' && (
              <div className="mr-banner">
                <strong>CAMERA CHECK</strong>
                <span>{faceVisible ? '✓ Face found — get ready!' : tracking.status === 'ready' ? 'Look at the camera 👀' : 'Camera on ✓'}</span>
              </div>
            )}

            {phase === PHASE.TRANSFORMING && (
              <TransformSequence
                key={round}
                character={character}
                waitingFor={
                  tracking.status !== 'ready'
                    ? 'Loading face tracking…'
                    : assets.status !== 'ready'
                      ? 'Loading character…'
                      : null
                }
              />
            )}

            {(live || phase === PHASE.CAPTURE_COUNTDOWN) && !faceVisible && tracking.status === 'ready' && (
              <div className="mr-banner mr-banner--warn" role="status">
                <strong>👀 FACE NOT FOUND</strong>
                <span>Look at the camera and move into the frame.</span>
              </div>
            )}

            {notice && (
              <p key={notice.id} className="mr-toast" role="status">
                {notice.text}
              </p>
            )}

            {phase === PHASE.CAPTURE_COUNTDOWN && <CaptureCountdown key={round} onSnap={snap} />}

            {phase === PHASE.CAPTURED && capture && (
              <div className="mr-freeze">
                <img src={capture.url} alt="" />
              </div>
            )}
          </CameraFeed>
        )}
      </div>

      <div className="mr-controls">
        {live ? (
          <>
            <CyberButton onClick={() => dispatch({ type: 'CAPTURE' })} icon="📸" className="mr-controls__capture">
              CAPTURE
            </CyberButton>
            <CyberButton onClick={reroll} variant="ghost" icon="🎲">
              AGAIN
            </CyberButton>
          </>
        ) : (
          <p className="mr-controls__hint">
            {phase === PHASE.CAMERA_SETUP && 'Getting your camera ready…'}
            {phase === PHASE.TRANSFORMING && 'Hold still — the AI is scanning your face.'}
            {phase === PHASE.CAPTURE_COUNTDOWN && 'Smile!'}
            {phase === PHASE.CAPTURED && 'Captured!'}
          </p>
        )}
      </div>
      {live && <p className="mr-tip">Move, tilt your head, get closer — and open your mouth wide for a power-up!</p>}
    </PageContainer>
  );
}
