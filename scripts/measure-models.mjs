import fs from 'fs';
import path from 'path';

globalThis.self = globalThis;
globalThis.window = globalThis;

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const BONE_PATTERNS = {
  head: [/head/i],
  neck: [/neck/i],
  spine: [/spine/i],
  hips: [/pelvis/i, /hips/i, /root/i],
  leftUpperArm: [/upperarm_l/i, /leftarm/i, /l_upperarm/i],
  rightUpperArm: [/upperarm_r/i, /rightarm/i, /r_upperarm/i],
  leftLowerArm: [/lowerarm_l/i, /leftforearm/i, /l_forearm/i],
  rightLowerArm: [/lowerarm_r/i, /rightforearm/i, /r_forearm/i],
};

function testModelMeasurements(fileName) {
  const filePath = path.join(process.cwd(), 'public', 'assets', '3D models', fileName);
  if (!fs.existsSync(filePath)) return;
  const buffer = fs.readFileSync(filePath);
  const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);

  const loader = new GLTFLoader();
  loader.parse(arrayBuffer, '', (gltf) => {
    const scene = gltf.scene;
    scene.updateMatrixWorld(true);

    const box = new THREE.Box3().setFromObject(scene);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());

    let bones = {};
    scene.traverse((c) => {
      if (c.isBone) {
        for (const [k, pats] of Object.entries(BONE_PATTERNS)) {
          if (!bones[k]) {
            for (const p of pats) {
              if (p.test(c.name)) {
                bones[k] = c;
                break;
              }
            }
          }
        }
      }
    });

    const isRigged = Object.keys(bones).length > 2;
    console.log(`\n=== ${fileName} (isRigged=${isRigged}) ===`);
    console.log(`  Size: [${size.x.toFixed(2)}, ${size.y.toFixed(2)}, ${size.z.toFixed(2)}]`);

    if (isRigged && bones.leftUpperArm && bones.rightUpperArm) {
      const pL = new THREE.Vector3();
      const pR = new THREE.Vector3();
      bones.leftUpperArm.getWorldPosition(pL);
      bones.rightUpperArm.getWorldPosition(pR);
      const span = pL.distanceTo(pR);
      const shoulderMid = new THREE.Vector3().addVectors(pL, pR).multiplyScalar(0.5);
      console.log(`  Shoulder span: ${span.toFixed(3)}, Shoulder mid Y: ${shoulderMid.y.toFixed(3)}`);
      if (bones.hips) {
        const pH = new THREE.Vector3();
        bones.hips.getWorldPosition(pH);
        console.log(`  Hips pos Y: ${pH.y.toFixed(3)}, Torso len: ${shoulderMid.distanceTo(pH).toFixed(3)}`);
      }
    }
  });
}

const models = [
  'iron-man_mark_7.glb',
  'deadpool_-_marvel_rivals.glb',
  'spiderman_brand_new_day.glb',
  'the_batman_suit_-_textured_and_rigged.glb',
  'hinata_free_fire_skin.glb',
  'hulk_-_marvel_rivals.glb',
];

for (const m of models) {
  testModelMeasurements(m);
}
