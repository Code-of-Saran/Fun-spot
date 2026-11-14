import { CATEGORIES, CHARACTERS } from './characters';
import { pick, secureRandom } from '../../utils/random';

/** How many previous characters are kept out of the next draw (when the pool allows). */
export const NO_REPEAT_WINDOW = 2;

/**
 * Two-step random draw: first a CATEGORY, then a CHARACTER inside it.
 * Recently seen characters are excluded; if that would leave nothing (tiny
 * pools), the window shrinks — so it can never loop forever or come up empty.
 *
 * @param {string[]} recentIds previously drawn character ids, oldest first
 * @returns {{ category: object, character: object }}
 */
export function pickCharacter(recentIds = [], rng = secureRandom, characters = CHARACTERS, categories = CATEGORIES) {
  for (let window = NO_REPEAT_WINDOW; window >= 0; window -= 1) {
    const recent = new Set(window ? recentIds.slice(-window) : []);
    const eligible = characters.filter((c) => !recent.has(c.id));
    const available = categories.filter((cat) => eligible.some((c) => c.category === cat.id));
    if (!available.length) continue;

    const category = pick(available, rng);
    const character = pick(
      eligible.filter((c) => c.category === category.id),
      rng,
    );
    return { category, character };
  }
  throw new Error('AI Mirror has no characters configured');
}
