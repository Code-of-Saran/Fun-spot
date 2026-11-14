import fs from 'fs';
import path from 'path';

function inspectHinata() {
  const filePath = 'public/assets/3D models/hinata_free_fire_skin.glb';
  const buf = fs.readFileSync(filePath);
  const jsonLen = buf.readUInt32LE(12);
  const jsonStr = buf.toString('utf8', 20, 20 + jsonLen);
  const gltf = JSON.parse(jsonStr);

  console.log('=== Hinata Meshes ===');
  gltf.meshes.forEach((m, idx) => {
    console.log(`[${idx}] "${m.name}"`);
  });

  console.log('=== Hinata Nodes with Meshes ===');
  gltf.nodes.forEach((n, idx) => {
    if (n.mesh !== undefined) {
      console.log(`Node[${idx}] "${n.name}" -> Mesh[${n.mesh}] "${gltf.meshes[n.mesh].name}"`);
    }
  });
}

inspectHinata();
