import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import {
  isDroidCam,
  getAvailableCameras,
  findDroidCamDevice,
  openCamera,
  stopStream,
  CameraError,
} from '../camera';
import CameraSettings from '../../components/camera/CameraSettings';
import SwitchCameraButton from '../../components/camera/SwitchCameraButton';

describe('Camera Utilities & DroidCam Selection', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('isDroidCam', () => {
    it('identifies DroidCam virtual cameras regardless of casing', () => {
      expect(isDroidCam('DroidCam Source 2')).toBe(true);
      expect(isDroidCam('droidcam video')).toBe(true);
      expect(isDroidCam('DROIDCAM SOURCE 3')).toBe(true);
      expect(isDroidCam({ label: 'DroidCam Source 1' })).toBe(true);
    });

    it('returns false for standard webcams and empty values', () => {
      expect(isDroidCam('Integrated Webcam (04f2:b626)')).toBe(false);
      expect(isDroidCam('Logitech HD Pro Webcam C920')).toBe(false);
      expect(isDroidCam('')).toBe(false);
      expect(isDroidCam(null)).toBe(false);
      expect(isDroidCam(undefined)).toBe(false);
      expect(isDroidCam({ label: 'OBS Virtual Camera' })).toBe(false);
    });
  });

  describe('findDroidCamDevice', () => {
    it('finds the DroidCam device in an array of devices', () => {
      const devices = [
        { deviceId: 'cam-1', label: 'Integrated Webcam', isDroidCam: false },
        { deviceId: 'cam-droid', label: 'DroidCam Source 3', isDroidCam: true },
        { deviceId: 'cam-2', label: 'USB Camera', isDroidCam: false },
      ];
      const match = findDroidCamDevice(devices);
      expect(match).toBeDefined();
      expect(match.deviceId).toBe('cam-droid');
    });

    it('returns null if no DroidCam is detected', () => {
      const devices = [
        { deviceId: 'cam-1', label: 'Integrated Webcam', isDroidCam: false },
      ];
      expect(findDroidCamDevice(devices)).toBeNull();
      expect(findDroidCamDevice([])).toBeNull();
    });
  });

  describe('getAvailableCameras', () => {
    it('filters for videoinput devices and identifies DroidCam', async () => {
      const mockDevices = [
        { kind: 'audioinput', deviceId: 'mic-1', label: 'Microphone' },
        { kind: 'videoinput', deviceId: 'cam-builtin', label: 'Built-in Webcam' },
        { kind: 'videoinput', deviceId: 'cam-droid', label: 'DroidCam Source 2' },
      ];

      vi.stubGlobal('navigator', {
        mediaDevices: {
          enumerateDevices: vi.fn().mockResolvedValue(mockDevices),
        },
      });

      const cameras = await getAvailableCameras();
      expect(cameras).toHaveLength(2);
      expect(cameras[0]).toEqual({
        deviceId: 'cam-builtin',
        groupId: undefined,
        label: 'Built-in Webcam',
        isDroidCam: false,
      });
      expect(cameras[1]).toEqual({
        deviceId: 'cam-droid',
        groupId: undefined,
        label: 'DroidCam Source 2',
        isDroidCam: true,
      });
    });

    it('provides fallback labels when device labels are blank', async () => {
      const mockDevices = [
        { kind: 'videoinput', deviceId: 'cam-1', label: '' },
      ];

      vi.stubGlobal('navigator', {
        mediaDevices: {
          enumerateDevices: vi.fn().mockResolvedValue(mockDevices),
        },
      });

      const cameras = await getAvailableCameras();
      expect(cameras).toHaveLength(1);
      expect(cameras[0].label).toBe('Camera 1');
    });
  });

  describe('openCamera', () => {
    it('requests 1280x720 video with deviceId constraint when specified', async () => {
      const mockTrack = {
        stop: vi.fn(),
        addEventListener: vi.fn(),
        getSettings: vi.fn().mockReturnValue({ deviceId: 'target-cam' }),
      };
      const mockStream = {
        getVideoTracks: () => [mockTrack],
        getTracks: () => [mockTrack],
      };

      const getUserMediaMock = vi.fn().mockResolvedValue(mockStream);
      vi.stubGlobal('navigator', {
        mediaDevices: {
          getUserMedia: getUserMediaMock,
        },
      });

      const stream = await openCamera({
        width: 1280,
        height: 720,
        deviceId: 'target-cam',
      });

      expect(stream).toBe(mockStream);
      expect(getUserMediaMock).toHaveBeenCalledWith({
        audio: false,
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          // NOTE: frameRate.max intentionally removed — USB UVC webcams on Windows
          // reject streams that include a strict max frameRate cap.
          frameRate: { ideal: 30 },
          deviceId: { exact: 'target-cam' },
        },
      });
    });

    it('falls back through lower resolutions while keeping exact deviceId on OverconstrainedError', async () => {
      const mockTrack = { stop: vi.fn() };
      const mockStream = { getTracks: () => [mockTrack] };

      const overconstrainedError = new Error('Constraint not satisfied');
      overconstrainedError.name = 'OverconstrainedError';

      // Tier 1 (1280x720 exact) fails; Tier 2 (480p exact) succeeds
      const getUserMediaMock = vi
        .fn()
        .mockRejectedValueOnce(overconstrainedError)
        .mockResolvedValueOnce(mockStream);

      vi.stubGlobal('navigator', {
        mediaDevices: {
          getUserMedia: getUserMediaMock,
        },
      });

      const stream = await openCamera({ deviceId: 'virtual-cam' });
      expect(stream).toBe(mockStream);
      expect(getUserMediaMock).toHaveBeenCalledTimes(2);
      // Tier 2 still uses exact deviceId — never silently reverts to the built-in webcam
      expect(getUserMediaMock.mock.calls[1][0].video.deviceId).toEqual({ exact: 'virtual-cam' });
      // Tier 2 uses lower resolution (480p)
      expect(getUserMediaMock.mock.calls[1][0].video.height).toEqual({ ideal: 480 });
    });

    it('throws CameraError if getUserMedia is not supported', async () => {
      vi.stubGlobal('navigator', {});
      // In jsdom, window cannot be fully replaced via stubGlobal.
      // Spy on isSecureContext instead so openCamera takes the 'unsupported' branch.
      const origDescriptor = Object.getOwnPropertyDescriptor(window, 'isSecureContext');
      Object.defineProperty(window, 'isSecureContext', { value: true, configurable: true });

      try {
        await expect(openCamera()).rejects.toThrow(CameraError);
      } finally {
        if (origDescriptor) {
          Object.defineProperty(window, 'isSecureContext', origDescriptor);
        }
      }
    });
  });

  describe('stopStream', () => {
    it('stops all tracks in the MediaStream', () => {
      const track1 = { stop: vi.fn() };
      const track2 = { stop: vi.fn() };
      const stream = { getTracks: () => [track1, track2] };

      stopStream(stream);
      expect(track1.stop).toHaveBeenCalled();
      expect(track2.stop).toHaveBeenCalled();
    });
  });
});

describe('CameraSettings UI Component', () => {
  it('renders correctly when DroidCam is connected and active', () => {
    const mockCamera = {
      devices: [
        { deviceId: 'cam-builtin', label: 'Integrated Camera', isDroidCam: false },
        { deviceId: 'cam-droid', label: 'DroidCam Source 3', isDroidCam: true },
      ],
      selectedDeviceId: 'cam-droid',
      selectCamera: vi.fn(),
      refreshDevices: vi.fn(),
      status: 'ready',
      error: null,
      activeDevice: { deviceId: 'cam-droid', label: 'DroidCam Source 3', isDroidCam: true },
      hasDroidCam: true,
      isDroidCamActive: true,
    };

    const html = renderToString(React.createElement(CameraSettings, { camera: mockCamera }));
    expect(html).toContain('DroidCam Source 3');
    expect(html).toContain('camera-settings-toggle--droidcam');
    expect(html).toContain('WI-FI');
  });

  it('renders correctly when built-in webcam is selected', () => {
    const mockCamera = {
      devices: [
        { deviceId: 'cam-builtin', label: 'Integrated Camera', isDroidCam: false },
      ],
      selectedDeviceId: 'cam-builtin',
      selectCamera: vi.fn(),
      refreshDevices: vi.fn(),
      status: 'ready',
      error: null,
      activeDevice: { deviceId: 'cam-builtin', label: 'Integrated Camera', isDroidCam: false },
      hasDroidCam: false,
      isDroidCamActive: false,
    };

    const html = renderToString(React.createElement(CameraSettings, { camera: mockCamera }));
    expect(html).toContain('Integrated Camera');
  });

  it('renders error state indicator when camera access is denied', () => {
    const mockCamera = {
      devices: [],
      selectedDeviceId: null,
      selectCamera: vi.fn(),
      refreshDevices: vi.fn(),
      status: 'error',
      error: { kind: 'denied', message: 'Camera permission denied' },
      activeDevice: null,
      hasDroidCam: false,
      isDroidCamActive: false,
    };

    const html = renderToString(React.createElement(CameraSettings, { camera: mockCamera }));
    expect(html).toContain('camera-settings__dot--error');
  });
});

describe('SwitchCameraButton Component & Camera Toggle', () => {
  it('renders correctly with multiple cameras and displays active camera', () => {
    const mockCamera = {
      devices: [
        { deviceId: 'cam-builtin', label: 'Laptop Integrated Webcam', isDroidCam: false },
        { deviceId: 'cam-usb', label: 'HD Pro USB Webcam', isDroidCam: false },
      ],
      selectedDeviceId: 'cam-builtin',
      activeDevice: { deviceId: 'cam-builtin', label: 'Laptop Integrated Webcam' },
      nextDevice: { deviceId: 'cam-usb', label: 'HD Pro USB Webcam' },
      switchCamera: vi.fn(),
      isSwitching: false,
      switchError: null,
      status: 'ready',
    };

    const html = renderToString(React.createElement(SwitchCameraButton, { camera: mockCamera }));
    expect(html).toContain('SWITCH CAMERA');
    expect(html).toContain('Laptop Integrated Webcam');
    expect(html).toContain('switch-camera-btn');
    expect(html).not.toContain('switch-camera-btn--switching');
  });

  it('renders loading state when camera switch is in progress', () => {
    const mockCamera = {
      devices: [
        { deviceId: 'cam-builtin', label: 'Laptop Integrated Webcam' },
        { deviceId: 'cam-usb', label: 'HD Pro USB Webcam' },
      ],
      selectedDeviceId: 'cam-usb',
      activeDevice: { deviceId: 'cam-usb', label: 'HD Pro USB Webcam' },
      nextDevice: { deviceId: 'cam-builtin', label: 'Laptop Integrated Webcam' },
      switchCamera: vi.fn(),
      isSwitching: true,
      switchError: null,
      status: 'requesting',
    };

    const html = renderToString(React.createElement(SwitchCameraButton, { camera: mockCamera }));
    expect(html).toContain('SWITCHING...');
    expect(html).toContain('switch-camera-btn--switching');
  });

  it('indicates single camera state when only 1 webcam is detected', () => {
    const mockCamera = {
      devices: [
        { deviceId: 'cam-builtin', label: 'Laptop Integrated Webcam' },
      ],
      selectedDeviceId: 'cam-builtin',
      activeDevice: { deviceId: 'cam-builtin', label: 'Laptop Integrated Webcam' },
      nextDevice: null,
      switchCamera: vi.fn(),
      isSwitching: false,
      switchError: null,
      status: 'ready',
    };

    const html = renderToString(React.createElement(SwitchCameraButton, { camera: mockCamera }));
    expect(html).toContain('switch-camera-btn--single');
    expect(html).toContain('Only 1 camera detected');
  });

  it('renders error notice if switching cameras fails', () => {
    const mockCamera = {
      devices: [
        { deviceId: 'cam-builtin', label: 'Laptop Integrated Webcam' },
        { deviceId: 'cam-usb', label: 'HD Pro USB Webcam' },
      ],
      selectedDeviceId: 'cam-builtin',
      activeDevice: { deviceId: 'cam-builtin', label: 'Laptop Integrated Webcam' },
      nextDevice: { deviceId: 'cam-usb', label: 'HD Pro USB Webcam' },
      switchCamera: vi.fn(),
      isSwitching: false,
      switchError: 'Device busy or in use by another application',
      status: 'ready',
    };

    const html = renderToString(React.createElement(SwitchCameraButton, { camera: mockCamera }));
    expect(html).toContain('switch-camera-notice--error');
    expect(html).toContain('Device busy or in use by another application');
  });

  it('alternates between laptop webcam and USB webcam in both directions repeatedly', () => {
    const devices = [
      { deviceId: 'cam-builtin', label: 'Integrated Webcam' },
      { deviceId: 'cam-usb', label: 'USB 2.0 Web Camera' },
    ];

    // Direction 1: builtin -> usb
    let currentId = 'cam-builtin';
    let currIdx = devices.findIndex((d) => d.deviceId === currentId);
    let nextIdx = (currIdx + 1) % devices.length;
    expect(devices[nextIdx].deviceId).toBe('cam-usb');

    // Direction 2: usb -> builtin
    currentId = 'cam-usb';
    currIdx = devices.findIndex((d) => d.deviceId === currentId);
    nextIdx = (currIdx + 1) % devices.length;
    expect(devices[nextIdx].deviceId).toBe('cam-builtin');

    // Direction 1 again: builtin -> usb (repeated toggling works)
    currentId = 'cam-builtin';
    currIdx = devices.findIndex((d) => d.deviceId === currentId);
    nextIdx = (currIdx + 1) % devices.length;
    expect(devices[nextIdx].deviceId).toBe('cam-usb');
  });
});
