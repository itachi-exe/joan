import { Fault, type Source } from './types.js';

// Exact public publisher allowlist, not a general-purpose URL proxy. No arbitrary hosts or ports.
export const PUBLIC_HOSTS=['docs.celo.org','celo.org','blog.celo.org','en.wikipedia.org','hn.algolia.com','www.rfc-editor.org','www.nasa.gov','science.nasa.gov'];
export function publicUrl(raw:string):URL {
  let u:URL;try{u=new URL(raw);}catch{throw new Fault('search_url','Public research URL invalid',400);}
  if(u.protocol!=='https:'||u.username||u.password||u.port||!PUBLIC_HOSTS.includes(u.hostname))throw new Fault('search_url','Public research requires an allowlisted HTTPS publisher URL',400);
  return u;
}
export async function publicText(raw:string,fetcher:typeof fetch=fetch):Promise<{url:string;text:string}> {
  let u=publicUrl(raw);const signal=AbortSignal.timeout(15_000);
  try{
    for(let redirects=0;redirects<=2;redirects++){
      const res=await fetcher(u,{redirect:'manual',signal,headers:{accept:'text/html, text/plain, application/json','user-agent':'JoanResearch/1.0'}});
      if([301,302,303,307,308].includes(res.status)){
        await res.body?.cancel();const location=res.headers.get('location');
        if(!location||redirects===2)throw new Fault('search_redirect','Public research redirect limit exceeded',502);
        u=publicUrl(new URL(location,u).href);continue;
      }
      if(!res.ok)throw new Fault('search_failed',`Public research returned ${res.status}`,502);
      const type=res.headers.get('content-type')||'';
      if(type&&!/text\/(html|plain)|application\/(json|xhtml\+xml)/i.test(type))throw new Fault('search_type','Public research content type unsupported',502);
      if(Number(res.headers.get('content-length'))>524_288){await res.body?.cancel();throw new Fault('search_size','Public research exceeds 512 KiB',502);}
      const reader=res.body?.getReader();if(!reader)throw new Fault('search_empty','Public research response empty',502);
      const chunks:Uint8Array[]=[];let size=0;
      try{while(true){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>524_288)throw new Fault('search_size','Public research exceeds 512 KiB',502);chunks.push(value);}}finally{await reader.cancel();}
      return {url:u.href,text:Buffer.concat(chunks).toString('utf8')};
    }
    throw new Fault('search_redirect','Public research redirect limit exceeded',502);
  }catch(e){if(e instanceof Fault)throw e;throw new Fault('search_failed','Public research request failed or timed out',502);}
}
function clean(html:string):string {
  return html.replace(/<(script|style|nav|header|footer)\b[^>]*>[\s\S]*?<\/\1>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&(?:nbsp|amp|lt|gt|quot|#39);/g,m=>({'&nbsp;':' ','&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"','&#39;':"'"}[m]!)).replace(/\s+/g,' ').trim();
}
function excerptFor(html:string,assignment:string):string {
  const text=clean(html);if(text.length<=16000)return text;
  const terms=[...new Set(assignment.replace(/https?:\/\/\S+/g,'').toLowerCase().match(/[a-z]{4,}|\d{3,}/g)||[])];
  const passages:{start:number;text:string;score:number}[]=[];
  for(let start=0;start<text.length;start+=2000){const part=text.slice(Math.max(0,start-100),start+2100);const lower=part.toLowerCase();passages.push({start,text:part,score:terms.reduce((n,t)=>n+(lower.includes(t)?(/^\d/.test(t)?10:1):0),0)});}
  const selected=passages.sort((a,b)=>b.score-a.score||a.start-b.start).slice(0,6).sort((a,b)=>a.start-b.start);
  return selected.map(p=>`[Excerpt at character ${p.start}] ${p.text}`).join('\n[...omitted...]\n').slice(0,16000);
}
export async function publicResearch(text:string,fetcher:typeof fetch):Promise<Source[]> {
  const urls=[...new Set(text.match(/https?:\/\/[^\s<>"\]]+/g)||[])];
  if(urls.length>5)throw new Fault('search_limit','Public research permits at most five source URLs',400);
  // Validate the whole assignment before any network request.
  urls.forEach(publicUrl);
  if(urls.length){
    const sources:Source[]=[];
    for(const url of urls){const page=await publicText(url,fetcher);const excerpt=excerptFor(page.text,text);if(!excerpt)throw new Fault('search_empty','Public research source has no text',502);sources.push({label:clean(page.text.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]||new URL(page.url).hostname).slice(0,300),url:page.url,kind:'Claim',note:'Fetched publisher text; publisher claims are not independent corroboration. Excerpt may be truncated. Cite by 1-based source index.',excerpt,mode:'live'});}
    return sources;
  }
  const page=await publicText(`https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(text.slice(0,300))}&tags=story&hitsPerPage=5`,fetcher);
  let hits:any[];try{hits=JSON.parse(page.text).hits;if(!Array.isArray(hits))throw new Error();}catch{throw new Fault('search_invalid','Public research search response invalid',502);}
  const sources:Source[]=hits.filter(h=>/^\d+$/.test(h.objectID)&&typeof h.title==='string').map(h=>({label:h.title.slice(0,300),kind:'Claim',note:'Hacker News search metadata, not the linked article. Discussion or headline is a lead, not confirmation.',url:`https://news.ycombinator.com/item?id=${h.objectID}`,excerpt:clean(`${h.title} ${h.story_text||''}`).slice(0,4000),mode:'live'}));
  if(!sources.length)throw new Fault('search_empty','Public research found no sources; supply relevant publisher URLs',502);
  return sources;
}
