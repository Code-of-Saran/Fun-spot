import re
from pathlib import Path

content = Path('src/games/lookalike/celebrityDatabase.js').read_text(encoding='utf-8')

# parse blocks
entries = re.findall(r"\{\s*id:\s*'([^']+)',\s*name:\s*'([^']+)',\s*title:\s*'([^']+)',\s*expression:\s*'([^']+)',.*?image:\s*'([^']+)',\s*gender:\s*'([^']+)',", content, re.DOTALL)

print(f"Total entries found: {len(entries)}")
for i, (cid, name, title, expr, img, gender) in enumerate(entries, 1):
    print(f"{i:02d}. [{gender.upper()}] {name:25} | {expr:30} | {img}")

