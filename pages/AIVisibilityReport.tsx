import React,{useEffect,useState} from 'react';
import {useParams,useLocation,Link} from 'react-router-dom';
import {ScanDisplay,type Scan} from './AIVisibilityChecker.tsx';
export default function AIVisibilityReport(){
 const {host=''}=useParams(), location=useLocation();const [token,setToken]=useState(String((location.state as any)?.previewToken||''));
 const [scan,setScan]=useState<Scan|null>(null),[error,setError]=useState(''),[loading,setLoading]=useState(false);
 async function load(e?:React.FormEvent){e?.preventDefault();setLoading(true);setError('');
  try{const res=await fetch('/api/instant-checker?website='+encodeURIComponent(host),{headers:{'x-promptila-preview-token':token}});const data=await res.json();if(!res.ok)throw Error(data.error||'Report unavailable');setScan(data.report);}
  catch(e:any){setError(e.message);}finally{setLoading(false);}
 }
 useEffect(()=>{if(token)void load();},[host]);
 return <div className="min-h-screen bg-slate-50 pt-28 pb-20"><div className="mx-auto max-w-5xl px-4">
 <Link to="/ai-visibility-checker" className="text-sm font-semibold text-indigo-700">← Check another website</Link>
 <h1 className="my-7 text-3xl font-extrabold">Promptila AI Visibility Report</h1>
 {!scan&&<form onSubmit={load} className="rounded-xl border bg-white p-6"><p className="mb-3 text-sm text-slate-600">This report is in private preview. Enter the authorized tester token to access it.</p><input required type="password" autoComplete="off" value={token} onChange={e=>setToken(e.target.value)} placeholder="Private preview token" className="w-full rounded-lg border p-3"/><button disabled={loading} className="mt-3 rounded-lg bg-indigo-600 px-5 py-3 font-bold text-white">{loading?'Loading...':'Load report'}</button>{error&&<p role="alert" className="mt-3 text-red-700">{error}</p>}</form>}
 {scan&&<><ScanDisplay scan={scan}/><div className="mt-8 rounded-xl border bg-white p-6"><h2 className="text-xl font-bold">Optional Promptila badge</h2><p className="mt-2 text-sm text-slate-600">Only available for completed, current reports after public-launch approval. The badge links to this public website-readiness report and does not measure actual AI mentions.</p></div></>}
 </div></div>;
}
