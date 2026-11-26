import { describe, expect, it } from 'vitest';
import { createDesk, DeskError } from '../src/adapters/desk';
describe('desk API boundary', () => {
  it('reads persisted reports, wallet, permissions and ledger', async () => {
    const paths: string[] = [];
    const f = (async (url: string) => { paths.push(url); return new Response(JSON.stringify({ demoData: true })); }) as unknown as typeof fetch;
    const api = createDesk('http://localhost:4310/', f);
    await api.reports(); await api.wallet(); await api.permissions(); await api.ledger();
    expect(paths).toEqual(['/reports','/wallet','/permissions','/ledger'].map(p => 'http://localhost:4310' + p));
  });
  it('reads the recorded commission date without inventing one', async () => {
    const paths: string[] = [];
    const api = createDesk('http://localhost:4310', (async (url: string) => { paths.push(url); return new Response(JSON.stringify({ createdAt: '2026-11-26T08:00:00.000Z' })); }) as typeof fetch);
    expect(await api.assignment('story-1')).toEqual({ createdAt: '2026-11-26T08:00:00.000Z' });
    expect(paths).toEqual(['http://localhost:4310/assignments/story-1']);
  });
  it('posts explicit bounded grant and stable purchase key, never a signer', async () => {
    const calls: RequestInit[] = [];
    const f = (async (url: string, init: RequestInit) => { calls.push(init); return new Response(JSON.stringify(url.endsWith('/commissions/attempt') ? {outcome:'accepted',report:{id:'report-1'}} : {})); }) as unknown as typeof fetch;
    const api = createDesk('http://localhost:4310', f);
    await api.grant({ id:'mock', capMicros: 1, allowlist:['0xabc'], revoked:true, expiresAt:0, executeSpentMicros:0 });
    const data = JSON.parse(String(calls[0].body));
    expect(data.capMicros).toBe(50000); expect(data.allowlist).toEqual(['0xabc']); expect(data.expiresAt).toBeGreaterThan(Date.now());
    await api.buy('stable-key', .05); await api.buy('stable-key', .05);
    expect(calls[1]).toEqual(calls[2]); expect(calls[1].headers).toMatchObject({'Idempotency-Key':'stable-key'});
    await api.revoke(); expect(calls[3].body).toBe('{}');
  });
  it('preserves policy error layer and fails closed on network errors', async () => {
    const api = createDesk('local', (async () => new Response(JSON.stringify({message:'Revoked',layer:'sdk',error:'session_revoked'}), {status:409})) as typeof fetch);
    await expect(api.buy('key', .05)).rejects.toMatchObject({message:'Revoked', layer:'sdk', code:'session_revoked'});
    const offline = createDesk('local', (async () => {throw new Error('offline');}) as typeof fetch);
    await expect(offline.reports()).rejects.toBeInstanceOf(DeskError);
  });
  it('treats a completed attempt with a domain denial as refused, never as a report', async () => {
    const api = createDesk('local', (async () => new Response(JSON.stringify({outcome:'denied',denial:{message:'Revoked',layer:'signature-checker-simulation',error:'session_revoked'}}))) as typeof fetch);
    await expect(api.buy('key', .05)).rejects.toMatchObject({message:'Revoked',layer:'signature-checker-simulation',code:'session_revoked'});
  });
  it('does not assume success from a malformed attempt envelope', async () => {
    for (const result of [{}, {outcome:'accepted'}, {outcome:'denied'}]) {
      const api = createDesk('local', (async () => new Response(JSON.stringify(result))) as typeof fetch);
      await expect(api.buy('key', .05)).rejects.toBeInstanceOf(DeskError);
    }
  });
});
