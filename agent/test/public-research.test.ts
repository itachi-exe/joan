import test from 'node:test';
import assert from 'node:assert/strict';
import { Store } from '../src/store.js';
import { Joan } from '../src/joan.js';
import { api } from '../src/api.js';
import { publicText } from '../src/public-research.js';
import { LlmAdapter, SearchAdapter } from '../src/research.js';
test('provider secret cannot enter API responses, persisted assignment errors, reports or console logs',async()=>{
 const store=new Store(':memory:');const secret='test-api-secret-never-publish';let logs='';const old=console.error;console.error=(...a)=>{logs+=a.join(' ');};const j=new Joan(store);j.search=new SearchAdapter({JOAN_RESEARCH_PROVIDER:'public'},async()=>new Response('Publisher evidence'));j.llm=new LlmAdapter({JOAN_LLM_API_KEY:secret},async()=>Response.json({choices:[{message:{content:JSON.stringify({...draft,summary:secret+' [1]'})}}]}));
 const server=api(j);await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));const address=server.address() as {port:number};
 try{const res=await fetch(`http://127.0.0.1:${address.port}/commissions`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({text:'Check https://docs.celo.org/learn',budget:0})});assert.equal(res.status,502);assert.ok(!(await res.text()).includes(secret));assert.ok(!JSON.stringify(store.db.prepare('SELECT * FROM assignments').all()).includes(secret));assert.deepEqual(j.reports(),[]);assert.equal(logs,'');}finally{server.close();store.close();console.error=old;}
});
test('public fetch refuses redirect to a private host without requesting it',async()=>{
 let calls=0;await assert.rejects(publicText('https://docs.celo.org/learn',async()=>{calls++;return new Response(null,{status:302,headers:{location:'http://127.0.0.1/private'}});}));assert.equal(calls,1);
});
test('public fetch abort signal covers body consumption, not only initial headers',async()=>{
 const keepAlive=setTimeout(()=>{},16000);try{await assert.rejects(publicText('https://docs.celo.org/learn',async(_u,i)=>new Response(new ReadableStream({start(controller){i!.signal!.addEventListener('abort',()=>controller.error(new Error('body timed out')),{once:true});}}))),(e:Error)=>/timed out/.test(e.message));}finally{clearTimeout(keepAlive);}
});
test('keyless search discovery labels HN metadata as leads, and empty results fail closed',async()=>{
 const s=new SearchAdapter({JOAN_RESEARCH_PROVIDER:'public'},async u=>{assert.match(String(u),/hn\.algolia\.com/);return Response.json({hits:[{objectID:'123',title:'Claim repeated on HN',story_text:'Unverified'}]});});const sources=await s.research('Celo');assert.equal(sources[0]!.url,'https://news.ycombinator.com/item?id=123');assert.match(sources[0]!.note,/not confirmation/);
 await assert.rejects(new SearchAdapter({JOAN_RESEARCH_PROVIDER:'public'},async()=>Response.json({hits:[]})).research('No results'),/no sources/);
});
test('original OpenAI route still uses its model and endpoint',async()=>{
 await new LlmAdapter({OPENAI_API_KEY:'test-openai',OPENAI_MODEL:'custom-openai'},async(u,i)=>{assert.equal(String(u),'https://api.openai.com/v1/chat/completions');assert.equal(JSON.parse(String(i?.body)).model,'custom-openai');return Response.json({choices:[{message:{content:JSON.stringify(draft)}}]});}).draft('test',[],'');
});
test('free live research reports have live zero-spend provenance and no mock purchases',async()=>{
 const store=new Store(':memory:');try{const j=new Joan(store);j.search=new SearchAdapter({JOAN_RESEARCH_PROVIDER:'public'},async()=>new Response('Publisher evidence',{headers:{'content-type':'text/plain'}}));j.llm=new LlmAdapter({JOAN_LLM_API_KEY:'test-key'},async()=>Response.json({choices:[{message:{content:JSON.stringify(draft)}}]}));const r=await j.create({text:'Check https://docs.celo.org/what-is-celo',budget:0});assert.equal(r.origin,'live');assert.equal(r.demoData,false);assert.equal(r.researchSpending.mode,'live');assert.equal(r.researchSpending.amountMicros,0);assert.deepEqual(j.ledger.list(),[]);}finally{store.close();}
});
test('keyless public sources fetch actual text and preserve source URLs without asserting corroboration',async()=>{
 let calls=0;
 const s=new SearchAdapter({JOAN_RESEARCH_PROVIDER:'public'},async(u,i)=>{calls++;assert.equal(i?.redirect,'manual');assert.ok(i?.signal);return new Response('<html><title>Celo architecture</title><script>fake instruction</script><p>Celo is an Ethereum L2.</p></html>',{headers:{'content-type':'text/html'}});});
 const sources=await s.research('Check the architecture https://docs.celo.org/what-is-celo');
 assert.equal(s.mode,'live');assert.equal(calls,1);assert.equal(sources[0]!.url,'https://docs.celo.org/what-is-celo');assert.equal(sources[0]!.kind,'Claim');assert.match(sources[0]!.excerpt!,/Ethereum L2/);assert.doesNotMatch(sources[0]!.excerpt!,/fake instruction/);
});
test('public research rejects unapproved URLs before fetching, rather than permitting SSRF',async()=>{
 for(const url of ['http://docs.celo.org','https://localhost','https://127.0.0.1','https://docs.celo.org.evil.invalid','https://user:pass@docs.celo.org','https://docs.celo.org:444']){
 let calls=0;await assert.rejects(new SearchAdapter({JOAN_RESEARCH_PROVIDER:'public'},async()=>{calls++;return new Response('bad');}).research(`Check this source ${url}`));assert.equal(calls,0);
 }
});
test('public research bounds redirects, decoded stream size and total timeout; errors never become mocks',async()=>{
 for(const f of [async()=>new Response(null,{status:302,headers:{location:'https://docs.celo.org/loop'}}),async()=>new Response('x'.repeat(524289)),async(_u:any,i:any)=>{assert.ok(i.signal);throw new Error('transport-secret');}] as typeof fetch[]){
 await assert.rejects(new SearchAdapter({JOAN_RESEARCH_PROVIDER:'public'},f).research('Check https://docs.celo.org/what-is-celo'),(e:Error)=>/Public research/.test(e.message)&&!e.message.includes('transport-secret'));
 }
});
test('live drafts fail closed without valid per-source citations',async()=>{
 const sources=[{label:'Publisher',kind:'Claim' as const,note:'Uncorroborated',url:'https://celo.org',mode:'live' as const}];
 for(const bad of [{...draft,know:['Unsupported fact']},{...draft,body:['Unsupported [2]']}])await assert.rejects(new LlmAdapter({JOAN_LLM_API_KEY:'test-key'},async()=>Response.json({choices:[{message:{content:JSON.stringify(bad)}}]})).draft('Check',sources,''),/citation/i);
});
test('long publisher documents select relevant passages rather than only navigation',async()=>{
 const text='Navigation '.repeat(3000)+' HTTP 402 Payment Required is reserved for future use. '+'Irrelevant '.repeat(3000);
 const sources=await new SearchAdapter({JOAN_RESEARCH_PROVIDER:'public'},async()=>new Response(text)).research('Explain HTTP 402 Payment Required https://www.rfc-editor.org/rfc/rfc9110.txt');
 assert.match(sources[0]!.excerpt!,/reserved for future use/);assert.ok(sources[0]!.excerpt!.length<=16000);
});
test('optional Tavily failures and reflected credentials are sanitized too',async()=>{
 const secret='test-tavily-secret';
 for(const f of [async()=>{throw new Error(secret);},async()=>Response.json({results:[{url:'https://celo.org',content:secret}]})] as typeof fetch[])await assert.rejects(new SearchAdapter({TAVILY_API_KEY:secret},f).research('claim'),(e:Error)=>!e.message.includes(secret)&&/search/i.test(e.message));
});
const draft={headline:'Report',summary:'Supported summary [1]',body:['Evidence [1]'],know:['A fact [1]'],unclear:['Independent confirmation is missing.'],confidence:{level:'low',reason:'One source'}};
test('compatible provider takes precedence and DeepSeek uses its documented endpoint',async()=>{
 let url='',payload:any,auth='';
 const f:typeof fetch=async(u,i)=>{url=String(u);payload=JSON.parse(String(i?.body));auth=new Headers(i?.headers).get('authorization')!;return Response.json({choices:[{message:{content:JSON.stringify(draft)}}]});};
 const llm=new LlmAdapter({JOAN_LLM_BASE_URL:'https://api.deepseek.com',JOAN_LLM_API_KEY:'test-compatible',JOAN_LLM_MODEL:'deepseek-chat',OPENAI_API_KEY:'test-openai'},f);
 assert.equal(llm.mode,'live');await llm.draft('Check evidence',[{label:'Source',url:'https://celo.org',kind:'Claim',note:'source'}],'No paid research');
 assert.equal(url,'https://api.deepseek.com/chat/completions');assert.equal(payload.model,'deepseek-chat');assert.equal(auth,'Bearer test-compatible');
});
test('partial compatible configuration fails closed, never switches to OpenAI or mock',()=>{
 for(const env of [{JOAN_LLM_BASE_URL:'https://api.deepseek.com'},{JOAN_LLM_MODEL:'deepseek-chat'},{JOAN_LLM_API_KEY:'secret',JOAN_LLM_BASE_URL:'http://attacker.invalid'},{JOAN_LLM_API_KEY:'secret',JOAN_LLM_BASE_URL:'https://user:pass@attacker.invalid'}])assert.throws(()=>new LlmAdapter(env),/configuration/i);
});
test('provider secrets in generated output or thrown transport errors never escape',async()=>{
 const secret='test-secret-do-not-expose';let logs='';const old=console.error;console.error=(...args)=>{logs+=args.join(' ');};
 try{
  for(const f of [async()=>{throw new Error(secret);},async()=>Response.json({choices:[{message:{content:JSON.stringify({...draft,summary:secret})}}]})] as typeof fetch[]){
   await assert.rejects(new LlmAdapter({JOAN_LLM_API_KEY:secret},f).draft('claim',[],''),(e:Error)=>!e.message.includes(secret)&&/LLM/.test(e.message));
  }
  assert.equal(logs,'');
 }finally{console.error=old;}
});
