// Read-only comparisons. Never use cookies, browser impersonation as a bypass,
// challenge solving, or unrestricted network access.
import https from 'node:https';
const paths=[
 ['www checker UA','https://www.biglakecandy.com/about.php','PromptilaInstantChecker/1.1 (+https://www.promptila.com)'],
 ['apex checker UA','https://biglakecandy.com/about.php','PromptilaInstantChecker/1.1 (+https://www.promptila.com)'],
 ['www browser UA','https://www.biglakecandy.com/about.php','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'],
 ['apex browser UA','https://biglakecandy.com/about.php','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'],
 ['www home','https://www.biglakecandy.com/','PromptilaInstantChecker/1.1 (+https://www.promptila.com)'],
 ['apex home','https://biglakecandy.com/','PromptilaInstantChecker/1.1 (+https://www.promptila.com)']
];
for(const [label,url,ua] of paths){
 let result;
 try{
  result=await new Promise((resolve,reject)=>{
   const req=https.get(url,{headers:{'user-agent':ua,accept:'text/html,text/plain,application/json,*/*;q=0.5','accept-encoding':'identity'},timeout:6000},res=>{
    let body='',length=0;
    res.on('data',chunk=>{length+=chunk.length;if(body.length<14000)body+=chunk.toString('utf8').slice(0,14000-body.length)});
    res.on('end',()=>{const h=res.headers;
     const markers=['captcha','cloudflare','access denied','forbidden','bot protection','security','sucuri','mod_security','blocked'].filter(x=>body.toLowerCase().includes(x));
     resolve({status:res.statusCode,location:h.location||null,contentType:h['content-type']||null,server:h.server||null,
      cfRay:h['cf-ray']?true:false,sucuri:h['x-sucuri-id']?true:false,via:h.via?true:false,
      vary:h.vary||null,cache:h['cache-control']||null,bodyBytes:length,markers});
    });
   });req.on('timeout',()=>req.destroy(Error('timeout')));req.on('error',reject);
  });
 }catch(e){result={error:String(e).slice(0,130)}}
 console.log('ABOUT_DIAGNOSTIC',JSON.stringify({label,url,...result}));
}
