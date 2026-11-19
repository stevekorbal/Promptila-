import type {VercelRequest,VercelResponse} from '@vercel/node';
import {db} from './_lib/instant.ts';
import {normalizeSite} from '../lib/instantChecker/scanner.ts';
// Badges remain disabled until explicit PUBLIC launch approval.
export default async function handler(req:VercelRequest,res:VercelResponse){
 res.setHeader('X-Content-Type-Options','nosniff');
 if(process.env.INSTANT_CHECKER_PUBLIC_ENABLED!=='true')return res.status(404).end();
 if(req.method!=='GET')return res.status(405).end();
 try{
  const {host}=normalizeSite(req.query.website);const client=db();
  const {data,error}=await client.from('instant_scans').select('score,status,scanned_at,expires_at').eq('host',host).maybeSingle();
  if(error||!data||data.status!=='complete'||data.score===null||!data.expires_at||new Date(data.expires_at).getTime()<=Date.now())return res.status(404).end();
  const score=Math.round(data.score);const safeHost=host.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');
  const date=data.scanned_at?new Date(data.scanned_at).toISOString().slice(0,10):'';
  const svg='<svg xmlns="http://www.w3.org/2000/svg" width="320" height="90" viewBox="0 0 320 90" role="img" aria-label="Promptila website readiness score '+score+' out of 100"><rect width="320" height="90" fill="#f8fafc" rx="12"/><rect x="1" y="1" width="318" height="88" fill="none" stroke="#cbd5e1" rx="11"/><text x="18" y="27" font-family="Arial,sans-serif" font-size="15" fill="#4f46e5" font-weight="bold">PROMPTILA</text><text x="18" y="48" font-family="Arial,sans-serif" font-size="12" fill="#334155">Website readiness estimate</text><text x="18" y="68" font-family="Arial,sans-serif" font-size="10" fill="#64748b">'+safeHost+' · '+date+'</text><text x="285" y="56" text-anchor="end" font-family="Arial,sans-serif" font-weight="bold" font-size="32" fill="#1e293b">'+score+'<tspan font-size="12">/100</tspan></text></svg>';
  res.setHeader('Content-Type','image/svg+xml; charset=utf-8');
  res.setHeader('Cache-Control','public,max-age=3600');return res.status(200).send(svg);
 }catch{return res.status(404).end();}
}
