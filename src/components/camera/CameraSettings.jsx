import { useEffect, useRef, useState } from 'react';
import { CameraIcon, RefreshIcon, CrossIcon } from '../common/Icons';
import SwitchCameraButton from './SwitchCameraButton';
import './CameraSettings.css';

/**
 * Cyberpunk-styled Camera Settings & Wi-Fi Webcam (DroidCam) configuration panel.
 *
 * Provides:
 * - Current camera name & live status
 * - Switch between built-in webcam, DroidCam virtual camera, and other inputs
 * - Live detection of DroidCam with auto-select
 * - Refresh cameras button
 * - Step-by-step Wi-Fi connection setup guide
 */
export default function CameraSettings({
  camera,
  className = '',
  buttonLabel,
  compact = false,
  autoOpenOnError = false,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showGuide, setShowGuide] = useState(true);
  const containerRef = useRef(null);

  const {
    devices = [],
    selectedDeviceId,
    selectCamera,
    refreshDevices,
    status,
    error,
    activeDevice,
    hasDroidCam,
    isDroidCamActive,
  } = camera;

  // Auto-open on camera error if requested
  useEffect(() => {
    if (autoOpenOnError && status === 'error') {
      setIsOpen(true);
    }
  }, [autoOpenOnError, status]);

  // Close when clicking outside
  useEffect(() => {
    if (!isOpen) return;
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isOpen]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshDevices();
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  const handleCameraChange = (e) => {
    const newId = e.target.value;
    if (newId) {
      selectCamera(newId);
    }
  };

  // Determine connection status text and color
  let statusText = 'Camera connected';
  let statusTone = 'ready';

  if (status === 'error') {
    if (error?.kind === 'denied') {
      statusText = 'Camera permission denied';
      statusTone = 'error';
    } else {
      statusText = 'Camera unavailable';
      statusTone = 'error';
    }
  } else if (devices.length === 0 && status !== 'requesting') {
    statusText = 'No camera detected';
    statusTone = 'error';
  } else if (status === 'requesting') {
    statusText = 'Connecting camera...';
    statusTone = 'pending';
  } else if (status === 'idle') {
    statusText = 'Camera idle';
    statusTone = 'idle';
  }

  const cameraLabel =
    activeDevice?.label ||
    (devices.find((d) => d.deviceId === selectedDeviceId)?.label) ||
    'Select Camera';

  return (
    <div className={`camera-settings-wrapper ${className}`.trim()} ref={containerRef}>
      {/* Trigger Button */}
      <button
        type="button"
        className={`camera-settings-toggle ${isOpen ? 'camera-settings-toggle--active' : ''} ${
          isDroidCamActive ? 'camera-settings-toggle--droidcam' : ''
        }`}
        onClick={() => setIsOpen((prev) => !prev)}
        title="Camera & Wi-Fi Webcam Settings"
        aria-label="Camera & Wi-Fi Webcam Settings"
        aria-expanded={isOpen}
      >
        <span className={`camera-settings__dot camera-settings__dot--${statusTone}`} aria-hidden="true" />
        <CameraIcon size={16} className="camera-settings__icon" />
        <span className="camera-settings__btn-text">
          {buttonLabel || (
            <>
              {isDroidCamActive && <span className="camera-settings__tag">WI-FI</span>}
              <span className="camera-settings__device-name">
                {compact ? (cameraLabel.length > 16 ? `${cameraLabel.slice(0, 16)}…` : cameraLabel) : cameraLabel}
              </span>
            </>
          )}
        </span>
        <span className="camera-settings__arrow" aria-hidden="true">
          {isOpen ? '▲' : '▼'}
        </span>
      </button>

      {/* Settings Popover Drawer */}
      {isOpen && (
        <div className="camera-settings-popover" role="dialog" aria-modal="true" aria-label="Camera Settings">
          <div className="camera-settings-header">
            <div className="camera-settings-title">
              <CameraIcon size={18} className="camera-settings-title-icon" />
              <span>CAMERA & WI-FI WEBCAM</span>
            </div>
            <button
              type="button"
              className="camera-settings-close"
              onClick={() => setIsOpen(false)}
              aria-label="Close camera settings"
            >
              <CrossIcon size={16} />
            </button>
          </div>

          <div className="camera-settings-content">
            {/* Status Indicator Banner */}
            <div className={`camera-settings-status camera-settings-status--${statusTone}`}>
              <span className={`camera-settings__dot camera-settings__dot--${statusTone}`} />
              <span className="camera-settings-status-label">{statusText}</span>
              {status === 'ready' && isDroidCamActive && (
                <span className="camera-settings-badge camera-settings-badge--wifi">DROIDCAM WI-FI</span>
              )}
            </div>

            {/* Camera Select Form */}
            <div className="camera-settings-row">
              <label htmlFor="funspot-camera-select" className="camera-settings-label">
                ACTIVE WEBCAM INPUT:
              </label>
              <div className="camera-settings-select-group">
                <select
                  id="funspot-camera-select"
                  className="camera-settings-select"
                  value={selectedDeviceId || ''}
                  onChange={handleCameraChange}
                  disabled={devices.length === 0}
                >
                  {devices.length === 0 ? (
                    <option value="">No cameras detected</option>
                  ) : (
                    devices.map((device, idx) => (
                      <option key={device.deviceId || `cam-${idx}`} value={device.deviceId}>
                        {device.isDroidCam ? '[WI-FI] ' : ''}
                        {device.label || `Camera ${idx + 1}`}
                      </option>
                    ))
                  )}
                </select>

                <button
                  type="button"
                  className="camera-settings-refresh-btn"
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  title="Refresh connected cameras"
                >
                  <RefreshIcon size={14} className={isRefreshing ? 'camera-settings__spin' : ''} />
                  <span>{isRefreshing ? 'SCANNING' : 'REFRESH'}</span>
                </button>
              </div>

              {/* Instant 1-click Switch Camera Toggle */}
              {devices.length > 1 && (
                <div style={{ marginTop: '0.45rem' }}>
                  <SwitchCameraButton camera={camera} />
                </div>
              )}
            </div>

            {/* DroidCam Notice */}
            {hasDroidCam ? (
              <div className="camera-settings-notice camera-settings-notice--success">
                <div className="camera-settings-notice-title">
                  <span aria-hidden="true">✔</span> DroidCam Virtual Camera Detected
                </div>
                <p>
                  Your Android phone is ready to stream as a wireless webcam. Resolution tuned for real-time tracking (1280×720).
                </p>
              </div>
            ) : (
              <div className="camera-settings-notice camera-settings-notice--info">
                <div className="camera-settings-notice-title">
                  Want to use your Android phone as a Wi-Fi Webcam?
                </div>
                <p>
                  DroidCam virtual camera was not detected. Install the DroidCam Windows client and connect your Android phone to use it in Fun Spot.
                </p>
              </div>
            )}

            {/* Wi-Fi Setup Guide Section */}
            <div className="camera-settings-guide-card">
              <button
                type="button"
                className="camera-settings-guide-toggle"
                onClick={() => setShowGuide((prev) => !prev)}
                aria-expanded={showGuide}
              >
                <span>WI-FI PHONE WEBCAM SETUP GUIDE</span>
                <span>{showGuide ? '–' : '+'}</span>
              </button>

              {showGuide && (
                <ol className="camera-settings-guide-steps">
                  <li>
                    <span className="step-num">1</span>
                    <span>Install <strong>DroidCam</strong> on your Android phone (Google Play Store).</span>
                  </li>
                  <li>
                    <span className="step-num">2</span>
                    <span>Install the <strong>DroidCam Windows client</strong> on your PC (dev47apps.com).</span>
                  </li>
                  <li>
                    <span className="step-num">3</span>
                    <span>Connect both phone and PC to the <strong>same Wi-Fi network</strong>.</span>
                  </li>
                  <li>
                    <span className="step-num">4</span>
                    <span>Open DroidCam on phone, enter phone IP in Windows client, and click <strong>Start</strong>.</span>
                  </li>
                  <li>
                    <span className="step-num">5</span>
                    <span>Click <strong>REFRESH</strong> above and select <strong>DroidCam</strong> as your camera.</span>
                  </li>
                </ol>
              )}
              <div className="camera-settings-guide-foot">
                * Fun Spot connects via the DroidCam Windows virtual driver. No direct IP setup needed in browser.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
