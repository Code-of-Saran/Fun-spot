import fs from 'fs';

const code = fs.readFileSync('src/config/characterModels.js', 'utf8');
const matches = [...code.matchAll(/modelUrl:\s*`\${MODEL_BASE_URL}\/([^`]+)`/g)];

console.log(`Found ${matches.length} modelUrl declarations in characterModels.js\n`);

let failed = 0;
for (const m of matches) {
  const filename = m[1];
  const url = `http://localhost:5173/assets/3D%20models/${filename}`;
  const res = await fetch(url);
  const cl = res.headers.get('content-length');
  if (res.ok && res.status === 200) {
    console.log(`✅ [200] ${filename} -> ${(cl / 1024 / 1024).toFixed(2)} MB`);
  } else {
    console.error(`❌ [${res.status}] ${url}`);
    failed++;
  }
}

if (failed === 0 && matches.length === 10) {
  console.log(`\n🎉 SUCCESS: All 10 3D models load with HTTP 200 OK!`);
} else {
  console.log(`\n❌ Failed: ${failed}`);
}
