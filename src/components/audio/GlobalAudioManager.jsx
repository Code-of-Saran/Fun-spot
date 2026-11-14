import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { gameAudio } from '../../services/gameAudio';
import { SoundOnIcon } from '../common/Icons';
import './GlobalAudioManager.css';

/**
 * GlobalAudioManager — Application-level Background Audio Coordinator
 *
 * Mounted at the top level of the React tree in App.jsx.
 * Tracks route transitions and coordinates the volume rules:
 *   - Landing page & general navigation: 100% volume
 *   - Entering any active game mode: 50% volume
 *   - Provides a one-click "ENABLE ARCADE SOUND" unlock pill if browser autoplay is blocked.
 */
export default function GlobalAudioManager() {
  const location = useLocation();
  const [audioState, setAudioState] = useState(() => gameAudio.getSnapshot());

  // Subscribe to audio manager state updates
  useEffect(() => {
    return gameAudio.subscribe((snap) => {
      setAudioState(snap);
    });
  }, []);

  // Coordinate volume transitions based on route changes
  useEffect(() => {
    const path = location.pathname.toLowerCase();

    const isGameRoute =
      path.startsWith('/dont-laugh') ||
      path.startsWith('/face-off') ||
      path.startsWith('/look-a-like') ||
      path.startsWith('/lookalike') ||
      path.startsWith('/wrong-answers');

    if (path === '/' || path === '') {
      gameAudio.setAppState('landing');
    } else if (isGameRoute) {
      gameAudio.setAppState('game_entered');
    } else {
      gameAudio.setAppState('navigation');
    }

    // Ensure global background music is rolling
    if (!audioState.isPlaying && !audioState.isPaused && !audioState.autoplayBlocked) {
      gameAudio.startTrack('global');
    }
  }, [location.pathname, audioState.isPlaying, audioState.isPaused, audioState.autoplayBlocked]);

  // If autoplay is blocked by the browser, render a prominent one-click unlock pill
  if (audioState.autoplayBlocked) {
    return (
      <aside className="global-audio-unlock-dock" aria-label="Audio autoplay unlock">
        <button
          type="button"
          className="global-audio-unlock-btn"
          onClick={() => gameAudio.unlockAutoplay()}
          title="Click to enable arcade background music"
        >
          <SoundOnIcon size={18} className="global-audio-unlock-icon" />
          <span>ENABLE ARCADE SOUND</span>
        </button>
      </aside>
    );
  }

  return null;
}

