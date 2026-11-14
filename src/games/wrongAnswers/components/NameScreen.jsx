import { useId, useRef, useState } from 'react';
import GameHeader from '../../../components/game/GameHeader';
import CyberButton from '../../../components/common/CyberButton';
import BackButton from '../../../components/common/BackButton';
import { NAME_MAX_LENGTH, validatePlayerName } from '../../../services/leaderboardValidation';

import { CrossIcon, TrophyIcon } from '../../../components/common/Icons';

export default function NameScreen({ onSubmit }) {
  const [name, setName] = useState('');
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
    onSubmit(result.value);
  };

  return (
    <div className="wa-name">
      <GameHeader
        icon={<CrossIcon size={28} />}
        eyebrow="AI CREATIVITY CHALLENGE"
        title="WRONG ANSWERS ONLY!!"
        description="Give the funniest answer that is completely wrong."
        theme="lime"
      />
      <form className="wa-panel wa-name__form" onSubmit={submit} noValidate>
        <label htmlFor={inputId} className="wa-name__label">
          WHO ARE YOU?
        </label>
        <input
          id={inputId}
          ref={inputRef}
          className="wa-input"
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            if (error) setError('');
          }}
          maxLength={NAME_MAX_LENGTH + 10}
          autoComplete="off"
          spellCheck="false"
          placeholder="ENTER YOUR NAME"
          aria-invalid={Boolean(error)}
          aria-describedby={errorId}
          autoFocus
        />
        <p id={errorId} className="wa-error" role="alert">
          {error}
        </p>
        <CyberButton type="submit" icon="⟶">
          START
        </CyberButton>
      </form>
      <div className="page-actions">
        <BackButton />
        <CyberButton to="/leaderboards/wrong-answers" variant="ghost" icon={<TrophyIcon size={18} />}>
          LEADERBOARD
        </CyberButton>
      </div>
    </div>
  );
}
