import { randomUUID } from 'node:crypto';
import { Ledger, Store } from './store.js';
import { CeloBuyAdapter, WalletAdapter } from './wallet.js';
import { LlmAdapter, SearchAdapter } from './research.js';
import { Fault, budgetMicros, usd, type Purchase, type Report } from './types.js';

export class Joan {
  ledger:Ledger; wallet:WalletAdapter; buy:CeloBuyAdapter; search:SearchAdapter; llm:LlmAdapter;
  private running=new Map<string,Promise<Report>>();
  private commissionCap:number; private llmCap:number;
  constructor(public store:Store,env:NodeJS.ProcessEnv={}){
    this.commissionCap=Number(env.JOAN_DAILY_COMMISSION_CAP||60);this.llmCap=Number(env.JOAN_DAILY_LLM_CAP||60);
    if(![this.commissionCap,this.llmCap].every(n=>Number.isSafeInteger(n)&&n>0&&n<=60))throw new Error('Public daily caps must be 1..60');
    this.ledger=new Ledger(store);this.wallet=new WalletAdapter(store,env);this.buy=new CeloBuyAdapter(store,this.wallet,env);this.search=new SearchAdapter(env);this.llm=new LlmAdapter(env);
  }
  async init(){ const result=await this.ledger.reconcile(k=>this.buy.lookup(k));this.wallet.refreshBalance();return result; }
  async purchase(p:Purchase){
    const old=this.ledger.row(p.key);
    // reserve validates the fingerprint even for settled requests.
    if(!old) { this.wallet.checkX402(p.amountMicros); this.wallet.refreshBalance(); }
    const reserved=this.ledger.reserve(p);
    if(!reserved.fresh){
      if(reserved.row.state==='settled')return {receipt:reserved.row.receipt!,text:'Previously purchased supplementary research (receipt reused; no second payment).'};
      throw new Fault('purchase_not_retryable',`Purchase is ${reserved.row.state}; reconcile it instead of paying again`);
    }
    try{const result=await this.buy.buy(p);this.ledger.settle(p.key,result.receipt);return result;}
    catch(e){
      const definitelyUnpaid=e instanceof Fault && ['live_payment_unproven','live_signing_disabled','sdk_spend_limit_exceeded','session_revoked','session_expired','insufficient_balance'].includes(e.code);
      this.ledger.mark(p.key,definitelyUnpaid?'failed':'unknown', e instanceof Error?e.message:'Unknown settlement outcome');throw e;
    }
  }
  async create(input:{text:unknown;budget:unknown},key:string=randomUUID()):Promise<Report>{
    if(typeof input.text!=='string'||input.text.trim().length<10||input.text.length>2000)throw new Fault('invalid_input','Assignment text must be 10 to 2000 characters',400);
    if(!/^[a-zA-Z0-9_.:-]{1,128}$/.test(key))throw new Fault('invalid_input','Idempotency-Key must be 1 to 128 letters, numbers, _, ., : or -',400);
    const text=input.text.trim(),budget=budgetMicros(input.budget);
    const existing=this.store.db.prepare('SELECT * FROM assignments WHERE request_key=?').get(key);
    if(existing && (existing.text!==text || Number(existing.budget)!==budget))throw new Fault('idempotency_conflict','Assignment key already used with a different payload');
    const id=existing?String(existing.id):randomUUID();
    const published=this.report(id);if(published)return published;
    const inFlight=this.running.get(id);if(inFlight)return inFlight;
    this.store.consumeLimit('commissions',this.commissionCap,86_400_000);
    if(!existing)this.store.db.prepare('INSERT INTO assignments VALUES (?,?,?,?,?,?,?)').run(id,key,text,budget,'researching',null,new Date().toISOString());
    const job=this.run(id,text,budget).finally(()=>this.running.delete(id));this.running.set(id,job);return job;
  }
  private async run(id:string,text:string,budget:number):Promise<Report>{
    this.store.db.prepare("UPDATE assignments SET status='researching',error=NULL WHERE id=?").run(id);
    try{
      const sources=await this.search.research(text);
      const quote=this.buy.quote();
      let paid='No supplementary purchase: assignment budget is below the quoted $0.005 cost.';
      if(budget>=quote.amountMicros){
        const result=await this.purchase({key:`${id}:research:1`,assignmentId:id,query:text,amountMicros:quote.amountMicros,destination:quote.destination});
        paid=result.text;
        sources.push({label:'Supplementary Celo Buy research',kind:'Claim',note:paid,url:'',mode:result.receipt.startsWith('mock_')?'mock':this.buy.mode});
      }
      this.store.consumeLimit('llm',this.llmCap,86_400_000);
      const draft=await this.llm.draft(text,sources,paid);
      const receipts=this.ledger.list().filter(r=>r.assignmentId===id&&r.state==='settled');
      const amount=receipts.reduce((n,r)=>n+r.amountMicros,0);
      const spendingMode=receipts.length===0?this.search.mode:receipts.some(r=>r.receipt?.startsWith('mock_'))?'mock':this.buy.mode;
      const demo=this.search.mode==='mock'||this.llm.mode==='mock'||sources.some(s=>s.mode==='mock');
      const report:Report={...draft,id,assignmentId:id,sample:false,origin:demo?'mock':'live',demoData:demo,label:'AI-generated report. Prepared by Joan.',section:'Commissioned',kicker:demo?'Demo data':'Research dispatch',date:new Date().toISOString().slice(0,10),readMinutes:2,art:'press',credit:'ILLUSTRATION: JOAN',sources,
        spending:receipts.map(r=>({item:'Supplementary research',amount:usd(r.amountMicros),amountMicros:r.amountMicros,tx:r.receipt!,mode:r.receipt?.startsWith('mock_')?'mock':this.buy.mode})),researchSpending:{currency:'USDC',amountMicros:amount,amount:usd(amount),mode:spendingMode}};
      if(demo){report.confidence={level:'low',reason:'Includes demo data. Claims are not independently verified.'};report.unclear=[...new Set([...report.unclear,'One or more research or drafting adapters used demo data.'])];}
      this.store.transaction(()=>{this.store.db.prepare('INSERT INTO reports VALUES (?,?,?)').run(id,id,JSON.stringify(report));this.store.db.prepare("UPDATE assignments SET status='published',error=NULL WHERE id=?").run(id);});
      return report;
    }catch(e){this.store.db.prepare("UPDATE assignments SET status='failed',error=? WHERE id=?").run(e instanceof Error?e.message:'Research failed',id);throw e;}
  }
  report(id:string):Report|undefined{const row=this.store.db.prepare('SELECT data FROM reports WHERE id=? OR assignment_id=?').get(id,id);return row?JSON.parse(String(row.data)) as Report:undefined;}
  reports():Report[]{return this.store.db.prepare('SELECT data FROM reports ORDER BY rowid DESC').all().map(r=>JSON.parse(String(r.data)) as Report);}
  assignment(id:string){const row=this.store.db.prepare('SELECT id,text,budget,status,error,created_at AS createdAt FROM assignments WHERE id=?').get(id);return row?{...row,budgetMicros:row.budget,budget:usd(Number(row.budget))}:undefined;}
}
