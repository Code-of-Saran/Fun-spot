/**
 * Centralized 3D Asset Manifest for Fun Spot — Character Transformation.
 *
 * Only references the 10 real GLB files that physically exist in:
 *   public/assets/3D models/
 *
 * Classifications:
 *   FULL_RIGGED       — Standard humanoid skeleton; live pose retargeting works.
 *   FULL_ADAPTATION   — Full body mesh; anchored to participant torso (no retarget).
 *   INCOMPATIBLE      — Non-standard bone names; cannot be retargeted; not playable.
 */

const BASE_URL = (typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL) || '/';
const MODEL_BASE_URL = `${BASE_URL}assets/3D%20models`;

export const ASSET_CLASSIFICATION = {
  FULL_RIGGED: 'full_rigged',         // Standard humanoid skeleton; live pose retargeting works
  FULL_ADAPTATION: 'full_adaptation', // Full body mesh; anchored to torso, no retarget
  INCOMPATIBLE: 'incompatible',       // Non-standard bone names; not playable
};

export const MODEL_CLASSIFICATIONS = ASSET_CLASSIFICATION;

// Backward-compatibility aliases for legacy code
export const ASSET_STATUS = {
  VERIFIED_RIGGED: ASSET_CLASSIFICATION.FULL_RIGGED,
  VERIFIED_MESH: ASSET_CLASSIFICATION.FULL_ADAPTATION,
  CLOTHING_ONLY: ASSET_CLASSIFICATION.FULL_ADAPTATION,
  ACCESSORY_ONLY: ASSET_CLASSIFICATION.INCOMPATIBLE,
  MODEL_REQUIRED: ASSET_CLASSIFICATION.INCOMPATIBLE,
};

/**
 * The 8 approved real GLB files on disk mapped to their exact filenames in public/assets/3D models/.
 *
 * Exactly 8 approved models:
 *   1. deadpool:  deadpool_-_marvel_rivals.glb
 *   2. gigante:   gigante_grandao_waybig_-ben_10.glb
 *   3. hinata:    hinata.glb
 *   4. iron-man:  iron-man_mark_7.glb
 *   5. spiderman: spiderman_brand_new_day.glb
 *   6. swampfire: swampfire_ben_10-_fully_rigged.glb
 *   7. batman:    the_batman_suit_-_textured_and_rigged.glb
 *   8. wolverine: wolverinetexturedrigged.glb
 */
export const CHARACTER_MODELS = {
  // ── 1. Deadpool ──────────────────────────────────────────────────────────
  'deadpool': {
    id: 'deadpool',
    name: 'Deadpool',
    modelFile: 'deadpool_-_marvel_rivals.glb',
    file: 'deadpool_-_marvel_rivals.glb',
    modelUrl: `${MODEL_BASE_URL}/deadpool_-_marvel_rivals.glb`,
    classification: ASSET_CLASSIFICATION.FULL_RIGGED,
    status: ASSET_CLASSIFICATION.FULL_RIGGED,
    statusLabel: 'Live Skeletal Rig (171 Bones)',
    categoryBadge: 'LIVE SKELETAL RIG',
    isRigged: true,
    isPlayable: true,
    fileSizeMB: 4.8,
    targetHeight: 1.88,
    rotationCorrection: [0, -Math.PI / 2, 0],
    positionOffset: [0, 0, 0],
    description: 'Deadpool — Marvel Rivals 171-bone humanoid rig, real-time arm and hand retargeting',
    hasAccessory: false,
  },

  // ── 2. Way Big ───────────────────────────────────────────────────────────
  'gigante': {
    id: 'gigante',
    name: 'Way Big',
    modelFile: 'gigante_grandao_waybig_-ben_10.glb',
    file: 'gigante_grandao_waybig_-ben_10.glb',
    modelUrl: `${MODEL_BASE_URL}/gigante_grandao_waybig_-ben_10.glb`,
    classification: ASSET_CLASSIFICATION.FULL_RIGGED,
    status: ASSET_CLASSIFICATION.FULL_RIGGED,
    statusLabel: 'Live Skeletal Rig (88 Bones)',
    categoryBadge: 'LIVE SKELETAL RIG',
    isRigged: true,
    isPlayable: true,
    fileSizeMB: 4.8,
    targetHeight: 2.50,
    rotationCorrection: [0, 0, 0],
    positionOffset: [0, 0, 0],
    description: 'Way Big — giant alien hero (Ben 10), 88-bone Mixamo rig, towering live retargeting',
    hasAccessory: false,
  },

  // ── 3. Hinata ────────────────────────────────────────────────────────────
  'hinata': {
    id: 'hinata',
    name: 'Hinata',
    modelFile: 'hinata.glb',
    file: 'hinata.glb',
    modelUrl: `${MODEL_BASE_URL}/hinata.glb`,
    classification: ASSET_CLASSIFICATION.FULL_RIGGED,
    status: ASSET_CLASSIFICATION.FULL_RIGGED,
    statusLabel: 'Live Skeletal Rig (79 Bones)',
    categoryBadge: 'LIVE SKELETAL RIG',
    isRigged: true,
    isPlayable: true,
    fileSizeMB: 0.9,
    targetHeight: 1.65,
    rotationCorrection: [0, Math.PI, 0],
    positionOffset: [0, 0, 0],
    description: 'Hinata — lightweight Mixamo humanoid rig (79 bones), live skeletal tracking',
    hasAccessory: false,
  },

  // ── 4. Iron Man Mark 7 ───────────────────────────────────────────────────
  'iron-man': {
    id: 'iron-man',
    name: 'Iron Man Mark 7',
    modelFile: 'iron-man_mark_7.glb',
    file: 'iron-man_mark_7.glb',
    modelUrl: `${MODEL_BASE_URL}/iron-man_mark_7.glb`,
    classification: ASSET_CLASSIFICATION.FULL_RIGGED,
    status: ASSET_CLASSIFICATION.FULL_RIGGED,
    statusLabel: 'Live Skeletal Rig (121 Bones)',
    categoryBadge: 'LIVE SKELETAL RIG',
    isRigged: true,
    isPlayable: true,
    fileSizeMB: 9.24,
    targetHeight: 1.88,
    rotationCorrection: [0, 0, 0],
    positionOffset: [0, 0, 0],
    description: 'Iron Man Mark 7 — 121-bone humanoid rig, live skeletal retargeting & glowing repulsor palm',
    hasAccessory: false,
    hasRepulsor: true,
  },

  // ── 5. Spider-Man ────────────────────────────────────────────────────────
  'spiderman': {
    id: 'spiderman',
    name: 'Spider-Man',
    modelFile: 'spiderman_brand_new_day.glb',
    file: 'spiderman_brand_new_day.glb',
    modelUrl: `${MODEL_BASE_URL}/spiderman_brand_new_day.glb`,
    classification: ASSET_CLASSIFICATION.FULL_RIGGED,
    status: ASSET_CLASSIFICATION.FULL_RIGGED,
    statusLabel: 'Live Skeletal Rig (216 Bones)',
    categoryBadge: 'LIVE SKELETAL RIG',
    isRigged: true,
    isPlayable: true,
    fileSizeMB: 1.43,
    targetHeight: 1.75,
    rotationCorrection: [0, 0, 0],
    positionOffset: [0, 0, 0],
    description: 'Spider-Man Brand New Day — 216-bone UE5-style rig, live skeletal retargeting',
    hasAccessory: false,
  },

  // ── 6. Swampfire ─────────────────────────────────────────────────────────
  'swampfire': {
    id: 'swampfire',
    name: 'Swampfire',
    modelFile: 'swampfire_ben_10-_fully_rigged.glb',
    file: 'swampfire_ben_10-_fully_rigged.glb',
    modelUrl: `${MODEL_BASE_URL}/swampfire_ben_10-_fully_rigged.glb`,
    classification: ASSET_CLASSIFICATION.FULL_RIGGED,
    status: ASSET_CLASSIFICATION.FULL_RIGGED,
    statusLabel: 'Live Skeletal Rig (69 Bones)',
    categoryBadge: 'LIVE SKELETAL RIG',
    isRigged: true,
    isPlayable: true,
    fileSizeMB: 0.69,
    targetHeight: 1.80,
    rotationCorrection: [0, 0, 0],
    positionOffset: [0, 0, 0],
    description: 'Swampfire — plant/fire alien hero (Ben 10), 69-bone rig with full humanoid retargeting',
    hasAccessory: false,
    animations: [],
  },

  // ── 7. Batman ────────────────────────────────────────────────────────────
  'batman': {
    id: 'batman',
    name: 'Batman',
    modelFile: 'the_batman_suit_-_textured_and_rigged.glb',
    file: 'the_batman_suit_-_textured_and_rigged.glb',
    modelUrl: `${MODEL_BASE_URL}/the_batman_suit_-_textured_and_rigged.glb`,
    classification: ASSET_CLASSIFICATION.FULL_RIGGED,
    status: ASSET_CLASSIFICATION.FULL_RIGGED,
    statusLabel: 'Live Skeletal Rig (280 Bones)',
    categoryBadge: 'LIVE SKELETAL RIG',
    isRigged: true,
    isPlayable: true,
    fileSizeMB: 12.18,
    targetHeight: 1.90,
    rotationCorrection: [0, 0, 0],
    positionOffset: [0, 0, 0],
    description: 'The Batman Armored Suit — textured & rigged rig (280 bones), live skeletal tracking',
    hasAccessory: false,
  },

  // ── 8. Wolverine ─────────────────────────────────────────────────────────
  'wolverine': {
    id: 'wolverine',
    name: 'Wolverine',
    modelFile: 'wolverinetexturedrigged.glb',
    file: 'wolverinetexturedrigged.glb',
    modelUrl: `${MODEL_BASE_URL}/wolverinetexturedrigged.glb`,
    classification: ASSET_CLASSIFICATION.FULL_RIGGED,
    status: ASSET_CLASSIFICATION.FULL_RIGGED,
    statusLabel: 'Live Skeletal Rig (154 Bones)',
    categoryBadge: 'LIVE SKELETAL RIG',
    isRigged: true,
    isPlayable: true,
    fileSizeMB: 1.78,
    targetHeight: 1.80,
    rotationCorrection: [0, -Math.PI / 2, 0],
    positionOffset: [0, 0, 0],
    description: 'Wolverine — textured & rigged Biped rig (154 bones), live skeletal retargeting',
    hasAccessory: false,
  },
};

// Legacy aliases for backward compatibility
CHARACTER_MODELS['spider-man'] = CHARACTER_MODELS['spiderman'];
CHARACTER_MODELS['waybig'] = CHARACTER_MODELS['gigante'];

/**
 * Returns model configuration for a given character ID.
 */
export function getCharacterModelConfig(charId) {
  return CHARACTER_MODELS[charId] || null;
}

/**
 * Returns the list of playable character model configs (no duplicates from aliases).
 */
export function getPlayableModels() {
  const seen = new Set();
  return Object.values(CHARACTER_MODELS).filter((m) => {
    if (!m.isPlayable || seen.has(m.id)) return false;
    seen.add(m.id);
    return true;
  });
}

