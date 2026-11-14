import { isVisible, LIMB_VISIBILITY } from './landmarks';

const POSE_LINKS = [
  [11, 12], [11, 13], [13, 15], [12, 14], [14, 16],
  [11, 23], [12, 24], [23, 24], [23, 25], [24, 26], [25, 27], [26, 28],
];
const POSE_JOINTS = [0, 11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28];
const HAND_LINKS = [
  [0, 1], [1, 2], [2, 3], [3, 4], [0, 5], [5, 6], [6, 7], [7, 8], [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16], [13, 17], [17, 18], [18, 19], [19, 20], [0, 17],
];

/** Draws a neon HUD skeleton for a frame onto a canvas the size of the video. */
/**
 * Draws a neon HUD skeleton for a frame onto a canvas the size of the video.
 * Supports distinct coloring for left and right body sides to verify orientation.
 */
export function drawSkeleton(
  ctx,
  frame,
  {
    color = '#19e6f0',
    rightColor = '#00e676',
    leftColor = '#00f0ff',
    handColor = '#ff2bd6',
    splitSides = true,
  } = {},
) {
  const { width, height } = ctx.canvas;
  ctx.clearRect(0, 0, width, height);
  if (!frame) return;

  const px = (p) => [(p.x / frame.aspect) * width, p.y * height];
  const lineWidth = Math.max(2.5, width / 200);

  ctx.lineCap = 'round';
  ctx.shadowBlur = 12;

  if (frame.pose) {
    // Links with anatomical side attribution
    // Right side links (user's anatomical right: 12, 14, 16, 24, 26, 28)
    const rightLinks = [
      [12, 14], [14, 16], [12, 24], [24, 26], [26, 28],
    ];
    // Left side links (user's anatomical left: 11, 13, 15, 23, 25, 27)
    const leftLinks = [
      [11, 13], [13, 15], [11, 23], [23, 25], [25, 27],
    ];
    // Center / cross links (shoulders, hips)
    const centerLinks = [
      [11, 12], [23, 24],
    ];

    const drawLinkSet = (links, linkColor) => {
      ctx.strokeStyle = linkColor;
      ctx.shadowColor = linkColor;
      ctx.lineWidth = lineWidth;
      ctx.beginPath();
      for (const [a, b] of links) {
        const p = frame.pose[a];
        const q = frame.pose[b];
        if (!isVisible(p, LIMB_VISIBILITY) || !isVisible(q, LIMB_VISIBILITY)) continue;
        ctx.moveTo(...px(p));
        ctx.lineTo(...px(q));
      }
      ctx.stroke();
    };

    if (splitSides) {
      drawLinkSet(centerLinks, color);
      drawLinkSet(rightLinks, rightColor);
      drawLinkSet(leftLinks, leftColor);
    } else {
      drawLinkSet([...centerLinks, ...rightLinks, ...leftLinks], color);
    }

    // Draw joints
    const rightJoints = [12, 14, 16, 24, 26, 28];
    const leftJoints = [11, 13, 15, 23, 25, 27];
    const centerJoints = [0];

    const drawJointSet = (joints, jointColor, radiusMultiplier = 1.3) => {
      ctx.fillStyle = jointColor;
      ctx.shadowColor = jointColor;
      for (const i of joints) {
        const p = frame.pose[i];
        if (!isVisible(p, LIMB_VISIBILITY)) continue;
        const [x, y] = px(p);
        ctx.beginPath();
        ctx.arc(x, y, lineWidth * radiusMultiplier, 0, Math.PI * 2);
        ctx.fill();

        // White center dot for precision
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(x, y, lineWidth * 0.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = jointColor;
      }
    };

    if (splitSides) {
      drawJointSet(centerJoints, '#ffffff', 1.1);
      drawJointSet(rightJoints, rightColor, 1.4);
      drawJointSet(leftJoints, leftColor, 1.4);
    } else {
      drawJointSet(POSE_JOINTS, '#ffffff', 1.3);
    }
  }

  // Draw hands
  if (frame.hands && frame.hands.length > 0) {
    ctx.strokeStyle = handColor;
    ctx.shadowColor = handColor;
    ctx.lineWidth = lineWidth * 0.7;
    for (const hand of frame.hands) {
      ctx.beginPath();
      for (const [a, b] of HAND_LINKS) {
        const p = hand.lm[a];
        const q = hand.lm[b];
        if (!p || !q) continue;
        ctx.moveTo(...px(p));
        ctx.lineTo(...px(q));
      }
      ctx.stroke();
    }
  }
  ctx.shadowBlur = 0;
}
