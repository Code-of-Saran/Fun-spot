import { drawLayers } from './layers';
import { drawEnvironment } from './environment';

/**
 * Face geometry for a neon mannequin head centred in a square canvas — lets
 * the reveal card show the character's costume before the camera turns on.
 */
export function mannequinGeometry(size) {
  const fw = size * 0.34;
  const cx = size / 2;
  const cy = size * 0.56;
  const at = (x, y) => ({ x: cx + x * fw, y: cy + y * fw });
  const eyes = at(0, -0.12);
  const chin = at(0, 0.58);
  return {
    width: fw,
    height: fw * 1.2,
    roll: 0,
    yaw: 0,
    eyeWidth: fw * 0.2,
    mouthOpen: 0,
    blinkLeft: 0,
    blinkRight: 0,
    anchors: {
      top: at(0, -0.62),
      forehead: at(0, -0.43),
      eyes,
      leftEye: at(-0.2, -0.12),
      rightEye: at(0.2, -0.12),
      nose: at(0, 0.15),
      upperLip: at(0, 0.25),
      upperLipInner: at(0, 0.3),
      mouth: at(0, 0.32),
      chin,
      neck: { x: cx, y: eyes.y + (chin.y - eyes.y) * 1.32 },
      leftCheek: at(-0.28, 0.12),
      rightCheek: at(0.28, 0.12),
      leftSide: at(-0.5, 0),
      rightSide: at(0.5, 0),
      center: at(0, 0),
    },
  };
}

function drawMannequin(ctx, g) {
  const { center, leftEye, rightEye, mouth } = g.anchors;
  const fw = g.width;
  ctx.save();
  ctx.fillStyle = '#0a1830';
  ctx.strokeStyle = '#19e6f0';
  ctx.lineWidth = Math.max(2, fw * 0.025);
  ctx.shadowColor = '#19e6f0';
  ctx.shadowBlur = 16;
  // shoulders + neck
  ctx.beginPath();
  ctx.moveTo(center.x - fw * 1.3, ctx.canvas.height + 4);
  ctx.quadraticCurveTo(center.x - fw * 1.2, center.y + fw * 0.95, center.x - fw * 0.22, center.y + fw * 0.82);
  ctx.lineTo(center.x - fw * 0.2, center.y + fw * 0.5);
  ctx.lineTo(center.x + fw * 0.2, center.y + fw * 0.5);
  ctx.lineTo(center.x + fw * 0.22, center.y + fw * 0.82);
  ctx.quadraticCurveTo(center.x + fw * 1.2, center.y + fw * 0.95, center.x + fw * 1.3, ctx.canvas.height + 4);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // head
  ctx.beginPath();
  ctx.ellipse(center.x, center.y - fw * 0.15, fw * 0.5, fw * 0.74, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // simple face
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#bff8ff';
  for (const eye of [leftEye, rightEye]) {
    ctx.beginPath();
    ctx.ellipse(eye.x, eye.y, fw * 0.06, fw * 0.035, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = '#bff8ff';
  ctx.lineWidth = Math.max(2, fw * 0.02);
  ctx.beginPath();
  ctx.arc(mouth.x, mouth.y - fw * 0.06, fw * 0.12, 0.2 * Math.PI, 0.8 * Math.PI);
  ctx.stroke();
  ctx.restore();
}

/** Draws the character's costume on the mannequin. */
export function renderCharacterPreview(canvas, character, sprites) {
  const ctx = canvas.getContext('2d');
  const size = canvas.width;
  const g = mannequinGeometry(size);
  ctx.clearRect(0, 0, size, canvas.height);
  drawEnvironment(ctx, { ...character.environment, pattern: undefined }, g, 0, {});
  drawMannequin(ctx, g);
  drawLayers(ctx, character.layers, sprites, g, 0, {});
}
