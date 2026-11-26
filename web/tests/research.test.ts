import { describe, expect, it } from 'vitest';
import { createResearch, draftStory, hash, planSpending } from '../src/adapters/research';
import { receiptsTotal, withinBudget } from '../src/logic/ledger';
import type { Commission } from '../src/types';

const c = (text: string, budget: number): Commission => ({ id: 'c1', text, budget, createdAt: '2026-11-25' });

describe('planSpending (mock)', () => {
  it('is deterministic', () => {
    expect(planSpending('check the claim', 5)).toEqual(planSpending('check the claim', 5));
    expect(hash('a')).not.toBe(hash('b'));
  });
  it('never exceeds the budget, for many budgets', () => {
    for (const b of [0.01, 0.02, 0.05, 0.1, 0.19, 0.2, 0.5, 0.99, 1, 3.5, 5, 50, 1000]) {
      const plan = planSpending('some claim to check', b);
      expect(withinBudget(plan, b), `budget ${b}`).toBe(true);
      expect(receiptsTotal(plan)).toBeLessThanOrEqual(b * 0.6 + 1e-9);
      expect(plan.every((r) => r.amount >= 0.001)).toBe(true);
    }
  });
  it('plans more lookups for larger budgets', () => {
    expect(planSpending('x', 0.03).length).toBe(1);
    expect(planSpending('x', 0.1).length).toBe(2);
    expect(planSpending('x', 0.5).length).toBe(3);
    expect(planSpending('x', 5).length).toBe(4);
  });
  it('plans nothing for a zero or negative budget', () => {
    expect(planSpending('x', 0)).toEqual([]);
    expect(planSpending('x', -4)).toEqual([]);
  });
  it('gives each receipt a unique reference', () => {
    const tx = planSpending('x', 5).map((r) => r.tx);
    expect(new Set(tx).size).toBe(tx.length);
  });
});

describe('draftStory (mock)', () => {
  it('builds a complete, honestly labelled dispatch', () => {
    const s = draftStory(c('Did the council really cut bus fares by half?', 4), '2026-11-25');
    expect(s.origin).toBe('mock');
    expect(s.sample).toBe(false);
    expect(s.confidence.level).toBe('low');
    expect(s.body.join(' ')).toContain('does not read documents');
    expect(s.know.length && s.unclear.length && s.sources.length).toBeTruthy();
    expect(withinBudget(s.spending, 4)).toBe(true);
  });
  it('same assignment gives the same id, so retries do not duplicate', () => {
    expect(draftStory(c('same text', 2), 'd').id).toBe(draftStory(c('same   text', 2), 'd').id);
  });
});

describe('createResearch', () => {
  it('uses mock mode without an API URL', async () => {
    const r = createResearch({}, { delayMs: 0 });
    expect(r.mode).toBe('mock');
    const s = await r.run(c('check this claim please', 2), '2026-11-25');
    expect(s.origin).toBe('mock');
  });
  it('treats a blank URL as unset', () => {
    expect(createResearch({ VITE_JOAN_API_URL: '  ' }).mode).toBe('mock');
  });
  const base = { VITE_JOAN_API_URL: 'https://joan.example/api/' };
  const story = draftStory(c('check this claim please', 2), '2026-11-25');
  const ok = (body: unknown, status = 200) => (async () => new Response(JSON.stringify(body), { status })) as unknown as typeof fetch;
  it('preserves API mock provenance instead of claiming live research', async () => {
    let seen: { url: string; body: string } | null = null;
    const f = (async (url: string, init: RequestInit) => { seen = { url, body: String(init.body) }; return new Response(JSON.stringify(story)); }) as unknown as typeof fetch;
    const s = await createResearch(base, { fetchFn: f }).run(c('check this claim please', 2), 'd');
    expect(seen).toEqual({ url: 'https://joan.example/api/commissions', body: JSON.stringify({ text: 'check this claim please', budget: 2 }) });
    expect(s.origin).toBe('mock');
  });
  it('uses one stable idempotency key across retries and preserves explicit live provenance', async () => {
    const headers: unknown[] = [];
    const f = (async (_url: string, init: RequestInit) => { headers.push(init.headers); return new Response(JSON.stringify({ ...story, origin: 'live', demoData: false })); }) as unknown as typeof fetch;
    const adapter = createResearch(base, { fetchFn: f });
    expect((await adapter.run(c('same assignment', 2), 'd')).origin).toBe('live');
    await adapter.run(c('same assignment', 2), 'd');
    expect(headers).toEqual([{ 'content-type': 'application/json', 'Idempotency-Key': 'c1' }, { 'content-type': 'application/json', 'Idempotency-Key': 'c1' }]);
  });
  it('demoData takes precedence over an inconsistent live origin', async () => {
    const result = await createResearch(base, { fetchFn: ok({ ...story, origin: 'live', demoData: true }) }).run(c('assignment', 2), 'd');
    expect(result.origin).toBe('mock');
  });
  it('preserves the refusal reason and policy layer from JSON', async () => {
    const adapter = createResearch(base, { fetchFn: ok({ error: 'session_revoked', message: 'Session has been revoked', layer: 'signature-checker-simulation' }, 409) });
    await expect(adapter.run(c('check this claim please', 2), 'd')).rejects.toThrow('Session has been revoked (signature-checker-simulation)');
  });
  it('rejects a bad status, a bad shape, an overspend and a network failure', async () => {
    const run = (f: typeof fetch, budget = 2) => createResearch(base, { fetchFn: f }).run(c('check this claim please', budget), 'd');
    await expect(run(ok({}, 500))).rejects.toThrow('status 500');
    await expect(run(ok({ nope: 1 }))).rejects.toThrow('unexpected shape');
    await expect(run(ok(story), 0.01)).rejects.toThrow('more than the cap');
    await expect(run((async () => { throw new Error('down'); }) as unknown as typeof fetch)).rejects.toThrow('could not be reached');
  });
});
