import http from 'node:http';
import https from 'node:https';
import {lookup} from 'node:dns/promises';
import {BlockList,isIP} from 'node:net';
import {createGunzip,createInflate,createBrotliDecompress} from 'node:zlib';
import {performance} from 'node:perf_hooks';
import {Transform,Writable} from 'node:stream';
import {pipeline} from 'node:stream/promises';

const denied=new BlockList();
for(const [address,prefix] of [
 ['0.0.0.0',8],['10.0.0.0',8],['100.64.0.0',10],['127.0.0.0',8],
 ['169.254.0.0',16],['172.16.0.0',12],['192.0.0.0',24],['192.0.2.0',24],
 ['192.88.99.0',24],['192.168.0.0',16],['198.18.0.0',15],
 ['198.51.100.0',24],['203.0.113.0',24],['224.0.0.0',4],['240.0.0.0',4]
] as const)denied.addSubnet(address,prefix,'ipv4');

export const MAX_WIRE=2_500_000;
export const MAX_INFLATED=4_000_000;
export const MAX_CAPTURE=1_800_000;
export const TOTAL_BUDGET=23_000;

export function publicIPv4(address:string){return isIP(address)===4&&!denied.check(address,'ipv4');}
export function validateWebsite(value:unknown):URL{
 if(typeof value!=='string'||value.length>2048||/[\s\x00-\x1f]/.test(value))throw Error('Invalid public website URL');
 const candidate=/^https?:\/\//i.test(value)?value:'https://'+value;
 const url=new URL(candidate);
 if(!['https:','http:'].includes(url.protocol)||url.username||url.password||url.port||url.search||url.hash)throw Error('Only a public website URL is accepted');
 const host=url.hostname.toLowerCase().replace(/\.$/,'');
 if(!host.includes('.')||isIP(host)||host.endsWith('.local')||host.endsWith('.internal')||host.length>253||!/^[a-z0-9.-]+$/.test(host))throw Error('Public DNS name required');
 if(host.split('.').some(x=>!x||x.length>63||x.startsWith('-')||x.endsWith('-')))throw Error('Invalid DNS name');
 url.hostname=host;url.pathname='/';url.search='';url.hash='';
 return url;
}
export type PageResponse={
 url:string;status:number;type:string;body:string;bytes:number;wire_bytes?:number;
 decompressed_bytes?:number;truncated?:boolean;headers:Record<string,string>;
 reason?:string;redirects?:number;
};
export type FetchOptions={userAgent?:string;maxCapture?:number;deadline?:number;stopAfterCapture?:boolean;allowedHost?:string};
export async function safeFetch(url:URL,start:number,redirects=0,options:FetchOptions={}):Promise<PageResponse>{
 if(redirects>3)throw Error('redirect_limit');
 if(options.allowedHost){
  const normalize=(name:string)=>name.toLowerCase().replace(/^www\./,'');
  if(normalize(url.hostname)!==normalize(options.allowedHost))throw Error('unsafe_cross_site_redirect');
 }
 if(performance.now()-start>(options.deadline??TOTAL_BUDGET))throw Error('scan_deadline');
 if(!['https:','http:'].includes(url.protocol)||url.port||url.username||url.password||isIP(url.hostname))throw Error('unsafe_destination');
 if(url.href.length>2100)throw Error('url_too_long');
 const addresses=await lookup(url.hostname,{all:true,family:4,verbatim:true});
 if(!addresses.length||addresses.some(x=>!publicIPv4(x.address)))throw Error('destination_not_public_ipv4');
 const pinned=addresses[0].address;
 const timeout=Math.min(6500,Math.max(500,(options.deadline??TOTAL_BUDGET)-(performance.now()-start)));
 return await new Promise<PageResponse>((resolve,reject)=>{
  let settled=false;
  const finish=(fn:()=>void)=>{if(!settled){settled=true;fn();}};
  const transport=url.protocol==='https:'?https:http;
  const req=transport.request({
   hostname:url.hostname,port:url.protocol==='https:'?443:80,protocol:url.protocol,
   path:url.pathname+url.search,method:'GET',family:4,agent:false,
   lookup:(_hostname,_opts,cb)=>cb(null,pinned,4),
   headers:{
    'user-agent':options.userAgent||'PromptilaInstantChecker/1.1 (+https://www.promptila.com)',
    accept:'text/html,text/plain,application/json,*/*;q=0.5',
    'accept-encoding':'gzip, deflate, br, identity'
   },timeout
  },async res=>{
   const code=res.statusCode||0;
   if([301,302,303,307,308].includes(code)){
    const location=res.headers.location;res.resume();
    if(!location)return finish(()=>reject(Error('redirect_without_location')));
    let target:URL;
    try{target=new URL(location,url);}catch{return finish(()=>reject(Error('invalid_redirect')));}
    if(!['http:','https:'].includes(target.protocol)||target.port||target.username||target.password||isIP(target.hostname))
     return finish(()=>reject(Error('unsafe_redirect')));
    return safeFetch(target,start,redirects+1,options).then(data=>finish(()=>resolve(data)),error=>finish(()=>reject(error)));
   }
   const encoding=String(res.headers['content-encoding']||'identity').toLowerCase().trim();
   const type=String(res.headers['content-type']||'').toLowerCase();
   let unzip:Transform|undefined;
   if(encoding==='gzip')unzip=createGunzip();
   else if(encoding==='deflate')unzip=createInflate();
   else if(encoding==='br')unzip=createBrotliDecompress();
   else if(encoding!=='identity'&&encoding!=='')return finish(()=>reject(Error('unsupported_encoding')));
   let wireBytes=0,inflatedBytes=0,capturedBytes=0,wasTruncated=false;
   const chunks:Buffer[]=[];
   const cap=Math.min(options.maxCapture??MAX_CAPTURE,MAX_CAPTURE);
   let exceeded=false,stoppedAtCapture=false;
   const wireMeter=new Transform({transform(chunk:Buffer,_enc,callback){
    wireBytes+=chunk.length;
    if(wireBytes>MAX_WIRE){exceeded=true;callback(Error('wire_limit'));return;}
    callback(null,chunk);
   }});
   const sink=new Writable({write(chunk:Buffer,_enc,callback){
    inflatedBytes+=chunk.length;
    if(inflatedBytes>MAX_INFLATED){exceeded=true;callback(Error('decompression_limit'));return;}
    const available=cap-capturedBytes;
    if(available>0){
     const kept=chunk.subarray(0,Math.min(available,chunk.length));
     chunks.push(kept);capturedBytes+=kept.length;
    }
    if(inflatedBytes>=cap){
     wasTruncated=true;
     if(options.stopAfterCapture){stoppedAtCapture=true;callback(Error('capture_limit'));return;}
    }
    callback();
   }});
   try{
    if(unzip)await pipeline(res,wireMeter,unzip,sink);
    else await pipeline(res,wireMeter,sink);
   }catch(error:any){
    if(!exceeded&&!stoppedAtCapture)return finish(()=>reject(Error('stream_error:'+String(error?.code||error?.message||'unknown').slice(0,80))));
    wasTruncated=true;
   }
   let body=Buffer.concat(chunks).toString('utf8');
   // Avoid treating a severed tag as complete evidence.
   if(wasTruncated&&type.includes('html')){const last=body.lastIndexOf('>');body=last<0?'':body.slice(0,last+1);}
   finish(()=>resolve({
    url:url.href,status:code,type,body,bytes:capturedBytes,wire_bytes:wireBytes,
    decompressed_bytes:inflatedBytes,truncated:wasTruncated,
    headers:{'x-robots-tag':String(res.headers['x-robots-tag']||''),'content-type':type},
    reason:wasTruncated?'bounded_partial_response':undefined,redirects
   }));
  });
  req.on('timeout',()=>req.destroy(Error('request_timeout')));
  req.on('error',error=>finish(()=>reject(error)));
  req.end();
 });
}
