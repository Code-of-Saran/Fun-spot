import { useCallback, useEffect, useRef, useState } from 'react';
import { CONTENT, createContentDeck } from './content';

/**
 * Content engine: while `active`, draws items without replacement from a shuffled deck.
 * No GIF repeats until the entire eligible pool has been shown.
 * When exhausted, a fresh cycle begins with a new shuffle, avoiding immediate repetition
 * at the cycle boundary. Broken assets are safely skipped.
 */
export function useFunnyContent(active) {
  const [item, setItem] = useState(null);
  const broken = useRef(new Set());
  const deckRef = useRef(null);
  const advancingRef = useRef(false);

  if (!deckRef.current) {
    deckRef.current = createContentDeck(CONTENT, { broken: broken.current });
  }

  const next = useCallback(() => {
    if (advancingRef.current) return;
    advancingRef.current = true;
    const picked = deckRef.current.next();
    setItem(picked);
    // Debounce to prevent rapid double-advance from event or timer race
    setTimeout(() => {
      advancingRef.current = false;
    }, 150);
  }, []);

  useEffect(() => {
    if (active) {
      next();
    } else {
      deckRef.current?.reset();
    }
  }, [active, next]);

  useEffect(() => {
    if (!active || !item) return undefined;
    const timer = setTimeout(next, (item.duration || 5) * 1000);
    return () => clearTimeout(timer);
  }, [active, item, next]);

  /** Called when an item fails to load: never show it again, move on. */
  const markBroken = useCallback(
    (id) => {
      broken.current.add(id);
      deckRef.current?.markBroken(id);
      if (active) next();
    },
    [active, next],
  );

  return { item, markBroken };
}

