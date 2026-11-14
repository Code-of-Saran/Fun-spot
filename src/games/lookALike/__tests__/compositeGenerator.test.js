import { describe, it, expect, vi, beforeAll } from 'vitest';
import { generateSoloComposite, generateGroupComposite } from '../compositeGenerator';
import { CELEBRITY_DATABASE } from '../celebrityDatabase';

describe('Look A Like — Composite Souvenir Card Generator', () => {
  beforeAll(() => {
    // Mock HTML5 Canvas and Image in Node/JSDOM environment
    if (typeof window !== 'undefined') {
      window.HTMLCanvasElement.prototype.getContext = () => ({
        fillRect: vi.fn(),
        clearRect: vi.fn(),
        getImageData: vi.fn(() => ({ data: [] })),
        putImageData: vi.fn(),
        createImageData: vi.fn(() => []),
        setTransform: vi.fn(),
        drawImage: vi.fn(),
        save: vi.fn(),
        fillText: vi.fn(),
        restore: vi.fn(),
        beginPath: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        closePath: vi.fn(),
        stroke: vi.fn(),
        fill: vi.fn(),
        clip: vi.fn(),
        quadraticCurveTo: vi.fn(),
        createLinearGradient: vi.fn(() => ({
          addColorStop: vi.fn(),
        })),
        scale: vi.fn(),
        translate: vi.fn(),
      });

      window.HTMLCanvasElement.prototype.toDataURL = vi.fn(
        () => 'data:image/png;base64,mockCanvasPngData',
      );
    }
  });

  it('generates solo match composite data URL without error', async () => {
    const celeb = CELEBRITY_DATABASE[0];
    const userPhoto = 'data:image/jpeg;base64,mockUserPhoto';

    const result = await generateSoloComposite(userPhoto, celeb);
    expect(result).toMatch(/^data:image\/png;base64,/);
  });

  it('generates group match composite data URL for multiple participants', async () => {
    const matches = [
      {
        participantIndex: 1,
        imageUri: 'data:image/jpeg;base64,mock1',
        celebrity: CELEBRITY_DATABASE[0],
      },
      {
        participantIndex: 2,
        imageUri: 'data:image/jpeg;base64,mock2',
        celebrity: CELEBRITY_DATABASE[1],
      },
    ];

    const result = await generateGroupComposite(matches);
    expect(result).toMatch(/^data:image\/png;base64,/);
  });

  it('returns empty string for empty group match input', async () => {
    const result = await generateGroupComposite([]);
    expect(result).toBe('');
  });
});
