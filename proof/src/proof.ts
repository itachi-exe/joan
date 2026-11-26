// Joan day-one payment proof: Altana session key pays a Celo Buy x402 call on Celo mainnet.
//
// DEFAULT IS DRY RUN. Nothing is signed, no key is read or created, no transaction is sent.
// The only network traffic in dry run is the unauthenticated quote POST to the Buy gateway
// (it answers 402 and costs nothing). Everything that signs or broadcasts goes through
// requireLive(), which throws unless JOAN_ALLOW_MAINNET=1.
//
// Live use needs a separate go-ahead from Itachi (spend, wallet funding, session grant).

import { appendFileSync, mkdirSync, writeFileSync, existsSync, readFileSync, chmodSync } from "node:fs";
import { dirname, join } from "node:path";

// ---------- constants (sources in ../research/SOURCES.md) ----------
export const CHAIN_ID = 42220;
export const USDC = "0xcebA9300f2b948710d2653dD7B07f33A8B32118C" as const;
export const USDT = "0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e" as const;
export const GATEWAY = "https://gateway.usebuy.ai";
export const X_SEARCH = `${GATEWAY}/v1/social/x/posts/search`;
export const YT_TRANSCRIPT = `${GATEWAY}/v1/social/youtube/tools/apify-starvibe-youtube-video-transcript`;

// Hard ceilings the script enforces regardless of env, so a typo cannot widen the proof.
export const HARD_MAX_CAP_ATOMIC = 2_000_000n; // 2 USDC
export const HARD_MAX_EXPIRY_S = 24 * 60 * 60;

export type Config = {
  live: boolean;
  capAtomic: bigint; // session spend cap per day, USDC atomic (6 decimals)
  expirySeconds: number;
  appCodes: string[]; // ERC-8021 codes; include the program-assigned celo_... code once issued
  stateDir: string;
  taggedPayee?: string;
};

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const capAtomic = BigInt(env.JOAN_CAP_USDC_ATOMIC ?? "50000"); // $0.05
  const expirySeconds = Number(env.JOAN_EXPIRY_SECONDS ?? "3600");
  if (capAtomic <= 0n || capAtomic > HARD_MAX_CAP_ATOMIC) throw new Error(`cap must be 1..${HARD_MAX_CAP_ATOMIC} atomic USDC`);
  if (!(expirySeconds > 0 && expirySeconds <= HARD_MAX_EXPIRY_S)) throw new Error(`expiry must be 1..${HARD_MAX_EXPIRY_S} seconds`);
  const appCodes = (env.JOAN_APP_CODES ?? "joan").split(",").map((s) => s.trim()).filter(Boolean);
  for (const c of appCodes) if (!/^[a-z0-9_]{1,32}$/.test(c)) throw new Error(`bad ERC-8021 code: ${c}`);
  return {
    live: env.JOAN_ALLOW_MAINNET === "1",
    capAtomic,
    expirySeconds,
    appCodes,
    stateDir: env.JOAN_STATE_DIR ?? join(process.cwd(), "state"),
    taggedPayee: env.JOAN_TAGGED_PAYEE,
  };
}

/** The single gate. Every signing or broadcasting step calls this first. */
export function requireLive(cfg: Config, what: string): void {
  if (!cfg.live) throw new Error(`REFUSED (dry run): "${what}" would sign or broadcast. Set JOAN_ALLOW_MAINNET=1 to allow.`);
}

// ---------- unsigned quote ----------
export type Offer = { network: string; asset: string; amountAtomic: string; payTo: string; token: string; rail: "eip3009" | "permit2" };

const TOKEN_BY_ADDR: Record<string, string> = {
  [USDC.toLowerCase()]: "USDC",
  [USDT.toLowerCase()]: "USDT",
  "0xd2ab3c9a02dbbab236bfec45d1d755df4267f771": "USAT",
  "0x01c5c0122039549ad1493b8220cabedd739bc44e": "USDC(sepolia)",
};

/** POST without payment. Gateway answers 402. Reads the v2 header, falls back to the v1 body. No signature, no funds. */
export async function quote(url: string, body: unknown, fetchImpl: typeof fetch = fetch): Promise<{ status: number; offers: Offer[] }> {
  const res = await fetchImpl(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  if (res.status !== 402) return { status: res.status, offers: [] };
  let accepts: any[] = [];
  const hdr = res.headers.get("payment-required");
  if (hdr) {
    try { accepts = JSON.parse(Buffer.from(hdr, "base64").toString("utf8")).accepts ?? []; } catch { /* fall through to body */ }
  }
  if (accepts.length === 0) {
    try { accepts = (await res.json() as any).accepts ?? []; } catch { /* leave empty */ }
  }
  const offers = accepts.map((a) => ({
    network: String(a.network),
    asset: String(a.asset),
    amountAtomic: String(a.amount ?? a.maxAmountRequired),
    payTo: String(a.payTo),
    token: TOKEN_BY_ADDR[String(a.asset).toLowerCase()] ?? "unknown",
    rail: (a.extra?.assetTransferMethod === "permit2" ? "permit2" : "eip3009") as "eip3009" | "permit2",
  }));
  return { status: 402, offers };
}

export function pickMainnetUsdc(offers: Offer[]): Offer | undefined {
  return offers.find((o) => (o.network === "eip155:42220" || o.network === "celo") && o.asset.toLowerCase() === USDC.toLowerCase());
}

// ---------- reporting (never prints keys) ----------
type StepResult = { step: string; outcome: "PASS" | "FAIL" | "SKIPPED_DRY_RUN" | "INFO"; detail?: unknown };
const results: StepResult[] = [];
function record(cfg: Config, r: StepResult) {
  results.push(r);
  console.log(`[${r.outcome}] ${r.step}${r.detail !== undefined ? " " + JSON.stringify(r.detail, (_k, v) => (typeof v === "bigint" ? v.toString() : v)) : ""}`);
  if (cfg.live) {
    mkdirSync(cfg.stateDir, { recursive: true });
    appendFileSync(join(cfg.stateDir, "report.jsonl"), JSON.stringify(r, (_k, v) => (typeof v === "bigint" ? v.toString() : v)) + "\n");
  }
}
const skipped = (cfg: Config, step: string, would: unknown) => record(cfg, { step, outcome: "SKIPPED_DRY_RUN", detail: would });

/** A step that must be refused. PASS only when it throws, returns FAILED, or answers non-2xx. */
async function expectRefusal(cfg: Config, step: string, fn: () => Promise<unknown>) {
  try {
    const out: any = await fn();
    const refused = out?.status === "FAILED" || (typeof out?.status === "number" && out.status >= 400);
    record(cfg, { step, outcome: refused ? "PASS" : "FAIL", detail: refused ? { refusedBy: "result", status: out?.status } : "NOT REFUSED: the action succeeded" });
  } catch (e: any) {
    record(cfg, { step, outcome: "PASS", detail: { refusedBy: "throw", code: e?.code, message: String(e?.message ?? e).slice(0, 300) } });
  }
}

// ---------- main ----------
async function main() {
  const cfg = loadConfig();
  console.log(cfg.live ? "MODE: LIVE (JOAN_ALLOW_MAINNET=1). Real Celo mainnet transactions." : "MODE: DRY RUN. Nothing is signed or broadcast.");
  console.log(`cap/day=${cfg.capAtomic} atomic USDC, expiry=${cfg.expirySeconds}s, codes=${cfg.appCodes.join(",")}`);

  // 1. Quote (no signature, no funds, allowed in dry run)
  const q = await quote(X_SEARCH, { query: "celo" });
  const usdc = pickMainnetUsdc(q.offers);
  record(cfg, { step: "quote X search (unsigned)", outcome: q.status === 402 && usdc ? "PASS" : "FAIL", detail: { httpStatus: q.status, offers: q.offers.map((o) => `${o.token}:${o.amountAtomic}:${o.rail}:${o.network}`) } });
  if (!usdc) throw new Error("no mainnet USDC offer in the 402; stop");
  const price = BigInt(usdc.amountAtomic);
  const qt = await quote(YT_TRANSCRIPT, { body: { youtube_url: "https://www.youtube.com/watch?v=E3HUsW-X7EA", language: "en" }, maxResults: 10 });
  const ytTop = pickMainnetUsdc(qt.offers);
  record(cfg, { step: "quote YouTube transcript x10 (unsigned, the over-cap target)", outcome: ytTop ? "PASS" : "FAIL", detail: { amountAtomic: ytTop?.amountAtomic } });
  const overCapAmount = BigInt(ytTop?.amountAtomic ?? "0");
  if (overCapAmount <= cfg.capAtomic) record(cfg, { step: "over-cap precondition", outcome: "FAIL", detail: `cap ${cfg.capAtomic} >= over-cap price ${overCapAmount}; lower JOAN_CAP_USDC_ATOMIC` });
  if (price > cfg.capAtomic) throw new Error("cap smaller than one X search; raise JOAN_CAP_USDC_ATOMIC");

  if (!cfg.live) {
    skipped(cfg, "connect wallet (createWallet, counterfactual)", "needs JOAN_ADMIN_PRIVATE_KEY; no chain write");
    skipped(cfg, "quoteGrantSession", "relay price quote, nothing signed");
    skipped(cfg, "grantSession on Celo", { calls: [{ to: USDC, signature: "transfer(address,uint256)" }], spend: [{ token: USDC, limit: cfg.capAtomic, period: "day" }], expiry: `+${cfg.expirySeconds}s`, feeToken: USDC });
    skipped(cfg, "approveSignatureChecker(checker = USDC token)", "eip3009 rail only; no Permit2 approval");
    skipped(cfg, "pay X search via fetchWithX402 (preferRail eip3009)", `${price} atomic USDC to ${usdc.payTo}`);
    skipped(cfg, "ordinary tagged tx: session execute USDC.transfer", "ERC-8021 suffix via client appCode");
    skipped(cfg, "over-cap pay (expect refusal, SDK spend_limit_exceeded)", `${overCapAmount} atomic > cap ${cfg.capAtomic}`);
    skipped(cfg, "unapproved destination (expect refusal, call_not_permitted)", `execute USDT.transfer, USDT not in calls allowlist`);
    skipped(cfg, "revokeSession", "admin signer, one userOp");
    skipped(cfg, "pay again after revoke (expect refusal)", "same X search call");
    console.log("Dry run complete. No key was read, nothing was signed.");
    return;
  }

  // ---------- LIVE ----------
  requireLive(cfg, "load SDK and keys");
  const adminKey = process.env.JOAN_ADMIN_PRIVATE_KEY as `0x${string}` | undefined;
  if (!adminKey || !/^0x[0-9a-fA-F]{64}$/.test(adminKey)) throw new Error("JOAN_ADMIN_PRIVATE_KEY missing or malformed (value is never printed)");
  const sdk = await import("@altananetwork/sdk");
  const { generatePrivateKey } = await import("viem/accounts");
  const { createPublicClient, http, encodeFunctionData, erc20Abi } = await import("viem");
  const { celo } = await import("viem/chains");

  const client = sdk.createClient({ chains: [sdk.CELO], appCode: cfg.appCodes, agentIdentity: { name: "Joan", description: "AI journalist. Prepared by Joan.", endpoint: "https://example.invalid/joan" } });
  const admin = sdk.signerFromPrivateKey(adminKey);

  requireLive(cfg, "createWallet");
  const wallet = await client.createWallet({ signer: admin });
  record(cfg, { step: "connect wallet", outcome: "INFO", detail: { address: wallet.address } });
  const bal = await client.balances({ wallet } as any).catch((e: any) => ({ error: String(e?.message ?? e) }));
  record(cfg, { step: "balances (read)", outcome: "INFO", detail: bal });

  // Session key: generated here, stored 0600, never printed. Serialized session holds no secret.
  mkdirSync(cfg.stateDir, { recursive: true });
  const keyPath = join(cfg.stateDir, "session.key");
  let sessionKey: `0x${string}`;
  if (existsSync(keyPath)) sessionKey = readFileSync(keyPath, "utf8").trim() as `0x${string}`;
  else { sessionKey = generatePrivateKey(); writeFileSync(keyPath, sessionKey + "\n", { mode: 0o600 }); chmodSync(keyPath, 0o600); }
  const sessionSigner = sdk.signerFromPrivateKey(sessionKey);

  const permissions = {
    // ONCHAIN allowlist for execute(): USDC contract, transfer only. x402 does not pass through this.
    calls: [{ to: USDC, signature: "transfer(address,uint256)" }],
    // Cap: SDK-enforced for x402, chain-enforced for execute().
    spend: [{ token: USDC, limit: cfg.capAtomic, period: "day" as const }],
  };
  const expiry = Math.floor(Date.now() / 1000) + cfg.expirySeconds;

  requireLive(cfg, "quoteGrantSession");
  const gq = await client.quoteGrantSession({ wallet, signer: admin, permissions, expiry, sessionSigner, feeToken: USDC } as any);
  record(cfg, { step: "quoteGrantSession", outcome: "INFO", detail: gq });

  requireLive(cfg, "grantSession");
  const session = await client.grantSession({ wallet, signer: admin, permissions, expiry, sessionSigner, feeToken: USDC } as any);
  record(cfg, { step: "grantSession", outcome: session.status === "granted" || session.transactionHash ? "PASS" : "FAIL", detail: { tx: session.transactionHash, keyId: session.keyId } });
  writeFileSync(join(cfg.stateDir, "session.json"), JSON.stringify(sdk.serializeSession(session))); // no secret inside

  requireLive(cfg, "approveSignatureChecker");
  const ap = await client.approveSignatureChecker({ wallet, signer: admin, session, checker: USDC, feeToken: USDC } as any);
  record(cfg, { step: "approveSignatureChecker(USDC)", outcome: ap.status === "CONFIRMED" ? "PASS" : "FAIL", detail: { tx: ap.transactionHash, status: ap.status } });

  const pay = (url: string, body: unknown) =>
    client.fetchWithX402({ session, url, init: { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }, preferRail: "eip3009", chainId: CHAIN_ID } as any);

  // allowed purchase
  requireLive(cfg, "pay X search");
  const res = await pay(X_SEARCH, { query: "celo" });
  const receiptHdr = res.headers.get("payment-response") ?? res.headers.get("x-payment-response");
  let settleTx: string | undefined;
  try { settleTx = receiptHdr ? JSON.parse(Buffer.from(receiptHdr, "base64").toString("utf8")).transaction : undefined; } catch { /* leave undefined */ }
  record(cfg, { step: "pay X search", outcome: res.status === 200 ? "PASS" : "FAIL", detail: { httpStatus: res.status, settleTx, bytes: (await res.text()).length } });

  // ordinary tagged tx (this is the one that counts for traction, x402 settlement carries no tag)
  if (cfg.taggedPayee) {
    requireLive(cfg, "tagged USDC transfer");
    const data = encodeFunctionData({ abi: erc20Abi, functionName: "transfer", args: [cfg.taggedPayee as `0x${string}`, 1000n] });
    const ex = await client.execute({ session, calls: [{ to: USDC, data, value: 0n }], feeToken: USDC } as any);
    let codes: unknown = "not checked";
    if (ex.transactionHash) {
      const pc = createPublicClient({ chain: celo, transport: http("https://celo-rpc.publicnode.com") });
      const { verifyTx } = await import("@celo/attribution-tags");
      codes = await verifyTx({ client: pc as any, hash: ex.transactionHash }).catch((e: any) => `verifyTx error: ${e?.message}`);
    }
    record(cfg, { step: "ordinary tagged tx (session execute USDC.transfer 0.001)", outcome: ex.status === "CONFIRMED" ? "PASS" : "FAIL", detail: { tx: ex.transactionHash, attribution: codes } });
  } else record(cfg, { step: "ordinary tagged tx", outcome: "INFO", detail: "set JOAN_TAGGED_PAYEE to run" });

  // over-cap: SDK refuses before signing (client-side control, not onchain)
  await expectRefusal(cfg, "over-cap x402 pay (expect SDK spend_limit_exceeded)", () => pay(YT_TRANSCRIPT, { body: { youtube_url: "https://www.youtube.com/watch?v=E3HUsW-X7EA", language: "en" }, maxResults: 10 }));

  // onchain allowlist: destination not in calls
  await expectRefusal(cfg, "unapproved destination via execute (expect call_not_permitted)", () =>
    client.execute({ session, calls: [{ to: USDT, data: encodeFunctionData({ abi: erc20Abi, functionName: "transfer", args: [wallet.address as `0x${string}`, 1n] }), value: 0n }], feeToken: USDC } as any));

  // onchain cap: execute() amount above the daily cap (the cap Altana's account does enforce)
  if (cfg.taggedPayee) {
    await expectRefusal(cfg, "over-cap execute transfer (expect spend_limit_exceeded)", () =>
      client.execute({ session, calls: [{ to: USDC, data: encodeFunctionData({ abi: erc20Abi, functionName: "transfer", args: [cfg.taggedPayee as `0x${string}`, cfg.capAtomic + 1n] }), value: 0n }], feeToken: USDC } as any));
  }

  // revoke
  requireLive(cfg, "revokeSession");
  const rv = await client.revokeSession({ wallet, signer: admin, session, feeToken: USDC } as any).catch((e: any) => ({ status: "FAILED", error: String(e?.message ?? e) } as any));
  record(cfg, { step: "revokeSession", outcome: (rv as any).status === "CONFIRMED" || (rv as any).transactionHash ? "PASS" : "FAIL", detail: { tx: (rv as any).transactionHash, status: (rv as any).status } });

  // pay again: must be refused
  await expectRefusal(cfg, "pay after revoke (expect refusal)", () => pay(X_SEARCH, { query: "celo" }));

  const failed = results.filter((r) => r.outcome === "FAIL").length;
  console.log(failed === 0 ? "ALL STEPS PASSED" : `${failed} STEP(S) FAILED, see state/report.jsonl`);
  process.exitCode = failed === 0 ? 0 : 1;
}

// run only when executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => { console.error("ERROR:", String(e?.message ?? e)); process.exitCode = 1; });
}
