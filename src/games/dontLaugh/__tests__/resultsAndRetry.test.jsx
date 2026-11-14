import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { CaughtResult } from '../components/Results';

describe('Don\'t Laugh Results and Capture Upload Status Rendering', () => {
  const dummyResult = {
    capture: {
      url: 'blob:http://localhost/test',
      width: 640,
      height: 480,
      msBeforeTrigger: 200,
      score: 0.95,
    },
    lastedMs: 14200,
  };

  it('renders UPLOADING CAPTURE... while upload is in progress', () => {
    const html = renderToString(
      React.createElement(
        MemoryRouter,
        null,
        React.createElement(CaughtResult, {
          player: 'Speedy',
          result: dummyResult,
          upload: { status: 'uploading' },
          onRetryUpload: vi.fn(),
          onPlayAgain: vi.fn(),
          onNewPlayer: vi.fn(),
        })
      )
    );

    expect(html).toContain('UPLOADING CAPTURE...');
    expect(html).not.toContain('MOMENT SAVED LOCALLY');
  });

  it('renders PHOTO SAVED SUCCESSFULLY upon successful backend save', () => {
    const html = renderToString(
      React.createElement(
        MemoryRouter,
        null,
        React.createElement(CaughtResult, {
          player: 'Speedy',
          result: dummyResult,
          upload: { status: 'saved', filename: 'laugh_20261030_123456_abcdef12.jpg' },
          onRetryUpload: vi.fn(),
          onPlayAgain: vi.fn(),
          onNewPlayer: vi.fn(),
        })
      )
    );

    expect(html).toContain('PHOTO SAVED SUCCESSFULLY');
    expect(html).toContain('laugh_20261030_123456_abcdef12.jpg');
    expect(html).not.toContain('MOMENT SAVED LOCALLY');
  });

  it('renders UPLOAD FAILED — YOUR CAPTURE IS RETAINED. RETRY UPLOAD. on failure', () => {
    const html = renderToString(
      React.createElement(
        MemoryRouter,
        null,
        React.createElement(CaughtResult, {
          player: 'Speedy',
          result: dummyResult,
          upload: { status: 'local', id: 42, error: 'Network timeout (504)' },
          onRetryUpload: vi.fn(),
          onPlayAgain: vi.fn(),
          onNewPlayer: vi.fn(),
        })
      )
    );

    expect(html).toContain('UPLOAD FAILED — YOUR CAPTURE IS RETAINED. RETRY UPLOAD.');
    expect(html).toContain('Network timeout (504)');
    expect(html).toContain('RETRY UPLOAD');
    expect(html).not.toContain('MOMENT SAVED LOCALLY');
  });
});
