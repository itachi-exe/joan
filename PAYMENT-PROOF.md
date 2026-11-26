# Joan payment proof: Altana session key paying Celo Buy over x402

Prepared 2026-11-24 for Itachi and ODK. Preparation only. No transaction, signature, wallet creation, registration or message was made. Sources and raw captures: `research/SOURCES.md`. Marks: **V** = read from the cited source, **U** = unverified.

## Answer

1. **Can a session key pay a Celo Buy x402 call on Celo mainnet?** Not proven. The pieces exist on paper (Altana x402 on Celo, Buy accepts EIP-3009 USDC on 42220), but the join is untested. Three things decide it and none can be read from docs:
   - **A.** Does the Buy gateway's verifier accept an Altana 98-byte ERC-1271 signature on the EIP-3009 `exact` path? **U**
   - **B.** Does Celo USDC's `transferWithAuthorization` validate smart-account signatures? Altana's own docs say Circle FiatTokenV2_2 USDC does (their examples are Base and Ethereum). The Celo USDC implementation has the FiatTokenV2_2 selectors (bytes-signature overload present, **V** by bytecode scan) but a crude scan did not find the `isValidSignature` selector. **U**
   - **C.** Does Altana SDK 1.2.0 `fetchWithX402` handle the gateway's 402 (v1 JSON body with `network:"celo"`, v2 `payment-required` header with `eip155:42220`) and pick the EIP-3009 rail? `networkToChainId` accepts `celo`; `preferRail:"eip3009"` exists. **U** until run.
   The only conclusive test is one real payment of $0.005. Run it on the Buy sandbox first (Celo Sepolia, every 402 carries a Sepolia USDC offer, faucet gives test USDC), then mainnet.
2. **Is the cap onchain for x402?** No. Altana's docs say so directly: the account applies caps inside `execute`, an x402 payment "does not pass through there", the SDK checks the cap before signing and keeps its x402 tally in process memory (resets on restart). Anything else holding the session key can sign without the check. **V**. Real onchain bounds for x402: signature-checker approval per key, expiry, revocation, the wallet's balance. Plan the demo around this: show the x402 cap as an SDK refusal and the onchain refusals through `execute` (unapproved destination, over-cap transfer, post-revoke). Do not claim chain-enforced x402 caps.
3. **Can Joan sell stories over x402?** Yes, mechanically. Celo's facilitator supports sellers (skill.md): Hono or Express v2 middleware, `payTo` = Joan's wallet, USDC `exact`, API key from x402.celo.org, 100 free settlements then gas + 0.3% from a prepaid balance. **V**. A buyer that is an ordinary EOA agent works with the stock `@x402/fetch`. An Altana-wallet buyer faces the same ERC-1271 question as A on the facilitator side. **U**

## Token and rail

| Choice | Decision | Why |
|---|---|---|
| Token | **USDC** `0xcebA9300f2b948710d2653dD7B07f33A8B32118C` (6 decimals) | Buy lists USDC first and as default; Altana relay fee can be paid in USDC; the cap is in one token so relay fees and purchases share one budget. **V** |
| USDT | fallback only | Buy and the facilitator accept it. Its implementation bytecode contains `isValidSignature`, which hints at ERC-1271 support, **U**. |
| Rail | **EIP-3009** (`exact`) | Buy's 402 offers no Permit2. Offers are USDC, USDT, USAT on 42220 and USDC on Sepolia, all EIP-3009 (`extra:{name,version}`, no `assetTransferMethod`). **V** |
| Permit2 | not used | Not offered by Buy. Skipping it also avoids a max ERC-20 allowance to Permit2. Do not pass `x402Tokens` to `grantSession`, it approves Permit2 as well. **V** |

## Session key permissions

| Field | Value for the proof | Note |
|---|---|---|
| `spend` | `{token: USDC, limit: 50000 (=$0.05), period: "day"}` | SDK cap for x402, chain cap for `execute`. The relay fee is paid from the session's caps too (docs), so $0.05 may be too tight once the fee is known; read `quoteGrantSession` and raise. Production default in the brief: $10. |
| `calls` | `[{to: USDC, signature: "transfer(address,uint256)"}]` | Applies to `execute` only, not to x402. Omitted `calls` means unrestricted, never omit. The allowlist takes `to` and `signature` only; it does not pin the recipient, so a permitted `transfer` can go to any address within the cap. **V** (docs show no argument matching) |
| `expiry` | now + 1h for the proof, 24h for demos | Max enforced by the script: 24h. |
| `feeToken` | USDC | Lets the session pay relay fees in USDC. Needs the cap above. |
| signature checker | `approveSignatureChecker({checker: USDC})` | Required per key, per chain. `fetchWithX402` reads it and refuses if missing. |
| ERC-8004 / identity | not in the session | Owner-only registry actions stay with the admin signer. |

## Step list (what the script does)

0. Dry run (safe now): `cd proof && npm i && npm run dry`. Quotes X search ($0.005) and the YouTube transcript x10 ($0.103) unsigned, prints the plan. Executed on 2026-11-24, output matched this document.
1. **Gate (needs Itachi)**: approve the spend, the fresh wallet and the session grant. Use a throwaway admin key for the proof, funded with at most about $2 of USDC on Celo. Set `JOAN_ADMIN_PRIVATE_KEY` in the environment, never in a file the repo tracks.
2. Before any live mainnet step, run `cd proof && npm run sepolia` (equivalent: `JOAN_NETWORK=sepolia npx tsx src/sepolia.ts`). This separate, strictly testnet-only path uses `CELO_SEPOLIA`, selects only the sandbox USDC EIP-3009 offer, generates throwaway admin/session keys in mode-0600 scratch files outside the repo, and requests the keyless Buy faucet. It never enables the mainnet gate. The 2026-11-26 attempt obtained 1 test USDC but Altana's first registration also needs native S-CELO; the native faucet requires captcha or an authenticated API key. A/B/C remain unproven. See `agent/evidence/live-20261126/ASSESSMENT.md` and the Sepolia evidence beside it.
3. `createClient({chains:[CELO], appCode:[...codes], agentIdentity:{name:"Joan",...}})`. Set `agentIdentity` before the first action, otherwise Altana auto-registers the wallet as "Altana Agent" in its own tx. **V**
4. `createWallet({signer: admin})` (counterfactual, no chain write). Fund the printed address with USDC (and nothing else, the relay takes USDC). The first admin action pays the Keystore registration fee twice. **V**
5. `quoteGrantSession(...)`, read the legs, then `grantSession(...)` with the permissions above and `sessionSigner` generated locally. The script stores the key `0600` under `state/` and the serialized session (no secret) beside it.
6. `approveSignatureChecker({checker: USDC})`.
7. **Allowed purchase**: `fetchWithX402({url: X_SEARCH, preferRail:"eip3009", chainId:42220})`. Expect 200 and a `payment-response` header with the settlement hash. $0.005.
8. **Tagged ordinary tx** (this is what counts for traction): session `execute` of USDC `transfer` 0.001 to `JOAN_TAGGED_PAYEE`; decode with `verifyTx`, confirm the codes include the program-assigned one. Do this before anything else is counted.
9. **Over-cap x402**: YouTube transcript with `maxResults:10` ($0.103 > $0.05). Expect SDK `spend_limit_exceeded` before signing. Label it client-side.
10. **Onchain refusals via `execute`**: USDT `transfer` (not allowlisted, expect `call_not_permitted`); USDC `transfer` of cap+1 (expect `spend_limit_exceeded`). Whether the refusal comes from the relay's simulation (nothing reaches chain) or an onchain revert is **U**; Altana's error table says relay rejection happens before inclusion. If a judge wants a revert on chain, check the tx list. Ask Altana (question 4).
11. `revokeSession({wallet, signer: admin, session})`. It can return `FAILED` without throwing; the script treats a missing hash as failure. Record the tx hash: the Altana track requires an actual revoke transaction.
12. **Pay again**: same X search. Expect refusal (SDK approval check, or signature rejected at settlement). Record which one.

Every live step calls `requireLive()`; with `JOAN_ALLOW_MAINNET` unset the script prints SKIPPED_DRY_RUN. Selftest (`npm test`) checks the gate with values `0`, `true`, `yes`, `2`, empty and the cap/expiry/code limits. It passes.

## Known incompatibilities and risks

- Buy offers only EIP-3009 and the SDK default rail is Permit2. Without `preferRail:"eip3009"` the SDK may pick nothing or fail. **V** (both facts), behaviour **U**
- 402 mismatch: body is x402 v1, header is v2. Which one the SDK parses is **U**.
- ERC-1271 acceptance by Buy's gateway and Celo's facilitator: **U** (questions A and B).
- x402 cap is not onchain (above). The in-process x402 tally resets when Joan restarts; Joan's SQLite ledger must carry the real running total and must pass the amount on, not rely on the SDK.
- A signed EIP-3009 authorization stays valid for up to 300 s (`maxTimeoutSeconds`). Whether a revoke inside that window blocks settlement (ERC-1271 check at settle time) is **U**.
- Buy limits: 64 KiB body, 150 s upstream deadline with non-retryable 504, `500 provision_failed` and `500 settle_uncertain` must not be retried (settlement may have happened), partner 429 can land after settlement, no refunds, beta without external security review. **V** Joan's ledger must treat unknown settlement as reconcile, not repurchase.
- Altana wallets are EIP-7702 accounts; contracts paying native CELO via `.transfer()` revert. ERC-20 flows are unaffected. **V**
- Browser use is not possible for `fetchWithX402` (CORS); run server-side. **V**
- Prior winners overlap (Assay, Growth Scout, Traction-Check, per BRIEF.md). Not a payment risk, a positioning one.

## Fallbacks if A, B or C fail

1. **Prefunded buy wallet**: the session key funds a small separate Buy wallet with an allowlisted USDC `transfer` (cap and allowlist enforced onchain on that top-up), and Joan pays Buy from that wallet with stock `buy curl --max-amount`. Honest cost: Buy purchases are then not signed by the Altana wallet, so "agent acts from Altana wallet" holds for the funding and the tagged payments but not the purchases. Needs a clear label in the demo. Needs Itachi's decision.
2. **Switch token to USDT** if B shows USDC is not ERC-1271 aware and USDT is. Re-run with `USDT` in `permissions`, checker and fee cap.
3. **Skip Buy for the proof** and pay a self-run x402 seller (Joan's own endpoint, `payTo` = a second wallet) to prove the session-key x402 path with a seller we control. Then Buy remains an optional purchase. Does not meet "Buy" as the first risk, but separates A from B.

## Cost estimate (all USD)

| Item | Amount | Status |
|---|---|---|
| X search / Reddit search / YouTube search | $0.005 each | **V** (live 402 for X and Reddit, catalog for YouTube search) |
| YouTube transcript | $0.013 (1) / $0.053 (5) / $0.103 (10) | **V** (live 402 at 1) |
| Typical Joan report (3 X, 2 Reddit, 2 transcripts at 1) | about $0.051 | arithmetic from above |
| Proof run purchases | $0.005 | **V** |
| Altana relay fees: grant (registration twice on first action), checker approval, revoke, tagged tx, ERC-8004 registration | unknown | **U**, read `quoteGrantSession` and `quoteExecute` before funding |
| Facilitator or Buy gas | 0 for the buyer (gateway sponsors gas) | **V** |
| Suggested funding for the proof | about $2 USDC | Itachi to confirm; script refuses a cap above $2 |
| Seller side | 100 free settlements, then gas + 0.3% | **V** |

## Attribution plan

- x402 settlements on Celo carry **no** ERC-8021 tag today (celo-org attribution-tags BUILDERS.md, upstream PR open). Buy purchases will not count as Joan's tagged activity. **V**
- Sellers register their `payTo` with the organisers at enrollment (Loops rules). The enrollment form is login gated, so the field and place are **U**. Joan's `payTo` must be the Altana wallet that will receive sales, and the wallet must exist before enrollment.
- Add the `builder-code` extension with the program code to Joan's own 402 responses once issued; harmless now, picked up later. **V**
- Ordinary Altana transactions: `createClient({appCode: [...]})` appends `altana,<codes>` to every `execute`, session keys included. The program's assigned `celo_...` code must be in the list; a self-derived code is never credited. If the code comes from the repo, `codeFromRepo("owner/repo")` must match it, and the repo name must be final before the code is used (a rename or a fork changes it). **V**
- Tag from the first counted tx, it cannot be credited later. Before the tag exists, use the placeholder `joan` and treat those txs as uncounted. Verify the first tx with `verifyTx`; Altana uses its own relay, so check that the suffix survives (`handleOps` decoding exists). **U** for Altana's relay.
- Traction ideas that are tagged and ordinary: editor pays Joan per report from their Altana wallet; Joan's own session-key purchases or payouts. Independent users must be outside the team and not funded by it (Loops FAQ). Repeat use over one-off volume (rubric).
- ERC-8004: register Joan from the Altana wallet (`msg.sender` becomes owner and `agentWallet`), host a registration file with `x402Support:true` and the service endpoints, then `setAgentURI`. Altana may auto-register on first action (unless `agentIdentity` is set); do not register twice. Registry `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432`. **V**

## Open questions

### Altana livestream (Wed 2026-11-25 14:00 GMT)

1. Is a session key's x402 payment validated by the account at settlement for expiry and revocation? After `revokeSession`, does an already signed, unsettled EIP-3009 authorization fail?
2. Does the Celo USDC (`0xcebA...118C`) EIP-3009 path verify ERC-1271 signatures? Has anyone settled an Altana session-key x402 payment on Celo mainnet or Sepolia, and against which facilitator or merchant?
3. Roadmap for an onchain x402 cap (the docs say the SDK enforces it). Any plan to enforce through the token, Permit2 or the account?
4. When `execute` is refused for `call_not_permitted` or `spend_limit_exceeded`, is that the relay's simulation or an onchain revert? What should a demo show as the "onchain refusal"?
5. Can `calls` pin the recipient or an argument (for example `transfer` only to the editor)? If not, what is the recommended pattern for "pay only this address"?
6. Relay fees on Celo: expected cost of grant, approval, revoke and a tagged transfer in USDC; how should a session cap be sized so fees do not eat the purchase budget?
7. Attribution: does the Altana relay preserve a Celo program `celo_...` code appended by `appCode`, and how will the Altana track count tagged activity (per wallet, per code)? Is `appCode` the intended way to include the program code?
8. ERC-8004: should the agent be registered from the admin wallet or the session? Does Altana's automatic registration conflict with a custom registration file?
9. Review XP: can the specific, reproducible review be about this proof (x402 plus session key on Celo)? Which Telegram channel and format?

### Organisers' Telegram (t.me/celoagenthackathons), do not post without Itachi

1. Has anyone paid the Buy gateway from a smart account (ERC-1271)? Does the Buy gateway verifier accept it?
2. Where and when is the seller `payTo` registered (enrollment form fields, can it be changed later)? Does registration need to happen before the first counted payment?
3. Will the `builder-code` extension and x402 Schema 2 tags go live during the window? Until then, will x402 purchases from Buy count for "buy usage" in any way other than the repo reading?
4. Does the attribution code issued at enrollment depend on the repo name (so the name must be final before the first counted tx)?
5. Is a payment from Joan to another team's ERC-8004 agent over x402 counted as an independent user for the other team, and what evidence do judges read?
6. Does a Sepolia sandbox x402 payment against Buy count as a testnet reference only (we assume yes)?

## Not done (by design)

No wallet or key was created, nothing was signed or sent, no registration, no repo, no message. The only outbound calls were public reads: docs pages, the Buy catalog, three unauthenticated POSTs to Buy that answered 402 without payment (X, Reddit, YouTube transcript), and read-only Celo RPC calls (`eth_getCode`, `eth_getStorageAt`, `eth_call` name).
