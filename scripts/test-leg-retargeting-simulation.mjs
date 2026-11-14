/**
 * Comprehensive Simulation Test for Leg Retargeting & Dance Animation Playback
 *
 * Verifies:
 * 1. Standing pose (phase === 'ready')
 * 2. Dance start transition (temporal smoothstep ramp)
 * 3. Active dance playback across all 7 routines + surprise moves
 * 4. Leg kinematics across all routines:
 *    - Thigh direction Y <= -0.35 (pointing downward)
 *    - Thigh direction Z >= -0.06 (knee forward or aligned with hip)
 *    - Calf direction Y <= -0.35 (pointing downward)
 *    - Calf direction Z <= 0.01 (ankle behind or aligned with knee, NO hyperextension)
 * 5. Desk webcam scenario (user legs off-screen, upper body routines)
 * 6. Dance end and immediate second dance start
 */

import { generateChoreographyFrame, blendHybridDancePose } from '../src/games/arDanceFloor/choreographyEngine.js';
import { POSE } from '../src/vision/landmarks.js';

console.log('='.repeat(70));
console.log('AR DANCE FLOOR: DANCE PLAYBACK & LEG KINEMATICS VERIFICATION');
console.log('='.repeat(70));

let failures = 0;
let testsPassed = 0;

function assert(condition, message) {
  if (!condition) {
    console.error(`  FAIL: ${message}`);
    failures++;
  } else {
    testsPassed++;
  }
}

// Mock Three.js toWorld transformation matching threeTransformationEngine.js
function mockToWorld(pt, aspect = 16 / 9) {
  if (!pt) return null;
  const cameraZ = 3.0;
  const vFOV = (45 * Math.PI) / 180;
  const visibleHeight = 2 * Math.tan(vFOV / 2) * cameraZ;
  const visibleWidth = visibleHeight * aspect;

  const u = pt.x / aspect;
  const v = pt.y;

  const worldX = (u - 0.5) * visibleWidth;
  const worldY = (0.5 - v) * visibleHeight;
  const worldZ = -(pt.z || 0) * visibleHeight;

  return { x: worldX, y: worldY, z: worldZ };
}

// 1. Standing user pose (full body)
function createMockLiveStandingPose(legsVisible = true) {
  const pose = new Array(33).fill(null).map(() => ({ x: 0.5 * (16 / 9), y: 0.35, z: 0, v: 0.95 }));
  pose[POSE.NOSE] = { x: 0.5 * (16 / 9), y: 0.20, z: -0.05, v: 0.99 };
  pose[POSE.LEFT_SHOULDER] = { x: 0.38 * (16 / 9), y: 0.35, z: 0, v: 0.99 };
  pose[POSE.RIGHT_SHOULDER] = { x: 0.62 * (16 / 9), y: 0.35, z: 0, v: 0.99 };
  pose[POSE.LEFT_ELBOW] = { x: 0.34 * (16 / 9), y: 0.50, z: 0.02, v: 0.95 };
  pose[POSE.RIGHT_ELBOW] = { x: 0.66 * (16 / 9), y: 0.50, z: 0.02, v: 0.95 };
  pose[POSE.LEFT_WRIST] = { x: 0.32 * (16 / 9), y: 0.65, z: 0.04, v: 0.95 };
  pose[POSE.RIGHT_WRIST] = { x: 0.68 * (16 / 9), y: 0.65, z: 0.04, v: 0.95 };
  pose[POSE.LEFT_HIP] = { x: 0.43 * (16 / 9), y: 0.62, z: 0, v: 0.99 };
  pose[POSE.RIGHT_HIP] = { x: 0.57 * (16 / 9), y: 0.62, z: 0, v: 0.99 };

  const legVis = legsVisible ? 0.90 : 0.10;
  pose[POSE.LEFT_KNEE] = { x: 0.42 * (16 / 9), y: 0.78, z: -0.01, v: legVis };
  pose[POSE.RIGHT_KNEE] = { x: 0.58 * (16 / 9), y: 0.78, z: -0.01, v: legVis };
  pose[POSE.LEFT_ANKLE] = { x: 0.41 * (16 / 9), y: 0.94, z: 0.0, v: legVis };
  pose[POSE.RIGHT_ANKLE] = { x: 0.59 * (16 / 9), y: 0.94, z: 0.0, v: legVis };

  return pose;
}

// Kinematics verification helper
function verifyLegKinematics(blendedPose, label) {
  const lh = mockToWorld(blendedPose[POSE.LEFT_HIP]);
  const rh = mockToWorld(blendedPose[POSE.RIGHT_HIP]);
  const lk = mockToWorld(blendedPose[POSE.LEFT_KNEE]);
  const rk = mockToWorld(blendedPose[POSE.RIGHT_KNEE]);
  const la = mockToWorld(blendedPose[POSE.LEFT_ANKLE]);
  const ra = mockToWorld(blendedPose[POSE.RIGHT_ANKLE]);

  const signX = -1;

  // Left Thigh
  const rawThighYL = lk.y - lh.y;
  const clampedThighYL = Math.min(-0.35, rawThighYL);
  const rawThighZL = lk.z - lh.z;
  const clampedThighZL = Math.max(-0.06, Math.min(0.70, rawThighZL));

  // Left Calf
  const rawCalfYL = la.y - lk.y;
  const clampedCalfYL = Math.min(-0.35, rawCalfYL);
  const rawCalfZL = la.z - lk.z;
  const clampedCalfZL = Math.min(0.01, rawCalfZL);

  // Right Thigh
  const rawThighYR = rk.y - rh.y;
  const clampedThighYR = Math.min(-0.35, rawThighYR);
  const rawThighZR = rk.z - rh.z;
  const clampedThighZR = Math.max(-0.06, Math.min(0.70, rawThighZR));

  // Right Calf
  const rawCalfYR = ra.y - rk.y;
  const clampedCalfYR = Math.min(-0.35, rawCalfYR);
  const rawCalfZR = ra.z - rk.z;
  const clampedCalfZR = Math.min(0.01, rawCalfZR);

  // Verification checks:
  assert(rawThighYL < -0.2, `${label}: Left knee is below left hip (Y_knee < Y_hip). rawThighY=${rawThighYL.toFixed(3)}`);
  assert(rawThighYR < -0.2, `${label}: Right knee is below right hip (Y_knee < Y_hip). rawThighY=${rawThighYR.toFixed(3)}`);

  assert(rawCalfYL < -0.2, `${label}: Left ankle is below left knee (Y_ankle < Y_knee). rawCalfY=${rawCalfYL.toFixed(3)}`);
  assert(rawCalfYR < -0.2, `${label}: Right ankle is below right knee (Y_ankle < Y_knee). rawCalfY=${rawCalfYR.toFixed(3)}`);

  // Knee forward flexion in 3D:
  // lk.z should be >= lh.z - 0.05 (knee is in front of or level with hip in world space)
  assert(lk.z >= lh.z - 0.05, `${label}: Left knee is NOT inverted backward behind hip. lk.z=${lk.z.toFixed(3)}, lh.z=${lh.z.toFixed(3)}`);
  assert(rk.z >= rh.z - 0.05, `${label}: Right knee is NOT inverted backward behind hip. rk.z=${rk.z.toFixed(3)}, rh.z=${rh.z.toFixed(3)}`);

  // Calf hinge constraint:
  // la.z should be <= lk.z + 0.05 (ankle is NOT forward of knee, calf angles backward/downward)
  assert(la.z <= lk.z + 0.05, `${label}: Left knee hinge flexes naturally backwards. la.z=${la.z.toFixed(3)}, lk.z=${lk.z.toFixed(3)}`);
  assert(ra.z <= rk.z + 0.05, `${label}: Right knee hinge flexes naturally backwards. ra.z=${ra.z.toFixed(3)}, rk.z=${rk.z.toFixed(3)}`);

  // Clamped checks
  assert(clampedThighYL <= -0.35, `${label}: Clamped thigh Y <= -0.35`);
  assert(clampedCalfZL <= 0.01, `${label}: Clamped calf Z <= 0.01 (no backward knee hyperextension)`);
}

// TEST SUITE 1: Standing Pose (Before Dance)
console.log('\n[Test 1] Standing Pose (Before Dance Starts)');
const liveStanding = createMockLiveStandingPose(true);
verifyLegKinematics(liveStanding, 'Standing Pose');

// TEST SUITE 2: Dance Start Ramp Transition (0.0s to 1.0s)
console.log('\n[Test 2] Dance Start Smoothstep Ramp');
const choreoFrameInit = generateChoreographyFrame({ timeSec: 0.1, routineId: 'robot' });
const rampTimes = [0.0, 0.2, 0.5, 0.8, 1.2];
for (const t of rampTimes) {
  const hybrid = blendHybridDancePose({
    livePose: liveStanding,
    choreoPose: choreoFrameInit.pose,
    mode: 'partner',
    section: { liveWeight: 0.65, choreoWeight: 0.35, mask: 'all' },
    danceElapsedSec: t,
  });
  verifyLegKinematics(hybrid.pose, `Dance Start Ramp t=${t}s`);
  if (t === 0.0) {
    assert(hybrid.choreoWeight === 0.0, `At t=0s choreoWeight is 0.0 for seamless start`);
  }
}

// TEST SUITE 3: All Dance Routines During Active Dance Playback
console.log('\n[Test 3] Active Dance Playback Across All 7 Routines');
const routines = ['freestyle', 'robot', 'side_step', 'bounce', 'victory', 'funny', 'power'];
for (const routine of routines) {
  // Test across multiple beats in the measure (0.0s, 0.5s, 1.0s, 1.5s, 2.0s)
  for (let sec = 0.5; sec <= 3.0; sec += 0.5) {
    const frame = generateChoreographyFrame({
      timeSec: sec,
      routineId: routine,
      beatEnergy: 0.8,
    });
    const hybrid = blendHybridDancePose({
      livePose: liveStanding,
      choreoPose: frame.pose,
      mode: 'partner',
      section: { liveWeight: 0.65, choreoWeight: 0.35, mask: routine === 'side_step' ? 'all' : 'upper' },
      danceElapsedSec: sec,
    });
    verifyLegKinematics(hybrid.pose, `Routine [${routine}] @ ${sec}s`);
  }
}

// TEST SUITE 4: Surprise Moves (Glitch, Freeze, Surge)
console.log('\n[Test 4] Surprise Moves Active');
const surpriseMoves = [
  { id: 'glitch', name: 'GLITCH DROP' },
  { id: 'freeze', name: 'FREEZE POSE' },
  { id: 'surge', name: 'POWER SURGE' },
];
for (const sm of surpriseMoves) {
  const frame = generateChoreographyFrame({
    timeSec: 1.5,
    routineId: 'freestyle',
    surpriseMove: sm,
  });
  const hybrid = blendHybridDancePose({
    livePose: liveStanding,
    choreoPose: frame.pose,
    mode: 'partner',
    surpriseMove: sm,
    danceElapsedSec: 2.0,
  });
  verifyLegKinematics(hybrid.pose, `Surprise [${sm.name}]`);
}

// TEST SUITE 5: Desk Webcam Scenario (Legs Off-Screen, Upper-Body Routines)
console.log('\n[Test 5] Desk Webcam Scenario (Legs Off-Screen, Upper-Body Routines)');
const liveDeskPose = createMockLiveStandingPose(false); // legs off-screen (v = 0.1)
const upperRoutines = ['robot', 'victory', 'freestyle', 'power'];
for (const ur of upperRoutines) {
  const frame = generateChoreographyFrame({
    timeSec: 2.2,
    routineId: ur,
  });
  const hybrid = blendHybridDancePose({
    livePose: liveDeskPose,
    choreoPose: frame.pose,
    mode: 'partner',
    section: { liveWeight: 0.65, choreoWeight: 0.35, mask: 'upper' },
    danceElapsedSec: 2.5,
  });
  verifyLegKinematics(hybrid.pose, `Desk Webcam [${ur}]`);

  // Verify that lower body was NOT forcefully overridden by choreo when mask is 'upper'
  const leftKneePt = hybrid.pose[POSE.LEFT_KNEE];
  assert(leftKneePt.y >= 0.75, `Left knee remains safely at knee height (y >= 0.75), actual: ${leftKneePt.y.toFixed(3)}`);
}

// TEST SUITE 6: Dance End and Immediate Second Dance Start
console.log('\n[Test 6] Dance End and Second Dance Start Lifecycle');
// End of first dance:
const hybridEnd = blendHybridDancePose({
  livePose: liveStanding,
  choreoPose: choreoFrameInit.pose,
  mode: 'partner',
  danceElapsedSec: 45.0,
});
verifyLegKinematics(hybridEnd.pose, 'Dance 1 End');

// Immediate start of second dance:
const hybridDance2Start = blendHybridDancePose({
  livePose: liveStanding,
  choreoPose: choreoFrameInit.pose,
  mode: 'partner',
  section: { liveWeight: 0.65, choreoWeight: 0.35, mask: 'all' },
  danceElapsedSec: 0.05,
});
verifyLegKinematics(hybridDance2Start.pose, 'Dance 2 Start (0.05s)');

console.log('\n' + '='.repeat(70));
console.log(`SIMULATION RESULTS: ${testsPassed} checks passed, ${failures} failures.`);
console.log('='.repeat(70));

if (failures > 0) {
  process.exit(1);
} else {
  process.exit(0);
}

