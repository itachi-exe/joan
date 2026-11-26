# proof/

Dry-run by default. Needs Node 22.

```
npm install
npm run typecheck
npm test        # offline gate checks
npm run dry     # unsigned quotes + plan; no key read, nothing signed
```

Live mode needs `JOAN_ALLOW_MAINNET=1`, `JOAN_ADMIN_PRIVATE_KEY` (throwaway, small balance) and an explicit go-ahead from Itachi. Optional: `JOAN_CAP_USDC_ATOMIC` (default 50000, max 2000000), `JOAN_EXPIRY_SECONDS` (default 3600, max 86400), `JOAN_APP_CODES` (comma list, include the program-assigned `celo_` code), `JOAN_TAGGED_PAYEE`, `JOAN_STATE_DIR`.

`state/` holds the session key (0600) and `report.jsonl`; it is git-ignored. Never commit it. See ../PAYMENT-PROOF.md.

## Testnet-only compatibility proof

```sh
npm run sepolia
# Same switch explicitly:
JOAN_NETWORK=sepolia npx tsx src/sepolia.ts
```

This is a separate entrypoint, not an enablement of mainnet mode. It refuses other network names, pins chain 11142220 and sandbox USDC, bounds the accepted purchase price to 0.05 test USDC, and disables the SDK's other-chain provisioning and mainnet native-price feed. No existing wallet or service account is used. The fresh admin and session keys are retained mode 0600 under a mode 0700 directory, `/opt/hermes/.hermes/cache/scratch/joan-sepolia-proof`. `JOAN_SEPOLIA_STATE_DIR` may select a different directory strictly under scratch, never the repo. Keep that state directory to resume the same throwaway wallet; do not copy the keys into evidence.

The gateway's address-only `POST https://gateway.usebuy.ai/v1/sandbox/fund` successfully granted 1 test USDC. A verified balance is required before grant. A/B/C can be decided only after an Altana session grant, USDC checker approval, a 200 x402 response with settlement hash, and a successful onchain receipt. The runner revokes a granted session in `finally`.

Current blocker: first-time Altana registration needs about 0.389934 native S-CELO even when `feeToken` is USDC. The address `0x0B79D397cdF83af31e945aA52a2b91E37DBDcF10` has 1 test USDC but no S-CELO. The native faucet at https://faucet.celo.org/celo-sepolia requires reCAPTCHA or a login-issued API key. Its unauthenticated request returned HTTP 401 `invalid-input-response`. No captcha bypass, new login, mainnet funding, or fabricated settlement was attempted. See `../agent/evidence/live-20261126/`.
