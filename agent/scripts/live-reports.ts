import assert from 'node:assert/strict';
import { mkdirSync,writeFileSync,appendFileSync } from 'node:fs';
import { join } from 'node:path';
import { Store } from '../src/store.js';
import { Joan } from '../src/joan.js';
import { api } from '../src/api.js';
import { SearchAdapter,LlmAdapter } from '../src/research.js';
import type { Report } from '../src/types.js';

// Explicit live evidence harness. Secrets arrive only through process env; no headers or provider bodies logged.
assert.ok(process.env.JOAN_LLM_API_KEY,'Set JOAN_LLM_API_KEY in the process environment');
const out=process.env.JOAN_EVIDENCE_DIR||'evidence/live-20261126';mkdirSync(out,{recursive:true});
const log=(value:unknown)=>appendFileSync(join(out,'requests.jsonl'),JSON.stringify(value)+'\n');
const tracked:typeof fetch=async(u,i)=>{const started=Date.now();try{const r=await fetch(u,i);log({at:new Date().toISOString(),method:i?.method||'GET',url:String(u),status:r.status,durationMs:Date.now()-started});return r;}catch{log({at:new Date().toISOString(),method:i?.method||'GET',url:String(u),outcome:'transport_failed',durationMs:Date.now()-started});throw new Error('Request failed');}};
const store=new Store(':memory:');const j=new Joan(store,process.env);
j.search=new SearchAdapter({...process.env,JOAN_RESEARCH_PROVIDER:'public'},tracked);j.llm=new LlmAdapter(process.env,tracked);
const server=api(j);await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));const addr=server.address();assert.ok(addr&&typeof addr==='object');const base=`http://127.0.0.1:${addr.port}`;
const assignments=[
 {name:'tech',text:'Explain what HTTP 402 Payment Required actually standardizes, and whether it defines an interoperable payment protocol. Distinguish the specification from claims made by payment vendors. Use the original HTTP specification: https://www.rfc-editor.org/rfc/rfc9110.txt'},
 {name:'celo',text:'What does Celo say its architecture and fee-currency design offer developers? Verify the Ethereum L2 claim from official documentation, separate project assertions from independently demonstrated adoption or reliability, and state what these sources cannot establish. Sources: https://docs.celo.org/learn/network/architecture https://docs.celo.org/learn/gas-fees'}
];
try{
 for(const a of assignments){
  log({assignment:a.name,request:{text:a.text,budget:0},endpoint:'/commissions'});
  const res=await tracked(`${base}/commissions`,{method:'POST',headers:{'content-type':'application/json','idempotency-key':`live-20261126-${a.name}`},body:JSON.stringify({text:a.text,budget:0})});
  const data=await res.json();if(res.status!==201){log({assignment:a.name,error:data});throw new Error(`${a.name} assignment failed with ${res.status}`);}
  const r=data as Report;assert.equal(r.origin,'live');assert.equal(r.demoData,false);assert.equal(r.researchSpending.amountMicros,0);assert.ok(r.sources.every(s=>s.mode==='live'));
  const readback=await (await tracked(`${base}/reports/${r.id}`)).json();assert.deepEqual(readback,r);
  writeFileSync(join(out,`${a.name}-report.json`),JSON.stringify(r,null,2)+'\n');
  writeFileSync(join(out,`${a.name}-report.md`),`# ${r.headline}\n\n${r.label}\n\n## Summary\n${r.summary}\n\n${r.body.join('\n\n')}\n\n## What we know\n${r.know.map(s=>'- '+s).join('\n')}\n\n## What remains unclear\n${r.unclear.map(s=>'- '+s).join('\n')}\n\n## Sources\n${r.sources.map((s,i)=>`[${i+1}] ${s.label}: ${s.url}\n${s.note}`).join('\n\n')}\n\n## Confidence\n${r.confidence.level}: ${r.confidence.reason}\n\n## Research spending\n${r.researchSpending.amount} USDC. Public source retrieval is free. LLM provider usage is not included in this purchase ledger.\n`);
  console.log(`${a.name}: published and read back; ${r.sources.length} real sources; zero paid research`);
 }
 assert.deepEqual(j.ledger.list(),[]);assert.equal(j.reports().length,2);
}finally{server.close();store.close();}
