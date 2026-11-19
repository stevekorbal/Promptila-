import { guardedFetch, readBodyAsText } from 'guarded-fetch';

export type Verdict = 'pass'|'fail'|'unverified';
export type Check = { id:string; category:string; label:string; points:number; verdict:Verdict; evidence:string };
const WEIGHTS:Record<string,number>={crawler:25,structured:20,semantic:20,content:15,llms:10,technical:10};
const ENGINES:Record<string,number[]>={ChatGPT:[30,20,15,20,5,10],Gemini:[25,20,20,20,5,10],Claude:[30,15,20,20,5,10],Perplexity:[30,15,20,20,5,10]};
const CATS=Object.keys(WEIGHTS);
export const SCORING_VERSION='instant-v1.1';
export function normalizeSite(value:unknown):{host:string;url:string}{
 if(typeof value!=='string'||value.length>2048)throw new Error('Enter a valid website URL');
 const raw=value.trim();if(!raw||/[\s\\]/.test(raw))throw new Error('Invalid URL');
 const u=new URL(/^[a-z][\w+.-]*:\/\//i.test(raw)?raw:'https://'+raw);
 if(!['https:','http:'].includes(u.protocol)||u.username||u.password||u.port)throw new Error('Only public HTTP(S) websites without custom ports are allowed');
 const host=u.hostname.toLowerCase().replace(/\.$/,'');
 if(host.length>253||!host.includes('.')||host==='localhost'||host.endsWith('.local')||host.endsWith('.internal')||/^\d[\d.]*$/.test(host)||host.includes(':')||!host.split('.').every(p=>/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(p)))throw new Error('Enter a public domain name');
 return {host,url:u.protocol+'//'+host+'/'};
}
function strip(s:string){return s.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ').replace(/<!--[\s\S]*?-->/g,' ').replace(/<[^>]*>/g,' ').replace(/&(?:nbsp|amp|lt|gt|quot);/gi,' ').replace(/\s+/g,' ').trim();}
function textTag(html:string,tag:string){const m=html.match(new RegExp('<'+tag+'\\b[^>]*>([\\s\\S]*?)<\\/'+tag+'\\s*>','i'));return m?strip(m[1]):'';}
function attr(html:string,tagPattern:RegExp,name:string){for(const m of html.matchAll(tagPattern)){const a=m[0].match(new RegExp('\\b'+name+'\\s*=\\s*(?:"([^"]*)"|\\x27([^\\x27]*)\\x27|([^\\s>]+))','i'));if(a)return a[1]||a[2]||a[3]||'';}return '';}
function meta(html:string,name:string){for(const m of html.matchAll(/<meta\b[^>]*>/gi)){const el=m[0];if(new RegExp('\\b(?:name|property)\\s*=\\s*["\\x27]'+name+'["\\x27]','i').test(el))return attr(el,/<meta\b[^>]*>/gi,'content');}return '';}
function canonical(html:string){for(const m of html.matchAll(/<link\b[^>]*>/gi)){if(/\brel\s*=\s*["']canonical["']/i.test(m[0]))return attr(m[0],/<link\b[^>]*>/gi,'href');}return '';}
function ldObjects(html:string){const result:any[]=[];let invalid=false;for(const m of html.matchAll(/<script\b(?=[^>]*\btype\s*=\s*["']application\/ld\+json["'])[^>]*>([\s\S]*?)<\/script>/gi)){try{const obj=JSON.parse(m[1]);result.push(...(Array.isArray(obj)?obj:[obj]));}catch{invalid=true;}}return {result,invalid};}
function hasType(objs:any[],type:string):boolean{for(const o of objs){if(!o||typeof o!=='object')continue;const t=o['@type'];if((Array.isArray(t)?t:[t]).some((v:any)=>String(v||'').toLowerCase().includes(type.toLowerCase())))return true;if(Array.isArray(o['@graph'])&&hasType(o['@graph'],type))return true;}return false;}
function getAny(objs:any[],property:string):boolean{return objs.some(o=>!!o?.[property]||(Array.isArray(o?.['@graph'])&&getAny(o['@graph'],property)));}
function jsShell(html:string,content:string){return (content.length<250&&(/id=["'](?:root|app|__next)["']|data-reactroot|__nuxt|ng-version/i.test(html)||/<script\b/gi.test(html)))||(/enable javascript|loading application/i.test(content.slice(0,300))&&content.length<500);}
export type FetchResult={kind:'ok'|'missing'|'error';text:string;status:number;url:string;contentType:string;bytes:number;indexHeader:string};
async function safeFetch(url:string,signal?:AbortSignal):Promise<FetchResult>{
 try{
  const res=await guardedFetch(url,{method:'GET',maxRedirects:3,timeoutMs:5000,signal,opaqueErrors:true,headers:{'User-Agent':'PromptilaInstantChecker/1.0','Accept':'text/html,text/plain,application/xml;q=0.8,*/*;q=0.1'}});
  const ct=res.headers.get('content-type')||'';
  if(res.status===404||res.status===410){await res.body?.cancel();return {kind:'missing',text:'',status:res.status,url:res.url,contentType:ct,bytes:0,indexHeader:res.headers.get('x-robots-tag')||''};}
  if(!res.ok){await res.body?.cancel();return {kind:'error',text:'',status:res.status,url:res.url,contentType:ct,bytes:0,indexHeader:res.headers.get('x-robots-tag')||''};}
  const body=await readBodyAsText(res,{maxResponseBytes:768*1024});
  return {kind:'ok',text:body,status:res.status,url:res.url,contentType:ct,bytes:Buffer.byteLength(body),indexHeader:res.headers.get('x-robots-tag')||''};
 }catch{return {kind:'error',text:'',status:0,url,contentType:'',bytes:0,indexHeader:''};}
}
function robotAccess(r:FetchResult,agent:string):Verdict{
 if(r.kind==='missing')return 'pass';if(r.kind!=='ok')return 'unverified';
 if(/<html|<!doctype/i.test(r.text)||(/text\/html/i.test(r.contentType)))return 'unverified';
 const groups:Array<{agents:string[];rules:{allow:boolean;path:string}[]}>=[];
 let current:{agents:string[];rules:{allow:boolean;path:string}[]}|null=null;let inRules=false;
 for(const line of r.text.split(/\r?\n/)){const x=line.split('#')[0].trim();const m=x.match(/^([\w-]+)\s*:\s*(.*)$/);if(!m)continue;const key=m[1].toLowerCase(),val=m[2].trim();
  if(key==='user-agent'){if(!current||inRules){current={agents:[],rules:[]};groups.push(current);inRules=false;}current.agents.push(val.toLowerCase());}
  if((key==='allow'||key==='disallow')&&current){inRules=true;if(val)current.rules.push({allow:key==='allow',path:val});}
 }
 const a=agent.toLowerCase();const matched=groups.filter(g=>g.agents.includes(a));const applicable=matched.length?matched:groups.filter(g=>g.agents.includes('*'));
 const rules=applicable.flatMap(g=>g.rules).filter(rule=>rule.path==='/'||rule.path==='/*'||rule.path==='');
 if(!rules.length)return 'pass';
 const max=Math.max(...rules.map(x=>x.path.length));return rules.some(x=>x.path.length===max&&x.allow)?'pass':'fail';
}
export async function scanSite(input:string,fetcher:(url:string)=>Promise<FetchResult>=safeFetch){
 const {host,url}=normalizeSite(input);const began=Date.now();
 const [home,robots,llms]=await Promise.all([fetcher(url),fetcher(url+'robots.txt'),fetcher(url+'llms.txt')]);
 if(home.kind!=='ok'||!home.contentType.includes('html')||!['www.'+host,host,host.replace(/^www\./,'')].includes(new URL(home.url).hostname.toLowerCase()))return {host,url,version:SCORING_VERSION,status:'incomplete',score:null,classification:null,categories:{},estimates:null,crawler:{},checks:[],summary:'The homepage could not be reliably inspected.',duration_ms:Date.now()-began,bytes:home.bytes+robots.bytes+llms.bytes,requests:3,scanned_at:new Date().toISOString()};
 const html=home.text;const body=strip(html);const shell=jsShell(html,body);
 const title=textTag(html,'title'),description=meta(html,'description');
 const h1=[...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)].map(x=>strip(x[1])).filter(Boolean);
 const headings=[...html.matchAll(/<h([1-6])\b[^>]*>/gi)].map(x=>Number(x[1]));
 const ld=ldObjects(html);const canon=canonical(html);const hasScripts=/<script\b/i.test(html);
 const hasAboutLink=/<a\b[^>]*href\s*=\s*["'][^"']*(?:about|company|our-story)[^"']*["']/i.test(html);
 // Discover at most three same-host content pages; only HTML anchor URLs, never arbitrary external links.
 const links=[...html.matchAll(/<a\b[^>]*href\s*=\s*["']([^"']+)["']/gi)].map(x=>x[1]);
 const candidates:string[]=[];for(const x of links){try{const u=new URL(x,home.url);if(u.hostname.toLowerCase()!==host||!['http:','https:'].includes(u.protocol)||u.port||/\/(?:login|account|cart|checkout|search|wp-admin)\b/i.test(u.pathname))continue;if(u.pathname==='/'||candidates.includes(u.origin+u.pathname))continue;if(/about|service|product|company|story/i.test(u.pathname))candidates.push(u.origin+u.pathname);}catch{}if(candidates.length===3)break;}
 const pages=await Promise.all(candidates.map(x=>fetcher(x)));const pageTexts=pages.filter(x=>x.kind==='ok'&&x.contentType.includes('html')).map(x=>strip(x.text));const allText=[body,...pageTexts].join(' ');
 const rootJs=shell&&pageTexts.every(x=>x.length<200);const ch:Check[]=[];
 const add=(category:string,id:string,label:string,points:number,verdict:Verdict,evidence:string)=>ch.push({id,category,label,points,verdict,evidence:evidence.slice(0,250)});
 for(const [agent,n] of [['GPTBot','A1'],['ClaudeBot','A2'],['PerplexityBot','A3'],['Google-Extended','A4']] as const){const v=robotAccess(robots,agent);add('crawler',n,agent+' robots.txt permission',5,v,v==='unverified'?'robots.txt could not be verified':v==='pass'?'No verified block for this agent':'Explicit homepage block detected');}
 add('crawler','A5','Homepage accessible',5,'pass','HTTP '+home.status);
 const schemaStatus=ld.result.length?'pass':(shell?'unverified':'fail');
 add('structured','B1','Valid JSON-LD',5,schemaStatus,ld.invalid?'Some JSON-LD invalid':ld.result.length?'Parsed JSON-LD detected':'No verifiable JSON-LD');
 add('structured','B2','Organization/business schema',5,ld.result.length?(hasType(ld.result,'Organization')||hasType(ld.result,'Business')?'pass':'fail'):schemaStatus,'Business/Organization schema inspection');
 add('structured','B3','Structured name and URL',5,ld.result.length?(getAny(ld.result,'name')&&getAny(ld.result,'url')?'pass':'fail'):schemaStatus,'JSON-LD identity properties');
 add('structured','B4','Website or page schema',5,ld.result.length?(hasType(ld.result,'WebSite')||hasType(ld.result,'WebPage')?'pass':'fail'):schemaStatus,'WebSite/WebPage schema');
 const unknown:Verdict=shell?'unverified':'fail';
 add('semantic','C1','Meaningful HTML title',5,title.length>=12&& !/^(home|welcome|untitled)$/i.test(title)?'pass':'fail',title||'No informative title');
 add('semantic','C2','Meaningful meta description',4,description.length>=50?'pass':'fail',description.slice(0,120)||'Meta description missing/too short');
 add('semantic','C3','Primary H1',5,h1.length===1&&h1[0].length>=5?'pass':unknown,h1.join(' / ')||'No HTML H1 verified');
 add('semantic','C4','Logical heading order',3,headings.length>1?(headings.some((n,i)=>i>0&&n>headings[i-1]+1)?'fail':'pass'):unknown,'HTML headings: '+headings.join(','));
 add('semantic','C5','Readable homepage content',3,body.length>=350?'pass':unknown,'Initial HTML readable text length '+body.length);
 const brandFromTitle=title.split(/[|–—-]/)[0].trim(); const branded=brandFromTitle.length>=3&&brandFromTitle.length<=85;
 add('content','D1','Identifiable business/brand',4,branded?'pass':unknown,brandFromTitle||'Unable to extract business name');
 const serviceWords=/\b(?:services?|products?|we (?:offer|provide|sell|make)|shop|menu|repairs?|installation|plumbing|heating|candy|manufactur(?:ing|e)|specializ(?:e|ing)|our work)\b/i.test(allText);
 add('content','D2','Products/services described',4,serviceWords&&allText.length>=250?'pass':allText.length>250?'unverified':unknown,serviceWords?'Relevant offerings wording detected':'Offering details could not be confidently verified');
 add('content','D3','Company/About content',4,hasAboutLink||candidates.some(c=>/about|company|story/i.test(c))?'pass':unknown,hasAboutLink?'About/company link located':'Not verified in fetched links');
 add('content','D4','Consistent visible brand',3,branded&&allText.toLowerCase().includes(brandFromTitle.toLowerCase())?'pass':unknown,'Title/visible-text brand comparison');
 const validLlms=llms.kind==='ok'&&/text\/plain|text\/markdown/i.test(llms.contentType)&&!/<html|<!doctype/i.test(llms.text)&&llms.text.length>20;
 const lbase:Verdict=llms.kind==='error'?'unverified':validLlms?'pass':'fail';
 add('llms','E1','Valid text llms.txt',5,lbase,llms.kind==='missing'?'File not found':validLlms?'Text file verified':'Unverifiable or HTML response');
 add('llms','E2','llms.txt description',3,lbase==='pass'?(llms.text.replace(/[#*>\-\s]/g,'').length>70?'pass':'fail'):lbase,'Readable description');
 add('llms','E3','llms.txt resource links',2,lbase==='pass'?(/\[[^\]]+\]\(https?:\/\/[^)]+\)/.test(llms.text)?'pass':'fail'):lbase,'Markdown resource links');
 add('technical','F1','HTTPS',3,home.url.startsWith('https://')?'pass':'fail',home.url.startsWith('https://')?'HTTPS response':'HTTP only');
 add('technical','F2','Homepage HTTP success',3,'pass','HTTP '+home.status);
 let canonicalOk=false;try{canonicalOk=!!canon&&new URL(canon,home.url).hostname===host;}catch{}
 add('technical','F3','Canonical URL',2,canonicalOk?'pass':'fail',canon||'No canonical');
 const indexingSignals=[meta(html,'robots'),home.indexHeader].filter(Boolean).join(' | ');
 add('technical','F4','No homepage noindex directive',2,/noindex/i.test(indexingSignals)?'fail':'pass',indexingSignals||'No HTML or HTTP noindex found');
 const categories:Record<string,{earned:number;max:number;unverified:number}>={};for(const [k,max] of Object.entries(WEIGHTS)){const v=ch.filter(c=>c.category===k);categories[k]={earned:v.filter(x=>x.verdict==='pass').reduce((s,x)=>s+x.points,0),max,unverified:v.filter(x=>x.verdict==='unverified').reduce((s,x)=>s+x.points,0)};}
 const provisional=ch.some(x=>x.verdict==='unverified')||rootJs;const score=provisional?null:ch.filter(c=>c.verdict==='pass').reduce((s,c)=>s+c.points,0);
 const estimates=score===null?null:Object.fromEntries(Object.entries(ENGINES).map(([engine,weights])=>[engine,Math.round(weights.reduce((s,w,i)=>s+w*categories[CATS[i]].earned/categories[CATS[i]].max,0))]));
 const classification=score===null?null:score<40?'Needs Work':score<70?'Getting There':score<90?'Strong':'Excellent';
 return {host,url,version:SCORING_VERSION,status:provisional?'incomplete':'complete',score,classification,categories,estimates,crawler:{GPTBot:robotAccess(robots,'GPTBot'),ClaudeBot:robotAccess(robots,'ClaudeBot'),PerplexityBot:robotAccess(robots,'PerplexityBot'),'Google-Extended':robotAccess(robots,'Google-Extended')},checks:ch,summary:provisional?'Some website information could not be verified. JavaScript-rendered content or unavailable resources may require a separate inspection.':'Website-readiness results are based on observed technical signals; no AI recommendation service was queried.',duration_ms:Date.now()-began,bytes:[home,robots,llms,...pages].reduce((s,x)=>s+x.bytes,0),requests:3+pages.length,scanned_at:new Date().toISOString(),javascript_suspected:hasScripts&&shell};
}
