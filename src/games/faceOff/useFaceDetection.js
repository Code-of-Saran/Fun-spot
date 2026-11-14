/**
 * FUN SPOT — FACE OFF: AI EXPRESSION MATCH
 * Face Detection Hook: Live tracking, presence detection & frame-perfect still capture
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  loadFaceOffLandmarker,
  extractFacialFeatures,
  calculateExpressionMatch,
} from './faceAnalysis';

const INFERENCE_INTERVAL_MS = 65; // ~15 FPS: Smooth face tracking without hogging CPU/GPU

export function useFaceDetection({ videoRef, enabled = true, currentChallenge = null }) {
  const [modelStatus, setModelStatus] = useState('loading'); // loading | ready | error
  const [modelError, setModelError] = useState(null);
  const [isFaceDetected, setIsFaceDetected] = useState(false);
  const [liveScore, setLiveScore] = useState(null);
  const [modelAttempt, setModelAttempt] = useState(0);

  const landmarkerRef = useRef(null);
  const animFrameIdRef = useRef(null);
  const lastInferenceTimeRef = useRef(0);
  // Monotonically increasing timestamp across the entire session (NEVER reset to zero)
  const sessionTimestampRef = useRef(1);
  const latestFeaturesRef = useRef(null);
  const latestFeaturesTimeRef = useRef(0);
  const offscreenCanvasRef = useRef(null);
  const isBusyRef = useRef(false); // Mutex preventing concurrent still & video inference

  // Keep challenge in a ref so round changes do not tear down the live detection loop
  const currentChallengeRef = useRef(currentChallenge);
  currentChallengeRef.current = currentChallenge;

  const retryModel = useCallback(() => {
    setModelStatus('loading');
    setModelError(null);
    setModelAttempt((prev) => prev + 1);
  }, []);

  // Initialize MediaPipe FaceLandmarker singleton
  useEffect(() => {
    let mounted = true;
    setModelStatus('loading');
    setModelError(null);

    loadFaceOffLandmarker()
      .then((landmarker) => {
        if (!mounted) return;
        landmarkerRef.current = landmarker;
        // Ensure runningMode starts in VIDEO mode for detectForVideo
        try {
          landmarker.setOptions?.({ runningMode: 'VIDEO' });
        } catch {}
        setModelStatus('ready');
      })
      .catch((err) => {
        if (!mounted) return;
        console.error('[FaceOff] Failed to load FaceLandmarker:', err);
        setModelError(err?.message || 'Face detection model failed to load');
        setModelStatus('error');
      });

    return () => {
      mounted = false;
    };
  }, [modelAttempt]);

  // Live detection loop
  useEffect(() => {
    if (!enabled || modelStatus !== 'ready') {
      setIsFaceDetected(false);
      setLiveScore(null);
      return undefined;
    }

    let active = true;

    const detectLoop = (now) => {
      if (!active) return;

      const video = videoRef.current;
      const landmarker = landmarkerRef.current;

      // Ensure video is actively playing if it was paused during transition
      if (video && video.paused && video.readyState >= 2) {
        video.play().catch(() => {});
      }

      if (
        !isBusyRef.current &&
        video &&
        video.readyState >= 2 &&
        video.videoWidth > 0 &&
        !video.paused &&
        landmarker &&
        now - lastInferenceTimeRef.current >= INFERENCE_INTERVAL_MS
      ) {
        lastInferenceTimeRef.current = now;

        try {
          // Strictly monotonically increasing timestamp across the entire session
          const nowMs = Math.round(performance.now());
          const timestamp = Math.max(nowMs, sessionTimestampRef.current + 1);
          sessionTimestampRef.current = timestamp;

          const rawResult = landmarker.detectForVideo(video, timestamp);
          const features = extractFacialFeatures(rawResult);

          if (features) {
            latestFeaturesRef.current = features;
            latestFeaturesTimeRef.current = performance.now();
            setIsFaceDetected(true);

            const activeChallenge = currentChallengeRef.current;
            if (activeChallenge) {
              const match = calculateExpressionMatch(features, activeChallenge);
              setLiveScore(match.score);
            }
          } else {
            // Keep recent features for a short 600ms grace window so brief blinks don't drop capture recovery
            if (performance.now() - latestFeaturesTimeRef.current > 600) {
              latestFeaturesRef.current = null;
            }
            setIsFaceDetected(false);
            setLiveScore(null);
          }
        } catch (err) {
          console.warn('[FaceOff] detectForVideo exception:', err?.message);
          // If running mode got disrupted, restore VIDEO mode gracefully
          if (err?.message && err.message.includes('running mode')) {
            try {
              landmarker.setOptions?.({ runningMode: 'VIDEO' });
            } catch {}
          }
        }
      }

      animFrameIdRef.current = requestAnimationFrame(detectLoop);
    };

    animFrameIdRef.current = requestAnimationFrame(detectLoop);

    return () => {
      active = false;
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
        animFrameIdRef.current = null;
      }
    };
  }, [enabled, modelStatus, videoRef]);

  /**
   * Capture a still photo from the CURRENT video frame and score it synchronously.
   * Ensures the captured photo and calculated score correspond to the exact same frame.
   * Includes bounded recovery if face is momentarily blurred at zero.
   *
   * @param {object} referenceFeatures - Target features for current challenge
   * @returns {Promise<{ photoUrl: string|null, scoreResult: object|null, faceDetected: boolean }>}
   */
  const captureStillAndScore = useCallback(
    async (referenceFeatures) => {
      const video = videoRef.current;
      const landmarker = landmarkerRef.current;

      if (!video || video.videoWidth === 0 || video.videoHeight === 0) {
        return {
          photoUrl: null,
          scoreResult: null,
          faceDetected: false,
          error: 'Camera video source unavailable at capture moment',
        };
      }

      isBusyRef.current = true;
      try {
        // 1. Draw raw unmirrored video frame for anatomical feature analysis
        if (!offscreenCanvasRef.current) {
          offscreenCanvasRef.current = document.createElement('canvas');
        }
        const rawCanvas = offscreenCanvasRef.current;
        rawCanvas.width = video.videoWidth;
        rawCanvas.height = video.videoHeight;
        const rawCtx = rawCanvas.getContext('2d');
        rawCtx.drawImage(video, 0, 0, rawCanvas.width, rawCanvas.height);

        // 2. Perform synchronous analysis on this EXACT raw frame
        let finalFeatures = null;
        if (landmarker && typeof landmarker.detect === 'function') {
          try {
            landmarker.setOptions?.({ runningMode: 'IMAGE' });
            const rawResult = landmarker.detect(rawCanvas);
            finalFeatures = extractFacialFeatures(rawResult);
          } catch (e) {
            console.warn('[FaceOff] Instant still detection warning, falling back to recent frame:', e.message);
          } finally {
            // Immediately restore VIDEO mode so live detection can resume smoothly
            try {
              landmarker.setOptions?.({ runningMode: 'VIDEO' });
            } catch {}
          }
        }

        // If instant canvas detection was unavailable (e.g. motion blur at instant of capture),
        // fallback to most recent valid tracking features from the last second of countdown
        if (!finalFeatures && latestFeaturesRef.current) {
          finalFeatures = latestFeaturesRef.current;
        }

        // Bounded Recovery: If still no face detected, wait 120ms and try one fresh video frame
        if (!finalFeatures && video && video.readyState >= 2 && landmarker) {
          try {
            await new Promise((r) => setTimeout(r, 120));
            rawCtx.drawImage(video, 0, 0, rawCanvas.width, rawCanvas.height);
            landmarker.setOptions?.({ runningMode: 'IMAGE' });
            const retryResult = landmarker.detect(rawCanvas);
            finalFeatures = extractFacialFeatures(retryResult);
          } catch (e) {
            console.warn('[FaceOff] Bounded recovery attempt warning:', e.message);
          } finally {
            try {
              landmarker.setOptions?.({ runningMode: 'VIDEO' });
            } catch {}
          }
        }

        // 3. Create display photo (horizontally mirrored so it matches what user saw in mirror preview)
        const displayCanvas = document.createElement('canvas');
        displayCanvas.width = video.videoWidth;
        displayCanvas.height = video.videoHeight;
        const displayCtx = displayCanvas.getContext('2d');
        displayCtx.save();
        displayCtx.translate(displayCanvas.width, 0);
        displayCtx.scale(-1, 1);
        displayCtx.drawImage(rawCanvas, 0, 0);
        displayCtx.restore();

        const photoUrl = displayCanvas.toDataURL('image/jpeg', 0.92);

        if (!finalFeatures) {
          return {
            photoUrl,
            scoreResult: null,
            faceDetected: false,
            error: 'Face not detected in final frame. Please face the camera directly in good lighting.',
          };
        }

        // 4. Compute deterministic match score
        const scoreResult = calculateExpressionMatch(finalFeatures, referenceFeatures);

        return {
          photoUrl,
          scoreResult,
          faceDetected: true,
          features: finalFeatures,
        };
      } finally {
        isBusyRef.current = false;
        // Guarantee landmarker is in VIDEO mode after capture
        try {
          landmarker?.setOptions?.({ runningMode: 'VIDEO' });
        } catch {}
      }
    },
    [videoRef],
  );

  return {
    modelStatus,
    modelError,
    retryModel,
    isFaceDetected,
    liveScore,
    latestFeatures: latestFeaturesRef.current,
    captureStillAndScore,
    lastInferenceTimestamp: sessionTimestampRef.current,
  };
}

