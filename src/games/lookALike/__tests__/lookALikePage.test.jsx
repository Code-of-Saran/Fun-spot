import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import LookALikePage from '../LookALikePage';
import SoloResultView from '../components/SoloResultView';
import {
  CELEBRITY_DATABASE,
  MALE_CELEBRITIES,
  FEMALE_CELEBRITIES,
  findClosestCelebrity,
} from '../celebrityDatabase';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe('Look A Like — Category Selection & Match Flow', () => {
  let container;
  let root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    if (root) {
      act(() => {
        root.unmount();
      });
      root = null;
    }
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
    container = null;
  });

  it('renders LookALikePage initially in Category Selection screen with Male and Female options', () => {
    const html = renderToString(<LookALikePage />);

    // Title and Subtitle as strictly required
    expect(html).toContain('LOOK A LIKE');
    expect(html).toContain('Choose Your Celebrity Category');
    expect(html).toContain('AI-POWERED ARCADE SIMULATION');
    expect(html).toContain('INDIAN CELEBRITY RESEMBLANCE');

    // Two visually attractive selection cards
    expect(html).toContain('Male Celebrities');
    expect(html).toContain('Female Celebrities');
    expect(html).toContain('cat-card-male');
    expect(html).toContain('cat-card-female');
    expect(html).toContain('79 CELEBRITIES');
    expect(html).toContain('31 CELEBRITIES');

    // START MATCH button present and initially disabled
    expect(html).toContain('btn-start-match');
    expect(html).toContain('disabled');

    // Strictly NO leaderboards, NO obsolete group match tabs
    expect(html).not.toContain('LEADERBOARD');
    expect(html).not.toContain('START GROUP MATCH');
    expect(html).not.toContain('tab-group-match');
  });

  it('interactively updates selectedCategory and enables START MATCH when cards are clicked', async () => {
    act(() => {
      root = createRoot(container);
      root.render(<LookALikePage />);
    });

    const startBtn = container.querySelector('#btn-start-match');
    const maleCard = container.querySelector('#cat-card-male');
    const femaleCard = container.querySelector('#cat-card-female');

    expect(startBtn).toBeTruthy();
    expect(maleCard).toBeTruthy();
    expect(femaleCard).toBeTruthy();

    // 1. Initially START MATCH is disabled and neither card is selected
    expect(startBtn.disabled).toBe(true);
    expect(maleCard.classList.contains('lookalike-cat-card--selected')).toBe(false);
    expect(femaleCard.classList.contains('lookalike-cat-card--selected')).toBe(false);

    // 2. Click Male Celebrities card
    await act(async () => {
      maleCard.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    // Male should be selected, Female unselected, START MATCH enabled
    expect(maleCard.classList.contains('lookalike-cat-card--selected')).toBe(true);
    expect(femaleCard.classList.contains('lookalike-cat-card--selected')).toBe(false);
    expect(startBtn.disabled).toBe(false);
    expect(startBtn.textContent).toContain('START MATCH (MALE)');

    // 3. Click Female Celebrities card
    await act(async () => {
      femaleCard.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    // Female should be selected, Male highlight removed, START MATCH remains enabled
    expect(femaleCard.classList.contains('lookalike-cat-card--selected')).toBe(true);
    expect(maleCard.classList.contains('lookalike-cat-card--selected')).toBe(false);
    expect(startBtn.disabled).toBe(false);
    expect(startBtn.textContent).toContain('START MATCH (FEMALE)');
  });

  it('enters Match Arena on START MATCH and supports returning via CHANGE CATEGORY', async () => {
    act(() => {
      root = createRoot(container);
      root.render(<LookALikePage />);
    });

    const maleCard = container.querySelector('#cat-card-male');
    const startBtn = container.querySelector('#btn-start-match');

    // Select Male and click Start Match
    await act(async () => {
      maleCard.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    await act(async () => {
      startBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    // Now in Arena mode
    expect(container.textContent).toContain('YOUR CAMERA');
    expect(container.textContent).toContain('YOUR LOOKALIKE RESULT');
    expect(container.textContent).toContain('MALE CELEBRITIES');

    // CHANGE CATEGORY button must be available
    const changeCatTop = container.querySelector('#btn-change-category');
    const changeCatBottom = container.querySelector('#btn-bottom-change-cat');
    expect(changeCatTop || changeCatBottom).toBeTruthy();

    // Click CHANGE CATEGORY to return to selection screen
    await act(async () => {
      (changeCatTop || changeCatBottom).dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    // Back to Category Selection
    expect(container.textContent).toContain('Choose Your Celebrity Category');
    expect(container.querySelector('#cat-card-male')).toBeTruthy();
    expect(container.querySelector('#cat-card-female')).toBeTruthy();
  });

  it('strictly segregates datasets: Male searches only Male, Female searches only Female', () => {
    expect(MALE_CELEBRITIES).toHaveLength(79);
    expect(FEMALE_CELEBRITIES).toHaveLength(31);
    expect(CELEBRITY_DATABASE).toHaveLength(110);

    const testFeatures = {
      blendshapes: { mouthSmileLeft: 0.85, mouthSmileRight: 0.85, eyeSquintLeft: 0.6 },
      ratios: { mouthOpenRatio: 0.25, mouthWidthRatio: 0.7 },
    };

    // Selecting Male must search ONLY Male celebrity dataset
    const maleMatch = findClosestCelebrity(testFeatures, { collection: 'male' });
    expect(maleMatch.gender).toBe('male');
    expect(maleMatch.collection).toBe('male');
    expect(maleMatch.image).toMatch(/^\/assets\/LookALike\/Male\//);
    expect(MALE_CELEBRITIES.some((m) => m.id === maleMatch.id)).toBe(true);
    expect(FEMALE_CELEBRITIES.some((f) => f.id === maleMatch.id)).toBe(false);

    // Selecting Female must search ONLY Female celebrity dataset
    const femaleMatch = findClosestCelebrity(testFeatures, { collection: 'female' });
    expect(femaleMatch.gender).toBe('female');
    expect(femaleMatch.collection).toBe('female');
    expect(femaleMatch.image).toMatch(/^\/assets\/LookALike\/Female\//);
    expect(FEMALE_CELEBRITIES.some((f) => f.id === femaleMatch.id)).toBe(true);
    expect(MALE_CELEBRITIES.some((m) => m.id === femaleMatch.id)).toBe(false);
  });

  it('renders SoloResultView with side-by-side comparison, NO Google Drive, and NO numerical scores', () => {
    const celeb = CELEBRITY_DATABASE[0];
    const html = renderToString(
      <SoloResultView
        participantPhoto="data:image/jpeg;base64,mockUserPhoto"
        celebrity={celeb}
        onDownload={vi.fn()}
        onRetake={vi.fn()}
        isDownloading={false}
      />,
    );

    // Displays participant photo and matched celebrity
    expect(html).toContain('SOLO LOOK A LIKE RESULT');
    expect(html).toContain('YOU');
    expect(html).toContain(celeb.name);
    expect(html).toContain(celeb.title);

    // Displays download and retake actions
    expect(html).toContain('DOWNLOAD PHOTO CARD');
    expect(html).toContain('RETAKE / NEW MATCH');

    // STRICT REQUIREMENT CHECK:
    // Google Drive feature removed
    expect(html).not.toContain('SAVE TO GOOGLE DRIVE');
    expect(html).not.toContain('btn-gdrive-solo');

    // No match percentages, numerical scores or multiple celebrity suggestions!
    expect(html).not.toMatch(/\b\d{1,3}%\b/); // No percentages (e.g. 85%, 92%)
    expect(html).not.toContain('Score:');
    expect(html).not.toContain('/100');
    expect(html).not.toContain('Match Score');
    expect(html).not.toContain('Other Suggestions');
  });
});
