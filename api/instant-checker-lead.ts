import type {VercelRequest,VercelResponse} from '@vercel/node';
import {admitted,db} from './_lib/instant.ts';
function clean(v:unknown,max:number){return typeof v==='string'?v.trim().replace(/[\u0000-\u001f]/g,'').slice(0,max+1):'';}
export default async function handler(req:VercelRequest,res:VercelResponse){
 if(!admitted(req,res))return;
 if(req.method!=='POST')return res.status(405).json({error:'POST only'});
 const {website,full_name,business_email,company_name,job_role,consent}=req.body||{};
 const name=clean(full_name,120),email=clean(business_email,254).toLowerCase(),company=clean(company_name,160),role=clean(job_role,120);
 if(name.length<2||company.length<2||role.length<2||!(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))||consent!==true)return res.status(400).json({error:'Complete all fields and confirm consent'});
 try{
  const {normalizeSite}=await import('../lib/instantChecker/scanner.ts');
  const {host}=normalizeSite(website);const client=db();
  const {data:scan,error:e}=await client.from('instant_scans').select('id,status').eq('host',host).maybeSingle();
  if(e)throw e;if(!scan||!['complete','incomplete'].includes(scan.status))return res.status(400).json({error:'A completed or provisional website scan is required first'});
  const {error}=await client.from('instant_scan_leads').upsert({scan_id:scan.id,full_name:name,business_email:email,company_name:company,job_role:role,consent_at:new Date().toISOString()},{onConflict:'scan_id,business_email'});
  if(error)throw error;
  return res.status(200).json({ok:true,message:'Your request was received. A complete fix plan is not included in this phase.'});
 }catch(e:any){console.error('Instant lead submission failure',String(e?.message||e));return res.status(503).json({error:'Unable to save the request'});}
}
