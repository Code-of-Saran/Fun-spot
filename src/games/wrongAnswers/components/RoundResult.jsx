import { useEffect, useRef } from 'react';
import AnimatedNumber from '../../../components/common/AnimatedNumber';
import CyberButton from '../../../components/common/CyberButton';
import { GAME_CONFIG, METRICS } from '../gameConfig';

const SOURCE_NOTES = {
  timeout: 'No answer this round.',
};

export default function RoundResult({ round, result, onNext }) {
  const nextRef = useRef(null);
  useEffect(() => {
    nextRef.current?.focus({ preventScroll: true });
  }, []);
  const last = round >= GAME_CONFIG.totalRounds;

  return (
    <section className={`wa-panel wa-result wa-result--${result.source}`} aria-labelledby="wa-round-title">
      <p className="wa-eyebrow">
        ROUND {round} / {GAME_CONFIG.totalRounds}
      </p>
      <h1 id="wa-round-title" className="wa-result__title">
        ROUND {round} RESULT
      </h1>

      <div className="wa-result__answer">
        <p className="wa-result__q">{result.question}</p>
        <p className="wa-result__label">YOUR ANSWER:</p>
        <blockquote>{result.answer ? `“${result.answer}”` : '— no answer —'}</blockquote>
      </div>

      <div className="wa-result__judge">
        <p className="wa-result__judge-title">{result.source === 'ai' ? 'AI JUDGE' : result.source === 'fallback' ? 'BACKUP JUDGE' : 'TIME’S UP'}</p>
        <ul className="wa-metrics">
          {METRICS.map((m, i) => (
            <li key={m.key} className="wa-metric" style={{ '--i': i }}>
              <span className="wa-metric__label">
                <span aria-hidden="true">{m.icon}</span> {m.label}
              </span>
              <span className="wa-metric__track" aria-hidden="true">
                <span style={{ width: `${result[m.key]}%` }} />
              </span>
              <AnimatedNumber value={result[m.key]} from={0} duration={900} className="wa-metric__value" />
            </li>
          ))}
        </ul>
      </div>

      <div className="wa-result__score">
        <span className="wa-result__score-label">FINAL SCORE</span>
        <AnimatedNumber
          value={Math.round(result.score * 10)}
          from={0}
          duration={1200}
          format={(tenths) => (tenths / 10).toFixed(1)}
          className="wa-result__score-value"
        />
      </div>
      <p className="wa-result__feedback">“{result.feedback}”</p>
      {SOURCE_NOTES[result.source] && <p className="wa-note">{SOURCE_NOTES[result.source]}</p>}
      {result.retried && result.source === 'ai' && <p className="wa-note wa-note--soft">The AI judge needed a second try.</p>}

      <CyberButton ref={nextRef} onClick={onNext} icon="⟶">
        {last ? 'SEE FINAL SCORE' : 'NEXT ROUND'}
      </CyberButton>
    </section>
  );
}
