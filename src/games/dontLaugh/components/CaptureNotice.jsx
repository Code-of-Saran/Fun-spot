import { useEffect, useRef } from 'react';
import CyberButton from '../../../components/common/CyberButton';
import { CameraIcon } from '../../../components/common/Icons';

/** Shown before every new player: the game saves a photo when it catches a laugh. */
export default function CaptureNotice({ player, onAccept, onBack }) {
  const acceptRef = useRef(null);
  useEffect(() => {
    acceptRef.current?.focus();
  }, []);

  return (
    <section className="dl-panel dl-notice" aria-labelledby="dl-notice-title" role="dialog" aria-modal="false">
      <p className="dl-notice__icon" aria-hidden="true">
        <CameraIcon size={36} />
      </p>
      <h1 id="dl-notice-title" className="dl-notice__title">
        NOTICE
      </h1>
      <p className="dl-notice__text">
        When the game detects a laugh, it <strong>captures that moment</strong> and <strong>saves the photo</strong> for
        this expo game.
      </p>
      <ul className="dl-notice__list">
        <li>Your camera is used only while you play.</li>
        <li>No photo is saved if you survive without laughing.</li>
        <li>Photos are stored on this expo computer only — not posted online.</li>
      </ul>
      <p className="dl-notice__player">
        Playing as <strong>{player}</strong>
      </p>
      <div className="dl-notice__actions">
        <CyberButton ref={acceptRef} onClick={onAccept} icon="▶">
          GOT IT / START
        </CyberButton>
        <CyberButton onClick={onBack} variant="ghost" icon="←" iconPosition="start">
          BACK
        </CyberButton>
      </div>
    </section>
  );
}
