import { clamp01 } from '../../../vision/landmarks';
import { spriteVariants } from './assets';

/**
 * Draws one image layer attached to a face anchor: position, scale and head
 * tilt come from the face; yaw slightly shifts and squashes the art so it
 * "turns" with the head.
 */
function drawImageLayer(ctx, layer, img, g, t) {
  const sides = layer.pair ? [-1, 1] : [1];
  const w = layer.width * g.width;
  const h = (w * img.height) / img.width;
  const [pivotX, pivotY] = layer.pivot ?? [0.5, 0.5];
  const [offsetX, offsetY] = layer.offset ?? [0, 0];

  for (const side of sides) {
    const anchorName = Array.isArray(layer.anchor) ? layer.anchor[side < 0 ? 0 : 1] : layer.anchor;
    const anchor = g.anchors[anchorName];
    if (!anchor) continue;

    let angle = (layer.tilt ?? 0) * side;
    if (layer.wobble) angle += Math.sin((t / 1000) * layer.wobble.speed * Math.PI * 2) * layer.wobble.amp;

    let scaleX = (layer.pair && side < 0 ? -1 : 1) * (1 - Math.abs(g.yaw) * (layer.squash ?? 0.2));
    if (layer.spinX) scaleX *= Math.cos((t / 1000) * layer.spinX) || 0.01;
    const scaleY = layer.blink ? 1 - 0.85 * clamp01(side < 0 ? g.blinkLeft : g.blinkRight) : 1;

    ctx.save();
    ctx.translate(anchor.x, anchor.y);
    ctx.rotate(g.roll);
    ctx.translate((layer.parallax ?? 0.1) * g.yaw * g.width + offsetX * side * g.width, offsetY * g.width);
    ctx.rotate(angle);
    ctx.scale(scaleX, scaleY);
    ctx.drawImage(img, -pivotX * w, -pivotY * h, w, h);
    ctx.restore();
  }
}

const GRAVITY = 26; // eye radii / s²
const BOUNCE = 0.55;
const MAX_OFFSET = 0.45; // pupil centre may travel this far from the eye centre (in radii)

/**
 * Googly eyes: each pupil is a little physics body. It falls with gravity and
 * lags behind head movement (inertia), bouncing off the rim of the eye.
 */
function drawGooglyEyes(ctx, layer, g, t, state) {
  layer.anchor.forEach((anchorName, i) => {
    const anchor = g.anchors[anchorName];
    if (!anchor) return;
    const r = layer.size * g.width;
    const s = (state[i] ??= { x: 0, y: 0.3, vx: 0, vy: 0, ax: anchor.x, ay: anchor.y, hvx: 0, hvy: 0, t });
    const dt = Math.min(0.05, Math.max(0, (t - s.t) / 1000));
    s.t = t;

    if (dt > 0) {
      // head velocity / acceleration measured in eye radii
      const hvx = (anchor.x - s.ax) / dt / r;
      const hvy = (anchor.y - s.ay) / dt / r;
      const hax = Math.max(-400, Math.min(400, (hvx - s.hvx) / dt));
      const hay = Math.max(-400, Math.min(400, (hvy - s.hvy) / dt));
      s.ax = anchor.x;
      s.ay = anchor.y;
      s.hvx = hvx;
      s.hvy = hvy;

      s.vx += -hax * 0.35 * dt;
      s.vy += (GRAVITY - hay * 0.35) * dt;
      s.vx *= 0.985;
      s.vy *= 0.985;
      s.x += s.vx * dt;
      s.y += s.vy * dt;

      const d = Math.hypot(s.x, s.y);
      if (d > MAX_OFFSET) {
        const nx = s.x / d;
        const ny = s.y / d;
        s.x = nx * MAX_OFFSET;
        s.y = ny * MAX_OFFSET;
        const vn = s.vx * nx + s.vy * ny;
        if (vn > 0) {
          s.vx -= (1 + BOUNCE) * vn * nx;
          s.vy -= (1 + BOUNCE) * vn * ny;
        }
      }
    }

    ctx.save();
    ctx.translate(anchor.x, anchor.y);
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#111111';
    ctx.lineWidth = r * 0.12;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#0b0b0b';
    ctx.beginPath();
    ctx.arc(s.x * r, s.y * r, r * 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath();
    ctx.arc(s.x * r - r * 0.18, s.y * r - r * 0.18, r * 0.12, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
}

/** Draws all of a character's face layers for one frame. `state` persists per character. */
export function drawLayers(ctx, layers, sprites, g, t, state) {
  layers.forEach((layer, index) => {
    if (layer.kind === 'googly') {
      drawGooglyEyes(ctx, layer, g, t, (state[index] ??= {}));
      return;
    }
    const [img] = spriteVariants(sprites, layer.asset);
    if (img) drawImageLayer(ctx, layer, img, g, t);
  });
}
