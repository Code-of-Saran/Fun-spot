import { useEffect, useRef, useState } from 'react';

/**
 * Counts smoothly from the previous value to `value` (integers). Calls `onTick` on each
 * change (e.g. a sound). `format` renders the number, e.g. tenths → "92.4".
 */
export default function AnimatedNumber({ value, from, duration = 600, onTick, className, format = String }) {
  // `from` (e.g. 0) makes the number count up when it first appears.
  const [shown, setShown] = useState(from ?? value);
  const shownRef = useRef(from ?? value);
  const onTickRef = useRef(onTick);

  useEffect(() => {
    onTickRef.current = onTick;
  });

  useEffect(() => {
    const from = shownRef.current;
    if (from === value) return undefined;
    const start = performance.now();
    let raf = 0;
    const step = (now) => {
      const k = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - k) ** 3;
      const next = Math.round(from + (value - from) * eased);
      if (next !== shownRef.current) {
        shownRef.current = next;
        setShown(next);
        onTickRef.current?.();
      }
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  return <span className={className}>{format(shown)}</span>;
}
