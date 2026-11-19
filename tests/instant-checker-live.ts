import {writeFileSync} from 'node:fs';
import {scanWebsite,safeFetch} from '../api/_lib/instant-checker.ts';

// Diagnostic-only, read-only site coverage test. No paid AI calls, n8n, DB writes or email.
const sites=[
 {name:'Big Lake Candy Company',url:'https://www.biglakecandy.com'},
 {name:'Harris HVAC',url:'https://harrishvac.net'},
 {name:'Promptila',url:'https://www.promptila.com'},
 {name:'Apple',url:'https://www.apple.com'},
 {name:'Microsoft',url:'https://www.microsoft.com'},
 {name:'Nike',url:'https://www.nike.com'},
 {name:'Patagonia',url:'https://www.patagonia.com'},
 {name:'IKEA',url:'https://www.ikea.com'},
 {name:'Costco',url:'https://www.costco.com'},
 {name:'Best Buy',url:'https://www.bestbuy.com'},
 {name:'The Home Depot',url:'https://www.homedepot.com'},
 {name:'Shopify',url:'https://www.shopify.com'},
 {name:'HubSpot',url:'https://www.hubspot.com'},
 {name:'Mr HVAC GR',url:'https://www.mrhvacgr.com'},
 {name:'J and L Heating',url:'https://www.jandlheating.com'},
 {name:'C and K Heating',url:'https://www.ckheatingcooling.com'},
 {name:'Practical Mechanical',url:'https://www.practicalmechanical.com'},
 {name:'Associated Plumbing',url:'https://associatedplumbing.com'},
 {name:'Mitch the Plumber',url:'https://www.mitchtheplumber-mi.com'},
 {name:'Simple Grains Bakery',url:'https://www.simplegrainsbakery.com'},
 {name:'Warm Crumb Bakery',url:'https://www.warmcrumbbakery.com'},
 {name:'Becks Bakery',url:'https://becks-bakery.com'},
 {name:'Valentine Sweets',url:'https://valentinesweets.com'}
];
const results:any[]=[];
for(const site of sites){
 const fetchEvents:any[]=[];
 try{
  const r=await scanWebsite(site.url,async (url,start)=>{
   const begin=performance.now();
   try{
    const out=await safeFetch(url,start);
    fetchEvents.push({path:url.pathname,requested_host:url.hostname,final_url:out.url,http_status:out.status,type:out.type,bytes:out.bytes,elapsed_ms:Math.round(performance.now()-begin)});
    return out;
   }catch(e:any){
    fetchEvents.push({path:url.pathname,requested_host:url.hostname,error:String(e?.message||e).slice(0,240),error_code:e?.code||null,elapsed_ms:Math.round(performance.now()-begin)});
    throw e;
   }
  });
  const record={site:site.name,domain:r.domain,status:r.status,score:r.score,js_dependent:r.js_dependent,
   elapsed_ms:r.elapsed_ms,request_count:r.request_count,bytes_fetched:r.bytes_fetched,
   checked:r.checks.length,unverified:r.checks.filter(c=>c.status==='unverified').map(c=>c.id),
   wire_bytes:r.wire_bytes,robots_rules:r.robots_rules,probes:r.probes,summary:r.summary,network_errors:r.network_errors,
   category_scores:r.categories,engine_estimates:r.engines,check_results:r.checks,fetch_events:fetchEvents};
  results.push(record);
  console.log('SITE_QA',JSON.stringify({site:site.name,status:r.status,score:r.score,js:r.js_dependent,elapsed_ms:r.elapsed_ms,unverified:record.unverified,fetch_events:fetchEvents}));
 }catch(e:any){
  results.push({site:site.name,error:String(e?.message||e),fetch_events:fetchEvents});
  console.log('SITE_QA',JSON.stringify({site:site.name,error:String(e?.message||e),fetch_events:fetchEvents}));
 }
}
writeFileSync('instant-checker-private-results.json',JSON.stringify(results,null,2));
console.log('QA_TOTALS',JSON.stringify({total:results.length,complete:results.filter(x=>x.status==='complete').length,incomplete:results.filter(x=>x.status==='incomplete').length,other:results.filter(x=>!['complete','incomplete'].includes(x.status)).length}));
