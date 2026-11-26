import { createHash, randomUUID } from 'node:crypto';
import { Fault, integer, type Purchase, type Session, type Mode } from './types.js';
import { Store } from './store.js';

export const USDC = '0xcebA9300f2b948710d2653dD7B07f33A8B32118C';
/** Models Altana's two distinct policy layers. No keys or SDK signing are used. */
export class WalletAdapter {
  readonly mode: Mode;
  private sdkSpent = 0; // Mirrors SDK in-process tally. SQLite ledger remains authoritative after restart.
  constructor(private store: Store, env: NodeJS.ProcessEnv = {}, private now = Date.now) {
    this.mode = env.ALTANA_SESSION_KEY ? 'live' : 'mock';
    if (!store.get('walletInitialized')) {
      store.transaction(() => {
        store.set('walletInitialized', true);
        store.set('mockBalance', 10_000_000);
        store.set('balance', { amount: this.mode === 'mock' ? 10_000_000 : null, at: now() });
        store.set('cap', 10_000_000);
        store.set('session', { id: 'mock-session', capMicros: 10_000_000, allowlist: [USDC], expiresAt: now() + 86_400_000, revoked: false, executeSpentMicros: 0 } satisfies Session);
      });
    }
  }
  private mockOnly() {
    if (this.mode !== 'mock') throw new Fault('live_signing_disabled', 'Live Altana signing, grants, wallet creation and spending are disabled. PAYMENT-PROOF.md is unproven; use mock mode.', 503, 'safety');
  }
  session(): Session { return this.store.get<Session>('session')!; }
  state() { return { mode: this.mode, demoData: this.mode === 'mock', balanceMicros: this.mode === 'mock' ? this.store.get<number>('mockBalance') : null, session: this.mode === 'mock' ? this.session() : null, permissionsVerified: this.mode === 'mock', x402CapEnforcement: 'SDK/client-side only; not onchain', liveSigningEnabled: false }; }
  refreshBalance() {
    const amount = this.mode === 'mock' ? this.store.get<number>('mockBalance') ?? null : null;
    this.store.set('balance',{ amount, at: this.now() });
  }
  grant(input: { capMicros: number; allowlist: string[]; expiresAt: number }) {
    this.mockOnly(); integer(input.capMicros,'capMicros',1); integer(input.expiresAt,'expiresAt',1);
    if (input.capMicros > 10_000_000 || input.expiresAt <= this.now() || input.expiresAt > this.now()+86_400_000 || !Array.isArray(input.allowlist) || input.allowlist.length === 0 || input.allowlist.some(a=> !/^0x[0-9a-fA-F]{40}$/.test(a))) throw new Fault('invalid_permissions','Explicit contract allowlist, cap <= $10 and expiry within 24h required',400);
    // A new mock session cannot erase historical SQLite spending or create funds.
    this.store.transaction(() => {
      this.store.set('session', { id: `mock-${randomUUID()}`, ...input, revoked:false,executeSpentMicros:0 } satisfies Session);
      this.store.set('cap',input.capMicros);
    });
    this.sdkSpent = 0;
    return this.state();
  }
  revoke() { this.mockOnly(); const s=this.session(); s.revoked=true; this.store.set('session',s); return { ...this.state(), receipt: 'mock-revoke-not-a-transaction' }; }
  private active(layer: string) {
    const s=this.session();
    if (s.revoked) throw new Fault('session_revoked','Session has been revoked',409,layer);
    if (s.expiresAt <= this.now()) throw new Fault('session_expired','Session has expired',409,layer);
    return s;
  }
  checkX402(amount: number) {
    this.mockOnly(); integer(amount,'amountMicros',1); const s=this.active('signature-checker-simulation');
    if(this.sdkSpent+amount>s.capMicros) throw new Fault('sdk_spend_limit_exceeded','x402 cap refused client-side by mock SDK, not onchain',409,'sdk');
  }
  execute(destination: string, amount: number) {
    this.mockOnly(); integer(amount,'amountMicros',1);
    const s=this.active('onchain-policy-simulation');
    // Allowlist checks contract address, not transfer recipient. Never claim recipient restrictions.
    if(!s.allowlist.some(a=>a.toLowerCase()===destination.toLowerCase())) throw new Fault('call_not_permitted','Mock execute: contract not allowlisted (onchain policy simulation, no transaction)',409,'onchain-policy-simulation');
    if(s.executeSpentMicros+amount>s.capMicros) throw new Fault('spend_limit_exceeded','Mock execute: transfer exceeds onchain policy cap',409,'onchain-policy-simulation');
    if(amount>(this.store.get<number>('mockBalance')??0)) throw new Fault('insufficient_balance','Mock execute exceeds balance');
    this.store.transaction(()=>{s.executeSpentMicros+=amount;this.store.set('session',s);this.store.set('mockBalance',this.store.get<number>('mockBalance')!-amount);});
    this.refreshBalance();
    return { receipt:'mock-execute-not-a-transaction', mode:'mock', amountMicros:amount };
  }
  settleMock(p: Purchase): string {
    this.mockOnly();
    const old=this.store.db.prepare('SELECT receipt FROM mock_settlements WHERE key=?').get(p.key);
    if(old) return String(old.receipt);
    this.checkX402(p.amountMicros);
    const receipt=`mock_${createHash('sha256').update(p.key).digest('hex').slice(0,24)}`;
    this.store.transaction(()=>{
      const balance=this.store.get<number>('mockBalance')!;
      if(p.amountMicros>balance) throw new Fault('insufficient_balance','Mock wallet balance exhausted');
      this.store.db.prepare('INSERT INTO mock_settlements VALUES (?,?,?)').run(p.key,receipt,p.amountMicros);
      this.store.set('mockBalance',balance-p.amountMicros);
    });
    this.sdkSpent+=p.amountMicros;
    this.refreshBalance();
    return receipt;
  }
}

/** Celo Buy EIP-3009 adapter boundary. Live settlement is deliberately locked, not silently mocked. */
export class CeloBuyAdapter {
  readonly mode: Mode;
  constructor(private store: Store, private wallet: WalletAdapter, env: NodeJS.ProcessEnv = {}) { this.mode=env.CELO_BUY_API_URL ? 'live' : 'mock'; }
  quote() { return { amountMicros:5_000, currency:'USDC', network:'eip155:42220', rail:'eip3009', mode:this.mode, destination:USDC }; }
  async buy(p: Purchase): Promise<{receipt:string; text:string}> {
    if(this.mode==='live') throw new Fault('live_payment_unproven','Live Celo Buy settlement disabled until Altana/ERC-1271 proof and owner approval. No signature was made.',503,'safety');
    const receipt=this.wallet.settleMock(p);
    return {receipt,text:`Demo paid research for “${p.query}”. This fixture is not a verified finding. No real purchase occurred.`};
  }
  async lookup(key:string): Promise<string|null> {
    if(this.mode==='live') return null;
    const row=this.store.db.prepare('SELECT receipt FROM mock_settlements WHERE key=?').get(key);
    return row ? String(row.receipt) : null;
  }
}
