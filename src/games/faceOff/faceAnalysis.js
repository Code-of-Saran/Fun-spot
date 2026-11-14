/**
 * FUN SPOT — FACE OFF: AI EXPRESSION MATCH
 * MediaPipe Face Analysis, Feature Extraction & Similarity Scoring
 */
import { createTask, createTaskSingleton } from '../../vision/mediapipe';
import { EXPRESSION_CHALLENGES } from './faceOffConfig';

/** Key landmark indices on MediaPipe 468/478 Face Mesh */
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
  // Nose & Chin
  NOSE_TIP: 1,
  NOSE_BRIDGE: 168,
  CHIN: 152,
};

/**
 * Singleton FaceLandmarker with full blendshapes output enabled.
 */
const faceLandmarkerTask = createTaskSingleton(() =>
  createTask(
    (mp, fileset, modelAssetPath, delegate) =>
      mp.FaceLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath, delegate },
        runningMode: 'IMAGE', // will be switched between IMAGE and VIDEO as needed
        numFaces: 1,
        minFaceDetectionConfidence: 0.5,
        minFacePresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
        outputFaceBlendshapes: true,
        outputFacialTransformationMatrixes: true,
      }),
    {
      file: 'face_landmarker.task',
      cdnPath: 'face_landmarker/face_landmarker/float16/latest/face_landmarker.task',
    },
  ),
);

export const loadFaceOffLandmarker = faceLandmarkerTask.load;
export const disposeFaceOffLandmarker = faceLandmarkerTask.dispose;

/** Distance between two 2D/3D points */
function distance(p1, p2) {
  if (!p1 || !p2) return 0;
  const dx = (p1.x ?? 0) - (p2.x ?? 0);
  const dy = (p1.y ?? 0) - (p2.y ?? 0);
  const dz = (p1.z ?? 0) - (p2.z ?? 0);
  return Math.hypot(dx, dy, dz);
}

/**
 * Extract normalized facial features from raw MediaPipe FaceLandmarker result
 * @param {object} result - FaceLandmarker result { faceLandmarks, faceBlendshapes, facialTransformationMatrixes }
 * @returns {object|null} Extracted feature vector or null if no face detected
 */
export function extractFacialFeatures(result) {
  const landmarks = result?.faceLandmarks?.[0];
  if (!landmarks || landmarks.length < 468) {
    return null;
  }

  // 1. Blendshapes dictionary
  const blendshapes = {};
  const categories = result?.faceBlendshapes?.[0]?.categories || [];
  for (const { categoryName, score } of categories) {
    blendshapes[categoryName] = Number(score) || 0;
  }

  // 2. Normalization scale: Inter-ocular distance (outer eye corners)
  const leftEyeOuter = landmarks[FACE_LANDMARKS.LEFT_EYE_OUTER];
  const rightEyeOuter = landmarks[FACE_LANDMARKS.RIGHT_EYE_OUTER];
  const eyeDistance = Math.max(distance(leftEyeOuter, rightEyeOuter), 0.001);

  // 3. Landmark Geometric Ratios (normalized by eyeDistance so independent of zoom/resolution)
  const mouthOpenDist = distance(
    landmarks[FACE_LANDMARKS.LIP_UPPER_CENTER],
    landmarks[FACE_LANDMARKS.LIP_LOWER_CENTER],
  );
  const mouthWidthDist = distance(
    landmarks[FACE_LANDMARKS.MOUTH_CORNER_LEFT],
    landmarks[FACE_LANDMARKS.MOUTH_CORNER_RIGHT],
  );

  const leftEyeOpen = distance(
    landmarks[FACE_LANDMARKS.LEFT_EYE_TOP],
    landmarks[FACE_LANDMARKS.LEFT_EYE_BOTTOM],
  );
  const rightEyeOpen = distance(
    landmarks[FACE_LANDMARKS.RIGHT_EYE_TOP],
    landmarks[FACE_LANDMARKS.RIGHT_EYE_BOTTOM],
  );

  const leftBrowRaise = distance(
    landmarks[FACE_LANDMARKS.LEFT_BROW_ARCH],
    landmarks[FACE_LANDMARKS.LEFT_EYE_TOP],
  );
  const rightBrowRaise = distance(
    landmarks[FACE_LANDMARKS.RIGHT_BROW_ARCH],
    landmarks[FACE_LANDMARKS.RIGHT_EYE_TOP],
  );

  // Mouth corner vertical tilt: negative when corners are higher than center (smiling in screen space Y-down)
  const mouthCenterY = (landmarks[FACE_LANDMARKS.MOUTH_TOP].y + landmarks[FACE_LANDMARKS.MOUTH_BOTTOM].y) / 2;
  const mouthCornersY = (landmarks[FACE_LANDMARKS.MOUTH_CORNER_LEFT].y + landmarks[FACE_LANDMARKS.MOUTH_CORNER_RIGHT].y) / 2;
  const mouthCornerTilt = (mouthCenterY - mouthCornersY) / eyeDistance; // positive = smile, negative = frown

  const ratios = {
    mouthOpenRatio: mouthOpenDist / eyeDistance,
    mouthWidthRatio: mouthWidthDist / eyeDistance,
    eyeOpenRatio: ((leftEyeOpen + rightEyeOpen) / 2) / eyeDistance,
    leftEyeOpenRatio: leftEyeOpen / eyeDistance,
    rightEyeOpenRatio: rightEyeOpen / eyeDistance,
    browRaiseRatio: ((leftBrowRaise + rightBrowRaise) / 2) / eyeDistance,
    leftBrowRaiseRatio: leftBrowRaise / eyeDistance,
    rightBrowRaiseRatio: rightBrowRaise / eyeDistance,
    mouthCornerTilt,
  };

  // 4. Head Pose (from transformation matrix or estimated from nose/chin/eyes)
  let headPose = { yaw: 0, pitch: 0, roll: 0 };
  const matrix = result?.facialTransformationMatrixes?.[0]?.data;
  if (matrix && matrix.length === 16) {
    // Rotation matrix elements
    const r00 = matrix[0];
    const r10 = matrix[1];
    const r20 = matrix[2];
    const r21 = matrix[6];
    const r22 = matrix[10];

    const pitch = Math.atan2(r21, r22);
    const yaw = Math.atan2(-r20, Math.hypot(r21, r22));
    const roll = Math.atan2(r10, r00);
    headPose = { yaw, pitch, roll };
  } else {
    // Geometric estimate from nose tip relative to eyes
    const eyeMidX = (leftEyeOuter.x + rightEyeOuter.x) / 2;
    const eyeMidY = (leftEyeOuter.y + rightEyeOuter.y) / 2;
    const nose = landmarks[FACE_LANDMARKS.NOSE_TIP];

    const yaw = (nose.x - eyeMidX) / eyeDistance;
    const pitch = (nose.y - eyeMidY) / eyeDistance;
    const roll = Math.atan2(rightEyeOuter.y - leftEyeOuter.y, rightEyeOuter.x - leftEyeOuter.x);
    headPose = { yaw, pitch, roll };
  }

  return {
    blendshapes,
    ratios,
    headPose,
    landmarkCount: landmarks.length,
  };
}

/**
 * Helper to mirror left/right channels for visual vs anatomical imitation compatibility.
 */
export function mirrorFeatures(features) {
  if (!features) return null;

  const blendshapes = {};
  for (const [key, val] of Object.entries(features.blendshapes || {})) {
    if (key.endsWith('Left')) {
      const rightKey = key.slice(0, -4) + 'Right';
      blendshapes[rightKey] = val;
    } else if (key.endsWith('Right')) {
      const leftKey = key.slice(0, -5) + 'Left';
      blendshapes[leftKey] = val;
    } else {
      blendshapes[key] = val;
    }
  }

  const ratios = { ...(features.ratios || {}) };
  if ('leftEyeOpenRatio' in ratios && 'rightEyeOpenRatio' in ratios) {
    const temp = ratios.leftEyeOpenRatio;
    ratios.leftEyeOpenRatio = ratios.rightEyeOpenRatio;
    ratios.rightEyeOpenRatio = temp;
  }
  if ('leftBrowRaiseRatio' in ratios && 'rightBrowRaiseRatio' in ratios) {
    const temp = ratios.leftBrowRaiseRatio;
    ratios.leftBrowRaiseRatio = ratios.rightBrowRaiseRatio;
    ratios.rightBrowRaiseRatio = temp;
  }

  const headPose = {
    yaw: -(features.headPose?.yaw || 0),
    pitch: features.headPose?.pitch || 0,
    roll: -(features.headPose?.roll || 0),
  };

  return {
    ...features,
    blendshapes,
    ratios,
    headPose,
  };
}

/**
 * Internal single-direction evaluation
 */
function evaluateSingleDirection(cBlend, tBlend, targetKeys, cRatios, tRatios, cPose, tPose) {
  // 1. Blendshapes (60%)
  let dotProduct = 0;
  let normT = 0;
  let manhattanDiff = 0;

  for (const key of targetKeys) {
    const tv = tBlend[key] || 0;
    const cv = cBlend[key] || 0;

    dotProduct += tv * cv;
    normT += tv * tv;
    manhattanDiff += Math.abs(tv - cv);
  }

  normT = Math.sqrt(normT);

  let normC = 0;
  for (const val of Object.values(cBlend)) {
    normC += (Number(val) || 0) ** 2;
  }
  normC = Math.sqrt(normC);

  const cosineSim = normT > 0 && normC > 0 ? Math.max(0, dotProduct / (normT * normC)) : 0;
  const avgDiff = manhattanDiff / targetKeys.length;
  const directSim = Math.max(0, 1 - avgDiff);

  const blendshapeSim = Math.max(0, 0.50 * directSim + 0.50 * cosineSim);

  // 2. Geometric Ratios (30%)
  let ratioSim = 0.5;
  const ratioKeys = Object.keys(tRatios);
  if (ratioKeys.length > 0) {
    let totalRatioDiff = 0;
    let count = 0;

    for (const key of ratioKeys) {
      if (typeof tRatios[key] === 'number' && typeof cRatios[key] === 'number') {
        const tv = tRatios[key];
        const cv = cRatios[key];
        const diff = Math.min(Math.abs(tv - cv) / 0.25, 1.0);
        totalRatioDiff += diff;
        count++;
      }
    }

    if (count > 0) {
      ratioSim = Math.max(0, 1 - totalRatioDiff / count);
    }
  }

  // 3. Head Pose (10%)
  const targetYaw = tPose.headTiltYaw ?? tPose.yaw ?? 0;
  const targetPitch = tPose.headTiltPitch ?? tPose.pitch ?? 0;

  const yawDiff = Math.min(Math.abs((cPose.yaw || 0) - targetYaw) / 0.35, 1.0);
  const pitchDiff = Math.min(Math.abs((cPose.pitch || 0) - targetPitch) / 0.35, 1.0);
  const poseSim = Math.max(0, 1 - (yawDiff * 0.6 + pitchDiff * 0.4));

  const composite = 0.60 * blendshapeSim + 0.30 * ratioSim + 0.10 * poseSim;
  return { composite, blendshapeSim, ratioSim, poseSim };
}

/**
 * Calculate similarity between participant facial features and target reference features
 * Evaluates both direct anatomical alignment and visual mirror alignment to support
 * natural human imitation without penalizing for camera mirror reflection.
 */
export function calculateExpressionMatch(candidate, target) {
  const cBlend = candidate?.blendshapes || {};
  const tBlend = target?.targetBlendshapes || target?.blendshapes || {};
  const targetKeys = Object.keys(tBlend).filter((k) => (tBlend[k] || 0) > 0.05);

  if (!candidate || !target || targetKeys.length === 0 || Object.keys(cBlend).length === 0) {
    return {
      score: 0,
      blendshapeSim: 0,
      ratioSim: 0,
      poseSim: 0,
      challengeId: target?.challengeId || null,
      breakdown: { reason: 'No facial expression features detected' },
    };
  }

  const cRatios = candidate.ratios || {};
  const tRatios = target.targetRatios || target.ratios || {};
  const cPose = candidate.headPose || { yaw: 0, pitch: 0, roll: 0 };
  const tPose = target.headPose || target.targetRatios || { yaw: 0, pitch: 0, roll: 0 };

  // 1. Direct anatomical evaluation
  const directEval = evaluateSingleDirection(cBlend, tBlend, targetKeys, cRatios, tRatios, cPose, tPose);

  // 2. Visual mirror evaluation (for asymmetric expressions like single-eyebrow raise or side-eye)
  const mirroredCandidate = mirrorFeatures(candidate);
  const mirroredEval = mirroredCandidate
    ? evaluateSingleDirection(
        mirroredCandidate.blendshapes,
        tBlend,
        targetKeys,
        mirroredCandidate.ratios,
        tRatios,
        mirroredCandidate.headPose,
        tPose,
      )
    : directEval;

  // Pick the best interpretation: anatomical mimic or visual mirror mimic
  const bestEval = directEval.composite >= mirroredEval.composite ? directEval : mirroredEval;
  const isMirrored = bestEval === mirroredEval && mirroredEval.composite > directEval.composite + 0.05;

  const score = Math.round(Math.max(0, Math.min(bestEval.composite * 100, 100)));

  return {
    score,
    blendshapeSim: Math.round(bestEval.blendshapeSim * 100),
    ratioSim: Math.round(bestEval.ratioSim * 100),
    poseSim: Math.round(bestEval.poseSim * 100),
    challengeId: target?.challengeId || null,
    breakdown: {
      blendshapeWeight: '60%',
      ratioWeight: '30%',
      poseWeight: '10%',
      targetChannelsEvaluated: targetKeys.length,
      mode: isMirrored ? 'mirror_aligned' : 'anatomical_aligned',
    },
  };
}

/**
 * Stable cache for reference image features indexed by challenge ID.
 */
export const referenceFeaturesCache = new Map();

/**
 * Pre-seeds reference feature cache with verified challenge definitions
 * so round transitions never stall or switch MediaPipe landmarker modes.
 */
function seedReferenceFeaturesCache() {
  if (Array.isArray(EXPRESSION_CHALLENGES)) {
    for (const c of EXPRESSION_CHALLENGES) {
      if (c && c.id && c.targetBlendshapes) {
        referenceFeaturesCache.set(c.id, {
          challengeId: c.id,
          image: c.image,
          blendshapes: c.targetBlendshapes,
          targetBlendshapes: c.targetBlendshapes,
          ratios: c.targetRatios || {},
          targetRatios: c.targetRatios || {},
          headPose: c.headPose || { yaw: 0, pitch: 0, roll: 0 },
          isValidReference: true,
          isPredefinedProfile: true,
          analyzedAt: Date.now(),
        });
      }
    }
  }
}

seedReferenceFeaturesCache();

/**
 * Clear reference feature cache for one or all challenges.
 */
export function clearReferenceFeaturesCache(challengeId = null) {
  if (challengeId) {
    referenceFeaturesCache.delete(challengeId);
  } else {
    referenceFeaturesCache.clear();
    seedReferenceFeaturesCache();
  }
}

/**
 * Safely load an image with fallback for CORS issues.
 */
function safeLoadImage(src, timeoutMs = 5000) {
  if (typeof process !== 'undefined' && (process.env?.NODE_ENV === 'test' || process.env?.VITEST)) {
    // In headless test environments (JSDOM/Vitest), HTTP/canvas decoding is mocked
    return Promise.reject(new Error(`Image loading deferred in test environment: ${src}`));
  }

  return new Promise((resolve, reject) => {
    let resolved = false;
    const timer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        reject(new Error(`Image load timed out after ${timeoutMs}ms: ${src}`));
      }
    }, timeoutMs);

    const img = new Image();
    img.onload = () => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timer);
        resolve(img);
      }
    };
    img.onerror = () => {
      // Retry once without crossOrigin in case local dev server has CORS restrictions
      const retryImg = new Image();
      retryImg.onload = () => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timer);
          resolve(retryImg);
        }
      };
      retryImg.onerror = () => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timer);
          reject(new Error(`Failed to load reference image: ${src}`));
        }
      };
      retryImg.src = src;
    };

    img.crossOrigin = 'anonymous';
    img.src = src;
  });
}

/**
 * Analyze a reference image to extract target facial features.
 * Validates that the image contains a detectable face and binds the extracted
 * features strictly to the challenge ID.
 *
 * @param {object|string} challengeOrUrl - Challenge object with { id, image, ... } or image URL
 * @param {object} challengeFallback - Optional fallback challenge definition
 * @returns {Promise<object>} Extracted features tagged with challengeId
 */
export async function analyzeReferenceImage(challengeOrUrl, challengeFallback = null) {
  const challenge = typeof challengeOrUrl === 'object' && challengeOrUrl !== null
    ? challengeOrUrl
    : challengeFallback || {};

  const challengeId = challenge.id || (typeof challengeOrUrl === 'string' ? challengeOrUrl : 'unknown');
  const imageUrl = challenge.image || (typeof challengeOrUrl === 'string' ? challengeOrUrl : null);

  if (!imageUrl) {
    throw new Error(`Invalid reference image parameter for challenge "${challengeId}"`);
  }

  // 1. Check cache by challengeId
  if (referenceFeaturesCache.has(challengeId)) {
    const cached = referenceFeaturesCache.get(challengeId);
    if (cached && cached.challengeId === challengeId && cached.isValidReference) {
      return cached;
    }
  }

  // 2. Pre-extracted verified challenge profile check
  if (challenge.targetBlendshapes && Object.keys(challenge.targetBlendshapes).length > 0) {
    const profile = {
      challengeId,
      image: imageUrl,
      blendshapes: challenge.targetBlendshapes,
      targetBlendshapes: challenge.targetBlendshapes,
      ratios: challenge.targetRatios || {},
      targetRatios: challenge.targetRatios || {},
      headPose: challenge.headPose || { yaw: 0, pitch: 0, roll: 0 },
      isValidReference: true,
      isPredefinedProfile: true,
      analyzedAt: Date.now(),
    };
    referenceFeaturesCache.set(challengeId, profile);
    return profile;
  }

  let imgElement = null;

  try {
    imgElement = await safeLoadImage(imageUrl, 4000);

    const landmarker = await Promise.race([
      loadFaceOffLandmarker(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Landmarker load timed out')), 6000)),
    ]);

    if (landmarker && typeof landmarker.detect === 'function') {
      // Temporarily switch to IMAGE mode for still-image analysis
      landmarker.setOptions?.({ runningMode: 'IMAGE' });
      try {
        const rawResult = landmarker.detect(imgElement);
        const extracted = extractFacialFeatures(rawResult);

        if (extracted) {
          const verified = {
            challengeId,
            image: imageUrl,
            blendshapes: extracted.blendshapes,
            targetBlendshapes: {
              ...(challenge.targetBlendshapes || {}),
              ...extracted.blendshapes,
            },
            ratios: extracted.ratios,
            targetRatios: {
              ...(challenge.targetRatios || {}),
              ...extracted.ratios,
            },
            headPose: extracted.headPose || challenge.headPose || { yaw: 0, pitch: 0, roll: 0 },
            isValidReference: true,
            isAnalyzedFromImage: true,
            analyzedAt: Date.now(),
          };
          referenceFeaturesCache.set(challengeId, verified);
          return verified;
        }
      } finally {
        // Immediately restore VIDEO mode so live detection loop isn't disrupted
        try {
          landmarker.setOptions?.({ runningMode: 'VIDEO' });
        } catch {}
      }
    }
  } catch (error) {
    console.warn(`[FaceOff] Reference image analysis warning for "${challengeId}":`, error.message);
  }

  // 2. Pre-extracted verified challenge profile fallback (e.g. for unit tests or offline environments)
  if (challenge.targetBlendshapes) {
    const profile = {
      challengeId,
      image: imageUrl,
      blendshapes: challenge.targetBlendshapes,
      targetBlendshapes: challenge.targetBlendshapes,
      ratios: challenge.targetRatios || {},
      targetRatios: challenge.targetRatios || {},
      headPose: challenge.headPose || { yaw: 0, pitch: 0, roll: 0 },
      isValidReference: true,
      isPredefinedProfile: true,
      analyzedAt: Date.now(),
    };
    referenceFeaturesCache.set(challengeId, profile);
    return profile;
  }

  throw new Error(`Failed to extract valid facial features for challenge "${challengeId}" from ${imageUrl}`);
}
