import { useLayoutEffect, useRef } from 'react';
import LeaderboardRow from './LeaderboardRow';
import LoadingScreen from '../common/LoadingScreen';
import ErrorScreen from '../common/ErrorScreen';
import { TrophyIcon } from '../common/Icons';
import './Leaderboard.css';

/** Slides rows from their previous position to the new one when ranks change (FLIP). */
function useRankAnimation(entries) {
  const rows = useRef(new Map());
  const previous = useRef(new Map());

  useLayoutEffect(() => {
    const next = new Map();
    rows.current.forEach((el, id) => {
      if (!el) return;
      const top = el.getBoundingClientRect().top;
      next.set(id, top);
      const before = previous.current.get(id);
      if (before !== undefined && Math.abs(before - top) > 1 && el.animate) {
        el.animate([{ transform: `translateY(${before - top}px)` }, { transform: 'none' }], {
          duration: 500,
          easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
        });
      }
    });
    previous.current = next;
  }, [entries]);

  return (id) => (el) => {
    if (el) rows.current.set(id, el);
    else rows.current.delete(id);
  };
}

/**
 * Leaderboard panel. Presentation only — data and status come from the caller
 * (see hooks/useLeaderboard), so the data source can change freely.
 *
 * badge: { label, tone: 'live' | 'local' } shown next to the title.
 * formatScore: optional score formatter (e.g. one decimal for Wrong Answers).
 */
export default function Leaderboard({
  title,
  icon,
  theme = 'cyan',
  status = 'ready',
  entries = [],
  badge,
  highlightId,
  scoreLabel = 'SCORE',
  formatScore,
  onRetry,
  emptyMessage = 'No scores yet. Be the first legend on the board!',
}) {
  const rowRef = useRankAnimation(entries);

  return (
    <section className={`leaderboard theme-${theme}`} aria-labelledby="leaderboard-title" aria-busy={status === 'loading'}>
      <header className="leaderboard__head">
        <h2 id="leaderboard-title" className="leaderboard__title">
          {icon && <span aria-hidden="true">{icon} </span>}
          {title}
        </h2>
        {badge && status !== 'loading' && (
          <span className={`leaderboard__badge leaderboard__badge--${badge.tone}`} title={badge.title}>
            {badge.tone === 'live' && <span className="leaderboard__live-dot" aria-hidden="true" />}
            {badge.label}
          </span>
        )}
      </header>

      {status === 'loading' && entries.length === 0 && <LoadingScreen message="LOADING SCORES..." />}

      {status === 'error' && (
        <ErrorScreen compact code="ERR_SCORES" title="SCORES OFFLINE" message="Couldn't load this leaderboard." onRetry={onRetry} />
      )}

      {status !== 'error' && status !== 'loading' && entries.length === 0 && (
        <div className="leaderboard__empty">
          <span className="leaderboard__empty-icon" aria-hidden="true">
            <TrophyIcon size={32} />
          </span>
          <p>{emptyMessage}</p>
        </div>
      )}

      {status !== 'error' && entries.length > 0 && (
        <>
          <div className="leaderboard__cols" aria-hidden="true">
            <span>RANK</span>
            <span>PLAYER</span>
            <span>{scoreLabel}</span>
          </div>
          <ol className="leaderboard__list" aria-live="polite">
            {entries.map((entry, index) => (
              <LeaderboardRow
                key={entry.id}
                rowRef={rowRef(entry.id)}
                rank={index + 1}
                isYou={entry.id === highlightId}
                formatScore={formatScore}
                {...entry}
              />
            ))}
          </ol>
        </>
      )}
    </section>
  );
}
