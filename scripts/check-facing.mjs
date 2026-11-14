import fs from 'fs';
import path from 'path';

globalThis.self = globalThis;
globalThis.window = globalThis;

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

function checkFacingDirection(fileName) {
  const filePath = path.join(process.cwd(), 'public', 'assets', '3D models', fileName);
  const buffer = fs.readFileSync(filePath);
  const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);

  const loader = new GLTFLoader();
  loader.parse(arrayBuffer, '', (gltf) => {
    const scene = gltf.scene;
    scene.updateMatrixWorld(true);

    // Let's find the center of the chest/face
    // In human models, nose or chest is at front (+Z or -Z).
    // Let's check the center of mass or bounding box of front vs back
    const box = new THREE.Box3().setFromObject(scene);
    console.log(`\n=== ${fileName} ===`);
    console.log('Box Z min:', box.min.z.toFixed(2), 'max:', box.max.z.toFixed(2));

    // For models with bones, check nose/head or feet direction
    let headBone = null;
    let footBone = null;
    scene.traverse((c) => {
      if (c.isBone) {
        if (/head/i.test(c.name) && !headBone) headBone = c;
        if (/foot|toe/i.test(c.name) && !footBone) footBone = c;
      }
    });
    if (footBone) {
      const p = new THREE.Vector3();
      footBone.getWorldPosition(p);
      console.log('Foot bone position:', p);
    }
  });
}

checkFacingDirection('iron-man_mark_7.glb');
checkFacingDirection('deadpool_-_marvel_rivals.glb');
