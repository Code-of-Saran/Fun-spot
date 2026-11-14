import { describe, it, expect } from 'vitest';
import {
  extractFaceFeaturesAtIndex,
  extractAllDetectedFaces,
  getFaceCropRect,
} from '../faceFeatureExtractor';

describe('Look A Like — Face Feature Extractor & Multi-Face Handling', () => {
  const createMockLandmarks = (shiftX = 0) => {
    const list = [];
    for (let i = 0; i < 478; i++) {
      list.push({ x: 0.4 + shiftX + (i % 10) * 0.01, y: 0.3 + (i % 10) * 0.02, z: 0.0 });
    }
    return list;
  };

  const mockResult = {
    faceLandmarks: [
      createMockLandmarks(0.0),
      createMockLandmarks(0.25),
    ],
    faceBlendshapes: [
      {
        categories: [
          { categoryName: 'mouthSmileLeft', score: 0.85 },
          { categoryName: 'mouthSmileRight', score: 0.85 },
          { categoryName: 'jawOpen', score: 0.4 },
        ],
      },
      {
        categories: [
          { categoryName: 'eyeWideLeft', score: 0.9 },
          { categoryName: 'eyeWideRight', score: 0.9 },
          { categoryName: 'jawOpen', score: 0.6 },
        ],
      },
    ],
    facialTransformationMatrixes: [
      { data: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1] },
      { data: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1] },
    ],
  };

  it('extracts features for a single face at index 0', () => {
    const face = extractFaceFeaturesAtIndex(mockResult, 0);
    expect(face).not.toBeNull();
    expect(face.blendshapes.mouthSmileLeft).toBe(0.85);
    expect(face.blendshapes.jawOpen).toBe(0.4);
    expect(face.ratios).toBeDefined();
    expect(face.headPose).toBeDefined();
    expect(face.boundingBox).toBeDefined();
    expect(face.boundingBox.minX).toBeGreaterThanOrEqual(0);
  });

  it('extracts all detected faces independently in multi-face group mode', () => {
    const allFaces = extractAllDetectedFaces(mockResult);
    expect(allFaces).toHaveLength(2);
    expect(allFaces[0].faceIndex).toBe(0);
    expect(allFaces[0].blendshapes.mouthSmileLeft).toBe(0.85);
    expect(allFaces[1].faceIndex).toBe(1);
    expect(allFaces[1].blendshapes.eyeWideLeft).toBe(0.9);
  });

  it('computes safe padded face crop rectangle without negative coordinates', () => {
    const bbox = { minX: 0.2, maxX: 0.4, minY: 0.3, maxY: 0.6 };
    const rect = getFaceCropRect(bbox, 1280, 720, 0.3);

    expect(rect.sx).toBeGreaterThanOrEqual(0);
    expect(rect.sy).toBeGreaterThanOrEqual(0);
    expect(rect.sx + rect.sWidth).toBeLessThanOrEqual(1280);
    expect(rect.sy + rect.sHeight).toBeLessThanOrEqual(720);
  });

  it('handles null or empty results gracefully', () => {
    expect(extractFaceFeaturesAtIndex(null, 0)).toBeNull();
    expect(extractFaceFeaturesAtIndex({}, 0)).toBeNull();
    expect(extractAllDetectedFaces(null)).toEqual([]);
  });
});
