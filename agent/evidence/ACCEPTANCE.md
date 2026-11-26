# Acceptance and evidence

Scope: Joan **agent core/API**. All changes are under `agent/`; no board changes, deploys, messages, real keys, signatures, wallet creation, registration or spending. The website was not edited. The design skills were not needed because no UI/design implementation was performed.

## Commands actually executed

From `/opt/hermes/projects/hackathon-sprint/joan/agent`:

```sh
set -o pipefail
(npm ci && npm run build && npm run typecheck && npm test && \
 npm run demo:allowed && npm run demo:blocked && npm run demo:revoke && \
 npm audit --audit-level=high) 2>&1 | tee evidence/core-checks.txt
```

Exit status: **0**. Full original command output:
`/opt/hermes/projects/hackathon-sprint/joan/agent/evidence/core-checks.txt`.

Real output excerpts:

```text
added 6 packages, and audited 7 packages in 1s
found 0 vulnerabilities

> joan-agent@1.0.0 build
> tsc -p tsconfig.json

> joan-agent@1.0.0 typecheck
> tsc --noEmit

1..29
# tests 29
# suites 0
# pass 29
# fail 0
# cancelled 0
# skipped 0
# todo 0

PASS: allowed mock demo(s); no wallets created, no signatures, no real spending. Evidence databases: /opt/hermes/.hermes/cache/scratch/joan-demo-dhnyKg
PASS: blocked mock demo(s); no wallets created, no signatures, no real spending. Evidence databases: /opt/hermes/.hermes/cache/scratch/joan-demo-sM08pq
PASS: revoke mock demo(s); no wallets created, no signatures, no real spending. Evidence databases: /opt/hermes/.hermes/cache/scratch/joan-demo-aENQML
```

The full log, not this excerpt, is authoritative for demo paths and durations. Node 22 emits the expected experimental `node:sqlite` warning. Initial implementation typecheck detected a UUID default-argument type inference error; it was corrected before the final passing run.

From `/opt/hermes/projects/hackathon-sprint/joan/web`:

```sh
set -o pipefail
npm run build -- --outDir ../agent/evidence/web-dist --emptyOutDir \
  2>&1 | tee ../agent/evidence/web-build.txt
```

Exit status: **0**. This runs existing web TypeScript checking and Vite, writes to an isolated ignored directory and leaves frontend source/build files untouched. Full output:
`/opt/hermes/projects/hackathon-sprint/joan/agent/evidence/web-build.txt`.

```text
> joan-web@0.1.0 build
> tsc --noEmit && vite build --outDir ../agent/evidence/web-dist --emptyOutDir
vite v5.4.21 building for production...
✓ 14 modules transformed.
✓ built in 464ms
```

From `/opt/hermes/projects/hackathon-sprint/joan/agent`:

```sh
set -o pipefail
/usr/bin/python3 scripts/browser_check.py 2>&1 | tee evidence/browser-checks.txt
```

Exit status: **0**. `/usr/bin/python3` has Playwright/Pillow and the installed Chromium executable. The default `python` did not have Playwright; switching to the installed system interpreter resolved it without an install.

Full output: `/opt/hermes/projects/hackathon-sprint/joan/agent/evidence/browser-checks.txt`.
Machine-readable assertions: `/opt/hermes/projects/hackathon-sprint/joan/agent/evidence/browser-results.json`.

```text
PASS mobile zero browser console/page errors
PASS mobile zero unexpected HTTP errors
PASS desktop zero browser console/page errors
PASS desktop zero unexpected HTTP errors
PASS compiled process restart preserves two reports
PASS compiled process restart preserves revocation
PASS compiled process restart preserves two settlements without duplicate pay
PASS: 63 browser/restart assertions. Sheets: /opt/hermes/projects/hackathon-sprint/joan/agent/shots/mobile-sheet.jpg and /opt/hermes/projects/hackathon-sprint/joan/agent/shots/desktop-sheet.jpg
```

Both 390x844 and 1440x900 cover entrance, front page, section filtering, dispatch, receipt, commission, archive, about and feature routes, with zero document horizontal overflow checks on every captured screen. Browser-origin HTTP calls separately exercise the compiled API: bounded grant, commission, idempotency, report/status/archive readback, wallet, ledger, revoke and reconciliation. Expected post-revoke HTTP 409 is asserted using Playwright's API client, not counted as an unexpected browser error. The compiled API process is then terminated and restarted against the same actual SQLite file; reports, revocation and settlements are read back.

Actual post-restart HTTP responses (not invented fixtures):

- `/opt/hermes/projects/hackathon-sprint/joan/agent/evidence/reports-after-restart.json`
- `/opt/hermes/projects/hackathon-sprint/joan/agent/evidence/permissions-after-restart.json`
- `/opt/hermes/projects/hackathon-sprint/joan/agent/evidence/ledger-after-restart.json`
- Server process output: `/opt/hermes/projects/hackathon-sprint/joan/agent/evidence/compiled-server.txt`

## Final verification

After hardening missing/future balance timestamps to fail closed, the final source tree was rebuilt and rechecked with:

```sh
(npm run build && npm run typecheck && npm test && npm run demo:all && \
 /usr/bin/python3 scripts/browser_check.py) 2>&1 | tee evidence/final-checks.txt
```

Exit status **0**. Final authoritative full output: `/opt/hermes/projects/hackathon-sprint/joan/agent/evidence/final-checks.txt`. It reports `# tests 29`, `# pass 29`, `# fail 0`, `PASS: all mock demo(s)` and `PASS: 63 browser/restart assertions`. The browser response JSON and screenshots were refreshed by this run. Earlier `core-checks.txt` also records clean `npm ci`, all separately named demo commands and a zero-vulnerability npm audit.

## Requirement coverage

| Requirement | Verified evidence |
|---|---|
| Assignment -> public research -> paid supplementary fixture -> labelled report | HTTP integration and browser-origin API tests; real report response artifacts |
| Headline, summary, known/unclear, sources, confidence, spending and exact attribution | Unit/API checks and report JSON |
| SQLite allowance, exact cap, balance freshness, unknown balance fail-closed | Ledger tests |
| No duplicate payments / altered idempotency key payload rejected | Ledger tests, concurrent HTTP test, browser calls |
| Restart reconciliation, crash after settlement, unresolved settlement never retried | Ledger tests plus compiled process restart |
| Mock grant/cap/allowlist/expiry/revoke | Adapter/API tests and demos |
| SDK x402 cap versus simulated onchain execute refusals | Blocked demo and adapter tests, explicit layer codes |
| Three separately runnable demos | `demo:allowed`, `demo:blocked`, `demo:revoke`, all executed |
| Env/key documentation | `agent/.env.example`, `agent/KEYS-NEEDED.md` |
| Build/typecheck, unit tests, HTTP integrations | Passing final core log |
| Playwright 390/1440, no console errors/overflow, screenshot sheets | Browser log, JSON and `agent/shots/` |

## Explicit remaining boundaries, not claimed as complete

1. **Live payments are unproven and locked.** The Altana signing and Celo Buy payment adapters refuse in live mode rather than faking a real receipt. No Altana SDK session was granted or x402 payment settled. Missing keys and payment proof A/B/C require separate owner authorization and sandbox work; see `KEYS-NEEDED.md` and `../PAYMENT-PROOF.md`. Live search/LLM transports are implemented and tested with injected HTTP responses, but no real keyed provider request was made.
2. **Frontend-to-server product integration belongs to the web integration card.** Existing web mock UI regression and actual browser-origin API flows were verified separately. This is not a claim that the current UI commission screen, wallet controls and archive load from this server. Existing `web/src/adapters/research.ts` overwrites server mock provenance with `origin: live`; the web card must preserve the API provenance and add stable request keys and wallet/report persistence wiring. No frontend source was changed to avoid overlapping that card.
3. No visual redesign or screenshot aesthetic review is claimed. The screenshots evidence the existing website at both required sizes. Source UI is owned by the web card.
4. No board comment/state was written. This document and the final handoff supply the actual output for the owner to paste.
