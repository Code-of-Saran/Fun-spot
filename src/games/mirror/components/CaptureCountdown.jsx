import { useEffect, useRef, useState } from 'react';
import { sfx } from '../../../utils/sfx';

const STEP_MS = 700;

/** 3 · 2 · 1 · 📸 — gives the player time to pose, then calls `onSnap` once. */
export default function CaptureCountdown({ onSnap }) {
  const [label, setLabel] = useState('3');
  const onSnapRef = useRef(onSnap);

  useEffect(() => {
    onSnapRef.current = onSnap;
  });

  useEffect(() => {
    sfx.tick();
    const timers = [
      setTimeout(() => (setLabel('2'), sfx.tick()), STEP_MS),
      setTimeout(() => (setLabel('1'), sfx.tick()), STEP_MS * 2),
      setTimeout(() => onSnapRef.current(), STEP_MS * 3),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="mr-countdown" role="status" aria-live="assertive">
      <span key={label} className="mr-countdown__value">
        {label}
      </span>
      <p className="mr-countdown__hint">STRIKE A POSE!</p>
    </div>
  );
}
