/**
 * Uploads Don't Laugh laugh-moment photos to the Flask backend
 * (POST /api/dont-laugh/capture → backend/captures/dont-laugh/).
 *
 * Never throws into the game. If the backend is down, the photo is kept in
 * memory as "pending" (Blob retained) and can be retried manually via Retry Upload
 * or automatically after the next successful upload.
 */
export const CAPTURE_ENDPOINT = `${import.meta.env.VITE_API_BASE ?? ''}/api/dont-laugh/capture`;

export function createCaptureUploader({
  endpoint = CAPTURE_ENDPOINT,
  fetchImpl = (...a) => fetch(...a),
  timeoutMs = 15000,
} = {}) {
  const pending = new Map(); // id → Blob
  const inFlight = new Map(); // id → Promise
  let nextId = 1;

  async function postToUrl(url, blob) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const body = new FormData();
      // Ensure the image field matches backend expectation (request.files.get('image'))
      const filename = blob.type === 'image/png' ? 'laugh.png' : blob.type === 'image/webp' ? 'laugh.webp' : 'laugh.jpg';
      body.append('image', blob, filename);

      const response = await fetchImpl(url, {
        method: 'POST',
        body,
        signal: controller.signal,
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.filename) {
        const errorMsg = data.error || `Upload failed (HTTP ${response.status})`;
        const error = new Error(errorMsg);
        error.status = response.status;
        throw error;
      }
      return { filename: data.filename, bytes: data.bytes ?? blob.size };
    } finally {
      clearTimeout(timer);
    }
  }

  async function send(blob) {
    if (!blob || blob.size === 0) {
      throw new Error('Invalid capture: photo blob is empty');
    }

    // Try primary endpoint first
    try {
      return await postToUrl(endpoint, blob);
    } catch (primaryError) {
      // If primary failed with a network/proxy error and endpoint is a relative URL,
      // try direct localhost:5000 fallback (useful when Vite proxy is inactive or misrouted)
      const isNetworkOrProxyError =
        primaryError.name === 'AbortError' ||
        primaryError.name === 'TypeError' ||
        primaryError.status === 502 ||
        primaryError.status === 504 ||
        primaryError.status === 503;

      const isRelative = typeof endpoint === 'string' && endpoint.startsWith('/');

      if (isNetworkOrProxyError && isRelative && typeof window !== 'undefined') {
        const directFallbacks = [
          'http://127.0.0.1:5000/api/dont-laugh/capture',
          'http://localhost:5000/api/dont-laugh/capture',
        ];
        for (const fallbackUrl of directFallbacks) {
          try {
            return await postToUrl(fallbackUrl, blob);
          } catch {
            // continue to next fallback
          }
        }
      }

      throw primaryError;
    }
  }

  async function flushPending(exceptId) {
    for (const [id, blob] of pending) {
      if (id === exceptId) continue;
      try {
        await send(blob);
        pending.delete(id);
      } catch {
        return; // still offline — try again later
      }
    }
  }

  /**
   * Uploads a capture Blob.
   * Concurrency-safe: deduplicates concurrent requests for the same capture ID.
   *
   * @returns {Promise<{ status: 'saved', filename: string, bytes?: number } | { status: 'local', id: number, error: string }>}
   */
  async function upload(blob, id = nextId++) {
    if (inFlight.has(id)) {
      return inFlight.get(id);
    }

    const task = (async () => {
      try {
        const result = await send(blob);
        pending.delete(id);
        flushPending(id);
        return { status: 'saved', filename: result.filename };
      } catch (error) {
        // Retain original Blob in pending map so participant can retry
        pending.set(id, blob);
        const errorText = error.name === 'AbortError' ? 'Upload timed out' : (error.message || 'Network error');
        return { status: 'local', id, error: errorText };
      } finally {
        inFlight.delete(id);
      }
    })();

    inFlight.set(id, task);
    return task;
  }

  /**
   * Retries one kept-locally photo using the retained Blob.
   */
  function retry(id) {
    if (inFlight.has(id)) {
      return inFlight.get(id);
    }
    const blob = pending.get(id);
    if (!blob) {
      return Promise.resolve({ status: 'local', id, error: 'Capture is no longer available in memory' });
    }
    return upload(blob, id);
  }

  return {
    upload,
    retry,
    hasPending: (id) => pending.has(id),
    getPending: (id) => pending.get(id),
    get pendingCount() {
      return pending.size;
    },
    get isUploading() {
      return inFlight.size > 0;
    },
  };
}

/** App-wide uploader (pending photos survive replays for the whole visit). */
export const captureUploader = createCaptureUploader();
