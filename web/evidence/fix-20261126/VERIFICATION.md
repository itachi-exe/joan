# Review repair verification

All four requested-change groups in `REVIEW.md` are addressed. No deploy, message, credential use, quote request, signature or mainnet operation was performed by this repair. Browser/API servers inherit only PATH, HOME and TMPDIR and use isolated mock SQLite databases.

## Changes

- Commission submission reads the current API permissions first. A revoked session keeps the form open and displays `Session revoked. Grant a new one on the Desk.` with a real Desk link, without posting a commission. JSON refusal reasons and policy layers survive fallback errors.
- Both agent configuration documents list every requested proof variable, its source and the owner-gated signing boundary, without values.
- Each fresh edition uses distinct pictures from five existing generated photographs and three offline sepia SVG scenes, without altering persisted reports. No external image service or credential was used.
- Sample badges now say Demo data; the invented exclusive kicker is Illustrative Dispatch. Dates are labelled Filed and Commissioned; the latter reads the persisted assignment date. Truly absent historical dates are not invented. The topbar calendar is explicitly Edition.
- Metadata has an 11px floor, including responsive overrides and font shorthand. Muted ink on paper measures 5.62:1 contrast. Empty Archives has a centered explanation and centered add-clipping card.
- Pixel inspection caught an existing delayed swipe hint moving the phone article offscreen. It was removed; manual touch and keyboard page turns remain tested. A new delayed-alignment assertion prevents regression.
- Scratch archive is ignored, not deleted. Retained historical evidence and refreshed suite artifacts are committed with this repair.

## Actual command results

Full stdout is retained beside this file.

Agent (`agent-build-tests.txt`), build and typecheck exit 0:

```text
# tests 45
# pass 45
# fail 0
```

Web (`web-build-tests.txt`), build exit 0:

```text
✓ 16 modules transformed.
✓ built in 640ms
 Test Files  5 passed (5)
      Tests  40 passed (40)
```

Integration (`integration.txt`), at 390 and 1440 with compiled API restart:

```text
PASS mobile commission while revoked gives reason and fix
PASS mobile revoked commission links to Desk
PASS mobile revoked commission sends no request
PASS mobile revoked commission zero console errors
PASS desktop commission while revoked gives reason and fix
PASS desktop revoked commission links to Desk
PASS desktop revoked commission sends no request
PASS desktop revoked commission zero console errors
PASS entire browser suite zero console errors (including empty, reduced motion, fallback)
PASS entire browser suite zero failed HTTP responses
PASS compiled API restart preserves reports
PASS compiled API restart preserves balance and ledger
PASS: 146 real API/browser/restart assertions. Evidence: /opt/hermes/projects/hackathon-sprint/joan/web/evidence. Sheets: /opt/hermes/projects/hackathon-sprint/joan/web/shots/wednesday
```

Agent browser check (`agent-browser.txt`) uses its existing committed standalone web-dist fixture, while the integration suite above tests the repaired current production build:

```text
PASS compiled process restart preserves two settlements without duplicate pay
PASS: 63 browser/restart assertions. Sheets: /opt/hermes/projects/hackathon-sprint/joan/agent/shots/mobile-sheet.jpg and /opt/hermes/projects/hackathon-sprint/joan/agent/shots/desktop-sheet.jpg
```

```text
PASS: CDP left, left, right, vertical swipe; zero console errors; zero overflow
selftest ok
# tests 4
# pass 4
# fail 0
  12/12 checks passed
```

These result lines correspond to the swipe regression, proof offline tests and frontend static audit; see `swipe.txt`, `proof-offline-tests.txt`, `frontend-audit.txt`. Node emits its existing experimental SQLite warning in the agent test process, not a browser console error. No required check remains failing. Live-provider quality and real-chain payment proofs are outside this mock repair and are not claimed here.

## Screenshots inspected against the supplied reference

Each is a separate image, not a contact sheet. Both front pages, both dispatches, both empty/seeded Archives and both Desks were opened and inspected natively. The cream paper, bold sans headlines, brown serif body, sparse rust, sepia illustrations, clipping tilts and thin rules remain consistent with `inspo/gazette-pinterest.jpeg`. The phone dispatch was recaptured and reinspected after fixing its delayed sideways movement. The revoked form screenshots were inspected too.

- `390-front.png`
- `390-dispatch.png`
- `390-archives-empty.png`
- `390-archives-seeded.png`
- `390-desk.png`
- `1440-front.png`
- `1440-dispatch.png`
- `1440-archives-empty.png`
- `1440-archives-seeded.png`
- `1440-desk.png`
- `390-commission-revoked.png`
- `1440-commission-revoked.png`

All paths are relative to `web/evidence/fix-20261126/`. Complete flow sheets also remain in `web/shots/wednesday/` and `agent/shots/`.
