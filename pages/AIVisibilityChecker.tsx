import React,{useEffect,useState} from 'react';
import {Link,useParams} from 'react-router-dom';
import {Globe,ShieldCheck,Search,Copy,CheckCircle2,AlertTriangle,Clock,ChevronDown} from 'lucide-react';
import {buildFixPlan} from '../api/_lib/instant-fix-plan';
type Check={id:string;category:string;label:string;points:number;status:'pass'|'fail'|'unverified';evidence:string};
type Report={domain:string;url:string;scanned_at:string;status:'complete'|'incomplete';score:number|null;classification:string|null;categories:Record<string,{score:number|null;max:number;verified:number;total:number}>;engines:Record<string,number|null>;crawlerAccess:Record<string,string>;checks:Check[];js_dependent:boolean;elapsed_ms:number;rendering?:{status:'complete'|'failed'|'disabled'|'not_needed';pages:number;elapsed_ms:number;requests:number;bytes:number};disclaimer:string;llms_note:string;robots_rules?:Record<string,string>;probes?:Record<string,{status:string;reason:string;http_status?:number}>;summary?:{strengths:string[];weaknesses:string[];uncertain?:string[];unverified_count:number};provisional?:{verified_points:number;unknown_points:number;minimum:number;maximum:number;is_provisional:boolean}};
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
const labels:{[key:string]:string}={pass:'Found',fail:'Needs attention',unverified:'Not verified'};
const cats=['AI crawler access','Structured data','Semantic structure','Content and entity signals','llms.txt','Technical health'];
const badgeStyles=['dark','light','shield','seal'] as const;
type BadgeStyle=typeof badgeStyles[number];
const whyMatters:Record<string,string>={
 'AI crawler access':'Crawler rules can prevent automated services from requesting public pages; permissions do not guarantee AI recommendations.',
 'Structured data':'Linked, valid structured data helps machines interpret the identity and nature of a page.',
 'Semantic structure':'Clear titles, headings and readable content make a page easier to understand.',
 'Content and entity signals':'Consistent business descriptions help distinguish a company from unrelated websites.',
 'llms.txt':'This is an optional, voluntary convention; it is not required for AI recommendations.',
 'Technical health':'Working HTTPS, canonical signals and indexability support ordinary website discovery.'
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
 const [expanded,setExpanded]=useState<string|null>(null);
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
 const fixPlan=report?buildFixPlan(report.checks):[];
 const input='w-full rounded-xl border border-slate-300 px-4 py-3 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500';
 const fullLink=report?window.location.origin+reportUrl(report.domain):'';
 const badgeSrc=report?window.location.origin+'/api/instant-checker?badge=1&domain='+encodeURIComponent(report.domain)+'&style='+badgeStyle:'';
 const badge=report&&report.status==='complete'&&!stale?`<a href="${fullLink}" target="_blank" rel="noopener noreferrer"><img src="${badgeSrc}" alt="Promptila website-readiness estimate — ${badgeStyle} style" /></a>`:'';
 useEffect(()=>{
  if(!report||report.status!=='complete'||stale){setBadgePreview('');return;}
  let live=true;let objectUrl='';
  fetch('/api/instant-checker?badge=1&domain='+encodeURIComponent(report.domain)+'&style='+badgeStyle)
   .then(async response=>{if(!response.ok)throw Error('Unavailable badge');return response.blob();})
   .then(blob=>{if(!live)return;objectUrl=URL.createObjectURL(blob);setBadgePreview(objectUrl);})
   .catch(()=>{if(live)setBadgePreview('');});
  return()=>{live=false;if(objectUrl)URL.revokeObjectURL(objectUrl);};
 },[report?.domain,report?.status,badgeStyle,stale]);
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
      <Link to="/ai-visibility-checker" onClick={()=>{setReport(null);setWebsite('');setError('');}} className="font-bold text-indigo-700 underline">Check another website</Link>
      {stale&&<span className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-2 text-sm text-amber-900">Saved report is older than the seven-day freshness window. It has not been rescanned.</span>}
    </div>
    <section className="bg-white shadow-sm rounded-2xl border border-slate-200 p-6 sm:p-9">
     <div className="flex flex-wrap justify-between gap-4 mb-5">
      <div><p className="text-sm font-semibold text-indigo-600 uppercase">Website readiness report</p><h2 className="font-extrabold text-2xl text-slate-900 break-all">{report.domain}</h2><p className="text-sm text-slate-500 mt-1">Scanned {new Date(report.scanned_at).toLocaleString()} · {Math.round(report.elapsed_ms/1000)} seconds{cached?' · Cached result':''}</p></div>
      <span className={'self-start rounded-full px-4 py-2 text-sm font-bold '+(report.status==='complete'?'text-emerald-700 bg-emerald-50':'text-amber-800 bg-amber-50')}>{report.status==='complete'?'Completed scan':'Incomplete scan'}</span>
     </div>
     <div className="flex flex-wrap gap-5 items-center bg-slate-50 rounded-xl p-5">
      <div className="border-4 border-indigo-500 w-32 h-32 rounded-full flex flex-col justify-center items-center shrink-0">
       <strong className={(report.score===null&&report.provisional&&report.provisional.unknown_points<60?"text-2xl":"text-4xl")+" text-slate-900"}>{report.score??(report.provisional&&report.provisional.unknown_points<60?`${report.provisional.minimum}–${report.provisional.maximum}`:"—")}</strong><span className="text-slate-500 text-xs">{report.score!==null?"out of 100":report.provisional&&report.provisional.unknown_points<60?"provisional / 100":"no final score"}</span>
      </div>
      <div className="flex-1 min-w-48">
       <h3 className="text-2xl font-bold text-slate-900">{report.classification||'Assessment incomplete'}</h3>
       <p className="text-slate-600 text-sm mt-2">{report.status==='complete'?'This score reflects our website checks, not actual AI recommendations.':'Some evidence could not be verified. Any displayed range is provisional, not a definitive score.'}</p>
      </div>
     </div>
     {report.status==='incomplete'&&report.provisional&&<div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-5">
      <p className="text-sm font-bold uppercase tracking-wide text-amber-900">Provisional range — not a final score</p>
      {report.provisional.unknown_points>=60?
       <p className="mt-2 text-xl font-bold text-amber-950">Not enough evidence for a useful score range</p>:
       <p className="mt-1 text-3xl font-extrabold text-amber-950">{report.provisional.minimum}–{report.provisional.maximum}<span className="text-base font-medium"> / 100</span></p>}
      {report.provisional.unknown_points>=60&&<p className="text-sm mt-2 text-amber-900">For transparency, the mathematical bounds are {report.provisional.minimum}–{report.provisional.maximum}/100, but the uncertainty is too large to use as a rating.</p>}
      <p className="mt-2 text-sm text-amber-900">{report.provisional.verified_points} points confirmed earned; {report.provisional.unknown_points} points remain unverified. Unknown checks are neither passed nor failed. No definitive AI-engine scores are assigned.</p>
     </div>}
     <details className="mt-4 text-sm text-slate-600"><summary className="cursor-pointer font-semibold text-indigo-700">How we checked JavaScript-loaded content</summary>
     {report.rendering?.status==='complete'?<p className="mt-4 rounded-xl bg-indigo-50 border border-indigo-200 p-4 text-sm text-slate-800"><strong>Browser-rendered evidence verified.</strong> A bounded browser checked {report.rendering.pages} same-site page(s) in {(report.rendering.elapsed_ms/1000).toFixed(1)} seconds. Some important content was verified only after JavaScript ran in a browser; it may be less accessible to AI crawlers that rely on the initial HTTP response. This does not prove any particular AI crawler cannot render JavaScript. Raw HTTP crawler checks remain separate, and outstanding uncertainty is shown below.</p>:report.js_dependent&&<p className="mt-4 bg-amber-50 text-amber-900 border border-amber-200 p-4 rounded-xl text-sm"><AlertTriangle className="inline mr-2" size={17}/>This site appears to load important content with JavaScript. Browser rendering {report.rendering?.status==='failed'?'could not verify the missing content':'was not available for this scan'}; unknown checks have not been marked as failures.</p>}
     </details>
    </section>
    <section className="bg-white shadow-sm rounded-2xl border border-slate-200 p-6 sm:p-9">
     <h3 className="text-xl font-extrabold text-slate-900">Estimated AI-platform readiness</h3>
     <p className="text-sm text-slate-600 mt-2 mb-5">{report.disclaimer}</p>
     <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {['ChatGPT','Gemini','Claude','Perplexity'].map(name=><div key={name} className="bg-indigo-50 rounded-xl p-4 text-center"><p className="font-bold text-slate-900">{name}</p><p className={(report.engines[name]===null||report.engines[name]===undefined?"text-base":"text-3xl")+" font-extrabold text-indigo-700 mt-1"}>{report.engines[name]===null||report.engines[name]===undefined?'Incomplete':report.engines[name]}</p><p className="text-xs text-slate-500">{report.engines[name]===null||report.engines[name]===undefined?"Scan incomplete":"Estimated /100"}</p></div>)}
     </div>
     <details className="mt-5 rounded-lg border border-slate-200 p-4 text-sm"><summary className="font-semibold text-slate-700 cursor-pointer">Technical crawler details</summary>
     <h4 className="font-semibold text-slate-900 mt-6 mb-2">Crawler permission signals</h4>
     <div className="grid sm:grid-cols-2 gap-2">{Object.entries(report.crawlerAccess).map(([name,status])=><div key={name} className="flex justify-between border border-slate-200 rounded-lg px-3 py-2 text-sm"><span>{name}</span><strong>{status}</strong></div>)}</div>
     <p className="text-xs text-slate-500 mt-3">Google-Extended is a Google AI usage control, not a definitive Gemini crawler test.</p>
     {report.robots_rules&&<details className="mt-5"><summary className="font-semibold text-slate-900 cursor-pointer">Seven crawler identities in robots.txt</summary><div className="mt-3 grid sm:grid-cols-2 gap-2">{Object.entries(report.robots_rules).map(([agent,permission])=><div key={agent} className="flex justify-between text-sm border rounded-lg px-3 py-2"><span>{agent}</span><strong>{permission}</strong></div>)}</div></details>}
     {report.probes&&<div className="mt-5"><h4 className="font-semibold text-slate-900 mb-2">Live HTTP crawler user-agent probes</h4><p className="text-xs text-slate-500 mb-3">These are independent HTTP requests using crawler user-agent strings, not AI API requests. A successful response does not prove official crawler access.</p><div className="grid sm:grid-cols-2 gap-2">{Object.entries(report.probes as Record<string,{status:string;reason:string;http_status?:number}>).map(([name,probe])=><div key={name} className="border rounded-lg px-3 py-2 text-sm flex justify-between gap-2"><span>{name}</span><span className="text-right"><strong>{probe.status}</strong><span className="block text-xs text-slate-500">{probe.http_status??'No HTTP status'} · {probe.reason.replace(/_/g,' ')}</span></span></div>)}</div></div>}
     </details>
    </section>
    <section className="bg-white shadow-sm rounded-2xl border border-slate-200 p-6 sm:p-9">
     <h3 className="text-xl font-extrabold text-slate-900">Score badge</h3>
     <p className="text-sm text-slate-600 mt-2">Available only for complete, current reports.</p>
     {report.status==='complete'&&!stale?<div className="mt-6">
      <h4 className="font-bold text-slate-900">Optional embeddable badge</h4>
      <p className="text-slate-600 mt-2 text-sm">Select a design. The badge is public only when the production checker is activated. No AI certification is implied.</p>
      <div className="flex gap-2 flex-wrap mt-4">{badgeStyles.map(style=><button type="button" key={style} onClick={()=>setBadgeStyle(style)} aria-pressed={badgeStyle===style} className={'rounded-lg border px-4 py-2 capitalize text-sm font-semibold '+(badgeStyle===style?'bg-indigo-600 text-white':'bg-white text-slate-700')}>{style}</button>)}</div>
      {badgePreview?<img src={badgePreview} alt={'Promptila '+badgeStyle+' style readiness badge'} className="mt-4 max-w-full" width={320} height={90}/>:<p className="mt-4 text-sm text-slate-600">Badge preview is unavailable.</p>}
      <label className="block font-semibold text-sm mt-4 text-slate-800">Copy embed code<textarea readOnly rows={3} className="w-full border rounded-lg p-3 mt-2 font-mono text-xs" value={badge}/></label>
      <button type="button" className="border rounded-lg px-4 py-2 text-sm font-semibold mt-2" onClick={()=>navigator.clipboard.writeText(badge)}>Copy badge embed code</button>
     </div>:<p className="text-xs text-amber-800 mt-4">A verified score badge is available only for complete, current reports.</p>}
    </section>
    <section className="bg-white shadow-sm rounded-2xl border border-slate-200 p-6 sm:p-9">
     <h3 className="text-xl font-extrabold text-slate-900 mb-3">What we confirmed</h3>
     {report.summary?<div className="grid sm:grid-cols-2 gap-5 text-sm">
      <div><strong className="text-emerald-700">Verified strengths</strong><ul className="mt-2 list-disc pl-5 space-y-1 text-slate-700">{report.summary.strengths.length?report.summary.strengths.map(s=><li key={s}>{s}</li>):<li>No confirmed strengths available yet</li>}</ul></div>
      <div><strong className="text-amber-800">Verified gaps</strong><ul className="mt-2 list-disc pl-5 space-y-1 text-slate-700">{report.summary.weaknesses.length?report.summary.weaknesses.map(s=><li key={s}>{s}</li>):<li>No confirmed gaps in inspected evidence</li>}</ul></div>
     </div>:<p className="text-sm text-slate-500">See the website signals checklist below for confirmed findings.</p>}
     {!!report.summary?.uncertain?.length&&<div className="mt-4 text-sm"><strong className="text-slate-700">Important findings we could not verify</strong><ul className="list-disc pl-5 mt-2 text-slate-600">{report.summary.uncertain.map(s=><li key={s}>{s}</li>)}</ul></div>}
     {report.status==='incomplete'&&<p className="bg-amber-50 border border-amber-100 rounded-lg p-3 text-sm text-amber-900 mt-4">This is an incomplete assessment. {report.summary?.unverified_count??report.checks.filter(c=>c.status==='unverified').length} checks were not verified. Verified findings are displayed below, but no final score was assigned.</p>}
    </section>
    <section className="bg-white shadow-sm rounded-2xl border border-slate-200 p-6 sm:p-9">
     <h3 className="text-xl font-extrabold text-slate-900 mb-2">Website signals checklist</h3>
     <p className="text-sm text-slate-500 mb-4">Found = confirmed present. Needs attention = confirmed issue. Not verified = insufficient evidence. Open a check for details.</p>
     <h3 className="text-xl font-extrabold text-slate-900 mb-5">Six readiness categories</h3>
     <div className="grid sm:grid-cols-2 gap-4">
      {cats.map(cat=>{const item=report.categories[cat];return <div key={cat} className="bg-slate-50 rounded-xl p-4"><div className="flex justify-between gap-3"><strong className="text-slate-800">{cat}</strong><span className="font-bold text-indigo-700">{item?.score===null?'Unverified':`${item.score}/${item.max}`}</span></div><p className="text-xs text-slate-500 mt-1">{item?.verified}/{item?.total} checks verified</p><div className="h-2 rounded-full bg-slate-200 mt-3 overflow-hidden"><div className="h-full bg-indigo-600" style={{width:`${item?.score===null?0:100*item.score/item.max}%`}}/></div><p className="text-xs text-slate-600 mt-3">{whyMatters[cat]}</p>{item?.score===null&&<p className="text-xs text-amber-800 mt-2">One or more checks could not be verified.</p>}</div>;})}
     </div>
     {cats.map(cat=><div key={cat} className="mb-5"><h4 className="font-bold text-slate-900 mb-2">{cat}</h4><div className="divide-y border rounded-lg overflow-hidden">{report.checks.filter(c=>c.category===cat).map(c=><div key={c.id}><button type="button" className="flex w-full items-center gap-3 text-left p-3 bg-white hover:bg-slate-50" onClick={()=>setExpanded(expanded===c.id?null:c.id)}><span className={c.status==='pass'?'text-emerald-600':c.status==='fail'?'text-amber-700':'text-slate-500'}>{c.status==='pass'?<CheckCircle2 size={19}/>:c.status==='fail'?<AlertTriangle size={19}/>:<Clock size={19}/>}</span><span className="flex-1 text-sm font-medium text-slate-800">{c.label}</span><span className="text-xs text-slate-600">{labels[c.status]}</span><ChevronDown size={15}/></button>{expanded===c.id&&<div className="px-11 pb-4 text-sm text-slate-600"><p><strong>Evidence:</strong> {c.evidence}</p><p className="mt-2"><strong>Why it matters:</strong> {whyMatters[cat]}</p></div>}</div>)}</div></div>)}
     <p className="text-xs text-slate-500">{report.llms_note}</p>
    </section>
    <section className="bg-white shadow-sm rounded-2xl border border-slate-200 p-6 sm:p-9">
     <h3 className="text-xl font-extrabold text-slate-900">Prioritized fix plan</h3>
     <p className="text-sm text-slate-600 mt-2 mb-4">A short starting point based on confirmed failed checks—not the complete paid Blueprint.</p>
     {fixPlan.length?<ol className="space-y-4">{fixPlan.map((item,i)=><li key={item.id} className="border rounded-xl p-4"><div className="flex gap-2 items-start justify-between flex-wrap"><h4 className="font-bold text-slate-900">{i+1}. {item.title}</h4><span className="text-xs font-semibold bg-indigo-50 text-indigo-700 rounded-full px-3 py-1">{item.priority} priority · {item.impact} points</span></div><p className="text-sm text-slate-700 mt-3"><strong>Problem:</strong> {item.problem}</p><p className="text-sm text-slate-700 mt-2"><strong>Why it matters:</strong> {item.why}</p><p className="text-sm text-slate-700 mt-2"><strong>Suggested action:</strong> {item.action}</p></li>)}</ol>:<p className="text-sm text-slate-600">No confirmed issues to recommend fixing; unverified checks may still require review.</p>}
     {report.checks.some(c=>c.status==='unverified')&&<p className="text-xs text-amber-800 mt-4">Unverified checks are not counted as failed and are excluded from these recommendations.</p>}
    </section>
    <section className="bg-indigo-950 text-white rounded-2xl p-6 sm:p-9">
     <h3 className="text-2xl font-extrabold">Request a full audit or fix-plan invitation</h3>
     <p className="text-indigo-100 mt-2 mb-6">For a complete audit or the $299 Blueprint, leave your details. This free report includes only high-level recommendations.</p>
     <form className="grid sm:grid-cols-2 gap-4" onSubmit={submitLead}>
      {([['full_name','Full name'],['business_email','Business email'],['company_name','Company name'],['role_title','Role or position']] as const).map(([field,label])=><label key={field} className="text-sm font-semibold">{label}<input required maxLength={field==='business_email'?254:120} type={field==='business_email'?'email':'text'} className={input+' mt-2 text-slate-900'} value={lead[field]} onChange={e=>setLead(old=>({...old,[field]:e.target.value}))}/></label>)}
      <label className="sm:col-span-2 flex items-start gap-2 text-sm text-indigo-100"><input required type="checkbox" checked={lead.consent} onChange={e=>setLead(old=>({...old,consent:e.target.checked}))} className="mt-1"/><span>I agree to Promptila storing this information to respond to my fix-plan inquiry. See the <Link className="underline" to="/privacy-policy">Privacy Policy</Link>.</span></label>
      <label className="sm:col-span-2 flex items-start gap-2 text-sm text-indigo-100"><input type="checkbox" checked={lead.marketing_consent} onChange={e=>setLead(old=>({...old,marketing_consent:e.target.checked}))} className="mt-1"/><span>Optional: I would also like to receive occasional Promptila marketing and product emails. This is not required to request my fix-plan invitation.</span></label>
      <button disabled={leadLoading} className="sm:col-span-2 bg-white text-indigo-900 font-extrabold rounded-xl px-5 py-3 disabled:opacity-60">{leadLoading?'Submitting…':'Request fix-plan invitation'}</button>
     </form>
     {leadStatus&&<p className="text-sm mt-4" role="status">{leadStatus}</p>}
    </section>
    <section className="bg-white shadow-sm rounded-2xl border border-slate-200 p-6 sm:p-9">
     <h3 className="text-xl font-extrabold text-slate-900">Permanent report link</h3>
     <p className="text-sm text-slate-600 mt-2 mb-4">Only public website signals are shown. Personal lead details are never included.</p>
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
