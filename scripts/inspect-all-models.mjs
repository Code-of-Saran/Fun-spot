import fs from 'fs';
import path from 'path';

function inspectModelMeshesAndBones(filePath) {
  const buf = fs.readFileSync(filePath);
  const jsonLen = buf.readUInt32LE(12);
  const jsonStr = buf.toString('utf8', 20, 20 + jsonLen);
  const gltf = JSON.parse(jsonStr);

  console.log('\n========================================');
  console.log('FILE:', path.basename(filePath));
  console.log('========================================');
  console.log('Nodes count:', gltf.nodes?.length, '| Meshes count:', gltf.meshes?.length, '| Skins count:', gltf.skins?.length);

  const headMeshMatches = [];
  gltf.meshes?.forEach((m, idx) => {
    if (/head|face|helmet|mask|hair|eye|visor/i.test(m.name)) {
      headMeshMatches.push(`Mesh[${idx}] "${m.name}"`);
    }
  });

  const headNodeMatches = [];
  gltf.nodes?.forEach((n, idx) => {
    if (/head|face|helmet|mask|hair|eye|visor/i.test(n.name)) {
      const isMesh = n.mesh !== undefined ? `mesh=${n.mesh} (${gltf.meshes[n.mesh]?.name})` : '';
      headNodeMatches.push(`Node[${idx}] "${n.name}" ${isMesh}`);
    }
  });

  console.log('Head/Face/Mask Meshes found:', headMeshMatches.length > 0 ? headMeshMatches : 'None (or not named head/mask)');
  console.log('Head/Face/Mask Nodes found:', headNodeMatches.length > 0 ? headNodeMatches : 'None');

  if (gltf.meshes && gltf.meshes.length <= 15) {
    console.log('All meshes in model:');
    gltf.meshes.forEach((m, idx) => console.log(`  [${idx}] "${m.name}"`));
  }
}

const dir = path.join(process.cwd(), 'public', 'assets', '3D models');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.glb'));
for (const f of files) {
  inspectModelMeshesAndBones(path.join(dir, f));
}
