# Joan review: full product vs BRIEF.md and BUILD-STANDARD.md

Reviewer: internal reviewer. Reviewed commit: 02f6a79 (HEAD, "Fix policy attempt transport and prove literal zero-error Joan browser flows").
Method: every suite was re-run by me in a scratch copy of the tree (nothing in the live folder was edited, only this file was added). Agent ran on port 4310 in mock mode, web served from a fresh build of the same sources.
No deploy, no message sent, no credential used, no network call to any live provider.

## Verdict: CHANGES REQUESTED

The agent, the ledger, the tests and the spend safety are solid. One functional defect in a main flow (commission after revoke), one gap in KEYS-NEEDED.md, and three visual gaps against the inspo board. Nothing here is deploy-blocking by itself, but item 5 breaks the build standard's "zero console errors" and "no paragraph errors" rules, so I am not approving.

## 1. Build and tests (all re-run by me)

| Item | Result |
|---|---|
| Agent build and typecheck | PASS, exit 0 |
| Agent unit and API tests | PASS, 30 of 30 |
| Web build (tsc then vite) | PASS, exit 0 |
| Web unit tests (vitest) | PASS, 37 of 37 |
| Proof package typecheck and selftest | PASS, "selftest ok" |
| Integration e2e, real API, 390 and 1440, restart | PASS, 98 assertions, 0 fail |
| Agent browser check on committed dist, with process restart | PASS, 63 assertions, 0 fail |

Verbatim output:

    agent: npm run build then npm run typecheck
    > joan-agent@1.0.0 build
    > tsc -p tsconfig.json
    > joan-agent@1.0.0 typecheck
    > tsc --noEmit
    EXIT 0

    agent: npm test
    # tests 30
    # suites 0
    # pass 30
    # fail 0
    # cancelled 0
    # skipped 0
    # todo 0
    EXIT 0

    web: npm run build
    > joan-web@0.1.0 build
    > tsc --noEmit && vite build
    vite v5.4.21 building for production...
    ✓ 15 modules transformed.
    dist/index.html                  0.98 kB │ gzip:  0.49 kB
    dist/assets/index-pYZVIghb.css  36.43 kB │ gzip:  8.81 kB
    dist/assets/index-mHyW8auB.js   56.23 kB │ gzip: 19.97 kB
    ✓ built in 703ms
    EXIT 0

    web: npx vitest run
     ✓ tests/desk.test.ts (5 tests) 20ms
     ✓ tests/research.test.ts (13 tests) 23ms
     ✓ tests/store.test.ts (13 tests) 22ms
     ✓ tests/ledger.test.ts (6 tests) 8ms
     Test Files  4 passed (4)
          Tests  37 passed (37)
    EXIT 0

    proof: npm run typecheck then npm test
    > joan-payment-proof@0.0.1 test
    > tsx src/selftest.ts
    selftest ok
    EXIT 0

    web: integration e2e (first lines of the PASS list are per viewport, 390 and 1440)
    PASS mobile revoke persisted
    PASS mobile revoked buy refused
    PASS mobile revoked zero overflow
    PASS mobile revoked buy cannot debit or publish
    PASS compiled API restart preserves reports
    PASS compiled API restart preserves balance and ledger
    PASS mobile page turn
    PASS desktop page turn
    PASS: 98 real API/browser/restart assertions.
    real 1m8.893s

    agent: browser check against the committed web-dist
    PASS compiled process restart preserves two settlements without duplicate pay
    PASS: 63 browser/restart assertions.
    real 0m16.856s

Count check: 99 PASS lines in the e2e output (98 assertions plus the summary line), zero lines that are not PASS apart from the timing footer.

## 2. Flows clicked in mock mode (my own Playwright script, 390 and 1440)

Result: 43 of 45 at 390, 44 of 46 at 1440. The two misses per viewport are explained below, one is a real defect (item 5), one is my own threshold and not a product defect.

    flows-390 PASS=43 FAIL=2
    FAIL 390 archive filter pills found | 2
    FAIL 390 commission while revoked tells the user why (session revoked) | ['Joan answered with status 409.', 'AI-generated report. Prepared by Joan.']
    CONSOLE_ERRORS [('390', 'Failed to load resource: the server responded with a status of 409 (Conflict)')]
    HTTP>=400 [('390', 409, 'http://127.0.0.1:4310/commissions')]
    flows-1440 PASS=44 FAIL=2
    FAIL 1440 archive filter pills found | 2
    FAIL 1440 commission while revoked tells the user why (session revoked) | ['Joan answered with status 409.', 'AI-generated report. Prepared by Joan.']
    CONSOLE_ERRORS [('1440', 'Failed to load resource: the server responded with a status of 409 (Conflict)')]
    HTTP>=400 [('1440', 409, 'http://127.0.0.1:4310/commissions')]

| Flow | Result |
|---|---|
| Entrance, "Open today's edition" visible and clickable, 390 and 1440 | PASS |
| Empty database: front page shows "No dispatches yet. Give Joan an assignment to open this edition." with Add clipping | PASS |
| Front, Dispatch, Archives, Desk, About navigation | PASS |
| Add clipping, commission, publish, receipt on the dispatch | PASS |
| Allowed buy adds a receipt, blocked buy states the true layer and cannot debit or publish | PASS (e2e "allowed buy adds receipt", "blocked buy truthful layer", "blocked buy cannot debit or publish", both viewports) |
| Report sections What we know, What remains unclear, Sources, Confidence, Research spending, label, receipt links, receipt dialog open and close | PASS (my flows script, 1440) |
| Sound control labelled, typewriter and paper audio sources scheduled | PASS (e2e, both viewports) |
| Revoke from the Desk, state persists after refresh, regrant works | PASS |
| Revoked state cannot debit or publish | PASS |
| Restart keeps reports, balance, ledger, no duplicate pay | PASS |
| Mobile page turn (horizontal swipe between stories, vertical scroll inside) | PASS (e2e "mobile page turn", swipe-result.json shows story hashes changing and panel scrollTop 649) |
| Zero horizontal overflow on every screen | PASS (e2e overflow assertions) |
| Commission while revoked | FAIL, see item 5 |
| Archive filter pills | NOT A DEFECT: my script wanted 3 or more, an empty database shows 2 (All, Commissions). The committed desktop shot with seeded data shows 5 (All, Civic, Technology, Open Source, Commissions). |

## 3. Keys, signing and spend (BUILD-STANDARD rule 2 and 5)

| Item | Result |
|---|---|
| Real keys in tracked files (sk-, tvly-, 64-hex, AKIA, PEM markers) | PASS, zero matches |
| Tracked .env file | PASS, none |
| agent/src and web/src reference to viem, ethers, privateKey, signTypedData, sendTransaction, writeContract | PASS, 0 references |
| Agent live modes without env vars | PASS: Tavily, OpenAI, Altana and Celo Buy all select mock unless their variable is set. Altana live is locked (signing disabled), Celo Buy live returns live_payment_unproven and refuses. |
| Proof package signing | PASS by reading: every sign or broadcast step calls requireLive first, which throws unless JOAN_ALLOW_MAINNET=1. Hard ceilings on cap and expiry apply regardless of env. I did not run the dry run itself, because its quote step may touch the network. |
| /health in mock | PASS: {"ok":true,"mode":"mock","demoData":true,"liveSigningEnabled":false} |
| KEYS-NEEDED.md and .env.example list the agent variables | PASS: TAVILY_API_KEY, OPENAI_API_KEY, OPENAI_MODEL, ALTANA_SESSION_KEY, ALTANA_WALLET_ADDRESS, ALTANA_RPC_URL, CELO_BUY_API_URL, X402_FACILITATOR_URL, X402_FACILITATOR_API_KEY, plus PORT, JOAN_DB_PATH, JOAN_CORS_ORIGINS. The two files agree. |
| KEYS-NEEDED.md covers the proof package | FAIL, see item 6 |

## 4. Brief checklist

| Brief item | Result |
|---|---|
| Report fields: headline, summary, known, unclear, sources, confidence, research spending, label "AI-generated report. Prepared by Joan." | PASS (my flows script asserts the label and every section on a freshly commissioned report) |
| Persistent SQLite ledger, allowance check before each buy, no duplicate pay, fail closed, reconcile after restart | PASS (restart assertions above) |
| Demo 1 allowed purchase, demo 2 blocked (app-level and onchain layer), demo 3 revoke | PASS in mock. Demo 2 and 3 on the real chain are not testable here. |
| Dashboard: assignment, report, wallet, permissions, revoke | PASS |
| Landing page at /, entrance gate, sound after a click | PASS (gate present, audio not judged by ear in headless) |
| Payment proof A, B and C (ERC-1271 acceptance, Celo USDC smart-account signature, EIP-3009 / 402 compatibility) | OPEN, honestly documented as unproven in PAYMENT-PROOF.md and agent/KEYS-NEEDED.md. Not a build failure, but it is the brief's first risk and still unproven. |
| ERC-8004 registration, ERC-8021 tagged payment | Not in the product, documented as owner-gated. Outside this build card. |

## 5. FAIL: commission after revoke (functional, main flow)

Reproduced at both viewports. Steps: revoke the session on the Desk, open Add clipping, submit a commission.
What the user sees: "Joan answered with status 409." What the server actually sent: {"error":"session_revoked","message":"Session has been revoked","layer":"signature-checker-simulation"} with HTTP 409.
Two breaches:

1. The message is a status code, not a reason and not a fix. The build standard and the owner's UX bar want one short line ending in the fix (for example "Session revoked. Grant a new one on the Desk.").
2. The browser logs "Failed to load resource: the server responded with a status of 409", so the "zero console errors" claim does not hold for this path. The parent card said literal zero-error, that is true for the paths its suite exercises, not for this one.

Root cause: web/src/adapters/research.ts line 103 throws a generic message on any non-ok response and discards the JSON body. The form also does not check the revoked state before sending, so the doomed request goes out.
Suggested fix (not applied, reviewer does not edit implementation): read the session state before submit and show the revoked message with a link to the Desk without sending the request, and as a fallback parse the body message and layer on non-ok responses. Add an e2e step for "commission while revoked" at 390 and 1440 asserting the message text and zero console errors.

Rest of the commit state is fine on this item: the revoked buy itself is refused, cannot debit and cannot publish (e2e PASS), so no money safety issue. This is purely about the message and the console.

## 6. FAIL: KEYS-NEEDED.md misses the proof package

proof/README.md documents JOAN_ALLOW_MAINNET, JOAN_ADMIN_PRIVATE_KEY, JOAN_CAP_USDC_ATOMIC, JOAN_EXPIRY_SECONDS, JOAN_APP_CODES, JOAN_STATE_DIR and JOAN_TAGGED_PAYEE. None of them appear in agent/KEYS-NEEDED.md or agent/.env.example. The task asks that KEYS-NEEDED.md lists every external service. Add a short section pointing to the proof package, naming JOAN_ADMIN_PRIVATE_KEY (throwaway, small balance, owner go-ahead) and JOAN_ALLOW_MAINNET, with where to get each. Do not put values anywhere.

## 7. Website against inspo/gazette-pinterest.jpeg

Reference read from the image: cream parchment, bold sans headlines over serif body (so a sans headline is correct, not a miss), rust used for kickers and the active tab, sepia photos tagged "PHOTO: H. CARTER", rounded cards, tilted clippings in Archives, drop cap and small-caps lead-in on the dispatch, dashed "Add clipping" card, pill filters, ruler margin.

| Item | Result |
|---|---|
| Palette, rust used sparingly, thin double rules, mono dates | PASS |
| Desktop is a real broadsheet (topbar, masthead, three-column front, ledger and wire sidebar), not a stretched phone | PASS |
| Mobile front at 390: masthead, tabs, card, bottom nav, no overlap or clipping | PASS |
| Headline type | PASS, bold sans like the reference (Raleway, body Old Standard) |
| Archives with data: clipping cards tilted at different angles, distinct images, five pills, dashed card | PASS |
| Dispatch: byline, roman-numeral date, kicker, sepia hero | PASS. Drop cap exists in the stylesheet; I could not see it in the committed desktop shot because the hero pushes the body below the fold, so it is read from code not from the pixel. |
| No UI emoji, no dash characters in copy (web/src/main.ts, index.html, stories.json: 0 matches) | PASS |
| Photo credit tags | PARTIAL: the tag reads "ILLUSTRATION: JOAN", not "PHOTO:". Defensible, the images are generated, and a fake photo credit would be worse. The brief says PHOTO tags, so I note it rather than fail it. |
| Image variety on the live front page | FAIL (moderate): the front page of a fresh edition uses 6 image slots but only 2 distinct images, so stories look duplicated. The reference gives every story its own picture. Archives with seed data is fine. A larger pool, or per-category art, fixes it. |
| Dispatch "SAMPLE" tag next to "EXCLUSIVE REPORT", and two roman-numeral dates (XXV and XXI) with no label | FAIL (minor): the tag reads as a contradiction and the second date is unexplained. Label "Filed" and "Commissioned", or drop one. |
| Small type | FAIL (minor): smallest rendered text is 9px at 1440 and 9.5px at 390 (24 and 26 elements under 11px by my measure). Credit tags in the reference are small too, but 9px metadata at low contrast is hard to read. Raise the floor to 11px. |
| Desktop Archives empty state | NOTE: with an empty database the grid shows one lone dashed card left-aligned under a centered header and no message. Works, looks unfinished. Small fix. |

Screens inspected: front 390 and 1440, dispatch 1440 (live and committed), archives 1440 (empty and seeded), Desk 1440, entrance 390.

## 8. Hygiene

The working tree is not clean at HEAD 02f6a79: 38 entries, all regenerated evidence and screenshots (agent/evidence/*, agent/shots/*, web/evidence/*), plus untracked agent/evidence/parent-verification.txt, web/evidence/parent-verification.txt, web/evidence/parent-verification-repair.txt and scratch-archive/. File times are before this review started, so the dirt predates me. Commit the evidence that is meant to stay and drop or ignore scratch-archive/.

## 9. Not verified

Live Tavily, OpenAI, Celo Buy, Altana and chain behaviour (no keys, none should be used). Sound by ear. Owner-gated mainnet steps. Payment proof A, B and C.

## Requested changes, in order

1. Commission after revoke: short reason with the fix, no doomed request, zero console errors, e2e step at both viewports (item 5).
2. KEYS-NEEDED.md and .env.example: add the proof package variables (item 6).
3. Front page image variety, dispatch SAMPLE tag and date labels, 11px type floor, Archives empty state (item 7).
4. Commit or discard the dirty evidence and scratch-archive (item 8).
