"""Wrong Answers Only!!: POST /api/wrong-answers/judge  {question, answer} -> judgement.

The API key stays on this server. Requests are validated and size-limited,
rate limited per IP, and identical (question, answer) pairs are served from a
small cache so a double-click never pays for a second AI call.
"""
import threading
import time
from collections import OrderedDict, deque

from flask import Blueprint, jsonify, request

from services import ai_judge

bp = Blueprint('wrong_answers', __name__, url_prefix='/api/wrong-answers')

QUESTION_MAX = 200
ANSWER_MAX = 500
RATE_LIMIT = 30  # judgements per IP per minute
CACHE_SIZE = 200

_lock = threading.Lock()
_recent = {}
_cache = OrderedDict()


def _error(message, status, **extra):
    return jsonify({'ok': False, 'error': message, **extra}), status


def _rate_limited(ip):
    now = time.monotonic()
    with _lock:
        stamps = _recent.setdefault(ip, deque())
        while stamps and now - stamps[0] > 60:
            stamps.popleft()
        if len(stamps) >= RATE_LIMIT:
            return True
        stamps.append(now)
        return False


def _clean(value):
    return ' '.join(value.split()) if isinstance(value, str) else ''


@bp.post('/judge')
def judge():
    body = request.get_json(silent=True)
    if not isinstance(body, dict):
        return _error('Expected a JSON body.', 400)
    question = _clean(body.get('question'))
    answer = (body.get('answer') or '').strip() if isinstance(body.get('answer'), str) else ''

    if not question or len(question) > QUESTION_MAX:
        return _error('Invalid question.', 400)
    if not answer:
        return _error('Answer is empty.', 400)
    if len(answer) > ANSWER_MAX:
        return _error(f'Answer is too long (max {ANSWER_MAX} characters).', 413)
    if _rate_limited(request.remote_addr or 'unknown'):
        return _error('Too many answers — slow down a little.', 429)

    key = (question, answer)
    with _lock:
        cached = _cache.get(key)
    if cached:
        return jsonify({'ok': True, 'source': 'ai', 'cached': True, **cached})

    try:
        judgement = ai_judge.judge_answer(question, answer)
    except ai_judge.JudgeUnavailable as error:
        return _error('AI judge unavailable.', 503, reason=error.reason)

    with _lock:
        _cache[key] = judgement
        while len(_cache) > CACHE_SIZE:
            _cache.popitem(last=False)
    return jsonify({'ok': True, 'source': 'ai', **judgement})


@bp.get('/status')
def status():
    """Lets the UI say up-front whether real AI judging is configured (never exposes the key)."""
    return jsonify({'ok': True, 'aiConfigured': ai_judge.get_provider() is not None})
