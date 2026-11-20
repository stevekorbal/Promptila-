import test from 'node:test';
import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';
import {renderJavaScriptPage} from '../api/_lib/instant-render.ts';
import type {PageResponse} from '../api/_lib/instant-network.ts';

test('headless Chromium renders an isolated JavaScript website with no outbound browser network',async()=>{
 const old=process.env.INSTANT_RENDER_FALLBACK;
 process.env.INSTANT_RENDER_FALLBACK='true';
 const calls:string[]=[];
 const site=new URL('https://example.com/');
 const fetcher=async (url:URL):Promise<PageResponse>=>{
  calls.push(url.pathname);
  let body='',type='text/html';
  if(url.pathname==='/'){
   body='<html><head><title>Example Candy Company</title></head><body><div id="root"></div><script src="/app.js"></script></body></html>';
  }else if(url.pathname==='/app.js'){
   type='application/javascript';
   body='document.getElementById("root").innerHTML="<main><h1>Example Candy</h1><p>Real rendered content from a bounded JS bundle.</p></main>"; fetch("http://169.254.169.254/latest/meta-data/").catch(()=>{});';
  }else throw Error('unexpected browser resource');
  return {url:url.href,status:200,type,body,bytes:Buffer.byteLength(body),headers:{'content-type':type}};
 };
 try{
  const rendered=await renderJavaScriptPage(site,fetcher,performance.now());
  assert.ok(rendered,'Browser failed to render fixture');
  assert.match(rendered.html,/<h1>Example Candy<\/h1>/);
  assert.equal(rendered.requests,2);
  assert.deepEqual(calls,['/','/app.js']);
  assert.ok(rendered.duration_ms<9000);
  console.log('BROWSER_SMOKE '+JSON.stringify({duration_ms:rendered.duration_ms,requests:rendered.requests,bytes:rendered.bytes}));
 }finally{
  if(old===undefined)delete process.env.INSTANT_RENDER_FALLBACK;
  else process.env.INSTANT_RENDER_FALLBACK=old;
 }
});
