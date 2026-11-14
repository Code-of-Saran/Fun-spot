import React, { useEffect, useState } from 'react';
import {
  CameraIcon,
  RefreshIcon,
  ChevronRightIcon,
  DownloadIcon,
  TrophyIcon,
  AlertIcon,
} from '../../../components/common/Icons';
import { getScoreTier, getResultTitle } from '../faceOffConfig';
import { generateDownloadCard } from '../utils/generateDownloadCard';

export default function ResultComparison({
  challenge,
  capturedPhoto,
  scoreResult,
  faceDetected,
  errorMessage,
  onRetake,
  onNext,
  isLastRound,
}) {
  const [animatedScore, setAnimatedScore] = useState(0);
  const [downloading, setDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(false);

  const finalScore = scoreResult?.score ?? 0;
  const tierInfo = getScoreTier(finalScore);
  const resultTitle = getResultTitle(finalScore, challenge.id);

  // Smooth counter animation from 0 to finalScore
  useEffect(() => {
    if (!faceDetected || !scoreResult) return;

    let start = 0;
    const end = finalScore;
    const duration = 1200; // ms
    const startTime = performance.now();

    const frame = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const ease = 1 - Math.pow(1 - progress, 3);
      setAnimatedScore(Math.round(start + (end - start) * ease));

      if (progress < 1) {
        requestAnimationFrame(frame);
      }
    };

    requestAnimationFrame(frame);
  }, [faceDetected, scoreResult, finalScore]);

  const handleDownload = async () => {
    if (downloading) return;
    setDownloading(true);
    try {
      const success = await generateDownloadCard({
        referenceImgSrc: challenge.image,
        capturedPhotoUrl: capturedPhoto,
        challenge,
        scoreResult: scoreResult || { score: 0 },
        resultTitle,
      });
      if (success) {
        setDownloadSuccess(true);
        setTimeout(() => setDownloadSuccess(false), 3000);
      }
    } catch (e) {
      console.error('[FaceOff] Download failed:', e);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="faceoff-result-view">
      {/* ── TOP HEADER / TITLE ─────────────────────────────────────────── */}
      <div className="faceoff-result-header">
        <div className="faceoff-result-badge">{challenge.badge} • {challenge.difficulty}</div>
        <h2 className="faceoff-result-challenge-name">{challenge.name.toUpperCase()}</h2>
        <div className="faceoff-result-instructions">{challenge.humorousDescription}</div>
      </div>

      {/* ── SIDE-BY-SIDE PHOTO COMPARISON ─────────────────────────────── */}
      <div className="faceoff-comparison-grid">
        {/* LEFT: Reference Image */}
        <div className="faceoff-card faceoff-card--reference">
          <div className="faceoff-card__tag">
            <span className="faceoff-card__dot faceoff-card__dot--cyan" />
            <span>TARGET REFERENCE</span>
          </div>
          <div className="faceoff-card__media-wrapper">
            <img
              src={challenge.image}
              alt={`Target expression: ${challenge.name}`}
              className="faceoff-card__img"
            />
          </div>
          <div className="faceoff-card__footer">
            <span className="faceoff-card__caption">{challenge.subtitle}</span>
          </div>
        </div>

        {/* CENTER: Match Percentage HUD */}
        <div className="faceoff-score-hud">
          {faceDetected && scoreResult ? (
            <>
              <div className="faceoff-score-circle" style={{ '--score-color': tierInfo.color }}>
                <div className="faceoff-score-circle__value">{animatedScore}%</div>
                <div className="faceoff-score-circle__label">MATCH</div>
              </div>

              <div
                className="faceoff-tier-pill"
                style={{
                  background: `${tierInfo.color}22`,
                  borderColor: tierInfo.color,
                  color: tierInfo.color,
                }}
              >
                {tierInfo.label}
              </div>

              <div className="faceoff-funny-title">
                <TrophyIcon size={16} /> &ldquo;{resultTitle}&rdquo;
              </div>

              <button
                type="button"
                className="faceoff-breakdown-toggle"
                onClick={() => setShowBreakdown((prev) => !prev)}
              >
                {showBreakdown ? '▲ HIDE METRICS' : '▼ AI METRICS'}
              </button>

              {showBreakdown && (
                <div className="faceoff-breakdown-panel">
                  <div className="faceoff-breakdown-row">
                    <span>Blendshapes (60%):</span>
                    <strong>{scoreResult.blendshapeSim}%</strong>
                  </div>
                  <div className="faceoff-breakdown-row">
                    <span>Geometry (30%):</span>
                    <strong>{scoreResult.ratioSim}%</strong>
                  </div>
                  <div className="faceoff-breakdown-row">
                    <span>Pose Align (10%):</span>
                    <strong>{scoreResult.poseSim}%</strong>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="faceoff-score-failed">
              <div className="faceoff-score-failed__icon"><AlertIcon size={28} /></div>
              <div className="faceoff-score-failed__title">FACE NOT DETECTED</div>
              <p className="faceoff-score-failed__desc">
                {errorMessage || 'Step clearly into the webcam frame with good lighting and retry!'}
              </p>
            </div>
          )}
        </div>

        {/* RIGHT: Captured Participant Photo */}
        <div className="faceoff-card faceoff-card--captured">
          <div className="faceoff-card__tag">
            <span className="faceoff-card__dot faceoff-card__dot--green" />
            <span>YOUR CAPTURED EXPRESSION</span>
          </div>
          <div className="faceoff-card__media-wrapper">
            {capturedPhoto ? (
              <img
                src={capturedPhoto}
                alt="Your captured expression"
                className="faceoff-card__img"
              />
            ) : (
              <div className="faceoff-card__empty">
                <CameraIcon size={36} />
                <span>No frame captured</span>
              </div>
            )}
          </div>
          <div className="faceoff-card__footer">
            <span className="faceoff-card__caption">Captured at Timer 0:00</span>
          </div>
        </div>
      </div>

      {/* ── ACTION BUTTONS ────────────────────────────────────────────── */}
      <div className="faceoff-actions-bar">
        <button
          type="button"
          className="faceoff-btn faceoff-btn--ghost"
          onClick={onRetake}
          title="Try this expression again"
        >
          <RefreshIcon size={16} /> RETAKE
        </button>

        {faceDetected && capturedPhoto && (
          <button
            type="button"
            className="faceoff-btn faceoff-btn--amber"
            onClick={handleDownload}
            disabled={downloading}
            title="Download high-res souvenir card with score"
          >
            <DownloadIcon size={16} />
            {downloadSuccess
              ? 'SAVED TO DOWNLOADS!'
              : downloading
                ? 'GENERATING...'
                : 'DOWNLOAD PHOTO CARD'}
          </button>
        )}

        <button
          type="button"
          className="faceoff-btn faceoff-btn--cyan"
          onClick={onNext}
          title={isLastRound ? 'Finish challenge and view summary' : 'Proceed to next expression challenge'}
        >
          {isLastRound ? 'FINISH SESSION' : 'NEXT CHALLENGE'} <ChevronRightIcon size={16} />
        </button>
      </div>
    </div>
  );
}

