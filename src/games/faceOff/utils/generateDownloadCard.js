/**
 * FUN SPOT — FACE OFF: AI EXPRESSION MATCH
 * Download Card Generator: Creates a high-res cyberpunk souvenir poster combining
 * reference target photo, captured participant photo, score percentage, and title.
 */

export async function generateDownloadCard({
  referenceImgSrc,
  capturedPhotoUrl,
  challenge,
  scoreResult,
  resultTitle,
}) {
  const width = 1200;
  const height = 750;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  // Helper to load image
  const loadImage = (src) =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Failed to load ${src}`));
      img.src = src;
    });

  let refImg = null;
  let userImg = null;

  try {
    [refImg, userImg] = await Promise.all([
      loadImage(referenceImgSrc),
      loadImage(capturedPhotoUrl),
    ]);
  } catch (err) {
    console.error('[FaceOff] Failed to load images for download card:', err);
    // Proceed even if one fails
  }

  // 1. Cyberpunk Dark Background
  const bgGrad = ctx.createLinearGradient(0, 0, width, height);
  bgGrad.addColorStop(0, '#040711');
  bgGrad.addColorStop(0.5, '#080d1e');
  bgGrad.addColorStop(1, '#02040a');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Subtle neon grid lines
  ctx.strokeStyle = 'rgba(0, 240, 255, 0.05)';
  ctx.lineWidth = 1;
  const gridSize = 40;
  for (let x = 0; x < width; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 0; y < height; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  // Outer border with neon corner accents
  ctx.strokeStyle = 'rgba(0, 240, 255, 0.35)';
  ctx.lineWidth = 2;
  ctx.strokeRect(20, 20, width - 40, height - 40);

  // 2. Header
  ctx.font = '900 24px "Orbitron", sans-serif';
  ctx.fillStyle = '#00f0ff';
  ctx.fillText('FUN SPOT // FACE OFF', 45, 60);

  ctx.font = '700 13px "Share Tech Mono", monospace';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.fillText('AI FACIAL EXPRESSION MATCH PROTOCOL', 45, 82);

  const dateStr = new Date().toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  ctx.textAlign = 'right';
  ctx.fillText(`ARCADE CAPTURE • ${dateStr}`, width - 45, 65);
  ctx.textAlign = 'left';

  // Header separator line
  const lineGrad = ctx.createLinearGradient(45, 0, width - 45, 0);
  lineGrad.addColorStop(0, '#00f0ff');
  lineGrad.addColorStop(0.5, '#ff0055');
  lineGrad.addColorStop(1, '#ffb800');
  ctx.fillStyle = lineGrad;
  ctx.fillRect(45, 96, width - 90, 2);

  // 3. Challenge Name & Result Title
  ctx.font = '800 28px "Orbitron", sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(`${challenge.name.toUpperCase()}`, 45, 140);

  ctx.font = '700 15px "Share Tech Mono", monospace';
  ctx.fillStyle = '#ffb800';
  ctx.fillText(`RESULT: "${resultTitle.toUpperCase()}"`, 45, 165);

  // 4. Photo Frame Coordinates
  const cardY = 190;
  const cardW = 390;
  const cardH = 430;
  const leftX = 60;
  const rightX = width - cardW - 60;

  // Draw Helper: Photo Card with neon border
  const drawPhotoCard = (img, x, y, title, badgeColor, borderColor) => {
    // Card background
    ctx.fillStyle = 'rgba(10, 16, 30, 0.85)';
    ctx.fillRect(x, y, cardW, cardH);

    // Image container
    const imgPadding = 12;
    const imgX = x + imgPadding;
    const imgY = y + 42;
    const imgW = cardW - imgPadding * 2;
    const imgH = cardH - 54;

    if (img) {
      // Crop & cover draw
      ctx.save();
      ctx.beginPath();
      ctx.rect(imgX, imgY, imgW, imgH);
      ctx.clip();

      const scale = Math.max(imgW / img.width, imgH / img.height);
      const dw = img.width * scale;
      const dh = img.height * scale;
      const dx = imgX + (imgW - dw) / 2;
      const dy = imgY + (imgH - dh) / 2;

      ctx.drawImage(img, dx, dy, dw, dh);
      ctx.restore();
    } else {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.fillRect(imgX, imgY, imgW, imgH);
    }

    // Card border
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, cardW, cardH);

    // Title bar
    ctx.fillStyle = 'rgba(5, 8, 16, 0.95)';
    ctx.fillRect(x, y, cardW, 36);

    ctx.font = '800 13px "Orbitron", sans-serif';
    ctx.fillStyle = badgeColor;
    ctx.fillText(title, x + 15, y + 24);
  };

  // Draw Target Card (Left)
  drawPhotoCard(refImg, leftX, cardY, 'TARGET EXPRESSION', '#00f0ff', 'rgba(0, 240, 255, 0.5)');

  // Draw Captured Participant Card (Right)
  drawPhotoCard(userImg, rightX, cardY, 'YOUR CAPTURED EXPRESSION', '#00ff88', 'rgba(0, 255, 136, 0.5)');

  // 5. Center Match Badge & Score Display
  const centerX = width / 2;
  const centerY = cardY + cardH / 2;

  // Score circular or box container
  const scoreBoxW = 220;
  const scoreBoxH = 260;
  const scoreBoxX = centerX - scoreBoxW / 2;
  const scoreBoxY = centerY - scoreBoxH / 2;

  ctx.fillStyle = 'rgba(5, 8, 20, 0.92)';
  ctx.fillRect(scoreBoxX, scoreBoxY, scoreBoxW, scoreBoxH);

  ctx.strokeStyle = '#00f0ff';
  ctx.lineWidth = 2;
  ctx.strokeRect(scoreBoxX, scoreBoxY, scoreBoxW, scoreBoxH);

  // Glow line inside
  ctx.strokeStyle = 'rgba(0, 240, 255, 0.3)';
  ctx.strokeRect(scoreBoxX + 6, scoreBoxY + 6, scoreBoxW - 12, scoreBoxH - 12);

  ctx.textAlign = 'center';

  ctx.font = '700 12px "Share Tech Mono", monospace';
  ctx.fillStyle = '#00f0ff';
  ctx.fillText('MATCH PERCENTAGE', centerX, scoreBoxY + 36);

  ctx.font = '900 64px "Orbitron", sans-serif';
  ctx.fillStyle = scoreResult.score >= 70 ? '#00ff88' : scoreResult.score >= 50 ? '#ffb800' : '#ff0055';
  ctx.fillText(`${scoreResult.score}%`, centerX, scoreBoxY + 110);

  ctx.font = '800 14px "Orbitron", sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(scoreResult.score >= 88 ? 'PERFECT SYNC' : scoreResult.score >= 72 ? 'EXCELLENT' : scoreResult.score >= 55 ? 'SOLID MIMIC' : 'PARTIAL', centerX, scoreBoxY + 140);

  // Breakdown metrics
  ctx.font = '600 11px "Share Tech Mono", monospace';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.fillText(`Blendshapes: ${scoreResult.blendshapeSim ?? scoreResult.score}%`, centerX, scoreBoxY + 175);
  ctx.fillText(`Geometry: ${scoreResult.ratioSim ?? scoreResult.score}%`, centerX, scoreBoxY + 195);
  ctx.fillText(`Pose Align: ${scoreResult.poseSim ?? scoreResult.score}%`, centerX, scoreBoxY + 215);

  ctx.textAlign = 'left';

  // 6. Footer Disclaimer & Watermark
  ctx.font = '500 11px "Share Tech Mono", monospace';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.fillText('Measured with MediaPipe Face Landmarker • Processed locally in browser • No biometrics uploaded', 45, height - 35);

  ctx.textAlign = 'right';
  ctx.fillText('FUN SPOT ARCADE EXPERIENCE', width - 45, height - 35);

  // 7. Trigger download
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        resolve(false);
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `funspot-faceoff-${challenge.id}-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      resolve(true);
    }, 'image/png');
  });
}

