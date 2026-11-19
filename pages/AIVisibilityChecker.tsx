import React,{useEffect,useState} from 'react';
import {Link,useParams} from 'react-router-dom';
import {Globe,ShieldCheck,Search,Copy,CheckCircle2,AlertTriangle,Clock,ChevronDown} from 'lucide-react';
type Check={id:string;category:string;label:string;points:number;status:'pass'|'fail'|'unverified';evidence:string};
type Report={domain:string;url:string;scanned_at:string;status:'complete'|'incomplete';score:number|null;classification:string|null;categories:Record<string,{score:number|null;max:number;verified:number;total:number}>;engines:Record<string,number|null>;crawlerAccess:Record<string,string>;checks:Check[];js_dependent:boolean;elapsed_ms:number;disclaimer:string;llms_note:string};
const reportUrl=(domain:string)=>'/ai-visibility-checker/report/'+encodeURIComponent(domain);
const labels:{[key:string]:string}={pass:'Found',fail:'Needs attention',unverified:'Not verified'};
const cats=['AI crawler access','Structured data','Semantic structure','Content and entity signals','llms.txt','Technical health'];
export default function AIVisibilityChecker(){
 const {domain:reportDomain}=useParams<{domain?:string}>();
 const [website,setWebsite]=useState('');
 const [report,setReport]=useState<Report|null>(null);
 const [loading,setLoading]=useState(false);
 const [error,setError]=useState('');
 const [cached,setCached]=useState(false);
 const [lead,setLead]=useState({full_name:'',business_email:'',company_name:'',role_title:'',consent:false});
 const [leadStatus,setLeadStatus]=useState('');
 const [leadLoading,setLeadLoading]=useState(false);
 const [expanded,setExpanded]=useState<string|null>(null);
 const [copied,setCopied]=useState(false);
 useEffect(()=>{
  if(!reportDomain)return;
  let live=true;setLoading(true);setError('');setReport(null);
  fetch('/api/instant-checker?domain='+encodeURIComponent(reportDomain))
   .then(async r=>{const d=await r.json();if(!r.ok)throw Error(d.error||'Report unavailable');return d;})
   .then(d=>{if(live)setReport(d.report);})
   .catch(e=>{if(live)setError(e.message);})
   .finally(()=>{if(live)setLoading(false);});
  return()=>{live=false;};
 },[reportDomain]);
 async function submit(e:React.FormEvent){
  e.preventDefault();setLoading(true);setError('');setReport(null);setCached(false);setLeadStatus('');
  try{
   const r=await fetch('/api/instant-checker',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({website})});
   const d=await r.json();
   if(r.status===202)throw Error('A scan is already running for this website. Open its report shortly.');
   if(!r.ok)throw Error(d.error||'Unable to scan website');
   setReport(d.report);setCached(Boolean(d.cached));
  }catch(e:any){setError(e.message||'Unable to scan website');}finally{setLoading(false);}
 }
 async function submitLead(e:React.FormEvent){
  e.preventDefault();if(!report)return;
  setLeadLoading(true);setLeadStatus('');
  try{
   const r=await fetch('/api/instant-checker-lead',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({...lead,domain:report.domain})});
   const d=await r.json();
   if(!r.ok)throw Error(d.error||'Unable to submit');
   setLeadStatus(d.message||'Request received.');
  }catch(e:any){setLeadStatus(e.message||'Unable to submit.');}finally{setLeadLoading(false);}
 }
 const input='w-full rounded-xl border border-slate-300 px-4 py-3 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500';
 const fullLink=report?window.location.origin+reportUrl(report.domain):'';
 const badge=report&&report.status==='complete'?`<a href="https://www.promptila.com${reportUrl(report.domain)}"><img src="https://www.promptila.com/api/instant-checker-badge?domain=${encodeURIComponent(report.domain)}" alt="Promptila website readiness estimate" /></a>`:'';
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
   {loading&&<div role="status" className="bg-white rounded-xl border p-6 mb-6 text-indigo-700 flex items-center gap-3"><Search className="animate-pulse"/>Inspecting website access, structure and content. This may take up to 25 seconds or longer on slow sites.</div>}
   {error&&<div role="alert" className="rounded-xl p-4 bg-amber-50 text-amber-900 border border-amber-200 mb-7">{error}</div>}
   {report&&<div className="space-y-6">
    <section className="bg-white shadow-sm rounded-2xl border border-slate-200 p-6 sm:p-9">
     <div className="flex flex-wrap justify-between gap-4 mb-5">
      <div><p className="text-sm font-semibold text-indigo-600 uppercase">Website readiness report</p><h2 className="font-extrabold text-2xl text-slate-900 break-all">{report.domain}</h2><p className="text-sm text-slate-500 mt-1">Scanned {new Date(report.scanned_at).toLocaleString()} · {Math.round(report.elapsed_ms/1000)} seconds{cached?' · Cached result':''}</p></div>
      <span className={'self-start rounded-full px-4 py-2 text-sm font-bold '+(report.status==='complete'?'text-emerald-700 bg-emerald-50':'text-amber-800 bg-amber-50')}>{report.status==='complete'?'Completed scan':'Incomplete scan'}</span>
     </div>
     <div className="flex flex-wrap gap-5 items-center bg-slate-50 rounded-xl p-5">
      <div className="border-4 border-indigo-500 w-32 h-32 rounded-full flex flex-col justify-center items-center shrink-0">
       <strong className="text-4xl text-slate-900">{report.score??'—'}</strong><span className="text-slate-500 text-sm">out of 100</span>
      </div>
      <div className="flex-1 min-w-48">
       <h3 className="text-2xl font-bold text-slate-900">{report.classification||'Not enough verified information'}</h3>
       <p className="text-slate-600 text-sm mt-2">{report.status==='complete'?'This score reflects our website checks, not actual AI recommendations.':'Some evidence could not be verified. Promptila has not assigned a definitive score to this website.'}</p>
      </div>
     </div>
     {report.js_dependent&&<p className="mt-4 bg-amber-50 text-amber-900 border border-amber-200 p-4 rounded-xl text-sm"><AlertTriangle className="inline mr-2" size={17}/>This site appears to load important content with JavaScript. Some content and structure checks are unverified rather than marked missing.</p>}
    </section>
    <section className="bg-white shadow-sm rounded-2xl border border-slate-200 p-6 sm:p-9">
     <h3 className="text-xl font-extrabold text-slate-900 mb-5">Six readiness categories</h3>
     <div className="grid sm:grid-cols-2 gap-4">
      {cats.map(cat=>{const item=report.categories[cat];return <div key={cat} className="bg-slate-50 rounded-xl p-4"><div className="flex justify-between gap-3"><strong className="text-slate-800">{cat}</strong><span className="font-bold text-indigo-700">{item?.score===null?'Unverified':`${item.score}/${item.max}`}</span></div><p className="text-xs text-slate-500 mt-1">{item?.verified}/{item?.total} checks verified</p><div className="h-2 rounded-full bg-slate-200 mt-3 overflow-hidden"><div className="h-full bg-indigo-600" style={{width:`${item?.score===null?0:100*item.score/item.max}%`}}/></div></div>;})}
     </div>
    </section>
    <section className="bg-white shadow-sm rounded-2xl border border-slate-200 p-6 sm:p-9">
     <h3 className="text-xl font-extrabold text-slate-900">Estimated AI-platform readiness</h3>
     <p className="text-sm text-slate-600 mt-2 mb-5">{report.disclaimer}</p>
     <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {['ChatGPT','Gemini','Claude','Perplexity'].map(name=><div key={name} className="bg-indigo-50 rounded-xl p-4 text-center"><p className="font-bold text-slate-900">{name}</p><p className="text-3xl font-extrabold text-indigo-700 mt-1">{report.engines[name]??'—'}</p><p className="text-xs text-slate-500">Estimated /100</p></div>)}
     </div>
     <h4 className="font-semibold text-slate-900 mt-6 mb-2">Crawler permission signals</h4>
     <div className="grid sm:grid-cols-2 gap-2">{Object.entries(report.crawlerAccess).map(([name,status])=><div key={name} className="flex justify-between border border-slate-200 rounded-lg px-3 py-2 text-sm"><span>{name}</span><strong>{status}</strong></div>)}</div>
     <p className="text-xs text-slate-500 mt-3">Google-Extended is a Google AI usage control, not a definitive Gemini crawler test.</p>
    </section>
    <section className="bg-white shadow-sm rounded-2xl border border-slate-200 p-6 sm:p-9">
     <h3 className="text-xl font-extrabold text-slate-900 mb-2">Website signals checklist</h3>
     <p className="text-sm text-slate-500 mb-4">Found means verified present; needs attention means confirmed missing or failing; not verified means the scanner could not determine the result.</p>
     {cats.map(cat=><div key={cat} className="mb-5"><h4 className="font-bold text-slate-900 mb-2">{cat}</h4><div className="divide-y border rounded-lg overflow-hidden">{report.checks.filter(c=>c.category===cat).map(c=><div key={c.id}><button type="button" className="flex w-full items-center gap-3 text-left p-3 bg-white hover:bg-slate-50" onClick={()=>setExpanded(expanded===c.id?null:c.id)}><span className={c.status==='pass'?'text-emerald-600':c.status==='fail'?'text-amber-700':'text-slate-500'}>{c.status==='pass'?<CheckCircle2 size={19}/>:c.status==='fail'?<AlertTriangle size={19}/>:<Clock size={19}/>}</span><span className="flex-1 text-sm font-medium text-slate-800">{c.label}</span><span className="text-xs text-slate-600">{labels[c.status]}</span><ChevronDown size={15}/></button>{expanded===c.id&&<p className="text-sm text-slate-600 px-11 pb-4">{c.evidence}</p>}</div>)}</div></div>)}
     <p className="text-xs text-slate-500">{report.llms_note}</p>
    </section>
    <section className="bg-white shadow-sm rounded-2xl border border-slate-200 p-6 sm:p-9">
     <h3 className="text-xl font-extrabold text-slate-900">Share your public report</h3>
     <p className="text-sm text-slate-600 mt-2 mb-4">Only public website signals are shown. Personal lead details are never included.</p>
     <div className="flex gap-3 flex-wrap items-center">
      <Link to={reportUrl(report.domain)} className="text-indigo-700 break-all underline">{fullLink}</Link>
      <button type="button" onClick={async()=>{await navigator.clipboard.writeText(fullLink);setCopied(true)}} className="border rounded-lg py-2 px-3 text-sm flex items-center gap-2"><Copy size={15}/>{copied?'Copied':'Copy link'}</button>
     </div>
     {report.status==='complete'&&<details className="mt-6 text-sm"><summary className="font-bold cursor-pointer">Optional embeddable badge</summary><p className="text-slate-600 mt-2">Displays the Promptila website-readiness estimate, not verified AI rankings. Badge remains available only while the report is fresh.</p><textarea readOnly rows={3} className="w-full border rounded-lg p-3 mt-2" value={badge}/></details>}
    </section>
    <section className="bg-indigo-950 text-white rounded-2xl p-6 sm:p-9">
     <h3 className="text-2xl font-extrabold">Request your personalized fix-plan invitation</h3>
     <p className="text-indigo-100 mt-2 mb-6">Share your business details to register interest. The complete $299 Blueprint and implementation instructions are not provided by this free checker.</p>
     <form className="grid sm:grid-cols-2 gap-4" onSubmit={submitLead}>
      {([['full_name','Full name'],['business_email','Business email'],['company_name','Company name'],['role_title','Role or position']] as const).map(([field,label])=><label key={field} className="text-sm font-semibold">{label}<input required maxLength={field==='business_email'?254:120} type={field==='business_email'?'email':'text'} className={input+' mt-2 text-slate-900'} value={lead[field]} onChange={e=>setLead(old=>({...old,[field]:e.target.value}))}/></label>)}
      <label className="sm:col-span-2 flex items-start gap-2 text-sm text-indigo-100"><input required type="checkbox" checked={lead.consent} onChange={e=>setLead(old=>({...old,consent:e.target.checked}))} className="mt-1"/><span>I agree to Promptila storing this information to respond to my fix-plan inquiry. See the <Link className="underline" to="/privacy-policy">Privacy Policy</Link>.</span></label>
      <button disabled={leadLoading} className="sm:col-span-2 bg-white text-indigo-900 font-extrabold rounded-xl px-5 py-3 disabled:opacity-60">{leadLoading?'Submitting…':'Request fix-plan invitation'}</button>
     </form>
     {leadStatus&&<p className="text-sm mt-4" role="status">{leadStatus}</p>}
    </section>
   </div>}
   <p className="text-center text-xs text-slate-500 mt-8"><ShieldCheck size={14} className="inline mr-1"/>No live AI recommendation tests, paid AI model calls, or guarantee of AI ranking results.</p>
  </div>
 </div>;
}
