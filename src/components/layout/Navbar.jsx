import { useCallback, useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import HowItWorks from './HowItWorks';
import TrustModal from './TrustModal';
import { isMuted, setMuted } from '../../utils/sfx';
import { gameAudio } from '../../services/gameAudio';
import { SoundOnIcon, SoundOffIcon, MusicNoteIcon } from '../common/Icons';
import './Navbar.css';

/**
 * Site navigation. `className` lets a page position it (the landing page pins it
 * to the reference layout); collapse into a menu button happens on narrow screens.
 */
export default function Navbar({ className = '' }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [howOpen, setHowOpen] = useState(false);
  const [trustOpen, setTrustOpen] = useState(false);
  const [trustTab, setTrustTab] = useState('about');
  const [soundMuted, setSoundMuted] = useState(() => isMuted());
  const [musicMuted, setMusicMuted] = useState(() => {
    const snap = gameAudio.getSnapshot();
    return snap.isMuted || snap.isPaused;
  });
  const { pathname } = useLocation();
  const onLanding = pathname === '/';

  useEffect(() => setMenuOpen(false), [pathname]);

  // Subscribe to persistent background music manager updates
  useEffect(() => {
    return gameAudio.subscribe((snap) => {
      setMusicMuted(snap.isMuted || snap.isPaused);
    });
  }, []);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const onKeyDown = (event) => event.key === 'Escape' && setMenuOpen(false);
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [menuOpen]);

  const openHowItWorks = () => {
    setMenuOpen(false);
    setHowOpen(true);
  };
  const closeHowItWorks = useCallback(() => setHowOpen(false), []);

  const openAbout = () => {
    setMenuOpen(false);
    setTrustTab('about');
    setTrustOpen(true);
  };
  const closeTrust = useCallback(() => setTrustOpen(false), []);

  const scrollToGames = (event) => {
    setMenuOpen(false);
    const grid = document.getElementById('portals') || document.getElementById('games');
    if (grid) {
      event.preventDefault();
      grid.scrollIntoView({ behavior: 'smooth', block: 'center' });
      grid.querySelector('a, button')?.focus({ preventScroll: true });
    }
  };

  return (
    <header className={`navbar ${menuOpen ? 'navbar--open' : ''} ${className}`.trim()}>
      <Link to="/" className="navbar__brand" aria-label="Fun Spot home">
        FU<span className="navbar__brand-n">n</span> SPOT
      </Link>

      <button
        type="button"
        className="navbar__toggle"
        aria-expanded={menuOpen}
        aria-controls="primary-nav"
        aria-label={menuOpen ? 'Close menu' : 'Open menu'}
        onClick={() => setMenuOpen((open) => !open)}
      >
        <span aria-hidden="true" />
      </button>

      <nav id="primary-nav" className="navbar__nav" aria-label="Primary">
        <ul className="navbar__links">
          <li>
            <a href="/#portals" className="navbar__link" onClick={scrollToGames}>
              Games
            </a>
          </li>
          <li>
            <button type="button" className="navbar__link" onClick={openHowItWorks}>
              How It Works
            </button>
          </li>
          <li>
            <button type="button" className="navbar__link" onClick={openAbout}>
              About
            </button>
          </li>
          <li className="navbar__audio-item">
            <button
              type="button"
              className={`navbar__link navbar__audio-toggle ${musicMuted ? 'navbar__audio-toggle--muted' : ''}`}
              onClick={() => {
                gameAudio.toggleMute();
              }}
              title={musicMuted ? 'Unmute background music' : 'Mute background music'}
              aria-label={musicMuted ? 'Unmute background music' : 'Mute background music'}
              id="navbar-music-toggle"
            >
              <span className="navbar__sound-icon" style={{ display: 'inline-flex', verticalAlign: 'middle', marginRight: '5px' }}>
                <MusicNoteIcon size={15} />
              </span>
              <span>{musicMuted ? 'MUSIC OFF' : 'MUSIC ON'}</span>
            </button>
          </li>
          <li className="navbar__audio-item">
            <button
              type="button"
              className={`navbar__link navbar__audio-toggle ${soundMuted ? 'navbar__audio-toggle--muted' : ''}`}
              onClick={() => {
                const next = !soundMuted;
                setMuted(next);
                setSoundMuted(next);
              }}
              title={soundMuted ? 'Unmute sound effects' : 'Mute sound effects'}
              aria-label={soundMuted ? 'Unmute sound effects' : 'Mute sound effects'}
              id="navbar-sfx-toggle"
            >
              <span className="navbar__sound-icon" style={{ display: 'inline-flex', verticalAlign: 'middle', marginRight: '5px' }}>
                {soundMuted ? <SoundOffIcon size={15} /> : <SoundOnIcon size={15} />}
              </span>
              <span>{soundMuted ? 'SFX OFF' : 'SFX ON'}</span>
            </button>
          </li>
        </ul>
      </nav>

      <HowItWorks open={howOpen} onClose={closeHowItWorks} />
      <TrustModal open={trustOpen} onClose={closeTrust} initialTab={trustTab} />
    </header>
  );
}
