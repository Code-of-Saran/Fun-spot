import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const dir = 'c:/project/funspot-main/public/assets/3D models';

function findBoneInNodes(nodes, patterns) {
  for (const pattern of patterns) {
    const found = nodes.find(n => pattern.test(n.name || ''));
    if (found) return found.name;
  }
  return null;
}

const BONE_PATTERNS = {
  head: [/^head/i, /mixamorig:head$/i, /head_\d+/i, /head/i],
  neck: [/^neck/i, /mixamorig:neck$/i, /neck_\d+/i, /neck/i],
  spine: [/^spine_0[23]/i, /mixamorig:spine[12]/i, /spine_01/i, /spine/i],
  hips: [/^pelvis/i, /mixamorig:hips/i, /hips/i, /root/i],
  leftClavicle: [/clavicle.*l/i, /mixamorig:leftshoulder/i],
  leftUpperArm: [/upperarm.*l/i, /mixamorig:leftarm$/i, /leftarm/i],
  leftLowerArm: [/lowerarm.*l/i, /mixamorig:leftforearm$/i, /leftforearm/i],
  leftHand: [/hand.*l(?!\w)/i, /mixamorig:lefthand$/i, /lefthand/i],
  rightClavicle: [/clavicle.*r/i, /mixamorig:rightshoulder/i],
  rightUpperArm: [/upperarm.*r/i, /mixamorig:rightarm$/i, /rightarm/i],
  rightLowerArm: [/lowerarm.*r/i, /mixamorig:rightforearm$/i, /rightforearm/i],
  rightHand: [/hand.*r(?!\w)/i, /mixamorig:righthand$/i, /righthand/i],
};

async function testBoneMapping(filename) {
  const buffer = await readFile(join(dir, filename));
  const len = buffer.readUInt32LE(12);
  const gltf = JSON.parse(buffer.toString('utf8', 20, 20 + len));

  console.log(`\nMapping bones for ${filename}:`);
  const mapping = {};
  for (const [key, patterns] of Object.entries(BONE_PATTERNS)) {
    mapping[key] = findBoneInNodes(gltf.nodes, patterns);
  }
  console.log(mapping);
}

await testBoneMapping('hinata_free_fire_skin.glb');
await testBoneMapping('hulk_-_marvel_rivals.glb');
await testBoneMapping('spiderman_brand_new_day.glb');
