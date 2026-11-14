"""
Physical Storage Verification Script for Don't Laugh Captures.
Tests uploading real image bytes to the backend app configured with:
C:\\project\\funspot access\\backend\\captures\\dont-laugh
and verifies actual filesystem creation, nonzero file size, unique filenames,
and content matching.
"""
import io
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent / 'backend'
sys.path.insert(0, str(BACKEND_DIR))

from app import create_app

TARGET_DIR = Path(r"C:\project\funspot access\backend\captures\dont-laugh")

def run_physical_verification():
    print(f"[Verification] Target storage directory: {TARGET_DIR}")
    assert TARGET_DIR.exists(), f"Target directory does not exist: {TARGET_DIR}"

    app = create_app()
    client = app.test_client()

    # Valid real JPEG header + body
    jpeg_data = (
        b'\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x01\x00H\x00H\x00\x00\xff\xdb\x00C\x00'
        + b'\x08\x06\x06\x07\x06\x05\x08\x07\x07\x07\t\t\x08\n\x0c\x14\r\x0c\x0b\x0b\x0c\x19\x12\x13\x0f'
        + b'\x14\x1d\x1a\x1f\x1e\x1d\x1a\x1c\x1c $.\' ",#\x1c\x1c(7),01444\x1f\'9=82<.342\xff\xc0\x00\x0b'
        + b'\x08\x00\x10\x00\x10\x01\x01\x11\x00\xff\xc4\x00\x1f\x00\x00\x01\x05\x01\x01\x01\x01\x01\x01'
        + b'\x00\x00\x00\x00\x00\x00\x00\x00\x01\x02\x03\x04\x05\x06\x07\x08\t\n\x0b\xff\xda\x00\x08\x01'
        + b'\x01\x00\x00?\x00'
        + (b'\xaa\xbb\xcc\xdd' * 500) # body
        + b'\xff\xd9'
    )
    print(f"[Verification] Generated test JPEG payload: {len(jpeg_data)} bytes")

    # 1. First upload
    res1 = client.post(
        '/api/dont-laugh/capture',
        data={'image': (io.BytesIO(jpeg_data), 'test_laugh1.jpg')},
        content_type='multipart/form-data',
    )
    assert res1.status_code == 201, f"Upload 1 failed with {res1.status_code}: {res1.get_json()}"
    data1 = res1.get_json()
    fn1 = data1['filename']
    print(f"[Verification] Upload 1 returned HTTP 201: filename={fn1}")

    # Check physical file on disk
    file1_path = TARGET_DIR / fn1
    assert file1_path.is_file(), f"Physical file does not exist on disk: {file1_path}"
    assert file1_path.stat().st_size == len(jpeg_data), f"Size mismatch: {file1_path.stat().st_size} != {len(jpeg_data)}"
    assert file1_path.read_bytes() == jpeg_data, "File contents mismatch"
    print(f"[Verification] Confirmed physical write on Windows disk: {file1_path} ({file1_path.stat().st_size} bytes)")

    # 2. Second upload (verify uniqueness and no overwriting)
    jpeg_data2 = jpeg_data + b'\x12\x34'
    res2 = client.post(
        '/api/dont-laugh/capture',
        data={'image': (io.BytesIO(jpeg_data2), 'test_laugh2.jpg')},
        content_type='multipart/form-data',
    )
    assert res2.status_code == 201, f"Upload 2 failed with {res2.status_code}: {res2.get_json()}"
    data2 = res2.get_json()
    fn2 = data2['filename']
    assert fn1 != fn2, "Filenames must be unique"
    file2_path = TARGET_DIR / fn2
    assert file2_path.is_file(), f"Physical file 2 does not exist: {file2_path}"
    assert file2_path.stat().st_size == len(jpeg_data2)
    print(f"[Verification] Confirmed second physical write: {file2_path} ({file2_path.stat().st_size} bytes)")

    # 3. Verify rejection of invalid MIME / content
    invalid_res = client.post(
        '/api/dont-laugh/capture',
        data={'image': (io.BytesIO(b'NOT AN IMAGE FILE' * 100), 'malicious.exe')},
        content_type='multipart/form-data',
    )
    assert invalid_res.status_code == 415, f"Expected 415, got {invalid_res.status_code}"
    print("[Verification] Confirmed non-image rejection (HTTP 415)")

    # 4. Cleanup test files
    file1_path.unlink()
    file2_path.unlink()
    print("[Verification] Cleaned up temporary test files.")
    print("\n>>> ALL PHYSICAL STORAGE VERIFICATIONS PASSED SUCCESSFULLY! <<<")

if __name__ == '__main__':
    run_physical_verification()

