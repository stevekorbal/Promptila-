import React,{useEffect,useState} from 'react';
import {Link,useParams} from 'react-router-dom';
import {Globe,ShieldCheck,Search,Copy} from 'lucide-react';
type EstimatedReadiness={status:'verified'|'estimated'|'range_only';overall:{value:number|null;minimum:number;maximum:number;unknown_points:number;estimated:boolean};engines:Record<string,{value:number|null;minimum:number;maximum:number;estimated:boolean}>;badge_eligible:boolean};
type Category={score:number|null;confirmed_points:number;unknown_points:number;max:number;status:'on_track'|'needs_improvement'|'unverified'};
type Report={domain:string;scanned_at:string;status:'complete'|'incomplete';score:number|null;classification:string|null;categories:Record<string,Category>;engines:Record<string,number|null>;disclaimer:string;summary:{strengths:string[];weaknesses:string[];uncertain:string[];unverified_count:number};provisional?:{verified_points:number;unknown_points:number;minimum:number;maximum:number;is_provisional:boolean}|null;estimated_readiness?:EstimatedReadiness|null;areas_needing_improvement:number};
const reportUrl=(domain:string)=>'/ai-visibility-checker/report/'+encodeURIComponent(domain);
async function readApiResponse(response:Response):Promise<any>{
 const contentType=response.headers.get('content-type')||'';
 if(!contentType.toLowerCase().includes('application/json')){
  if(response.status>=500)throw Error('The website checker server could not complete this request. Please try again shortly. If it continues, contact Promptila support.');
  throw Error('The website checker returned an unexpected response. Please try again.');
 }
 let result:any;
 try{result=await response.json();}catch{throw Error('The website checker returned an incomplete response. Please try again.');}
 if(!response.ok)throw Error(typeof result?.error==='string'?result.error:'The website checker is unavailable. Please try again.');
 return result;
}
const cats=['Discovery access','Business information clarity','Content clarity','Business identity','AI guidance signals','Website foundations'];
const badgeStyles=['dark','light','shield','seal'] as const;
type BadgeStyle=typeof badgeStyles[number];
const whyMatters:Record<string,string>={
 'Discovery access':'Public access policies influence whether automated services may request your website. Permission does not guarantee AI recommendations.',
 'Business information clarity':'Clear website information helps automated systems recognize what your business does.',
 'Content clarity':'Well-organized pages make information easier for visitors and search systems to interpret.',
 'Business identity':'Consistent company information helps distinguish your business from others.',
 'AI guidance signals':'Optional machine-readable guidance can help describe useful resources. It is not a requirement for AI recommendations.',
 'Website foundations':'Reliable website signals help visitors and automated systems discover public content.'
};
export default function AIVisibilityChecker(){
 const {domain:reportDomain}=useParams<{domain?:string}>();
 const [website,setWebsite]=useState('');
 const [badgePreview,setBadgePreview]=useState('');
 const [report,setReport]=useState<Report|null>(null);
 const [loading,setLoading]=useState(false);
 const [error,setError]=useState('');
 const [cached,setCached]=useState(false);
 const [lead,setLead]=useState({full_name:'',business_email:'',company_name:'',role_title:'',consent:false,marketing_consent:false});
 const [leadStatus,setLeadStatus]=useState('');
 const [leadLoading,setLeadLoading]=useState(false);
 const [copied,setCopied]=useState(false);
 const [badgeStyle,setBadgeStyle]=useState<BadgeStyle>('dark');
 const [elapsed,setElapsed]=useState(0);
 const [stale,setStale]=useState(false);
 useEffect(()=>{
  if(!loading){setElapsed(0);return;}
  const started=Date.now();
  const handle=setInterval(()=>setElapsed(Math.floor((Date.now()-started)/1000)),1000);
  return()=>clearInterval(handle);
 },[loading]);
 useEffect(()=>{
  if(!reportDomain)return;
  let live=true;setLoading(true);setError('');setReport(null);
  fetch('/api/instant-checker?domain='+encodeURIComponent(reportDomain))
   .then(readApiResponse)
   .then(d=>{if(live){setReport(d.report);setStale(Boolean(d.stale));}})
   .catch(e=>{if(live)setError(e.message);})
   .finally(()=>{if(live)setLoading(false);});
  return()=>{live=false;};
 },[reportDomain]);
 async function submit(e:React.FormEvent){
  e.preventDefault();setLoading(true);setError('');setReport(null);setCached(false);setLeadStatus('');
  try{
   const r=await fetch('/api/instant-checker',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({website})});
   if(r.status===202)throw Error('A scan is already running for this website. Open its report shortly.');
   const d=await readApiResponse(r);
   setReport(d.report);setCached(Boolean(d.cached));setStale(false);
  }catch(e:any){setError(e.message||'Unable to scan website');}finally{setLoading(false);}
 }
 async function submitLead(e:React.FormEvent){
  e.preventDefault();if(!report)return;
  setLeadLoading(true);setLeadStatus('');
  try{
   const r=await fetch('/api/instant-checker-lead',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({...lead,domain:report.domain})});
   const d=await readApiResponse(r);
   setLeadStatus(d.message||'Request received.');
  }catch(e:any){setLeadStatus(e.message||'Unable to submit.');}finally{setLeadLoading(false);}
 }
 const input='w-full rounded-xl border border-slate-300 px-4 py-3 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500';
 const fullLink=report?window.location.origin+reportUrl(report.domain):'';
 const badgeSrc=report?window.location.origin+'/api/instant-checker?badge=1&domain='+encodeURIComponent(report.domain)+'&style='+badgeStyle:'';
 const badge=report&&(report.status==='complete'||report.estimated_readiness?.badge_eligible)&&!stale?`<a href="${fullLink}" target="_blank" rel="noopener noreferrer"><img src="${badgeSrc}" alt="Promptila website-readiness estimate — ${badgeStyle} style" /></a>`:'';
 useEffect(()=>{
  if(!report||!(report.status==='complete'||report.estimated_readiness?.badge_eligible)||stale){setBadgePreview('');return;}
  let live=true;let objectUrl='';
  fetch('/api/instant-checker?badge=1&domain='+encodeURIComponent(report.domain)+'&style='+badgeStyle)
   .then(async response=>{if(!response.ok)throw Error('Unavailable badge');return response.blob();})
   .then(blob=>{if(!live)return;objectUrl=URL.createObjectURL(blob);setBadgePreview(objectUrl);})
   .catch(()=>{if(live)setBadgePreview('');});
  return()=>{live=false;if(objectUrl)URL.revokeObjectURL(objectUrl);};
 },[report?.domain,report?.status,report?.estimated_readiness?.badge_eligible,badgeStyle,stale]);
 return <div className="bg-slate-50 min-h-screen pt-32 pb-20">
  <div className="max-w-5xl mx-auto px-4 sm:px-6">
   <div className="text-center mb-10">
    <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-700 px-4 py-2 rounded-full text-sm font-bold"><Globe size={16}/> Promptila Instant Checker</div>
    <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 mt-5">How ready is your website for AI search?</h1>
    <p className="text-slate-600 max-w-2xl mx-auto mt-4">Get a free technical website-readiness check. No account or paid AI model requests.</p>
   </div>
   {!reportDomain&&<form onSubmit={submit} className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 sm:p-8 flex flex-col sm:flex-row gap-3 mb-8">
    <input className={input} type="text" required maxLength={2048} value={website} onChange={e=>setWebsite(e.target.value)} placeholder="https://yourbusiness.com" aria-label="Website URL"/>
    <button disabled={loading} className="bg-indigo-600 text-white font-bold px-6 py-3 rounded-xl hover:bg-indigo-700 disabled:opacity-60 whitespace-nowrap">{loading?'Checking website…':'Check my website'}</button>
   </form>}
   {loading&&<div role="status" className="bg-white rounded-xl border p-6 mb-6 text-indigo-700 flex items-center gap-3"><Search className="animate-pulse"/>Inspecting website HTML, crawler permissions and technical signals. {elapsed} seconds elapsed; no simulated progress percentage.</div>}
   {error&&<div role="alert" className="rounded-xl p-4 bg-amber-50 text-amber-900 border border-amber-200 mb-7">{error}</div>}
   {report&&<div className="space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-3">
      {stale&&<span className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-2 text-sm text-amber-900">Saved report is older than the seven-day freshness window. It has not been rescanned.</span>}
    </div>
    <section className="bg-white shadow-sm rounded-2xl border border-slate-200 p-6 sm:p-9">
     <div className="flex flex-wrap justify-between gap-4 mb-5">
      <div><p className="text-sm font-semibold text-indigo-600 uppercase">Website readiness report</p><h2 className="font-extrabold text-2xl text-slate-900 break-all">{report.domain}</h2><p className="text-sm text-slate-500 mt-1">Scanned {new Date(report.scanned_at).toLocaleString()}{cached?' · Cached result':''}</p></div>
      <span className={'self-start rounded-full px-4 py-2 text-sm font-bold '+(report.status==='complete'?'text-emerald-700 bg-emerald-50':'text-amber-800 bg-amber-50')}>{report.status==='complete'?'Completed scan':report.estimated_readiness?.overall.value!==null&&report.estimated_readiness?.overall.value!==undefined?'Estimated result':'Incomplete scan'}</span>
     </div>
     <div className="flex flex-wrap gap-5 items-center bg-slate-50 rounded-xl p-5">
      <div className="border-4 border-indigo-500 w-32 h-32 rounded-full flex flex-col justify-center items-center shrink-0">
       <strong className="text-3xl text-slate-900">{report.score??report.estimated_readiness?.overall.value??(report.provisional?`${report.provisional.minimum}–${report.provisional.maximum}`:"—")}</strong><span className="text-slate-500 text-xs">{report.score!==null?"verified / 100":report.estimated_readiness?.overall.value!==null&&report.estimated_readiness?.overall.value!==undefined?"estimated / 100":"estimated range / 100"}</span>
      </div>
      <div className="flex-1 min-w-48">
       <h3 className="text-2xl font-bold text-slate-900">{report.classification||(report.estimated_readiness?.overall.value!==null&&report.estimated_readiness?.overall.value!==undefined?'Estimated website readiness':'Provisional range')}</h3>
       <p className="text-slate-600 text-sm mt-2">{report.status==='complete'?'This score reflects our website checks, not actual AI recommendations.':(report.provisional?`${report.provisional.verified_points} confirmed points; ${report.provisional.unknown_points} unverified. Possible overall range: ${report.provisional.minimum}–${report.provisional.maximum}/100. An estimated score is not verified.`:'Some evidence could not be verified; no final score is assigned.')}</p>
      </div>
     </div>
    </section>
    <section className="bg-white shadow-sm rounded-2xl border border-slate-200 p-6 sm:p-9">
     <h3 className="text-xl font-extrabold text-slate-900">Estimated AI-platform readiness</h3>
     {report.status==='complete'&&<p className="text-sm text-slate-600 mt-2 mb-5">{report.disclaimer}</p>}
     <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {['ChatGPT','Gemini','Claude','Perplexity'].map(name=>{const e=report.estimated_readiness?.engines[name];const value=report.engines[name]??e?.value;return <div key={name} className="bg-indigo-50 rounded-xl p-4 text-center"><p className="font-bold text-slate-900">{name}</p><p className="text-2xl sm:text-3xl font-extrabold text-indigo-700 mt-1">{value??(e?`${e.minimum}–${e.maximum}`:'Unavailable')}</p><p className="text-xs text-slate-500">{report.engines[name]!==null&&report.engines[name]!==undefined?'Estimated /100':e?.estimated?'Estimated, not verified':'Estimate unavailable'}</p>{e?.estimated&&<p className="text-xs text-slate-500 mt-1">{e.minimum}–{e.maximum} possible</p>}</div>})}
     </div>
     {report.status==='incomplete'&&<p className="text-sm text-amber-800 mt-3">These are website-signal estimates, not live AI tests. Uncertainty is shown in the numerical ranges.</p>}
    </section>
    <section className="bg-white shadow-sm rounded-2xl border border-slate-200 p-6 sm:p-9">
     <h3 className="text-xl font-extrabold text-slate-900">Score badge</h3>
     <p className="text-sm text-slate-600 mt-2">Available for current verified scores or explicitly labeled estimates with at most five uncertain points.</p>
     {(report.status==='complete'||report.estimated_readiness?.badge_eligible)&&!stale?<div className="mt-6">
      <h4 className="font-bold text-slate-900">Optional embeddable badge</h4>
      <p className="text-slate-600 mt-2 text-sm">Choose a score-display design. Estimated badges are labeled as estimates, not AI certification.</p>
      <div className="flex gap-2 flex-wrap mt-4">{badgeStyles.map(style=><button type="button" key={style} onClick={()=>setBadgeStyle(style)} aria-pressed={badgeStyle===style} className={'rounded-lg border px-4 py-2 capitalize text-sm font-semibold '+(badgeStyle===style?'bg-indigo-600 text-white':'bg-white text-slate-700')}>{style}</button>)}</div>
      {badgePreview?<img src={badgePreview} alt={'Promptila '+badgeStyle+' style readiness badge'} className="mt-4 max-w-full" width={320} height={90}/>:<p className="mt-4 text-sm text-slate-600">Badge preview is unavailable.</p>}
      <label className="block font-semibold text-sm mt-4 text-slate-800">Copy embed code<textarea readOnly rows={3} className="w-full border rounded-lg p-3 mt-2 font-mono text-xs" value={badge}/></label>
      <button type="button" className="border rounded-lg px-4 py-2 text-sm font-semibold mt-2" onClick={()=>navigator.clipboard.writeText(badge)}>Copy badge embed code</button>
     </div>:<p className="text-xs text-amber-800 mt-4">A score-display badge requires a current report with at most five uncertain points.</p>}
    </section>
    <section className="bg-white shadow-sm rounded-2xl border border-slate-200 p-6 sm:p-9">
     <h3 className="text-xl font-extrabold text-slate-900">Your readiness overview</h3>
     <p className="text-sm text-slate-600 mt-2 mb-4">{report.areas_needing_improvement} of six broad areas need improvement based on confirmed findings. An unverified area is never counted as a confirmed failure.</p>
     <div className="grid sm:grid-cols-2 gap-5 text-sm">
      <div><strong className="text-emerald-700">Areas working well</strong><ul className="mt-2 list-disc pl-5 space-y-1 text-slate-700">{report.summary.strengths.length?report.summary.strengths.map(s=><li key={s}>{s}</li>):<li>No fully verified strong areas yet</li>}</ul></div>
      <div><strong className="text-amber-800">Areas needing improvement</strong><ul className="mt-2 list-disc pl-5 space-y-1 text-slate-700">{report.summary.weaknesses.length?report.summary.weaknesses.map(s=><li key={s}>{s}</li>):<li>No confirmed areas needing improvement</li>}</ul></div>
     </div>
     {report.summary.unverified_count>0&&<p className="text-sm text-slate-600 mt-4">{report.summary.unverified_count} check(s) could not be verified. They have not been treated as failures.</p>}
    </section>
    <section className="bg-white shadow-sm rounded-2xl border border-slate-200 p-6 sm:p-9">
     <h3 className="text-xl font-extrabold text-slate-900 mb-2">Six website readiness areas</h3>
     <p className="text-sm text-slate-600 mb-5">These category results show where your business may benefit from improvement. Detailed findings and step-by-step corrections are reserved for your personalized optimization plan.</p>
     <div className="grid sm:grid-cols-2 gap-4">
      {cats.map(cat=>{const item=report.categories[cat];return <div key={cat} className="bg-slate-50 rounded-xl p-4">
       <div className="flex justify-between gap-3"><strong className="text-slate-800">{cat}</strong><span className="font-bold text-indigo-700">{item?`${item.confirmed_points}/${item.max}`:'Unavailable'}</span></div>
       <p className="text-xs text-slate-500 mt-1">{item?.unknown_points? `${item.unknown_points} additional points unverified`:item?.status==='needs_improvement'?'Needs improvement':item?.status==='on_track'?'On track':'Not fully verified'}</p>
       <div className="h-2 rounded-full bg-slate-200 mt-3 overflow-hidden"><div className="h-full bg-indigo-600" style={{width:`${item?100*item.confirmed_points/item.max:0}%`}}/></div>
       <p className="text-sm text-slate-600 mt-3">{whyMatters[cat]}</p>
      </div>})}
     </div>
    </section>
    <section className="bg-white shadow-sm rounded-2xl border border-slate-200 p-6 sm:p-9">
     <h3 className="text-xl font-extrabold text-slate-900">Your improvement plan preview</h3>
     <p className="text-sm text-slate-600 mt-2 mb-4">We identified {report.areas_needing_improvement} broad improvement area(s). Your paid, website-specific plan identifies the precise findings and the work required to address them.</p>
     <div className="space-y-3">{cats.filter(cat=>report.categories[cat]?.status==='needs_improvement').map(cat=><div key={cat} className="border border-slate-200 rounded-xl p-4"><h4 className="font-bold text-slate-900">{cat} — Needs improvement</h4><p className="text-sm text-slate-600 mt-2">{whyMatters[cat]} Our personalized optimization plan identifies the specific issues and provides the steps to address them.</p></div>)}</div>
     {report.areas_needing_improvement===0&&<p className="text-sm text-slate-600">No confirmed category-level problems were found. Some evidence may still require verification.</p>}
    </section>
    <section className="bg-white shadow-sm rounded-2xl border border-slate-200 p-6 sm:p-9">
     <h3 className="text-xl font-extrabold text-slate-900">Get your personalized AI visibility improvement plan</h3>
     <div className="grid sm:grid-cols-2 gap-4 mt-5">
      <div className="rounded-xl border border-indigo-200 p-5"><h4 className="text-lg font-bold text-slate-900">$299 — DIY AI Visibility Blueprint</h4><p className="text-sm text-slate-600 mt-3">A personalized, website-specific plan with detailed findings, exact corrections, prioritized steps, copy-ready recommendations, and implementation and verification guidance.</p><Link to="/checkout?service=diy" className="inline-flex mt-5 bg-indigo-600 text-white font-semibold rounded-lg px-4 py-3">Get DIY Blueprint</Link></div>
      <div className="rounded-xl border border-indigo-200 p-5"><h4 className="text-lg font-bold text-slate-900">$999 — Done-For-You Optimization</h4><p className="text-sm text-slate-600 mt-3">Our team handles the website optimization implementation and verifies the work for you. Specific AI rankings and recommendations are not guaranteed.</p><Link to="/checkout?service=dfy" className="inline-flex mt-5 bg-indigo-600 text-white font-semibold rounded-lg px-4 py-3">Get Done-For-You</Link></div>
     </div>
    </section>
    <section className="bg-indigo-950 text-white rounded-2xl p-6 sm:p-9">
     <h3 className="text-2xl font-extrabold">Request a personalized review</h3>
     <p className="text-indigo-100 mt-2 mb-6">Have questions about your results or which service fits your business? Leave your details and we'll follow up.</p>
     <form className="grid sm:grid-cols-2 gap-4" onSubmit={submitLead}>
      {([['full_name','Full name'],['business_email','Business email'],['company_name','Company name'],['role_title','Role or position']] as const).map(([field,label])=><label key={field} className="text-sm font-semibold">{label}<input required maxLength={field==='business_email'?254:120} type={field==='business_email'?'email':'text'} className={input+' mt-2 text-slate-900'} value={lead[field]} onChange={e=>setLead(old=>({...old,[field]:e.target.value}))}/></label>)}
      <label className="sm:col-span-2 flex items-start gap-2 text-sm text-indigo-100"><input required type="checkbox" checked={lead.consent} onChange={e=>setLead(old=>({...old,consent:e.target.checked}))} className="mt-1"/><span>I agree to Promptila storing this information to respond to my request. See the <Link className="underline" to="/privacy-policy">Privacy Policy</Link>.</span></label>
      <label className="sm:col-span-2 flex items-start gap-2 text-sm text-indigo-100"><input type="checkbox" checked={lead.marketing_consent} onChange={e=>setLead(old=>({...old,marketing_consent:e.target.checked}))} className="mt-1"/><span>Optional: I would also like to receive occasional Promptila marketing and product emails. This is not required to request my review.</span></label>
      <button disabled={leadLoading} className="sm:col-span-2 bg-white text-indigo-900 font-extrabold rounded-xl px-5 py-3 disabled:opacity-60">{leadLoading?'Submitting…':'Request a review'}</button>
     </form>
     {leadStatus&&<p className="text-sm mt-4" role="status">{leadStatus}</p>}
    </section>
    <section className="bg-white shadow-sm rounded-2xl border border-slate-200 p-6 sm:p-9">
     <h3 className="text-xl font-extrabold text-slate-900">Permanent report link</h3>
     <p className="text-sm text-slate-600 mt-2 mb-4">Share your high-level readiness results. Detailed findings and contact information are never included.</p>
     <div className="flex gap-3 flex-wrap items-center">
      <Link to={reportUrl(report.domain)} className="text-indigo-700 break-all underline">{fullLink}</Link>
      <button type="button" onClick={async()=>{await navigator.clipboard.writeText(fullLink);setCopied(true)}} className="border rounded-lg py-2 px-3 text-sm flex items-center gap-2"><Copy size={15}/>{copied?'Copied':'Copy link'}</button>
     </div>
    </section>
    <div className="flex justify-start"><Link to="/ai-visibility-checker" onClick={()=>{setReport(null);setWebsite('');setError('');}} className="font-semibold text-indigo-700 underline">Check another website</Link></div>
   </div>}
   <p className="text-center text-xs text-slate-500 mt-8"><ShieldCheck size={14} className="inline mr-1"/>No live AI recommendation tests, paid AI model calls, or guarantee of AI ranking results.</p>
  </div>
 </div>;
}
