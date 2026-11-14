/**
 * Turns the chosen buffer frame into the souvenir photo:
 *   the player's laugh frame (mirrored, as they saw themselves)
 *   + "CAUGHT LAUGHING" banner, the content that got them (inset), name + time.
 * Returns a JPEG Blob; nothing here touches the network.
 */
const TITLE_FONT = '"Luckiest Guy", Impact, sans-serif';
const HUD_FONT = 'Orbitron, "Segoe UI", sans-serif';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/**
 * @param {{ frame: HTMLCanvasElement, contentImage?: HTMLImageElement, player: string, lastedMs: number }} input
 * @returns {HTMLCanvasElement}
 */
export function composeCapture({ frame, contentImage, player, lastedMs }) {
  const W = frame.width;
  const H = frame.height;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(frame, 0, 0);

  const u = H / 360; // layout unit

  // "what got you" inset, top-right
  if (contentImage?.complete && contentImage.naturalWidth) {
    const iw = W * 0.26;
    const ih = iw * 0.75;
    const x = W - iw - 12 * u;
    const y = 12 * u;
    ctx.save();
    roundRect(ctx, x, y, iw, ih, 8 * u);
    ctx.clip();
    ctx.drawImage(contentImage, x, y, iw, ih);
    ctx.restore();
    ctx.strokeStyle = '#ffd60a';
    ctx.lineWidth = 3 * u;
    roundRect(ctx, x, y, iw, ih, 8 * u);
    ctx.stroke();
    ctx.fillStyle = 'rgba(3, 11, 28, 0.85)';
    ctx.fillRect(x, y + ih - 18 * u, iw, 18 * u);
    ctx.fillStyle = '#ffd60a';
    ctx.font = `700 ${9 * u}px ${HUD_FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('WHAT GOT YOU', x + iw / 2, y + ih - 9 * u);
  }

  // top-left banner, sized to its text
  const title = 'CAUGHT LAUGHING!';
  ctx.save();
  ctx.font = `${22 * u}px ${TITLE_FONT}`;
  const bannerW = ctx.measureText(title).width + 22 * u;
  ctx.translate(14 * u, 14 * u);
  ctx.rotate(-0.04);
  ctx.fillStyle = '#ff2bd6';
  ctx.shadowColor = '#ff2bd6';
  ctx.shadowBlur = 16 * u;
  roundRect(ctx, 0, 0, bannerW, 40 * u, 10 * u);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(title, 11 * u, 21 * u);
  ctx.restore();

  // bottom bar
  const bar = 40 * u;
  const gradient = ctx.createLinearGradient(0, H - bar * 1.6, 0, H);
  gradient.addColorStop(0, 'rgba(3, 11, 28, 0)');
  gradient.addColorStop(0.5, 'rgba(3, 11, 28, 0.85)');
  gradient.addColorStop(1, 'rgba(3, 11, 28, 0.95)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, H - bar * 1.6, W, bar * 1.6);
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.font = `${18 * u}px ${TITLE_FONT}`;
  ctx.textAlign = 'left';
  ctx.fillText(player, 14 * u, H - bar * 0.5);
  ctx.fillStyle = '#19e6f0';
  ctx.font = `700 ${10 * u}px ${HUD_FONT}`;
  ctx.textAlign = 'right';
  ctx.fillText(`FUN SPOT · DON'T LAUGH · LASTED ${(lastedMs / 1000).toFixed(1)}s`, W - 14 * u, H - bar * 0.5);

  // neon border
  ctx.strokeStyle = '#ff2bd6';
  ctx.lineWidth = 4 * u;
  ctx.strokeRect(2 * u, 2 * u, W - 4 * u, H - 4 * u);
  return canvas;
}

export const canvasToBlob = (canvas, type = 'image/jpeg', quality = 0.9) =>
  new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Could not encode the capture'))), type, quality);
  });
