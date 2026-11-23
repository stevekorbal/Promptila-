import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdirSync} from 'node:fs';
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
import {buildFixPlan} from '../api/_lib/instant-fix-plan.ts';
import {estimateReadiness} from '../api/_lib/instant-estimates.ts';

const groups:[string,[string,number][]][]=[
 ['AI crawler access',[['A1',5],['A2',5],['A3',5],['A4',5],['A5',5]]],
 ['Structured data',[['B1',5],['B2',5],['B3',5],['B4',5]]],
 ['Semantic structure',[['C1',5],['C2',4],['C3',5],['C4',3],['C5',3]]],
 ['Content and entity signals',[['D1',4],['D2',4],['D3',4],['D4',3]]],
 ['llms.txt',[['E1',5],['E2',3],['E3',2]]],
 ['Technical health',[['F1',3],['F2',3],['F3',2],['F4',2]]]
];
const failed=new Set(['B1','B2','B3','B4','C4','E1','E2','E3','F3']);
const checks=groups.flatMap(([category,items])=>items.map(([id,points])=>({id,category,label:id,points,status:(id==='D3'?'unverified':failed.has(id)?'fail':'pass') as 'pass'|'fail'|'unverified',evidence:id==='D3'?'About page: HTTP 403':'Checked website evidence'})));
const categories=Object.fromEntries(groups.map(([name,items])=>{
 const own=checks.filter(x=>x.category===name),verified=own.filter(x=>x.status!=='unverified');
 return [name,{score:verified.length===own.length?own.filter(x=>x.status==='pass').reduce((n,x)=>n+x.points,0):null,max:items.reduce((n,x)=>n+x[1],0),verified:verified.length,total:own.length}];
}));
const plan=buildFixPlan(checks);
const estimated_readiness=estimateReadiness(checks);
assert.equal(estimated_readiness?.overall.value,63);
assert.deepEqual(plan.map(x=>x.impact),[20,10,3,2]);
assert.ok(!plan.some(x=>x.id.includes('D3')));
const report={
 domain:'www.biglakecandy.com',url:'https://www.biglakecandy.com/',scanned_at:'2026-11-23T14:50:35.591Z',status:'incomplete',
 score:null,classification:null,categories,checks,estimated_readiness,engines:{ChatGPT:null,Gemini:null,Claude:null,Perplexity:null},
 crawlerAccess:{ChatGPT:'Allowed',Gemini:'Allowed',Claude:'Allowed',Perplexity:'Allowed'},
 js_dependent:true,elapsed_ms:6086,rendering:{status:'complete',pages:2,elapsed_ms:5735,requests:3,bytes:297314},
 summary:{strengths:['Homepage fetchable'],weaknesses:['Valid JSON-LD','Heading hierarchy'],uncertain:['About or company information'],unverified_count:1},
 provisional:{minimum:61,maximum:65,verified_points:61,unknown_points:4,is_provisional:true},
 disclaimer:'Website-signal readiness estimates only. No AI models were queried.',
 llms_note:'llms.txt is voluntary and is not a requirement or guarantee for AI recommendations.'
};
const server=spawn('node',['node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port','4173','--strictPort'],{stdio:'ignore'});
let browser:Awaited<ReturnType<typeof puppeteer.launch>>|undefined;
try{
 let ready=false;
 for(let i=0;i<60;i++){
  try{const r=await fetch('http://127.0.0.1:4173/ai-visibility-checker');if(r.ok){ready=true;break;}}catch{}
  await new Promise(resolve=>setTimeout(resolve,300));
 }
 assert.ok(ready,'Vite preview failed to start');
 browser=await puppeteer.launch({args:chromium.args,executablePath:await chromium.executablePath(),headless:true});
 mkdirSync('qa-screenshots',{recursive:true});
 for(const [name,width,height] of [['desktop',1280,900],['mobile',390,844]] as const){
  const page=await browser.newPage();
  try{
   await page.setViewport({width,height,deviceScaleFactor:1});
   await page.setRequestInterception(true);
   page.on('request',req=>{
    if(req.url().includes('/api/instant-checker?domain=')){
     void req.respond({status:200,contentType:'application/json',body:JSON.stringify({report,stale:false})});
    }else void req.continue();
   });
   await page.goto('http://127.0.0.1:4173/ai-visibility-checker/report/www.biglakecandy.com',{waitUntil:'networkidle2',timeout:30000});
   await page.waitForSelector('h2',{timeout:10000});
   const state=await page.evaluate(()=>{
    const text=document.body.innerText;
    const heading=Array.from(document.querySelectorAll('h3')).map(e=>e.textContent?.trim());
    const priorityText=Array.from(document.querySelectorAll('section')).find(e=>e.textContent?.includes('Prioritized fix plan'))?.innerText||'';
    return {text,heading,priorityText,scroll:document.documentElement.scrollWidth,viewport:window.innerWidth};
   });
   assert.ok(state.text.includes('61–65'),'Provisional range missing');
   assert.ok(state.text.includes('11/15'),'Confirmed content-and-entity points missing');
   assert.ok(state.text.includes('4 points unverified'),'Unverified points not labeled');
   for(const number of ['68','67','72'])assert.ok(state.text.includes(number),'Missing numerical engine estimate '+number);
   assert.ok(state.text.includes('Score badge'),'Badge section missing');
   assert.ok(state.text.includes('Optional embeddable badge'),'Eligible estimated badge missing');
   assert.equal((state.text.match(/An estimated score is not verified/g)||[]).length,1,'Duplicate top-level estimate disclaimer');
   assert.ok(state.text.includes('not required for AI recommendations'),'Optional llms.txt disclaimer missing');
   assert.ok(!state.priorityText.includes('About or company information'),'Unverified About wrongly recommended');
   let at=-1;for(const label of ['Make business information machine-readable','Consider publishing an llms.txt overview','Correct the heading hierarchy','Fix the homepage canonical URL']){const pos=state.priorityText.indexOf(label);assert.ok(pos>at, 'Wrong recommendation order: '+label);at=pos;}
   assert.ok(state.scroll<=state.viewport+2,`${name} horizontal overflow ${state.scroll} > ${state.viewport}`);
   await page.screenshot({path:'qa-screenshots/instant-checker-'+name+'.png',fullPage:true});
   console.log('UI_SMOKE '+JSON.stringify({viewport:name,passed:true,overflow:state.scroll-state.viewport,fixes:plan.map(x=>x.id)}));
  }finally{await page.close();}
 }
}finally{if(browser)await browser.close();server.kill('SIGTERM');}
