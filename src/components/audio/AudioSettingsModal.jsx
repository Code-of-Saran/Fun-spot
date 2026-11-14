import React, { useEffect, useState } from 'react';
import { gameAudio, DEFAULT_SETTINGS } from '../../services/gameAudio';
import { sfx } from '../../utils/sfx';
import {
  SoundOnIcon,
  SoundOffIcon,
  PlayIcon,
  PauseIcon,
  CrossIcon,
  RefreshIcon,
  MusicNoteIcon,
  AlertIcon,
  BoltIcon,
} from '../common/Icons';
import './AudioSettingsModal.css';

/**
 * Fun Spot — Floating Cyberpunk Audio Settings Modal & Mixer
 *
 * Controls:
 *   - Master Volume (0 - 100%)
 *   - BGM Volume for the active game (0 - 100%)
 *   - SFX Volume for arcade sound effects (0 - 100%)
 *   - Mute / Unmute Toggle
 *   - Pause / Resume BGM Toggle
 *   - Test Music (auditions background music and ducking)
 *   - Test SFX (auditions arcade chime)
 *   - Reset to Defaults
 *   - Asset status indicator with fallback explanation
 */
export default function AudioSettingsModal({
  isOpen,
  onClose,
  currentGame = 'dont-laugh',
}) {
  const [audioState, setAudioState] = useState(() => gameAudio.getSnapshot());

  useEffect(() => {
    return gameAudio.subscribe((snap) => {
      setAudioState(snap);
    });
  }, []);

  if (!isOpen) return null;

  const { settings, isPlaying, isPaused, isMuted, assetMissing, assetMissingPath, usingSynthFallback, currentTrackId } = audioState;
  const currentBgmVol = currentGame === 'face-off' ? settings.faceOffBgm : settings.dontLaughBgm;

  const handleMasterChange = (e) => {
    gameAudio.setMasterVolume(parseFloat(e.target.value));
  };

  const handleBgmChange = (e) => {
    gameAudio.setBgmVolume(currentGame, parseFloat(e.target.value));
  };

  const handleSfxChange = (e) => {
    gameAudio.setSfxVolume(parseFloat(e.target.value));
  };

  const handleToggleMute = () => {
    gameAudio.toggleMute();
  };

  const handleTogglePause = () => {
    if (isPaused || !isPlaying) {
      gameAudio.resumeTrack();
    } else {
      gameAudio.pauseTrack();
    }
  };

  const handleTestMusic = () => {
    sfx.unlock();
    gameAudio.testMusic(currentGame);
  };

  const handleTestSfx = () => {
    sfx.unlock();
    sfx.complete();
  };

  const handleResetDefaults = () => {
    gameAudio.resetDefaults();
  };

  return (
    <div className="audio-modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="audio-modal-title">
      <div className="audio-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="audio-modal-header">
          <div className="audio-modal-title-row">
            <span className="audio-modal-icon">
              <MusicNoteIcon size={22} />
            </span>
            <h2 id="audio-modal-title" className="audio-modal-title">
              AUDIO MIXER & CONTROLS
            </h2>
          </div>
          <button
            type="button"
            className="audio-modal-close-btn"
            onClick={onClose}
            aria-label="Close audio settings"
          >
            <CrossIcon size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="audio-modal-body">
          {/* Active Track Status Card */}
          <div className="audio-status-card">
            <div className="audio-status-row">
              <span className="audio-status-label">ACTIVE TRACK:</span>
              <span className="audio-status-track">
                {currentGame === 'face-off' ? 'Face Off — Suspense Groove' : "Don't Laugh — Comedy Bounce"}
              </span>
            </div>

            <div className="audio-status-playback">
              <span className={`audio-pill ${isPlaying && !isPaused ? 'audio-pill--live' : 'audio-pill--stopped'}`}>
                {isPlaying && !isPaused ? 'PLAYING' : isPaused ? 'PAUSED' : 'STANDBY'}
              </span>
              {isMuted && (
                <span className="audio-pill audio-pill--muted">MUTED</span>
              )}
              {usingSynthFallback && (
                <span className="audio-pill audio-pill--synth">SYNTH FALLBACK</span>
              )}
            </div>

            {assetMissing && (
              <div className="audio-asset-notice">
                <AlertIcon size={16} />
                <div>
                  <strong>ASSET NOTICE:</strong> Background audio file{' '}
                  <code>{assetMissingPath}</code> has not been placed yet. Playing real-time procedural Web Audio synth fallback.
                </div>
              </div>
            )}
          </div>

          {/* Volume Sliders */}
          <div className="audio-sliders-group">
            {/* Master Volume */}
            <div className="audio-slider-item">
              <div className="audio-slider-header">
                <span className="audio-slider-label">MASTER VOLUME</span>
                <span className="audio-slider-value">{Math.round(settings.master * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={settings.master}
                onChange={handleMasterChange}
                className="audio-range-input"
                aria-label="Master volume"
              />
            </div>

            {/* Game BGM Volume */}
            <div className="audio-slider-item">
              <div className="audio-slider-header">
                <span className="audio-slider-label">
                  {currentGame === 'face-off' ? 'FACE OFF MUSIC' : "DON'T LAUGH MUSIC"}
                </span>
                <span className="audio-slider-value">{Math.round(currentBgmVol * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={currentBgmVol}
                onChange={handleBgmChange}
                className="audio-range-input"
                aria-label="Background music volume"
              />
            </div>

            {/* SFX Volume */}
            <div className="audio-slider-item">
              <div className="audio-slider-header">
                <span className="audio-slider-label">ARCADE SOUND EFFECTS</span>
                <span className="audio-slider-value">{Math.round(settings.sfx * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={settings.sfx}
                onChange={handleSfxChange}
                className="audio-range-input"
                aria-label="Sound effects volume"
              />
            </div>
          </div>

          {/* Action Button Row */}
          <div className="audio-actions-grid">
            <button
              type="button"
              className={`audio-action-btn ${isMuted ? 'audio-action-btn--active' : ''}`}
              onClick={handleToggleMute}
            >
              {isMuted ? <SoundOffIcon size={16} /> : <SoundOnIcon size={16} />}
              <span>{isMuted ? 'UNMUTE' : 'MUTE ALL'}</span>
            </button>

            <button
              type="button"
              className="audio-action-btn"
              onClick={handleTogglePause}
            >
              {isPaused || !isPlaying ? <PlayIcon size={16} /> : <PauseIcon size={16} />}
              <span>{isPaused || !isPlaying ? 'RESUME BGM' : 'PAUSE BGM'}</span>
            </button>

            <button
              type="button"
              className="audio-action-btn"
              onClick={handleTestMusic}
            >
              <BoltIcon size={16} />
              <span>TEST MUSIC</span>
            </button>

            <button
              type="button"
              className="audio-action-btn"
              onClick={handleTestSfx}
            >
              <SoundOnIcon size={16} />
              <span>TEST SFX</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="audio-modal-footer">
          <button
            type="button"
            className="audio-reset-btn"
            onClick={handleResetDefaults}
          >
            <RefreshIcon size={14} />
            <span>RESET DEFAULTS</span>
          </button>
          <button
            type="button"
            className="audio-done-btn"
            onClick={onClose}
          >
            DONE
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Reusable HUD Audio Button that opens the Audio Settings Modal
 */
export function AudioSettingsTrigger({ onClick, isMuted, isPlaying, className = '' }) {
  return (
    <button
      type="button"
      className={`audio-settings-trigger ${className}`}
      onClick={onClick}
      title="Audio Settings & Mixer"
      aria-label="Open audio settings"
    >
      {isMuted ? <SoundOffIcon size={18} /> : <SoundOnIcon size={18} />}
      <span className="audio-trigger-text">AUDIO</span>
    </button>
  );
}

