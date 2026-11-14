import fs from 'fs';
import path from 'path';

globalThis.self = globalThis;
globalThis.window = globalThis;

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

function inspectSkeletonBones(fileName) {
  const filePath = path.join(process.cwd(), 'public', 'assets', '3D models', fileName);
  if (!fs.existsSync(filePath)) return;
  const buffer = fs.readFileSync(filePath);
  const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);

  const loader = new GLTFLoader();
  loader.parse(arrayBuffer, '', (gltf) => {
    const scene = gltf.scene;
    scene.updateMatrixWorld(true);

    console.log(`\n=== Bones for ${fileName} ===`);
    const relevantBones = [];
    scene.traverse((c) => {
      if (c.isBone) {
        if (/pelvis|hips|spine|root|chest|neck|head|clavicle|shoulder|upperarm/i.test(c.name)) {
          const wp = new THREE.Vector3();
          c.getWorldPosition(wp);
          relevantBones.push({ name: c.name, wp, parent: c.parent?.name });
        }
      }
    });

    relevantBones.slice(0, 25).forEach(b => {
      console.log(`  Bone: "${b.name}" parent: "${b.parent}" pos: [${b.wp.x.toFixed(2)}, ${b.wp.y.toFixed(2)}, ${b.wp.z.toFixed(2)}]`);
    });
  });
}

inspectSkeletonBones('deadpool_-_marvel_rivals.glb');
inspectSkeletonBones('the_batman_suit_-_textured_and_rigged.glb');
inspectSkeletonBones('spiderman_brand_new_day.glb');
inspectSkeletonBones('hulk_-_marvel_rivals.glb');
inspectSkeletonBones('hinata_free_fire_skin.glb');
