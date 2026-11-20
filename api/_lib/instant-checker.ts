import {performance} from 'node:perf_hooks';
import {safeFetch,validateWebsite,publicIPv4,type PageResponse,type FetchOptions} from './instant-network.ts';
import {parseHtml,schemaNodes,schemaHasType,type Evidence} from './instant-evidence.ts';
import {robotsPermission,ROBOTS_AGENTS,PROBE_AGENTS,classifyProbe} from './instant-crawlers.ts';
import {validateStructuredData,validateCanonical} from './instant-validation.ts';
import type {RenderedPage,SafeRendererFetcher} from './instant-render.ts';

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
 if(!page||page.status<200||page.status>=300||!page.type.includes('html'))return false;
 const title=(page.body.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]||'').trim();
 return !/^(just a moment|checking your browser|verify you are human|access denied|attention required)/i.test(title);
}
function safeSameSite(candidate:string,base:URL):URL|null{
 try{
  const u=new URL(candidate,base);
  if(u.hostname.replace(/^www\./,'')!==base.hostname.replace(/^www\./,'')||u.port||u.username||u.password||u.search||u.hash||u.pathname.length>130)return null;
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

export type RenderCallback=(url:URL,fetcher:SafeRendererFetcher,start:number)=>Promise<RenderedPage|null>;
export async function scanWebsite(raw:unknown,fetcher:Fetcher=safeFetch,renderer?:RenderCallback){
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
 const htmlAvailable=usableHtml(home),rawEvidence:Evidence=htmlAvailable?
  parseHtml(home.body,!!home.truncated):parseHtml('',true);
 const htmlFinal=htmlAvailable&&!home.truncated;
 const bodyReadable=rawEvidence.text.length>=300||rawEvidence.appData.join(' ').length>=300;
 const jsDependent=rawEvidence.jsShell||(htmlAvailable&&!bodyReadable&&(home?.body.match(/<script\b/gi)||[]).length>=2);
 let rendered:RenderedPage|null=null;
 let activeBrowserRenderer:RenderCallback|undefined;
 let rendering:'not_needed'|'disabled'|'complete'|'failed'=jsDependent?'disabled':'not_needed';
 if(jsDependent&&htmlAvailable){
  let activeRenderer=renderer;
  if(!activeRenderer&&process.env.INSTANT_RENDER_FALLBACK==='true'){
   try{activeRenderer=(await import('./instant-render.ts')).renderJavaScriptPage;}catch{activeRenderer=undefined;}
  }
  activeBrowserRenderer=activeRenderer;
  if(activeRenderer){
   try{rendered=await activeRenderer(url,fetcher,started);}catch{rendered=null;}
   rendering=rendered?.complete?'complete':'failed';
  }
 }
 const renderedEvidence=rendered?.complete?parseHtml(rendered.html,false):null;
 // Raw crawler permissions/probes are never replaced with browser DOM evidence.
 const evidence:Evidence=renderedEvidence?{
  ...rawEvidence,
  title:rawEvidence.title||renderedEvidence.title,
  description:rawEvidence.description||renderedEvidence.description,
  canonical:rawEvidence.canonical||renderedEvidence.canonical,
  schema:[...rawEvidence.schema,...renderedEvidence.schema.filter(x=>
   !rawEvidence.schema.some(y=>JSON.stringify(y)===JSON.stringify(x)))],
  h1:renderedEvidence.h1.length?renderedEvidence.h1:rawEvidence.h1,
  headings:renderedEvidence.headings.length?renderedEvidence.headings:rawEvidence.headings,
  text:renderedEvidence.text.length>rawEvidence.text.length?renderedEvidence.text:rawEvidence.text,
  aboutLinks:[...new Set([...rawEvidence.aboutLinks,...renderedEvidence.aboutLinks])],
  services:[...new Set([...rawEvidence.services,...renderedEvidence.services])],
  appData:[...new Set([...rawEvidence.appData,...renderedEvidence.appData])],
  noindex:rawEvidence.noindex||renderedEvidence.noindex,
  jsShell:false,
  truncated:false
 }:rawEvidence;
 const nodes=schemaNodes(evidence.schema);
 const title=evidence.title,description=evidence.description;
 const contentVerified=(htmlFinal&&!jsDependent)||!!renderedEvidence;
 const absent=(confirmed:boolean):Verdict=>confirmed?'fail':'unverified';
 const contentMissing=(found:boolean):Verdict=>found?'pass':absent(contentVerified);
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
  evidence.h1.length>1&&contentVerified?'fail':contentMissing(false),
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
 let aboutConfirmed=!!aboutData&&aboutData.text.length>=100;
 let renderedAbout:RenderedPage|null=null;
 // At most one additional same-site browser page; only if raw About evidence
 // is insufficient. This preserves the existing About-page scoring rule.
 if(!aboutConfirmed&&candidate&&renderedEvidence&&activeBrowserRenderer&&
    performance.now()-started<13_000){
  try{renderedAbout=await activeBrowserRenderer(candidate,fetcher,started);}
  catch{renderedAbout=null;}
  if(renderedAbout?.complete)aboutConfirmed=parseHtml(renderedAbout.html,false).text.length>=100;
 }
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
  headerNoindex||evidence.noindex?'fail':contentVerified?'pass':'unverified',
  headerNoindex||evidence.noindex?'Explicit noindex directive':'Noindex not found in complete HTML');

 // Attribute findings to rendered DOM, not to raw crawler responses.
 if(renderedEvidence){
  for(const check of checks){
   const browserDerived=
    (/^B[1-4]$/.test(check.id)&&rawEvidence.schema.length===0)||
    (check.id==='C3'&&rawEvidence.h1.length===0)||
    (check.id==='C4'&&rawEvidence.headings.length===0)||
    (check.id==='C5'&&rawEvidence.text.length<300)||
    (check.id==='D3'&&!!renderedAbout?.complete&&aboutConfirmed)||
    (check.id==='D4'&&rawEvidence.text.length<300)||
    (check.id==='F3'&&!rawEvidence.canonical)||
    (check.id==='F4'&&!htmlFinal);
   if(browserDerived&&check.status!=='unverified')
    check.evidence=(check.evidence+' [rendered DOM]').slice(0,240);
  }
 }
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
  bytes_fetched:networkEvents.reduce((n,x)=>n+(x.decompressed_bytes||0),0)+(rendered?.bytes||0)+(renderedAbout?.bytes||0),
  wire_bytes:networkEvents.reduce((n,x)=>n+(x.wire_bytes||0),0),
  request_count:networkEvents.length+(rendered?.requests||0)+(renderedAbout?.requests||0),js_dependent:jsDependent,checks,...score,
  rendering:{status:rendering,pages:(rendered?.complete?1:0)+(renderedAbout?.complete?1:0),elapsed_ms:(rendered?.duration_ms||0)+(renderedAbout?.duration_ms||0),requests:(rendered?.requests||0)+(renderedAbout?.requests||0),bytes:(rendered?.bytes||0)+(renderedAbout?.bytes||0)},
  robots_rules:robotsRules,probes,network_errors:errors,network_events:networkEvents,
  summary:{strengths,weaknesses,uncertain,unverified_count:checks.length-verified.length},
  provisional,version:'instant-v1.0',
  disclaimer:'Website-signal readiness estimates only. No AI models were queried. These do not measure actual AI recommendations or rankings.',
  llms_note:'llms.txt is voluntary and is not a requirement or guarantee for AI recommendations.'
 };
}
