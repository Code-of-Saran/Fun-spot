import fs from 'fs';
import path from 'path';

function getAccessorBounds(gltf, accessorIdx) {
  const acc = gltf.accessors[accessorIdx];
  return { min: acc.min, max: acc.max, count: acc.count };
}

function inspectMeshBounds(filePath) {
  const buf = fs.readFileSync(filePath);
  const jsonLen = buf.readUInt32LE(12);
  const jsonStr = buf.toString('utf8', 20, 20 + jsonLen);
  const gltf = JSON.parse(jsonStr);

  console.log('=== Inspecting Meshes for:', path.basename(filePath), '===');
  gltf.meshes.forEach((m, idx) => {
    console.log(`\nMesh ${idx} "${m.name}":`);
    m.primitives.forEach((p, pIdx) => {
      const posAccIdx = p.attributes.POSITION;
      const bounds = getAccessorBounds(gltf, posAccIdx);
      console.log(`  Prim ${pIdx}: vertexCount=${bounds.count}`);
      console.log(`    Min: [${bounds.min.map(v => v.toFixed(3)).join(', ')}]`);
      console.log(`    Max: [${bounds.max.map(v => v.toFixed(3)).join(', ')}]`);
      const size = bounds.max.map((v, i) => v - bounds.min[i]);
      const center = bounds.min.map((v, i) => (v + bounds.max[i]) / 2);
      console.log(`    Size: [${size.map(v => v.toFixed(3)).join(', ')}]`);
      console.log(`    Center: [${center.map(v => v.toFixed(3)).join(', ')}]`);
    });
  });
}

inspectMeshBounds('public/assets/3D models/iron-man_mark_7.glb');
