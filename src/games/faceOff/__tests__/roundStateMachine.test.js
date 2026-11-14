import { describe, it, expect } from 'vitest';
import {
  ROUND_STATE,
  ROUND_STATE_LABELS,
  isArenaStage,
  isTrackingActive,
  checkReadiness,
} from '../roundStateMachine';

describe('Face Off — Round State Machine & Lifecycle Rules', () => {
  it('defines all required round states', () => {
    expect(ROUND_STATE.CONSENT).toBe('consent');
    expect(ROUND_STATE.INITIALIZING).toBe('initializing');
    expect(ROUND_STATE.CAMERA_READY).toBe('camera_ready');
    expect(ROUND_STATE.LOADING_REFERENCE).toBe('loading_reference');
    expect(ROUND_STATE.ANALYZING_REFERENCE).toBe('analyzing_reference');
    expect(ROUND_STATE.READY).toBe('ready');
    expect(ROUND_STATE.COUNTDOWN).toBe('countdown');
    expect(ROUND_STATE.CAPTURING).toBe('capturing');
    expect(ROUND_STATE.ANALYZING_CAPTURE).toBe('analyzing_capture');
    expect(ROUND_STATE.SHOWING_RESULT).toBe('showing_result');
    expect(ROUND_STATE.RETRY_REQUIRED).toBe('retry_required');
    expect(ROUND_STATE.ERROR).toBe('error');
    expect(ROUND_STATE.SUMMARY).toBe('summary');
  });

  it('provides readable human labels for all states', () => {
    for (const state of Object.values(ROUND_STATE)) {
      expect(ROUND_STATE_LABELS[state]).toBeDefined();
      expect(typeof ROUND_STATE_LABELS[state]).toBe('string');
      expect(ROUND_STATE_LABELS[state].length).toBeGreaterThan(0);
    }
  });

  it('correctly identifies arena stages vs modal/result screens', () => {
    // Arena stages: camera & target UI are visible
    expect(isArenaStage(ROUND_STATE.INITIALIZING)).toBe(true);
    expect(isArenaStage(ROUND_STATE.CAMERA_READY)).toBe(true);
    expect(isArenaStage(ROUND_STATE.LOADING_REFERENCE)).toBe(true);
    expect(isArenaStage(ROUND_STATE.ANALYZING_REFERENCE)).toBe(true);
    expect(isArenaStage(ROUND_STATE.READY)).toBe(true);
    expect(isArenaStage(ROUND_STATE.COUNTDOWN)).toBe(true);
    expect(isArenaStage(ROUND_STATE.CAPTURING)).toBe(true);
    expect(isArenaStage(ROUND_STATE.ANALYZING_CAPTURE)).toBe(true);
    expect(isArenaStage(ROUND_STATE.RETRY_REQUIRED)).toBe(true);

    // Non-arena stages: distinct screens
    expect(isArenaStage(ROUND_STATE.CONSENT)).toBe(false);
    expect(isArenaStage(ROUND_STATE.SHOWING_RESULT)).toBe(false);
    expect(isArenaStage(ROUND_STATE.SUMMARY)).toBe(false);
  });

  it('enables face tracking only during active matching stages', () => {
    expect(isTrackingActive(ROUND_STATE.READY)).toBe(true);
    expect(isTrackingActive(ROUND_STATE.COUNTDOWN)).toBe(true);

    expect(isTrackingActive(ROUND_STATE.CONSENT)).toBe(false);
    expect(isTrackingActive(ROUND_STATE.INITIALIZING)).toBe(false);
    expect(isTrackingActive(ROUND_STATE.CAPTURING)).toBe(false);
    expect(isTrackingActive(ROUND_STATE.SHOWING_RESULT)).toBe(false);
    expect(isTrackingActive(ROUND_STATE.SUMMARY)).toBe(false);
  });

  it('evaluates readiness strictly across all 4 required subsystems', () => {
    // All ready
    const readyState = checkReadiness({
      isVideoReady: true,
      isCameraActive: true,
      isModelReady: true,
      isReferenceReady: true,
    });
    expect(readyState.allReady).toBe(true);
    expect(readyState.video).toBe(true);
    expect(readyState.camera).toBe(true);
    expect(readyState.model).toBe(true);
    expect(readyState.reference).toBe(true);

    // Missing camera
    expect(
      checkReadiness({
        isVideoReady: true,
        isCameraActive: false,
        isModelReady: true,
        isReferenceReady: true,
      }).allReady,
    ).toBe(false);

    // Missing video stream dimensions
    expect(
      checkReadiness({
        isVideoReady: false,
        isCameraActive: true,
        isModelReady: true,
        isReferenceReady: true,
      }).allReady,
    ).toBe(false);

    // Model still loading
    expect(
      checkReadiness({
        isVideoReady: true,
        isCameraActive: true,
        isModelReady: false,
        isReferenceReady: true,
      }).allReady,
    ).toBe(false);

    // Reference target features not yet validated
    expect(
      checkReadiness({
        isVideoReady: true,
        isCameraActive: true,
        isModelReady: true,
        isReferenceReady: false,
      }).allReady,
    ).toBe(false);
  });
});

