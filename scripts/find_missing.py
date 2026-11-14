import os, re
from pathlib import Path

content = Path('src/games/lookalike/celebrityDatabase.js').read_text(encoding='utf-8')
used_images = set(re.findall(r"image:\s*'([^']+)'", content))

disk_files = []
for root, dirs, files in os.walk('public/assets/LookALike'):
    for f in files:
        rel = '/' + os.path.relpath(os.path.join(root, f), 'public').replace('\\', '/')
        disk_files.append(rel)

print('In disk but not in celebrityDatabase.js:')
for d in disk_files:
    if d not in used_images:
        print(' ', d)

