import { TrophyIcon } from '../common/Icons';

export default function LeaderboardRow({ rank, player, score, detail, isYou = false, rowRef, formatScore = (s) => s.toLocaleString() }) {
  const classes = ['lb-row', rank <= 3 && `lb-row--top lb-row--rank-${rank}`, isYou && 'lb-row--you'].filter(Boolean).join(' ');

  return (
    <li ref={rowRef} className={classes} style={{ '--i': rank }} aria-current={isYou ? 'true' : undefined}>
      <span className="lb-row__rank">
        {rank <= 3 ? (
          <>
            <TrophyIcon size={16} aria-hidden="true" style={{ color: rank === 1 ? '#ffd700' : rank === 2 ? '#c0c0c0' : '#cd7f32' }} />
            <span className="visually-hidden">Rank {rank}</span>
          </>
        ) : (
          <>
            <span className="visually-hidden">Rank </span>
            {String(rank).padStart(2, '0')}
          </>
        )}
      </span>
      <span className="lb-row__player">
        <span className="lb-row__name">
          {player}
          {isYou && <span className="lb-row__you">YOU</span>}
        </span>
        {detail && <span className="lb-row__detail">{detail}</span>}
      </span>
      <span className="lb-row__score">
        {formatScore(score)}
        <span className="visually-hidden"> points</span>
      </span>
    </li>
  );
}
