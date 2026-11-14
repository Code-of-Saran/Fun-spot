import { useEffect, useRef } from 'react';
import CyberButton from '../../../components/common/CyberButton';
import { RefreshIcon, HomeIcon } from '../../../components/common/Icons';
import { pick } from '../../../utils/random';
import { meterPercent } from '../laughDetector';

const CAUGHT_LINES = [
  'WE GOT THE MOMENT!',
  'THE LAUGH METER WINS THIS ROUND!',
  'CAUGHT IN 4K!',
  'THAT SMILE WAS WORTH IT!',
];
const SURVIVED_LINES = [
  'Laugh detector defeated.',
  'Absolute poker face master.',
  'Not even the funniest memes got you.',
  'The AI is filing a complaint.',
];

const seconds = (ms) => `${(ms / 1000).toFixed(1)}s`;

function UploadStatus({ upload, onRetry }) {
  if (upload.status === 'uploading') {
    return (
      <div className="dl-upload dl-upload--uploading" role="status">
        <p className="dl-upload__status-text">UPLOADING CAPTURE...</p>
      </div>
    );
  }
  if (upload.status === 'saved') {
    return (
      <div className="dl-upload dl-upload--saved" role="status">
        <p className="dl-upload__status-text">
          MOMENT SAVED — PHOTO SAVED SUCCESSFULLY
        </p>
        {upload.filename && <code className="dl-upload__filename">{upload.filename}</code>}
      </div>
    );
  }
  if (upload.status === 'local') {
    return (
      <div className="dl-upload dl-upload--local dl-upload--failed" role="status">
        <strong className="dl-upload__failed-title">
          UPLOAD FAILED — YOUR CAPTURE IS RETAINED. RETRY UPLOAD.
        </strong>
        {upload.error && <span className="dl-upload__reason">{upload.error}</span>}
        <CyberButton onClick={onRetry} variant="ghost" size="sm" icon={<RefreshIcon size={16} />} iconPosition="start">
          RETRY UPLOAD
        </CyberButton>
      </div>
    );
  }
  return null;
}

function Actions({ onPlayAgain, primaryLabel }) {
  const ref = useRef(null);
  useEffect(() => {
    ref.current?.focus({ preventScroll: true });
  }, []);
  return (
    <div className="dl-result__actions">
      <CyberButton ref={ref} onClick={onPlayAgain} variant="cyan" size="large" icon={<RefreshIcon size={18} />}>
        {primaryLabel}
      </CyberButton>
      <CyberButton to="/" variant="ghost" size="large" icon={<HomeIcon size={18} />} iconPosition="start">
        HOME
      </CyberButton>
    </div>
  );
}

export function CaughtResult({ player = 'user', result, upload, onRetryUpload, onPlayAgain, onNewPlayer }) {
  const line = useRef(pick(CAUGHT_LINES)).current;
  const { capture, lastedMs, peak } = result || {};
  return (
    <section className="arcade-panel arcade-panel--magenta dl-result dl-result--caught" aria-labelledby="dl-result-title">
      <div className="arcade-corner arcade-corner--tl" style={{ color: '#ff007a' }} />
      <div className="arcade-corner arcade-corner--tr" style={{ color: '#ff007a' }} />
      <div className="arcade-corner arcade-corner--bl" style={{ color: '#ff007a' }} />
      <div className="arcade-corner arcade-corner--br" style={{ color: '#ff007a' }} />

      <div className="dl-result__badge dl-result__badge--caught">LAUGH DETECTED</div>
      <h1 id="dl-result-title" className="dl-result__title dl-result__title--caught">
        CAUGHT IN THE ACT!
      </h1>
      {capture ? (
        <figure className="dl-result__photo">
          <img src={capture.url} width={capture.width} height={capture.height} alt="Your laugh reaction moment" />
          <figcaption className="dl-result__photo-tag">REACTION CAPTURE</figcaption>
        </figure>
      ) : (
        <p className="dl-result__nophoto">No frame was captured, but your smile broke the threshold.</p>
      )}
      <p className="dl-result__line">&ldquo;{line}&rdquo;</p>
      <div className="dl-result__stats-grid">
        <div className="dl-result__stat-item">
          <span className="dl-result__stat-label">SURVIVED</span>
          <span className="dl-result__stat-val">{seconds(lastedMs || 0)}</span>
        </div>
        <div className="dl-result__stat-item">
          <span className="dl-result__stat-label">PEAK LAUGH METER</span>
          <span className="dl-result__stat-val dl-result__stat-val--peak">{meterPercent(peak ?? 0)}%</span>
        </div>
      </div>
      {capture && <UploadStatus upload={upload} onRetry={onRetryUpload} />}
      <Actions onPlayAgain={onPlayAgain} primaryLabel="TRY AGAIN" />
    </section>
  );
}

export function SurvivedResult({ player = 'user', result, onPlayAgain, onNewPlayer }) {
  const line = useRef(pick(SURVIVED_LINES)).current;
  return (
    <section className="arcade-panel arcade-panel--cyan dl-result dl-result--survived" aria-labelledby="dl-result-title">
      <div className="arcade-corner arcade-corner--tl" style={{ color: '#00f0ff' }} />
      <div className="arcade-corner arcade-corner--tr" style={{ color: '#00f0ff' }} />
      <div className="arcade-corner arcade-corner--bl" style={{ color: '#00f0ff' }} />
      <div className="arcade-corner arcade-corner--br" style={{ color: '#00f0ff' }} />

      <div className="dl-result__badge dl-result__badge--survived">FULL 45 SECONDS COMPLETE</div>
      <h1 id="dl-result-title" className="dl-result__title dl-result__title--survived">
        YOU SURVIVED!
      </h1>
      <p className="dl-result__line">&ldquo;{line}&rdquo;</p>
      <div className="dl-result__stats-grid">
        <div className="dl-result__stat-item">
          <span className="dl-result__stat-label">TIME HELD</span>
          <span className="dl-result__stat-val">{seconds(result?.lastedMs || 45000)}</span>
        </div>
        <div className="dl-result__stat-item">
          <span className="dl-result__stat-label">MAX METER</span>
          <span className="dl-result__stat-val dl-result__stat-val--safe">{meterPercent(result?.peak ?? 0)}%</span>
        </div>
      </div>
      <p className="dl-result__nophoto">Absolute iron poker face. Zero laugh reaction triggered.</p>
      <Actions onPlayAgain={onPlayAgain} primaryLabel="PLAY AGAIN" />
    </section>
  );
}
