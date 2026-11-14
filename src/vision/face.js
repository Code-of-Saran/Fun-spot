import { createTask, createTaskSingleton } from './mediapipe';
import { useDetectionLoop } from './useDetectionLoop';

const faceTask = createTaskSingleton(() =>
  createTask(
    (mp, fileset, modelAssetPath, delegate) =>
      mp.FaceLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath, delegate },
        runningMode: 'VIDEO',
        numFaces: 1,
        minFaceDetectionConfidence: 0.5,
        minFacePresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
        outputFaceBlendshapes: true, // blinks + mouth opening drive some effects
      }),
    { file: 'face_landmarker.task', cdnPath: 'face_landmarker/face_landmarker/float16/latest/face_landmarker.task' },
  ),
);

export const loadFaceLandmarker = faceTask.load;
export const disposeFaceLandmarker = faceTask.dispose;
export const preloadFace = () => faceTask.load().catch(() => {});

/** Blendshapes the games use (AI Mirror: blinks + jaw; Don't Laugh: smile + squint); the rest are dropped. */
const BLENDSHAPES = [
  'eyeBlinkLeft',
  'eyeBlinkRight',
  'jawOpen',
  'mouthSmileLeft',
  'mouthSmileRight',
  'cheekSquintLeft',
  'cheekSquintRight',
  'eyeSquintLeft',
  'eyeSquintRight',
];
const BLENDSHAPES_SET = new Set(BLENDSHAPES);

// Preallocated reusable point buffer to eliminate GC pressure during 30-60 FPS video tracking
const POOLED_FACE_POINTS = Array.from({ length: 478 }, () => ({ x: 0, y: 0, z: 0 }));

/**
 * Face frame, using the same conventions as body frames (vision/frame.js):
 * x is mirrored and scaled by the video aspect so x and y share one unit.
 * {
 *   t, aspect,
 *   face: Point[478] | null,               // face mesh + iris landmarks
 *   blendshapes: { eyeBlinkLeft, jawOpen, mouthSmileLeft, … } | null   (see BLENDSHAPES)
 * }
 */
export function toFaceFrame(t, aspect, result) {
  const landmarks = result?.faceLandmarks?.[0];
  const categories = result?.faceBlendshapes?.[0]?.categories;
  let blendshapes = null;
  if (categories) {
    blendshapes = {};
    for (let i = 0; i < categories.length; i++) {
      const { categoryName, score } = categories[i];
      if (BLENDSHAPES_SET.has(categoryName)) {
        blendshapes[categoryName] = score;
      }
    }
  }

  let face = null;
  if (landmarks) {
    const len = landmarks.length;
    while (POOLED_FACE_POINTS.length < len) {
      POOLED_FACE_POINTS.push({ x: 0, y: 0, z: 0 });
    }
    for (let i = 0; i < len; i++) {
      const p = landmarks[i];
      const target = POOLED_FACE_POINTS[i];
      target.x = (1 - p.x) * aspect;
      target.y = p.y;
      target.z = p.z;
    }
    face = POOLED_FACE_POINTS.slice(0, len);
  }

  return {
    t,
    aspect,
    face,
    blendshapes,
  };
}

/**
 * Face tracking loop (one face). Each new video frame reaches `onFrame` as a face frame.
 * status: idle | loading | ready | error
 */
export function useFaceTracking({ videoRef, enabled, onFrame }) {
  return useDetectionLoop({
    videoRef,
    enabled,
    loadKey: 'face',
    load: loadFaceLandmarker,
    detect: (face, video, timestamp) =>
      toFaceFrame(timestamp, video.videoWidth / video.videoHeight, face.detectForVideo(video, timestamp)),
    onResult: onFrame,
  });
}
