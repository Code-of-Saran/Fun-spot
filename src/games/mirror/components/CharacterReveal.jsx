import { useEffect, useRef } from 'react';
import CyberButton from '../../../components/common/CyberButton';
import { renderCharacterPreview } from '../effects/preview';

const AUTO_ADVANCE_MS = 3600;

/** "🎉 YOU GOT…" card with the costume shown on a neon mannequin. */
export default function CharacterReveal({ pick, sprites, onTransform }) {
  const { character, category } = pick;
  const canvasRef = useRef(null);
  const buttonRef = useRef(null);
  const onTransformRef = useRef(onTransform);

  useEffect(() => {
    onTransformRef.current = onTransform;
  });

  useEffect(() => {
    if (sprites && canvasRef.current) renderCharacterPreview(canvasRef.current, character, sprites);
  }, [sprites, character]);

  useEffect(() => {
    buttonRef.current?.focus();
    const timer = setTimeout(() => onTransformRef.current(), AUTO_ADVANCE_MS);
    return () => clearTimeout(timer);
  }, []);

  return (
    <section className="mr-reveal mr-panel" aria-labelledby="reveal-title">
      <p className="mr-reveal__eyebrow">🎉 YOU GOT:</p>
      <div className="mr-reveal__preview">
        {sprites ? (
          <canvas ref={canvasRef} width={360} height={360} role="img" aria-label={`${character.name} costume preview`} />
        ) : (
          <span className="mr-reveal__fallback" aria-hidden="true">
            {character.icon}
          </span>
        )}
        <span className="mr-reveal__burst" aria-hidden="true" />
      </div>
      <h1 id="reveal-title" className="mr-reveal__name">
        <span aria-hidden="true">{character.icon}</span> {character.name}
      </h1>
      <p className="mr-chip">
        <span aria-hidden="true">{category.icon}</span> {category.label}
      </p>
      <p className="mr-reveal__desc">{character.description}</p>
      <CyberButton ref={buttonRef} onClick={onTransform} icon="✨" className="mr-reveal__btn">
        TRANSFORM ME
      </CyberButton>
      <div className="mr-reveal__timer" aria-hidden="true">
        <span style={{ animationDuration: `${AUTO_ADVANCE_MS}ms` }} />
      </div>
    </section>
  );
}
