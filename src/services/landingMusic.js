/**
 * Landing Page Background Music Manager — Powered by Unified gameAudio
 *
 * Provides a backward-compatible adapter interface for the Landing page and
 * LandingMusicPlayer while delegating to the single application-wide gameAudio manager.
 * Track: Crazy Frog - Axel F (Official Video)
 * Asset path: public/assets/audio/crazy-frog-axel-f.mp3 (served at /assets/audio/crazy-frog-axel-f.mp3)
 */

import { gameAudio, GLOBAL_TRACK_SRC, GLOBAL_TRACK_TITLE } from './gameAudio';

export const AUDIO_SRC = GLOBAL_TRACK_SRC;
export const TRACK_TITLE = GLOBAL_TRACK_TITLE;

export const landingMusic = {
  enterLanding() {
    gameAudio.setAppState('landing');
    gameAudio.startTrack('global');
  },

  leaveLanding() {
    // Instead of cutting off audio on leaving the landing page, smoothly
    // transition the application state into the active game mode at 50% volume!
    gameAudio.setAppState('game_entered');
  },

  togglePlay() {
    gameAudio.togglePlay();
  },

  toggleMute() {
    gameAudio.toggleMute();
  },

  setVolume(rawVol) {
    gameAudio.setMasterVolume(rawVol);
  },

  getState() {
    const snap = gameAudio.getSnapshot();
    return {
      src: AUDIO_SRC,
      title: TRACK_TITLE,
      isPlaying: snap.isPlaying,
      isPaused: snap.isPaused,
      isMuted: snap.isMuted,
      volume: snap.masterVolume,
      effectiveVolume: snap.effectiveBgmVolume,
      autoplayBlocked: snap.autoplayBlocked,
      assetMissing: snap.assetMissing,
      errorMessage: snap.assetMissing ? `Audio asset not found: ${snap.assetMissingPath}` : null,
      isLandingActive: snap.appState === 'landing',
    };
  },

  subscribe(listener) {
    const forward = () => {
      try {
        listener(this.getState());
      } catch (err) {
        console.warn('[LandingMusic] Subscriber error:', err);
      }
    };
    return gameAudio.subscribe(forward);
  },
};
