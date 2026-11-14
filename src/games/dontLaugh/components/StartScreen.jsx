import { useId, useRef, useState } from 'react';
import GameHeader from '../../../components/game/GameHeader';
import CyberButton from '../../../components/common/CyberButton';
import BackButton from '../../../components/common/BackButton';
import { NAME_MAX_LENGTH, validatePlayerName } from '../../../services/leaderboardValidation';
import { SmileIcon, SparklesIcon, CameraIcon, TargetIcon } from '../../../components/common/Icons';
import { GAME } from '../gameConfig';

export default function StartScreen({ initialName = '', onStart }) {
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
    <div className="dl-start">
      <GameHeader
        icon={<SmileIcon size={28} />}
        eyebrow={`TRY NOT TO LAUGH · ${GAME.ROUND_SECONDS} SECONDS`}
        title="DON'T LAUGH"
        description="Let's see how long you can survive."
        theme="magenta"
      />
      <form className="dl-panel dl-start__form" onSubmit={submit} noValidate>
        <ol className="dl-start__rules">
          <li>
            <span aria-hidden="true" style={{ display: 'inline-flex', verticalAlign: 'middle', marginRight: '6px' }}><SparklesIcon size={16} /></span> Funny stuff appears on screen.
          </li>
          <li>
            <span aria-hidden="true" style={{ display: 'inline-flex', verticalAlign: 'middle', marginRight: '6px' }}><CameraIcon size={16} /></span> The AI laugh meter watches your face.
          </li>
          <li>
            <span aria-hidden="true" style={{ display: 'inline-flex', verticalAlign: 'middle', marginRight: '6px' }}><TargetIcon size={16} /></span> Keep a straight face for {GAME.ROUND_SECONDS}s to win.
          </li>
        </ol>
        <label htmlFor={inputId} className="dl-start__label">
          ENTER YOUR NAME
        </label>
        <input
          id={inputId}
          ref={inputRef}
          className="dl-start__input"
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            if (error) setError('');
          }}
          maxLength={NAME_MAX_LENGTH + 10}
          autoComplete="off"
          spellCheck="false"
          placeholder="PLAYER ONE"
          aria-invalid={Boolean(error)}
          aria-describedby={errorId}
          autoFocus
        />
        <p id={errorId} className="dl-start__error" role="alert">
          {error}
        </p>
        <CyberButton type="submit" icon="⟶">
          START
        </CyberButton>
      </form>
      <div className="page-actions">
        <BackButton />
      </div>
    </div>
  );
}
