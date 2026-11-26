# Joan agent

Local TypeScript / Node 22.13+ / SQLite research service. Runs end to end with no keys. No wallet is created and no transaction or signature is produced. Node 22 currently prints an experimental SQLite warning.

## Run

```sh
cd /opt/hermes/projects/hackathon-sprint/joan/agent
npm ci
npm run build
npm run typecheck
npm test
npm run demo:allowed
npm run demo:blocked
npm run demo:revoke
npm start
```

API binds **127.0.0.1:4310**, not a public interface. State persists in `state/joan.sqlite` including assignments, reports, reservations, simulated settlement receipts and revocation. Restarting never creates a new mock balance or clears the ledger. Do not delete the database to “fix” ambiguous settlements.

```sh
curl -s http://127.0.0.1:4310/health
curl -s http://127.0.0.1:4310/assignments \
  -H 'Content-Type: application/json' -H 'Idempotency-Key: editorial-001' \
  -d '{"text":"Check the provenance of a public transit fare claim","budget":0.05}'
```

The POST returns the completed report. Repeat **the same Idempotency-Key and payload** after a client timeout; do not generate a replacement key. The response includes `id` / `assignmentId`. Failed research remains in the assignments table. Retrying a failed draft can reuse a settled receipt; ambiguous purchases cannot be retried.

## HTTP contract

All endpoints also accept `/api` as a prefix. JSON requests only, maximum 16 KiB. Errors are `{error, message, layer}`. Money is integer USDC micros internally (1 USDC = 1,000,000 micros); editor `budget` is dollar-denominated, maximum $10 and six decimal places.

| Method | Endpoint | Response / input |
|---|---|---|
| GET | `/health` | Modes and signing safety state |
| POST | `/assignments`, `/commissions` | `{text, budget}` -> Report; optional `Idempotency-Key` header |
| POST | `/commissions/attempt` | Same input and authoritative commission path; HTTP 200 `{outcome:'accepted', report}` or `{outcome:'denied', denial:{error,message,layer}}` for evaluated policy refusals |
| GET | `/assignments/:id` | Persisted status, input, error |
| GET | `/reports/:id` | Persisted report |
| GET | `/reports` | Report array, newest first |
| GET | `/wallet` | Balance micros, session, mode, demo flag |
| GET | `/permissions` | Session cap, contract allowlist, expiry, revoke state |
| POST | `/permissions`, `/wallet/grant` | Mock grant `{capMicros, allowlist, expiresAt}`; expiry is epoch milliseconds, at most 24h |
| POST | `/revoke`, `/wallet/revoke` | `{}` -> persisted mock revocation |
| GET | `/ledger` | `{mode, demoData, entries}` |
| POST | `/ledger/reconcile` | `{}` -> `{settled, unresolved}`; no purchase retry |
| GET | `/wire` | Reports as read-only wire items |

Reports include the exact label **AI-generated report. Prepared by Joan.**, headline, summary, `know`, `unclear`, sources with provenance, confidence, `spending` receipts and integer `researchSpending`. `body` and editorial display fields match the existing web Story shape. Mock receipts start `mock_` and are **not transaction hashes**. Source fixtures never claim a document was fetched. A report containing any mock research/drafting adapter is marked `origin: mock`, `demoData: true`, low confidence.

The dashboard uses the attempt RPC so expected policy denials are domain results, not failed browser resource loads. It executes the same `joan.create` checks and preserves failed assignment audit records. A denied result never contains a report or skips a spending guard. Only known cap, session and allowlist policy faults receive a denial envelope; malformed requests, idempotency conflicts, infrastructure failures and live-signing safety locks keep their non-2xx HTTP status. Original `/assignments` and `/commissions` contracts are unchanged, including HTTP 409 refusals. API and browser tests assert denied attempts leave balance, ledger and published reports unchanged.

## Adapters and safety boundaries

- Public research: deterministic fixtures without `TAVILY_API_KEY`; otherwise Tavily public-source search, bounded timeouts and no automatic classification of search results as verified originals.
- LLM: deterministic drafts without `OPENAI_API_KEY`; otherwise one OpenAI provider (`OPENAI_MODEL`). Provider errors surface, never silently become mock findings. Sources are untrusted prompt data.
- Celo Buy x402: mock $0.005 quote, durable simulated settlement, EIP-3009 / `eip155:42220` metadata. Setting `CELO_BUY_API_URL` selects live mode **but returns `live_payment_unproven` before any network call or signature**. This is an intentional safety lock, not a completed payment proof.
- Altana wallet: persistent mock grant, cap, explicit contract allowlist, expiry and revoke. `ALTANA_SESSION_KEY` selects live mode **but every signing/grant/revoke/execute operation returns `live_signing_disabled`**. The service never reads, parses or uses the value as a signing key. Live balance is unknown and purchases fail closed.
- Facilitator: documented configuration boundary only. Joan is a buyer here; selling reports and facilitating settlement are not implemented in this card. No facilitator call is needed for a mock purchase.

**Live payment integration remains unproven** as documented in `../PAYMENT-PROOF.md`. Real SDK wiring and a separately owner-approved sandbox proof must precede any live signer support. Environment variables alone do not authorize signing/spending. This service contains no live-signing implementation, and the demo never calls the proof scripts.

The x402 cap is an SDK/client-side refusal, **not chain-enforced**. Mock `execute` refusals separately model onchain allowlist/cap/revocation policy; they are not real chain reverts. The allowlist constrains the contract address, not transfer recipient arguments. Mock grant cannot mint a balance or erase historical ledger spending.

## Ledger invariants

SQLite WAL + `BEGIN IMMEDIATE` reserve money before invoking the buyer. Global cap, assignment cap, pending reservations and fresh known balance are checked. Unique purchase keys are bound to a SHA-256 fingerprint of assignment, query, amount and destination. Reusing a key with altered data fails.

States: `reserved -> settled`, `reserved -> failed` only for a definitive pre-payment refusal, otherwise `reserved -> unknown`. Unknown reservations keep consuming allowance. Startup reconciliation looks up receipts in the independent durable mock settlement table; confirmed purchases settle without paying again. Missing/failed lookups stay unknown, even when a settlement might not have happened. Uncertain 500/429/timeouts must never trigger automatic repurchase. The SDK tally is intentionally in-memory to model the documented SDK limitation; SQLite spending persists across restart.

This is a local single-agent service, not an internet-facing multi-user backend. No auth key is needed for loopback demo. Do not expose the port or widen CORS to untrusted origins. Back up the SQLite database and WAL safely before migrating. No secrets, state databases, dependencies or compiled output are tracked.

## Web handoff / scope

The web calls `/commissions` for editor assignments and `/commissions/attempt` for dashboard purchase demonstrations using `VITE_JOAN_API_URL=http://127.0.0.1:4310`. Default CORS permits local ports 4174 and 5173. The integrated web preserves `report.origin` / `demoData`, provides server-backed wallet controls and archive reload, and sends stable commission idempotency headers.

Core evidence commands and limits are recorded in `evidence/ACCEPTANCE.md`; integrated web and dashboard evidence is in `../web/evidence/ACCEPTANCE.md`.
