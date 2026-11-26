import type { Receipt, Story } from '../types';

export const round3 = (n: number): number => Math.round(n * 1000) / 1000;

/** $1.20 for whole cents, $0.035 when a sub-cent digit matters. */
export const money = (n: number): string => `$${n.toFixed(Math.round(n * 1000) % 10 ? 3 : 2)}`;

export const receiptsTotal = (r: Receipt[]): number => round3(r.reduce((a, x) => a + x.amount, 0));
export const storyTotal = (s: Story): number => receiptsTotal(s.spending);

export interface LedgerSummary {
  total: number;
  dispatches: number;
  receipts: number;
  average: number;
  largest: { id: string; headline: string; amount: number } | null;
  bySection: { section: string; amount: number; share: number }[];
}

export function ledgerSummary(stories: Story[]): LedgerSummary {
  const total = round3(stories.reduce((a, s) => a + storyTotal(s), 0));
  const receipts = stories.reduce((a, s) => a + s.spending.length, 0);
  const sections = new Map<string, number>();
  let largest: LedgerSummary['largest'] = null;
  for (const s of stories) {
    const t = storyTotal(s);
    sections.set(s.section, round3((sections.get(s.section) || 0) + t));
    if (!largest || t > largest.amount) largest = { id: s.id, headline: s.headline, amount: t };
  }
  const bySection = [...sections.entries()]
    .map(([section, amount]) => ({ section, amount, share: total > 0 ? amount / total : 0 }))
    .sort((a, b) => b.amount - a.amount);
  return { total, dispatches: stories.length, receipts, average: stories.length ? round3(total / stories.length) : 0, largest, bySection };
}

/** A story's spend must never exceed the editor's cap. */
export const withinBudget = (receipts: Receipt[], budget: number): boolean => receiptsTotal(receipts) <= round3(budget);
