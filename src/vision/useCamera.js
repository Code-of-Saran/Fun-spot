import { useCallback, useEffect, useRef, useState } from 'react';
import { CameraError, findDroidCamDevice, getAvailableCameras, openCamera, stopStream } from './camera';

const STORAGE_CAMERA_KEY = 'funspot_selected_camera_id';
const STORAGE_USER_CHOICE_KEY = 'funspot_camera_user_selected';

/**
 * Reusable hook for camera stream management and device selection.
 * Owns at most ONE camera stream at any time.
 *
 * Supports:
 * - Detecting all video input devices (built-in webcam, DroidCam virtual camera, external webcams)
 * - Automatic selection of DroidCam when available
 * - On-the-fly camera switching without app restart
 * - Clean teardown of tracks when switching or unmounting
 * - Responding to hardware/virtual device connect/disconnect events
 *
 * status: idle | requesting | ready | error (error.kind explains why)
 *
 * @param {{ width?: number, height?: number }} [resolution] ideal capture size (default 1280x720)
 */
export function useCamera(resolution = { width: 1280, height: 720 }) {
  const [state, setState] = useState({ status: 'idle', stream: null, error: null });
  const [devices, setDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_CAMERA_KEY) || null;
    } catch {
      return null;
    }
  });

  const streamRef = useRef(null);
  const pendingRef = useRef(null);
  const wantsStreamRef = useRef(false);
  const isMountedRef = useRef(true);
  const resolutionRef = useRef(resolution);
  resolutionRef.current = resolution;

  const selectedDeviceIdRef = useRef(selectedDeviceId);
  selectedDeviceIdRef.current = selectedDeviceId;

  // FIX: Track the deviceId that was actually used to open the current stream.
  // We cannot rely on track.getSettings().deviceId — Chrome/Edge on Windows
  // frequently returns undefined or an empty string from that API, causing the
  // "already matches" guard below to always short-circuit and never switch cameras.
  const activeStreamDeviceIdRef = useRef(null);

  const userManuallySelectedRef = useRef(false);
  try {
    userManuallySelectedRef.current = localStorage.getItem(STORAGE_USER_CHOICE_KEY) === 'true';
  } catch {
    // LocalStorage fallback
  }

  const [isSwitching, setIsSwitching] = useState(false);
  const [switchError, setSwitchError] = useState(null);

  // FIX: Track current status in a ref so selectCamera can read it without
  // being listed as a dependency. Previously, selectCamera depended on
  // state.status which changed on every camera transition (idle→requesting→ready),
  // producing a new selectCamera reference each time. That new reference was in
  // the lifecycle useEffect deps, causing it to re-run on every status change —
  // an infinite refreshDevices() loop that kept the app on the loading screen.
  const statusRef = useRef('idle');

  // Enumerate devices and auto-pick DroidCam if available
  const refreshDevices = useCallback(async () => {
    const list = await getAvailableCameras();
    if (!isMountedRef.current) return list;

    setDevices(list);

    if (list.length > 0) {
      const droidDevice = findDroidCamDevice(list);

      // Rule: Automatically select DroidCam if present and user has not manually
      // pinned a different webcam
      if (droidDevice && (!userManuallySelectedRef.current || selectedDeviceIdRef.current === droidDevice.deviceId)) {
        if (selectedDeviceIdRef.current !== droidDevice.deviceId) {
          selectedDeviceIdRef.current = droidDevice.deviceId;
          setSelectedDeviceId(droidDevice.deviceId);
          try {
            localStorage.setItem(STORAGE_CAMERA_KEY, droidDevice.deviceId);
          } catch {}
        }
      } else {
        // If current selection is invalid or nonexistent in the new list, pick first available
        const currentStillExists = list.some((d) => d.deviceId === selectedDeviceIdRef.current);
        if (!currentStillExists) {
          const fallbackId = list[0].deviceId;
          selectedDeviceIdRef.current = fallbackId;
          setSelectedDeviceId(fallbackId);
          try {
            localStorage.setItem(STORAGE_CAMERA_KEY, fallbackId);
          } catch {}
        }
      }
    }

    return list;
  }, []);

  const stop = useCallback(() => {
    wantsStreamRef.current = false;
    pendingRef.current = null;
    stopStream(streamRef.current);
    streamRef.current = null;
    if (isMountedRef.current) {
      setState({ status: 'idle', stream: null, error: null });
      statusRef.current = 'idle';
    }
  }, []);

  const start = useCallback(
    (targetDeviceId) => {
      wantsStreamRef.current = true;
      const deviceIdToUse = targetDeviceId ?? selectedDeviceIdRef.current;

      // FIX: Use our own activeStreamDeviceIdRef instead of track.getSettings().deviceId
      // (which is often undefined on Chrome/Windows) to decide whether the current stream
      // already serves the requested device. This prevents the bug where switching to a
      // USB webcam is silently ignored because !currentTrackDeviceId always evaluates true.
      const activeTrack = streamRef.current?.getVideoTracks?.().find((t) => t.readyState === 'live');
      if (
        streamRef.current &&
        activeTrack &&
        deviceIdToUse &&
        activeStreamDeviceIdRef.current === deviceIdToUse
      ) {
        // Same device already streaming — just make sure state reflects that
        setState((prev) =>
          prev.status === 'ready' && prev.stream === streamRef.current
            ? prev
            : { status: 'ready', stream: streamRef.current, error: null },
        );
        statusRef.current = 'ready';
        return Promise.resolve(streamRef.current);
      }

      // No specific device requested and a live stream exists — keep it
      if (streamRef.current && activeTrack && !deviceIdToUse) {
        setState((prev) =>
          prev.status === 'ready' && prev.stream === streamRef.current
            ? prev
            : { status: 'ready', stream: streamRef.current, error: null },
        );
        statusRef.current = 'ready';
        return Promise.resolve(streamRef.current);
      }

      // Stop old stream BEFORE requesting the new one so Windows doesn't return
      // NotReadableError ("device in use") when both cameras share a USB controller.
      if (streamRef.current) {
        stopStream(streamRef.current);
        streamRef.current = null;
        activeStreamDeviceIdRef.current = null;
      }

      // Abort any prior pending request so we don't double-open the camera
      pendingRef.current = null;

      setState({ status: 'requesting', stream: null, error: null });
      statusRef.current = 'requesting';

      const request = openCamera({
        ...resolutionRef.current,
        deviceId: deviceIdToUse,
      })
        .then(async (stream) => {
          // If while camera permission was pending the user stopped or left the page
          if (!wantsStreamRef.current || !isMountedRef.current) {
            stopStream(stream);
            return null;
          }

          streamRef.current = stream;
          const [track] = stream.getVideoTracks();
          const trackDeviceId = track?.getSettings?.()?.deviceId;
          const resolvedDeviceId = deviceIdToUse || trackDeviceId || null;
          activeStreamDeviceIdRef.current = resolvedDeviceId;

          if (resolvedDeviceId && resolvedDeviceId !== selectedDeviceIdRef.current) {
            selectedDeviceIdRef.current = resolvedDeviceId;
            setSelectedDeviceId(resolvedDeviceId);
          }

          track?.addEventListener('ended', () => {
            if (streamRef.current !== stream) return;
            streamRef.current = null;
            activeStreamDeviceIdRef.current = null;
            if (isMountedRef.current) {
              setState({ status: 'error', stream: null, error: new CameraError('unavailable') });
              statusRef.current = 'error';
            }
          });

          if (isMountedRef.current) {
            setState({ status: 'ready', stream, error: null });
            statusRef.current = 'ready';
          }

          // Now that permissions are granted, re-enumerate to acquire actual device labels
          // and check if DroidCam just appeared or should be auto-selected.
          // FIX: Guard with pendingRef.current === null to prevent a second concurrent
          // camera request from being initiated if one is already in flight.
          try {
            const updatedList = await refreshDevices();
            const droidCam = findDroidCamDevice(updatedList);
            if (
              droidCam &&
              !userManuallySelectedRef.current &&
              deviceIdToUse !== droidCam.deviceId &&
              isMountedRef.current &&
              wantsStreamRef.current &&
              pendingRef.current === null // only switch if no other request is in flight
            ) {
              selectedDeviceIdRef.current = droidCam.deviceId;
              setSelectedDeviceId(droidCam.deviceId);
              // Switch to DroidCam
              return start(droidCam.deviceId);
            }
          } catch {
            // Non-critical background device refresh
          }

          return stream;
        })
        .catch((error) => {
          if (wantsStreamRef.current && isMountedRef.current) {
            setState({ status: 'error', stream: null, error });
            statusRef.current = 'error';
          }
          return null;
        })
        .finally(() => {
          if (pendingRef.current === request) {
            pendingRef.current = null;
          }
        });

      pendingRef.current = request;
      return request;
    },
    [refreshDevices],
  );

  // Switch camera without restarting the app.
  // FIX: Uses statusRef instead of state.status so this callback has a stable
  // identity across status changes. Previously, [start, state.status] deps meant
  // a new selectCamera was created on every idle->requesting->ready transition.
  const selectCamera = useCallback(
    async (deviceId) => {
      userManuallySelectedRef.current = true;
      try {
        localStorage.setItem(STORAGE_USER_CHOICE_KEY, 'true');
        localStorage.setItem(STORAGE_CAMERA_KEY, deviceId);
      } catch {}

      selectedDeviceIdRef.current = deviceId;
      setSelectedDeviceId(deviceId);

      // If camera was running or requested, immediately restart with the new device
      const currentStatus = statusRef.current;
      if (wantsStreamRef.current || currentStatus === 'ready' || currentStatus === 'requesting') {
        return start(deviceId);
      }
      return null;
    },
    [start],
  );

  /**
   * One-click camera switcher:
   * Discovers all available cameras, identifies current camera, and alternates/cycles
   * to the next camera in the list (e.g. laptop webcam <-> external USB webcam).
   *
   * Handles:
   * - 0 or 1 cameras gracefully with a clear explanation message.
   * - Restoring the previous camera if switching fails.
   * - Safe track teardown and stream re-acquisition.
   */
  const switchCamera = useCallback(async () => {
    setSwitchError(null);
    let list = devices;
    // If device list hasn't populated yet, refresh now
    if (!list || list.length === 0) {
      list = await refreshDevices();
    }

    if (!list || list.length < 2) {
      const msg = !list || list.length === 0
        ? 'No camera devices detected'
        : 'Only 1 camera available. Connect another camera to switch.';
      setSwitchError(msg);
      return { success: false, reason: msg };
    }

    // Determine currently active camera ID
    const currentId = activeStreamDeviceIdRef.current || selectedDeviceIdRef.current;
    let currentIndex = list.findIndex((d) => d.deviceId === currentId);
    if (currentIndex === -1) {
      currentIndex = 0;
    }

    const nextIndex = (currentIndex + 1) % list.length;
    const nextDevice = list[nextIndex];

    setIsSwitching(true);
    try {
      const newStream = await selectCamera(nextDevice.deviceId);
      if (newStream) {
        setSwitchError(null);
        return { success: true, device: nextDevice, stream: newStream };
      } else {
        throw new Error(`Could not connect to ${nextDevice.label || 'camera'}`);
      }
    } catch (err) {
      console.warn('[useCamera] Camera switch failed:', err);
      const readableError = err?.message || 'Camera switch failed';

      // Fallback: restore previous camera if possible
      if (currentId && currentId !== nextDevice.deviceId) {
        try {
          await selectCamera(currentId);
          setSwitchError(
            `Failed to switch to ${nextDevice.label || 'camera'}: ${readableError}. Restored previous camera.`,
          );
        } catch {
          setSwitchError(`Failed to switch to ${nextDevice.label || 'camera'}: ${readableError}`);
        }
      } else {
        setSwitchError(`Failed to switch to ${nextDevice.label || 'camera'}: ${readableError}`);
      }
      return { success: false, error: err };
    } finally {
      if (isMountedRef.current) {
        setIsSwitching(false);
      }
    }
  }, [devices, refreshDevices, selectCamera]);

  // Device list lifecycle and change listeners.
  // FIX: Deps are intentionally [] — this is a mount-only effect.
  // Previously deps were [refreshDevices, selectCamera]. refreshDevices is stable
  // (empty deps useCallback) but selectCamera was not — it recreated on every
  // status change — causing this effect to re-run, re-call refreshDevices(), and
  // re-render in an infinite loop. The devicechange handler accesses start/selectCamera
  // through stable refs (wantsStreamRef, selectedDeviceIdRef) instead.
  useEffect(() => {
    isMountedRef.current = true;
    refreshDevices();

    const handleDeviceChange = () => {
      refreshDevices().then((updatedList) => {
        // If current camera disconnected while streaming, recover to first available.
        // Use activeStreamDeviceIdRef (our own record) instead of track.getSettings().deviceId
        // which is unreliable on Windows Chrome.
        if (wantsStreamRef.current && streamRef.current && updatedList.length > 0) {
          const trackedDeviceId = activeStreamDeviceIdRef.current;
          const stillThere = trackedDeviceId
            ? updatedList.some((d) => d.deviceId === trackedDeviceId)
            : true; // unknown device — assume still present
          if (!stillThere) {
            const fallback = updatedList[0].deviceId;
            activeStreamDeviceIdRef.current = null;
            selectedDeviceIdRef.current = fallback;
            setSelectedDeviceId(fallback);
            if (wantsStreamRef.current) {
              start(fallback);
            }
          }
        }
      });
    };

    navigator.mediaDevices?.addEventListener?.('devicechange', handleDeviceChange);

    return () => {
      isMountedRef.current = false;
      navigator.mediaDevices?.removeEventListener?.('devicechange', handleDeviceChange);
      stopStream(streamRef.current);
      streamRef.current = null;
      activeStreamDeviceIdRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Derived properties for UI consumption
  const activeTrack = state.stream?.getVideoTracks()[0];
  const activeSettings = activeTrack?.getSettings?.();
  const activeTrackDeviceId = activeSettings?.deviceId;
  const activeTrackLabel = activeTrack?.label || '';

  const activeDevice =
    devices.find((d) => (activeTrackDeviceId && d.deviceId === activeTrackDeviceId) || d.deviceId === (activeStreamDeviceIdRef.current || selectedDeviceId)) ||
    (activeTrackLabel ? { deviceId: activeStreamDeviceIdRef.current || selectedDeviceId, label: activeTrackLabel, isDroidCam: /droidcam/i.test(activeTrackLabel) } : null) ||
    (devices.length > 0 && state.status === 'ready' ? devices[0] : null);

  const hasDroidCam = devices.some((d) => d.isDroidCam);
  const isDroidCamActive = Boolean(activeDevice?.isDroidCam || /droidcam/i.test(activeTrackLabel));

  // Determine the next camera in rotation for button previews / tooltips
  let nextDevice = null;
  if (devices.length >= 2) {
    const currentId = activeStreamDeviceIdRef.current || selectedDeviceId;
    let currIdx = devices.findIndex((d) => d.deviceId === currentId);
    if (currIdx === -1) currIdx = 0;
    const nextIdx = (currIdx + 1) % devices.length;
    nextDevice = devices[nextIdx];
  }

  return {
    ...state,
    start,
    stop,
    open: start,   // Alias for API consistency across components
    close: stop,   // Alias for API consistency across components
    devices,
    selectedDeviceId,
    selectCamera,
    switchCamera,
    isSwitching,
    switchError,
    clearSwitchError: () => setSwitchError(null),
    refreshDevices,
    activeDevice,
    nextDevice,
    hasDroidCam,
    isDroidCamActive,
  };
}
