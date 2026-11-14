import fs from 'fs';
import path from 'path';

globalThis.self = globalThis;
globalThis.window = globalThis;

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const filePath = path.join(process.cwd(), 'public', 'assets', '3D models', 'deadpool_-_marvel_rivals.glb');
const buffer = fs.readFileSync(filePath);
const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);

const loader = new GLTFLoader();
loader.parse(arrayBuffer, '', (gltf) => {
  const scene = gltf.scene;
  scene.updateMatrixWorld(true);

  let headBone = null;
  scene.traverse((c) => {
    if (c.isBone && /head/i.test(c.name)) {
      console.log('Found head bone:', c.name);
      if (!headBone) headBone = c;
    }
  });

  // Let's also check if any meshes are named head or equip
  scene.traverse((c) => {
    if (c.isMesh) {
      console.log('Mesh in deadpool:', c.name, 'parent:', c.parent?.name);
    }
  });
});
