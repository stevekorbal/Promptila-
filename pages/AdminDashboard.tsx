import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Users, 
  Building2, 
  Inbox, 
  Search, 
  FileText, 
  ShoppingBag, 
  Repeat, 
  Layers, 
  ShieldCheck, 
  RefreshCw, 
  LogOut, 
  CheckCircle2, 
  Clock, 
  ExternalLink,
  Plus,
  TrendingUp,
  AlertTriangle,
  ChevronRight,
  Database
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { getSupabaseClient } from '../lib/supabase.ts';

type AdminTab = 'users' | 'businesses' | 'audit_requests' | 'audits' | 'reports' | 'orders' | 'subscriptions' | 'services';

const AdminDashboard: React.FC = () => {
  const { user, profile, role, signOut, isConfigured } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>('users');
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  // Admin data sets
  const [usersList, setUsersList] = useState<any[]>([]);
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [auditRequests, setAuditRequests] = useState<any[]>([]);
  const [audits, setAudits] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);

  const fetchAdminData = async () => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      // Mock admin data when Supabase is in workspace preview mode
      setUsersList([
        { id: 'usr-1', email: 'sarah.jenkins@apexdental.com', role: 'user', full_name: 'Sarah Jenkins', created_at: '2026-08-10T10:00:00Z' },
        { id: 'usr-2', email: 'michael.ross@harveyross.law', role: 'user', full_name: 'Michael Ross', created_at: '2026-08-12T14:15:00Z' },
        { id: 'usr-admin', email: 'admin@promptila.com', role: 'admin', full_name: 'Executive Administrator', created_at: '2026-08-01T08:00:00Z' },
      ]);
      setBusinesses([
        { id: 'biz-1', user_id: 'usr-1', name: 'Apex Dental Care', website: 'https://apexdentalcare.com', city: 'Scottsdale', state: 'AZ', created_at: '2026-08-10T11:00:00Z' },
        { id: 'biz-2', user_id: 'usr-2', name: 'Ross & Partners IP Law', website: 'https://harveyross.law', city: 'Denver', state: 'CO', created_at: '2026-08-12T14:30:00Z' },
      ]);
      setAuditRequests([
        { id: 'req-1', business_name: 'ClearView Orthodontics', website: 'https://clearviewortho.com', email: 'contact@clearviewortho.com', status: 'pending', created_at: '2026-09-15T18:22:00Z' },
        { id: 'req-2', business_name: 'Summit Financial Advisory', website: 'https://summitadvisors.io', email: 'team@summitadvisors.io', status: 'completed', created_at: '2026-09-14T09:40:00Z' },
      ]);
      setAudits([
        { id: 'aud-1', business_id: 'biz-1', overall_score: 84, status: 'completed', business_name: 'Apex Dental Care', created_at: '2026-08-11T16:00:00Z' },
        { id: 'aud-2', business_id: 'biz-2', overall_score: 92, status: 'completed', business_name: 'Ross & Partners IP Law', created_at: '2026-08-13T12:00:00Z' },
      ]);
      setReports([
        { id: 'rep-1', audit_id: 'aud-1', title: 'Apex Dental AI Citations & LLM Training Audit', file_url: '#', created_at: '2026-08-14T10:00:00Z' },
        { id: 'rep-2', audit_id: 'aud-2', title: 'Ross & Partners Competitor Displacement Dossier', file_url: '#', created_at: '2026-08-15T15:30:00Z' },
      ]);
      setOrders([
        { id: 'ord-101', user_id: 'usr-1', service_name: 'DFY Optimization', amount: 1199, status: 'completed', billing_type: 'one-time', created_at: '2026-08-10T11:30:00Z' },
        { id: 'ord-102', user_id: 'usr-2', service_name: 'DIY Blueprint', amount: 297, status: 'completed', billing_type: 'one-time', created_at: '2026-08-12T15:00:00Z' },
      ]);
      setSubscriptions([
        { id: 'sub-201', user_id: 'usr-1', service_name: 'Monthly Monitoring', status: 'active', current_period_end: '2026-10-10T00:00:00Z', created_at: '2026-08-10T11:30:00Z' },
      ]);
      setServices([
        { id: 'srv-1', slug: 'diy', name: 'DIY Blueprint', description: 'Self-paced AI search optimization framework', price: 297, billing_type: 'one-time' },
        { id: 'srv-2', slug: 'dfy', name: 'DFY Optimization', description: 'Complete turnkey implementation by Promptila team', price: 1199, billing_type: 'one-time' },
        { id: 'srv-3', slug: 'monitoring', name: 'Monthly Monitoring', description: '24/7 brand surveillance & displacement defense', price: 99, billing_type: 'recurring' },
      ]);
      setLoading(false);
      return;
    }

    try {
      // Query all 8 tables using Supabase Admin RLS
      const [
        pRes, 
        bRes, 
        reqRes, 
        aRes, 
        repRes, 
        oRes, 
        subRes, 
        sRes
      ] = await Promise.all([
        supabase.from('profiles').select('*').order('created_at', { ascending: false }),
        supabase.from('businesses').select('*').order('created_at', { ascending: false }),
        supabase.from('audit_requests').select('*').order('created_at', { ascending: false }),
        supabase.from('audits').select('*').order('created_at', { ascending: false }),
        supabase.from('reports').select('*').order('created_at', { ascending: false }),
        supabase.from('orders').select('*').order('created_at', { ascending: false }),
        supabase.from('subscriptions').select('*').order('created_at', { ascending: false }),
        supabase.from('services').select('*').order('price', { ascending: true }),
      ]);

      if (pRes.data) setUsersList(pRes.data);
      if (bRes.data) setBusinesses(bRes.data);
      if (reqRes.data) setAuditRequests(reqRes.data);
      if (aRes.data) setAudits(aRes.data);
      if (repRes.data) setReports(repRes.data);
      if (oRes.data) setOrders(oRes.data);
      if (subRes.data) setSubscriptions(subRes.data);
      if (sRes.data) setServices(sRes.data);
    } catch (err) {
      console.warn('Error querying Supabase tables for admin:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchAdminData();
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="pt-24 pb-20 bg-slate-100/70 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Admin Banner & Navigation */}
        <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl mb-8 border border-slate-800">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <div className="flex items-center space-x-3 mb-2">
                <span className="text-[11px] font-black uppercase tracking-widest text-amber-400 bg-amber-950/70 border border-amber-800/80 px-3 py-0.5 rounded-full flex items-center space-x-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                  <span>Admin Access Granted</span>
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  role: {role}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                Promptila Executive Operations
              </h1>
              <p className="mt-1 text-xs sm:text-sm text-slate-300">
                Direct management of database records, client audits, and subscription pipelines
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                to="/dashboard"
                className="inline-flex items-center px-4 py-2 rounded-xl text-xs font-bold text-slate-200 bg-slate-800 hover:bg-slate-700 transition-colors border border-slate-700"
              >
                <span>&larr; Switch to Client Portal</span>
              </Link>

              <button
                onClick={handleRefresh}
                title="Reload all Supabase tables"
                className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 border border-slate-700 transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>

              <button
                onClick={handleSignOut}
                className="inline-flex items-center px-3 py-2 rounded-xl text-xs font-bold text-rose-300 bg-rose-950/50 hover:bg-rose-900/60 border border-rose-800/80 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5 mr-1" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>

        {/* Admin Navigation Pills for the 8 Tables */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-4 mb-8 scrollbar-none">
          {[
            { id: 'users', label: 'Users', icon: Users, count: usersList.length },
            { id: 'businesses', label: 'Businesses', icon: Building2, count: businesses.length },
            { id: 'audit_requests', label: 'Audit Requests', icon: Inbox, count: auditRequests.length },
            { id: 'audits', label: 'Audits', icon: Search, count: audits.length },
            { id: 'reports', label: 'Reports', icon: FileText, count: reports.length },
            { id: 'orders', label: 'Orders', icon: ShoppingBag, count: orders.length },
            { id: 'subscriptions', label: 'Subscriptions', icon: Repeat, count: subscriptions.length },
            { id: 'services', label: 'Services', icon: Layers, count: services.length },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as AdminTab)}
                className={`flex items-center space-x-2 px-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all shadow-xs ${
                  isActive
                    ? 'bg-slate-900 text-white ring-2 ring-indigo-500'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-indigo-400' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                    isActive ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search bar within active dataset */}
        <div className="mb-6 flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search ${activeTab.replace('_', ' ')}...`}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
            />
          </div>
          <div className="text-xs text-slate-500 font-mono">
            Table: <strong className="text-slate-800">{activeTab}</strong>
          </div>
        </div>

        {/* TAB CONTENTS */}

        {/* 1. USERS */}
        {activeTab === 'users' && (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3.5">User / Name</th>
                  <th className="px-6 py-3.5">Email</th>
                  <th className="px-6 py-3.5">Role</th>
                  <th className="px-6 py-3.5">ID (UID)</th>
                  <th className="px-6 py-3.5">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {usersList
                  .filter((u) => !searchQuery || JSON.stringify(u).toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-900">
                        {u.full_name || `${u.first_name || ''} ${u.last_name || ''}`.trim() || 'User'}
                      </td>
                      <td className="px-6 py-4 text-slate-600">{u.email}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                            u.role === 'admin'
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : 'bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                        >
                          {u.role || 'user'}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-mono text-[10px] text-slate-400">
                        {u.id}
                      </td>
                      <td className="px-6 py-4 text-slate-500">
                        {u.created_at ? new Date(u.created_at).toLocaleDateString() : 'N/A'}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 2. BUSINESSES */}
        {activeTab === 'businesses' && (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3.5">Business Name</th>
                  <th className="px-6 py-3.5">Website</th>
                  <th className="px-6 py-3.5">Location</th>
                  <th className="px-6 py-3.5">Owner User ID</th>
                  <th className="px-6 py-3.5">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {businesses
                  .filter((b) => !searchQuery || JSON.stringify(b).toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-900">{b.name}</td>
                      <td className="px-6 py-4">
                        <a
                          href={b.website}
                          target="_blank"
                          rel="noreferrer"
                          className="text-indigo-600 hover:underline flex items-center"
                        >
                          <span>{b.website}</span>
                          <ExternalLink className="w-3 h-3 ml-1 text-slate-400" />
                        </a>
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {b.city ? `${b.city}${b.state ? `, ${b.state}` : ''}` : '—'}
                      </td>
                      <td className="px-6 py-4 font-mono text-[10px] text-slate-400">
                        {b.user_id || '—'}
                      </td>
                      <td className="px-6 py-4 text-slate-500">
                        {b.created_at ? new Date(b.created_at).toLocaleDateString() : 'N/A'}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 3. AUDIT REQUESTS */}
        {activeTab === 'audit_requests' && (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3.5">Target Business</th>
                  <th className="px-6 py-3.5">Domain</th>
                  <th className="px-6 py-3.5">Applicant Email</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5">Requested On</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {auditRequests
                  .filter((r) => !searchQuery || JSON.stringify(r).toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-900">{r.business_name}</td>
                      <td className="px-6 py-4 text-indigo-600">{r.website}</td>
                      <td className="px-6 py-4 text-slate-600">{r.email}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                            r.status === 'completed'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : 'bg-amber-50 text-amber-800 border-amber-200'
                          }`}
                        >
                          {r.status || 'pending'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-500">
                        {r.created_at ? new Date(r.created_at).toLocaleDateString() : 'Recent'}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 4. AUDITS */}
        {activeTab === 'audits' && (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3.5">Audit ID</th>
                  <th className="px-6 py-3.5">Business Name</th>
                  <th className="px-6 py-3.5">AI Visibility Score</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {audits
                  .filter((a) => !searchQuery || JSON.stringify(a).toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((a) => (
                    <tr key={a.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-6 py-4 font-mono font-bold text-slate-900">{a.id}</td>
                      <td className="px-6 py-4 font-semibold text-slate-800">{a.business_name || 'Target Domain'}</td>
                      <td className="px-6 py-4">
                        <span className="font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                          {a.overall_score || 85}%
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100">
                          {a.status || 'Completed'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-500">
                        {a.created_at ? new Date(a.created_at).toLocaleDateString() : 'Recent'}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 5. REPORTS */}
        {activeTab === 'reports' && (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3.5">Report Title</th>
                  <th className="px-6 py-3.5">Audit ID</th>
                  <th className="px-6 py-3.5">Download Link</th>
                  <th className="px-6 py-3.5">Generated On</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reports
                  .filter((rep) => !searchQuery || JSON.stringify(rep).toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((rep) => (
                    <tr key={rep.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-900">{rep.title}</td>
                      <td className="px-6 py-4 font-mono text-[10px] text-slate-400">{rep.audit_id || '—'}</td>
                      <td className="px-6 py-4">
                        <a
                          href={rep.file_url || '#'}
                          className="text-indigo-600 hover:underline inline-flex items-center"
                        >
                          <span>PDF Document</span>
                          <ExternalLink className="w-3 h-3 ml-1" />
                        </a>
                      </td>
                      <td className="px-6 py-4 text-slate-500">
                        {rep.created_at ? new Date(rep.created_at).toLocaleDateString() : 'Recent'}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 6. ORDERS */}
        {activeTab === 'orders' && (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3.5">Order ID</th>
                  <th className="px-6 py-3.5">Purchased Service</th>
                  <th className="px-6 py-3.5">Amount</th>
                  <th className="px-6 py-3.5">Cadence</th>
                  <th className="px-6 py-3.5">Payment Status</th>
                  <th className="px-6 py-3.5">Placed On</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders
                  .filter((o) => !searchQuery || JSON.stringify(o).toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((o) => (
                    <tr key={o.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-6 py-4 font-mono font-bold text-slate-900">{o.id}</td>
                      <td className="px-6 py-4 font-bold text-slate-900">{o.service_name || 'Service Plan'}</td>
                      <td className="px-6 py-4 font-extrabold text-indigo-600">
                        ${Number(o.amount).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 capitalize text-slate-600">{o.billing_type || 'One-time'}</td>
                      <td className="px-6 py-4">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100">
                          {o.status || 'Paid'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-500">
                        {o.created_at ? new Date(o.created_at).toLocaleDateString() : 'Recent'}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 7. SUBSCRIPTIONS */}
        {activeTab === 'subscriptions' && (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3.5">Subscription ID</th>
                  <th className="px-6 py-3.5">Service</th>
                  <th className="px-6 py-3.5">Client User ID</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5">Next Renewal</th>
                  <th className="px-6 py-3.5">Started</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {subscriptions
                  .filter((s) => !searchQuery || JSON.stringify(s).toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-6 py-4 font-mono font-bold text-slate-900">{s.id}</td>
                      <td className="px-6 py-4 font-bold text-slate-900">{s.service_name || 'Monthly Monitoring'}</td>
                      <td className="px-6 py-4 font-mono text-[10px] text-slate-400">{s.user_id || '—'}</td>
                      <td className="px-6 py-4">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100">
                          {s.status || 'Active'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {s.current_period_end ? new Date(s.current_period_end).toLocaleDateString() : 'Monthly'}
                      </td>
                      <td className="px-6 py-4 text-slate-500">
                        {s.created_at ? new Date(s.created_at).toLocaleDateString() : 'Recent'}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 8. SERVICES */}
        {activeTab === 'services' && (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3.5">Service Name</th>
                  <th className="px-6 py-3.5">Slug</th>
                  <th className="px-6 py-3.5">Price</th>
                  <th className="px-6 py-3.5">Billing Type</th>
                  <th className="px-6 py-3.5">Description</th>
                  <th className="px-6 py-3.5">Checkout URL</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {services
                  .filter((srv) => !searchQuery || JSON.stringify(srv).toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((srv) => (
                    <tr key={srv.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-900">{srv.name}</td>
                      <td className="px-6 py-4 font-mono text-indigo-600 font-bold">{srv.slug || 'slug'}</td>
                      <td className="px-6 py-4 font-extrabold text-slate-900">
                        ${Number(srv.price).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 capitalize text-slate-600">{srv.billing_type}</td>
                      <td className="px-6 py-4 text-slate-500 max-w-xs truncate">{srv.description}</td>
                      <td className="px-6 py-4">
                        <Link
                          to={`/checkout?service=${srv.slug || 'diy'}`}
                          className="text-indigo-600 font-semibold hover:underline inline-flex items-center"
                        >
                          <span>/checkout?service={srv.slug || 'diy'}</span>
                          <ExternalLink className="w-3 h-3 ml-1" />
                        </Link>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}

      </div>
    </div>
  );
};

export default AdminDashboard;
