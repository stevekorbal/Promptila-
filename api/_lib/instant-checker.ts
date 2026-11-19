import http from 'node:http';
import https from 'node:https';
import { lookup } from 'node:dns/promises';
import { BlockList, isIP } from 'node:net';
import { performance } from 'node:perf_hooks';

// Private IPs and non-global special-use IPv4 ranges; IPv6-only hosts remain unverified in phase 1.
const denied = new BlockList();
for (const [ip,prefix] of [
  ['0.0.0.0',8],['10.0.0.0',8],['100.64.0.0',10],['127.0.0.0',8],
  ['169.254.0.0',16],['172.16.0.0',12],['192.0.0.0',24],
  ['192.0.2.0',24],['192.88.99.0',24],['192.168.0.0',16],
  ['198.18.0.0',15],['198.51.100.0',24],['203.0.113.0',24],
  ['224.0.0.0',4],['240.0.0.0',4]
] as const) denied.addSubnet(ip,prefix,'ipv4');
const MAX_BYTES=650_000;
const deadlineMs=23000;

export function validateWebsite(raw: unknown): URL {
  if (typeof raw!=='string'||raw.length>2048||/[\\s\x00-\x1F]/.test(raw)) throw Error('Enter a valid website URL.');
  const provided=/^https?:\/\//i.test(raw)?raw:'https://'+raw;
  const url=new URL(provided);
  if (!['https:','http:'].includes(url.protocol)||url.username||url.password||url.port||url.hash||url.search) throw Error('Only public website homepages are accepted.');
  const hostname=url.hostname.toLowerCase().replace(/\.$/,'');
  if (isIP(hostname)||hostname==='localhost'||!hostname.includes('.')||hostname.endsWith('.local')||hostname.endsWith('.internal')||hostname.length>253||!/^[a-z0-9.-]+$/.test(hostname)) throw Error('A public DNS hostname is required.');
  if (hostname.split('.').some(label=>!label||label.length>63||label.startsWith('-')||label.endsWith('-'))) throw Error('Invalid hostname.');
  url.hostname=hostname;url.pathname='/';url.search='';url.hash='';
  return url;
}
export function publicIPv4(ip:string):boolean { return isIP(ip)===4&&!denied.check(ip,'ipv4'); }

export type PageResponse={url:string;status:number;type:string;body:string;bytes:number;headers:Record<string,string>};
export async function safeFetch(url:URL,started:number, redirects=0):Promise<PageResponse>{
  if (redirects>3) throw Error('Redirect limit exceeded');
  const remaining=deadlineMs-(performance.now()-started);
  if(remaining<=0) throw Error('Scan time budget exceeded');
  if(!['http:','https:'].includes(url.protocol)||url.username||url.password||url.port||isIP(url.hostname)) throw Error('Unsafe destination');
  // Do not permit arbitrary paths, except a bounded set of scanner-selected paths.
  if(url.href.length>2100) throw Error('URL too long');
  const answers=await lookup(url.hostname,{all:true,family:4,verbatim:true});
  if(!answers.length||answers.some(x=>!publicIPv4(x.address))) throw Error('Destination is not publicly routable over IPv4');
  const chosen=answers[0];
  return await new Promise<PageResponse>((resolve,reject)=>{
    const transport=url.protocol==='https:'?https:http;
    const req=transport.request({
      protocol:url.protocol,hostname:url.hostname,port:url.protocol==='https:'?443:80,
      path:url.pathname+url.search,method:'GET',family:4,agent:false,
      lookup:(_host,_opts,cb)=>cb(null,chosen.address,4),
      headers:{'user-agent':'PromptilaInstantChecker/1.0 (+https://www.promptila.com)',accept:'text/html,text/plain,application/json,*/*;q=0.5','accept-encoding':'identity'},
      timeout:Math.min(5000,Math.max(500,remaining))
    },res=>{
      const code=res.statusCode||0;
      if([301,302,303,307,308].includes(code)){
        const loc=res.headers.location;res.resume();
        if(!loc)return reject(Error('Redirect without location'));
        let next:URL;
        try{ next=new URL(loc,url); }catch{return reject(Error('Invalid redirect'));}
        if(!['http:','https:'].includes(next.protocol)||next.port||next.username||next.password||isIP(next.hostname))return reject(Error('Unsafe redirect'));
        safeFetch(next,started,redirects+1).then(resolve,reject);return;
      }
      const type=String(res.headers['content-type']||'').toLowerCase();
      let bytes=0;const chunks:Buffer[]=[];
      res.on('data',(chunk:Buffer)=>{
        bytes+=chunk.length;
        if(bytes>MAX_BYTES){req.destroy(Error('Response too large'));return;}
        chunks.push(chunk);
      });
      res.on('end',()=>resolve({url:url.href,status:code,type,body:Buffer.concat(chunks).toString('utf8'),bytes,
        headers:{'x-robots-tag':String(res.headers['x-robots-tag']||''),'content-type':type}}));
      res.on('error',reject);
    });
    req.on('timeout',()=>req.destroy(Error('Website timeout')));
    req.on('error',reject);req.end();
  });
}
type Verdict='pass'|'fail'|'unverified';
export type Check={id:string;category:string;label:string;points:number;status:Verdict;evidence:string};
type Score={score:number|null;status:'complete'|'incomplete';classification:string|null;categories:Record<string,{score:number|null;max:number;verified:number;total:number}>;engines:Record<string,number|null>;crawlerAccess:Record<string,string>};
const groups=[
 ['AI crawler access',25],
 ['Structured data',20],
 ['Semantic structure',20],
 ['Content and entity signals',15],
 ['llms.txt',10],
 ['Technical health',10]
] as const;
const W:Record<string,number[]>={ChatGPT:[30,20,15,20,5,10],Gemini:[25,20,20,20,5,10],Claude:[30,15,20,20,5,10],Perplexity:[30,15,20,20,5,10]};
function clean(s:string){return s.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&(?:nbsp|amp|quot|lt|gt);/g,' ').replace(/\s+/g,' ').trim()}
function getMeta(html:string,name:string){
 const tags=html.match(/<meta\b[^>]*>/gi)||[];
 const t=tags.find(x=>new RegExp('(?:name|property)\\s*=\\s*["\\\']'+name+'["\\\']','i').test(x));
 return t?.match(/content\s*=\s*["']([^"']*)/i)?.[1]||'';
}
function robotsPermit(raw:string,agent:string,path='/'):Verdict {
 const blocks:{agents:string[];rules:{allow:boolean;path:string}[]}[]=[];
 let current:{agents:string[];rules:{allow:boolean;path:string}[]}|null=null;
 for(const entry of raw.split(/\r?\n/)){
  const line=entry.split('#')[0].trim(),match=/^(user-agent|allow|disallow)\s*:\s*(.*)$/i.exec(line);
  if(!match)continue;
  const type=match[1].toLowerCase(),value=match[2].trim();
  if(type==='user-agent'){
   if(!current||current.rules.length){current={agents:[],rules:[]};blocks.push(current);}
   current.agents.push(value.toLowerCase());
  }else if(current&&value)current.rules.push({allow:type==='allow',path:value});
 }
 const candidates=blocks.map(b=>({b,specificity:b.agents.reduce((n,v)=>Math.max(n,v==='*'?1:v===agent.toLowerCase()?v.length:0),0)})).filter(x=>x.specificity>0);
 if(!candidates.length)return 'pass';
 const max=Math.max(...candidates.map(x=>x.specificity));
 const rules=candidates.filter(x=>x.specificity===max).flatMap(x=>x.b.rules);
 // Unknown wildcard syntax never turns into an assumed permission.
 if(rules.some(x=>x.path.includes('*')&&!x.path.startsWith('/')))return 'unverified';
 const matched=rules.map(x=>({...x,prefix:x.path.split(/[*$]/)[0]}))
  .filter(x=>x.prefix&&path.startsWith(x.prefix)).sort((x,y)=>y.prefix.length-x.prefix.length||Number(y.allow)-Number(x.allow));
 return matched.length?(matched[0].allow?'pass':'fail'):'pass';
}
export function calculate(checks:Check[]):Score{
  const categories:Score['categories']={};let complete=true;let total=0;
  for(const [name,max] of groups){
    const subset=checks.filter(x=>x.category===name);
    const verified=subset.filter(x=>x.status!=='unverified');
    const points=verified.reduce((n,x)=>n+(x.status==='pass'?x.points:0),0);
    const known=subset.length>0&&verified.length===subset.length;
    if(!known)complete=false;
    categories[name]={score:known?points:null,max,verified:verified.length,total:subset.length};
    total+=points;
  }
  const engines:Record<string,number|null>={};
  for(const [name,weights] of Object.entries(W)){
    engines[name]=complete?Math.round(weights.reduce((sum,w,i)=>sum+w*(categories[groups[i][0]].score||0)/groups[i][1],0)):null;
  }
  const s=complete?total:null;
  const classification=s===null?null:s<40?'Needs Work':s<70?'Getting There':s<90?'Strong':'Excellent';
  const crawlerAccess:Record<string,string>={};
  for(const [engine,id] of [['ChatGPT','A1'],['Claude','A2'],['Perplexity','A3'],['Gemini / Google-Extended','A4']]){
    const c=checks.find(x=>x.id===id);crawlerAccess[engine]=c?.status==='pass'?'Allowed':c?.status==='fail'?'Blocked':'Unverified';
  }
  return {score:s,status:complete?'complete':'incomplete',classification,categories,engines,crawlerAccess};
}
export async function scanWebsite(raw:unknown, fetcher:typeof safeFetch=safeFetch){
  const url=validateWebsite(raw),started=performance.now();
  const checks:Check[]=[];
  function add(id:string,category:string,label:string,points:number,status:Verdict,evidence:string){
    checks.push({id,category,label,points,status,evidence:evidence.slice(0,240)});
  }
  let homepage:PageResponse|null=null,robots:PageResponse|null=null,llms:PageResponse|null=null,about:PageResponse|null=null;
  const home=async()=>fetcher(url,started).catch(()=>null);
  const aux=(path:string)=>fetcher(new URL(path,url),started).catch(()=>null);
  [homepage,robots,llms]=await Promise.all([home(),aux('/robots.txt'),aux('/llms.txt')]);
  const available=!!homepage&&homepage.status>=200&&homepage.status<300&&homepage.type.includes('html');
  const html=available?homepage!.body:'';
  const text=clean(html);
  const scripts=(html.match(/<script\b/gi)||[]).length;
  const appShell=available&&(text.length<260&&scripts>=2||/<div\s+id=["'](?:root|app|__next)["']\s*><\/div>/i.test(html)&&text.length<500);
  const readable=available&&!appShell;
  const metaTitle=html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim()||'';
  const description=getMeta(html,'description');
  const h1=(html.match(/<h1\b[^>]*>/gi)||[]).length;
  const headings=[...(html.matchAll(/<h([1-6])\b[^>]*>/gi))].map(x=>Number(x[1]));
  const matches=html.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)||[];
  let jsonld:unknown[]=[];let invalidJson=false;
  for(const tag of matches){let m=/>(([\s\S]*))<\/script>$/i.exec(tag);try{jsonld.push(JSON.parse(m?.[1]||''));}catch{invalidJson=true;}}
  const flat=JSON.stringify(jsonld).toLowerCase();
  const organizations=/organization|localbusiness|plumber|corporation|store/.test(flat);
  const hasNameUrl=/"name"\s*:\s*"[^"]+"/i.test(JSON.stringify(jsonld))&&/"url"\s*:\s*"https?:/i.test(JSON.stringify(jsonld));
  const htmlEvidence=available?'Initial HTML inspected':'Homepage HTML could not be fetched';
  const robotsValid=robots&&robots.status===200&&!robots.type.includes('html')&&!/^\s*</.test(robots.body);
  const robotsAbsent=robots&&[404,410].includes(robots.status);
  for(const [i,agent,label] of [['A1','GPTBot','ChatGPT / GPTBot'],['A2','ClaudeBot','Claude / ClaudeBot'],['A3','PerplexityBot','Perplexity / PerplexityBot'],['A4','Google-Extended','Gemini / Google-Extended']] as const){
    const status:Verdict=robotsValid?robotsPermit(robots!.body,agent):robotsAbsent?'pass':'unverified';
    add(i,'AI crawler access',label,5,status,robotsValid?'robots.txt access rules evaluated':robotsAbsent?'No robots.txt restrictions found':'robots.txt could not be verified');
  }
  add('A5','AI crawler access','Homepage fetchable',5,homepage?homepage.status===200?'pass':homepage.status===403||homepage.status===404?'fail':'unverified':'unverified',homepage?'HTTP '+homepage.status:'Could not connect');
  const schemaUnknown=!available||appShell&&matches.length===0;
  add('B1','Structured data','Valid JSON-LD',5,schemaUnknown?'unverified':jsonld.length>0?'pass':'fail',schemaUnknown?'Rendered scripts may contain data not visible in HTML':invalidJson?'Malformed JSON-LD encountered':jsonld.length+' JSON-LD block(s)');
  add('B2','Structured data','Business or organization schema',5,schemaUnknown?'unverified':organizations?'pass':'fail',htmlEvidence);
  add('B3','Structured data','Business name and URL in schema',5,schemaUnknown?'unverified':hasNameUrl?'pass':'fail',htmlEvidence);
  add('B4','Structured data','WebSite or relevant page schema',5,schemaUnknown?'unverified':/website|webpage|aboutpage|service/.test(flat)?'pass':'fail',htmlEvidence);
  add('C1','Semantic structure','Descriptive page title',5,!available?'unverified':metaTitle.length>=12&&!/^(home|index)$/i.test(metaTitle)?'pass':'fail',metaTitle||'No title found in initial HTML');
  add('C2','Semantic structure','Meta description',4,!available?'unverified':description.length>=40?'pass':'fail',description.slice(0,120)||'Not found in initial HTML');
  add('C3','Semantic structure','Primary H1 heading',5,!available||appShell&&h1===0?'unverified':h1===1?'pass':'fail',appShell?'JavaScript rendering may supply headings':h1+' H1 element(s)');
  add('C4','Semantic structure','Heading hierarchy',3,!readable?'unverified':headings.length>0&&headings.every((v,i)=>i===0||v<=headings[i-1]+1)?'pass':'fail',readable?'Heading levels inspected':'Rendered headings could not be verified');
  add('C5','Semantic structure','Readable page content',3,!readable?'unverified':text.length>=300?'pass':'fail',appShell?'Likely JavaScript-rendered website':text.length+' characters of initial readable text');
  const siteName=metaTitle.split(/[|–—-]/)[0]?.trim()||'';
  const brandKnown=siteName.length>=3&&!/^(home|welcome)$/i.test(siteName);
  const services=readable&&/(services|solutions|products|plumbing|heating|candy|repair|installation|what we do)/i.test(text.slice(0,4000));
  const aboutPath=readable?html.match(/<a\b[^>]*href=["']([^"']*(?:about|our-story)[^"']*)["'][^>]*>/i)?.[1]:null;
  if(aboutPath){try{const candidate=new URL(aboutPath,url);if(candidate.hostname===url.hostname&&candidate.pathname.length<160)about=await fetcher(candidate,started).catch(()=>null);}catch{}}
  add('D1','Content and entity signals','Brand identifiable',4,!available?'unverified':brandKnown?'pass':'fail',siteName||htmlEvidence);
  add('D2','Content and entity signals','Products or services identifiable',4,!readable?'unverified':services?'pass':'fail',readable?'Readable homepage checked':'Content depends on JavaScript or is unavailable');
  add('D3','Content and entity signals','About or company information',4,!readable?'unverified':!aboutPath?'fail':!about?'unverified':about.status===200?'pass':'fail',aboutPath?'About link checked':'No About link found in initial HTML');
  add('D4','Content and entity signals','Consistent brand signals',3,!readable?'unverified':brandKnown&&text.toLowerCase().includes(siteName.toLowerCase())?'pass':'fail',readable?'Title and text compared':'Rendered text unavailable');
  const validLlms=!!llms&&llms.status===200&&!llms.type.includes('html')&&!/^\s*</.test(llms.body)&&llms.body.trim().length>0;
  const absentLlms=!!llms&&[404,410].includes(llms.status);
  const llmsVerdict=(pass:boolean):Verdict=>validLlms?(pass?'pass':'fail'):(absentLlms||llms?.status===200&&llms.type.includes('html'))?'fail':'unverified';
  add('E1','llms.txt','Valid llms.txt text document',5,llmsVerdict(true),validLlms?'Text document returned':absentLlms?'File not found':'File response could not be verified');
  add('E2','llms.txt','Meaningful site description',3,llmsVerdict(!!llms&&clean(llms.body).length>=50),validLlms?'Text checked':'No verified text document');
  add('E3','llms.txt','Links to site resources',2,llmsVerdict(!!llms&&/https?:\/\/[^\s)]+/.test(llms.body)),validLlms?'Links checked':'No verified text document');
  add('F1','Technical health','Valid HTTPS response',3,url.protocol==='https:'?(homepage?'pass':'unverified'):'fail',url.protocol==='https:'?'HTTPS requested with certificate verification':'HTTP URL supplied');
  add('F2','Technical health','Successful homepage response',3,homepage?homepage.status===200?'pass':homepage.status===404||homepage.status===410?'fail':'unverified':'unverified',homepage?'HTTP '+homepage.status:'Could not fetch homepage');
  const canonical=html.match(/<link\b(?=[^>]*rel=["']canonical["'])[^>]*href=["']([^"']+)["'][^>]*>/i)?.[1]||'';
  let canonicalValid=false;try{canonicalValid=Boolean(canonical&&new URL(canonical,url).hostname===url.hostname);}catch{}
  add('F3','Technical health','Valid canonical URL',2,!available?'unverified':canonicalValid?'pass':'fail',canonical||'No canonical in initial HTML');
  const noindex=/<meta\b[^>]*name=["']robots["'][^>]*content=["'][^"']*noindex/i.test(html)||/noindex/i.test(homepage?.headers['x-robots-tag']||'');
  add('F4','Technical health','Homepage indexability signals',2,!available?'unverified':noindex?'fail':'pass',noindex?'Noindex directive found':htmlEvidence);
  const score=calculate(checks);
  return {domain:url.hostname,url:url.href,scanned_at:new Date().toISOString(),elapsed_ms:Math.round(performance.now()-started),bytes_fetched:[homepage,robots,llms,about].reduce((n,x)=>n+(x?.bytes||0),0),request_count:3+(about?1:0),js_dependent:appShell,checks,...score,version:'instant-v1.0',disclaimer:'Website-signal readiness estimates only. No AI models were queried. These do not measure actual AI recommendations or rankings.',llms_note:'llms.txt is voluntary and is not a requirement or guarantee for AI recommendations.'};
}
