import { useEffect, useState } from 'react';
import { GAME_CONFIG } from '../gameConfig';
import { RobotIcon } from '../../../components/common/Icons';

/** Shown while the AI judge works. Switches to "taking a break" if it's slow or retrying. */
export default function JudgingScreen({ question, answer, retrying }) {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setSlow(true), GAME_CONFIG.judgeSlowNoticeMs);
    return () => clearTimeout(timer);
  }, []);
  const breakTime = slow || retrying;

  return (
    <section className="wa-panel wa-judging" role="status" aria-live="polite">
      <div className="wa-judging__bot" aria-hidden="true">
        <RobotIcon size={48} />
      </div>
      <p className="wa-judging__title">{breakTime ? 'AI JUDGE IS RECONNECTING…' : 'AI JUDGE IS EVALUATING…'}</p>
      <p className="wa-judging__sub">{breakTime ? 'Trying again…' : 'Scoring creativity · humour · incorrectness · relevance'}</p>
      <div className="wa-judging__scan" aria-hidden="true">
        <span />
      </div>
      <blockquote className="wa-judging__answer">
        <p className="wa-judging__q">{question}</p>
        <p>“{answer}”</p>
      </blockquote>
    </section>
  );
}
