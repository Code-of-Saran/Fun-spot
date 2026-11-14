/**
 * Converts raw MediaPipe results into a Fun Spot frame:
 * {
 *   t: number,                         // ms (performance.now)
 *   aspect: number,                    // video width / height
 *   pose: Point[] | null,              // 33 pose landmarks
 *   hands: { lm: Point[], handedness: string }[]
 * }
 * Point = { x, y, z, v } where x is mirrored and multiplied by `aspect`
 * (see vision/landmarks.js).
 */
export function toFrame(t, aspect, poseResult, handResult) {
  const mirror = (p) => ({ x: (1 - p.x) * aspect, y: p.y, z: p.z, v: p.visibility ?? 1 });
  const rawPoses = poseResult?.landmarks ?? [];
  const poses = rawPoses.map((landmarks) => landmarks.map(mirror));
  const pose = poses[0] || null;

  return {
    t,
    aspect,
    pose,
    poses,
    hands: (handResult?.landmarks ?? []).map((lm, i) => ({
      lm: lm.map(mirror),
      handedness: handResult.handedness?.[i]?.[0]?.categoryName ?? 'Unknown',
    })),
  };
}
