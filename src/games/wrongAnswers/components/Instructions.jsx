import { useEffect, useRef } from 'react';
import CyberButton from '../../../components/common/CyberButton';
import { GAME_CONFIG } from '../gameConfig';

const JUDGE_NOTES = {
  ready: { tone: 'ok', text: 'AI judge online' },
  not_configured: { tone: 'warn', text: 'AI judge not configured on this computer — backup scoring will be used.' },
  unreachable: { tone: 'warn', text: 'Game server unreachable — backup scoring will be used.' },
};

export default function Instructions({ player, judgeStatus, onStart }) {
  const startRef = useRef(null);
  useEffect(() => {
    startRef.current?.focus();
  }, []);
  const note = JUDGE_NOTES[judgeStatus];

  return (
    <section className="wa-panel wa-howto" aria-labelledby="wa-howto-title">
      <p className="wa-eyebrow">WRONG ANSWERS ONLY!! · {player}</p>
      <h1 id="wa-howto-title" className="wa-howto__title">
        HOW TO PLAY
      </h1>
      <ol className="wa-howto__steps">
        <li>A random question appears.</li>
        <li>
          Give an intentionally <strong>WRONG</strong> answer.
        </li>
        <li>Make it creative.</li>
        <li>Make it funny.</li>
        <li>Make it relevant to the question.</li>
      </ol>
      <p className="wa-howto__motto">Creativity &gt; Correctness</p>

      <figure className="wa-example">
        <figcaption>EXAMPLE</figcaption>
        <p className="wa-example__q">Why does the moon follow your car?</p>
        <p className="wa-example__a">&ldquo;Because it hasn&apos;t paid for its own transport.&rdquo;</p>
      </figure>

      <p className="wa-howto__meta">
        {GAME_CONFIG.totalRounds} rounds
        {GAME_CONFIG.answerSeconds ? ` · ${GAME_CONFIG.answerSeconds}s per answer` : ''} · scored on creativity (35),
        humour (30), incorrectness (25) &amp; relevance (10)
      </p>
      {note && <p className={`wa-judge-note wa-judge-note--${note.tone}`}>{note.text}</p>}

      <CyberButton ref={startRef} onClick={onStart} icon="⟶" className="wa-howto__go">
        LET&apos;S GO
      </CyberButton>
    </section>
  );
}
