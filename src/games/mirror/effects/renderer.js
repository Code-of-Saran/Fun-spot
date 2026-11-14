import { drawEnvironment } from './environment';
import { drawLayers } from './layers';
import { createParticleSystem } from './particles';

const MOUTH_OPEN = 0.45;
const MOUTH_CLOSED = 0.25;
const BURST_COOLDOWN_MS = 700;

/**
 * Turns one character into a per-frame canvas renderer:
 * environment → back particles → face layers → front particles / bursts.
 * Each round creates a fresh renderer, so no state leaks between characters.
 */
export function createCharacterRenderer(character, sprites) {
  const particles = createParticleSystem(character.particles ?? [], character.burst, sprites);
  const envState = {};
  const layerState = {};
  let lastT = null;
  let lastGeometry = null;
  let visibility = 0;
  let mouthOpen = false;
  let lastBurstT = -Infinity;

  return {
    /**
     * @param g face geometry in canvas pixels, or null when no face is tracked
     * @returns {{ burst: boolean }} burst = the player just triggered a power-up
     */
    render(ctx, g, t) {
      const dt = lastT === null ? 0 : Math.min(0.1, (t - lastT) / 1000);
      lastT = t;
      if (g) lastGeometry = g;
      // fade the costume in when a face appears and out when it's lost
      visibility = Math.max(0, Math.min(1, visibility + (g ? 6 : -4) * dt));

      const { width: W, height: H } = ctx.canvas;
      ctx.clearRect(0, 0, W, H);
      drawEnvironment(ctx, character.environment, g, t, envState);
      particles.update(dt);
      particles.draw(ctx, 'back', g);

      let burst = false;
      if (lastGeometry && visibility > 0.01) {
        ctx.save();
        ctx.globalAlpha = visibility;
        drawLayers(ctx, character.layers, sprites, lastGeometry, t, layerState);
        ctx.restore();
      }
      if (g) {
        if (!mouthOpen && g.mouthOpen > MOUTH_OPEN && t - lastBurstT > BURST_COOLDOWN_MS) {
          mouthOpen = true;
          lastBurstT = t;
          particles.burst(g.anchors.mouth, W, H);
          burst = true;
        } else if (mouthOpen && g.mouthOpen < MOUTH_CLOSED) {
          mouthOpen = false;
        }
      }
      particles.draw(ctx, 'front', g);
      return { burst };
    },
  };
}
