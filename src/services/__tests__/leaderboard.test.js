import { describe, expect, it, vi } from 'vitest';
import { createLeaderboardService, rankEntries } from '../leaderboard';
import { validatePlayerName, validateScoreEntry } from '../leaderboardValidation';

function memoryStorage() {
  const map = new Map();
  return { getItem: (k) => map.get(k) ?? null, setItem: (k, v) => map.set(k, String(v)) };
}

/** Minimal stand-in for supabase-js: chainable query builders + a realtime channel. */
function fakeSupabase() {
  const table = [];
  const realtime = [];
  const state = { offline: false };
  let clock = 0;

  const respond = (op, payload, filters, limit) => {
    if (state.offline) return { data: null, error: { message: 'TypeError: Failed to fetch', code: '' } };
    if (op === 'select') {
      return { data: rankEntries(table.filter((r) => r.game_mode === filters.game_mode)).slice(0, limit), error: null };
    }
    for (const row of [].concat(payload)) {
      if (op === 'upsert' && table.some((r) => r.id === row.id)) continue;
      const max = { random: 1000, wrong_answers: 100 }[row.game_mode];
      if (max === undefined || row.score > max) return { data: null, error: { code: '23514', message: 'check violation' } };
      const saved = { ...row, created_at: new Date(Date.UTC(2026, 0, 1, 0, 0, clock++)).toISOString() };
      table.push(saved);
      realtime.forEach((cb) => cb({ new: saved }));
    }
    return { data: null, error: null };
  };

  const builder = (op, payload) => {
    const filters = {};
    let limit = Infinity;
    const b = {
      eq: (k, v) => ((filters[k] = v), b),
      order: () => b,
      limit: (n) => ((limit = n), b),
      then: (res, rej) => Promise.resolve(respond(op, payload, filters, limit)).then(res, rej),
    };
    return b;
  };

  return {
    table,
    state,
    from: () => ({
      select: () => builder('select'),
      insert: (p) => builder('insert', p),
      upsert: (p) => builder('upsert', p),
    }),
    channel: () => {
      const ch = {
        on: (_type, _filter, cb) => (realtime.push(cb), ch),
        subscribe: (cb) => (cb('SUBSCRIBED'), ch),
      };
      return ch;
    },
    removeChannel: vi.fn(() => Promise.resolve()),
  };
}

const flush = () => new Promise((r) => setTimeout(r, 0));

describe('validation', () => {
  it('normalizes and validates player names', () => {
    expect(validatePlayerName('  Anush   K  ')).toEqual({ ok: true, value: 'Anush K' });
    expect(validatePlayerName('அனுஷ்').ok).toBe(true); // Tamil incl. combining marks
    expect(validatePlayerName('   ').ok).toBe(false);
    expect(validatePlayerName('x'.repeat(21)).ok).toBe(false);
    expect(validatePlayerName('<script>').ok).toBe(false);
  });
  it.each([
    ['negative', -1],
    ['NaN', NaN],
    ['Infinity', Infinity],
    ['too high', 1001],
    ['huge', 1e9],
    ['decimal', 500.5],
    ['string', '900'],
  ])('rejects %s scores', (_label, score) => {
    expect(validateScoreEntry({ playerName: 'ANUSH', gameMode: 'random', score }).ok).toBe(false);
  });
  it('only accepts the two competitive modes', () => {
    for (const gameMode of ['mirror', 'dont-laugh', 'wrong-answers', 'RANDOM', 'constructor', '__proto__', undefined]) {
      expect(validateScoreEntry({ playerName: 'ANUSH', gameMode, score: 50 }).ok).toBe(false);
    }
  });
  it('validates Wrong Answers scores: 0–100 with one decimal', () => {
    for (const score of [0, 1.1, 92.4, 100]) {
      expect(validateScoreEntry({ playerName: 'ANUSH', gameMode: 'wrong_answers', score }).ok).toBe(true);
    }
    for (const score of [-0.1, 100.1, 92.45, 500, NaN, Infinity, '92']) {
      expect(validateScoreEntry({ playerName: 'ANUSH', gameMode: 'wrong_answers', score }).ok).toBe(false);
    }
  });
});

describe('offline (no Supabase configured)', () => {
  const make = () => createLeaderboardService({ getClient: null, storage: memoryStorage(), events: new EventTarget() });

  it('saves locally and ranks score desc, then oldest first', async () => {
    let t = 0;
    const service = createLeaderboardService({
      getClient: null,
      storage: memoryStorage(),
      events: new EventTarget(),
      now: () => new Date(Date.UTC(2026, 0, 1, 0, 0, t++)),
    });
    await service.submitScore({ playerName: 'ARUN', gameMode: 'random', score: 700 });
    await service.submitScore({ playerName: 'PRIYA', gameMode: 'random', score: 925 });
    await service.submitScore({ playerName: 'ROHIT', gameMode: 'random', score: 700 });
    const result = await service.fetchLeaderboard('random');
    expect(result.source).toBe('local');
    expect(result.entries.map((e) => e.player)).toEqual(['PRIYA', 'ARUN', 'ROHIT']);
  });

  it('keeps only the top 10', async () => {
    const service = make();
    for (let i = 0; i < 14; i += 1) await service.submitScore({ playerName: `P${i}`, gameMode: 'random', score: i * 10 });
    const { entries } = await service.fetchLeaderboard('random');
    expect(entries).toHaveLength(10);
    expect(entries[0].score).toBe(130);
  });

  it('rejects invalid submissions without throwing', async () => {
    const service = make();
    await expect(service.submitScore({ playerName: '', gameMode: 'random', score: 10 })).resolves.toMatchObject({ status: 'rejected' });
    await expect(service.submitScore({ playerName: 'X', gameMode: 'mirror', score: 10 })).resolves.toMatchObject({ status: 'rejected' });
    expect((await service.fetchLeaderboard('random')).entries).toHaveLength(0);
  });

  it('survives storage that throws (private mode / blocked)', async () => {
    const broken = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); } };
    const service = createLeaderboardService({ getClient: null, storage: broken, events: null });
    await expect(service.submitScore({ playerName: 'ANUSH', gameMode: 'random', score: 10 })).resolves.toMatchObject({ status: 'local' });
    await expect(service.fetchLeaderboard('random')).resolves.toMatchObject({ entries: [] });
  });

  it('keeps the Random and Wrong Answers boards separate', async () => {
    const service = make();
    await service.submitScore({ playerName: 'ARUN', gameMode: 'random', score: 900 });
    await service.submitScore({ playerName: 'PRIYA', gameMode: 'wrong_answers', score: 92.4 });
    const random = await service.fetchLeaderboard('random');
    const wrong = await service.fetchLeaderboard('wrong-answers');
    expect(random.entries.map((e) => e.player)).toEqual(['ARUN']);
    expect(wrong.entries.map((e) => [e.player, e.score])).toEqual([['PRIYA', 92.4]]);
    await expect(service.fetchLeaderboard('mirror')).rejects.toThrow();
  });
});

describe('online (Supabase)', () => {
  const setup = () => {
    const supabase = fakeSupabase();
    const service = createLeaderboardService({
      getClient: () => Promise.resolve(supabase),
      storage: memoryStorage(),
      events: new EventTarget(),
      timeoutMs: 500,
    });
    return { supabase, service };
  };

  it('saves to Supabase and reads the live board', async () => {
    const { supabase, service } = setup();
    const saved = await service.submitScore({ playerName: 'ANUSH', gameMode: 'random', score: 941 });
    expect(saved.status).toBe('online');
    expect(supabase.table).toHaveLength(1);
    const board = await service.fetchLeaderboard('random');
    expect(board.source).toBe('online');
    expect(board.entries[0]).toMatchObject({ id: saved.entry.id, player: 'ANUSH', score: 941 });
  });

  it('falls back to local when Supabase is down, then syncs on reconnect', async () => {
    const { supabase, service } = setup();
    supabase.state.offline = true;
    const saved = await service.submitScore({ playerName: 'KARTHIK', gameMode: 'random', score: 901 });
    expect(saved.status).toBe('local');
    const offlineBoard = await service.fetchLeaderboard('random');
    expect(offlineBoard).toMatchObject({ source: 'local', offline: true });
    expect(offlineBoard.entries[0].player).toBe('KARTHIK');

    supabase.state.offline = false;
    await service.flushPending();
    expect(supabase.table.map((r) => r.id)).toEqual([saved.entry.id]);
    await service.flushPending(); // idempotent: no duplicates
    expect(supabase.table).toHaveLength(1);
  });

  it('notifies subscribers on realtime inserts and reports live status', async () => {
    const { service } = setup();
    const onChange = vi.fn();
    const onStatus = vi.fn();
    const unsubscribe = service.subscribe('random', onChange, onStatus);
    await flush();
    expect(onStatus).toHaveBeenCalledWith('live');
    onChange.mockClear();
    await service.submitScore({ playerName: 'PRIYA', gameMode: 'random', score: 925 });
    expect(onChange).toHaveBeenCalled();
    unsubscribe();
  });
});

describe('ranking', () => {
  it('is deterministic for ties', () => {
    const entries = [
      { id: 'b', score: 900, created_at: '2026-01-01T00:00:02Z' },
      { id: 'a', score: 900, created_at: '2026-01-01T00:00:02Z' },
      { id: 'c', score: 900, created_at: '2026-01-01T00:00:01Z' },
      { id: 'd', score: 950, created_at: '2026-01-01T00:00:09Z' },
    ];
    expect(rankEntries(entries).map((e) => e.id)).toEqual(['d', 'c', 'a', 'b']);
  });
});
