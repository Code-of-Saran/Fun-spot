import { stat } from 'node:fs/promises';
import { join } from 'node:path';
import { CHARACTER_MODELS } from '../src/config/characterModels.js';
import { CHARACTERS } from '../src/games/transformation/characters.js';

console.log('=== VERIFYING CHARACTER TO MODEL CONFIGURATION ===\n');

let allOk = true;

for (const char of CHARACTERS) {
  const modelConfig = CHARACTER_MODELS[char.id];
  console.log(`Character: ${char.name} (${char.id})`);
  console.log(`- Status: ${modelConfig.status}`);
  console.log(`- Description: ${modelConfig.description}`);

  if (modelConfig.modelFile) {
    const fullPath = join('c:/project/funspot-main/public/assets/3D models', modelConfig.modelFile);
    try {
      const fileStat = await stat(fullPath);
      const sizeMB = (fileStat.size / (1024 * 1024)).toFixed(2);
      console.log(`- Local File Exists: YES (${sizeMB} MB)`);

      // Test HTTP fetch from local dev server
      const url = `http://localhost:5173/assets/3D%20models/${encodeURIComponent(modelConfig.modelFile)}`;
      const res = await fetch(url, { method: 'HEAD' });
      if (res.ok) {
        console.log(`- HTTP Fetch (200 OK): YES (${res.headers.get('content-length')} bytes)`);
      } else {
        console.error(`- HTTP Fetch FAILED: ${res.status}`);
        allOk = false;
      }
    } catch (e) {
      console.error(`- Local File Missing: ${e.message}`);
      allOk = false;
    }
  } else {
    console.log(`- Model Asset: None on disk (Status: MODEL_REQUIRED, Procedural 3D active)`);
  }
  console.log('');
}

if (allOk) {
  console.log('>>> ALL CONFIGURED MODELS VERIFIED AND ACCESSIBLE VIA VITE HTTP <<<');
} else {
  console.error('>>> SOME MODEL ASSETS FAILED VERIFICATION <<<');
  process.exit(1);
}
