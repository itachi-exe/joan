import { isSet, type Env } from './env';
import { round3, receiptsTotal } from '../logic/ledger';
import type { Commission, Mode, Receipt, Story } from '../types';

export interface ResearchAdapter {
  mode: Mode;
  /** Turn a commission into a finished dispatch. Rejects with a readable message on failure. */
  run(c: Commission, today: string): Promise<Story>;
}

/** FNV-1a, so the mock output is identical for identical input. */
export function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return h >>> 0;
}

const ITEMS: [string, number][] = [
  ['Search lookup, original filing', 0.02],
  ['Search lookup, earlier copies', 0.03],
  ['Archive transcript', 0.05],
  ['Verified human tip', 0.1]
];
const SHARE = 0.6; // research never takes more than 60 percent of the cap
const ARTS = ['street', 'typewriter', 'press', 'workshop', 'waterworks'];

/** Deterministic spend plan. Total is always at or below the budget. */
export function planSpending(text: string, budget: number): Receipt[] {
  if (!(budget > 0)) return [];
  const count = budget < 0.05 ? 1 : budget < 0.2 ? 2 : budget < 1 ? 3 : 4;
  const picked = ITEMS.slice(0, count);
  const base = picked.reduce((a, [, p]) => a + p, 0);
  const scale = Math.min(1, (budget * SHARE) / base);
  const h = hash(text).toString(16).padStart(8, '0');
  const out: Receipt[] = [];
  picked.forEach(([item, price], i) => {
    const amount = Math.floor(price * scale * 1000) / 1000;
    if (amount >= 0.001) out.push({ item, amount, tx: `mock_${h}${i}` });
  });
  return out;
}

const clean = (t: string) => t.replace(/\s+/g, ' ').trim();
const trim = (t: string, n: number) => (t.length > n ? t.slice(0, n - 1).replace(/\s+\S*$/, '') + '...' : t);

export function draftStory(c: Commission, today: string): Story {
  const text = clean(c.text);
  const spending = planSpending(text, c.budget);
  const total = receiptsTotal(spending);
  const h = hash(text);
  return {
    id: `req-${h.toString(36)}`,
    sample: false,
    origin: 'mock',
    section: 'Commissioned',
    kicker: 'Demo Draft',
    headline: `Checking the Claim: ${trim(text, 80)}`,
    summary: 'A demonstration draft from the mock research adapter. It shows the format of a commissioned dispatch. No live research was done.',
    date: today,
    readMinutes: 2,
    art: ARTS[h % ARTS.length],
    credit: 'PHOTO: J. ARCHIVE',
    caption: 'Archive photograph chosen by the demo adapter. It does not depict this assignment.',
    pullQuote: 'Until a research service is connected, every claim stays unchecked.',
    body: [
      `The editor asked Joan to look into this: ${text}`,
      `The assignment came with a spending cap of $${round3(c.budget).toFixed(2)}. Joan planned ${spending.length} paid lookup${spending.length === 1 ? '' : 's'} and set aside $${total.toFixed(3)} for them, which keeps the plan inside the cap.`,
      'This draft was assembled by the demo adapter. It does not read documents or call a search service, so nothing below is a finding. Once a live research service is connected, the same page will carry the real sources, the verdict and the receipts.'
    ],
    know: [
      'The assignment was received and stored with a spending cap.',
      `The planned research spend of $${total.toFixed(3)} is within that cap.`
    ],
    unclear: [
      'Whether the claim in the assignment is accurate.',
      'Which original documents exist for it.',
      'Who first made the claim.'
    ],
    sources: [{ label: 'Assignment text as submitted', kind: 'Claim', note: 'Provided by the editor', url: '' }],
    confidence: { level: 'low', reason: 'Demo draft. No live sources were checked.' },
    spending
  };
}

const isStory = (x: unknown): x is Story => {
  const s = x as Partial<Story> | null;
  return !!s && typeof s.id === 'string' && typeof s.headline === 'string' && typeof s.summary === 'string' && Array.isArray(s.body) && Array.isArray(s.know) && Array.isArray(s.unclear) && Array.isArray(s.sources) && Array.isArray(s.spending) && !!s.confidence;
};

export interface ResearchOptions { fetchFn?: typeof fetch; delayMs?: number }

export function createResearch(env: Env, opts: ResearchOptions = {}): ResearchAdapter {
  const base = env.VITE_JOAN_API_URL;
  if (isSet(base)) {
    const f = opts.fetchFn || ((...a: Parameters<typeof fetch>) => fetch(...a));
    return {
      mode: 'live',
      async run(c) {
        let res: Response;
        try {
          res = await f(`${base.replace(/\/$/, '')}/commissions`, { method: 'POST', headers: { 'content-type': 'application/json', 'Idempotency-Key': c.id }, body: JSON.stringify({ text: c.text, budget: c.budget }) });
        } catch { throw new Error('Joan could not be reached.'); }
        if (!res.ok) {
          const refusal = await res.json().catch(() => null);
          const message = typeof refusal?.message === 'string' ? refusal.message : `Joan answered with status ${res.status}. Retry from the Archives.`;
          const layer = typeof refusal?.layer === 'string' ? ` (${refusal.layer})` : '';
          throw new Error(message + layer);
        }
        const data: unknown = await res.json().catch(() => null);
        if (!isStory(data)) throw new Error('Joan sent a dispatch in an unexpected shape.');
        if (receiptsTotal(data.spending) > round3(c.budget)) throw new Error('The dispatch spent more than the cap, so it was not published.');
        return { ...data, sample: false, origin: data.demoData || data.origin !== 'live' ? 'mock' : 'live' };
      }
    };
  }
  const delay = opts.delayMs ?? 1600;
  return { mode: 'mock', run: (c, today) => new Promise((ok) => setTimeout(() => ok(draftStory(c, today)), delay)) };
}
