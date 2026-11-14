import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const dir = 'c:/project/funspot-main/public/assets/3D models';

async function inspectDetail(filename) {
  const buffer = await readFile(join(dir, filename));
  const jsonChunkLength = buffer.readUInt32LE(12);
  const gltf = JSON.parse(buffer.toString('utf8', 20, 20 + jsonChunkLength));

  console.log(`\n================== ${filename} ==================`);
  console.log(`Scene: ${gltf.scene}, Scenes count: ${gltf.scenes?.length}`);
  
  if (gltf.skins && gltf.skins.length > 0) {
    console.log(`Skin 0: joints count = ${gltf.skins[0].joints?.length}`);
    const joints = gltf.skins[0].joints.map(idx => gltf.nodes[idx]?.name || `node_${idx}`);
    console.log(`Key joints matching head/spine/arm/leg:`);
    const keyJoints = joints.filter(name => /head|neck|spine|chest|shoulder|clavicle|arm|elbow|wrist|hand|hip|pelvis|leg|knee|foot/i.test(name));
    console.log(keyJoints.join(', '));
  } else {
    console.log(`No skins found.`);
    const meshNodes = gltf.nodes.filter(n => n.mesh !== undefined).map(n => n.name || `mesh_${n.mesh}`);
    console.log(`Mesh nodes: ${meshNodes.join(', ')}`);
  }
}

await inspectDetail('iron-man_mark_7.glb');
await inspectDetail('hinata_free_fire_skin.glb');
await inspectDetail('hulk_-_marvel_rivals.glb');
await inspectDetail('spiderman_brand_new_day.glb');
await inspectDetail('captain_america_shield.glb');
await inspectDetail('princess_cinderella_clothes.glb');
await inspectDetail('victorian_vampire.glb');
