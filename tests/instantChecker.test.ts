import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeSite,scanSite,type FetchResult} from '../lib/instantChecker/scanner.ts';

function ok(url:string,text:string,contentType='text/html'):FetchResult{
 return {kind:'ok',text,status:200,url,contentType,bytes:Buffer.byteLength(text),indexHeader:''};
}
function missing(url:string):FetchResult{return {kind:'missing',text:'',status:404,url,contentType:'text/plain',bytes:0,indexHeader:''};}
function fixture(html:string,opts:{robots?:FetchResult;llms?:FetchResult}={}){
 return async(url:string):Promise<FetchResult>=>{
  if(url.endsWith('/robots.txt'))return opts.robots||missing(url);
  if(url.endsWith('/llms.txt'))return opts.llms||missing(url);
  if(url.includes('/about'))return ok(url,'<html><body><h1>About Example Plumbing</h1><p>We offer licensed plumbing services and repair services.</p></body></html>');
  return ok(url,html);
 };
}
const description='Example Plumbing provides plumbing installations, emergency repairs and maintenance services for local homes and businesses.';
const html='<!doctype html><html><head><title>Example Plumbing | Plumbing Services</title><meta name="description" content="'+description+'"/><link rel="canonical" href="https://example.com/"/><script type="application/ld+json">{"@context":"https://schema.org","@type":["Organization","WebSite","WebPage"],"name":"Example Plumbing","url":"https://example.com/"}</script></head><body><main><h1>Example Plumbing Services</h1><h2>Our Services</h2><a href="/about">About our company</a><p>'+('Example Plumbing provides residential and commercial plumbing repair services. ').repeat(12)+'</p></main></body></html>';

test('URL validation rejects local, special, unsafe and credentialed destinations',()=>{
 for(const input of ['http://localhost','http://127.0.0.1','http://10.0.0.1','http://169.254.169.254','http://[::1]','https://example.com:8080','https://a:b@example.com','ftp://example.com','https://example.local','javascript:alert(1)']){
  assert.throws(()=>normalizeSite(input),undefined,input);
 }
 assert.deepEqual(normalizeSite('example.com'),{host:'example.com',url:'https://example.com/'});
});
test('complete HTML evidence yields 100-point result with estimates and no AI calls',async()=>{
 const md='# Example Plumbing\n\nOur company provides plumbing service, emergency repairs and installation. Read more about our team.\n\n- [About](https://example.com/about)';
 const result=await scanSite('https://example.com',fixture(html,{llms:ok('https://example.com/llms.txt',md,'text/plain')}));
 assert.equal(result.status,'complete');assert.equal(result.score,100);
 assert.equal(result.checks.length,25);
 for(const check of result.checks)assert.equal(check.verdict,'pass',check.id);
 for(const engine of ['ChatGPT','Gemini','Claude','Perplexity'])assert.equal(result.estimates?.[engine],100);
});
test('JavaScript application shell does not receive a definitive failure score',async()=>{
 const shell='<html><head><title>Example Plumbing</title></head><body><div id="root"></div><script src="/app.js"></script></body></html>';
 const result=await scanSite('https://example.com',fixture(shell));
 assert.equal(result.status,'incomplete');assert.equal(result.score,null);
 assert.equal(result.estimates,null);assert.equal(result.classification,null);
 assert.ok(result.checks.some(c=>c.verdict==='unverified'&&c.category==='semantic'));
 assert.equal(result.javascript_suspected,true);
});
test('unreachable robots.txt is unverified rather than blocked or awarded zero',async()=>{
 const result=await scanSite('https://example.com',fixture(html,{robots:{kind:'error',text:'',status:0,url:'https://example.com/robots.txt',contentType:'',bytes:0,indexHeader:''}}));
 assert.equal(result.status,'incomplete');assert.equal(result.score,null);
 assert.equal(result.checks.find(c=>c.id==='A1')?.verdict,'unverified');
});
test('HTML fallback at llms.txt does not earn llms.txt points',async()=>{
 const result=await scanSite('https://example.com',fixture(html,{llms:ok('https://example.com/llms.txt','<html><body>Not found</body></html>')}));
 assert.equal(result.checks.find(c=>c.id==='E1')?.verdict,'fail');
});
test('cross-domain homepage redirects produce incomplete rather than misleading results',async()=>{
 const result=await scanSite('https://example.com',async url=>url==='https://example.com/'?ok('https://unrelated-site.com/',html):missing(url));
 assert.equal(result.status,'incomplete');assert.equal(result.score,null);
});
