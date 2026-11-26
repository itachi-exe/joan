import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { Store } from './store.js';
import { Joan } from './joan.js';
import { Fault } from './types.js';
import { USDC } from './wallet.js';
const choice=process.argv[2]||'all';
if(!['all','allowed','blocked','revoke'].includes(choice))throw new Error('Choose allowed, blocked, revoke or all');
const root=mkdtempSync(join(process.env.TMPDIR||'/opt/hermes/.hermes/cache/scratch','joan-demo-'));
function refusal(name:string,fn:()=>unknown,code:string,layer:string){
  try{fn();assert.fail('Expected refusal');}catch(e){assert.ok(e instanceof Fault);assert.equal(e.code,code);assert.equal(e.layer,layer);console.log(JSON.stringify({demo:name,outcome:'REFUSED',code:e.code,layer:e.layer,mode:'mock',realTransaction:false}));}
}
for(const name of choice==='all'?['allowed','blocked','revoke']:[choice]){
  const path=join(root,`${name}.sqlite`);const store=new Store(path),joan=new Joan(store);await joan.init();
  if(name==='allowed'){
    const report=await joan.create({text:'Check the source of a public transit fare claim',budget:0.05},'allowed-demo');
    assert.equal(report.researchSpending.amountMicros,5000);assert.equal(report.label,'AI-generated report. Prepared by Joan.');
    const again=await joan.create({text:'Check the source of a public transit fare claim',budget:0.05},'allowed-demo');assert.equal(again.id,report.id);assert.equal(joan.ledger.list().length,1);
    console.log(JSON.stringify({demo:name,outcome:'ALLOWED',reportId:report.id,spending:report.researchSpending,receipt:report.spending[0]!.tx,duplicatePayment:false,label:report.label,database:path}));
  }
  if(name==='blocked'){
    const now=Date.now();joan.wallet.grant({capMicros:50_000,allowlist:[USDC],expiresAt:now+3600_000});
    store.db.prepare('INSERT INTO assignments VALUES (?,?,?,?,?,?,?)').run('blocked','blocked','Over-budget demo',100_000,'researching',null,new Date().toISOString());
    refusal('app-over-budget',()=>joan.ledger.reserve({key:'over',assignmentId:'blocked',query:'demo',amountMicros:50_001,destination:USDC}),'allowance_exceeded','application');
    refusal('x402-sdk-cap',()=>joan.wallet.checkX402(103_000),'sdk_spend_limit_exceeded','sdk');
    refusal('execute-unapproved-contract',()=>joan.wallet.execute('0x0000000000000000000000000000000000000001',1),'call_not_permitted','onchain-policy-simulation');
    refusal('execute-over-cap',()=>joan.wallet.execute(USDC,50_001),'spend_limit_exceeded','onchain-policy-simulation');
    console.log('x402 caps are client-side SDK policy. execute refusals model onchain policy; no chain revert or transaction is claimed.');
  }
  if(name==='revoke'){
    joan.wallet.revoke();refusal('revoke-x402',()=>joan.wallet.checkX402(5000),'session_revoked','signature-checker-simulation');
    refusal('revoke-execute',()=>joan.wallet.execute(USDC,1),'session_revoked','onchain-policy-simulation');
    store.close();const restarted=new Store(path),next=new Joan(restarted);await next.init();assert.equal(next.wallet.session().revoked,true);
    refusal('revoke-persists-after-restart',()=>next.wallet.checkX402(5000),'session_revoked','signature-checker-simulation');restarted.close();
    console.log(JSON.stringify({demo:name,persistentRevocation:true,realTransaction:false,database:path}));continue;
  }
  store.close();
}
console.log(`PASS: ${choice} mock demo(s); no wallets created, no signatures, no real spending. Evidence databases: ${root}`);
