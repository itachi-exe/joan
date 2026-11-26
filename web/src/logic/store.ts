import type { Commission, Story } from '../types';

export const COMMISSIONS_KEY = 'joan.commissions';
export const DISPATCHES_KEY = 'joan.dispatches';

export interface Store { getItem(k: string): string | null; setItem(k: string, v: string): void }

function read<T>(st: Store, key: string): T[] {
  try {
    const v: unknown = JSON.parse(st.getItem(key) || '[]');
    return Array.isArray(v) ? (v as T[]) : [];
  } catch { return []; }
}
function write(st: Store, key: string, list: unknown[]): void {
  try { st.setItem(key, JSON.stringify(list)); } catch { /* storage unavailable */ }
}

export interface CheckResult { ok: boolean; error?: string; text?: string; budget?: number }

/** Editor rules: a real assignment and a sane cap. */
export function validateCommission(text: string, budgetRaw: number | string): CheckResult {
  const t = text.replace(/\s+/g, ' ').trim();
  const b = typeof budgetRaw === 'number' ? budgetRaw : parseFloat(budgetRaw);
  if (t.length < 10) return { ok: false, error: 'Describe the assignment in at least ten characters.' };
  if (t.length > 600) return { ok: false, error: 'Keep the assignment under 600 characters.' };
  if (!Number.isFinite(b) || b < 0 || b > 10) return { ok: false, error: 'Enter a budget between 0 and 10.' };
  return { ok: true, text: t, budget: Math.round(b * 100) / 100 };
}

export const loadCommissions = (st: Store): Commission[] => read<Commission>(st, COMMISSIONS_KEY);
export const loadDispatches = (st: Store): Story[] => read<Story>(st, DISPATCHES_KEY);

export function addCommission(st: Store, text: string, budget: number, today: string, now = Date.now()): Commission {
  const c: Commission = { id: `c${now}-${crypto.randomUUID()}`, text, budget, createdAt: today, status: 'researching' };
  write(st, COMMISSIONS_KEY, [c, ...loadCommissions(st)]);
  return c;
}

export function updateCommission(st: Store, id: string, patch: Partial<Commission>): void {
  write(st, COMMISSIONS_KEY, loadCommissions(st).map((c) => (c.id === id ? { ...c, ...patch } : c)));
}

/** Publishing twice for the same id replaces the story, so retries never duplicate. */
export function publishDispatch(st: Store, commissionId: string, story: Story): void {
  const rest = loadDispatches(st).filter((s) => s.id !== story.id);
  write(st, DISPATCHES_KEY, [story, ...rest]);
  updateCommission(st, commissionId, { status: 'published', storyId: story.id, error: undefined });
}

/** Sample stories first, then the reader's own dispatches, newest first. */
export const mergeStories = (samples: Story[], mine: Story[]): Story[] => [...mine, ...samples];
