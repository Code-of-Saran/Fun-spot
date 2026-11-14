import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { renderToString } from 'react-dom/server';
import AudioSettingsModal, { AudioSettingsTrigger } from '../AudioSettingsModal';
import { gameAudio, DEFAULT_SETTINGS } from '../../../services/gameAudio';

describe('Cyberpunk Audio Settings Modal & HUD Trigger', () => {
  beforeEach(() => {
    localStorage.clear();
    gameAudio.resetDefaults();
  });

  it('renders nothing when closed (isOpen=false)', () => {
    const html = renderToString(
      <AudioSettingsModal isOpen={false} onClose={() => {}} currentGame="dont-laugh" />
    );
    expect(html).toBe('');
  });

  it('renders all sliders, badges and actions when open (isOpen=true)', () => {
    const html = renderToString(
      <AudioSettingsModal isOpen={true} onClose={() => {}} currentGame="dont-laugh" />
    );

    expect(html).toContain('AUDIO MIXER &amp; CONTROLS');
    expect(html).toContain('MASTER VOLUME');
    expect(html).toContain('DON&#x27;T LAUGH MUSIC');
    expect(html).toContain('ARCADE SOUND EFFECTS');
    expect(html).toContain('MUTE ALL');
    expect(html).toContain('TEST MUSIC');
    expect(html).toContain('TEST SFX');
    expect(html).toContain('RESET DEFAULTS');
  });

  it('renders Face Off specific labels when currentGame="face-off"', () => {
    const html = renderToString(
      <AudioSettingsModal isOpen={true} onClose={() => {}} currentGame="face-off" />
    );

    expect(html).toContain('FACE OFF MUSIC');
    expect(html).toContain('Face Off');
  });

  it('renders AudioSettingsTrigger button correctly in HUD', () => {
    const htmlUnmuted = renderToString(
      <AudioSettingsTrigger onClick={() => {}} isMuted={false} />
    );
    expect(htmlUnmuted).toContain('AUDIO');
    expect(htmlUnmuted).toContain('audio-settings-trigger');

    const htmlMuted = renderToString(
      <AudioSettingsTrigger onClick={() => {}} isMuted={true} />
    );
    expect(htmlMuted).toContain('AUDIO');
  });
});
