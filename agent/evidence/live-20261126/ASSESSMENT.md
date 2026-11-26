# Live evidence assessment, 2026-11-26

## What actually ran

Two unique assignments completed through Joan's real local HTTP API, using actual public-source fetches and DeepSeek's OpenAI-compatible API (`https://api.deepseek.com`, `deepseek-chat`). Each final report was read back through `/reports/:id` and compared with the commission response. Both report JSON files have `origin: live`, `demoData: false`, real fetched source URLs and excerpts, the required byline, all brief fields, and zero paid-research receipts. The USDC purchase ledger remained empty. Zero USDC research spending does not mean free LLM inference; provider usage is separate.

`requests.jsonl` preserves all attempts, including the initial Celo source returning 404. That correctly failed with HTTP 502 and did not publish a replacement mock report. The documentation links were discovered on the official site and corrected, then both assignments were rerun successfully. The same tech assignment consequently appears twice in the request log; the stored final JSON/Markdown are from the successful two-assignment run.

The existing authorized DeepSeek credential was injected only into the child process environment, never into the repository or evidence. Exact-value scans of the evidence passed. No provider request headers or bodies were logged. The assistant's conversation model was not changed.

## Tech report: HTTP 402 standard versus vendor claims

Files: `tech-report.json`, `tech-report.md`.

**Judgment: grounded, useful standards explainer, not original breaking-news reporting.** The original RFC 9110 URL is real, was fetched successfully, and the saved excerpt contains the key sentence: 402 is reserved for future use. The report's narrow central conclusion is supported. It does not invent a vendor, a vendor quote, a payment receipt or a later standard. It correctly says vendor materials were not supplied and later specifications were not searched.

Limits: one primary source, excerpt selection rather than full-document reasoning, no vendor interviews or independent reporting. Statements about the absence of payment semantics should be understood as statements about the supplied RFC evidence, not proof that no later protocol exists. The model's low confidence is conservative for a directly quoted specification, but honest for the broader vendor comparison. Every factual paragraph and known item has valid `[1]` references.

## Celo report: architecture and gas currencies

Files: `celo-report.json`, `celo-report.md`.

**Judgment: grounded description of what Celo's documentation says, not independently verified ecosystem reporting.** Both final URLs are real Celo documentation pages, and the saved excerpts support the cited OP Stack, EigenDA, Ethereum settlement and gas-currency statements. The report explicitly attributes these to Celo and does not turn two pages from one publisher into two independent confirmations. It avoids invented adoption, uptime or reliability numbers and keeps confidence low.

Limits: this is too cautious and repetitive for a polished newsroom dispatch. The headline is long. It spends too much space disclaiming the L2 label and repeats incidental exchange/bridge claims instead of focusing on the assigned developer implications. Independent chain data, external technical analysis and working-wallet tests would improve it. Neither the report nor this assessment proves network reliability or stablecoin-gas compatibility across all wallets. Citation syntax validation does not prove entailment; the assessment checked the main claims against the saved excerpts.

## Celo Sepolia proof

Runner: `cd proof && npm run sepolia` (equivalent: `JOAN_NETWORK=sepolia npx tsx src/sepolia.ts`). No mainnet enablement was used or changed. This runner pins Celo Sepolia and disables the SDK's other-chain provisioning and mainnet native-price-feed reads.

- Fresh throwaway address: `0x0B79D397cdF83af31e945aA52a2b91E37DBDcF10`.
- Headless test-USDC faucet worked: `POST https://gateway.usebuy.ai/v1/sandbox/fund`, address only, no login/captcha.
- Faucet transfer: `0xc920ff357d200a7cf4f7e9db9e55d88ceedaaef4e561a9d526f3a0ec138010ce`. This is **a faucet transfer, not an x402 settlement**.
- Onchain receipt succeeded at block `42393205`; the USDC Transfer log matches the throwaway address and 1,000,000 atomic units. Latest readback shows 1 test USDC, zero native S-CELO, nonce zero and no deployed account code.
- The immediate post-receipt balance initially lagged. A bounded visibility wait was added and tested; later readback independently confirmed the grant.
- Altana quoted a grant, then refused first registration: `Not enough S-CELO for the registration: needs about 0.389934 S-CELO, you have 0 S-CELO. Add S-CELO on Celo Sepolia Testnet.` Selecting USDC as relay fee token did not eliminate this native prerequisite.
- The public native faucet is https://faucet.celo.org/celo-sepolia. Its published API schema says the browser path requires reCAPTCHA v3; bypass needs a login-issued API key. One unauthenticated request returned HTTP 401 `invalid-input-response`. No captcha bypass, authenticated faucet account, existing wallet funds, mainnet action, paid service, message or deployment was used. Stopped at this boundary.

**A/B/C remain unproven. No x402 settlement hash exists.** The blocker is native testnet registration gas and a captcha/auth-gated native faucet, not failure of the successfully funded test-USDC faucet. Once the same throwaway address has sufficient free S-CELO, the script can be resumed. Admin/session keys remain mode 0600 in a mode 0700 scratch directory outside the repository; no keys are in these evidence files. The native-gas estimate is time-sensitive, not a permanent funding quote.

Evidence: `sepolia-attempts.json`, `sepolia-native-faucet.json`, `sepolia-readback.json`. No claim of smart-account x402 compatibility is made from the unsigned 402 offer or faucet transfer.
