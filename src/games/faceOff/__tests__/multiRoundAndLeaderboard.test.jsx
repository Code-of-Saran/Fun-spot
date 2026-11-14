import { describe, it, expect, vi, beforeEach } from 'vitest';
import { rankEntries, createLeaderboardService } from '../../../services/leaderboard';
import { validateScoreEntry, SCORE_RULES, BOARD_GAME_MODES } from '../../../services/leaderboardValidation';

describe('Face Off — Leaderboard Architecture & Fair Scoring Rules', () => {
  let mockStorage;
  let store;
  let service;

  beforeEach(() => {
    store = {};
    mockStorage = {
      getItem: vi.fn((key) => store[key] ?? null),
      setItem: vi.fn((key, val) => {
        store[key] = String(val);
      }),
      removeItem: vi.fn((key) => {
        delete store[key];
      }),
    };

    service = createLeaderboardService({
      getClient: null, // offline / local store
      storage: mockStorage,
      events: null,
      now: () => new Date('2026-10-29T20:00:00.000Z'),
    });
  });

  it('registers face_off in SCORE_RULES and BOARD_GAME_MODES', () => {
    expect(SCORE_RULES.face_off).toBeDefined();
    expect(SCORE_RULES.face_off.min).toBe(0);
    expect(SCORE_RULES.face_off.max).toBe(100);
    expect(SCORE_RULES.face_off.decimals).toBe(1);

    expect(BOARD_GAME_MODES['face-off']).toBe('face_off');
  });

  it('validates legitimate Face Off scores (0-100 with 1 decimal) and rejects invalid ones', () => {
    // Valid entries
    expect(validateScoreEntry({ playerName: 'ApexMimic', gameMode: 'face_off', score: 88.5 }).ok).toBe(true);
    expect(validateScoreEntry({ playerName: 'ZeroScore', gameMode: 'face_off', score: 0 }).ok).toBe(true);
    expect(validateScoreEntry({ playerName: 'PerfectSync', gameMode: 'face_off', score: 100 }).ok).toBe(true);

    // Invalid entries
    expect(validateScoreEntry({ playerName: '', gameMode: 'face_off', score: 85 }).ok).toBe(false);
    expect(validateScoreEntry({ playerName: 'Cheat', gameMode: 'face_off', score: 105 }).ok).toBe(false);
    expect(validateScoreEntry({ playerName: 'Negative', gameMode: 'face_off', score: -5 }).ok).toBe(false);
    expect(validateScoreEntry({ playerName: 'TooManyDecimals', gameMode: 'face_off', score: 88.555 }).ok).toBe(false);
    expect(validateScoreEntry({ playerName: 'NaNPlayer', gameMode: 'face_off', score: NaN }).ok).toBe(false);
  });

  it('ranks entries primarily by average score descending, and breaks ties by peak accuracy (best score)', () => {
    const entries = [
      {
        id: '1',
        player_name: 'PlayerA',
        score: 85.0,
        best_score: 90.0,
        created_at: '2026-10-29T10:00:00Z',
      },
      {
        id: '2',
        player_name: 'PlayerB',
        score: 92.0,
        best_score: 95.0,
        created_at: '2026-10-29T11:00:00Z',
      },
      {
        id: '3',
        player_name: 'PlayerC', // Same average as PlayerA, but higher peak (98 > 90)
        score: 85.0,
        best_score: 98.0,
        created_at: '2026-10-29T12:00:00Z',
      },
      {
        id: '4',
        player_name: 'PlayerD', // Same average and same peak as PlayerA, but earlier timestamp
        score: 85.0,
        best_score: 90.0,
        created_at: '2026-10-29T09:00:00Z',
      },
    ];

    const ranked = rankEntries(entries);

    // 1st: PlayerB (92.0 avg)
    expect(ranked[0].player_name).toBe('PlayerB');
    // 2nd: PlayerC (85.0 avg, but 98.0 peak > 90.0 peak)
    expect(ranked[1].player_name).toBe('PlayerC');
    // 3rd: PlayerD (85.0 avg, 90.0 peak, achieved earlier at 09:00 vs 10:00)
    expect(ranked[2].player_name).toBe('PlayerD');
    // 4th: PlayerA (85.0 avg, 90.0 peak, achieved at 10:00)
    expect(ranked[3].player_name).toBe('PlayerA');
  });

  it('submits and persists a completed Face Off session without storing any image or biometric data', async () => {
    const submission = await service.submitScore({
      playerName: 'CyberFace',
      gameMode: 'face_off',
      score: 89.2,
      bestScore: 96.0,
      roundsPlayed: 5,
    });

    expect(submission.status).toBe('local');
    expect(submission.entry).toBeDefined();
    expect(submission.entry.player).toBe('CyberFace');
    expect(submission.entry.score).toBe(89.2);
    expect(submission.entry.bestScore).toBe(96.0);
    expect(submission.entry.roundsPlayed).toBe(5);

    // Verify localStorage payload contains NO image or photo URLs
    const storedRaw = mockStorage.setItem.mock.calls[0][1];
    expect(storedRaw).not.toContain('data:image');
    expect(storedRaw).not.toContain('blob:');
    expect(storedRaw).not.toContain('capturedPhoto');

    const board = await service.fetchLeaderboard('face-off');
    expect(board.entries).toHaveLength(1);
    expect(board.entries[0].player).toBe('CyberFace');
    expect(board.entries[0].score).toBe(89.2);
    expect(board.entries[0].bestScore).toBe(96.0);
  });

  it('handles corrupted localStorage gracefully without crashing', async () => {
    store['funspot.leaderboard.v1'] = 'INVALID_JSON{[[{';

    const board = await service.fetchLeaderboard('face-off');
    expect(board.entries).toEqual([]);
    expect(board.source).toBe('local');
  });
});

