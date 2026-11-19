import {performance} from 'node:perf_hooks';
import {safeFetch,validateWebsite,publicIPv4,type PageResponse,type FetchOptions} from './instant-network.ts';
import {parseHtml,schemaNodes,schemaHasType,type Evidence} from './instant-evidence.ts';
import {robotsPermission,ROBOTS_AGENTS,PROBE_AGENTS,classifyProbe} from './instant-crawlers.ts';

export {safeFetch,validateWebsite,publicIPv4};
export type {PageResponse};
type Verdict='pass'|'fail'|'unverified';
export type Check={id:string;category:string;label:string;points:number;status:Verdict;evidence:string};
type Score={score:number|null;status:'complete'|'incomplete';classification:string|null;
 categories:Record<string,{score:number|null;max:number;verified:number;total:number}>;
 engines:Record<string,number|null>;crawlerAccess:Record<string,string>};
const GROUPS=[
 ['AI crawler access',25],['Structured data',20],['Semantic structure',20],
 ['Content and entity signals',15],['llms.txt',10],['Technical health',10]
] as const;
const WEIGHTS:Record<string,number[]>={ChatGPT:[30,20,15,20,5,10],
 Gemini:[25,20,20,20,5,10],Claude:[30,15,20,20,5,10],Perplexity:[30,15,20,20,5,10]};
export function calculate(checks:Check[]):Score{
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
 return !!page&&page.status>=200&&page.status<300&&page.type.includes('html')&&!/just a moment|checking your browser|verify you are human|access denied/i.test(page.body.slice(0,5000));
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

export async function scanWebsite(raw:unknown,fetcher:Fetcher=safeFetch){
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

 // Structured data: only parsed JSON-LD with substantive properties qualifies.
 const companyNodes=nodes.filter(n=>schemaHasType(n,'Organization')||schemaHasType(n,'LocalBusiness'));
 const schemaValid=nodes.length>0;
 const identity=companyNodes.find(n=>identifiableBrand(n.name||'')&&
  typeof n.url==='string'&&/^https?:\/\//.test(n.url));
 const pageSchema=nodes.some(n=>['WebSite','WebPage','AboutPage','Service','Product'].some(t=>schemaHasType(n,t)));
 add('B1','Structured data','Valid JSON-LD',5,schemaValid?'pass':contentMissing(false),
  schemaValid?nodes.length+' parsed typed JSON-LD items':evidence.jsonErrors?'JSON-LD syntax invalid':'No verifiable JSON-LD block');
 add('B2','Structured data','Business or organization schema',5,companyNodes.length?'pass':contentMissing(false),
  companyNodes.length?'Typed organization/business node found':'Not found in inspected evidence');
 add('B3','Structured data','Business name and URL in schema',5,identity?'pass':contentMissing(false),
  identity?'Business name and URL found together in schema':'Name/URL pair not verified');
 add('B4','Structured data','WebSite or relevant page schema',5,pageSchema?'pass':contentMissing(false),
  pageSchema?'Relevant typed page/site node found':'Page/site schema not verified');

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

 const strongBrand=schemaName(companyNodes)||evidence.ogName||
  (identifiableBrand(evidence.siteName)?evidence.siteName:'');
 const serviceText=schemaDescription(nodes)||evidence.services.find(x=>x.length>=40)||'';
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
 let validCanonical=false;
 try{validCanonical=!!evidence.canonical&&new URL(evidence.canonical,url).hostname===url.hostname;}catch{}
 add('F3','Technical health','Valid canonical URL',2,
  validCanonical?'pass':contentMissing(false),evidence.canonical||'No canonical verified');
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
 const strengths=verified.filter(x=>x.status==='pass').slice(0,4).map(x=>x.label);
 const weaknesses=verified.filter(x=>x.status==='fail').slice(0,4).map(x=>x.label);
 const provisional={verified_points:verified.filter(x=>x.status==='pass').reduce((n,c)=>n+c.points,0),
  unknown_points:checks.filter(x=>x.status==='unverified').reduce((n,c)=>n+c.points,0)};
 return {
  domain:url.hostname,url:url.href,scanned_at:new Date().toISOString(),
  elapsed_ms:Math.round(performance.now()-started),
  bytes_fetched:networkEvents.reduce((n,x)=>n+(x.decompressed_bytes||0),0),
  wire_bytes:networkEvents.reduce((n,x)=>n+(x.wire_bytes||0),0),
  request_count:networkEvents.length,js_dependent:jsDependent,checks,...score,
  robots_rules:robotsRules,probes,network_errors:errors,network_events:networkEvents,
  summary:{strengths,weaknesses,unverified_count:checks.length-verified.length},
  provisional,version:'instant-v1.0',
  disclaimer:'Website-signal readiness estimates only. No AI models were queried. These do not measure actual AI recommendations or rankings.',
  llms_note:'llms.txt is voluntary and is not a requirement or guarantee for AI recommendations.'
 };
}
