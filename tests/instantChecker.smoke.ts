// Controlled zero-AI live-website smoke test; runs only on an explicitly marked private CI commit.
// Does not access Promptila's paid audit system, Supabase, n8n, or model APIs.
import {scanSite} from '../lib/instantChecker/scanner.ts';
if(process.env.RUN_LIVE_SMOKE!=='1')throw new Error('Live smoke tests require explicit RUN_LIVE_SMOKE=1');
const sites=[
 {label:'Big Lake Candy',url:'https://www.biglakecandy.com'},
 {label:'Harris HVAC',url:'https://harrishvac.net'},
 {label:'Regular HTML',url:'https://example.com'},
 {label:'JavaScript-heavy',url:'https://promptila.com'}
];
for(const site of sites){
 const started=Date.now();
 try{
  const r=await scanSite(site.url);
  console.log(JSON.stringify({site:site.label,hostname:r.host,status:r.status,score:r.score,classification:r.classification,
   checks:r.checks.length,pass:r.checks.filter(c=>c.verdict==='pass').length,fail:r.checks.filter(c=>c.verdict==='fail').length,unverified:r.checks.filter(c=>c.verdict==='unverified').length,
   javascript_suspected:r.javascript_suspected||false,duration_ms:r.duration_ms,wall_ms:Date.now()-started,requests:r.requests,bytes:r.bytes}));
 }catch(error:any){console.log(JSON.stringify({site:site.label,error:String(error?.message||error).slice(0,200),wall_ms:Date.now()-started}));}
}
