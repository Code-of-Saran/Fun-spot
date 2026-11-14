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

  // Check X span at shoulder height (Y around 1750 to 1850)
  let minXAtShoulders = Infinity;
  let maxXAtShoulders = -Infinity;

  // Check X span at chest/torso (Y around 1400 to 1700)
  let minXAtTorso = Infinity;
  let maxXAtTorso = -Infinity;

  scene.traverse((child) => {
    if (child.isMesh) {
      const pos = child.geometry.attributes.position;
      const v = new THREE.Vector3();
      for (let i = 0; i < pos.count; i++) {
        v.fromBufferAttribute(pos, i);
        child.localToWorld(v);
        if (v.y >= 1750 && v.y <= 1850) {
          if (v.x < minXAtShoulders) minXAtShoulders = v.x;
          if (v.x > maxXAtShoulders) maxXAtShoulders = v.x;
        }
        if (v.y >= 1400 && v.y <= 1700) {
          if (v.x < minXAtTorso) minXAtTorso = v.x;
          if (v.x > maxXAtTorso) maxXAtTorso = v.x;
        }
      }
    }
  });

  console.log('Shoulder level (Y=1750-1850) X range: [', minXAtShoulders, ',', maxXAtShoulders, '] span =', maxXAtShoulders - minXAtShoulders);
  console.log('Torso level (Y=1400-1700) X range: [', minXAtTorso, ',', maxXAtTorso, '] span =', maxXAtTorso - minXAtTorso);
});
