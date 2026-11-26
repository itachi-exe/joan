/**
 * Adapter configuration. Every external service has a live mode (env var set)
 * and a deterministic mock mode (env var missing). VITE_ variables are public
 * in a static build: put server URLs here, never secret keys.
 */
export interface Env {
  VITE_JOAN_API_URL?: string;
  VITE_JOAN_WIRE_URL?: string;
  VITE_EXPLORER_TX_URL?: string;
}

export const readEnv = (): Env => {
  const e = (import.meta as unknown as { env?: Record<string, string | undefined> }).env || {};
  return { VITE_JOAN_API_URL: e.VITE_JOAN_API_URL || 'http://127.0.0.1:4310', VITE_JOAN_WIRE_URL: e.VITE_JOAN_WIRE_URL, VITE_EXPLORER_TX_URL: e.VITE_EXPLORER_TX_URL };
};

export const isSet = (v: string | undefined): v is string => typeof v === 'string' && v.trim().length > 0;
