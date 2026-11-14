/**
 * FUN SPOT — LOOK A LIKE: High-Resolution Souvenir Composite Generator
 * Creates side-by-side comparison image cards for Solo and Group Match modes.
 * Strictly adheres to:
 * - Single celebrity photograph beside participant photo
 * - No match percentages, numerical scores or multiple celebrity suggestions
 */

/**
 * Loads an image from URL into an HTMLImageElement asynchronously.
 */
function loadImage(src) {
  if (!src) return Promise.resolve(null);
  return new Promise((resolve) => {
    const img = new Image();
    let settled = false;
    const done = (result) => {
      if (!settled) {
        settled = true;
        resolve(result);
      }
    };
    img.crossOrigin = 'anonymous';
    img.onload = () => done(img);
    img.onerror = () => done(null);
    // Timeout safeguard for test / offline environments where image loading doesn't fire
    setTimeout(() => done(null), 120);
    img.src = src;
  });
}

/**
 * Draws rounded rectangle path on 2D context.
 */
function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

/**
 * Generates Solo Match Composite Image (1200 x 720).
 *
 * @param {string} participantImageUri - Base64 DataURL or image URL of participant
 * @param {object} celebrity - Matched celebrity database object
 * @returns {Promise<string>} Base64 DataURL (image/png)
 */
export async function generateSoloComposite(participantImageUri, celebrity) {
  const width = 1200;
  const height = 720;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const [userImg, celebImg] = await Promise.all([
    loadImage(participantImageUri),
    loadImage(celebrity?.image || ''),
  ]);

  // 1. Dark Cyber Background with subtle grid
  const bgGrad = ctx.createLinearGradient(0, 0, width, height);
  bgGrad.addColorStop(0, '#0a0d18');
  bgGrad.addColorStop(0.5, '#05070e');
  bgGrad.addColorStop(1, '#0c1022');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Subtle grid lines
  ctx.strokeStyle = 'rgba(0, 240, 255, 0.05)';
  ctx.lineWidth = 1;
  for (let x = 0; x < width; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 0; y < height; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  // 2. Header
  ctx.textAlign = 'center';
  ctx.font = '900 34px "Rajdhani", "Segoe UI", sans-serif';
  ctx.fillStyle = '#00f0ff';
  ctx.shadowColor = '#00f0ff';
  ctx.shadowBlur = 14;
  ctx.fillText('FUN SPOT  •  LOOK A LIKE', width / 2, 60);
  ctx.shadowBlur = 0;

  ctx.font = '600 15px "Segoe UI", sans-serif';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
  ctx.fillText('AI-POWERED FUNNY INDIAN CELEBRITY RESEMBLANCE', width / 2, 88);

  // 3. Side-by-Side Photo Cards
  const cardW = 460;
  const cardH = 460;
  const cardY = 125;
  const cardLeftX = 80;
  const cardRightX = width - cardW - 80;

  // Left Card: Participant
  ctx.save();
  roundRect(ctx, cardLeftX, cardY, cardW, cardH, 16);
  ctx.clip();
  if (userImg) {
    ctx.drawImage(userImg, cardLeftX, cardY, cardW, cardH);
  } else {
    ctx.fillStyle = '#1a1f33';
    ctx.fillRect(cardLeftX, cardY, cardW, cardH);
  }
  ctx.restore();

  // Left Border
  ctx.strokeStyle = '#00f0ff';
  ctx.lineWidth = 3;
  roundRect(ctx, cardLeftX, cardY, cardW, cardH, 16);
  ctx.stroke();

  // Left Badge
  ctx.fillStyle = '#00f0ff';
  roundRect(ctx, cardLeftX + 20, cardY + 20, 110, 32, 6);
  ctx.fill();
  ctx.font = '800 14px "Rajdhani", sans-serif';
  ctx.fillStyle = '#05070e';
  ctx.fillText('PARTICIPANT', cardLeftX + 75, cardY + 41);

  // Center Lightning Connector
  const centerX = width / 2;
  const centerY = cardY + cardH / 2;
  ctx.font = '900 42px "Rajdhani", sans-serif';
  ctx.fillStyle = '#ffd700';
  ctx.shadowColor = '#ffd700';
  ctx.shadowBlur = 18;
  ctx.fillText('⚡', centerX, centerY - 10);
  ctx.shadowBlur = 0;

  ctx.font = '700 15px "Rajdhani", sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.fillText('LOOK A LIKE', centerX, centerY + 24);

  // Right Card: Matched Indian Celebrity
  ctx.save();
  roundRect(ctx, cardRightX, cardY, cardW, cardH, 16);
  ctx.clip();
  if (celebImg) {
    ctx.drawImage(celebImg, cardRightX, cardY, cardW, cardH);
  } else {
    ctx.fillStyle = '#231535';
    ctx.fillRect(cardRightX, cardY, cardW, cardH);
  }

  // Dark overlay banner at bottom of celebrity image for text legibility
  const bannerH = 110;
  const grad = ctx.createLinearGradient(0, cardY + cardH - bannerH, 0, cardY + cardH);
  grad.addColorStop(0, 'rgba(5, 7, 14, 0)');
  grad.addColorStop(0.4, 'rgba(5, 7, 14, 0.85)');
  grad.addColorStop(1, 'rgba(5, 7, 14, 0.98)');
  ctx.fillStyle = grad;
  ctx.fillRect(cardRightX, cardY + cardH - bannerH, cardW, bannerH);
  ctx.restore();

  // Right Border
  const celebColor = celebrity?.themeColor || '#ff00aa';
  ctx.strokeStyle = celebColor;
  ctx.lineWidth = 3;
  roundRect(ctx, cardRightX, cardY, cardW, cardH, 16);
  ctx.stroke();

  // Right Badge
  ctx.fillStyle = celebColor;
  roundRect(ctx, cardRightX + 20, cardY + 20, 160, 32, 6);
  ctx.fill();
  ctx.font = '800 13px "Rajdhani", sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(celebrity?.badge || 'MATCHED CELEBRITY', cardRightX + 100, cardY + 41);

  // Celebrity Labels
  ctx.textAlign = 'left';
  ctx.font = '900 28px "Rajdhani", sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(celebrity?.name?.toUpperCase() || 'CELEBRITY', cardRightX + 24, cardY + cardH - 56);

  ctx.font = '600 16px "Segoe UI", sans-serif';
  ctx.fillStyle = celebColor;
  ctx.fillText(celebrity?.title || 'Funny Expression', cardRightX + 24, cardY + cardH - 32);

  ctx.font = 'italic 12px "Segoe UI", sans-serif';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  const desc = celebrity?.description || '';
  ctx.fillText(desc.length > 55 ? desc.slice(0, 52) + '...' : desc, cardRightX + 24, cardY + cardH - 12);

  // 4. Footer
  ctx.textAlign = 'center';
  ctx.font = '600 13px "Segoe UI", sans-serif';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
  const dateStr = new Date().toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  ctx.fillText(`FUN SPOT ARCADE  •  SOLO MATCH  •  ${dateStr}`, width / 2, height - 30);

  return canvas.toDataURL('image/png');
}

/**
 * Generates Group Match Composite Image (1280 x variable height based on participant count).
 * Organizes each participant alongside their individual matched celebrity.
 *
 * @param {Array<{ participantIndex: number, imageUri: string, celebrity: object }>} matchedPairs
 * @returns {Promise<string>} Base64 DataURL (image/png)
 */
export async function generateGroupComposite(matchedPairs) {
  const count = matchedPairs?.length || 0;
  if (count === 0) return '';

  const width = 1280;
  // Dynamic height: 1-2 participants = 720px, 3-4 = 980px, 5-6 = 1380px
  let height = 720;
  if (count > 2 && count <= 4) height = 980;
  else if (count > 4) height = 1380;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // 1. Cyber Dark Background
  const bgGrad = ctx.createLinearGradient(0, 0, width, height);
  bgGrad.addColorStop(0, '#0a0d18');
  bgGrad.addColorStop(0.5, '#05070e');
  bgGrad.addColorStop(1, '#0c1022');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // 2. Header
  ctx.textAlign = 'center';
  ctx.font = '900 34px "Rajdhani", "Segoe UI", sans-serif';
  ctx.fillStyle = '#00f0ff';
  ctx.shadowColor = '#00f0ff';
  ctx.shadowBlur = 14;
  ctx.fillText('FUN SPOT  •  GROUP LOOK A LIKE', width / 2, 54);
  ctx.shadowBlur = 0;

  ctx.font = '600 14px "Segoe UI", sans-serif';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
  ctx.fillText(`MULTI-PARTICIPANT CELEBRITY RESEMBLANCE  (${count} PARTICIPANTS)`, width / 2, 80);

  // Pre-load all images
  const loadedPairs = await Promise.all(
    matchedPairs.map(async (pair) => {
      const [uImg, cImg] = await Promise.all([
        loadImage(pair.imageUri),
        loadImage(pair.celebrity?.image || ''),
      ]);
      return { ...pair, uImg, cImg };
    }),
  );

  // Calculate layout rows and columns
  // For 2: 2 rows of comparison strips
  // For 3-4: 2x2 grid of comparison pairs
  // For 5-6: 3 rows of pairs
  const topOffset = 110;
  const footerOffset = 45;
  const availableH = height - topOffset - footerOffset;

  let cols = 1;
  let rows = count;
  if (count > 2) {
    cols = 2;
    rows = Math.ceil(count / 2);
  }

  const rowHeight = Math.min(260, (availableH - (rows - 1) * 20) / rows);
  const colWidth = (width - 100 - (cols - 1) * 30) / cols;

  loadedPairs.forEach((pair, idx) => {
    const r = Math.floor(idx / cols);
    const c = idx % cols;
    const blockX = 50 + c * (colWidth + 30);
    const blockY = topOffset + r * (rowHeight + 20);

    // Block container
    ctx.fillStyle = 'rgba(12, 18, 36, 0.85)';
    roundRect(ctx, blockX, blockY, colWidth, rowHeight, 12);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.3)';
    ctx.lineWidth = 1.5;
    roundRect(ctx, blockX, blockY, colWidth, rowHeight, 12);
    ctx.stroke();

    // Inside block: Participant on left, Celebrity on right
    const photoSize = rowHeight - 24;
    const p1X = blockX + 16;
    const p1Y = blockY + 12;

    // Participant photo
    ctx.save();
    roundRect(ctx, p1X, p1Y, photoSize, photoSize, 8);
    ctx.clip();
    if (pair.uImg) {
      ctx.drawImage(pair.uImg, p1X, p1Y, photoSize, photoSize);
    } else {
      ctx.fillStyle = '#1e2540';
      ctx.fillRect(p1X, p1Y, photoSize, photoSize);
    }
    ctx.restore();
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 2;
    roundRect(ctx, p1X, p1Y, photoSize, photoSize, 8);
    ctx.stroke();

    // Resemblance Arrow / Lightning in center
    const arrowX = p1X + photoSize + 22;
    const arrowY = blockY + rowHeight / 2;
    ctx.textAlign = 'center';
    ctx.font = '700 20px sans-serif';
    ctx.fillStyle = '#ffd700';
    ctx.fillText('⚡', arrowX, arrowY + 6);

    // Celebrity photo
    const cX = arrowX + 22;
    const cY = p1Y;
    ctx.save();
    roundRect(ctx, cX, cY, photoSize, photoSize, 8);
    ctx.clip();
    if (pair.cImg) {
      ctx.drawImage(pair.cImg, cX, cY, photoSize, photoSize);
    } else {
      ctx.fillStyle = '#2c1e40';
      ctx.fillRect(cX, cY, photoSize, photoSize);
    }
    ctx.restore();
    const celebTheme = pair.celebrity?.themeColor || '#ff00aa';
    ctx.strokeStyle = celebTheme;
    ctx.lineWidth = 2;
    roundRect(ctx, cX, cY, photoSize, photoSize, 8);
    ctx.stroke();

    // Celebrity text on the right side of block
    const textX = cX + photoSize + 16;
    const textAvailableW = blockX + colWidth - textX - 12;

    ctx.textAlign = 'left';
    ctx.font = '800 12px "Rajdhani", sans-serif';
    ctx.fillStyle = '#00f0ff';
    ctx.fillText(`PARTICIPANT 0${pair.participantIndex || idx + 1}`, textX, blockY + 34);

    ctx.font = '900 20px "Rajdhani", sans-serif';
    ctx.fillStyle = '#ffffff';
    const name = pair.celebrity?.name?.toUpperCase() || 'INDIAN CELEBRITY';
    ctx.fillText(name, textX, blockY + 60, textAvailableW);

    ctx.font = '600 13px "Segoe UI", sans-serif';
    ctx.fillStyle = celebTheme;
    ctx.fillText(pair.celebrity?.title || '', textX, blockY + 80, textAvailableW);

    ctx.font = 'italic 11px "Segoe UI", sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
    const desc = pair.celebrity?.description || '';
    ctx.fillText(desc.length > 38 ? desc.slice(0, 36) + '...' : desc, textX, blockY + 102, textAvailableW);
  });

  // 3. Footer
  ctx.textAlign = 'center';
  ctx.font = '600 13px "Segoe UI", sans-serif';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
  const dateStr = new Date().toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  ctx.fillText(`FUN SPOT ARCADE  •  GROUP MATCH  •  ${dateStr}`, width / 2, height - 16);

  return canvas.toDataURL('image/png');
}
