/**
 * "Environment" layer drawn over the camera image, around the player:
 * a coloured vignette that follows the face, plus an optional pattern
 * (anime speed lines, comic halftone, old-film grain, filmy light rays).
 */
export function hexToRgba(hex, alpha) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

function speedLines(ctx, cx, cy, inner, outer, t, state) {
  if (!state.lines || t - state.linesAt > 90) {
    state.linesAt = t;
    state.lines = Array.from({ length: 40 }, () => ({
      angle: Math.random() * Math.PI * 2,
      start: inner * (1.25 + Math.random() * 0.7),
      width: 1 + Math.random() * 4,
    }));
  }
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
  for (const line of state.lines) {
    ctx.lineWidth = line.width;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(line.angle) * line.start, cy + Math.sin(line.angle) * line.start);
    ctx.lineTo(cx + Math.cos(line.angle) * outer, cy + Math.sin(line.angle) * outer);
    ctx.stroke();
  }
}

function halftone(ctx, W, H, cx, cy, rx, ry, roll, state) {
  if (!state.dots) {
    const tile = document.createElement('canvas');
    tile.width = 18;
    tile.height = 18;
    const t = tile.getContext('2d');
    t.fillStyle = 'rgba(200, 20, 40, 0.45)';
    t.beginPath();
    t.arc(9, 9, 4.2, 0, Math.PI * 2);
    t.fill();
    state.dots = ctx.createPattern(tile, 'repeat');
  }
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, W, H);
  ctx.ellipse(cx, cy, rx, ry, roll, 0, Math.PI * 2);
  ctx.clip('evenodd'); // dots everywhere except around the face
  ctx.fillStyle = state.dots;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

function filmGrain(ctx, W, H) {
  for (let i = 0; i < 260; i += 1) {
    ctx.fillStyle = Math.random() < 0.5 ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.3)';
    const s = Math.random() < 0.85 ? 1.5 : 3;
    ctx.fillRect(Math.random() * W, Math.random() * H, s, s);
  }
  if (Math.random() < 0.35) {
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 1.5;
    const x = Math.random() * W;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + (Math.random() - 0.5) * 20, H);
    ctx.stroke();
  }
  ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.05})`;
  ctx.fillRect(0, 0, W, H);
}

function lightRays(ctx, W, H, color, t) {
  const cx = W / 2;
  const cy = -H * 0.15;
  const reach = Math.hypot(W, H) * 1.2;
  ctx.fillStyle = hexToRgba(color, 0.1);
  for (let i = 0; i < 12; i += 1) {
    const a = (i / 12) * Math.PI + (t / 1000) * 0.08;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(a) * reach, cy + Math.sin(a) * reach);
    ctx.lineTo(cx + Math.cos(a + 0.09) * reach, cy + Math.sin(a + 0.09) * reach);
    ctx.closePath();
    ctx.fill();
  }
}

/** @param g face geometry in pixels, or null when no face is visible */
export function drawEnvironment(ctx, env, g, t, state) {
  if (!env) return;
  const { width: W, height: H } = ctx.canvas;
  const cx = g ? g.anchors.center.x : W / 2;
  const cy = g ? g.anchors.center.y : H / 2;
  const inner = g ? g.width * 1.05 : H * 0.3;
  const outer = Math.max(Math.hypot(W, H) * 0.65, inner + 1);

  if (env.pattern === 'rays') lightRays(ctx, W, H, env.vignette, t);

  const gradient = ctx.createRadialGradient(cx, cy, inner, cx, cy, outer);
  gradient.addColorStop(0, hexToRgba(env.vignette, 0));
  gradient.addColorStop(0.35, hexToRgba(env.vignette, env.strength * 0.4));
  gradient.addColorStop(1, hexToRgba(env.vignette, env.strength));
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, W, H);

  if (env.pattern === 'speedlines') speedLines(ctx, cx, cy, inner, outer, t, state);
  if (env.pattern === 'halftone') {
    halftone(ctx, W, H, cx, cy, g ? g.width * 1.05 : W * 0.25, g ? g.height * 1.25 : H * 0.4, g ? g.roll : 0, state);
  }
  if (env.pattern === 'grain') filmGrain(ctx, W, H);
}
