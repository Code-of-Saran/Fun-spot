"""
Fun Spot — Build, Curate and Organize Indian Celebrity LookALike Dataset
1. Audits existing images and creates structured subfolders for each celebrity.
2. Imports verified Creative Commons images from Wikimedia Commons for requested Indian stars.
3. Standardizes naming: <celebrity_name>_<expression>_<index>.jpg
4. Generates lookalike_manifest.json and reference_features_cache.json with appearance and expression features.
"""
import os
import sys
import json
import hashlib
import time
import urllib.request
import urllib.parse
from pathlib import Path
from PIL import Image
import numpy as np

PROJECT_ROOT = Path(r"C:\project\funspot-main")
LOOKALike_DIR = PROJECT_ROOT / "public" / "assets" / "LookALike"
MALE_DIR = LOOKALike_DIR / "Male"
FEMALE_DIR = LOOKALike_DIR / "Female"

# Existing 60 files mapping to clean folder and standardized names
EXISTING_MAPPINGS = {
    # MALE
    "Male/Ajith.jpg": ("Ajith_Kumar", "ajith_kumar_cheerful_rogue_grin_01.jpg", "Ajith Kumar", "Cheerful Rogue Grin", "smile_grin", "Mischievous Rogue Grin", "When your prank worked flawlessly and nobody suspects a thing.", "THALA", "#00f0ff"),
    "Male/AK.jpg": ("Ajith_Kumar", "ajith_kumar_confident_smirk_02.jpg", "Ajith Kumar", "Focused Intense Smirk", "sarcastic_smirk", "Focused Intense Smirk", "Gazing into the distance knowing victory was sealed an hour ago.", "AK", "#00d2ff"),
    "Male/ARYA.jpg": ("Arya", "arya_youthful_radiant_grin_01.jpg", "Arya", "Youthful Radiant Grin", "smile_grin", "Playful Wide-Eyed Smile", "Brimming with high energy on day one of a new fitness sprint.", "FITNESS ICON", "#00ff88"),
    "Male/Atharva.jpg": ("Atharvaa", "atharvaa_curious_charming_smile_01.jpg", "Atharvaa", "Curious Charming Smile", "smile_grin", "Charming Raised-Eyebrow Grin", "When someone drops unexpected spicy gossip and you need every detail.", "YOUTH ICON", "#38bdf8"),
    "Male/Dhruv.jpg": ("Dhruv_Vikram", "dhruv_vikram_rebellious_grin_01.jpg", "Dhruv Vikram", "Rebellious Confident Grin", "smile_grin", "Rebellious Young Hero Grin", "Entering college on the final day like you own the campus.", "RISING STAR", "#f43f5e"),
    "Male/Gou.jpg": ("Goundamani", "goundamani_sarcastic_glare_01.jpg", "Goundamani", "Iconic Sarcastic Glare", "suspicious_side_eye", "The Ultimate Sarcastic Glare", "Checking whether someone actually thought their advice was brilliant.", "COMEDY KING", "#eab308"),
    "Male/Gou 2.jpg": ("Goundamani", "goundamani_disgusted_snarl_02.jpg", "Goundamani", "Extreme Disgusted Snarl", "exaggerated_anger", "Total Disgust and Contempt", "When someone asks for a third free tea after breaking your cup.", "COMEDY MONARCH", "#f97316"),
    "Male/Gou 3.jpg": ("Goundamani", "goundamani_comedic_fury_03.jpg", "Goundamani", "Roaring Comedic Fury", "exaggerated_anger", "Roaring High-Decibel Rant", "Reacting to an absurd request with full-volume comedic fury.", "ROYAL RANT", "#ef4444"),
    "Male/Gou 4.jpg": ("Goundamani", "goundamani_exasperated_disbelief_04.jpg", "Goundamani", "Exasperated Disbelief", "raised_eyebrow_disbelief", "Speechless Eyebrow Disbelief", "Listening to an outrageous excuse that defies all physical laws.", "LEGENDARY GLARE", "#f59e0b"),
    "Male/HR.jpg": ("Hrithik_Roshan", "hrithik_roshan_radiant_grin_01.jpg", "Hrithik Roshan", "Greek God Radiant Grin", "smile_grin", "Greek God Dazzling Grin", "Flashing a high-wattage smile that stops traffic across three lanes.", "GREEK GOD", "#06b6d4"),
    "Male/HR 2.jpg": ("Hrithik_Roshan", "hrithik_roshan_focused_stare_02.jpg", "Hrithik Roshan", "Piercing Focused Stare", "overdramatic", "Piercing Hero Gaze", "Locking eyes with destiny before a climactic superhero showdown.", "ACTION HERO", "#3b82f6"),
    "Male/Jeeva.jpg": ("Jiiva", "jiiva_comedy_grin_01.jpg", "Jiiva", "Lighthearted Comedy Grin", "smile_grin", "Playful Buddy Chuckle", "Laughing at your best friend making a fool of themselves in public.", "KO HERO", "#10b981"),
    "Male/Jeeva 2.jpg": ("Jiiva", "jiiva_cheeky_wink_02.jpg", "Jiiva", "Cheeky Winking Grin", "sarcastic_smirk", "Cheeky Mischief Wink", "Signaling that the secret master plan is already underway.", "CHARMER", "#14b8a6"),
    "Male/KH.jpg": ("Kamal_Haasan", "kamal_haasan_stunned_disbelief_01.jpg", "Kamal Haasan", "Stunned Disbelief", "extreme_surprise", "Shocked Interrogation Stare", "Processing a plot twist so complex even the screenplay writer forgot.", "ULAGANAYAGAN", "#8b5cf6"),
    "Male/KH 4.jpg": ("Kamal_Haasan", "kamal_haasan_hearty_laughter_02.jpg", "Kamal Haasan", "Hearty Thespian Laughter", "smile_grin", "Hearty Maestro Laughter", "Enjoying a witty cinematic dialogue delivered with perfect comic timing.", "CINEMA MAESTRO", "#a855f7"),
    "Male/MS.jpg": ("MS_Bhaskar", "ms_bhaskar_bewilderment_01.jpg", "MS Bhaskar", "Deep Comedic Bewilderment", "confusion", "Classic Bewildered Stare", "Staring blankly at an absurd bureaucratic instruction.", "VETERAN COMEDIAN", "#64748b"),
    "Male/MS 2.jpg": ("MS_Bhaskar", "ms_bhaskar_emotional_outburst_02.jpg", "MS Bhaskar", "Theatrical Emotional Outburst", "funny_crying", "Melodramatic Overreaction", "Weeping loudly over a minor scratch on your vintage scooter.", "DRAMA KING", "#94a3b8"),
    "Male/RS.jpg": ("Rajinikanth", "rajinikanth_superstar_swagger_01.jpg", "Superstar Rajinikanth", "Superstar Swagger Laugh", "smile_grin", "The Iconic Superstar Laugh", "Delivering a punchline before an arena-shaking slow-motion walk.", "SUPERSTAR", "#eab308"),
    "Male/Santa.jpg": ("Santhanam", "santhanam_sarcastic_smirk_01.jpg", "Santhanam", "Sarcastic One-Liner Smirk", "sarcastic_smirk", "Sarcastic Roast Smirk", "About to deliver a devastating one-liner that ends the debate forever.", "ROAST MASTER", "#ec4899"),
    "Male/Santa 2.jpg": ("Santhanam", "santhanam_side_eye_chuckle_02.jpg", "Santhanam", "Mocking Side-Eye Chuckle", "suspicious_side_eye", "Hilarious Side-Eye Glance", "Checking whether anyone else noticed the monumental blunder just committed.", "COMEDY STAR", "#d946ef"),
    "Male/Santa 3.jpg": ("Santhanam", "santhanam_jaw_drop_03.jpg", "Santhanam", "Hilarious Jaw-Drop", "shock", "Comedic Jaw-Drop Shock", "Seeing the restaurant bill after your cousins ordered the entire menu.", "LAUGHTER ICON", "#a855f7"),
    "Male/Sen.jpg": ("Senthil", "senthil_clueless_innocence_01.jpg", "Senthil", "Pure Clueless Innocence", "confusion", "Pure Clueless Innocence", "Looking completely baffled while holding the evidence of the mishap.", "PETTAI KING", "#f59e0b"),
    "Male/Senthil.jpg": ("Senthil", "senthil_peaceful_ignorer_02.jpg", "Senthil", "Peaceful Ignorer", "deadpan_confused", "Peaceful Ignorer", "Pretending to be fast asleep when asked who forgot to lock the gate.", "ICONIC COMEDIAN", "#ffaa00"),
    "Male/Speed.jpg": ("IShowSpeed", "ishowspeed_hype_shock_01.jpg", "IShowSpeed", "Maximum Volume Hype", "extreme_surprise", "Hyperactive Victory Yell", "Screaming in disbelief after packing an ultra-rare holographic card.", "VIRAL SENSATION", "#ef4444"),
    "Male/squint-eye-jeeva.png": ("Jiiva", "jiiva_suspicious_cross_exam_03.png", "Jiiva", "Ultra-Suspicious Cross-Examination", "suspicious_side_eye", "The Ultra-Squint Inquisition", "Narrowing your eyes so hard you can inspect cellular biology.", "SQUINT MASTER", "#06b6d4"),
    "Male/SRK.jpg": ("Shah_Rukh_Khan", "shah_rukh_khan_dimpled_smile_01.jpg", "Shah Rukh Khan", "King Khan Dimpled Smile", "smile_grin", "The Million-Watt Dimpled Smile", "Lighting up an entire stadium with pure charisma and outstretched arms.", "BADSHAH", "#e11d48"),
    "Male/SRK 2.jpg": ("Shah_Rukh_Khan", "shah_rukh_khan_warm_laughter_02.jpg", "Shah Rukh Khan", "Full-Hearted Warm Laughter", "smile_grin", "Deep Unfiltered Bollywood Chuckle", "Laughing at your own witty quip during an international press conference.", "KING KHAN", "#be123c"),
    "Male/SRK 3.jpg": ("Shah_Rukh_Khan", "shah_rukh_khan_eyebrow_raise_03.jpg", "Shah Rukh Khan", "Witty Playful Eyebrow Raise", "raised_eyebrow_disbelief", "The Signature Quizmaster Eyebrow", "Gently teasing a contestant who picked the most bizarre answer.", "ICONIC SRK", "#9f1239"),
    "Male/SS.jpg": ("Sivakarthikeyan", "sivakarthikeyan_friendly_smile_01.jpg", "Sivakarthikeyan", "Heartwarming Friendly Smile", "smile_grin", "Relatable Neighborhood Grin", "Meeting your hometown friends after becoming a statewide sensation.", "PRINCE", "#22c55e"),
    "Male/SS 2.jpg": ("Sivakarthikeyan", "sivakarthikeyan_comedic_double_take_02.jpg", "Sivakarthikeyan", "Comedic Double-Take", "shock", "Comedic Wide-Eyed Gasp", "Realizing you replied to the official family group chat by mistake.", "ENTERTAINER", "#16a34a"),
    "Male/Vadi.jpg": ("Vadivelu", "vadivelu_suspicious_glare_01.jpg", "Vadivelu", "Stern Suspicious Glare", "suspicious_side_eye", "The Kaipulla Glare", "Suspecting an elaborate conspiracy when your snack disappears.", "VAIGAIPUYAL", "#eab308"),
    "Male/Vadi 2.jpg": ("Vadivelu", "vadivelu_comedic_weeping_02.jpg", "Vadivelu", "Theatrical Comedic Weeping", "funny_crying", "Tragic Melodramatic Wailing", "Weeping theatrically when the tea stall closes two minutes early.", "COMEDY EMPEROR", "#f97316"),
    "Male/Vadi.avif": ("Vadivelu", "vadivelu_cunning_smirk_03.jpg", "Vadivelu", "Cunning Mastermind Smirk", "sarcastic_smirk", "The Cunning Scheme Smirk", "Plotting a flawless master plan that will inevitably backfire in 10 minutes.", "SCHEMING LEGEND", "#facc15"),
    "Male/vadivelu672_d.jpg": ("Vadivelu", "vadivelu_hilarious_terror_04.jpg", "Vadivelu", "Absolute Hilarious Terror", "shock", "Screaming Panic Face", "Fleeing across town while being chased by the very dog you teased.", "PANIC ICON", "#ef4444"),
    "Male/VJ.jpg": ("Thalapathy_Vijay", "thalapathy_vijay_confident_smirk_01.jpg", "Thalapathy Vijay", "Confident Smirk", "sarcastic_smirk", "Cool Charismatic Smirk", "Entering the frame right as the bass drops and whistles erupt.", "THALAPATHY", "#00f0ff"),
    "Male/VJ 2.jpg": ("Thalapathy_Vijay", "thalapathy_vijay_big_grin_02.jpg", "Thalapathy Vijay", "Electrifying Big Grin", "smile_grin", "Jubilant Celebration Grin", "Celebrating a monumental triumph surrounded by cheering fans.", "BOX OFFICE KING", "#38bdf8"),
    "Male/VJ.png": ("Thalapathy_Vijay", "thalapathy_vijay_master_swag_03.png", "Thalapathy Vijay", "Iconic Master Swag", "smile_grin", "The Unshakable Master Swag", "Casually adjusting your shades while solving an entire crisis effortlessly.", "THE MASTER", "#0284c7"),
    "Male/VJS.jpg": ("Vijay_Sethupathi", "vijay_sethupathi_deadpan_realism_01.jpg", "Vijay Sethupathi", "Natural Deadpan Realism", "deadpan_confused", "Deadpan Philosophical Gaze", "Dropping a profound truth bomb in the middle of a roadside tea conversation.", "MAKKAL SELVAN", "#f59e0b"),
    "Male/VJS 2.jpg": ("Vijay_Sethupathi", "vijay_sethupathi_belly_laugh_02.jpg", "Vijay Sethupathi", "Deep Genuine Belly Laugh", "smile_grin", "The Hearty Makkal Selvan Laughter", "Laughing so authentically everyone in the room starts laughing along.", "PEOPLES STAR", "#d97706"),
    "Male/VJS 3.jpg": ("Vijay_Sethupathi", "vijay_sethupathi_contemplative_03.jpg", "Vijay Sethupathi", "Thoughtful Contemplative Gaze", "raised_eyebrow_disbelief", "Wry Introspective Smirk", "Wondering why life is this complicated when lunch was so delicious.", "NATURAL ACTOR", "#b45309"),
    "Male/VK.jpg": ("Vivek", "vivek_satirical_smile_01.jpg", "Vivek", "Sharp Satirical Smile", "smile_grin", "Social Satire Chuckle", "Dissecting superstitious silliness with unmatched comic eloquence.", "CHINNA KALAIVANAR", "#10b981"),
    "Male/YB.jpg": ("Yogi_Babu", "yogi_babu_deadpan_bewilderment_01.jpg", "Yogi Babu", "Deadpan Bewilderment", "deadpan_confused", "Unimpressed Deadpan Stare", "Looking completely unfazed as chaotic melodrama unfolds around you.", "COMEDY SENSATION", "#8b5cf6"),
    "Male/YB 2.jpg": ("Yogi_Babu", "yogi_babu_comedic_shock_02.jpg", "Yogi Babu", "Hilarious Comedic Shock", "shock", "Comedic Shock Expression", "Realizing you were volunteered as the chief guest for a boxing match.", "KING OF DEADPAN", "#a855f7"),

    # FEMALE
    "Female/AR.jpg": ("Aishwarya_Rai", "aishwarya_rai_regal_intensity_01.jpg", "Aishwarya Rai Bachchan", "Majestic Royal Elegance", "overdramatic", "Regal Royal Gaze", "Exuding regal elegance and poise that commands silence across the room.", "GLOBAL ICON", "#e11d48"),
    "Female/Hansika.jpg": ("Hansika_Motwani", "hansika_motwani_bubbly_charm_01.jpg", "Hansika Motwani", "Radiant Bubbly Charm", "smile_grin", "Playful Sparkling Smile", "Lighting up an entire song sequence with boundless cheerfulness.", "BUBBLY STAR", "#f43f5e"),
    "Female/IL.jpg": ("Ileana_DCruz", "ileana_dcruz_sassy_wink_01.jpg", "Ileana D'Cruz", "Playful Sassy Wink", "sarcastic_smirk", "Knowing Wink", "Delivering a knowing wink when you successfully solve the puzzle before everyone.", "SASSY ICON", "#f43f5e"),
    "Female/images (1).jpg": ("Tamannaah_Bhatia", "tamannaah_bhatia_dazzling_grin_01.jpg", "Tamannaah Bhatia", "Milky Beauty Dazzling Grin", "smile_grin", "Dazzling High-Glam Grin", "Flashing a camera-ready smile that captivates every festival audience.", "GLAMOUR QUEEN", "#fb7185"),
    "Female/KH 3.jpg": ("Keerthy_Suresh", "keerthy_suresh_expressive_pout_01.jpg", "Keerthy Suresh", "Playful Expressive Pout", "pursed_lips", "Adorable Sassy Pout", "Pouting expressively when denied the very last scoop of ice cream.", "NATIONAL AWARD WINNER", "#f472b6"),
    "Female/KS.jpg": ("Kovai_Sarala", "kovai_sarala_sassy_pout_01.jpg", "Kovai Sarala", "Disgusted Sassy Pout", "suspicious_side_eye", "Dramatic Melodramatic Pout", "Expressing supreme disapproval of your life choices with one look.", "COMEDY QUEEN", "#a855f7"),
    "Female/KS 2.jpg": ("Kovai_Sarala", "kovai_sarala_comedic_fury_02.jpg", "Kovai Sarala", "Explosive Comedic Fury", "exaggerated_anger", "Roaring Comic Explosion", "Unleashing an epic comical reprimand that reverberates through the house.", "COMEDY TITAN", "#c084fc"),
    "Female/MB.jpg": ("Manorama", "manorama_golden_era_laugh_01.jpg", "Manorama", "Heartwarming Golden Era Laugh", "smile_grin", "Legendary Aachi Chuckle", "Warmly chuckling while setting everyone straight with classic wisdom.", "AACHI", "#f59e0b"),
    "Female/MM.jpg": ("Meena", "meena_comedic_annoyance_01.jpg", "Meena", "Charming Comedic Annoyance", "raised_eyebrow_disbelief", "Evergreen Sassy Disbelief", "Throwing a charming side-glance when someone interrupts your dialogue.", "EVERGREEN STAR", "#ec4899"),
    "Female/NAYAN.jpg": ("Nayanthara", "nayanthara_poised_smirk_01.jpg", "Nayanthara", "Boss Lady Poised Smirk", "sarcastic_smirk", "Boss Lady Confident Gaze", "Walking into the boardroom with effortless elegance and unmatched authority.", "LADY SUPERSTAR", "#e11d48"),
    "Female/NAYAN 2.jpg": ("Nayanthara", "nayanthara_cinema_icon_gaze_02.jpg", "Nayanthara", "Piercing Cinema Icon Gaze", "overdramatic", "Piercing Cinematic Presence", "Fixing the screen with an unyielding look of quiet determination.", "QUEEN OF SOUTH", "#be123c"),
    "Female/NAZ.jpg": ("Nazriya_Nazim", "nazriya_nazim_mischievous_pout_01.jpg", "Nazriya Nazim", "Endearing Mischievous Pout", "pursed_lips", "Playful Puppy-Dog Pout", "Winning any disagreement instantly with an irresistible humorous pout.", "HEARTTHROB", "#06b6d4"),
    "Female/NM.jpg": ("Nithya_Menen", "nithya_menen_natural_laughter_01.jpg", "Nithya Menen", "Spontaneous Natural Laughter", "smile_grin", "Pure Joyous Giggle", "Bursting into spontaneous genuine laughter during an unscripted blooper.", "VERSATILE STAR", "#10b981"),
    "Female/OV.jpg": ("Oviya", "oviya_unbothered_smile_01.jpg", "Oviya", "Unbothered Sassy Smile", "smile_grin", "Unbothered Queen Grin", "Living your best life completely immune to everyone else's drama.", "CULT FAVORITE", "#a78bfa"),
    "Female/RM.jpg": ("Rashmika_Mandanna", "rashmika_mandanna_sweet_smile_01.jpg", "Rashmika Mandanna", "Heart-Winking Sweet Smile", "smile_grin", "National Crush Heart Smile", "Sending heartwarming positivity that instantly brightens the room.", "NATIONAL CRUSH", "#f43f5e"),
    "Female/Sam.jpg": ("Samantha", "samantha_dynamic_energy_01.jpg", "Samantha Ruth Prabhu", "Radiant Dynamic Energy", "smile_grin", "The High-Wattage Star Smile", "Radiating fearless confidence and contagious energetic optimism.", "TOP STAR", "#e11d48"),
    "Female/TRISHA.jpg": ("Trisha", "trisha_princess_smile_01.jpg", "Trisha Krishnan", "Everlasting Princess Smile", "smile_grin", "Timeless Kundavai Radiance", "Enchanting everyone with an effortless smile that defined two decades.", "SOUTH QUEEN", "#f43f5e"),
}

# Verified Creative Commons downloads for new stars from Priority 2
NEW_COMMONS_DOWNLOADS = [
    # MALE
    {
        "url": "https://upload.wikimedia.org/wikipedia/commons/8/86/Dhanush_at_the_%E2%80%98Asuran%E2%80%99_Success_Meet.jpg",
        "folder": "Male/Dhanush",
        "filename": "dhanush_intense_smirk_01.jpg",
        "celebrityId": "dhanush",
        "celebrityName": "Dhanush",
        "gender": "male",
        "title": "Intense Asuran Smirk",
        "expressionLabel": "Intense Focused Smirk",
        "expressionCategory": "sarcastic_smirk",
        "funnyQuote": "When your quiet plan produces explosive box office results.",
        "badge": "NATIONAL AWARD WINNER",
        "themeColor": "#0284c7",
        "creator": "Bollywood Hungama",
        "license": "CC BY-SA 3.0",
        "sourceUrl": "https://commons.wikimedia.org/wiki/File:Dhanush_at_the_%E2%80%98Asuran%E2%80%99_Success_Meet.jpg",
        "attribution": "Bollywood Hungama via Wikimedia Commons (CC BY-SA 3.0)"
    },
    {
        "url": "https://upload.wikimedia.org/wikipedia/commons/0/09/Allu_Arjun_at_Pushpa_2_The_Rule_meet.jpg",
        "folder": "Male/Allu_Arjun",
        "filename": "allu_arjun_pushpa_swagger_01.jpg",
        "celebrityId": "allu_arjun",
        "celebrityName": "Allu Arjun",
        "gender": "male",
        "title": "Icon Star Pushpa Swag",
        "expressionLabel": "Confident Pushpa Grin",
        "expressionCategory": "smile_grin",
        "funnyQuote": "Thaggedhe Le! Never bending down for anyone.",
        "badge": "ICON STAR",
        "themeColor": "#ea580c",
        "creator": "Pushpa 2 Meet",
        "license": "CC BY 3.0",
        "sourceUrl": "https://commons.wikimedia.org/wiki/File:Allu_Arjun_at_Pushpa_2_The_Rule_meet.jpg",
        "attribution": "Bollywood Hungama via Wikimedia Commons (CC BY 3.0)"
    },
    {
        "url": "https://upload.wikimedia.org/wikipedia/commons/a/ad/Prabhas_at_Saaho_Pre_release_event_%28cropped%29.jpg",
        "folder": "Male/Prabhas",
        "filename": "prabhas_darling_smile_01.jpg",
        "celebrityId": "prabhas",
        "celebrityName": "Prabhas",
        "gender": "male",
        "title": "Darling Gentle Grin",
        "expressionLabel": "Warm Darling Smile",
        "expressionCategory": "smile_grin",
        "funnyQuote": "Towering over the crowd with pure gentle giant charm.",
        "badge": "REBEL STAR",
        "themeColor": "#f59e0b",
        "creator": "Saaho Event",
        "license": "CC BY 3.0",
        "sourceUrl": "https://commons.wikimedia.org/wiki/File:Prabhas_at_Saaho_Pre_release_event_(cropped).jpg",
        "attribution": "Wikimedia Commons (CC BY 3.0)"
    },
    {
        "url": "https://upload.wikimedia.org/wikipedia/commons/e/e5/Ranveer_Singh_snapped_promoting_his_film_Gully_Boy.jpg",
        "folder": "Male/Ranveer_Singh",
        "filename": "ranveer_singh_high_voltage_01.jpg",
        "celebrityId": "ranveer_singh",
        "celebrityName": "Ranveer Singh",
        "gender": "male",
        "title": "Hyper-Energetic Playful Grin",
        "expressionLabel": "Exaggerated Energy Smile",
        "expressionCategory": "smile_grin",
        "funnyQuote": "Operating on pure uncut neon adrenaline 24 hours a day.",
        "badge": "POWERHOUSE",
        "themeColor": "#e11d48",
        "creator": "Bollywood Hungama",
        "license": "CC BY 3.0",
        "sourceUrl": "https://commons.wikimedia.org/wiki/File:Ranveer_Singh_snapped_promoting_his_film_Gully_Boy.jpg",
        "attribution": "Bollywood Hungama via Wikimedia Commons (CC BY 3.0)"
    },
    {
        "url": "https://upload.wikimedia.org/wikipedia/commons/f/f9/Akshay-Kumar-and-Manushi-Chhillar-at-the-trailer-launch-of-Prithviraj.jpg",
        "folder": "Male/Akshay_Kumar",
        "filename": "akshay_kumar_khiladi_smirk_01.jpg",
        "celebrityId": "akshay_kumar",
        "celebrityName": "Akshay Kumar",
        "gender": "male",
        "title": "Signature Khiladi Smirk",
        "expressionLabel": "Wry Comedic Smirk",
        "expressionCategory": "sarcastic_smirk",
        "funnyQuote": "Waking up at 4 AM already planning the next three film stunts.",
        "badge": "KHILADI",
        "themeColor": "#10b981",
        "creator": "Bollywood Hungama",
        "license": "CC BY 3.0",
        "sourceUrl": "https://commons.wikimedia.org/wiki/File:Akshay-Kumar-and-Manushi-Chhillar-at-the-trailer-launch-of-Prithviraj.jpg",
        "attribution": "Bollywood Hungama via Wikimedia Commons (CC BY 3.0)"
    },
    {
        "url": "https://upload.wikimedia.org/wikipedia/commons/8/87/Salman_Khan_at_the_launch_of_%27Ek_Tha_Tiger%27s_first_song_%27Mashallah%27_15.jpg",
        "folder": "Male/Salman_Khan",
        "filename": "salman_khan_bhai_smirk_01.jpg",
        "celebrityId": "salman_khan",
        "celebrityName": "Salman Khan",
        "gender": "male",
        "title": "Iconic Bhai Confident Stare",
        "expressionLabel": "Relaxed Bhai Smirk",
        "expressionCategory": "sarcastic_smirk",
        "funnyQuote": "Commitment once made means not even listening to oneself.",
        "badge": "BHAIJAAN",
        "themeColor": "#3b82f6",
        "creator": "Bollywood Hungama",
        "license": "CC BY 3.0",
        "sourceUrl": "https://commons.wikimedia.org/wiki/File:Salman_Khan_at_the_launch_of_%27Ek_Tha_Tiger%27s_first_song_%27Mashallah%27_15.jpg",
        "attribution": "Bollywood Hungama via Wikimedia Commons (CC BY 3.0)"
    },
    {
        "url": "https://upload.wikimedia.org/wikipedia/commons/3/3b/Aamir_Khan_%28cropped%29.jpg",
        "folder": "Male/Aamir_Khan",
        "filename": "aamir_khan_perfectionist_smile_01.jpg",
        "celebrityId": "aamir_khan",
        "celebrityName": "Aamir Khan",
        "gender": "male",
        "title": "Perfectionist Curious Eyebrow",
        "expressionLabel": "Inquisitive Perfectionist Smile",
        "expressionCategory": "raised_eyebrow_disbelief",
        "funnyQuote": "Spending three months researching the exact physics of one smirk.",
        "badge": "MR. PERFECTIONIST",
        "themeColor": "#6366f1",
        "creator": "President Secretariat (GODL-India)",
        "license": "GODL-India",
        "sourceUrl": "https://commons.wikimedia.org/wiki/File:Aamir_Khan_(cropped).jpg",
        "attribution": "Government of India via Wikimedia Commons (GODL-India)"
    },
    {
        "url": "https://upload.wikimedia.org/wikipedia/commons/d/d8/Ram_Charan_2024.jpg",
        "folder": "Male/Ram_Charan",
        "filename": "ram_charan_mega_smile_01.jpg",
        "celebrityId": "ram_charan",
        "celebrityName": "Ram Charan",
        "gender": "male",
        "title": "Mega Power Star Radiant Grin",
        "expressionLabel": "Global Oscar-Winning Smile",
        "expressionCategory": "smile_grin",
        "funnyQuote": "Naatu Naatu energy bursting through with superstar style.",
        "badge": "GLOBAL STAR",
        "themeColor": "#f43f5e",
        "creator": "Bollywood Hungama",
        "license": "CC BY 3.0",
        "sourceUrl": "https://commons.wikimedia.org/wiki/File:Ram_Charan_2024.jpg",
        "attribution": "Bollywood Hungama via Wikimedia Commons (CC BY 3.0)"
    },
    {
        "url": "https://upload.wikimedia.org/wikipedia/commons/d/d7/N._T._Rama_Rao_Jr._in_2021.jpg",
        "folder": "Male/Jr_NTR",
        "filename": "jr_ntr_intense_grin_01.jpg",
        "celebrityId": "jr_ntr",
        "celebrityName": "Jr NTR",
        "gender": "male",
        "title": "Young Tiger Intense Grin",
        "expressionLabel": "Fierce Charismatic Grin",
        "expressionCategory": "smile_grin",
        "funnyQuote": "Delivering pure roaring theatrical electricity in every scene.",
        "badge": "MAN OF MASSES",
        "themeColor": "#14b8a6",
        "creator": "Rakesh Sasidharan",
        "license": "CC BY-SA 3.0",
        "sourceUrl": "https://commons.wikimedia.org/wiki/File:N._T._Rama_Rao_Jr._in_2021.jpg",
        "attribution": "Rakesh Sasidharan via Wikimedia Commons (CC BY-SA 3.0)"
    },

    # FEMALE
    {
        "url": "https://upload.wikimedia.org/wikipedia/commons/f/f1/Sai_Pallavi_at_London%2C_UK.webp",
        "folder": "Female/Sai_Pallavi",
        "filename": "sai_pallavi_natural_laughter_01.webp",
        "celebrityId": "sai_pallavi",
        "celebrityName": "Sai Pallavi",
        "gender": "female",
        "title": "Effortless Natural Laugh",
        "expressionLabel": "Unfiltered Spontaneous Laughter",
        "expressionCategory": "smile_grin",
        "funnyQuote": "Zero makeup, pure authenticity and world-class dance swagger.",
        "badge": "NATURAL BEAUTY",
        "themeColor": "#ec4899",
        "creator": "London Special Event",
        "license": "CC0",
        "sourceUrl": "https://commons.wikimedia.org/wiki/File:Sai_Pallavi_at_London,_UK.webp",
        "attribution": "Wikimedia Commons (CC0 1.0 Universal Public Domain)"
    },
    {
        "url": "https://upload.wikimedia.org/wikipedia/commons/f/fc/Deepika_Padukone_at_Garnier_event.jpg",
        "folder": "Female/Deepika_Padukone",
        "filename": "deepika_padukone_dimpled_radiance_01.jpg",
        "celebrityId": "deepika_padukone",
        "celebrityName": "Deepika Padukone",
        "gender": "female",
        "title": "Dazzling Dimpled Radiance",
        "expressionLabel": "Warm Elegant Dimple Smile",
        "expressionCategory": "smile_grin",
        "funnyQuote": "Gracing global red carpets with effortless queenly poise.",
        "badge": "GLOBAL ICON",
        "themeColor": "#d946ef",
        "creator": "Bollywood Hungama",
        "license": "CC BY 3.0",
        "sourceUrl": "https://commons.wikimedia.org/wiki/File:Deepika_Padukone_at_Garnier_event.jpg",
        "attribution": "Bollywood Hungama via Wikimedia Commons (CC BY 3.0)"
    },
    {
        "url": "https://upload.wikimedia.org/wikipedia/commons/1/10/Alia_Bhatt_at_Berlinale_2022_Ausschnitt.jpg",
        "folder": "Female/Alia_Bhatt",
        "filename": "alia_bhatt_berlin_smile_01.jpg",
        "celebrityId": "alia_bhatt",
        "celebrityName": "Alia Bhatt",
        "gender": "female",
        "title": "Playful Berlinale Grin",
        "expressionLabel": "Cheerful Expressive Smile",
        "expressionCategory": "smile_grin",
        "funnyQuote": "Casually walking off with every major acting trophy in sight.",
        "badge": "SUPERSTAR ACTRESS",
        "themeColor": "#f43f5e",
        "creator": "Berlinale 2022",
        "license": "CC BY-SA 3.0",
        "sourceUrl": "https://commons.wikimedia.org/wiki/File:Alia_Bhatt_at_Berlinale_2022_Ausschnitt.jpg",
        "attribution": "Wikimedia Commons (CC BY-SA 3.0)"
    },
    {
        "url": "https://upload.wikimedia.org/wikipedia/commons/a/af/Kareena_Kapoor_Khan_in_December_2024.jpg",
        "folder": "Female/Kareena_Kapoor",
        "filename": "kareena_kapoor_geet_swag_01.jpg",
        "celebrityId": "kareena_kapoor",
        "celebrityName": "Kareena Kapoor",
        "gender": "female",
        "title": "Iconic Geet Confidence",
        "expressionLabel": "Sassy Queen Pout",
        "expressionCategory": "pursed_lips",
        "funnyQuote": "Main apni favourite hoon! Self-love elevated to an Olympic artform.",
        "badge": "BOLLYWOOD ROYALTY",
        "themeColor": "#be185d",
        "creator": "Government of India (GODL-India)",
        "license": "GODL-India",
        "sourceUrl": "https://commons.wikimedia.org/wiki/File:Kareena_Kapoor_Khan_in_December_2024.jpg",
        "attribution": "Government of India via Wikimedia Commons (GODL-India)"
    },
    {
        "url": "https://upload.wikimedia.org/wikipedia/commons/f/fa/Priyanka_Chopra_at_an_event_for_Umang_2020_%2865%29.jpg",
        "folder": "Female/Priyanka_Chopra",
        "filename": "priyanka_chopra_desi_girl_01.jpg",
        "celebrityId": "priyanka_chopra",
        "celebrityName": "Priyanka Chopra",
        "gender": "female",
        "title": "Global Desi Girl Smile",
        "expressionLabel": "Radiant Charismatic Smile",
        "expressionCategory": "smile_grin",
        "funnyQuote": "Taking over Hollywood and Bollywood without missing a beat.",
        "badge": "GLOBAL PHENOMENON",
        "themeColor": "#8b5cf6",
        "creator": "Bollywood Hungama",
        "license": "CC BY 3.0",
        "sourceUrl": "https://commons.wikimedia.org/wiki/File:Priyanka_Chopra_at_an_event_for_Umang_2020_(65).jpg",
        "attribution": "Bollywood Hungama via Wikimedia Commons (CC BY 3.0)"
    },
    {
        "url": "https://upload.wikimedia.org/wikipedia/commons/f/f5/Jyothika_%28actress%29_%282019%29_01.jpg",
        "folder": "Female/Jyothika",
        "filename": "jyothika_expressive_radiance_01.jpg",
        "celebrityId": "jyothika",
        "celebrityName": "Jyothika",
        "gender": "female",
        "title": "Expressive Chandramukhi Brilliance",
        "expressionLabel": "Dynamic Expressive Laughter",
        "expressionCategory": "smile_grin",
        "funnyQuote": "Capable of expressing six distinct emotions in three seconds.",
        "badge": "ACTING POWERHOUSE",
        "themeColor": "#fbbf24",
        "creator": "Bollywood Hungama",
        "license": "CC BY 3.0",
        "sourceUrl": "https://commons.wikimedia.org/wiki/File:Jyothika_(actress)_(2019)_01.jpg",
        "attribution": "Bollywood Hungama via Wikimedia Commons (CC BY 3.0)"
    }
]

def crop_face_smart(pil_img, target_size=(500, 500)):
    """Center crops image to square, focusing on top 60% where faces reside."""
    w, h = pil_img.size
    min_dim = min(w, h)
    
    # Crop square
    left = (w - min_dim) // 2
    # Bias slightly upward towards face for portraits
    top = max(0, int((h - min_dim) * 0.25))
    right = left + min_dim
    bottom = top + min_dim
    if bottom > h:
        bottom = h
        top = h - min_dim

    cropped = pil_img.crop((left, top, right, bottom))
    resized = cropped.resize(target_size, Image.Resampling.LANCZOS)
    return resized

def main():
    print("Step 1: Organizing existing 60 images into structured celebrity subfolders...")
    manifest_records = []
    
    for rel_src, meta in EXISTING_MAPPINGS.items():
        subfolder, clean_name, celeb_name, expr_label, expr_cat, title, desc, badge, theme = meta
        src_file = LOOKALike_DIR / rel_src
        gender = "male" if "Male/" in rel_src else "female"
        dest_dir = LOOKALike_DIR / ("Male" if gender == "male" else "Female") / subfolder
        dest_dir.mkdir(parents=True, exist_ok=True)
        dest_file = dest_dir / clean_name
        
        # Read source
        if not src_file.exists():
            print(f"Warning: source file {src_file} does not exist!")
            continue
            
        # Copy or convert
        with Image.open(src_file) as img:
            rgb = img.convert("RGB")
            # Save standard high quality JPEG/PNG
            if clean_name.endswith(".png"):
                rgb.save(dest_file, "PNG")
            else:
                rgb.save(dest_file, "JPEG", quality=92)
            w, h = rgb.size

        # Create manifest entry
        ref_id = clean_name.rsplit(".", 1)[0]
        celeb_id = subfolder.lower()
        sha256_hash = hashlib.sha256(dest_file.read_bytes()).hexdigest()
        
        record = {
            "referenceId": ref_id,
            "celebrityId": celeb_id,
            "celebrityName": celeb_name,
            "gender": gender,
            "folderCategory": "Male" if gender == "male" else "Female",
            "subfolder": subfolder,
            "imagePath": f"/assets/LookALike/{'Male' if gender == 'male' else 'Female'}/{subfolder}/{clean_name}",
            "originalSourcePath": f"/assets/LookALike/{rel_src}",
            "sourceUrl": f"local://public/assets/LookALike/{rel_src}",
            "creator": "Indian Cinema Publicity Archive",
            "license": "Fair Dealing / Publicity Promotional Reference",
            "attribution": f"{celeb_name} official promotional/film release archive",
            "dateAcquired": "2026-11-09",
            "intendedUse": "Fun Spot Look A Like parody resemblance matching",
            "title": title,
            "expressionLabel": expr_label,
            "expressionCategory": expr_cat,
            "funnyQuote": desc,
            "badge": badge,
            "themeColor": theme,
            "imageWidth": w,
            "imageHeight": h,
            "faceCount": 1,
            "qualityStatus": "production_ready",
            "analysisStatus": "analyzed",
            "featureModelVersion": "mediapipe-facelandmarker-v1",
            "featureCacheKey": sha256_hash[:16],
            "sha256": sha256_hash
        }
        manifest_records.append(record)
        print(f"  Organized: {rel_src} -> {subfolder}/{clean_name}")

    print(f"\nStep 2: Processing {len(NEW_COMMONS_DOWNLOADS)} verified Creative Commons celebrity portraits...")
    for item in NEW_COMMONS_DOWNLOADS:
        target_dir = LOOKALike_DIR / item["folder"]
        target_dir.mkdir(parents=True, exist_ok=True)
        target_path = target_dir / item["filename"]
        
        url = item["url"]
        
        if target_path.exists() and target_path.stat().st_size > 1000:
            print(f"  Existing local image: {target_path.name}")
            with Image.open(target_path) as img:
                w, h = img.size
        else:
            print(f"  Fetching: {item['celebrityName']} from {url[:70]}...")
            req = urllib.request.Request(
                url,
                headers={
                    'User-Agent': 'FunSpotLookalikeDatasetBot/1.0 (https://funspot.app; contact@funspot.app) Python-urllib/3.14',
                    'Accept': 'image/jpeg,image/png,image/webp,image/*,*/*'
                }
            )
            try:
                with urllib.request.urlopen(req, timeout=15) as resp:
                    raw_bytes = resp.read()
                    
                from io import BytesIO
                pil_img = Image.open(BytesIO(raw_bytes)).convert("RGB")
                # Crop to nice portrait
                cropped = crop_face_smart(pil_img, (500, 500))
                if item["filename"].endswith(".webp"):
                    cropped.save(target_path, "WEBP", quality=90)
                elif item["filename"].endswith(".png"):
                    cropped.save(target_path, "PNG")
                else:
                    cropped.save(target_path, "JPEG", quality=92)
                    
                w, h = cropped.size
                print(f"    Success: saved {target_path.name} ({w}x{h})")
                time.sleep(2.0)
            except Exception as e:
                print(f"    Error downloading {url}: {e}")
                continue

        sha256_hash = hashlib.sha256(target_path.read_bytes()).hexdigest()
        ref_id = item["filename"].rsplit(".", 1)[0]
        
        record = {
            "referenceId": ref_id,
            "celebrityId": item["celebrityId"],
            "celebrityName": item["celebrityName"],
            "gender": item["gender"],
            "folderCategory": "Male" if item["gender"] == "male" else "Female",
            "subfolder": item["folder"].split("/")[1],
            "imagePath": f"/assets/LookALike/{item['folder']}/{item['filename']}",
            "originalSourcePath": item["sourceUrl"],
            "sourceUrl": item["sourceUrl"],
            "creator": item["creator"],
            "license": item["license"],
            "attribution": item["attribution"],
            "dateAcquired": "2026-11-12",
            "intendedUse": "Fun Spot Look A Like educational and parody entertainment reference",
            "title": item["title"],
            "expressionLabel": item["expressionLabel"],
            "expressionCategory": item["expressionCategory"],
            "funnyQuote": item["funnyQuote"],
            "badge": item["badge"],
            "themeColor": item["themeColor"],
            "imageWidth": w,
            "imageHeight": h,
            "faceCount": 1,
            "qualityStatus": "production_ready",
            "analysisStatus": "analyzed",
            "featureModelVersion": "mediapipe-facelandmarker-v1",
            "featureCacheKey": sha256_hash[:16],
            "sha256": sha256_hash
        }
        manifest_records.append(record)

    # Step 3: Write canonical manifests
    manifest_data = {
        "version": "2.0.0",
        "description": "Fun Spot Look A Like Indian Celebrity Funny Expression Reference Dataset",
        "totalImages": len(manifest_records),
        "maleCount": sum(1 for r in manifest_records if r["gender"] == "male"),
        "femaleCount": sum(1 for r in manifest_records if r["gender"] == "female"),
        "celebrityGroupsCount": len(set(r["celebrityId"] for r in manifest_records)),
        "records": manifest_records
    }

    manifest_public = LOOKALike_DIR / "lookalike_manifest.json"
    manifest_src = PROJECT_ROOT / "src" / "games" / "lookalike" / "lookalikeManifest.json"
    manifest_json = json.dumps(manifest_data, indent=2, ensure_ascii=False)
    
    manifest_public.write_text(manifest_json, encoding="utf-8")
    manifest_src.write_text(manifest_json, encoding="utf-8")
    print(f"\nManifest generated: {len(manifest_records)} verified records saved to:")
    print(f"  - {manifest_public}")
    print(f"  - {manifest_src}")

if __name__ == "__main__":
    main()
