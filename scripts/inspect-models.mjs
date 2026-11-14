import fs from 'fs';
import path from 'path';

function inspectGlb(filePath) {
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
    gltf.meshes.forEach((m, idx) => console.log(`  Mesh[${idx}]: name="${m.name}" primitives=${m.primitives?.length}`));
  }

  if (gltf.nodes) {
    console.log('\n--- Nodes ---');
    gltf.nodes.forEach((n, idx) => {
      const isMesh = n.mesh !== undefined ? `mesh=${n.mesh} (${gltf.meshes[n.mesh]?.name})` : '';
      const skin = n.skin !== undefined ? `skin=${n.skin}` : '';
      const children = n.children ? `children=[${n.children.join(', ')}]` : '';
      console.log(`  Node[${idx}]: name="${n.name}" ${isMesh} ${skin} ${children}`);
    });
  }

  if (gltf.skins) {
    console.log('\n--- Skins ---');
    gltf.skins.forEach((s, idx) => {
      console.log(`  Skin[${idx}]: name="${s.name}" skeletonRoot=${s.skeleton} jointsCount=${s.joints?.length}`);
    });
  }
}

const modelFiles = [
  'iron-man_mark_7.glb',
  'deadpool_-_marvel_rivals.glb',
  'spiderman_brand_new_day.glb',
  'the_batman_suit_-_textured_and_rigged.glb',
  'hinata_free_fire_skin.glb',
  'hulk_-_marvel_rivals.glb',
  'dress_3_la_dame_a_la_licorne.glb',
  'faceless_vampire_lord_in_black_gothic_armor.glb',
];

const dir = path.join(process.cwd(), 'public', 'assets', '3D models');
for (const file of modelFiles) {
  const p = path.join(dir, file);
  if (fs.existsSync(p)) {
    inspectGlb(p);
  } else {
    console.log('Not found:', file);
  }
}
