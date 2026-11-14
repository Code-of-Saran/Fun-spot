import { NavLink } from 'react-router-dom';
import './Leaderboard.css';

/** Switches between leaderboards. Each tab is a real route, so boards are linkable. */
export default function LeaderboardTabs({ modes }) {
  return (
    <nav className="lb-tabs" aria-label="Choose leaderboard">
      {modes.map((mode) => (
        <NavLink key={mode.id} to={`/leaderboards/${mode.id}`} className={`lb-tabs__tab theme-${mode.theme}`}>
          <span aria-hidden="true">{mode.icon}</span> {mode.title}
        </NavLink>
      ))}
    </nav>
  );
}
