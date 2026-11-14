# Game modules

Each game mode gets its own folder here. Game logic (camera, detection, scoring,
AI calls) lives in these folders and is kept separate from the UI.

| Folder          | Mode                    | Phase | Mounted by                  |
| --------------- | ----------------------- | ----- | --------------------------- |
| `random/`       | 🎲 Random (built)       | 2     | `src/pages/RandomGame.jsx`   |
| `mirror/`       | 🪞 AI Mirror (built)    | 3     | `src/pages/AIMirror.jsx`     |
| `dontLaugh/`    | 😂 Don't Laugh (built)  | 4     | `src/pages/DontLaugh.jsx`    |
| `wrongAnswers/` | ❌ Wrong Answers Only!! | 5     | `src/pages/WrongAnswers.jsx` |

Suggested layout for each folder:

```text
random/
├── index.js        # public entry: the game's root component
├── components/     # game-specific UI
├── engine/         # pure logic (challenge picking, scoring) — no React
└── hooks/          # e.g. useWebcam, usePoseTracking
```

Shared pieces:

- Mode metadata (title, route, theme, phase) → `src/data/gameModes.js`
- Leaderboard data access → `src/services/leaderboard.js` (Supabase + localStorage fallback)
- Camera + MediaPipe → `src/vision/` (`useCamera`, `useVisionLoop`, landmark helpers)
- Reusable UI → `src/components/{common,game,leaderboard,layout,camera}`
- Don't Laugh photo storage → Flask backend in `backend/` (`POST /api/dont-laugh/capture`)
