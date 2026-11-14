# 🎮 Fun Spot

An AI-powered entertainment arcade for a college tech expo — four games in one cyberpunk web app:

| Mode | What you do | Tech | Leaderboard |
| --- | --- | --- | --- |
| 🎲 **Random** | Do the random challenge shown on screen | MediaPipe Pose + Hands, rule-based detectors | ✅ Random |
| 🪞 **AI Mirror** | The system randomly turns you into a character | MediaPipe Face Landmarker + canvas AR | — |
| 😂 **Don't Laugh** | Watch funny scenes without laughing | Face blendshapes laugh meter, rolling frame buffer | — (photos saved) |
| ❌ **Wrong Answers Only!!** | Give the funniest *wrong* answer | Claude AI judge (backend) | ✅ Wrong Answers |

## Quick start

Requirements: **Node 20+**, **Python 3.10+**, Chrome or Edge, a webcam.

```bash
npm install
pip install -r backend/requirements.txt
cp .env.example .env        # optional: Supabase + AI key (see below)
```

### Expo mode (one command, one window)

```bash
npm run expo                # builds the site, then serves site + API at http://localhost:5000
```

### Development

```bash
npm run backend             # terminal 1 — Flask API on :5000
npm run dev                 # terminal 2 — Vite on :5173 (proxies /api to Flask)
```

The first `npm run dev` / `npm run build` downloads the MediaPipe models into `public/mediapipe/`
(needs internet once); after that everything except the optional AI judge and Supabase runs offline.

## Configuration (`.env`)

| Variable | Used by | Purpose |
| --- | --- | --- |
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | browser | Live online leaderboards. Without them scores are kept in the browser. Run `supabase/migrations/*.sql` first. |
| `AI_API_KEY` | backend only | Claude API key for the Wrong Answers AI judge. Without it the game uses labelled backup scoring. |
| `AI_MODEL`, `AI_TIMEOUT_SECONDS` | backend only | Optional judge overrides (default `claude-opus-5-5`, 20 s). |

Secrets never go in `VITE_` variables — those are shipped to the browser.

## Project layout

```text
src/
  pages/            route entry points (Landing, RandomGame, AIMirror, DontLaugh, WrongAnswers, Leaderboards)
  games/            one folder per game — logic, state machine, components, tests
  vision/           shared camera + MediaPipe (pose, hands, face) + frame loop
  components/       shared UI (layout, buttons, camera feed, leaderboard)
  services/         leaderboard (Supabase + offline fallback), Don't Laugh upload, AI judge client
backend/
  app.py            Flask app (API + serves the built site)
  routes/           /api/dont-laugh/capture, /api/wrong-answers/judge
  services/         ai_judge.py (provider-agnostic judge_answer)
  captures/dont-laugh/   saved laugh photos
supabase/migrations/     leaderboard table, validation rules, realtime
```

## Tests

```bash
npm test                    # frontend unit tests (Vitest)
npm run test:backend        # backend tests (unittest)
npm run build               # production build
```

## Expo checklist

- Run `npm run expo` on the demo laptop and open http://localhost:5000 (camera needs `localhost` or HTTPS).
- Allow the camera once in Chrome; it is remembered for the site.
- Don't Laugh photos land in `backend/captures/dont-laugh/` — players see a notice before playing.
- Tune Don't Laugh sensitivity in `src/games/dontLaugh/gameConfig.js` and Random detector thresholds in
  `src/games/random/detectors/` with the expo camera and lighting.
