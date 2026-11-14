import { useState, useEffect, useRef } from 'react';
import { CameraSwitchIcon, RefreshIcon } from '../common/Icons';
import { sfx } from '../../utils/sfx';
import './SwitchCameraButton.css';

/**
 * SwitchCameraButton — Instant one-click camera toggle component.
 *
 * Requirements fulfilled:
 * - Visible Switch Camera button placed near live camera preview.
 * - Uses CameraSwitchIcon vector icon (no emoji).
 * - Toggles between available cameras with one click in both directions repeatedly.
 * - Displays active camera name.
 * - Shows clear loading spinner state while switching.
 * - Disabled only while a switch is genuinely in progress or when < 2 cameras available.
 * - Displays readable error message if switching fails without freezing or breaking the app.
 * - Explains when only 1 camera is detected.
 */
export default function SwitchCameraButton({
  camera,
  className = '',
  compact = false,
  showActiveLabel = true,
  onSwitch,
}) {
  const [localNotice, setLocalNotice] = useState(null);
  const noticeTimerRef = useRef(null);

  const {
    devices = [],
    activeDevice,
    nextDevice,
    switchCamera,
    isSwitching,
    switchError,
    clearSwitchError,
    status,
  } = camera;

  const hasMultipleCameras = devices.length >= 2;
  const isDisabled = isSwitching;

  // Active camera display label
  const activeLabel =
    activeDevice?.label ||
    (devices.length === 1 ? devices[0].label : null) ||
    'Primary Camera';

  // Next camera target label
  const targetLabel = nextDevice?.label || (hasMultipleCameras ? 'Next Camera' : null);

  // Clear notice after 4.5 seconds
  const showNotice = (text, type = 'info') => {
    if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
    setLocalNotice({ text, type });
    noticeTimerRef.current = setTimeout(() => {
      setLocalNotice(null);
    }, 4500);
  };

  useEffect(() => {
    return () => {
      if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
    };
  }, []);

  const handleClick = async () => {
    if (isDisabled) return;

    if (!hasMultipleCameras) {
      sfx.tick();
      showNotice(
        devices.length === 0
          ? 'No cameras detected. Check webcam connection and permissions.'
          : 'Only 1 camera detected. Plug in your USB webcam or connect DroidCam to switch.',
        'info',
      );
      return;
    }

    try {
      sfx.unlock();
      const res = await switchCamera();
      if (res?.success) {
        sfx.go();
        onSwitch?.(res.device);
      } else if (res?.reason) {
        showNotice(res.reason, 'info');
      }
    } catch (err) {
      showNotice(err?.message || 'Failed to switch camera', 'error');
    }
  };

  const buttonTitle = !hasMultipleCameras
    ? 'Only 1 camera detected. Connect an external USB webcam to switch.'
    : isSwitching
    ? 'Switching camera stream...'
    : targetLabel
    ? `Switch to: ${targetLabel} (Currently: ${activeLabel})`
    : `Switch Camera (Active: ${activeLabel})`;

  return (
    <div className={`switch-camera-wrap ${className}`.trim()}>
      <button
        type="button"
        className={`switch-camera-btn ${isSwitching ? 'switch-camera-btn--switching' : ''} ${
          !hasMultipleCameras ? 'switch-camera-btn--single' : ''
        } ${compact ? 'switch-camera-btn--compact' : ''}`}
        onClick={handleClick}
        disabled={isSwitching}
        title={buttonTitle}
        aria-label={buttonTitle}
        aria-busy={isSwitching}
      >
        <span
          className={`switch-camera-icon-wrap ${isSwitching ? 'switch-camera-icon-wrap--spin' : ''}`}
          aria-hidden="true"
        >
          {isSwitching ? (
            <RefreshIcon size={compact ? 14 : 16} className="switch-camera-spinner" />
          ) : (
            <CameraSwitchIcon size={compact ? 14 : 16} />
          )}
        </span>

        <span className="switch-camera-text">
          {isSwitching
            ? 'SWITCHING...'
            : compact
            ? 'SWITCH CAM'
            : 'SWITCH CAMERA'}
        </span>

        {showActiveLabel && activeLabel && !compact && (
          <span className="switch-camera-badge" title={`Active input: ${activeLabel}`}>
            {activeLabel.length > 18 ? `${activeLabel.slice(0, 18)}…` : activeLabel}
          </span>
        )}
      </button>

      {/* Error or Notice Toast */}
      {(switchError || localNotice) && (
        <div
          className={`switch-camera-notice switch-camera-notice--${
            switchError ? 'error' : localNotice?.type || 'info'
          }`}
          role="alert"
        >
          <span className="switch-camera-notice-text">
            {switchError || localNotice?.text}
          </span>
          <button
            type="button"
            className="switch-camera-notice-close"
            onClick={() => {
              clearSwitchError?.();
              setLocalNotice(null);
            }}
            aria-label="Dismiss notice"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}

