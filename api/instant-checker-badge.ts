import type {VercelRequest,VercelResponse} from '@vercel/node';
import {createClient} from '@supabase/supabase-js';
import {validateWebsite} from './_lib/instant-checker.ts';
export default async function handler(req:VercelRequest,res:VercelResponse){
 if(process.env.INSTANT_CHECKER_ENABLED!=='true')return res.status(404).end();
 if(req.method!=='GET')return res.status(405).end();
 try{
  const domain=validateWebsite(req.query.domain).hostname;
  const url=(process.env.SUPABASE_URL||'').replace(/\/rest\/v1\/?$/,'').replace(/\/$/,'');
  const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url||!key)return res.status(503).end();
  const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data,error}=await db.from('instant_scans').select('result,status,expires_at')
    .eq('domain',domain).maybeSingle();
  if(error||!data||data.status!=='complete'||!data.result||!Number.isInteger(data.result.score)||!data.expires_at||new Date(data.expires_at).getTime()<Date.now())return res.status(404).end();
  const score=data.result.score as number;
  if(score<0||score>100)return res.status(404).end();
  const link='https://www.promptila.com/ai-visibility-checker/report/'+encodeURIComponent(domain);
  const svg='<svg xmlns="http://www.w3.org/2000/svg" width="256" height="68" viewBox="0 0 256 68" role="img" aria-label="Promptila website readiness score '+score+' out of 100"><a href="'+link+'" target="_blank"><rect width="256" height="68" rx="10" fill="#111827"/><text x="14" y="24" font-size="14" font-family="Arial,sans-serif" font-weight="bold" fill="#ffffff">Promptila website check</text><text x="14" y="46" font-size="12" font-family="Arial,sans-serif" fill="#c7d2fe">AI readiness estimate</text><text x="242" y="45" text-anchor="end" font-size="23" font-family="Arial,sans-serif" font-weight="bold" fill="#ffffff">'+score+'/100</text></a></svg>';
  res.setHeader('Content-Type','image/svg+xml; charset=utf-8');
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Content-Security-Policy',"default-src 'none'; style-src 'unsafe-inline'; sandbox");
  res.setHeader('Cache-Control','public,max-age=300');
  return res.status(200).send(svg);
 }catch{return res.status(400).end();}
}
