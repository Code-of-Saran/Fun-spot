/** The revealed challenge: icon, title, instruction and (for combos) the step list. */
export default function ChallengeCard({ challenge, activeStep = null, compact = false }) {
  const steps = challenge.params?.steps;
  return (
    <div className={`rg-challenge${compact ? ' rg-challenge--compact' : ''}`}>
      <p className="rg-challenge__eyebrow">YOUR CHALLENGE</p>
      <h1 className="rg-challenge__title">
        <span className="rg-challenge__icon" aria-hidden="true">
          {challenge.icon}
        </span>{' '}
        {challenge.title}
      </h1>
      <p className="rg-challenge__instruction">{challenge.instruction}</p>
      {steps && (
        <ol className="rg-steps" aria-label="Combo steps">
          {steps.map((step, i) => {
            const state = activeStep === null ? 'todo' : i < activeStep ? 'done' : i === activeStep ? 'active' : 'todo';
            return (
              <li key={step.id} className={`rg-steps__item rg-steps__item--${state}`}>
                <span aria-hidden="true">{state === 'done' ? '✅' : step.icon}</span> {step.label}
                {state === 'active' && <span className="visually-hidden"> (current step)</span>}
              </li>
            );
          })}
        </ol>
      )}
      <p className="rg-challenge__meta">
        <span>⏱️ {challenge.duration}s</span>
        <span>· {challenge.difficulty.toUpperCase()}</span>
      </p>
    </div>
  );
}
