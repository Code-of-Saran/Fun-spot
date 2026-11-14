import { clamp01, dist, mid } from '../../vision/landmarks';

/**
 * MediaPipe Face Mesh indices used by the AR overlay. "left"/"right" are the
 * PLAYER's own sides; in the mirrored view the player's left is on screen-left.
 */
export const FACE = {
  TOP: 10, // top of forehead, around the hairline
  CHIN: 152,
  RIGHT_SIDE: 234, // face contour at ear level
  LEFT_SIDE: 454,
  RIGHT_EYE_OUTER: 33,
  RIGHT_EYE_INNER: 133,
  LEFT_EYE_OUTER: 263,
  LEFT_EYE_INNER: 362,
  RIGHT_IRIS: 468,
  LEFT_IRIS: 473,
  NOSE_TIP: 1,
  SUBNASAL: 2,
  LIP_TOP: 0,
  UPPER_LIP_INNER: 13,
  LOWER_LIP_INNER: 14,
  RIGHT_CHEEK: 205,
  LEFT_CHEEK: 425,
};

const lerp = (a, b, k) => ({ x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k });
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/**
 * Head pose + anchor points for one face, in canvas pixels.
 *
 * @param {{x:number,y:number}[]} points  face landmarks from toFaceFrame (mirrored, aspect units)
 * @param {object|null} blendshapes        { eyeBlinkLeft, eyeBlinkRight, jawOpen }
 * @param {number} scale                   units → pixels (the canvas height)
 */
export function computeFaceGeometry(points, blendshapes, scale) {
  const p = (i) => ({ x: points[i].x * scale, y: points[i].y * scale });
  const hasIris = points.length > FACE.LEFT_IRIS;

  const leftSide = p(FACE.LEFT_SIDE);
  const rightSide = p(FACE.RIGHT_SIDE);
  const leftOuter = p(FACE.LEFT_EYE_OUTER);
  const rightOuter = p(FACE.RIGHT_EYE_OUTER);
  const top = p(FACE.TOP);
  const chin = p(FACE.CHIN);
  const nose = p(FACE.NOSE_TIP);
  const eyes = mid(leftOuter, rightOuter);
  const center = mid(leftSide, rightSide);

  const width = dist(leftSide, rightSide);
  const height = dist(top, chin);
  // Eye line, drawn from the screen-left eye to the screen-right eye: 0 = level head.
  const roll = Math.atan2(rightOuter.y - leftOuter.y, rightOuter.x - leftOuter.x);
  // Turning the head moves the nose tip sideways relative to the face centre.
  const axis = { x: Math.cos(roll), y: Math.sin(roll) };
  const yaw = clamp((((nose.x - center.x) * axis.x + (nose.y - center.y) * axis.y) / (width / 2)) * 1.6, -1, 1);

  const leftEye = hasIris ? p(FACE.LEFT_IRIS) : mid(leftOuter, p(FACE.LEFT_EYE_INNER));
  const rightEye = hasIris ? p(FACE.RIGHT_IRIS) : mid(rightOuter, p(FACE.RIGHT_EYE_INNER));
  const eyeWidth = (dist(leftOuter, p(FACE.LEFT_EYE_INNER)) + dist(rightOuter, p(FACE.RIGHT_EYE_INNER))) / 2;
  const upperLipInner = p(FACE.UPPER_LIP_INNER);
  const lowerLipInner = p(FACE.LOWER_LIP_INNER);

  return {
    width,
    height,
    roll,
    yaw,
    eyeWidth,
    mouthOpen: blendshapes?.jawOpen ?? clamp01((dist(upperLipInner, lowerLipInner) / height) * 6),
    blinkLeft: blendshapes?.eyeBlinkLeft ?? 0,
    blinkRight: blendshapes?.eyeBlinkRight ?? 0,
    anchors: {
      top,
      forehead: lerp(eyes, top, 0.62),
      eyes,
      leftEye,
      rightEye,
      nose,
      upperLip: mid(p(FACE.SUBNASAL), p(FACE.LIP_TOP)),
      upperLipInner,
      mouth: mid(upperLipInner, lowerLipInner),
      chin,
      neck: lerp(eyes, chin, 1.32),
      leftCheek: p(FACE.LEFT_CHEEK),
      rightCheek: p(FACE.RIGHT_CHEEK),
      leftSide,
      rightSide,
      center,
    },
  };
}

const smoothAngle = (from, to, k) => {
  let delta = to - from;
  while (delta > Math.PI) delta -= 2 * Math.PI;
  while (delta < -Math.PI) delta += 2 * Math.PI;
  return from + delta * k;
};

/**
 * Removes landmark jitter without adding lag: the smoothing factor rises with
 * movement speed (slow → steady, fast → responsive). After a gap (face lost)
 * the next detection snaps straight into place.
 */
export function createFaceSmoother({ minAlpha = 0.35, maxAlpha = 0.9, snapAfterMs = 300 } = {}) {
  let last = null;
  let lastT = -Infinity;

  return {
    update(geometry, t) {
      if (!last || t - lastT > snapAfterMs) {
        last = geometry;
        lastT = t;
        return last;
      }
      const moved = dist(geometry.anchors.center, last.anchors.center) / Math.max(1, last.width);
      const k = clamp(minAlpha + moved * 6, minAlpha, maxAlpha);
      const mix = (a, b) => a + (b - a) * k;
      const anchors = {};
      for (const [key, point] of Object.entries(geometry.anchors)) anchors[key] = lerp(last.anchors[key], point, k);

      last = {
        ...geometry,
        width: mix(last.width, geometry.width),
        height: mix(last.height, geometry.height),
        eyeWidth: mix(last.eyeWidth, geometry.eyeWidth),
        roll: smoothAngle(last.roll, geometry.roll, k),
        yaw: mix(last.yaw, geometry.yaw),
        blinkLeft: mix(last.blinkLeft, geometry.blinkLeft),
        blinkRight: mix(last.blinkRight, geometry.blinkRight),
        anchors,
      };
      lastT = t;
      return last;
    },
    get last() {
      return last;
    },
    reset() {
      last = null;
      lastT = -Infinity;
    },
  };
}
