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

  for (let yCut = 1920; yCut <= 2040; yCut += 10) {
    let minZ = Infinity, maxZ = -Infinity, minX = Infinity, maxX = -Infinity;
    let count = 0;
    scene.traverse((child) => {
      if (child.isMesh) {
        const pos = child.geometry.attributes.position;
        const v = new THREE.Vector3();
        for (let i = 0; i < pos.count; i++) {
          v.fromBufferAttribute(pos, i);
          child.localToWorld(v);
          if (Math.abs(v.y - yCut) <= 5) {
            count++;
            if (v.z < minZ) minZ = v.z;
            if (v.z > maxZ) maxZ = v.z;
            if (v.x < minX) minX = v.x;
            if (v.x > maxX) maxX = v.x;
          }
        }
      }
    });
    console.log(`Y=${yCut}: vertices=${count} X span=[${minX.toFixed(1)}, ${maxX.toFixed(1)}] width=${(maxX-minX).toFixed(1)} Z span=[${minZ.toFixed(1)}, ${maxZ.toFixed(1)}] depth=${(maxZ-minZ).toFixed(1)}`);
  }
});
