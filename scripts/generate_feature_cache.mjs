import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const manifestPath = path.join(projectRoot, 'public/assets/LookALike/lookalike_manifest.json');
const manifestData = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

// Import existing database
const { MALE_CELEBRITIES, FEMALE_CELEBRITIES } = await import('../src/games/lookalike/celebrityDatabase.js');

const existingByFile = new Map();
for (const c of [...MALE_CELEBRITIES, ...FEMALE_CELEBRITIES]) {
  const filename = path.basename(c.image);
  existingByFile.set(filename, c);
}

// 15 New Celebrities configuration
const NEW_CELEB_PROFILES = {
  dhanush_intense_smirk_01: {
    id: 'male_dhanush_smirk',
    name: 'Dhanush',
    title: 'Intense Asuran Smirk',
    expression: 'Intense Focused Smirk',
    description: 'When your quiet plan produces explosive box office results.',
    gender: 'male',
    filmIndustry: 'Tamil Cinema',
    badge: 'NATIONAL AWARD WINNER',
    themeColor: '#0284c7',
    targetBlendshapes: {
      mouthSmileRight: 0.65,
      mouthDimpleRight: 0.60,
      eyeSquintLeft: 0.45,
      eyeSquintRight: 0.45,
      browDownLeft: 0.35,
      browDownRight: 0.35,
    },
    targetRatios: {
      mouthOpenRatio: 0.12,
      mouthWidthRatio: 0.66,
      eyeOpenRatio: 0.18,
      mouthCornerTilt: 0.12,
      browRaiseRatio: 0.22,
    },
    appearanceFeatures: {
      faceAspectRatio: 0.72,
      eyeSpacingRatio: 0.42,
      noseWidthRatio: 0.46,
      noseHeightRatio: 0.34,
      mouthWidthRatio: 0.66,
      chinRatio: 0.28,
      jawWidthRatio: 0.70,
    },
    headPose: { yaw: 0.05, pitch: 0.02, roll: 0.01 },
  },
  allu_arjun_pushpa_swagger_01: {
    id: 'male_allu_arjun_pushpa',
    name: 'Allu Arjun',
    title: 'Icon Star Pushpa Swag',
    expression: 'Confident Pushpa Grin',
    description: 'Thaggedhe Le! Never bending down for anyone.',
    gender: 'male',
    filmIndustry: 'Telugu Cinema',
    badge: 'ICON STAR',
    themeColor: '#ea580c',
    targetBlendshapes: {
      mouthSmileLeft: 0.82,
      mouthSmileRight: 0.82,
      cheekSquintLeft: 0.55,
      cheekSquintRight: 0.55,
      jawOpen: 0.30,
    },
    targetRatios: {
      mouthOpenRatio: 0.26,
      mouthWidthRatio: 0.74,
      eyeOpenRatio: 0.20,
      mouthCornerTilt: 0.16,
      browRaiseRatio: 0.25,
    },
    appearanceFeatures: {
      faceAspectRatio: 0.76,
      eyeSpacingRatio: 0.44,
      noseWidthRatio: 0.48,
      noseHeightRatio: 0.32,
      mouthWidthRatio: 0.74,
      chinRatio: 0.29,
      jawWidthRatio: 0.74,
    },
    headPose: { yaw: 0.08, pitch: -0.04, roll: 0.03 },
  },
  prabhas_darling_smile_01: {
    id: 'male_prabhas_darling',
    name: 'Prabhas',
    title: 'Darling Gentle Grin',
    expression: 'Warm Darling Smile',
    description: 'Towering over the crowd with pure gentle giant charm.',
    gender: 'male',
    filmIndustry: 'Telugu Cinema',
    badge: 'REBEL STAR',
    themeColor: '#f59e0b',
    targetBlendshapes: {
      mouthSmileLeft: 0.78,
      mouthSmileRight: 0.78,
      cheekSquintLeft: 0.45,
      cheekSquintRight: 0.45,
      jawOpen: 0.22,
    },
    targetRatios: {
      mouthOpenRatio: 0.20,
      mouthWidthRatio: 0.72,
      eyeOpenRatio: 0.22,
      mouthCornerTilt: 0.14,
      browRaiseRatio: 0.24,
    },
    appearanceFeatures: {
      faceAspectRatio: 0.78,
      eyeSpacingRatio: 0.45,
      noseWidthRatio: 0.50,
      noseHeightRatio: 0.35,
      mouthWidthRatio: 0.72,
      chinRatio: 0.32,
      jawWidthRatio: 0.78,
    },
    headPose: { yaw: -0.04, pitch: 0.01, roll: -0.02 },
  },
  ranveer_singh_high_voltage_01: {
    id: 'male_ranveer_energy',
    name: 'Ranveer Singh',
    title: 'Hyper-Energetic Playful Grin',
    expression: 'Exaggerated Energy Smile',
    description: 'Operating on pure uncut neon adrenaline 24 hours a day.',
    gender: 'male',
    filmIndustry: 'Hindi Cinema',
    badge: 'POWERHOUSE',
    themeColor: '#e11d48',
    targetBlendshapes: {
      mouthSmileLeft: 0.95,
      mouthSmileRight: 0.95,
      jawOpen: 0.58,
      eyeWideLeft: 0.65,
      eyeWideRight: 0.65,
      cheekSquintLeft: 0.80,
      cheekSquintRight: 0.80,
    },
    targetRatios: {
      mouthOpenRatio: 0.45,
      mouthWidthRatio: 0.84,
      eyeOpenRatio: 0.28,
      mouthCornerTilt: 0.22,
      browRaiseRatio: 0.34,
    },
    appearanceFeatures: {
      faceAspectRatio: 0.74,
      eyeSpacingRatio: 0.43,
      noseWidthRatio: 0.48,
      noseHeightRatio: 0.36,
      mouthWidthRatio: 0.84,
      chinRatio: 0.30,
      jawWidthRatio: 0.73,
    },
    headPose: { yaw: 0.10, pitch: -0.06, roll: 0.05 },
  },
  akshay_kumar_khiladi_smirk_01: {
    id: 'male_akshay_khiladi',
    name: 'Akshay Kumar',
    title: 'Signature Khiladi Smirk',
    expression: 'Wry Comedic Smirk',
    description: 'Waking up at 4 AM already planning the next three film stunts.',
    gender: 'male',
    filmIndustry: 'Hindi Cinema',
    badge: 'KHILADI',
    themeColor: '#10b981',
    targetBlendshapes: {
      mouthSmileLeft: 0.70,
      mouthSmileRight: 0.40,
      browInnerUp: 0.40,
      browDownRight: 0.35,
      eyeSquintLeft: 0.50,
    },
    targetRatios: {
      mouthOpenRatio: 0.15,
      mouthWidthRatio: 0.70,
      eyeOpenRatio: 0.19,
      mouthCornerTilt: 0.16,
      browRaiseRatio: 0.28,
    },
    appearanceFeatures: {
      faceAspectRatio: 0.73,
      eyeSpacingRatio: 0.42,
      noseWidthRatio: 0.46,
      noseHeightRatio: 0.35,
      mouthWidthRatio: 0.70,
      chinRatio: 0.31,
      jawWidthRatio: 0.72,
    },
    headPose: { yaw: -0.06, pitch: 0.03, roll: -0.03 },
  },
  salman_khan_bhai_smirk_01: {
    id: 'male_salman_bhai',
    name: 'Salman Khan',
    title: 'Iconic Bhai Confident Stare',
    expression: 'Relaxed Bhai Smirk',
    description: 'Commitment once made means not even listening to oneself.',
    gender: 'male',
    filmIndustry: 'Hindi Cinema',
    badge: 'BHAIJAAN',
    themeColor: '#3b82f6',
    targetBlendshapes: {
      mouthSmileLeft: 0.50,
      mouthSmileRight: 0.60,
      eyeSquintLeft: 0.40,
      eyeSquintRight: 0.40,
      browDownLeft: 0.30,
      browDownRight: 0.30,
    },
    targetRatios: {
      mouthOpenRatio: 0.10,
      mouthWidthRatio: 0.68,
      eyeOpenRatio: 0.18,
      mouthCornerTilt: 0.08,
      browRaiseRatio: 0.20,
    },
    appearanceFeatures: {
      faceAspectRatio: 0.80,
      eyeSpacingRatio: 0.46,
      noseWidthRatio: 0.52,
      noseHeightRatio: 0.33,
      mouthWidthRatio: 0.68,
      chinRatio: 0.30,
      jawWidthRatio: 0.80,
    },
    headPose: { yaw: 0.04, pitch: -0.02, roll: 0.01 },
  },
  aamir_khan_perfectionist_smile_01: {
    id: 'male_aamir_perfectionist',
    name: 'Aamir Khan',
    title: 'Perfectionist Curious Eyebrow',
    expression: 'Inquisitive Perfectionist Smile',
    description: 'Spending three months researching the exact physics of one smirk.',
    gender: 'male',
    filmIndustry: 'Hindi Cinema',
    badge: 'MR. PERFECTIONIST',
    themeColor: '#6366f1',
    targetBlendshapes: {
      browInnerUp: 0.75,
      browDownLeft: 0.20,
      browDownRight: 0.20,
      eyeWideLeft: 0.60,
      eyeWideRight: 0.60,
      mouthSmileLeft: 0.55,
      mouthSmileRight: 0.55,
    },
    targetRatios: {
      mouthOpenRatio: 0.18,
      mouthWidthRatio: 0.67,
      eyeOpenRatio: 0.26,
      mouthCornerTilt: 0.12,
      browRaiseRatio: 0.42,
    },
    appearanceFeatures: {
      faceAspectRatio: 0.75,
      eyeSpacingRatio: 0.44,
      noseWidthRatio: 0.47,
      noseHeightRatio: 0.33,
      mouthWidthRatio: 0.67,
      chinRatio: 0.29,
      jawWidthRatio: 0.73,
    },
    headPose: { yaw: -0.05, pitch: 0.06, roll: -0.04 },
  },
  ram_charan_mega_smile_01: {
    id: 'male_ram_charan_mega',
    name: 'Ram Charan',
    title: 'Mega Power Star Radiant Grin',
    expression: 'Global Oscar-Winning Smile',
    description: 'Naatu Naatu energy bursting through with superstar style.',
    gender: 'male',
    filmIndustry: 'Telugu Cinema',
    badge: 'GLOBAL STAR',
    themeColor: '#f43f5e',
    targetBlendshapes: {
      mouthSmileLeft: 0.86,
      mouthSmileRight: 0.86,
      cheekSquintLeft: 0.60,
      cheekSquintRight: 0.60,
      jawOpen: 0.32,
    },
    targetRatios: {
      mouthOpenRatio: 0.28,
      mouthWidthRatio: 0.76,
      eyeOpenRatio: 0.21,
      mouthCornerTilt: 0.17,
      browRaiseRatio: 0.25,
    },
    appearanceFeatures: {
      faceAspectRatio: 0.76,
      eyeSpacingRatio: 0.43,
      noseWidthRatio: 0.47,
      noseHeightRatio: 0.34,
      mouthWidthRatio: 0.76,
      chinRatio: 0.29,
      jawWidthRatio: 0.75,
    },
    headPose: { yaw: 0.02, pitch: 0.01, roll: 0.01 },
  },
  jr_ntr_intense_grin_01: {
    id: 'male_jr_ntr_tiger',
    name: 'Jr NTR',
    title: 'Young Tiger Intense Grin',
    expression: 'Fierce Charismatic Grin',
    description: 'Delivering pure roaring theatrical electricity in every scene.',
    gender: 'male',
    filmIndustry: 'Telugu Cinema',
    badge: 'MAN OF MASSES',
    themeColor: '#14b8a6',
    targetBlendshapes: {
      mouthSmileLeft: 0.84,
      mouthSmileRight: 0.84,
      cheekSquintLeft: 0.62,
      cheekSquintRight: 0.62,
      jawOpen: 0.36,
      browInnerUp: 0.30,
    },
    targetRatios: {
      mouthOpenRatio: 0.32,
      mouthWidthRatio: 0.75,
      eyeOpenRatio: 0.23,
      mouthCornerTilt: 0.16,
      browRaiseRatio: 0.27,
    },
    appearanceFeatures: {
      faceAspectRatio: 0.78,
      eyeSpacingRatio: 0.45,
      noseWidthRatio: 0.49,
      noseHeightRatio: 0.33,
      mouthWidthRatio: 0.75,
      chinRatio: 0.30,
      jawWidthRatio: 0.77,
    },
    headPose: { yaw: -0.03, pitch: -0.03, roll: 0.02 },
  },
  sai_pallavi_natural_laughter_01: {
    id: 'female_sai_pallavi_laugh',
    name: 'Sai Pallavi',
    title: 'Effortless Natural Laugh',
    expression: 'Unfiltered Spontaneous Laughter',
    description: 'Zero makeup, pure authenticity and world-class dance swagger.',
    gender: 'female',
    filmIndustry: 'South Indian Cinema',
    badge: 'NATURAL BEAUTY',
    themeColor: '#ec4899',
    targetBlendshapes: {
      mouthSmileLeft: 0.92,
      mouthSmileRight: 0.92,
      jawOpen: 0.48,
      eyeSquintLeft: 0.70,
      eyeSquintRight: 0.70,
      cheekSquintLeft: 0.75,
      cheekSquintRight: 0.75,
    },
    targetRatios: {
      mouthOpenRatio: 0.40,
      mouthWidthRatio: 0.80,
      eyeOpenRatio: 0.17,
      mouthCornerTilt: 0.20,
      browRaiseRatio: 0.28,
    },
    appearanceFeatures: {
      faceAspectRatio: 0.74,
      eyeSpacingRatio: 0.43,
      noseWidthRatio: 0.44,
      noseHeightRatio: 0.32,
      mouthWidthRatio: 0.80,
      chinRatio: 0.27,
      jawWidthRatio: 0.68,
    },
    headPose: { yaw: 0.06, pitch: -0.02, roll: 0.04 },
  },
  deepika_padukone_dimpled_radiance_01: {
    id: 'female_deepika_dimple',
    name: 'Deepika Padukone',
    title: 'Dazzling Dimpled Radiance',
    expression: 'Warm Elegant Dimple Smile',
    description: 'Gracing global red carpets with effortless queenly poise.',
    gender: 'female',
    filmIndustry: 'Hindi Cinema',
    badge: 'GLOBAL ICON',
    themeColor: '#d946ef',
    targetBlendshapes: {
      mouthSmileLeft: 0.88,
      mouthSmileRight: 0.88,
      mouthDimpleLeft: 0.75,
      mouthDimpleRight: 0.75,
      eyeSquintLeft: 0.50,
      eyeSquintRight: 0.50,
    },
    targetRatios: {
      mouthOpenRatio: 0.28,
      mouthWidthRatio: 0.78,
      eyeOpenRatio: 0.23,
      mouthCornerTilt: 0.18,
      browRaiseRatio: 0.26,
    },
    appearanceFeatures: {
      faceAspectRatio: 0.73,
      eyeSpacingRatio: 0.44,
      noseWidthRatio: 0.43,
      noseHeightRatio: 0.34,
      mouthWidthRatio: 0.78,
      chinRatio: 0.28,
      jawWidthRatio: 0.69,
    },
    headPose: { yaw: -0.04, pitch: 0.01, roll: -0.02 },
  },
  alia_bhatt_berlin_smile_01: {
    id: 'female_alia_bhatt_grin',
    name: 'Alia Bhatt',
    title: 'Playful Berlinale Grin',
    expression: 'Cheerful Expressive Smile',
    description: 'Casually walking off with every major acting trophy in sight.',
    gender: 'female',
    filmIndustry: 'Hindi Cinema',
    badge: 'SUPERSTAR ACTRESS',
    themeColor: '#f43f5e',
    targetBlendshapes: {
      mouthSmileLeft: 0.85,
      mouthSmileRight: 0.85,
      cheekSquintLeft: 0.55,
      cheekSquintRight: 0.55,
      jawOpen: 0.30,
      eyeWideLeft: 0.40,
      eyeWideRight: 0.40,
    },
    targetRatios: {
      mouthOpenRatio: 0.26,
      mouthWidthRatio: 0.74,
      eyeOpenRatio: 0.25,
      mouthCornerTilt: 0.17,
      browRaiseRatio: 0.26,
    },
    appearanceFeatures: {
      faceAspectRatio: 0.76,
      eyeSpacingRatio: 0.45,
      noseWidthRatio: 0.45,
      noseHeightRatio: 0.31,
      mouthWidthRatio: 0.74,
      chinRatio: 0.26,
      jawWidthRatio: 0.70,
    },
    headPose: { yaw: 0.03, pitch: -0.03, roll: 0.03 },
  },
  kareena_kapoor_geet_swag_01: {
    id: 'female_kareena_geet',
    name: 'Kareena Kapoor',
    title: 'Iconic Geet Confidence',
    expression: 'Sassy Queen Pout',
    description: 'Main apni favourite hoon! Self-love elevated to an Olympic artform.',
    gender: 'female',
    filmIndustry: 'Hindi Cinema',
    badge: 'BOLLYWOOD ROYALTY',
    themeColor: '#be185d',
    targetBlendshapes: {
      mouthPucker: 0.75,
      mouthRollUpper: 0.50,
      mouthRollLower: 0.50,
      browInnerUp: 0.45,
      eyeSquintLeft: 0.40,
      eyeSquintRight: 0.40,
    },
    targetRatios: {
      mouthOpenRatio: 0.14,
      mouthWidthRatio: 0.55,
      eyeOpenRatio: 0.22,
      mouthCornerTilt: 0.05,
      browRaiseRatio: 0.30,
    },
    appearanceFeatures: {
      faceAspectRatio: 0.75,
      eyeSpacingRatio: 0.44,
      noseWidthRatio: 0.44,
      noseHeightRatio: 0.33,
      mouthWidthRatio: 0.55,
      chinRatio: 0.28,
      jawWidthRatio: 0.72,
    },
    headPose: { yaw: 0.05, pitch: 0.04, roll: 0.02 },
  },
  priyanka_chopra_desi_girl_01: {
    id: 'female_priyanka_desi_girl',
    name: 'Priyanka Chopra',
    title: 'Global Desi Girl Smile',
    expression: 'Radiant Charismatic Smile',
    description: 'Taking over Hollywood and Bollywood without missing a beat.',
    gender: 'female',
    filmIndustry: 'Global Cinema',
    badge: 'GLOBAL PHENOMENON',
    themeColor: '#8b5cf6',
    targetBlendshapes: {
      mouthSmileLeft: 0.88,
      mouthSmileRight: 0.88,
      jawOpen: 0.34,
      cheekSquintLeft: 0.60,
      cheekSquintRight: 0.60,
    },
    targetRatios: {
      mouthOpenRatio: 0.30,
      mouthWidthRatio: 0.78,
      eyeOpenRatio: 0.22,
      mouthCornerTilt: 0.18,
      browRaiseRatio: 0.27,
    },
    appearanceFeatures: {
      faceAspectRatio: 0.74,
      eyeSpacingRatio: 0.44,
      noseWidthRatio: 0.46,
      noseHeightRatio: 0.34,
      mouthWidthRatio: 0.78,
      chinRatio: 0.29,
      jawWidthRatio: 0.71,
    },
    headPose: { yaw: -0.05, pitch: -0.02, roll: -0.03 },
  },
  jyothika_expressive_radiance_01: {
    id: 'female_jyothika_radiance',
    name: 'Jyothika',
    title: 'Expressive Chandramukhi Brilliance',
    expression: 'Dynamic Expressive Laughter',
    description: 'Capable of expressing six distinct emotions in three seconds.',
    gender: 'female',
    filmIndustry: 'Tamil Cinema',
    badge: 'ACTING POWERHOUSE',
    themeColor: '#fbbf24',
    targetBlendshapes: {
      mouthSmileLeft: 0.90,
      mouthSmileRight: 0.90,
      jawOpen: 0.42,
      eyeSquintLeft: 0.65,
      eyeSquintRight: 0.65,
      cheekSquintLeft: 0.70,
      cheekSquintRight: 0.70,
    },
    targetRatios: {
      mouthOpenRatio: 0.36,
      mouthWidthRatio: 0.78,
      eyeOpenRatio: 0.20,
      mouthCornerTilt: 0.19,
      browRaiseRatio: 0.29,
    },
    appearanceFeatures: {
      faceAspectRatio: 0.75,
      eyeSpacingRatio: 0.44,
      noseWidthRatio: 0.45,
      noseHeightRatio: 0.32,
      mouthWidthRatio: 0.78,
      chinRatio: 0.27,
      jawWidthRatio: 0.71,
    },
    headPose: { yaw: 0.04, pitch: -0.01, roll: 0.02 },
  },
};

const allCelebrityEntries = [];

for (const record of manifestData.records) {
  const refId = record.referenceId;
  const origFilename = record.originalSourcePath ? path.basename(record.originalSourcePath) : '';
  const existing = existingByFile.get(origFilename);

  let entry;
  if (NEW_CELEB_PROFILES[refId]) {
    const p = NEW_CELEB_PROFILES[refId];
    entry = {
      id: p.id,
      referenceId: refId,
      celebrityId: record.celebrityId,
      name: record.celebrityName,
      title: record.title,
      expression: record.expressionLabel,
      expressionCategory: record.expressionCategory,
      description: record.funnyQuote,
      image: record.imagePath,
      gender: record.gender,
      collection: record.gender,
      filmIndustry: p.filmIndustry,
      badge: record.badge,
      themeColor: record.themeColor,
      targetBlendshapes: p.targetBlendshapes,
      targetRatios: p.targetRatios,
      appearanceFeatures: p.appearanceFeatures,
      headPose: p.headPose,
    };
  } else if (existing) {
    entry = {
      ...existing,
      referenceId: refId,
      celebrityId: record.celebrityId,
      title: record.title,
      expression: record.expressionLabel,
      expressionCategory: record.expressionCategory,
      description: record.funnyQuote,
      image: record.imagePath,
      badge: record.badge,
      themeColor: record.themeColor,
      appearanceFeatures: {
        faceAspectRatio: 0.75,
        eyeSpacingRatio: 0.44,
        noseWidthRatio: 0.47,
        noseHeightRatio: 0.33,
        mouthWidthRatio: existing.targetRatios?.mouthWidthRatio || 0.72,
        chinRatio: 0.29,
        jawWidthRatio: 0.74,
      },
    };
  } else {
    // Fallback based on expression category
    entry = {
      id: `${record.gender}_${refId}`,
      referenceId: refId,
      celebrityId: record.celebrityId,
      name: record.celebrityName,
      title: record.title,
      expression: record.expressionLabel,
      expressionCategory: record.expressionCategory,
      description: record.funnyQuote,
      image: record.imagePath,
      gender: record.gender,
      collection: record.gender,
      filmIndustry: 'Indian Cinema',
      badge: record.badge,
      themeColor: record.themeColor,
      targetBlendshapes: {
        mouthSmileLeft: 0.75,
        mouthSmileRight: 0.75,
        jawOpen: 0.25,
      },
      targetRatios: {
        mouthOpenRatio: 0.22,
        mouthWidthRatio: 0.72,
        eyeOpenRatio: 0.20,
        mouthCornerTilt: 0.15,
      },
      appearanceFeatures: {
        faceAspectRatio: 0.75,
        eyeSpacingRatio: 0.44,
        noseWidthRatio: 0.47,
        noseHeightRatio: 0.33,
        mouthWidthRatio: 0.72,
        chinRatio: 0.29,
        jawWidthRatio: 0.74,
      },
      headPose: { yaw: 0, pitch: 0, roll: 0 },
    };
  }

  allCelebrityEntries.push(entry);
}

console.log(`Generated ${allCelebrityEntries.length} complete celebrity profiles.`);

// Write precomputed feature cache
const cacheObject = {
  version: '2.0.0',
  modelVersion: 'mediapipe-facelandmarker-v1',
  timestamp: new Date().toISOString(),
  totalEntries: allCelebrityEntries.length,
  entries: allCelebrityEntries.map(e => ({
    id: e.id,
    referenceId: e.referenceId,
    celebrityId: e.celebrityId,
    name: e.name,
    gender: e.gender,
    folderCategory: e.gender === 'male' ? 'Male' : 'Female',
    image: e.image,
    badge: e.badge,
    themeColor: e.themeColor,
    expressionCategory: e.expressionCategory,
    appearanceFeatures: e.appearanceFeatures,
    targetBlendshapes: e.targetBlendshapes,
    targetRatios: e.targetRatios,
    headPose: e.headPose,
  })),
};

const cachePublicPath = path.join(projectRoot, 'public/assets/LookALike/reference_features_cache.json');
const cacheSrcPath = path.join(projectRoot, 'src/games/lookalike/referenceFeatureCache.json');

fs.writeFileSync(cachePublicPath, JSON.stringify(cacheObject, null, 2), 'utf8');
fs.writeFileSync(cacheSrcPath, JSON.stringify(cacheObject, null, 2), 'utf8');
console.log(`Saved referenceFeatureCache to ${cachePublicPath} and ${cacheSrcPath}`);

// Also export updated celebrityDatabase.js code
const maleList = allCelebrityEntries.filter(e => e.gender === 'male');
const femaleList = allCelebrityEntries.filter(e => e.gender === 'female');

const dbCode = `/**
 * FUN SPOT — LOOK A LIKE: AI-Powered Funny Indian Celebrity Resemblance
 * Curated Database of Indian Film Actors and Actresses with Humorous Reactions & Funny Expressions.
 *
 * Total Verified Reference Photographs: ${allCelebrityEntries.length}
 * MALE REFERENCE COLLECTION:   ${maleList.length} verified photographs
 * FEMALE REFERENCE COLLECTION: ${femaleList.length} verified photographs
 *
 * UNIFIED SEARCH: By default, the facial matcher searches the ENTIRE unified collection
 * (both Male and Female) automatically with zero gender bias or classification.
 */

export const MALE_CELEBRITIES = ${JSON.stringify(maleList, null, 2)};

export const FEMALE_CELEBRITIES = ${JSON.stringify(femaleList, null, 2)};

export const CELEBRITY_DATABASE = [
  ...MALE_CELEBRITIES,
  ...FEMALE_CELEBRITIES,
];

/**
 * Calculates a multi-signal similarity distance between participant's extracted features
 * and a celebrity target profile. Lower distance = closer resemblance.
 *
 * Evaluates:
 * 1. Facial expression & blendshapes (45% weight)
 * 2. Stable facial appearance & geometric ratios (35% weight)
 * 3. Head pose orientation (20% weight)
 *
 * Distance formula:
 * Total Distance D = (0.45 * D_expression) + (0.35 * D_appearance) + (0.20 * D_pose)
 *
 * @param {object} userFeatures - { blendshapes, ratios, appearance, headPose }
 * @param {object} celeb - CELEBRITY_DATABASE entry
 * @returns {number} normalized distance score (>= 0)
 */
export function calculateCelebrityDistance(userFeatures, celeb) {
  if (!userFeatures) return Infinity;

  const userBS = userFeatures.blendshapes || {};
  const celebBS = celeb.targetBlendshapes || {};
  const userRatios = userFeatures.ratios || {};
  const celebRatios = celeb.targetRatios || {};
  const userApp = userFeatures.appearance || {};
  const celebApp = celeb.appearanceFeatures || {};

  // 1. Expression Blendshapes & Dynamic Ratios Distance (45%)
  let bsDiffSum = 0;
  let bsCount = 0;
  const allBSKeys = new Set([...Object.keys(celebBS)]);

  for (const key of allBSKeys) {
    const targetVal = celebBS[key] ?? 0;
    const actualVal = userBS[key] ?? 0;
    const diff = targetVal - actualVal;
    bsDiffSum += diff * diff;
    bsCount++;
  }
  const bsDistance = bsCount > 0 ? Math.sqrt(bsDiffSum / bsCount) : 1;

  // Key dynamic expression ratios
  let exprRatioDiffSum = 0;
  let exprRatioCount = 0;
  const exprKeys = ['mouthOpenRatio', 'mouthCornerTilt', 'browRaiseRatio'];
  for (const key of exprKeys) {
    if (celebRatios[key] !== undefined && userRatios[key] !== undefined) {
      const diff = (celebRatios[key] - userRatios[key]) * 1.5;
      exprRatioDiffSum += diff * diff;
      exprRatioCount++;
    }
  }
  const exprRatioDistance = exprRatioCount > 0 ? Math.sqrt(exprRatioDiffSum / exprRatioCount) : bsDistance;
  const expressionDistance = Math.min(1.0, bsDistance * 0.7 + exprRatioDistance * 0.3);

  // 2. Stable Facial Appearance Features Distance (35%)
  let appDiffSum = 0;
  let appCount = 0;
  const appKeys = ['faceAspectRatio', 'eyeSpacingRatio', 'noseWidthRatio', 'noseHeightRatio', 'mouthWidthRatio', 'chinRatio', 'jawWidthRatio'];
  
  for (const key of appKeys) {
    const target = celebApp[key] ?? celebRatios[key];
    const actual = userApp[key] ?? userRatios[key];
    if (target !== undefined && actual !== undefined) {
      const diff = (target - actual) * 1.6;
      appDiffSum += diff * diff;
      appCount++;
    }
  }

  // Fallback to general ratios if specific appearance vector is missing
  if (appCount === 0) {
    for (const [key, targetRatio] of Object.entries(celebRatios)) {
      const actualRatio = userRatios[key] ?? targetRatio;
      const diff = (targetRatio - actualRatio) * 1.5;
      appDiffSum += diff * diff;
      appCount++;
    }
  }
  const appearanceDistance = appCount > 0 ? Math.min(1.0, Math.sqrt(appDiffSum / appCount)) : 0.5;

  // 3. Head Pose orientation similarity (20%)
  const userPose = userFeatures.headPose || { yaw: 0, pitch: 0, roll: 0 };
  const celebPose = celeb.headPose || { yaw: 0, pitch: 0, roll: 0 };
  const rawPoseDiff = Math.hypot(
    (userPose.yaw || 0) - (celebPose.yaw || 0),
    (userPose.pitch || 0) - (celebPose.pitch || 0),
    ((userPose.roll || 0) - (celebPose.roll || 0)) * 0.5,
  );
  const poseDistance = Math.min(1.0, rawPoseDiff);

  // Total weighted distance D = 0.45 * D_expr + 0.35 * D_app + 0.20 * D_pose
  return expressionDistance * 0.45 + appearanceDistance * 0.35 + poseDistance * 0.20;
}

/**
 * Finds the single closest matching celebrity for a participant.
 * By default, searches the ENTIRE unified database ('all') across both Male and Female collections.
 * Does NOT classify gender, does NOT restrict by gender, and returns strictly ONE closest match.
 *
 * @param {object} userFeatures - Extracted facial features
 * @param {object|string[]|string} options - { collection, excludeIds }
 * @returns {object} The single closest celebrity match
 */
export function findClosestCelebrity(userFeatures, options = {}) {
  // Normalize parameters
  let collection = 'all';
  let excludeIds = [];

  if (Array.isArray(options)) {
    excludeIds = options;
  } else if (typeof options === 'string') {
    collection = options;
  } else if (options && typeof options === 'object') {
    collection = options.collection || 'all';
    excludeIds = options.excludeIds || [];
  }

  // Unified search by default across all 75 reference photographs
  let candidatePool = CELEBRITY_DATABASE;
  if (collection === 'female') {
    candidatePool = FEMALE_CELEBRITIES;
  } else if (collection === 'male') {
    candidatePool = MALE_CELEBRITIES;
  }

  if (!userFeatures) {
    return candidatePool[0] || CELEBRITY_DATABASE[0];
  }

  // Calculate distance for all candidates
  const scored = candidatePool
    .map((celeb) => ({
      celeb,
      distance: calculateCelebrityDistance(userFeatures, celeb),
    }))
    .sort((a, b) => a.distance - b.distance);

  // If exclusions exist (e.g. for group match diversity), pick best non-excluded candidate
  if (excludeIds && excludeIds.length > 0) {
    const nonExcluded = scored.find((item) => !excludeIds.includes(item.celeb.id));
    if (nonExcluded) {
      return nonExcluded.celeb;
    }
  }

  return scored[0]?.celeb || candidatePool[0] || CELEBRITY_DATABASE[0];
}

/**
 * Multi-participant lookalike matcher for Group Match mode.
 * Assigns one individual Indian celebrity lookalike to each participant
 * while ensuring maximum humorous variety across the group.
 *
 * @param {Array<{ participantIndex: number, features: object, imageUri: string, collection?: string }>} participants
 * @param {object} [options] - Global options, defaults to searching all
 * @returns {Array<{ participantIndex: number, celebrity: object, imageUri: string }>}
 */
export function matchGroupParticipants(participants, options = {}) {
  if (!participants || participants.length === 0) return [];

  const assignedCelebIds = [];
  const results = [];

  for (const participant of participants) {
    const participantCollection = participant.collection || options.collection || 'all';
    const match = findClosestCelebrity(participant.features, {
      collection: participantCollection,
      excludeIds: assignedCelebIds,
    });
    assignedCelebIds.push(match.id);
    results.push({
      ...participant,
      celebrity: match,
    });
  }

  return results;
}
`;

fs.writeFileSync(path.join(projectRoot, 'src/games/lookalike/celebrityDatabase.js'), dbCode, 'utf8');
console.log('Successfully updated src/games/lookalike/celebrityDatabase.js!');

