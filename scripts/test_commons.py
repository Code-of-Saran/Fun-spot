import urllib.request
import urllib.parse
import json

def search_commons_files(query, limit=5):
    url = f"https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search&gsrsearch={urllib.parse.quote(query)}&gsrnamespace=6&gsrlimit={limit}&prop=imageinfo&iiprop=url|size|extmetadata|mime"
    req = urllib.request.Request(url, headers={'User-Agent': 'FunSpotLookALikeAudit/1.0 (funspot@example.com)'})
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            pages = data.get('query', {}).get('pages', {})
            results = []
            for pid, page in pages.items():
                title = page.get('title')
                img_info = page.get('imageinfo', [{}])[0]
                results.append({
                    'title': title,
                    'url': img_info.get('url'),
                    'width': img_info.get('width'),
                    'height': img_info.get('height'),
                    'mime': img_info.get('mime'),
                    'license': img_info.get('extmetadata', {}).get('LicenseShortName', {}).get('value'),
                    'artist': img_info.get('extmetadata', {}).get('Artist', {}).get('value'),
                })
            return results
    except Exception as e:
        print("Error:", e)
        return []

res = search_commons_files("Shah Rukh Khan", 3)
for r in res:
    print(r['title'], r['license'], r['url'])
