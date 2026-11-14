import React from 'react';
import mirrorArt from '../assets/cards/mirror.webp';
import dontLaughArt from '../assets/cards/dont-laugh.webp';
import faceOffArt from '../assets/cards/face-off.jpg';
import { CameraIcon, SmileIcon, SparklesIcon } from '../components/common/Icons';

/**
 * Single source of truth for the three Fun Spot game modes:
 * 1. Don't Laugh
 * 2. Face Off
 * 3. Look A Like
 */
export const gameModes = [
  {
    id: 'dont-laugh',
    title: "DON'T LAUGH",
    cardTitle: ["DON'T", 'LAUGH'],
    icon: React.createElement(SmileIcon, { size: 24 }),
    description: 'Survive funny GIFs and comedy content with live camera reaction capture and timed entertainment rounds.',
    route: '/dont-laugh',
    theme: 'magenta',
    art: dontLaughArt,
    artAlt: 'Cartoon boy holding a finger to his lips in comedy challenge',
  },
  {
    id: 'face-off',
    title: 'FACE OFF',
    cardTitle: ['FACE', 'OFF'],
    icon: React.createElement(CameraIcon, { size: 24 }),
    description: 'Recreate the facial expression shown in a reference photograph with AI facial-expression comparison, match percentage, and captured-photo result.',
    route: '/face-off',
    theme: 'lime',
    art: faceOffArt,
    artAlt: 'Face Off AI facial expression match challenge',
  },
  {
    id: 'look-a-like',
    title: 'LOOK A LIKE',
    cardTitle: ['LOOK A', 'LIKE'],
    icon: React.createElement(SparklesIcon, { size: 24 }),
    description: 'Funny Indian celebrity resemblance. Compare against the Male or Female reference-image collection selected by the participant and discover your single closest match.',
    route: '/look-a-like',
    theme: 'amber',
    art: mirrorArt,
    artAlt: 'Look A Like funny Indian celebrity resemblance',
  },
];

export const getGameMode = (id) => {
  if (id === 'dont-laugh') return gameModes[0];
  if (id === 'face-off' || id === 'wrong-answers') return gameModes[1];
  if (id === 'look-a-like' || id === 'lookalike') return gameModes[2];
  return gameModes.find((mode) => mode.id === id);
};
