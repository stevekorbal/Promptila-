// Read-only and rejection-path production smoke. Never creates leads, payment sessions or charges.
// Cached Big Lake scan remains a no-new-scan request.
const base='https://www.promptila.com';
function publicSummarySafe(d){
 const r=d?.report;
 if(!r||r.domain!=='www.biglakecandy.com'||r.estimated_readiness?.overall?.value!==63)return false;
 if(Object.keys(r.categories||{}).length!==6||r.areas_needing_improvement!==4)return false;
 const json=JSON.stringify(r);
 return !['"checks":','"evidence":','"probes":','"robots_rules":','"network_events":','"network_errors":',
   'JSON-LD','llms.txt','canonical','Heading hierarchy','HTTP 403','B1','F3','Prioritized fix plan'].some(x=>json.includes(x));
}

const paths=[
 {path:'/api/instant-checker?health=1',type:'json',verify:d=>d?.status==='ok'},
 {path:'/api/instant-checker?domain=www.biglakecandy.com',type:'json',verify:d=>publicSummarySafe(d)},
 {path:'/api/instant-checker?badge=1&domain=www.biglakecandy.com&style=dark',type:'svg',verify:d=>d.includes('Estimated')&&d.includes('Not verified')},
 {path:'/api/instant-checker',type:'json',method:'POST',body:JSON.stringify({website:'https://www.biglakecandy.com'}),verify:d=>d?.cached===true&&d?.report?.domain==='www.biglakecandy.com'&&d?.report?.estimated_readiness?.overall?.value===63},
 {path:'/ai-visibility-checker/report/www.biglakecandy.com',type:'html',verify:d=>typeof d==='string'&&d.includes('<div id="root"')},
 ...['light','shield','seal'].map(style=>({path:'/api/instant-checker?badge=1&domain=www.biglakecandy.com&style='+style,type:'svg',verify:d=>d.includes('Estimated')&&d.includes('Not verified')})),
 {path:'/api/instant-checker-lead',type:'json',method:'POST',body:JSON.stringify({full_name:'',business_email:'invalid',company_name:'',role_title:'',domain:'www.biglakecandy.com',consent:false}),expectedStatus:400,verify:d=>typeof d?.error==='string'},
 {path:'/api/create-checkout-session',type:'json',method:'GET',expectedStatus:405,verify:d=>typeof d?.error==='string'},
 {path:'/api/verify-checkout-payment',type:'json',method:'POST',body:JSON.stringify({payment_intent_id:'not-a-payment'}),expectedStatus:400,verify:d=>typeof d?.error==='string'}
];
for(const test of paths){
 let ok=false,last='';
 for(let attempt=0;attempt<24;attempt++){
  try{
   const controller=new AbortController();
   const timeout=setTimeout(()=>controller.abort(),6500);
   let response;
   try{response=await fetch(base+test.path,{signal:controller.signal,method:test.method||'GET',body:test.body,headers:{'cache-control':'no-cache',...(test.method?{'content-type':'application/json'}:{})}});}finally{clearTimeout(timeout);}
   const raw=await response.text();
   const parsed=test.type==='json'&&response.headers.get('content-type')?.includes('json')?JSON.parse(raw):raw;
   if(response.status===(test.expectedStatus||200)&&test.verify(parsed)){ok=true;console.log('PRODUCTION_SMOKE passed',test.path,'attempt',attempt+1);break;}
   last='HTTP '+response.status+' '+raw.slice(0,170);
  }catch(e){last=String(e).slice(0,170);}
  await new Promise(resolve=>setTimeout(resolve,3500));
 }
 if(!ok){console.error('PRODUCTION_SMOKE failed',test.path,last);process.exitCode=1;break;}
}
