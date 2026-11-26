import { describe, expect, it } from 'vitest';
import data from '../src/data/stories.json';
import type { Story } from '../src/types';
import { ledgerSummary, money, receiptsTotal, round3, storyTotal, withinBudget } from '../src/logic/ledger';

const stories = data.stories as Story[];

describe('money', () => {
  it('shows cents for whole cents and a third digit for sub-cent amounts', () => {
    expect(money(1.2)).toBe('$1.20');
    expect(money(0.035)).toBe('$0.035');
    expect(money(0)).toBe('$0.00');
    expect(money(12)).toBe('$12.00');
  });
});

describe('ledger', () => {
  it('sums receipts without float drift', () => {
    expect(receiptsTotal([{ item: 'a', amount: 0.1, tx: 'x' }, { item: 'b', amount: 0.2, tx: 'y' }])).toBe(0.3);
    expect(round3(0.1 + 0.2)).toBe(0.3);
  });
  it('summarises the sample edition', () => {
    const L = ledgerSummary(stories);
    expect(L.dispatches).toBe(stories.length);
    expect(L.receipts).toBe(stories.reduce((a, s) => a + s.spending.length, 0));
    expect(L.total).toBe(round3(stories.reduce((a, s) => a + storyTotal(s), 0)));
    expect(L.bySection.reduce((a, b) => a + b.amount, 0)).toBeCloseTo(L.total, 3);
    expect(L.bySection.reduce((a, b) => a + b.share, 0)).toBeCloseTo(1, 6);
    expect(L.largest?.amount).toBe(Math.max(...stories.map(storyTotal)));
  });
  it('handles an empty edition', () => {
    const L = ledgerSummary([]);
    expect(L).toMatchObject({ total: 0, dispatches: 0, receipts: 0, average: 0, largest: null, bySection: [] });
  });
  it('checks spend against the cap', () => {
    const r = [{ item: 'a', amount: 0.5, tx: 'x' }];
    expect(withinBudget(r, 0.5)).toBe(true);
    expect(withinBudget(r, 0.49)).toBe(false);
  });
  it('sample data keeps furniture fields and non-negative receipts', () => {
    for (const s of stories) {
      expect(s.pullQuote && s.caption).toBeTruthy();
      expect(s.spending.every((r) => r.amount > 0)).toBe(true);
    }
  });
});
