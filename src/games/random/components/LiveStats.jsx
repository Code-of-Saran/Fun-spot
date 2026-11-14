import AnimatedNumber from '../../../components/common/AnimatedNumber';

const COUNT_LABELS = { clap: 'CLAPS', chicken: 'FLAPS', robot: 'ROBOT MOVES', fingers: 'FINGERS SEEN' };

/** Timer, progress bar, live score and the detector's coaching hint. */
export default function LiveStats({ challenge, snapshot }) {
  const seconds = snapshot.remainingMs / 1000;
  const percent = Math.round(snapshot.progress * 100);
  const urgent = seconds <= 3;
  const countLabel = COUNT_LABELS[challenge.id];

  return (
    <div className="rg-stats">
      <div className={`rg-stats__timer${urgent ? ' rg-stats__timer--urgent' : ''}`} role="timer" aria-label={`${Math.ceil(seconds)} seconds left`}>
        <span aria-hidden="true">⏱️</span> {seconds.toFixed(1).padStart(4, '0')} <small>SEC</small>
      </div>

      <div className="rg-stats__progress">
        <div className="rg-stats__progress-head">
          <span>PROGRESS</span>
          <span>{percent}%</span>
        </div>
        <div
          className="rg-meter"
          role="progressbar"
          aria-label="Challenge progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
        >
          <span style={{ width: `${percent}%` }} />
        </div>
      </div>

      <div className="rg-stats__row">
        <div className="rg-stats__score">
          <span className="rg-stats__caption">SCORE</span>
          <AnimatedNumber value={snapshot.score} duration={400} className="rg-stats__score-value" />
        </div>
        {countLabel && snapshot.target != null && (
          <div className="rg-stats__count">
            <span className="rg-stats__caption">{countLabel}</span>
            <span className="rg-stats__count-value">
              {snapshot.count ?? 0}
              {challenge.id !== 'fingers' && <small>/{snapshot.target}</small>}
            </span>
          </div>
        )}
      </div>

      <p className="rg-stats__hint" aria-live="polite">
        {snapshot.hint || 'Go go go!'}
      </p>
    </div>
  );
}
