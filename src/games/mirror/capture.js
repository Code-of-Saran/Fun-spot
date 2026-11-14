/**
 * Builds the souvenir photo from exactly what the player sees:
 * mirrored camera frame (with the character's colour grade) + the AR overlay
 * canvas (environment, costume, particles) + a Fun Spot frame.
 * Stays in the browser: returns a Blob and an object URL (no upload).
 */
const FONT_TITLE = '"Luckiest Guy", Impact, sans-serif';
const FONT_HUD = 'Orbitron, "Segoe UI", sans-serif';

function drawFrame(ctx, W, H, character, category) {
  const bar = Math.round(H * 0.12);
  const pad = Math.round(W * 0.025);

  // bottom banner
  const gradient = ctx.createLinearGradient(0, H - bar * 1.6, 0, H);
  gradient.addColorStop(0, 'rgba(3, 11, 28, 0)');
  gradient.addColorStop(0.45, 'rgba(3, 11, 28, 0.8)');
  gradient.addColorStop(1, 'rgba(3, 11, 28, 0.95)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, H - bar * 1.6, W, bar * 1.6);

  ctx.textBaseline = 'middle';
  ctx.shadowColor = '#19e6f0';
  ctx.shadowBlur = 12;
  ctx.fillStyle = '#ffffff';
  ctx.font = `${Math.round(bar * 0.42)}px ${FONT_TITLE}`;
  ctx.textAlign = 'left';
  ctx.fillText(`${character.icon} ${character.name}`, pad, H - bar * 0.55);

  ctx.shadowBlur = 0;
  ctx.font = `700 ${Math.round(bar * 0.2)}px ${FONT_HUD}`;
  ctx.fillStyle = '#19e6f0';
  ctx.textAlign = 'right';
  ctx.fillText('FUN SPOT · AI MIRROR', W - pad, H - bar * 0.7);
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.fillText(category ? category.label : '', W - pad, H - bar * 0.38);

  // neon border
  ctx.strokeStyle = '#19e6f0';
  ctx.lineWidth = Math.max(4, W * 0.006);
  ctx.shadowColor = '#19e6f0';
  ctx.shadowBlur = 18;
  const inset = ctx.lineWidth;
  ctx.strokeRect(inset, inset, W - inset * 2, H - inset * 2);
  ctx.shadowBlur = 0;
}

/**
 * @param {{ video: HTMLVideoElement, overlay: HTMLCanvasElement, character: object, category?: object }} input
 * @returns {Promise<{ blob: Blob, url: string, width: number, height: number }>}
 */
export async function captureMirror({ video, overlay, character, category }) {
  const W = video?.videoWidth;
  const H = video?.videoHeight;
  if (!W || !H) throw new Error('Camera frame not available');

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  ctx.save();
  ctx.filter = character.filter ?? 'none';
  ctx.translate(W, 0);
  ctx.scale(-1, 1); // mirror, like the live view
  ctx.drawImage(video, 0, 0, W, H);
  ctx.restore();

  if (overlay?.width) ctx.drawImage(overlay, 0, 0, W, H);
  drawFrame(ctx, W, H, character, category);

  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not encode the photo'))), 'image/jpeg', 0.92);
  });
  return { blob, url: URL.createObjectURL(blob), width: W, height: H };
}
