/**
 * Client for the AI judge (Flask: POST /api/wrong-answers/judge).
 * The browser never sees an API key — it only talks to our backend.
 *
 * Outcomes:
 *   { source: 'ai', ...scores }        judged by the AI
 *   { source: 'fallback', reason }     AI unavailable → caller uses backup scoring
 *
 * The backend already retries the AI once; here we only retry once more when
 * the BACKEND itself can't be reached (network error / proxy error).
 */
export const JUDGE_ENDPOINT = `${import.meta.env.VITE_API_BASE ?? ''}/api/wrong-answers/judge`;
export const JUDGE_STATUS_ENDPOINT = `${import.meta.env.VITE_API_BASE ?? ''}/api/wrong-answers/status`;

const METRICS = ['creativity', 'humor', 'originality', 'relevance', 'final_score'];

function isValidJudgement(data) {
  return (
    data?.ok === true &&
    METRICS.every((m) => typeof data[m] === 'number' && Number.isFinite(data[m]) && data[m] >= 0 && data[m] <= 100) &&
    typeof data.feedback === 'string' &&
    data.feedback.trim().length > 0
  );
}

export function createJudgeClient({ endpoint = JUDGE_ENDPOINT, fetchImpl = (...a) => fetch(...a), timeoutMs = 50000 } = {}) {
  async function post(question, answer) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetchImpl(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, answer }), // only what the judge needs
        signal: controller.signal,
      });
      const data = await response.json().catch(() => null);
      return { status: response.status, data };
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * @param {{ question: string, answer: string }} input
   * @param {{ onRetry?: () => void }} [hooks]
   */
  async function judge({ question, answer }, { onRetry } = {}) {
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      let result;
      try {
        result = await post(question, answer);
      } catch {
        result = { status: 0, data: null }; // backend unreachable or timed out
      }
      const { status, data } = result;
      if (status === 200 && isValidJudgement(data)) {
        return {
          source: 'ai',
          creativity: Math.round(data.creativity),
          humor: Math.round(data.humor),
          originality: Math.round(data.originality),
          relevance: Math.round(data.relevance),
          final_score: Math.round(data.final_score * 10) / 10,
          feedback: data.feedback,
          retried: attempt > 1 || data.attempts > 1,
        };
      }
      // The backend answered with a definite "no" (already retried the AI, or not configured,
      // rate limited, invalid) — another request would cost money without helping.
      const backendReached = status !== 0 && status !== 502 && status !== 504 && data !== null;
      if (backendReached || attempt === 2) {
        return { source: 'fallback', reason: data?.reason ?? (status === 0 ? 'unreachable' : `http_${status}`) };
      }
      onRetry?.();
    }
    return { source: 'fallback', reason: 'unreachable' };
  }

  async function status() {
    try {
      const response = await fetchImpl(JUDGE_STATUS_ENDPOINT);
      const data = await response.json();
      return data?.aiConfigured ? 'ready' : 'not_configured';
    } catch {
      return 'unreachable';
    }
  }

  return { judge, status };
}

export const judgeClient = createJudgeClient();
