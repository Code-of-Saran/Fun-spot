import { pick } from './randomUtils';

/** Playful, never insulting. Picked by score tier. */
const MESSAGES = {
  high: [
    'ABSOLUTE CHAOS! 🤯',
    'THE CAMERA IS IMPRESSED. 📷',
    'THAT WAS WAY TOO CLEAN. 🔥',
    'CERTIFIED ARCADE LEGEND. 👑',
    'THE AI WANTS YOUR AUTOGRAPH. ✍️',
  ],
  medium: [
    'NOT BAD. THE AI WILL ALLOW IT. 😎',
    'YOU SURVIVED THE CHALLENGE. 🎯',
    'SOLID MOVES. RESPECT. 🤝',
    'THE CROWD GOES MILD! 👏',
  ],
  low: [
    'THE CHALLENGE WON THIS ROUND. 😂',
    'SYSTEM: HUMAN STILL LOADING...',
    'WARM-UP ROUND COMPLETE. NOW FOR REAL! 💪',
    'BOLD STRATEGY. LET’S RUN IT BACK. 🔁',
  ],
};

const STATUS = {
  high: ['HUMAN DETECTED. LEGEND CONFIRMED.', 'POWER LEVEL: OVER 9000.', 'SENSORS OVERLOADED WITH SKILL.'],
  medium: ['HUMAN DETECTED.', 'MOVES REGISTERED. VIBES ACCEPTABLE.', 'PERFORMANCE LOGGED. NOT BAD AT ALL.'],
  low: ['HUMAN DETECTED. PROBABLY.', 'RECALIBRATING EXPECTATIONS...', 'BUFFERING GREATNESS...'],
};

export function scoreTier(total) {
  if (total >= 800) return 'high';
  if (total >= 450) return 'medium';
  return 'low';
}

export function getFeedback(total, rng) {
  const tier = scoreTier(total);
  return { tier, message: pick(MESSAGES[tier], rng), status: pick(STATUS[tier], rng) };
}
