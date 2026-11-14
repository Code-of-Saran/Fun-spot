import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import SiteLayout from '../SiteLayout';
import Footer from '../Footer';

describe('SiteLayout & Footer — Route-Specific Rendering', () => {
  it('strictly suppresses the global footer on /dont-laugh', () => {
    const html = renderToString(
      <MemoryRouter initialEntries={['/dont-laugh']}>
        <Routes>
          <Route element={<SiteLayout />}>
            <Route path="dont-laugh" element={<div data-testid="dont-laugh-screen">DON&apos;T LAUGH GAME CONTENT</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    // Don't Laugh content is rendered
    expect(html).toContain('DON&#x27;T LAUGH GAME CONTENT');

    // Global footer component is COMPLETELY removed
    expect(html).not.toContain('class="footer"');
    expect(html).not.toContain('footer__brand');
    expect(html).not.toContain('footer__links');

    // Branding is COMPLETELY removed
    expect(html).not.toContain('FUN SPOT <span aria-hidden="true">//</span> AI-POWERED INTERACTIVE ENTERTAINMENT ARCADE');

    // Footer-specific navigation links are COMPLETELY removed
    expect(html).not.toContain('Privacy &amp; Camera');
    expect(html).not.toContain('Privacy & Camera');
    expect(html).not.toContain('Expo Guidelines');
    expect(html).not.toContain('Station Info');
  });

  it('preserves the global footer on other game screens: /face-off and /look-a-like', () => {
    // 1. /face-off
    const faceOffHtml = renderToString(
      <MemoryRouter initialEntries={['/face-off']}>
        <Routes>
          <Route element={<SiteLayout />}>
            <Route path="face-off" element={<div>FACE OFF CONTENT</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(faceOffHtml).toContain('FUN SPOT <span aria-hidden="true">//</span> AI-POWERED INTERACTIVE ENTERTAINMENT ARCADE');
    expect(faceOffHtml).toContain('Privacy &amp; Camera');
    expect(faceOffHtml).toContain('Expo Guidelines');
    expect(faceOffHtml).toContain('Station Info');
    expect(faceOffHtml).toContain('About');

    // 2. /look-a-like
    const lookALikeHtml = renderToString(
      <MemoryRouter initialEntries={['/look-a-like']}>
        <Routes>
          <Route element={<SiteLayout />}>
            <Route path="look-a-like" element={<div>LOOK A LIKE CONTENT</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(lookALikeHtml).toContain('FUN SPOT <span aria-hidden="true">//</span> AI-POWERED INTERACTIVE ENTERTAINMENT ARCADE');
    expect(lookALikeHtml).toContain('Privacy &amp; Camera');
    expect(lookALikeHtml).toContain('Expo Guidelines');
    expect(lookALikeHtml).toContain('Station Info');
    expect(lookALikeHtml).toContain('About');
  });

  it('preserves the standalone Footer component structure for landing page', () => {
    const html = renderToString(
      <MemoryRouter>
        <Footer className="landing__footer" />
      </MemoryRouter>
    );

    expect(html).toContain('landing__footer');
    expect(html).toContain('FUN SPOT <span aria-hidden="true">//</span> AI-POWERED INTERACTIVE ENTERTAINMENT ARCADE');
    expect(html).toContain('Privacy &amp; Camera');
    expect(html).toContain('Expo Guidelines');
    expect(html).toContain('Station Info');
    expect(html).toContain('About');
  });
});
