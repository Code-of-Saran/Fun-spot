"""Run with:  python -m unittest discover backend/tests"""
import base64
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app import create_app  # noqa: E402


class LookALikeTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.dir = Path(self.tmp.name) / 'captures' / 'look-a-like'
        self.app = create_app(capture_dir=self.dir)
        self.app.config['TESTING'] = True
        self.client = self.app.test_client()

    def tearDown(self):
        self.tmp.cleanup()

    def test_get_celebrities_catalog(self):
        res = self.client.get('/api/look-a-like/celebrities')
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data['ok'])
        self.assertGreaterEqual(len(data['celebrities']), 10)
        names = [c['name'] for c in data['celebrities']]
        self.assertIn('Vadivelu', names)
        self.assertIn('Kovai Sarala', names)

    def test_save_look_a_like_result_success(self):
        sample_png = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4'
        data_url = f"data:image/png;base64,{base64.b64encode(sample_png).decode('ascii')}"

        payload = {
            'image': data_url,
            'mode': 'solo',
            'folder': 'Fun Spot - Look A Like',
        }

        res = self.client.post('/api/look-a-like/drive-save', json=payload)
        self.assertEqual(res.status_code, 201)
        data = res.get_json()
        self.assertTrue(data['ok'])
        self.assertEqual(data['folder'], 'Fun Spot - Look A Like')
        self.assertIn('filename', data)
        self.assertIn('filePath', data)

    def test_save_look_a_like_result_invalid_payload(self):
        res = self.client.post('/api/look-a-like/drive-save', json={})
        self.assertEqual(res.status_code, 400)
        data = res.get_json()
        self.assertFalse(data['ok'])
        self.assertIn('Missing image', data['error'])


if __name__ == '__main__':
    unittest.main()
