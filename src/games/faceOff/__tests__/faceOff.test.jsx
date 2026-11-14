import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import fs from 'node:fs';
import path from 'node:path';
import {
  EXPRESSION_CHALLENGES,
  getScoreTier,
  getResultTitle,
  getVerifiedChallenges,
  getChallenge,
  ROUND_DURATION_SECONDS,
  DEFAULT_SESSION_ROUNDS,
} from '../faceOffConfig';
import {
  extractFacialFeatures,
  calculateExpressionMatch,
  analyzeReferenceImage,
  clearReferenceFeaturesCache,
  referenceFeaturesCache,
  FACE_LANDMARKS,
} from '../faceAnalysis';
import ConsentModal from '../components/ConsentModal';
import ResultComparison from '../components/ResultComparison';
import { gameModes } from '../../../data/gameModes';

describe('Face Off — Challenge Library & Asset Verification', () => {
  it('defines 10 verified expression challenges with complete metadata', () => {
    expect(EXPRESSION_CHALLENGES).toHaveLength(10);

    const expectedIds = [
      'mischievous_grin',
      'shocked_disbelief',
      'furious_shout',
      'dazed_stare',
      'energetic_laughter',
      'dramatic_pout',
      'eyes_closed_stubbornness',
      'startled_surprise',
      'stern_suspicion',
      'charming_smirk',
    ];

    const actualIds = EXPRESSION_CHALLENGES.map((c) => c.id);
    expect(actualIds).toEqual(expectedIds);

    for (const c of EXPRESSION_CHALLENGES) {
      expect(c.id).toBeTruthy();
      expect(c.name).toBeTruthy();
      expect(c.subtitle).toBeTruthy();
      expect(c.instructions).toBeTruthy();
      expect(c.humorousDescription).toBeTruthy();
      expect(c.filename).toBeTruthy();
      expect(c.image).toMatch(/^\/assets\/Faces\/.+$/);
      expect(c.validationStatus).toBe('valid');
      expect(c.referenceStatus).toBe('verified');
      expect(c.targetBlendshapes).toBeDefined();
      expect(Object.keys(c.targetBlendshapes).length).toBeGreaterThan(0);
      expect(c.targetRatios).toBeDefined();
    }
  });

  it('verifies that all 10 challenge reference images exist on disk in public/assets/Faces', () => {
    const publicDir = path.resolve(process.cwd(), 'public');

    for (const challenge of EXPRESSION_CHALLENGES) {
      const diskPath = path.join(publicDir, challenge.image.replace(/^\//, ''));
      expect(
        fs.existsSync(diskPath),
        `Reference image ${challenge.image} must exist on disk at ${diskPath}`,
      ).toBe(true);

      const stats = fs.statSync(diskPath);
      expect(stats.size).toBeGreaterThan(5000); // verified non-empty image file
    }
  });

  it('correctly returns verified challenges via getVerifiedChallenges()', () => {
    const verified = getVerifiedChallenges();
    expect(verified).toHaveLength(10);
    expect(verified.every((c) => c.validationStatus === 'valid')).toBe(true);
  });

  it('retrieves individual challenges accurately by ID', () => {
    const ajith = getChallenge('mischievous_grin');
    expect(ajith).toBeDefined();
    expect(ajith.name).toBe('Mischievous Grin');
    expect(ajith.filename).toBe('ajith.jpg');

    const unknown = getChallenge('non_existent_id');
    expect(unknown).toBeNull();
  });

  it('specifies 5-second round duration and 5 default session rounds', () => {
    expect(ROUND_DURATION_SECONDS).toBe(5);
    expect(DEFAULT_SESSION_ROUNDS).toBe(5);
  });
});

describe('Face Off — Image-to-Feature Synchronization & Stale Result Prevention', () => {
  beforeEach(() => {
    clearReferenceFeaturesCache();
  });

  it('binds extracted reference features strictly to the exact challenge ID', async () => {
    const challenge = EXPRESSION_CHALLENGES.find((c) => c.id === 'furious_shout');
    const features = await analyzeReferenceImage(challenge);

    expect(features).toBeDefined();
    expect(features.challengeId).toBe('furious_shout');
    expect(features.isValidReference).toBe(true);
    expect(features.targetBlendshapes).toBeDefined();
    expect(features.targetBlendshapes.browDownLeft).toBeGreaterThan(0.5);

    // Stored in cache under exact challenge ID
    expect(referenceFeaturesCache.has('furious_shout')).toBe(true);
    const cached = referenceFeaturesCache.get('furious_shout');
    expect(cached.challengeId).toBe('furious_shout');
  });

  it('never compares candidate against a mismatched challenge feature vector', async () => {
    const grinChallenge = EXPRESSION_CHALLENGES.find((c) => c.id === 'mischievous_grin');
    const shoutChallenge = EXPRESSION_CHALLENGES.find((c) => c.id === 'furious_shout');

    const grinFeatures = await analyzeReferenceImage(grinChallenge);
    const shoutFeatures = await analyzeReferenceImage(shoutChallenge);

    expect(grinFeatures.challengeId).toBe('mischievous_grin');
    expect(shoutFeatures.challengeId).toBe('furious_shout');

    // Candidate imitating the grin
    const smilingCandidate = {
      blendshapes: {
        mouthSmileLeft: 0.90,
        mouthSmileRight: 0.90,
        jawOpen: 0.40,
        eyeSquintLeft: 0.60,
        eyeSquintRight: 0.60,
      },
      ratios: {
        mouthOpenRatio: 0.35,
        mouthWidthRatio: 0.75,
        eyeOpenRatio: 0.16,
      },
      headPose: { yaw: 0.1, pitch: 0, roll: 0 },
    };

    const matchGrin = calculateExpressionMatch(smilingCandidate, grinFeatures);
    const matchShout = calculateExpressionMatch(smilingCandidate, shoutFeatures);

    expect(matchGrin.challengeId).toBe('mischievous_grin');
    expect(matchShout.challengeId).toBe('furious_shout');

    // Smiling candidate matches Grin strongly, but fails Furious Shout
    expect(matchGrin.score).toBeGreaterThanOrEqual(75);
    expect(matchShout.score).toBeLessThanOrEqual(40);
    expect(matchGrin.score - matchShout.score).toBeGreaterThan(35);
  });

  it('discards stale asynchronous reference results when challenge changes rapidly', async () => {
    let currentActiveChallenge = EXPRESSION_CHALLENGES[0]; // mischievous_grin
    let loadToken = 0;
    let committedFeatures = null;

    // Simulate round 1 request
    const token1 = ++loadToken;
    const promise1 = analyzeReferenceImage(currentActiveChallenge).then((feat) => {
      // Check if stale before committing
      if (token1 === loadToken) {
        committedFeatures = feat;
      }
    });

    // Rapid round advance to round 2 (furious_shout) before round 1 completes
    currentActiveChallenge = EXPRESSION_CHALLENGES[2]; // furious_shout
    const token2 = ++loadToken;
    committedFeatures = null; // invalidates transient state immediately

    const promise2 = analyzeReferenceImage(currentActiveChallenge).then((feat) => {
      if (token2 === loadToken) {
        committedFeatures = feat;
      }
    });

    await Promise.all([promise1, promise2]);

    // Committed features MUST belong to the active challenge (token 2), never token 1
    expect(committedFeatures).not.toBeNull();
    expect(committedFeatures.challengeId).toBe('furious_shout');
    expect(committedFeatures.challengeId).toBe(currentActiveChallenge.id);
  });
});

describe('Face Off — Facial Expression Analysis & Match Scoring', () => {
  // Synthetic landmark generator
  function makeSyntheticLandmarks({ eyeDist = 100, mouthOpen = 20, mouthCornersY = 0 } = {}) {
    const scale = eyeDist / 100;
    const landmarks = Array.from({ length: 478 }, () => ({ x: 0, y: 0, z: 0 }));

    // Eye outer corners
    landmarks[FACE_LANDMARKS.LEFT_EYE_OUTER] = { x: -eyeDist / 2, y: 0, z: 0 };
    landmarks[FACE_LANDMARKS.RIGHT_EYE_OUTER] = { x: eyeDist / 2, y: 0, z: 0 };

    // Eye tops & bottoms
    landmarks[FACE_LANDMARKS.LEFT_EYE_TOP] = { x: -eyeDist / 3, y: -15 * scale, z: 0 };
    landmarks[FACE_LANDMARKS.LEFT_EYE_BOTTOM] = { x: -eyeDist / 3, y: 15 * scale, z: 0 };
    landmarks[FACE_LANDMARKS.RIGHT_EYE_TOP] = { x: eyeDist / 3, y: -15 * scale, z: 0 };
    landmarks[FACE_LANDMARKS.RIGHT_EYE_BOTTOM] = { x: eyeDist / 3, y: 15 * scale, z: 0 };

    // Brows
    landmarks[FACE_LANDMARKS.LEFT_BROW_ARCH] = { x: -eyeDist / 3, y: -45 * scale, z: 0 };
    landmarks[FACE_LANDMARKS.RIGHT_BROW_ARCH] = { x: eyeDist / 3, y: -45 * scale, z: 0 };

    // Mouth
    landmarks[FACE_LANDMARKS.LIP_UPPER_CENTER] = { x: 0, y: 50 * scale, z: 0 };
    landmarks[FACE_LANDMARKS.LIP_LOWER_CENTER] = { x: 0, y: 50 * scale + mouthOpen, z: 0 };
    landmarks[FACE_LANDMARKS.MOUTH_CORNER_LEFT] = { x: -30 * scale, y: 55 * scale + mouthCornersY, z: 0 };
    landmarks[FACE_LANDMARKS.MOUTH_CORNER_RIGHT] = { x: 30 * scale, y: 55 * scale + mouthCornersY, z: 0 };
    landmarks[FACE_LANDMARKS.MOUTH_TOP] = { x: 0, y: 48 * scale, z: 0 };
    landmarks[FACE_LANDMARKS.MOUTH_BOTTOM] = { x: 0, y: 52 * scale + mouthOpen, z: 0 };

    // Nose & Chin
    landmarks[FACE_LANDMARKS.NOSE_TIP] = { x: 0, y: 25 * scale, z: 10 * scale };
    landmarks[FACE_LANDMARKS.CHIN] = { x: 0, y: 100 * scale + mouthOpen, z: 0 };

    return landmarks;
  }

  it('extracts geometric ratios and blendshapes cleanly from raw detection result', () => {
    const rawResult = {
      faceLandmarks: [makeSyntheticLandmarks({ eyeDist: 100, mouthOpen: 60 })],
      faceBlendshapes: [
        {
          categories: [
            { categoryName: 'jawOpen', score: 0.85 },
            { categoryName: 'browInnerUp', score: 0.80 },
          ],
        },
      ],
      facialTransformationMatrixes: [],
    };

    const features = extractFacialFeatures(rawResult);
    expect(features).toBeDefined();
    expect(features.blendshapes.jawOpen).toBe(0.85);
    expect(features.blendshapes.browInnerUp).toBe(0.80);
    expect(features.ratios.mouthOpenRatio).toBeCloseTo(0.60, 1);
  });

  it('produces high score when candidate closely reproduces reference expression', () => {
    const disbeliefChallenge = EXPRESSION_CHALLENGES.find((c) => c.id === 'shocked_disbelief');

    const matchingCandidate = {
      blendshapes: {
        eyeWideLeft: 0.82,
        eyeWideRight: 0.82,
        browInnerUp: 0.72,
        browOuterUpLeft: 0.58,
        browOuterUpRight: 0.58,
        jawOpen: 0.52,
      },
      ratios: {
        eyeOpenRatio: 0.35,
        browRaiseRatio: 0.40,
        mouthOpenRatio: 0.38,
      },
      headPose: { yaw: 0, pitch: 0.1, roll: 0 },
    };

    const match = calculateExpressionMatch(matchingCandidate, disbeliefChallenge);
    expect(match.score).toBeGreaterThanOrEqual(80);
    expect(match.score).toBeLessThanOrEqual(100);
    expect(match.blendshapeSim).toBeGreaterThanOrEqual(80);
  });

  it('produces significantly lower score for opposing or relaxed expressions', () => {
    const disbeliefChallenge = EXPRESSION_CHALLENGES.find((c) => c.id === 'shocked_disbelief');

    // A relaxed smiling face with closed mouth and narrow eyes
    const neutralCandidate = {
      blendshapes: {
        eyeWideLeft: 0.05,
        eyeWideRight: 0.05,
        jawOpen: 0.02,
        browInnerUp: 0.05,
        mouthSmileLeft: 0.70,
        mouthSmileRight: 0.70,
      },
      ratios: {
        mouthOpenRatio: 0.05,
        eyeOpenRatio: 0.15,
        browRaiseRatio: 0.20,
      },
      headPose: { yaw: 0, pitch: 0, roll: 0 },
    };

    const match = calculateExpressionMatch(neutralCandidate, disbeliefChallenge);
    expect(match.score).toBeLessThan(40);
    expect(match.blendshapeSim).toBeLessThan(35);
  });

  it('safely handles missing or null features without crashing', () => {
    const nullMatch = calculateExpressionMatch(null, null);
    expect(nullMatch.score).toBe(0);
    expect(nullMatch.blendshapeSim).toBe(0);

    const emptyMatch = calculateExpressionMatch({}, {});
    expect(emptyMatch.score).toBe(0);
  });

  it('handles visual mirror reflection for asymmetric facial expressions', () => {
    const smirkChallenge = EXPRESSION_CHALLENGES.find((c) => c.id === 'charming_smirk');

    // Candidate A smiles with left side
    const anatomicalCandidate = {
      blendshapes: {
        mouthSmileLeft: 0.65,
        mouthSmileRight: 0.20,
        jawOpen: 0.25,
      },
      ratios: {
        mouthOpenRatio: 0.18,
        eyeOpenRatio: 0.24,
      },
      headPose: { yaw: 0, pitch: 0, roll: 0 },
    };

    // Candidate B smiles with right side (as in camera mirror reflection)
    const mirrorCandidate = {
      blendshapes: {
        mouthSmileLeft: 0.20,
        mouthSmileRight: 0.65,
        jawOpen: 0.25,
      },
      ratios: {
        mouthOpenRatio: 0.18,
        eyeOpenRatio: 0.24,
      },
      headPose: { yaw: 0, pitch: 0, roll: 0 },
    };

    const matchA = calculateExpressionMatch(anatomicalCandidate, smirkChallenge);
    const matchB = calculateExpressionMatch(mirrorCandidate, smirkChallenge);

    expect(matchA.score).toBeGreaterThanOrEqual(65);
    expect(matchB.score).toBeGreaterThanOrEqual(65);
    expect(Math.abs(matchA.score - matchB.score)).toBeLessThanOrEqual(8);
  });

  it('demonstrates scale invariance across different participant distances from camera', () => {
    // Participant far away (eye distance 60px)
    const farResult = {
      faceLandmarks: [makeSyntheticLandmarks({ eyeDist: 60, mouthOpen: 36 })],
      faceBlendshapes: [{ categories: [{ categoryName: 'jawOpen', score: 0.80 }] }],
    };

    // Participant close up (eye distance 180px, mouthOpen scaled proportionally 3x to 108px)
    const closeResult = {
      faceLandmarks: [makeSyntheticLandmarks({ eyeDist: 180, mouthOpen: 108 })],
      faceBlendshapes: [{ categories: [{ categoryName: 'jawOpen', score: 0.80 }] }],
    };

    const farFeatures = extractFacialFeatures(farResult);
    const closeFeatures = extractFacialFeatures(closeResult);

    expect(farFeatures.ratios.mouthOpenRatio).toBeCloseTo(closeFeatures.ratios.mouthOpenRatio, 2);

    const shoutChallenge = EXPRESSION_CHALLENGES.find((c) => c.id === 'furious_shout');
    const farMatch = calculateExpressionMatch(farFeatures, shoutChallenge);
    const closeMatch = calculateExpressionMatch(closeFeatures, shoutChallenge);

    expect(Math.abs(farMatch.score - closeMatch.score)).toBeLessThanOrEqual(3);
  });

  it('verifies strict discrimination across multiple distinct emotion pairs', () => {
    // 1. Furious Shout vs Mischievous Grin
    const shoutChallenge = EXPRESSION_CHALLENGES.find((c) => c.id === 'furious_shout');
    const shoutCandidate = {
      blendshapes: { browDownLeft: 0.88, browDownRight: 0.88, jawOpen: 0.85, noseSneerLeft: 0.65, noseSneerRight: 0.65 },
      ratios: { mouthOpenRatio: 0.65, eyeOpenRatio: 0.28 },
      headPose: { yaw: 0, pitch: 0, roll: 0 },
    };
    const smileCandidate = {
      blendshapes: { mouthSmileLeft: 0.90, mouthSmileRight: 0.90, eyeSquintLeft: 0.60, eyeSquintRight: 0.60, jawOpen: 0.35 },
      ratios: { mouthOpenRatio: 0.35, eyeOpenRatio: 0.16 },
      headPose: { yaw: 0, pitch: 0, roll: 0 },
    };

    const shoutMatch = calculateExpressionMatch(shoutCandidate, shoutChallenge);
    const shoutVsSmileMatch = calculateExpressionMatch(smileCandidate, shoutChallenge);

    expect(shoutMatch.score).toBeGreaterThanOrEqual(80);
    expect(shoutVsSmileMatch.score).toBeLessThanOrEqual(40);
    expect(shoutMatch.score - shoutVsSmileMatch.score).toBeGreaterThan(40);

    // 2. Dramatic Pout vs Energetic Laughter
    const poutChallenge = EXPRESSION_CHALLENGES.find((c) => c.id === 'dramatic_pout');
    const poutCandidate = {
      blendshapes: { mouthFrownLeft: 0.88, mouthFrownRight: 0.88, mouthShrugLower: 0.78, browInnerUp: 0.68 },
      ratios: { mouthOpenRatio: 0.04, mouthCornerTilt: -0.30 },
      headPose: { yaw: 0, pitch: 0, roll: 0 },
    };
    const laughCandidate = {
      blendshapes: { mouthSmileLeft: 0.92, mouthSmileRight: 0.92, jawOpen: 0.75, eyeWideLeft: 0.65, eyeWideRight: 0.65 },
      ratios: { mouthOpenRatio: 0.55, mouthCornerTilt: 0.18 },
      headPose: { yaw: 0, pitch: 0, roll: 0 },
    };

    const poutMatch = calculateExpressionMatch(poutCandidate, poutChallenge);
    const poutVsLaughMatch = calculateExpressionMatch(laughCandidate, poutChallenge);

    expect(poutMatch.score).toBeGreaterThanOrEqual(80);
    expect(poutVsLaughMatch.score).toBeLessThanOrEqual(35);
    expect(poutMatch.score - poutVsLaughMatch.score).toBeGreaterThan(45);
  });

  it('demonstrates score stability under small sensor noise on held poses', () => {
    const shoutChallenge = EXPRESSION_CHALLENGES.find((c) => c.id === 'furious_shout');
    const baseCandidate = {
      blendshapes: { browDownLeft: 0.85, browDownRight: 0.85, jawOpen: 0.80, eyeWideLeft: 0.60, eyeWideRight: 0.60 },
      ratios: { mouthOpenRatio: 0.65, eyeOpenRatio: 0.28, browRaiseRatio: 0.18 },
      headPose: { yaw: 0, pitch: 0, roll: 0 },
    };

    // Candidate with +/- 3% sensor noise
    const noisyCandidate = {
      blendshapes: { browDownLeft: 0.87, browDownRight: 0.83, jawOpen: 0.82, eyeWideLeft: 0.62, eyeWideRight: 0.58 },
      ratios: { mouthOpenRatio: 0.66, eyeOpenRatio: 0.27, browRaiseRatio: 0.19 },
      headPose: { yaw: 0.02, pitch: -0.01, roll: 0.01 },
    };

    const baseMatch = calculateExpressionMatch(baseCandidate, shoutChallenge);
    const noisyMatch = calculateExpressionMatch(noisyCandidate, shoutChallenge);

    expect(Math.abs(baseMatch.score - noisyMatch.score)).toBeLessThanOrEqual(3);
  });
});

describe('Face Off — Result Categories & Entertaining Titles', () => {
  it('assigns appropriate humorous titles and tiers across score spectrum', () => {
    // 95% -> PERFECT tier
    const topTier = getScoreTier(95);
    expect(topTier.tier).toBe('PERFECT');
    expect(topTier.label).toBe('PERFECT SYNC');
    const topTitle = getResultTitle(95, 'mischievous_grin');
    expect(typeof topTitle).toBe('string');
    expect(topTitle.length).toBeGreaterThan(3);

    // 78% -> EXCELLENT tier
    const midTier = getScoreTier(78);
    expect(midTier.tier).toBe('EXCELLENT');
    expect(midTier.label).toBe('EXCELLENT MATCH');

    // 25% -> LOW tier
    const lowTier = getScoreTier(25);
    expect(lowTier.tier).toBe('LOW');
    expect(lowTier.label).toBe('OFF TARGET');
    const lowTitle = getResultTitle(25, 'shocked_disbelief');
    expect(typeof lowTitle).toBe('string');
  });
});

describe('Face Off — Component Rendering & Navigation Verification', () => {
  it('renders ConsentModal with required privacy notices and toggle', () => {
    const html = renderToString(
      <ConsentModal onConsent={() => {}} onCancel={() => {}} />,
    );
    expect(html).toContain('WELCOME TO FACE OFF');
    expect(html).toContain('Local Camera Processing');
    expect(html).toContain('Privacy &amp; Security First');
    expect(html).toContain('MediaPipe Face Landmarker');
    expect(html).toContain('checkbox');
  });

  it('renders ResultComparison with side-by-side reference and user capture', () => {
    const challenge = EXPRESSION_CHALLENGES[0];
    const scoreResult = {
      score: 87,
      blendshapeSim: 88,
      ratioSim: 85,
      poseSim: 90,
    };

    const html = renderToString(
      <MemoryRouter>
        <ResultComparison
          challenge={challenge}
          capturedPhoto="data:image/jpeg;base64,mock"
          scoreResult={scoreResult}
          faceDetected={true}
          errorMessage={null}
          onRetake={() => {}}
          onNext={() => {}}
          isLastRound={false}
        />
      </MemoryRouter>,
    );

    expect(html).toContain('TARGET REFERENCE');
    expect(html).toContain('YOUR CAPTURED EXPRESSION');
    expect(html).toContain('NEXT CHALLENGE');
    expect(html).toContain('RETAKE');
    expect(html).toContain('DOWNLOAD PHOTO CARD');
  });

  it('confirms gameModes list now has Face Off and exactly 3 active games without AR Dance Floor', () => {
    expect(gameModes).toHaveLength(3);
    const ids = gameModes.map((m) => m.id);
    expect(ids).not.toContain('ar-dance-floor');
    expect(ids).toContain('dont-laugh');
    expect(ids).toContain('face-off');
    expect(ids).toContain('look-a-like');
    expect(ids).not.toContain('wrong-answers');

    const faceOffMode = gameModes.find((m) => m.id === 'face-off');
    expect(faceOffMode.title).toBe('FACE OFF');
    expect(faceOffMode.route).toBe('/face-off');
  });
});

describe('Face Off — Live Camera Panel & Switch Camera Controls', () => {
  it('renders SwitchCameraButton inside Live Camera panel with vector icon and labels', async () => {
    const { default: SwitchCameraButton } = await import('../../../components/camera/SwitchCameraButton');

    const mockCamera = {
      status: 'ready',
      devices: [
        { deviceId: 'cam1', label: 'Integrated Webcam (Built-in)' },
        { deviceId: 'cam2', label: 'USB HD Pro Webcam (External)' },
      ],
      activeDevice: { deviceId: 'cam1', label: 'Integrated Webcam (Built-in)' },
      nextDevice: { deviceId: 'cam2', label: 'USB HD Pro Webcam (External)' },
      isSwitching: false,
      switchError: null,
      switchCamera: vi.fn().mockResolvedValue({ success: true, device: { deviceId: 'cam2' } }),
      clearSwitchError: vi.fn(),
    };

    const html = renderToString(
      <SwitchCameraButton
        camera={mockCamera}
        className="faceoff-viewfinder-switch-btn"
        compact={false}
        showActiveLabel={true}
        onSwitch={() => {}}
      />,
    );

    expect(html).toContain('SWITCH CAMERA');
    expect(html).toContain('Integrated Webcam');
    expect(html).toContain('switch-camera-btn');
    expect(html).toContain('svg'); // Vector icon, not emoji
    expect(html).not.toMatch(/[\u{1F300}-\u{1FAFF}]/u); // Zero emoji characters
  });

  it('renders SwitchCameraButton loading state cleanly during camera switch', async () => {
    const { default: SwitchCameraButton } = await import('../../../components/camera/SwitchCameraButton');

    const mockSwitchingCamera = {
      status: 'requesting',
      devices: [
        { deviceId: 'cam1', label: 'Integrated Webcam' },
        { deviceId: 'cam2', label: 'USB Webcam' },
      ],
      activeDevice: { deviceId: 'cam1', label: 'Integrated Webcam' },
      nextDevice: { deviceId: 'cam2', label: 'USB Webcam' },
      isSwitching: true,
      switchError: null,
      switchCamera: vi.fn(),
      clearSwitchError: vi.fn(),
    };

    const html = renderToString(
      <SwitchCameraButton
        camera={mockSwitchingCamera}
        compact={false}
        showActiveLabel={true}
      />,
    );

    expect(html).toContain('SWITCHING...');
    expect(html).toContain('switch-camera-btn--switching');
    expect(html).toContain('switch-camera-spinner');
  });

  it('renders FaceOff with Live Camera panel and video viewfinder structure', async () => {
    const { default: FaceOff } = await import('../FaceOff');

    // Seed consent so it renders the READY arena directly
    localStorage.setItem('funspot_faceoff_consent_granted', 'true');

    const html = renderToString(
      <MemoryRouter initialEntries={['/face-off']}>
        <FaceOff />
      </MemoryRouter>,
    );

    expect(html).toContain('FACE OFF');
    expect(html).toContain('LIVE CAMERA');
    expect(html).toContain('TARGET EXPRESSION');
    expect(html).toContain('HOW TO MATCH');
    expect(html).toContain('faceoff-video-element');
    expect(html).toContain('faceoff-viewfinder-card');
  });
});
