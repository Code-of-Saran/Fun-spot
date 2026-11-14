import time
import urllib.request
import urllib.parse
from PIL import Image
from io import BytesIO
from pathlib import Path

REMAINING = [
    ("Salman_Khan", "salman_khan_bhai_smirk_01.jpg", "https://upload.wikimedia.org/wikipedia/commons/d/df/Salman_Khan_at_the_launch_of_%27Ek_Tha_Tiger%27s_first_song.jpg"),
    ("Aamir_Khan", "aamir_khan_perfectionist_smile_01.jpg", "https://upload.wikimedia.org/wikipedia/commons/a/af/Aamir_Khan_%28cropped%29.jpg"),
    ("Ram_Charan", "ram_charan_mega_smile_01.jpg", "https://upload.wikimedia.org/wikipedia/commons/4/47/Ram_Charan_2024.jpg"),
    ("Jr_NTR", "jr_ntr_intense_grin_01.jpg", "https://upload.wikimedia.org/wikipedia/commons/3/30/N._T._Rama_Rao_Jr._in_2021.jpg"),
    ("Sai_Pallavi", "sai_pallavi_natural_laughter_01.webp", "https://upload.wikimedia.org/wikipedia/commons/b/b8/Sai_Pallavi_at_London%2C_UK.webp"),
    ("Deepika_Padukone", "deepika_padukone_dimpled_radiance_01.jpg", "https://upload.wikimedia.org/wikipedia/commons/f/fc/Deepika_Padukone_at_Garnier_event.jpg"),
    ("Alia_Bhatt", "alia_bhatt_berlin_smile_01.jpg", "https://upload.wikimedia.org/wikipedia/commons/1/10/Alia_Bhatt_at_Berlinale_2022_Ausschnitt.jpg"),
    ("Priyanka_Chopra", "priyanka_chopra_desi_girl_01.jpg", "https://upload.wikimedia.org/wikipedia/commons/f/fa/Priyanka_Chopra_at_an_event_for_Umang_2020_%2865%29.jpg"),
    ("Jyothika", "jyothika_expressive_radiance_01.jpg", "https://upload.wikimedia.org/wikipedia/commons/f/f5/Jyothika_%28actress%29_%282019%29_01.jpg")
]

headers = {
    'User-Agent': 'FunSpotLookalikeDatasetBot/1.0 (https://funspot.app; contact@funspot.app) Python-urllib/3.14',
    'Accept': 'image/jpeg,image/png,image/webp,image/*,*/*'
}

for folder, fname, url in REMAINING:
    print(f"Testing {folder} -> {url}")
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = resp.read()
            print(f"  OK! Received {len(data)} bytes")
    except Exception as e:
        print(f"  Failed: {e}")
    time.sleep(3)

