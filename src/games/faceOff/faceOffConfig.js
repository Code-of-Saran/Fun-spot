/**
 * FUN SPOT — FACE OFF: AI EXPRESSION MATCH
 * Configuration, verified challenge definitions, and humorous score titles.
 * Uses reference images from public/assets/Faces.
 */

export const EXPRESSION_CHALLENGES = [
  {
    id: 'mischievous_grin',
    name: 'Mischievous Grin',
    subtitle: 'The Cheerful Rogue',
    actor: 'Ajith',
    filename: 'ajith.jpg',
    image: '/assets/Faces/ajith.jpg',
    format: 'JPEG',
    difficulty: 'EASY',
    themeColor: '#00f0ff',
    badge: 'STAGE 01',
    instructions: 'Flash a wide, mischievous toothy grin and squint your eyes with cheerful amusement!',
    humorousDescription: 'When your prank succeeded and everyone is wondering who did it.',
    referenceStatus: 'verified',
    validationStatus: 'valid',
    targetBlendshapes: {
      mouthSmileLeft: 0.88,
      mouthSmileRight: 0.88,
      jawOpen: 0.45,
      eyeSquintLeft: 0.65,
      eyeSquintRight: 0.65,
      cheekSquintLeft: 0.70,
      cheekSquintRight: 0.70,
      mouthDimpleLeft: 0.40,
      mouthDimpleRight: 0.40,
    },
    targetRatios: {
      mouthOpenRatio: 0.38,
      mouthWidthRatio: 0.78,
      eyeOpenRatio: 0.16,
      mouthCornerTilt: 0.18,
    },
    headPose: {
      yaw: 0.15,
      pitch: 0.0,
      roll: 0.05,
    },
  },
  {
    id: 'shocked_disbelief',
    name: 'Shocked Disbelief',
    subtitle: 'The Stunned Inquisitor',
    actor: 'Kamal Haasan',
    filename: 'kamal-haasan.png',
    image: '/assets/Faces/kamal-haasan.png',
    format: 'WEBP',
    difficulty: 'HARD',
    themeColor: '#ff0055',
    badge: 'STAGE 02',
    instructions: 'Open your eyes wide in shock, drop your jaw open, and stare forward in total disbelief!',
    humorousDescription: 'Looking over your glasses when you see the final unexpected bill.',
    referenceStatus: 'verified',
    validationStatus: 'valid',
    targetBlendshapes: {
      eyeWideLeft: 0.85,
      eyeWideRight: 0.85,
      browInnerUp: 0.75,
      browOuterUpLeft: 0.60,
      browOuterUpRight: 0.60,
      jawOpen: 0.55,
      mouthFunnel: 0.35,
    },
    targetRatios: {
      eyeOpenRatio: 0.36,
      browRaiseRatio: 0.42,
      mouthOpenRatio: 0.40,
      mouthWidthRatio: 0.58,
      mouthCornerTilt: -0.05,
    },
    headPose: {
      yaw: 0.0,
      pitch: 0.15,
      roll: 0.0,
    },
  },
  {
    id: 'furious_shout',
    name: 'Furious Shout',
    subtitle: 'Uncontrolled Intensity',
    actor: 'Redin Kingsley',
    filename: 'Kingsly.png',
    image: '/assets/Faces/Kingsly.png',
    format: 'JPEG',
    difficulty: 'HARD',
    themeColor: '#ff2200',
    badge: 'STAGE 03',
    instructions: 'Furrow both eyebrows deeply, glare with wide eyes, and yell with your mouth wide open!',
    humorousDescription: 'When someone cuts the line right as you reach the very front.',
    referenceStatus: 'verified',
    validationStatus: 'valid',
    targetBlendshapes: {
      browDownLeft: 0.85,
      browDownRight: 0.85,
      jawOpen: 0.85,
      mouthUpperUpLeft: 0.60,
      mouthUpperUpRight: 0.60,
      noseSneerLeft: 0.65,
      noseSneerRight: 0.65,
      eyeWideLeft: 0.60,
      eyeWideRight: 0.60,
    },
    targetRatios: {
      mouthOpenRatio: 0.68,
      browRaiseRatio: 0.18,
      eyeOpenRatio: 0.28,
      mouthCornerTilt: -0.10,
    },
    headPose: {
      yaw: 0.0,
      pitch: -0.05,
      roll: 0.0,
    },
  },
  {
    id: 'dazed_stare',
    name: 'Dazed Blank Stare',
    subtitle: 'Processing Emotion...',
    actor: 'Power Star Srinivasan',
    filename: 'POWER-STAR.jpg',
    image: '/assets/Faces/POWER-STAR.jpg',
    format: 'JPEG',
    difficulty: 'MEDIUM',
    themeColor: '#ffb800',
    badge: 'STAGE 04',
    instructions: 'Relax your eyes into a half-open dazed stare and leave your mouth slightly slack!',
    humorousDescription: 'Waking up from an accidental 4-hour nap not knowing what day it is.',
    referenceStatus: 'verified',
    validationStatus: 'valid',
    targetBlendshapes: {
      jawOpen: 0.35,
      mouthStretchLeft: 0.30,
      mouthStretchRight: 0.30,
      browInnerUp: 0.30,
      eyeBlinkLeft: 0.35,
      eyeBlinkRight: 0.35,
    },
    targetRatios: {
      mouthOpenRatio: 0.22,
      eyeOpenRatio: 0.15,
      browRaiseRatio: 0.28,
      mouthCornerTilt: 0.0,
    },
    headPose: {
      yaw: 0.0,
      pitch: -0.05,
      roll: 0.0,
    },
  },
  {
    id: 'energetic_laughter',
    name: 'Energetic Laughter',
    subtitle: 'The Superstar Smile',
    actor: 'Rajinikanth',
    filename: 'Rajni.jpg',
    image: '/assets/Faces/Rajni.jpg',
    format: 'JPEG',
    difficulty: 'EASY',
    themeColor: '#00ff66',
    badge: 'STAGE 05',
    instructions: 'Flash an energetic, open-mouthed triumphant laugh with wide joyful eyes!',
    humorousDescription: 'When your favorite song drops and the entire room starts cheering.',
    referenceStatus: 'verified',
    validationStatus: 'valid',
    targetBlendshapes: {
      mouthSmileLeft: 0.90,
      mouthSmileRight: 0.90,
      jawOpen: 0.70,
      eyeWideLeft: 0.65,
      eyeWideRight: 0.65,
      cheekPuff: 0.40,
      browInnerUp: 0.50,
    },
    targetRatios: {
      mouthOpenRatio: 0.52,
      mouthWidthRatio: 0.75,
      eyeOpenRatio: 0.28,
      mouthCornerTilt: 0.16,
    },
    headPose: {
      yaw: 0.0,
      pitch: -0.10,
      roll: 0.0,
    },
  },
  {
    id: 'dramatic_pout',
    name: 'Dramatic Pout',
    subtitle: 'Disgusted Melodrama',
    actor: 'Kovai Sarala',
    filename: 'Sarala.jpg',
    image: '/assets/Faces/Sarala.jpg',
    format: 'JPEG',
    difficulty: 'HARD',
    themeColor: '#7000ff',
    badge: 'STAGE 06',
    instructions: 'Pull the corners of your mouth straight down into an exaggerated pout and furrow your chin!',
    humorousDescription: 'When someone offers you sugar-free decaf lukewarm herbal tea.',
    referenceStatus: 'verified',
    validationStatus: 'valid',
    targetBlendshapes: {
      mouthFrownLeft: 0.90,
      mouthFrownRight: 0.90,
      mouthShrugLower: 0.80,
      mouthPucker: 0.45,
      browInnerUp: 0.70,
      browDownLeft: 0.35,
      browDownRight: 0.35,
    },
    targetRatios: {
      mouthOpenRatio: 0.04,
      mouthCornerTilt: -0.32,
      browRaiseRatio: 0.38,
      eyeOpenRatio: 0.22,
    },
    headPose: {
      yaw: -0.05,
      pitch: 0.0,
      roll: 0.0,
    },
  },
  {
    id: 'eyes_closed_stubbornness',
    name: 'Eyes Closed Stubbornness',
    subtitle: 'The Peaceful Ignorer',
    actor: 'Senthil',
    filename: 'Senthil.png',
    image: '/assets/Faces/Senthil.png',
    format: 'AVIF',
    difficulty: 'MEDIUM',
    themeColor: '#ffaa00',
    badge: 'STAGE 07',
    instructions: 'Squeeze both eyes shut, press your lips tightly together, and hold your head completely still!',
    humorousDescription: 'Pretending to be fast asleep when your family asks who forgot to lock the gate.',
    referenceStatus: 'verified',
    validationStatus: 'valid',
    targetBlendshapes: {
      eyeBlinkLeft: 0.95,
      eyeBlinkRight: 0.95,
      mouthPressLeft: 0.75,
      mouthPressRight: 0.75,
      browDownLeft: 0.40,
      browDownRight: 0.40,
    },
    targetRatios: {
      eyeOpenRatio: 0.02,
      mouthOpenRatio: 0.01,
      browRaiseRatio: 0.22,
      mouthCornerTilt: -0.05,
    },
    headPose: {
      yaw: 0.0,
      pitch: 0.05,
      roll: 0.0,
    },
  },
  {
    id: 'startled_surprise',
    name: 'Startled Surprise',
    subtitle: 'The Wide-Eyed Panic',
    actor: 'Soori',
    filename: 'Soori.png',
    image: '/assets/Faces/Soori.png',
    format: 'AVIF',
    difficulty: 'MEDIUM',
    themeColor: '#00f0ff',
    badge: 'STAGE 08',
    instructions: 'Open your eyes as wide as possible, raise both eyebrows high, and part your lips in shock!',
    humorousDescription: 'When you realize you replied-all to the entire company email thread.',
    referenceStatus: 'verified',
    validationStatus: 'valid',
    targetBlendshapes: {
      eyeWideLeft: 0.92,
      eyeWideRight: 0.92,
      browOuterUpLeft: 0.75,
      browOuterUpRight: 0.75,
      browInnerUp: 0.65,
      jawOpen: 0.30,
      mouthFunnel: 0.25,
    },
    targetRatios: {
      eyeOpenRatio: 0.42,
      browRaiseRatio: 0.45,
      mouthOpenRatio: 0.24,
      mouthCornerTilt: 0.0,
    },
    headPose: {
      yaw: 0.0,
      pitch: 0.0,
      roll: 0.0,
    },
  },
  {
    id: 'stern_suspicion',
    name: 'Stern Suspicion',
    subtitle: 'The Kaipulla Glare',
    actor: 'Vadivelu',
    filename: 'Vadivelu.jpg',
    image: '/assets/Faces/Vadivelu.jpg',
    format: 'JPEG',
    difficulty: 'HARD',
    themeColor: '#ff00aa',
    badge: 'STAGE 09',
    instructions: 'Furrow both eyebrows together into a stern V-shape, press your lips tight, and glare suspiciously!',
    humorousDescription: 'When your friend suddenly acts unusually polite and offers to do your chores.',
    referenceStatus: 'verified',
    validationStatus: 'valid',
    targetBlendshapes: {
      browDownLeft: 0.88,
      browDownRight: 0.88,
      mouthPressLeft: 0.70,
      mouthPressRight: 0.70,
      eyeSquintLeft: 0.45,
      eyeSquintRight: 0.45,
      noseSneerLeft: 0.40,
      noseSneerRight: 0.40,
      mouthFrownLeft: 0.35,
      mouthFrownRight: 0.35,
    },
    targetRatios: {
      browRaiseRatio: 0.16,
      mouthOpenRatio: 0.02,
      eyeOpenRatio: 0.20,
      mouthCornerTilt: -0.08,
    },
    headPose: {
      yaw: 0.0,
      pitch: 0.0,
      roll: 0.0,
    },
  },
  {
    id: 'charming_smirk',
    name: 'Charming Smirk',
    subtitle: 'Cool & Confident',
    actor: 'Vijay',
    filename: 'Vijay.jpg',
    image: '/assets/Faces/Vijay.jpg',
    format: 'JPEG',
    difficulty: 'EASY',
    themeColor: '#00e5ff',
    badge: 'STAGE 10',
    instructions: 'Give a confident smirk with a slight upward tilt at the mouth corners and relaxed eyes!',
    humorousDescription: 'When you ace the difficult challenge on your very first try.',
    referenceStatus: 'verified',
    validationStatus: 'valid',
    targetBlendshapes: {
      mouthSmileLeft: 0.65,
      mouthSmileRight: 0.65,
      jawOpen: 0.25,
      mouthDimpleLeft: 0.45,
      mouthDimpleRight: 0.45,
      eyeSquintLeft: 0.25,
      eyeSquintRight: 0.25,
    },
    targetRatios: {
      mouthOpenRatio: 0.18,
      mouthWidthRatio: 0.68,
      eyeOpenRatio: 0.24,
      mouthCornerTilt: 0.12,
    },
    headPose: {
      yaw: 0.08,
      pitch: 0.0,
      roll: -0.04,
    },
  },
];

/** Return verified playable challenges (skips any invalid or rejected challenges) */
export function getVerifiedChallenges() {
  return EXPRESSION_CHALLENGES.filter(
    (c) => c.validationStatus === 'valid' && Boolean(c.image),
  );
}

/** Retrieve challenge by unique ID */
export function getChallenge(id) {
  return EXPRESSION_CHALLENGES.find((c) => c.id === id) || null;
}

export const ROUND_DURATION_SECONDS = 5;
export const DEFAULT_SESSION_ROUNDS = 5;

/** Entertaining result titles categorized by score band */
export const RESULT_TITLES_BY_TIER = {
  PERFECT: [
    'Expression Master',
    'Human Reaction GIF',
    'Mirror Twin',
    'Facial Acting Champion',
    'Pixel-Perfect Clone',
  ],
  EXCELLENT: [
    'Almost a Perfect Copy',
    'Oscar Contender',
    'Side-Eye Specialist',
    'Expression Virtuoso',
    'Broadway Understudy',
  ],
  GOOD: [
    'Solid Mimic',
    'Drama Apprentice',
    'Close Enough For Memes',
    'Emotion.exe Loading...',
    'Honorable Contender',
  ],
  FAIR: [
    'Mildly Resembling',
    'Lost in Translation',
    'Emotion Glitch',
    'Questionable Acting',
    'Abstract Interpretation',
  ],
  LOW: [
    'Emotion.exe Has Stopped',
    'Stone Face Supreme',
    'Completely Unbothered',
    'Expression Not Found (404)',
    'Poker Face Legend',
  ],
};

/** Get match tier and strength label for a 0-100 score */
export function getScoreTier(score) {
  if (score >= 88) {
    return {
      tier: 'PERFECT',
      label: 'PERFECT SYNC',
      color: '#00ff88',
      titles: RESULT_TITLES_BY_TIER.PERFECT,
    };
  }
  if (score >= 72) {
    return {
      tier: 'EXCELLENT',
      label: 'EXCELLENT MATCH',
      color: '#00f0ff',
      titles: RESULT_TITLES_BY_TIER.EXCELLENT,
    };
  }
  if (score >= 55) {
    return {
      tier: 'GOOD',
      label: 'SOLID MIMIC',
      color: '#ffb800',
      titles: RESULT_TITLES_BY_TIER.GOOD,
    };
  }
  if (score >= 35) {
    return {
      tier: 'FAIR',
      label: 'PARTIAL MATCH',
      color: '#ff7700',
      titles: RESULT_TITLES_BY_TIER.FAIR,
    };
  }
  return {
    tier: 'LOW',
    label: 'OFF TARGET',
    color: '#ff0055',
    titles: RESULT_TITLES_BY_TIER.LOW,
  };
}

/** Pick a deterministic or random title for a score & challenge */
export function getResultTitle(score, challengeId = '') {
  const { titles } = getScoreTier(score);
  const hash = Math.abs(
    String(challengeId)
      .split('')
      .reduce((acc, c) => acc + c.charCodeAt(0), Math.round(score)),
  );
  return titles[hash % titles.length];
}
