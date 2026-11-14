/**
 * Don't Laugh content pool — GIF files from public/assets/gifs/.
 *
 * Item type:
 *   { id, type: 'gif', src, top, bottom, duration (s) }
 *
 * GIF files live in public/assets/gifs/ and are referenced via their public URL
 * so the browser fetches them directly (no Vite bundling needed).
 * Spaces and apostrophes in filenames are percent-encoded so the browser can
 * fetch them without a 404.
 *
 * Add a GIF: drop the .gif file in public/assets/gifs/ and add an entry below.
 *
 * NOTE: The old SVG cartoon assets (cat-ceo, potato-yoga, avocado-gym, etc.)
 * have been deliberately removed. This file only references verified GIF files.
 */
import { pick, secureRandom } from '../../utils/random';

// ─── GIF Content ─────────────────────────────────────────────────────────────
// All 27 verified GIF files from public/assets/gifs/.
// Filenames with spaces / apostrophes are percent-encoded so the browser can
// fetch them without a 404. The GIF duration represents how long each clip
// plays before the engine automatically advances to the next item.

const GIF_BASE = '/assets/gifs/';

function gif(id, filename, top, bottom, duration) {
  return {
    id,
    type: 'gif',
    src: GIF_BASE + filename,
    top,
    bottom,
    duration,
  };
}

const GIF_CONTENT = [
  gif('gif-baby-driving',      'Baby%20Driving%20GIF%20by%20Chelsea%20Method.gif',               'BABY ON BOARD',                'TECHNICALLY DRIVING',            7   ),
  gif('gif-charlie-chaplin-b', 'Bouncing%20Charlie%20Chaplin%20GIF.gif',                         'CHARLIE CHAPLIN',              'NEVER MISSES A BEAT',            5   ),
  gif('gif-bubba-j',           'Bubba%20J%20What%20GIF%20by%20Jeff%20Dunham.gif',                 'BUBBA J:',                     '"WHAT?!"',                        5   ),
  gif('gif-candy-tamil',       'Candy%20Tamil%20GIF.gif',                                         'WHEN THE BEAT DROPS',          'AND YOU HAVE NO CHOICE',         5   ),
  gif('gif-cat-meow',          'Cat%20Meow%20GIF%20by%20MOODMAN.gif',                             'CAT GOING TO THE MEETING',     'LIKE A PROFESSIONAL',            5   ),
  gif('gif-chicken-dance',     'Chicken%20Dance%20GIF.gif',                                       'THE CLASSIC',                  'CHICKEN DANCE',                  6   ),
  gif('gif-dance-dog',         'Dance%20Dog%20GIF.gif',                                           'NOBODY:',                      'THIS DOG AT 2AM',                6   ),
  gif('gif-dance-fun-kokumi',  'Dance%20Fun%20GIF%20by%20Kokumi%20Burger.gif',                    'HAPPY MEAL',                   'LITERALLY',                      5   ),
  gif('gif-dance-fun',         'Dance%20Fun%20GIF.gif',                                           'WHEN FRIDAY FINALLY ARRIVES',  'YOU CANNOT STOP IT',             6   ),
  gif('gif-dog-dancing-1',     'Dog%20Dancing%20GIF%20(1).gif',                                   'DOG:',                         'FOUND THE BEAT',                 6   ),
  gif('gif-dog-dancing',       'Dog%20Dancing%20GIF.gif',                                         'THIS DOG KNOWS',               "SOMETHING YOU DON'T",            6   ),
  gif('gif-dog-lol',           'Dog%20Lol%20GIF%20by%20America\'s%20Funniest%20Home%20Videos%20(2).gif', 'AFVS TOP CLIP:',        'DOG VS. GRAVITY',                6   ),
  gif('gif-just-for-laughs',   'Just%20For%20Laughs%20Lol%20GIF%20by%20America\'s%20Funniest%20Home%20Videos%20(3).gif', 'JUST FOR LAUGHS', 'TRY NOT TO SMILE',  5   ),
  gif('gif-kid-fail',          'Kid%20Fail%20GIF.gif',                                            'PHYSICS:',                     'HAVE FUN WITH THAT',             5   ),
  gif('gif-life-fail',         'Life%20Fail%20GIF%20by%20MOODMAN.gif',                            'MONDAY MORNING MOOD:',         '100%',                           5   ),
  gif('gif-mr-bean',           'Mr%20Bean%20GIF.gif',                                             'MR BEAN:',                     'NOT IMPRESSED',                  5   ),
  gif('gif-table-top-lol',     'Table%20Top%20Lol%20GIF%20by%20America\'s%20Funniest%20Home%20Videos.gif', 'GRAVITY CHECK:', 'FAILED',                            5   ),
  gif('gif-charlie-maudit',    'charlie%20chaplin%20GIF%20by%20Maudit.gif',                       'SILENT ERA COMEDY',            'STILL FUNNIER THAN YOUR MEMES',  5   ),
  gif('gif-date',              'date%20GIF.gif',                                                  'DATE NIGHT:',                  'GOING GREAT',                    4   ),
  gif('gif-funny-gif',         'funny%20gif%20GIF.gif',                                           'UNEXPECTED',                   'EVERY SINGLE TIME',              4   ),
  gif('gif-kid-memory',        'kid%20memory%20GIF%20by%20The%20Videobook.gif',                   'KID LOGIC:',                   'FLAWLESS',                       5   ),
  gif('gif-mr-bean-1',         'mr%20bean%20GIF%20(1).gif',                                       'BEAN HAS ENTERED',             'THE CHAT',                       5   ),
  gif('gif-open-season',       'open%20season%20dancing%20GIF%20by%20Sony%20Pictures%20Animation.gif', 'OPEN SEASON:', 'THE DANCE SCENE WE NEEDED',              5   ),
  gif('gif-pool-lol',          'pool%20lol%20GIF%20by%20America\'s%20Funniest%20Home%20Videos.gif', 'POOL: 1',                    'HUMAN: 0',                       5   ),
  gif('gif-rowan-dancing',     'rowan%20atkinson%20dancing%20GIF.gif',                            'ROWAN ATKINSON',               'IN HIS NATURAL HABITAT',         5   ),
  gif('gif-s-reactions-mr',    's%20reactions%20mr%20GIF.gif',                                    'WHEN YOU SEE IT',              'YOU CANNOT UNSEE IT',            4   ),
  gif('gif-weird',             'weird%20GIF.gif',                                                  'MOOD:',                        'NO FURTHER QUESTIONS',           4   ),
];

// ─── Combined pool ────────────────────────────────────────────────────────────
export const CONTENT = [...GIF_CONTENT];

export const NO_REPEAT_WINDOW = 2;

/**
 * Fisher-Yates array shuffle using provided or default RNG.
 */
export function shuffleArray(arr, rng = secureRandom) {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Creates a cycle-based, without-replacement content deck.
 * Required behavior:
 * 1. Shuffles pool at the start of a cycle.
 * 2. Selects each GIF from the shuffled pool without replacement.
 * 3. Never repeats an already-consumed GIF until every eligible GIF in the cycle has been used.
 * 4. When exhausted, begins a newly shuffled cycle.
 * 5. Avoids repeating the last GIF of a cycle at the start of the next cycle (for pools > 1).
 * 6. Safely handles empty or single-item pools and skips broken assets.
 */
export function createContentDeck(pool = CONTENT, { broken = new Set(), rng = secureRandom } = {}) {
  let deck = [];
  let lastPickedId = null;

  function refill() {
    const usable = pool.filter((item) => !broken.has(item.id));
    if (!usable.length) {
      deck = [];
      return;
    }
    let shuffled = shuffleArray(usable, rng);
    if (shuffled.length > 1 && lastPickedId && shuffled[0].id === lastPickedId) {
      const swapIdx = 1 + Math.floor(rng() * (shuffled.length - 1));
      [shuffled[0], shuffled[swapIdx]] = [shuffled[swapIdx], shuffled[0]];
    }
    deck = shuffled;
  }

  return {
    next() {
      deck = deck.filter((item) => !broken.has(item.id));
      if (!deck.length) {
        refill();
      }
      if (!deck.length) return null;
      const item = deck.shift();
      lastPickedId = item.id;
      return item;
    },
    markBroken(id) {
      broken.add(id);
      deck = deck.filter((item) => item.id !== id);
    },
    get remainingCount() {
      return deck.length;
    },
    reset() {
      deck = [];
      lastPickedId = null;
    },
  };
}

/**
 * Selects the next content item without replacement from the pool.
 * Considers recentIds as consumed items in the current cycle.
 * When the entire pool has been consumed, starts a new cycle avoiding
 * an immediate repeat of the previous item.
 */
export function pickContent(recentIds = [], { broken = new Set(), rng = secureRandom, pool = CONTENT } = {}) {
  const usable = pool.filter((item) => !broken.has(item.id));
  if (!usable.length) return null;
  if (usable.length === 1) return usable[0];

  // Exclude items already consumed in current cycle
  const cycleConsumed = new Set(recentIds.slice(-(usable.length - 1)));
  let candidates = usable.filter((item) => !cycleConsumed.has(item.id));

  // If cycle is exhausted, start a fresh cycle avoiding immediate repeat of last item
  if (!candidates.length) {
    const lastId = recentIds[recentIds.length - 1];
    candidates = usable.filter((item) => item.id !== lastId);
  }

  return candidates.length ? pick(candidates, rng) : pick(usable, rng);
}
