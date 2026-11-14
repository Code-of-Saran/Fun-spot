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

  // Find center of collar at Y=1980
  let sumX = 0, sumZ = 0, count = 0;
  scene.traverse((c) => {
    if (c.isMesh) {
      const pos = c.geometry.attributes.position;
      const v = new THREE.Vector3();
      for (let i = 0; i < pos.count; i++) {
        v.fromBufferAttribute(pos, i);
        c.localToWorld(v);
        if (Math.abs(v.y - 1980) <= 10) {
          sumX += v.x;
          sumZ += v.z;
          count++;
        }
      }
    }
  });

  console.log(`Collar center at Y=1980: X=${(sumX / count).toFixed(2)}, Z=${(sumZ / count).toFixed(2)} (vertices: ${count})`);
});
