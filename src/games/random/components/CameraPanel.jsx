import CameraFeed from '../../../components/camera/CameraFeed';
import ErrorScreen from '../../../components/common/ErrorScreen';

const CAMERA_ERRORS = {
  denied: {
    title: '📷 CAMERA ACCESS REQUIRED',
    message: 'Allow browser camera permission to play Random Challenge. (Click the camera icon in the address bar → Allow.)',
  },
  unavailable: { title: '📷 NO CAMERA FOUND', message: 'Connect a webcam, then try again.' },
  busy: { title: '📷 CAMERA IS BUSY', message: 'Another app or tab is using the camera. Close it and try again.' },
  insecure: {
    title: '🔒 SECURE CONNECTION NEEDED',
    message: 'Open Fun Spot from http://localhost or an https:// address to use the camera.',
  },
  unsupported: { title: '📷 CAMERA NOT SUPPORTED', message: 'This browser can’t use a webcam. Try the latest Chrome or Edge.' },
};

/** Camera feed + every camera/vision state the player might need explained. */
export default function CameraPanel({ camera, vision, videoRef, canvasRef, bodyDetected, children }) {
  const cameraError = camera.status === 'error' ? (CAMERA_ERRORS[camera.error?.kind] ?? CAMERA_ERRORS.unavailable) : null;

  if (cameraError) {
    return (
      <div className="rg-camera-error rg-panel">
        <ErrorScreen compact code="CAMERA" title={cameraError.title} message={cameraError.message} onRetry={camera.start} retryLabel="TRY AGAIN" homeLabel="HOME" />
      </div>
    );
  }
  if (vision.status === 'error') {
    return (
      <div className="rg-camera-error rg-panel">
        <ErrorScreen
          compact
          code="VISION"
          title="⚠️ VISION SYSTEM UNAVAILABLE"
          message="The challenge detector could not start."
          onRetry={vision.retry}
          homeLabel="HOME"
        />
      </div>
    );
  }

  const live = camera.status === 'ready';
  return (
    <CameraFeed stream={camera.stream} videoRef={videoRef} canvasRef={canvasRef} label="Your camera (mirrored)">
      {!live && (
        <div className="rg-camera-wait">
          <span className="rg-camera-wait__icon" aria-hidden="true">
            📷
          </span>
          <p className="rg-camera-wait__title">CAMERA ACCESS NEEDED</p>
          <p>Click <strong>Allow</strong> when your browser asks to use the camera.</p>
        </div>
      )}
      {live && (
        <ul className="rg-chips" aria-label="System status">
          <li className="rg-chips__chip rg-chips__chip--ok">● CAM</li>
          <li className={`rg-chips__chip${vision.status === 'ready' ? ' rg-chips__chip--ok' : ''}`}>
            {vision.status === 'ready' ? '● VISION' : '◌ VISION LOADING'}
          </li>
          {vision.status === 'ready' && (
            <li className={`rg-chips__chip${bodyDetected ? ' rg-chips__chip--ok' : ' rg-chips__chip--warn'}`}>
              {bodyDetected ? '● BODY DETECTED' : '○ STEP INTO FRAME'}
            </li>
          )}
        </ul>
      )}
      {children}
    </CameraFeed>
  );
}
