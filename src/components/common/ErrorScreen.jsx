import CyberButton from './CyberButton';
import './ErrorScreen.css';

/**
 * Reusable failure state. Always offers a way home; `onRetry` adds a retry action.
 * `compact` renders inline (inside a panel) instead of as a full page section.
 */
export default function ErrorScreen({
  code = 'ERR',
  title = 'SYSTEM ERROR',
  message = 'Something went wrong.',
  error,
  errorInfo,
  onRetry,
  retryLabel = 'RETRY',
  homeLabel = '[ RETURN HOME ]',
  compact = false,
}) {
  return (
    <section className={`error-screen${compact ? ' error-screen--compact' : ''}`} role="alert">
      <p className="error-screen__code">{code}</p>
      <h1 className="error-screen__title" data-text={title}>
        {title}
      </h1>
      <p className="error-screen__message">{message}</p>

      {import.meta.env?.DEV && error && (
        <details
          style={{
            maxWidth: '650px',
            margin: '1rem auto 1.5rem',
            padding: '0.65rem 1rem',
            background: 'rgba(5, 10, 25, 0.85)',
            border: '1px solid rgba(255, 23, 68, 0.35)',
            borderRadius: '8px',
            textAlign: 'left',
            fontFamily: 'monospace',
            fontSize: '0.78rem',
            color: '#ff8a80',
          }}
        >
          <summary style={{ cursor: 'pointer', color: '#ff5252', fontWeight: 700, outline: 'none' }}>
            ▸ Developer Diagnostics (Dev Mode Only)
          </summary>
          <div style={{ marginTop: '0.5rem', maxHeight: '180px', overflowY: 'auto' }}>
            <strong>{error.name}:</strong> {error.message}
            {error.stack && (
              <pre style={{ marginTop: '0.35rem', opacity: 0.85, whiteSpace: 'pre-wrap', fontSize: '0.7rem' }}>
                {error.stack}
              </pre>
            )}
          </div>
        </details>
      )}

      <div className="error-screen__actions">
        {onRetry && (
          <CyberButton onClick={onRetry} icon="↻" iconPosition="start">
            {retryLabel}
          </CyberButton>
        )}
        <CyberButton to="/" variant={onRetry ? 'ghost' : 'primary'}>
          {homeLabel}
        </CyberButton>
      </div>
    </section>
  );
}
