import re

text = open("src/games/lookalike/celebrityDatabase.js", encoding="utf-8").read()
male_ids = re.findall(r"id:\s*['\"](male_[^'\"]+)['\"]", text)
female_ids = re.findall(r"id:\s*['\"](female_[^'\"]+)['\"]", text)

print("Male entries in celebrityDatabase.js:", len(male_ids))
print("Female entries in celebrityDatabase.js:", len(female_ids))

