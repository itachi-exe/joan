# Joan payment-proof research: source excerpts

Read 2026-11-24 (CET). Every row is read from the URL shown unless marked UNVERIFIED. Raw captures sit beside this file: `catalog.json` (usebuy gateway catalog, 170 capabilities), `hdr-*.txt` and `body-*.json` (unauthenticated 402 quote responses, no payment, no signature).

## Altana (docs.altana.network, SDK @altananetwork/sdk 1.2.0 on npm)

| Claim | Source | Status |
|---|---|---|
| Celo mainnet (42220) is a supported execution chain, export `CELO`, relay https://relay.altana.network, KeyStore `0x83b30935f36d6ccf9B1ec3b5E47F2866b97cd27c`, Controller `0x47bA5fc2A5b0CcB24BA3fAC9D4B59400eE9fd1D6` | https://docs.altana.network/concepts/networks | verified |
| Relay fee on Celo payable in CELO, USDC, USD₮, USA₮ or EURm | same | verified |
| Session = `permissions.calls` (allowlist, `to` and/or `signature`), `permissions.spend` (per token, per rolling period `hour/day/...`), `expiry`. "Permissions are enforced onchain" for `execute` | https://docs.altana.network/concepts/sessions | verified |
| `permissions.calls` omitted means unrestricted | https://docs.altana.network/sdk/grant-session | verified |
| `grantSession` accepts `feeToken` (on Celo: USDC, USDT); the session pays relay fees out of its own spend caps; default fee cap one whole token per day | https://docs.altana.network/sdk/grant-session | verified |
| First admin action on a new wallet pays Keystore registration fee twice; `register:false` skips | same | verified |
| `revokeSession`: one userOp, immediate on the chain where the key is registered, monotonic, needs admin signer only. Returns `status:"FAILED"` rather than throwing when it fails | https://docs.altana.network/sdk/revoke-session | verified |
| `quoteGrantSession` prices a grant without signing or sending | https://docs.altana.network/sdk/grant-session | verified |
| Wallet is an EOA delegated by EIP-7702 to the account contract | https://docs.altana.network/sdk/errors | verified |
| New wallet on Celo is auto-registered as ERC-8004 agent after its first action, in its own tx ("Altana Agent" unless `agentIdentity` set). Celo registry `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432` | https://docs.altana.network/sdk/erc8004 | verified |
| Every `execute` tx carries an ERC-8021 tag `altana[,appCode]`. `appCode` can be a list so a program code such as `celo_xxxxxxxx` can ride along. Session keys send the same tag. ~700 gas. `parseAttribution` reads it back | https://docs.altana.network/sdk/attribution | verified |

### Altana x402 (https://docs.altana.network/sdk/x402, raw source https://raw.githubusercontent.com/altananetwork/altana-sdk/main/docs/pages/sdk/x402.mdx)

The rendered docs page is an older copy; the raw mdx on `main` is newer and is the version quoted here.

- Two rails: `permit2-exact` ("the reliable rail", checker = Permit2) and `exact / EIP-3009` ("Only works for tokens whose EIP-3009 is ERC-1271-aware (Circle FiatTokenV2_2, e.g. Base/Ethereum USDC)", checker = the token). Later paragraph: "Circle's USDC and `$U` both verify through `SignatureChecker`, so both rails carry an Altana wallet's signature once the matching approval is set; granting with `x402Tokens` sets both." verified (docs claim)
- A session key passes ERC-1271 only from a contract the account approved as signature checker for that key. Super-admin keys pass from any caller. verified
- Permit2 rail also needs an ERC-20 allowance to Permit2. EIP-3009 rail needs only `approveSignatureChecker({checker: token})`. verified
- `grantSession({... x402Tokens:[USDC]})` approves USDC to Permit2 and both checkers in the grant intent. verified
- THE CAP: "The account applies a session's spend caps where it sees a spend, which is inside `execute`. An x402 payment does not pass through there... No amount reaches it. The SDK is what signs, so the SDK applies the cap." Over limit: SDK throws `AltanaError` code `spend_limit_exceeded` before signing. The x402 count "lives in the process that signs them and starts again when it does". "A session with no cap on the payment token has no limit to apply." "`signX402Payment` signs without it ... and so does anything else holding the session key. A short expiry and a wallet holding only its working balance bound a session whatever signs with it." verified. Consequence: for x402 the cap is SDK-enforced, not chain-enforced. Onchain bounds are: checker approval per key, expiry/revocation (checked at settlement through ERC-1271, UNVERIFIED for a revoked key), wallet balance, and the Permit2 allowance (permit2 rail only).
- `fetchWithX402` options: `chainId`, `preferRail: "permit2"|"eip3009"` (default permit2), `checkApprovals` (default true, refuses and names the missing approval), `checkSpendCap` (default true). Signs once and retries once; never loop blindly. Server-side only (CORS). verified
- Signature is a 98-byte ERC-1271 envelope; a facilitator must verify via `isValidSignature`. verified
- Network aliases accepted: `celo`, `celo-sepolia`, CAIP-2. verified

## Celo x402 facilitator

| Claim | Source | Status |
|---|---|---|
| Mainnet facilitator https://api.x402.celo.org, `exact` scheme, CAIP-2 `eip155:42220`. USDC `0xcebA9300f2b948710d2653dD7B07f33A8B32118C` (name USDC, version 2), USDT `0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e` (Tether USD, 1), USAT `0xD2ab3C9A02DBBAB236BfEC45D1d755DF4267F771` (Tether America USD, 1): all 6 decimals, `eip3009`. Seven local-currency assets use `permit2` | https://x402.celo.org/skill.md | verified |
| `/supported` lists x402 v2 `exact` on eip155:42220 plus v1 alias `celo`; extensions include `eip2612GasSponsoring` | https://api.x402.celo.org/supported (page truncated by the reader; full JSON read on 2026-11-21 per ROUND3-PAYMENT-CONSTRAINTS.md) | verified |
| Seller flow: wallet connect at x402.celo.org gives an API key; `@x402/hono` or `@x402/express` v2, `@x402/core`, `@x402/evm`; `payTo` and `price` inside each route `accepts`; do not use `"$0.01"` price strings on Celo (silently priced in USDC). Seller pays gas + 0.3% per settlement from a prepaid balance; up to 100 free mainnet settlement credits | skill.md and https://loops.house/agents-open-for-business (FAQ) | verified |
| Buyer flow with `@x402/fetch` + `@x402/evm`, buyer needs no gas on hosted facilitator. Default per-payment cap `$1` for USDT/USAT; set `spendControls` | skill.md | verified |
| Settlement p50 about 1.6 s, request typically 2 to 3.5 s end to end; settlements run one at a time per network | skill.md | verified |
| Whether the facilitator accepts an ERC-1271 (98-byte) signature on the EIP-3009 `exact` path | not stated in skill.md | UNVERIFIED |

## ERC-8021 attribution (https://github.com/celo-org/attribution-tags, BUILDERS.md, npm @celo/attribution-tags 0.5.0)

- Suffix appended to calldata; contract ignores it. Any `[a-z0-9_]` code 1 to 32 chars is valid on the wire. Programs assign a code (Celo Builders platform derives `celo_` + first 12 hex of SHA-256(lowercase `owner/repo`), reproducible with `codeFromRepo`). "If a program assigned you a code, it must be in the suffix", a self-derived code "will silently never be credited". verified
- Smart accounts: `verifyTx` decodes ERC-4337 `handleOps` and finds the tag inside UserOp callData; credit goes to `sender`. Relayers that re-encode calldata can drop the suffix. Altana uses its own relay, so check the first tx. verified (general), Altana relay behaviour UNVERIFIED until a real tx.
- "the Celo x402 facilitator (api.x402.celo.org) does not write Schema 2 tags yet ... Until it ships, x402 settlements on Celo carry no tag. Declaring your app code in your 402 responses (the x402 `builder-code` extension) is harmless now." verified
- Loops rules: "An attribution tag in every transaction you want counted; x402 sellers also register their PayTo address." https://loops.house/agents-open-for-business verified

## ERC-8004 (https://docs.celo.org/build/agents/8004, https://eips.ethereum.org/EIPS/eip-8004)

- Celo mainnet Identity Registry `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432`, Reputation Registry `0x8004BAa17C55a88189AE136b182e5fdA19dE9b63`. `register(string agentURI)` mints NFT to `msg.sender` and sets `agentWallet = msg.sender`. Registration file lists `services` and `x402Support:true`. Self-feedback is blocked. verified
- Registering from the Altana wallet via `execute` makes the wallet the owner and agentWallet; Altana's own auto-registration uses its default record "Altana Agent", so set `agentIdentity` on the client before first action, or `setAgentURI` afterwards. verified (mechanism), UNVERIFIED that an Altana session key may call the registry (needs a `calls` allowlist entry, and owner-only functions are better done by admin).

## Celo Buy (https://usebuy.ai/docs, /limits, https://gateway.usebuy.ai/v1/catalog; site shows v0.8.7 Beta)

| Capability | Endpoint (POST) | Quoted price | Status |
|---|---|---|---|
| Search X posts | /v1/social/x/posts/search body `{query,type?,cursor?}` | $0.005 (5000 atomic), live 402 read 2026-11-24 | verified |
| Search Reddit | /v1/social/reddit/posts/search body `{query,type?,sort?,timeRange?,after?}` | $0.005 catalog; 402 for the same endpoint also read 5000 | verified |
| Search YouTube videos | /v1/social/youtube/videos/search | $0.005 catalog | verified |
| YouTube transcript | /v1/social/youtube/tools/apify-starvibe-youtube-video-transcript body `{"body":{"youtube_url":...,"language":"en"},"maxResults":1}` | $0.013 (maxResults 1), $0.053 (5), $0.103 (10); live 402 read 13000 | verified |
| Other X tools (tweet detail, user posts, comments) | /v1/social/x/tools/... | $0.005 each (TikHub) | verified (catalog) |

- Live 402 from the gateway (unauthenticated POST, nothing signed): HTTP 402, body is x402 **v1** (`network:"celo"`, `maxAmountRequired`), header `payment-required` is **v2** (`eip155:42220`, `amount`). Offers: USDC, USDT, USAT on mainnet plus a Sepolia USDC sandbox offer, all `scheme:exact`, `extra:{name,version}` with no `assetTransferMethod`, so EIP-3009 only. No Permit2 offer. `payTo 0x20faAca5F980E29639A0FCC6dcA6988E18ed333B`. maxTimeoutSeconds 300. verified (see hdr-x-search.txt, body-x-search.json)
- Client side `buy curl --max-amount` and `buy account cap` are CLI-local guards, not an onchain cap (limits page). verified
- Gateway sponsors gas; `buy` signs EIP-3009 locally with an EOA key (docs "What happens on the wire"). An Altana session key is a different signature type (ERC-1271 envelope). Whether the gateway verifier accepts that: UNVERIFIED.
- Limits: JSON body 64 KiB (413 before 402), upstream deadline 150 s (504, not retryable), partner 429 can land after settlement, `500 provision_failed` and `500 settle_uncertain` must not be retried automatically, payments final, no refunds, beta, no external security review. https://usebuy.ai/limits and /docs#safety verified
- Gateway publishes payer feedback via ERC-8004: header `X-8004-Agent-Id`, tag1 `paid`, reputation registry above; providers have agent ids (tikhub 9895, apify 9896). A paying agent with an ERC-8004 id can send its id. Effect on judging: UNVERIFIED.
- Self proof is required only for some services (e2-standard VMs); social-data routes showed no Self requirement in the quote. verified for the three routes quoted.

## On-chain reads done (read-only eth_call / eth_getCode on https://celo-rpc.publicnode.com, no signing)

- Celo USDC `0xcebA...118C` is a proxy; implementation `0xda06d4e3f59fe2c8ff3077a9d50d5be5e231becd` (from the zeppelinos implementation slot). Its bytecode contains the selectors of `transferWithAuthorization(...,bytes signature)` (`cf092995`) and `receiveWithAuthorization(...,bytes)` (`88b7ab63`) and the v,r,s form, which is the FiatTokenV2_2 shape. The literal `isValidSignature` selector `1626ba7e` was NOT found in that bytecode. Inconclusive: the check is a crude selector scan, not a proof. ERC-1271 awareness of Celo USDC EIP-3009 is UNVERIFIED.
- Celo USDT `0x4806...3D5e` is a proxy to `0xbf83f8436ac46a8b1da5a9348ed84f68aee07b98` whose bytecode contains `1626ba7e` and the bytes-signature `transferWithAuthorization` selector. Suggests USDT may be ERC-1271 aware. Crude scan, UNVERIFIED.
- Definitive tests (cannot be done without a signature): one tiny payment from a throwaway smart wallet on Celo Sepolia (the sandbox), then mainnet.
