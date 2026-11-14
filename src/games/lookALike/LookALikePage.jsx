import { useState, useCallback, useEffect } from 'react';
import { useFaceMatcher } from './useFaceMatcher';
import SwitchCameraButton from '../../components/camera/SwitchCameraButton';
import {
  CameraIcon,
  HomeIcon,
  RefreshIcon,
  DownloadIcon,
  SparklesIcon,
  AlertIcon,
  SmileIcon,
  MaleIcon,
  FemaleIcon,
} from '../../components/common/Icons';
import { gameAudio } from '../../services/gameAudio';
import './LookALike.css';

/**
 * LOOK A LIKE — AI-Powered Funny Indian Celebrity Resemblance
 *
 * Dedicated Celebrity Category Selection:
 *   - Exactly one game mode: Look A Like (/look-a-like)
 *   - Category selection: Male Celebrities (79 images) vs Female Celebrities (31 images)
 *   - Prominent START MATCH button enabled once category is selected
 *   - Initializes camera only when entering match arena
 *   - Compares captured photo strictly against the selected category reference pool
 *   - Returns strictly ONE closest Indian celebrity match (no random, no hardcoded)
 *   - NO match percentages, NO numerical scores, NO leaderboards
 *   - CHANGE CATEGORY button in arena and result screen returns to category selection
 *   - Reuses camera session across category changes to avoid unnecessary camera restarts
 *   - Background music: 50% during camera/capture, 100% on result reveal
 */
export default function LookALikePage() {
  const [selectedCategory, setSelectedCategory] = useState(null); // 'male' | 'female' | null
  const [viewPhase, setViewPhase] = useState('category_select'); // 'category_select' | 'arena'
  const [isDownloading, setIsDownloading] = useState(false);

  const matcher = useFaceMatcher({
    mode: 'solo',
    autoStartCamera: false,
    initialCollection: selectedCategory || 'male',
  });

  // Background music lifecycle: 50% volume during camera/capture, 100% on match result
  useEffect(() => {
    gameAudio.signalGameEntered('look-a-like');
    return () => {
      gameAudio.setAppState('navigation');
    };
  }, []);

  useEffect(() => {
    if (matcher.workflowState === 'showing_result' && matcher.soloMatch) {
      gameAudio.setAppState('game_completed');
    } else {
      gameAudio.setAppState('game_playing');
    }
  }, [matcher.workflowState, matcher.soloMatch]);

  // Select celebrity category
  const handleSelectCategory = useCallback(
    (category) => {
      setSelectedCategory(category);
      matcher.setSelectedCollection(category);
    },
    [matcher],
  );

  // Start match: enters match arena, starts camera on demand
  const handleStartMatch = useCallback(async () => {
    if (!selectedCategory) return;
    matcher.setSelectedCollection(selectedCategory);
    setViewPhase('arena');
    try {
      await matcher.startCamera();
    } catch (err) {
      console.warn('[LookALike] Camera start error:', err);
    }
  }, [selectedCategory, matcher]);

  // Change category: return to category selection screen while preserving camera session
  const handleChangeCategory = useCallback(() => {
    matcher.resetToCamera();
    setViewPhase('category_select');
  }, [matcher]);

  // Download Composite Photo Card (PNG)
  const handleDownload = useCallback(() => {
    if (!matcher.compositeDataUrl) return;
    setIsDownloading(true);

    try {
      const link = document.createElement('a');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const catLabel = selectedCategory || 'solo';
      link.download = `funspot-lookalike-${catLabel}-${timestamp}.png`;
      link.href = matcher.compositeDataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('[LookALike] Download error:', err);
    } finally {
      setIsDownloading(false);
    }
  }, [matcher.compositeDataUrl, selectedCategory]);

  const isResultMode = viewPhase === 'arena' && matcher.workflowState === 'showing_result' && Boolean(matcher.soloMatch);

  return (
    <div
      className={`lookalike-root ${isResultMode ? 'lookalike-root--result' : ''} ${
        viewPhase === 'category_select' ? 'lookalike-root--select' : ''
      }`.trim()}
      data-testid="lookalike-page"
    >
      {/* ── TOP QUICK NAVIGATION & CONTROLS ───────────────────────────── */}
      <div className="lookalike-top-bar">
        <div className="lookalike-top-bar__nav">
          <a href="/dont-laugh" className="lookalike-pill-btn lookalike-pill-btn--magenta">
            DON&apos;T LAUGH
          </a>
          <a href="/face-off" className="lookalike-pill-btn lookalike-pill-btn--cyan">
            FACE OFF
          </a>
          <a href="/" className="lookalike-pill-btn lookalike-pill-btn--home">
            <HomeIcon size={16} /> HOME
          </a>
        </div>

        {viewPhase === 'arena' && (
          <div className="lookalike-top-bar__controls">
            <button
              type="button"
              id="btn-change-category"
              className="lookalike-pill-btn lookalike-pill-btn--amber"
              onClick={handleChangeCategory}
              title="Return to category selection"
            >
              <RefreshIcon size={14} /> CHANGE CATEGORY
            </button>
            {!isResultMode && (
              <div className="lookalike-top-bar__camera">
                <SwitchCameraButton
                  camera={matcher.camera}
                  showActiveLabel={true}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── HERO HEADING ─────────────────────────────────────────────────── */}
      {viewPhase === 'category_select' ? (
        <header className="lookalike-hero-header">
          <div className="lookalike-eyebrow">
            <span>AI-POWERED ARCADE SIMULATION</span>
            <span className="lookalike-eyebrow-dot">•</span>
            <span>INDIAN CELEBRITY RESEMBLANCE</span>
          </div>

          <h1 className="arcade-title-3d lookalike-main-title">LOOK A LIKE</h1>

          <div className="lookalike-mode-indicator-wrap">
            <h2 className="lookalike-cat-subtitle">Choose Your Celebrity Category</h2>
            <p className="lookalike-mode-lead">
              Select your preferred celebrity collection to discover your iconic funny expression match!
            </p>
          </div>
        </header>
      ) : isResultMode ? (
        <header className="lookalike-hero-header lookalike-hero-header--result">
          <div
            className={`lookalike-banner-pill ${
              selectedCategory === 'female' ? 'lookalike-banner-pill--magenta' : 'lookalike-banner-pill--cyan'
            }`}
          >
            <SparklesIcon size={14} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '4px' }} />
            CELEBRITY MATCH REVEALED • {selectedCategory === 'female' ? 'FEMALE CELEBRITIES' : 'MALE CELEBRITIES'}
          </div>
          <h1 className="lookalike-main-title lookalike-main-title--result">
            LOOK A <span className="lookalike-title-highlight">LIKE</span>
          </h1>
        </header>
      ) : (
        <header className="lookalike-hero-header">
          <div className="lookalike-eyebrow">
            <span>AI-POWERED ARCADE SIMULATION</span>
            <span className="lookalike-eyebrow-dot">•</span>
            <span>INDIAN CELEBRITY RESEMBLANCE</span>
          </div>

          <h1 className="arcade-title-3d lookalike-main-title">LOOK A LIKE</h1>

          <div className="lookalike-mode-indicator-wrap">
            <div
              className={`lookalike-banner-pill ${
                selectedCategory === 'female' ? 'lookalike-banner-pill--magenta' : 'lookalike-banner-pill--cyan'
              }`}
            >
              SOLO MATCH • {selectedCategory === 'female' ? 'FEMALE CELEBRITIES' : 'MALE CELEBRITIES'}
            </div>
            <p className="lookalike-mode-lead">
              Strike a funny expression and discover your iconic Indian celebrity lookalike!
            </p>
          </div>
        </header>
      )}

      {/* ── PHASE 1: CATEGORY SELECTION SCREEN ───────────────────────────── */}
      {viewPhase === 'category_select' ? (
        <main className="lookalike-cat-select-stage" data-testid="lookalike-category-select">
          <div className="lookalike-cat-cards-grid">
            {/* Card 1: Male Celebrities */}
            <button
              type="button"
              id="cat-card-male"
              className={`lookalike-cat-card lookalike-cat-card--male ${
                selectedCategory === 'male' ? 'lookalike-cat-card--selected' : ''
              }`}
              onClick={() => handleSelectCategory('male')}
              aria-pressed={selectedCategory === 'male'}
            >
              <div className="lookalike-cat-card__badge lookalike-cat-card__badge--cyan">
                79 CELEBRITIES
              </div>
              <div className="lookalike-cat-card__icon-wrap lookalike-cat-card__icon-wrap--cyan">
                <MaleIcon size={42} />
              </div>
              <h3 className="lookalike-cat-card__title">Male Celebrities</h3>
              <p className="lookalike-cat-card__desc">
                Match with legendary Indian heroes — Rajinikanth, Shah Rukh Khan, Vijay, Salman Khan, Kamal Haasan, and more!
              </p>
              <div className="lookalike-cat-card__status">
                {selectedCategory === 'male' ? (
                  <span className="lookalike-cat-card__selected-pill lookalike-cat-card__selected-pill--cyan">
                    <SparklesIcon size={14} /> SELECTED
                  </span>
                ) : (
                  <span className="lookalike-cat-card__unselected-pill">
                    SELECT CATEGORY
                  </span>
                )}
              </div>
            </button>

            {/* Card 2: Female Celebrities */}
            <button
              type="button"
              id="cat-card-female"
              className={`lookalike-cat-card lookalike-cat-card--female ${
                selectedCategory === 'female' ? 'lookalike-cat-card--selected' : ''
              }`}
              onClick={() => handleSelectCategory('female')}
              aria-pressed={selectedCategory === 'female'}
            >
              <div className="lookalike-cat-card__badge lookalike-cat-card__badge--magenta">
                31 CELEBRITIES
              </div>
              <div className="lookalike-cat-card__icon-wrap lookalike-cat-card__icon-wrap--magenta">
                <FemaleIcon size={42} />
              </div>
              <h3 className="lookalike-cat-card__title">Female Celebrities</h3>
              <p className="lookalike-cat-card__desc">
                Match with expressive Indian queens of cinema — Deepika Padukone, Nayanthara, Alia Bhatt, Samantha Ruth Prabhu, and more!
              </p>
              <div className="lookalike-cat-card__status">
                {selectedCategory === 'female' ? (
                  <span className="lookalike-cat-card__selected-pill lookalike-cat-card__selected-pill--magenta">
                    <SparklesIcon size={14} /> SELECTED
                  </span>
                ) : (
                  <span className="lookalike-cat-card__unselected-pill">
                    SELECT CATEGORY
                  </span>
                )}
              </div>
            </button>
          </div>

          {/* Start Match CTA */}
          <div className="lookalike-cat-select-actions">
            <button
              type="button"
              id="btn-start-match"
              className={`arcade-btn arcade-btn--lg lookalike-start-match-btn ${
                selectedCategory
                  ? selectedCategory === 'male'
                    ? 'arcade-btn--cyan lookalike-start-match-btn--ready'
                    : 'arcade-btn--magenta lookalike-start-match-btn--ready'
                  : 'arcade-btn--disabled'
              }`}
              disabled={!selectedCategory}
              onClick={handleStartMatch}
            >
              <SparklesIcon size={20} />
              {selectedCategory
                ? `START MATCH (${selectedCategory === 'female' ? 'FEMALE' : 'MALE'})`
                : 'START MATCH'}
            </button>

            <a href="/" className="arcade-btn arcade-btn--ghost lookalike-action-pill">
              <HomeIcon size={16} /> HOME
            </a>
          </div>
        </main>
      ) : (
        /* ── PHASE 2: MATCH ARENA ────────────────────────────────────────── */
        <main className="lookalike-match-stage">
          <div className="lookalike-two-col-grid">
            {/* LEFT PANEL: YOUR CAMERA / FROZEN PARTICIPANT PHOTO */}
            <section className="arcade-panel arcade-panel--cyan lookalike-panel-card lookalike-camera-col">
              <div className="arcade-corner arcade-corner--tl" style={{ color: '#00f0ff' }} />
              <div className="arcade-corner arcade-corner--tr" style={{ color: '#00f0ff' }} />
              <div className="arcade-corner arcade-corner--bl" style={{ color: '#00f0ff' }} />
              <div className="arcade-corner arcade-corner--br" style={{ color: '#00f0ff' }} />

              <div className="lookalike-panel-header">
                <CameraIcon size={20} />
                <h2 className="lookalike-panel-title">
                  {matcher.workflowState === 'showing_result' || matcher.frozenParticipantPhoto
                    ? 'YOUR PHOTO'
                    : 'YOUR CAMERA'}
                </h2>
              </div>

              {/* Viewport Frame */}
              <div className="lookalike-viewfinder-box">
                {matcher.frozenParticipantPhoto ? (
                  <div className="lookalike-frozen-viewport">
                    <img
                      src={matcher.frozenParticipantPhoto}
                      alt="Your captured photo"
                      className="lookalike-frozen-img"
                    />
                    <div className="lookalike-photo-badge lookalike-photo-badge--cyan">
                      {matcher.workflowState === 'showing_result' ? 'YOU' : 'CAPTURED FRAME'}
                    </div>
                  </div>
                ) : (
                  <>
                    <video
                      ref={matcher.videoRef}
                      className="lookalike-video-feed"
                      playsInline
                      muted
                      autoPlay
                    />
                    <canvas ref={matcher.canvasRef} className="lookalike-hud-canvas" />

                    {matcher.camera.status === 'ready' && !matcher.faceDetected && (
                      <div className="lookalike-positioning-hint">
                        <span>Center your face in the frame</span>
                      </div>
                    )}

                    {matcher.countdown !== null && (
                      <div className="lookalike-countdown-overlay">
                        <span className="lookalike-countdown-num">{matcher.countdown}</span>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Panel Controls */}
              <div className="lookalike-panel-footer">
                {matcher.workflowState === 'showing_result' ? (
                  <button
                    type="button"
                    className="arcade-btn arcade-btn--ghost lookalike-capture-btn"
                    onClick={matcher.resetToCamera}
                  >
                    <RefreshIcon size={18} /> RETAKE / NEW PHOTO
                  </button>
                ) : (
                  <button
                    type="button"
                    className="arcade-btn arcade-btn--cyan lookalike-capture-btn"
                    onClick={() => matcher.triggerCapture(0)}
                    disabled={
                      matcher.workflowState === 'capturing' ||
                      matcher.workflowState === 'analyzing' ||
                      matcher.camera.status !== 'ready' ||
                      !matcher.modelReady ||
                      !matcher.faceDetected
                    }
                    id="btn-capture-solo"
                  >
                    <CameraIcon size={20} />{' '}
                    {matcher.workflowState === 'capturing'
                      ? 'CAPTURING...'
                      : matcher.workflowState === 'analyzing'
                      ? 'ANALYZING...'
                      : matcher.camera.status !== 'ready'
                      ? 'STARTING CAMERA...'
                      : !matcher.modelReady
                      ? 'INITIALIZING AI...'
                      : !matcher.faceDetected
                      ? 'LOOK AT CAMERA'
                      : 'CAPTURE PHOTO'}
                  </button>
                )}
              </div>
            </section>

            {/* RIGHT PANEL: YOUR LOOKALIKE RESULT */}
            <section
              className={`arcade-panel ${
                selectedCategory === 'female' ? 'arcade-panel--magenta' : 'arcade-panel--magenta'
              } lookalike-panel-card lookalike-result-col`}
            >
              <div className="arcade-corner arcade-corner--tl" style={{ color: selectedCategory === 'female' ? '#ff007a' : '#00f0ff' }} />
              <div className="arcade-corner arcade-corner--tr" style={{ color: selectedCategory === 'female' ? '#ff007a' : '#00f0ff' }} />
              <div className="arcade-corner arcade-corner--bl" style={{ color: selectedCategory === 'female' ? '#ff007a' : '#00f0ff' }} />
              <div className="arcade-corner arcade-corner--br" style={{ color: selectedCategory === 'female' ? '#ff007a' : '#00f0ff' }} />

              <div className="lookalike-panel-header">
                <SparklesIcon size={20} className="lookalike-sparkle-icon" />
                <h2 className="lookalike-panel-title lookalike-panel-title--magenta">
                  YOUR LOOKALIKE RESULT
                </h2>
              </div>

              {/* State A: Showing Match Result (Strictly ONE Indian celebrity from selected category, NO scores) */}
              {matcher.workflowState === 'showing_result' && matcher.soloMatch ? (
                <div className="lookalike-match-revealed">
                  <div
                    className="lookalike-single-celeb-card"
                    style={{ '--celeb-accent': matcher.soloMatch.celebrity?.themeColor || '#ff007a' }}
                  >
                    <div className="lookalike-celeb-badge">
                      {matcher.soloMatch.celebrity?.badge || 'CELEBRITY MATCH'}
                    </div>

                    <div className="lookalike-celeb-photo-wrap">
                      <img
                        src={matcher.soloMatch.celebrity?.image}
                        alt={matcher.soloMatch.celebrity?.name}
                        className="lookalike-celeb-photo"
                      />
                    </div>

                    <div className="lookalike-celeb-info-card">
                      <h3 className="lookalike-celeb-name">{matcher.soloMatch.celebrity?.name}</h3>
                      <div className="lookalike-celeb-title">{matcher.soloMatch.celebrity?.title}</div>
                      <p className="lookalike-celeb-desc">{matcher.soloMatch.celebrity?.description}</p>
                    </div>
                  </div>
                </div>
              ) : matcher.workflowState === 'analyzing' || matcher.workflowState === 'capturing' ? (
                /* State B: Real Analyzing Loading State */
                <div className="lookalike-placeholder-display">
                  <div className="lookalike-analyzing-card" role="status">
                    <div className="lookalike-spinner" />
                    <h3 className="lookalike-analyzing-title">ANALYZING CAPTURED PHOTO...</h3>
                    <p className="lookalike-analyzing-hint">
                      Scanning facial landmarks and matching against {selectedCategory === 'female' ? 'female' : 'male'} Indian cinema legends
                    </p>
                  </div>
                </div>
              ) : matcher.workflowState === 'error' ? (
                /* State C: Recoverable Error State */
                <div className="lookalike-placeholder-display">
                  <div className="lookalike-error-card" role="alert">
                    <AlertIcon size={32} />
                    <h3 className="lookalike-error-title">MATCHING FAILED</h3>
                    <p className="lookalike-error-desc">
                      {matcher.matcherError || 'Could not analyze face. Please retry.'}
                    </p>
                    <div className="lookalike-error-actions">
                      <button type="button" className="arcade-btn arcade-btn--cyan" onClick={matcher.retryAnalysis}>
                        RETRY ANALYSIS
                      </button>
                      <button type="button" className="arcade-btn arcade-btn--ghost" onClick={matcher.resetToCamera}>
                        TAKE NEW PHOTO
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                /* State D: Clean Empty State Placeholder (Before capture) */
                <div className="lookalike-placeholder-display">
                  <div className="lookalike-empty-placeholder-frame">
                    <div className="lookalike-empty-icon-wrap">
                      <SmileIcon size={48} />
                    </div>
                    <h3 className="lookalike-empty-title">YOUR LOOKALIKE WILL APPEAR HERE</h3>
                    <p className="lookalike-empty-hint">
                      Strike a funny expression and tap Capture Photo on the left to discover your{' '}
                      {selectedCategory === 'female' ? 'female' : 'male'} celebrity lookalike!
                    </p>
                  </div>
                </div>
              )}
            </section>
          </div>

          {/* Bottom Action Controls */}
          <div className="lookalike-actions-toolbar">
            <button
              type="button"
              id="btn-bottom-change-cat"
              className="arcade-btn arcade-btn--amber lookalike-action-pill"
              onClick={handleChangeCategory}
            >
              <RefreshIcon size={16} /> CHANGE CATEGORY
            </button>

            <button
              type="button"
              className="arcade-btn arcade-btn--ghost lookalike-action-pill"
              onClick={matcher.resetToCamera}
            >
              <RefreshIcon size={16} /> TRY AGAIN
            </button>

            {matcher.workflowState === 'showing_result' && (
              <button
                type="button"
                className="arcade-btn arcade-btn--amber lookalike-action-pill"
                onClick={handleDownload}
                disabled={isDownloading}
                id="btn-download-photo"
              >
                <DownloadIcon size={16} />
                {isDownloading ? 'PREPARING IMAGE...' : 'DOWNLOAD PHOTO CARD'}
              </button>
            )}

            <a href="/" className="arcade-btn arcade-btn--ghost lookalike-action-pill">
              <HomeIcon size={16} /> HOME
            </a>
          </div>
        </main>
      )}
    </div>
  );
}
