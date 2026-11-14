import urllib.request
import time

urls = [
    ("Salman_Khan", "https://upload.wikimedia.org/wikipedia/commons/8/87/Salman_Khan_at_the_launch_of_%27Ek_Tha_Tiger%27s_first_song_%27Mashallah%27_15.jpg"),
    ("Aamir_Khan", "https://upload.wikimedia.org/wikipedia/commons/3/3b/Aamir_Khan_%28cropped%29.jpg"),
    ("Ram_Charan", "https://upload.wikimedia.org/wikipedia/commons/d/d8/Ram_Charan_2024.jpg"),
    ("Jr_NTR", "https://upload.wikimedia.org/wikipedia/commons/d/d7/N._T._Rama_Rao_Jr._in_2021.jpg"),
    ("Sai_Pallavi", "https://upload.wikimedia.org/wikipedia/commons/f/f1/Sai_Pallavi_at_London%2C_UK.webp")
]

headers = {
    'User-Agent': 'FunSpotLookalikeDatasetBot/1.0 (https://funspot.app; contact@funspot.app) Python-urllib/3.14',
    'Accept': 'image/jpeg,image/png,image/webp,image/*,*/*'
}

for name, url in urls:
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = resp.read()
            print(f"SUCCESS: {name} ({len(data)} bytes)")
    except Exception as e:
        print(f"FAILED: {name} -> {e}")
    time.sleep(2)

