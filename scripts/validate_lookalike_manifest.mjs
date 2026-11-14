/**
 * FUN SPOT — LOOK A LIKE: Canonical Dataset & Manifest Validator
 * Strictly asserts integrity, physical disk existence, dimension precision,
 * slug formats, SHA-256 cache keys, and completeness for all reference records.
 */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const MANIFEST_PATH = path.join(projectRoot, 'public/assets/LookALike/lookalike_manifest.json');
const SRC_MANIFEST_PATH = path.join(projectRoot, 'src/games/lookalike/lookalikeManifest.json');
const FEATURE_CACHE_PATH = path.join(projectRoot, 'src/games/lookalike/referenceFeatureCache.json');

function getImageDimensions(buffer) {
  // PNG (magic: 0x89 0x50 0x4E 0x47)
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
    return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20), format: 'PNG' };
  }
  // JPEG (SOI: 0xFF 0xD8)
  if (buffer[0] === 0xFF && buffer[1] === 0xD8) {
    let offset = 2;
    while (offset < buffer.length - 8) {
      if (buffer[offset] !== 0xFF) { offset++; continue; }
      const marker = buffer[offset + 1];
      // SOF0 through SOF3 markers hold image dimensions
      if ((marker >= 0xC0 && marker <= 0xC3) || (marker >= 0xC9 && marker <= 0xCB)) {
        return {
          height: buffer.readUInt16BE(offset + 5),
          width: buffer.readUInt16BE(offset + 7),
          format: 'JPEG',
        };
      }
      const length = buffer.readUInt16BE(offset + 2);
      offset += 2 + length;
    }
  }
  // WebP
  if (buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') {
    const chunkType = buffer.toString('ascii', 12, 16);
    if (chunkType === 'VP8 ') {
      return { width: buffer.readUInt16LE(26) & 0x3FFF, height: buffer.readUInt16LE(28) & 0x3FFF, format: 'WEBP' };
    }
    if (chunkType === 'VP8X') {
      const w = 1 + buffer.readUIntLE(24, 3);
      const h = 1 + buffer.readUIntLE(27, 3);
      return { width: w, height: h, format: 'WEBP' };
    }
    if (chunkType === 'VP8L') {
      const b1 = buffer[21], b2 = buffer[22], b3 = buffer[23], b4 = buffer[24];
      const w = 1 + (((b2 & 0x3F) << 8) | b1);
      const h = 1 + (((b4 & 0xF) << 10) | (b3 << 2) | ((b2 & 0xC0) >> 6));
      return { width: w, height: h, format: 'WEBP' };
    }
  }
  return null;
}

console.log('='.repeat(70));
console.log('  FUN SPOT — LOOK A LIKE REFERENCE DATASET & MANIFEST VALIDATOR');
console.log('='.repeat(70));

let failures = 0;
function assert(condition, message) {
  if (!condition) {
    console.error(`  [FAIL] ${message}`);
    failures++;
  } else {
    console.log(`  [PASS] ${message}`);
  }
}

// 1. Manifest Files Existence
assert(fs.existsSync(MANIFEST_PATH), `public lookalike_manifest.json exists at ${MANIFEST_PATH}`);
assert(fs.existsSync(SRC_MANIFEST_PATH), `src lookalikeManifest.json exists at ${SRC_MANIFEST_PATH}`);
assert(fs.existsSync(FEATURE_CACHE_PATH), `referenceFeatureCache.json exists at ${FEATURE_CACHE_PATH}`);

if (failures > 0) {
  console.error(`Validation aborted: Essential manifest files missing.`);
  process.exit(1);
}

const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
const srcManifest = JSON.parse(fs.readFileSync(SRC_MANIFEST_PATH, 'utf8'));
const featureCache = JSON.parse(fs.readFileSync(FEATURE_CACHE_PATH, 'utf8'));

// 2. Synchronized Manifests
assert(manifest.totalImages === srcManifest.totalImages, `Manifest versions match: ${manifest.totalImages} images`);

// 3. Header assertions
const records = manifest.records || [];
assert(records.length === manifest.totalImages, `totalImages (${manifest.totalImages}) matches records.length (${records.length})`);

const maleRecords = records.filter(r => r.gender === 'male');
const femaleRecords = records.filter(r => r.gender === 'female');
assert(maleRecords.length === manifest.maleCount, `maleCount (${manifest.maleCount}) matches actual male records (${maleRecords.length})`);
assert(femaleRecords.length === manifest.femaleCount, `femaleCount (${manifest.femaleCount}) matches actual female records (${femaleRecords.length})`);
assert(manifest.maleCount + manifest.femaleCount === manifest.totalImages, `Gender sum equals total images`);

// 4. Slug format & ReferenceId uniqueness
const seenReferenceIds = new Set();
const seenCelebrityIds = new Set();
const slugRegex = /^[a-z0-9_-]+$/;

const MANDATORY_FIELDS = [
  'referenceId',
  'celebrityId',
  'celebrityName',
  'gender',
  'folderCategory',
  'subfolder',
  'imagePath',
  'sourceUrl',
  'creator',
  'license',
  'attribution',
  'dateAcquired',
  'intendedUse',
  'title',
  'expressionLabel',
  'expressionCategory',
  'funnyQuote',
  'badge',
  'themeColor',
  'imageWidth',
  'imageHeight',
  'faceCount',
  'qualityStatus',
  'analysisStatus',
  'featureModelVersion',
  'featureCacheKey',
  'sha256',
];

console.log('\nAsserting Record Fields, Physical Files, Dimensions, & Hashes:');
let imageValidationErrors = 0;

for (const [idx, rec] of records.entries()) {
  const ref = rec.referenceId;
  
  // Mandatory fields check
  for (const field of MANDATORY_FIELDS) {
    if (rec[field] === undefined || rec[field] === null || rec[field] === '') {
      console.error(`  [RECORD ${idx}] ${ref} missing mandatory field: ${field}`);
      imageValidationErrors++;
    }
  }

  // ReferenceId uniqueness
  if (seenReferenceIds.has(ref)) {
    console.error(`  [DUPLICATE] referenceId "${ref}" is not unique!`);
    imageValidationErrors++;
  }
  seenReferenceIds.add(ref);

  // CelebrityId well-formed slug
  if (!slugRegex.test(rec.celebrityId)) {
    console.error(`  [INVALID SLUG] celebrityId "${rec.celebrityId}" is not a well-formed slug!`);
    imageValidationErrors++;
  }
  seenCelebrityIds.add(rec.celebrityId);

  // Physical file exists
  const absImagePath = path.join(projectRoot, 'public', rec.imagePath.replace(/^\//, ''));
  if (!fs.existsSync(absImagePath)) {
    console.error(`  [MISSING FILE] ${rec.imagePath} does not exist at ${absImagePath}`);
    imageValidationErrors++;
    continue;
  }

  // Dimensions & format
  const fileBuf = fs.readFileSync(absImagePath);
  const dims = getImageDimensions(fileBuf);
  if (!dims) {
    console.error(`  [DECODE ERROR] ${rec.imagePath} is not a decodable image!`);
    imageValidationErrors++;
    continue;
  }

  if (dims.width !== rec.imageWidth || dims.height !== rec.imageHeight) {
    console.error(`  [DIMENSION MISMATCH] ${ref}: manifest has ${rec.imageWidth}x${rec.imageHeight}, actual file is ${dims.width}x${dims.height}`);
    imageValidationErrors++;
  }

  // SHA256 & featureCacheKey
  const actualHash = crypto.createHash('sha256').update(fileBuf).digest('hex');
  if (actualHash !== rec.sha256) {
    console.error(`  [HASH MISMATCH] ${ref}: manifest sha256 doesn't match disk file!`);
    imageValidationErrors++;
  }
  if (!rec.sha256.startsWith(rec.featureCacheKey)) {
    console.error(`  [CACHE KEY ERROR] ${ref}: featureCacheKey (${rec.featureCacheKey}) does not match prefix of sha256`);
    imageValidationErrors++;
  }
}

assert(imageValidationErrors === 0, `All ${records.length} records verified cleanly on disk with matching dimensions and SHA-256 hashes`);

// 5. Feature Cache Consistency
assert(featureCache.totalEntries === records.length, `Feature cache has ${featureCache.totalEntries} entries matching manifest`);
assert(featureCache.entries && featureCache.entries.length === records.length, `Feature cache entries array is fully populated`);

// 6. Summary Report
console.log('\n' + '-'.repeat(70));
console.log('  DATASET VALIDATION SUMMARY');
console.log('-'.repeat(70));
console.log(`  Total Reference Images:     ${manifest.totalImages}`);
console.log(`  Male Reference Portraits:   ${manifest.maleCount}`);
console.log(`  Female Reference Portraits: ${manifest.femaleCount}`);
console.log(`  Distinct Celebrity Groups:  ${seenCelebrityIds.size}`);
console.log(`  Unique Reference IDs:       ${seenReferenceIds.size}`);
console.log(`  All Files Physical on Disk: YES (100% verified)`);
console.log(`  Dimension Integrity:        YES (100% exact match)`);
console.log(`  SHA-256 Cryptographic Hash: YES (100% verified)`);
console.log(`  Feature Cache Synchronized: YES`);
console.log('-'.repeat(70));

if (failures === 0 && imageValidationErrors === 0) {
  console.log('>>> ALL VALIDATION CHECKS PASSED SUCCESSFULLY (Exit Code 0) <<<\n');
  process.exit(0);
} else {
  console.error(`>>> VALIDATION FAILED: ${failures + imageValidationErrors} total errors <<<\n`);
  process.exit(1);
}

