/** Uniform float in [0, 1) from the browser's cryptographic RNG (falls back to Math.random). */
export function secureRandom() {
  const cryptoApi = globalThis.crypto;
  if (cryptoApi?.getRandomValues) {
    const [value] = cryptoApi.getRandomValues(new Uint32Array(1));
    return value / 2 ** 32;
  }
  return Math.random();
}

export const randomInt = (n, rng = secureRandom) => Math.floor(rng() * n);

export const pick = (items, rng = secureRandom) => items[randomInt(items.length, rng)];

/** Fisher–Yates shuffle (returns a new array). */
export function shuffle(items, rng = secureRandom) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = randomInt(i + 1, rng);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
