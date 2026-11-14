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

  // Let's sample Y slices from Y=1500 to Y=2307 in increments of 50
  const yCounts = {};
  const yRadii = {};

  scene.traverse((child) => {
    if (child.isMesh) {
      const pos = child.geometry.attributes.position;
      const v = new THREE.Vector3();
      for (let i = 0; i < pos.count; i++) {
        v.fromBufferAttribute(pos, i);
        child.localToWorld(v);
        const yBucket = Math.floor(v.y / 50) * 50;
        yCounts[yBucket] = (yCounts[yBucket] || 0) + 1;
        const r = Math.sqrt(v.x * v.x + v.z * v.z);
        if (!yRadii[yBucket] || r > yRadii[yBucket]) {
          yRadii[yBucket] = r;
        }
      }
    }
  });

  console.log('Y Slices from 1400 to 2350 (Y: vertex count, max radius from center XZ):');
  Object.keys(yCounts)
    .map(Number)
    .filter(y => y >= 1400)
    .sort((a, b) => a - b)
    .forEach(y => {
      console.log(`  Y=${y} to ${y+50}: count=${yCounts[y]} maxRadius=${yRadii[y].toFixed(1)}`);
    });
});
