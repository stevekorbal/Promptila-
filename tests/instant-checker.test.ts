import {instantAccessAllowed} from '../api/_lib/instant-access.ts';
import test from 'node:test';
import { publicResult } from '../api/instant-checker.ts';
import { badgeSvg,BADGE_STYLES } from '../api/instant-checker-badge.ts';
import submitLead from '../api/instant-checker-lead.ts';
import { robotsPermission,classifyProbe } from '../api/_lib/instant-crawlers.ts';
import { parseHtml,schemaNodes } from '../api/_lib/instant-evidence.ts';
import {validateStructuredData,validateCanonical} from '../api/_lib/instant-validation.ts';
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
 assert.equal(result.provisional.minimum,result.provisional.verified_points);
 assert.equal(result.provisional.maximum,result.provisional.minimum+result.provisional.unknown_points);
 assert.equal(result.provisional.is_provisional,true);
 assert.equal(result.engines.ChatGPT,null);
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

test('robots rules support wildcards, end anchors, specific groups and allow ties',()=>{
 const robots='User-agent: *\nDisallow: /private/\nAllow: /private/public/\nUser-agent: GPTBot\nDisallow: /secure/*\nAllow: /secure/help$';
 assert.equal(robotsPermission(robots,'ClaudeBot','/private/file'),'blocked');
 assert.equal(robotsPermission(robots,'ClaudeBot','/private/public/a'),'allowed');
 assert.equal(robotsPermission(robots,'GPTBot','/secure/hidden'),'blocked');
 assert.equal(robotsPermission(robots,'GPTBot','/secure/help'),'allowed');
 assert.equal(robotsPermission(robots,'GPTBot','/private/file'),'allowed');
 assert.equal(robotsPermission('User-agent: *\\nDisallow: *.data$\\nDisallow: */account','GPTBot','/'),'allowed');
});
test('HTML parser reads meaningful metadata, JSON-LD and headings without running scripts',()=>{
 const sample='<html><head><title>Example Service Company</title><meta name="description" content="We offer heating, cooling and repair services for regional homeowners."/><script type="application/ld+json">{"@type":"LocalBusiness","name":"Example Service","url":"https://example.com","description":"We provide heating and cooling services to residential customers."}</script></head><body><h1>Trusted Heating Services</h1><a href="/about">About</a><p>Homeowners choose our services for dependable work.</p></body></html>';
 const p=parseHtml(sample);
 assert.equal(p.title,'Example Service Company');
 assert.equal(p.h1[0],'Trusted Heating Services');
 assert.equal(p.schema.length,1);
 assert.equal(p.aboutLinks[0],'/about');
 assert.ok(p.text.includes('Homeowners'));
});
test('bot challenge is not a successful usable website response',()=>{
 assert.equal(classifyProbe(200,'text/html','<html><h1>Just a moment</h1><p>Checking your browser</p></html>',false).status,'challenge');
 assert.equal(classifyProbe(403,'text/html','Access denied',false).status,'blocked');
});

test('unrelated schema entities do not earn business name and URL points',()=>{
 const site=new URL('https://shop.example.com/');
 const unrelated=[{'@context':'https://schema.org','@type':'Organization',name:'Other Company',url:'https://unrelated.test/'},
 {'@context':'https://schema.org','@type':'WebSite',name:'Shop',url:'https://shop.example.com/'}];
 const v=validateStructuredData(unrelated,site);
 assert.equal(v.valid,true);
 assert.equal(v.business,false);
 assert.equal(v.identity,false);
 assert.equal(v.page,true);
});
test('split name and URL across separate JSON-LD entities cannot earn identity points',()=>{
 const site=new URL('https://example.com/');
 const split=[{'@context':'https://schema.org','@type':'Organization',name:'Example Company'},
 {'@context':'https://schema.org','@type':'Organization',url:'https://example.com/'}];
 assert.equal(validateStructuredData(split,site).identity,false);
});
test('valid related business JSON-LD earns identity points with inherited @graph context',()=>{
 const raw=[{'@context':'https://schema.org','@graph':[{'@type':'LocalBusiness',name:'Harris HVAC',url:'https://www.harrishvac.net/'},{'@type':'WebSite',url:'https://www.harrishvac.net/'}]}];
 const v=validateStructuredData(schemaNodes(raw),new URL('https://harrishvac.net/'));
 assert.equal(v.identity,true);
 assert.equal(v.page,true);
});
test('canonical accepts www equivalent homepage only, rejects other origins or downgrade',()=>{
 const site=new URL('https://harrishvac.net/');
 assert.equal(validateCanonical('https://www.harrishvac.net/',site).valid,true);
 assert.equal(validateCanonical('https://unrelated.example/',site).valid,false);
 assert.equal(validateCanonical('https://www.harrishvac.net/other',site).valid,false);
 assert.equal(validateCanonical('http://www.harrishvac.net/',site).valid,false);
 assert.equal(validateCanonical('https://www.microsoft.com/en-us',new URL('https://www.microsoft.com/'),'https://www.microsoft.com/en-us').valid,true);
});
test('ordinary pages mentioning bot protection in script are not classified as challenges',()=>{
 const body='<html><head><title>Harris HVAC Services</title><meta name="description" content="Professional heating and cooling services for homes"/></head><body><main><h1>Heating and Cooling Services</h1><p>'+('We provide reliable HVAC repair and installation for residential customers. ').repeat(6)+'</p></main><script>const test = "verify you are human";</script></body></html>';
 assert.equal(classifyProbe(200,'text/html',body,false).status,'accessible');
});

test('Mitch the Plumber: generic plumbing title does not prove a business brand',async()=>{
 const html='<html><head><title>Reliable Plumbing Services | Mitch the Plumber</title><meta name="description" content="Reliable Plumbing Services offers local drain clearing and plumbing repairs throughout Michigan."/></head><body><main><h1>Local plumbing services</h1><p>'+('Our licensed plumbing professionals provide repair, installation and drainage services. ').repeat(12)+'</p></main></body></html>';
 const fetcher=async(u:URL)=>({url:u.href,status:u.pathname==='/'?200:404,type:u.pathname==='/'?'text/html':'text/plain',body:u.pathname==='/'?html:'',bytes:html.length,headers:{'x-robots-tag':'','content-type':'text/html'}});
 const scanned=await scanWebsite('https://www.mitchtheplumber-mi.com/',fetcher);
 assert.equal(scanned.checks.find(x=>x.id==='D1')?.status,'fail');
 assert.equal(scanned.checks.find(x=>x.id==='D4')?.status,'fail');
});

test('all four badge variants are distinct, current-date, public-only and linked to report',()=>{
 const versions=BADGE_STYLES.map(style=>badgeSvg('example.com',84,'2026-11-20T12:00:00.000Z',style,'https://preview.example'));
 assert.equal(versions.length,4);
 assert.equal(new Set(versions).size,4);
 for(const svg of versions){
  assert.match(svg,/example.com/);
  assert.match(svg,/2026-11-20/);
  assert.match(svg,/preview.example\/ai-visibility-checker\/report\/example.com/);
  assert.doesNotMatch(svg,/@example.com|customer_name|business_email|stripe|certified/i);
 }
 assert.throws(()=>badgeSvg('example.com',101,'2026-11-20','dark'));
});
test('private diagnostics never appear in public report projection',()=>{
 const row={result:{domain:'example.com',status:'incomplete',score:null,scanned_at:'2026-11-20',
  checks:[{id:'A1',category:'AI crawler access',label:'Crawler access',points:5,status:'unverified',evidence:'Connection ENOTFOUND'}],
  network_errors:{secret:'private DNS error'},network_events:[{secret:'private'}],
  internal_headers:{Authorization:'secret'},lead:{email:'private@example.com'},provisional:{minimum:0,maximum:100}}};
 const text=JSON.stringify(publicResult(row));
 assert.doesNotMatch(text,/network_errors|network_events|internal_headers|private@example.com|ENOTFOUND/);
 assert.match(text,/provisional/);
});

test('lead endpoint rejects missing consent and invalid email before any database write',async()=>{
 const old=process.env.INSTANT_CHECKER_ENABLED;
 const oldToken=process.env.INSTANT_CHECKER_TEST_TOKEN;
 process.env.INSTANT_CHECKER_ENABLED='true';
 process.env.INSTANT_CHECKER_TEST_TOKEN='test-secret-at-least-32-characters-long-123456';
 try{
  async function request(body:any){
   const response:any={statusCode:200,body:null,headers:{}};
   response.setHeader=(key:string,value:string)=>{response.headers[key]=value;return response;};
   response.status=(code:number)=>{response.statusCode=code;return response;};
   response.json=(body:any)=>{response.body=body;return response;};
   const req:any={method:'POST',body,headers:{'x-instant-test-token':process.env.INSTANT_CHECKER_TEST_TOKEN}};
   await submitLead(req,response);
   return response;
  }
  const fields={full_name:'Jane Doe',business_email:'jane@example.com',company_name:'Example',role_title:'Owner',domain:'example.com'};
  assert.equal((await request({...fields,consent:false})).statusCode,400);
  assert.equal((await request({...fields,business_email:'not-an-email',consent:true})).statusCode,400);
 }finally{
  if(old===undefined)delete process.env.INSTANT_CHECKER_ENABLED;
  else process.env.INSTANT_CHECKER_ENABLED=old;
  if(oldToken===undefined)delete process.env.INSTANT_CHECKER_TEST_TOKEN;else process.env.INSTANT_CHECKER_TEST_TOKEN=oldToken;
 }
});
test('lead endpoint remains inaccessible while feature flag is disabled',async()=>{
 const old=process.env.INSTANT_CHECKER_ENABLED;
 delete process.env.INSTANT_CHECKER_ENABLED;
 const res:any={code:200,setHeader(){},status(code:number){this.code=code;return this;},json(){return this;}};
 try{await submitLead({method:'POST',body:{}} as any,res);assert.equal(res.code,404);}
 finally{if(old!==undefined)process.env.INSTANT_CHECKER_ENABLED=old;}
});

test('private tester access must be enabled, correct, and server configured',()=>{
 const key='a-secure-private-flagged-tester-key-longer-than-32';
 const env={INSTANT_CHECKER_ENABLED:'true',INSTANT_CHECKER_TEST_TOKEN:key} as NodeJS.ProcessEnv;
 assert.equal(instantAccessAllowed({'x-instant-test-token':key},env),true);
 assert.equal(instantAccessAllowed({},env),false);
 assert.equal(instantAccessAllowed({'x-instant-test-token':'invalid'},env),false);
 assert.equal(instantAccessAllowed({'x-instant-test-token':key},{...env,INSTANT_CHECKER_ENABLED:'false'}),false);
 assert.equal(instantAccessAllowed({'x-instant-test-token':key},{...env,INSTANT_CHECKER_TEST_TOKEN:''}),false);
});
