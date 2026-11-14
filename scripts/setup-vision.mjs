// Copies the MediaPipe WASM runtime and downloads the landmark models into
// public/mediapipe so the vision system runs fully offline (e.g. at the expo).
// Runs automatically before `npm run dev` / `npm run build`; safe to re-run.
import { copyFile, mkdir, stat, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const wasmSrc = join(root, 'node_modules/@mediapipe/tasks-vision/wasm');
const outDir = join(root, 'public/mediapipe');

const WASM_FILES = [
  'vision_wasm_internal.js',
  'vision_wasm_internal.wasm',
  'vision_wasm_nosimd_internal.js',
  'vision_wasm_nosimd_internal.wasm',
];

const MODELS = {
  'pose_landmarker_lite.task':
    'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task',
  'hand_landmarker.task':
    'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/latest/hand_landmarker.task',
  'face_landmarker.task':
    'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task',
};

const exists = (path) =>
  stat(path).then(
    (s) => s.size > 0,
    () => false,
  );

await mkdir(join(outDir, 'wasm'), { recursive: true });
await mkdir(join(outDir, 'models'), { recursive: true });

for (const file of WASM_FILES) {
  await copyFile(join(wasmSrc, file), join(outDir, 'wasm', file));
}

for (const [file, url] of Object.entries(MODELS)) {
  const target = join(outDir, 'models', file);
  if (await exists(target)) continue;
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    await writeFile(target, Buffer.from(await response.arrayBuffer()));
    console.log(`[setup-vision] downloaded ${file}`);
  } catch (error) {
    // Not fatal: the app falls back to loading the model from Google's CDN at runtime.
    console.warn(`[setup-vision] could not download ${file} (${error.message}); the app will use the CDN instead.`);
  }
}
