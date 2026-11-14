import { createId } from '../utils/id';
import { BOARD_GAME_MODES, validateScoreEntry } from './leaderboardValidation';

/**
 * Leaderboard service.
 *
 *   game → submitScore ─┬─► Supabase (when configured & reachable) ──► realtime ──► UI
 *                       └─► localStorage (always; offline fallback + retry queue)
 *
 * Nothing here ever throws into the game: every failure degrades to the local
 * board, and unsynced scores are pushed to Supabase when it becomes reachable.
 *
 * Boards are addressed by their route id ('random', 'wrong-answers'); each maps
 * to one stored game_mode ('random', 'wrong_answers'), so boards never mix.
 */
export const TABLE = 'leaderboard_entries';
export const TOP_N = 10;
const LOCAL_KEY = 'funspot.leaderboard.v1';
const LOCAL_LIMIT = 200;
const CHANGE_EVENT = 'funspot:leaderboard-change';

/** score desc → best_score desc (tie-breaker) → older entry first → id: fully deterministic. */
export function rankEntries(entries) {
  return [...entries].sort(
    (a, b) =>
      b.score - a.score ||
      ((b.best_score ?? b.bestScore ?? b.score) - (a.best_score ?? a.bestScore ?? a.score)) ||
      String(a.created_at).localeCompare(String(b.created_at)) ||
      String(a.id).localeCompare(String(b.id)),
  );
}

const toRow = (entry) => ({
  id: entry.id,
  player: entry.player_name,
  score: entry.score,
  bestScore: entry.best_score ?? entry.bestScore ?? entry.score,
  roundsPlayed: entry.rounds_played ?? entry.roundsPlayed ?? 5,
  createdAt: entry.created_at,
});

function withTimeout(promise, ms) {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error('Leaderboard request timed out')), ms);
    }),
  ]).finally(() => clearTimeout(timer));
}

/** Runs a supabase-js query builder and turns `{ error }` responses into exceptions. */
async function query(builder, ms) {
  const { data, error } = await withTimeout(builder, ms);
  if (error) throw error;
  return data;
}

/**
 * @param {object} deps
 * @param {() => Promise<object> | null} deps.getClient  Supabase client factory, or null when offline-only
 * @param {Storage | null} deps.storage                   localStorage-like store
 * @param {EventTarget | null} deps.events                where change/online events are dispatched
 */
export function createLeaderboardService({ getClient, storage, events, timeoutMs = 6000, now = () => new Date() }) {
  let flushing = null;

  // ---------- local store ----------
  const readLocal = () => {
    try {
      return JSON.parse(storage?.getItem(LOCAL_KEY) ?? '[]');
    } catch {
      return [];
    }
  };
  const writeLocal = (entries) => {
    try {
      storage?.setItem(LOCAL_KEY, JSON.stringify(entries.slice(-LOCAL_LIMIT)));
    } catch {
      // storage full / blocked: the game still continues
    }
  };
  const markSynced = (ids) => writeLocal(readLocal().map((e) => (ids.includes(e.id) ? { ...e, synced: true } : e)));
  const notify = () => events?.dispatchEvent(new Event(CHANGE_EVENT));

  async function client() {
    try {
      return (await getClient?.()) ?? null;
    } catch {
      return null;
    }
  }

  /**
   * Pushes scores saved while offline, one at a time. A row the database
   * rejects (it carries a Postgres error code) is dropped from the queue so it
   * can't block the rest; network errors stop the flush until the next attempt.
   */
  function flushPending() {
    if (flushing) return flushing;
    flushing = (async () => {
      const pending = readLocal().filter((e) => !e.synced);
      const supabase = pending.length ? await client() : null;
      if (!supabase) return 0;
      const done = [];
      for (const { id, player_name, game_mode, score } of pending) {
        try {
          await query(
            supabase.from(TABLE).upsert({ id, player_name, game_mode, score }, { onConflict: 'id', ignoreDuplicates: true }),
            timeoutMs,
          );
          done.push(id);
        } catch (error) {
          if (!error?.code) break; // offline / timeout: retry later
          done.push(id); // permanently rejected by the server
        }
      }
      if (done.length) {
        markSynced(done);
        notify();
      }
      return done.length;
    })()
      .catch(() => 0)
      .finally(() => {
        flushing = null;
      });
    return flushing;
  }

  /**
   * @returns {Promise<{ entries: object[], source: 'online'|'local', offline: boolean }>}
   */
  async function fetchLeaderboard(boardId) {
    const gameMode = BOARD_GAME_MODES[boardId];
    if (!gameMode) throw new Error(`Unknown leaderboard: ${boardId}`);
    const supabase = await client();
    if (supabase) {
      try {
        const data = await query(
          supabase
            .from(TABLE)
            .select('id, player_name, score, created_at')
            .eq('game_mode', gameMode)
            .order('score', { ascending: false })
            .order('created_at', { ascending: true })
            .order('id', { ascending: true })
            .limit(TOP_N),
          timeoutMs,
        );
        flushPending();
        return { entries: data.map(toRow), source: 'online', offline: false };
      } catch {
        // fall through to the local board
      }
    }
    const local = rankEntries(readLocal().filter((e) => e.game_mode === gameMode)).slice(0, TOP_N);
    return { entries: local.map(toRow), source: 'local', offline: Boolean(supabase) };
  }

  /**
   * Saves a score. Never throws.
   * @returns {Promise<{ status: 'online'|'local'|'rejected'|'failed', entry?: object, error?: string }>}
   */
  async function submitScore(input) {
    try {
      const checked = validateScoreEntry(input);
      if (!checked.ok) return { status: 'rejected', error: checked.error };

      const entry = {
        id: createId(),
        player_name: checked.value.playerName,
        game_mode: checked.value.gameMode,
        score: checked.value.score,
        best_score: typeof input.bestScore === 'number' ? input.bestScore : checked.value.score,
        rounds_played: typeof input.roundsPlayed === 'number' ? input.roundsPlayed : 5,
        created_at: now().toISOString(),
        synced: false,
      };
      writeLocal([...readLocal(), entry]);

      let status = 'local';
      const supabase = await client();
      if (supabase) {
        try {
          const { id, player_name, game_mode, score } = entry;
          await query(supabase.from(TABLE).insert({ id, player_name, game_mode, score }), timeoutMs);
          markSynced([entry.id]);
          status = 'online';
        } catch {
          // stays queued locally; flushPending() retries later
        }
      }
      notify();
      return { status, entry: toRow(entry) };
    } catch {
      return { status: 'failed', error: 'Could not save score.' };
    }
  }

  /**
   * Calls `onChange` whenever the board may have changed: realtime inserts,
   * local saves (this tab or others) and reconnects. `onStatus` receives
   * 'live' | 'connecting' | 'offline'. Returns an unsubscribe function.
   */
  function subscribe(boardId, onChange, onStatus = () => {}) {
    const gameMode = BOARD_GAME_MODES[boardId];
    if (!gameMode) return () => {};
    let closed = false;
    let channel = null;
    let supabaseRef = null;

    const onLocal = () => onChange();
    const onStorage = (event) => event.key === LOCAL_KEY && onChange();
    const onOnline = () => flushPending().then(() => !closed && onChange());
    events?.addEventListener(CHANGE_EVENT, onLocal);
    events?.addEventListener('storage', onStorage);
    events?.addEventListener('online', onOnline);

    client().then((supabase) => {
      if (closed) return;
      if (!supabase) {
        onStatus('offline');
        return;
      }
      supabaseRef = supabase;
      onStatus('connecting');
      try {
        channel = supabase
          .channel(`leaderboard-${boardId}`)
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: TABLE, filter: `game_mode=eq.${gameMode}` }, () => {
            if (!closed) onChange();
          })
          .subscribe((status) => {
            if (closed) return;
            if (status === 'SUBSCRIBED') {
              onStatus('live');
              onChange(); // catch up on anything missed while (re)connecting
            } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
              onStatus('offline');
            }
          });
      } catch {
        onStatus('offline');
      }
    });

    return () => {
      closed = true;
      events?.removeEventListener(CHANGE_EVENT, onLocal);
      events?.removeEventListener('storage', onStorage);
      events?.removeEventListener('online', onOnline);
      if (channel && supabaseRef) supabaseRef.removeChannel(channel).catch?.(() => {});
    };
  }

  return { fetchLeaderboard, submitScore, subscribe, flushPending };
}

// ---------- app-wide instance ----------
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const isOnlineLeaderboardConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

let supabasePromise = null;
const getSupabase = isOnlineLeaderboardConfigured
  ? () =>
      (supabasePromise ??= import('@supabase/supabase-js').then(({ createClient }) =>
        createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } }),
      ))
  : null;

const safeStorage = (() => {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
})();

export const leaderboard = createLeaderboardService({
  getClient: getSupabase,
  storage: safeStorage,
  events: typeof window !== 'undefined' ? window : null,
});

export const submitScore = (gameMode, playerName, score, metadata = {}) =>
  leaderboard.submitScore({
    gameMode: gameMode === 'face-off' ? 'face_off' : gameMode,
    playerName,
    score,
    bestScore: metadata?.bestScore,
    roundsPlayed: metadata?.roundsPlayed,
  });

// ---------- "that's me" highlight (per browser tab) ----------
const LAST_ENTRY_KEY = 'funspot.lastEntry';

export function rememberLastEntry(boardId, entryId) {
  try {
    sessionStorage.setItem(`${LAST_ENTRY_KEY}.${boardId}`, entryId);
  } catch {
    // highlight is a nicety only
  }
}

export function getLastEntry(boardId) {
  try {
    return sessionStorage.getItem(`${LAST_ENTRY_KEY}.${boardId}`);
  } catch {
    return null;
  }
}
