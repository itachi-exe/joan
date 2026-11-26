# Wednesday acceptance evidence, repaired

## Outcome

The persisted API integration, gazette dashboard and Wednesday editorial/motion work from b28f0b8 are retained. The literal zero-console gate is now met, without filtering browser errors or bypassing a spending guard.

The dashboard calls `POST /commissions/attempt`, which runs the same authoritative `joan.create` path as `/commissions`. A completed evaluation returns an explicit `accepted` report or `denied` policy result. The UI still renders the true refusal code and layer. No denied report is published and no denied purchase debits balance or adds a settlement. Original commission endpoints still return HTTP 409 for policy denials. Input errors, idempotency conflicts, infrastructure failures and live-signing safety locks retain non-2xx status. API regression tests verify these contracts.

The browser harness no longer has ANY console-error exemption. It captures all console errors, page exceptions, request failures and HTTP failures across the whole suite, including empty, reduced-motion and malformed-API fallback contexts. Both viewport logs and the suite log contain empty error arrays. The three actual attempt response bodies per viewport are preserved separately.

## Exact independent rerun commands

Requirements: existing npm dependencies, Node 22.13+, `/usr/bin/python3` with Playwright/Pillow, installed Chromium at the path in the scripts, and Tesseract. Port 4310 must be free; tests refuse to mutate an existing API. Tests start/stop their own compiled loopback mock API with sanitized environment and isolated SQLite databases under `$TMPDIR` (`/opt/hermes/.hermes/cache/scratch`). No credentials or external provider calls are needed.

```sh
cd /opt/hermes/projects/hackathon-sprint/joan/agent
set -o pipefail
(npm run build && npm run typecheck && npm test && npm run demo:allowed && npm run demo:blocked && npm run demo:revoke) 2>&1 | tee ../web/evidence/repair-core-checks.txt

cd /opt/hermes/projects/hackathon-sprint/joan/web
(npm run build && npm run typecheck && npm test) 2>&1 | tee evidence/repair-web-checks.txt

# Separate terminal, only if no preview already runs on 4174:
npm run preview -- --host 127.0.0.1 --port 4174 --strictPort

# Original terminal:
(npm run test:e2e && npm run test:swipe && /usr/bin/python3 scripts/compare.py) 2>&1 | tee evidence/repair-browser-checks.txt
python3 /opt/hermes/.hermes/scripts/frontend_verify.py .
git diff --check
```

The pre-existing preview on 4174 was reused. No unrelated parent agent evidence or scratch archive was staged.

## Real command output

Full unabridged logs: `repair-core-checks.txt`, `repair-web-checks.txt`, `repair-browser-checks.txt` in this directory. Their output includes:

```text
> joan-agent@1.0.0 build
> tsc -p tsconfig.json
> joan-agent@1.0.0 typecheck
> tsc --noEmit
# tests 30
# pass 30
# fail 0
PASS: allowed mock demo(s); no wallets created, no signatures, no real spending.
PASS: blocked mock demo(s); no wallets created, no signatures, no real spending.
PASS: revoke mock demo(s); no wallets created, no signatures, no real spending.

> joan-web@0.1.0 build
> tsc --noEmit && vite build
✓ 15 modules transformed.
✓ built in 577ms
> joan-web@0.1.0 typecheck
> tsc --noEmit
 Test Files  4 passed (4)
      Tests  37 passed (37)

PASS mobile zero console errors (no exemptions)
PASS mobile zero failed HTTP responses
PASS mobile actual API attempt outcomes
PASS desktop zero console errors (no exemptions)
PASS desktop zero failed HTTP responses
PASS desktop actual API attempt outcomes
PASS entire browser suite zero console errors (including empty, reduced motion, fallback)
PASS entire browser suite zero failed HTTP responses
PASS compiled API restart preserves reports
PASS compiled API restart preserves balance and ledger
PASS: 98 real API/browser/restart assertions. Evidence: /opt/hermes/projects/hackathon-sprint/joan/web/evidence. Sheets: /opt/hermes/projects/hackathon-sprint/joan/web/shots/wednesday
PASS: CDP left, left, right, vertical swipe; zero console errors; zero overflow
PASS: all 1 supplied inspiration images paired with three implemented compositions
```

## Coverage and artifacts

At 390×844 and 1440×900: entrance/audio scheduling/handoff, front, section filtering, real dispatch and editorial furniture, receipt, keyboard page turn, archives, validation/commission, cleared-browser-storage persistence, wallet/session/ledger, allowed buy, actual SDK-cap denial, SDK versus onchain explanation, revoke, revoked-buy denial, reload/regrant, About and 90s feature. Every primary captured view asserts no horizontal overflow. API restart readback verifies reports, balance and ledger persistence. A separate CDP touch test checks left/left/right, dots/routes, vertical scrolling and a 390px document width.

- `shots/wednesday/mobile-sheet.jpg`, `shots/wednesday/desktop-sheet.jpg`: refreshed screenshot sheets, with individual captures alongside.
- `shots/comparisons/gazette-pinterest-all-compositions.jpg`, `manifest.json`: every supplied inspo image, all three phone compositions.
- `evidence/integration-results.json`: 98 passing checks.
- `evidence/{mobile,desktop,suite}-console.json`: actual empty error arrays, no exemptions.
- `evidence/{mobile,desktop}-attempts.json`: actual accepted/denied/denied API response payloads.
- `evidence/{reports,wallet,permissions,ledger}-readback.json`: actual persisted API state after restart.
- `evidence/swipe-results.json`: touch gesture state, empty console errors, documentWidth 390.
- `KEYS-NEEDED.md`, `.env.example`, and server equivalents: mock/live boundaries and missing-key setup.
- `JOAN-90S-TEASER.md`: local teaser draft; no external post.

## Remaining limits

- The generic frontend scanner still reports 11/12 because its empty-state scanner ignores `.ts` string-rendered markup. Actual empty-state message and commissioning CTA are exercised against a fresh real API at both widths. No scanner or acceptance requirement was weakened; see `repair-design-verifier.txt`.
- Screenshot comparisons, geometry, prior OCR and contrast checks are present. No native image/vision reviewer is available in this tool set, so aesthetic parity remains for owner approval rather than a fabricated visual-review claim. The supplied cream/sepia gazette direction remains deliberate.
- Live payments/signing remain intentionally locked and unproven (`../PAYMENT-PROOF.md`). All demonstrations use labelled mock research and simulated USDC. No deploy, push, external message, credential, signature, real payment, profile change or board transition occurred.
