import fs from 'fs';
import path from 'path';

function inspectDeadpool() {
  const filePath = 'public/assets/3D models/deadpool_-_marvel_rivals.glb';
  const buf = fs.readFileSync(filePath);
  const jsonLen = buf.readUInt32LE(12);
  const jsonStr = buf.toString('utf8', 20, 20 + jsonLen);
  const gltf = JSON.parse(jsonStr);

  console.log('=== Deadpool Meshes ===');
  gltf.meshes.forEach((m, idx) => {
    console.log(`[${idx}] "${m.name}"`);
  });

  console.log('=== Deadpool Nodes with Meshes ===');
  gltf.nodes.forEach((n, idx) => {
    if (n.mesh !== undefined) {
      console.log(`Node[${idx}] "${n.name}" -> Mesh[${n.mesh}] "${gltf.meshes[n.mesh].name}"`);
    }
  });
}

inspectDeadpool();
