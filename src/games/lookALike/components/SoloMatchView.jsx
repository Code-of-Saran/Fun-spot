import CyberButton from '../../../components/common/CyberButton';

export default function SoloMatchView({
  videoRef,
  canvasRef,
  faceDetected,
  countdown,
  isAnalyzing,
  selectedCollection = 'male',
  onSelectCollection,
  onTriggerCapture,
  onCancelCountdown,
}) {
  return (
    <div className="lookalike-camera-panel" data-testid="solo-match-view">
      <div className="lookalike-camera-viewport">
        <video
          ref={videoRef}
          className="lookalike-camera-video"
          playsInline
          muted
          autoPlay
        />
        <canvas ref={canvasRef} className="lookalike-camera-canvas" />

        {/* Solo Face Framing HUD */}
        <div className={`lookalike-hud-reticle ${faceDetected ? 'lookalike-hud-reticle--locked' : ''}`}>
          <div className="lookalike-hud-corner lookalike-hud-corner--tl" />
          <div className="lookalike-hud-corner lookalike-hud-corner--tr" />
          <div className="lookalike-hud-corner lookalike-hud-corner--bl" />
          <div className="lookalike-hud-corner lookalike-hud-corner--br" />
          <div className="lookalike-hud-target-line" />
        </div>

        {/* Live Status Badge */}
        <div className="lookalike-viewport-status">
          <span className={`lookalike-dot ${faceDetected ? 'lookalike-dot--active' : 'lookalike-dot--searching'}`} />
          <span>{faceDetected ? 'FACE DETECTED — READY' : 'POSITION FACE IN FRAME'}</span>
        </div>

        {/* Countdown Overlay */}
        {countdown !== null && countdown > 0 && (
          <div className="lookalike-countdown-overlay">
            <div className="lookalike-countdown-num">{countdown}</div>
            <div className="lookalike-countdown-label">STRIKE YOUR FUNNY POSE!</div>
            <button
              type="button"
              className="lookalike-countdown-cancel"
              onClick={onCancelCountdown}
            >
              Cancel
            </button>
          </div>
        )}

        {/* Analyzing Spinner Overlay */}
        {isAnalyzing && (
          <div className="lookalike-analyzing-overlay">
            <div className="lookalike-spinner" />
            <div className="lookalike-analyzing-text">ANALYZING FACIAL EXPRESSION...</div>
            <div className="lookalike-analyzing-sub">
              Searching {selectedCollection === 'female' ? 'Female' : 'Male'} Indian Celebrity Collection
            </div>
          </div>
        )}
      </div>

      {/* Controls Bar */}
      <div className="lookalike-controls-bar">
        {/* Explicit Participant Collection Selection */}
        <div className="lookalike-collection-selector-wrap">
          <span className="lookalike-collection-title">REFERENCE COLLECTION:</span>
          <div className="lookalike-collection-pills" role="radiogroup" aria-label="Reference collection">
            <button
              type="button"
              role="radio"
              aria-checked={selectedCollection === 'male'}
              className={`lookalike-collection-pill ${
                selectedCollection === 'male' ? 'lookalike-collection-pill--active-male' : ''
              }`}
              onClick={() => onSelectCollection?.('male')}
            >
              MALE STARS (43)
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={selectedCollection === 'female'}
              className={`lookalike-collection-pill ${
                selectedCollection === 'female' ? 'lookalike-collection-pill--active-female' : ''
              }`}
              onClick={() => onSelectCollection?.('female')}
            >
              FEMALE STARS (17)
            </button>
          </div>
        </div>

        <div className="lookalike-controls-group">
          <CyberButton
            variant="cyan"
            size="large"
            onClick={() => onTriggerCapture(3)}
            disabled={!faceDetected || countdown !== null || isAnalyzing}
            id="btn-capture-solo-timer"
          >
            3s COUNTDOWN SNAP
          </CyberButton>

          <CyberButton
            variant="magenta"
            size="large"
            onClick={() => onTriggerCapture(0)}
            disabled={!faceDetected || countdown !== null || isAnalyzing}
            id="btn-capture-solo-instant"
          >
            INSTANT SNAP
          </CyberButton>
        </div>
      </div>
    </div>
  );
}
