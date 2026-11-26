import { beforeEach, describe, expect, it } from 'vitest';
import { draftStory } from '../src/adapters/research';
import { addCommission, loadCommissions, loadDispatches, mergeStories, publishDispatch, updateCommission, validateCommission, type Store } from '../src/logic/store';
import { createWallet } from '../src/adapters/wallet';
import { createWire, isWireItem, wireWindow } from '../src/adapters/wire';
import { typewriterPlan } from '../src/audio';

class Mem implements Store {
  m = new Map<string, string>();
  getItem(k: string) { return this.m.get(k) ?? null; }
  setItem(k: string, v: string) { this.m.set(k, v); }
}
let st: Mem;
beforeEach(() => { st = new Mem(); });

describe('validateCommission', () => {
  it('accepts a real assignment and normalises it', () => {
    expect(validateCommission('  Check   the bus fare claim ', '3.456')).toEqual({ ok: true, text: 'Check the bus fare claim', budget: 3.46 });
  });
  it('accepts zero budget for live public research without mock purchases', () => {
    expect(validateCommission('Check the original HTTP payment standard', 0)).toEqual({ok:true,text:'Check the original HTTP payment standard',budget:0});
  });
  it('rejects short text, long text and bad budgets', () => {
    expect(validateCommission('short', 5).ok).toBe(false);
    expect(validateCommission('x'.repeat(601), 5).ok).toBe(false);
    for (const b of [-1, NaN, 1000.01, 'abc']) expect(validateCommission('a proper assignment', b as number).ok, String(b)).toBe(false);
    expect(validateCommission('a proper assignment', 10).ok).toBe(true);
    expect(validateCommission('a proper assignment', 10.01).ok).toBe(false);
    expect(validateCommission('a proper assignment', '0.01').ok).toBe(true);
  });
});

describe('store', () => {
  it('files a commission as researching, newest first', () => {
    addCommission(st, 'first assignment', 1, '2026-11-25', 1);
    addCommission(st, 'second assignment', 2, '2026-11-25', 2);
    const l = loadCommissions(st);
    expect(l.map((c) => c.text)).toEqual(['second assignment', 'first assignment']);
    expect(l.every((c) => c.status === 'researching')).toBe(true);
  });
  it('publishes a dispatch and links it to the commission, once', () => {
    const c = addCommission(st, 'check this claim please', 2, '2026-11-25', 1);
    const s = draftStory(c, '2026-11-25');
    publishDispatch(st, c.id, s);
    publishDispatch(st, c.id, s);
    expect(loadDispatches(st)).toHaveLength(1);
    expect(loadCommissions(st)[0]).toMatchObject({ status: 'published', storyId: s.id });
  });
  it('records a failure and allows a later retry', () => {
    const c = addCommission(st, 'check this claim please', 2, '2026-11-25', 1);
    updateCommission(st, c.id, { status: 'failed', error: 'down' });
    expect(loadCommissions(st)[0]).toMatchObject({ status: 'failed', error: 'down' });
  });
  it('survives corrupt storage', () => {
    st.setItem('joan.commissions', '{oops');
    st.setItem('joan.dispatches', '{"a":1}');
    expect(loadCommissions(st)).toEqual([]);
    expect(loadDispatches(st)).toEqual([]);
  });
  it('puts the reader\'s dispatches before the samples', () => {
    const c = addCommission(st, 'check this claim please', 2, 'd', 1);
    const mine = draftStory(c, 'd');
    expect(mergeStories([{ ...mine, id: 's' }], [mine]).map((s) => s.id)).toEqual([mine.id, 's']);
  });
});

describe('wallet adapter', () => {
  it('is mock without a template and has no links', () => {
    const w = createWallet({});
    expect(w.mode).toBe('mock');
    expect(w.txUrl('abc')).toBeNull();
  });
  it('is live with a {tx} template, and ignores a template without {tx}', () => {
    const w = createWallet({ VITE_EXPLORER_TX_URL: 'https://x.example/tx/{tx}' });
    expect(w.txUrl('0x' + 'a'.repeat(64))).toBe('https://x.example/tx/0x' + 'a'.repeat(64));
    expect(w.txUrl('mock_receipt')).toBeNull();
    expect(w.txUrl('a b')).toBeNull();
    expect(createWallet({ VITE_EXPLORER_TX_URL: 'https://x.example/' }).mode).toBe('mock');
  });
});

describe('wire adapter', () => {
  it('serves deterministic mock checks', async () => {
    const w = createWire({});
    expect(w.mode).toBe('mock');
    const a = await w.load();
    expect(a.length).toBeGreaterThanOrEqual(5);
    expect(a.every(isWireItem)).toBe(true);
    expect(await w.load()).toEqual(a);
  });
  it('rotates a window and wraps around', () => {
    const items = ['a', 'b', 'c'].map((id) => ({ id, text: id, status: 'ok' as const, at: '09:00' }));
    expect(wireWindow(items, 0, 2).map((x) => x.id)).toEqual(['a', 'b']);
    expect(wireWindow(items, 2, 2).map((x) => x.id)).toEqual(['c', 'a']);
    expect(wireWindow(items, -1, 2).map((x) => x.id)).toEqual(['c', 'a']);
    expect(wireWindow(items, 0, 9)).toHaveLength(3);
    expect(wireWindow([], 3)).toEqual([]);
  });
  it('validates a live feed', async () => {
    const f = (b: unknown) => (async () => new Response(JSON.stringify(b))) as unknown as typeof fetch;
    const good = [{ id: '1', text: 't', status: 'ok', at: '09:00' }];
    expect(await createWire({ VITE_JOAN_WIRE_URL: 'https://w.example' }, f(good)).load()).toEqual(good);
    await expect(createWire({ VITE_JOAN_WIRE_URL: 'https://w.example' }, f([{ id: 1 }])).load()).rejects.toThrow('unexpected shape');
  });
});

describe('typewriter plan', () => {
  it('stays inside the window, in order', () => {
    const p = typewriterPlan(26, 1300);
    expect(p).toHaveLength(26);
    expect(p[0]).toBe(0);
    expect(Math.max(...p)).toBeLessThanOrEqual(1300);
    expect([...p].sort((a, b) => a - b)).toEqual(p);
  });
});
