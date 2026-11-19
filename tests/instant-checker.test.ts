import test from 'node:test';
import { publicResult } from '../api/instant-checker.ts';
import assert from 'node:assert/strict';
import {validateWebsite,publicIPv4,calculate,scanWebsite,type Check} from '../api/_lib/instant-checker.ts';
const allocations:Record<string,[string,number][]>={
 'AI crawler access':[['A1',5],['A2',5],['A3',5],['A4',5],['A5',5]],
 'Structured data':[['B1',5],['B2',5],['B3',5],['B4',5]],
 'Semantic structure':[['C1',5],['C2',4],['C3',5],['C4',3],['C5',3]],
 'Content and entity signals':[['D1',4],['D2',4],['D3',4],['D4',3]],
 'llms.txt':[['E1',5],['E2',3],['E3',2]],
 'Technical health':[['F1',3],['F2',3],['F3',2],['F4',2]]
};
const make=(status:Check['status']):Check[]=>
 Object.entries(allocations).flatMap(([category,items])=>items.map(([id,points])=>({id,category,label:id,points,status,evidence:'test'})));
test('approved category weights total 100 and all-pass result is 100',()=>{
 const checks=make('pass'),out=calculate(checks);
 assert.equal(checks.reduce((x,c)=>x+c.points,0),100);
 assert.equal(out.status,'complete');assert.equal(out.score,100);
 assert.ok(Object.values(out.engines).every(x=>x===100));
});
test('confirmed failures count zero; unverified never creates definitive zero score',()=>{
 const failed=calculate(make('fail'));
 assert.equal(failed.score,0);
 const partial=make('pass');partial[0].status='unverified';
 const out=calculate(partial);
 assert.equal(out.score,null);assert.equal(out.classification,null);
 assert.ok(Object.values(out.engines).every(v=>v===null));
 assert.equal(out.crawlerAccess.ChatGPT,'Unverified');
});
test('private, link-local, documentation and other reserved IPv4 destinations blocked',()=>{
 for(const ip of ['127.0.0.1','10.1.2.3','192.168.1.1','169.254.169.254','172.16.2.1','100.64.1.2','0.1.2.3','203.0.113.42'])assert.equal(publicIPv4(ip),false,ip);
 assert.equal(publicIPv4('1.1.1.1'),true);
});
test('URL parser rejects unsafe host, port, credentials, query, fragment',()=>{
 for(const raw of ['localhost','http://127.0.0.1','https://169.254.169.254','http://foo.local','https://example.com:8443','https://user:pass@example.com','file:///etc/passwd','https://example.com/?x=1','https://example.com/#f']){
  assert.throws(()=>validateWebsite(raw),undefined,raw);
 }
 assert.equal(validateWebsite('www.example.com').hostname,'www.example.com');
});

function fixture(body:string,type='text/html',status=200,url='https://example.com/'){
 return {body,type,status,url,bytes:body.length,headers:{'x-robots-tag':'','content-type':type}};
}
test('JS application shell keeps unreadable evidence unverified and has no score',async()=>{
 const html='<html><head><title>Example Plumbing Services</title><script src="/a.js"></script><script src="/b.js"></script></head><body><div id="root"></div></body></html>';
 const result=await scanWebsite('example.com',async u=>{
  if(u.pathname==='/robots.txt')return fixture('', 'text/plain',404,u.href);
  if(u.pathname==='/llms.txt')return fixture('', 'text/plain',404,u.href);
  return fixture(html,'text/html',200,u.href);
 });
 assert.equal(result.js_dependent,true);
 assert.equal(result.status,'incomplete');
 assert.equal(result.score,null);
 assert.equal(result.checks.find(x=>x.id==='C3')?.status,'unverified');
 assert.equal(result.checks.find(x=>x.id==='D2')?.status,'unverified');
});
test('ordinary HTML website can be scored with no paid calls',async()=>{
 const html='<html><head><title>Example Plumbing Services in Michigan</title><meta name="description" content="Example Plumbing provides professional plumbing and drain services to Michigan customers and families."><link rel="canonical" href="https://example.com/"><script type="application/ld+json">{"@context":"https://schema.org","@type":"LocalBusiness","name":"Example Plumbing","url":"https://example.com/"}</script></head><body><main><h1>Example Plumbing Services in Michigan</h1><h2>Services</h2><p>'+('Example Plumbing repair and maintenance services for customers. ').repeat(12)+'</p><a href="/about">About our company</a></main></body></html>';
 const fetcher=async(u:URL)=>{
  if(u.pathname==='/robots.txt')return fixture('', 'text/plain',404,u.href);
  if(u.pathname==='/llms.txt')return fixture('', 'text/plain',404,u.href);
  if(u.pathname==='/about')return fixture('<html><h1>About Example Plumbing</h1><p>'+('Example Plumbing has licensed technicians, a locally owned business, and dedicated customer service. ').repeat(5)+'</p></html>','text/html',200,u.href);
  return fixture(html,'text/html',200,u.href);
 };
 const result=await scanWebsite('https://example.com',fetcher);
 assert.equal(result.status,'complete');
 assert.ok(typeof result.score==='number');
 assert.equal(result.engines.ChatGPT!==null,true);
 assert.equal(result.checks.find(x=>x.id==='E1')?.status,'fail');
});

test('public result allowlist never includes private lead or payment fields',()=>{
 const row={result:{domain:'example.com',score:80,status:'complete',checks:[],categories:{},engines:{},
  customer_name:'PRIVATE',business_email:'secret@example.com',phone:'999-9999',
  payments:{secret:'private'},internal_report:{secret:'private'}}};
 const published=JSON.stringify(publicResult(row));
 for(const secret of ['PRIVATE','secret@example.com','999-9999','payments','internal_report'])assert.ok(!published.includes(secret),secret);
});
