import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { getSupabaseClient } from '../../lib/supabase.ts';

export interface CustomerData {
  audits: any[];
  businesses: any[];
  reports: any[];
  orders: any[];
  subscriptions: any[];
}
const empty: CustomerData = { audits: [], businesses: [], reports: [], orders: [], subscriptions: [] };
export function useCustomerData() {
  const { user } = useAuth();
  const [data, setData] = useState<CustomerData>(empty);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const refresh = useCallback(() => setRevision(v => v + 1), []);
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setData(empty);
    const client = getSupabaseClient();
    if (!user || !client) {
      setError('Sign in and connect to Promptila to view your records.');
      setLoading(false);
      return;
    }
    const tables = ['audits', 'businesses', 'reports', 'orders', 'subscriptions'] as const;
    Promise.all(tables.map(table =>
      client.from(table).select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(100)
    )).then(results => {
      if (cancelled) return;
      const next = { ...empty };
      const failures: string[] = [];
      tables.forEach((table, index) => {
        const result = results[index];
        if (result.error) failures.push(table);
        else next[table] = result.data || [];
      });
      setData(next);
      if (failures.length) setError('Unable to load: ' + failures.join(', ') + '. Please retry.');
    }).catch(() => {
      if (!cancelled) setError('Customer data could not be loaded. Please retry.');
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [user?.id, revision]);
  return { data, loading, error, refresh, user };
}
