import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { Store,Ledger } from '../src/store.js';
import { Joan } from '../src/joan.js';
import { Fault,type Purchase } from '../src/types.js';
import { WalletAdapter,USDC } from '../src/wallet.js';
const root=()=>mkdtempSync(join(process.env.TMPDIR||'/opt/hermes/.hermes/cache/scratch','joan-test-'));
function seed(store:Store,budget=50_000){new WalletAdapter(store);store.db.prepare('INSERT INTO assignments VALUES (?,?,?,?,?,?,?)').run('a','a','Test public source claim',budget,'researching',null,new Date().toISOString());}
const p=(key='p',amountMicros=5000):Purchase=>({key,amountMicros,assignmentId:'a',query:'claim',destination:USDC});
function code(c:string){return(e:unknown)=>e instanceof Fault&&e.code===c;}

test('allowance: exact assignment cap allowed, further reservation blocked',()=>{
  const s=new Store(':memory:');seed(s,5000);const l=new Ledger(s);l.reserve(p());assert.throws(()=>l.reserve(p('q',1)),code('allowance_exceeded'));s.close();
});
test('persistent session cap accounts for settled purchases and reservations',()=>{
  const s=new Store(':memory:');seed(s);s.set('cap',5000);const l=new Ledger(s);l.reserve(p());l.settle('p','mock_receipt');assert.throws(()=>l.reserve(p('q',1)),code('allowance_exceeded'));s.close();
});
test('duplicate reservation and settlement are idempotent; changed payload conflicts',()=>{
  const s=new Store(':memory:');seed(s);const l=new Ledger(s);assert.equal(l.reserve(p()).fresh,true);assert.equal(l.reserve(p()).fresh,false);assert.throws(()=>l.reserve(p('p',5001)),code('idempotency_conflict'));l.settle('p','mock_receipt');l.settle('p','different');assert.equal(l.row('p')!.receipt,'mock_receipt');assert.equal(l.list().length,1);s.close();
});
test('unknown, stale, invalid and insufficient balance all fail closed',()=>{
  const s=new Store(':memory:');seed(s);const l=new Ledger(s);
  for(const balance of [{amount:null,at:Date.now()},{amount:5000,at:Date.now()-61_000},{amount:-1,at:Date.now()},{amount:5000},{amount:5000,at:Date.now()+60_000}]){s.set('balance',balance);assert.throws(()=>l.reserve(p()),code('balance_unknown'));}
  s.set('balance',{amount:4999,at:Date.now()});assert.throws(()=>l.reserve(p()),code('insufficient_balance'));assert.equal(l.list().length,0);s.close();
});
test('pending reservations reduce balance available for other purchases',()=>{
  const s=new Store(':memory:');seed(s);s.set('balance',{amount:6000,at:Date.now()});const l=new Ledger(s);l.reserve(p());assert.throws(()=>l.reserve(p('q',2000)),code('insufficient_balance'));s.close();
});
test('two SQLite connections cannot over-reserve assignment allowance',()=>{
  const dir=root(),path=join(dir,'shared.sqlite');const a=new Store(path);seed(a,5000);const b=new Store(path);new Ledger(a).reserve(p());assert.throws(()=>new Ledger(b).reserve(p('q')),code('allowance_exceeded'));a.close();b.close();rmSync(dir,{recursive:true});
});
test('restart reconciles crash after settlement without repaying or losing spend',async()=>{
  const dir=root(),path=join(dir,'restart.sqlite');let s=new Store(path);seed(s);let j=new Joan(s);j.ledger.reserve(p());const receipt=(await j.buy.buy(p())).receipt;s.close();
  s=new Store(path);j=new Joan(s);assert.deepEqual(await j.init(),{settled:1,unresolved:0});assert.equal(j.ledger.row('p')!.receipt,receipt);await j.purchase(p());assert.equal(j.ledger.list().length,1);assert.equal(j.wallet.state().balanceMicros,9_995_000);s.close();rmSync(dir,{recursive:true});
});
test('restart retains unresolved reservations and refuses automatic repurchase',async()=>{
  const dir=root(),path=join(dir,'uncertain.sqlite');let s=new Store(path);seed(s);new Ledger(s).reserve(p());s.close();s=new Store(path);const j=new Joan(s);assert.deepEqual(await j.init(),{settled:0,unresolved:1});assert.equal(j.ledger.row('p')!.state,'unknown');await assert.rejects(j.purchase(p()),code('purchase_not_retryable'));assert.equal(s.db.prepare('SELECT count(*) n FROM mock_settlements').get()!.n,0);s.close();rmSync(dir,{recursive:true});
});
test('settlement uncertainty is never silently retried',async()=>{
  const s=new Store(':memory:');seed(s);const j=new Joan(s);j.buy.buy=async()=>{throw new Error('500 settle_uncertain');};await assert.rejects(j.purchase(p()),/settle_uncertain/);assert.equal(j.ledger.row('p')!.state,'unknown');await assert.rejects(j.purchase(p()),code('purchase_not_retryable'));s.close();
});
test('invalid monetary amounts are rejected',()=>{
  const s=new Store(':memory:');seed(s);const l=new Ledger(s);for(const n of [-1,0,0.1,NaN,Infinity])assert.throws(()=>l.reserve(p('p',n)),code('invalid_input'));s.close();
});
test('assignment foreign key prevents orphan spending',()=>{
  const s=new Store(':memory:');new WalletAdapter(s);assert.throws(()=>new Ledger(s).reserve(p()),code('not_found'));s.close();
});
