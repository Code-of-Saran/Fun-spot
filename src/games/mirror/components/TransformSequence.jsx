import { useEffect, useState } from 'react';

const STEPS = ['INITIALIZING', 'ANALYZING FACE', 'APPLYING CHARACTER', 'SYNCING FACE'];
const STEP_MS = 480;

/** Holographic status readout shown over the camera while the costume loads in. */
export default function TransformSequence({ character, waitingFor }) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setStep((s) => Math.min(STEPS.length, s + 1)), STEP_MS);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="mr-transform" role="status" aria-live="polite">
      <p className="mr-transform__title">
        <span aria-hidden="true">{character.icon}</span> TRANSFORMING INTO {character.name}
      </p>
      <ul className="mr-transform__steps">
        {STEPS.map((label, i) => (
          <li key={label} className={i < step ? 'is-done' : i === step ? 'is-active' : ''}>
            <span aria-hidden="true">{i < step ? '✔' : '✨'}</span> {label}
            {i === step && '...'}
          </li>
        ))}
      </ul>
      {step >= STEPS.length && waitingFor && <p className="mr-transform__wait">{waitingFor}</p>}
    </div>
  );
}
