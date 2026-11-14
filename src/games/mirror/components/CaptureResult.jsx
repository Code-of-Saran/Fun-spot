import { useEffect, useRef } from 'react';
import CyberButton from '../../../components/common/CyberButton';

/** The captured, transformed photo + what to do next. Nothing is uploaded. */
export default function CaptureResult({ pick, capture, onTryAnother, onCaptureAgain }) {
  const { character, category } = pick;
  const tryAnotherRef = useRef(null);

  useEffect(() => {
    tryAnotherRef.current?.focus();
  }, []);

  return (
    <section className="mr-result mr-panel" aria-labelledby="mirror-result-title">
      <p className="mr-result__eyebrow">🪞 AI MIRROR</p>
      <h1 id="mirror-result-title" className="mr-result__title">
        🎉 YOUR CHARACTER
      </h1>
      <figure className="mr-result__photo">
        <img
          src={capture.url}
          width={capture.width}
          height={capture.height}
          alt={`Your AI Mirror photo as ${character.name}`}
        />
        <figcaption>
          <span aria-hidden="true">{character.icon}</span> {character.name}
          <span className="mr-chip">
            <span aria-hidden="true">{category.icon}</span> {category.label}
          </span>
        </figcaption>
      </figure>

      <div className="mr-result__actions">
        <CyberButton ref={tryAnotherRef} onClick={onTryAnother} icon="🎲">
          TRY ANOTHER
        </CyberButton>
        <CyberButton onClick={onCaptureAgain} variant="ghost" icon="📸">
          CAPTURE AGAIN
        </CyberButton>
        <a className="cyber-btn cyber-btn--ghost cyber-btn--md" href={capture.url} download={`funspot-ai-mirror-${character.id}.jpg`}>
          <span className="cyber-btn__label">SAVE IMAGE</span>
          <span className="cyber-btn__icon" aria-hidden="true">
            ⬇
          </span>
        </a>
        <CyberButton to="/" variant="ghost" icon="⌂" iconPosition="start">
          HOME
        </CyberButton>
      </div>
      <p className="mr-result__note">Your photo stays on this device — save it before you leave.</p>
    </section>
  );
}
