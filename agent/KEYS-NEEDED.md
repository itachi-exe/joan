# Keys and external proof still needed

No credentials were requested, acquired, created or used for this build. No wallets were created, no messages/registrations/deploys were made, and nothing was signed or spent. Everything works locally in deterministic mock mode.

| Environment variable | Where the owner obtains it | What it unlocks / current status |
|---|---|---|
| `TAVILY_API_KEY` | Owner's Tavily dashboard: https://app.tavily.com/ | Live public-source search. Implemented, HTTP contract tested with injected responses; no real keyed request made. Search may consume provider credits. |
| `OPENAI_API_KEY` | Owner's OpenAI project: https://platform.openai.com/api-keys | Live report drafting through one provider. Implemented with schema validation; no real keyed request made. |
| `OPENAI_MODEL` | Owner's available OpenAI model list | Optional model name, default `gpt-4o-mini`. No second provider. |
| `ALTANA_SESSION_KEY` | Owner-approved Altana session grant, following `../PAYMENT-PROOF.md` | Future session signer. Presence selects live mode but signing is intentionally disabled. Never enter a real key in tracked files or send it to the assistant. |
| `ALTANA_WALLET_ADDRESS` | Owner's existing Altana wallet | Future read-only wallet identity. Documented, not consumed yet; no wallet is created here. |
| `ALTANA_RPC_URL` | Owner's approved Celo RPC provider | Future live balance / receipt reconciliation. Documented, not consumed yet; live balance remains unknown. |
| `CELO_BUY_API_URL` | Verified Celo Buy gateway documentation in `../research/SOURCES.md` | Selects live buyer mode. Returns `live_payment_unproven`; no gateway request/signature is made. No Buy API key is invented or assumed. |
| `X402_FACILITATOR_URL` | Celo facilitator documentation / owner-approved provider | Future settlement verification endpoint. Configuration placeholder, not consumed by mock buyer. |
| `X402_FACILITATOR_API_KEY` | Owner's facilitator dashboard at https://x402.celo.org/ | Future authenticated facilitator operations, especially seller setup. Not consumed; Joan selling reports is outside this card. |

Operational nonsecrets: `PORT`, `JOAN_DB_PATH`, `JOAN_CORS_ORIGINS` are listed in `.env.example`. To use read-only LLM/search modes, export only the corresponding keys in the owner-controlled shell; no `.env` autoload is performed. `node --env-file=.env dist/src/server.js` is an owner option, not required for mock mode.


## Owner-gated proof package variables

These belong to `../proof/`, not the running research agent. See `../proof/README.md` and `../PAYMENT-PROOF.md`. Leave unset for offline checks; do not run network quotes or mainnet steps during local verification. Never commit values or the proof state directory.

| Environment variable | Where the owner obtains it | Purpose / boundary |
|---|---|---|
| `JOAN_ALLOW_MAINNET` | Explicit owner go-ahead, then owner-controlled environment | Opt-in gate for every signing/broadcast step. Not authorization by itself. |
| `JOAN_ADMIN_PRIVATE_KEY` | Owner's separately created throwaway wallet, funded with a small balance only after owner go-ahead | Proof administration signer. Never a primary wallet key; never send it in chat or put it in tracked files. |
| `JOAN_CAP_USDC_ATOMIC` | Owner-chosen bounded USDC budget in atomic units, within proof hard ceilings | Session spending cap, not an API key. |
| `JOAN_EXPIRY_SECONDS` | Owner-chosen short duration within proof hard ceilings | Session expiry, not an API key. |
| `JOAN_APP_CODES` | Program-assigned Celo app code from the hackathon/Altana registration, plus any owner-approved codes | Comma-separated ERC-8021 attribution codes. Do not invent a code. |
| `JOAN_STATE_DIR` | Owner-selected private local directory outside tracked files | Persists secret session state and proof journal. Keep git-ignored and access-restricted. |
| `JOAN_TAGGED_PAYEE` | Owner-verified recipient address for the approved tagged-payment demonstration | Destination for the proof's attribution transaction, not a research API endpoint. Verify independently before spending. |

## Live enablement acceptance still outstanding

Payment proof A/B/C in `../PAYMENT-PROOF.md` remains unproven: gateway ERC-1271 acceptance, Celo USDC smart-account signature validation and SDK EIP-3009 / gateway 402 compatibility. Merely obtaining a key cannot resolve these. Live signer implementation must be separately authorized and proven against an owner-funded sandbox first. No live claim or fabricated receipt is provided by this card.

After proof, live wiring must preserve SQLite reservation/idempotency, query actual balance before every buy, and reconcile uncertain settlements against an authoritative provider receipt. Until then the locked live adapter refuses explicitly rather than returning mock results under a live label.
