import { useState } from 'react';
import { useLandingMusic } from '../../hooks/useLandingMusic';
import {
  MusicNoteIcon,
  PlayIcon,
  PauseIcon,
  SoundOnIcon,
  SoundOffIcon,
  AlertIcon,
} from '../common/Icons';
import './LandingMusicPlayer.css';

/**
 * Floating Background Music Controller for the Fun Spot Landing Page.
 * Plays Crazy Frog - Axel F (Official Video).
 * Fully keyboard-accessible, reactive to autoplay restrictions, vector icons only.
 */
export default function LandingMusicPlayer() {
  const {
    title,
    isPlaying,
    isPaused,
    isMuted,
    volume,
    autoplayBlocked,
    assetMissing,
    errorMessage,
    togglePlay,
    toggleMute,
    setVolume,
  } = useLandingMusic();

  const [expanded, setExpanded] = useState(true);

  const percentVolume = Math.round(volume * 100);

  return (
    <aside
      className={`landing-music-dock ${expanded ? 'landing-music-dock--expanded' : 'landing-music-dock--collapsed'}`}
      aria-label="Landing page background music"
    >
      <div className="landing-music-card">
        {/* Header / Track Info */}
        <div className="landing-music-header">
          <button
            type="button"
            className="landing-music-icon-btn landing-music-tag"
            onClick={() => setExpanded(!expanded)}
            title={expanded ? 'Minimize music player' : 'Expand music player'}
            aria-expanded={expanded}
          >
            <MusicNoteIcon
              size={18}
              className={`landing-music-note ${isPlaying && !isMuted ? 'landing-music-note--animating' : ''}`}
            />
            <span className="landing-music-tag-text">ARCADE BGM</span>
          </button>

          <div className="landing-music-title-wrap">
            <span className="landing-music-title" title={title}>
              {title}
            </span>
            <div className="landing-music-status-badges">
              {assetMissing ? (
                <span className="landing-music-badge landing-music-badge--missing" title={errorMessage || 'File missing'}>
                  <AlertIcon size={12} /> ASSET MISSING
                </span>
              ) : autoplayBlocked ? (
                <span className="landing-music-badge landing-music-badge--autoplay" title="Click anywhere on the page to start music">
                  CLICK TO UNMUTE
                </span>
              ) : isPlaying && !isMuted ? (
                <span className="landing-music-badge landing-music-badge--live">
                  <span className="landing-music-equalizer">
                    <span className="bar bar-1" />
                    <span className="bar bar-2" />
                    <span className="bar bar-3" />
                  </span>
                  PLAYING
                </span>
              ) : isMuted ? (
                <span className="landing-music-badge landing-music-badge--muted">MUTED</span>
              ) : isPaused ? (
                <span className="landing-music-badge landing-music-badge--paused">PAUSED</span>
              ) : null}
            </div>
          </div>
        </div>

        {/* Development mode asset warning if missing */}
        {assetMissing && import.meta.env.DEV && (
          <div className="landing-music-missing-alert" role="alert">
            <span className="landing-music-missing-text">
              Missing asset: <code>public/assets/audio/crazy-frog-axel-f.mp3</code>
            </span>
            <span className="landing-music-missing-hint">
              Place authorized MP3 here to enable background music.
            </span>
          </div>
        )}

        {/* Controls: Play/Pause, Mute/Unmute, Volume Slider */}
        {expanded && !assetMissing && (
          <div className="landing-music-controls">
            <button
              type="button"
              className="landing-music-btn landing-music-btn--play"
              onClick={togglePlay}
              title={isPlaying ? 'Pause music' : 'Play music'}
              aria-label={isPlaying ? 'Pause background music' : 'Play background music'}
            >
              {isPlaying ? <PauseIcon size={16} /> : <PlayIcon size={16} />}
              <span className="landing-music-btn-label">{isPlaying ? 'PAUSE' : 'PLAY'}</span>
            </button>

            <button
              type="button"
              className={`landing-music-btn landing-music-btn--mute ${isMuted ? 'is-muted' : ''}`}
              onClick={toggleMute}
              title={isMuted ? 'Unmute music' : 'Mute music'}
              aria-label={isMuted ? 'Unmute background music' : 'Mute background music'}
            >
              {isMuted ? <SoundOffIcon size={16} /> : <SoundOnIcon size={16} />}
              <span className="landing-music-btn-label">{isMuted ? 'MUTED' : 'MUTE'}</span>
            </button>

            <div className="landing-music-volume">
              <label htmlFor="bgm-volume-slider" className="landing-music-vol-label">
                VOL: <span className="landing-music-vol-num">{isMuted ? '0%' : `${percentVolume}%`}</span>
              </label>
              <input
                id="bgm-volume-slider"
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                aria-label="Background music volume"
                className="landing-music-slider"
              />
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}

