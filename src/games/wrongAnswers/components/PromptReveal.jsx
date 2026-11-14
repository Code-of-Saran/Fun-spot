import { useEffect, useRef, useState } from 'react';
import { PROMPTS } from '../prompts';
import { GAME_CONFIG } from '../gameConfig';
import { sfx } from '../../../utils/sfx';

import { DiceIcon } from '../../../components/common/Icons';

/** Quick "slot machine" of questions before the real one is shown. */
export default function PromptReveal({ round, onDone }) {
  const [text, setText] = useState(PROMPTS[0].question);
  const onDoneRef = useRef(onDone);

  useEffect(() => {
    onDoneRef.current = onDone;
  });

  useEffect(() => {
    let i = round * 7;
    const spin = setInterval(() => {
      i += 11;
      setText(PROMPTS[i % PROMPTS.length].question);
      sfx.shuffle();
    }, 110);
    const done = setTimeout(() => {
      clearInterval(spin);
      sfx.reveal();
      onDoneRef.current();
    }, GAME_CONFIG.promptRevealMs);
    return () => {
      clearInterval(spin);
      clearTimeout(done);
    };
  }, [round]);

  return (
    <div className="wa-reveal" role="status" aria-live="polite">
      <p className="wa-reveal__label">
        <DiceIcon size={18} style={{ display: 'inline-block', verticalAlign: 'text-bottom', marginRight: '8px' }} />
        PICKING A RANDOM QUESTION…
      </p>
      <p className="wa-reveal__spin" aria-hidden="true">
        {text}
      </p>
    </div>
  );
}
