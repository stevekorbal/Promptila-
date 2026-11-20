import {performance} from 'node:perf_hooks';
import type {PageResponse,FetchOptions} from './instant-network.ts';
import {publicIPv4} from './instant-network.ts';
import {lookup} from 'node:dns/promises';
import {isIP} from 'node:net';

export type RenderedPage={html:string;url:string;duration_ms:number;requests:number;bytes:number;complete:boolean;source:'browser'};
export type SafeRendererFetcher=(url:URL,start:number,redirects?:number,options?:FetchOptions)=>Promise<PageResponse>;
export const RENDER_MAX_REQUESTS=18;
export const RENDER_MAX_BYTES=6_000_000;
export const RENDER_MAX_MS=9_000;

export function sameRenderHost(candidate:URL,base:URL){
 const normalize=(s:string)=>s.toLowerCase().replace(/^www\./,'');
 return ['http:','https:'].includes(candidate.protocol) && !candidate.username&&!candidate.password&&!candidate.port&&
  normalize(candidate.hostname)===normalize(base.hostname)&&!isIP(candidate.hostname);
}
export async function publicRenderDestination(target:URL,base:URL,resolver=lookup){
 if(!sameRenderHost(target,base))return false;
 try{
  const results=await resolver(target.hostname,{all:true,family:4,verbatim:true});
  return results.length>0&&results.every((item:any)=>publicIPv4(item.address));
 }catch{return false;}
}

// Browser HTTP is always fulfilled by the existing DNS-pinned, bounded server fetcher.
// No route.continue() or native browser network access is permitted.
export async function renderJavaScriptPage(
 website:URL,fetcher:SafeRendererFetcher,started:number,
 launch?:()=>Promise<any>
):Promise<RenderedPage|null>{
 if(process.env.INSTANT_RENDER_FALLBACK!=='true'&&!launch)return null;
 const begin=performance.now();let browser:any;
 let requests=0,bytes=0;let overBudget=false;
 // Avoid downloading browsers at runtime. Chromium ships with the function.
 try{
  const launchBrowser=launch||(async()=>{
   const [{default:puppeteer},{default:chromium}]=await Promise.all([
    import('puppeteer-core'),import('@sparticuz/chromium')
   ]);
   return puppeteer.launch({
    executablePath:await chromium.executablePath(),
    args:[...chromium.args,'--disable-background-networking','--disable-extensions','--disable-sync','--no-first-run'],
    headless:true,timeout:3500,protocolTimeout:5500
   });
  });
  browser=await Promise.race([
   launchBrowser(),
   new Promise<never>((_,reject)=>setTimeout(()=>reject(Error('browser_launch_deadline')),4000))
  ]);
  const page=await browser.newPage();
  await page.setCacheEnabled(false);
  await page.setBypassServiceWorker(true);
  await page.setRequestInterception(true);
  await page.evaluateOnNewDocument(()=>{
   // Disable browser APIs that can bypass HTTP interception.
   Object.defineProperty(window,'WebSocket',{value:class {constructor(){throw Error('disabled');}}});
   Object.defineProperty(window,'EventSource',{value:class {constructor(){throw Error('disabled');}}});
   Object.defineProperty(window,'RTCPeerConnection',{value:class {constructor(){throw Error('disabled');}}});
   Object.defineProperty(window,'Worker',{value:class {constructor(){throw Error('disabled');}}});
   Object.defineProperty(window,'SharedWorker',{value:class {constructor(){throw Error('disabled');}}});
   if('sendBeacon' in navigator)Object.defineProperty(navigator,'sendBeacon',{value:()=>false});
  });
  page.on('request',async (request:any)=>{
   const abort=async()=>{try{await request.abort('blockedbyclient')}catch{}};
   try{
    if(overBudget||performance.now()-begin>RENDER_MAX_MS)return await abort();
    if(!['GET','HEAD'].includes(request.method()))return await abort();
    if(['image','media','font','stylesheet'].includes(request.resourceType()))return await abort();
    const target=new URL(request.url());
    if(!await publicRenderDestination(target,website))return await abort();
    if(++requests>RENDER_MAX_REQUESTS){overBudget=true;return await abort();}
    // The original scanner performs pinned DNS lookup, rejects non-public addresses
    // and validates every redirect. allowedHost closes cross-site redirect escape.
    const result=await fetcher(target,started,0,{
     deadline:Math.min(21_000,Math.ceil(performance.now()-started)+4000),
     maxCapture:500_000,stopAfterCapture:true,allowedHost:website.hostname
    });
    if(!sameRenderHost(new URL(result.url),website))return await abort();
    bytes+=result.bytes;
    if(bytes>RENDER_MAX_BYTES){overBudget=true;return await abort();}
    await request.respond({
     status:result.status,
     contentType:result.type||'text/plain',
     body:result.body,
     headers:{'access-control-allow-origin':'*','cache-control':'no-store'}
    });
   }catch{await abort();}
  });
  page.on('popup',async (popup:any)=>{try{await popup.close()}catch{}});
  await page.setDefaultNavigationTimeout(6000);
  await page.goto(website.href,{waitUntil:'domcontentloaded',timeout:6000});
  // React hydration is bounded: no networkidle, which can wait forever.
  await new Promise(resolve=>setTimeout(resolve,Math.min(1000,Math.max(0,RENDER_MAX_MS-(performance.now()-begin)))));
  const html=await page.content();
  const finalUrl=new URL(page.url());
  if(!sameRenderHost(finalUrl,website)||html.length>1_000_000||html.length<100||overBudget)return null;
  return {html,url:page.url(),requests,bytes,duration_ms:Math.round(performance.now()-begin),complete:true,source:'browser'};
 }catch{return null;
 }finally{if(browser)try{await Promise.race([browser.close(),new Promise(r=>setTimeout(r,700))])}catch{}}
}
