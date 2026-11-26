import test from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { Store } from '../src/store.js';
import { Joan } from '../src/joan.js';
import { api } from '../src/api.js';
test('trusted proxy IP commissions are limited before research',async()=>{
 const s=new Store(':memory:'), j=new Joan(s);await j.init();
 const server=api(j,[],true);await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));
 const base=`http://127.0.0.1:${(server.address() as AddressInfo).port}`;
 try{for(let i=0;i<4;i++){
 const r=await fetch(base+'/commissions/attempt',{method:'POST',headers:{'content-type':'application/json','x-real-ip':'203.0.113.5'},body:JSON.stringify({text:'Verify this assignment against the original document',budget:0})});
 assert.equal(r.status,i<3?200:429);
 }}finally{server.close();s.close();}
});
