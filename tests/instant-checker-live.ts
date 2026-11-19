import {writeFileSync} from 'node:fs';
import {scanWebsite} from '../api/_lib/instant-checker.ts';
// Private read-only QA; no DB writes, paid AI, n8n or emails.
const sites=[
 {name:'Big Lake Candy Company',url:'https://www.biglakecandy.com'},
 {name:'Harris HVAC',url:'https://harrishvac.net'},
 {name:'Regular HTML reference',url:'https://example.com'},
 {name:'JavaScript site reference',url:'https://www.promptila.com'}
];
const results=[];
for(const site of sites){
 try{
  const r=await scanWebsite(site.url);
  const record={site:site.name,domain:r.domain,status:r.status,score:r.score,
   js_dependent:r.js_dependent,elapsed_ms:r.elapsed_ms,request_count:r.request_count,
   checked:r.checks.length,unverified:r.checks.filter(c=>c.status==='unverified').map(c=>c.id),
   category_scores:r.categories,engine_estimates:r.engines,check_results:r.checks};
  results.push(record);
  console.log(site.name,JSON.stringify({status:record.status,score:record.score,js:record.js_dependent,time_ms:record.elapsed_ms,unverified:record.unverified}));
 }catch(e:any){
  results.push({site:site.name,error:String(e?.message||e)});
  console.log(site.name,'SCAN NOT VERIFIED',String(e?.message||e));
 }
}
writeFileSync('instant-checker-private-results.json',JSON.stringify(results,null,2));
