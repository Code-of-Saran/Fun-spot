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

  // Check how many vertices are below Y = 1980 vs above Y = 1980
  let belowCount = 0;
  let aboveCount = 0;

  scene.traverse((child) => {
    if (child.isMesh) {
      const pos = child.geometry.attributes.position;
      const v = new THREE.Vector3();
      for (let i = 0; i < pos.count; i++) {
        v.fromBufferAttribute(pos, i);
        child.localToWorld(v);
        if (v.y > 1980) {
          aboveCount++;
        } else {
          belowCount++;
        }
      }
    }
  });

  console.log(`Iron Man vertices: Total=${belowCount + aboveCount}, Body (Y<=1980)=${belowCount}, Helmet (Y>1980)=${aboveCount}`);
  console.log(`Helmet percentage: ${((aboveCount / (belowCount + aboveCount)) * 100).toFixed(1)}%`);
});
