export type Mode = 'mock' | 'live';
export class Fault extends Error {
  constructor(public code: string, message: string, public status = 409, public layer = 'application') { super(message); }
}
export const integer = (n: unknown, name: string, min = 0): number => {
  if (typeof n !== 'number' || !Number.isSafeInteger(n) || n < min) throw new Fault('invalid_input', `${name} must be an integer >= ${min}`, 400);
  return n;
};
export const usd = (micros: number) => micros / 1_000_000;
export function budgetMicros(n: unknown): number {
  if (typeof n !== 'number' || !Number.isFinite(n) || n < 0 || n > 10 || Math.abs(n * 1e6 - Math.round(n * 1e6)) > 1e-7) throw new Fault('invalid_input', 'budget must be $0 to $10 with at most six decimals', 400);
  return Math.round(n * 1e6);
}
export interface Source { label: string; kind: 'Original' | 'Claim' | 'Repeat' | 'Tip'; note: string; url: string; excerpt?: string; mode?: Mode }
export interface Report {
  id: string; assignmentId: string; sample: false; origin: Mode; demoData: boolean; label: 'AI-generated report. Prepared by Joan.';
  section: string; kicker: string; headline: string; summary: string; date: string; readMinutes: number; art: string; credit: string;
  body: string[]; know: string[]; unclear: string[]; sources: Source[];
  confidence: { level: 'high' | 'medium' | 'low'; reason: string };
  spending: { item: string; amount: number; amountMicros: number; tx: string; mode: Mode }[];
  researchSpending: { currency: 'USDC'; amountMicros: number; amount: number; mode: Mode };
}
export interface Purchase { key: string; assignmentId: string; query: string; amountMicros: number; destination: string }
export interface LedgerRow extends Purchase { fingerprint: string; state: 'reserved' | 'settled' | 'unknown' | 'failed'; receipt: string | null; error: string | null; createdAt: string }
export interface Session { id: string; capMicros: number; allowlist: string[]; expiresAt: number; revoked: boolean; executeSpentMicros: number }
