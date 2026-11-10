import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Briefcase, ArrowLeft, RefreshCw, AlertCircle, Search } from 'lucide-react';
import { getSupabaseClient } from '../../lib/supabase.ts';

type DfyOrder = {
  id: string;
  user_id: string | null;
  business_id: string | null;
  amount_cents: number;
  currency: string | null;
  status: string | null;
  payment_provider: string | null;
  payment_reference: string | null;
  created_at: string;
  updated_at: string | null;
  business_name?: string | null;
  website?: string | null;
};

const money = (cents: number, currency = 'usd') =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: currency.toUpperCase() }).format((cents || 0) / 100);

export const AdminDfyOrders: React.FC = () => {
  const [orders, setOrders] = useState<DfyOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const db = getSupabaseClient();
    if (!db) {
      setError('Supabase is not configured.');
      setLoading(false);
      return;
    }
    try {
      const { data: service, error: serviceError } = await db
        .from('services').select('id,price_cents').eq('slug', 'dfy').maybeSingle();
      if (serviceError) throw serviceError;
      if (!service) throw new Error('The DFY service is missing from the services table.');

      const { data, error: ordersError } = await db
        .from('orders')
        .select('id,user_id,business_id,amount_cents,currency,status,payment_provider,payment_reference,created_at,updated_at')
        .eq('service_id', service.id)
        .order('created_at', { ascending: false });
      if (ordersError) throw ordersError;

      const rows: DfyOrder[] = data || [];
      const businessIds = [...new Set(rows.map(o => o.business_id).filter((v): v is string => Boolean(v)))];
      if (businessIds.length) {
        const { data: businesses, error: businessError } = await db
          .from('businesses').select('id,business_name,website').in('id', businessIds);
        if (businessError) throw businessError;
        const lookup = new Map((businesses || []).map(b => [b.id, b]));
        for (const order of rows) {
          const b = order.business_id ? lookup.get(order.business_id) : undefined;
          order.business_name = b?.business_name || null;
          order.website = b?.website || null;
        }
      }
      setOrders(rows);
    } catch (e: any) {
      setOrders([]);
      setError(e?.message || 'Could not load DFY orders.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const filtered = useMemo(() => orders.filter(o =>
    [o.id, o.business_name, o.website, o.payment_reference, o.status]
      .some(v => String(v || '').toLowerCase().includes(query.toLowerCase().trim()))
  ), [orders, query]);

  const paid = orders.filter(o => ['paid', 'completed', 'succeeded'].includes((o.status || '').toLowerCase()));
  const paidTotal = paid.reduce((sum, o) => sum + (o.amount_cents || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <Link to="/admin" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Overview
        </Link>
        <button onClick={() => void load()} disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { label: 'DFY Orders', value: String(orders.length) },
          { label: 'Paid / Completed', value: String(paid.length) },
          { label: 'Recorded paid order value', value: money(paidTotal) }
        ].map(item => (
          <div key={item.label} className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-xs">
            <p className="text-xs font-medium text-slate-500">{item.label}</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{item.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-slate-200/80 bg-white shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-5">
          <div>
            <h2 className="flex items-center gap-2 text-base font-bold text-slate-900"><Briefcase className="h-4 w-4 text-purple-600" /> Done-For-You Orders</h2>
            <p className="mt-1 text-xs text-slate-500">Read-only orders from the existing database. DFY fulfillment automation is not connected here.</p>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search DFY orders..."
              className="rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-xs outline-none focus:border-indigo-500" />
          </div>
        </div>

        {error ? (
          <div className="flex items-center gap-2 p-6 text-sm text-rose-700"><AlertCircle className="h-4 w-4" /> {error}</div>
        ) : loading ? (
          <div className="p-10 text-center text-sm text-slate-500">Loading DFY orders...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Briefcase className="mx-auto mb-3 h-8 w-8 text-slate-300" />
            <h3 className="text-sm font-semibold text-slate-900">{orders.length ? 'No matching orders' : 'No DFY orders recorded yet'}</h3>
            <p className="mt-2 text-xs text-slate-500">{orders.length ? 'Try a different search.' : 'Orders will appear here when they are saved to the existing orders table.'}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500">
                <tr>{['Created', 'Business', 'Order ID', 'Amount', 'Status', 'Payment provider'].map(h =>
                  <th key={h} className="whitespace-nowrap px-5 py-3 font-semibold">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(o => (
                  <tr key={o.id} className="text-slate-700">
                    <td className="whitespace-nowrap px-5 py-4">{new Date(o.created_at).toLocaleDateString()}</td>
                    <td className="px-5 py-4 font-medium">{o.business_name || 'Not linked'}</td>
                    <td className="px-5 py-4 font-mono" title={o.id}>{o.id.slice(0, 8)}…</td>
                    <td className="whitespace-nowrap px-5 py-4">{money(o.amount_cents, o.currency || 'usd')}</td>
                    <td className="px-5 py-4"><span className="rounded-md bg-slate-100 px-2 py-1 font-medium">{o.status || 'Unknown'}</span></td>
                    <td className="px-5 py-4">{o.payment_provider || '—'}</td>
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

export default AdminDfyOrders;
