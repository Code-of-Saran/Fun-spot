import fs from 'fs';
import path from 'path';

globalThis.self = globalThis;
globalThis.window = globalThis;

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

function checkSpidermanBones() {
  const filePath = path.join(process.cwd(), 'public', 'assets', '3D models', 'spiderman_brand_new_day.glb');
  const buffer = fs.readFileSync(filePath);
  const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);

  const loader = new GLTFLoader();
  loader.parse(arrayBuffer, '', (gltf) => {
    const scene = gltf.scene;
    scene.updateMatrixWorld(true);

    scene.traverse((c) => {
      if (c.isBone) {
        const wp = new THREE.Vector3();
        c.getWorldPosition(wp);
        if (/pelvis|hip|root|spine/i.test(c.name)) {
          console.log(`Spider-man bone: "${c.name}" pos: [${wp.x.toFixed(2)}, ${wp.y.toFixed(2)}, ${wp.z.toFixed(2)}]`);
        }
      }
    });
  });
}

checkSpidermanBones();
