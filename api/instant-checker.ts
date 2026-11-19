import type { VercelRequest,VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { createHash } from 'node:crypto';
import { scanWebsite,validateWebsite } from './_lib/instant-checker.ts';
export const config={maxDuration:60};
function database(){
 const url=(process.env.SUPABASE_URL||'').replace(/\/rest\/v1\/?$/,'').replace(/\/$/,'');
 const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!key)throw Error('Service not configured');
 return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
}
export function publicResult(row:any){
 if(!row||!row.result)return null;
 const r=row.result;
 // Explicit allowlist. Never include private lead records, internal IDs or raw HTML.
 return {domain:r.domain,url:r.url,scanned_at:r.scanned_at,version:r.version,status:r.status,
  score:r.score,classification:r.classification,categories:r.categories,engines:r.engines,
  crawlerAccess:r.crawlerAccess,checks:r.checks,js_dependent:r.js_dependent,
  elapsed_ms:r.elapsed_ms,request_count:r.request_count,bytes_fetched:r.bytes_fetched,
  disclaimer:r.disclaimer,llms_note:r.llms_note};
}
export default async function handler(req:VercelRequest,res:VercelResponse){
 res.setHeader('Cache-Control','no-store');
 res.setHeader('X-Content-Type-Options','nosniff');
 if(process.env.INSTANT_CHECKER_ENABLED!=='true')return res.status(404).json({error:'Checker is not available.'});
 if(!['POST','GET'].includes(req.method||''))return res.status(405).json({error:'Method not allowed'});
 try{
  const url=validateWebsite(req.method==='GET'?req.query.domain:req.body?.website);
  const domain=url.hostname;const db=database();
  if(req.method==='GET'){
   const {data,error}=await db.from('instant_scans').select('result,status').eq('domain',domain).maybeSingle();
   if(error)throw error;
   if(!data||!data.result)return res.status(404).json({error:'No report available.'});
   return res.status(200).json({report:publicResult(data)});
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
  if(claim!=='claimed')return res.status(503).json({error:'Unable to reserve scan.'});
  try{
   const output=await scanWebsite(url.href);
   const cpuRate=Number(process.env.INSTANT_COMPUTE_USD_PER_MS);
   const transferRate=Number(process.env.INSTANT_TRANSFER_USD_PER_BYTE);
   const calibrated=process.env.INSTANT_COMPUTE_USD_PER_MS!==undefined&&process.env.INSTANT_TRANSFER_USD_PER_BYTE!==undefined&&Number.isFinite(cpuRate)&&Number.isFinite(transferRate)&&cpuRate>=0&&transferRate>=0;
   const estimatedCost=calibrated?Number((output.elapsed_ms*cpuRate+output.bytes_fetched*transferRate).toFixed(6)):null;
   const {error:updateError}=await db.from('instant_scans').update({
    status:output.status,result:output,score_version:output.version,
    elapsed_ms:output.elapsed_ms,bytes_fetched:output.bytes_fetched,request_count:output.request_count,
    estimated_cost_usd:estimatedCost,
    scanned_at:output.scanned_at,
    expires_at:new Date(Date.now()+7*86400_000).toISOString()
   }).eq('domain',domain).eq('status','running');
   if(updateError)throw updateError;
   return res.status(200).json({report:publicResult({result:output}),cached:false});
  }catch(error){
   await db.from('instant_scans').update({status:'error',lease_expires_at:new Date().toISOString()}).eq('domain',domain).eq('status','running');
   return res.status(502).json({error:'The website could not be checked safely. No score was assigned.'});
  }
 }catch(error:any){
  const message=String(error?.message||'');
  if(/valid website|public DNS|Unsafe|Invalid hostname|Only public|URL too long/.test(message))return res.status(400).json({error:'Enter a valid public website URL.'});
  console.error('Instant checker unavailable',message.slice(0,100));
  return res.status(503).json({error:'Checker temporarily unavailable.'});
 }
}
