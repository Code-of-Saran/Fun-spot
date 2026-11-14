import React from 'react';
import { PaletteIcon, SmileIcon, CrossIcon, TargetIcon } from '../../components/common/Icons';

/** Every Wrong Answers Only!! setting lives here. */
export const GAME_CONFIG = {
  totalRounds: 5,
  answerSeconds: 60, // per question; set to null to switch the timer off
  maxAnswerLength: 500,
  minAnswerLength: 2,
  promptRevealMs: 1500, // random question shuffle before each question
  judgeSlowNoticeMs: 12000, // after this, tell the player the judge is taking a break
};

/**
 * AI judge weights — these drive the displayed rubric and must match
 * backend/services/ai_judge.py's scoring formula.
 *
 * Rubric (displayed to players):
 *   Creativity    35 pts
 *   Humour        30 pts
 *   Incorrectness 25 pts  (API field: originality)
 *   Relevance     10 pts
 */
export const WEIGHTS = { creativity: 0.35, humor: 0.30, originality: 0.25, relevance: 0.10 };
export const METRICS = [
  { key: 'creativity', label: 'CREATIVITY', icon: React.createElement(PaletteIcon, { size: 16 }) },
  { key: 'humor', label: 'HUMOUR', icon: React.createElement(SmileIcon, { size: 16 }) },
  { key: 'originality', label: 'INCORRECTNESS', icon: React.createElement(CrossIcon, { size: 16 }) },
  { key: 'relevance', label: 'RELEVANCE', icon: React.createElement(TargetIcon, { size: 16 }) },
];
