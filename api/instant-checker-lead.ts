import type {VercelRequest,VercelResponse} from '@vercel/node';
import {createClient} from '@supabase/supabase-js';
import {createHash} from 'node:crypto';
import {isIP} from 'node:net';
// Match the existing public-website input restrictions without a runtime
// import from scanner internals. A lead request performs no website fetch.
function validateLeadWebsite(value:unknown):URL{
 if(typeof value!=='string'||value.length>2048||/[\\s\\x00-\\x1f]/.test(value))throw Error('Invalid public website URL');
 const candidate=/^https?:\\/\\//i.test(value)?value:'https://'+value;
 const url=new URL(candidate);
 if(!['https:','http:'].includes(url.protocol)||url.username||url.password||url.port||url.search||url.hash)throw Error('Only a public website URL is accepted');
 const host=url.hostname.toLowerCase().replace(/\\.$/,'');
 if(!host.includes('.')||isIP(host)||host.endsWith('.local')||host.endsWith('.internal')||host.length>253||!/^[a-z0-9.-]+$/.test(host))throw Error('Public DNS name required');
 if(host.split('.').some(x=>!x||x.length>63||x.startsWith('-')||x.endsWith('-')))throw Error('Invalid DNS name');
 url.hostname=host;url.pathname='/';url.search='';url.hash='';
 return url;
}
export default async function handler(req:VercelRequest,res:VercelResponse){
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});
 const text=(v:unknown,max:number)=>typeof v==='string'?v.trim().slice(0,max+1):'';
 const name=text(req.body?.full_name,120),email=text(req.body?.business_email,254).toLowerCase();
 const company=text(req.body?.company_name,160),role=text(req.body?.role_title,100);
 if(!name||name.length>120||!company||company.length>160||!role||role.length>100||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||req.body?.consent!==true)
  return res.status(400).json({error:'Enter all fields and agree to the privacy notice.'});
 try{
  const domain=validateLeadWebsite(req.body?.domain).hostname;
  const url=(process.env.SUPABASE_URL||process.env.VITE_SUPABASE_URL||'').replace(/\/rest\/v1\/?$/,'').replace(/\/$/,'');
  const key=process.env.SUPABASE_SERVICE_ROLE_KEY,salt=process.env.INSTANT_CHECKER_RATE_SALT;
  if(!url||!key||!salt||salt.length<24)return res.status(503).json({error:'Unavailable'});
  const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
  const remote=String(req.headers['x-vercel-forwarded-for']||req.socket.remoteAddress||'unknown').slice(0,128);
  const ipHash=createHash('sha256').update('lead:'+salt+':'+remote).digest('hex');
  const {data:allowed,error:limitError}=await db.rpc('instant_claim_lead',{p_ip_hash:ipHash});
  if(limitError)throw limitError;
  if(!allowed)return res.status(429).json({error:'Too many requests. Try later.'});
  const {data:scan,error:scanError}=await db.from('instant_scans')
    .select('id,status').eq('domain',domain).maybeSingle();
  if(scanError)throw scanError;
  if(!scan||!['complete','incomplete'].includes(scan.status))return res.status(400).json({error:'Scan is not available.'});
  const {error:insertError}=await db.from('instant_scan_leads').insert({
   scan_id:scan.id,full_name:name,business_email:email,company_name:company,role_title:role,consent:true,marketing_consent:req.body?.marketing_consent===true
  });
  if(insertError)throw insertError;
  return res.status(200).json({success:true,message:'Your request has been recorded. No paid plan has been activated.'});
 }catch(e){console.error('Instant lead error');return res.status(503).json({error:'Unable to save request.'});}
}
