// Read-only accuracy verification. Uses the SAME bounded, SSRF-safe fetcher and
// Chromium renderer as production. Does not write database records or change scores.
import {performance} from 'node:perf_hooks';
import {safeFetch,validateWebsite} from '../api/_lib/instant-network.ts';
import {renderJavaScriptPage} from '../api/_lib/instant-render.ts';
import {parseHtml,schemaNodes} from '../api/_lib/instant-evidence.ts';
import {validateStructuredData,validateCanonical} from '../api/_lib/instant-validation.ts';
import {robotsPermission,PROBE_AGENTS,ROBOTS_AGENTS,classifyProbe} from '../api/_lib/instant-crawlers.ts';
import {scanWebsite} from '../api/_lib/instant-checker.ts';

const url=validateWebsite('https://www.biglakecandy.com/');
const started=performance.now();
process.env.INSTANT_RENDER_FALLBACK='true';
function headings(html:string){
 const out=[];const re=/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1\s*>/gi;
 for(const m of html.matchAll(re)){
  const text=m[2].replace(/<[^>]+>/g,' ').replace(/&[^;]{1,10};/g,' ').replace(/\s+/g,' ').trim();
  out.push({level:Number(m[1]),text:text.slice(0,125)});
 }
 return out;
}
function jsonLdDetails(html:string){
 const scripts=[...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)].filter(x=>/type\s*=\s*["']?application\/ld\+json\b/i.test(x[1]));
 return scripts.map(x=>{
  try{
   const node=JSON.parse(x[2].trim());
   return {validJson:true,nodeTypes:schemaNodes([node]).map(n=>n['@type']),hasContext:!!node?.['@context']};
  }catch(e){return {validJson:false,reason:String(e).slice(0,160)};}
 });
}
function canonicalTags(html:string){
 return [...html.matchAll(/<link\b[^>]*\brel\s*=\s*["']?canonical\b[^>]*>/gi)].map(x=>x[0].slice(0,300));
}
function status(x:any){return x?{http:x.status,content_type:x.type,bytes:x.bytes,url:x.url,redirects:x.redirects,reason:x.reason||null}:null;}
let home,robots,llms,rendered;
try{home=await safeFetch(url,started);}catch(e){console.log('ACCURACY_HOME_ERROR',String(e));process.exit(1)}
try{robots=await safeFetch(new URL('/robots.txt',url),started);}catch(e){console.log('ACCURACY_ROBOTS_ERROR',String(e))}
try{llms=await safeFetch(new URL('/llms.txt',url),started);}catch(e){console.log('ACCURACY_LLMS_ERROR',String(e))}
const raw=parseHtml(home.body,!!home.truncated);
console.log('ACCURACY_ORIGINAL',JSON.stringify({
 response:status(home),jsShell:raw.jsShell,readableChars:raw.text.length,headings:headings(home.body),
 tokenizerHeadingLevels:raw.headings,jsonLd:jsonLdDetails(home.body),parserJsonErrors:raw.jsonErrors,
 canonicalTags:canonicalTags(home.body),canonicalValue:raw.canonical,
 schemaValidation:validateStructuredData(schemaNodes(raw.schema),url)
}));
try{rendered=await renderJavaScriptPage(url,safeFetch,performance.now());}catch(e){console.log('ACCURACY_RENDER_ERROR',String(e))}
if(rendered?.complete){
 const e=parseHtml(rendered.html,false);
 const seq=headings(rendered.html);
 const jumps=seq.flatMap((h,i)=>i&&h.level>seq[i-1].level+1?[{from:'H'+seq[i-1].level,to:'H'+h.level,at:i,text:h.text}]:[]);
 console.log('ACCURACY_RENDERED',JSON.stringify({renderComplete:true,renderedUrl:rendered.url,elapsedMs:rendered.duration_ms,
  requests:rendered.requests,readableChars:e.text.length,headings:seq,tokenizerHeadingLevels:e.headings,
  headingJumps:jumps,jsonLd:jsonLdDetails(rendered.html),parserJsonErrors:e.jsonErrors,
  canonicalTags:canonicalTags(rendered.html),canonicalValue:e.canonical,
  canonicalValidation:validateCanonical(e.canonical,url,home.url),
  schemaValidation:validateStructuredData(schemaNodes(e.schema),url)}));
}else console.log('ACCURACY_RENDERED',JSON.stringify({renderComplete:false}));
console.log('ACCURACY_ROBOTS',JSON.stringify({response:status(robots),
 perAgent:Object.fromEntries(ROBOTS_AGENTS.map(a=>[a,robots?.status===404?'no_robots_policy':robots?.status===200?robotsPermission(robots.body,a):'unverified']))}));
console.log('ACCURACY_LLMS',JSON.stringify({response:status(llms),bodyPrefix:llms?.status===200?llms.body.slice(0,100):null}));
const crawlers=[];
for(const x of PROBE_AGENTS){
 try{let probe=await safeFetch(url,performance.now(),0,{userAgent:x.value,deadline:8000,maxCapture:120000,stopAfterCapture:true});
  crawlers.push({name:x.name,http:probe.status,content_type:probe.type,probe:classifyProbe(probe.status,probe.type,probe.body,!!probe.truncated)});
 }catch(e){crawlers.push({name:x.name,error:String(e).slice(0,140)})}
}
console.log('ACCURACY_CRAWLERS',JSON.stringify(crawlers));
// Full score with the actual unchanged production scanner, independent of the saved cache.
const scan=await scanWebsite(url.href);
console.log('ACCURACY_SCAN',JSON.stringify({score:scan.score,status:scan.status,provisional:scan.provisional,
 categories:scan.categories,engines:scan.engines,checks:scan.checks.filter((x:any)=>x.status!=='pass'),
 networkEvents:scan.network_events,rendering:scan.rendering,elapsed_ms:scan.elapsed_ms}));
