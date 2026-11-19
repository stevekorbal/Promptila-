import test from 'node:test';
import assert from 'node:assert/strict';
import {validateWebsite,publicIPv4,calculate,type Check} from '../api/_lib/instant-checker.ts';
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
