import { useEffect, useRef } from 'react';
import AnimatedNumber from '../../../components/common/AnimatedNumber';
import CyberButton from '../../../components/common/CyberButton';
import { OUTCOME } from '../gameMachine';
import { sfx } from '../../../utils/sfx';

const SAVE_TEXT = {
  saving: 'Saving your score…',
  online: 'Score saved to the live leaderboard.',
  local: 'Leaderboard server unreachable — score saved on this device and will sync when it’s back.',
  offline: 'Score saved on this device.',
  rejected: 'This score couldn’t be saved.',
  failed: 'This score couldn’t be saved, but your game is fine.',
};

function Bar({ label, value }) {
  const percent = Math.round(value * 100);
  return (
    <div className="rg-breakdown__item">
      <span className="rg-breakdown__label">{label}</span>
      <div className="rg-meter rg-meter--thin" role="img" aria-label={`${label} ${percent}%`}>
        <span style={{ width: `${percent}%` }} />
      </div>
      <span className="rg-breakdown__value">{percent}%</span>
    </div>
  );
}

export default function ResultScreen({ player, challenge, result, save, onPlayAgain, onChangePlayer }) {
  const success = result.outcome === OUTCOME.SUCCESS;
  const playAgainRef = useRef(null);
  const tickRef = useRef(0);

  useEffect(() => {
    playAgainRef.current?.focus();
  }, []);

  const saveText = save.status === 'local' && !save.serverConfigured ? SAVE_TEXT.offline : SAVE_TEXT[save.status];

  return (
    <section className={`rg-result rg-panel theme-gold rg-result--${result.feedback.tier}`} aria-labelledby="result-title">
      <h1 id="result-title" className="rg-result__title">
        {success ? '🎉 CHALLENGE COMPLETE!' : '⏱️ TIME’S UP!'}
      </h1>
      <p className="rg-result__challenge">
        <span aria-hidden="true">{challenge.icon}</span> {challenge.title} · {player}
      </p>

      <div className="rg-result__score" aria-label={`Score ${result.total}`}>
        <AnimatedNumber
          value={result.total}
          from={0}
          duration={1400}
          className="rg-result__score-value"
          onTick={() => {
            tickRef.current += 1;
            if (tickRef.current % 4 === 0) sfx.score();
          }}
        />
        <span className="rg-result__score-label">SCORE</span>
      </div>

      <div className="rg-result__percent">
        <div className="rg-meter" role="img" aria-label={`${result.percent}% complete`}>
          <span style={{ width: `${result.percent}%` }} />
        </div>
        <p>{result.percent}% COMPLETE</p>
      </div>

      <div className="rg-breakdown">
        <Bar label="COMPLETION ×70%" value={result.completion} />
        <Bar label="ACCURACY ×20%" value={result.accuracy} />
        <Bar label="SPEED ×10%" value={result.speed} />
      </div>

      <p className="rg-result__message">{result.feedback.message}</p>
      <p className="rg-result__status">
        <span aria-hidden="true">🤖</span> SYSTEM STATUS: {result.feedback.status}
      </p>

      <p className={`rg-result__save rg-result__save--${save.status}`} role="status">
        {saveText}
        {save.rank && ` You're #${save.rank} on the board!`}
      </p>

      <div className="rg-result__actions">
        <CyberButton ref={playAgainRef} onClick={onPlayAgain} icon="🎲">
          PLAY AGAIN
        </CyberButton>
        <CyberButton to="/leaderboards/random" variant="ghost" icon="🏆">
          LEADERBOARD
        </CyberButton>
        <CyberButton to="/" variant="ghost" icon="⌂" iconPosition="start">
          HOME
        </CyberButton>
      </div>
      <button type="button" className="rg-result__switch" onClick={onChangePlayer}>
        Not {player}? Switch player
      </button>
    </section>
  );
}
