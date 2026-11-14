import { disposePoseLandmarker, loadPoseLandmarker } from './pose';
import { disposeHandLandmarker, loadHandLandmarker } from './hands';
import { toFrame } from './frame';
import { useDetectionLoop } from './useDetectionLoop';

/** Warm the models up ahead of time (e.g. during the randomizer animation). */
export function preloadVision({ hands = false } = {}) {
  loadPoseLandmarker().catch(() => {});
  if (hands) loadHandLandmarker().catch(() => {});
}

/** Release all MediaPipe resources (call when leaving a camera game). */
export function disposeVision() {
  disposePoseLandmarker();
  disposeHandLandmarker();
}

/**
 * Body tracking loop: each new video frame goes through Pose (and Hands when
 * `needsHands`) and reaches `onFrame` as a normalized frame (see vision/frame.js).
 *
 * `streamKey` — pass `camera.stream` (or any value that changes on camera switch)
 *               so the internal rvfc watchdog re-anchors to the new srcObject.
 *
 * status: idle | loading | ready | error
 */
export function useVisionLoop({ videoRef, enabled, needsHands = false, streamKey, onFrame, onDiagnostics }) {
  return useDetectionLoop({
    videoRef,
    enabled,
    loadKey: needsHands ? 'pose+hands' : 'pose',
    streamKey,
    load: async () => {
      const pose = await loadPoseLandmarker();
      let hands = null;
      if (needsHands) {
        try {
          hands = await loadHandLandmarker();
        } catch (error) {
          console.warn('[useVisionLoop] Hand landmarker failed to load; continuing with pose only:', error);
        }
      }
      return [pose, hands];
    },
    detect: ([pose, hands], video, timestamp) => {
      const poseResult = pose.detectForVideo(video, timestamp);
      let handResult = null;
      if (hands) {
        try {
          handResult = hands.detectForVideo(video, timestamp);
        } catch (err) {
          // Hand tracking transient error shouldn't halt pose tracking
        }
      }
      return toFrame(
        timestamp,
        video.videoWidth / video.videoHeight,
        poseResult,
        handResult,
      );
    },
    onResult: onFrame,
    onMetrics: onDiagnostics,
  });
}
