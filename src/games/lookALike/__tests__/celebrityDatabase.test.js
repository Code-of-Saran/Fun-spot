import { describe, it, expect } from 'vitest';
import {
  CELEBRITY_DATABASE,
  MALE_CELEBRITIES,
  FEMALE_CELEBRITIES,
  calculateCelebrityDistance,
  findClosestCelebrity,
  matchGroupParticipants,
} from '../celebrityDatabase';

describe('Look A Like — Celebrity Database & Indian Celebrity Resemblance', () => {
  it('contains curated Indian celebrities with humorous expressions across Male and Female collections', () => {
    expect(MALE_CELEBRITIES).toHaveLength(79);
    expect(FEMALE_CELEBRITIES).toHaveLength(31);
    expect(CELEBRITY_DATABASE).toHaveLength(110);

    const names = CELEBRITY_DATABASE.map((c) => c.name);
    // Tamil Cinema Icons
    expect(names).toContain('Vadivelu');
    expect(names).toContain('Kovai Sarala');
    expect(names).toContain('Senthil');
    expect(names).toContain('Goundamani');
    expect(names).toContain('Santhanam');
    expect(names).toContain('Superstar Rajinikanth');
    expect(names).toContain('Kamal Haasan');
    expect(names).toContain('Ajith Kumar');
    expect(names).toContain('Thalapathy Vijay');
    expect(names).toContain('Dhanush');
    expect(names).toContain('Vijay Sethupathi');
    expect(names).toContain('Nayanthara');
    expect(names).toContain('Trisha Krishnan');
    expect(names).toContain('Jyothika');
    expect(names).toContain('Arvind Swamy');
    expect(names).toContain('Action King Arjun');
    expect(names).toContain('Ashok Selvan');
    expect(names).toContain('Jayam Ravi');
    expect(names).toContain('Silambarasan TR');
    expect(names).toContain('Chiyaan Vikram');
    expect(names).toContain('Vishal');

    // Telugu & Kannada Cinema Icons
    expect(names).toContain('Allu Arjun');
    expect(names).toContain('Prabhas');
    expect(names).toContain('Ram Charan');
    expect(names).toContain('Jr NTR');
    expect(names).toContain('Samantha Ruth Prabhu');
    expect(names).toContain('Yash');

    // Hindi / Bollywood Stars
    expect(names).toContain('Shah Rukh Khan');
    expect(names).toContain('Salman Khan');
    expect(names).toContain('Aamir Khan');
    expect(names).toContain('Akshay Kumar');
    expect(names).toContain('Hrithik Roshan');
    expect(names).toContain('Ranveer Singh');
    expect(names).toContain('Deepika Padukone');
    expect(names).toContain('Alia Bhatt');
    expect(names).toContain('Kareena Kapoor');
    expect(names).toContain('Priyanka Chopra');

    // Malayalam / Regional Stars & Comedy Legends
    expect(names).toContain('Sai Pallavi');
    expect(names).toContain('Nazriya Nazim');
    expect(names).toContain('Nithya Menen');
    expect(names).toContain('Dileep');
    expect(names).toContain('Salim Kumar');
    expect(names).toContain('Fahadh Faasil');
    expect(names).toContain('Kalabhavan Mani');
    expect(names).toContain('Nivin Pauly');
    expect(names).toContain('Tovino Thomas');
    expect(names).toContain('Urvashi');
    expect(names).toContain('Jangiri Madhumitha');
    expect(names).toContain('Vidyullekha Raman');
  });

  it('searches the entire unified database automatically without gender classification or buttons', () => {
    const wideGrin = {
      blendshapes: { mouthSmileLeft: 0.95, mouthSmileRight: 0.95, jawOpen: 0.55 },
      ratios: { mouthOpenRatio: 0.42, mouthWidthRatio: 0.82, eyeOpenRatio: 0.28 },
      headPose: { yaw: 0.08, pitch: -0.05, roll: 0.04 },
    };
    // Default collection 'all'
    const match = findClosestCelebrity(wideGrin);
    expect(match).toBeDefined();
    expect(match.name).toBeTruthy();
    expect(match.image).toMatch(/^\/assets\/LookALike\/(Male|Female)\//);
    // Must NOT contain any percentage score
    expect(match.score).toBeUndefined();
    expect(match.percentage).toBeUndefined();
  });

  it('verifies all entries possess required funny expression metadata and target vectors from LookALike folders', () => {
    for (const celeb of CELEBRITY_DATABASE) {
      expect(celeb.id).toBeTruthy();
      expect(celeb.name).toBeTruthy();
      expect(celeb.title).toBeTruthy();
      expect(celeb.description).toBeTruthy();
      expect(celeb.image).toMatch(/^\/assets\/LookALike\/(Male|Female)\//);
      expect(celeb.targetBlendshapes).toBeDefined();
      expect(Object.keys(celeb.targetBlendshapes).length).toBeGreaterThan(0);
      expect(celeb.targetRatios).toBeDefined();
    }
  });

  it('selects Kovai Sarala when participant shows a dramatic pout and frown in female collection', () => {
    const poutFeatures = {
      blendshapes: {
        mouthFrownLeft: 0.95,
        mouthFrownRight: 0.95,
        mouthShrugLower: 0.85,
        browInnerUp: 0.75,
      },
      ratios: {
        mouthCornerTilt: -0.35,
        mouthOpenRatio: 0.05,
      },
    };

    const match = findClosestCelebrity(poutFeatures, { collection: 'female' });
    expect(match.name).toBe('Kovai Sarala');
    expect(match.gender).toBe('female');
  });

  it('strictly respects the Male Reference Collection selection', () => {
    const poutFeatures = {
      blendshapes: {
        mouthFrownLeft: 0.95,
        mouthFrownRight: 0.95,
        mouthShrugLower: 0.85,
        browInnerUp: 0.75,
      },
      ratios: {
        mouthCornerTilt: -0.35,
        mouthOpenRatio: 0.05,
      },
    };

    const match = findClosestCelebrity(poutFeatures, { collection: 'male' });
    expect(match.gender).toBe('male');
    expect(MALE_CELEBRITIES.some((m) => m.id === match.id)).toBe(true);
  });

  it('selects Senthil when participant has eyes closed in stubborn zen', () => {
    const sleepFeatures = {
      blendshapes: {
        eyeBlinkLeft: 0.98,
        eyeBlinkRight: 0.98,
        mouthPressLeft: 0.8,
      },
      ratios: {
        eyeOpenRatio: 0.01,
        mouthOpenRatio: 0.01,
      },
    };

    const match = findClosestCelebrity(sleepFeatures, { collection: 'male' });
    expect(match.name).toBe('Senthil');
  });

  it('selects Vadivelu when participant has a stern suspicious glare', () => {
    const glareFeatures = {
      blendshapes: {
        browDownLeft: 0.88,
        browDownRight: 0.88,
        mouthPressLeft: 0.70,
        mouthPressRight: 0.70,
        eyeSquintLeft: 0.50,
        eyeSquintRight: 0.50,
        noseSneerLeft: 0.40,
        noseSneerRight: 0.40,
        mouthFrownLeft: 0.35,
        mouthFrownRight: 0.35,
      },
      ratios: {
        browRaiseRatio: 0.16,
        mouthOpenRatio: 0.02,
        mouthCornerTilt: -0.08,
      },
    };

    const match = findClosestCelebrity(glareFeatures, { collection: 'male' });
    expect(match.name).toBe('Vadivelu');
  });

  it('matches multiple group participants independently with distinct humorous celebrities', () => {
    const participants = [
      {
        participantIndex: 1,
        collection: 'male',
        features: {
          blendshapes: { mouthSmileLeft: 0.92, jawOpen: 0.75, eyeWideLeft: 0.65 },
          ratios: { mouthOpenRatio: 0.55 },
        },
        imageUri: 'data:image/jpeg;base64,mock1',
      },
      {
        participantIndex: 2,
        collection: 'female',
        features: {
          blendshapes: { mouthFrownLeft: 0.92, mouthFrownRight: 0.92, browInnerUp: 0.7 },
          ratios: { mouthCornerTilt: -0.3 },
        },
        imageUri: 'data:image/jpeg;base64,mock2',
      },
      {
        participantIndex: 3,
        collection: 'male',
        features: {
          blendshapes: { eyeWideLeft: 0.95, browOuterUpLeft: 0.8, jawOpen: 0.35 },
          ratios: { eyeOpenRatio: 0.45 },
        },
        imageUri: 'data:image/jpeg;base64,mock3',
      },
    ];

    const results = matchGroupParticipants(participants);
    expect(results).toHaveLength(3);

    // Each participant receives an individual match
    expect(results[0].celebrity).toBeDefined();
    expect(results[1].celebrity).toBeDefined();
    expect(results[2].celebrity).toBeDefined();

    // Verify distinct lookalike assignments across the group
    const celebIds = results.map((r) => r.celebrity.id);
    const uniqueIds = new Set(celebIds);
    expect(uniqueIds.size).toBe(3);

    // Verify collection matching
    expect(results[0].celebrity.gender).toBe('male');
    expect(results[1].celebrity.gender).toBe('female');
    expect(results[2].celebrity.gender).toBe('male');
  });

  it('strictly returns null when userFeatures is null or undefined (no silent fallback to index 0)', () => {
    expect(findClosestCelebrity(null)).toBeNull();
    expect(findClosestCelebrity(undefined)).toBeNull();
    expect(findClosestCelebrity(null, { collection: 'female' })).toBeNull();
    expect(findClosestCelebrity(null, { collection: 'male' })).toBeNull();
  });

  it('correctly maps Aishwarya Rai Bachchan with verified image path and metadata (Bug 2 fix)', () => {
    const ar = FEMALE_CELEBRITIES.find((c) => c.id === 'female_ar_regal');
    expect(ar).toBeDefined();
    expect(ar.name).toBe('Aishwarya Rai Bachchan');
    expect(ar.image).toBe('/assets/LookALike/Female/Aishwarya_Rai/aishwarya_rai_regal_intensity_01.jpg');
    expect(ar.gender).toBe('female');
    expect(ar.badge).toBe('GLOBAL ICON');

    // Matching against regal gaze expression returns Aishwarya Rai Bachchan
    const regalGaze = {
      blendshapes: {
        browDownLeft: 0.7,
        browDownRight: 0.7,
        eyeWideLeft: 0.6,
        eyeWideRight: 0.6,
        mouthPressLeft: 0.5,
        mouthPressRight: 0.5,
      },
      ratios: {
        browRaiseRatio: 0.22,
        eyeOpenRatio: 0.26,
        mouthOpenRatio: 0.03,
      },
    };
    const match = findClosestCelebrity(regalGaze, { collection: 'female' });
    expect(match.name).toBe('Aishwarya Rai Bachchan');
    expect(match.image).toBe('/assets/LookALike/Female/Aishwarya_Rai/aishwarya_rai_regal_intensity_01.jpg');
  });

  it('produces distinct celebrity matches for participants with different expressions (Bug 1 fix)', () => {
    const smileUser = {
      blendshapes: { mouthSmileLeft: 0.9, mouthSmileRight: 0.9, cheekSquintLeft: 0.7, cheekSquintRight: 0.7 },
      ratios: { mouthOpenRatio: 0.22, mouthCornerTilt: 0.18 },
    };
    const shockUser = {
      blendshapes: { jawOpen: 0.85, eyeWideLeft: 0.85, eyeWideRight: 0.85, browInnerUp: 0.8 },
      ratios: { mouthOpenRatio: 0.5, eyeOpenRatio: 0.35 },
    };
    const frownUser = {
      blendshapes: { browDownLeft: 0.85, browDownRight: 0.85, mouthPressLeft: 0.7, mouthPressRight: 0.7 },
      ratios: { mouthOpenRatio: 0.02, mouthCornerTilt: -0.1 },
    };

    // Female collection: 3 different expressions must NOT all return candidate 0
    const femaleMatch1 = findClosestCelebrity(smileUser, { collection: 'female' });
    const femaleMatch2 = findClosestCelebrity(shockUser, { collection: 'female' });
    const femaleMatch3 = findClosestCelebrity(frownUser, { collection: 'female' });

    expect(femaleMatch1).toBeDefined();
    expect(femaleMatch2).toBeDefined();
    expect(femaleMatch3).toBeDefined();
    const femaleSet = new Set([femaleMatch1.id, femaleMatch2.id, femaleMatch3.id]);
    expect(femaleSet.size).toBeGreaterThan(1);

    // Male collection: 3 different expressions must produce diverse matches
    const maleMatch1 = findClosestCelebrity(smileUser, { collection: 'male' });
    const maleMatch2 = findClosestCelebrity(shockUser, { collection: 'male' });
    const maleMatch3 = findClosestCelebrity(frownUser, { collection: 'male' });

    expect(maleMatch1).toBeDefined();
    expect(maleMatch2).toBeDefined();
    expect(maleMatch3).toBeDefined();
    const maleSet = new Set([maleMatch1.id, maleMatch2.id, maleMatch3.id]);
    expect(maleSet.size).toBeGreaterThan(1);
  });
});
