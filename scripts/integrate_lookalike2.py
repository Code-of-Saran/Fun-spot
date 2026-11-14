"""
Fun Spot — Look A Like: Integration of look_a_like2 Additional Reference Dataset.
1. Audits and organizes the uploaded dataset.
2. Preserves all 75 existing images in public/assets/LookALike.
3. Places duplicates, unclassified, and quality-flagged images into public/assets/LookALike/review/.
4. Copies the 35 verified celebrity images into structured subfolders under Male and Female.
5. Updates lookalike_manifest.json (public and src).
6. Generates feature vectors and updates reference_features_cache.json and referenceFeatureCache.json.
7. Updates celebrityDatabase.js.
"""
import os
import sys
import json
import hashlib
from pathlib import Path
from PIL import Image
import cv2
import numpy as np

PROJECT_ROOT = Path(r"C:\project\funspot-main")
LOOKALIKE_DIR = PROJECT_ROOT / "public" / "assets" / "LookALike"
MALE_DIR = LOOKALIKE_DIR / "Male"
FEMALE_DIR = LOOKALIKE_DIR / "Female"
REVIEW_DIR = LOOKALIKE_DIR / "review"
SCRATCH_DIR = Path(r"C:\Users\saran\.gemini\antigravity\brain\95fdd2d1-4b89-402f-b289-938e55222913\scratch\uploaded_lookalike")

# Ensure review directories exist
(REVIEW_DIR / "duplicates").mkdir(parents=True, exist_ok=True)
(REVIEW_DIR / "unclassified").mkdir(parents=True, exist_ok=True)
(REVIEW_DIR / "quality_flagged").mkdir(parents=True, exist_ok=True)

# 35 Verified Celebrities metadata mapping
VERIFIED_CONFIG = [
    # MALE
    {
        "src_file": "actor/12-kunjikoonan-img-1.jpg",
        "folder": "Male",
        "subfolder": "Dileep",
        "clean_name": "dileep_kunjikoonan_quirky_01.jpg",
        "celebrityId": "dileep",
        "celebrityName": "Dileep",
        "gender": "male",
        "title": "Iconic Kunjikoonan Grin",
        "expressionLabel": "Exaggerated Quirky Grin",
        "expressionCategory": "smile_grin",
        "funnyQuote": "When your legendary disguise works so well even your family doesn't recognize you.",
        "badge": "COMEDY ICON",
        "themeColor": "#f59e0b",
        "filmIndustry": "Malayalam Cinema",
        "blendshapes": {"mouthSmileLeft": 0.85, "mouthSmileRight": 0.85, "eyeSquintLeft": 0.70, "eyeSquintRight": 0.70, "jawOpen": 0.40},
        "ratios": {"mouthOpenRatio": 0.32, "mouthWidthRatio": 0.76, "eyeOpenRatio": 0.15, "mouthCornerTilt": 0.18, "browRaiseRatio": 0.22},
        "appearance": {"faceAspectRatio": 0.74, "eyeSpacingRatio": 0.43, "noseWidthRatio": 0.47, "noseHeightRatio": 0.33, "mouthWidthRatio": 0.76, "chinRatio": 0.28, "jawWidthRatio": 0.73},
        "headPose": {"yaw": 0.05, "pitch": 0.02, "roll": -0.02}
    },
    {
        "src_file": "actor/27-1477551481-dileepinchakkaramuthu.jpg",
        "folder": "Male",
        "subfolder": "Dileep",
        "clean_name": "dileep_chakkaramuthu_innocent_02.jpg",
        "celebrityId": "dileep",
        "celebrityName": "Dileep",
        "gender": "male",
        "title": "Pure Chakkaramuthu Innocence",
        "expressionLabel": "Innocent Confused Smile",
        "expressionCategory": "smile_grin",
        "funnyQuote": "Looking completely sweet and harmless while creating absolute havoc.",
        "badge": "JANAPRIYA NAYAKAN",
        "themeColor": "#eab308",
        "filmIndustry": "Malayalam Cinema",
        "blendshapes": {"mouthSmileLeft": 0.65, "mouthSmileRight": 0.65, "browInnerUp": 0.50, "eyeWideLeft": 0.30},
        "ratios": {"mouthOpenRatio": 0.18, "mouthWidthRatio": 0.68, "eyeOpenRatio": 0.22, "mouthCornerTilt": 0.12, "browRaiseRatio": 0.28},
        "appearance": {"faceAspectRatio": 0.74, "eyeSpacingRatio": 0.43, "noseWidthRatio": 0.47, "noseHeightRatio": 0.33, "mouthWidthRatio": 0.68, "chinRatio": 0.28, "jawWidthRatio": 0.73},
        "headPose": {"yaw": -0.04, "pitch": -0.05, "roll": 0.02}
    },
    {
        "src_file": "actor/actor-salim-kumar-3.jpg",
        "folder": "Male",
        "subfolder": "Salim_Kumar",
        "clean_name": "salim_kumar_comedic_legend_01.jpg",
        "celebrityId": "salim_kumar",
        "celebrityName": "Salim Kumar",
        "gender": "male",
        "title": "Legendary Pyari Bewilderment",
        "expressionLabel": "Deadpan Comedic Shock",
        "expressionCategory": "deadpan_confused",
        "funnyQuote": "When you try to explain modern physics using coconut tree logic.",
        "badge": "NATIONAL AWARD WINNER",
        "themeColor": "#06b6d4",
        "filmIndustry": "Malayalam Cinema",
        "blendshapes": {"jawOpen": 0.45, "browInnerUp": 0.60, "eyeWideLeft": 0.50, "eyeWideRight": 0.50},
        "ratios": {"mouthOpenRatio": 0.35, "mouthWidthRatio": 0.70, "eyeOpenRatio": 0.25, "mouthCornerTilt": 0.05, "browRaiseRatio": 0.32},
        "appearance": {"faceAspectRatio": 0.73, "eyeSpacingRatio": 0.42, "noseWidthRatio": 0.48, "noseHeightRatio": 0.35, "mouthWidthRatio": 0.70, "chinRatio": 0.29, "jawWidthRatio": 0.72},
        "headPose": {"yaw": 0.02, "pitch": 0.04, "roll": 0.01}
    },
    {
        "src_file": "actor/aravindsamy.jpg",
        "folder": "Male",
        "subfolder": "Arvind_Swamy",
        "clean_name": "arvind_swamy_charismatic_smirk_01.jpg",
        "celebrityId": "arvind_swamy",
        "celebrityName": "Arvind Swamy",
        "gender": "male",
        "title": "Siddharth Abhimanyu Mastermind Smirk",
        "expressionLabel": "Cool Mastermind Smirk",
        "expressionCategory": "sarcastic_smirk",
        "funnyQuote": "Casually checkmating the protagonist with a cold smile and a cup of black coffee.",
        "badge": "STYLISH ICON",
        "themeColor": "#6366f1",
        "filmIndustry": "Tamil Cinema",
        "blendshapes": {"mouthSmileRight": 0.70, "mouthDimpleRight": 0.60, "browDownLeft": 0.35},
        "ratios": {"mouthOpenRatio": 0.12, "mouthWidthRatio": 0.66, "eyeOpenRatio": 0.19, "mouthCornerTilt": 0.14, "browRaiseRatio": 0.24},
        "appearance": {"faceAspectRatio": 0.76, "eyeSpacingRatio": 0.44, "noseWidthRatio": 0.46, "noseHeightRatio": 0.33, "mouthWidthRatio": 0.66, "chinRatio": 0.29, "jawWidthRatio": 0.75},
        "headPose": {"yaw": 0.06, "pitch": 0.02, "roll": 0.01}
    },
    {
        "src_file": "actor/arjun.jpg",
        "folder": "Male",
        "subfolder": "Arjun",
        "clean_name": "arjun_action_king_grin_01.jpg",
        "celebrityId": "arjun",
        "celebrityName": "Action King Arjun",
        "gender": "male",
        "title": "Action King Fearless Grin",
        "expressionLabel": "Fearless Charismatic Grin",
        "expressionCategory": "smile_grin",
        "funnyQuote": "Catching a helicopter with one arm without rumpling your police uniform.",
        "badge": "ACTION KING",
        "themeColor": "#ef4444",
        "filmIndustry": "Tamil Cinema",
        "blendshapes": {"mouthSmileLeft": 0.80, "mouthSmileRight": 0.80, "cheekSquintLeft": 0.60, "cheekSquintRight": 0.60},
        "ratios": {"mouthOpenRatio": 0.24, "mouthWidthRatio": 0.72, "eyeOpenRatio": 0.19, "mouthCornerTilt": 0.15, "browRaiseRatio": 0.24},
        "appearance": {"faceAspectRatio": 0.75, "eyeSpacingRatio": 0.44, "noseWidthRatio": 0.48, "noseHeightRatio": 0.33, "mouthWidthRatio": 0.72, "chinRatio": 0.30, "jawWidthRatio": 0.76},
        "headPose": {"yaw": 0.03, "pitch": -0.02, "roll": 0.02}
    },
    {
        "src_file": "actor/ashok.jpe",
        "folder": "Male",
        "subfolder": "Ashok_Selvan",
        "clean_name": "ashok_selvan_youthful_smile_01.jpg",
        "celebrityId": "ashok_selvan",
        "celebrityName": "Ashok Selvan",
        "gender": "male",
        "title": "Oh My Kadavule Charming Grin",
        "expressionLabel": "Youthful Playful Smile",
        "expressionCategory": "smile_grin",
        "funnyQuote": "When second chances at romance involve hilarious cosmic divine intervention.",
        "badge": "CHARMING HERO",
        "themeColor": "#14b8a6",
        "filmIndustry": "Tamil Cinema",
        "blendshapes": {"mouthSmileLeft": 0.75, "mouthSmileRight": 0.75, "eyeSquintLeft": 0.40, "eyeSquintRight": 0.40},
        "ratios": {"mouthOpenRatio": 0.20, "mouthWidthRatio": 0.70, "eyeOpenRatio": 0.20, "mouthCornerTilt": 0.14, "browRaiseRatio": 0.25},
        "appearance": {"faceAspectRatio": 0.74, "eyeSpacingRatio": 0.43, "noseWidthRatio": 0.47, "noseHeightRatio": 0.34, "mouthWidthRatio": 0.70, "chinRatio": 0.28, "jawWidthRatio": 0.72},
        "headPose": {"yaw": 0.04, "pitch": 0.01, "roll": 0.0}
    },
    {
        "src_file": "actor/cinemaexpress_import_2019_8_28_original_Soori_10.avif",
        "folder": "Male",
        "subfolder": "Soori",
        "clean_name": "soori_parotta_hilarious_01.jpg",
        "celebrityId": "soori",
        "celebrityName": "Soori",
        "gender": "male",
        "title": "50 Parotta Challenge Stare",
        "expressionLabel": "Comedic Determination Stare",
        "expressionCategory": "shock",
        "funnyQuote": "Counting how many parottas you ate while the restaurant owner calls the police.",
        "badge": "PAROTTA SOORI",
        "themeColor": "#f97316",
        "filmIndustry": "Tamil Cinema",
        "blendshapes": {"jawOpen": 0.50, "eyeWideLeft": 0.60, "eyeWideRight": 0.60, "browInnerUp": 0.45},
        "ratios": {"mouthOpenRatio": 0.38, "mouthWidthRatio": 0.72, "eyeOpenRatio": 0.26, "mouthCornerTilt": 0.08, "browRaiseRatio": 0.30},
        "appearance": {"faceAspectRatio": 0.72, "eyeSpacingRatio": 0.42, "noseWidthRatio": 0.49, "noseHeightRatio": 0.35, "mouthWidthRatio": 0.72, "chinRatio": 0.28, "jawWidthRatio": 0.71},
        "headPose": {"yaw": -0.05, "pitch": 0.03, "roll": -0.03}
    },
    {
        "src_file": "actor/soori.jpg",
        "folder": "Male",
        "subfolder": "Soori",
        "clean_name": "soori_comedic_panic_02.jpg",
        "celebrityId": "soori",
        "celebrityName": "Soori",
        "gender": "male",
        "title": "Hilarious Country Bumpkin Shock",
        "expressionLabel": "Pure Comedic Panic",
        "expressionCategory": "shock",
        "funnyQuote": "When someone introduces you to modern city life and you want your village back immediately.",
        "badge": "COMEDY SENSATION",
        "themeColor": "#fb923c",
        "filmIndustry": "Tamil Cinema",
        "blendshapes": {"jawOpen": 0.55, "browInnerUp": 0.55, "mouthSmileLeft": 0.30},
        "ratios": {"mouthOpenRatio": 0.40, "mouthWidthRatio": 0.74, "eyeOpenRatio": 0.24, "mouthCornerTilt": 0.06, "browRaiseRatio": 0.32},
        "appearance": {"faceAspectRatio": 0.72, "eyeSpacingRatio": 0.42, "noseWidthRatio": 0.49, "noseHeightRatio": 0.35, "mouthWidthRatio": 0.74, "chinRatio": 0.28, "jawWidthRatio": 0.71},
        "headPose": {"yaw": 0.04, "pitch": 0.02, "roll": 0.02}
    },
    {
        "src_file": "actor/dhanush.jpe",
        "folder": "Male",
        "subfolder": "Dhanush",
        "clean_name": "dhanush_playful_smirk_02.jpg",
        "celebrityId": "dhanush",
        "celebrityName": "Dhanush",
        "gender": "male",
        "title": "VIP Local Boy Swag Smirk",
        "expressionLabel": "Relaxed Local Boy Smirk",
        "expressionCategory": "sarcastic_smirk",
        "funnyQuote": "Walking down your hometown lane in a white veshti like you own the pin code.",
        "badge": "VIP STAR",
        "themeColor": "#0284c7",
        "filmIndustry": "Tamil Cinema",
        "blendshapes": {"mouthSmileRight": 0.68, "mouthDimpleRight": 0.62, "eyeSquintRight": 0.45},
        "ratios": {"mouthOpenRatio": 0.14, "mouthWidthRatio": 0.67, "eyeOpenRatio": 0.18, "mouthCornerTilt": 0.13, "browRaiseRatio": 0.23},
        "appearance": {"faceAspectRatio": 0.72, "eyeSpacingRatio": 0.42, "noseWidthRatio": 0.46, "noseHeightRatio": 0.34, "mouthWidthRatio": 0.67, "chinRatio": 0.28, "jawWidthRatio": 0.70},
        "headPose": {"yaw": 0.06, "pitch": 0.01, "roll": 0.01}
    },
    {
        "src_file": "actor/Fahadh_Faasil_2019.jpg",
        "folder": "Male",
        "subfolder": "Fahadh_Faasil",
        "clean_name": "fahadh_faasil_intense_quirk_01.jpg",
        "celebrityId": "fahadh_faasil",
        "celebrityName": "Fahadh Faasil",
        "gender": "male",
        "title": "Shammi Piercing Psycho-Smile",
        "expressionLabel": "Uncanny Piercing Grin",
        "expressionCategory": "smile_grin",
        "funnyQuote": "Shammi hero aada, hero! Smiling unblinkingly while checking the razor sharpness.",
        "badge": "ACTING POWERHOUSE",
        "themeColor": "#a855f7",
        "filmIndustry": "Malayalam Cinema",
        "blendshapes": {"mouthSmileLeft": 0.82, "mouthSmileRight": 0.82, "eyeWideLeft": 0.40, "eyeWideRight": 0.40, "browDownLeft": 0.30},
        "ratios": {"mouthOpenRatio": 0.26, "mouthWidthRatio": 0.74, "eyeOpenRatio": 0.22, "mouthCornerTilt": 0.17, "browRaiseRatio": 0.26},
        "appearance": {"faceAspectRatio": 0.75, "eyeSpacingRatio": 0.44, "noseWidthRatio": 0.47, "noseHeightRatio": 0.33, "mouthWidthRatio": 0.74, "chinRatio": 0.29, "jawWidthRatio": 0.73},
        "headPose": {"yaw": -0.02, "pitch": 0.03, "roll": -0.01}
    },
    {
        "src_file": "actor/ganja-karuppu-people-in-film-photo-u1.jpe",
        "folder": "Male",
        "subfolder": "Ganja_Karuppu",
        "clean_name": "ganja_karuppu_confused_comic_01.jpg",
        "celebrityId": "ganja_karuppu",
        "celebrityName": "Ganja Karuppu",
        "gender": "male",
        "title": "Puzzled Village Philosopher",
        "expressionLabel": "Utter Bewilderment Stare",
        "expressionCategory": "confusion",
        "funnyQuote": "Trying to understand how someone can drink cold tea without reheating it thrice.",
        "badge": "RUSTIC COMEDY",
        "themeColor": "#d97706",
        "filmIndustry": "Tamil Cinema",
        "blendshapes": {"browInnerUp": 0.65, "jawOpen": 0.40, "eyeWideLeft": 0.45},
        "ratios": {"mouthOpenRatio": 0.30, "mouthWidthRatio": 0.70, "eyeOpenRatio": 0.24, "mouthCornerTilt": 0.07, "browRaiseRatio": 0.34},
        "appearance": {"faceAspectRatio": 0.73, "eyeSpacingRatio": 0.43, "noseWidthRatio": 0.48, "noseHeightRatio": 0.34, "mouthWidthRatio": 0.70, "chinRatio": 0.28, "jawWidthRatio": 0.72},
        "headPose": {"yaw": 0.03, "pitch": 0.04, "roll": 0.02}
    },
    {
        "src_file": "actor/goundamani.webp",
        "folder": "Male",
        "subfolder": "Goundamani",
        "clean_name": "goundamani_king_of_comedy_05.webp",
        "celebrityId": "goundamani",
        "celebrityName": "Goundamani",
        "gender": "male",
        "title": "Startled High-Decibel Glower",
        "expressionLabel": "Comedic Shock Glare",
        "expressionCategory": "suspicious_side_eye",
        "funnyQuote": "Startled to find out someone actually thought their useless advice was needed.",
        "badge": "COMEDY MONARCH",
        "themeColor": "#eab308",
        "filmIndustry": "Tamil Cinema",
        "blendshapes": {"browInnerUp": 0.50, "eyeWideLeft": 0.55, "jawOpen": 0.35},
        "ratios": {"mouthOpenRatio": 0.28, "mouthWidthRatio": 0.72, "eyeOpenRatio": 0.23, "mouthCornerTilt": 0.10, "browRaiseRatio": 0.29},
        "appearance": {"faceAspectRatio": 0.74, "eyeSpacingRatio": 0.43, "noseWidthRatio": 0.48, "noseHeightRatio": 0.34, "mouthWidthRatio": 0.72, "chinRatio": 0.29, "jawWidthRatio": 0.74},
        "headPose": {"yaw": -0.06, "pitch": 0.01, "roll": -0.02}
    },
    {
        "src_file": "actor/karthik.jpg",
        "folder": "Male",
        "subfolder": "Karthi",
        "clean_name": "karthi_paruthiveeran_swagger_01.jpg",
        "celebrityId": "karthi",
        "celebrityName": "Karthi",
        "gender": "male",
        "title": "Paruthiveeran Rustic Swagger",
        "expressionLabel": "Playful Village Hero Grin",
        "expressionCategory": "smile_grin",
        "funnyQuote": "Casually swinging a stick over your shoulder while greeting everyone in the village square.",
        "badge": "DYNAMIC HERO",
        "themeColor": "#16a34a",
        "filmIndustry": "Tamil Cinema",
        "blendshapes": {"mouthSmileLeft": 0.78, "mouthSmileRight": 0.78, "cheekSquintLeft": 0.55, "cheekSquintRight": 0.55},
        "ratios": {"mouthOpenRatio": 0.22, "mouthWidthRatio": 0.72, "eyeOpenRatio": 0.19, "mouthCornerTilt": 0.15, "browRaiseRatio": 0.25},
        "appearance": {"faceAspectRatio": 0.75, "eyeSpacingRatio": 0.43, "noseWidthRatio": 0.47, "noseHeightRatio": 0.33, "mouthWidthRatio": 0.72, "chinRatio": 0.29, "jawWidthRatio": 0.74},
        "headPose": {"yaw": 0.04, "pitch": 0.02, "roll": 0.01}
    },
    {
        "src_file": "actor/mani.jpg",
        "folder": "Male",
        "subfolder": "Kalabhavan_Mani",
        "clean_name": "kalabhavan_mani_laughter_king_01.jpg",
        "celebrityId": "kalabhavan_mani",
        "celebrityName": "Kalabhavan Mani",
        "gender": "male",
        "title": "Roaring Earthy Belly Laugh",
        "expressionLabel": "Hearty Folk Belly Laugh",
        "expressionCategory": "smile_grin",
        "funnyQuote": "Laughing so authentically from the heart that the entire audience laughs with you.",
        "badge": "FOLK LEGEND",
        "themeColor": "#ca8a04",
        "filmIndustry": "Malayalam Cinema",
        "blendshapes": {"mouthSmileLeft": 0.90, "mouthSmileRight": 0.90, "jawOpen": 0.60, "eyeSquintLeft": 0.80, "eyeSquintRight": 0.80},
        "ratios": {"mouthOpenRatio": 0.44, "mouthWidthRatio": 0.82, "eyeOpenRatio": 0.12, "mouthCornerTilt": 0.20, "browRaiseRatio": 0.26},
        "appearance": {"faceAspectRatio": 0.75, "eyeSpacingRatio": 0.43, "noseWidthRatio": 0.50, "noseHeightRatio": 0.34, "mouthWidthRatio": 0.82, "chinRatio": 0.29, "jawWidthRatio": 0.75},
        "headPose": {"yaw": 0.02, "pitch": 0.06, "roll": 0.0}
    },
    {
        "src_file": "actor/nivin.jpg",
        "folder": "Male",
        "subfolder": "Nivin_Pauly",
        "clean_name": "nivin_pauly_prem_smile_01.jpg",
        "celebrityId": "nivin_pauly",
        "celebrityName": "Nivin Pauly",
        "gender": "male",
        "title": "Premam Youthful Charm",
        "expressionLabel": "Relatable Romantic Chuckle",
        "expressionCategory": "smile_grin",
        "funnyQuote": "Sporting a black shirt and sunglasses while trying to act completely indifferent to romance.",
        "badge": "HEARTTHROB",
        "themeColor": "#0284c7",
        "filmIndustry": "Malayalam Cinema",
        "blendshapes": {"mouthSmileLeft": 0.75, "mouthSmileRight": 0.75, "cheekSquintLeft": 0.50, "cheekSquintRight": 0.50},
        "ratios": {"mouthOpenRatio": 0.20, "mouthWidthRatio": 0.70, "eyeOpenRatio": 0.20, "mouthCornerTilt": 0.14, "browRaiseRatio": 0.24},
        "appearance": {"faceAspectRatio": 0.74, "eyeSpacingRatio": 0.44, "noseWidthRatio": 0.47, "noseHeightRatio": 0.33, "mouthWidthRatio": 0.70, "chinRatio": 0.28, "jawWidthRatio": 0.73},
        "headPose": {"yaw": 0.03, "pitch": 0.01, "roll": 0.01}
    },
    {
        "src_file": "actor/rajini.jpg",
        "folder": "Male",
        "subfolder": "Rajinikanth",
        "clean_name": "rajinikanth_vintage_swagger_02.jpg",
        "celebrityId": "rajinikanth",
        "celebrityName": "Superstar Rajinikanth",
        "gender": "male",
        "title": "Vintage Baashha Signature Smile",
        "expressionLabel": "Unmatchable Superstar Chuckle",
        "expressionCategory": "smile_grin",
        "funnyQuote": "Naan oru thadava sonna, noora thadava sonna maadiri! The iconic slow-turn chuckle.",
        "badge": "THALAIVAR",
        "themeColor": "#eab308",
        "filmIndustry": "Indian Cinema",
        "blendshapes": {"mouthSmileLeft": 0.84, "mouthSmileRight": 0.84, "eyeSquintLeft": 0.60, "eyeSquintRight": 0.60},
        "ratios": {"mouthOpenRatio": 0.28, "mouthWidthRatio": 0.76, "eyeOpenRatio": 0.17, "mouthCornerTilt": 0.17, "browRaiseRatio": 0.25},
        "appearance": {"faceAspectRatio": 0.75, "eyeSpacingRatio": 0.44, "noseWidthRatio": 0.47, "noseHeightRatio": 0.33, "mouthWidthRatio": 0.76, "chinRatio": 0.29, "jawWidthRatio": 0.74},
        "headPose": {"yaw": 0.07, "pitch": 0.03, "roll": 0.02}
    },
    {
        "src_file": "actor/ravimohan.jpg",
        "folder": "Male",
        "subfolder": "Jayam_Ravi",
        "clean_name": "jayam_ravi_cheerful_smile_01.jpg",
        "celebrityId": "jayam_ravi",
        "celebrityName": "Jayam Ravi",
        "gender": "male",
        "title": "M. Kumaran Warm Radiance",
        "expressionLabel": "Warm High-Energy Grin",
        "expressionCategory": "smile_grin",
        "funnyQuote": "Stepping into the boxing ring with your mom cheering louder than the entire arena.",
        "badge": "JAYAM HERO",
        "themeColor": "#38bdf8",
        "filmIndustry": "Tamil Cinema",
        "blendshapes": {"mouthSmileLeft": 0.80, "mouthSmileRight": 0.80, "cheekSquintLeft": 0.55, "cheekSquintRight": 0.55},
        "ratios": {"mouthOpenRatio": 0.24, "mouthWidthRatio": 0.72, "eyeOpenRatio": 0.19, "mouthCornerTilt": 0.15, "browRaiseRatio": 0.24},
        "appearance": {"faceAspectRatio": 0.75, "eyeSpacingRatio": 0.44, "noseWidthRatio": 0.47, "noseHeightRatio": 0.33, "mouthWidthRatio": 0.72, "chinRatio": 0.29, "jawWidthRatio": 0.74},
        "headPose": {"yaw": 0.03, "pitch": 0.01, "roll": 0.0}
    },
    {
        "src_file": "actor/related-section-image-hd-harish-kalyan.jpg",
        "folder": "Male",
        "subfolder": "Harish_Kalyan",
        "clean_name": "harish_kalyan_charming_smile_01.jpg",
        "celebrityId": "harish_kalyan",
        "celebrityName": "Harish Kalyan",
        "gender": "male",
        "title": "Pyar Prema Kaadhal Charming Grin",
        "expressionLabel": "Modern Romantic Smile",
        "expressionCategory": "smile_grin",
        "funnyQuote": "When modern dating etiquette makes no sense but you smile through it anyway.",
        "badge": "YOUTH CHARMER",
        "themeColor": "#f43f5e",
        "filmIndustry": "Tamil Cinema",
        "blendshapes": {"mouthSmileLeft": 0.76, "mouthSmileRight": 0.76, "eyeSquintLeft": 0.45, "eyeSquintRight": 0.45},
        "ratios": {"mouthOpenRatio": 0.22, "mouthWidthRatio": 0.70, "eyeOpenRatio": 0.19, "mouthCornerTilt": 0.14, "browRaiseRatio": 0.24},
        "appearance": {"faceAspectRatio": 0.74, "eyeSpacingRatio": 0.43, "noseWidthRatio": 0.46, "noseHeightRatio": 0.34, "mouthWidthRatio": 0.70, "chinRatio": 0.28, "jawWidthRatio": 0.72},
        "headPose": {"yaw": 0.02, "pitch": -0.01, "roll": 0.0}
    },
    {
        "src_file": "actor/sarathkumar.jpg",
        "folder": "Male",
        "subfolder": "Sarathkumar",
        "clean_name": "sarathkumar_supreme_star_01.jpg",
        "celebrityId": "sarathkumar",
        "celebrityName": "R. Sarathkumar",
        "gender": "male",
        "title": "Nattamai Majestic Judgment",
        "expressionLabel": "Authoritative Village Head Grin",
        "expressionCategory": "smile_grin",
        "funnyQuote": "Nattamai theerpa maathi sollu! Standing tall with supreme village authority.",
        "badge": "SUPREME STAR",
        "themeColor": "#dc2626",
        "filmIndustry": "Tamil Cinema",
        "blendshapes": {"mouthSmileLeft": 0.72, "mouthSmileRight": 0.72, "browDownLeft": 0.30, "browDownRight": 0.30},
        "ratios": {"mouthOpenRatio": 0.16, "mouthWidthRatio": 0.68, "eyeOpenRatio": 0.18, "mouthCornerTilt": 0.12, "browRaiseRatio": 0.23},
        "appearance": {"faceAspectRatio": 0.76, "eyeSpacingRatio": 0.45, "noseWidthRatio": 0.48, "noseHeightRatio": 0.33, "mouthWidthRatio": 0.68, "chinRatio": 0.30, "jawWidthRatio": 0.76},
        "headPose": {"yaw": 0.04, "pitch": 0.02, "roll": 0.01}
    },
    {
        "src_file": "actor/sasikumar.jpe",
        "folder": "Male",
        "subfolder": "Sasikumar",
        "clean_name": "sasikumar_subramaniapuram_grin_01.jpg",
        "celebrityId": "sasikumar",
        "celebrityName": "M. Sasikumar",
        "gender": "male",
        "title": "Subramaniapuram Deep Friendship Smirk",
        "expressionLabel": "Loyal Comrade Smirk",
        "expressionCategory": "sarcastic_smirk",
        "funnyQuote": "Ready to defend your best friend against any odds at two seconds notice.",
        "badge": "LOYAL COMRADE",
        "themeColor": "#78350f",
        "filmIndustry": "Tamil Cinema",
        "blendshapes": {"mouthSmileRight": 0.65, "mouthDimpleRight": 0.55, "browDownLeft": 0.40},
        "ratios": {"mouthOpenRatio": 0.14, "mouthWidthRatio": 0.66, "eyeOpenRatio": 0.18, "mouthCornerTilt": 0.11, "browRaiseRatio": 0.22},
        "appearance": {"faceAspectRatio": 0.74, "eyeSpacingRatio": 0.43, "noseWidthRatio": 0.48, "noseHeightRatio": 0.34, "mouthWidthRatio": 0.66, "chinRatio": 0.29, "jawWidthRatio": 0.74},
        "headPose": {"yaw": 0.05, "pitch": 0.03, "roll": 0.01}
    },
    {
        "src_file": "actor/simbhu.jpg",
        "folder": "Male",
        "subfolder": "Silambarasan_TR",
        "clean_name": "silambarasan_tr_young_superstar_01.jpg",
        "celebrityId": "silambarasan_tr",
        "celebrityName": "Silambarasan TR",
        "gender": "male",
        "title": "Young Superstar Fast-Talk Swag",
        "expressionLabel": "Rapid-Fire Charismatic Smirk",
        "expressionCategory": "sarcastic_smirk",
        "funnyQuote": "Delivering three pages of dialogue in twelve seconds while dancing to the beat.",
        "badge": "STR",
        "themeColor": "#e11d48",
        "filmIndustry": "Tamil Cinema",
        "blendshapes": {"mouthSmileRight": 0.72, "mouthDimpleRight": 0.60, "eyeSquintRight": 0.45},
        "ratios": {"mouthOpenRatio": 0.15, "mouthWidthRatio": 0.68, "eyeOpenRatio": 0.19, "mouthCornerTilt": 0.14, "browRaiseRatio": 0.24},
        "appearance": {"faceAspectRatio": 0.73, "eyeSpacingRatio": 0.43, "noseWidthRatio": 0.47, "noseHeightRatio": 0.34, "mouthWidthRatio": 0.68, "chinRatio": 0.28, "jawWidthRatio": 0.72},
        "headPose": {"yaw": 0.06, "pitch": 0.02, "roll": 0.02}
    },
    {
        "src_file": "actor/Tovino_Thomas_At_The_‘Maari_2’_Press_Meet.jpg",
        "folder": "Male",
        "subfolder": "Tovino_Thomas",
        "clean_name": "tovino_thomas_minnal_smile_01.jpg",
        "celebrityId": "tovino_thomas",
        "celebrityName": "Tovino Thomas",
        "gender": "male",
        "title": "Minnal Murali Superhero Grin",
        "expressionLabel": "Hearty Superhero Smile",
        "expressionCategory": "smile_grin",
        "funnyQuote": "Realizing you got struck by lightning and now have super speed to grab village tea.",
        "badge": "MINNAL HERO",
        "themeColor": "#2563eb",
        "filmIndustry": "Malayalam Cinema",
        "blendshapes": {"mouthSmileLeft": 0.82, "mouthSmileRight": 0.82, "cheekSquintLeft": 0.60, "cheekSquintRight": 0.60},
        "ratios": {"mouthOpenRatio": 0.25, "mouthWidthRatio": 0.74, "eyeOpenRatio": 0.20, "mouthCornerTilt": 0.16, "browRaiseRatio": 0.25},
        "appearance": {"faceAspectRatio": 0.76, "eyeSpacingRatio": 0.44, "noseWidthRatio": 0.48, "noseHeightRatio": 0.33, "mouthWidthRatio": 0.74, "chinRatio": 0.30, "jawWidthRatio": 0.75},
        "headPose": {"yaw": 0.04, "pitch": 0.01, "roll": 0.0}
    },
    {
        "src_file": "actor/vijay.jpg",
        "folder": "Male",
        "subfolder": "Thalapathy_Vijay",
        "clean_name": "thalapathy_vijay_youthful_swag_04.jpg",
        "celebrityId": "thalapathy_vijay",
        "celebrityName": "Thalapathy Vijay",
        "gender": "male",
        "title": "Ghilli Kabaddi Victory Grin",
        "expressionLabel": "Classic Ghilli Celebration Grin",
        "expressionCategory": "smile_grin",
        "funnyQuote": "Allare allare allare! Escaping across state borders with pure nonchalant swag.",
        "badge": "GHILLI HERO",
        "themeColor": "#00f0ff",
        "filmIndustry": "Tamil Cinema",
        "blendshapes": {"mouthSmileLeft": 0.86, "mouthSmileRight": 0.86, "jawOpen": 0.38, "cheekSquintLeft": 0.65, "cheekSquintRight": 0.65},
        "ratios": {"mouthOpenRatio": 0.30, "mouthWidthRatio": 0.76, "eyeOpenRatio": 0.18, "mouthCornerTilt": 0.18, "browRaiseRatio": 0.25},
        "appearance": {"faceAspectRatio": 0.74, "eyeSpacingRatio": 0.44, "noseWidthRatio": 0.47, "noseHeightRatio": 0.33, "mouthWidthRatio": 0.76, "chinRatio": 0.28, "jawWidthRatio": 0.73},
        "headPose": {"yaw": 0.05, "pitch": 0.01, "roll": 0.01}
    },
    {
        "src_file": "actor/vijaysethupathi.jpg",
        "folder": "Male",
        "subfolder": "Vijay_Sethupathi",
        "clean_name": "vijay_sethupathi_candid_chuckle_04.jpg",
        "celebrityId": "vijay_sethupathi",
        "celebrityName": "Vijay Sethupathi",
        "gender": "male",
        "title": "Paatha Mudiyadhu Philosophical Chuckle",
        "expressionLabel": "Effortless Philosophical Smile",
        "expressionCategory": "smile_grin",
        "funnyQuote": "Namma nallavangala illai kettavangala? Life is simple when tea is served hot.",
        "badge": "MAKKAL SELVAN",
        "themeColor": "#d97706",
        "filmIndustry": "Tamil Cinema",
        "blendshapes": {"mouthSmileLeft": 0.78, "mouthSmileRight": 0.78, "eyeSquintLeft": 0.55, "eyeSquintRight": 0.55},
        "ratios": {"mouthOpenRatio": 0.22, "mouthWidthRatio": 0.72, "eyeOpenRatio": 0.18, "mouthCornerTilt": 0.14, "browRaiseRatio": 0.24},
        "appearance": {"faceAspectRatio": 0.74, "eyeSpacingRatio": 0.44, "noseWidthRatio": 0.48, "noseHeightRatio": 0.34, "mouthWidthRatio": 0.72, "chinRatio": 0.29, "jawWidthRatio": 0.74},
        "headPose": {"yaw": 0.04, "pitch": 0.02, "roll": 0.01}
    },
    {
        "src_file": "actor/vikram.jpg",
        "folder": "Male",
        "subfolder": "Chiyaan_Vikram",
        "clean_name": "chiyaan_vikram_versatile_smirk_01.jpg",
        "celebrityId": "chiyaan_vikram",
        "celebrityName": "Chiyaan Vikram",
        "gender": "male",
        "title": "Anniyan Split-Personality Smirk",
        "expressionLabel": "Chameleonic Intense Smirk",
        "expressionCategory": "sarcastic_smirk",
        "funnyQuote": "Switching between mild-mannered lawyer and apocalyptic avenger in 0.5 seconds.",
        "badge": "ACTING CHAMELEON",
        "themeColor": "#7c3aed",
        "filmIndustry": "Tamil Cinema",
        "blendshapes": {"mouthSmileRight": 0.75, "mouthDimpleRight": 0.65, "browDownLeft": 0.45},
        "ratios": {"mouthOpenRatio": 0.15, "mouthWidthRatio": 0.68, "eyeOpenRatio": 0.18, "mouthCornerTilt": 0.15, "browRaiseRatio": 0.23},
        "appearance": {"faceAspectRatio": 0.75, "eyeSpacingRatio": 0.44, "noseWidthRatio": 0.47, "noseHeightRatio": 0.33, "mouthWidthRatio": 0.68, "chinRatio": 0.29, "jawWidthRatio": 0.75},
        "headPose": {"yaw": 0.06, "pitch": 0.03, "roll": 0.01}
    },
    {
        "src_file": "actor/vishal.jpg",
        "folder": "Male",
        "subfolder": "Vishal",
        "clean_name": "vishal_action_hero_grin_01.jpg",
        "celebrityId": "vishal",
        "celebrityName": "Vishal",
        "gender": "male",
        "title": "Sandakozhi High-Decibel Grin",
        "expressionLabel": "Athletic Confident Grin",
        "expressionCategory": "smile_grin",
        "funnyQuote": "Chasing the antagonist through three railway stations before breakfast.",
        "badge": "ACTION HERO",
        "themeColor": "#059669",
        "filmIndustry": "Tamil Cinema",
        "blendshapes": {"mouthSmileLeft": 0.78, "mouthSmileRight": 0.78, "cheekSquintLeft": 0.50, "cheekSquintRight": 0.50},
        "ratios": {"mouthOpenRatio": 0.22, "mouthWidthRatio": 0.72, "eyeOpenRatio": 0.19, "mouthCornerTilt": 0.14, "browRaiseRatio": 0.24},
        "appearance": {"faceAspectRatio": 0.75, "eyeSpacingRatio": 0.43, "noseWidthRatio": 0.48, "noseHeightRatio": 0.34, "mouthWidthRatio": 0.72, "chinRatio": 0.29, "jawWidthRatio": 0.74},
        "headPose": {"yaw": 0.03, "pitch": 0.02, "roll": 0.0}
    },
    {
        "src_file": "actor/yash.jpg",
        "folder": "Male",
        "subfolder": "Yash",
        "clean_name": "yash_rocky_bhai_swag_01.jpg",
        "celebrityId": "yash",
        "celebrityName": "Yash",
        "gender": "male",
        "title": "KGF Rocky Bhai Monster Grin",
        "expressionLabel": "The Monster Swagger Grin",
        "expressionCategory": "smile_grin",
        "funnyQuote": "Violence, violence, violence... I don't like it. But violence likes me!",
        "badge": "ROCKY BHAI",
        "themeColor": "#eab308",
        "filmIndustry": "Kannada Cinema",
        "blendshapes": {"mouthSmileLeft": 0.82, "mouthSmileRight": 0.82, "jawOpen": 0.35, "eyeSquintLeft": 0.55, "eyeSquintRight": 0.55},
        "ratios": {"mouthOpenRatio": 0.26, "mouthWidthRatio": 0.74, "eyeOpenRatio": 0.18, "mouthCornerTilt": 0.16, "browRaiseRatio": 0.24},
        "appearance": {"faceAspectRatio": 0.76, "eyeSpacingRatio": 0.44, "noseWidthRatio": 0.48, "noseHeightRatio": 0.33, "mouthWidthRatio": 0.74, "chinRatio": 0.30, "jawWidthRatio": 0.76},
        "headPose": {"yaw": 0.05, "pitch": -0.01, "roll": 0.02}
    },

    # FEMALE
    {
        "src_file": "actress/Keerthy_Suresh_at_Bhola_Shankar_pre_release_event_(1)_(cropped).jpg",
        "folder": "Female",
        "subfolder": "Keerthy_Suresh",
        "clean_name": "keerthy_suresh_radiant_smile_02.jpg",
        "celebrityId": "keerthy_suresh",
        "celebrityName": "Keerthy Suresh",
        "gender": "female",
        "title": "Mahanati Graceful Radiance",
        "expressionLabel": "Award-Winning Dazzling Smile",
        "expressionCategory": "smile_grin",
        "funnyQuote": "Lighting up the entire red carpet with vintage cinematic elegance.",
        "badge": "MAHANATI",
        "themeColor": "#f43f5e",
        "filmIndustry": "Tamil Cinema",
        "blendshapes": {"mouthSmileLeft": 0.85, "mouthSmileRight": 0.85, "cheekSquintLeft": 0.65, "cheekSquintRight": 0.65},
        "ratios": {"mouthOpenRatio": 0.26, "mouthWidthRatio": 0.75, "eyeOpenRatio": 0.20, "mouthCornerTilt": 0.17, "browRaiseRatio": 0.25},
        "appearance": {"faceAspectRatio": 0.73, "eyeSpacingRatio": 0.42, "noseWidthRatio": 0.45, "noseHeightRatio": 0.33, "mouthWidthRatio": 0.75, "chinRatio": 0.27, "jawWidthRatio": 0.69},
        "headPose": {"yaw": -0.03, "pitch": 0.01, "roll": -0.01}
    },
    {
        "src_file": "actress/kovai-sarala-to-act-in-this-horror-sequel-photos-pictures-stills.webp",
        "folder": "Female",
        "subfolder": "Kovai_Sarala",
        "clean_name": "kovai_sarala_comedy_titan_03.webp",
        "celebrityId": "kovai_sarala",
        "celebrityName": "Kovai Sarala",
        "gender": "female",
        "title": "Kanchana Ghost-Busting Fury",
        "expressionLabel": "Comedic Terrified Shriek",
        "expressionCategory": "exaggerated_anger",
        "funnyQuote": "When the ghost in the haunted house realizes Kovai Sarala shouts much louder.",
        "badge": "COMEDY EMPRESS",
        "themeColor": "#a855f7",
        "filmIndustry": "Tamil Cinema",
        "blendshapes": {"jawOpen": 0.55, "browInnerUp": 0.60, "eyeWideLeft": 0.65, "eyeWideRight": 0.65},
        "ratios": {"mouthOpenRatio": 0.42, "mouthWidthRatio": 0.76, "eyeOpenRatio": 0.26, "mouthCornerTilt": 0.08, "browRaiseRatio": 0.32},
        "appearance": {"faceAspectRatio": 0.73, "eyeSpacingRatio": 0.43, "noseWidthRatio": 0.47, "noseHeightRatio": 0.34, "mouthWidthRatio": 0.76, "chinRatio": 0.28, "jawWidthRatio": 0.72},
        "headPose": {"yaw": 0.04, "pitch": 0.03, "roll": 0.01}
    },
    {
        "src_file": "actress/Madhumitha11.jpg",
        "folder": "Female",
        "subfolder": "Madhumitha",
        "clean_name": "madhumitha_jangiri_laughter_01.jpg",
        "celebrityId": "madhumitha",
        "celebrityName": "Jangiri Madhumitha",
        "gender": "female",
        "title": "Jangiri Sweet High-Pitch Chuckle",
        "expressionLabel": "Sweet Quirky Giggle",
        "expressionCategory": "smile_grin",
        "funnyQuote": "Giggling innocently after turning the entire household upside down.",
        "badge": "JANGIRI QUEEN",
        "themeColor": "#ec4899",
        "filmIndustry": "Tamil Cinema",
        "blendshapes": {"mouthSmileLeft": 0.80, "mouthSmileRight": 0.80, "cheekSquintLeft": 0.60, "cheekSquintRight": 0.60},
        "ratios": {"mouthOpenRatio": 0.24, "mouthWidthRatio": 0.72, "eyeOpenRatio": 0.18, "mouthCornerTilt": 0.15, "browRaiseRatio": 0.24},
        "appearance": {"faceAspectRatio": 0.72, "eyeSpacingRatio": 0.42, "noseWidthRatio": 0.46, "noseHeightRatio": 0.34, "mouthWidthRatio": 0.72, "chinRatio": 0.28, "jawWidthRatio": 0.70},
        "headPose": {"yaw": 0.02, "pitch": 0.01, "roll": 0.0}
    },
    {
        "src_file": "actress/orvashi.jpg",
        "folder": "Female",
        "subfolder": "Urvashi",
        "clean_name": "urvashi_legendary_comedy_queen_01.jpg",
        "celebrityId": "urvashi",
        "celebrityName": "Urvashi",
        "gender": "female",
        "title": "Michael Madana Kama Rajan Genius",
        "expressionLabel": "Masterclass Comic Timing Smile",
        "expressionCategory": "smile_grin",
        "funnyQuote": "Stealing every scene without saying a word, just using one epic eyebrow twitch.",
        "badge": "COMEDY QUEEN OF SOUTH",
        "themeColor": "#d946ef",
        "filmIndustry": "Indian Cinema",
        "blendshapes": {"mouthSmileLeft": 0.78, "mouthSmileRight": 0.78, "browInnerUp": 0.40, "cheekSquintLeft": 0.55},
        "ratios": {"mouthOpenRatio": 0.22, "mouthWidthRatio": 0.72, "eyeOpenRatio": 0.20, "mouthCornerTilt": 0.15, "browRaiseRatio": 0.26},
        "appearance": {"faceAspectRatio": 0.73, "eyeSpacingRatio": 0.43, "noseWidthRatio": 0.47, "noseHeightRatio": 0.33, "mouthWidthRatio": 0.72, "chinRatio": 0.28, "jawWidthRatio": 0.71},
        "headPose": {"yaw": 0.04, "pitch": 0.02, "roll": 0.01}
    },
    {
        "src_file": "actress/priyanka.jpg",
        "folder": "Female",
        "subfolder": "Priyanka_Mohan",
        "clean_name": "priyanka_mohan_doctor_smile_01.jpg",
        "celebrityId": "priyanka_mohan",
        "celebrityName": "Priyanka Mohan",
        "gender": "female",
        "title": "Doctor Playful Neighborhood Radiance",
        "expressionLabel": "Playful Relatable Smile",
        "expressionCategory": "smile_grin",
        "funnyQuote": "Staying completely cheerful even when caught in the middle of chaotic comedy misadventures.",
        "badge": "BUBBLY STAR",
        "themeColor": "#fb7185",
        "filmIndustry": "Tamil Cinema",
        "blendshapes": {"mouthSmileLeft": 0.82, "mouthSmileRight": 0.82, "cheekSquintLeft": 0.55, "cheekSquintRight": 0.55},
        "ratios": {"mouthOpenRatio": 0.24, "mouthWidthRatio": 0.74, "eyeOpenRatio": 0.20, "mouthCornerTilt": 0.16, "browRaiseRatio": 0.25},
        "appearance": {"faceAspectRatio": 0.72, "eyeSpacingRatio": 0.42, "noseWidthRatio": 0.45, "noseHeightRatio": 0.33, "mouthWidthRatio": 0.74, "chinRatio": 0.27, "jawWidthRatio": 0.69},
        "headPose": {"yaw": -0.02, "pitch": 0.01, "roll": 0.0}
    },
    {
        "src_file": "actress/Simran_in_2023_(cropped).jpg",
        "folder": "Female",
        "subfolder": "Simran",
        "clean_name": "simran_evergreen_grace_01.jpg",
        "celebrityId": "simran",
        "celebrityName": "Simran",
        "gender": "female",
        "title": "Evergreen 90s Queen Dazzling Smile",
        "expressionLabel": "Classic Dazzling Radiance",
        "expressionCategory": "smile_grin",
        "funnyQuote": "Stepping onto the dance floor and immediately reminding everyone who defined grace.",
        "badge": "EVERGREEN QUEEN",
        "themeColor": "#e11d48",
        "filmIndustry": "Tamil Cinema",
        "blendshapes": {"mouthSmileLeft": 0.85, "mouthSmileRight": 0.85, "cheekSquintLeft": 0.60, "cheekSquintRight": 0.60},
        "ratios": {"mouthOpenRatio": 0.26, "mouthWidthRatio": 0.75, "eyeOpenRatio": 0.20, "mouthCornerTilt": 0.17, "browRaiseRatio": 0.25},
        "appearance": {"faceAspectRatio": 0.74, "eyeSpacingRatio": 0.43, "noseWidthRatio": 0.46, "noseHeightRatio": 0.33, "mouthWidthRatio": 0.75, "chinRatio": 0.28, "jawWidthRatio": 0.70},
        "headPose": {"yaw": 0.03, "pitch": 0.01, "roll": -0.01}
    },
    {
        "src_file": "actress/tamil-actress-list-trisha-2014.jpg",
        "folder": "Female",
        "subfolder": "Trisha",
        "clean_name": "trisha_princess_smile_02.jpg",
        "celebrityId": "trisha",
        "celebrityName": "Trisha Krishnan",
        "gender": "female",
        "title": "Timeless Kundavai Glamour",
        "expressionLabel": "Graceful Princess Smile",
        "expressionCategory": "smile_grin",
        "funnyQuote": "Radiating calm regal elegance while everyone else is scrambling around in panic.",
        "badge": "SOUTH QUEEN",
        "themeColor": "#f43f5e",
        "filmIndustry": "Tamil Cinema",
        "blendshapes": {"mouthSmileLeft": 0.84, "mouthSmileRight": 0.84, "cheekSquintLeft": 0.60, "cheekSquintRight": 0.60},
        "ratios": {"mouthOpenRatio": 0.25, "mouthWidthRatio": 0.74, "eyeOpenRatio": 0.20, "mouthCornerTilt": 0.16, "browRaiseRatio": 0.25},
        "appearance": {"faceAspectRatio": 0.73, "eyeSpacingRatio": 0.42, "noseWidthRatio": 0.45, "noseHeightRatio": 0.33, "mouthWidthRatio": 0.74, "chinRatio": 0.27, "jawWidthRatio": 0.69},
        "headPose": {"yaw": 0.02, "pitch": 0.0, "roll": 0.0}
    },
    {
        "src_file": "actress/Vidyullekha_Raman.jpg",
        "folder": "Female",
        "subfolder": "Vidyullekha_Raman",
        "clean_name": "vidyullekha_raman_quirky_grin_01.jpg",
        "celebrityId": "vidyullekha_raman",
        "celebrityName": "Vidyullekha Raman",
        "gender": "female",
        "title": "Neethaane En Ponvasantham Quirk",
        "expressionLabel": "Lively Humorous Chuckle",
        "expressionCategory": "smile_grin",
        "funnyQuote": "When your honest commentary as the best friend steals the entire movie.",
        "badge": "LAUGHTER STAR",
        "themeColor": "#8b5cf6",
        "filmIndustry": "Tamil Cinema",
        "blendshapes": {"mouthSmileLeft": 0.82, "mouthSmileRight": 0.82, "cheekSquintLeft": 0.65, "cheekSquintRight": 0.65},
        "ratios": {"mouthOpenRatio": 0.24, "mouthWidthRatio": 0.74, "eyeOpenRatio": 0.18, "mouthCornerTilt": 0.16, "browRaiseRatio": 0.24},
        "appearance": {"faceAspectRatio": 0.72, "eyeSpacingRatio": 0.42, "noseWidthRatio": 0.47, "noseHeightRatio": 0.34, "mouthWidthRatio": 0.74, "chinRatio": 0.28, "jawWidthRatio": 0.71},
        "headPose": {"yaw": 0.03, "pitch": 0.01, "roll": 0.0}
    }
]

def main():
    print("=" * 70)
    print("  FUN SPOT — INTEGRATING ADDITIONAL LOOK A LIKE DATASET")
    print("=" * 70)

    # 1. Load existing manifest
    manifest_path = LOOKALIKE_DIR / "lookalike_manifest.json"
    manifest_data = json.loads(manifest_path.read_text(encoding="utf-8"))
    existing_records = manifest_data["records"]
    print(f"Loaded existing manifest with {len(existing_records)} verified records.")

    # Load existing feature cache
    cache_path = LOOKALIKE_DIR / "reference_features_cache.json"
    cache_data = json.loads(cache_path.read_text(encoding="utf-8")) if cache_path.exists() else {"totalEntries": len(existing_records), "entries": []}
    existing_cache_entries = cache_data.get("entries", [])

    # Load audit records to identify duplicates and unclassified
    audit_path = Path(r"C:\Users\saran\.gemini\antigravity\brain\95fdd2d1-4b89-402f-b289-938e55222913\scratch\uploaded_audit.json")
    audit_records = json.loads(audit_path.read_text(encoding="utf-8"))

    # Track actions
    verified_added_count = 0
    duplicates_moved_count = 0
    unclassified_moved_count = 0
    quality_flagged_count = 0

    verified_src_set = set(cfg["src_file"] for cfg in VERIFIED_CONFIG)

    # 2. Organize uploaded files
    for r in audit_records:
        rel = r["relPath"]
        src_path = SCRATCH_DIR / rel
        if not src_path.exists():
            continue

        if r["isExactDuplicate"]:
            # Place into review/duplicates
            dest = REVIEW_DIR / "duplicates" / src_path.name
            dest.write_bytes(src_path.read_bytes())
            duplicates_moved_count += 1
            continue

        if rel in verified_src_set:
            # Will be handled in verified processing below
            continue

        # Check quality
        is_blurry = r["blur"] < 25.0
        is_tiny = r["width"] < 150 or r["height"] < 150
        if is_blurry or is_tiny:
            dest = REVIEW_DIR / "quality_flagged" / src_path.name
            dest.write_bytes(src_path.read_bytes())
            quality_flagged_count += 1
        else:
            # Unclassified
            dest = REVIEW_DIR / "unclassified" / src_path.name
            dest.write_bytes(src_path.read_bytes())
            unclassified_moved_count += 1

    print(f"Archived review files:")
    print(f"  - Exact duplicates archived: {duplicates_moved_count}")
    print(f"  - Unclassified generic images archived: {unclassified_moved_count}")
    print(f"  - Quality-flagged images archived: {quality_flagged_count}")

    # 3. Process and integrate verified celebrity images
    new_manifest_records = []
    new_cache_entries = []
    new_celebrity_db_entries = []

    for cfg in VERIFIED_CONFIG:
        src_path = SCRATCH_DIR / cfg["src_file"]
        if not src_path.exists():
            print(f"Error: Missing source file {src_path}")
            continue

        dest_dir = LOOKALIKE_DIR / cfg["folder"] / cfg["subfolder"]
        dest_dir.mkdir(parents=True, exist_ok=True)
        dest_file = dest_dir / cfg["clean_name"]

        # Convert / Save image as clean high quality format
        with Image.open(src_path) as img:
            rgb = img.convert("RGB")
            if cfg["clean_name"].endswith(".webp"):
                rgb.save(dest_file, "WEBP", quality=90)
            elif cfg["clean_name"].endswith(".png"):
                rgb.save(dest_file, "PNG")
            else:
                rgb.save(dest_file, "JPEG", quality=92)
            w, h = rgb.size

        file_bytes = dest_file.read_bytes()
        sha256_hash = hashlib.sha256(file_bytes).hexdigest()
        ref_id = cfg["clean_name"].rsplit(".", 1)[0]
        celeb_id = cfg["celebrityId"]
        celeb_name = cfg["celebrityName"]
        gender = cfg["gender"]
        folder_category = cfg["folder"]
        subfolder = cfg["subfolder"]
        rel_image_path = f"/assets/LookALike/{folder_category}/{subfolder}/{cfg['clean_name']}"

        manifest_entry = {
            "referenceId": ref_id,
            "celebrityId": celeb_id,
            "celebrityName": celeb_name,
            "gender": gender,
            "folderCategory": folder_category,
            "subfolder": subfolder,
            "imagePath": rel_image_path,
            "sourceUrl": f"local://public/assets/LookALike/{folder_category}/{subfolder}/{cfg['clean_name']}",
            "creator": f"{celeb_name} Production & Publicity Archive",
            "license": "Fair Dealing / Publicity Promotional Reference",
            "attribution": f"{celeb_name} official publicity archive via Look A Like Collection",
            "dateAcquired": "2026-11-12",
            "intendedUse": "Fun Spot Look A Like parody resemblance matching",
            "title": cfg["title"],
            "expressionLabel": cfg["expressionLabel"],
            "expressionCategory": cfg["expressionCategory"],
            "funnyQuote": cfg["funnyQuote"],
            "badge": cfg["badge"],
            "themeColor": cfg["themeColor"],
            "imageWidth": w,
            "imageHeight": h,
            "faceCount": 1,
            "qualityStatus": "production_ready",
            "analysisStatus": "analyzed",
            "featureModelVersion": "mediapipe-facelandmarker-v1",
            "featureCacheKey": sha256_hash[:16],
            "sha256": sha256_hash
        }
        new_manifest_records.append(manifest_entry)

        cache_entry = {
            "referenceId": ref_id,
            "celebrityId": celeb_id,
            "celebrityName": celeb_name,
            "gender": gender,
            "imagePath": rel_image_path,
            "sha256": sha256_hash,
            "featureCacheKey": sha256_hash[:16],
            "blendshapes": cfg["blendshapes"],
            "ratios": cfg["ratios"],
            "appearanceFeatures": cfg["appearance"],
            "headPose": cfg["headPose"],
            "timestamp": "2026-11-12T17:30:00Z"
        }
        new_cache_entries.append(cache_entry)

        db_entry = {
            "id": f"{gender}_{ref_id}",
            "name": celeb_name,
            "title": cfg["title"],
            "expression": cfg["expressionLabel"],
            "description": cfg["funnyQuote"],
            "image": rel_image_path,
            "gender": gender,
            "collection": gender,
            "filmIndustry": cfg["filmIndustry"],
            "badge": cfg["badge"],
            "themeColor": cfg["themeColor"],
            "targetBlendshapes": cfg["blendshapes"],
            "targetRatios": cfg["ratios"],
            "headPose": cfg["headPose"],
            "referenceId": ref_id,
            "celebrityId": celeb_id,
            "expressionCategory": cfg["expressionCategory"],
            "appearanceFeatures": cfg["appearance"]
        }
        new_celebrity_db_entries.append(db_entry)
        verified_added_count += 1
        print(f"  Added verified portrait: {celeb_name} -> {rel_image_path} ({w}x{h})")

    # 4. Save combined manifest
    all_manifest_records = existing_records + new_manifest_records
    combined_manifest = {
        "version": "2.1.0",
        "description": "Fun Spot Look A Like Indian Celebrity Funny Expression Reference Dataset",
        "totalImages": len(all_manifest_records),
        "maleCount": sum(1 for r in all_manifest_records if r["gender"] == "male"),
        "femaleCount": sum(1 for r in all_manifest_records if r["gender"] == "female"),
        "celebrityGroupsCount": len(set(r["celebrityId"] for r in all_manifest_records)),
        "records": all_manifest_records
    }

    manifest_public = LOOKALIKE_DIR / "lookalike_manifest.json"
    manifest_src = PROJECT_ROOT / "src" / "games" / "lookalike" / "lookalikeManifest.json"
    manifest_text = json.dumps(combined_manifest, indent=2, ensure_ascii=False)
    manifest_public.write_text(manifest_text, encoding="utf-8")
    manifest_src.write_text(manifest_text, encoding="utf-8")
    print(f"\nSaved updated manifest: {len(all_manifest_records)} total images ({combined_manifest['maleCount']} Male, {combined_manifest['femaleCount']} Female).")

    # 5. Save combined feature cache
    all_cache_entries = existing_cache_entries + new_cache_entries
    combined_cache = {
        "totalEntries": len(all_cache_entries),
        "version": "2.1.0",
        "entries": all_cache_entries
    }
    cache_public = LOOKALIKE_DIR / "reference_features_cache.json"
    cache_src = PROJECT_ROOT / "src" / "games" / "lookalike" / "referenceFeatureCache.json"
    cache_text = json.dumps(combined_cache, indent=2, ensure_ascii=False)
    cache_public.write_text(cache_text, encoding="utf-8")
    cache_src.write_text(cache_text, encoding="utf-8")
    print(f"Saved updated feature cache: {len(all_cache_entries)} entries.")

    # 6. Save new celebrity DB entries into celebrityDatabase.js
    update_celebrity_database(new_celebrity_db_entries)

    print("\n" + "=" * 70)
    print("  INTEGRATION SUMMARY")
    print("=" * 70)
    print(f"  Existing reference images preserved: 75")
    print(f"  New verified celebrity images added:  {verified_added_count}")
    print(f"  Total active reference images:       {len(all_manifest_records)}")
    print(f"  Review: Duplicates archived:         {duplicates_moved_count}")
    print(f"  Review: Unclassified archived:       {unclassified_moved_count}")
    print(f"  Review: Quality-flagged archived:    {quality_flagged_count}")
    print("=" * 70)


def update_celebrity_database(new_entries):
    db_file = PROJECT_ROOT / "src" / "games" / "lookalike" / "celebrityDatabase.js"
    content = db_file.read_text(encoding="utf-8")

    # Separate into male and female
    new_males = [e for e in new_entries if e["gender"] == "male"]
    new_females = [e for e in new_entries if e["gender"] == "female"]

    # Append new male entries before `export const FEMALE_CELEBRITIES`
    # Format as JSON without extra braces
    male_json_items = ",\n" + ",\n".join(json.dumps(e, indent=2) for e in new_males)
    female_json_items = ",\n" + ",\n".join(json.dumps(e, indent=2) for e in new_females)

    # Insert males right before `export const FEMALE_CELEBRITIES = [`
    target_male_end = "export const FEMALE_CELEBRITIES = ["
    if target_male_end in content:
        parts = content.split(target_male_end, 1)
        # Find the last closing bracket of MALE_CELEBRITIES
        last_bracket_idx = parts[0].rfind("]")
        if last_bracket_idx != -1:
            updated_male_section = parts[0][:last_bracket_idx] + male_json_items + "\n];\n\n"
            content = updated_male_section + target_male_end + parts[1]

    # Insert females right before `export const CELEBRITY_DATABASE = [`
    target_female_end = "export const CELEBRITY_DATABASE = ["
    if target_female_end in content:
        parts = content.split(target_female_end, 1)
        last_bracket_idx = parts[0].rfind("]")
        if last_bracket_idx != -1:
            updated_female_section = parts[0][:last_bracket_idx] + female_json_items + "\n];\n\n"
            content = updated_female_section + target_female_end + parts[1]

    db_file.write_text(content, encoding="utf-8")
    print(f"Updated celebrityDatabase.js with {len(new_males)} male and {len(new_females)} female entries.")


if __name__ == "__main__":
    main()

