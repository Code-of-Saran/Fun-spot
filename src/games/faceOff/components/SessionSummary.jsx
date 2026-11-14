import React from 'react';
import { RefreshIcon } from '../../../components/common/Icons';
import { getScoreTier } from '../faceOffConfig';

export default function SessionSummary({
  results,
  onPlayAgain,
  onExit,
}) {
  const validScores = results.map((r) => r.score).filter((s) => typeof s === 'number' && Number.isFinite(s));
  const avgScore = validScores.length > 0
    ? Math.round((validScores.reduce((a, b) => a + b, 0) / validScores.length) * 10) / 10
    : 0;
  const bestScore = validScores.length > 0 ? Math.max(...validScores) : 0;
  const tierInfo = getScoreTier(Math.round(avgScore));

  return (
    <div className="faceoff-summary-view">
      <div className="faceoff-summary-card">
        <div className="faceoff-summary-header">
          <div className="faceoff-summary-badge">MISSION COMPLETE</div>
          <h2 className="faceoff-summary-title">FACE OFF SESSION RECAP</h2>
          <div className="faceoff-summary-subtitle">
            All facial expression trials completed
          </div>
        </div>

        {/* ── STATS HERO ──────────────────────────────────────────────── */}
        <div className="faceoff-summary-stats">
          <div className="faceoff-stat-tile">
            <div className="faceoff-stat-tile__label">AVERAGE MATCH</div>
            <div className="faceoff-stat-tile__value" style={{ color: tierInfo.color }}>
              {avgScore}%
            </div>
            <div className="faceoff-stat-tile__sub">{tierInfo.label}</div>
          </div>

          <div className="faceoff-stat-tile">
            <div className="faceoff-stat-tile__label">BEST SCORE</div>
            <div className="faceoff-stat-tile__value" style={{ color: '#00f0ff' }}>
              {bestScore}%
            </div>
            <div className="faceoff-stat-tile__sub">PEAK ACCURACY</div>
          </div>

          <div className="faceoff-stat-tile">
            <div className="faceoff-stat-tile__label">ROUNDS PLAYED</div>
            <div className="faceoff-stat-tile__value" style={{ color: '#ffb800' }}>
              {results.length}
            </div>
            <div className="faceoff-stat-tile__sub">CHALLENGES</div>
          </div>
        </div>

        {/* ── ROUNDS GRID ─────────────────────────────────────────────── */}
        <div className="faceoff-summary-rounds">
          <div className="faceoff-summary-rounds-title">ROUND PERFORMANCE</div>
          <div className="faceoff-summary-rounds-grid">
            {results.map((r, idx) => {
              const rTier = getScoreTier(r.score);
              return (
                <div key={idx} className="faceoff-round-recap-card">
                  <div className="faceoff-round-recap-card__header">
                    <span>ROUND {idx + 1}</span>
                    <strong style={{ color: rTier.color }}>{r.score}%</strong>
                  </div>
                  <div className="faceoff-round-recap-card__photos">
                    <img src={r.challenge.image} alt={r.challenge.name} title="Target" />
                    <img src={r.capturedPhoto} alt="Your capture" title="You" />
                  </div>
                  <div className="faceoff-round-recap-card__title">
                    {r.challenge.name}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── BOTTOM ACTIONS ──────────────────────────────────────────── */}
        <div className="faceoff-summary-actions">
          <button
            type="button"
            className="faceoff-btn faceoff-btn--ghost"
            onClick={onExit}
          >
            RETURN TO ARCADE
          </button>
          <button
            type="button"
            className="faceoff-btn faceoff-btn--cyan"
            onClick={onPlayAgain}
          >
            <RefreshIcon size={16} /> PLAY AGAIN
          </button>
        </div>
      </div>
    </div>
  );
}

