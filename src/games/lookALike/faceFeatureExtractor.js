/**
 * FUN SPOT — LOOK A LIKE: Face Feature Extractor & Multi-Face Detector
 * Powered by MediaPipe Tasks Vision FaceLandmarker.
 * Supports Solo (1 face) and Group (up to 8 faces) detection, landmark ratios, and face cropping.
 */
import { createTask, createTaskSingleton } from '../../vision/mediapipe';

export const FACE_LANDMARKS = {
  // Lips
  LIP_UPPER_CENTER: 13,
  LIP_LOWER_CENTER: 14,
  MOUTH_CORNER_LEFT: 61,
  MOUTH_CORNER_RIGHT: 291,
  MOUTH_TOP: 0,
  MOUTH_BOTTOM: 17,
  // Eyes
  LEFT_EYE_OUTER: 33,
  LEFT_EYE_INNER: 133,
  LEFT_EYE_TOP: 159,
  LEFT_EYE_BOTTOM: 145,
  RIGHT_EYE_INNER: 362,
  RIGHT_EYE_OUTER: 263,
  RIGHT_EYE_TOP: 386,
  RIGHT_EYE_BOTTOM: 374,
  // Eyebrows
  LEFT_BROW_ARCH: 70,
  LEFT_BROW_INNER: 107,
  RIGHT_BROW_ARCH: 300,
  RIGHT_BROW_INNER: 336,
  // Nose, Chin & Face Bounds
  NOSE_TIP: 1,
  NOSE_BRIDGE: 168,
  CHIN: 152,
  FOREHEAD: 10,
  CHEEK_LEFT: 234,
  CHEEK_RIGHT: 454,
};

/**
 * Singleton FaceLandmarker configured for multi-face detection (up to 8 participants).
 */
const lookALikeLandmarkerTask = createTaskSingleton(() =>
  createTask(
    (mp, fileset, modelAssetPath, delegate) =>
      mp.FaceLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath, delegate },
        runningMode: 'VIDEO',
        numFaces: 8,
        minFaceDetectionConfidence: 0.45,
        minFacePresenceConfidence: 0.45,
        minTrackingConfidence: 0.45,
        outputFaceBlendshapes: true,
        outputFacialTransformationMatrixes: true,
      }),
    {
      file: 'face_landmarker.task',
      cdnPath: 'face_landmarker/face_landmarker/float16/latest/face_landmarker.task',
    },
  ),
);

export const loadLookALikeLandmarker = lookALikeLandmarkerTask.load;
export const disposeLookALikeLandmarker = lookALikeLandmarkerTask.dispose;

/** Distance between two points in 2D or 3D */
function dist(p1, p2) {
  if (!p1 || !p2) return 0;
  const dx = (p1.x ?? 0) - (p2.x ?? 0);
  const dy = (p1.y ?? 0) - (p2.y ?? 0);
  const dz = (p1.z ?? 0) - (p2.z ?? 0);
  return Math.hypot(dx, dy, dz);
}

/**
 * Extracts normalized facial features from a detection result for a given face index.
 *
 * @param {object} result - FaceLandmarker result
 * @param {number} faceIndex - Index of face (0 to numFaces-1)
 * @returns {object|null} { blendshapes, ratios, headPose, boundingBox }
 */
export function extractFaceFeaturesAtIndex(result, faceIndex = 0) {
  const landmarks = result?.faceLandmarks?.[faceIndex];
  if (!landmarks || landmarks.length < 468) {
    return null;
  }

  // 1. Blendshapes mapping
  const blendshapes = {};
  const categories = result?.faceBlendshapes?.[faceIndex]?.categories || [];
  for (const { categoryName, score } of categories) {
    blendshapes[categoryName] = Number(score) || 0;
  }

  // 2. Normalization scale: Inter-ocular distance (outer corners)
  const leftEyeOuter = landmarks[FACE_LANDMARKS.LEFT_EYE_OUTER];
  const rightEyeOuter = landmarks[FACE_LANDMARKS.RIGHT_EYE_OUTER];
  const eyeDistance = Math.max(dist(leftEyeOuter, rightEyeOuter), 0.001);

  // 3. Geometric ratios
  const mouthOpenDist = dist(
    landmarks[FACE_LANDMARKS.LIP_UPPER_CENTER],
    landmarks[FACE_LANDMARKS.LIP_LOWER_CENTER],
  );
  const mouthWidthDist = dist(
    landmarks[FACE_LANDMARKS.MOUTH_CORNER_LEFT],
    landmarks[FACE_LANDMARKS.MOUTH_CORNER_RIGHT],
  );
  const leftEyeOpen = dist(
    landmarks[FACE_LANDMARKS.LEFT_EYE_TOP],
    landmarks[FACE_LANDMARKS.LEFT_EYE_BOTTOM],
  );
  const rightEyeOpen = dist(
    landmarks[FACE_LANDMARKS.RIGHT_EYE_TOP],
    landmarks[FACE_LANDMARKS.RIGHT_EYE_BOTTOM],
  );
  const leftBrowRaise = dist(
    landmarks[FACE_LANDMARKS.LEFT_BROW_ARCH],
    landmarks[FACE_LANDMARKS.LEFT_EYE_TOP],
  );
  const rightBrowRaise = dist(
    landmarks[FACE_LANDMARKS.RIGHT_BROW_ARCH],
    landmarks[FACE_LANDMARKS.RIGHT_EYE_TOP],
  );

  const mouthCenterY = (landmarks[FACE_LANDMARKS.MOUTH_TOP].y + landmarks[FACE_LANDMARKS.MOUTH_BOTTOM].y) / 2;
  const mouthCornersY = (landmarks[FACE_LANDMARKS.MOUTH_CORNER_LEFT].y + landmarks[FACE_LANDMARKS.MOUTH_CORNER_RIGHT].y) / 2;
  const mouthCornerTilt = (mouthCenterY - mouthCornersY) / eyeDistance;

  const ratios = {
    mouthOpenRatio: mouthOpenDist / eyeDistance,
    mouthWidthRatio: mouthWidthDist / eyeDistance,
    eyeOpenRatio: ((leftEyeOpen + rightEyeOpen) / 2) / eyeDistance,
    browRaiseRatio: ((leftBrowRaise + rightBrowRaise) / 2) / eyeDistance,
    mouthCornerTilt,
  };

  // 4. Stable Facial Appearance Ratios
  const faceWidth = Math.max(dist(landmarks[FACE_LANDMARKS.CHEEK_LEFT], landmarks[FACE_LANDMARKS.CHEEK_RIGHT]), 0.001);
  const faceHeight = Math.max(dist(landmarks[FACE_LANDMARKS.FOREHEAD], landmarks[FACE_LANDMARKS.CHIN]), 0.001);
  const noseLength = dist(landmarks[FACE_LANDMARKS.NOSE_BRIDGE], landmarks[FACE_LANDMARKS.NOSE_TIP]);
  const chinLength = dist(landmarks[FACE_LANDMARKS.NOSE_TIP], landmarks[FACE_LANDMARKS.CHIN]);
  const noseWidth = dist(landmarks[98] || landmarks[FACE_LANDMARKS.NOSE_TIP], landmarks[327] || landmarks[FACE_LANDMARKS.NOSE_TIP]);
  const jawDist = dist(landmarks[172] || landmarks[FACE_LANDMARKS.CHEEK_LEFT], landmarks[397] || landmarks[FACE_LANDMARKS.CHEEK_RIGHT]);

  const appearance = {
    faceAspectRatio: faceWidth / faceHeight,
    eyeSpacingRatio: eyeDistance / faceWidth,
    noseWidthRatio: noseWidth / eyeDistance,
    noseHeightRatio: noseLength / faceHeight,
    mouthWidthRatio: mouthWidthDist / eyeDistance,
    chinRatio: chinLength / faceHeight,
    jawWidthRatio: jawDist / faceWidth,
  };

  // 5. Head Pose
  let headPose = { yaw: 0, pitch: 0, roll: 0 };
  const matrix = result?.facialTransformationMatrixes?.[faceIndex]?.data;
  if (matrix && matrix.length === 16) {
    const r00 = matrix[0];
    const r10 = matrix[1];
    const r20 = matrix[2];
    const r21 = matrix[6];
    const r22 = matrix[10];
    headPose = {
      pitch: Math.atan2(r21, r22),
      yaw: Math.atan2(-r20, Math.hypot(r21, r22)),
      roll: Math.atan2(r10, r00),
    };
  } else {
    const eyeMidX = (leftEyeOuter.x + rightEyeOuter.x) / 2;
    const eyeMidY = (leftEyeOuter.y + rightEyeOuter.y) / 2;
    const nose = landmarks[FACE_LANDMARKS.NOSE_TIP];
    headPose = {
      yaw: (nose.x - eyeMidX) / eyeDistance,
      pitch: (nose.y - eyeMidY) / eyeDistance,
      roll: Math.atan2(rightEyeOuter.y - leftEyeOuter.y, rightEyeOuter.x - leftEyeOuter.x),
    };
  }

  // 6. Normalized Bounding Box (0.0 to 1.0)
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

  return {
    blendshapes,
    ratios,
    appearance,
    headPose,
    boundingBox: { minX, maxX, minY, maxY },
    landmarks,
  };
}

/**
 * Extracts features for all faces detected in the result.
 *
 * @param {object} result - FaceLandmarker result
 * @returns {Array} Array of extracted feature objects, one per detected face
 */
export function extractAllDetectedFaces(result) {
  const count = result?.faceLandmarks?.length || 0;
  const faces = [];
  for (let i = 0; i < count; i++) {
    const features = extractFaceFeaturesAtIndex(result, i);
    if (features) {
      faces.push({
        faceIndex: i,
        ...features,
      });
    }
  }
  return faces;
}

/**
 * Calculates a padded rectangular region for cropping a participant's face
 * from video or image coordinates.
 *
 * @param {object} boundingBox - { minX, maxX, minY, maxY } (0..1 range)
 * @param {number} width - image width in px
 * @param {number} height - image height in px
 * @param {number} padding - expansion fraction around the face (default 0.35)
 * @returns {object} { sx, sy, sWidth, sHeight }
 */
export function getFaceCropRect(boundingBox, width, height, padding = 0.35) {
  if (!boundingBox) {
    return { sx: 0, sy: 0, sWidth: width, sHeight: height };
  }

  const rawWidth = (boundingBox.maxX - boundingBox.minX) * width;
  const rawHeight = (boundingBox.maxY - boundingBox.minY) * height;
  const centerX = ((boundingBox.minX + boundingBox.maxX) / 2) * width;
  const centerY = ((boundingBox.minY + boundingBox.maxY) / 2) * height;

  const size = Math.max(rawWidth, rawHeight) * (1 + padding * 2);
  const sx = Math.max(0, Math.min(width - size, centerX - size / 2));
  const sy = Math.max(0, Math.min(height - size, centerY - size / 2));
  const sWidth = Math.min(width - sx, size);
  const sHeight = Math.min(height - sy, size);

  return { sx, sy, sWidth, sHeight };
}

/**
 * Crops an individual face from a canvas or video element and returns a base64 DataURL.
 *
 * @param {HTMLVideoElement|HTMLCanvasElement} source
 * @param {object} boundingBox - { minX, maxX, minY, maxY }
 * @param {number} outputSize - square size of cropped output image
 * @returns {string} base64 DataURL (image/jpeg)
 */
export function cropFaceToDataUrl(source, boundingBox, outputSize = 400) {
  const isVideo = source instanceof HTMLVideoElement;
  const srcWidth = isVideo ? source.videoWidth : source.width;
  const srcHeight = isVideo ? source.videoHeight : source.height;

  if (!srcWidth || !srcHeight) {
    return '';
  }

  const crop = getFaceCropRect(boundingBox, srcWidth, srcHeight, 0.4);

  const canvas = document.createElement('canvas');
  canvas.width = outputSize;
  canvas.height = outputSize;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Mirror horizontal if webcam video to match natural selfie view
  ctx.save();
  ctx.translate(outputSize, 0);
  ctx.scale(-1, 1);

  ctx.drawImage(
    source,
    crop.sx,
    crop.sy,
    crop.sWidth,
    crop.sHeight,
    0,
    0,
    outputSize,
    outputSize,
  );
  ctx.restore();

  return canvas.toDataURL('image/jpeg', 0.92);
}
