import { WEIGHTS } from './gameConfig';

const round1 = (n) => Math.round(n * 10) / 10;
const clamp100 = (n) => Math.min(100, Math.max(0, Number.isFinite(n) ? n : 0));

/** Round score 0–100: creativity 35% + humor 30% + incorrectness 25% + relevance 10%. */
export function weightedScore(metrics) {
  return round1(Object.entries(WEIGHTS).reduce((sum, [key, weight]) => sum + clamp100(metrics[key]) * weight, 0));
}

/** Game score = plain average of the round scores (unanswered rounds count as 0). One decimal. */
export function gameScore(rounds) {
  if (!rounds.length) return 0;
  return round1(rounds.reduce((sum, r) => sum + r.score, 0) / rounds.length);
}

export function bestRound(rounds) {
  return rounds.reduce((best, r) => (!best || r.score > best.score ? r : best), null);
}

const RATINGS = [
  { min: 85, text: 'CREATIVE CHAOS ACHIEVED' },
  { min: 70, text: 'CERTIFIED WRONG GENIUS' },
  { min: 55, text: 'GLORIOUSLY INCORRECT' },
  { min: 35, text: 'WARMING UP THE CHAOS ENGINE' },
  { min: 0, text: 'A WRONG ANSWER LEGEND IN TRAINING' },
];

export const gameRating = (score) => RATINGS.find((r) => score >= r.min).text;
