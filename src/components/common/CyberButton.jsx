import { Link } from 'react-router-dom';
import './CyberButton.css';

/**
 * Neon button. Renders a router <Link> when `to` is given, otherwise a <button>.
 * `variant`: 'primary' (filled glow) | 'ghost' (outline). Accent colour follows the
 * nearest `.theme-*` class, falling back to cyan.
 */
export default function CyberButton({
  to,
  variant = 'primary',
  size = 'md',
  icon,
  iconPosition = 'end',
  className = '',
  children,
  type = 'button',
  ...rest
}) {
  const classes = `cyber-btn cyber-btn--${variant} cyber-btn--${size} ${className}`.trim();
  const content = (
    <>
      {icon && iconPosition === 'start' && (
        <span className="cyber-btn__icon" aria-hidden="true">
          {icon}
        </span>
      )}
      <span className="cyber-btn__label">{children}</span>
      {icon && iconPosition === 'end' && (
        <span className="cyber-btn__icon" aria-hidden="true">
          {icon}
        </span>
      )}
    </>
  );

  if (to) {
    return (
      <Link to={to} className={classes} {...rest}>
        {content}
      </Link>
    );
  }

  return (
    <button type={type} className={classes} {...rest}>
      {content}
    </button>
  );
}
