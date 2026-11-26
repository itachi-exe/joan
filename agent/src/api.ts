import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { Fault } from './types.js';
import { Joan } from './joan.js';
async function body(req:IncomingMessage):Promise<Record<string,unknown>>{
  if(!req.headers['content-type']?.startsWith('application/json'))throw new Fault('unsupported_media_type','Send application/json',415);
  let raw='';
  for await(const chunk of req){raw+=String(chunk);if(Buffer.byteLength(raw)>16_384)throw new Fault('body_too_large','Request exceeds 16 KiB',413);}
  try{const value=JSON.parse(raw);if(!value||typeof value!=='object'||Array.isArray(value))throw new Error();return value as Record<string,unknown>;}catch{throw new Fault('invalid_json','Expected a JSON object',400);}
}
export function api(joan:Joan,allowedOrigins=['http://localhost:4174','http://127.0.0.1:4174','http://localhost:5173','http://127.0.0.1:5173'],publicLimits=false){
  return createServer(async(req:IncomingMessage,res:ServerResponse)=>{
    const send=(status:number,data:unknown)=>{res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'});res.end(JSON.stringify(data));};
    try{
      const origin=req.headers.origin;
      if(origin&&!allowedOrigins.includes(origin))throw new Fault('origin_forbidden','Origin not permitted',403);
      if(origin){res.setHeader('access-control-allow-origin',origin);res.setHeader('vary','Origin');}
      if(req.method==='OPTIONS'){res.setHeader('access-control-allow-methods','GET, POST, OPTIONS');res.setHeader('access-control-allow-headers','content-type, idempotency-key');res.writeHead(204);res.end();return;}
      const path=new URL(req.url??'/','http://localhost').pathname.replace(/^\/api(?=\/)/,'');
      if(req.method==='GET'){
        if(path==='/health'){send(200,{ok:true,mode:joan.wallet.mode,demoData:joan.wallet.mode==='mock',liveSigningEnabled:false});return;}
        if(path==='/reports'){send(200,joan.reports());return;}
        if(path==='/wallet'){send(200,joan.wallet.state());return;}
        if(path==='/permissions'){if(joan.wallet.mode==='live')throw new Fault('live_permissions_unknown','Live permissions cannot be verified without the separately approved Altana integration',503,'safety');send(200,{mode:joan.wallet.mode,demoData:true,...joan.wallet.session(),x402CapEnforcement:'SDK only; execute policy simulated separately'});return;}
        if(path==='/ledger'){const entries=joan.ledger.list();send(200,{mode:joan.buy.mode,demoData:joan.buy.mode==='mock'||entries.some(r=>r.receipt?.startsWith('mock_')),entries});return;}
        const match=path.match(/^\/(reports|assignments)\/([a-zA-Z0-9-]+)$/);
        if(match){const value=match[1]==='reports'?joan.report(match[2]!):joan.assignment(match[2]!);if(!value)throw new Fault('not_found','Record not found',404);send(200,value);return;}
        if(path==='/wire'){send(200,joan.reports().slice(0,8).map(r=>({id:r.id,text:r.headline,status:r.demoData?'pending':'ok',at:r.date})));return;}
      }
      if(req.method==='POST'){
        const data=await body(req);
        if(publicLimits){
          // The loopback-only server trusts only nginx, which overwrites X-Real-IP.
          const ip=String(req.headers['x-real-ip']||req.socket.remoteAddress);
          const commission=['/commissions','/commissions/attempt','/assignments'].includes(path);
          joan.store.consumeLimit(`ip:${ip}:${commission?'commission':'control'}`,commission?3:30,3_600_000);
        }
        // An evaluated attempt is a successful RPC even when policy denies it.
        // Run the same authoritative create path; never turn a denial into a report.
        // Validation, idempotency conflicts, infrastructure and safety faults retain
        // their HTTP errors. Existing commission endpoints retain their contract.
        if(path==='/commissions/attempt'){
          const header=req.headers['idempotency-key'];if(Array.isArray(header))throw new Fault('invalid_input','Only one Idempotency-Key allowed',400);
          try{
            const report=await joan.create({text:data.text,budget:data.budget},header);
            send(200,{outcome:'accepted',report});
          }catch(e){
            if(e instanceof Fault && e.status===409 && ['session_revoked','session_expired','sdk_spend_limit_exceeded','allowance_exceeded','spend_limit_exceeded','call_not_permitted'].includes(e.code)){
              send(200,{outcome:'denied',denial:{error:e.code,message:e.message,layer:e.layer}});
            }else throw e;
          }
          return;
        }
        if(path==='/assignments'||path==='/commissions'){
          const header=req.headers['idempotency-key'];if(Array.isArray(header))throw new Fault('invalid_input','Only one Idempotency-Key allowed',400);
          const report=await joan.create({text:data.text,budget:data.budget},header);
          send(201,report);return;
        }
        if(path==='/permissions'||path==='/wallet/grant'){
          send(200,joan.wallet.grant({capMicros:data.capMicros as number,allowlist:data.allowlist as string[],expiresAt:data.expiresAt as number}));return;
        }
        if(path==='/revoke'||path==='/wallet/revoke'){send(200,joan.wallet.revoke());return;}
        if(path==='/ledger/reconcile'){send(200,await joan.init());return;}
      }
      throw new Fault('not_found','API route not found',404);
    }catch(e){if(e instanceof Fault)send(e.status,{error:e.code,message:e.message,layer:e.layer});else send(500,{error:'internal_error',message:'Research failed. Check assignment status; purchases are not automatically retried.'});}
  });
}
