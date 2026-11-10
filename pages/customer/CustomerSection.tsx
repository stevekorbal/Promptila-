import React from 'react';
import { Link } from 'react-router-dom';
import { RefreshCw, AlertTriangle, FileSearch, FileText, CheckCircle2, ShoppingBag } from 'lucide-react';
import { useCustomerData } from './useCustomerData.ts';

type Section = 'overview' | 'audit' | 'blueprint' | 'recommendations' | 'progress' | 'dfy' | 'monitoring' | 'account';
const card = 'bg-white rounded-xl border border-slate-200/80 shadow-sm p-5';
const fmt = (v: string | null | undefined) => v ? new Date(v).toLocaleDateString() : '—';
const score = (a: any): number | null => {
  const n = a?.overall_score ?? a?.visibility_score;
  return typeof n === 'number' && n >= 0 && n <= 100 ? n : null;
};
const money = (cents: number | null) => typeof cents === 'number' ? new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(cents / 100) : '—';
const sections: Record<Section, { title: string; note: string }> = {
  overview: {title:'Your Dashboard',note:'Your verified Promptila records and account activity'},
  audit: {title:'My Audits',note:'Your recorded AI Readiness audits'},
  blueprint: {title:'My Blueprint',note:'Your purchased Blueprint and report records'},
  recommendations: {title:'Recommendations',note:'Recommendations are available only when recorded in your report'},
  progress: {title:'Progress',note:'Compare your recorded audits over time; no future results are guaranteed'},
  dfy: {title:'DFY Optimization',note:'Your recorded service orders'},
  monitoring: {title:'Monthly Monitoring',note:'Your recorded monitoring subscriptions'},
  account: {title:'Account',note:'Your signed-in account and registered businesses'}
};
const Empty: React.FC<{children: React.ReactNode}> = ({children}) => <div className={card+' text-sm text-slate-500'}>{children}</div>;
export const CustomerSection: React.FC<{section:Section}> = ({section}) => {
  const {data, loading, error, refresh, user} = useCustomerData();
  const latest = data.audits[0];
  const currentScore = score(latest);
  const reports = data.reports;
  const paidOrders = data.orders.filter(o => ['paid','completed','succeeded'].includes(String(o.status||'').toLowerCase()));
  const summary = sections[section];
  return <div className="space-y-5">
    <div className="flex items-start justify-between gap-3">
      <div><h1 className="text-xl font-bold text-slate-900">{summary.title}</h1><p className="text-sm text-slate-500 mt-1">{summary.note}</p></div>
      <button type="button" onClick={refresh} disabled={loading} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold hover:bg-slate-50 disabled:opacity-50"><RefreshCw className={loading?'w-4 h-4 animate-spin':'w-4 h-4'}/>Refresh</button>
    </div>
    {error && <div role="alert" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 flex gap-2"><AlertTriangle className="w-4 h-4 shrink-0"/>{error}</div>}
    {loading ? <Empty>Loading your account records…</Empty> : <>
      {section==='overview' && <>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            ['AI Readiness Score',currentScore===null?'Not available':currentScore+'/100'],
            ['Recorded Audits',String(data.audits.length)],
            ['Available Reports',String(reports.length)],
            ['Recorded Orders',String(data.orders.length)]
          ].map(([name,value])=><div key={name} className={card}><p className="text-xs font-semibold text-slate-500">{name}</p><p className="text-xl font-bold text-slate-900 mt-3">{value}</p></div>)}
        </div>
        <div className={card}><h2 className="text-sm font-bold text-slate-900 mb-3">Latest Audit</h2>
          {latest ? <div className="text-sm space-y-2"><p className="font-semibold">{latest.business_name||'Business audit'}</p><p>Score: {currentScore===null?'Not available':currentScore+'/100'} · {fmt(latest.created_at)}</p><p>Status: {latest.status||'Not recorded'}</p><Link className="text-indigo-600 font-semibold" to="/dashboard/audit">View your audits</Link></div> : <p className="text-sm text-slate-500">No audits are linked to your account yet. <Link to="/#audit" className="text-indigo-600">Request an audit</Link>.</p>}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className={card}><h2 className="text-sm font-bold mb-2">Reports</h2><p className="text-sm text-slate-600">{reports.length} available in your account</p><Link to="/dashboard/blueprint" className="text-sm text-indigo-600 font-semibold">View reports</Link></div>
          <div className={card}><h2 className="text-sm font-bold mb-2">Orders</h2><p className="text-sm text-slate-600">{data.orders.length} recorded orders</p><Link to="/dashboard/dfy" className="text-sm text-indigo-600 font-semibold">View orders</Link></div>
        </div>
      </>}
      {section==='audit' && (data.audits.length ? <div className="space-y-3">{data.audits.map(a=><div key={a.id} className={card}><div className="flex justify-between gap-3"><div><h2 className="font-semibold text-slate-900">{a.business_name||'Business audit'}</h2><p className="text-xs text-slate-500">{a.website||'Website not recorded'} · {fmt(a.created_at)}</p></div><p className="font-bold text-indigo-700">{score(a)===null?'Score unavailable':score(a)+'/100'}</p></div><p className="text-xs text-slate-500 mt-2">Status: {a.status||'Not recorded'} · Audit ID: {a.audit_id||a.id}</p></div>)}</div>:<Empty>No audits are linked to this account. <Link className="text-indigo-600" to="/#audit">Request a free audit</Link>.</Empty>)}
      {section==='blueprint' && (reports.length ? <div className="space-y-3">{reports.map(r=><div key={r.id} className={card}><h2 className="font-semibold">{r.title||'Customer report'}</h2><p className="text-xs text-slate-500 mt-1">{r.report_type||'Report'} · {fmt(r.created_at)} · {r.status||'Status not recorded'}</p>{r.file_url && /^https:\/\//i.test(r.file_url) ? <a className="text-sm text-indigo-600 font-semibold mt-3 inline-block" href={r.file_url} target="_blank" rel="noopener noreferrer">Open report</a> : <p className="text-xs text-slate-500 mt-2">No downloadable file is attached.</p>}</div>)}</div>:<Empty>No Blueprint or report is linked to your account. Purchased Blueprints delivered by email may not yet be linked to this portal.</Empty>)}
      {section==='recommendations' && <Empty>No verified, account-linked recommendation checklist is available in this dashboard yet. Check your delivered audit or Blueprint report for its actual findings. No sample recommendations are shown.</Empty>}
      {section==='progress' && (data.audits.length ? <div className={card}><h2 className="font-semibold mb-3">Recorded score history</h2><div className="space-y-3">{[...data.audits].reverse().map(a=><div key={a.id} className="flex justify-between border-b border-slate-100 pb-2 text-sm"><span>{fmt(a.created_at)} · {a.business_name||'Audit'}</span><strong>{score(a)===null?'Unavailable':score(a)+'/100'}</strong></div>)}</div><p className="text-xs text-slate-500 mt-3">Different businesses and scoring versions may not be directly comparable.</p></div>:<Empty>No audit history is linked to this account.</Empty>)}
      {section==='dfy' && <><div className={card}><h2 className="font-semibold">Recorded service orders</h2><p className="text-xs text-slate-500 mt-1">Orders are displayed as recorded. An order alone does not confirm fulfillment.</p></div>{data.orders.length ? data.orders.map(o=><div key={o.id} className={card}><p className="font-semibold">Order {o.id.slice(0,8)}</p><p className="text-sm text-slate-600 mt-1">{money(o.amount_cents)} · {o.status||'Status not recorded'} · {fmt(o.created_at)}</p></div>):<Empty>No service orders are linked to your account.</Empty>}<Link className="inline-block text-sm font-semibold text-indigo-600" to="/checkout?service=dfy">View DFY Optimization ($999)</Link></>}
      {section==='monitoring' && (data.subscriptions.length ? <div className="space-y-3">{data.subscriptions.map(s=><div key={s.id} className={card}><p className="font-semibold">Monitoring subscription</p><p className="text-sm text-slate-600 mt-1">Status: {s.status||'Not recorded'} · Renewal period end: {fmt(s.current_period_end)}</p></div>)}</div>:<Empty>No monitoring subscription is linked to your account. Monitoring activity is not claimed without an active record.</Empty>)}
      {section==='account' && <><div className={card}><h2 className="font-semibold">Signed-in account</h2><p className="text-sm text-slate-600 mt-2">{user?.email||'Email unavailable'}</p></div><div className={card}><h2 className="font-semibold mb-3">My businesses</h2>{data.businesses.length ? data.businesses.map(b=><div key={b.id} className="border-b border-slate-100 py-2 text-sm"><strong>{b.business_name||'Unnamed business'}</strong><p className="text-slate-500">{b.website||'No website'} · {[b.city,b.state].filter(Boolean).join(', ')}</p></div>):<p className="text-sm text-slate-500">No businesses are linked to your account.</p>}</div></>}
    </>}
  </div>;
};
export default CustomerSection;
