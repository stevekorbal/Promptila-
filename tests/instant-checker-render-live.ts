import {performance} from 'node:perf_hooks';
import {writeFileSync} from 'node:fs';
import {scanWebsite} from '../api/_lib/instant-checker.ts';
import {estimateReadiness} from '../api/_lib/instant-estimates.ts';

const domains=[
 'https://biglakecandy.com',
 'https://promptila.com',
 'https://www.apple.com',
 'https://www.hubspot.com',
 'https://wordpress.com',
 'https://cud.ac.ae',
 'https://cs16forge.com',
 'https://teviroai.com'
];
const output:any[]=[];
process.env.INSTANT_RENDER_FALLBACK='true';
process.env.INSTANT_RENDER_DIAGNOSTICS='true';
for(const url of domains){
 const started=performance.now(),initialRss=process.memoryUsage().rss;
 const original=process.env.INSTANT_RENDER_FALLBACK;
 process.env.INSTANT_RENDER_FALLBACK='false';
 let before:any;
 try{before=await scanWebsite(url);}catch(e:any){before={status:'error',error:String(e?.message||e)};}
 process.env.INSTANT_RENDER_FALLBACK=original;
 const startedRender=performance.now();
 let after:any;
 try{after=await scanWebsite(url);}catch(e:any){after={status:'error',error:String(e?.message||e)};}
 const estimate=Array.isArray(after.checks)?estimateReadiness(after.checks):null;
 const result={
  url,
  estimated_presentation:estimate,
  before:{status:before.status,score:before.score??null,provisional:before.provisional??null,elapsed_ms:before.elapsed_ms??null},
  after:{status:after.status,score:after.score??null,provisional:after.provisional??null,elapsed_ms:after.elapsed_ms??null,rendering:after.rendering??null},
  total_wall_ms:Math.round(performance.now()-started),
  rendering_comparison_wall_ms:Math.round(performance.now()-startedRender),
  rss_change_bytes:process.memoryUsage().rss-initialRss,
  missing_before:before.checks?.filter((c:any)=>c.status==='unverified').map((c:any)=>c.id)||[],
  missing_after:after.checks?.filter((c:any)=>c.status==='unverified').map((c:any)=>c.id)||[],
  raw_crawlers_unchanged:JSON.stringify(before.robots_rules)===JSON.stringify(after.robots_rules)
 };
 output.push(result);
 console.log('RENDER_LIVE '+JSON.stringify(result));
}
writeFileSync('instant-render-live-results.json',JSON.stringify({observed_at:new Date().toISOString(),results:output},null,2));
