import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCamera } from '../../vision/useCamera';
import SwitchCameraButton from '../../components/camera/SwitchCameraButton';
import {
  EXPRESSION_CHALLENGES,
  ROUND_DURATION_SECONDS,
  DEFAULT_SESSION_ROUNDS,
} from './faceOffConfig';
import { analyzeReferenceImage, referenceFeaturesCache } from './faceAnalysis';
import { useFaceDetection } from './useFaceDetection';
import {
  ROUND_STATE,
  ROUND_STATE_LABELS,
  isArenaStage,
  isTrackingActive,
  checkReadiness,
} from './roundStateMachine';
import ConsentModal from './components/ConsentModal';
import CountdownOverlay from './components/CountdownOverlay';
import ResultComparison from './components/ResultComparison';
import SessionSummary from './components/SessionSummary';
import {
  BoltIcon,
  PlayIcon,
  SoundOnIcon,
  SoundOffIcon,
  RefreshIcon,
  AlertIcon,
} from '../../components/common/Icons';
import { sfx, isMuted, setMuted } from '../../utils/sfx';
import { gameAudio } from '../../services/gameAudio';
import AudioSettingsModal, { AudioSettingsTrigger } from '../../components/audio/AudioSettingsModal';
import './FaceOff.css';

const STORAGE_CONSENT_KEY = 'funspot_faceoff_consent_granted';

function getCameraErrorMessage(error) {
  if (!error) return 'Could not access your camera. Please check browser permissions.';
  const kind = error.kind || error.name || '';
  const message = error.message || '';

  if (kind === 'denied' || message.includes('denied') || message.includes('NotAllowedError') || message.includes('PermissionDeniedError')) {
    return 'Camera access was blocked. Please click the camera icon in your browser address bar and choose "Allow", then click Retry.';
  }
  if (kind === 'busy' || message.includes('busy') || message.includes('NotReadableError') || message.includes('TrackStartError')) {
    return 'Camera is in use by another application or busy. Please close other video apps or click Switch Camera.';
  }
  if (kind === 'unavailable' || message.includes('unavailable') || message.includes('NotFoundError') || message.includes('DevicesNotFoundError')) {
    return 'Requested camera device is unavailable or disconnected. Please check your webcam connection or switch cameras.';
  }
  if (kind === 'insecure' || message.includes('insecure')) {
    return 'Camera access requires a secure connection (HTTPS or localhost).';
  }
  if (kind === 'unsupported' || message.includes('unsupported')) {
    return 'Your browser does not support webcam capture (navigator.mediaDevices.getUserMedia).';
  }
  if (message.includes('timed out')) {
    return 'Camera initialization timed out after 10 seconds. Check permissions or try another camera.';
  }
  return error.message || 'Could not access your camera. Please check browser permissions.';
}

export default function FaceOff() {
  const navigate = useNavigate();

  // ── 1. CONSENT STATE ──────────────────────────────────────────────────────
  const [hasConsent, setHasConsent] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_CONSENT_KEY) === 'true';
    } catch {
      return false;
    }
  });

  // ── 2. ROUND STATE MACHINE ────────────────────────────────────────────────
  const [roundState, setRoundState] = useState(() =>
    hasConsent ? ROUND_STATE.INITIALIZING : ROUND_STATE.CONSENT,
  );
  const roundStateRef = useRef(roundState);
  roundStateRef.current = roundState;

  // ── 3. SESSION & ROUND STATE ──────────────────────────────────────────────
  const [sessionRoundCount] = useState(DEFAULT_SESSION_ROUNDS);
  const [shuffledChallenges, setShuffledChallenges] = useState(() => {
    const pool = [...EXPRESSION_CHALLENGES];
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool;
  });
  const [currentRoundIdx, setCurrentRoundIdx] = useState(0);
  const [completedResults, setCompletedResults] = useState([]);

  // Active challenge
  const activeChallenge = useMemo(() => {
    if (shuffledChallenges.length === 0) return EXPRESSION_CHALLENGES[0];
    return shuffledChallenges[currentRoundIdx % shuffledChallenges.length];
  }, [shuffledChallenges, currentRoundIdx]);

  // Countdown seconds (5 down to 0)
  const [countdown, setCountdown] = useState(ROUND_DURATION_SECONDS);
  const countdownTimerRef = useRef(null);
  const captureInProgressRef = useRef(false);
  const nextRoundInProgressRef = useRef(false);

  // Round capture & evaluation result
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const [scoreResult, setScoreResult] = useState(null);
  const [captureError, setCaptureError] = useState(null);
  const [isFaceDetectedAtZero, setIsFaceDetectedAtZero] = useState(true);

  // Target features for active challenge
  const [targetFeatures, setTargetFeatures] = useState(null);
  const [referenceStatus, setReferenceStatus] = useState('idle'); // idle | loading | analyzing | ready | error
  const [referenceError, setReferenceError] = useState(null);
  const challengeLoadTokenRef = useRef(0);

  // Developer Diagnostics Panel Toggle (PRIORITY 1.6 & 9)
  const [showDiagnostics, setShowDiagnostics] = useState(false);

  // Audio mute state & mixer modal
  const [soundMuted, setSoundMuted] = useState(() => isMuted());
  const [isAudioModalOpen, setIsAudioModalOpen] = useState(false);

  // Background music lifecycle: runs smoothly across all rounds without restarting on Next Round
  useEffect(() => {
    gameAudio.signalGameEntered('face-off');
    const unsub = gameAudio.subscribe((snap) => {
      setSoundMuted(snap.isMuted);
    });
    return () => {
      unsub();
      gameAudio.setAppState('navigation');
    };
  }, []);

  // Preload and decode all reference images immediately on game load
  useEffect(() => {
    EXPRESSION_CHALLENGES.forEach((challenge) => {
      if (typeof window !== 'undefined' && challenge.image) {
        const img = new Image();
        img.src = challenge.image;
        if (typeof img.decode === 'function') {
          img.decode().catch(() => {});
        }
      }
    });
  }, []);

  // Update background audio state on round completion / summary
  useEffect(() => {
    if (roundState === ROUND_STATE.SUMMARY) {
      gameAudio.setAppState('game_completed');
    } else if (roundState === ROUND_STATE.SHOWING_RESULT) {
      gameAudio.setAppState('game_completed');
    } else {
      gameAudio.setAppState('game_playing');
    }
  }, [roundState]);

  // ── 4. CAMERA SETUP & CALLBACK REF (PRIORITY 1.2 & 1.3) ───────────────────
  const [videoElement, setVideoElement] = useState(null);
  const videoRef = useRef(null);

  // Reliable callback-ref that handles video-element replacement and remounting correctly
  const videoCallbackRef = useCallback((node) => {
    videoRef.current = node;
    setVideoElement(node);
  }, []);

  const [isVideoReady, setIsVideoReady] = useState(false);
  const [isCameraTimedOut, setIsCameraTimedOut] = useState(false);

  const camera = useCamera({ width: 1280, height: 720 });
  const {
    status: cameraStatus,
    stream,
    isSwitching,
    activeDevice,
    devices = [],
    start: startCamera,
    stop: stopCamera,
  } = camera;

  const cameraRef = useRef(camera);
  cameraRef.current = camera;

  const safeStartCamera = useCallback((targetId) => {
    setIsCameraTimedOut(false);
    const startFn = cameraRef.current?.start || cameraRef.current?.open;
    if (typeof startFn === 'function') {
      return startFn(targetId);
    }
    return Promise.reject(new Error('No camera start function available'));
  }, []);

  const safeStopCamera = useCallback(() => {
    cameraRef.current?.stop?.();
  }, []);

  // Watchdog timer: camera requesting for > 10s
  useEffect(() => {
    let timer = null;
    if (cameraStatus === 'requesting') {
      timer = setTimeout(() => {
        setIsCameraTimedOut(true);
      }, 10000);
    } else {
      setIsCameraTimedOut(false);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [cameraStatus]);

  // Open camera when entering game and consent is granted
  useEffect(() => {
    if (hasConsent && cameraStatus === 'idle') {
      safeStartCamera().catch((err) => {
        console.warn('[FaceOff] Camera start warning:', err);
      });
    }
  }, [hasConsent, cameraStatus, safeStartCamera]);

  // Release camera ONLY on component unmount
  useEffect(() => {
    return () => {
      cameraRef.current?.stop?.();
    };
  }, []);

  // Helper to ensure the video stream is actively playing without resetting or detaching tracks
  const ensureVideoPlaying = useCallback(async () => {
    const video = videoElement || videoRef.current;
    if (!video || !stream) return;
    try {
      if (video.srcObject !== stream) {
        video.srcObject = stream;
      }
      video.muted = true;
      video.playsInline = true;
      if (video.paused) {
        await video.play();
      }
      if (video.videoWidth > 0 && video.videoHeight > 0 && video.readyState >= 2) {
        setIsVideoReady(true);
      }
    } catch (err) {
      console.warn('[FaceOff] ensureVideoPlaying error/deferred:', err?.message);
    }
  }, [videoElement, stream]);

  // Attach MediaStream to active video element (PRIORITY 1.3)
  // Re-evaluates whenever video element node mounts or stream updates
  useEffect(() => {
    const video = videoElement || videoRef.current;
    if (!video) return;

    if (!stream || !stream.active) {
      setIsVideoReady(false);
      return;
    }

    const liveTracks = stream.getVideoTracks().filter((t) => t.readyState === 'live');
    if (liveTracks.length === 0) {
      setIsVideoReady(false);
      return;
    }

    // Attach stream to element if not already attached
    if (video.srcObject !== stream) {
      video.srcObject = stream;
    }

    video.muted = true;
    video.playsInline = true;
    video.autoplay = true;

    // Call video.play() and handle promise rejection
    const playPromise = video.play();
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch((err) => {
        console.warn('[FaceOff] Video playback catch/deferred:', err.message);
      });
    }

    let isSubscribed = true;

    const checkVideoReady = () => {
      if (!isSubscribed) return false;
      if (
        video.videoWidth > 0 &&
        video.videoHeight > 0 &&
        video.readyState >= 2 &&
        !video.paused
      ) {
        setIsVideoReady(true);
        return true;
      }
      return false;
    };

    if (checkVideoReady()) return;

    const handleLoadedMetadata = () => {
      video.play().catch(() => {});
      checkVideoReady();
    };

    const handleCanPlay = () => {
      video.play().catch(() => {});
      checkVideoReady();
    };

    const handlePlaying = () => {
      checkVideoReady();
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('playing', handlePlaying);

    const pollTimer = setInterval(() => {
      if (!isSubscribed) return;
      if (checkVideoReady()) {
        clearInterval(pollTimer);
      }
    }, 100);

    return () => {
      isSubscribed = false;
      clearInterval(pollTimer);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('playing', handlePlaying);
    };
  }, [videoElement, stream]);

  // ── 5. REFERENCE IMAGE ANALYSIS WITH ID SYNCHRONIZATION ──────────────────
  useEffect(() => {
    let active = true;
    const currentToken = ++challengeLoadTokenRef.current;
    setReferenceError(null);

    // If pre-cached, resolve immediately in 0ms
    analyzeReferenceImage(activeChallenge)
      .then((features) => {
        if (!active || currentToken !== challengeLoadTokenRef.current) return;
        if (!features || features.challengeId !== activeChallenge.id) {
          throw new Error(
            `Reference feature mismatch: expected challenge ${activeChallenge.id}, received ${features?.challengeId}`,
          );
        }
        setTargetFeatures(features);
        setReferenceStatus('ready');
        setReferenceError(null);
      })
      .catch((err) => {
        if (!active || currentToken !== challengeLoadTokenRef.current) return;
        console.warn('[FaceOff] Reference analysis warning:', err);
        // Fallback to verified predefined blendshapes so round is never blocked
        if (activeChallenge.targetBlendshapes) {
          const fallback = {
            challengeId: activeChallenge.id,
            image: activeChallenge.image,
            blendshapes: activeChallenge.targetBlendshapes,
            targetBlendshapes: activeChallenge.targetBlendshapes,
            ratios: activeChallenge.targetRatios || {},
            targetRatios: activeChallenge.targetRatios || {},
            headPose: activeChallenge.headPose || { yaw: 0, pitch: 0, roll: 0 },
            isValidReference: true,
            isPredefinedProfile: true,
            analyzedAt: Date.now(),
          };
          setTargetFeatures(fallback);
          setReferenceStatus('ready');
          setReferenceError(null);
        } else {
          setReferenceError(err?.message || 'Reference analysis failed');
          setReferenceStatus('error');
        }
      });

    return () => {
      active = false;
    };
  }, [activeChallenge]);

  // Handle explicit skip when a reference cannot be analyzed
  const handleSkipChallenge = useCallback(() => {
    sfx.shuffle();
    setReferenceError(null);
    setReferenceStatus('loading');
    setTargetFeatures(null);
    if (currentRoundIdx + 1 >= sessionRoundCount) {
      setRoundState(ROUND_STATE.SUMMARY);
    } else {
      setCurrentRoundIdx((prev) => prev + 1);
      setRoundState(ROUND_STATE.LOADING_REFERENCE);
    }
  }, [currentRoundIdx, sessionRoundCount]);

  // Handle retry for reference analysis
  const handleRetryReference = useCallback(() => {
    setReferenceError(null);
    setReferenceStatus('loading');
    setTargetFeatures(null);
    const currentToken = ++challengeLoadTokenRef.current;
    analyzeReferenceImage(activeChallenge)
      .then((features) => {
        if (currentToken !== challengeLoadTokenRef.current) return;
        if (features && features.challengeId === activeChallenge.id) {
          setTargetFeatures(features);
          setReferenceStatus('ready');
          setReferenceError(null);
        }
      })
      .catch((err) => {
        if (currentToken !== challengeLoadTokenRef.current) return;
        setReferenceError(err?.message || 'Reference analysis failed');
        setReferenceStatus('error');
      });
  }, [activeChallenge]);

  // ── 6. FACE DETECTION HOOK (PRIORITY 1.5) ─────────────────────────────────
  const trackingEnabled = isTrackingActive(roundState);
  const {
    modelStatus,
    modelError,
    retryModel,
    isFaceDetected,
    liveScore,
    latestFeatures,
    captureStillAndScore,
  } = useFaceDetection({
    videoRef,
    enabled: trackingEnabled,
    currentChallenge: targetFeatures && targetFeatures.challengeId === activeChallenge.id ? targetFeatures : activeChallenge,
  });

  // Readiness evaluation (PRIORITY 3 & 4)
  const readiness = useMemo(() => {
    const isCameraActive = cameraStatus === 'ready' && Boolean(stream?.active);
    const video = videoElement || videoRef.current;
    const isVideoStreaming = isVideoReady && Boolean(video && video.videoWidth > 0 && !video.paused);
    const isModelLoaded = modelStatus === 'ready';
    const isReferenceAnalyzed = Boolean(
      targetFeatures?.isValidReference &&
      targetFeatures?.challengeId === activeChallenge.id &&
      referenceStatus === 'ready',
    );

    return {
      camera: isCameraActive,
      video: isVideoStreaming,
      model: isModelLoaded,
      reference: isReferenceAnalyzed,
      allReady: isCameraActive && isVideoStreaming && isModelLoaded && isReferenceAnalyzed,
    };
  }, [cameraStatus, stream, videoElement, isVideoReady, modelStatus, targetFeatures, activeChallenge.id, referenceStatus]);

  // Automatically advance to READY when all components become ready
  useEffect(() => {
    if (
      readiness.allReady &&
      (roundState === ROUND_STATE.INITIALIZING ||
        roundState === ROUND_STATE.CAMERA_READY ||
        roundState === ROUND_STATE.LOADING_REFERENCE ||
        roundState === ROUND_STATE.ANALYZING_REFERENCE)
    ) {
      setRoundState(ROUND_STATE.READY);
    }
  }, [readiness.allReady, roundState]);

  // Composite Viewfinder State for UI badge formatting
  const viewfinderState = useMemo(() => {
    if (cameraStatus === 'error' || isCameraTimedOut) return 'camera_error';
    if (isSwitching) return 'switching_camera';
    if (cameraStatus === 'requesting') return 'connecting';
    if (cameraStatus === 'ready' && !isVideoReady) return 'camera_ready';
    if (modelStatus === 'error') return 'face_detection_error';
    if (modelStatus === 'loading') return 'initializing_face_detection';
    if (isVideoReady && modelStatus === 'ready') return 'ready';
    return 'idle';
  }, [cameraStatus, isCameraTimedOut, isSwitching, isVideoReady, modelStatus]);

  // ── 7. CONSENT HANDLERS ───────────────────────────────────────────────────
  const handleConsentApproved = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_CONSENT_KEY, 'true');
    } catch {}
    setHasConsent(true);
    setRoundState(ROUND_STATE.INITIALIZING);
    sfx.powerUp();
    safeStartCamera().catch(() => {});
  }, [safeStartCamera]);

  const handleConsentCancelled = useCallback(() => {
    navigate('/');
  }, [navigate]);

  // ── 8. DETERMINISTIC CAPTURE & SCORING (PRIORITY 1.4 & 1.5) ───────────────
  const performCaptureAndScoring = useCallback(async () => {
    if (captureInProgressRef.current) return;
    captureInProgressRef.current = true;

    try {
      setRoundState(ROUND_STATE.CAPTURING);
      sfx.tick();

      // Brief 40ms pause to ensure final video frame is committed
      await new Promise((resolve) => setTimeout(resolve, 40));

      setRoundState(ROUND_STATE.ANALYZING_CAPTURE);
      const effectiveTarget = targetFeatures && targetFeatures.challengeId === activeChallenge.id
        ? targetFeatures
        : activeChallenge;
      const result = await captureStillAndScore(effectiveTarget);

      if (result.faceDetected && result.scoreResult) {
        setCapturedPhoto(result.photoUrl);
        setScoreResult(result.scoreResult);
        setIsFaceDetectedAtZero(true);
        setCaptureError(null);
        sfx.complete();
        setRoundState(ROUND_STATE.SHOWING_RESULT);
      } else {
        // Face was not detected in final frame — enter recoverable retry state
        setCapturedPhoto(result.photoUrl || null);
        setScoreResult(null);
        setIsFaceDetectedAtZero(false);
        setCaptureError(
          result.error || 'Face was not detected in the final frame. Please look into the camera and retry!',
        );
        sfx.shuffle();
        setRoundState(ROUND_STATE.RETRY_REQUIRED);
      }
    } catch (err) {
      console.error('[FaceOff] Capture execution error:', err);
      setCapturedPhoto(null);
      setScoreResult(null);
      setIsFaceDetectedAtZero(false);
      setCaptureError(err?.message || 'Failed to capture frame from camera.');
      sfx.shuffle();
      setRoundState(ROUND_STATE.RETRY_REQUIRED);
    } finally {
      captureInProgressRef.current = false;
    }
  }, [captureStillAndScore, targetFeatures, activeChallenge]);

  // ── 9. COUNTDOWN LIFECYCLE ────────────────────────────────────────────────
  const handleStartChallenge = useCallback(() => {
    if (
      roundState !== ROUND_STATE.READY ||
      !readiness.allReady ||
      (targetFeatures && targetFeatures.challengeId !== activeChallenge.id)
    ) {
      return;
    }
    sfx.reveal();
    setCountdown(ROUND_DURATION_SECONDS);
    setRoundState(ROUND_STATE.COUNTDOWN);
  }, [roundState, readiness.allReady, targetFeatures, activeChallenge.id]);

  // Single deterministic countdown interval
  useEffect(() => {
    if (roundState !== ROUND_STATE.COUNTDOWN) {
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
        countdownTimerRef.current = null;
      }
      return;
    }

    countdownTimerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownTimerRef.current);
          countdownTimerRef.current = null;
          // Trigger capture immediately when countdown reaches zero
          performCaptureAndScoring();
          return 0;
        }
        sfx.tick();
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
        countdownTimerRef.current = null;
      }
    };
  }, [roundState, performCaptureAndScoring]);

  // Watchdog timer: if capturing or analyzing capture hangs for > 5s, safely recover
  useEffect(() => {
    let watchdog = null;
    if (
      roundState === ROUND_STATE.CAPTURING ||
      roundState === ROUND_STATE.ANALYZING_CAPTURE
    ) {
      watchdog = setTimeout(() => {
        console.warn('[FaceOff] Capture analysis watchdog timeout triggered');
        setCaptureError('Analysis timed out. Please try capturing your expression again.');
        setRoundState(ROUND_STATE.RETRY_REQUIRED);
      }, 5000);
    }
    return () => {
      if (watchdog) clearTimeout(watchdog);
    };
  }, [roundState]);

  // ── 10. RESULT & MULTI-ROUND HANDLERS (PRIORITY 1.4) ──────────────────────
  const handleRetake = useCallback(() => {
    sfx.tick();
    setCapturedPhoto(null);
    setScoreResult(null);
    setCaptureError(null);
    setCountdown(ROUND_DURATION_SECONDS);
    setRoundState(ROUND_STATE.READY);
  }, []);

  const handleNextChallenge = useCallback(() => {
    // Prevent double clicks advancing multiple rounds
    if (nextRoundInProgressRef.current) return;
    nextRoundInProgressRef.current = true;
    setTimeout(() => {
      nextRoundInProgressRef.current = false;
    }, 400);

    sfx.powerUp();

    // Invalidate any in-flight reference loading token
    challengeLoadTokenRef.current++;

    // 1. Record completed round
    const roundResult = {
      roundIndex: currentRoundIdx,
      challenge: activeChallenge,
      capturedPhoto,
      score: scoreResult?.score ?? 0,
      scoreResult,
      timestamp: Date.now(),
    };

    setCompletedResults((prev) => [...prev, roundResult]);

    // 2. Clear previous round capture, score, and error
    setCapturedPhoto(null);
    setScoreResult(null);
    setCaptureError(null);
    setCountdown(ROUND_DURATION_SECONDS);

    // 3. Clear transient capture error
    setReferenceError(null);

    // 4. Advance round or transition to SUMMARY if all rounds completed
    if (currentRoundIdx + 1 >= sessionRoundCount) {
      setRoundState(ROUND_STATE.SUMMARY);
    } else {
      const nextIdx = currentRoundIdx + 1;
      const nextChallenge = shuffledChallenges[nextIdx % shuffledChallenges.length];
      if (nextChallenge && referenceFeaturesCache.has(nextChallenge.id)) {
        setTargetFeatures(referenceFeaturesCache.get(nextChallenge.id));
        setReferenceStatus('ready');
      }
      setCurrentRoundIdx(nextIdx);
      setRoundState(ROUND_STATE.READY);
      console.log(`[FaceOff:Diagnostics] Round Transition -> Round ${nextIdx + 1} (${nextChallenge?.name})`);
      ensureVideoPlaying().catch(() => {});
    }
  }, [
    currentRoundIdx,
    sessionRoundCount,
    activeChallenge,
    capturedPhoto,
    scoreResult,
    shuffledChallenges,
    ensureVideoPlaying,
  ]);

  const handlePlayAgain = useCallback(() => {
    sfx.reveal();
    const pool = [...EXPRESSION_CHALLENGES];
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    setShuffledChallenges(pool);
    setCurrentRoundIdx(0);
    setCompletedResults([]);
    setCapturedPhoto(null);
    setScoreResult(null);
    setCaptureError(null);
    setCountdown(ROUND_DURATION_SECONDS);
    setRoundState(ROUND_STATE.READY);
    ensureVideoPlaying().catch(() => {});
  }, [ensureVideoPlaying]);

  const handleExit = useCallback(() => {
    safeStopCamera();
    navigate('/');
  }, [safeStopCamera, navigate]);

  const handleCameraSwitch = useCallback(() => {
    if (roundState === ROUND_STATE.COUNTDOWN) {
      setRoundState(ROUND_STATE.READY);
      setCountdown(ROUND_DURATION_SECONDS);
    }
  }, [roundState]);

  // Sound toggle
  const toggleSound = () => {
    gameAudio.toggleMute();
  };

  // Real Diagnostic Calculations (PRIORITY 1.6)
  const videoDom = videoElement || videoRef.current;
  const isVideoAttached = Boolean(videoDom && videoDom.srcObject === stream && stream);
  const isStreamActive = Boolean(stream && stream.active);
  const liveVideoTrack = stream?.getVideoTracks()?.find((t) => t.readyState === 'live');
  const isVideoPlaying = Boolean(videoDom && !videoDom.paused && videoDom.readyState >= 2);

  return (
    <div className="faceoff-root">
      {/* ── TOP HUD / TOOLBAR ────────────────────────────────────────────── */}
      <header className="faceoff-hud-bar">
        <div className="faceoff-hud-bar__left">
          <button
            type="button"
            className="faceoff-btn faceoff-btn--back"
            onClick={handleExit}
            title="Exit Face Off"
          >
            ← EXIT
          </button>
          <div className="faceoff-hud-logo">
            <span className="faceoff-hud-logo__icon">
              <BoltIcon size={18} />
            </span>
            <span className="faceoff-hud-logo__text">FACE OFF</span>
          </div>
        </div>

        <div className="faceoff-hud-bar__center">
          {roundState !== ROUND_STATE.SUMMARY && roundState !== ROUND_STATE.CONSENT && (
            <div className="faceoff-round-pill">
              <span className="faceoff-round-pill__label">ROUND</span>
              <span className="faceoff-round-pill__num">
                {currentRoundIdx + 1} / {sessionRoundCount}
              </span>
            </div>
          )}
        </div>

        <div className="faceoff-hud-bar__right">
          {/* Developer Diagnostics Toggle (PRIORITY 1.6 & 9) */}
          <button
            type="button"
            className="faceoff-hud-diag-btn"
            onClick={() => setShowDiagnostics((prev) => !prev)}
            title="Toggle Developer Diagnostics Panel"
          >
            AI DIAGNOSTICS
          </button>

          {/* Audio Settings & Mixer Trigger */}
          <AudioSettingsTrigger
            onClick={() => setIsAudioModalOpen(true)}
            isMuted={soundMuted}
          />
        </div>
      </header>

      {/* ── MAIN ARENA ───────────────────────────────────────────────────── */}
      <main className="faceoff-arena">
        {/* PHASE 1: CONSENT MODAL */}
        {roundState === ROUND_STATE.CONSENT && (
          <ConsentModal
            onConsent={handleConsentApproved}
            onCancel={handleConsentCancelled}
          />
        )}

        {/* PHASE 2: ARENA (CHALLENGE TARGET & LIVE CAMERA PREVIEW) */}
        {/* KEPT MOUNTED in the DOM across all active rounds to prevent WebRTC stream detachment (PRIORITY 1.1 - 1.3) */}
        {roundState !== ROUND_STATE.CONSENT && roundState !== ROUND_STATE.SUMMARY && (
          <div
            className="faceoff-stage-grid"
            style={
              roundState === ROUND_STATE.SHOWING_RESULT
                ? {
                    position: 'absolute',
                    top: '-9999px',
                    left: '-9999px',
                    opacity: 0,
                    pointerEvents: 'none',
                  }
                : undefined
            }
          >
            {/* LEFT COLUMN: Target Expression Card */}
            <div className="faceoff-target-col">
              <div className="faceoff-panel-card arcade-panel arcade-panel--cyan">
                <div className="arcade-corner arcade-corner--tl" style={{ color: '#00f0ff' }} />
                <div className="arcade-corner arcade-corner--tr" style={{ color: '#00f0ff' }} />
                <div className="arcade-corner arcade-corner--bl" style={{ color: '#00f0ff' }} />
                <div className="arcade-corner arcade-corner--br" style={{ color: '#00f0ff' }} />

                <div className="faceoff-panel-card__header">
                  <span className="faceoff-panel-badge">{`STAGE ${String(currentRoundIdx + 1).padStart(2, '0')}`}</span>
                  <span className="faceoff-panel-diff">{activeChallenge.difficulty}</span>
                </div>

                <h1 className="faceoff-target-name">{activeChallenge.name}</h1>
                <div className="faceoff-target-subtitle">{activeChallenge.subtitle}</div>

                <div className="faceoff-target-media-frame">
                  {referenceStatus === 'error' ? (
                    <div className="faceoff-reference-loading-card faceoff-reference-loading-card--error" role="alert">
                      <AlertIcon size={24} />
                      <span className="faceoff-ref-loading-text">REFERENCE IMAGE UNAVAILABLE</span>
                    </div>
                  ) : (
                    <>
                      <img
                        key={activeChallenge.id}
                        src={activeChallenge.image}
                        alt={`Target Expression: ${activeChallenge.name}`}
                        className="faceoff-target-img"
                        onLoad={() => setReferenceStatus('ready')}
                      />
                      <div className="faceoff-target-media-overlay">
                        <span>TARGET EXPRESSION</span>
                      </div>
                    </>
                  )}
                </div>

                {referenceStatus === 'error' && (
                  <div className="faceoff-reference-error-card" role="alert">
                    <div className="faceoff-ref-err-text">
                      {referenceError || 'Failed to analyze reference expression.'}
                    </div>
                    <div className="faceoff-ref-err-actions">
                      <button
                        type="button"
                        className="faceoff-btn faceoff-btn--sm faceoff-btn--cyan"
                        onClick={handleRetryReference}
                      >
                        RETRY
                      </button>
                      <button
                        type="button"
                        className="faceoff-btn faceoff-btn--sm faceoff-btn--amber"
                        onClick={handleSkipChallenge}
                      >
                        SKIP CHALLENGE
                      </button>
                    </div>
                  </div>
                )}

                <div className="faceoff-target-instructions">
                  <div className="faceoff-inst-label">HOW TO MATCH:</div>
                  <p>{activeChallenge.instructions}</p>
                </div>

                <div className="faceoff-target-humor">
                  <em>&ldquo;{activeChallenge.humorousDescription}&rdquo;</em>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: Live Video Viewfinder */}
            <div className="faceoff-live-col">
              <div className="faceoff-viewfinder-card arcade-panel arcade-panel--cyan">
                <div className="arcade-corner arcade-corner--tl" style={{ color: '#00f0ff' }} />
                <div className="arcade-corner arcade-corner--tr" style={{ color: '#00f0ff' }} />
                <div className="arcade-corner arcade-corner--bl" style={{ color: '#00f0ff' }} />
                <div className="arcade-corner arcade-corner--br" style={{ color: '#00f0ff' }} />

                <div className="faceoff-viewfinder-header">
                  <div className="faceoff-live-pill">
                    <span className="faceoff-live-dot" /> LIVE CAMERA
                  </div>

                  <div className="faceoff-viewfinder-actions">
                    <SwitchCameraButton
                      camera={camera}
                      className="faceoff-viewfinder-switch-btn"
                      compact={false}
                      showActiveLabel={true}
                      onSwitch={handleCameraSwitch}
                    />

                    <div
                      className={`faceoff-status-pill ${
                        roundState === ROUND_STATE.READY && isFaceDetected
                          ? 'faceoff-status-pill--locked'
                          : roundState === ROUND_STATE.READY
                          ? 'faceoff-status-pill--searching'
                          : 'faceoff-status-pill--loading'
                      }`}
                    >
                      {roundState === ROUND_STATE.READY
                        ? isFaceDetected
                          ? 'FACE DETECTED'
                          : 'SEARCHING FACE'
                        : roundState === ROUND_STATE.COUNTDOWN
                        ? 'HOLD POSE'
                        : roundState === ROUND_STATE.CAPTURING
                        ? 'CAPTURING...'
                        : roundState === ROUND_STATE.ANALYZING_CAPTURE
                        ? 'EVALUATING...'
                        : roundState === ROUND_STATE.RETRY_REQUIRED
                        ? 'RETRY REQUIRED'
                        : viewfinderState === 'connecting'
                        ? 'CONNECTING CAM...'
                        : viewfinderState === 'switching_camera'
                        ? 'SWITCHING CAM...'
                        : viewfinderState === 'initializing_face_detection'
                        ? 'LOADING AI...'
                        : viewfinderState === 'camera_error'
                        ? 'CAM ERROR'
                        : 'STARTING...'}
                    </div>
                  </div>
                </div>

                <div className="faceoff-video-container">
                  <video
                    ref={videoCallbackRef}
                    autoPlay
                    playsInline
                    muted
                    className="faceoff-video-element"
                  />

                  {/* Disconnected Camera Placeholder (Only when truly in error or missing stream) */}
                  {(cameraStatus === 'error' || (!stream && cameraStatus !== 'requesting' && cameraStatus !== 'idle')) && (
                    <div className="faceoff-cam-disconnected">
                      <div className="faceoff-cam-off-icon">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="1" y1="1" x2="23" y2="23" />
                          <path d="M21 21H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3m3-3h6l2 3h4a2 2 0 0 1 2 2v9.34" />
                          <path d="m14.12 14.12a3 3 0 1 1-4.24-4.24" />
                        </svg>
                      </div>
                      <h3 className="faceoff-cam-disconnected__title">Camera not detected</h3>
                      <p className="faceoff-cam-disconnected__desc">
                        {cameraError ? getCameraErrorMessage(cameraError) : 'Make sure your camera is connected and not in use by another app.'}
                      </p>
                    </div>
                  )}

                  {/* Connecting / Buffering Video Indicator (When camera is active but first frame is pending) */}
                  {!isVideoReady && stream && cameraStatus === 'ready' && (
                    <div className="faceoff-cam-disconnected" style={{ background: 'rgba(5, 7, 15, 0.75)' }}>
                      <div className="faceoff-spinner" />
                      <h3 className="faceoff-cam-disconnected__title" style={{ marginTop: 16 }}>Connecting Camera Feed...</h3>
                      <p className="faceoff-cam-disconnected__desc">
                        Synchronizing live video stream.
                      </p>
                    </div>
                  )}

                  {/* Countdown Overlay (5s down to 0) */}
                  {roundState === ROUND_STATE.COUNTDOWN && (
                    <CountdownOverlay
                      secondsLeft={countdown}
                      isFaceDetected={isFaceDetected}
                      liveScore={liveScore}
                      challenge={activeChallenge}
                    />
                  )}

                  {/* Evaluating / Capturing Scan Overlay */}
                  {(roundState === ROUND_STATE.CAPTURING ||
                    roundState === ROUND_STATE.ANALYZING_CAPTURE) && (
                    <div className="faceoff-eval-overlay">
                      <div className="faceoff-scan-line" />
                      <div className="faceoff-eval-text">
                        {roundState === ROUND_STATE.CAPTURING
                          ? 'CAPTURING FACIAL FRAME...'
                          : 'ANALYZING EXPRESSION MATCH...'}
                      </div>
                    </div>
                  )}

                  {/* Retry Required Overlay (Bounded Recovery & Explanation) */}
                  {roundState === ROUND_STATE.RETRY_REQUIRED && (
                    <div className="faceoff-retry-overlay">
                      <div className="faceoff-retry-icon">
                        <AlertIcon size={36} />
                      </div>
                      <div className="faceoff-retry-title">FACE NOT DETECTED AT ZERO</div>
                      <p className="faceoff-retry-msg">
                        {captureError ||
                          'Could not clearly measure your expression at the capture moment. Please look straight into the camera in good lighting and try again!'}
                      </p>
                      <button
                        type="button"
                        className="faceoff-btn faceoff-btn--cyan"
                        onClick={handleRetake}
                      >
                        <RefreshIcon size={16} /> RETAKE CHALLENGE
                      </button>
                    </div>
                  )}

                  {/* Camera Requesting / Switching Overlay */}
                  {(viewfinderState === 'connecting' ||
                    viewfinderState === 'switching_camera') &&
                    !isVideoReady && (
                      <div className="faceoff-loading-overlay">
                        <div className="faceoff-spinner" />
                        <div className="faceoff-loading-title">
                          {isSwitching ? 'SWITCHING CAMERA...' : 'CONNECTING WEBCAM...'}
                        </div>
                        <div className="faceoff-loading-sub">
                          {activeDevice?.label || 'Accessing video device'}
                        </div>
                      </div>
                    )}

                  {/* Camera Error / Timeout Overlay */}
                  {viewfinderState === 'camera_error' && (
                    <div className="faceoff-error-overlay">
                      <div className="faceoff-error-title">WEBCAM ACCESS ERROR</div>
                      <p className="faceoff-error-msg">
                        {isCameraTimedOut
                          ? 'Camera initialization timed out. Please check permissions or switch to another camera.'
                          : getCameraErrorMessage(camera.error)}
                      </p>
                      <div className="faceoff-error-actions">
                        <button
                          type="button"
                          className="faceoff-btn faceoff-btn--cyan"
                          onClick={() => safeStartCamera().catch(() => {})}
                        >
                          RETRY CAMERA
                        </button>
                        {devices.length >= 2 && (
                          <button
                            type="button"
                            className="faceoff-btn faceoff-btn--amber"
                            onClick={() => camera.switchCamera()}
                          >
                            SWITCH CAMERA
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Model Error Non-blocking Banner */}
                  {viewfinderState === 'face_detection_error' && isVideoReady && (
                    <div className="faceoff-model-error-badge">
                      <span>Face Detector: {modelError || 'Failed to initialize AI model'}</span>
                      <button
                        type="button"
                        className="faceoff-btn-retry-model"
                        onClick={retryModel}
                      >
                        RETRY DETECTOR
                      </button>
                    </div>
                  )}

                  {/* Model Initializing Non-blocking Chip */}
                  {viewfinderState === 'initializing_face_detection' && isVideoReady && (
                    <div className="faceoff-model-loading-chip">
                      <span className="faceoff-spinner-mini" />
                      <span>INITIALIZING AI FACE TRACKER...</span>
                    </div>
                  )}
                </div>

                {/* Viewfinder Footer Controls */}
                <div className="faceoff-viewfinder-footer">
                  {roundState === ROUND_STATE.READY ||
                  roundState === ROUND_STATE.INITIALIZING ||
                  roundState === ROUND_STATE.CAMERA_READY ||
                  roundState === ROUND_STATE.LOADING_REFERENCE ||
                  roundState === ROUND_STATE.ANALYZING_REFERENCE ? (
                    <button
                      type="button"
                      className="faceoff-btn faceoff-btn--start-challenge"
                      onClick={handleStartChallenge}
                      disabled={roundState !== ROUND_STATE.READY || !readiness.allReady}
                    >
                      <PlayIcon size={18} />{' '}
                      {!readiness.camera
                        ? 'CONNECTING CAMERA...'
                        : !readiness.video
                        ? 'STARTING VIDEO FEED...'
                        : !readiness.model
                        ? 'LOADING AI MODEL...'
                        : !readiness.reference
                        ? referenceStatus === 'error'
                          ? 'REFERENCE ERROR — SKIP OR RETRY'
                          : 'SYNCHRONIZING REFERENCE...'
                        : `START CHALLENGE (${ROUND_DURATION_SECONDS}S TIMER)`}
                    </button>
                  ) : (
                    <div className="faceoff-countdown-hint">
                      {roundState === ROUND_STATE.COUNTDOWN
                        ? 'HOLD YOUR BEST EXPRESSION AT ZERO!'
                        : roundState === ROUND_STATE.CAPTURING ||
                          roundState === ROUND_STATE.ANALYZING_CAPTURE
                        ? 'MEASURING FACIAL EXPRESSION...'
                        : 'CHALLENGE IN PROGRESS'}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PHASE 3: RESULT SCREEN (PRIORITY 7) */}
        {roundState === ROUND_STATE.SHOWING_RESULT && (
          <ResultComparison
            challenge={activeChallenge}
            capturedPhoto={capturedPhoto}
            scoreResult={scoreResult}
            faceDetected={isFaceDetectedAtZero}
            errorMessage={captureError}
            onRetake={handleRetake}
            onNext={handleNextChallenge}
            isLastRound={currentRoundIdx + 1 >= sessionRoundCount}
          />
        )}

        {/* PHASE 4: SESSION SUMMARY SCREEN */}
        {roundState === ROUND_STATE.SUMMARY && (
          <SessionSummary
            results={completedResults}
            onPlayAgain={handlePlayAgain}
            onExit={handleExit}
          />
        )}
      </main>

      {/* ── DEVELOPER DIAGNOSTICS PANEL (PRIORITY 1.6 & 9) ───────────────── */}
      {showDiagnostics && (
        <aside className="faceoff-diag-panel" aria-label="Face Off AI Diagnostics">
          <div className="faceoff-diag-header">
            <span>AI ENGINE & CAMERA DIAGNOSTICS</span>
            <button
              type="button"
              className="faceoff-diag-close"
              onClick={() => setShowDiagnostics(false)}
              aria-label="Close diagnostics"
            >
              X
            </button>
          </div>

          <div className="faceoff-diag-row">
            <span className="faceoff-diag-label">Round Session:</span>
            <span className="faceoff-diag-val faceoff-diag-val--ok">
              Round {currentRoundIdx + 1} of {sessionRoundCount} ({activeChallenge.id})
            </span>
          </div>

          <div className="faceoff-diag-row">
            <span className="faceoff-diag-label">Round State:</span>
            <span className="faceoff-diag-val faceoff-diag-val--ok">
              {ROUND_STATE_LABELS[roundState] || roundState}
            </span>
          </div>

          <div className="faceoff-diag-row">
            <span className="faceoff-diag-label">Video Attached:</span>
            <span
              className={`faceoff-diag-val ${
                isVideoAttached ? 'faceoff-diag-val--ok' : 'faceoff-diag-val--err'
              }`}
            >
              {isVideoAttached ? 'YES (srcObject set)' : 'NO (detached)'}
            </span>
          </div>

          <div className="faceoff-diag-row">
            <span className="faceoff-diag-label">Stream Active:</span>
            <span
              className={`faceoff-diag-val ${
                isStreamActive ? 'faceoff-diag-val--ok' : 'faceoff-diag-val--err'
              }`}
            >
              {isStreamActive ? 'YES (active)' : 'NO (inactive)'}
            </span>
          </div>

          <div className="faceoff-diag-row">
            <span className="faceoff-diag-label">Video Track:</span>
            <span
              className={`faceoff-diag-val ${
                liveVideoTrack ? 'faceoff-diag-val--ok' : 'faceoff-diag-val--err'
              }`}
            >
              {liveVideoTrack ? `LIVE (${liveVideoTrack.label?.slice(0, 16) || 'track'})` : 'NONE'}
            </span>
          </div>

          <div className="faceoff-diag-row">
            <span className="faceoff-diag-label">Playback State:</span>
            <span
              className={`faceoff-diag-val ${
                isVideoPlaying ? 'faceoff-diag-val--ok' : 'faceoff-diag-val--warn'
              }`}
            >
              {isVideoPlaying ? 'PLAYING' : videoDom?.paused ? 'PAUSED' : 'WAITING'}
            </span>
          </div>

          <div className="faceoff-diag-row">
            <span className="faceoff-diag-label">Video Resolution:</span>
            <span
              className={`faceoff-diag-val ${
                readiness.video ? 'faceoff-diag-val--ok' : 'faceoff-diag-val--warn'
              }`}
            >
              {videoDom
                ? `${videoDom.videoWidth}x${videoDom.videoHeight} (r:${videoDom.readyState})`
                : 'null'}
            </span>
          </div>

          <div className="faceoff-diag-row">
            <span className="faceoff-diag-label">Frame Flow:</span>
            <span
              className={`faceoff-diag-val ${
                readiness.video ? 'faceoff-diag-val--ok' : 'faceoff-diag-val--warn'
              }`}
            >
              {readiness.video ? 'LIVE FEEDING' : 'STALLED'}
            </span>
          </div>

          <div className="faceoff-diag-row">
            <span className="faceoff-diag-label">Face Inference:</span>
            <span
              className={`faceoff-diag-val ${
                trackingEnabled && modelStatus === 'ready'
                  ? 'faceoff-diag-val--ok'
                  : 'faceoff-diag-val--warn'
              }`}
            >
              {trackingEnabled && modelStatus === 'ready' ? 'ACTIVE (15 FPS)' : 'PAUSED'}
            </span>
          </div>

          <div className="faceoff-diag-row">
            <span className="faceoff-diag-label">Live Face Lock:</span>
            <span
              className={`faceoff-diag-val ${
                isFaceDetected ? 'faceoff-diag-val--ok' : 'faceoff-diag-val--warn'
              }`}
            >
              {isFaceDetected ? `LOCKED (${latestFeatures?.landmarkCount || 478} pts)` : 'SEARCHING'}
            </span>
          </div>

          <div className="faceoff-diag-row">
            <span className="faceoff-diag-label">Live Sync Score:</span>
            <span className="faceoff-diag-val">
              {liveScore !== null ? `${liveScore}%` : 'N/A'}
            </span>
          </div>

          <div className="faceoff-diag-row">
            <span className="faceoff-diag-label">Target Channels:</span>
            <span className="faceoff-diag-val">
              {Object.keys(targetFeatures?.targetBlendshapes || {}).length} blendshapes ({referenceStatus})
            </span>
          </div>

          <div className="faceoff-diag-row">
            <span className="faceoff-diag-label">Last Photo:</span>
            <span className="faceoff-diag-val">
              {capturedPhoto ? 'SUCCESS (data-url)' : 'NONE'}
            </span>
          </div>

          <div className="faceoff-diag-row">
            <span className="faceoff-diag-label">Last Score:</span>
            <span
              className={`faceoff-diag-val ${
                scoreResult ? 'faceoff-diag-val--ok' : 'faceoff-diag-val--warn'
              }`}
            >
              {scoreResult ? `${scoreResult.score}%` : 'NONE'}
            </span>
          </div>

          {captureError && (
            <div className="faceoff-diag-row">
              <span className="faceoff-diag-label">Latest Error:</span>
              <span className="faceoff-diag-val faceoff-diag-val--err">
                {captureError}
              </span>
            </div>
          )}
        </aside>
      )}

      {/* Floating Cyberpunk Audio Settings Modal */}
      <AudioSettingsModal
        isOpen={isAudioModalOpen}
        onClose={() => setIsAudioModalOpen(false)}
        currentGame="face-off"
      />
    </div>
  );
}
