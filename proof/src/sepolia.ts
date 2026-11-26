import { mkdirSync,existsSync,readFileSync,writeFileSync,chmodSync,realpathSync } from 'node:fs';
import { resolve,join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { generatePrivateKey,privateKeyToAccount } from 'viem/accounts';
import { createPublicClient,http,erc20Abi } from 'viem';
import { celoSepolia } from 'viem/chains';
import * as sdk from '@altananetwork/sdk';
import { quote,X_SEARCH,type Offer } from './proof.js';
const SCRATCH='/opt/hermes/.hermes/cache/scratch';
const TOKEN='0x01c5c0122039549ad1493b8220cabedd739bc44e' as const;
export function sepoliaConfig(env:NodeJS.ProcessEnv){
  if(env.JOAN_NETWORK!=='sepolia')throw new Error('Set JOAN_NETWORK=sepolia; this proof cannot run on any other network');
  const stateDir=resolve(env.JOAN_SEPOLIA_STATE_DIR||join(SCRATCH,'joan-sepolia-proof'));
  if(!stateDir.startsWith(SCRATCH+'/')||(existsSync(stateDir)&&!realpathSync(stateDir).startsWith(realpathSync(SCRATCH)+'/')))throw new Error('Sepolia key state must remain outside the repository, under scratch');
  return {chainId:11142220 as const,usdc:TOKEN,stateDir};
}
export async function requestFaucet(address:string,fetcher:typeof fetch=fetch):Promise<{txHash:string;amount:string}> {
  const res=await fetcher('https://gateway.usebuy.ai/v1/sandbox/fund',{method:'POST',redirect:'manual',signal:AbortSignal.timeout(15_000),headers:{'content-type':'application/json'},body:JSON.stringify({address})});
  if(res.status!==200)throw new Error(`Sandbox faucet returned HTTP ${res.status}; public alternative https://faucet.circle.com`);
  const data=await res.json() as any;
  if(!/^0x[0-9a-fA-F]{64}$/.test(data.txHash)||!/^\d+$/.test(data.amount)||data.token!=='USDC'||(data.network&& !['celo-sepolia','eip155:11142220'].includes(data.network)))throw new Error('Sandbox faucet response is not a verifiable test USDC grant');
  return {txHash:data.txHash,amount:data.amount};
}
export function pickSepoliaOffer(offers:Offer[]):Offer {
 const offer=offers.find(o=>['celo-sepolia','eip155:11142220'].includes(o.network)&&o.asset.toLowerCase()===TOKEN&&o.rail==='eip3009'&&/^\d+$/.test(o.amountAtomic)&&BigInt(o.amountAtomic)>0n&&BigInt(o.amountAtomic)<=50000n);
 if(!offer)throw new Error('No bounded Celo Sepolia USDC EIP-3009 offer; refusing payment');
 return offer;
}
export async function waitForBalance(read:()=>Promise<bigint>,sleep:(ms:number)=>Promise<void>=ms=>new Promise(resolve=>setTimeout(resolve,ms)),attempts=10):Promise<bigint>{
 for(let i=0;i<attempts;i++){const balance=await read();if(balance>=50000n)return balance;if(i+1<attempts)await sleep(2000);}
 throw new Error('Faucet balance insufficient after bounded visibility wait');
}
export async function runSepolia(){
 const cfg=sepoliaConfig(process.env);mkdirSync(cfg.stateDir,{recursive:true,mode:0o700});chmodSync(cfg.stateDir,0o700);
 const evidencePath=join(cfg.stateDir,'evidence.json');const evidence:unknown[]=existsSync(evidencePath)?JSON.parse(readFileSync(evidencePath,'utf8')):[];const secrets:string[]=[];let stage='prepare';
 const record=(step:string,result:unknown)=>{const entry={at:new Date().toISOString(),chainId:cfg.chainId,step,result};evidence.push(entry);writeFileSync(join(cfg.stateDir,'evidence.json'),JSON.stringify(evidence,null,2)+'\n');console.log(JSON.stringify(entry));};
 const key=(name:string)=>{const file=join(cfg.stateDir,name);if(!existsSync(file))writeFileSync(file,generatePrivateKey(),{mode:0o600,flag:'wx'});chmodSync(file,0o600);const value=readFileSync(file,'utf8').trim() as `0x${string}`;if(!/^0x[0-9a-fA-F]{64}$/.test(value))throw new Error('Malformed throwaway key');secrets.push(value);return value;};
 try{
  const adminKey=key('admin.key'),sessionKey=key('session.key');const admin=sdk.signerFromPrivateKey(adminKey);
  // No provisioning on Ethereum Sepolia and no mainnet price-feed reads.
  const chain={...sdk.CELO_SEPOLIA,provisionAlso:[],nativePriceFeed:undefined};
  const client=sdk.createClient({chains:[chain],agentIdentity:{name:'Joan Sepolia proof',description:'Throwaway testnet-only x402 compatibility proof',endpoint:'https://example.invalid/joan'}});
  stage='create counterfactual wallet';const wallet=await client.createWallet({signer:admin});
  record('addresses',{admin:privateKeyToAccount(adminKey).address,wallet:wallet.address,faucet:'https://gateway.usebuy.ai/v1/sandbox/fund'});
  const pc=createPublicClient({chain:celoSepolia,transport:http('https://forno.celo-sepolia.celo-testnet.org',{timeout:15_000,retryCount:0})});
  if(await pc.getChainId()!==cfg.chainId)throw new Error('RPC chain mismatch');
  const balance=()=>pc.readContract({address:TOKEN,abi:erc20Abi,functionName:'balanceOf',args:[wallet.address]});
  stage='unsigned sandbox quote';const q=await quote(X_SEARCH,{query:'celo'},async(u,i)=>fetch(u,{...i,redirect:'error',signal:AbortSignal.timeout(20_000)}));const offer=pickSepoliaOffer(q.offers);record('sandbox offer',offer);
  stage='faucet';let before=await balance();record('USDC balance before',before.toString());
  if(before<50000n){const grant=await requestFaucet(wallet.address);record('faucet grant',grant);const receipt=await pc.waitForTransactionReceipt({hash:grant.txHash as `0x${string}`,timeout:30_000});if(receipt.status!=='success')throw new Error('Faucet transaction reverted');before=await waitForBalance(balance);record('USDC balance after',before.toString());}
  const sessionSigner=sdk.signerFromPrivateKey(sessionKey),expiry=Math.floor(Date.now()/1000)+3600;
  const permissions={calls:[{to:TOKEN,signature:'transfer(address,uint256)'}],spend:[{token:TOKEN,limit:50000n,period:'day' as const}]};
  stage='quoteGrantSession';const grantQuote=await client.quoteGrantSession({wallet,signer:admin,permissions,expiry,sessionSigner,feeToken:TOKEN} as any);
  record('grant fee quote',{received:!!grantQuote});
  stage='grantSession';const session=await client.grantSession({wallet,signer:admin,permissions,expiry,sessionSigner,feeToken:TOKEN} as any);if(!session.transactionHash)throw new Error('Grant returned no transaction hash');record('session granted',{tx:session.transactionHash,keyId:session.keyId});
  let approved=false;
  try{
   stage='approveSignatureChecker';const approval=await client.approveSignatureChecker({wallet,signer:admin,session,checker:TOKEN,feeToken:TOKEN} as any);if(approval.status!=='CONFIRMED'||!approval.transactionHash)throw new Error('Checker approval not confirmed');approved=true;record('signature checker approved',{tx:approval.transactionHash});
   stage='x402 payment';const res=await client.fetchWithX402({session,url:X_SEARCH,init:{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({query:'celo'})},preferRail:'eip3009',chainId:cfg.chainId} as any);
   const header=res.headers.get('payment-response')||res.headers.get('x-payment-response');let tx:string|undefined;try{tx=JSON.parse(Buffer.from(header||'','base64').toString()).transaction;}catch{}
   record('x402 result',{httpStatus:res.status,settlementTx:tx,checkerApproved:approved});
   if(res.status!==200||!tx||!/^0x[0-9a-fA-F]{64}$/.test(tx))throw new Error('No successful response with settlement hash; A/B/C remain unproven');
   const receipt=await pc.waitForTransactionReceipt({hash:tx as `0x${string}`,timeout:30_000});if(receipt.status!=='success')throw new Error('x402 settlement reverted');record('settlement verified',{tx,status:receipt.status,block:receipt.blockNumber.toString()});
  }finally{
   stage='revokeSession';const revoked=await client.revokeSession({wallet,signer:admin,session,feeToken:TOKEN} as any);record('session revocation',{status:revoked.status,tx:revoked.transactionHash});if(!revoked.transactionHash)throw new Error('Revocation not confirmed; inspect testnet wallet');
  }
 }catch(e){let message=e instanceof Error?e.message:'Unknown failure';for(const secret of secrets)message=message.replaceAll(secret,'[REDACTED]');message=message.replace(/0x[0-9a-fA-F]{64}/g,'[HASH REDACTED]').slice(0,1500);record('BLOCKED',{stage,message});throw new Error(`Sepolia proof stopped at ${stage}; see scratch evidence`);}
}
if(import.meta.url===pathToFileURL(process.argv[1]||'').href)runSepolia().catch(e=>{console.error(e.message);process.exitCode=1;});
