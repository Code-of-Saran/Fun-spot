import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Shared MediaPipe frame loop used by every camera game.
 *
 * While `enabled`, loads the tasks once (`load`), then runs ONE
 * requestAnimationFrame loop: every NEW video frame goes through `detect` and
 * the result is passed to `onResult`. Nothing here touches React state per
 * frame, so detection never causes re-renders.
 *
 * `loadKey`   — identifies which tasks `load` returns — change it to reload.
 * `streamKey` — opaque value that changes when the camera stream changes (e.g.
 *               the stream object itself or a counter).  Changing it re-anchors
 *               the frame-scheduling loop to the new video element srcObject so
 *               detection resumes after a camera switch.
 *
 * status: idle | loading | ready | error
 */
export function useDetectionLoop({ videoRef, enabled, loadKey, streamKey, load, detect, onResult, onMetrics }) {
  const [status, setStatus] = useState('idle');
  const [errorDetails, setErrorDetails] = useState(null);
  const [attempt, setAttempt] = useState(0);
  const latest = useRef({ load, detect, onResult, onMetrics });

  useEffect(() => {
    latest.current = { load, detect, onResult, onMetrics };
  });

  useEffect(() => {
    if (!enabled) {
      setStatus('idle');
      setErrorDetails(null);
      return undefined;
    }

    let cancelled = false;
    let raf = 0;
    let rvfcId = null;
    let watchdogTimer = null;
    let consecutiveErrors = 0;
    const MAX_CONSECUTIVE_ERRORS = 15;
    // Max ms to wait for requestVideoFrameCallback before falling back to rAF.
    // When video.srcObject changes, pending rvfc callbacks may never fire.
    const RVFC_WATCHDOG_MS = 150;

    setStatus('loading');
    setErrorDetails(null);

    // Diagnostics trackers
    let frameCount = 0;
    let lastFpsTime = performance.now();
    let currentFps = 0;
    let lastInferenceMs = 0;
    let lastSuccessTime = 0;

    latest.current
      .load()
      .then((tasks) => {
        if (cancelled) return;
        setStatus('ready');
        let lastVideoTime = -1;
        let lastTimestamp = 0;

        const processFrame = () => {
          if (cancelled) return;
          // Clear any pending watchdog since we received a frame callback
          if (watchdogTimer) {
            clearTimeout(watchdogTimer);
            watchdogTimer = null;
          }

          const video = videoRef.current;
          if (!video || video.readyState < 2 || !video.videoWidth) {
            scheduleNext();
            return;
          }

          // Avoid processing stale frames if currentTime hasn't changed
          if (video.currentTime === lastVideoTime) {
            scheduleNext();
            return;
          }
          lastVideoTime = video.currentTime;

          const timestamp = Math.max(performance.now(), lastTimestamp + 1);
          lastTimestamp = timestamp;

          try {
            const t0 = performance.now();
            const result = latest.current.detect(tasks, video, timestamp);
            const t1 = performance.now();

            lastInferenceMs = Math.round((t1 - t0) * 10) / 10;
            lastSuccessTime = t1;
            consecutiveErrors = 0;

            // Compute FPS every second
            frameCount++;
            if (t1 - lastFpsTime >= 1000) {
              currentFps = Math.round((frameCount * 1000) / (t1 - lastFpsTime));
              frameCount = 0;
              lastFpsTime = t1;
            }

            latest.current.onMetrics?.({
              fps: currentFps,
              inferenceMs: lastInferenceMs,
              lastSuccessTime,
              consecutiveErrors: 0,
            });

            latest.current.onResult?.(result);
          } catch (error) {
            consecutiveErrors++;
            console.warn(`[VisionLoop] Frame detection error (${consecutiveErrors}/${MAX_CONSECUTIVE_ERRORS}):`, error);

            if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
              if (cancelled) return;
              cancelled = true;
              console.error('Vision loop stopped after consecutive errors:', error);
              setErrorDetails(error?.message || 'Consecutive inference failures');
              setStatus('error');
              return;
            }
          }

          scheduleNext();
        };

        const scheduleNext = () => {
          if (cancelled) return;
          const video = videoRef.current;
          if (video && typeof video.requestVideoFrameCallback === 'function') {
            rvfcId = video.requestVideoFrameCallback(() => {
              processFrame();
            });
            // Watchdog: if rvfc doesn't fire within RVFC_WATCHDOG_MS (e.g. after a
            // srcObject change abandons pending callbacks), fall back to rAF to keep
            // the loop alive until the new stream starts producing frames.
            watchdogTimer = setTimeout(() => {
              watchdogTimer = null;
              if (!cancelled) {
                // Cancel the stale rvfc registration and reschedule via rAF
                try {
                  video?.cancelVideoFrameCallback?.(rvfcId);
                } catch { /* ignore */ }
                rvfcId = null;
                raf = requestAnimationFrame(processFrame);
              }
            }, RVFC_WATCHDOG_MS);
          } else {
            raf = requestAnimationFrame(processFrame);
          }
        };

        scheduleNext();
      })
      .catch((error) => {
        if (cancelled) return;
        console.error('Vision system failed to load:', error);
        setErrorDetails(error?.message || 'Failed to initialize vision models');
        setStatus('error');
      });

    return () => {
      cancelled = true;
      if (watchdogTimer) clearTimeout(watchdogTimer);
      if (raf) cancelAnimationFrame(raf);
      const video = videoRef.current;
      if (rvfcId !== null && video && typeof video.cancelVideoFrameCallback === 'function') {
        video.cancelVideoFrameCallback(rvfcId);
      }
    };
  // streamKey is intentionally included: changing it re-anchors the frame loop
  // to the new video srcObject without reloading MediaPipe models.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, loadKey, streamKey, attempt, videoRef]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  return { status, error: errorDetails, retry };
}
