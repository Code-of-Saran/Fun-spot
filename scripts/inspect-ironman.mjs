import fs from 'fs';
import path from 'path';

function inspectGlbDetailed(filePath) {
  const buf = fs.readFileSync(filePath);
  const magic = buf.readUInt32LE(0);
  if (magic !== 0x46546c67) {
    console.log(filePath, 'Not a GLB file');
    return;
  }
  const jsonLen = buf.readUInt32LE(12);
  const jsonStr = buf.toString('utf8', 20, 20 + jsonLen);
  const gltf = JSON.parse(jsonStr);

  console.log('\n========================================');
  console.log('FILE:', path.basename(filePath));
  console.log('========================================');
  console.log('Nodes count:', gltf.nodes?.length);
  console.log('Meshes count:', gltf.meshes?.length);
  console.log('Skins count:', gltf.skins?.length);

  if (gltf.meshes) {
    console.log('\n--- Meshes ---');
    gltf.meshes.forEach((m, idx) => {
      console.log(`  Mesh[${idx}]: name="${m.name}" primitives=${m.primitives?.length}`);
      m.primitives?.forEach((p, pIdx) => {
        console.log(`    Prim[${pIdx}]: material=${p.material} attrs=${Object.keys(p.attributes).join(',')}`);
      });
    });
  }

  if (gltf.materials) {
    console.log('\n--- Materials ---');
    gltf.materials.forEach((mat, idx) => {
      console.log(`  Material[${idx}]: name="${mat.name}"`);
    });
  }

  if (gltf.nodes) {
    console.log('\n--- Nodes with Meshes or Children ---');
    gltf.nodes.forEach((n, idx) => {
      const isMesh = n.mesh !== undefined ? `mesh=${n.mesh} (${gltf.meshes[n.mesh]?.name})` : '';
      const skin = n.skin !== undefined ? `skin=${n.skin}` : '';
      const children = n.children ? `children=[${n.children.join(', ')}]` : '';
      console.log(`  Node[${idx}]: name="${n.name}" ${isMesh} ${skin} ${children}`);
    });
  }
}

const dir = path.join(process.cwd(), 'public', 'assets', '3D models');
inspectGlbDetailed(path.join(dir, 'iron-man_mark_7.glb'));
