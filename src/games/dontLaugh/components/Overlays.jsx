import { useEffect, useRef, useState } from 'react';
import { GAME } from '../gameConfig';
import { sfx } from '../../../utils/sfx';

/** Neutral-face calibration readout (progress only advances while a face is visible). */
export function CalibrationOverlay({ progress, faceVisible }) {
  const remaining = Math.max(1, Math.ceil(3 * (1 - progress)));
  return (
    <div className="dl-overlay dl-overlay--bottom" role="status" aria-live="polite">
      <p className="dl-overlay__title">LOOK AT THE CAMERA</p>
      <p className="dl-overlay__text">{faceVisible ? 'Hold a neutral expression…' : 'Move into the frame'}</p>
      <span className="dl-overlay__big" key={remaining}>
        {remaining}
      </span>
      <div className="dl-overlay__bar" aria-hidden="true">
        <span style={{ width: `${Math.round(progress * 100)}%` }} />
      </div>
    </div>
  );
}

/** READY? · 3 · 2 · 1 · GO! — calls onGo once, exactly when GO appears. */
export function CountdownOverlay({ onGo }) {
  const [label, setLabel] = useState('READY?');
  const onGoRef = useRef(onGo);

  useEffect(() => {
    onGoRef.current = onGo;
  });

  useEffect(() => {
    const step = GAME.COUNTDOWN_STEP_MS;
    const timers = ['3', '2', '1'].map((n, i) =>
      setTimeout(() => {
        setLabel(n);
        sfx.tick();
      }, 700 + i * step),
    );
    timers.push(
      setTimeout(() => {
        setLabel('GO!');
        sfx.go();
        onGoRef.current();
      }, 700 + 3 * step),
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="dl-overlay dl-overlay--clear" role="status" aria-live="assertive">
      <span key={label} className={`dl-overlay__big${label.length > 1 ? ' dl-overlay__big--word' : ''}`}>
        {label}
      </span>
    </div>
  );
}

/** Camera flash + verdict the instant a laugh is confirmed. */
export function CaughtFlash() {
  return (
    <div className="dl-flash" role="alert">
      <span className="dl-flash__text">LAUGH DETECTED!</span>
    </div>
  );
}

/** Shown over the camera when the timer runs out without a laugh. */
export function SurvivedSplash() {
  return (
    <div className="dl-flash dl-flash--survived" role="alert">
      <span className="dl-flash__text">YOU SURVIVED!</span>
    </div>
  );
}
