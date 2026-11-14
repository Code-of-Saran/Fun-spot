import './LoadingScreen.css';

/** Cyberpunk loading state. `fullscreen` covers the viewport; otherwise it fills its container. */
export default function LoadingScreen({ message = 'INITIALIZING FUN SPOT...', fullscreen = false }) {
  return (
    <div className={`loading-screen${fullscreen ? ' loading-screen--fullscreen' : ''}`} role="status" aria-live="polite">
      <div className="loading-screen__core" aria-hidden="true">
        <span className="loading-screen__ring loading-screen__ring--outer" />
        <span className="loading-screen__ring loading-screen__ring--inner" />
        <span className="loading-screen__dot" />
      </div>
      <p className="loading-screen__text">
        {message}
        <span className="loading-screen__cursor" aria-hidden="true">
          _
        </span>
      </p>
      <div className="loading-screen__bar" aria-hidden="true">
        <span />
      </div>
    </div>
  );
}
