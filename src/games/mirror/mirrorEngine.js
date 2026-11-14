import { computeFaceGeometry, createFaceSmoother } from './faceGeometry';

const HOLD_MS = 350; // keep drawing the last pose this long through brief tracking drops
const LOST_AFTER_MS = 600; // after this the UI says "look at the camera"
const SCAN_STEP = 6; // draw every Nth mesh point in scan mode

/**
 * Per-frame AR pipeline, run outside React:
 *   face frame → geometry (smoothed) → mode-specific drawing on the overlay canvas.
 *
 * modes: 'check' (camera check brackets), 'scan' (holographic face scan while
 *        transforming), 'character' (the live costume via the current renderer).
 * Calls onFaceChange(visible) only when tracking is gained or lost, and
 * onBurst() when the player triggers a power-up — so React re-renders rarely.
 */
export function createMirrorEngine({ onFaceChange, onBurst } = {}) {
  const smoother = createFaceSmoother();
  let renderer = null;
  let mode = 'check';
  let lastSeenT = -Infinity;
  let faceVisible = null;

  function drawBrackets(ctx, g, color) {
    const c = g.anchors.center;
    const w = g.width * 0.75;
    const h = g.height * 0.85;
    const arm = g.width * 0.18;
    ctx.save();
    ctx.translate(c.x, c.y - g.height * 0.08);
    ctx.rotate(g.roll);
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(3, g.width * 0.02);
    ctx.shadowColor = color;
    ctx.shadowBlur = 14;
    for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      ctx.beginPath();
      ctx.moveTo(sx * w, sy * h + -sy * arm);
      ctx.lineTo(sx * w, sy * h);
      ctx.lineTo(sx * w + -sx * arm, sy * h);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawScan(ctx, frame, g, t) {
    const H = ctx.canvas.height;
    ctx.save();
    ctx.fillStyle = 'rgba(25, 230, 240, 0.9)';
    ctx.shadowColor = '#19e6f0';
    ctx.shadowBlur = 8;
    const r = Math.max(1.5, g.width * 0.008);
    for (let i = 0; i < frame.face.length; i += SCAN_STEP) {
      const p = frame.face[i];
      ctx.fillRect(p.x * H - r, p.y * H - r, r * 2, r * 2);
    }
    // a scan line sweeping down the face
    const top = g.anchors.top.y - g.height * 0.15;
    const span = g.height * 1.3;
    const y = top + ((t / 900) % 1) * span;
    const x = g.anchors.center.x;
    const gradient = ctx.createLinearGradient(x - g.width, 0, x + g.width, 0);
    gradient.addColorStop(0, 'rgba(255, 43, 214, 0)');
    gradient.addColorStop(0.5, 'rgba(255, 43, 214, 0.95)');
    gradient.addColorStop(1, 'rgba(255, 43, 214, 0)');
    ctx.fillStyle = gradient;
    ctx.shadowColor = '#ff2bd6';
    ctx.fillRect(x - g.width, y, g.width * 2, Math.max(3, g.width * 0.015));
    ctx.restore();
  }

  return {
    setMode(next) {
      mode = next;
    },
    setRenderer(next) {
      renderer = next;
    },
    reset() {
      smoother.reset();
      lastSeenT = -Infinity;
      faceVisible = null;
    },

    /** Handles one face frame and redraws the overlay canvas. */
    process(frame, canvas) {
      const ctx = canvas.getContext('2d');
      const { width: W, height: H } = canvas;
      if (!W || !H) return;

      let g = null;
      if (frame.face) {
        g = smoother.update(computeFaceGeometry(frame.face, frame.blendshapes, H), frame.t);
        lastSeenT = frame.t;
      } else if (frame.t - lastSeenT < HOLD_MS) {
        g = smoother.last;
      }

      const visible = frame.t - lastSeenT < LOST_AFTER_MS;
      if (visible !== faceVisible) {
        faceVisible = visible;
        onFaceChange?.(visible);
      }

      if (mode === 'character' && renderer) {
        if (renderer.render(ctx, g, frame.t).burst) onBurst?.();
        return;
      }
      ctx.clearRect(0, 0, W, H);
      if (!g) return;
      if (mode === 'scan' && frame.face) drawScan(ctx, frame, g, frame.t);
      drawBrackets(ctx, g, mode === 'scan' ? '#ff2bd6' : '#39ff88');
    },
  };
}
