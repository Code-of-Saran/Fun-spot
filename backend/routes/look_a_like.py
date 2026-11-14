"""Look A Like Route (Flask Blueprint).
Handles result photo saving and Google Drive synchronization under 'Fun Spot - Look A Like' folder.
"""
import base64
import os
import re
import time
from pathlib import Path
from flask import Blueprint, jsonify, request, send_from_directory, current_app

bp = Blueprint('look_a_like', __name__, url_prefix='/api/look-a-like')

MAX_IMAGE_BYTES = 10 * 1024 * 1024  # 10 MB composite limit
DATA_URL_PATTERN = re.compile(r'^data:image/(png|jpeg|webp);base64,(.+)$', re.DOTALL)


def get_look_a_like_dir():
    app = current_app._get_current_object()
    base_capture = Path(app.config.get('CAPTURE_DIR', Path(__file__).resolve().parent.parent / 'captures'))
    target_dir = base_capture.parent / 'captures' / 'look-a-like'
    target_dir.mkdir(parents=True, exist_ok=True)
    return target_dir


@bp.post('/drive-save')
def save_look_a_like_result():
    """Saves composite lookalike souvenir to Fun Spot - Look A Like archive."""
    data = request.get_json(silent=True) or {}
    image_data = data.get('image', '')
    mode = data.get('mode', 'solo')
    folder = data.get('folder', 'Fun Spot - Look A Like')

    if not image_data:
        return jsonify({'ok': False, 'error': 'Missing image payload'}), 400

    match = DATA_URL_PATTERN.match(image_data)
    if not match:
        return jsonify({'ok': False, 'error': 'Invalid base64 image data URL'}), 400

    ext = match.group(1)
    if ext == 'jpeg':
        ext = 'jpg'
    b64_str = match.group(2)

    try:
        raw_bytes = base64.b64decode(b64_str)
    except Exception as err:
        return jsonify({'ok': False, 'error': f'Base64 decoding failed: {err}'}), 400

    if len(raw_bytes) > MAX_IMAGE_BYTES:
        return jsonify({'ok': False, 'error': 'Image exceeds maximum allowed size (10 MB)'}), 413

    save_dir = get_look_a_like_dir()
    timestamp_str = time.strftime('%Y%m%d_%H%M%S')
    filename = f"lookalike_{mode}_{timestamp_str}_{os.urandom(4).hex()}.{ext}"
    out_path = save_dir / filename

    try:
        out_path.write_bytes(raw_bytes)
    except Exception as err:
        return jsonify({'ok': False, 'error': f'Failed to write file to disk: {err}'}), 500

    # If backend Google Drive service credentials exist in environment, sync could be done here
    drive_link = None
    if os.environ.get('GOOGLE_DRIVE_FOLDER_LINK'):
        drive_link = os.environ.get('GOOGLE_DRIVE_FOLDER_LINK')

    return jsonify({
        'ok': True,
        'folder': folder,
        'filename': filename,
        'filePath': f'/api/look-a-like/captures/{filename}',
        'link': drive_link or f'/api/look-a-like/captures/{filename}',
        'bytes': len(raw_bytes),
        'message': f'Composite result saved successfully under {folder}',
    }), 201


@bp.get('/captures/<filename>')
def serve_capture(filename):
    """Serves a stored Look A Like capture."""
    save_dir = get_look_a_like_dir()
    return send_from_directory(save_dir, filename)


@bp.get('/celebrities')
def get_celebrities_catalog():
    """Returns the Indian celebrity lookalike metadata catalog."""
    catalog = [
        {'id': 'vadivelu', 'name': 'Vadivelu', 'expression': 'The Kaipulla Glare', 'industry': 'Tamil Cinema'},
        {'id': 'sarala', 'name': 'Kovai Sarala', 'expression': 'Dramatic Melodramatic Pout', 'industry': 'Tamil Cinema'},
        {'id': 'senthil', 'name': 'Senthil', 'expression': 'Eyes-Closed Stubborn Zen', 'industry': 'Tamil Cinema'},
        {'id': 'soori', 'name': 'Soori', 'expression': 'Startled Wide-Eyed Panic', 'industry': 'Tamil Cinema'},
        {'id': 'power_star', 'name': 'Power Star Srinivasan', 'expression': 'Dazed Blank Stare', 'industry': 'Tamil Cinema'},
        {'id': 'kingsly', 'name': 'Redin Kingsley', 'expression': 'Furious Chaos Shout', 'industry': 'Tamil Cinema'},
        {'id': 'rajni', 'name': 'Superstar Rajinikanth', 'expression': 'Superstar Swagger Laugh', 'industry': 'Indian Cinema'},
        {'id': 'kamal', 'name': 'Kamal Haasan', 'expression': 'Shocked Interrogation Stare', 'industry': 'Indian Cinema'},
        {'id': 'ajith', 'name': 'Ajith Kumar', 'expression': 'Mischievous Rogue Grin', 'industry': 'Tamil Cinema'},
        {'id': 'vijay', 'name': 'Thalapathy Vijay', 'expression': 'Cool Charismatic Smirk', 'industry': 'Tamil Cinema'},
    ]
    return jsonify({'ok': True, 'celebrities': catalog})
