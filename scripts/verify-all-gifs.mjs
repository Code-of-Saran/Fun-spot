import fs from 'fs';

// Read content.js
const code = fs.readFileSync('src/games/dontLaugh/content.js', 'utf8');

// Extract the GIF_CONTENT block
const gifBlock = code.substring(code.indexOf('const GIF_CONTENT = ['), code.indexOf('export const CONTENT ='));

// Evaluate just the GIF list safely
const lines = gifBlock.split('\n')
  .filter(l => l.trim().startsWith('gif('))
  .map(l => {
    // extract arguments inside gif(...)
    const match = l.match(/gif\(\s*'([^']+)'\s*,\s*(?:'((?:\\'|[^'])+)'|"((?:\\"|[^"])+)")/);
    if (!match) return null;
    const id = match[1];
    const rawFilename = (match[2] || match[3]).replace(/\\'/g, "'").replace(/\\"/g, '"');
    return { id, filename: rawFilename };
  })
  .filter(Boolean);

console.log(`Parsed ${lines.length} GIF entries from content.js\n`);

let failed = 0;
for (const item of lines) {
  const url = `http://localhost:5173/assets/gifs/${item.filename}`;
  const res = await fetch(url);
  const ct = res.headers.get('content-type');
  const cl = res.headers.get('content-length');
  if (res.ok && ct && ct.includes('image/gif')) {
    console.log(`✅ [${res.status}] ${item.id} -> ${(cl / 1024).toFixed(0)} KB (${ct})`);
  } else {
    console.error(`❌ [${res.status}] ${item.id} -> ${url} (${ct})`);
    failed++;
  }
}

if (failed === 0 && lines.length === 27) {
  console.log(`\n🎉 SUCCESS: All 27 GIFs are verified to return 200 OK with content-type image/gif!`);
} else {
  console.log(`\n❌ Total failures: ${failed}`);
}
