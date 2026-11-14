import { useEffect, useState } from 'react';
import { landingMusic } from '../services/landingMusic';

/**
 * React hook to synchronize component state with the landing page background music.
 */
export function useLandingMusic() {
  const [musicState, setMusicState] = useState(() => landingMusic.getState());

  useEffect(() => {
    const unsubscribe = landingMusic.subscribe((next) => {
      setMusicState(next);
    });
    return unsubscribe;
  }, []);

  return {
    ...musicState,
    togglePlay: landingMusic.togglePlay,
    toggleMute: landingMusic.toggleMute,
    setVolume: landingMusic.setVolume,
  };
}

