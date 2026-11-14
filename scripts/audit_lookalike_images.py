"""
Audit tool for Fun Spot Look A Like reference images.
Inspects public/assets/LookALike/Male and public/assets/LookALike/Female.
Analyzes format, dimensions, corruption, blur, exposure, and duplicates.
"""
import os
import sys
import hashlib
import json
from pathlib import Path
from PIL import Image
import cv2
import numpy as np

PROJECT_ROOT = Path(r"C:\project\funspot-main")
LOOKALIKE_DIR = PROJECT_ROOT / "public" / "assets" / "LookALike"
MALE_DIR = LOOKALIKE_DIR / "Male"
FEMALE_DIR = LOOKALIKE_DIR / "Female"

def compute_dhash(image, hash_size=8):
    """Compute difference hash for duplicate/near-duplicate detection."""
    resized = cv2.resize(image, (hash_size + 1, hash_size))
    diff = resized[:, 1:] > resized[:, :-1]
    return sum([2 ** i for (i, v) in enumerate(diff.flatten()) if v])

def audit_image(file_path: Path, folder_category: str):
    filename = file_path.name
    rel_path = file_path.relative_to(LOOKALIKE_DIR).as_posix()
    file_bytes = file_path.read_bytes()
    file_size = len(file_bytes)
    md5_hash = hashlib.md5(file_bytes).hexdigest()

    record = {
        "filename": filename,
        "folderCategory": folder_category,
        "relativePath": rel_path,
        "fileSizeBytes": file_size,
        "md5": md5_hash,
        "extension": file_path.suffix.lower(),
        "actualFormat": "unknown",
        "canOpen": False,
        "width": 0,
        "height": 0,
        "aspectRatio": 0.0,
        "blurScore": 0.0,
        "brightnessScore": 0.0,
        "dhash": None,
        "issues": [],
        "status": "valid",
    }

    # 1. PIL Open & Format Verification
    try:
        with Image.open(file_path) as pil_img:
            record["actualFormat"] = pil_img.format or "UNKNOWN"
            record["width"], record["height"] = pil_img.size
            record["canOpen"] = True
            if record["height"] > 0:
                record["aspectRatio"] = round(record["width"] / record["height"], 3)
            # Verify can read data
            pil_img.verify()
    except Exception as e:
        record["issues"].append(f"Corrupted or unsupported format: {e}")
        record["status"] = "corrupted"
        return record

    # Re-open after verify() to load pixels
    try:
        with Image.open(file_path) as pil_img:
            pil_img.load()
    except Exception as e:
        record["issues"].append(f"Cannot load image pixels: {e}")
        record["status"] = "corrupted"
        return record

    # 2. OpenCV Decode & Processing
    nparr = np.frombuffer(file_bytes, np.uint8)
    cv_img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    if cv_img is None:
        if record["actualFormat"].upper() == "AVIF":
            record["issues"].append("AVIF format — requires browser AVIF support or conversion to standard JPEG/PNG")
            record["status"] = "needs_review"
        else:
            record["issues"].append("OpenCV cannot decode image bytes")
            record["status"] = "invalid"
        return record

    gray = cv2.cvtColor(cv_img, cv2.COLOR_BGR2GRAY)

    # 3. Blur detection (Laplacian variance)
    blur_var = cv2.Laplacian(gray, cv2.CV_64F).var()
    record["blurScore"] = round(blur_var, 2)
    if blur_var < 45.0:
        record["issues"].append(f"Severely blurred (Laplacian variance {blur_var:.1f} < 45)")

    # 4. Brightness / Exposure check
    mean_brightness = float(np.mean(gray))
    record["brightnessScore"] = round(mean_brightness, 1)
    if mean_brightness < 35.0:
        record["issues"].append(f"Severely underexposed / dark (mean {mean_brightness:.1f} < 35)")
    elif mean_brightness > 230.0:
        record["issues"].append(f"Severely overexposed / washed out (mean {mean_brightness:.1f} > 230)")

    # 5. Low resolution check
    if record["width"] < 120 or record["height"] < 120:
        record["issues"].append(f"Very low resolution ({record['width']}x{record['height']})")

    # 6. Compute dHash for duplicate detection
    try:
        record["dhash"] = str(compute_dhash(gray))
    except Exception:
        pass

    if len(record["issues"]) > 0 and record["status"] == "valid":
        record["status"] = "needs_review"

    return record


def main():
    results = {"Male": [], "Female": []}

    print("Auditing Male directory:", MALE_DIR)
    for p in sorted(MALE_DIR.iterdir()):
        if p.is_file():
            results["Male"].append(audit_image(p, "Male"))

    print("Auditing Female directory:", FEMALE_DIR)
    for p in sorted(FEMALE_DIR.iterdir()):
        if p.is_file():
            results["Female"].append(audit_image(p, "Female"))

    all_records = results["Male"] + results["Female"]

    # Detect exact duplicates (MD5)
    md5_map = {}
    for r in all_records:
        md5_map.setdefault(r["md5"], []).append(r)

    # Detect near duplicates (dHash)
    dhash_map = {}
    for r in all_records:
        if r.get("dhash"):
            dhash_map.setdefault(r["dhash"], []).append(r)

    duplicates = []
    for md5, items in md5_map.items():
        if len(items) > 1:
            duplicates.append({
                "type": "exact_md5",
                "files": [i["relativePath"] for i in items]
            })

    for dh, items in dhash_map.items():
        if len(items) > 1 and len(set(i["relativePath"] for i in items)) > 1:
            files = [i["relativePath"] for i in items]
            if not any(set(files) == set(d["files"]) for d in duplicates):
                duplicates.append({
                    "type": "near_duplicate_dhash",
                    "files": files
                })

    # Summary
    male_total = len(results["Male"])
    female_total = len(results["Female"])
    grand_total = male_total + female_total

    valid_count = sum(1 for r in all_records if r["status"] == "valid")
    review_count = sum(1 for r in all_records if r["status"] == "needs_review")
    invalid_count = sum(1 for r in all_records if r["status"] in ("invalid", "corrupted"))

    report = {
        "summary": {
            "totalImages": grand_total,
            "maleCount": male_total,
            "femaleCount": female_total,
            "validCount": valid_count,
            "needsReviewCount": review_count,
            "invalidCount": invalid_count,
            "duplicateCount": len(duplicates)
        },
        "duplicates": duplicates,
        "maleRecords": results["Male"],
        "femaleRecords": results["Female"]
    }

    out_json = PROJECT_ROOT / "scripts" / "lookalike_audit_report.json"
    out_json.parent.mkdir(parents=True, exist_ok=True)
    out_json.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(f"\nAudit completed. Saved report to {out_json}")
    print(f"Total: {grand_total} | Male: {male_total} | Female: {female_total}")
    print(f"Valid: {valid_count} | Needs Review: {review_count} | Invalid: {invalid_count} | Duplicates: {len(duplicates)}")

if __name__ == "__main__":
    main()
