import { isSet, type Env } from './env';
import type { Mode, WireItem } from '../types';

export interface WireAdapter {
  mode: Mode;
  load(): Promise<WireItem[]>;
}

const MOCK: WireItem[] = [
  { id: 'w1', text: 'Tariff table traced to a 2025 schedule', status: 'ok', at: '09:12' },
  { id: 'w2', text: 'Battery recall notice matched to regulator filing', status: 'ok', at: '09:04' },
  { id: 'w3', text: 'Quoted statistic has no primary source', status: 'flag', at: '08:51' },
  { id: 'w4', text: 'Photo of flooded street checked against archive', status: 'pending', at: '08:40' },
  { id: 'w5', text: 'Council vote count confirmed from minutes', status: 'ok', at: '08:22' },
  { id: 'w6', text: 'Viral transit fare claim: earliest post found', status: 'ok', at: '08:05' },
  { id: 'w7', text: 'Press release wording differs from the filing', status: 'flag', at: '07:48' },
  { id: 'w8', text: 'Hospital waiting figures awaiting the data office', status: 'pending', at: '07:30' }
];

export const isWireItem = (x: unknown): x is WireItem => {
  const o = x as Partial<WireItem> | null;
  return !!o && typeof o.id === 'string' && typeof o.text === 'string' && typeof o.at === 'string' && (o.status === 'ok' || o.status === 'flag' || o.status === 'pending');
};

/** A rotating window over the feed. Pure, so the ticker is testable without a clock. */
export function wireWindow(items: WireItem[], tick: number, size = 5): WireItem[] {
  if (!items.length) return [];
  const n = Math.min(size, items.length);
  return Array.from({ length: n }, (_, i) => items[(((tick + i) % items.length) + items.length) % items.length]);
}

export function createWire(env: Env, fetchFn: typeof fetch = (...a) => fetch(...a)): WireAdapter {
  const url = env.VITE_JOAN_WIRE_URL;
  if (isSet(url)) {
    return {
      mode: 'live',
      async load() {
        const res = await fetchFn(url, { headers: { accept: 'application/json' } });
        if (!res.ok) throw new Error(`Wire feed answered ${res.status}`);
        const data: unknown = await res.json();
        if (!Array.isArray(data) || !data.every(isWireItem)) throw new Error('Wire feed has an unexpected shape');
        return data;
      }
    };
  }
  return { mode: 'mock', load: async () => MOCK.map((x) => ({ ...x })) };
}
