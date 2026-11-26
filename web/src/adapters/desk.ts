import type { Story } from '../types';
export interface Session { id: string; capMicros: number; allowlist: string[]; expiresAt: number; revoked: boolean; executeSpentMicros: number }
export interface WalletState { mode: 'mock' | 'live'; demoData: boolean; balanceMicros: number | null; session: Session | null; liveSigningEnabled: boolean }
export interface LedgerEntry { id: string; state: string; amountMicros: number; query: string; receipt?: string; assignmentId: string }
export class DeskError extends Error { constructor(message: string, public layer = 'network', public code = 'unavailable') { super(message); } }
export function createDesk(base: string, f: typeof fetch = (...a) => fetch(...a)) {
  async function request<T>(path: string, data?: unknown, key?: string): Promise<T> {
    let res: Response;
    try { res = await f(`${base.replace(/\/$/, '')}${path}`, { method: data === undefined ? 'GET' : 'POST', headers: { 'Content-Type': 'application/json', ...(key ? { 'Idempotency-Key': key } : {}) }, ...(data === undefined ? {} : { body: JSON.stringify(data) }) }); }
    catch { throw new DeskError('The research desk could not be reached. Check the API address and retry.'); }
    const result = await res.json();
    if (!res.ok) throw new DeskError(result.message || 'Request refused', result.layer, result.error);
    return result as T;
  }
  return {
    reports: () => request<Story[]>('/reports'),
    assignment: (id: string) => request<{ createdAt: string }>('/assignments/' + encodeURIComponent(id)),
    wallet: () => request<WalletState>('/wallet'),
    permissions: () => request<Session>('/permissions'),
    ledger: () => request<{ demoData: boolean; entries: LedgerEntry[] }>('/ledger'),
    revoke: () => request<WalletState>('/revoke', {}),
    grant: (session: Session, capMicros = 50000) => request<WalletState>('/permissions', { capMicros, allowlist: session.allowlist, expiresAt: Date.now() + 3600000 }),
    buy: async (key: string, budget: number): Promise<Story> => {
      const result = await request<{ outcome: 'accepted'; report: Story } | { outcome: 'denied'; denial: { message: string; layer: string; error: string } }>('/commissions/attempt', { text: 'Check the provenance of a public transit fare claim', budget }, key);
      if (result.outcome === 'denied' && result.denial) throw new DeskError(result.denial.message, result.denial.layer, result.denial.error);
      if (result.outcome !== 'accepted' || !result.report?.id) throw new DeskError('The desk returned an invalid attempt result. No success was assumed.');
      return result.report;
    },
  };
}
