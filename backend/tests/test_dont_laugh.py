"""Run with:  python -m unittest discover backend/tests"""
import io
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app import create_app  # noqa: E402
from routes import dont_laugh  # noqa: E402

JPEG = b'\xff\xd8\xff\xe0' + b'\x00' * 2048 + b'\xff\xd9'
PNG = b'\x89PNG\r\n\x1a\n' + b'\x00' * 2048
WEBP = b'RIFF\x00\x00\x00\x00WEBPVP8 ' + b'\x00' * 2048


class CaptureTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.dir = Path(self.tmp.name) / 'captures' / 'dont-laugh'
        self.client = create_app(capture_dir=self.dir).test_client()
        dont_laugh._recent_uploads.clear()

    def tearDown(self):
        self.tmp.cleanup()

    def post(self, data, name='x.jpg'):
        return self.client.post(
            '/api/dont-laugh/capture',
            data={'image': (io.BytesIO(data), name)},
            content_type='multipart/form-data',
        )

    def test_saves_jpeg_with_unique_names(self):
        names = set()
        for _ in range(3):
            res = self.post(JPEG)
            self.assertEqual(res.status_code, 201, res.get_json())
            names.add(res.get_json()['filename'])
        self.assertEqual(len(names), 3)
        for name in names:
            self.assertRegex(name, r'^laugh_\d{8}_\d{6}_[0-9a-f]{8}\.jpg$')
            self.assertEqual((self.dir / name).read_bytes(), JPEG)

    def test_accepts_png_and_webp_by_content(self):
        self.assertTrue(self.post(PNG).get_json()['filename'].endswith('.png'))
        self.assertTrue(self.post(WEBP).get_json()['filename'].endswith('.webp'))

    def test_rejects_non_images_even_with_image_names(self):
        res = self.post(b'<html>' + b'a' * 4096, name='evil.jpg')
        self.assertEqual(res.status_code, 415)
        self.assertFalse(self.dir.exists() and any(self.dir.iterdir()))

    def test_rejects_missing_tiny_and_huge_files(self):
        self.assertEqual(self.client.post('/api/dont-laugh/capture').status_code, 400)
        self.assertEqual(self.post(b'\xff\xd8\xff' + b'\x00' * 10).status_code, 400)
        self.assertEqual(self.post(JPEG[:3] + b'\x00' * (6 * 1024 * 1024)).status_code, 413)

    def test_client_filename_is_ignored(self):
        res = self.post(JPEG, name='../../../etc/passwd.jpg')
        self.assertEqual(res.status_code, 201)
        saved = list(self.dir.iterdir())
        self.assertEqual(len(saved), 1)
        self.assertTrue(saved[0].name.startswith('laugh_'))

    def test_rate_limit(self):
        for _ in range(dont_laugh.RATE_LIMIT):
            self.assertEqual(self.post(JPEG).status_code, 201)
        self.assertEqual(self.post(JPEG).status_code, 429)

    def test_only_post(self):
        # 405, or 404 when the built frontend's catch-all route is active — never a success
        self.assertIn(self.client.get('/api/dont-laugh/capture').status_code, (404, 405))

    def test_cors_headers_and_options_preflight(self):
        # OPTIONS preflight
        opts = self.client.open('/api/dont-laugh/capture', method='OPTIONS')
        self.assertIn(opts.status_code, (200, 204))
        self.assertEqual(opts.headers.get('Access-Control-Allow-Origin'), '*')
        self.assertIn('POST', opts.headers.get('Access-Control-Allow-Methods', ''))

        # CORS on POST
        res = self.post(JPEG)
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.headers.get('Access-Control-Allow-Origin'), '*')

    def test_custom_capture_dir_from_env(self):
        with tempfile.TemporaryDirectory() as env_tmp:
            import os
            custom_dir = str(Path(env_tmp) / 'custom captures' / 'dont-laugh')
            os.environ['DONT_LAUGH_CAPTURE_DIR'] = custom_dir
            try:
                env_app = create_app()
                self.assertEqual(env_app.config['CAPTURE_DIR'], str(Path(custom_dir).resolve()))
                self.assertTrue(Path(custom_dir).is_dir())
            finally:
                os.environ.pop('DONT_LAUGH_CAPTURE_DIR', None)


if __name__ == '__main__':
    unittest.main()
