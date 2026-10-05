import React, { useState, useEffect, useCallback } from 'react';
import { 
  Database, 
  CreditCard, 
  Workflow, 
  Mail, 
  ShieldCheck, 
  Server, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Lock, 
  UserCheck, 
  Layers
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import StatusBadge from '../../components/admin/StatusBadge.tsx';
import DataTable from '../../components/admin/DataTable.tsx';
import { 
  AdminServiceItem, 
  fetchAdminServices, 
  formatServicePrice, 
  formatBillingType 
} from '../../lib/adminSettingsService.ts';

export const AdminSettings: React.FC = () => {
  const { user, role } = useAuth();

  // Services Data State
  const [services, setServices] = useState<AdminServiceItem[]>([]);
  const [servicesLoading, setServicesLoading] = useState(true);
  const [servicesError, setServicesError] = useState<string | null>(null);

  const loadServices = useCallback(() => {
    setServicesLoading(true);
    setServicesError(null);
    fetchAdminServices()
      .then((res) => {
        if (res.error) {
          setServicesError(res.error);
        } else {
          setServices(res.services);
        }
        setServicesLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching services:', err);
        setServicesError(err?.message || 'Unable to load services configuration');
        setServicesLoading(false);
      });
  }, []);

  useEffect(() => {
    loadServices();
  }, [loadServices]);

  return (
    <div className="space-y-6">
      {/* 1. System Health & Integrations */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.03)] p-5">
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900">System Health & Integrations</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Production infrastructure and external operational services status
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            All Systems Operational
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Supabase Database */}
          <div className="p-4 rounded-xl bg-slate-50/60 border border-slate-200/80 flex flex-col justify-between space-y-3">
            <div className="flex items-start justify-between">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <Database className="w-4 h-4" />
              </div>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                Connected
              </span>
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900">Supabase Database</h4>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                Production database and authentication
              </p>
            </div>
          </div>

          {/* Stripe Payments */}
          <div className="p-4 rounded-xl bg-slate-50/60 border border-slate-200/80 flex flex-col justify-between space-y-3">
            <div className="flex items-start justify-between">
              <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                <CreditCard className="w-4 h-4" />
              </div>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                Configured
              </span>
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900">Stripe Payments</h4>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                DIY Blueprint payment processing
              </p>
            </div>
          </div>

          {/* n8n Automation */}
          <div className="p-4 rounded-xl bg-slate-50/60 border border-slate-200/80 flex flex-col justify-between space-y-3">
            <div className="flex items-start justify-between">
              <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                <Workflow className="w-4 h-4" />
              </div>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                Active
              </span>
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900">n8n Automation</h4>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                Audit and fulfillment automation workflows
              </p>
            </div>
          </div>

          {/* Email Activity */}
          <div className="p-4 rounded-xl bg-slate-50/60 border border-slate-200/80 flex flex-col justify-between space-y-3">
            <div className="flex items-start justify-between">
              <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                <Mail className="w-4 h-4" />
              </div>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                Connected
              </span>
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900">Email Activity</h4>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                Automated email dispatch logging
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Products & Pricing */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.03)] p-5">
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900">Products & Pricing</h3>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-mono">
                public.services
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Service catalog records loaded live from Supabase
            </p>
          </div>

          <button
            type="button"
            onClick={loadServices}
            title="Refresh services from database"
            className="p-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-600 hover:text-slate-900 transition-colors shadow-2xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${servicesLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {servicesLoading ? (
          <div className="py-10 text-center">
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500">
              <RefreshCw className="w-4 h-4 animate-spin text-indigo-600" />
              <span>Loading services from public.services...</span>
            </div>
          </div>
        ) : servicesError ? (
          <div className="py-8 px-4 text-center bg-rose-50/50 rounded-xl border border-rose-200">
            <AlertCircle className="w-5 h-5 text-rose-600 mx-auto mb-1.5" />
            <p className="text-xs font-bold text-rose-900">Unable to load services configuration</p>
            <p className="text-[11px] text-rose-600 mt-0.5">{servicesError}</p>
            <button
              type="button"
              onClick={loadServices}
              className="mt-3 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow-xs"
            >
              Retry
            </button>
          </div>
        ) : services.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
            <Layers className="w-5 h-5 text-slate-400 mx-auto mb-1.5" />
            <p className="font-semibold text-slate-700">No services found</p>
            <p className="text-[11px] text-slate-400 mt-0.5">No records returned from public.services.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <DataTable<AdminServiceItem>
              columns={[
                {
                  key: 'product',
                  header: 'Product',
                  render: (item) => (
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-xs">{item.name}</span>
                        <span className="font-mono text-[10px] font-semibold text-slate-500 px-1.5 py-0.2 rounded bg-slate-100 border border-slate-200">
                          {item.slug}
                        </span>
                      </div>
                      {item.description && (
                        <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                          {item.description}
                        </p>
                      )}
                    </div>
                  ),
                },
                {
                  key: 'price',
                  header: 'Price',
                  align: 'right',
                  render: (item) => (
                    <span className="font-mono font-bold text-xs text-slate-900 tabular-nums">
                      {formatServicePrice(item.price_cents, item.billing_type)}
                    </span>
                  ),
                },
                {
                  key: 'billing',
                  header: 'Billing',
                  align: 'center',
                  render: (item) => (
                    <span className="text-xs text-slate-600 font-medium">
                      {formatBillingType(item.billing_type)}
                    </span>
                  ),
                },
                {
                  key: 'status',
                  header: 'Status',
                  align: 'center',
                  render: (item) => (
                    <StatusBadge
                      status={item.active ? 'active' : 'inactive'}
                      label={item.active ? 'Active' : 'Inactive'}
                    />
                  ),
                },
              ]}
              data={services}
              keyExtractor={(item) => item.id}
            />

            <p className="text-[11px] text-slate-400 italic pt-1">
              Pricing is read-only because payment amounts are also configured in backend payment services.
            </p>
          </div>
        )}
      </div>

      {/* 3. Operational Endpoints */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.03)] p-5">
        <div className="pb-4 mb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-900">Operational Endpoints</h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Application routes used by Promptila services.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Free Audit Intake */}
          <div className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-200/80">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-slate-900">Free Audit Intake</span>
              <span className="font-mono text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200/60 px-1.5 py-0.2 rounded">
                POST
              </span>
            </div>
            <code className="block font-mono text-[11px] text-indigo-600 bg-white border border-slate-200 rounded px-2 py-1 select-all">
              /api/audit-webhook
            </code>
            <p className="text-[10px] text-slate-400 mt-1.5">
              Ingestion webhook gateway for AI Visibility audit requests
            </p>
          </div>

          {/* Blueprint Payment */}
          <div className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-200/80">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-slate-900">Blueprint Payment</span>
              <span className="font-mono text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200/60 px-1.5 py-0.2 rounded">
                POST
              </span>
            </div>
            <code className="block font-mono text-[11px] text-indigo-600 bg-white border border-slate-200 rounded px-2 py-1 select-all">
              /api/create-payment-intent
            </code>
            <p className="text-[10px] text-slate-400 mt-1.5">
              Stripe custom payment intent generator ($297.00)
            </p>
          </div>

          {/* Hosted Checkout */}
          <div className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-200/80">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-slate-900">Hosted Checkout</span>
              <span className="font-mono text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200/60 px-1.5 py-0.2 rounded">
                POST
              </span>
            </div>
            <code className="block font-mono text-[11px] text-indigo-600 bg-white border border-slate-200 rounded px-2 py-1 select-all">
              /api/create-checkout-session
            </code>
            <p className="text-[10px] text-slate-400 mt-1.5">
              Stripe hosted checkout session redirect handler
            </p>
          </div>
        </div>
      </div>

      {/* 4. Administrator Access */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.03)] p-5">
        <div className="pb-4 mb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-900">Administrator Access</h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Currently authenticated administrative session and privilege level
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-200/80">
            <span className="text-[11px] text-slate-400 font-medium block">Signed In As</span>
            <span className="text-xs font-bold text-slate-900 truncate block mt-0.5" title={user?.email || ''}>
              {user?.email || 'Authenticated Administrator'}
            </span>
          </div>

          <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-200/80">
            <span className="text-[11px] text-slate-400 font-medium block">Role</span>
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-700 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
              {role === 'admin' ? 'Administrator' : role || 'Administrator'}
            </span>
          </div>

          <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-200/80">
            <span className="text-[11px] text-slate-400 font-medium block">Authentication</span>
            <span className="text-xs font-bold text-slate-800 block mt-0.5">
              Supabase Auth
            </span>
          </div>

          <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-200/80">
            <span className="text-[11px] text-slate-400 font-medium block">Access</span>
            <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 mt-0.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Admin Console
            </span>
          </div>
        </div>

        <p className="text-[11px] text-slate-500 mt-4 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-200/70">
          Administrator permissions are controlled through Supabase Auth, profiles, and Row Level Security.
        </p>
      </div>

      {/* 5. Security Notice */}
      <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 flex items-start gap-3">
        <div className="p-1.5 rounded-lg bg-slate-200/60 text-slate-600 shrink-0 mt-0.5">
          <Lock className="w-4 h-4" />
        </div>
        <div>
          <h4 className="text-xs font-bold text-slate-800">Security Notice</h4>
          <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
            Sensitive credentials are intentionally not displayed in the Promptila Admin Console. API keys, database credentials, payment secrets, and webhook secrets remain server-side.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminSettings;
