import test from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { Store } from '../src/store.js';
import { Joan } from '../src/joan.js';
import { api } from '../src/api.js';
import { USDC } from '../src/wallet.js';
import type { Report } from '../src/types.js';
import { Fault } from '../src/types.js';
async function fixture(){const store=new Store(':memory:'),joan=new Joan(store);await joan.init();const server=api(joan);await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${(server.address() as AddressInfo).port}`;return {store,joan,base,close:async()=>{await new Promise<void>(r=>server.close(()=>r()));store.close();}};}
const post=(data:unknown,key?:string):RequestInit=>({method:'POST',headers:{'content-type':'application/json',...(key?{'idempotency-key':key}:{})},body:JSON.stringify(data)});

test('attempt RPC evaluates real policy without treating domain refusal as transport failure',async()=>{
  const f=await fixture();try{
    const input={text:'Check a public transit claim through an evaluated attempt',budget:0.05};
    const accepted=await fetch(f.base+'/commissions/attempt',post(input,'attempt-ok'));assert.equal(accepted.status,200);
    const result=await accepted.json() as {outcome:string;report:Report};assert.equal(result.outcome,'accepted');assert.ok(result.report.id);
    assert.deepEqual(f.joan.report(result.report.id),result.report);
    const repeated=await fetch(f.base+'/commissions/attempt',post(input,'attempt-ok'));assert.deepEqual(await repeated.json(),result);assert.equal(f.joan.ledger.list().length,1);
    const before={balance:f.joan.wallet.state().balanceMicros,ledger:f.joan.ledger.list(),reports:f.joan.reports()};
    f.joan.wallet.grant({capMicros:1000,allowlist:[USDC],expiresAt:Date.now()+60_000});
    for(const [key,code,layer] of [['cap','sdk_spend_limit_exceeded','sdk'],['revoked','session_revoked','signature-checker-simulation']]){
      if(key==='revoked')f.joan.wallet.revoke();
      const response=await fetch(f.base+'/commissions/attempt',post(input,key));assert.equal(response.status,200);
      const denial=await response.json() as {outcome:string;denial:{error:string;layer:string};report?:Report};
      assert.equal(denial.outcome,'denied');assert.equal(denial.denial.error,code);assert.equal(denial.denial.layer,layer);assert.equal(denial.report,undefined);
      assert.deepEqual({balance:f.joan.wallet.state().balanceMicros,ledger:f.joan.ledger.list(),reports:f.joan.reports()},before);
      // The original write endpoint still rejects the same forbidden purchase.
      assert.equal((await fetch(f.base+'/commissions',post(input,key+'-original'))).status,409);
    }
    assert.equal((await fetch(f.base+'/commissions/attempt',post({...input,text:'tiny'}))).status,400);
    assert.equal((await fetch(f.base+'/commissions/attempt',post({...input,text:'A different long assignment'},'attempt-ok'))).status,409);
    f.joan.create=async()=>{throw new Fault('live_signing_disabled','Live signing remains disabled',503,'safety');};
    const safety=await fetch(f.base+'/commissions/attempt',post(input));assert.equal(safety.status,503);assert.equal((await safety.json() as {error:string}).error,'live_signing_disabled');
    f.joan.create=async()=>{throw new Error('Infrastructure unavailable');};
    assert.equal((await fetch(f.base+'/commissions/attempt',post(input))).status,500);
  }finally{await f.close();}
});

test('HTTP main flow: assignment, report, archive, wallet, permissions and ledger',async()=>{
  const f=await fixture();try{
    const created=await fetch(f.base+'/assignments',post({text:'Check the provenance of a transit fare claim',budget:0.05},'request-1'));assert.equal(created.status,201);const report=await created.json() as Report;
    assert.equal(report.label,'AI-generated report. Prepared by Joan.');assert.equal(report.demoData,true);assert.equal(report.origin,'mock');assert.equal(report.researchSpending.amountMicros,5000);assert.ok(report.know.length&&report.unclear.length&&report.sources.length);assert.match(report.spending[0]!.tx,/^mock_/);
    assert.deepEqual(await(await fetch(f.base+`/reports/${report.id}`)).json(),report);
    const assignment=await(await fetch(f.base+`/assignments/${report.id}`)).json() as {status:string};assert.equal(assignment.status,'published');
    const list=await(await fetch(f.base+'/reports')).json() as Report[];assert.equal(list.length,1);
    const wallet=await(await fetch(f.base+'/wallet')).json() as {balanceMicros:number;liveSigningEnabled:boolean};assert.equal(wallet.balanceMicros,9_995_000);assert.equal(wallet.liveSigningEnabled,false);
    const permissions=await(await fetch(f.base+'/permissions')).json() as {allowlist:string[]};assert.deepEqual(permissions.allowlist,[USDC]);
    const ledger=await(await fetch(f.base+'/ledger')).json() as {entries:{state:string}[]};assert.equal(ledger.entries[0]!.state,'settled');
    assert.equal((await fetch(f.base+'/api/health')).status,200);assert.equal((await fetch(f.base+'/wire')).status,200);
  }finally{await f.close();}
});
test('concurrent duplicate HTTP commissions share one report and one payment',async()=>{
  const f=await fixture();try{const responses=await Promise.all(Array.from({length:5},()=>fetch(f.base+'/commissions',post({text:'Check a public statement about transit fares',budget:0.05},'same'))));for(const r of responses)assert.equal(r.status,201);const reports=await Promise.all(responses.map(r=>r.json() as Promise<Report>));assert.equal(new Set(reports.map(r=>r.id)).size,1);assert.equal(f.joan.ledger.list().length,1);
    assert.equal((await fetch(f.base+'/assignments',post({text:'A different assignment about transit',budget:0.05},'same'))).status,409);
  }finally{await f.close();}
});
test('HTTP grant/revoke persists policy and blocks subsequent paid assignment',async()=>{
  const f=await fixture();try{
    const granted=await fetch(f.base+'/permissions',post({capMicros:50_000,allowlist:[USDC],expiresAt:Date.now()+60_000}));assert.equal(granted.status,200);
    assert.equal((await fetch(f.base+'/revoke',post({}))).status,200);
    const readback=await(await fetch(f.base+'/permissions')).json() as {revoked:boolean};assert.equal(readback.revoked,true);
    const denied=await fetch(f.base+'/assignments',post({text:'Check a claim after permissions are revoked',budget:0.05}));assert.equal(denied.status,409);assert.equal((await denied.json() as {error:string}).error,'session_revoked');assert.equal(f.joan.ledger.list().length,0);
  }finally{await f.close();}
});
test('HTTP low-budget assignment uses free research and no purchase',async()=>{
  const f=await fixture();try{const response=await fetch(f.base+'/assignments',post({text:'Review the public-source research with no paid calls',budget:0}));assert.equal(response.status,201);const r=await response.json() as Report;assert.equal(r.spending.length,0);assert.equal(r.researchSpending.amountMicros,0);assert.equal(f.joan.ledger.list().length,0);}finally{await f.close();}
});
test('HTTP validation: invalid input, malformed JSON, size, media type, origins and 404',async()=>{
  const f=await fixture();try{
    for(const data of [{text:'tiny',budget:0.05},{text:'A valid long assignment',budget:-1},{text:'A valid long assignment',budget:20}])assert.equal((await fetch(f.base+'/assignments',post(data))).status,400);
    assert.equal((await fetch(f.base+'/assignments',{method:'POST',headers:{'content-type':'application/json'},body:'{'})).status,400);
    assert.equal((await fetch(f.base+'/assignments',{method:'POST',headers:{'content-type':'application/json'},body:'"'+'x'.repeat(17000)+'"'})).status,413);
    assert.equal((await fetch(f.base+'/assignments',{method:'POST',body:'hello'})).status,415);
    assert.equal((await fetch(f.base+'/wallet',{headers:{origin:'https://untrusted.example'}})).status,403);
    const cors=await fetch(f.base+'/wallet',{headers:{origin:'http://localhost:4174'}});assert.equal(cors.headers.get('access-control-allow-origin'),'http://localhost:4174');
    assert.equal((await fetch(f.base+'/assignments',{method:'OPTIONS',headers:{origin:'http://localhost:4174'}})).status,204);
    assert.equal((await fetch(f.base+'/reports/missing')).status,404);assert.equal((await fetch(f.base+'/missing')).status,404);
    assert.equal((await fetch(f.base+'/ledger/reconcile',post({}))).status,200);
  }finally{await f.close();}
});
test('workflow failure after purchase resumes with receipt and no duplicate settlement',async()=>{
  const f=await fixture();try{
    const original=f.joan.llm.draft.bind(f.joan.llm);f.joan.llm.draft=async()=>{throw new Error('draft unavailable');};
    assert.equal((await fetch(f.base+'/assignments',post({text:'Retry this assignment safely after a draft failure',budget:0.05},'retry-safe'))).status,500);
    f.joan.llm.draft=original;assert.equal((await fetch(f.base+'/assignments',post({text:'Retry this assignment safely after a draft failure',budget:0.05},'retry-safe'))).status,201);assert.equal(f.joan.ledger.list().length,1);assert.equal(f.joan.wallet.state().balanceMicros,9_995_000);
  }finally{await f.close();}
});
