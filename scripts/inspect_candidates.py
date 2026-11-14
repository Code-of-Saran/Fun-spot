import json

data = json.load(open('scripts/commons_candidates.json'))
for celeb, info in data.items():
    print(f"\n=== {celeb} ({info['gender']}) ===")
    for idx, item in enumerate(info['items']):
        print(f"  {idx+1}. {item['title']}")
        print(f"     License: {item['license']} | Size: {item['width']}x{item['height']}")
        print(f"     URL: {item['url']}")

