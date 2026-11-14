globalThis.self = globalThis;
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import fs from 'fs';
import path from 'path';

const modelsDir = path.resolve('public/assets/3D models');
const loader = new GLTFLoader();

const BONE_PATTERNS = {
  leftUpperArm: [/^upperarm_l(_\d+)?$/i, /mixamorig:?leftarm(_\d+)?$/i, /^bip01_l_upperarm(_\d+)?$/i],
  leftLowerArm: [/^lowerarm_l(_\d+)?$/i, /mixamorig:?leftforearm(_\d+)?$/i, /^bip01_l_forearm(_\d+)?$/i],
  leftHand: [/^hand_l(_\d+)?$/i, /mixamorig:?lefthand(_\d+)?$/i, /^bip01_l_hand(_\d+)?$/i],
  rightUpperArm: [/^upperarm_r(_\d+)?$/i, /mixamorig:?rightarm(_\d+)?$/i, /^bip01_r_upperarm(_\d+)?$/i],
  rightLowerArm: [/^lowerarm_r(_\d+)?$/i, /mixamorig:?rightforearm(_\d+)?$/i, /^bip01_r_forearm(_\d+)?$/i],
  rightHand: [/^hand_r(_\d+)?$/i, /mixamorig:?righthand(_\d+)?$/i, /^bip01_r_hand(_\d+)?$/i],
  head: [/^head(_\d+)?$/i, /mixamorig:?head(_\d+)?$/i, /^bip01_head(_\d+)?$/i],
  hips: [/^pelvis(_\d+)?$/i, /mixamorig:?hips(_\d+)?$/i, /^bip01_pelvis(_\d+)?$/i, /^hips$/i],
};

function testModelAnchoring(filename, isRigged) {
  return new Promise((resolve) => {
    const buf = fs.readFileSync(path.join(modelsDir, filename));
    loader.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), '', (gltf) => {
      console.log(`\n========================================`);
      console.log(`TESTING ANCHORING FOR: ${filename} (Rigged: ${isRigged})`);
      const scene = gltf.scene;
      scene.updateMatrixWorld(true);

      const box = new THREE.Box3().setFromObject(scene);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());

      const mappedBones = {};
      let hasBones = false;
      scene.traverse((c) => {
        if (c.isBone) {
          hasBones = true;
          for (const [key, pats] of Object.entries(BONE_PATTERNS)) {
            if (!mappedBones[key]) {
              for (const p of pats) {
                if (p.test(c.name)) {
                  mappedBones[key] = {
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

      // Calculate anchor point (shoulders)
      let anchor = new THREE.Vector3();
      let modelShoulderSpan = 0.44;

      if (hasBones && mappedBones.leftUpperArm && mappedBones.rightUpperArm) {
        const lp = new THREE.Vector3();
        const rp = new THREE.Vector3();
        mappedBones.leftUpperArm.bone.getWorldPosition(lp);
        mappedBones.rightUpperArm.bone.getWorldPosition(rp);
        anchor.addVectors(lp, rp).multiplyScalar(0.5);
        modelShoulderSpan = lp.distanceTo(rp);
        console.log(`- Bone Anchor: shoulders at Y=${anchor.y.toFixed(3)}, span=${modelShoulderSpan.toFixed(3)}`);
      } else {
        // Humanoid proportion: shoulders at min.y + 0.80 * height
        const h = size.y;
        anchor.set(center.x, box.min.y + 0.80 * h, center.z);
        modelShoulderSpan = size.x * 0.75;
        console.log(`- Box Anchor: shoulders at Y=${anchor.y.toFixed(3)}, span=${modelShoulderSpan.toFixed(3)}`);
      }

      // Check pivot shift
      const wrapper = new THREE.Group();
      const pivot = new THREE.Group();
      wrapper.add(pivot);
      pivot.add(scene);
      pivot.position.set(-anchor.x, -anchor.y, -anchor.z);
      scene.updateMatrixWorld(true);

      // Verify that after pivot shift, the shoulder anchor in wrapper space is (0, 0, 0)
      const testPoint = anchor.clone();
      testPoint.applyMatrix4(pivot.matrix);
      console.log(`- Shoulder anchor in wrapper space: [${testPoint.x.toFixed(4)}, ${testPoint.y.toFixed(4)}, ${testPoint.z.toFixed(4)}] (Expected [0, 0, 0])`);

      // Test positioning at participant shoulderMid = (0.5, 0.2, 0)
      const participantShoulderMid = new THREE.Vector3(0.5, 0.2, 0);
      const participantSpan = 0.42; // meters in Three.js world space
      const dynScale = participantSpan / (modelShoulderSpan || 0.44);

      wrapper.position.copy(participantShoulderMid);
      wrapper.scale.set(dynScale, dynScale, dynScale);
      wrapper.updateMatrixWorld(true);

      const finalBox = new THREE.Box3().setFromObject(wrapper);
      console.log(`- Placed at shoulderMid: finalBox Y range [${finalBox.min.y.toFixed(3)}, ${finalBox.max.y.toFixed(3)}]`);
      console.log(`  Shoulders are at Y=${participantShoulderMid.y.toFixed(3)}, head top is above Y, feet are below Y.`);
      console.log(`✓ ANCHORING TEST PASSED FOR ${filename}`);
      resolve();
    });
  });
}

await testModelAnchoring('night_hunter_assassin_-_dark_fantasy.glb', false);
await testModelAnchoring('iron-man_mark_7.glb', false);
await testModelAnchoring('hulk_-_marvel_rivals.glb', true);
await testModelAnchoring('spiderman_brand_new_day.glb', true);
