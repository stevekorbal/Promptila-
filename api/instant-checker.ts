import type {VercelRequest,VercelResponse} from '@vercel/node';
import {admitted,db,clientHash,publicFields} from './_lib/instant.ts';
import {normalizeSite,scanSite} from '../lib/instantChecker/scanner.ts';

export const maxDuration=30;
export default async function handler(req:VercelRequest,res:VercelResponse){
 if(!admitted(req,res))return;
 if(!['GET','POST'].includes(req.method||''))return res.status(405).json({error:'Unsupported method'});
 try{
  const site=normalizeSite(req.method==='GET'?req.query.website:req.body?.website);
  const client=db();
  const read=async()=>{const {data,error}=await client.from('instant_scans').select('public_result,status,expires_at').eq('host',site.host).maybeSingle();if(error)throw error;return data;};
  if(req.method==='GET'){
   const row=await read();if(!row||!row.public_result)return res.status(404).json({error:'No completed report'});
   return res.status(200).json({report:publicFields(row.public_result),cached:true});
  }
  const {data:decision,error:claimError}=await client.rpc('claim_instant_scan',{p_host:site.host,p_url:site.url,p_ip_hash:clientHash(req)});
  if(claimError)throw claimError;
  if(decision==='cached'){const row=await read();if(row?.public_result)return res.status(200).json({report:publicFields(row.public_result),cached:true});}
  if(decision==='busy')return res.status(202).json({status:'running',message:'Scan already running; check again shortly.'});
  if(decision==='rate_limited')return res.status(429).json({error:'Scan limit reached. Try again later.'});
  if(decision!=='claimed')return res.status(400).json({error:'Unable to scan this website'});
  let result;
  try{result=await scanSite(site.url);}
  catch(err){
   await client.from('instant_scans').update({status:'error',expires_at:new Date(Date.now()+5*60*1000).toISOString()}).eq('host',site.host);
   throw err;
  }
  const {error:saveError}=await client.from('instant_scans').update({
   status:result.status,public_result:publicFields(result),score:result.score,
   scoring_version:result.version,scanned_at:result.scanned_at,expires_at:new Date(Date.now()+7*86400000).toISOString(),
   duration_ms:result.duration_ms,request_count:result.requests,bytes_transferred:result.bytes,
   // Resource-only proxy, not billed cost; reconcile against actual Vercel/Supabase usage.
   estimated_cost_usd:Number((0.0002+result.bytes/1e9*0.08).toFixed(6))
  }).eq('host',site.host);
  if(saveError)throw saveError;
  return res.status(200).json({report:publicFields(result),cached:false});
 }catch(err:any){
  if(/URL|domain|website|public HTTP|Invalid/.test(String(err?.message||'')))return res.status(400).json({error:'Enter a valid public website address'});
  console.error('Private instant-checker error',String(err?.message||err));
  return res.status(503).json({error:'The scan could not be completed safely. No score was published.'});
 }
}
