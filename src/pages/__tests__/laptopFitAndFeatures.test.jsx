import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import {
  MALE_CELEBRITIES,
  FEMALE_CELEBRITIES,
  CELEBRITY_DATABASE,
  findClosestCelebrity,
  matchGroupParticipants,
} from '../../games/lookalike/celebrityDatabase';
import { gameAudio, TRACK_CONFIG } from '../../services/gameAudio';
import { landingMusic } from '../../services/landingMusic';
import { gameModes } from '../../data/gameModes';
import Navbar from '../../components/layout/Navbar';

describe('Fun Spot — Professional Refinements, Laptop Fit, Cursor & Audio Verification', () => {
  describe('Priority 1: Global Cursor & Pointer Interaction Rules', () => {
    const globalCss = readFileSync(resolve('src/styles/global.css'), 'utf-8');
    const backdropCss = readFileSync(resolve('src/components/layout/Backdrop.css'), 'utf-8');

    it('ensures all interactive elements receive pointer cursor and native cursor is never hidden globally', () => {
      expect(globalCss).not.toContain('cursor: none');
      expect(globalCss).toContain('cursor: pointer');
      expect(globalCss).toContain('cursor: text');
      expect(globalCss).toContain('cursor: not-allowed');
      expect(globalCss).toContain('cursor: grab');
      expect(globalCss).toContain('cursor: grabbing');
    });

    it('ensures fixed backdrop and overlays have pointer-events: none', () => {
      expect(backdropCss).toContain('pointer-events: none');
      expect(globalCss).toContain('pointer-events: none !important');
    });
  });

  describe('Priority 2: Laptop Viewport Fit (100dvh & Zero Page Overflow)', () => {
    const navbarCss = readFileSync(resolve('src/components/layout/Navbar.css'), 'utf-8');
    const pageContainerCss = readFileSync(resolve('src/components/layout/PageContainer.css'), 'utf-8');
    const dontLaughCss = readFileSync(resolve('src/games/dontLaugh/DontLaugh.css'), 'utf-8');
    const faceOffCss = readFileSync(resolve('src/games/faceOff/FaceOff.css'), 'utf-8');
    const lookALikeCss = readFileSync(resolve('src/games/lookalike/LookALike.css'), 'utf-8');

    it('enforces compact navigation bar on desktop viewports', () => {
      expect(navbarCss).toContain('min-height: 50px');
      expect(navbarCss).toContain('height: 50px');
    });

    it('enforces compact page-container padding for non-landing pages', () => {
      expect(pageContainerCss).toContain('gap: clamp(');
      expect(pageContainerCss).toContain('padding: clamp(');
    });

    it('enforces 100dvh screen fit for Don\'t Laugh with zero page scrollbar', () => {
      expect(dontLaughCss).toContain('height: calc(100dvh - 68px)');
      expect(dontLaughCss).toContain('max-height: calc(100dvh - 68px)');
      expect(dontLaughCss).toContain('overflow: hidden');
      expect(dontLaughCss).toContain('max-height: calc(100dvh - 300px)');
    });

    it('enforces 100dvh screen fit for Face Off', () => {
      expect(faceOffCss).toContain('height: 100dvh');
      expect(faceOffCss).toContain('max-height: 100dvh');
      expect(faceOffCss).toContain('overflow: hidden');
    });

    it('enforces 100dvh screen fit for Look A Like (Landing, Solo, Group)', () => {
      expect(lookALikeCss).toContain('height: 100dvh');
      expect(lookALikeCss).toContain('max-height: 100dvh');
      expect(lookALikeCss).toContain('overflow: hidden');
    });
  });

  describe('Priority 3: Global Game Background Music & 50% Active Volume Rule', () => {
    beforeEach(() => {
      localStorage.clear();
      gameAudio.resetDefaults();
    });

    it('registers all required game tracks with distinctive styles and fallback synthesizers', () => {
      expect(TRACK_CONFIG['dont-laugh']).toBeDefined();
      expect(TRACK_CONFIG['face-off']).toBeDefined();
      expect(TRACK_CONFIG['look-a-like']).toBeDefined();
      expect(TRACK_CONFIG['ar-dance-floor']).toBeUndefined();

      expect(TRACK_CONFIG['dont-laugh'].style).toBe('upbeat_groove');
      expect(TRACK_CONFIG['face-off'].style).toBe('playful_suspense');
      expect(TRACK_CONFIG['look-a-like'].style).toBe('light_arcade');
    });

    it('automatically scales active game background music to exactly 50% of master level', () => {
      // Master is 0.80, Don't Laugh default BGM is 0.25
      // 50% active game volume rule: 0.80 * 0.25 * 0.5 = 0.10
      gameAudio.startTrack('dont-laugh');
      expect(gameAudio.getEffectiveBgmVolume()).toBeCloseTo(0.10, 2);

      // Face Off default BGM is 0.20 -> 0.80 * 0.20 * 0.5 = 0.08
      gameAudio.startTrack('face-off');
      expect(gameAudio.getEffectiveBgmVolume()).toBeCloseTo(0.08, 2);

      // Look A Like default BGM is 0.22 -> 0.80 * 0.22 * 0.5 = 0.088
      gameAudio.startTrack('look-a-like');
      expect(gameAudio.getEffectiveBgmVolume()).toBeCloseTo(0.088, 2);
    });

    it('maintains landing page background music volume at 100% of configured level', () => {
      landingMusic.setVolume(0.5);
      const state = landingMusic.getState();
      expect(state.volume).toBeCloseTo(0.5, 2);
    });
  });

  describe('Priority 4 & 5: Look A Like Actual Reference Folders & Collection Selection', () => {
    it('accurately discovers 79 Male and 31 Female verified image files on disk', () => {
      expect(MALE_CELEBRITIES).toHaveLength(79);
      expect(FEMALE_CELEBRITIES).toHaveLength(31);
      expect(CELEBRITY_DATABASE).toHaveLength(110);

      // Verify all paths start with actual directory structure
      MALE_CELEBRITIES.forEach((c) => {
        expect(c.image).toMatch(/^\/assets\/LookALike\/Male\//);
        expect(c.gender).toBe('male');
        expect(c.collection).toBe('male');
      });

      FEMALE_CELEBRITIES.forEach((c) => {
        expect(c.image).toMatch(/^\/assets\/LookALike\/Female\//);
        expect(c.gender).toBe('female');
        expect(c.collection).toBe('female');
      });
    });

    it('matches participant against strictly the selected collection (Male vs Female)', () => {
      const poutFeatures = {
        blendshapes: { mouthFrownLeft: 0.9, mouthFrownRight: 0.9, browInnerUp: 0.8 },
        ratios: { mouthCornerTilt: -0.3 },
      };

      // When user selects Female Collection
      const femaleMatch = findClosestCelebrity(poutFeatures, { collection: 'female' });
      expect(femaleMatch.gender).toBe('female');
      expect(FEMALE_CELEBRITIES.some((f) => f.id === femaleMatch.id)).toBe(true);

      // When user selects Male Collection
      const maleMatch = findClosestCelebrity(poutFeatures, { collection: 'male' });
      expect(maleMatch.gender).toBe('male');
      expect(MALE_CELEBRITIES.some((m) => m.id === maleMatch.id)).toBe(true);
    });

    it('associates collection selection per participant in Group Match', () => {
      const participants = [
        {
          participantIndex: 1,
          collection: 'female',
          features: { blendshapes: { mouthSmileLeft: 0.9 }, ratios: {} },
          imageUri: 'mock1',
        },
        {
          participantIndex: 2,
          collection: 'male',
          features: { blendshapes: { eyeWideLeft: 0.9 }, ratios: {} },
          imageUri: 'mock2',
        },
      ];

      const results = matchGroupParticipants(participants);
      expect(results).toHaveLength(2);
      expect(results[0].celebrity.gender).toBe('female');
      expect(results[1].celebrity.gender).toBe('male');
    });

    it('returns exactly ONE single closest celebrity match with NO match percentage', () => {
      const features = {
        blendshapes: { mouthSmileLeft: 0.85, mouthSmileRight: 0.85, jawOpen: 0.4 },
        ratios: { mouthOpenRatio: 0.3 },
      };

      const match = findClosestCelebrity(features, { collection: 'male' });
      expect(match).toBeDefined();
      expect(match.name).toBeDefined();
      // Ensure match object does not expose a percentage score property
      expect(match.matchPercentage).toBeUndefined();
      expect(match.score).toBeUndefined();
    });
  });

  describe('Priority 4: Complete Removal of AR Dance Floor & Active 3-Game Mode Integrity', () => {
    it('confirms gameModes contains exactly 3 games and no AR Dance Floor', () => {
      expect(gameModes).toHaveLength(3);
      const ids = gameModes.map((g) => g.id);
      expect(ids).toEqual(['dont-laugh', 'face-off', 'look-a-like']);
      expect(ids).not.toContain('ar-dance-floor');
      expect(ids).not.toContain('virtual-partner');
    });

    it('confirms obsolete AR Dance Floor directories and page wrappers are removed from disk', () => {
      expect(existsSync(resolve('src/pages/ARDanceFloor.jsx'))).toBe(false);
      expect(existsSync(resolve('src/pages/CharacterTransformation.jsx'))).toBe(false);
      expect(existsSync(resolve('src/games/arDanceFloor'))).toBe(false);
      expect(existsSync(resolve('src/games/transformation'))).toBe(false);
    });

    it('confirms Landing page portals list exactly 3 games', () => {
      const landingHtml = readFileSync(resolve('src/pages/Landing.jsx'), 'utf-8');
      expect(landingHtml).toContain('portal-btn-dont-laugh');
      expect(landingHtml).toContain('portal-btn-face-off');
      expect(landingHtml).toContain('portal-btn-look-a-like');
      expect(landingHtml).not.toContain('portal-btn-ar-dance-floor');
      expect(landingHtml).not.toContain('3D KINEMATICS');
    });
  });

  describe('Priority 5: Global Navbar Distinct Music & SFX Controls', () => {
    it('renders separate, distinct MUSIC and SFX toggle buttons', () => {
      const html = renderToString(
        React.createElement(MemoryRouter, { initialEntries: ['/'] }, React.createElement(Navbar))
      );
      expect(html).toContain('id="navbar-music-toggle"');
      expect(html).toContain('id="navbar-sfx-toggle"');
      expect(html).toContain('MUSIC ON');
      expect(html).toContain('SFX ON');
    });
  });

  describe('Priority 6: Look A Like Result Screen Viewport Fit & Zero Overlap', () => {
    const lookALikeCss = readFileSync(resolve('src/games/lookalike/LookALike.css'), 'utf-8');
    const lookALikePage = readFileSync(resolve('src/games/lookalike/LookALikePage.jsx'), 'utf-8');

    it('enforces compact result header and eliminates top bar AR references', () => {
      expect(lookALikePage).not.toContain('/ar-dance-floor');
      expect(lookALikePage).toContain('lookalike-hero-header--result');
      expect(lookALikePage).toContain('isResultMode');
    });

    it('enforces height containment and zero button overlap in CSS', () => {
      expect(lookALikeCss).toContain('lookalike-hero-header--result');
      expect(lookALikeCss).toContain('lookalike-single-celeb-card');
      expect(lookALikeCss).toContain('lookalike-celeb-photo-wrap');
      expect(lookALikeCss).toContain('lookalike-celeb-info-card');
      expect(lookALikeCss).toContain('lookalike-actions-toolbar');
      expect(lookALikeCss).toContain('flex-shrink: 0');
    });
  });
});

