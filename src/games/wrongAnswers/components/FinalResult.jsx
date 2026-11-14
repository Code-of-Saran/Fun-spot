import { useEffect, useRef } from 'react';
import AnimatedNumber from '../../../components/common/AnimatedNumber';
import CyberButton from '../../../components/common/CyberButton';
import { bestRound, gameRating, gameScore } from '../scoring';
import { sfx } from '../../../utils/sfx';

const SAVE_TEXT = {
  saving: 'Saving to the leaderboard…',
  online: 'Score saved to the live leaderboard.',
  local: 'Leaderboard server unreachable — saved on this device, will sync when it’s back.',
  offline: 'Score saved on this device.',
  rejected: 'This score couldn’t be saved.',
  failed: 'This score couldn’t be saved, but your game is fine.',
};

export default function FinalResult({ player, rounds, save, onPlayAgain, onNewPlayer }) {
  const score = gameScore(rounds);
  const best = bestRound(rounds);
  const answered = rounds.filter((r) => r.source !== 'timeout').length;
  const backupRounds = rounds.filter((r) => r.source === 'fallback').length;
  const ref = useRef(null);
  const ticks = useRef(0);

  useEffect(() => {
    sfx.complete();
    ref.current?.focus({ preventScroll: true });
  }, []);

  const saveText = save.status === 'local' && !save.serverConfigured ? SAVE_TEXT.offline : SAVE_TEXT[save.status];

  return (
    <section className="wa-panel wa-final" aria-labelledby="wa-final-title">
      <h1 id="wa-final-title" className="wa-final__title">
        GAME COMPLETE!
      </h1>
      <p className="wa-eyebrow">{player} · YOUR FINAL SCORE</p>
      <p className="wa-final__score" aria-label={`Final score ${score.toFixed(1)}`}>
        <AnimatedNumber
          value={Math.round(score * 10)}
          from={0}
          duration={1500}
          format={(tenths) => (tenths / 10).toFixed(1)}
          onTick={() => {
            ticks.current += 1;
            if (ticks.current % 5 === 0) sfx.score();
          }}
        />
      </p>
      <p className="wa-final__rating">{gameRating(score)}</p>

      <dl className="wa-final__stats">
        <div>
          <dt>ROUNDS</dt>
          <dd>{rounds.length}</dd>
        </div>
        <div>
          <dt>ANSWERED</dt>
          <dd>{answered}</dd>
        </div>
        <div>
          <dt>BEST ROUND</dt>
          <dd>{best ? Math.round(best.score) : 0}</dd>
        </div>
        <div>
          <dt>AVERAGE</dt>
          <dd>{score.toFixed(1)}</dd>
        </div>
      </dl>

      {best && best.answer && (
        <figure className="wa-best">
          <figcaption>YOUR BEST ANSWER &middot; {Math.round(best.score)}</figcaption>
          <p className="wa-best__q">{best.question}</p>
          <blockquote>“{best.answer}”</blockquote>
          {best.score >= 85 && <p className="wa-best__tag">LEGENDARY ANSWER</p>}
        </figure>
      )}

      <details className="wa-history">
        <summary>All {rounds.length} answers</summary>
        <ol>
          {rounds.map((r) => (
            <li key={r.round}>
              <span className="wa-history__q">{r.question}</span>
              <span className="wa-history__a">{r.answer ? `“${r.answer}”` : '— no answer —'}</span>
              <span className="wa-history__s">{Math.round(r.score)}</span>
            </li>
          ))}
        </ol>
      </details>

      {backupRounds > 0 && (
        <p className="wa-note wa-note--soft">
          {backupRounds} round{backupRounds > 1 ? 's were' : ' was'} evaluated using arcade backup scoring.
        </p>
      )}
      <p className={`wa-save wa-save--${save.status}`} role="status">
        {saveText}
        {save.rank && ` You're #${save.rank} on the board!`}
      </p>

      <div className="wa-final__actions">
        <CyberButton to="/leaderboards/wrong-answers">
          LEADERBOARD
        </CyberButton>
        <CyberButton ref={ref} onClick={onPlayAgain} variant="ghost">
          PLAY AGAIN
        </CyberButton>
        <CyberButton to="/" variant="ghost">
          HOME
        </CyberButton>
      </div>
      <button type="button" className="wa-final__switch" onClick={onNewPlayer}>
        Next player? Switch player
      </button>
    </section>
  );
}
