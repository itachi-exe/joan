# Joan: submission pack

Draft prepared 26 November 2026. The public research app is live. This is not a submitted or mainnet-qualified entry. Replace the PENDING fields only with verified evidence. Portal character limits and final declarations have not been inspected behind login.

## Portal fields

### Project name

Joan

### Tagline

The AI journalist who shows her receipts.

### Description

A repeated claim is not a confirmed fact. An editor needs the original evidence, the unanswered questions and a record of what the research cost.

Joan turns an assignment into a cited research dispatch. It retrieves public documents, retains source excerpts and drafts a report with a headline, summary, known facts, open questions, confidence and research spending. The report distinguishes publisher assertions from independent corroboration instead of treating repeated coverage as multiple confirmations. Every dispatch is labelled AI-generated.

The public edition is working now: real public retrieval, DeepSeek drafting, a newspaper-style reading interface and a persistent SQLite record. A report can be commissioned with a zero USDC research budget. Global daily quotas and per-IP limits bound public inference usage. Provider errors fail closed instead of quietly publishing fixtures.

The intended Celo flow gives the editor control of an Altana wallet and grants Joan bounded authority to buy supplementary research over x402. A persistent purchase ledger reserves spending before a purchase, reuses settled receipts and holds uncertain settlements for reconciliation. The public wallet controls remain clearly labelled simulations, and live signing is disabled. Mainnet ERC-8004 registration, session grant, settlement, tagged activity and an actual revoke transaction remain pending owner-authorized verification.

Joan is built for an editor checking a specific claim, not a general autonomous news feed. The completed public demonstration checks what RFC 9110 says about HTTP 402 against the actual RFC text and explicitly leaves unsupported vendor claims unresolved. This is a working research demonstration, not independent adoption or proof of a completed paid newsroom job.

### Primary track

**Altana.**

The product's intended authority boundary is an editor-granted session key: a spending cap, an allowlist, an expiry and a revocation path. That directly matches the Altana requirements in the verified event rules: an agent acting from an Altana mainnet wallet, at least one demonstrated session restriction, an actual revoke transaction that stops the agent, and ERC-8004 registration. All three session restrictions are a product safety goal, not an invented eligibility requirement.

Altana eligibility is still pending those mainnet proofs. A screenshot of the mock Desk is not sufficient. The rubric gives equal weight to execution, value, tagged traction and a named user with a real completed job; no independent-user traction or measured time saving is claimed.

No secondary track is claimed. Self Agent ID requires actual identity-dependent service, mainnet Self verification, native-facilitator x402 evidence and the required social post. Agent Vault requires a real website flow, hidden credentials, a rule refusal, native-facilitator payment and its social post. Stablecoin Corridors requires a qualifying Textile conversion and an independent recipient. None of those integrations is represented as complete.

### Technology used

TypeScript, Vite, Node.js, SQLite with WAL transactions, DeepSeek's OpenAI-compatible API, bounded public HTTPS retrieval, Playwright, Vitest, Vercel, nginx, systemd and Let's Encrypt. The separately gated proof package uses the Altana SDK and prepares the Celo USDC EIP-3009/x402 path. Celo mainnet execution and ERC-8004 identity are pending, not deployed capabilities of the public API.

### Links

| Field | Value |
|---|---|
| Live app | https://joan-dispatch.vercel.app/ |
| Live Research Desk | https://joan-dispatch.vercel.app/#/dashboard |
| Public API | https://joan-api.94-72-105-176.sslip.io/health |
| Report list | https://joan-api.94-72-105-176.sslip.io/reports |
| Verified public dispatch | https://joan-dispatch.vercel.app/#/story/80fbc2fd-e34c-4beb-8024-22d0a566762c |
| Exact report JSON | https://joan-api.94-72-105-176.sslip.io/reports/80fbc2fd-e34c-4beb-8024-22d0a566762c |
| Public GitHub repository | https://github.com/itachi-exe/joan |
| Demo video | Recorded locally: `docs/demo/joan-demo.mp4` (1:54, H.264); PENDING owner-selected hosting and unauthenticated playback |
| ERC-8004 identity / agentId | PENDING |
| Altana mainnet wallet | PENDING |
| Mainnet x402 settlement | PENDING |
| Session grant and revoke | PENDING |

## Evidence matrix

Rules basis: [`../celo-agents-open-business/RULES.md`](../celo-agents-open-business/RULES.md), sections “Shared hard requirements”, “Altana” and “Submission evidence matrix”. The event closes **7 December 2026 at 09:00 GMT**. Testnet references cannot satisfy mainnet judging.

| Requirement or scored evidence | Current evidence | Required completion |
|---|---|---|
| Working product | Public web/API, exact live report readback, screenshots and restart verification in `deploy/evidence/` | Live now |
| Reproducible README | Root `README.md`, package examples and test commands | Draft complete locally |
| Public GitHub repository at registration and judging | https://github.com/itachi-exe/joan | Public snapshot published; keep accessible through judging |
| Code written during event window | Existing local commit history | PENDING confirm published history and event eligibility |
| ERC-8004 agent registration | No mainnet registration performed | PENDING `agentId`, registration tx, agent URI, registry readback |
| Built-with Altana mainnet wallet | Public wallet is a simulation | PENDING wallet address and confirmed agent ownership |
| Session grant | Public cap/allowlist/expiry are simulations | PENDING mainnet grant tx and permission readback |
| Session restriction demonstrated | Local mock denial and ledger tests | PENDING approved real session cap, allowlist or expiry demonstration |
| Actual revoke stops agent | Mock revoke persists and is tested locally | PENDING revoke tx and exact post-revoke refusal evidence |
| x402 settlement in the chosen research flow | None; smart-account compatibility remains unproven | PENDING mainnet x402 hash, receipt, actual merchant/facilitator and payer verification |
| Correct attribution from first counted ordinary transaction | No enrollment code or counted tx | PENDING issued code, first tagged tx and decoded suffix |
| x402 seller PayTo registration, if selling | No live seller is claimed | PENDING only if the final product sells over x402 |
| Named real person/business and completed job | Standards-check demonstration only | PENDING consenting independent editor, actual assignment and outcome evidence |
| Initial tagged traction | No independent use claimed | PENDING repeat use; do not cycle team funds or call team-funded users independent |
| Follow @Celo and @CeloDevs | Not checked | PENDING owner account verification |
| Demo video | Real narrated live-site recording completed locally, 1:54 | PENDING owner-selected hosting and public playback check |
| Portal enrollment and final submission | No portal action performed | PENDING enrollment, field limits, declarations and submission confirmation |

**Mainnet receipt slots**

```text
ERC8004_AGENT_ID=PENDING
ERC8004_REGISTRATION_TX=PENDING
ERC8004_AGENT_URI=PENDING
ALTANA_MAINNET_WALLET=PENDING
SESSION_GRANT_TX=PENDING
SESSION_PERMISSION_READBACK=PENDING
X402_SETTLEMENT_TX=PENDING
X402_MERCHANT_AND_FACILITATOR=PENDING
SESSION_REVOKE_TX=PENDING
POST_REVOKE_REFUSAL_EVIDENCE=PENDING
ENROLLMENT_ATTRIBUTION_CODE=PENDING
FIRST_TAGGED_MAINNET_TX=PENDING
PUBLIC_REPOSITORY_URL=https://github.com/itachi-exe/joan
PUBLIC_DEMO_VIDEO_URL=PENDING
```

Altana's x402 cap is an SDK/client-side check, not an onchain spending cap. Do not describe a client refusal as an onchain revert. The Sepolia faucet transfer in the repository is not an x402 payment hash. No mainnet action, faucet attempt, wallet creation or signing was performed for this public deployment.

## Recorded public-product cut

The completed 1:54 narrated film follows the journey below using a fresh assignment about HTTP 429, HTTP 503 and Retry-After in RFC 9110. It adds the owner-requested Desk revoke, refused commission with its repair message, and verified regrant. One real DeepSeek-backed commission was made; the refused attempt did not invoke the model. The video is local-only at `docs/demo/joan-demo.mp4`, not committed or uploaded. See [recording notes](docs/demo/README.md). Real mainnet identity, x402 settlement and session/revoke transaction slots remain PENDING.

## Two-minute demo video script

### Recording preparation

Use the public app at 1440 pixels wide. Keep the actual public report open in a second tab and the JSON readback in a third. Have one commission available in the shared 3-per-IP hourly limit. The model request may take tens of seconds; the timeline budgets about 40 seconds for research. If a longer wait must be edited, put “Research wait shortened” on screen. Never present prerecorded results as a new live response.

The current public service is deliberately unable to sign. This script is recordable now as an honest product demo. It is not the Altana mainnet qualification clip; after owner-approved proofs, record a separate genuine mainnet segment and replace the pending links without implying that a mock button sent those transactions.

| Time | Exact click or view | Narration |
|---|---|---|
| 0:00–0:10 | Open `https://joan-dispatch.vercel.app/`. Click **Open today's edition**. | “A repeated claim is not a confirmed fact. Joan gives an editor the source, the uncertainty and the research bill.” |
| 0:10–0:20 | Click **Add clipping**. Paste the assignment below. Leave **Maximum budget (USD)** at **0**. | “This assignment checks what HTTP 402 actually means in the original standard. A zero research budget uses public sources without a simulated purchase.” |
| 0:20–1:00 | Click **Commission Joan** once. Keep the working state visible. Wait for the persisted dispatch to appear. | “Joan fetches the original document and drafts from the saved excerpt. Public usage is bounded by daily quotas and a per-visitor hourly limit. A failed source is an error, not permission to invent evidence.” |
| 1:00–1:20 | Click the completed commission card labelled **Published. Read the dispatch**, then scroll to the body and **Sources**. Click the RFC source link, briefly show the genuine text, then return. | “The report cites the fetched RFC. It does not treat vendor claims as facts or pretend that one publisher is independent corroboration.” |
| 1:20–1:35 | Scroll through **What We Know**, **What Remains Unclear**, **Confidence** and **Research Spending**. | “The unresolved questions stay visible. The research bill is zero USDC here; model-provider usage is separate.” |
| 1:35–1:48 | Click **Research Desk**. Point to **Demo data**, session cap, expiry and allowlist. Do not click **Run allowed buy**, which would start another model-backed commission. | “The public wallet controls are labelled simulations. Live signing is disabled. Actual Altana session, identity and settlement evidence remains pending.” |
| 1:48–2:00 | Switch to the exact report JSON tab, then back to **Archives** and the saved clipping. | “The report persists in SQLite, along with the ledger and usage counters. Restart verification preserves the same state. Joan shows the evidence and the limits, not just a confident answer.” |

Paste this assignment exactly:

```text
Check what RFC 9110 actually specifies for HTTP 402 Payment Required. Read https://www.rfc-editor.org/rfc/rfc9110.txt and distinguish the standard from claims about modern payment protocols. Do not infer vendor support.
```

### Mainnet qualification insert after approval

This insert is a recording checklist, not authorization to execute anything:

1. Show the actual Altana mainnet wallet and ERC-8004 agentId with independent registry readback.
2. Show the granted session's real cap, allowlist and expiry, then the recorded grant transaction.
3. Show a genuinely settled x402 research request, its merchant response and verified settlement hash. Identify the actual facilitator; a Buy payment must not be presented as native-facilitator evidence unless that path was verified.
4. Show the correctly tagged ordinary transaction and decoded enrollment-issued suffix. x402 settlements do not currently carry the ordinary attribution tag.
5. Show a real permitted action and a real restriction failure. Name whether refusal happened in the SDK, relay simulation or chain.
6. Show the actual revoke transaction, read revocation back, then demonstrate the agent can no longer use that session. Do not substitute a public mock Desk click.
7. Replace the relevant current-demo narration with these verified facts and keep the final edited film at two minutes. Upload only the finished cut and test unauthenticated playback.

## Before pasting and submitting

The description above is honest about the current deployment. After the mainnet run, replace the pending capability paragraph only with independently read-back outcomes. Fill every applicable evidence slot, publish the repository under explicit approval, record the film, establish the named-user evidence and verify portal requirements. Local files alone do not prove registration or submission.
