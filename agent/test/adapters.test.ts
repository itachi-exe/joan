import test from 'node:test';
import assert from 'node:assert/strict';
import { Store } from '../src/store.js';
import { Joan } from '../src/joan.js';
import { WalletAdapter,USDC } from '../src/wallet.js';
import { Fault,budgetMicros } from '../src/types.js';
import { SearchAdapter,LlmAdapter } from '../src/research.js';
const code=(c:string,layer?:string)=>(e:unknown)=>e instanceof Fault&&e.code===c&&(!layer||e.layer===layer);

test('Altana mock distinguishes SDK x402 cap from execute onchain policy refusals',()=>{
  const s=new Store(':memory:'),w=new WalletAdapter(s);w.grant({capMicros:50_000,allowlist:[USDC],expiresAt:Date.now()+60_000});
  assert.throws(()=>w.checkX402(103_000),code('sdk_spend_limit_exceeded','sdk'));
  assert.throws(()=>w.execute('0x0000000000000000000000000000000000000001',1),code('call_not_permitted','onchain-policy-simulation'));
  assert.throws(()=>w.execute(USDC,50_001),code('spend_limit_exceeded','onchain-policy-simulation'));
  assert.equal(w.execute(USDC,1000).mode,'mock');assert.equal(w.session().executeSpentMicros,1000);s.close();
});
test('grant validates explicit cap, allowlist, expiry and revocation blocks both rails',()=>{
  const s=new Store(':memory:'),w=new WalletAdapter(s);const base={capMicros:50_000,allowlist:[USDC],expiresAt:Date.now()+60_000};
  for(const input of [{...base,allowlist:[]},{...base,capMicros:10_000_001},{...base,allowlist:['bad']},{...base,expiresAt:Date.now()-1},{...base,expiresAt:Date.now()+90_000_000}])assert.throws(()=>w.grant(input),code('invalid_permissions'));
  w.grant(base);w.revoke();assert.throws(()=>w.checkX402(1),code('session_revoked'));assert.throws(()=>w.execute(USDC,1),code('session_revoked'));s.close();
});
test('expiry refusal uses simulated signature checker and execute layers',()=>{
  const s=new Store(':memory:');let now=Date.now();const w=new WalletAdapter(s,{},()=>now);w.grant({capMicros:5000,allowlist:[USDC],expiresAt:now+10});now+=20;assert.throws(()=>w.checkX402(1),code('session_expired','signature-checker-simulation'));assert.throws(()=>w.execute(USDC,1),code('session_expired','onchain-policy-simulation'));s.close();
});
test('mock Celo Buy duplicate request returns one durable settlement',async()=>{
  const s=new Store(':memory:'),j=new Joan(s);const report=await j.create({text:'Verify a public transit fare announcement',budget:0.05},'unique');assert.equal(report.researchSpending.amountMicros,5000);const row=j.ledger.list()[0]!;const a=await j.buy.buy(row),b=await j.buy.buy(row);assert.equal(a.receipt,b.receipt);assert.equal(j.wallet.state().balanceMicros,9_995_000);assert.equal(j.buy.quote().rail,'eip3009');s.close();
});
test('live wallet configuration fails safely without signing, funding, grant or revoke',()=>{
  const s=new Store(':memory:'),w=new WalletAdapter(s,{ALTANA_SESSION_KEY:'test-placeholder-not-a-key'});assert.equal(w.mode,'live');assert.equal(w.state().balanceMicros,null);assert.equal(w.state().session,null);assert.equal(w.state().permissionsVerified,false);for(const fn of [()=>w.checkX402(1),()=>w.execute(USDC,1),()=>w.revoke(),()=>w.grant({capMicros:1,allowlist:[USDC],expiresAt:Date.now()+1000})])assert.throws(fn,code('live_signing_disabled','safety'));s.close();
});
test('live Celo Buy URL never signs or makes a real purchase',async()=>{
  const s=new Store(':memory:'),j=new Joan(s,{CELO_BUY_API_URL:'https://example.invalid'});await assert.rejects(j.create({text:'Check this assignment without spending anything',budget:0.05}),code('live_payment_unproven'));assert.equal(j.ledger.list()[0]!.state,'failed');assert.equal(j.wallet.state().balanceMicros,10_000_000);s.close();
});
test('mock search and LLM are deterministic and label unsupported claims',async()=>{
  const search=new SearchAdapter(),llm=new LlmAdapter();const sources=await search.research('test');assert.deepEqual(sources,await search.research('test'));const a=await llm.draft('test',sources,'mock');assert.deepEqual(a,await llm.draft('test',sources,'mock'));assert.equal(a.confidence.level,'low');assert.match(a.summary,/demonstration/);
});
test('live search adapter parses public sources without inventing corroboration',async()=>{
  const search=new SearchAdapter({TAVILY_API_KEY:'placeholder'},async()=>new Response(JSON.stringify({results:[{title:'Original filing',url:'https://example.org/filing',content:'Public document'},{url:'javascript:alert(1)'}]}),{status:200}));const sources=await search.research('claim');assert.equal(sources.length,1);assert.equal(sources[0]!.kind,'Claim');assert.equal(sources[0]!.mode,'live');
});
test('live LLM validates JSON response and rejects malformed provider responses',async()=>{
  const llm=new LlmAdapter({OPENAI_API_KEY:'placeholder'},async()=>new Response(JSON.stringify({choices:[{message:{content:'{"headline":"incomplete"}'}}]})));await assert.rejects(llm.draft('claim',[],''),code('llm_invalid'));
});
test('provider failures surface rather than silently replacing real research with mocks',async()=>{
  const f:typeof fetch=async()=>new Response('denied',{status:401});await assert.rejects(new SearchAdapter({TAVILY_API_KEY:'placeholder'},f).research('test'),code('search_failed'));await assert.rejects(new LlmAdapter({OPENAI_API_KEY:'placeholder'},f).draft('test',[],''),code('llm_failed'));
});
test('switching adapter configuration never relabels old mock receipts as live',async()=>{
  const s=new Store(':memory:');const first=new Joan(s);first.llm.draft=async()=>{throw new Error('interrupted draft');};
  const input={text:'Resume an old mock purchase after changing configuration',budget:0.05};await assert.rejects(first.create(input,'mode-switch'));
  const next=new Joan(s,{CELO_BUY_API_URL:'https://example.invalid'});const report=await next.create(input,'mode-switch');
  assert.equal(report.spending[0]!.mode,'mock');assert.equal(report.researchSpending.mode,'mock');assert.equal(report.demoData,true);assert.equal(s.db.prepare('SELECT count(*) n FROM mock_settlements').get()!.n,1);s.close();
});
test('budget validation rejects NaN, negatives, excessive precision and cap above $10',()=>{
  for(const n of [NaN,Infinity,-1,10.000001,0.0000001,'0.05'])assert.throws(()=>budgetMicros(n),code('invalid_input'));assert.equal(budgetMicros(0.005),5000);
});
