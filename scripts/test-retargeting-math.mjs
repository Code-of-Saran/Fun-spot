globalThis.self = globalThis;
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import fs from 'fs';
import path from 'path';

// Enhanced BONE_PATTERNS supporting Unreal/Marvel Rivals, Mixamo, 3ds Max Biped, and Spider-Man
const BONE_PATTERNS = {
  head: [
    /^head$/i,
    /mixamorig:?head$/i,
    /^bip01_head/i,
    /^head_\d+/i,
    /head/i
  ],
  neck: [
    /^neck$/i,
    /mixamorig:?neck$/i,
    /^bip01_neck/i,
    /neck_\d+/i,
    /neck/i
  ],
  spine: [
    /^spine_0[1-5]/i,
    /mixamorig:?spine[12]?/i,
    /^bip01_spine[1-3]?/i,
    /^spine$/i,
    /spine/i
  ],
  hips: [
    /^pelvis$/i,
    /mixamorig:?hips/i,
    /^bip01_pelvis/i,
    /^hips$/i,
    /^root$/i
  ],
  leftClavicle: [
    /^clavicle_l(_\d+)?$/i,
    /mixamorig:?leftshoulder(_\d+)?$/i,
    /^bip01_l_clavicle(_\d+)?$/i,
    /clavicle.*l/i,
  ],
  leftUpperArm: [
    /^upperarm_l(_\d+)?$/i,
    /mixamorig:?leftarm(_\d+)?$/i,
    /^bip01_l_upperarm(_\d+)?$/i,
  ],
  leftLowerArm: [
    /^lowerarm_l(_\d+)?$/i,
    /mixamorig:?leftforearm(_\d+)?$/i,
    /^bip01_l_forearm(_\d+)?$/i,
  ],
  leftHand: [
    /^hand_l(_\d+)?$/i,
    /mixamorig:?lefthand(_\d+)?$/i,
    /^bip01_l_hand(_\d+)?$/i,
  ],
  rightClavicle: [
    /^clavicle_r(_\d+)?$/i,
    /mixamorig:?rightshoulder(_\d+)?$/i,
    /^bip01_r_clavicle(_\d+)?$/i,
    /clavicle.*r/i,
  ],
  rightUpperArm: [
    /^upperarm_r(_\d+)?$/i,
    /mixamorig:?rightarm(_\d+)?$/i,
    /^bip01_r_upperarm(_\d+)?$/i,
  ],
  rightLowerArm: [
    /^lowerarm_r(_\d+)?$/i,
    /mixamorig:?rightforearm(_\d+)?$/i,
    /^bip01_r_forearm(_\d+)?$/i,
  ],
  rightHand: [
    /^hand_r(_\d+)?$/i,
    /mixamorig:?righthand(_\d+)?$/i,
    /^bip01_r_hand(_\d+)?$/i,
  ],
};

const modelsDir = path.resolve('public/assets/3D models');
const riggedFiles = [
  'deadpool_-_marvel_rivals.glb',
  'hulk_-_marvel_rivals.glb',
  'spiderman_brand_new_day.glb',
  'hinata_free_fire_skin.glb',
  'the_batman_suit_-_textured_and_rigged.glb'
];

const loader = new GLTFLoader();

for (const file of riggedFiles) {
  const buf = fs.readFileSync(path.join(modelsDir, file));
  await new Promise(res => {
    loader.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), '', (gltf) => {
      console.log(`\n========================================`);
      console.log(`TESTING BONE RETARGETING FOR: ${file}`);
      const scene = gltf.scene;
      scene.updateMatrixWorld(true);
      
      const mapped = {};
      scene.traverse(c => {
        if (c.isBone) {
          for (const [key, pats] of Object.entries(BONE_PATTERNS)) {
            if (!mapped[key]) {
              for (const p of pats) {
                if (p.test(c.name)) {
                  mapped[key] = {
                    bone: c,
                    name: c.name,
                    initialLocalQuat: c.quaternion.clone(),
                  };
                  break;
                }
              }
            }
          }
        }
      });
      
      const requiredBones = ['leftUpperArm', 'leftLowerArm', 'rightUpperArm', 'rightLowerArm'];
      for (const k of requiredBones) {
        if (!mapped[k]) {
          console.error(`FAILED TO MAP ${k} in ${file}!`);
        } else {
          console.log(`✓ Mapped ${k} -> ${mapped[k].name}`);
        }
      }
      
      // Compute rest world directions
      const getWPos = (b) => {
        const p = new THREE.Vector3();
        b.getWorldPosition(p);
        return p;
      };
      
      const luPos = getWPos(mapped.leftUpperArm.bone);
      const llPos = getWPos(mapped.leftLowerArm.bone);
      const ruPos = getWPos(mapped.rightUpperArm.bone);
      const rlPos = getWPos(mapped.rightLowerArm.bone);
      
      mapped.leftUpperArm.restDir = new THREE.Vector3().subVectors(llPos, luPos).normalize();
      mapped.rightUpperArm.restDir = new THREE.Vector3().subVectors(rlPos, ruPos).normalize();
      
      if (mapped.leftHand) {
        const lhPos = getWPos(mapped.leftHand.bone);
        mapped.leftLowerArm.restDir = new THREE.Vector3().subVectors(lhPos, llPos).normalize();
      }
      if (mapped.rightHand) {
        const rhPos = getWPos(mapped.rightHand.bone);
        mapped.rightLowerArm.restDir = new THREE.Vector3().subVectors(rhPos, rlPos).normalize();
      }
      
      console.log('Rest directions:');
      console.log('  Left Upper Arm:', mapped.leftUpperArm.restDir);
      console.log('  Right Upper Arm:', mapped.rightUpperArm.restDir);
      
      // Now simulate a retargeting rotation (raising right arm up at (0, 1, 0))
      const targetDir = new THREE.Vector3(0, 1, 0);
      const deltaQuat = new THREE.Quaternion().setFromUnitVectors(mapped.rightUpperArm.restDir, targetDir);
      
      const bone = mapped.rightUpperArm.bone;
      const initialWorldQuat = new THREE.Quaternion();
      bone.getWorldQuaternion(initialWorldQuat);
      
      const targetWorldQuat = deltaQuat.clone().multiply(initialWorldQuat);
      
      const parentWorldQuat = new THREE.Quaternion();
      if (bone.parent) {
        bone.parent.getWorldQuaternion(parentWorldQuat);
      }
      
      const targetLocalQuat = parentWorldQuat.clone().invert().multiply(targetWorldQuat);
      bone.quaternion.copy(targetLocalQuat);
      bone.updateWorldMatrix(true, true);
      
      // Verify new bone world direction
      const newRuPos = getWPos(mapped.rightUpperArm.bone);
      const newRlPos = getWPos(mapped.rightLowerArm.bone);
      const resultingDir = new THREE.Vector3().subVectors(newRlPos, newRuPos).normalize();
      
      console.log('Target direction:', targetDir);
      console.log('Resulting bone direction in world space:', resultingDir);
      const dot = targetDir.dot(resultingDir);
      console.log(`Alignment dot product: ${dot.toFixed(4)} (Expected ~1.0000)`);
      if (dot > 0.98) {
        console.log(`>>> RETARGETING CALCULATION SUCCESSFUL FOR ${file}! <<<`);
      } else {
        console.error(`>>> ALIGNMENT ERROR IN ${file}! <<<`);
      }
      res();
    });
  });
}
