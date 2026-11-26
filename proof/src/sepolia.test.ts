import test from 'node:test';
import assert from 'node:assert/strict';
import { sepoliaConfig,requestFaucet,pickSepoliaOffer,waitForBalance } from './sepolia.js';
test('faucet confirmation waits for RPC balance visibility but stops on persistent zero',async()=>{
 let calls=0;assert.equal(await waitForBalance(async()=>++calls===3?1000000n:0n,async()=>{},3),1000000n);assert.equal(calls,3);
 await assert.rejects(waitForBalance(async()=>0n,async()=>{},3),/balance/);
});
test('Sepolia proof requires exact network switch and refuses repository key storage',()=>{
 assert.throws(()=>sepoliaConfig({}),/JOAN_NETWORK/);
 for(const value of ['mainnet','celo','true','42220'])assert.throws(()=>sepoliaConfig({JOAN_NETWORK:value}),/JOAN_NETWORK/);
 assert.throws(()=>sepoliaConfig({JOAN_NETWORK:'sepolia',JOAN_SEPOLIA_STATE_DIR:process.cwd()}),/outside/);
 const c=sepoliaConfig({JOAN_NETWORK:'sepolia'});assert.equal(c.chainId,11142220);assert.equal(c.usdc.toLowerCase(),'0x01c5c0122039549ad1493b8220cabedd739bc44e');
});
test('faucet sends address only and refuses redirects and malformed grants',async()=>{
 const address='0x0000000000000000000000000000000000000001';
 const result=await requestFaucet(address,async(u,i)=>{assert.equal(String(u),'https://gateway.usebuy.ai/v1/sandbox/fund');assert.deepEqual(JSON.parse(String(i?.body)),{address});assert.equal(i?.redirect,'manual');assert.ok(i?.signal);return Response.json({txHash:'0x'+'1'.repeat(64),amount:'1000000',token:'USDC',network:'celo-sepolia'});});
 assert.equal(result.amount,'1000000');
 for(const f of [async()=>new Response(null,{status:302,headers:{location:'https://example.invalid'}}),async()=>Response.json({ok:true}),async()=>new Response('denied',{status:503})] as typeof fetch[])await assert.rejects(requestFaucet(address,f),/faucet/i);
});
test('only sandbox USDC EIP-3009 offer can be selected, never mainnet',()=>{
 const base={network:'eip155:11142220',asset:'0x01c5c0122039549ad1493b8220cabedd739bc44e',amountAtomic:'5000',payTo:'0x0000000000000000000000000000000000000001',token:'USDC',rail:'eip3009' as const};
 assert.equal(pickSepoliaOffer([base]),base);
 for(const bad of [{...base,network:'eip155:42220'},{...base,rail:'permit2' as const},{...base,amountAtomic:'2000001'}])assert.throws(()=>pickSepoliaOffer([bad]),/offer/);
});
