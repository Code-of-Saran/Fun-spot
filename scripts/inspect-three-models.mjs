globalThis.self = globalThis;
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import fs from 'fs';
import path from 'path';

const modelsDir = path.resolve('public/assets/3D models');
const files = fs.readdirSync(modelsDir).filter(f => f.endsWith('.glb'));

const loader = new GLTFLoader();

for (const file of files) {
  try {
    const buf = fs.readFileSync(path.join(modelsDir, file));
    await new Promise((resolve) => {
      loader.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), '', (gltf) => {
        const scene = gltf.scene;
        scene.updateMatrixWorld(true);
        const box = new THREE.Box3().setFromObject(scene);
        const size = box.getSize(new THREE.Vector3());
        
        let boneCount = 0;
        let skinnedMeshCount = 0;
        let meshCount = 0;
        const boneNames = [];
        
        scene.traverse(c => {
          if (c.isBone) {
            boneCount++;
            boneNames.push(c.name);
          }
          if (c.isSkinnedMesh) skinnedMeshCount++;
          if (c.isMesh) meshCount++;
        });

        console.log(`\n========================================`);
        console.log(`MODEL: ${file}`);
        console.log(`Meshes: ${meshCount}, SkinnedMeshes: ${skinnedMeshCount}, Bones: ${boneCount}`);
        console.log(`Box min: [${box.min.x.toFixed(2)}, ${box.min.y.toFixed(2)}, ${box.min.z.toFixed(2)}]`);
        console.log(`Box max: [${box.max.x.toFixed(2)}, ${box.max.y.toFixed(2)}, ${box.max.z.toFixed(2)}]`);
        console.log(`Size (X, Y, Z): width=${size.x.toFixed(2)}, height=${size.y.toFixed(2)}, depth=${size.z.toFixed(2)}`);
        
        // Check largest dimension
        if (size.y >= size.x && size.y >= size.z) {
          console.log(`Orientation: Upright (Y is height: ${size.y.toFixed(2)})`);
        } else if (size.z >= size.x && size.z >= size.y) {
          console.log(`Orientation: Z is largest (${size.z.toFixed(2)} vs Y=${size.y.toFixed(2)}) -> Needs check!`);
        } else {
          console.log(`Orientation: X is largest (${size.x.toFixed(2)})`);
        }
        
        if (boneNames.length > 0) {
          const armBones = boneNames.filter(n => /arm|hand|shoulder|clavicle|elbow|wrist|bip/i.test(n));
          console.log(`Sample Bones: ${boneNames.slice(0, 8).join(', ')}`);
          console.log(`Sample Arm Bones: ${armBones.slice(0, 8).join(', ')}`);
        }
        resolve();
      }, (err) => {
        console.error(`Error loading ${file}:`, err);
        resolve();
      });
    });
  } catch (err) {
    console.error(`Exception with ${file}:`, err);
  }
}
