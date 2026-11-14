import { useEffect, useRef, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import CyberButton from '../components/common/CyberButton';
import { gameModes } from '../data/gameModes';
import { createLanding3DScene } from './landing3DScene';
import { landingMusic } from '../services/landingMusic';
import LandingMusicPlayer from '../components/audio/LandingMusicPlayer';
import './Landing.css';

export default function Landing() {
  const navigate = useNavigate();
  const containerRef = useRef(null);
  const sceneInstanceRef = useRef(null);
  const [webGlAvailable, setWebGlAvailable] = useState(true);
  const [webGlError, setWebGlError] = useState(null);
  const [activePortal, setActivePortal] = useState('dont-laugh');

  // Background music lifecycle: starts/resumes on landing, pauses on leave
  useEffect(() => {
    landingMusic.enterLanding();
    return () => {
      landingMusic.leaveLanding();
    };
  }, []);

  // Initialize Three.js 3D Scroll Scene
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    let scene = null;
    try {
      scene = createLanding3DScene(container);
    } catch (err) {
      console.warn('[Landing] createLanding3DScene initialization failed:', err);
      setWebGlAvailable(false);
      if (import.meta.env.DEV) {
        setWebGlError(err?.message || 'WebGL context creation error');
      }
      return undefined;
    }

    if (!scene) {
      setWebGlAvailable(false);
      return undefined;
    }

    sceneInstanceRef.current = scene;
    setWebGlAvailable(true);

    const onScroll = () => {
      const scrollY = window.scrollY || window.pageYOffset;
      const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const progress = Math.min(1, Math.max(0, scrollY / maxScroll));
      scene.setScrollProgress(progress);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    return () => {
      window.removeEventListener('scroll', onScroll);
      if (sceneInstanceRef.current) {
        sceneInstanceRef.current.dispose();
        sceneInstanceRef.current = null;
      }
    };
  }, []);

  const handleScrollTo = useCallback((id) => {
    const target = document.getElementById(id);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  return (
    <div className="cyber-landing">
      <a href="#portals" className="skip-link">
        Skip to arcade games
      </a>

      {/* 3D WebGL Background Scene Container */}
      <div
        ref={containerRef}
        className={`cyber-landing__canvas-wrap ${!webGlAvailable ? 'cyber-landing__canvas-wrap--fallback' : ''}`}
        aria-hidden="true"
      >
        <div className="cyber-landing__canvas-overlay" />
        {!webGlAvailable && (
          <div className="cyber-landing__fallback-backdrop">
            <div className="cyber-landing__fallback-grid" />
            <div className="cyber-landing__fallback-glow-cyan" />
            <div className="cyber-landing__fallback-glow-magenta" />
            {import.meta.env.DEV && (
              <div className="cyber-landing__fallback-diag">
                SYSTEM: 2D CYBER FALLBACK ACTIVE {webGlError ? `(${webGlError})` : ''}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Top Navbar */}
      <Navbar className="cyber-landing__nav" />

      <main className="cyber-landing__main">
        {/* =========================================================
            SCENE 1: ARRIVAL (Cinematic Cyber Hero)
            ========================================================= */}
        <section id="hero" className="cyber-scene cyber-hero" aria-labelledby="hero-title">
          <div className="cyber-hero__container">
            <div className="cyber-hero__badge">
              <span className="cyber-hero__pulse-dot" aria-hidden="true" />
              <span className="cyber-hero__badge-text">ENTER THE NEON ARCADE</span>
            </div>

            <h1 id="hero-title" className="cyber-hero__title">
              FUN SPOT
            </h1>

            <p className="cyber-hero__subtitle">
              Survive the laughter. Match facial expressions. Discover your Indian celebrity lookalike.
            </p>

            <div className="cyber-hero__actions">
              <button
                type="button"
                className="cyber-hero__btn-main"
                onClick={() => handleScrollTo('portals')}
                id="hero-enter-arcade"
              >
                <span>ENTER THE ARCADE</span>
                <span className="cyber-hero__btn-arrow" aria-hidden="true">
                  ▼
                </span>
              </button>

              <button
                type="button"
                className="cyber-hero__btn-secondary"
                onClick={() => handleScrollTo('protocol')}
              >
                <span>ARCADE PROTOCOL</span>
                <span aria-hidden="true">⟶</span>
              </button>
            </div>

            <div className="cyber-hero__scroll-cue" aria-hidden="true">
              <span className="cyber-hero__mouse-icon">
                <span className="cyber-hero__mouse-wheel" />
              </span>
              <span>SCROLL TO DIVE IN</span>
            </div>
          </div>
        </section>

        {/* =========================================================
            SCENE 2: ARCADE REVEAL (Atmospheric Parallax & Features)
            ========================================================= */}
        <section id="reveal" className="cyber-scene cyber-reveal" aria-label="Arcade overview">
          <div className="cyber-reveal__card">
            <div className="cyber-reveal__header">
              <span className="cyber-reveal__tag">CYBER TERMINAL ACTIVE</span>
              <span className="cyber-reveal__ping">ONLINE</span>
            </div>

            <h2 className="cyber-reveal__heading">NEXT-GEN INTERACTIVE GAMING</h2>

            <p className="cyber-reveal__text">
              Fun Spot transforms normal browser play into high-octane sensory entertainment using
              real-time AI computer vision, micro-expression tracking, and deep facial feature matching.
            </p>

            <div className="cyber-reveal__grid">
              <div className="cyber-reveal__item">
                <span className="cyber-reveal__icon" aria-hidden="true">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" fill="#00f0ff" stroke="#00f0ff" strokeWidth="1" strokeLinejoin="round" /></svg>
                </span>
                <div className="cyber-reveal__item-title">CELEBRITY MATCH</div>
                <div className="cyber-reveal__item-desc">
                  Real-time neural feature extraction matching your face to Indian cinema legends.
                </div>
              </div>

              <div className="cyber-reveal__item">
                <span className="cyber-reveal__icon" aria-hidden="true">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="10" stroke="#00f0ff" strokeWidth="2" /><path d="M8 14s1.5 2 4 2 4-2 4-2" stroke="#00f0ff" strokeWidth="2" strokeLinecap="round" /><circle cx="9" cy="9" r="1.5" fill="#00f0ff" /><circle cx="15" cy="9" r="1.5" fill="#00f0ff" /></svg>
                </span>
                <div className="cyber-reveal__item-title">VISION REACTION</div>
                <div className="cyber-reveal__item-desc">
                  Continuous optical monitoring penalizing sudden smiles and bursts of laughter.
                </div>
              </div>

              <div className="cyber-reveal__item">
                <span className="cyber-reveal__icon" aria-hidden="true">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" stroke="#00f0ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><circle cx="12" cy="13" r="4" stroke="#00f0ff" strokeWidth="2" /></svg>
                </span>
                <div className="cyber-reveal__item-title">EXPRESSION ANALYSIS</div>
                <div className="cyber-reveal__item-desc">
                  Sub-millimeter facial mesh geometry scoring expression recreation accuracy.
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================
            SCENE 3: THREE INTERACTIVE ARCADE PORTALS
            ========================================================= */}
        <section id="portals" className="cyber-scene cyber-portals" aria-label="Game Selection Portals">
          <div className="cyber-portals__header">
            <div className="cyber-portals__eyebrow">NEON GATEWAYS</div>
            <h2 className="cyber-portals__title">SELECT YOUR SIMULATION</h2>
            <p className="cyber-portals__lead">
              Three unique games. Full webcam and AI computer vision integration. Choose your challenge:
            </p>
          </div>

          <div className="cyber-portals__grid">
            {/* PORTAL 1: Don't Laugh */}
            <article
              className={`cyber-portal-card cyber-portal-card--magenta ${activePortal === 'dont-laugh' ? 'cyber-portal-card--active' : ''
                }`}
              onMouseEnter={() => setActivePortal('dont-laugh')}
              tabIndex="0"
              onFocus={() => setActivePortal('dont-laugh')}
            >
              <div className="cyber-portal-card__glow" />
              <div className="cyber-portal-card__badge">01 • DON&apos;T LAUGH</div>
              <div className="cyber-portal-card__icon" aria-hidden="true">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M8 14s1.5 2 4 2 4-2 4-2" />
                  <line x1="9" y1="9" x2="9.01" y2="9" strokeWidth="3" />
                  <line x1="15" y1="9" x2="15.01" y2="9" strokeWidth="3" />
                </svg>
              </div>

              <h3 className="cyber-portal-card__name">DON&apos;T LAUGH</h3>

              <p className="cyber-portal-card__desc">
                Funny GIFs and comedy content. Live camera reaction capture. Timed entertainment rounds. Keep a poker face or trigger laughter overload!
              </p>

              <div className="cyber-portal-card__specs">
                <span>● SMILE DETECTION</span>
                <span>● COMEDY MEME FEEDS</span>
                <span>● REACTION CAPTURE</span>
              </div>

              <CyberButton
                variant="magenta"
                size="medium"
                className="cyber-portal-card__btn"
                onClick={() => navigate('/dont-laugh')}
                id="portal-btn-dont-laugh"
              >
                PLAY DON&apos;T LAUGH ⟶
              </CyberButton>
            </article>

            {/* PORTAL 2: Face Off */}
            <article
              className={`cyber-portal-card cyber-portal-card--lime ${activePortal === 'face-off' ? 'cyber-portal-card--active' : ''
                }`}
              onMouseEnter={() => setActivePortal('face-off')}
              tabIndex="0"
              onFocus={() => setActivePortal('face-off')}
            >
              <div className="cyber-portal-card__glow" />
              <div className="cyber-portal-card__badge">02 • FACE OFF</div>
              <div className="cyber-portal-card__icon" aria-hidden="true">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
              </div>

              <h3 className="cyber-portal-card__name">FACE OFF</h3>

              <p className="cyber-portal-card__desc">
                Recreate the facial expression shown in a reference photograph. AI facial-expression comparison. Match percentage and captured-photo result.
              </p>

              <div className="cyber-portal-card__specs">
                <span>● AI EXPRESSION MATCH</span>
                <span>● 5s POSE WINDOW</span>
                <span>● SOUVENIR CARD</span>
              </div>

              <CyberButton
                variant="lime"
                size="medium"
                className="cyber-portal-card__btn"
                onClick={() => navigate('/face-off')}
                id="portal-btn-face-off"
              >
                PLAY FACE OFF ⟶
              </CyberButton>
            </article>

            {/* PORTAL 3: Look A Like */}
            <article
              className={`cyber-portal-card cyber-portal-card--amber ${activePortal === 'look-a-like' ? 'cyber-portal-card--active' : ''
                }`}
              onMouseEnter={() => setActivePortal('look-a-like')}
              tabIndex="0"
              onFocus={() => setActivePortal('look-a-like')}
            >
              <div className="cyber-portal-card__glow" />
              <div className="cyber-portal-card__badge">03 • LOOK A LIKE</div>
              <div className="cyber-portal-card__icon" aria-hidden="true">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
              </div>

              <h3 className="cyber-portal-card__name">LOOK A LIKE</h3>

              <p className="cyber-portal-card__desc">
                Funny Indian celebrity resemblance. Compare against the Male or Female reference-image collection selected by the participant. Discover your single closest star match.
              </p>

              <div className="cyber-portal-card__specs">
                <span>● MALE (43) &amp; FEMALE (17)</span>
                <span>● 60 ICONIC STARS</span>
                <span>● PHOTO CARD DOWNLOAD</span>
              </div>

              <CyberButton
                variant="cyan"
                size="medium"
                className="cyber-portal-card__btn"
                onClick={() => navigate('/look-a-like')}
                id="portal-btn-look-a-like"
              >
                ENTER LOOK A LIKE ⟶
              </CyberButton>
            </article>
          </div>
        </section>

        {/* =========================================================
            SCENE 4: ARCADE PROTOCOL (How It Works)
            ========================================================= */}
        <section id="protocol" className="cyber-scene cyber-protocol" aria-label="Arcade How It Works">
          <div className="cyber-protocol__container">
            <div className="cyber-protocol__eyebrow">SYSTEM SPECIFICATIONS</div>
            <h2 className="cyber-protocol__title">HOW THE ARCADE WORKS</h2>

            <div className="cyber-protocol__steps">
              <div className="cyber-protocol__step">
                <div className="cyber-protocol__step-num">01</div>
                <div className="cyber-protocol__step-content">
                  <h3>STEP INTO THE SENSOR FIELD</h3>
                  <p>
                    Enable your browser camera. The application initializes MediaPipe Face Mesh and optical sensors locally on your device in real time.
                  </p>
                </div>
              </div>

              <div className="cyber-protocol__step">
                <div className="cyber-protocol__step-num">02</div>
                <div className="cyber-protocol__step-content">
                  <h3>CHOOSE YOUR SIMULATION</h3>
                  <p>
                    Discover your funny Indian celebrity lookalike in Solo Match, endure the laugh trial, or match extreme reference facial expressions scored by AI vision.
                  </p>
                </div>
              </div>

              <div className="cyber-protocol__step">
                <div className="cyber-protocol__step-num">03</div>
                <div className="cyber-protocol__step-content">
                  <h3>ACHIEVE ARCADE GLORY</h3>
                  <p>
                    Achieve high expression scores, capture victory holographic photos, and download your results.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================
            SCENE 5: FINAL ARCADE CTA (Grand Neon Apex)
            ========================================================= */}
        <section id="cta" className="cyber-scene cyber-cta" aria-label="Final Call to Action">
          <div className="cyber-cta__card">
            <span className="cyber-cta__spark" aria-hidden="true">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><polygon points="13,2 3,14 11,14 11,22 21,10 13,10" fill="currentColor" /></svg>
            </span>
            <h2 className="cyber-cta__title">READY TO ENTER THE SPOTLIGHT?</h2>
            <p className="cyber-cta__lead">
              Step into the neon arena now and challenge your friends in the ultimate entertainment experience.
            </p>

            <div className="cyber-cta__buttons">
              <CyberButton
                variant="cyan"
                size="large"
                onClick={() => handleScrollTo('portals')}
                id="cta-select-simulation"
              >
                SELECT A SIMULATION
              </CyberButton>
            </div>

            <div className="cyber-cta__footer-quote">
              <span>DO SOMETHING STUPID.</span>
              <span className="cyber-cta__footer-highlight"> AI WILL JUDGE YOU!</span>
            </div>
          </div>
        </section>
      </main>

      {/* Arcade Footer */}
      <Footer className="cyber-landing__footer" />

      {/* Landing Page Background Music Floating Dock */}
      <LandingMusicPlayer />
    </div>
  );
}