import { useEffect, useId, useRef, useState } from 'react';
import CyberButton from '../../../components/common/CyberButton';
import { MicIcon, StopSquareIcon, SendIcon } from '../../../components/common/Icons';
import { GAME_CONFIG } from '../gameConfig';
import { useSpeechInput } from '../useSpeechInput';
import { sfx } from '../../../utils/sfx';

const { maxAnswerLength: MAX, minAnswerLength: MIN, answerSeconds } = GAME_CONFIG;

/**
 * Question + big answer box. Enter submits (Shift+Enter = new line).
 * When the timer runs out, whatever is typed is submitted; an empty box scores 0.
 */
export default function AnswerScreen({ question, onSubmit, onTimeUp }) {
  const [answer, setAnswer] = useState('');
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [remaining, setRemaining] = useState(answerSeconds);
  const textRef = useRef(null);
  const answerRef = useRef('');
  const handlers = useRef({ onSubmit, onTimeUp });
  const fieldId = useId();
  const hintId = useId();
  answerRef.current = answer;

  useEffect(() => {
    handlers.current = { onSubmit, onTimeUp };
  });

  const voice = useSpeechInput({
    onText: (text) => setAnswer((prev) => `${prev ? `${prev.trimEnd()} ` : ''}${text}`.slice(0, MAX)),
  });

  const submit = () => {
    if (submitted) return; // one answer → one judging request
    const value = answer.trim();
    if (value.length < MIN) {
      setError('Type a (wrong!) answer first.');
      textRef.current?.focus();
      return;
    }
    setSubmitted(true);
    voice.stop();
    onSubmit(value);
  };

  useEffect(() => {
    textRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!answerSeconds || submitted) return undefined;
    const started = performance.now();
    let lastTick = Infinity;
    const timer = setInterval(() => {
      const left = Math.max(0, answerSeconds - (performance.now() - started) / 1000);
      setRemaining(left);
      const whole = Math.ceil(left);
      if (whole <= 5 && whole < lastTick && left > 0) sfx.tick();
      lastTick = whole;
      if (left <= 0) {
        clearInterval(timer);
        setSubmitted(true);
        const typed = answerRef.current.trim();
        if (typed.length >= MIN) handlers.current.onSubmit(typed);
        else handlers.current.onTimeUp();
      }
    }, 100);
    return () => clearInterval(timer);
  }, [submitted]);

  const urgent = answerSeconds && remaining <= 10;

  return (
    <section className="wa-answer" aria-labelledby="wa-question">
      <div className="wa-panel wa-question">
        <p className="wa-eyebrow">THE QUESTION</p>
        <h1 id="wa-question" className="wa-question__text">
          {question}
        </h1>
        {answerSeconds && (
          <div className={`wa-timer${urgent ? ' wa-timer--urgent' : ''}`} role="timer" aria-label={`${Math.ceil(remaining)} seconds left`}>
            <span className="wa-timer__bar" style={{ width: `${(remaining / answerSeconds) * 100}%` }} />
            <span className="wa-timer__text">⏱ {Math.ceil(remaining)}s</span>
          </div>
        )}
      </div>

      <form
        className="wa-panel wa-answer__form"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <label htmlFor={fieldId} className="wa-answer__label">
          YOUR WRONG ANSWER:
        </label>
        <textarea
          id={fieldId}
          ref={textRef}
          className="wa-answer__box"
          value={answer}
          maxLength={MAX}
          rows={4}
          placeholder="Because the moon is collecting parking fees…"
          disabled={submitted}
          aria-describedby={hintId}
          aria-invalid={Boolean(error)}
          onChange={(event) => {
            setAnswer(event.target.value);
            if (error) setError('');
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
              event.preventDefault();
              submit();
            }
          }}
        />
        <div className="wa-answer__meta">
          <span id={hintId} className="wa-answer__hint">
            Enter to submit · Shift+Enter for a new line
          </span>
          <span className={`wa-answer__count${answer.length > MAX * 0.9 ? ' wa-answer__count--full' : ''}`} aria-live="polite">
            {answer.length} / {MAX}
          </span>
        </div>
        <p className="wa-error" role="alert">
          {error || voice.message}
        </p>
        <div className="wa-answer__actions">
          <CyberButton
            type="button"
            variant="ghost"
            icon={voice.listening ? <StopSquareIcon size={18} /> : <MicIcon size={18} />}
            iconPosition="start"
            onClick={voice.listening ? voice.stop : voice.start}
            disabled={submitted}
            aria-pressed={voice.listening}
          >
            {voice.listening ? 'LISTENING… TAP TO STOP' : 'SPEAK IT'}
          </CyberButton>
          <CyberButton type="submit" icon={<SendIcon size={18} />} disabled={submitted || !answer.trim()}>
            {submitted ? 'SUBMITTING…' : 'SUBMIT'}
          </CyberButton>
        </div>
      </form>
    </section>
  );
}
