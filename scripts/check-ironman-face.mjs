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

  let zPosCount = 0;
  let zNegCount = 0;
  let maxZ = -Infinity;
  let minZ = Infinity;

  scene.traverse((child) => {
    if (child.isMesh) {
      const pos = child.geometry.attributes.position;
      const v = new THREE.Vector3();
      for (let i = 0; i < pos.count; i++) {
        v.fromBufferAttribute(pos, i);
        child.localToWorld(v);
        if (v.y > 2100 && v.y < 2250 && Math.abs(v.x) < 50) {
          if (v.z > maxZ) maxZ = v.z;
          if (v.z < minZ) minZ = v.z;
          // check nose protrusion
        }
      }
    }
  });

  console.log('Iron Man head center Z range: minZ=', minZ, 'maxZ=', maxZ);
});
