import { isSet, type Env } from './env';
import type { Mode } from '../types';

export interface WalletAdapter {
  mode: Mode;
  /** Public explorer URL for a transaction id, or null when none exists (mock mode). */
  txUrl(tx: string): string | null;
}

/** Template such as https://explorer.example/tx/{tx}. Read only: the site never signs or sends anything. */
export function createWallet(env: Env): WalletAdapter {
  const tpl = env.VITE_EXPLORER_TX_URL;
  if (isSet(tpl) && tpl.includes('{tx}')) {
    return { mode: 'live', txUrl: (tx) => { if (!/^0x[0-9a-fA-F]{64}$/.test(tx)) return null; try { const url = new URL(tpl.replace('{tx}', encodeURIComponent(tx))); return url.protocol === 'https:' ? url.href : null; } catch { return null; } } };
  }
  return { mode: 'mock', txUrl: () => null };
}
