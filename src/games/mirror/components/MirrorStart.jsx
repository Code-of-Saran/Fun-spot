import GameHeader from '../../../components/game/GameHeader';
import CyberButton from '../../../components/common/CyberButton';
import BackButton from '../../../components/common/BackButton';
import { CATEGORIES } from '../characters';

const STEPS = [
  { icon: '▶', text: 'Press start and allow the camera.' },
  { icon: '🎲', text: 'The AI randomly picks your character.' },
  { icon: '🪞', text: 'Look at the camera — the character follows your face.' },
  { icon: '📸', text: 'Strike a pose and capture your photo.' },
];

export default function MirrorStart({ onStart }) {
  return (
    <div className="mr-start">
      <GameHeader
        icon="🪞"
        eyebrow="AI MIRROR · RANDOM CHARACTER"
        title="WHO WILL YOU BECOME?"
        description="You don't choose. The mirror does."
        theme="cyan"
      />

      <section className="mr-panel mr-start__panel" aria-label="How AI Mirror works">
        <ol className="mr-start__steps">
          {STEPS.map((step) => (
            <li key={step.text}>
              <span className="mr-start__step-icon" aria-hidden="true">
                {step.icon}
              </span>
              {step.text}
            </li>
          ))}
        </ol>
        <p className="mr-start__pool" aria-label="Possible categories">
          {CATEGORIES.map((c) => (
            <span key={c.id} className="mr-chip">
              <span aria-hidden="true">{c.icon}</span> {c.label}
            </span>
          ))}
        </p>
        <CyberButton onClick={onStart} icon="✨" className="mr-start__btn" autoFocus>
          START AI MIRROR
        </CyberButton>
        <p className="mr-start__note">
          <span aria-hidden="true">🔒</span> Everything happens in this browser. Photos are never uploaded.
        </p>
      </section>

      <div className="page-actions">
        <BackButton />
      </div>
    </div>
  );
}
