export interface Source { label: string; kind: 'Original' | 'Claim' | 'Repeat' | 'Tip'; note: string; url: string }
export interface Receipt { item: string; amount: number; tx: string }
export interface Story {
  demoData?: boolean;
  commissionedAt?: string;
  id: string;
  sample: boolean;
  section: string;
  kicker: string;
  headline: string;
  summary: string;
  date: string;
  readMinutes: number;
  art: string;
  credit: string;
  caption?: string;
  pullQuote?: string;
  body: string[];
  know: string[];
  unclear: string[];
  sources: Source[];
  confidence: { level: 'high' | 'medium' | 'low'; reason: string };
  spending: Receipt[];
  /** Set when produced by an adapter rather than shipped as sample data. */
  origin?: 'mock' | 'live';
}
export type CommissionStatus = 'researching' | 'published' | 'failed';
export interface Commission {
  id: string;
  text: string;
  budget: number;
  createdAt: string;
  status?: CommissionStatus;
  storyId?: string;
  error?: string;
}
export type Mode = 'live' | 'mock';
export interface WireItem { id: string; text: string; status: 'ok' | 'flag' | 'pending'; at: string }
