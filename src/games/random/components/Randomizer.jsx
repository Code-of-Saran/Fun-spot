import { useEffect, useRef, useState } from 'react';
import { CHALLENGES } from '../challenges';
import { sfx } from '../../../utils/sfx';

const ICONS = CHALLENGES.map((c) => c.icon);
const SHUFFLE_MS = 1700;

/**
 * Slot-machine style reveal: icons spin (slowing down), 3·2·1, "YOUR CHALLENGE IS…",
 * then `onDone`. The challenge itself was already chosen by the engine.
 */
export default function Randomizer({ onDone }) {
  const [stage, setStage] = useState({ kind: 'shuffle', icon: ICONS[0], spin: -1 });
  const onDoneRef = useRef(onDone);

  useEffect(() => {
    onDoneRef.current = onDone;
  });

  useEffect(() => {
    const timers = [];
    const at = (ms, fn) => timers.push(setTimeout(fn, ms));

    // spin: delays grow so the reel visibly slows down
    let t = 0;
    let i = 0;
    while (t < SHUFFLE_MS) {
      const icon = ICONS[(i * 7 + 3) % ICONS.length];
      const spin = i;
      at(t, () => {
        setStage({ kind: 'shuffle', icon, spin });
        sfx.shuffle();
      });
      t += 70 + i * 9;
      i += 1;
    }
    ['3', '2', '1'].forEach((n, k) =>
      at(SHUFFLE_MS + k * 380, () => {
        setStage({ kind: 'count', text: n });
        sfx.tick();
      }),
    );
    at(SHUFFLE_MS + 3 * 380, () => setStage({ kind: 'teaser' }));
    at(SHUFFLE_MS + 3 * 380 + 900, () => onDoneRef.current());

    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="rg-randomizer" role="status" aria-live="polite">
      <p className="rg-randomizer__label">🎲 RANDOMIZING...</p>
      <div className="rg-randomizer__reel" aria-hidden={stage.kind === 'shuffle'}>
        {stage.kind === 'shuffle' && (
          <span key={stage.spin} className="rg-randomizer__icon">
            {stage.icon}
          </span>
        )}
        {stage.kind === 'count' && (
          <span key={stage.text} className="rg-randomizer__count">
            {stage.text}
          </span>
        )}
        {stage.kind === 'teaser' && <span className="rg-randomizer__teaser">YOUR CHALLENGE IS...</span>}
      </div>
    </div>
  );
}
