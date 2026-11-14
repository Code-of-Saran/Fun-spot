import { spriteVariants } from './assets';

const rand = (a, b) => a + Math.random() * (b - a);
const BURST_LIFE = 1.3;

/**
 * Ambient particles (falling petals, rising sparks, things orbiting the head…)
 * plus mouth "power-up" bursts. Positions live in canvas fractions so the same
 * effect works at any resolution; orbiting particles follow the face.
 *
 * motions: fall | rise | drift | pop  (size × canvas height)
 *          orbit                        (size × face width, passes behind/in front of the head)
 */
export function createParticleSystem(configs, burstConfig, sprites) {
  const pickImage = (sprite) => {
    const variants = spriteVariants(sprites, sprite);
    return variants[Math.floor(Math.random() * variants.length)];
  };

  function spawn(cfg, index, initial) {
    const p = {
      cfg,
      img: pickImage(cfg.sprite),
      size: rand(cfg.size[0], cfg.size[1]),
      rot: rand(0, Math.PI * 2),
      spin: rand(-1.5, 1.5),
      phase: rand(0, Math.PI * 2),
      x: rand(0, 1),
      y: 0,
      vx: 0,
      vy: 0,
      age: 0,
    };
    switch (cfg.motion) {
      case 'fall':
        p.y = initial ? rand(-0.1, 1) : rand(-0.15, -0.05);
        p.vy = rand(0.07, 0.15);
        break;
      case 'rise':
        p.y = initial ? rand(0.2, 1.1) : rand(1.02, 1.12);
        p.vy = -rand(0.05, 0.12);
        break;
      case 'drift': {
        const dir = Math.random() < 0.5 ? -1 : 1;
        p.x = initial ? rand(0, 1) : dir > 0 ? -0.1 : 1.1;
        p.y = rand(0.1, 0.9);
        p.vx = dir * rand(0.08, 0.16);
        p.vy = rand(-0.02, 0.02);
        p.spin = dir * rand(4, 8);
        break;
      }
      case 'orbit':
        p.angle = (index / Math.max(1, cfg.count)) * Math.PI * 2 + rand(-0.3, 0.3);
        p.speed = rand(0.5, 0.9);
        p.radius = rand(0.85, 1.1);
        break;
      case 'pop': {
        // around the edges, away from the face
        const side = Math.floor(rand(0, 4));
        p.x = side === 0 ? rand(0.06, 0.2) : side === 1 ? rand(0.8, 0.94) : rand(0.1, 0.9);
        p.y = side === 2 ? rand(0.1, 0.22) : side === 3 ? rand(0.78, 0.9) : rand(0.15, 0.85);
        p.age = initial ? rand(0, 1.4) : 0;
        p.rot = rand(-0.3, 0.3);
        p.spin = 0;
        break;
      }
      default:
        break;
    }
    return p;
  }

  const ambient = configs.flatMap((cfg) => Array.from({ length: cfg.count }, (_, i) => spawn(cfg, i, true)));
  let bursts = [];

  function update(dt) {
    ambient.forEach((p, i) => {
      p.age += dt;
      p.rot += p.spin * dt;
      switch (p.cfg.motion) {
        case 'fall':
        case 'rise':
          p.y += p.vy * dt;
          p.x += Math.sin(p.age * 1.5 + p.phase) * 0.02 * dt;
          if (p.y > 1.15 || p.y < -0.15) ambient[i] = spawn(p.cfg, i, false);
          break;
        case 'drift':
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          if (p.x < -0.15 || p.x > 1.15) ambient[i] = spawn(p.cfg, i, false);
          break;
        case 'orbit':
          p.angle += p.speed * dt;
          break;
        case 'pop':
          if (p.age > 1.4) ambient[i] = spawn(p.cfg, i, false);
          break;
        default:
          break;
      }
    });
    bursts = bursts.filter((b) => (b.age += dt) < BURST_LIFE);
    bursts.forEach((b) => {
      b.vy += 0.9 * dt; // gravity (canvas heights / s²)
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.rot += b.spin * dt;
    });
  }

  function drawSprite(ctx, img, x, y, size, rot, alpha) {
    if (!img || alpha <= 0.01) return;
    const h = size;
    const w = (size * img.width) / img.height;
    ctx.save();
    ctx.globalAlpha = Math.min(1, alpha);
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.drawImage(img, -w / 2, -h / 2, w, h);
    ctx.restore();
  }

  /** layer: 'back' (behind the face art) or 'front'. */
  function draw(ctx, layer, g) {
    const { width: W, height: H } = ctx.canvas;
    for (const p of ambient) {
      const { motion } = p.cfg;
      if (motion === 'orbit') {
        if (!g) continue;
        const behind = Math.sin(p.angle) < 0;
        if ((layer === 'back') !== behind) continue;
        const c = g.anchors.center;
        const x = c.x + Math.cos(p.angle) * p.radius * g.width;
        const y = c.y - g.width * 0.15 + Math.sin(p.angle) * p.radius * g.width * 0.35;
        const depth = behind ? 0.75 : 1;
        drawSprite(ctx, p.img, x, y, p.size * g.width * depth, p.rot, behind ? 0.6 : 1);
        continue;
      }
      if (layer !== 'back') continue;
      let alpha = 1;
      let size = p.size * H;
      if (motion === 'rise') alpha = Math.min(1, p.y / 0.35);
      if (motion === 'pop') {
        const k = p.age / 1.4;
        size *= Math.min(1, k * 5) * (1 + k * 0.15);
        alpha = k < 0.75 ? 1 : 1 - (k - 0.75) / 0.25;
      }
      drawSprite(ctx, p.img, p.x * W, p.y * H, size, p.rot, alpha);
    }
    if (layer === 'front') {
      for (const b of bursts) {
        drawSprite(ctx, b.img, b.x * W, b.y * H, b.size * H, b.rot, 1 - b.age / BURST_LIFE);
      }
    }
  }

  /** Emits a burst from a point (canvas pixels). */
  function burst(origin, canvasWidth, canvasHeight) {
    if (!burstConfig) return;
    const size = burstConfig.size ?? [0.04, 0.07];
    for (let i = 0; i < burstConfig.count; i += 1) {
      const angle = rand(-Math.PI * 0.95, -Math.PI * 0.05);
      const speed = rand(0.35, 0.75);
      bursts.push({
        img: pickImage(burstConfig.sprite),
        x: origin.x / canvasWidth,
        y: origin.y / canvasHeight,
        vx: (Math.cos(angle) * speed * canvasHeight) / canvasWidth,
        vy: Math.sin(angle) * speed,
        size: rand(size[0], size[1]),
        rot: rand(0, Math.PI * 2),
        spin: rand(-6, 6),
        age: 0,
      });
    }
  }

  return { update, draw, burst };
}
