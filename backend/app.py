"""Fun Spot backend (Flask).

- POST /api/dont-laugh/capture   → saves laugh-moment photos to backend/captures/dont-laugh/
- POST /api/wrong-answers/judge  → AI judge for Wrong Answers Only!! (key stays server-side)
- GET  /api/health
- If the frontend has been built (npm run build), also serves it, so the whole
  expo setup runs from one command:  python backend/app.py  →  http://localhost:5000

During development, `npm run dev` proxies /api to this server (see vite.config.js).
"""
import mimetypes
import os
import sys
from pathlib import Path

from flask import Flask, jsonify, send_from_directory

from routes.dont_laugh import MAX_BYTES, bp as dont_laugh_bp
from routes.wrong_answers import bp as wrong_answers_bp
from routes.look_a_like import bp as look_a_like_bp

BACKEND_DIR = Path(__file__).resolve().parent
DIST_DIR = BACKEND_DIR.parent / 'dist'


def load_env_file(path):
    """Minimal .env reader (KEY=value lines) so secrets like AI_API_KEY stay out of the code.
    Variables already set in the real environment win."""
    if not path.is_file():
        return
    for line in path.read_text(encoding='utf-8').splitlines():
        line = line.strip()
        if not line or line.startswith('#') or '=' not in line:
            continue
        key, value = line.split('=', 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


load_env_file(BACKEND_DIR.parent / '.env')

# Windows' registry can map these wrongly (e.g. .js → text/plain), which breaks ES modules and WASM.
for mime, ext in (('text/javascript', '.js'), ('text/javascript', '.mjs'), ('text/css', '.css'),
                  ('application/wasm', '.wasm'), ('image/svg+xml', '.svg')):
    mimetypes.add_type(mime, ext)


def create_app(capture_dir=None):
    app = Flask(__name__, static_folder=None)

    # Resolve capture directory with priority: parameter > env var > required destination > default
    # Handle Windows paths with spaces correctly.
    env_dir = os.environ.get('DONT_LAUGH_CAPTURE_DIR')
    required_dir = Path(r'C:\project\funspot access\backend\captures\dont-laugh')
    fallback_dir = BACKEND_DIR / 'captures' / 'dont-laugh'

    # Priority: capture_dir parameter (for tests) > env var > required destination > fallback
    raw_dir = capture_dir or env_dir or (required_dir if sys.platform == 'win32' else fallback_dir)
    resolved_dir = Path(raw_dir).resolve()
    resolved_dir.mkdir(parents=True, exist_ok=True)
    app.config['CAPTURE_DIR'] = str(resolved_dir)
    app.config['LOCAL_FALLBACK_DIR'] = str((BACKEND_DIR / 'captures' / 'dont-laugh').resolve())

    app.config['MAX_CONTENT_LENGTH'] = MAX_BYTES + 64 * 1024  # multipart overhead

    # Enable CORS for frontend clients (dev server proxy / direct 5000 access)
    @app.after_request
    def add_cors_headers(response):
        response.headers['Access-Control-Allow-Origin'] = '*'
        response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-Requested-With'
        return response

    @app.route('/api/<path:path>', methods=['OPTIONS'])
    def api_options(path):
        return ('', 204)

    app.register_blueprint(dont_laugh_bp)
    app.register_blueprint(wrong_answers_bp)
    app.register_blueprint(look_a_like_bp)

    @app.get('/api/health')
    def health():
        return jsonify({
            'ok': True,
            'status': 'operational',
            'service': 'Fun Spot Backend',
            'capture_dir': app.config['CAPTURE_DIR']
        })

    @app.errorhandler(413)
    def too_large(_error):
        return jsonify({'ok': False, 'error': 'Image too large (max 5 MB).'}), 413

    if DIST_DIR.is_dir():
        @app.get('/', defaults={'path': ''})
        @app.get('/<path:path>')
        def frontend(path):
            if path.startswith('api/'):
                return jsonify({'ok': False, 'error': 'Not found'}), 404
            if path and (DIST_DIR / path).is_file():
                return send_from_directory(DIST_DIR, path)
            return send_from_directory(DIST_DIR, 'index.html')  # SPA routes

    return app


if __name__ == '__main__':
    # Windows consoles default to cp1252; never crash on a non-ASCII path or message.
    sys.stdout.reconfigure(errors='replace')
    sys.stderr.reconfigure(errors='replace')
    port = int(os.environ.get('PORT', 5000))
    app_instance = create_app()
    print(f'Fun Spot backend on http://localhost:{port}  (captures -> {app_instance.config["CAPTURE_DIR"]})')
    app_instance.run(host='127.0.0.1', port=port, debug=False)
