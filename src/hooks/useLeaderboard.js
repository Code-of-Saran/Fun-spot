import { useCallback, useEffect, useState } from 'react';
import { leaderboard } from '../services/leaderboard';

/**
 * Loads one leaderboard and keeps it fresh: refetches on realtime inserts,
 * local saves, other tabs and reconnects.
 *
 * Returns { status, entries, source, offline, connection, retry }
 *   source: 'online' | 'local' | 'sample'
 *   connection: 'live' | 'connecting' | 'offline'
 */
export function useLeaderboard(boardId) {
  const [state, setState] = useState({ status: 'loading', entries: [], source: null, offline: false });
  const [connection, setConnection] = useState('connecting');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let latest = 0;

    const load = () => {
      const request = ++latest;
      leaderboard
        .fetchLeaderboard(boardId)
        .then(({ entries, source, offline }) => {
          if (!cancelled && request === latest) setState({ status: 'ready', entries, source, offline });
        })
        .catch(() => {
          if (!cancelled && request === latest) setState((prev) => ({ ...prev, status: 'error' }));
        });
    };

    setState((prev) => ({ ...prev, status: 'loading' }));
    load();
    const unsubscribe = leaderboard.subscribe(boardId, load, (status) => !cancelled && setConnection(status));

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [boardId, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  return { ...state, connection, retry };
}
