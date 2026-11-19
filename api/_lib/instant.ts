import type {VercelRequest,VercelResponse} from '@vercel/node';
import {createClient} from '@supabase/supabase-js';
import {createHash,timingSafeEqual} from 'node:crypto';
export function db(){
 const url=(process.env.SUPABASE_URL||'').replace(/\/rest\/v1\/?$/,'').replace(/\/$/,'');
 const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!key)throw new Error('Checker database not configured');
 return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
}
export function admitted(req:VercelRequest,res:VercelResponse){
 res.setHeader('Cache-Control','no-store');
 res.setHeader('X-Robots-Tag','noindex, nofollow');
 const privateToken=process.env.INSTANT_CHECKER_PRIVATE_TOKEN;
 if(!privateToken||privateToken.length<24){res.status(503).json({error:'Checker not enabled'});return false;}
 if(process.env.INSTANT_CHECKER_PUBLIC_ENABLED==='true')return true;
 const submitted=String(req.headers['x-promptila-preview-token']||'');
 const a=Buffer.from(submitted),b=Buffer.from(privateToken);
 if(a.length!==b.length||!timingSafeEqual(a,b)){res.status(404).json({error:'Not found'});return false;}
 return true;
}
export function clientHash(req:VercelRequest){
 // Vercel should supply the ingress client address. Must be verified against deployment proxy configuration before public enablement.
 const raw=String(req.headers['x-vercel-forwarded-for']||req.headers['x-forwarded-for']||req.socket.remoteAddress||'unknown').split(',')[0].trim();
 return createHash('sha256').update(String(process.env.INSTANT_CHECKER_RATE_SALT||process.env.INSTANT_CHECKER_PRIVATE_TOKEN||'')+':'+raw).digest('hex');
}
export function publicFields(result:any){
 // Explicit allowlist: no raw crawl HTML, customer data, audit records, or internal diagnostics.
 return {host:result.host,url:result.url,version:result.version,status:result.status,score:result.score,
 classification:result.classification,categories:result.categories,estimates:result.estimates,
 crawler:result.crawler,checks:result.checks,summary:result.summary,scanned_at:result.scanned_at,
 duration_ms:result.duration_ms,javascript_suspected:result.javascript_suspected};
}
