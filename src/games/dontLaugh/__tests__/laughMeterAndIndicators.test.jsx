import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import LaughMeter from '../components/LaughMeter';

describe('Don\'t Laugh — In-Game Indicators & Layout Verification', () => {
  it('renders AI LAUGH METER with info button and crosshair SVG graphic', () => {
    const html = renderToString(<LaughMeter percent={15} />);

    // AI LAUGH METER title
    expect(html).toContain('AI LAUGH METER');

    // Crosshair SVG graphic
    expect(html).toContain('dl-meter__crosshair-icon');
    expect(html).toContain('<line x1="22" y1="12" x2="18" y2="12"');

    // Info button with tooltip
    expect(html).toContain('dl-meter__info-btn');
    expect(html).toContain('ⓘ');
    expect(html).toContain('AI Laugh Meter measures sudden facial smiles and laugh contractions');

    // Meter track and ticks (0%, 25%, 50%, 75%, 100%)
    expect(html).toContain('dl-meter__track');
    expect(html).toContain('aria-valuenow="15"');
    expect(html).toContain('0%');
    expect(html).toContain('25%');
    expect(html).toContain('50%');
    expect(html).toContain('75%');
    expect(html).toContain('100%');
  });

  it('ensures DontLaugh.css never locks scrolling and protects AI Laugh Meter visibility', () => {
    const css = readFileSync(resolve('src/games/dontLaugh/DontLaugh.css'), 'utf-8');

    // .dontlaugh-page--stage must allow natural scrolling on laptop displays, never locked
    expect(css).toContain('overflow-y: auto');
    expect(css).toContain('min-height: calc(100dvh - 68px)');

    // .dl-bottom-bar must have flex-shrink: 0 so it is never collapsed or pushed out of layout
    expect(css).toContain('.dl-bottom-bar');
    expect(css).toMatch(/\.dl-bottom-bar\s*\{[^}]*flex-shrink:\s*0/);

    // .dl-bottom-bar must be properly layered
    expect(css).toMatch(/\.dl-bottom-bar\s*\{[^}]*position:\s*relative/);
    expect(css).toMatch(/\.dl-bottom-bar\s*\{[^}]*z-index:\s*10/);

    // .dl-bottom-meta must have flex-shrink: 0 to protect SAFE and TIME displays
    expect(css).toMatch(/\.dl-bottom-meta\s*\{[^}]*flex-shrink:\s*0/);

    // Live viewport must have compact responsive height
    expect(css).toContain('.dl-live-viewport');
    expect(css).toContain('clamp(150px, 24vh, 230px)');
  });
});
