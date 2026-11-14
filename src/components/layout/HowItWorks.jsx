import Modal from '../common/Modal';
import { gameModes } from '../../data/gameModes';
import './HowItWorks.css';

const steps = [
  { label: 'Pick a simulation', text: 'Choose one of the four interactive arcade game modes.' },
  { label: 'Step into the camera', text: 'Imitate 3D characters, keep a poker face, recreate wild expressions, or strike your funniest lookalike pose.' },
  { label: 'AI analyzes in real time', text: 'MediaPipe AI computer vision evaluates your movements and facial landmarks instantly on your device.' },
];

export default function HowItWorks({ open, onClose }) {
  return (
    <Modal open={open} onClose={onClose} title="HOW IT WORKS">
      <ol className="how-steps">
        {steps.map((step, index) => (
          <li key={step.label} className="how-steps__item">
            <span className="how-steps__num" aria-hidden="true">
              {String(index + 1).padStart(2, '0')}
            </span>
            <div>
              <h3 className="how-steps__label">{step.label}</h3>
              <p className="how-steps__text">{step.text}</p>
            </div>
          </li>
        ))}
      </ol>

      <ul className="how-modes" aria-label="Game modes">
        {gameModes.map((mode) => (
          <li key={mode.id} className={`how-modes__item theme-${mode.theme}`}>
            <span aria-hidden="true">{mode.icon}</span> {mode.title}
            <span className="how-modes__desc">{mode.description}</span>
          </li>
        ))}
      </ul>
    </Modal>
  );
}
