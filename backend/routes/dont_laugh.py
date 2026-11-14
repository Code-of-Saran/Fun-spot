"""Don't Laugh capture storage: POST /api/dont-laugh/capture.

Receives the laugh-moment photo, validates it and saves it under a unique
name in backend/captures/dont-laugh/. Files are never overwritten.
"""
import secrets
import threading
import time
from collections import deque
from datetime import datetime
from pathlib import Path

from flask import Blueprint, current_app, jsonify, request

bp = Blueprint('dont_laugh', __name__, url_prefix='/api/dont-laugh')

MAX_BYTES = 5 * 1024 * 1024
MIN_BYTES = 1024
RATE_LIMIT = 20  # uploads per IP …
RATE_WINDOW_S = 60  # … per minute

# Signature (magic bytes) → extension. The content decides the type, not the client's filename.
SIGNATURES = (
    (b'\xff\xd8\xff', 'jpg'),
    (b'\x89PNG\r\n\x1a\n', 'png'),
)

_recent_uploads = {}
_lock = threading.Lock()


def detect_type(data):
    for signature, ext in SIGNATURES:
        if data.startswith(signature):
            return ext
    if len(data) > 12 and data[:4] == b'RIFF' and data[8:12] == b'WEBP':
        return 'webp'
    return None


def _rate_limited(ip):
    now = time.monotonic()
    with _lock:
        stamps = _recent_uploads.setdefault(ip, deque())
        while stamps and now - stamps[0] > RATE_WINDOW_S:
            stamps.popleft()
        if len(stamps) >= RATE_LIMIT:
            return True
        stamps.append(now)
        return False


def _save_unique(folder, ext, data):
    """laugh_<YYYYMMDD_HHMMSS>_<random>.<ext>, created exclusively so nothing is overwritten."""
    folder.mkdir(parents=True, exist_ok=True)
    for _ in range(10):
        name = f"laugh_{datetime.now():%Y%m%d_%H%M%S}_{secrets.token_hex(4)}.{ext}"
        target_path = folder / name
        try:
            with open(target_path, 'xb') as f:
                f.write(data)
            # Verify file integrity on disk
            if target_path.stat().st_size != len(data):
                target_path.unlink(missing_ok=True)
                raise IOError(f"File size mismatch: wrote {len(data)} bytes, disk has {target_path.stat().st_size}")
            return name
        except FileExistsError:
            continue
        except Exception:
            target_path.unlink(missing_ok=True)
            raise
    raise RuntimeError('could not allocate a unique filename')


def _error(message, status):
    return jsonify({'ok': False, 'error': message}), status


@bp.post('/capture')
def capture():
    if _rate_limited(request.remote_addr or 'unknown'):
        return _error('Too many uploads, slow down.', 429)

    upload = request.files.get('image')
    if upload is None:
        return _error('Missing "image" file field.', 400)

    data = upload.read(MAX_BYTES + 1)
    if len(data) > MAX_BYTES:
        return _error('Image too large (max 5 MB).', 413)
    if len(data) < MIN_BYTES:
        return _error('Image too small to be a photo.', 400)

    ext = detect_type(data)
    if ext is None:
        return _error('Only JPEG, PNG or WebP images are accepted.', 415)

    folder = Path(current_app.config['CAPTURE_DIR'])
    try:
        filename = _save_unique(folder, ext, data)
        # Also mirror save to local fallback directory if different
        fallback = current_app.config.get('LOCAL_FALLBACK_DIR')
        if fallback and Path(fallback).resolve() != folder.resolve():
            try:
                fallback_path = Path(fallback)
                fallback_path.mkdir(parents=True, exist_ok=True)
                (fallback_path / filename).write_bytes(data)
            except Exception as e:
                current_app.logger.warning('Fallback capture write warning: %s', e)
    except (OSError, RuntimeError) as e:
        current_app.logger.exception('Saving capture failed: %s', e)
        return _error('Could not save the image.', 500)

    current_app.logger.info('Saved Don\'t Laugh capture %s (%d bytes) in %s', filename, len(data), folder)
    return jsonify({'ok': True, 'filename': filename, 'bytes': len(data), 'savedTo': str(folder)}), 201
