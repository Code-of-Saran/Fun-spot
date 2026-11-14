const LIPS = [61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 409, 270, 269, 267, 0, 37, 39, 40, 185];
const TONE_COLORS = { safe: '#39ff88', careful: '#ffd60a', warn: '#ff9f1c', critical: '#ff2b6b' };

/**
 * "AI is watching you" HUD on the camera: corner brackets around the face and
 * the tracked mouth outline, coloured by the current laugh-meter band.
 */
export function drawFaceHud(ctx, face, tone = 'safe') {
  const { width: W, height: H } = ctx.canvas;
  ctx.clearRect(0, 0, W, H);
  if (!face || face.length === 0) return;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  const faceLen = face.length;
  for (let i = 0; i < faceLen; i++) {
    const p = face[i];
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  const color = TONE_COLORS[tone] ?? TONE_COLORS.safe;
  const pad = (maxX - minX) * 0.12 * H;
  const x0 = minX * H - pad;
  const y0 = minY * H - pad;
  const x1 = maxX * H + pad;
  const y1 = maxY * H + pad;
  const arm = (x1 - x0) * 0.18;

  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 12;
  ctx.lineWidth = Math.max(3, (x1 - x0) * 0.015);

  // Four HUD corner brackets
  ctx.beginPath();
  // Top-left
  ctx.moveTo(x0, y0 + arm);
  ctx.lineTo(x0, y0);
  ctx.lineTo(x0 + arm, y0);
  // Top-right
  ctx.moveTo(x1, y0 + arm);
  ctx.lineTo(x1, y0);
  ctx.lineTo(x1 - arm, y0);
  // Bottom-right
  ctx.moveTo(x1, y1 - arm);
  ctx.lineTo(x1, y1);
  ctx.lineTo(x1 - arm, y1);
  // Bottom-left
  ctx.moveTo(x0, y1 - arm);
  ctx.lineTo(x0, y1);
  ctx.lineTo(x0 + arm, y1);
  ctx.stroke();

  const r = Math.max(2, (x1 - x0) * 0.008);
  const lipsLen = LIPS.length;
  for (let i = 0; i < lipsLen; i++) {
    const p = face[LIPS[i]];
    if (p) {
      ctx.beginPath();
      ctx.arc(p.x * H, p.y * H, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}
