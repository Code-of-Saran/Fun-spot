import { weightedScore } from './scoring';
import { pick } from '../../utils/random';

/**
 * BACKUP scoring, used only when the AI judge can't be reached.
 * It is NOT AI and doesn't understand jokes — it looks at simple signals:
 *   length (a real attempt, not an essay) · vocabulary variety · words shared
 *   with the question (relevance) · unusual words / emoji / exclamation.
 * Capped at 75 so backup scores can never outrank strong AI-judged answers.
 */
export const FALLBACK_CAP = 75;

const STOP = new Set('the a an and or but of to in on at for is are was were be do does did why how what your you my our it its this that with as by from have has had not no so very just'.split(' '));
const PLAYFUL = /\b(because|secretly|actually|obviously|aliens?|ninja|dragon|wizard|magic|robot|conspiracy|government|union|salary|strike|revenge|gossip|drama|invoice|subscription|wifi|pizza|samosa|chai)\b/i;
const EMOJI = /\p{Extended_Pictographic}/u;

const FEEDBACK = [
  'Backup judge says: that is wonderfully wrong.',
  'The AI is on a break, but the chaos was noted.',
  'Backup judge approves this level of nonsense.',
  'Wrong enough to count. The real AI will be jealous.',
];

const words = (text) => text.toLowerCase().match(/[\p{L}\p{N}']+/gu) ?? [];
const contentWords = (text) => words(text).filter((w) => w.length > 2 && !STOP.has(w));
const clamp = (n) => Math.round(Math.min(100, Math.max(0, n)));

export function fallbackJudge(question, answer, rng) {
  const all = words(answer);
  const content = contentWords(answer);
  const unique = new Set(all).size;

  // nonsense / keyboard mash → very low
  const letters = answer.replace(/[^\p{L}]/gu, '');
  const vowelRatio = letters ? (letters.match(/[aeiouAEIOU]/g) ?? []).length / letters.length : 0;
  if (all.length === 0 || (letters.length > 6 && vowelRatio < 0.12)) {
    return finish({ creativity: 5, humor: 5, originality: 5, relevance: 0 }, 'Backup judge could not decode that one!');
  }

  const lengthFit = all.length < 3 ? all.length / 3 : all.length <= 40 ? 1 : Math.max(0.4, 1 - (all.length - 40) / 80);
  const variety = all.length ? unique / all.length : 0;
  const questionWords = new Set(contentWords(question).map((w) => w.slice(0, 5)));
  const overlap = content.filter((w) => questionWords.has(w.slice(0, 5))).length;
  const unusual = content.filter((w) => w.length >= 8).length;
  const spark = (PLAYFUL.test(answer) ? 1 : 0) + (EMOJI.test(answer) ? 1 : 0) + (/[!?]/.test(answer) ? 0.5 : 0);

  return finish(
    {
      creativity: clamp(25 + 30 * lengthFit + 20 * variety + Math.min(15, unusual * 5)),
      humor: clamp(25 + 20 * lengthFit + 12 * spark),
      originality: clamp(20 + 40 * variety + Math.min(20, unusual * 6)),
      relevance: clamp(35 + Math.min(50, overlap * 25) + (/\bbecause\b/i.test(answer) ? 10 : 0)),
    },
    pick(FEEDBACK, rng),
  );
}

function finish(metrics, feedback) {
  return {
    ...metrics,
    final_score: Math.min(FALLBACK_CAP, weightedScore(metrics)),
    feedback,
    source: 'fallback',
  };
}
