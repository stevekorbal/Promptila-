// Private visual QA only. Screenshots use locally mocked API results; no website crawl,
// no Supabase, no Stripe, and no paid AI calls.
import {chromium} from 'playwright';
import {mkdir} from 'node:fs/promises';
const origin='http://127.0.0.1:3000';
await mkdir('screenshots',{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:1280,height:900},deviceScaleFactor:1});
try{
 await page.goto(origin+'/ai-visibility-checker',{waitUntil:'domcontentloaded'});
 await page.locator('#website').waitFor();
 await page.screenshot({path:'screenshots/checker-input.png',fullPage:true});
 let incomplete=false;
 await page.route('**/api/instant-checker',async route=>{
  const host=incomplete?'promptila.com':'example.com',score=incomplete?null:74;
  const categories={crawler:{earned:20,max:25,unverified:incomplete?5:0},structured:{earned:15,max:20,unverified:incomplete?5:0},semantic:{earned:15,max:20,unverified:incomplete?5:0},content:{earned:9,max:15,unverified:incomplete?6:0},llms:{earned:5,max:10,unverified:0},technical:{earned:10,max:10,unverified:0}};
  const report={host,url:'https://'+host+'/',version:'instant-v1.1',status:incomplete?'incomplete':'complete',score,classification:incomplete?null:'Strong',summary:incomplete?'The website may depend on JavaScript and cannot be fully inspected with HTML-only scanning.':'Several visible signals were confirmed. This is an estimate of website readiness, not live AI recommendations.',categories,estimates:incomplete?null:{ChatGPT:74,Gemini:76,Claude:73,Perplexity:75},crawler:{GPTBot:'pass',ClaudeBot:'pass',PerplexityBot:'pass','Google-Extended':'unverified'},checks:[{id:'A1',category:'crawler',label:'GPTBot robots.txt permission',points:5,verdict:'pass',evidence:'No block detected'},{id:'C5',category:'semantic',label:'Readable homepage content',points:3,verdict:incomplete?'unverified':'pass',evidence:incomplete?'Rendering requires JavaScript':'HTML content detected'},{id:'E1',category:'llms',label:'Valid text llms.txt',points:5,verdict:'fail',evidence:'Optional file not found'}],scanned_at:new Date().toISOString(),duration_ms:1234,javascript_suspected:incomplete};
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({report,cached:false})});
 });
 await page.locator('#website').fill('https://example.com');
 await page.locator('#preview').fill('private-visual-test-token-not-a-secret');
 await page.getByRole('button',{name:'Check website'}).click();
 await page.getByText('Website evidence checklist').waitFor();
 await page.screenshot({path:'screenshots/checker-complete-fixture.png',fullPage:true});
 incomplete=true;
 await page.locator('#website').fill('https://promptila.com');
 await page.getByRole('button',{name:'Check website'}).click();
 await page.getByText('Incomplete scan — no final score').waitFor();
 await page.screenshot({path:'screenshots/checker-incomplete-fixture.png',fullPage:true});
 console.log('Created 3 fixture-based UI screenshots without live scans.');
}finally{await browser.close();}
