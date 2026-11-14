import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { createLanding3DScene } from '../landing3DScene';
import Landing from '../Landing';

describe('Landing 3D Scene & WebGL Resilience', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('safely returns null when target element is missing or invalid', () => {
    expect(createLanding3DScene(null)).toBeNull();
    expect(createLanding3DScene(undefined)).toBeNull();
    expect(createLanding3DScene({})).toBeNull();
  });

  it('safely returns null in SSR or non-browser environments without throwing', () => {
    // In Node SSR environment, document is undefined, createLanding3DScene handles it gracefully
    const dummyEl = { tagName: 'DIV' };
    expect(createLanding3DScene(dummyEl)).toBeNull();
  });

  it('handles simulated DOM environment when WebGL is unavailable', () => {
    // jsdom does not allow reassigning window/document globals.
    // Instead, spy on HTMLCanvasElement.prototype.getContext to return null,
    // which simulates WebGL being unavailable (no WebGLRenderingContext).
    const getContextSpy = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);

    try {
      const container = document.createElement('div');
      document.body.appendChild(container);

      const scene = createLanding3DScene(container);
      // When WebGL is unavailable (getContext returns null), scene should be null
      expect(scene).toBeNull();
    } finally {
      getContextSpy.mockRestore();
    }
  });

  it('renders Landing component gracefully with fallback in SSR or when WebGL is disabled', () => {
    let html = '';
    expect(() => {
      html = renderToString(
        React.createElement(MemoryRouter, { initialEntries: ['/'] }, React.createElement(Landing))
      );
    }).not.toThrow();

    expect(html).toContain('FUN SPOT');
    expect(html).toContain('ENTER THE NEON ARCADE');
    expect(html).toContain('cyber-landing__canvas-wrap');
    expect(html).toContain('cyber-landing__canvas-overlay');
  });
});
