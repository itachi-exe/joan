# Joan web configuration

Vite variables are public. Never put keys in them. The web calls the local persisted agent API by default; no browser-only commission is substituted on failure.

| Variable | Where it comes from | What it unlocks | Default / missing |
|---|---|---|---|
| `VITE_JOAN_API_URL` | Your loopback Joan agent (`../agent/README.md`) | Persisted commissions, reports, wallet policy and ledger | `http://127.0.0.1:4310`; when unavailable, labelled sample stories only |
| `VITE_JOAN_WIRE_URL` | Optional trusted public JSON feed | A fallback wire feed when the research API is unavailable | Deterministic, labelled demo checks; online API reports always take precedence |
| `VITE_EXPLORER_TX_URL` | Separately approved chain explorer URL containing `{tx}` | Explorer links for genuine transaction hashes only | Mock references never become explorer links |
| `VITE_JOAN_INTRO_AUDIO` | Optional `1` only with a supplied `public/audio/joan-intro.mp3` | Optional voice over the synthesized typewriter/paper sound | No file request; synthesized gesture-triggered sound still works |

The API preserves its own adapter provenance. A reachable HTTP service is not proof of live research or payment. Mock sources/receipts retain Demo data labels. API reports and ledger persist in SQLite; pending request IDs and retry status persist in the browser. A timed-out commission reuses its original `Idempotency-Key` and payload.

Server-only keys are documented in `../agent/KEYS-NEEDED.md` and `../agent/.env.example`: `TAVILY_API_KEY` (public-source search), `OPENAI_API_KEY` / `OPENAI_MODEL` (drafting), `CELO_BUY_API_URL` and `ALTANA_SESSION_KEY` (configuration boundaries; live payment/signing deliberately refused). See `../PAYMENT-PROOF.md`. No live keys, wallets, signatures or spending were used.

Run `npm run build`, then `npm run preview -- --host 127.0.0.1 --port 4174 --strictPort`. In another terminal run the agent with `npm start`. CORS is limited to known local origins. No deployment is authorized by these settings.
