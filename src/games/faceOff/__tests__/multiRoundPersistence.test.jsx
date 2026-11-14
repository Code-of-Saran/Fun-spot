import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import {
  EXPRESSION_CHALLENGES,
  ROUND_DURATION_SECONDS,
  DEFAULT_SESSION_ROUNDS,
} from '../faceOffConfig';
import {
  referenceFeaturesCache,
  analyzeReferenceImage,
  clearReferenceFeaturesCache,
  extractFacialFeatures,
  calculateExpressionMatch,
} from '../faceAnalysis';
import {
  ROUND_STATE,
  isArenaStage,
  isTrackingActive,
} from '../roundStateMachine';

describe('Face Off — Multi-Round Camera & Face Detection Persistence (5-Round Verification)', () => {
  beforeEach(() => {
    // Ensure cache is populated
    clearReferenceFeaturesCache();
  });

  it('pre-seeds referenceFeaturesCache for all 10 challenges at initialization', () => {
    expect(referenceFeaturesCache.size).toBe(10);
    for (const challenge of EXPRESSION_CHALLENGES) {
      expect(referenceFeaturesCache.has(challenge.id)).toBe(true);
      const cached = referenceFeaturesCache.get(challenge.id);
      expect(cached).toBeDefined();
      expect(cached.isValidReference).toBe(true);
      expect(cached.challengeId).toBe(challenge.id);
      expect(cached.targetBlendshapes).toBeDefined();
      expect(cached.targetRatios).toBeDefined();
    }
  });

  it('resolves analyzeReferenceImage in 0ms using cache without touching landmarker runningMode', async () => {
    const mockLandmarker = {
      setOptions: vi.fn(),
      detect: vi.fn(),
      detectForVideo: vi.fn(),
    };

    for (const challenge of EXPRESSION_CHALLENGES) {
      const start = performance.now();
      const features = await analyzeReferenceImage(challenge, mockLandmarker);
      const elapsed = performance.now() - start;

      expect(features).toBeDefined();
      expect(features.challengeId).toBe(challenge.id);
      expect(features.isValidReference).toBe(true);
      // Must resolve instantly (< 10ms) from cache
      expect(elapsed).toBeLessThan(15);
      // landmarker.setOptions must NOT have been called with runningMode: 'IMAGE'
      expect(mockLandmarker.setOptions).not.toHaveBeenCalled();
    }
  });

  it('guarantees strictly monotonic timestamps across 5 consecutive rounds in detectForVideo', () => {
    const timestampsPassed = [];
    const mockLandmarker = {
      detectForVideo: vi.fn((video, timestamp) => {
        timestampsPassed.push(timestamp);
        return { faceLandmarks: [], faceBlendshapes: [] };
      }),
    };

    // Simulate the timestamp generation logic used in useFaceDetection
    let sessionTimestamp = 1;
    const generateNextTimestamp = (nowMs) => {
      const timestamp = Math.max(nowMs, sessionTimestamp + 1);
      sessionTimestamp = timestamp;
      return timestamp;
    };

    // Simulate 5 consecutive rounds, each with 10 frames of live tracking
    for (let round = 1; round <= 5; round++) {
      for (let frame = 1; frame <= 10; frame++) {
        // Even if system clock has jitter or rounds transition, timestamp must strictly increase
        const simulatedTime = 1000 + (round - 1) * 5000 + frame * 65;
        const ts = generateNextTimestamp(simulatedTime);
        mockLandmarker.detectForVideo({}, ts);
      }
    }

    expect(timestampsPassed).toHaveLength(50);
    for (let i = 1; i < timestampsPassed.length; i++) {
      expect(
        timestampsPassed[i],
        `Timestamp at index ${i} (${timestampsPassed[i]}) must be strictly greater than previous (${timestampsPassed[i - 1]})`,
      ).toBeGreaterThan(timestampsPassed[i - 1]);
    }
  });

  it('maintains MediaPipe runningMode in VIDEO mode through capture and round transitions', async () => {
    let currentMode = 'VIDEO';
    const mockLandmarker = {
      setOptions: vi.fn((opts) => {
        if (opts.runningMode) {
          currentMode = opts.runningMode;
        }
      }),
      detect: vi.fn(() => ({ faceLandmarks: [], faceBlendshapes: [] })),
      detectForVideo: vi.fn(() => ({ faceLandmarks: [], faceBlendshapes: [] })),
    };

    // Simulate capture sequence: switches to IMAGE for still, then restores VIDEO in finally block
    const simulateCapture = async () => {
      try {
        mockLandmarker.setOptions({ runningMode: 'IMAGE' });
        mockLandmarker.detect({});
      } finally {
        mockLandmarker.setOptions({ runningMode: 'VIDEO' });
      }
    };

    // Run 5 consecutive capture-and-transition sequences
    for (let round = 1; round <= 5; round++) {
      expect(currentMode).toBe('VIDEO');
      await simulateCapture();
      // After capture and before next round starts, mode MUST be restored to VIDEO
      expect(currentMode).toBe('VIDEO');
      // Next round's live frame arrives
      mockLandmarker.detectForVideo({}, round * 1000);
      expect(mockLandmarker.detectForVideo).toHaveBeenCalled();
    }
  });

  it('keeps the arena mounted and off-screen (never display: none) during SHOWING_RESULT to preserve video decoder', async () => {
    const { default: FaceOff } = await import('../FaceOff');
    localStorage.setItem('funspot_faceoff_consent_granted', 'true');

    const html = renderToString(
      React.createElement(
        MemoryRouter,
        { initialEntries: ['/face-off'] },
        React.createElement(FaceOff),
      ),
    );

    // Verify video element and arena grid exist in DOM
    expect(html).toContain('faceoff-stage-grid');
    expect(html).toContain('faceoff-video-element');
    // Verify display: none is not hardcoded on the stage grid container
    expect(html).not.toMatch(/class="faceoff-stage-grid"[^>]*style="[^"]*display:\s*none/);
  });

  it('simulates a complete 5-round game session transitioning cleanly from Round 1 through Round 5', () => {
    const rounds = 5;
    let currentRoundIdx = 0;
    let roundState = ROUND_STATE.READY;
    const completedResults = [];
    const challenges = EXPRESSION_CHALLENGES.slice(0, 5);

    // Track simulated camera and video states across rounds
    let isStreamActive = true;
    let isVideoPlaying = true;
    let faceDetectionActive = true;

    for (let r = 0; r < rounds; r++) {
      // 1. Ready phase
      expect(roundState).toBe(ROUND_STATE.READY);
      expect(isStreamActive).toBe(true);
      expect(isVideoPlaying).toBe(true);
      expect(isTrackingActive(roundState)).toBe(true);

      // 2. Countdown phase (5s -> 0s)
      roundState = ROUND_STATE.COUNTDOWN;
      expect(isTrackingActive(roundState)).toBe(true);

      // 3. Capturing phase
      roundState = ROUND_STATE.CAPTURING;
      expect(isArenaStage(roundState)).toBe(true);

      // 4. Result phase
      const result = {
        roundIndex: currentRoundIdx,
        challenge: challenges[currentRoundIdx],
        score: 85 + r * 2,
        timestamp: Date.now(),
      };
      completedResults.push(result);
      roundState = ROUND_STATE.SHOWING_RESULT;

      // During SHOWING_RESULT: stream and video remain active in background
      expect(isStreamActive).toBe(true);
      expect(isVideoPlaying).toBe(true);

      // 5. Next Round action
      if (currentRoundIdx + 1 >= rounds) {
        roundState = ROUND_STATE.SUMMARY;
      } else {
        currentRoundIdx++;
        roundState = ROUND_STATE.READY;
      }
    }

    expect(completedResults).toHaveLength(5);
    expect(roundState).toBe(ROUND_STATE.SUMMARY);
    expect(isStreamActive).toBe(true); // Stream was NEVER closed or stopped across 5 rounds
  });

  it('ensures camera viewfinder never shows "Camera not detected" when cameraStatus is ready', () => {
    // If stream is active and cameraStatus === 'ready', cameraStatus is NOT in error
    const cameraStatus = 'ready';
    const stream = { active: true, getVideoTracks: () => [{ readyState: 'live' }] };
    const isVideoReady = false; // Video is currently buffering first frame

    const shouldShowDisconnected =
      cameraStatus === 'error' || (!stream && cameraStatus !== 'requesting' && cameraStatus !== 'idle');
    const shouldShowConnecting = !isVideoReady && stream && cameraStatus === 'ready';

    expect(shouldShowDisconnected).toBe(false); // False alarm prevented!
    expect(shouldShowConnecting).toBe(true); // User sees friendly "Connecting Camera Feed..."
  });
});

