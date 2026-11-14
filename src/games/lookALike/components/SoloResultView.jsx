import CyberButton from '../../../components/common/CyberButton';

export default function SoloResultView({
  participantPhoto,
  celebrity,
  onDownload,
  onRetake,
  isDownloading,
}) {
  if (!celebrity) return null;

  return (
    <div className="lookalike-result-container" data-testid="solo-result-view">
      <div className="lookalike-result-header">
        <span className="lookalike-result-badge">SOLO LOOK A LIKE RESULT</span>
        <h2 className="lookalike-result-title">YOUR INDIAN CELEBRITY RESEMBLANCE</h2>
        <p className="lookalike-result-subtitle">
          Matched with funny and exaggerated expressions from Indian cinema
        </p>
      </div>

      {/* Side-by-Side Comparison Layout */}
      <div className="lookalike-comparison-stage">
        {/* Left: Participant Captured Photograph */}
        <div className="lookalike-card lookalike-card--participant">
          <div className="lookalike-card__badge lookalike-card__badge--cyan">YOU</div>
          <div className="lookalike-card__photo-wrap">
            <img
              src={participantPhoto}
              alt="Participant capture"
              className="lookalike-card__photo"
            />
          </div>
          <div className="lookalike-card__caption">
            <span className="lookalike-card__label">YOUR PHOTO</span>
          </div>
        </div>

        {/* Center: Resemblance Connector */}
        <div className="lookalike-connector" aria-hidden="true">
          <div className="lookalike-connector__label">LOOK A LIKE</div>
        </div>

        {/* Right: Exactly ONE Indian Celebrity Photograph */}
        <div
          className="lookalike-card lookalike-card--celebrity"
          style={{ '--celeb-accent': celebrity.themeColor || '#ff00aa' }}
        >
          <div className="lookalike-card__badge lookalike-card__badge--accent">
            {celebrity.badge || 'CELEBRITY MATCH'}
          </div>
          <div className="lookalike-card__photo-wrap">
            <img
              src={celebrity.image}
              alt={celebrity.name}
              className="lookalike-card__photo"
            />
          </div>
          <div className="lookalike-card__caption">
            <h3 className="lookalike-card__celeb-name">{celebrity.name}</h3>
            <div className="lookalike-card__celeb-title">{celebrity.title}</div>
            <p className="lookalike-card__celeb-desc">{celebrity.description}</p>
          </div>
        </div>
      </div>

      {/* Sharing & Actions */}
      <div className="lookalike-actions">
        <CyberButton
          variant="cyan"
          size="medium"
          onClick={onDownload}
          disabled={isDownloading}
          id="btn-download-solo"
        >
          {isDownloading ? 'PREPARING IMAGE...' : 'DOWNLOAD PHOTO CARD'}
        </CyberButton>

        <CyberButton
          variant="lime"
          size="medium"
          onClick={onRetake}
          id="btn-retake-solo"
        >
          RETAKE / NEW MATCH
        </CyberButton>
      </div>
    </div>
  );
}
