// Production-only read-only smoke: validates live Vercel function startup and saved report/badge.
// No new scans, lead submissions, or payments.
const base='https://www.promptila.com';
const paths=[
 {path:'/api/instant-checker?health=1',type:'json',verify:d=>d?.status==='ok'},
 {path:'/api/instant-checker?domain=www.biglakecandy.com',type:'json',verify:d=>d?.report?.domain==='www.biglakecandy.com'&&d?.report?.estimated_readiness?.overall?.value===63},
 {path:'/api/instant-checker?badge=1&domain=www.biglakecandy.com&style=dark',type:'svg',verify:d=>d.includes('Estimated')&&d.includes('Not verified')}
];
for(const test of paths){
 let ok=false,last='';
 for(let attempt=0;attempt<24;attempt++){
  try{
   const controller=new AbortController();
   const timeout=setTimeout(()=>controller.abort(),6500);
   let response;
   try{response=await fetch(base+test.path,{signal:controller.signal,headers:{'cache-control':'no-cache'}});}finally{clearTimeout(timeout);}
   const raw=await response.text();
   const parsed=test.type==='json'&&response.headers.get('content-type')?.includes('json')?JSON.parse(raw):raw;
   if(response.status===200&&test.verify(parsed)){ok=true;console.log('PRODUCTION_SMOKE passed',test.path,'attempt',attempt+1);break;}
   last='HTTP '+response.status+' '+raw.slice(0,170);
  }catch(e){last=String(e).slice(0,170);}
  await new Promise(resolve=>setTimeout(resolve,3500));
 }
 if(!ok){console.error('PRODUCTION_SMOKE failed',test.path,last);process.exitCode=1;break;}
}
