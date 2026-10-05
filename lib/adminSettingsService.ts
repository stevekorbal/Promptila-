import { getSupabaseClient } from './supabase.ts';

export interface AdminServiceItem {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  price_cents: number;
  billing_type: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export function formatServicePrice(priceCents: number, billingType: string): string {
  const dollars = (priceCents / 100).toFixed(2);
  const formatted = `$${Number(dollars).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (billingType === 'monthly' || billingType === 'recurring') {
    return `${formatted}/month`;
  }
  return formatted;
}

export function formatBillingType(billingType: string): string {
  const b = billingType.toLowerCase().trim();
  if (b === 'one_time' || b === 'one-time') return 'One-time';
  if (b === 'monthly' || b === 'recurring') return 'Monthly';
  return billingType
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Loads published service records directly from public.services table.
 * Read-only operational configuration.
 */
export async function fetchAdminServices(): Promise<{
  services: AdminServiceItem[];
  error?: string | null;
}> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { services: [], error: 'Supabase client unavailable' };
  }

  try {
    const { data, error } = await supabase
      .from('services')
      .select('id, slug, name, description, price_cents, billing_type, active, created_at, updated_at')
      .order('price_cents', { ascending: true });

    if (error) {
      console.error('Error fetching services from public.services:', error);
      return { services: [], error: error.message };
    }

    return { services: (data as AdminServiceItem[]) || [], error: null };
  } catch (err: any) {
    console.error('Unexpected error loading services:', err);
    return { services: [], error: err?.message || 'Unexpected error' };
  }
}
