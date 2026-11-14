import React from 'react';
import { AlertIcon } from '../../../components/common/Icons';

export default function CountdownOverlay({
  secondsLeft,
  isFaceDetected,
  liveScore,
  challenge,
}) {
  return (
    <div className="faceoff-countdown-overlay" aria-live="polite">
      <div className="faceoff-countdown-box">
        {/* Giant Digit with pulse animation */}
        <div className="faceoff-countdown-digit" key={secondsLeft}>
          {secondsLeft > 0 ? secondsLeft : 'SMILE!'}
        </div>

        <div className="faceoff-countdown-prompt">
          {secondsLeft > 0 ? challenge?.instructions || 'HOLD THE EXPRESSION!' : 'CAPTURING FINAL FRAME...'}
        </div>

        {/* Live Tracking Feedback Pill */}
        <div
          className={`faceoff-tracking-badge ${
            isFaceDetected ? 'faceoff-tracking-badge--locked' : 'faceoff-tracking-badge--searching'
          }`}
        >
          <span className="faceoff-tracking-dot" />
          <span>
            {isFaceDetected
              ? liveScore !== null
                ? `FACE DETECTED • LIVE SYNC: ${liveScore}%`
                : 'FACE DETECTED • HOLD EXPRESSION'
              : <><AlertIcon size={14} /> STEP INTO VIEW — LOOK AT CAMERA</>}
          </span>
        </div>
      </div>
    </div>
  );
}

