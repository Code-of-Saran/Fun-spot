import { useEffect } from 'react';
import './CameraFeed.css';

/**
 * Mirrored live camera view in a neon HUD frame, with a canvas on top for
 * landmark overlays and a slot (`children`) for game overlays.
 * The parent owns the stream (see vision/useCamera) and the refs.
 */
export default function CameraFeed({
  stream,
  videoRef,
  canvasRef,
  label = 'Live camera feed',
  className = '',
  aspectRatio,
  videoStyle,
  children,
}) {
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return undefined;
    const targetStream = stream ?? null;
    if (video.srcObject !== targetStream) {
      video.srcObject = targetStream;
    }
    if (stream) {
      video.play().catch(() => {});
    }
    return () => {
      // Do not detach stream on routine re-render if stream is still active
      if (video && video.srcObject && !stream?.active) {
        video.srcObject = null;
      }
    };
  }, [stream, videoRef]);

  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef?.current;
    if (!video || !canvas) return undefined;
    const sync = () => {
      if (video.videoWidth && canvas.width !== video.videoWidth) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }
    };
    video.addEventListener('loadedmetadata', sync);
    video.addEventListener('resize', sync);
    sync();
    return () => {
      video.removeEventListener('loadedmetadata', sync);
      video.removeEventListener('resize', sync);
    };
  }, [videoRef, canvasRef]);

  return (
    <div className={`camera-feed ${className}`.trim()} style={aspectRatio ? { aspectRatio } : undefined}>
      <video ref={videoRef} className="camera-feed__video" style={videoStyle} muted playsInline aria-label={label} />
      {canvasRef && <canvas ref={canvasRef} className="camera-feed__overlay" aria-hidden="true" />}
      <span className="camera-feed__corner camera-feed__corner--tl" aria-hidden="true" />
      <span className="camera-feed__corner camera-feed__corner--tr" aria-hidden="true" />
      <span className="camera-feed__corner camera-feed__corner--bl" aria-hidden="true" />
      <span className="camera-feed__corner camera-feed__corner--br" aria-hidden="true" />
      {children}
    </div>
  );
}
