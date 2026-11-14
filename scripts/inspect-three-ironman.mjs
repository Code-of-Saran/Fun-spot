import fs from 'fs';
import path from 'path';

globalThis.self = globalThis;
globalThis.window = globalThis;

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// Setup GLTFLoader in Node environment
const filePath = path.join(process.cwd(), 'public', 'assets', '3D models', 'iron-man_mark_7.glb');
const buffer = fs.readFileSync(filePath);
const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);

const loader = new GLTFLoader();
loader.parse(arrayBuffer, '', (gltf) => {
  console.log('Successfully loaded GLTF in node!');
  const scene = gltf.scene;

  scene.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(scene);
  console.log('Scene Box Min:', box.min);
  console.log('Scene Box Max:', box.max);
  console.log('Scene Box Size:', box.getSize(new THREE.Vector3()));
  console.log('Scene Box Center:', box.getCenter(new THREE.Vector3()));

  scene.traverse((child) => {
    if (child.isMesh) {
      child.updateMatrixWorld(true);
      const meshBox = new THREE.Box3().setFromObject(child);
      console.log(`\nMesh: "${child.name}" parent: "${child.parent?.name}"`);
      console.log('  Mesh Box Min:', meshBox.min);
      console.log('  Mesh Box Max:', meshBox.max);
      console.log('  Mesh Box Size:', meshBox.getSize(new THREE.Vector3()));
      console.log('  Geometry vertices count:', child.geometry.attributes.position.count);
    }
  });
}, (err) => {
  console.error('Error loading GLTF:', err);
});
