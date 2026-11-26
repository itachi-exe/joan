import test from 'node:test';
import assert from 'node:assert/strict';
import { Store } from '../src/store.js';
import { Joan } from '../src/joan.js';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
test('LLM budget fails closed before adapter invocation',async()=>{
 const s=new Store(':memory:'),j=new Joan(s,{JOAN_DAILY_LLM_CAP:'1'});await j.init();
 let calls=0;const draft=j.llm.draft.bind(j.llm);j.llm.draft=async(...args)=>{calls++;return draft(...args);};
 await j.create({text:'Check the original document and its claims',budget:0},'llm-one');
 await assert.rejects(j.create({text:'Check another original document and its claims',budget:0},'llm-two'),/daily edition limit/);
 assert.equal(calls,1);assert.equal(j.reports().length,1);s.close();
});
test('daily counters survive reopening the SQLite file',()=>{
 const dir=mkdtempSync(join(process.env.TMPDIR!,'joan-limits-'));const path=join(dir,'test.sqlite');
 try{const first=new Store(path);first.consumeLimit('commissions',1,1000,100);first.close();
 const next=new Store(path);assert.throws(()=>next.consumeLimit('commissions',1,1000,101),/daily edition limit/);next.close();
 }finally{rmSync(dir,{recursive:true});}
});
test('persistent limits refuse excess, separate buckets and reset windows',()=>{
 const s=new Store(':memory:');
 s.consumeLimit('commissions',1,1000,100);
 assert.throws(()=>s.consumeLimit('commissions',1,1000,101),/daily edition limit/);
 s.consumeLimit('llm',1,1000,101);
 s.consumeLimit('commissions',1,1000,1100);
 assert.equal(s.get<number>('limit:commissions:1'),1);
 s.close();
});
test('commission cap runs before research and replay does not spend twice',async()=>{
 const s=new Store(':memory:'), j=new Joan(s,{JOAN_DAILY_COMMISSION_CAP:'1'});
 await j.init();
 const input={text:'Verify the public source for this assignment',budget:0};
 const r=await j.create(input,'one');
 assert.equal((await j.create(input,'one')).id,r.id);
 await assert.rejects(j.create(input,'two'),/daily edition limit/);
 s.close();
});
