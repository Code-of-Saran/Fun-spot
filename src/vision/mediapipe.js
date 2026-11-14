/**
 * Shared MediaPipe Tasks loader. Tries the self-hosted runtime + models first
 * (public/mediapipe, works offline), then Google's CDN; GPU first, then CPU.
 */
const LOCAL_BASE = `${import.meta.env.BASE_URL}mediapipe`;
const CDN_WASM = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm';
const CDN_MODELS = 'https://storage.googleapis.com/mediapipe-models';

let modulePromise;
const loadModule = () => (modulePromise ??= import('@mediapipe/tasks-vision'));

/**
 * @param {(mp: object, fileset: object, modelPath: string, delegate: 'GPU'|'CPU') => Promise<T>} create
 * @param {{ file: string, cdnPath: string }} model
 * @returns {Promise<T>}
 */
export async function createTask(create, model) {
  const mp = await loadModule();
  const sources = [
    { wasm: `${LOCAL_BASE}/wasm`, model: `${LOCAL_BASE}/models/${model.file}` },
    { wasm: CDN_WASM, model: `${CDN_MODELS}/${model.cdnPath}` },
  ];

  let lastError;
  for (const source of sources) {
    const fileset = await mp.FilesetResolver.forVisionTasks(source.wasm);
    for (const delegate of ['GPU', 'CPU']) {
      try {
        return await create(mp, fileset, source.model, delegate);
      } catch (error) {
        lastError = error;
      }
    }
  }
  throw lastError ?? new Error('Vision task failed to load');
}

/**
 * Wraps a task factory in a cached, retry-safe singleton:
 * one instance is shared across rounds; `dispose()` closes it.
 */
export function createTaskSingleton(factory) {
  let promise = null;
  return {
    load() {
      if (!promise) {
        promise = factory().catch((error) => {
          promise = null; // allow a later retry
          throw error;
        });
      }
      return promise;
    },
    dispose() {
      const current = promise;
      promise = null;
      current?.then((task) => task.close()).catch(() => {});
    },
  };
}
