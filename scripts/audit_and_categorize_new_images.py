import json
import re
from pathlib import Path
from PIL import Image
import cv2
import numpy as np
import hashlib

scratch_dir = Path(r"C:\Users\saran\.gemini\antigravity\brain\95fdd2d1-4b89-402f-b289-938e55222913\scratch\uploaded_lookalike")
audit_path = Path(r"C:\Users\saran\.gemini\antigravity\brain\95fdd2d1-4b89-402f-b289-938e55222913\scratch\uploaded_audit.json")
records = json.loads(audit_path.read_text(encoding="utf-8"))
non_existing = [r for r in records if not r["isExactDuplicate"]]

# Known celebrity name mappings from filenames
KNOWN_NAME_PATTERNS = [
    (r"ajith", "Ajith Kumar", "Ajith_Kumar"),
    (r"aravindsamy", "Arvind Swamy", "Arvind_Swamy"),
    (r"arjun", "Action King Arjun", "Arjun"),
    (r"ashok", "Ashok Selvan", "Ashok_Selvan"),
    (r"dhanush", "Dhanush", "Dhanush"),
    (r"dileep|kunjikoonan|chakkaramuthu", "Dileep", "Dileep"),
    (r"fahadh", "Fahadh Faasil", "Fahadh_Faasil"),
    (r"ganja[-_]karuppu", "Ganja Karuppu", "Ganja_Karuppu"),
    (r"goundamani", "Goundamani", "Goundamani"),
    (r"harish[-_]kalyan", "Harish Kalyan", "Harish_Kalyan"),
    (r"indrans", "Indrans", "Indrans"),
    (r"karthik|karthi", "Karthi", "Karthi"),
    (r"salim[-_]kumar", "Salim Kumar", "Salim_Kumar"),
    (r"kalabhavan[-_]mani|mani\.jpg", "Kalabhavan Mani", "Kalabhavan_Mani"),
    (r"nivin", "Nivin Pauly", "Nivin_Pauly"),
    (r"pandiarajan", "Pandiarajan", "Pandiarajan"),
    (r"paresh[-_]rawal", "Paresh Rawal", "Paresh_Rawal"),
    (r"rajini", "Superstar Rajinikanth", "Rajinikanth"),
    (r"ravimohan|jayam[-_]ravi", "Jayam Ravi", "Jayam_Ravi"),
    (r"sarathkumar", "R. Sarathkumar", "Sarathkumar"),
    (r"sasikumar", "M. Sasikumar", "Sasikumar"),
    (r"simbhu|simbu", "Silambarasan TR", "Silambarasan_TR"),
    (r"soori", "Soori", "Soori"),
    (r"surya|suriya", "Suriya", "Suriya"),
    (r"tovino", "Tovino Thomas", "Tovino_Thomas"),
    (r"vijaysethupathi", "Vijay Sethupathi", "Vijay_Sethupathi"),
    (r"vijay\.jpg", "Thalapathy Vijay", "Thalapathy_Vijay"),
    (r"vikram", "Chiyaan Vikram", "Chiyaan_Vikram"),
    (r"vishal", "Vishal", "Vishal"),
    (r"yash", "Yash", "Yash"),
    # Actress
    (r"keerthy[-_]suresh", "Keerthy Suresh", "Keerthy_Suresh"),
    (r"kovai[-_]sarala", "Kovai Sarala", "Kovai_Sarala"),
    (r"madhumitha", "Jangiri Madhumitha", "Madhumitha"),
    (r"orvashi|urvashi", "Urvashi", "Urvashi"),
    (r"priyanka", "Priyanka Mohan", "Priyanka_Mohan"),
    (r"simran", "Simran", "Simran"),
    (r"trisha", "Trisha Krishnan", "Trisha"),
    (r"vidyullekha|vidyu", "Vidyullekha Raman", "Vidyullekha_Raman"),
]

identified = []
unidentified = []
quality_rejected = []

for r in non_existing:
    fname = r["filename"].lower()
    found_match = None
    for pattern, name, slug in KNOWN_NAME_PATTERNS:
        if re.search(pattern, fname):
            found_match = (name, slug)
            break
            
    is_blurry = r["blur"] < 25.0
    is_tiny = r["width"] < 150 or r["height"] < 150
    is_washed = r["brightness"] < 30 or r["brightness"] > 235
    
    status = "valid"
    issues = []
    if is_blurry:
        issues.append(f"Severely blurry (blur score {r['blur']} < 25)")
        status = "needs_review"
    if is_tiny:
        issues.append(f"Low resolution ({r['width']}x{r['height']})")
        status = "needs_review"
    if is_washed:
        issues.append(f"Extreme exposure ({r['brightness']})")
        status = "needs_review"
        
    info = {
        **r,
        "celebrityName": found_match[0] if found_match else None,
        "celebritySlug": found_match[1] if found_match else None,
        "isVerifiedCelebrity": found_match is not None,
        "qualityStatus": status,
        "qualityIssues": issues
    }
    
    if status == "needs_review":
        quality_rejected.append(info)
    elif found_match:
        identified.append(info)
    else:
        unidentified.append(info)

print(f"Total non-duplicate new images: {len(non_existing)}")
print(f"  Verified celebrity identities with high quality: {len(identified)}")
print(f"  Unidentified celebrity names (generic filenames like images(1).jpe): {len(unidentified)}")
print(f"  Flagged for quality review (blurry/extreme exposure): {len(quality_rejected)}")

print("\n--- Verified Celebrities Added ---")
for x in identified:
    print(f"  [{x['folder']}] {x['celebrityName']} ({x['celebritySlug']}) -> {x['filename']} ({x['width']}x{x['height']}, blur={x['blur']})")

print("\n--- Quality Review Flagged ---")
for x in quality_rejected:
    print(f"  [{x['folder']}] {x['filename']} -> issues: {x['qualityIssues']}")

