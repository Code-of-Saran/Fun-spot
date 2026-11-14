import { useEffect, useRef, useState } from 'react';
import { sfx } from '../../../utils/sfx';

const STEP_MS = 800;

/** 3 · 2 · 1 · GO! — calls `onGo` exactly when GO appears; detection starts then, not before. */
export default function CountdownOverlay({ onGo }) {
  const [label, setLabel] = useState('3');
  const onGoRef = useRef(onGo);

  useEffect(() => {
    onGoRef.current = onGo;
  });

  useEffect(() => {
    sfx.tick();
    const timers = [
      setTimeout(() => (setLabel('2'), sfx.tick()), STEP_MS),
      setTimeout(() => (setLabel('1'), sfx.tick()), STEP_MS * 2),
      setTimeout(() => {
        setLabel('GO!');
        sfx.go();
        onGoRef.current();
      }, STEP_MS * 3),
      setTimeout(() => setLabel(null), STEP_MS * 3 + 650),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  if (!label) return null;
  return (
    <div className="rg-countdown" role="status" aria-live="assertive">
      <span key={label} className={`rg-countdown__value${label === 'GO!' ? ' rg-countdown__value--go' : ''}`}>
        {label}
      </span>
    </div>
  );
}
