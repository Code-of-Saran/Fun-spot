import urllib.request
import urllib.parse
import json

CELEB_QUERIES = [
    ("Dhanush", "Male"),
    ("Allu Arjun", "Male"),
    ("Prabhas", "Male"),
    ("Ranveer Singh", "Male"),
    ("Akshay Kumar", "Male"),
    ("Salman Khan", "Male"),
    ("Aamir Khan", "Male"),
    ("Ram Charan", "Male"),
    ("N. T. Rama Rao Jr.", "Male"),
    ("Sai Pallavi", "Female"),
    ("Deepika Padukone", "Female"),
    ("Alia Bhatt", "Female"),
    ("Kareena Kapoor", "Female"),
    ("Priyanka Chopra", "Female"),
    ("Jyothika", "Female"),
]

def search_commons(query, limit=5):
    url = f"https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search&gsrsearch={urllib.parse.quote(query)}&gsrnamespace=6&gsrlimit={limit}&prop=imageinfo&iiprop=url|size|extmetadata|mime"
    req = urllib.request.Request(url, headers={'User-Agent': 'FunSpotLookALikeAudit/1.0 (funspot@example.com)'})
    try:
        with urllib.request.urlopen(req, timeout=12) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            pages = data.get('query', {}).get('pages', {})
            results = []
            for pid, page in pages.items():
                title = page.get('title')
                img_infos = page.get('imageinfo', [])
                if not img_infos:
                    continue
                info = img_infos[0]
                meta = info.get('extmetadata', {})
                mime = info.get('mime', '')
                if not mime.startswith('image/'):
                    continue
                license_name = meta.get('LicenseShortName', {}).get('value', 'Unknown')
                artist = meta.get('Artist', {}).get('value', 'Unknown')
                desc = meta.get('ImageDescription', {}).get('value', '')
                results.append({
                    'title': title,
                    'url': info.get('url'),
                    'width': info.get('width'),
                    'height': info.get('height'),
                    'license': license_name,
                    'artist': artist,
                    'description': desc
                })
            return results
    except Exception as e:
        print(f"Error searching {query}:", e)
        return []

all_found = {}
for celeb, gender in CELEB_QUERIES:
    res = search_commons(celeb, 4)
    all_found[celeb] = {'gender': gender, 'items': res}
    print(f"{celeb} ({gender}): found {len(res)} CC images")
    for item in res:
        print(f"   [{item['license']}] {item['title'][:50]} | {item['width']}x{item['height']}")

with open('scripts/commons_candidates.json', 'w', encoding='utf-8') as f:
    json.dump(all_found, f, indent=2)

