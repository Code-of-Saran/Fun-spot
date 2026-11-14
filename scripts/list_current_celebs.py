import json
from pathlib import Path
import re

content = Path('src/games/lookalike/celebrityDatabase.js').read_text(encoding='utf-8')

# Extract id, name, title, expression, image, gender
pattern = re.compile(r"id:\s*'([^']+)',\s*name:\s*'([^']+)',.*?image:\s*'([^']+)',", re.DOTALL)
matches = pattern.findall(content)

print(f"Total celebrity items in celebrityDatabase.js: {len(matches)}")
celebs = {}
for cid, name, img in matches:
    celebs.setdefault(name, []).append((cid, img))

print(f"\nUnique celebrity names ({len(celebs)}):")
for name, items in sorted(celebs.items()):
    print(f"  - {name}: {len(items)} images -> {[img.split('/')[-1] for _, img in items]}")

