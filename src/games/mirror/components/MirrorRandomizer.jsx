import { useEffect, useRef, useState } from 'react';
import { CATEGORIES, CHARACTERS } from '../characters';
import { sfx } from '../../../utils/sfx';

/** Reel items ending on `final`, cycling through `pool` (slows down at the end). */
function reel(pool, final, length) {
  const items = [];
  for (let i = 0; i < length - 1; i += 1) items.push(pool[(i * 5 + 2) % pool.length]);
  items.push(final);
  return items;
}

/**
 * Game-show style draw, in two explicit stages:
 *   stage 'category'  → reel of categories lands on the drawn one
 *   stage 'character' → reel of that category's characters, 3·2·1, "YOUR CHARACTER IS..."
 * The draw itself already happened (randomCharacter.js); this only reveals it.
 */
export default function MirrorRandomizer({ stage, pick, onDone }) {
  const [display, setDisplay] = useState({ kind: 'reel', item: null, spin: 0, landed: false });
  const onDoneRef = useRef(onDone);

  useEffect(() => {
    onDoneRef.current = onDone;
  });

  useEffect(() => {
    const timers = [];
    const at = (ms, fn) => timers.push(setTimeout(fn, ms));
    const isCategory = stage === 'category';
    const pool = isCategory
      ? CATEGORIES
      : CHARACTERS.filter((c) => c.category === pick.category.id && c.id !== pick.character.id).concat(pick.character);
    const items = reel(pool, isCategory ? pick.category : pick.character, isCategory ? 14 : 16);

    let t = 0;
    items.forEach((item, i) => {
      const last = i === items.length - 1;
      at(t, () => {
        setDisplay({ kind: 'reel', item, spin: i, landed: last });
        if (last) sfx.tick();
        else sfx.shuffle();
      });
      t += 60 + i * i * 1.6;
    });

    if (isCategory) {
      at(t + 650, () => onDoneRef.current());
    } else {
      ['3', '2', '1'].forEach((n, k) =>
        at(t + 500 + k * 360, () => {
          setDisplay({ kind: 'count', text: n });
          sfx.tick();
        }),
      );
      at(t + 500 + 3 * 360, () => setDisplay({ kind: 'teaser' }));
      at(t + 500 + 3 * 360 + 850, () => onDoneRef.current());
    }
    return () => timers.forEach(clearTimeout);
  }, [stage, pick]);

  const isCategory = stage === 'category';
  return (
    <div className="mr-randomizer" role="status" aria-live="polite">
      <p className="mr-randomizer__label">{isCategory ? '🎲 SELECTING CATEGORY...' : '🎲 SELECTING CHARACTER...'}</p>
      {!isCategory && (
        <p className="mr-chip mr-chip--big">
          <span aria-hidden="true">{pick.category.icon}</span> {pick.category.label}
        </p>
      )}

      <div className={`mr-randomizer__reel${display.landed ? ' mr-randomizer__reel--landed' : ''}`}>
        {display.kind === 'reel' && display.item && (
          <span key={display.spin} className="mr-randomizer__item">
            <span className="mr-randomizer__icon" aria-hidden="true">
              {display.item.icon}
            </span>
            <span className="mr-randomizer__name">{display.item.label ?? display.item.name}</span>
          </span>
        )}
        {display.kind === 'count' && (
          <span key={display.text} className="mr-randomizer__count">
            {display.text}
          </span>
        )}
        {display.kind === 'teaser' && <span className="mr-randomizer__teaser">YOUR CHARACTER IS...</span>}
      </div>
    </div>
  );
}
