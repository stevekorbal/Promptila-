import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Building2, 
  Search, 
  FileText, 
  ShoppingBag, 
  Activity, 
  User, 
  LogOut, 
  ShieldCheck, 
  Sparkles, 
  ExternalLink, 
  Plus, 
  TrendingUp, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  BarChart3,
  CreditCard,
  RefreshCw,
  SlidersHorizontal,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { getSupabaseClient } from '../lib/supabase.ts';
import { 
  BusinessRecord, 
  AuditRecord, 
  ReportRecord, 
  OrderRecord, 
  SubscriptionRecord 
} from '../types.ts';

type DashboardTab = 'businesses' | 'audits' | 'reports' | 'orders' | 'monitoring' | 'profile';

const Dashboard: React.FC = () => {
  const { user, profile, role, signOut, isConfigured, isMockAuth } = useAuth();
  const [activeTab, setActiveTab] = useState<DashboardTab>('businesses');
  const navigate = useNavigate();

  // Data states
  const [businesses, setBusinesses] = useState<BusinessRecord[]>([]);
  const [audits, setAudits] = useState<AuditRecord[]>([]);
  const [reports, setReports] = useState<ReportRecord[]>([]);
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [subscriptions, setSubscriptions] = useState<SubscriptionRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Quick business creation modal/state
  const [showAddBusiness, setShowAddBusiness] = useState<boolean>(false);
  const [newBizName, setNewBizName] = useState('');
  const [newBizWebsite, setNewBizWebsite] = useState('');
  const [newBizCity, setNewBizCity] = useState('');
  const [newBizState, setNewBizState] = useState('');
  const [bizSubmitting, setBizSubmitting] = useState(false);

  const loadUserData = async () => {
    const supabase = getSupabaseClient();
    if (!supabase || !user) {
      // Mock data for preview/demonstration
      setBusinesses([
        {
          id: 'biz-1',
          name: 'Apex Dental Care',
          website: 'https://apexdentalcare.com',
          city: 'Scottsdale',
          state: 'AZ',
          created_at: '2026-08-14T10:00:00Z',
        },
      ]);
      setAudits([
        {
          id: 'aud-1',
          business_name: 'Apex Dental Care',
          overall_score: 84,
          status: 'completed',
          created_at: '2026-08-16T14:30:00Z',
        },
      ]);
      setReports([
        {
          id: 'rep-1',
          title: 'Q3 ChatGPT & Gemini Brand Citation Dossier',
          summary: 'Detailed footprint analysis across OpenAI GPT-4o, Google Gemini, and Claude 3.5 Sonnet.',
          file_url: '#',
          created_at: '2026-08-18T09:00:00Z',
        },
      ]);
      setOrders([
        {
          id: 'ord-101',
          service_name: 'DFY Optimization',
          amount: 1199,
          status: 'completed',
          billing_type: 'one-time',
          created_at: '2026-08-15T11:20:00Z',
        },
      ]);
      setSubscriptions([
        {
          id: 'sub-201',
          service_name: 'Monthly Monitoring',
          status: 'active',
          current_period_end: '2026-10-15T00:00:00Z',
          created_at: '2026-08-15T11:20:00Z',
        },
      ]);
      setLoading(false);
      return;
    }

    try {
      // Query user data relying on Supabase RLS policies
      const [
        bizRes, 
        auditRes, 
        reportRes, 
        orderRes, 
        subRes
      ] = await Promise.all([
        supabase.from('businesses').select('*').order('created_at', { ascending: false }),
        supabase.from('audits').select('*').order('created_at', { ascending: false }),
        supabase.from('reports').select('*').order('created_at', { ascending: false }),
        supabase.from('orders').select('*').order('created_at', { ascending: false }),
        supabase.from('subscriptions').select('*').order('created_at', { ascending: false }),
      ]);

      if (bizRes.data) setBusinesses(bizRes.data);
      if (auditRes.data) setAudits(auditRes.data);
      if (reportRes.data) setReports(reportRes.data);
      if (orderRes.data) setOrders(orderRes.data);
      if (subRes.data) setSubscriptions(subRes.data);
    } catch (err) {
      console.warn('Error loading user data from Supabase:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadUserData();
  }, [user]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadUserData();
  };

  const handleAddBusiness = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBizName || !newBizWebsite) return;
    setBizSubmitting(true);

    const supabase = getSupabaseClient();
    if (supabase && user) {
      try {
        const { data, error } = await supabase
          .from('businesses')
          .insert({
            user_id: user.id,
            name: newBizName,
            website: newBizWebsite,
            city: newBizCity,
            state: newBizState,
          })
          .select()
          .single();

        if (data) {
          setBusinesses((prev) => [data, ...prev]);
        }
      } catch (err) {
        console.warn('Failed to insert business into Supabase:', err);
      }
    } else {
      // Mock insert
      const newMock: BusinessRecord = {
        id: 'biz-' + Date.now(),
        name: newBizName,
        website: newBizWebsite,
        city: newBizCity,
        state: newBizState,
        created_at: new Date().toISOString(),
      };
      setBusinesses((prev) => [newMock, ...prev]);
    }

    setBizSubmitting(false);
    setShowAddBusiness(false);
    setNewBizName('');
    setNewBizWebsite('');
    setNewBizCity('');
    setNewBizState('');
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="pt-24 pb-20 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Supabase status notice if unconfigured */}
        {!isConfigured && (
          <div className="mb-6 p-4 bg-indigo-50/80 border border-indigo-100 rounded-2xl flex items-center justify-between text-xs text-indigo-950 shadow-xs">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-indigo-600 flex-shrink-0" />
              <span>
                <strong>Supabase Ready:</strong> Connect your project via <code className="font-mono bg-white px-1 py-0.5 rounded border border-indigo-200">SUPABASE_URL</code> and <code className="font-mono bg-white px-1 py-0.5 rounded border border-indigo-200">SUPABASE_PUBLISHABLE_KEY</code>. You are previewing in active workspace mode.
              </span>
            </div>
            <div className="hidden sm:flex items-center space-x-2">
              <span className="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full text-[10px]">
                RLS Active
              </span>
            </div>
          </div>
        )}

        {/* Top Header & Greeting */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <div className="flex items-center space-x-3 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-full">
                  Client Portal
                </span>
                {role === 'admin' && (
                  <Link
                    to="/admin"
                    className="inline-flex items-center space-x-1 text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full hover:bg-amber-100 transition-colors"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                    <span>Admin Panel Available &rarr;</span>
                  </Link>
                )}
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Welcome back, {profile?.full_name || profile?.first_name || user?.email?.split('@')[0] || 'Partner'}
              </h1>
              <p className="mt-1 text-sm text-slate-600">
                Track your brand recommendations across ChatGPT, Gemini, and Claude
              </p>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={handleRefresh}
                title="Refresh dashboard data"
                className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:text-indigo-600 hover:bg-slate-50 transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>

              <Link
                to="/#audit"
                className="inline-flex items-center px-4 py-2.5 rounded-xl text-xs font-bold text-indigo-600 bg-indigo-50 border border-indigo-200 hover:bg-indigo-600 hover:text-white transition-all shadow-xs"
              >
                <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                <span>Request New Audit</span>
              </Link>

              <Link
                to="/checkout?service=dfy"
                className="inline-flex items-center px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-all shadow-md active:scale-95"
              >
                <span>Upgrade / Optimize</span>
              </Link>

              <button
                onClick={handleSignOut}
                className="inline-flex items-center px-3 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 transition-all"
                title="Sign out of your account"
              >
                <LogOut className="w-4 h-4 mr-1.5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>

        {/* Dashboard Navigation Tabs */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-4 mb-8 scrollbar-none">
          {[
            { id: 'businesses', label: 'My Businesses', icon: Building2, count: businesses.length },
            { id: 'audits', label: 'My Audits', icon: Search, count: audits.length },
            { id: 'reports', label: 'My Reports', icon: FileText, count: reports.length },
            { id: 'orders', label: 'Orders', icon: ShoppingBag, count: orders.length },
            { id: 'monitoring', label: 'Monthly Monitoring', icon: Activity, count: subscriptions.length },
            { id: 'profile', label: 'Account / Profile', icon: User },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as DashboardTab)}
                className={`flex items-center space-x-2 px-5 py-3 rounded-2xl text-sm font-bold whitespace-nowrap transition-all duration-150 ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                <span>{tab.label}</span>
                {typeof tab.count === 'number' && (
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* TAB 1: MY BUSINESSES */}
        {activeTab === 'businesses' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-extrabold text-slate-900">Registered Businesses</h2>
                <p className="text-xs text-slate-500">Domains tracked for AI entity optimization</p>
              </div>
              <button
                onClick={() => setShowAddBusiness(!showAddBusiness)}
                className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-sm"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                <span>Add Business</span>
              </button>
            </div>

            {/* Add Business Form */}
            {showAddBusiness && (
              <form
                onSubmit={handleAddBusiness}
                className="bg-white rounded-2xl border border-indigo-100 p-6 shadow-md animate-in fade-in"
              >
                <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center space-x-2">
                  <Building2 className="w-4 h-4 text-indigo-600" />
                  <span>Register a New Business Domain</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                      Business Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={newBizName}
                      onChange={(e) => setNewBizName(e.target.value)}
                      placeholder="e.g. Apex Legal Group"
                      className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                      Website URL *
                    </label>
                    <input
                      type="url"
                      required
                      value={newBizWebsite}
                      onChange={(e) => setNewBizWebsite(e.target.value)}
                      placeholder="https://apexlegal.com"
                      className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                      City
                    </label>
                    <input
                      type="text"
                      value={newBizCity}
                      onChange={(e) => setNewBizCity(e.target.value)}
                      placeholder="e.g. Denver"
                      className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                      State / Region
                    </label>
                    <input
                      type="text"
                      value={newBizState}
                      onChange={(e) => setNewBizState(e.target.value)}
                      placeholder="e.g. Colorado"
                      className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowAddBusiness(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 border border-slate-200 rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={bizSubmitting}
                    className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm disabled:opacity-50"
                  >
                    {bizSubmitting ? 'Saving...' : 'Register Business'}
                  </button>
                </div>
              </form>
            )}

            {businesses.length === 0 ? (
              <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center">
                <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Building2 className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-1">No Businesses Added Yet</h3>
                <p className="text-sm text-slate-500 max-w-md mx-auto mb-6">
                  Add your primary website or client business to start mapping LLM training citations and schema footprints.
                </p>
                <button
                  onClick={() => setShowAddBusiness(true)}
                  className="inline-flex items-center px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 text-sm shadow-md"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  <span>Register First Business</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {businesses.map((biz) => (
                  <div
                    key={biz.id}
                    className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100">
                          Active Entity
                        </span>
                        <span className="text-xs text-slate-400">
                          {biz.city ? `${biz.city}${biz.state ? `, ${biz.state}` : ''}` : 'US'}
                        </span>
                      </div>
                      <h3 className="text-lg font-bold text-slate-900 mb-1">{biz.name}</h3>
                      <a
                        href={biz.website}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center text-xs font-semibold text-indigo-600 hover:text-indigo-700 mb-4 group"
                      >
                        <span className="truncate max-w-[200px]">{biz.website}</span>
                        <ExternalLink className="w-3 h-3 ml-1 group-hover:translate-x-0.5 transition-transform" />
                      </a>
                    </div>

                    <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                      <Link
                        to="/#audit"
                        className="text-xs font-bold text-slate-600 hover:text-indigo-600"
                      >
                        Request Audit &rarr;
                      </Link>
                      <Link
                        to="/checkout?service=dfy"
                        className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-lg hover:bg-indigo-600 hover:text-white transition-colors"
                      >
                        Optimize
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: MY AUDITS */}
        {activeTab === 'audits' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-extrabold text-slate-900">AI Visibility Audits</h2>
                <p className="text-xs text-slate-500">
                  Evaluations of how ChatGPT, Gemini, and Claude cite your brand
                </p>
              </div>
              <Link
                to="/#audit"
                className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-sm"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                <span>New Audit Request</span>
              </Link>
            </div>

            {audits.length === 0 ? (
              <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center">
                <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Search className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-1">No Audits on Record</h3>
                <p className="text-sm text-slate-500 max-w-md mx-auto mb-6">
                  Submit your website URL to receive a comprehensive audit of your AI search placement and competitor citations.
                </p>
                <Link
                  to="/#audit"
                  className="inline-flex items-center px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 text-sm shadow-md"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  <span>Request Free AI Report</span>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {audits.map((aud) => (
                  <div
                    key={aud.id}
                    className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="flex items-start space-x-4">
                      <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0 font-extrabold text-base">
                        {aud.overall_score || 85}%
                      </div>
                      <div>
                        <div className="flex items-center space-x-2 mb-1">
                          <h3 className="text-base font-bold text-slate-900">
                            {aud.business_name || 'Verified Website Audit'}
                          </h3>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100">
                            {aud.status || 'Completed'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500">
                          Audit ID: <code className="font-mono">{aud.id}</code> • Verified by Promptila AI Evaluator
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => setActiveTab('reports')}
                        className="inline-flex items-center px-4 py-2 rounded-xl text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors"
                      >
                        <FileText className="w-3.5 h-3.5 mr-1.5" />
                        <span>View Deliverable</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: MY REPORTS */}
        {activeTab === 'reports' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-extrabold text-slate-900">Intelligence Reports & Deliverables</h2>
              <p className="text-xs text-slate-500">
                Detailed breakdowns of AI visibility benchmarks, entity graphs, and competitor displacement
              </p>
            </div>

            {reports.length === 0 ? (
              <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center">
                <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-1">No Reports Available Yet</h3>
                <p className="text-sm text-slate-500 max-w-md mx-auto mb-6">
                  Once your domain audit or DFY optimization is executed, your full downloadable dossiers and reports will appear here.
                </p>
                <Link
                  to="/#audit"
                  className="inline-flex items-center px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 text-sm shadow-md"
                >
                  <span>Request Free Report</span>
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {reports.map((rep) => (
                  <div
                    key={rep.id}
                    className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100">
                          AI Executive Summary
                        </span>
                        <span className="text-xs text-slate-400">
                          {rep.created_at ? new Date(rep.created_at).toLocaleDateString() : 'Recent'}
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-slate-900 mb-2">{rep.title}</h3>
                      <p className="text-xs text-slate-600 leading-relaxed mb-4">
                        {rep.summary || 'Comprehensive evaluation covering search engine entity authority, prompt testing rubrics, and source training citations.'}
                      </p>
                    </div>

                    <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-xs font-semibold text-emerald-600 flex items-center">
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                        <span>Ready to Download</span>
                      </span>
                      <a
                        href={rep.file_url || '#'}
                        className="inline-flex items-center px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-xs"
                      >
                        <span>Download PDF</span>
                        <ExternalLink className="w-3 h-3 ml-1.5" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: ORDERS */}
        {activeTab === 'orders' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-extrabold text-slate-900">Order History</h2>
              <p className="text-xs text-slate-500">
                Purchased optimization blueprints, DFY packages, and subscription services
              </p>
            </div>

            {orders.length === 0 ? (
              <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center">
                <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <ShoppingBag className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-1">No Orders Placed Yet</h3>
                <p className="text-sm text-slate-500 max-w-md mx-auto mb-6">
                  Explore our self-paced DIY blueprints, turnkey DFY optimizations, or monthly surveillance packages.
                </p>
                <Link
                  to="/#pricing"
                  className="inline-flex items-center px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 text-sm shadow-md"
                >
                  <span>View Services & Pricing</span>
                </Link>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-700">
                    <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                      <tr>
                        <th className="px-6 py-4">Order ID</th>
                        <th className="px-6 py-4">Service</th>
                        <th className="px-6 py-4">Cadence</th>
                        <th className="px-6 py-4">Amount</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {orders.map((ord) => (
                        <tr key={ord.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="px-6 py-4 font-mono text-xs font-bold text-slate-900">
                            {ord.id}
                          </td>
                          <td className="px-6 py-4 font-bold text-slate-900">
                            {ord.service_name || 'Optimization Package'}
                          </td>
                          <td className="px-6 py-4 text-xs capitalize text-slate-600">
                            {ord.billing_type || 'One-time'}
                          </td>
                          <td className="px-6 py-4 font-extrabold text-indigo-600">
                            ${ord.amount ? Number(ord.amount).toLocaleString() : '0'}
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100">
                              {ord.status || 'Paid'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-xs text-slate-500">
                            {ord.created_at ? new Date(ord.created_at).toLocaleDateString() : 'Recent'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 5: MONTHLY MONITORING */}
        {activeTab === 'monitoring' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-extrabold text-slate-900">Monthly Monitoring & Surveillance</h2>
              <p className="text-xs text-slate-500">
                Continuous brand defense across new ChatGPT, Gemini, and Claude model weights
              </p>
            </div>

            {subscriptions.length === 0 ? (
              <div className="bg-white rounded-3xl border border-slate-200 p-8 sm:p-12 shadow-sm text-center max-w-3xl mx-auto">
                <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Activity className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-extrabold text-slate-900 mb-2">No Active Surveillance Subscription</h3>
                <p className="text-sm text-slate-600 max-w-lg mx-auto mb-8 leading-relaxed">
                  AI search engines refresh their training data and citations regularly. Subscribe to Monthly Monitoring for $99/month to receive instant hallucination alerts, competitor displacement tracking, and quarterly schema tune-ups.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8 text-left max-w-xl mx-auto">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="font-bold text-xs text-slate-900 mb-1">24/7 Surveillance</div>
                    <p className="text-[11px] text-slate-500">Detects when competitors win queries in your territory.</p>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="font-bold text-xs text-slate-900 mb-1">Brand Defense</div>
                    <p className="text-[11px] text-slate-500">Stops hallucinated claims and incorrect contact details.</p>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="font-bold text-xs text-slate-900 mb-1">Zero Lock-In</div>
                    <p className="text-[11px] text-slate-500">Simple $99/month rate, cancel anytime with one click.</p>
                  </div>
                </div>

                <Link
                  to="/checkout?service=monitoring"
                  className="inline-flex items-center px-8 py-4 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20 text-sm"
                >
                  <span>Start Monitoring • $99/month</span>
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Link>
              </div>
            ) : (
              <div className="space-y-6">
                {subscriptions.map((sub) => (
                  <div
                    key={sub.id}
                    className="bg-white rounded-2xl border border-indigo-200 p-6 sm:p-8 shadow-md"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
                      <div>
                        <div className="flex items-center space-x-2 mb-1">
                          <h3 className="text-xl font-extrabold text-slate-900">
                            {sub.service_name || 'Active AI Monitoring'}
                          </h3>
                          <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 flex items-center space-x-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            <span>{sub.status || 'Active'}</span>
                          </span>
                        </div>
                        <p className="text-xs text-slate-500">
                          Subscription ID: <code className="font-mono">{sub.id}</code> • Cadence: $99/month
                        </p>
                      </div>

                      <div className="text-sm font-semibold text-slate-600">
                        Renewal Date: <strong className="text-slate-900">{sub.current_period_end ? new Date(sub.current_period_end).toLocaleDateString() : 'Next Month'}</strong>
                      </div>
                    </div>

                    <div className="pt-6 grid grid-cols-1 sm:grid-cols-3 gap-6">
                      <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                        <span className="text-xs text-slate-500 font-medium">Monitoring Status</span>
                        <div className="text-lg font-extrabold text-slate-900 mt-1 flex items-center">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 mr-1.5" />
                          <span>All Engines Green</span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1">ChatGPT, Gemini, Claude</p>
                      </div>

                      <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                        <span className="text-xs text-slate-500 font-medium">Displacement Alerts</span>
                        <div className="text-lg font-extrabold text-slate-900 mt-1">
                          0 Critical Alerts
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1">Brand prominence secured</p>
                      </div>

                      <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                        <span className="text-xs text-slate-500 font-medium">Next Intelligence Review</span>
                        <div className="text-lg font-extrabold text-slate-900 mt-1">
                          In 14 Days
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1">Automated monthly audit</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 6: ACCOUNT / PROFILE */}
        {activeTab === 'profile' && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
              <div className="flex items-center space-x-4 pb-6 border-b border-slate-100 mb-6">
                <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-extrabold text-2xl">
                  {(profile?.full_name || profile?.first_name || user?.email || 'U')[0].toUpperCase()}
                </div>
                <div>
                  <h2 className="text-xl font-extrabold text-slate-900">
                    {profile?.full_name || `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || 'Promptila Client'}
                  </h2>
                  <p className="text-xs text-slate-500">{user?.email}</p>
                  <div className="mt-1">
                    <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100">
                      Role: {role || 'user'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-4 text-sm">
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500">Account ID (UID)</span>
                  <span className="font-mono text-xs text-slate-900">{user?.id}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500">Email Address</span>
                  <span className="font-semibold text-slate-900">{user?.email}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500">Assigned Privilege Tier</span>
                  <span className="font-semibold text-slate-900 capitalize">{role || 'User'}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500">Database Engine</span>
                  <span className="font-semibold text-indigo-600">Supabase Postgres + RLS</span>
                </div>
              </div>

              <div className="pt-8 mt-6 border-t border-slate-100 flex flex-col sm:flex-row gap-4">
                <Link
                  to="/forgot-password"
                  className="flex-1 text-center py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors"
                >
                  Change Password
                </Link>
                <button
                  onClick={handleSignOut}
                  className="flex-1 text-center py-2.5 px-4 rounded-xl bg-rose-50 text-rose-700 text-xs font-bold hover:bg-rose-100 transition-colors"
                >
                  Sign Out of Account
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default Dashboard;
