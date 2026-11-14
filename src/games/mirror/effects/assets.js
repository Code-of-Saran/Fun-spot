/**
 * Loads character art once and pre-renders it to canvases ("sprites"), so the
 * per-frame renderer only blits bitmaps — no SVG re-rasterising every frame.
 * Results are cached for the whole session, so replays don't reload anything.
 */
const MAX_SIDE = 512;
const cache = new Map();

export function spriteKey(source) {
  if (typeof source === 'string') return source;
  if (source.emoji) return `emoji:${source.emoji}`;
  if (source.shape) return `shape:${source.shape}`;
  return `${source.src}#${source.tint ?? ''}`;
}

function makeCanvas(width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  return canvas;
}

async function rasterize(src, tint) {
  const img = new Image();
  img.decoding = 'async';
  img.src = src;
  await img.decode(); // rejects if the file is missing or broken
  const w = img.naturalWidth || 256;
  const h = img.naturalHeight || 256;
  const scale = Math.min(3, MAX_SIDE / Math.max(w, h));
  const canvas = makeCanvas(w * scale, h * scale);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  if (tint) {
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = tint;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  return canvas;
}

function emojiSprite(emoji) {
  const canvas = makeCanvas(96, 96);
  const ctx = canvas.getContext('2d');
  ctx.font = '76px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(emoji, 48, 54);
  return canvas;
}

const CONFETTI_COLORS = ['#ff3b3b', '#ffd60a', '#2f7bff', '#2ee86a', '#ff2bd6', '#19e6f0'];

function shapeSprite(shape) {
  if (shape === 'puff') {
    const canvas = makeCanvas(128, 128);
    const ctx = canvas.getContext('2d');
    const g = ctx.createRadialGradient(64, 64, 4, 64, 64, 62);
    g.addColorStop(0, 'rgba(210, 215, 230, 0.55)');
    g.addColorStop(1, 'rgba(210, 215, 230, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
    return canvas;
  }
  if (shape === 'confetti') {
    return CONFETTI_COLORS.map((color) => {
      const canvas = makeCanvas(24, 40);
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, 24, 40);
      return canvas;
    });
  }
  throw new Error(`Unknown sprite shape: ${shape}`);
}

/** @returns {Promise<HTMLCanvasElement | HTMLCanvasElement[]>} */
export function loadSprite(source) {
  const key = spriteKey(source);
  if (!cache.has(key)) {
    const promise = (async () => {
      if (typeof source === 'string') return rasterize(source);
      if (source.emoji) return emojiSprite(source.emoji);
      if (source.shape) return shapeSprite(source.shape);
      return rasterize(source.src, source.tint);
    })().catch((error) => {
      cache.delete(key); // allow "TRY AGAIN"
      throw error;
    });
    cache.set(key, promise);
  }
  return cache.get(key);
}

/** Every sprite source a character uses (layers, particles, burst). */
export function characterSources(character) {
  const sources = [];
  const add = (sprite) => (Array.isArray(sprite) ? sprite.forEach(add) : sprite && sources.push(sprite));
  character.layers.forEach((layer) => add(layer.asset));
  (character.particles ?? []).forEach((p) => add(p.sprite));
  add(character.burst?.sprite);
  return sources;
}

/** Loads all art for a character. Rejects if any piece fails (→ CHARACTER LOAD ERROR). */
export async function loadCharacterAssets(character) {
  const sources = characterSources(character);
  const entries = await Promise.all(sources.map(async (source) => [spriteKey(source), await loadSprite(source)]));
  return new Map(entries);
}

/** All bitmap variants for a sprite source (arrays and multi-variant shapes flattened). */
export function spriteVariants(sprites, source) {
  if (Array.isArray(source)) return source.flatMap((s) => spriteVariants(sprites, s));
  const sprite = sprites.get(spriteKey(source));
  if (!sprite) return [];
  return Array.isArray(sprite) ? sprite : [sprite];
}
