import { pick, secureRandom } from '../../utils/random';

/**
 * Original "why" questions — easy to read in two seconds, fun to answer wrongly,
 * and fine for a student + faculty audience. Add more by appending to the list.
 */
const QUESTIONS = [
  'Why does the moon follow your car?',
  'Why do cats ignore humans?',
  'Why does college have attendance?',
  'Why does your laptop become slow during submission?',
  'Why do dogs bark at nothing?',
  'Why was pizza invented?',
  'Why does your phone battery die at the worst moment?',
  'Why do birds fly?',
  'Why does Monday arrive so quickly?',
  'Why does your professor enter the classroom?',
  'Why is the sky blue?',
  'Why do we have homework?',
  'Why does the WiFi disconnect right before a deadline?',
  'Why do socks disappear in the washing machine?',
  'Why do onions make people cry?',
  'Why does the canteen always run out of samosas?',
  'Why do mosquitoes love some people more than others?',
  'Why do we yawn?',
  'Why do zebras have stripes?',
  'Why does toast always land butter-side down?',
  'Why do people sing in the shower?',
  'Why do printers jam when you are in a hurry?',
  'Why is the exam hall always so cold?',
  'Why do traffic lights turn red when you are late?',
  'Why do giraffes have long necks?',
  'Why does chai taste better when it rains?',
  'Why does one person do all the work in a group project?',
  'Why do penguins waddle?',
  'Why does autocorrect change your words?',
  'Why do we need sleep?',
  'Why do ants walk in a straight line?',
  'Why do clocks go clockwise?',
  'Why do bananas turn brown?',
  'Why do elephants never forget?',
  'Why is the last bench the best bench?',
  'Why do pigeons bob their heads?',
  'Why do ceiling fans exist?',
  'Why does everyone’s handwriting get worse in exams?',
  'Why do volcanoes erupt?',
  'Why do fish live in water?',
  'Why do we get hiccups?',
  'Why does the lift stop on every floor when you are late?',
  'Why do snakes shed their skin?',
  'Why do plants need sunlight?',
  'Why does ice cream melt so fast?',
  'Why do we have five fingers?',
  'Why does the projector never work on the first try?',
  'Why do cows moo?',
  'Why do clouds float?',
  'Why is the ocean salty?',
  'Why do people say "bless you" when you sneeze?',
  'Why do rabbits have big ears?',
  'Why can your mom always find things you could not?',
  'Why does the bus arrive right after you start walking?',
  'Why do roosters crow in the morning?',
  'Why does popcorn pop?',
  'Why do we have eyebrows?',
  'Why are the letters on a keyboard in such a weird order?',
  'Why do owls stay awake at night?',
  'Why does the internet need passwords?',
  'Why do leaves change colour?',
  'Why does the class go silent when the HOD walks in?',
  'Why do we have leap years?',
  'Why do squirrels hide nuts?',
  'Why does cheese have holes?',
  'Why do we dream?',
  'Why do frogs croak?',
  'Why do earphones always get tangled?',
  'Why is the Earth round?',
  'Why do chameleons change colour?',
  'Why do clothes take forever to dry in the monsoon?',
  'Why do people reply "k" to long messages?',
  'Why do camels have humps?',
  'Why does the alarm ring just when the dream gets good?',
  'Why do we eat cake on birthdays?',
  'Why does every hostel have someone who wakes up at 5 a.m.?',
  'Why do ducks quack?',
  'Why does the semester end just when you start studying?',
  'Why do robots want to take over the world?',
  'Why does a tech expo need a game called Fun Spot?',
];

export const PROMPTS = QUESTIONS.map((question, index) => ({ id: `q${String(index + 1).padStart(3, '0')}`, question }));

/**
 * Random question for the next round. `used` = ids already asked this game
 * (a fresh list per game): never repeats within a game, and never one of the
 * previous 2 even if the pool were tiny.
 */
export function pickPrompt(used = [], { rng = secureRandom, pool = PROMPTS } = {}) {
  const usedSet = new Set(used);
  const fresh = pool.filter((p) => !usedSet.has(p.id));
  if (fresh.length) return pick(fresh, rng);
  const recent = new Set(used.slice(-2));
  const relaxed = pool.filter((p) => !recent.has(p.id));
  return pick(relaxed.length ? relaxed : pool, rng);
}
