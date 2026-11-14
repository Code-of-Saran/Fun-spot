/**
 * AI Mirror character pool. Adding a character = adding an entry here (plus
 * its SVG art in ./characters/<category>/). No other code changes needed.
 *
 * All art is original. Characters are *inspired by* familiar cartoon genres
 * rather than copies of specific copyrighted characters.
 *
 * Character fields
 *  - filter        colour grade for the camera image (CSS / canvas filter syntax)
 *  - environment   { vignette: colour, strength 0–1, pattern?: speedlines|halftone|grain|rays }
 *  - layers        drawn in order, each attached to a face anchor (see faceGeometry.js):
 *      asset       SVG url                 anchor   anchor name, or [left, right] for pairs
 *      width       in face widths          pivot    point of the art placed on the anchor (0–1)
 *      offset      [x, y] in face widths, in the head's rotated frame (y down)
 *      pair        draw mirrored on both sides (art is drawn for the screen-right side)
 *      tilt        extra rotation (rad, outward for pairs)
 *      blink       squash with the eye blink (eye pairs)
 *      wobble      { amp: rad, speed }      spinX   propeller-style spin speed
 *      kind        'googly' → procedural googly eyes (size = radius in face widths)
 *  - particles     ambient effects: { sprite, motion: fall|rise|orbit|drift|pop, count, size }
 *  - burst         emitted from the mouth when the player opens it wide
 *
 * Sprites: an SVG url, { src, tint }, { emoji }, or { shape: 'puff' | 'confetti' }.
 */
import heroHair from './characters/anime/hero-hair.svg';
import chibiEye from './characters/anime/chibi-eye.svg';
import chibiBlush from './characters/anime/chibi-blush.svg';
import chibiBow from './characters/anime/chibi-bow.svg';
import ninjaHeadband from './characters/anime/ninja-headband.svg';
import ninjaMask from './characters/anime/ninja-mask.svg';
import samuraiHelmet from './characters/anime/samurai-helmet.svg';
import elfEar from './characters/anime/elf-ear.svg';
import elfCirclet from './characters/anime/elf-circlet.svg';
import dollHair from './characters/cartoon/doll-hair.svg';
import heartGlasses from './characters/cartoon/heart-glasses.svg';
import catEar from './characters/cartoon/cat-ear.svg';
import catNose from './characters/cartoon/cat-nose.svg';
import whiskers from './characters/cartoon/whiskers.svg';
import mouseEar from './characters/cartoon/mouse-ear.svg';
import mouseNose from './characters/cartoon/mouse-nose.svg';
import mouseTeeth from './characters/cartoon/mouse-teeth.svg';
import topHat from './characters/cartoon/top-hat.svg';
import bowTie from './characters/cartoon/bow-tie.svg';
import comicMask from './characters/cartoon/comic-mask.svg';
import propellerCap from './characters/cartoon/propeller-cap.svg';
import propeller from './characters/cartoon/propeller.svg';
import strongHeadband from './characters/indian/strong-headband.svg';
import curlyMustache from './characters/indian/curly-mustache.svg';
import roundGlasses from './characters/indian/round-glasses.svg';
import filmyHair from './characters/indian/filmy-hair.svg';
import aviators from './characters/indian/aviators.svg';
import heroMask from './characters/indian/hero-mask.svg';
import peacockCrest from './characters/indian/peacock-crest.svg';
import sparkle from './characters/particles/sparkle.svg';
import petal from './characters/particles/petal.svg';
import lightning from './characters/particles/lightning.svg';
import shuriken from './characters/particles/shuriken.svg';
import laddoo from './characters/particles/laddoo.svg';
import samosa from './characters/particles/samosa.svg';
import pow from './characters/particles/pow.svg';
import zap from './characters/particles/zap.svg';
import bam from './characters/particles/bam.svg';
import note from './characters/particles/note.svg';

export const CATEGORIES = [
  { id: 'anime', label: 'ANIME', icon: '🎌' },
  { id: 'cartoon', label: 'CARTOON', icon: '🎨' },
  // 🦚 rather than a flag emoji: Windows can't render flag emoji.
  { id: 'indian', label: 'INDIAN CARTOON', icon: '🦚' },
];

const tinted = (src, tint) => ({ src, tint });

export const CHARACTERS = [
  // ---------------- 🎌 ANIME ----------------
  {
    id: 'anime-hero',
    name: 'ANIME HERO',
    category: 'anime',
    icon: '⚡',
    description: 'Spiky-haired protagonist energy. Power level: rising.',
    filter: 'saturate(1.35) contrast(1.08)',
    environment: { vignette: '#19b8ff', strength: 0.55, pattern: 'speedlines' },
    layers: [{ asset: heroHair, anchor: 'top', width: 1.9, pivot: [0.5, 0.6] }],
    particles: [
      { sprite: lightning, motion: 'rise', count: 8, size: [0.05, 0.09] },
      { sprite: tinted(sparkle, '#7ff3ff'), motion: 'orbit', count: 6, size: [0.12, 0.2] },
    ],
    burst: { sprite: lightning, count: 10 },
  },
  {
    id: 'chibi-star',
    name: 'CHIBI STAR',
    category: 'anime',
    icon: '🌸',
    description: 'Huge sparkly eyes that blink when you do. Maximum kawaii.',
    filter: 'saturate(1.25) brightness(1.06)',
    environment: { vignette: '#ff7ad9', strength: 0.45 },
    layers: [
      { asset: chibiBlush, anchor: ['leftCheek', 'rightCheek'], pair: true, width: 0.3, offset: [0.03, 0.02] },
      { asset: chibiEye, anchor: ['leftEye', 'rightEye'], pair: true, width: 0.34, pivot: [0.5, 0.56], blink: true },
      { asset: chibiBow, anchor: 'top', width: 0.5, offset: [0.34, -0.06], tilt: 0.35, wobble: { amp: 0.06, speed: 3 } },
    ],
    particles: [
      { sprite: petal, motion: 'fall', count: 14, size: [0.03, 0.05] },
      { sprite: tinted(sparkle, '#ffb3e6'), motion: 'orbit', count: 5, size: [0.1, 0.16] },
    ],
    burst: { sprite: tinted(sparkle, '#ff7ad9'), count: 12 },
  },
  {
    id: 'shadow-ninja',
    name: 'SHADOW NINJA',
    category: 'anime',
    icon: '🥷',
    description: 'Silent. Masked. Definitely on a secret mission.',
    filter: 'saturate(0.75) contrast(1.15) brightness(0.95)',
    environment: { vignette: '#060a24', strength: 0.7 },
    layers: [
      { asset: ninjaMask, anchor: 'nose', width: 1.12, pivot: [0.5, 0.22] },
      { asset: ninjaHeadband, anchor: 'forehead', width: 1.3, pivot: [0.5, 0.46] },
    ],
    particles: [
      { sprite: { shape: 'puff' }, motion: 'rise', count: 10, size: [0.08, 0.16] },
      { sprite: shuriken, motion: 'drift', count: 3, size: [0.05, 0.07] },
    ],
    burst: { sprite: shuriken, count: 8 },
  },
  {
    id: 'samurai',
    name: 'SAMURAI',
    category: 'anime',
    icon: '⚔️',
    description: 'Lacquered helmet, golden crest, unbreakable honour.',
    filter: 'sepia(0.25) contrast(1.1) saturate(1.1)',
    environment: { vignette: '#5a0b14', strength: 0.6 },
    layers: [{ asset: samuraiHelmet, anchor: 'top', width: 2.1, pivot: [0.5, 0.72] }],
    particles: [{ sprite: petal, motion: 'fall', count: 16, size: [0.03, 0.05] }],
    burst: { sprite: petal, count: 14 },
  },
  {
    id: 'fantasy-elf',
    name: 'FANTASY ELF',
    category: 'anime',
    icon: '🧝',
    description: 'Crystal ears and a circlet of forest magic.',
    filter: 'saturate(1.15) hue-rotate(-8deg)',
    environment: { vignette: '#0c5a4a', strength: 0.55 },
    layers: [
      { asset: elfEar, anchor: ['leftSide', 'rightSide'], pair: true, width: 0.5, pivot: [0.12, 0.64], offset: [-0.08, 0.02] },
      { asset: elfCirclet, anchor: 'forehead', width: 1.05, pivot: [0.5, 0.45], offset: [0, -0.05] },
    ],
    particles: [
      { sprite: tinted(sparkle, '#5dffc8'), motion: 'rise', count: 14, size: [0.02, 0.04] },
      { sprite: tinted(sparkle, '#c3a6ff'), motion: 'orbit', count: 6, size: [0.1, 0.15] },
    ],
    burst: { sprite: tinted(sparkle, '#5dffc8'), count: 14 },
  },

  // ---------------- 🎨 CARTOON ----------------
  {
    id: 'doll-glam',
    name: 'FASHION DOLL GLAM',
    category: 'cartoon',
    icon: '🎀',
    description: 'Fashion-doll inspired: big hair, heart shades, pink everything.',
    filter: 'saturate(1.3) brightness(1.06) sepia(0.08)',
    environment: { vignette: '#ff4fb8', strength: 0.55 },
    layers: [
      { asset: dollHair, anchor: 'top', width: 2.2, pivot: [0.5, 0.42] },
      { asset: heartGlasses, anchor: 'eyes', width: 1.0 },
    ],
    particles: [
      { sprite: { emoji: '💖' }, motion: 'fall', count: 9, size: [0.035, 0.055] },
      { sprite: tinted(sparkle, '#fff0fa'), motion: 'orbit', count: 6, size: [0.1, 0.16] },
    ],
    burst: { sprite: { emoji: '💖' }, count: 10 },
  },
  {
    id: 'toon-cat',
    name: 'TOON CAT',
    category: 'cartoon',
    icon: '🐱',
    description: 'Classic chase-cartoon cat. Whiskers included, dignity optional.',
    filter: 'saturate(1.15)',
    environment: { vignette: '#2a3a66', strength: 0.5 },
    layers: [
      { asset: catEar, anchor: 'top', pair: true, width: 0.46, pivot: [0.5, 0.95], offset: [0.3, -0.06], tilt: 0.3 },
      { asset: whiskers, anchor: ['leftCheek', 'rightCheek'], pair: true, width: 0.45, pivot: [0.06, 0.5], offset: [0, 0.02] },
      { asset: catNose, anchor: 'nose', width: 0.24, pivot: [0.5, 0.3] },
    ],
    particles: [
      { sprite: { emoji: '🐟' }, motion: 'fall', count: 6, size: [0.04, 0.06] },
      { sprite: { emoji: '🐾' }, motion: 'drift', count: 4, size: [0.035, 0.05] },
    ],
    burst: { sprite: { emoji: '🐟' }, count: 8 },
  },
  {
    id: 'toon-mouse',
    name: 'TOON MOUSE',
    category: 'cartoon',
    icon: '🐭',
    description: 'The cheeky cheese thief from every chase cartoon.',
    filter: 'saturate(1.2) sepia(0.12)',
    environment: { vignette: '#6b4a1a', strength: 0.5 },
    layers: [
      { asset: mouseEar, anchor: 'top', pair: true, width: 0.6, pivot: [0.5, 0.88], offset: [0.42, -0.02], tilt: 0.18 },
      { asset: whiskers, anchor: ['leftCheek', 'rightCheek'], pair: true, width: 0.4, pivot: [0.06, 0.5] },
      { asset: mouseTeeth, anchor: 'upperLipInner', width: 0.2, pivot: [0.5, 0.06] },
      { asset: mouseNose, anchor: 'nose', width: 0.17 },
    ],
    particles: [{ sprite: { emoji: '🧀' }, motion: 'fall', count: 10, size: [0.035, 0.055] }],
    burst: { sprite: { emoji: '🧀' }, count: 10 },
  },
  {
    id: 'classic-toon',
    name: 'CLASSIC TOON',
    category: 'cartoon',
    icon: '🎩',
    description: 'A 1930s black-and-white cartoon star, film grain and all.',
    filter: 'grayscale(1) contrast(1.4) brightness(1.08)',
    environment: { vignette: '#000000', strength: 0.85, pattern: 'grain' },
    layers: [
      { asset: bowTie, anchor: 'neck', width: 0.55, pivot: [0.5, 0.3] },
      { asset: topHat, anchor: 'top', width: 1.25, pivot: [0.5, 0.92], offset: [0.06, 0.06], tilt: -0.12, wobble: { amp: 0.04, speed: 2 } },
    ],
    particles: [{ sprite: note, motion: 'rise', count: 7, size: [0.04, 0.06] }],
    burst: { sprite: tinted(sparkle, '#ffffff'), count: 12 },
  },
  {
    id: 'comic-hero',
    name: 'COMIC HERO',
    category: 'cartoon',
    icon: '🦸',
    description: 'Masked crime-fighter, straight out of a comic panel. POW!',
    filter: 'saturate(1.6) contrast(1.2)',
    environment: { vignette: '#ffd60a', strength: 0.4, pattern: 'halftone' },
    layers: [{ asset: comicMask, anchor: 'eyes', width: 1.05 }],
    particles: [{ sprite: [pow, zap, bam], motion: 'pop', count: 2, size: [0.16, 0.22] }],
    burst: { sprite: [pow, zap, bam], count: 4 },
  },
  {
    id: 'funny-toon',
    name: 'GOOGLY GOOF',
    category: 'cartoon',
    icon: '🤪',
    description: 'Googly eyes, propeller cap, zero chill. Shake your head!',
    filter: 'saturate(1.45) contrast(1.05)',
    environment: { vignette: '#7a2bff', strength: 0.45 },
    layers: [
      { kind: 'googly', anchor: ['leftEye', 'rightEye'], size: 0.17 },
      { asset: propellerCap, anchor: 'top', width: 1.25, pivot: [0.5, 0.85] },
      { asset: propeller, anchor: 'top', width: 0.75, offset: [0, -0.69], spinX: 14 },
    ],
    particles: [{ sprite: { shape: 'confetti' }, motion: 'fall', count: 18, size: [0.012, 0.02] }],
    burst: { sprite: { shape: 'confetti' }, count: 18 },
  },

  // ---------------- 🦚 INDIAN CARTOON ----------------
  {
    id: 'laddoo-strongboy',
    name: 'LADDOO STRONGBOY',
    category: 'indian',
    icon: '💪',
    description: 'Village strongman kid hero, powered entirely by laddoos.',
    filter: 'saturate(1.25) sepia(0.15)',
    environment: { vignette: '#ff8a00', strength: 0.5 },
    layers: [{ asset: strongHeadband, anchor: 'forehead', width: 1.3, pivot: [0.5, 0.45] }],
    particles: [
      { sprite: laddoo, motion: 'fall', count: 9, size: [0.04, 0.06] },
      { sprite: tinted(sparkle, '#ffd166'), motion: 'rise', count: 8, size: [0.02, 0.035] },
    ],
    burst: { sprite: laddoo, count: 9 },
  },
  {
    id: 'mustache-master',
    name: 'MUSTACHE MASTER',
    category: 'indian',
    icon: '🥸',
    description: 'Comedy-duo hero with a legendary moustache and a samosa habit.',
    filter: 'saturate(1.2) contrast(1.05)',
    environment: { vignette: '#b0300f', strength: 0.45 },
    layers: [
      { asset: roundGlasses, anchor: 'eyes', width: 0.98 },
      { asset: curlyMustache, anchor: 'upperLip', width: 0.85, pivot: [0.5, 0.48] },
    ],
    particles: [{ sprite: samosa, motion: 'fall', count: 8, size: [0.04, 0.06] }],
    burst: { sprite: samosa, count: 9 },
  },
  {
    id: 'filmy-hero',
    name: 'FILMY HERO',
    category: 'indian',
    icon: '🕶️',
    description: 'Slow-motion Bollywood entry. Rose petals mandatory.',
    filter: 'contrast(1.15) saturate(1.2) sepia(0.18)',
    environment: { vignette: '#ffb02e', strength: 0.55, pattern: 'rays' },
    layers: [
      { asset: filmyHair, anchor: 'top', width: 1.7, pivot: [0.5, 0.7] },
      { asset: aviators, anchor: 'eyes', width: 1.05 },
    ],
    particles: [
      { sprite: { emoji: '🌹' }, motion: 'fall', count: 9, size: [0.035, 0.05] },
      { sprite: tinted(sparkle, '#ffe08a'), motion: 'orbit', count: 5, size: [0.1, 0.15] },
    ],
    burst: { sprite: { emoji: '🌹' }, count: 9 },
  },
  {
    id: 'desi-superhero',
    name: 'DESI SUPERHERO',
    category: 'indian',
    icon: '🦚',
    description: 'Golden mask, peacock crest — saving the day, desi style.',
    filter: 'saturate(1.35) contrast(1.08)',
    environment: { vignette: '#0a4f6b', strength: 0.6 },
    layers: [
      { asset: peacockCrest, anchor: 'top', width: 1.3, pivot: [0.5, 0.93], offset: [0, 0.04] },
      { asset: heroMask, anchor: 'eyes', width: 1.1 },
    ],
    particles: [
      { sprite: { emoji: '🪔' }, motion: 'rise', count: 6, size: [0.035, 0.05] },
      { sprite: tinted(sparkle, '#3ff6d0'), motion: 'orbit', count: 7, size: [0.1, 0.16] },
    ],
    burst: { sprite: tinted(sparkle, '#ffd166'), count: 14 },
  },
];

export const getCategory = (id) => CATEGORIES.find((c) => c.id === id);
