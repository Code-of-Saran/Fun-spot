/**
 * 🔥 Sequence of simple challenges as an explicit state machine:
 * COMBO_STEP_1 → COMBO_STEP_2 → (COMBO_STEP_3) → SUCCESS.
 * Each step is a fresh instance of an existing detector — no mega-detector.
 *
 * @param {{ steps: { detector: string, params: object, label: string }[] }} params
 * @param {Record<string, (params: object) => object>} registry detector factories
 */
export function createComboDetector({ steps }, registry) {
  let index = 0;
  let current = registry[steps[0].detector](steps[0].params);
  let currentProgress = 0;
  const accuracies = [];

  return {
    update(frame) {
      if (index >= steps.length) return state('COMBO COMPLETE!', []);

      const sub = current.update(frame);
      currentProgress = sub.progress;
      const events = [...sub.events];

      if (sub.done) {
        accuracies.push(sub.accuracy);
        events.push({ type: 'step', step: index + 1 });
        index += 1;
        currentProgress = 0;
        if (index < steps.length) current = registry[steps[index].detector](steps[index].params);
        return state(index < steps.length ? `Next: ${steps[index].label}` : 'COMBO COMPLETE!', events, sub.accuracy);
      }
      return state(sub.hint, events, sub.accuracy);
    },
  };

  function state(hint, events, liveAccuracy = 0) {
    const done = index >= steps.length;
    const finished = accuracies.reduce((a, b) => a + b, 0);
    const partial = done ? 0 : liveAccuracy * currentProgress;
    return {
      progress: done ? 1 : (index + currentProgress) / steps.length,
      accuracy: (finished + partial) / steps.length,
      done,
      hint: done ? hint : `STEP ${index + 1}/${steps.length}: ${hint}`,
      stepIndex: Math.min(index, steps.length - 1),
      stepState: done ? 'SUCCESS' : `COMBO_STEP_${index + 1}`,
      events,
    };
  }
}
