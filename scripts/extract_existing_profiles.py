import re
import json

with open("src/games/lookalike/celebrityDatabase.js", encoding="utf-8") as f:
    text = f.read()

# Let's see how MALE_CELEBRITIES and FEMALE_CELEBRITIES are structured
# We can use python to evaluate or parse them
# Notice they are standard JS objects.
print("File length:", len(text))

