import json

data = json.load(open('scripts/lookalike_audit_report.json', 'r', encoding='utf-8'))
for cat in ['maleRecords', 'femaleRecords']:
    for r in data[cat]:
        if r['issues'] or r['status'] != 'valid':
            print(f"{r['folderCategory']}/{r['filename']} ({r['actualFormat']}, {r['width']}x{r['height']}): {r['issues']}")

