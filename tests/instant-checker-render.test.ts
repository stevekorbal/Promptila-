import {performance} from 'node:perf_hooks';
import test from 'node:test';
import assert from 'node:assert/strict';
import {scanWebsite} from '../api/_lib/instant-checker.ts';
import {sameRenderHost,publicRenderDestination,renderJavaScriptPage} from '../api/_lib/instant-render.ts';
import type {PageResponse} from '../api/_lib/instant-network.ts';

const hostname='examplecandy.com';
const raw='<html><head><title>Example Candy Company — Local Candy Shop</title><meta name="description" content="Example Candy Company is a locally owned candy shop offering handmade treats and delicious snacks for our community."></head><body><div id="root"></div><script src="/assets/app.js"></script></body></html>';
const rendered='<html><head><title>Example Candy Company — Local Candy Shop</title><meta name="description" content="Example Candy Company is a locally owned candy shop offering handmade treats and delicious snacks for our community."><link rel="canonical" href="https://examplecandy.com/"><script type="application/ld+json">{"@context":"https://schema.org","@graph":[{"@type":"Organization","name":"Example Candy Company","url":"https://examplecandy.com/","description":"Example Candy Company is a locally owned candy shop offering handmade treats and delicious snacks for our community."},{"@type":"WebSite","name":"Example Candy Company","url":"https://examplecandy.com/"}]}</script></head><body><main><h1>Example Candy Company handmade treats</h1><h2>Locally made candy</h2><p>'+('Example Candy Company makes small-batch handmade candy and offers candy gifts to customers in our community. ').repeat(8)+'</p><a href="/about">About us</a></main></body></html>';
const about='<html><head><title>About Example Candy Company</title></head><body><main><h1>About our candy shop</h1><p>'+('Our team makes small-batch handmade candy for neighbors and families throughout our region. ').repeat(4)+'</p></main></body></html>';

function fakeFetch(url:URL,_start:number,_r=0,_opts?:unknown):Promise<PageResponse>{
 const body=url.pathname==='/robots.txt'||url.pathname==='/llms.txt'?'':url.pathname==='/about'?about:raw;
 const status=url.pathname==='/robots.txt'||url.pathname==='/llms.txt'?404:200;
 return Promise.resolve({url:url.href,status,type:status===200?'text/html':'text/plain',body,
  bytes:Buffer.byteLength(body),headers:{'x-robots-tag':'','content-type':'text/html'}});
}

test('JS-shell scan stays provisional without verified browser evidence',async()=>{
 const scan=await scanWebsite('https://'+hostname,fakeFetch);
 assert.equal(scan.status,'incomplete');
 assert.equal(scan.score,null);
 assert.equal(scan.rendering.status,'disabled');
 assert.equal(scan.checks.find(c=>c.id==='B2')?.status,'unverified');
});

test('verified rendered DOM produces defensible score without altering weights or crawler claims',async()=>{
 const rawScan=await scanWebsite('https://'+hostname,fakeFetch);
 const scan=await scanWebsite('https://'+hostname,fakeFetch,async()=>({
  html:rendered,url:'https://'+hostname+'/',duration_ms:1820,requests:4,bytes:8900,complete:true,source:'browser'
 }));
 assert.equal(scan.rendering.status,'complete');
 assert.equal(scan.rendering.elapsed_ms,1820);
 assert.equal(scan.status,'complete');
 assert.equal(scan.score,90);
 assert.equal(scan.provisional.unknown_points,0);
 assert.equal(scan.engines.ChatGPT!==null,true);
 assert.deepEqual(scan.robots_rules,rawScan.robots_rules);
 assert.deepEqual(scan.probes,rawScan.probes);
 assert.equal(scan.checks.find(c=>c.id==='B2')?.status,'pass');
 assert.match(scan.checks.find(c=>c.id==='B2')?.evidence||'',/rendered DOM/);
 assert.equal(scan.checks.find(c=>c.id==='C3')?.status,'pass');
 assert.equal(scan.checks.find(c=>c.id==='F3')?.status,'pass');
 assert.equal(scan.request_count,rawScan.request_count+5); // Additional same-site About page verification after rendering
});

test('browser fallback remains provisional when rendering fails',async()=>{
 const scan=await scanWebsite('https://'+hostname,fakeFetch,async()=>null);
 assert.equal(scan.status,'incomplete');
 assert.equal(scan.rendering.status,'failed');
});

test('browser request allowlist rejects internal/private and unrelated URLs',async()=>{
 const base=new URL('https://examplecandy.com');
 for(const value of ['http://localhost/','http://127.0.0.1/','http://169.254.169.254/','https://other-site.com/','file:///etc/passwd']){
  assert.equal(sameRenderHost(new URL(value),base),false,value);
 }
 assert.equal(sameRenderHost(new URL('https://www.examplecandy.com/main.js'),base),true);
 assert.equal(await publicRenderDestination(new URL('https://examplecandy.com/app.js'),base,
  async()=>[{address:'10.0.0.5',family:4}] as any),false);
 assert.equal(await publicRenderDestination(new URL('https://examplecandy.com/app.js'),base,
  async()=>[{address:'93.184.216.34',family:4}] as any),true);
});

test('browser fallback allows only one concurrent render per function instance',async()=>{
 const base=new URL('https://examplecandy.com');
 let entered=false;
 const pending=renderJavaScriptPage(base,fakeFetch,performance.now(),async()=>{
  entered=true;
  await new Promise(resolve=>setTimeout(resolve,80));
  throw Error('simulated launch cancelled');
 });
 assert.equal(entered,true);
 const overlapping=await renderJavaScriptPage(base,fakeFetch,performance.now(),async()=>{
  throw Error('second browser must never launch');
 });
 assert.equal(overlapping,null);
 await pending;
});
