import { useId, useRef, useState } from 'react';
import GameHeader from '../../../components/game/GameHeader';
import CyberButton from '../../../components/common/CyberButton';
import BackButton from '../../../components/common/BackButton';
import { NAME_MAX_LENGTH, validatePlayerName } from '../../../services/leaderboardValidation';

export default function NameEntry({ initialName = '', onStart }) {
  const [name, setName] = useState(initialName);
  const [error, setError] = useState('');
  const inputRef = useRef(null);
  const inputId = useId();
  const errorId = useId();

  const submit = (event) => {
    event.preventDefault();
    const result = validatePlayerName(name);
    if (!result.ok) {
      setError(result.error);
      inputRef.current?.focus();
      return;
    }
    onStart(result.value);
  };

  return (
    <div className="rg-name">
      <GameHeader
        icon="🎲"
        eyebrow="GAME MODE · RANDOM CHALLENGE"
        title="RANDOM"
        description="The AI picks the challenge. You do something stupid. The camera judges."
        theme="gold"
      />

      <form className="rg-panel rg-name__form theme-gold" onSubmit={submit} noValidate>
        <label htmlFor={inputId} className="rg-name__label">
          ENTER YOUR NAME
        </label>
        <input
          id={inputId}
          ref={inputRef}
          className="rg-name__input"
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            if (error) setError('');
          }}
          maxLength={NAME_MAX_LENGTH + 10}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck="false"
          placeholder="PLAYER ONE"
          aria-invalid={Boolean(error)}
          aria-describedby={errorId}
          autoFocus
        />
        <p id={errorId} className="rg-name__error" role="alert">
          {error}
        </p>
        <CyberButton type="submit" icon="⟶" className="rg-name__start">
          START
        </CyberButton>
        <p className="rg-name__note">
          <span aria-hidden="true">📷</span> Uses your webcam. Nothing is recorded or uploaded — only your name and score are saved.
        </p>
      </form>

      <div className="page-actions">
        <BackButton />
        <CyberButton to="/leaderboards/random" variant="ghost" icon="🏆">
          LEADERBOARD
        </CyberButton>
      </div>
    </div>
  );
}
