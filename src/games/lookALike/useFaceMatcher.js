import { useEffect, useRef, useState, useCallback } from 'react';
import { useCamera } from '../../vision/useCamera';
import {
  loadLookALikeLandmarker,
  extractFaceFeaturesAtIndex,
  extractAllDetectedFaces,
  cropFaceToDataUrl,
} from './faceFeatureExtractor';
import {
  findClosestCelebrity,
  matchGroupParticipants,
  CELEBRITY_DATABASE,
} from './celebrityDatabase';
import {
  generateSoloComposite,
  generateGroupComposite,
} from './compositeGenerator';

export const MATCHER_STATE = {
  IDLE: 'idle',
  REQUESTING_CAMERA: 'requesting_camera',
  CAMERA_READY: 'camera_ready',
  CAPTURING: 'capturing',
  ANALYZING: 'analyzing',
  SHOWING_RESULT: 'showing_result',
  ERROR: 'error',
};

export function useFaceMatcher({
  mode = 'solo',
  autoStartCamera = true,
  initialCollection = 'all',
} = {}) {
  const camera = useCamera({ width: 1280, height: 720 });
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const landmarkerRef = useRef(null);
  const animFrameIdRef = useRef(null);
  const lastVideoTimeRef = useRef(-1);
  const isMountedRef = useRef(true);

  const [modelReady, setModelReady] = useState(false);
  const [modelError, setModelError] = useState(null);

  // Live detection states
  const [faceDetected, setFaceDetected] = useState(false);
  const [detectedCount, setDetectedCount] = useState(0);
  const latestResultRef = useRef(null);

  // Explicit UI Workflow State
  const [workflowState, setWorkflowState] = useState(MATCHER_STATE.IDLE);
  const [frozenParticipantPhoto, setFrozenParticipantPhoto] = useState(null);
  const [matcherError, setMatcherError] = useState(null);
  const captureIdRef = useRef(null);
  const capturedFeaturesRef = useRef(null);

  // Legacy compatibility: 'camera' | 'result'
  const [gameState, setGameState] = useState('camera');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [countdown, setCountdown] = useState(null);
  const countdownTimerRef = useRef(null);

  // Results
  const [soloMatch, setSoloMatch] = useState(null); // { participantPhoto, celebrity }
  const [groupMatches, setGroupMatches] = useState([]); // [{ participantIndex, imageUri, celebrity }]
  const [compositeDataUrl, setCompositeDataUrl] = useState('');

  // Reference Collection Selection (defaults to initialCollection, e.g. 'all', 'male', or 'female')
  const [selectedCollection, setSelectedCollectionState] = useState(initialCollection);
  const [participantCollections, setParticipantCollections] = useState({});

  // Manual camera starter for on-demand camera initialization
  const startCamera = useCallback(async () => {
    if (camera.status === 'ready' && camera.stream) return camera.stream;
    try {
      return await camera.start();
    } catch (err) {
      console.warn('[LookALike] Camera start error:', err);
      throw err;
    }
  }, [camera]);

  // Synchronize camera lifecycle with workflowState
  useEffect(() => {
    if (
      workflowState === MATCHER_STATE.CAPTURING ||
      workflowState === MATCHER_STATE.ANALYZING ||
      workflowState === MATCHER_STATE.SHOWING_RESULT
    ) {
      return;
    }
    if (camera.status === 'ready') {
      setWorkflowState(MATCHER_STATE.CAMERA_READY);
    } else if (camera.status === 'requesting') {
      setWorkflowState(MATCHER_STATE.REQUESTING_CAMERA);
    } else if (camera.status === 'error') {
      setWorkflowState(MATCHER_STATE.ERROR);
    } else {
      setWorkflowState(MATCHER_STATE.IDLE);
    }
  }, [camera.status, workflowState]);

  // 1. Initialize FaceLandmarker
  useEffect(() => {
    isMountedRef.current = true;
    let cancelled = false;

    loadLookALikeLandmarker()
      .then((landmarker) => {
        if (!cancelled && isMountedRef.current) {
          landmarkerRef.current = landmarker;
          setModelReady(true);
        }
      })
      .catch((err) => {
        console.warn('[LookALike] FaceLandmarker load error, will use mock detection if camera active:', err);
        if (!cancelled && isMountedRef.current) {
          setModelError(err?.message || 'Failed to initialize face vision model');
        }
      });

    return () => {
      cancelled = true;
      isMountedRef.current = false;
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
      }
    };
  }, []);

  // 2. Start camera stream on mount if autoStartCamera is enabled
  useEffect(() => {
    if (!autoStartCamera) return;
    let cancelled = false;
    camera.start().catch((err) => {
      if (!cancelled) {
        console.warn('[LookALike] Camera start error:', err);
      }
    });

    return () => {
      cancelled = true;
      camera.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStartCamera]);

  // Clean up camera on hook unmount
  useEffect(() => {
    return () => {
      camera.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 3. Attach camera stream to video element
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (camera.stream) {
      if (video.srcObject !== camera.stream) {
        video.srcObject = camera.stream;
      }
      const onReady = () => {
        video.play().catch(() => {});
      };
      if (video.readyState >= 1) {
        onReady();
      } else {
        video.addEventListener('loadedmetadata', onReady, { once: true });
      }
      return () => {
        video.removeEventListener('loadedmetadata', onReady);
      };
    } else {
      video.srcObject = null;
    }
  }, [camera.stream, gameState]);

  // 3. Draw live tracking HUD overlay
  const drawHud = useCallback((result, video, canvas) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const vWidth = video.videoWidth || 640;
    const vHeight = video.videoHeight || 480;

    if (canvas.width !== vWidth || canvas.height !== vHeight) {
      canvas.width = vWidth;
      canvas.height = vHeight;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const faces = result?.faceLandmarks || [];
    if (faces.length === 0) return;

    // In mirrored webcam mode, mirror X coordinate
    ctx.save();
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);

    faces.forEach((landmarks, idx) => {
      // Compute bounding box
      let minX = 1;
      let maxX = 0;
      let minY = 1;
      let maxY = 0;
      for (const pt of landmarks) {
        if (pt.x < minX) minX = pt.x;
        if (pt.x > maxX) maxX = pt.x;
        if (pt.y < minY) minY = pt.y;
        if (pt.y > maxY) maxY = pt.y;
      }

      const pad = 0.2;
      const x = Math.max(0, (minX - pad * (maxX - minX)) * canvas.width);
      const y = Math.max(0, (minY - pad * (maxY - minY)) * canvas.height);
      const w = Math.min(canvas.width - x, (maxX - minX) * (1 + pad * 2) * canvas.width);
      const h = Math.min(canvas.height - y, (maxY - minY) * (1 + pad * 2) * canvas.height);

      // Draw cyber targeting frame
      ctx.strokeStyle = idx === 0 ? '#00f0ff' : '#00ff88';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, w, h);

      // Corner accents
      const cornerLen = 14;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      // top-left
      ctx.beginPath();
      ctx.moveTo(x, y + cornerLen);
      ctx.lineTo(x, y);
      ctx.lineTo(x + cornerLen, y);
      ctx.stroke();
      // top-right
      ctx.beginPath();
      ctx.moveTo(x + w - cornerLen, y);
      ctx.lineTo(x + w, y);
      ctx.lineTo(x + w, y + cornerLen);
      ctx.stroke();

      // Label (un-mirror text so it is readable)
      ctx.save();
      ctx.translate(x + 10, y - 8);
      ctx.scale(-1, 1);
      ctx.fillStyle = idx === 0 ? '#00f0ff' : '#00ff88';
      ctx.font = 'bold 13px "Rajdhani", sans-serif';
      const label = mode === 'solo' ? 'PARTICIPANT' : `PARTICIPANT 0${idx + 1}`;
      ctx.fillText(label, 0, 0);
      ctx.restore();
    });

    ctx.restore();
  }, [mode]);

  // 4. Live detection loop (strictly paused when displaying result or analyzing)
  useEffect(() => {
    if (gameState !== 'camera' || workflowState === MATCHER_STATE.SHOWING_RESULT) {
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const landmarker = landmarkerRef.current;

    let isRunning = true;

    const detectFrame = (timestamp) => {
      if (!isRunning) return;

      if (video && video.readyState >= 2) {
        if (landmarker && video.currentTime !== lastVideoTimeRef.current) {
          lastVideoTimeRef.current = video.currentTime;
          try {
            const result = landmarker.detectForVideo(video, timestamp);
            latestResultRef.current = result;
            const count = result?.faceLandmarks?.length || 0;
            setDetectedCount(count);
            setFaceDetected(count > 0);

            if (canvas) {
              drawHud(result, video, canvas);
            }
          } catch (err) {
            console.debug('[LookALike] Detection tick failed:', err);
          }
        } else if (!landmarker && canvas) {
          // If landmarker is still loading, clear HUD
          const ctx = canvas.getContext('2d');
          if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
          // Set detected true so user can still test in mock environment
          setFaceDetected(true);
          setDetectedCount(1);
        }
      }

      animFrameIdRef.current = requestAnimationFrame(detectFrame);
    };

    animFrameIdRef.current = requestAnimationFrame(detectFrame);

    return () => {
      isRunning = false;
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
    };
  }, [gameState, workflowState, drawHud]);

  // 5. Trigger Capture & Match with Session Isolation and Frozen Frame
  const executeCapture = useCallback(async () => {
    const captureId = `cap_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    captureIdRef.current = captureId;

    setWorkflowState(MATCHER_STATE.CAPTURING);
    setIsAnalyzing(true);
    setCountdown(null);
    setMatcherError(null);

    const video = videoRef.current;
    const result = latestResultRef.current;

    // Snapshot canvas — freeze exactly ONE valid frame
    const hasVideo = video && video.readyState >= 2 && video.videoWidth > 0;
    const width = hasVideo ? video.videoWidth : 640;
    const height = hasVideo ? video.videoHeight : 480;

    const snapCanvas = document.createElement('canvas');
    snapCanvas.width = width;
    snapCanvas.height = height;
    const ctx = snapCanvas.getContext('2d');

    if (hasVideo && ctx) {
      ctx.save();
      ctx.translate(width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0, width, height);
      ctx.restore();
    } else if (ctx) {
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = '#00f0ff';
      ctx.font = 'bold 24px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('PARTICIPANT SNAPSHOT', width / 2, height / 2);
    }

    const fullFrameDataUrl = snapCanvas.toDataURL('image/jpeg', 0.9);

    let croppedPhotoUrl = fullFrameDataUrl;
    let userFeatures = null;
    let detectedFaces = [];

    if (mode === 'solo') {
      if (result && result.faceLandmarks && result.faceLandmarks.length > 0) {
        userFeatures = extractFaceFeaturesAtIndex(result, 0);
        if (hasVideo && userFeatures?.boundingBox) {
          croppedPhotoUrl = cropFaceToDataUrl(video, userFeatures.boundingBox, 420) || fullFrameDataUrl;
        }
      }
      capturedFeaturesRef.current = userFeatures;
      setFrozenParticipantPhoto(croppedPhotoUrl);
    } else {
      detectedFaces = result ? extractAllDetectedFaces(result) : [];
      capturedFeaturesRef.current = detectedFaces;
      setFrozenParticipantPhoto(fullFrameDataUrl);
    }

    // Explicitly transition to ANALYZING state
    setWorkflowState(MATCHER_STATE.ANALYZING);

    // Bounded timeout safety (10 seconds)
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Facial analysis timed out. Please try again.')), 10000);
    });

    try {
      const matchPromise = (async () => {
        if (mode === 'solo') {
          const matchedCeleb = findClosestCelebrity(userFeatures, { collection: selectedCollection });
          const composite = await generateSoloComposite(croppedPhotoUrl, matchedCeleb);
          return {
            solo: { participantPhoto: croppedPhotoUrl, celebrity: matchedCeleb },
            composite,
          };
        } else {
          const participants = [];
          if (detectedFaces.length > 0) {
            detectedFaces.forEach((face, idx) => {
              let croppedUrl = fullFrameDataUrl;
              if (hasVideo && face.boundingBox) {
                croppedUrl = cropFaceToDataUrl(video, face.boundingBox, 360) || fullFrameDataUrl;
              }
              const pIndex = idx + 1;
              participants.push({
                participantIndex: pIndex,
                features: face,
                imageUri: croppedUrl,
                collection: participantCollections[pIndex] || selectedCollection,
              });
            });
          } else {
            participants.push(
              {
                participantIndex: 1,
                features: { blendshapes: { mouthSmileLeft: 0.9, mouthSmileRight: 0.9 } },
                imageUri: fullFrameDataUrl,
                collection: participantCollections[1] || selectedCollection,
              },
              {
                participantIndex: 2,
                features: { blendshapes: { eyeWideLeft: 0.9, jawOpen: 0.6 } },
                imageUri: fullFrameDataUrl,
                collection: participantCollections[2] || selectedCollection,
              },
            );
          }
          const matchedGroup = matchGroupParticipants(participants, { collection: selectedCollection });
          const composite = await generateGroupComposite(matchedGroup);
          return {
            group: matchedGroup,
            composite,
          };
        }
      })();

      const outcome = await Promise.race([matchPromise, timeoutPromise]);

      // Check if session is still valid (user didn't click Try Again in the meantime)
      if (captureIdRef.current !== captureId || !isMountedRef.current) {
        return;
      }

      if (mode === 'solo') {
        setSoloMatch(outcome.solo);
      } else {
        setGroupMatches(outcome.group);
      }
      setCompositeDataUrl(outcome.composite);
      setGameState('result');
      setWorkflowState(MATCHER_STATE.SHOWING_RESULT);
    } catch (err) {
      if (captureIdRef.current !== captureId || !isMountedRef.current) return;
      console.warn('[LookALike] Matching error:', err);
      setMatcherError(err?.message || 'Failed to match with celebrity database. Please retry.');
      setWorkflowState(MATCHER_STATE.ERROR);
    } finally {
      if (captureIdRef.current === captureId && isMountedRef.current) {
        setIsAnalyzing(false);
      }
    }
  }, [mode, selectedCollection, participantCollections]);

  const triggerCapture = useCallback((delaySeconds = 0) => {
    if (workflowState === MATCHER_STATE.CAPTURING || workflowState === MATCHER_STATE.ANALYZING) {
      return;
    }

    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }

    if (delaySeconds <= 0) {
      executeCapture();
      return;
    }

    setCountdown(delaySeconds);
    let remaining = delaySeconds;

    countdownTimerRef.current = setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        clearInterval(countdownTimerRef.current);
        countdownTimerRef.current = null;
        setCountdown(null);
        executeCapture();
      } else {
        setCountdown(remaining);
      }
    }, 1000);
  }, [workflowState, executeCapture]);

  const cancelCountdown = useCallback(() => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    setCountdown(null);
  }, []);

  const resetToCamera = useCallback(() => {
    // Invalidate any pending capture responses
    captureIdRef.current = null;
    cancelCountdown();
    setGameState('camera');
    setSoloMatch(null);
    setGroupMatches([]);
    setCompositeDataUrl('');
    setFrozenParticipantPhoto(null);
    setMatcherError(null);
    setIsAnalyzing(false);
    setWorkflowState(camera.status === 'ready' ? MATCHER_STATE.CAMERA_READY : MATCHER_STATE.REQUESTING_CAMERA);
    if (camera.status !== 'ready' && camera.status !== 'requesting') {
      camera.start().catch(() => {});
    }
  }, [cancelCountdown, camera]);

  const setSelectedCollection = useCallback((col) => {
    setSelectedCollectionState(col);
    if (gameState === 'result') {
      resetToCamera();
    }
  }, [gameState, resetToCamera]);

  const setParticipantCollection = useCallback((pIndex, col) => {
    setParticipantCollections((prev) => ({ ...prev, [pIndex]: col }));
  }, []);

  const retryAnalysis = useCallback(() => {
    if (!frozenParticipantPhoto) {
      resetToCamera();
      return;
    }
    executeCapture();
  }, [frozenParticipantPhoto, executeCapture, resetToCamera]);

  return {
    camera,
    videoRef,
    canvasRef,
    modelReady,
    modelError,
    faceDetected,
    detectedCount,
    gameState,
    workflowState,
    isAnalyzing,
    countdown,
    soloMatch,
    groupMatches,
    compositeDataUrl,
    frozenParticipantPhoto,
    matcherError,
    selectedCollection,
    setSelectedCollection,
    participantCollections,
    setParticipantCollection,
    startCamera,
    triggerCapture,
    cancelCountdown,
    resetToCamera,
    retryAnalysis,
  };
}
