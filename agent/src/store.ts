import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { createHash } from 'node:crypto';
import { Fault, integer, type LedgerRow, type Purchase } from './types.js';

export class Store {
  db: DatabaseSync;
  constructor(path: string) {
    if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
    this.db = new DatabaseSync(path);
    this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; PRAGMA foreign_keys=ON;
      CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY,value TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS assignments(id TEXT PRIMARY KEY,request_key TEXT UNIQUE NOT NULL,text TEXT NOT NULL,budget INTEGER NOT NULL,status TEXT NOT NULL,error TEXT,created_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS reports(id TEXT PRIMARY KEY,assignment_id TEXT UNIQUE NOT NULL REFERENCES assignments(id),data TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS ledger(key TEXT PRIMARY KEY,assignmentId TEXT NOT NULL REFERENCES assignments(id),query TEXT NOT NULL,amountMicros INTEGER NOT NULL CHECK(amountMicros>0),destination TEXT NOT NULL,fingerprint TEXT NOT NULL,state TEXT NOT NULL CHECK(state IN ('reserved','settled','unknown','failed')),receipt TEXT,error TEXT,createdAt TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS mock_settlements(key TEXT PRIMARY KEY,receipt TEXT NOT NULL,amount INTEGER NOT NULL);
    `);
  }
  get<T>(key: string): T | undefined { const row = this.db.prepare('SELECT value FROM settings WHERE key=?').get(key); return row ? JSON.parse(String(row.value)) as T : undefined; }
  set(key: string, value: unknown) { this.db.prepare('INSERT INTO settings VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').run(key, JSON.stringify(value)); }
  transaction<T>(fn: () => T): T {
    this.db.exec('BEGIN IMMEDIATE');
    try { const out = fn(); this.db.exec('COMMIT'); return out; } catch (e) { this.db.exec('ROLLBACK'); throw e; }
  }
  consumeLimit(bucket: string, cap: number, windowMs: number, now = Date.now()) {
    return this.transaction(() => {
      const key = `limit:${bucket}:${Math.floor(now / windowMs)}`;
      const used = this.get<number>(key) ?? 0;
      if (used >= cap) throw new Fault('edition_limit', 'Joan has reached this daily edition limit. Please try again later.', 429);
      this.set(key, used + 1);
    });
  }
  close() { this.db.close(); }
}
export class Ledger {
  constructor(public store: Store, private now = Date.now) {}
  row(key: string) { return this.store.db.prepare('SELECT * FROM ledger WHERE key=?').get(key) as unknown as LedgerRow | undefined; }
  list(): LedgerRow[] { return this.store.db.prepare('SELECT * FROM ledger ORDER BY createdAt,key').all() as unknown as LedgerRow[]; }
  reserve(p: Purchase): { row: LedgerRow; fresh: boolean } {
    integer(p.amountMicros, 'amountMicros', 1);
    return this.store.transaction(() => {
      const fingerprint = createHash('sha256').update(JSON.stringify([p.assignmentId,p.query,p.amountMicros,p.destination])).digest('hex');
      const existing = this.row(p.key);
      if (existing) {
        if (existing.fingerprint !== fingerprint) throw new Fault('idempotency_conflict', 'Purchase key already belongs to a different request');
        return { row: existing, fresh: false };
      }
      const balance = this.store.get<{ amount: number | null; at: number }>('balance');
      if (!balance || balance.amount === null || !Number.isSafeInteger(balance.amount) || balance.amount < 0 || !Number.isSafeInteger(balance.at) || balance.at > this.now() || this.now() - balance.at > 60_000) throw new Fault('balance_unknown', 'Balance missing or stale. Purchase refused until reconciliation.');
      const assignment = this.store.db.prepare('SELECT budget FROM assignments WHERE id=?').get(p.assignmentId);
      if (!assignment) throw new Fault('not_found', 'Assignment not found', 404);
      const totals = this.store.db.prepare(`SELECT COALESCE(SUM(amountMicros),0) total, COALESCE(SUM(CASE WHEN state IN ('reserved','unknown') THEN amountMicros ELSE 0 END),0) pending FROM ledger WHERE state!='failed'`).get()!;
      const assigned = this.store.db.prepare(`SELECT COALESCE(SUM(amountMicros),0) total FROM ledger WHERE assignmentId=? AND state!='failed'`).get(p.assignmentId)!;
      const cap = this.store.get<number>('cap');
      if (cap === undefined || Number(totals.total) + p.amountMicros > cap || Number(assigned.total) + p.amountMicros > Number(assignment.budget)) throw new Fault('allowance_exceeded', 'Persistent session or assignment allowance exceeded');
      if (Number(totals.pending) + p.amountMicros > balance.amount) throw new Fault('insufficient_balance', 'Known balance cannot cover pending reservations and this purchase');
      this.store.db.prepare(`INSERT INTO ledger VALUES (?,?,?,?,?,?, 'reserved',NULL,NULL,?)`).run(p.key,p.assignmentId,p.query,p.amountMicros,p.destination,fingerprint,new Date(this.now()).toISOString());
      return { row: this.row(p.key)!, fresh: true };
    });
  }
  settle(key: string, receipt: string) {
    if (!receipt) throw new Fault('receipt_missing', 'Cannot settle without receipt');
    this.store.db.prepare(`UPDATE ledger SET state='settled',receipt=?,error=NULL WHERE key=? AND state IN ('reserved','unknown')`).run(receipt,key);
  }
  mark(key: string, state: 'unknown' | 'failed', error: string) { this.store.db.prepare(`UPDATE ledger SET state=?,error=? WHERE key=? AND state IN ('reserved','unknown')`).run(state,error,key); }
  async reconcile(lookup: (key: string) => Promise<string | null>): Promise<{ settled: number; unresolved: number }> {
    let settled = 0, unresolved = 0;
    for (const row of this.list().filter(r => r.state === 'reserved' || r.state === 'unknown')) {
      let receipt: string | null = null;
      try { receipt = await lookup(row.key); } catch { /* unknown settlement must never release the reservation */ }
      if (receipt) { this.settle(row.key, receipt); settled++; }
      else { this.mark(row.key,'unknown','Settlement unresolved; automatic repurchase prohibited'); unresolved++; }
    }
    return { settled, unresolved };
  }
}
