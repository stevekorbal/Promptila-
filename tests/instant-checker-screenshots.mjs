import {readFileSync,mkdirSync} from 'node:fs';
import {chromium} from 'playwright';
const testData=JSON.parse(readFileSync('instant-checker-private-results.json','utf8'));
const browser=await chromium.launch({headless:true});
mkdirSync('qa-screenshots',{recursive:true});
const defaults=['AI crawler access','Structured data','Semantic structure','Content and entity signals','llms.txt','Technical health'];
for(const [i,row] of testData.entries()){
 if(row.error||!row.domain)continue;
 const report={
  domain:row.domain,url:'https://'+row.domain,scanned_at:new Date().toISOString(),
  version:'instant-v1.0',status:row.status,score:row.score,
  classification:row.score===null?null:row.score<40?'Needs Work':row.score<70?'Getting There':row.score<90?'Strong':'Excellent',
  categories:row.category_scores,engines:row.engine_estimates,
  crawlerAccess:Object.fromEntries([['ChatGPT','A1'],['Claude','A2'],['Perplexity','A3'],['Gemini / Google-Extended','A4']].map(([name,id])=>[name,(row.check_results.find(x=>x.id===id)?.status==='pass'?'Allowed':row.check_results.find(x=>x.id===id)?.status==='fail'?'Blocked':'Unverified')])),
  checks:row.check_results,js_dependent:row.js_dependent,elapsed_ms:row.elapsed_ms,
  disclaimer:'Website-signal readiness estimates only. No AI models were queried. These do not measure actual AI recommendations or rankings.',
  llms_note:'llms.txt is voluntary and not a requirement for AI recommendations.'
 };
 const page=await browser.newPage({viewport:{width:1280,height:900},deviceScaleFactor:1});
 await page.route('**/api/instant-checker?*',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({report})}));
 await page.goto('http://127.0.0.1:3000/ai-visibility-checker/report/'+encodeURIComponent(row.domain),{waitUntil:'networkidle',timeout:30000});
 await page.locator('h2').first().waitFor({timeout:15000});
 await page.screenshot({path:'qa-screenshots/'+i+'-'+row.domain.replace(/[^a-z0-9.-]/gi,'_')+'-desktop.png',fullPage:true});
 await page.setViewportSize({width:390,height:844});
 await page.screenshot({path:'qa-screenshots/'+i+'-'+row.domain.replace(/[^a-z0-9.-]/gi,'_')+'-mobile.png',fullPage:true});
 console.log('QA SCREENSHOT',row.site,row.status,row.score);
 await page.close();
}
await browser.close();
