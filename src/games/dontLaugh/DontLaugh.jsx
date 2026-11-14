import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import PageContainer from '../../components/layout/PageContainer';
import CyberButton from '../../components/common/CyberButton';
import ErrorScreen from '../../components/common/ErrorScreen';
import CameraFeed from '../../components/camera/CameraFeed';
import SwitchCameraButton from '../../components/camera/SwitchCameraButton';
import { useCamera } from '../../vision/useCamera';
import { disposeFaceLandmarker, preloadFace, useFaceTracking } from '../../vision/face';
import { isMuted, sfx } from '../../utils/sfx';
import { gameAudio } from '../../services/gameAudio';
import AudioSettingsModal, { AudioSettingsTrigger } from '../../components/audio/AudioSettingsModal';
import { captureUploader } from '../../services/dontLaughCapture';
import { createInitialState, dontLaughReducer, PHASE } from './dontLaughMachine';
import { BUFFER, GAME, meterState } from './gameConfig';
import { createCalibrator, createLaughDetector, extractLaughFeatures, meterPercent } from './laughDetector';
import { createFrameBuffer } from './frameBuffer';
import { canvasToBlob, composeCapture } from './captureManager';
import { useFunnyContent } from './useFunnyContent';
import { drawFaceHud } from './drawFaceHud';
import FunnyContent from './components/FunnyContent';
import LaughMeter from './components/LaughMeter';
import { CaughtFlash, CountdownOverlay, SurvivedSplash } from './components/Overlays';
import { CaughtResult, SurvivedResult } from './components/Results';
import { CameraIcon, HomeIcon } from '../../components/common/Icons';
import './DontLaugh.css';

const CAMERA_PHASES = [
  PHASE.CAMERA_SETUP,
  PHASE.CALIBRATION,
  PHASE.COUNTDOWN,
  PHASE.PLAYING,
  PHASE.LAUGH_DETECTED,
  PHASE.CAPTURING,
  PHASE.SURVIVED,
];
const TRACKING_PHASES = [
  PHASE.CAMERA_SETUP,
  PHASE.CALIBRATION,
  PHASE.COUNTDOWN,
  PHASE.PLAYING,
];
const CONTENT_PHASES = [
  PHASE.PLAYING,
  PHASE.LAUGH_DETECTED,
  PHASE.CAPTURING,
  PHASE.SURVIVED,
];

const FACE_LOST_MS = 400;
const UI_TICK_MS = 40; // 25 updates/s: low latency AI Laugh Meter tracking without main thread hitching
const FLASH_MS = 700;
const SURVIVED_SPLASH_MS = 1800;

const CAMERA_ERRORS = {
  denied: { title: 'CAMERA ACCESS NEEDED', message: "Allow camera access to play Don't Laugh." },
  unavailable: { title: 'NO CAMERA FOUND', message: "Don't Laugh needs a webcam. Connect one, then try again." },
  busy: { title: 'CAMERA IS BUSY', message: 'Another app or tab is using the camera. Close it and try again.' },
  insecure: { title: 'SECURE CONNECTION NEEDED', message: 'Open Fun Spot from http://localhost or an https:// address to use the camera.' },
  unsupported: { title: 'CAMERA NOT SUPPORTED', message: 'This browser can’t use a webcam. Try the latest Chrome or Edge.' },
};

/**
 * DON'T LAUGH — Complete Redesign based on reference image (Dont laugh.jpeg).
 * No player-name entry page — starts directly with camera setup & gameplay.
 * Preserves GIF playback, laugh detection, face HUD, camera switching, audio, reaction capture.
 */
export default function DontLaugh() {
  const [state, dispatch] = useReducer(dontLaughReducer, undefined, () => createInitialState('user'));
  const { phase, round, player } = state;

  const camera = useCamera(GAME.CAMERA_RESOLUTION);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const contentImageRef = useRef(null);

  // High-frequency game data lives in refs; React only updates ~10 times/s.
  const phaseRef = useRef(phase);
  const roundRef = useRef(round);
  const bufferRef = useRef(null);
  const calibratorRef = useRef(createCalibrator());
  const calibratedMsRef = useRef(0);
  const detectorRef = useRef(null);
  const liveRef = useRef({ raw: 0, level: 0, peak: 0 });
  const triggeredRef = useRef(false);
  const laughAtRef = useRef(0);
  const elapsedRef = useRef(0);
  const lastFaceAtRef = useRef(-Infinity);
  const lastFrameTRef = useRef(null);
  bufferRef.current ??= createFrameBuffer();
  phaseRef.current = phase;
  roundRef.current = round;

  const [faceVisible, setFaceVisible] = useState(false);
  const faceVisibleRef = useRef(false);
  const [meter, setMeter] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [calibration, setCalibration] = useState(0);
  const [upload, setUpload] = useState({ round: 0, status: 'idle' });
  const [muted, setMutedState] = useState(isMuted);
  const [isAudioModalOpen, setIsAudioModalOpen] = useState(false);

  const content = useFunnyContent(phase === PHASE.PLAYING);

  // Background music lifecycle & face tracker preload
  useEffect(() => {
    preloadFace();
    sfx.unlock();
    gameAudio.signalGameEntered('dont-laugh');
    const unsub = gameAudio.subscribe((snap) => {
      setMutedState(snap.isMuted);
    });
    return () => {
      unsub();
      gameAudio.setAppState('navigation');
    };
  }, []);

  // Smoothly adjust background volume between active gameplay (50%) and result screens (100%)
  useEffect(() => {
    if (phase === PHASE.SURVIVED || phase === PHASE.LAUGH_DETECTED || phase === PHASE.CAPTURING) {
      gameAudio.setAppState('game_completed');
    } else if (phase === PHASE.PLAYING || phase === PHASE.COUNTDOWN || phase === PHASE.CALIBRATION) {
      gameAudio.setAppState('game_playing');
    } else {
      gameAudio.setAppState('game_entered');
    }
  }, [phase]);

  // Camera lifecycle: active for all game rounds
  const wantsCamera = CAMERA_PHASES.includes(phase);
  const startCamera = camera.start;
  const stopCamera = camera.stop;
  useEffect(() => {
    if (wantsCamera) startCamera();
    else stopCamera();
  }, [wantsCamera, startCamera, stopCamera]);

  useEffect(() => {
    const buffer = bufferRef.current;
    return () => {
      buffer.clear();
      disposeFaceLandmarker();
    };
  }, []);

  // Per-frame pipeline
  const handleFrame = useCallback((frame) => {
    const ph = phaseRef.current;
    const dt = lastFrameTRef.current === null ? 0 : Math.min(100, frame.t - lastFrameTRef.current);
    lastFrameTRef.current = frame.t;

    if (frame.face) lastFaceAtRef.current = frame.t;
    const visible = frame.t - lastFaceAtRef.current < FACE_LOST_MS;
    if (visible !== faceVisibleRef.current) {
      faceVisibleRef.current = visible;
      setFaceVisible(visible);
    }

    const features = frame.face ? extractLaughFeatures(frame.face, frame.blendshapes) : null;

    if (ph === PHASE.CALIBRATION && features) {
      calibratorRef.current.add(features);
      calibratedMsRef.current += dt;
    }

    if (ph === PHASE.PLAYING && !triggeredRef.current && detectorRef.current) {
      const result = detectorRef.current.update(features, frame.t);
      liveRef.current = result;
      if (videoRef.current) bufferRef.current.push(videoRef.current, frame.t, features ? result.raw : 0);
      if (result.confirmed) {
        triggeredRef.current = true;
        laughAtRef.current = frame.t;
        dispatch({ type: 'LAUGH', round: roundRef.current, lastedMs: elapsedRef.current, peak: result.peak });
      }
    }

    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) drawFaceHud(ctx, frame.face, meterState(meterPercent(liveRef.current.level)).tone);
  }, []);

  const tracking = useFaceTracking({
    videoRef,
    enabled: TRACKING_PHASES.includes(phase) && camera.status === 'ready',
    onFrame: handleFrame,
  });

  // CAMERA_SETUP → when camera and tracking ready with face in frame
  useEffect(() => {
    if (phase !== PHASE.CAMERA_SETUP || camera.status !== 'ready' || tracking.status !== 'ready' || !faceVisible) return undefined;
    const timer = setTimeout(() => dispatch({ type: 'CAMERA_READY' }), 650);
    return () => clearTimeout(timer);
  }, [phase, camera.status, tracking.status, faceVisible]);

  // CALIBRATION → collect ~2.4 s of neutral poker face
  useEffect(() => {
    if (phase !== PHASE.CALIBRATION) return undefined;
    calibratorRef.current = createCalibrator();
    calibratedMsRef.current = 0;
    setCalibration(0);
    const timer = setInterval(() => {
      const progress = Math.min(1, calibratedMsRef.current / GAME.CALIBRATION_MS);
      setCalibration(progress);
      if (progress >= 1) {
        clearInterval(timer);
        dispatch({ type: 'CALIBRATED', round: roundRef.current, baseline: calibratorRef.current.baseline() });
      }
    }, UI_TICK_MS);
    return () => clearInterval(timer);
  }, [phase]);

  // COUNTDOWN → fresh detector, buffer reset
  useEffect(() => {
    if (phase !== PHASE.COUNTDOWN) return;
    detectorRef.current = createLaughDetector({ baseline: state.baseline ?? undefined });
    liveRef.current = { raw: 0, level: 0, peak: 0 };
    triggeredRef.current = false;
    elapsedRef.current = 0;
    bufferRef.current.clear();
    setMeter(0);
    setElapsed(0);
  }, [phase, state.baseline]);

  const go = useCallback(() => dispatch({ type: 'GO', round: roundRef.current }), []);

  // PLAYING → tick timer and update HUD
  useEffect(() => {
    if (phase !== PHASE.PLAYING) return undefined;
    let last = performance.now();
    const timer = setInterval(() => {
      const now = performance.now();
      if (faceVisibleRef.current) elapsedRef.current += now - last;
      last = now;
      setMeter(meterPercent(liveRef.current.level));
      setElapsed(elapsedRef.current);
      if (elapsedRef.current >= GAME.ROUND_SECONDS * 1000 && !triggeredRef.current) {
        triggeredRef.current = true;
        dispatch({ type: 'TIMEOUT', round: roundRef.current, lastedMs: GAME.ROUND_SECONDS * 1000, peak: liveRef.current.peak });
      }
    }, UI_TICK_MS);
    return () => clearInterval(timer);
  }, [phase]);

  // LAUGH_DETECTED → trigger shutter sound and flash
  useEffect(() => {
    if (phase !== PHASE.LAUGH_DETECTED) return undefined;
    sfx.shutter();
    setMeter(meterPercent(liveRef.current.level));
    const timer = setTimeout(() => dispatch({ type: 'CAPTURE', round: roundRef.current }), FLASH_MS);
    return () => clearTimeout(timer);
  }, [phase]);

  // CAPTURING → compose best capture and upload
  useEffect(() => {
    if (phase !== PHASE.CAPTURING) return undefined;
    let cancelled = false;
    const captureRound = roundRef.current;

    (async () => {
      let capture = null;
      try {
        const best = bufferRef.current.best(laughAtRef.current, BUFFER.BEST_WINDOW_MS);
        if (best) {
          const photo = composeCapture({
            frame: best.canvas,
            contentImage: contentImageRef.current,
            player: 'user',
            lastedMs: elapsedRef.current,
          });
          const blob = await canvasToBlob(photo);
          capture = {
            blob,
            url: URL.createObjectURL(blob),
            width: photo.width,
            height: photo.height,
            msBeforeTrigger: Math.round(laughAtRef.current - best.t),
            score: best.score,
          };
        }
      } catch (error) {
        console.warn('[DontLaugh] Capture failed:', error);
      }
      bufferRef.current.clear();
      if (cancelled) {
        if (capture) URL.revokeObjectURL(capture.url);
        return;
      }
      dispatch({ type: 'CAPTURED', round: captureRound, capture });
      if (!capture) return;
      setUpload({ round: captureRound, status: 'uploading' });
      const result = await captureUploader.upload(capture.blob);
      setUpload({ round: captureRound, ...result });
    })();

    return () => {
      cancelled = true;
    };
  }, [phase]);

  // SURVIVED → celebratory sound & transition
  useEffect(() => {
    if (phase !== PHASE.SURVIVED) return undefined;
    sfx.complete();
    bufferRef.current.clear();
    const timer = setTimeout(() => dispatch({ type: 'SHOW_RESULT', round: roundRef.current }), SURVIVED_SPLASH_MS);
    return () => clearTimeout(timer);
  }, [phase]);

  const captureUrl = state.result?.capture?.url;
  useEffect(() => (captureUrl ? () => URL.revokeObjectURL(captureUrl) : undefined), [captureUrl]);

  const isRetryingRef = useRef(false);
  const retryUpload = async () => {
    if (upload.status !== 'local' || isRetryingRef.current) return;
    isRetryingRef.current = true;
    const { id, round: uploadRound } = upload;
    setUpload({ round: uploadRound, status: 'uploading' });
    try {
      const res = await captureUploader.retry(id);
      setUpload({ round: uploadRound, ...res });
    } finally {
      isRetryingRef.current = false;
    }
  };

  // ── Results Screen ────────────────────────────────────────────────────────
  if (phase === PHASE.RESULT) {
    const playAgain = () => {
      sfx.unlock();
      dispatch({ type: 'PLAY_AGAIN' });
    };
    return (
      <PageContainer narrow className="dontlaugh-page dontlaugh-page--result">
        {state.outcome === 'caught' ? (
          <CaughtResult
            key={round}
            player="user"
            result={state.result}
            upload={upload.round === round ? upload : { status: 'uploading' }}
            onRetryUpload={retryUpload}
            onPlayAgain={playAgain}
          />
        ) : (
          <SurvivedResult
            key={round}
            player="user"
            result={state.result}
            onPlayAgain={playAgain}
          />
        )}
      </PageContainer>
    );
  }

  // ── Main Gameplay Stage ───────────────────────────────────────────────────
  const cameraError = camera.status === 'error' ? (CAMERA_ERRORS[camera.error?.kind] ?? CAMERA_ERRORS.unavailable) : null;
  const settings = camera.stream?.getVideoTracks()[0]?.getSettings?.();
  const aspectRatio = settings?.width && settings?.height ? `${settings.width} / ${settings.height}` : '16 / 9';
  const playing = phase === PHASE.PLAYING;
  const remaining = Math.max(0, GAME.ROUND_SECONDS - elapsed / 1000);
  const placeholder =
    phase === PHASE.CAMERA_SETUP
      ? 'Setting up the camera…'
      : phase === PHASE.CALIBRATION
      ? 'Calibrating your poker face…'
      : 'Funny memes incoming… brace yourself!';

  return (
    <PageContainer className="dontlaugh-page dontlaugh-page--stage">
      {/* ── GAME TOOLBAR (Sub-header) ────────────────────────────────────── */}
      <header className="dl-hud-bar arcade-panel">
        <div className="dl-hud-bar__left">
          <span className="dl-hud-title">DON&apos;T LAUGH</span>
          <span className="dl-hud-player-tag">
            PLAYER <strong className="dl-hud-player-name">user</strong>
          </span>
        </div>

        <div className="dl-hud-bar__right">
          <AudioSettingsTrigger
            onClick={() => setIsAudioModalOpen(true)}
            isMuted={muted}
          />

          <SwitchCameraButton
            camera={camera}
            compact
            showActiveLabel={true}
          />

          <CyberButton to="/" variant="ghost" size="sm" icon={<HomeIcon size={16} />} iconPosition="start">
            HOME
          </CyberButton>
        </div>
      </header>

      {/* ── TAGLINE WITH FUTURISTIC BRACKET LINES ───────────────────────── */}
      <div className="dl-tagline-wrap">
        <div className="dl-tagline-bracket dl-tagline-bracket--left" aria-hidden="true" />
        <h1 className="dl-tagline">DON&apos;T YOU DARE LAUGH</h1>
        <div className="dl-tagline-bracket dl-tagline-bracket--right" aria-hidden="true" />
      </div>

      {/* ── TWO-COLUMN MAIN GAMEPLAY STAGE ──────────────────────────────── */}
      <div className="dl-stage-grid">
        {/* LEFT COLUMN: Main Camera & Comedy Feed Stage */}
        <div className="arcade-panel arcade-panel--magenta dl-main-panel">
          <div className="arcade-corner arcade-corner--tl" style={{ color: '#ff007a' }} />
          <div className="arcade-corner arcade-corner--tr" style={{ color: '#ff007a' }} />
          <div className="arcade-corner arcade-corner--bl" style={{ color: '#ff007a' }} />
          <div className="arcade-corner arcade-corner--br" style={{ color: '#ff007a' }} />

          {/* 1. Camera Setup State (Matches Dont laugh.jpeg concentric rings) */}
          {phase === PHASE.CAMERA_SETUP && (
            <div className="dl-setup-display">
              <div className="dl-setup-circle">
                <div className="dl-setup-ring-outer" />
                <div className="dl-setup-ring-inner" />
                <div className="dl-setup-icon-center">
                  <CameraIcon size={38} />
                </div>
              </div>

              <h2 className="dl-setup-heading">
                {tracking.status === 'ready' && faceVisible ? 'FACE DETECTED — GET READY!' : 'SETTING UP THE CAMERA...'}
              </h2>
              <p className="dl-setup-subtitle">
                {camera.status === 'error'
                  ? 'Camera access issue. Please check browser permissions.'
                  : tracking.status === 'ready' && faceVisible
                  ? 'Poker face detected. Calibration starting...'
                  : 'Please wait while we initialize your camera.'}
              </p>
            </div>
          )}

          {/* 2. Calibration State */}
          {phase === PHASE.CALIBRATION && (
            <div className="dl-setup-display">
              <div className="dl-setup-circle dl-setup-circle--calibrating">
                <div className="dl-setup-ring-outer" />
                <div className="dl-setup-icon-center">
                  <CameraIcon size={38} />
                </div>
              </div>
              <h2 className="dl-setup-heading">CALIBRATING YOUR POKER FACE...</h2>
              <p className="dl-setup-subtitle">Hold a neutral facial expression ({Math.round(calibration * 100)}%)</p>
              <div className="dl-calib-track">
                <div className="dl-calib-fill" style={{ width: `${Math.round(calibration * 100)}%` }} />
              </div>
            </div>
          )}

          {/* 3. Countdown Overlay */}
          {phase === PHASE.COUNTDOWN && (
            <div className="dl-setup-display">
              <CountdownOverlay key={round} onGo={go} />
            </div>
          )}

          {/* 4. Active Gameplay: Prominent Comedy/GIF Stage (No PiP overlay) */}
          {CONTENT_PHASES.includes(phase) && (
            <div className="dl-gameplay-arena">
              <div className="dl-meme-stage">
                <FunnyContent
                  item={content.item}
                  imageRef={contentImageRef}
                  onBroken={content.markBroken}
                  placeholder={placeholder}
                />
              </div>
            </div>
          )}

          {/* Camera Error Display */}
          {cameraError && (
            <div className="dl-camera-error-wrap">
              <ErrorScreen
                compact
                code="CAMERA"
                title={cameraError.title}
                message={cameraError.message}
                onRetry={camera.start}
                retryLabel="TRY AGAIN"
                homeLabel="HOME"
              />
              <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'center' }}>
                <SwitchCameraButton camera={camera} compact={false} showActiveLabel={true} />
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Actual Live Camera Check & Compact Tips */}
        <div className="dl-side-col">
          {/* Top Card: Live Camera Preview */}
          <div className="arcade-panel arcade-panel--cyan dl-side-card dl-camera-live-card">
            <div className="arcade-corner arcade-corner--tl" style={{ color: '#00f0ff' }} />
            <div className="arcade-corner arcade-corner--tr" style={{ color: '#00f0ff' }} />
            <div className="arcade-corner arcade-corner--bl" style={{ color: '#00f0ff' }} />
            <div className="arcade-corner arcade-corner--br" style={{ color: '#00f0ff' }} />

            <div className="dl-camera-live-header">
              <span className="dl-camera-live-title">
                <CameraIcon size={18} /> CAMERA CHECK
              </span>
              <span
                className={`dl-camera-status-pill ${
                  camera.status === 'error'
                    ? 'dl-camera-status-pill--error'
                    : faceVisible
                    ? 'dl-camera-status-pill--locked'
                    : 'dl-camera-status-pill--searching'
                }`}
              >
                <span className="dl-status-dot" />
                {camera.status === 'error'
                  ? 'OFFLINE'
                  : !camera.stream
                  ? 'CONNECTING'
                  : faceVisible
                  ? 'FACE LOCKED'
                  : 'SEARCHING'}
              </span>
            </div>

            {/* Actual Live Webcam Viewport */}
            <div className="dl-live-viewport">
              <CameraFeed
                stream={camera.stream}
                videoRef={videoRef}
                canvasRef={canvasRef}
                aspectRatio={aspectRatio}
                className="dl-camera-live-feed"
                label="Live Webcam"
              >
                {!faceVisible && playing && (
                  <div className="dl-banner dl-banner--warn" role="status">
                    <strong>FACE NOT FOUND</strong>
                    <span>Move into frame</span>
                  </div>
                )}
                {(phase === PHASE.LAUGH_DETECTED || phase === PHASE.CAPTURING) && <CaughtFlash />}
                {phase === PHASE.SURVIVED && <SurvivedSplash />}
              </CameraFeed>

              {cameraError && (
                <div className="dl-camera-error-overlay">
                  <div className="dl-cam-err-msg">{cameraError.title}</div>
                  <button type="button" className="arcade-btn arcade-btn--cyan arcade-btn--sm" onClick={camera.start}>
                    RETRY CAMERA
                  </button>
                </div>
              )}
            </div>

            {/* Camera Controls & Active Camera indication */}
            <div className="dl-camera-controls-strip">
              <SwitchCameraButton
                camera={camera}
                compact
                showActiveLabel={true}
              />
            </div>
          </div>

          {/* Bottom Card: Compact Tips for Best Results */}
          <div className="arcade-panel arcade-panel--magenta dl-side-card dl-tips-card">
            <div className="arcade-corner arcade-corner--tl" style={{ color: '#ff007a' }} />
            <div className="arcade-corner arcade-corner--tr" style={{ color: '#ff007a' }} />
            <div className="arcade-corner arcade-corner--bl" style={{ color: '#ff007a' }} />
            <div className="arcade-corner arcade-corner--br" style={{ color: '#ff007a' }} />

            <h3 className="dl-side-card-title dl-side-card-title--magenta">TIPS FOR BEST RESULTS</h3>

            <div className="dl-tips-list">
              <div className="dl-tip-row">
                <div className="dl-tip-icon-wrap dl-tip-icon-wrap--light">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ff007a" strokeWidth="2">
                    <circle cx="12" cy="12" r="5" />
                    <line x1="12" y1="1" x2="12" y2="3" />
                    <line x1="12" y1="21" x2="12" y2="23" />
                    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                    <line x1="1" y1="12" x2="3" y2="12" />
                    <line x1="21" y1="12" x2="23" y2="12" />
                    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                  </svg>
                </div>
                <div className="dl-tip-text">
                  <strong>Good lighting</strong>
                  <span>Face a direct light source</span>
                </div>
              </div>

              <div className="dl-tip-row">
                <div className="dl-tip-icon-wrap dl-tip-icon-wrap--user">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ff007a" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </div>
                <div className="dl-tip-text">
                  <strong>Stay centered</strong>
                  <span>Keep your face in frame</span>
                </div>
              </div>

              <div className="dl-tip-row">
                <div className="dl-tip-icon-wrap dl-tip-icon-wrap--smile">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ff007a" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M8 14s1.5 2 4 2 4-2 4-2" />
                    <line x1="9" y1="9" x2="9.01" y2="9" strokeWidth="3" />
                    <line x1="15" y1="9" x2="15.01" y2="9" strokeWidth="3" />
                  </svg>
                </div>
                <div className="dl-tip-text">
                  <strong>Poker face</strong>
                  <span>Hold your expression — don&apos;t laugh!</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── BOTTOM GAMEPLAY INDICATORS (AI LAUGH METER & TIMER) ─────────── */}
      <footer className="dl-bottom-bar arcade-panel">
        <LaughMeter percent={meter} />

        <div className="dl-bottom-meta">
          <div className="dl-safe-badge">
            <svg
              className="dl-safe-icon"
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#00ff88"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <polyline points="9 12 11 14 15 10" />
            </svg>
            <div className="dl-safe-text">
              <span className="dl-safe-label">SAFE</span>
              <span className="dl-safe-val">{meter}%</span>
            </div>
          </div>

          <div className="dl-bottom-divider" aria-hidden="true" />

          <div
            className={`dl-digital-timer${playing && remaining <= 5 ? ' dl-digital-timer--urgent' : ''}`}
            role="timer"
            aria-label={`${Math.ceil(remaining)} seconds left`}
          >
            <span className="dl-timer-tag">TIME</span>
            <span className="dl-timer-digits">{remaining.toFixed(1).padStart(4, '0')}</span>
          </div>
        </div>
      </footer>

      {/* Audio Mixer Modal */}
      <AudioSettingsModal
        isOpen={isAudioModalOpen}
        onClose={() => setIsAudioModalOpen(false)}
        currentGame="dont-laugh"
      />
    </PageContainer>
  );
}
