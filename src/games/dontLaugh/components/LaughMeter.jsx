import React from 'react';
import { meterState } from '../gameConfig';

/**
 * AI LAUGH METER — Redesigned according to reference design (Dont laugh.jpeg).
 * Displays gradient bar (cyan -> purple -> magenta -> red) with ticks at 0%, 25%, 50%, 75%, 100%.
 */
export default function LaughMeter({ percent }) {
  const state = meterState(percent);
  return (
    <div className={`dl-meter dl-meter--${state.tone}`}>
      <div className="dl-meter__head">
        <div className="dl-meter__title-wrap">
          <svg
            className="dl-meter__crosshair-icon"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="22" y1="12" x2="18" y2="12" />
            <line x1="6" y1="12" x2="2" y2="12" />
            <line x1="12" y1="6" x2="12" y2="2" />
            <line x1="12" y1="22" x2="12" y2="18" />
          </svg>
          <span className="dl-meter__title">AI LAUGH METER</span>
          <span className="dl-meter__info-btn" title="AI Laugh Meter measures sudden facial smiles and laugh contractions">
            ⓘ
          </span>
        </div>
      </div>

      <div className="dl-meter__track-wrap">
        <div
          className="dl-meter__track"
          role="meter"
          aria-label="Laugh meter"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
          aria-valuetext={`${percent}% — ${state.label}`}
        >
          <div className="dl-meter__fill" style={{ width: `${percent}%` }} />
        </div>

        <div className="dl-meter__ticks" aria-hidden="true">
          <div className="dl-meter__tick-col">
            <span className="dl-meter__tick-mark" />
            <span className="dl-meter__tick-label">0%</span>
          </div>
          <div className="dl-meter__tick-col">
            <span className="dl-meter__tick-mark" />
            <span className="dl-meter__tick-label">25%</span>
          </div>
          <div className="dl-meter__tick-col">
            <span className="dl-meter__tick-mark" />
            <span className="dl-meter__tick-label">50%</span>
          </div>
          <div className="dl-meter__tick-col">
            <span className="dl-meter__tick-mark" />
            <span className="dl-meter__tick-label">75%</span>
          </div>
          <div className="dl-meter__tick-col">
            <span className="dl-meter__tick-mark" />
            <span className="dl-meter__tick-label">100%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
