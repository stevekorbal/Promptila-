import type { VercelRequest,VercelResponse } from '@vercel/node';
import { createHash } from 'node:crypto';
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
 try{
  const {scanWebsite,validateWebsite}=await import('./_lib/instant-checker.ts');
  const url=validateWebsite(req.method==='GET'?req.query.domain:req.body?.website);
  const domain=url.hostname;const db=await database();
  if(req.method==='GET'){
   const badgeMode=req.query.badge==='1';
   const {data,error}=await db.from('instant_scans').select('result,status,expires_at').eq('domain',domain).maybeSingle();
   if(error)throw error;
   if(badgeMode){
    const {badgeSvg,BADGE_STYLES}=await import('./_lib/instant-badge.ts');
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
    /invalid api key|jwt|permission denied|relation .* does not exist|Could not find the function|fetch failed|connect|PGRST|ECONN|ENOTFOUND/i.test(message)?'database_unavailable':'server_unavailable';
  console.error('Instant checker unavailable',code,message.slice(0,160));
  return res.status(503).json({error:'Checker temporarily unavailable.',code});
 }
}
