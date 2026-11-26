// Offline checks that the safety gate and quote parser behave. No network, no keys.
import assert from "node:assert/strict";
import { loadConfig, requireLive, quote, pickMainnetUsdc, USDC } from "./proof.ts";

const dry = loadConfig({} as NodeJS.ProcessEnv);
assert.equal(dry.live, false, "default must be dry run");
assert.throws(() => requireLive(dry, "sign"), /REFUSED \(dry run\)/);

for (const v of ["0", "true", "yes", "2", ""]) assert.equal(loadConfig({ JOAN_ALLOW_MAINNET: v } as any).live, false, `value ${v} must not enable live`);
assert.equal(loadConfig({ JOAN_ALLOW_MAINNET: "1" } as any).live, true);
assert.doesNotThrow(() => requireLive(loadConfig({ JOAN_ALLOW_MAINNET: "1" } as any), "sign"));

assert.throws(() => loadConfig({ JOAN_CAP_USDC_ATOMIC: "2000001" } as any), /cap must be/);
assert.throws(() => loadConfig({ JOAN_EXPIRY_SECONDS: "86401" } as any), /expiry must be/);
assert.throws(() => loadConfig({ JOAN_APP_CODES: "Bad Code" } as any), /bad ERC-8021 code/);

// v2 header parsing and v1 body fallback with a stub fetch
const accepts = [{ network: "eip155:42220", asset: USDC, amount: "5000", payTo: "0x20faAca5F980E29639A0FCC6dcA6988E18ed333B", extra: { name: "USDC", version: "2" } }];
const hdr = Buffer.from(JSON.stringify({ x402Version: 2, accepts })).toString("base64");
const stubV2 = (async () => new Response("{}", { status: 402, headers: { "payment-required": hdr } })) as typeof fetch;
const q2 = await quote("https://x.invalid", {}, stubV2);
assert.equal(pickMainnetUsdc(q2.offers)?.amountAtomic, "5000");
assert.equal(q2.offers[0].rail, "eip3009");
const stubV1 = (async () => new Response(JSON.stringify({ accepts: [{ network: "celo", asset: USDC, maxAmountRequired: "5000", payTo: "0x1", extra: {} }] }), { status: 402 })) as typeof fetch;
assert.equal(pickMainnetUsdc((await quote("https://x.invalid", {}, stubV1)).offers)?.amountAtomic, "5000");
console.log("selftest ok");
