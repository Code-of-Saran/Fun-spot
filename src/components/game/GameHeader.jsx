import './GameHeader.css';

/** Page heading block: optional eyebrow, icon, title and description, tinted by `theme`. */
export default function GameHeader({ icon, title, description, eyebrow, theme = 'cyan' }) {
  return (
    <header className={`game-header theme-${theme}`}>
      {icon && (
        <span className="game-header__icon" aria-hidden="true">
          {icon}
        </span>
      )}
      {eyebrow && <p className="game-header__eyebrow">{eyebrow}</p>}
      <h1 className="game-header__title">{title}</h1>
      {description && <p className="game-header__desc">{description}</p>}
    </header>
  );
}
