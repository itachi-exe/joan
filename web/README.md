# Joan web

Vintage gazette front end for Joan, an AI journalist. Vite + vanilla TypeScript, static build, no backend.
Stories marked Sample in `src/data/stories.json` are invented. Commissioned dispatches come from the research adapter.

## Run

    npm install
    npm run dev        # development
    npm run build      # type check + static build to dist/
    npx vite preview --port 4174   # serve dist/ where the scripts expect it
    npm test           # unit tests (vitest)
    npm run test:e2e   # Playwright flows at 390 and 1440, needs the preview on 4174

Routes (hash based, so any static host works): `/` entrance, `#/front`, `#/story/<id>`, `#/archives`, `#/about`, `#/90s`.

## Adapters (live or mock)

`src/adapters/` holds research, wire and wallet. Each runs live when its env var is set and falls back to
deterministic mock data with a "Demo data" tag. See `.env.example` and `KEYS-NEEDED.md`. Never commit real keys.
Rules in `src/logic/` (ledger sums, commission validation, spend cap, storage) are unit tested.

## Audio

Drop a voice file at `public/audio/joan-intro.mp3`. The entrance synthesises typewriter keys, a carriage bell,
paper rustle and a radio crackle on tap. If the file is missing or playback is blocked, the app runs silently.
Reduced motion skips the typewriter handoff and page transitions.

## Checks

`scripts/e2e.py` (asserting flows, overflow, console errors, saves `shots/e2e/`), `scripts/shots.py` (screenshot sheets, overflow)
and `scripts/swipe.py` (touch swipe) use Python Playwright against the preview on port 4174.
