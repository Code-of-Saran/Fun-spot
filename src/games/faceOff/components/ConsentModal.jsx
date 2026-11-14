import React, { useState } from 'react';
import { CameraIcon, BoltIcon, ShieldCheckIcon, CloseIcon } from '../../../components/common/Icons';

export default function ConsentModal({ onConsent, onCancel }) {
  const [agreed, setAgreed] = useState(false);

  return (
    <div className="faceoff-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="consent-title">
      <div className="faceoff-modal">
        <div className="faceoff-modal__header">
          <div className="faceoff-modal__badge">PRIVACY & CAMERA PROTOCOL</div>
          <button
            type="button"
            className="faceoff-modal__close-btn"
            onClick={onCancel}
            aria-label="Cancel and Exit"
          >
            <CloseIcon size={16} />
          </button>
        </div>

        <h2 id="consent-title" className="faceoff-modal__title">
          WELCOME TO FACE OFF
        </h2>
        <div className="faceoff-modal__subtitle">
          AI-POWERED FACIAL EXPRESSION MATCH CHALLENGE
        </div>

        <div className="faceoff-modal__body">
          <div className="faceoff-modal__features">
            <div className="faceoff-feature-item">
              <div className="faceoff-feature-item__icon">
                <CameraIcon size={20} />
              </div>
              <div className="faceoff-feature-item__text">
                <strong>Local Camera Processing</strong>
                <p>
                  Your webcam stream is analyzed directly in your browser using MediaPipe Face Landmarker. Video is processed in real time on your device.
                </p>
              </div>
            </div>

            <div className="faceoff-feature-item">
              <div className="faceoff-feature-item__icon">
                <BoltIcon size={20} />
              </div>
              <div className="faceoff-feature-item__text">
                <strong>Frame Capture at Timer Zero</strong>
                <p>
                  When the 5-second countdown finishes, a single still photo is captured so you can see your expression compared side-by-side with the reference.
                </p>
              </div>
            </div>

            <div className="faceoff-feature-item">
              <div className="faceoff-feature-item__icon">
                <ShieldCheckIcon size={20} />
              </div>
              <div className="faceoff-feature-item__text">
                <strong>Privacy & Security First</strong>
                <p>
                  No facial recognition or identity tracking is performed. Captured photos stay in local application memory and are never uploaded to any server. You can optionally download your souvenir card.
                </p>
              </div>
            </div>
          </div>

          <label className="faceoff-consent-checkbox">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              id="consent-agreement"
            />
            <span className="faceoff-consent-checkbox__label">
              I understand and consent to local webcam facial analysis and round photo capture.
            </span>
          </label>
        </div>

        <div className="faceoff-modal__actions">
          <button
            type="button"
            className="faceoff-btn faceoff-btn--ghost"
            onClick={onCancel}
          >
            RETURN TO MENU
          </button>
          <button
            type="button"
            className="faceoff-btn faceoff-btn--cyan"
            disabled={!agreed}
            onClick={onConsent}
          >
            START CHALLENGE ⟶
          </button>
        </div>
      </div>
    </div>
  );
}

