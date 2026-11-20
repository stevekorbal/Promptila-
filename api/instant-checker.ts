import type { VercelRequest,VercelResponse } from '@vercel/node';
import { createHash } from 'node:crypto';
import http from 'node:http';
import https from 'node:https';
import {lookup} from 'node:dns/promises';
import {BlockList,isIP} from 'node:net';
import {createGunzip,createInflate,createBrotliDecompress} from 'node:zlib';
import {performance} from 'node:perf_hooks';
import {Transform,Writable} from 'node:stream';
import {pipeline} from 'node:stream/promises';
// integrated api/_lib/instant-network.ts

const denied=new BlockList();
for(const [address,prefix] of [
 ['0.0.0.0',8],['10.0.0.0',8],['100.64.0.0',10],['127.0.0.0',8],
 ['169.254.0.0',16],['172.16.0.0',12],['192.0.0.0',24],['192.0.2.0',24],
 ['192.88.99.0',24],['192.168.0.0',16],['198.18.0.0',15],
 ['198.51.100.0',24],['203.0.113.0',24],['224.0.0.0',4],['240.0.0.0',4]
] as const)denied.addSubnet(address,prefix,'ipv4');

const MAX_WIRE=2_500_000;
const MAX_INFLATED=4_000_000;
const MAX_CAPTURE=1_800_000;
const TOTAL_BUDGET=23_000;

function publicIPv4(address:string){return isIP(address)===4&&!denied.check(address,'ipv4');}
function validateWebsite(value:unknown):URL{
 if(typeof value!=='string'||value.length>2048||/[\s\x00-\x1f]/.test(value))throw Error('Invalid public website URL');
 const candidate=/^https?:\/\//i.test(value)?value:'https://'+value;
 const url=new URL(candidate);
 if(!['https:','http:'].includes(url.protocol)||url.username||url.password||url.port||url.search||url.hash)throw Error('Only a public website URL is accepted');
 const host=url.hostname.toLowerCase().replace(/\.$/,'');
 if(!host.includes('.')||isIP(host)||host.endsWith('.local')||host.endsWith('.internal')||host.length>253||!/^[a-z0-9.-]+$/.test(host))throw Error('Public DNS name required');
 if(host.split('.').some(x=>!x||x.length>63||x.startsWith('-')||x.endsWith('-')))throw Error('Invalid DNS name');
 url.hostname=host;url.pathname='/';url.search='';url.hash='';
 return url;
}
type PageResponse={
 url:string;status:number;type:string;body:string;bytes:number;wire_bytes?:number;
 decompressed_bytes?:number;truncated?:boolean;headers:Record<string,string>;
 reason?:string;redirects?:number;
};
type FetchOptions={userAgent?:string;maxCapture?:number;deadline?:number;stopAfterCapture?:boolean};
async function safeFetch(url:URL,start:number,redirects=0,options:FetchOptions={}):Promise<PageResponse>{
 if(redirects>3)throw Error('redirect_limit');
 if(performance.now()-start>(options.deadline??TOTAL_BUDGET))throw Error('scan_deadline');
 if(!['https:','http:'].includes(url.protocol)||url.port||url.username||url.password||isIP(url.hostname))throw Error('unsafe_destination');
 if(url.href.length>2100)throw Error('url_too_long');
 const addresses=await lookup(url.hostname,{all:true,family:4,verbatim:true});
 if(!addresses.length||addresses.some(x=>!publicIPv4(x.address)))throw Error('destination_not_public_ipv4');
 const pinned=addresses[0].address;
 const timeout=Math.min(6500,Math.max(500,(options.deadline??TOTAL_BUDGET)-(performance.now()-start)));
 return await new Promise<PageResponse>((resolve,reject)=>{
  let settled=false;
  const finish=(fn:()=>void)=>{if(!settled){settled=true;fn();}};
  const transport=url.protocol==='https:'?https:http;
  const req=transport.request({
   hostname:url.hostname,port:url.protocol==='https:'?443:80,protocol:url.protocol,
   path:url.pathname+url.search,method:'GET',family:4,agent:false,
   lookup:(_hostname,_opts,cb)=>cb(null,pinned,4),
   headers:{
    'user-agent':options.userAgent||'PromptilaInstantChecker/1.1 (+https://www.promptila.com)',
    accept:'text/html,text/plain,application/json,*/*;q=0.5',
    'accept-encoding':'gzip, deflate, br, identity'
   },timeout
  },async res=>{
   const code=res.statusCode||0;
   if([301,302,303,307,308].includes(code)){
    const location=res.headers.location;res.resume();
    if(!location)return finish(()=>reject(Error('redirect_without_location')));
    let target:URL;
    try{target=new URL(location,url);}catch{return finish(()=>reject(Error('invalid_redirect')));}
    if(!['http:','https:'].includes(target.protocol)||target.port||target.username||target.password||isIP(target.hostname))
     return finish(()=>reject(Error('unsafe_redirect')));
    return safeFetch(target,start,redirects+1,options).then(data=>finish(()=>resolve(data)),error=>finish(()=>reject(error)));
   }
   const encoding=String(res.headers['content-encoding']||'identity').toLowerCase().trim();
   const type=String(res.headers['content-type']||'').toLowerCase();
   let unzip:Transform|undefined;
   if(encoding==='gzip')unzip=createGunzip();
   else if(encoding==='deflate')unzip=createInflate();
   else if(encoding==='br')unzip=createBrotliDecompress();
   else if(encoding!=='identity'&&encoding!=='')return finish(()=>reject(Error('unsupported_encoding')));
   let wireBytes=0,inflatedBytes=0,capturedBytes=0,wasTruncated=false;
   const chunks:Buffer[]=[];
   const cap=Math.min(options.maxCapture??MAX_CAPTURE,MAX_CAPTURE);
   let exceeded=false,stoppedAtCapture=false;
   const wireMeter=new Transform({transform(chunk:Buffer,_enc,callback){
    wireBytes+=chunk.length;
    if(wireBytes>MAX_WIRE){exceeded=true;callback(Error('wire_limit'));return;}
    callback(null,chunk);
   }});
   const sink=new Writable({write(chunk:Buffer,_enc,callback){
    inflatedBytes+=chunk.length;
    if(inflatedBytes>MAX_INFLATED){exceeded=true;callback(Error('decompression_limit'));return;}
    const available=cap-capturedBytes;
    if(available>0){
     const kept=chunk.subarray(0,Math.min(available,chunk.length));
     chunks.push(kept);capturedBytes+=kept.length;
    }
    if(inflatedBytes>=cap){
     wasTruncated=true;
     if(options.stopAfterCapture){stoppedAtCapture=true;callback(Error('capture_limit'));return;}
    }
    callback();
   }});
   try{
    if(unzip)await pipeline(res,wireMeter,unzip,sink);
    else await pipeline(res,wireMeter,sink);
   }catch(error:any){
    if(!exceeded&&!stoppedAtCapture)return finish(()=>reject(Error('stream_error:'+String(error?.code||error?.message||'unknown').slice(0,80))));
    wasTruncated=true;
   }
   let body=Buffer.concat(chunks).toString('utf8');
   // Avoid treating a severed tag as complete evidence.
   if(wasTruncated&&type.includes('html')){const last=body.lastIndexOf('>');body=last<0?'':body.slice(0,last+1);}
   finish(()=>resolve({
    url:url.href,status:code,type,body,bytes:capturedBytes,wire_bytes:wireBytes,
    decompressed_bytes:inflatedBytes,truncated:wasTruncated,
    headers:{'x-robots-tag':String(res.headers['x-robots-tag']||''),'content-type':type},
    reason:wasTruncated?'bounded_partial_response':undefined,redirects
   }));
  });
  req.on('timeout',()=>req.destroy(Error('request_timeout')));
  req.on('error',error=>finish(()=>reject(error)));
  req.end();
 });
}


// integrated api/_lib/instant-evidence.ts
// Bounded HTML tokenizer: no scripting, no DOM/browser, no remote dependencies.
// Extracts only explicit evidence; never infers missing fields from a truncated document.
type Evidence={
 title:string;description:string;h1:string[];headings:number[];text:string;
 canonical:string;noindex:boolean;aboutLinks:string[];schema:any[];
 ogName:string;siteName:string;services:string[];jsonErrors:number;
 appData:string[];truncated:boolean;hasDocumentEnd:boolean;jsShell:boolean;
};
function decode(input:string){
 return input.replace(/&(#x[0-9a-f]+|#[0-9]+|amp|lt|gt|quot|apos|nbsp);/gi,(_all,s:string)=>{
  const k=s.toLowerCase();
  if(k[0]==='#'){let n=Number.parseInt(k[1]==='x'?k.slice(2):k.slice(1),k[1]==='x'?16:10);
   return Number.isFinite(n)&&n>=32&&n<=0x10ffff?String.fromCodePoint(n):' ';}
  return ({amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' '} as Record<string,string>)[k]||' ';
 });
}
function attrs(input:string):Record<string,string>{
 const result:Record<string,string>={};
 const re=/([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
 for(const match of input.matchAll(re)){
  const name=match[1].toLowerCase();
  if(name&&!Object.hasOwn(result,name))result[name]=decode(match[2]??match[3]??match[4]??'');
 }
 return result;
}
function values(node:any,results:string[],depth=0){
 if(results.length>=60||depth>12||node===null)return;
 if(typeof node==='string')return;
 if(Array.isArray(node)){node.slice(0,30).forEach(x=>values(x,results,depth+1));return;}
 if(typeof node!=='object')return;
 for(const [key,value] of Object.entries(node)){
  if(['description','name','headline','category','serviceType','productType','disambiguatingDescription'].includes(key)&&typeof value==='string'&&value.trim().length>14){
   results.push(value.slice(0,400));
  }
  if(value&&typeof value==='object')values(value,results,depth+1);
 }
}
function parseHtml(html:string,truncated=false):Evidence{
 const result:Evidence={title:'',description:'',h1:[],headings:[],text:'',canonical:'',noindex:false,aboutLinks:[],
  schema:[],ogName:'',siteName:'',services:[],jsonErrors:0,appData:[],truncated,hasDocumentEnd:false,jsShell:false};
 const parts:string[]=[];
 let pointer=0,skip='',capture='',buffer='',activeAttrs:Record<string,string>={},scriptType='';
 const pushText=(value:string)=>{
  const cleaned=decode(value).replace(/\s+/g,' ').trim();
  if(cleaned&&parts.join(' ').length<24000)parts.push(cleaned.slice(0,4000));
 };
 while(pointer<html.length){
  const open=html.indexOf('<',pointer);
  if(open<0){if(!truncated)consume(html.slice(pointer));break;}
  consume(html.slice(pointer,open));
  if(html.startsWith('<!--',open)){
   const end=html.indexOf('-->',open+4);if(end<0)break;pointer=end+3;continue;
  }
  // Find closing > without interpreting > inside quotes.
  let end=open+1,quote='';
  for(;end<html.length;end++){
   const c=html[end];if(quote){if(c===quote)quote='';}
   else if(c==='"'||c==="'")quote=c;else if(c==='>')break;
  }
  if(end>=html.length)break;
  const token=html.slice(open+1,end);
  const tagMatch=/^\s*(\/?)\s*([a-zA-Z][\w:-]*)/.exec(token);
  pointer=end+1;
  if(!tagMatch)continue;
  const closing=!!tagMatch[1],tag=tagMatch[2].toLowerCase();
  if(closing){
   if(tag==='html')result.hasDocumentEnd=true;
   if(tag===capture){
    const value=decode(buffer).replace(/\s+/g,' ').trim();
    if(tag==='title')result.title=value.slice(0,300);
    if(/^h[1-6]$/.test(tag)&&value&&tag==='h1')result.h1.push(value.slice(0,250));
    capture='';buffer='';
   }
   if(tag===skip){skip='';scriptType='';}
   continue;
  }
  if(skip)continue;
  const a=attrs(token.slice(tagMatch[0].length));
  if(tag==='script'){
   const type=(a.type||'').toLowerCase();
   // Capture entire script body without executing it.
   const endScript=html.toLowerCase().indexOf('</script',pointer);
   if(endScript<0){skip='script';continue;}
   const body=html.slice(pointer,endScript);
   const scriptEnd=html.indexOf('>',endScript);
   pointer=scriptEnd<0?html.length:scriptEnd+1;
   if(type==='application/ld+json'){
    try{result.schema.push(JSON.parse(body.trim()));}catch{result.jsonErrors++;}
   }else if(a.id==='__NEXT_DATA__'||type==='application/json'){
    try{
     const node=JSON.parse(body.trim());
     values(node,result.appData);
    }catch{result.jsonErrors++;}
   }
   continue;
  }
  if(['style','noscript','template','svg'].includes(tag)){skip=tag;continue;}
  if(tag==='title'||/^h[1-6]$/.test(tag)){capture=tag;buffer='';if(tag!=='title')result.headings.push(Number(tag[1]));}
  if(tag==='meta'){
   const name=(a.name||a.property||'').toLowerCase(),value=a.content||'';
   if(name==='description')result.description=value.slice(0,500);
   if(name==='og:site_name')result.ogName=value.slice(0,200);
   if((name==='robots'||name==='googlebot')&&/\bnoindex\b/i.test(value))result.noindex=true;
  }
  if(tag==='link'&&(a.rel||'').toLowerCase().split(/\s+/).includes('canonical'))result.canonical=a.href||'';
  if(tag==='a'&&a.href&&/about|our-story|company|who-we-are/i.test(a.href))result.aboutLinks.push(a.href.slice(0,300));
  if(tag==='html'&&a['data-reactroot']!==undefined)result.jsShell=true;
  if(tag==='div'&&['root','app','__next'].includes(a.id||''))result.jsShell=true;
 }
 function consume(value:string){
  if(skip)return;
  if(capture){buffer+=value.slice(0,4000);return;}
  pushText(value);
 }
 result.text=parts.join(' ').slice(0,24000);
 const hints=[result.description,result.title,result.ogName,...result.appData].filter(Boolean);
 result.siteName=(result.ogName||result.title.split(/[|–—]/).pop()||'').trim().slice(0,160);
 result.services=hints.filter(s=>/(\bwe\b|\bour\b|provides?|offers?|specializ|manufacturer|retail|service|shop|plumb|hvac|candy|store)/i.test(s)&&s.length>30).slice(0,12);
 // JS dependency needs both shell markers and actual lack of visible content.
 result.jsShell=result.jsShell&&result.text.length<350&&result.h1.length===0;
 return result;
}
function schemaNodes(raw:any[]):any[]{
 const out:any[]=[];
 const visit=(x:any,depth=0,inheritedContext:any=null)=>{
  if(depth>8||out.length>=100||!x)return;
  if(Array.isArray(x))return x.slice(0,100).forEach(y=>visit(y,depth+1,inheritedContext));
  if(typeof x!=='object')return;
  const context=x['@context']||inheritedContext;
  if(x['@type'])out.push(context&&!x['@context']?{...x,'@context':context}:x);
  if(x['@graph'])visit(x['@graph'],depth+1,context);
 };
 raw.forEach(x=>visit(x));return out;
}
function schemaHasType(n:any,needle:string){
 const t=n?.['@type'];return (Array.isArray(t)?t:[t]).some((v:any)=>typeof v==='string'&&(v.toLowerCase()===needle.toLowerCase()||needle==='LocalBusiness'&&/business|plumber|store|restaurant|contractor|hvac/i.test(v)));
}


// integrated api/_lib/instant-crawlers.ts
type RobotsVerdict='allowed'|'blocked'|'unverified';
const ROBOTS_AGENTS=['GPTBot','OAI-SearchBot','ChatGPT-User','ClaudeBot','Claude-Web','Google-Extended','PerplexityBot'] as const;
type Group={agents:string[];rules:{allow:boolean;pattern:string}[]};
function robotsPermission(body:string,agent:string,path='/'):RobotsVerdict{
 const groups:Group[]=[];let group:Group|null=null;
 for(const original of body.replace(/^\uFEFF/,'').split(/\r?\n/)){
  const line=original.split('#')[0].trim();
  const m=/^(user-agent|allow|disallow)\s*:\s*(.*)$/i.exec(line);
  if(!m)continue;
  const kind=m[1].toLowerCase(),value=m[2].trim();
  if(kind==='user-agent'){
   if(!value)return 'unverified';
   if(!group||group.rules.length){group={agents:[],rules:[]};groups.push(group);}
   group.agents.push(value.toLowerCase());
  }else if(group&&value)group.rules.push({allow:kind==='allow',pattern:value});
 }
 const named=groups.filter(g=>g.agents.includes(agent.toLowerCase()));
 const matching=named.length?named:groups.filter(g=>g.agents.includes('*'));
 if(!matching.length)return 'allowed';
 const rules=matching.flatMap(x=>x.rules);
 const relevant:{rule:typeof rules[number];length:number}[]=[];
 for(const rule of rules){
  if(!rule.pattern.startsWith('/')&&!rule.pattern.startsWith('*'))continue;
  const escaped=rule.pattern.replace(/[|\\{}()[\]^$+?.]/g,'\\$&').replace(/\*/g,'.*');
  const end=escaped.endsWith('\\$')?'$':'';
  const pat=end?escaped.slice(0,-2):escaped;
  let re:RegExp;
  try{re=new RegExp('^'+pat+end);}catch{return 'unverified';}
  if(re.test(path))relevant.push({rule,length:Buffer.byteLength(rule.pattern.replace(/[*$]/g,''))});
 }
 if(!relevant.length)return 'allowed';
 relevant.sort((a,b)=>b.length-a.length||Number(b.rule.allow)-Number(a.rule.allow));
 return relevant[0].rule.allow?'allowed':'blocked';
}
function classifyProbe(status:number,contentType:string,body:string,truncated:boolean){
 if([401,403,407,429].includes(status))return {status:'blocked',reason:'http_'+status,evidence:'HTTP status '+status};
 if(status!==200)return {status:'unverified',reason:'http_'+status,evidence:'HTTP status '+status};
 if(!contentType.includes('html'))return {status:'unverified',reason:'non_html_response',evidence:contentType.slice(0,90)};
 // Ignore script and style contents so challenge libraries or marketing copy don't trigger false alarms.
 const title=(body.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1]||'').replace(/<[^>]*>/g,' ').trim();
 const visible=body.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ')
  .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ').replace(/<!--[\s\S]*?-->/g,' ')
  .replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
 const heading=(body.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1]||'').replace(/<[^>]*>/g,' ').trim();
 const challengeTitle=/^(just a moment|attention required|access denied|verify you are human|security check|robot check|checking your browser)/i.test(title);
 const challengeHeading=/^(verify you are human|checking your browser|access denied|security verification|complete the captcha)/i.test(heading);
 const challengeDominates=/verify you are human|checking your browser|please complete the security check|your request has been blocked/i.test(visible.slice(0,700))&&visible.length<1800;
 if(challengeTitle||challengeHeading||challengeDominates)
  return {status:'challenge',reason:'verified_interstitial_markers',evidence:'Challenge title, primary heading or dominant interstitial text'};
 // HTML byte size alone does not prove useful content: require readable content and site markup.
 const substantive=(visible.length>=200&&
  (/<(?:main|article|h1|h2|nav)\b/i.test(body)||/<meta\b[^>]*name=["']description["']/i.test(body)));
 if(!substantive)return {status:'unverified',
  reason:truncated?'truncated_unverified_content':'insufficient_semantic_content',
  evidence:'No sufficiently readable HTML and semantic elements'};
 return {status:'accessible',reason:truncated?'meaningful_bounded_html':'meaningful_html',
  evidence:'HTTP 200, '+visible.length+' readable characters and semantic elements'};
}
const PROBE_AGENTS=[
 {name:'GPTBot',value:'Mozilla/5.0 (compatible; GPTBot/1.3; +https://openai.com/gptbot)'},
 {name:'Googlebot',value:'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'},
 {name:'ClaudeBot',value:'ClaudeBot/1.0 (+https://www.anthropic.com/claude-bot)'},
 {name:'PerplexityBot',value:'PerplexityBot/1.0 (+https://perplexity.ai/perplexitybot)'}
] as const;


// integrated api/_lib/instant-validation.ts
// Evidence-based JSON-LD validation. Each check depends on related properties within
// the same typed entity, not on keywords or properties elsewhere in the graph.
const BUSINESS_TYPES=new Set(['organization','localbusiness','store','plumber','hvacbusiness','homeandconstructionbusiness','professionalservice','corporation','restaurant','bakery','roofingcontractor','electrician','generalcontractor','automotiverepair','foodestablishment']);
const PAGE_TYPES=new Set(['website','webpage','aboutpage','contactpage','collectionpage','service','product','itempage']);
function types(n:any):string[]{
 const raw=n?.['@type'];return (Array.isArray(raw)?raw:[raw]).filter((x:any)=>typeof x==='string').map((x:string)=>x.split(/[\/#]/).pop()!.toLowerCase());
}
function asName(x:any):string{
 if(typeof x==='string')return x.trim();
 if(x&&typeof x==='object'&&typeof x.name==='string')return x.name.trim();
 return '';
}
function normalizedHost(input:string):string|null{
 try{
  const u=new URL(input);
  if(!['https:','http:'].includes(u.protocol)||u.username||u.password||u.port)return null;
  return u.hostname.toLowerCase().replace(/^www\./,'').replace(/\.$/,'');
 }catch{return null;}
}
function sameSiteUrl(input:any,site:URL):boolean{
 if(typeof input!=='string')return false;
 return normalizedHost(input)===site.hostname.toLowerCase().replace(/^www\./,'');
}
function validContext(n:any){
 const ctx=n?.['@context'];
 const list=Array.isArray(ctx)?ctx:[ctx];
 return list.some((x:any)=>typeof x==='string'&&/^https?:\/\/schema\.org\/?$/i.test(x));
}
function entityName(n:any){return asName(n?.name).length>=3&&!/^(home|welcome|website)$/i.test(asName(n?.name));}
function validateStructuredData(nodes:any[],site:URL){
 const contextual=nodes.filter(n=>n&&typeof n==='object'&&
  (validContext(n)||typeof n['@type']==='string'&&n['@type'].startsWith('https://schema.org/')));
 // For @graph nodes whose context is on the wrapper, the graph parser should propagate it.
 const business=contextual.filter(n=>types(n).some(t=>BUSINESS_TYPES.has(t)||
  (t.endsWith('business')&&t.length>8)));
 const relevantBusiness=business.filter(n=>sameSiteUrl(n.url,site)&&entityName(n));
 const pages=contextual.filter(n=>types(n).some(t=>PAGE_TYPES.has(t))&&
  (sameSiteUrl(n.url,site)||sameSiteUrl(n['@id'],site)||
   sameSiteUrl(n.mainEntityOfPage,site)||sameSiteUrl(n.isPartOf?.['@id'],site)));
 return {
  valid:contextual.length>0,
  business:business.some(n=>entityName(n)&&sameSiteUrl(n.url,site)),
  identity:relevantBusiness.length>0,
  page:pages.length>0,
  businessName:asName(relevantBusiness[0]?.name),
  businessDescription:typeof relevantBusiness[0]?.description==='string'?relevantBusiness[0].description:'',
  businessUrl:typeof relevantBusiness[0]?.url==='string'?relevantBusiness[0].url:'',
  evidence:{typedNodes:contextual.length,matchedBusiness:relevantBusiness.length,
   matchedPage:pages.length}
 };
}
function validateCanonical(canonical:string,site:URL,finalPageUrl?:string){
 if(!canonical.trim())return {valid:false,reason:'canonical_missing'};
 try{
  const u=new URL(canonical,site);
  if(!['https:','http:'].includes(u.protocol)||u.username||u.password||u.port||u.search||u.hash)
   return {valid:false,reason:'invalid_canonical_attributes'};
  const requestedHost=site.hostname.toLowerCase().replace(/^www\./,'');
  const targetHost=u.hostname.toLowerCase().replace(/^www\./,'');
  if(targetHost!==requestedHost)return {valid:false,reason:'unrelated_canonical_host'};
  const landingPath=finalPageUrl?new URL(finalPageUrl).pathname:site.pathname;
  if(u.pathname!=='/'&&u.pathname!==landingPath)return {valid:false,reason:'canonical_not_homepage_or_final_landing_page'};
  if(site.protocol==='https:'&&u.protocol!=='https:')return {valid:false,reason:'downgraded_canonical'};
  return {valid:true,reason:u.pathname===landingPath&&landingPath!=='/'?'matching_redirected_landing_page':u.hostname===site.hostname?'matching_homepage':'equivalent_www_homepage'};
 }catch{return {valid:false,reason:'invalid_canonical_url'};}
}


// integrated api/_lib/instant-checker.ts

type Verdict='pass'|'fail'|'unverified';
type Check={id:string;category:string;label:string;points:number;status:Verdict;evidence:string};
type Score={score:number|null;status:'complete'|'incomplete';classification:string|null;
 categories:Record<string,{score:number|null;max:number;verified:number;total:number}>;
 engines:Record<string,number|null>;crawlerAccess:Record<string,string>};
const GROUPS=[
 ['AI crawler access',25],['Structured data',20],['Semantic structure',20],
 ['Content and entity signals',15],['llms.txt',10],['Technical health',10]
] as const;
const WEIGHTS:Record<string,number[]>={ChatGPT:[30,20,15,20,5,10],
 Gemini:[25,20,20,20,5,10],Claude:[30,15,20,20,5,10],Perplexity:[30,15,20,20,5,10]};
function calculate(checks:Check[]):Score{
 const categories:Score['categories']={};let complete=true;let total=0;
 for(const [name,max] of GROUPS){
  const relevant=checks.filter(x=>x.category===name),verified=relevant.filter(x=>x.status!=='unverified');
  const pts=verified.reduce((sum,x)=>sum+(x.status==='pass'?x.points:0),0);
  const known=relevant.length>0&&relevant.length===verified.length;
  if(!known)complete=false;
  categories[name]={score:known?pts:null,max,verified:verified.length,total:relevant.length};
  total+=pts;
 }
 const engines:Record<string,number|null>={};
 for(const [name,w] of Object.entries(WEIGHTS)){
  engines[name]=complete?Math.round(w.reduce((sum,pct,i)=>sum+pct*(categories[GROUPS[i][0]].score||0)/GROUPS[i][1],0)):null;
 }
 const score=complete?total:null;
 const classification=score===null?null:score<40?'Needs Work':score<70?'Getting There':score<90?'Strong':'Excellent';
 const crawlerAccess:Record<string,string>={};
 for(const [engine,id] of [['ChatGPT','A1'],['Claude','A2'],['Perplexity','A3'],['Gemini / Google-Extended','A4']]){
  const c=checks.find(x=>x.id===id);
  crawlerAccess[engine]=c?.status==='pass'?'Allowed':c?.status==='fail'?'Blocked':'Unverified';
 }
 return {score,status:complete?'complete':'incomplete',classification,categories,engines,crawlerAccess};
}
type Fetcher=(url:URL,start:number,redirects?:number,options?:FetchOptions)=>Promise<PageResponse>;
const categoryNames=GROUPS.map(x=>x[0]);
function identifiableBrand(value:string):boolean{
 const v=value.trim();return v.length>=3&&v.length<160&&!/^(home|welcome|untitled|website|index|just a moment|attention required)$/i.test(v);
}
function usableHtml(page:PageResponse|null):page is PageResponse{
 if(!page||page.status<200||page.status>=300||!page.type.includes('html'))return false;
 const title=(page.body.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]||'').trim();
 return !/^(just a moment|checking your browser|verify you are human|access denied|attention required)/i.test(title);
}
function safeSameSite(candidate:string,base:URL):URL|null{
 try{
  const u=new URL(candidate,base);
  if(u.hostname!==base.hostname||u.port||u.username||u.password||u.search||u.hash||u.pathname.length>130)return null;
  if(!['http:','https:'].includes(u.protocol))return null;
  return u;
 }catch{return null;}
}
function schemaName(nodes:any[]):string{
 return nodes.map(n=>typeof n?.name==='string'?n.name:'').find(x=>identifiableBrand(x))||'';
}
function schemaDescription(nodes:any[]):string{
 return nodes.map(n=>typeof n?.description==='string'?n.description:'').find(x=>x.trim().length>35)||'';
}
function evidenceReason(page:PageResponse|null,error:string|undefined,subject:string){
 if(error)return subject+': '+error;
 if(!page)return subject+' not retrieved';
 return subject+': HTTP '+page.status+(page.truncated?' (bounded partial content)':'');
}

async function scanWebsite(raw:unknown,fetcher:Fetcher=safeFetch){
 const url=validateWebsite(raw),started=performance.now();
 const checks:Check[]=[];
 const errors:Record<string,string>={};
 const networkEvents:{path:string;user_agent:string;status?:number;reason?:string;wire_bytes?:number;decompressed_bytes?:number;truncated?:boolean}[]=[];
 function add(id:string,category:string,label:string,points:number,status:Verdict,evidence:string){
  checks.push({id,category,label,points,status,evidence:evidence.slice(0,240)});
 }
 async function fetchOne(path:string,agent?:string):Promise<PageResponse|null>{
  let target:URL;
  try{target=new URL(path,url);}catch{errors[path]='invalid_url';return null;}
  const key=path+(agent?'#'+agent:'');
  try{
   const page=await fetcher(target,started,0,agent?{userAgent:agent,maxCapture:120_000,deadline:23_000,stopAfterCapture:true}:undefined);
   networkEvents.push({path,user_agent:agent||'Promptila',status:page.status,reason:page.reason,
    wire_bytes:page.wire_bytes??page.bytes,decompressed_bytes:page.decompressed_bytes??page.bytes,truncated:!!page.truncated});
   return page;
  }catch(e:any){
   const reason=String(e?.code||e?.message||'network_error').slice(0,120);
   errors[key]=reason;
   networkEvents.push({path,user_agent:agent||'Promptila',reason});
   return null;
  }
 }
 // Bounded parallel fetches: home/robots/llms plus four user-agent probes.
 const jobs=[fetchOne('/'),fetchOne('/robots.txt'),fetchOne('/llms.txt'),
  ...PROBE_AGENTS.map(probe=>fetchOne('/',probe.value))];
 const [home,robots,llms,...probePages]=await Promise.all(jobs);
 const htmlAvailable=usableHtml(home),evidence:Evidence=htmlAvailable?
  parseHtml(home.body,!!home.truncated):parseHtml('',true);
 const nodes=schemaNodes(evidence.schema);
 const htmlFinal=htmlAvailable&&!home.truncated;
 const title=evidence.title,description=evidence.description;
 const bodyReadable=evidence.text.length>=300||evidence.appData.join(' ').length>=300;
 const jsDependent=evidence.jsShell||(htmlAvailable&&!bodyReadable&&(home?.body.match(/<script\b/gi)||[]).length>=2);
 const absent=(confirmed:boolean):Verdict=>confirmed?'fail':'unverified';
 const contentMissing=(found:boolean):Verdict=>found?'pass':absent(htmlFinal&&!jsDependent);
 const effectiveRobots=robots?.status===200&&!robots.type.includes('html')&&!/^\s*</.test(robots.body)&&!robots.truncated;
 const robotsAbsent=robots&&[404,410].includes(robots.status);
 const robotsRules:Record<string,string>={};
 for(const agent of ROBOTS_AGENTS){
  robotsRules[agent]=effectiveRobots?robotsPermission(robots!.body,agent):robotsAbsent?'allowed':'unverified';
 }
 for(const [id,agent,label] of [
  ['A1','GPTBot','ChatGPT / GPTBot'],['A2','ClaudeBot','Claude / ClaudeBot'],
  ['A3','PerplexityBot','Perplexity / PerplexityBot'],
  ['A4','Google-Extended','Gemini / Google-Extended']
 ]){
  const result=robotsRules[agent];
  add(id,'AI crawler access',label,5,
   result==='allowed'?'pass':result==='blocked'?'fail':'unverified',
   effectiveRobots?agent+' robots.txt rule: '+result:robotsAbsent?'robots.txt absent; no declared restrictions':evidenceReason(robots,errors['/robots.txt'],'robots.txt'));
 }
 add('A5','AI crawler access','Homepage fetchable',5,
  htmlAvailable?'pass':(home as PageResponse|null)&&[401,403,404,410].includes((home as PageResponse).status)?'fail':'unverified',
  evidenceReason(home,errors['/'],'Homepage'));

 // Typed, same-site JSON-LD evidence; avoid unrelated name/URL pairs.
 const structured=validateStructuredData(nodes,url);
 const companyNodes=nodes.filter(n=>n&&typeof n==='object'&&n['@type']&&n.name);
 add('B1','Structured data','Valid JSON-LD',5,
  structured.valid?'pass':contentMissing(false),
  structured.valid?structured.evidence.typedNodes+' typed schema.org nodes':'No valid typed schema.org node verified');
 add('B2','Structured data','Business or organization schema',5,
  structured.business?'pass':contentMissing(false),
  structured.business?'Business entity linked to audited hostname':'No matching business entity verified');
 add('B3','Structured data','Business name and URL in schema',5,
  structured.identity?'pass':contentMissing(false),
  structured.identity?'Name '+structured.businessName.slice(0,80)+' and URL '+structured.businessUrl.slice(0,110)+' on same typed entity':'Coherent identity/name/URL pair not verified');
 add('B4','Structured data','WebSite or relevant page schema',5,
  structured.page?'pass':contentMissing(false),
  structured.page?'Page/site typed node linked to audited hostname':'Site/page entity relationship not verified');

 add('C1','Semantic structure','Descriptive page title',5,
  title.length>=12&&!/^(home|index|untitled)$/i.test(title)?'pass':contentMissing(false),
  title||'Title not found in response');
 add('C2','Semantic structure','Meta description',4,description.length>=40?'pass':contentMissing(false),
  description.slice(0,150)||'Description not found in response');
 add('C3','Semantic structure','Primary H1 heading',5,evidence.h1.length===1?'pass':
  evidence.h1.length>1&&htmlFinal?'fail':contentMissing(false),
  evidence.h1.length?evidence.h1.length+' H1 heading(s)':'No confirmed H1 in collected HTML');
 add('C4','Semantic structure','Heading hierarchy',3,
  evidence.headings.length>0&&evidence.headings.every((h,i)=>i===0||h<=evidence.headings[i-1]+1)?'pass':
  contentMissing(false),evidence.headings.length?'Heading levels inspected':'Rendered heading structure unavailable');
 add('C5','Semantic structure','Readable page content',3,
  evidence.text.length>=300?'pass':contentMissing(false),
  evidence.text.length+' visible-text characters; '+(evidence.truncated?'partial fetch':'bounded HTML'));

 const headlineBrand=evidence.title.split(/[|–—]/)[0]?.trim()||'';
 const hostKey=url.hostname.toLowerCase().replace(/^www\./,'').split('.')[0].replace(/[^a-z0-9]/g,'');
 const brandKey=(value:string)=>value.toLowerCase().replace(/\b(company|llc|incorporated|inc|ltd|the)\b/g,'').replace(/[^a-z0-9]/g,'');
 const titleConfirmed=identifiableBrand(headlineBrand)&&brandKey(headlineBrand).length>=4&&
  (hostKey.includes(brandKey(headlineBrand))||
   (brandKey(headlineBrand).length>=6&&brandKey(headlineBrand).includes(hostKey)));
 const ogConfirmed=identifiableBrand(evidence.ogName)&&
  (evidence.title.toLowerCase().includes(evidence.ogName.toLowerCase())||
   hostKey.includes(brandKey(evidence.ogName)));
 const strongBrand=structured.businessName||(ogConfirmed?evidence.ogName:'')||
  (titleConfirmed?headlineBrand:'');
 const serviceText=structured.businessDescription||evidence.services.find(x=>x.length>=40)||'';
 const brandInText=strongBrand&&(
  (description+' '+evidence.text+' '+evidence.appData.join(' ')).toLowerCase().includes(strongBrand.toLowerCase())
 );
 const candidate=evidence.aboutLinks.map(x=>safeSameSite(x,url)).find(Boolean)||null;
 let about:PageResponse|null=null;
 if(candidate)about=await fetchOne(candidate.pathname);
 const aboutData=usableHtml(about)?parseHtml(about.body,!!about.truncated):null;
 const aboutConfirmed=!!aboutData&&aboutData.text.length>=100;
 add('D1','Content and entity signals','Brand identifiable',4,
  strongBrand?'pass':contentMissing(false),strongBrand||'Business identity not verified');
 add('D2','Content and entity signals','Products or services identifiable',4,
  serviceText?'pass':contentMissing(false),
  serviceText?serviceText.slice(0,160):'No substantial product/service description verified');
 add('D3','Content and entity signals','About or company information',4,
  aboutConfirmed?'pass':candidate&&about&&[404,410].includes(about.status)?'fail':
   candidate?'unverified':contentMissing(false),
  aboutConfirmed?'Readable same-site About page':candidate?evidenceReason(about,errors[candidate.pathname],'About page'):'No verified About page link');
 add('D4','Content and entity signals','Consistent brand signals',3,
  brandInText?'pass':contentMissing(false),
  brandInText?'Brand appears in independent site descriptions':'Cross-page/metadata brand consistency unverified');
 const validLlms=!!llms&&llms.status===200&&!llms.truncated&&
  !llms.type.includes('html')&&!/^\s*</.test(llms.body)&&llms.body.trim().length>0;
 const absentLlms=!!llms&&[404,410].includes(llms.status);
 const invalidLlms=!!llms&&llms.status===200&&(llms.type.includes('html')||/^\s*</.test(llms.body));
 function llmsStatus(positive:boolean):Verdict{
  return validLlms?(positive?'pass':'fail'):(absentLlms||invalidLlms)?'fail':'unverified';
 }
 add('E1','llms.txt','Valid llms.txt text document',5,llmsStatus(true),
  validLlms?'Valid bounded text file':evidenceReason(llms,errors['/llms.txt'],'llms.txt'));
 add('E2','llms.txt','Meaningful site description',3,
  llmsStatus(!!llms&&llms.body.replace(/\s+/g,' ').trim().length>=50),
  validLlms?'Checked text description':'No verified llms.txt description');
 add('E3','llms.txt','Links to site resources',2,
  llmsStatus(!!llms&&/https?:\/\/[^\s)]+/.test(llms.body)),
  validLlms?'Checked links':'No verified llms.txt links');
 add('F1','Technical health','Valid HTTPS response',3,
  url.protocol==='https:'?(home?'pass':'unverified'):'fail',
  url.protocol==='https:'?'HTTPS TLS verification used':'Input used HTTP');
 add('F2','Technical health','Successful homepage response',3,
  home?.status===200?'pass':home&&[404,410].includes(home.status)?'fail':'unverified',
  evidenceReason(home,errors['/'],'Homepage'));
 const canonicalCheck=validateCanonical(evidence.canonical,url,home?.url);
 add('F3','Technical health','Valid canonical URL',2,
  canonicalCheck.valid?'pass':contentMissing(false),
  evidence.canonical?evidence.canonical.slice(0,150)+' ('+canonicalCheck.reason+')':'No canonical verified');
 const headerNoindex=/\bnoindex\b/i.test(home?.headers['x-robots-tag']||'');
 add('F4','Technical health','Homepage indexability signals',2,
  headerNoindex||evidence.noindex?'fail':htmlFinal?'pass':'unverified',
  headerNoindex||evidence.noindex?'Explicit noindex directive':'Noindex not found in complete HTML');

 const probes:Record<string,any>={};
 for(let i=0;i<PROBE_AGENTS.length;i++){
  const agent=PROBE_AGENTS[i],p=probePages[i];
  probes[agent.name]=p?{
   ...classifyProbe(p.status,p.type,p.body,!!p.truncated),http_status:p.status,
   html_bytes:p.body.length,truncated:!!p.truncated
  }:{status:'unverified',reason:errors['/#'+agent.value]||'no_response'};
 }
 const score=calculate(checks);
 const verified=checks.filter(x=>x.status!=='unverified');
 const strengths=verified.filter(x=>x.status==='pass').sort((a,b)=>b.points-a.points).slice(0,4).map(x=>x.label);
 const weaknesses=verified.filter(x=>x.status==='fail').sort((a,b)=>b.points-a.points).slice(0,4).map(x=>x.label);
 const uncertain=checks.filter(x=>x.status==='unverified').sort((a,b)=>b.points-a.points).slice(0,4).map(x=>x.label);
 const earnedPoints=verified.filter(x=>x.status==='pass').reduce((n,c)=>n+c.points,0);
 const unknownPoints=checks.filter(x=>x.status==='unverified').reduce((n,c)=>n+c.points,0);
 // This is an evidence bound, not an estimated final score; zero is never assigned to an unverified check.
 const provisional={verified_points:earnedPoints,unknown_points:unknownPoints,
  minimum:earnedPoints,maximum:Math.min(100,earnedPoints+unknownPoints),is_provisional:score.status==='incomplete'};
 return {
  domain:url.hostname,url:url.href,scanned_at:new Date().toISOString(),
  elapsed_ms:Math.round(performance.now()-started),
  bytes_fetched:networkEvents.reduce((n,x)=>n+(x.decompressed_bytes||0),0),
  wire_bytes:networkEvents.reduce((n,x)=>n+(x.wire_bytes||0),0),
  request_count:networkEvents.length,js_dependent:jsDependent,checks,...score,
  robots_rules:robotsRules,probes,network_errors:errors,network_events:networkEvents,
  summary:{strengths,weaknesses,uncertain,unverified_count:checks.length-verified.length},
  provisional,version:'instant-v1.0',
  disclaimer:'Website-signal readiness estimates only. No AI models were queried. These do not measure actual AI recommendations or rankings.',
  llms_note:'llms.txt is voluntary and is not a requirement or guarantee for AI recommendations.'
 };
}


// integrated api/_lib/instant-badge.ts
const BADGE_STYLES=['dark','light','shield','seal'] as const;
type BadgeStyle=typeof BADGE_STYLES[number];
const esc=(value:string)=>value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]||c));

function badgeSvg(domain:string,score:number,scannedAt:string,style:BadgeStyle,reportBase='https://www.promptila.com'){
 if(!/^[a-z0-9.-]+$/.test(domain)||domain.length>253)throw Error('Invalid badge domain');
 if(!Number.isInteger(score)||score<0||score>100)throw Error('Invalid badge score');
 const iso=new Date(scannedAt);
 if(!Number.isFinite(iso.getTime()))throw Error('Invalid scan date');
 const date=iso.toISOString().slice(0,10);
 const link=esc(reportBase+'/ai-visibility-checker/report/'+encodeURIComponent(domain));
 const text=esc(domain.slice(0,34));
 const dark=style==='dark'||style==='shield';
 const fg=dark?'#ffffff':'#172033',sub=dark?'#cbd5e1':'#485670',bg=dark?'#111827':'#f8fafc';
 const stroke=dark?'#6366f1':'#c7d2fe';
 let shape='<rect x="1" y="1" width="318" height="88" rx="13" fill="'+bg+'" stroke="'+stroke+'" stroke-width="2"/>';
 if(style==='shield')shape+='<path d="M18 18 L44 12 L70 18 V43 Q65 62 44 72 Q23 62 18 43 Z" fill="#3730a3" stroke="#a5b4fc" stroke-width="2"/><text x="44" y="47" text-anchor="middle" font-size="23" font-family="Arial" font-weight="bold" fill="#fff">'+score+'</text>';
 if(style==='seal')shape+='<circle cx="45" cy="43" r="31" fill="#eef2ff" stroke="#4338ca" stroke-width="3"/><circle cx="45" cy="43" r="26" fill="none" stroke="#818cf8" stroke-dasharray="3 3"/><text x="45" y="49" text-anchor="middle" font-size="22" font-family="Arial" font-weight="bold" fill="#312e81">'+score+'</text>';
 const offset=(style==='shield'||style==='seal')?88:15;
 const bigScore=(style==='shield'||style==='seal')?'':'<text x="304" y="56" text-anchor="end" font-family="Arial" font-size="29" font-weight="bold" fill="'+fg+'">'+score+'/100</text>';
 return '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="90" viewBox="0 0 320 90" role="img" aria-label="Promptila website readiness score '+score+' out of 100 for '+text+'"><a href="'+link+'" target="_blank">'+shape+
  '<text x="'+offset+'" y="24" font-family="Arial,sans-serif" font-size="15" font-weight="bold" fill="'+fg+'">Promptila website check</text>'+
  '<text x="'+offset+'" y="43" font-family="Arial,sans-serif" font-size="11" fill="'+sub+'">AI readiness estimate</text>'+
  '<text x="'+offset+'" y="73" font-family="Arial,sans-serif" font-size="10" fill="'+sub+'">Checked '+date+' · Not AI certification</text>'+
  bigScore+'</a></svg>';
}


export const config={maxDuration:60};
async function database(){
 const url=(process.env.SUPABASE_URL||process.env.VITE_SUPABASE_URL||'').replace(/\/rest\/v1\/?$/,'').replace(/\/$/,'');
 const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!key)throw Error('checker_configuration_missing');
 const {createClient}=await import('@supabase/supabase-js');
 return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
}
export function publicResult(row:any){
 if(!row||!row.result)return null;
 const r=row.result;
 // Explicit allowlist. Never include private lead records, internal IDs or raw HTML.
 return {domain:r.domain,url:r.url,scanned_at:r.scanned_at,version:r.version,status:r.status,
  score:r.score,classification:r.classification,categories:r.categories,engines:r.engines,
  crawlerAccess:r.crawlerAccess,checks:Array.isArray(r.checks)?r.checks.map((x:any)=>({id:x.id,category:x.category,label:x.label,points:x.points,status:x.status,evidence:typeof x.evidence==='string'?x.evidence.replace(/(?:ENOTFOUND|ECONNREFUSED|EHOSTUNREACH|ETIMEDOUT|EAI_AGAIN|ERR_[A-Z_]+|stream_error:[^ ]+)/g,'Connection or response could not be verified').slice(0,240):''})):[],js_dependent:r.js_dependent,
  elapsed_ms:r.elapsed_ms,request_count:r.request_count,bytes_fetched:r.bytes_fetched,
  disclaimer:r.disclaimer,llms_note:r.llms_note,
  robots_rules:r.robots_rules,probes:r.probes,summary:r.summary,provisional:r.provisional};
}
export function parseClaimToken(value:unknown):string|null{
 const m=typeof value==='string'?/^claimed:([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i.exec(value):null;
 return m?.[1]||null;
}
export async function guardedScanUpdate(db:any,domain:string,token:string,patch:Record<string,unknown>,now=new Date().toISOString()):Promise<boolean>{
 const {data,error}=await db.from('instant_scans').update(patch)
  .eq('domain',domain).eq('claim_token',token).eq('status','running')
  .gt('lease_expires_at',now).select('domain').maybeSingle();
 if(error)throw error;
 return data?.domain===domain;
}
export default async function handler(req:VercelRequest,res:VercelResponse){
 res.setHeader('Cache-Control','no-store');
 res.setHeader('X-Content-Type-Options','nosniff');
 if(!['POST','GET'].includes(req.method||''))return res.status(405).json({error:'Method not allowed'});
 // A dependency-free route establishes whether Vercel can start this function.
 // No secrets, config status, database access or private information are exposed.
 if(req.method==='GET'&&req.query.health==='1')return res.status(200).json({status:'ok'});
 let stage:'module_load'|'input_validation'|'database_setup'|'report_read'|'scan_claim'|'scan_execution'|'scan_commit'='module_load';
 try{
  // Bundled scanner: no runtime import.
  stage='input_validation';
  const url=validateWebsite(req.method==='GET'?req.query.domain:req.body?.website);
  const domain=url.hostname;
  stage='database_setup';
  const db=await database();
  if(req.method==='GET'){
   stage='report_read';
   const badgeMode=req.query.badge==='1';
   const {data,error}=await db.from('instant_scans').select('result,status,expires_at').eq('domain',domain).maybeSingle();
   if(error)throw error;
   if(badgeMode){
    // Bundled SVG renderer.
    const style=typeof req.query.style==='string'?req.query.style:'dark';
    if(!BADGE_STYLES.includes(style as (typeof BADGE_STYLES)[number]))return res.status(400).end();
    if(!data||data.status!=='complete'||data.result?.status!=='complete'||
      !Number.isInteger(data.result?.score)||!data.expires_at||
      new Date(data.expires_at).getTime()<=Date.now())return res.status(404).end();
    const origin=process.env.INSTANT_CHECKER_PUBLIC_ORIGIN||'https://www.promptila.com';
    const svg=badgeSvg(domain,data.result.score,data.result.scanned_at,style as (typeof BADGE_STYLES)[number],origin);
    res.setHeader('Content-Type','image/svg+xml; charset=utf-8');
    res.setHeader('Content-Security-Policy',"default-src 'none'; style-src 'unsafe-inline'; sandbox");
    res.setHeader('Cache-Control','public,max-age=300');
    return res.status(200).send(svg);
   }
   if(!data||!data.result)return res.status(404).json({error:'No report available.'});
   return res.status(200).json({report:publicResult(data),stale:!data.expires_at||new Date(data.expires_at).getTime()<=Date.now()});
  }
  stage='scan_claim';
  const remote=String(req.headers['x-vercel-forwarded-for']||req.socket.remoteAddress||'unknown').slice(0,128);
  const salt=process.env.INSTANT_CHECKER_RATE_SALT;
  if(!salt||salt.length<24)return res.status(503).json({error:'Rate limiter not configured.'});
  const ipHash=createHash('sha256').update(salt+':'+remote).digest('hex');
  const {data:claim,error:claimError}=await db.rpc('instant_claim_scan',{
   p_domain:domain,p_url:url.href,p_ip_hash:ipHash
  });
  if(claimError)throw claimError;
  if(claim==='rate_limited')return res.status(429).json({error:'Scan limit reached. Try later.'});
  if(claim==='busy')return res.status(202).json({status:'processing',domain});
  if(claim==='cached'){
   const {data}=await db.from('instant_scans').select('result').eq('domain',domain).single();
   if(data?.result)return res.status(200).json({report:publicResult(data),cached:true});
   return res.status(202).json({status:'processing',domain});
  }
  const claimToken=parseClaimToken(claim);
  if(!claimToken)return res.status(503).json({error:'Unable to reserve scan.'});
  try{
   const output=await scanWebsite(url.href);
   const cpuRate=Number(process.env.INSTANT_COMPUTE_USD_PER_MS);
   const transferRate=Number(process.env.INSTANT_TRANSFER_USD_PER_BYTE);
   const calibrated=process.env.INSTANT_COMPUTE_USD_PER_MS!==undefined&&process.env.INSTANT_TRANSFER_USD_PER_BYTE!==undefined&&Number.isFinite(cpuRate)&&Number.isFinite(transferRate)&&cpuRate>=0&&transferRate>=0;
   const estimatedCost=calibrated?Number((output.elapsed_ms*cpuRate+output.bytes_fetched*transferRate).toFixed(6)):null;
   const committed=await guardedScanUpdate(db,domain,claimToken,{
    status:output.status,result:output,score_version:output.version,
    elapsed_ms:output.elapsed_ms,bytes_fetched:output.bytes_fetched,request_count:output.request_count,
    estimated_cost_usd:estimatedCost,
    scanned_at:output.scanned_at,
    expires_at:new Date(Date.now()+7*86400_000).toISOString()
   });
   if(!committed)return res.status(409).json({error:'Scan superseded or lease expired. Reload current report.'});
   return res.status(200).json({report:publicResult({result:output}),cached:false});
  }catch(error){
   const failed=await guardedScanUpdate(db,domain,claimToken,{
    status:'error',lease_expires_at:new Date().toISOString()
   });
   if(!failed)return res.status(409).json({error:'Scan superseded or lease expired. Reload current report.'});
   return res.status(502).json({error:'The website could not be checked safely. No score was assigned.'});
  }
 }catch(error:any){
  const message=String(error?.message||'');
  if(/valid website|public DNS|unsafe|Invalid hostname|Only public|Only a public|URL too long/i.test(message))return res.status(400).json({error:'Enter a valid public website URL.'});
  // Structured public diagnostic codes, without exposing secrets or upstream details.
  const code=message==='checker_configuration_missing'?'configuration_missing':
    stage==='module_load'?'scanner_module_unavailable':
    stage==='database_setup'?'database_configuration_or_client_error':
    stage==='scan_claim'?'scan_claim_error':
    stage==='report_read'?'report_read_error':
    stage==='input_validation'?'input_validation_error':'server_unavailable';
  console.error('Instant checker unavailable',code,'stage='+stage,message.slice(0,160));
  return res.status(503).json({error:'Checker temporarily unavailable.',code});
 }
}
