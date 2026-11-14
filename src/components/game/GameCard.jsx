import { Link } from 'react-router-dom';
import './GameCard.css';

/** Neon game-mode card. The whole card is one link; "PLAY" is its visual call to action. */
export default function GameCard({ mode }) {
  return (
    <Link
      to={mode.route}
      className={`game-card theme-${mode.theme}`}
      data-mode={mode.id}
      aria-label={`Play ${mode.title}: ${mode.description}`}
    >
      <span className="game-card__inner">
        <img className="game-card__art" src={mode.art} alt={mode.artAlt} draggable="false" />
        <span className="game-card__title">
          {mode.cardTitle.map((line) => (
            <span key={line}>{line}</span>
          ))}
        </span>
        <span className="game-card__desc">{mode.description}</span>
        <span className="game-card__play" aria-hidden="true">
          PLAY <span className="game-card__arrow">⟶</span>
        </span>
      </span>
    </Link>
  );
}
