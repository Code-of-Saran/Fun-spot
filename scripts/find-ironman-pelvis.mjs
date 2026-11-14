import fs from 'fs';
import path from 'path';

globalThis.self = globalThis;
globalThis.window = globalThis;

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const filePath = path.join(process.cwd(), 'public', 'assets', '3D models', 'iron-man_mark_7.glb');
const buffer = fs.readFileSync(filePath);
const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);

const loader = new GLTFLoader();
loader.parse(arrayBuffer, '', (gltf) => {
  const scene = gltf.scene;
  scene.updateMatrixWorld(true);

  // Check slices from Y=900 to Y=1300 in steps of 50 to see where legs merge into pelvis
  // In the legs, around center X (e.g. |X| < 20), there is empty space between the legs!
  // At the crotch/pelvis, vertices bridge across X=0.
  for (let y = 800; y <= 1400; y += 50) {
    let centerCount = 0;
    let totalCount = 0;
    scene.traverse((c) => {
      if (c.isMesh) {
        const pos = c.geometry.attributes.position;
        const v = new THREE.Vector3();
        for (let i = 0; i < pos.count; i++) {
          v.fromBufferAttribute(pos, i);
          c.localToWorld(v);
          if (Math.abs(v.y - y) <= 25) {
            totalCount++;
            if (Math.abs(v.x) <= 30) {
              centerCount++;
            }
          }
        }
      }
    });
    console.log(`Y=${y}: total=${totalCount}, center(|X|<30)=${centerCount}`);
  }
});
