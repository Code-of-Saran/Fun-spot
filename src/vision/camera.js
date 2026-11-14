/**
 * Thin wrapper over getUserMedia that turns browser errors into a small set of
 * kinds the UI can explain: denied | unavailable | busy | insecure | unsupported.
 */
export class CameraError extends Error {
  constructor(kind, cause) {
    super(`Camera ${kind}`);
    this.name = 'CameraError';
    this.kind = kind;
    this.cause = cause;
  }
}

const ERROR_KINDS = {
  NotAllowedError: 'denied',
  PermissionDeniedError: 'denied',
  SecurityError: 'denied',
  NotFoundError: 'unavailable',
  DevicesNotFoundError: 'unavailable',
  OverconstrainedError: 'unavailable',
  NotReadableError: 'busy',
  TrackStartError: 'busy',
  AbortError: 'busy',
};

/**
 * Checks if a device or label belongs to DroidCam.
 */
export function isDroidCam(deviceOrLabel) {
  if (!deviceOrLabel) return false;
  const label = typeof deviceOrLabel === 'string' ? deviceOrLabel : (deviceOrLabel.label || '');
  return /droidcam/i.test(label);
}

/**
 * Enumerates all video input devices and tags DroidCam cameras.
 */
export async function getAvailableCameras() {
  if (!navigator.mediaDevices?.enumerateDevices) {
    return [];
  }
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoDevices = devices.filter((d) => d.kind === 'videoinput');
    return videoDevices.map((d, index) => {
      const isDroid = isDroidCam(d.label);
      const fallbackLabel = isDroid
        ? `DroidCam Source ${index + 1}`
        : `Camera ${index + 1}`;
      return {
        deviceId: d.deviceId,
        groupId: d.groupId,
        label: d.label || fallbackLabel,
        isDroidCam: isDroid,
      };
    });
  } catch (err) {
    console.warn('[Camera] Failed to enumerate devices:', err);
    return [];
  }
}

/**
 * Finds the first detected DroidCam device from a list of devices.
 */
export function findDroidCamDevice(devices = []) {
  return devices.find((d) => isDroidCam(d)) || null;
}

/**
 * Opens a camera stream at the requested resolution (defaults to 1280x720 for real-time tracking).
 * If deviceId is provided, binds specifically to that camera device.
 *
 * Uses a progressive multi-tier fallback strategy so that an overconstrained USB webcam
 * never silently falls back to the built-in camera:
 *  Tier 1 — exact deviceId, ideal 1280×720, ideal 30fps (no max frameRate — avoids UVC driver rejection)
 *  Tier 2 — exact deviceId, ideal 640×480, ideal 30fps
 *  Tier 3 — exact deviceId, no resolution/fps constraints (hardware-native)
 *  Tier 4 — ideal deviceId (only if device was removed/disconnected)
 */
export async function openCamera({
  width = 1280,
  height = 720,
  deviceId = null,
  timeoutMs = 12000,
} = {}) {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new CameraError(window.isSecureContext ? 'unsupported' : 'insecure');
  }

  /**
   * Build a getUserMedia constraints object.
   * NOTE: `frameRate.max` is intentionally omitted — many USB UVC webcams on
   * Windows reject streams that include a strict max frameRate cap.
   */
  const buildConstraints = (targetDeviceId, opts = {}) => {
    const {
      exactDevice = true,
      resolutionWidth = width,
      resolutionHeight = height,
      includeResolution = true,
    } = opts;

    const videoConstraints = {};

    if (includeResolution) {
      videoConstraints.width = { ideal: resolutionWidth };
      videoConstraints.height = { ideal: resolutionHeight };
      videoConstraints.frameRate = { ideal: 30 }; // no max — avoids UVC driver failures
    }

    if (targetDeviceId) {
      videoConstraints.deviceId = exactDevice
        ? { exact: targetDeviceId }
        : { ideal: targetDeviceId };
    } else {
      videoConstraints.facingMode = 'user';
    }

    return { audio: false, video: videoConstraints };
  };

  const isPermissionError = (err) =>
    err?.name === 'NotAllowedError' ||
    err?.name === 'PermissionDeniedError' ||
    err?.name === 'SecurityError';

  let timerId;
  const acquireStream = async () => {
    if (!deviceId) {
      // No specific device requested — use facingMode: user with ideal resolution
      return navigator.mediaDevices.getUserMedia(buildConstraints(null));
    }

    // Tier 1: exact deviceId, ideal 1280×720, ideal 30fps
    try {
      return await navigator.mediaDevices.getUserMedia(
        buildConstraints(deviceId, { exactDevice: true, resolutionWidth: width, resolutionHeight: height })
      );
    } catch (err1) {
      if (isPermissionError(err1)) throw err1;
      console.warn('[Camera] Tier 1 failed, trying Tier 2 (480p):', err1.message);
    }

    // Tier 2: exact deviceId, ideal 640×480, ideal 30fps
    try {
      return await navigator.mediaDevices.getUserMedia(
        buildConstraints(deviceId, { exactDevice: true, resolutionWidth: 640, resolutionHeight: 480 })
      );
    } catch (err2) {
      if (isPermissionError(err2)) throw err2;
      console.warn('[Camera] Tier 2 failed, trying Tier 3 (no res constraints):', err2.message);
    }

    // Tier 3: exact deviceId only — let the camera use its native resolution
    try {
      return await navigator.mediaDevices.getUserMedia(
        buildConstraints(deviceId, { exactDevice: true, includeResolution: false })
      );
    } catch (err3) {
      if (isPermissionError(err3)) throw err3;
      console.warn('[Camera] Tier 3 failed, trying Tier 4 (ideal deviceId):', err3.message);
    }

    // Tier 4: ideal deviceId — device may have been temporarily busy or unplugged
    try {
      return await navigator.mediaDevices.getUserMedia(
        buildConstraints(deviceId, { exactDevice: false, resolutionWidth: 640, resolutionHeight: 480 })
      );
    } catch (err4) {
      if (isPermissionError(err4)) throw err4;
      console.warn('[Camera] Tier 4 failed, falling back to default system camera:', err4.message);
    }

    // Tier 5: Fall back to default system camera
    return navigator.mediaDevices.getUserMedia(
      buildConstraints(null, { resolutionWidth: 640, resolutionHeight: 480 })
    );
  };

  try {
    const timeoutPromise = new Promise((_, reject) => {
      timerId = setTimeout(() => {
        reject(new CameraError('unavailable', new Error('Webcam connection timed out. Please check permissions or switch cameras.')));
      }, timeoutMs);
    });

    const stream = await Promise.race([acquireStream(), timeoutPromise]);
    clearTimeout(timerId);
    return stream;
  } catch (error) {
    clearTimeout(timerId);
    if (error instanceof CameraError) throw error;
    throw new CameraError(ERROR_KINDS[error?.name] ?? 'unavailable', error);
  }
}

export function stopStream(stream) {
  stream?.getTracks().forEach((track) => track.stop());
}

