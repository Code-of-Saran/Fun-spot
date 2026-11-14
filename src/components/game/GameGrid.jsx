import GameCard from './GameCard';
import './GameGrid.css';

/** Lays out game cards with a staggered entrance. Positioning can be overridden via `className`. */
export default function GameGrid({ modes, id, className = '', label = 'Game modes' }) {
  return (
    <ul id={id} className={`game-grid ${className}`.trim()} aria-label={label}>
      {modes.map((mode, index) => (
        <li key={mode.id} className="game-grid__item" data-mode={mode.id} style={{ '--i': index }}>
          <GameCard mode={mode} />
        </li>
      ))}
    </ul>
  );
}
