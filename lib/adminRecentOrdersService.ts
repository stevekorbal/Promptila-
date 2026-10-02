import { getSupabaseClient } from './supabase.ts';

export interface RecentOrderItem {
  id: string;
  audit_id: string | null;
  stripe_payment_intent_id: string | null;
  amount_paid: number;
  currency: string | null;
  status: string | null;
  payment_status: string | null;
  delivery_status: string | null;
  created_at: string;
  completed_at: string | null;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  business_name: string | null;
  website: string | null;
  product: string | null;
  delivered_at: string | null;
  email_message_id: string | null;
  error_message: string | null;
  livemode: boolean;
}

export interface RecentOrdersResult {
  orders: RecentOrderItem[];
  error?: string | null;
}

export function formatOrderAmount(amountPaidMinor: number): string {
  const dollars = (amountPaidMinor || 0) / 100;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(dollars);
}

export function formatPaymentStatusLabel(status?: string | null): string {
  if (!status) return 'Pending';
  const s = status.toLowerCase().trim();
  switch (s) {
    case 'paid':
      return 'Paid';
    case 'unpaid':
      return 'Unpaid';
    case 'failed':
      return 'Failed';
    default:
      return s.replace(/[_-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }
}

export function formatDeliveryStatus(
  deliveryStatus?: string | null,
  orderStatus?: string | null
): { status: string; label: string } {
  if (deliveryStatus && deliveryStatus.trim() !== '') {
    const s = deliveryStatus.toLowerCase().trim();
    switch (s) {
      case 'delivered':
        return { status: 'delivered', label: 'Delivered' };
      case 'pending':
        return { status: 'pending', label: 'Pending' };
      case 'failed':
        return { status: 'failed', label: 'Failed' };
      case 'bounce':
        return { status: 'failed', label: 'Bounced' };
      default:
        return {
          status: s,
          label: s.replace(/[_-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        };
    }
  }

  if (orderStatus && orderStatus.trim() !== '') {
    const s = orderStatus.toLowerCase().trim();
    switch (s) {
      case 'completed':
        return { status: 'completed', label: 'Completed' };
      case 'processing':
      case 'in_progress':
        return { status: 'in_progress', label: 'Processing' };
      case 'failed':
        return { status: 'failed', label: 'Failed' };
      default:
        return {
          status: s,
          label: s.replace(/[_-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        };
    }
  }

  return { status: 'pending', label: 'Pending' };
}

export function formatOrderDate(dateString?: string): string {
  if (!dateString) return 'recently';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'recently';

  const diffMs = Date.now() - date.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Fetches the 5 most recently created Blueprint orders from public.blueprint_orders.
 * Operational data source: includes both livemode=true and livemode=false.
 * Missing business_name values are populated by looking up public.audits with audit_id.
 */
export async function fetchRecentOrders(limit = 5): Promise<RecentOrdersResult> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    console.error('Supabase client unavailable for recent orders service');
    return { orders: [], error: 'Supabase client unavailable' };
  }

  try {
    const { data, error } = await supabase
      .from('blueprint_orders')
      .select(`
        id,
        audit_id,
        stripe_payment_intent_id,
        amount_paid,
        currency,
        status,
        payment_status,
        delivery_status,
        created_at,
        completed_at,
        customer_name,
        customer_email,
        customer_phone,
        business_name,
        website,
        product,
        delivered_at,
        email_message_id,
        error_message,
        livemode
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Supabase error querying recent blueprint orders:', error);
      return { orders: [], error: error.message };
    }

    const rawOrders = (data as RecentOrderItem[]) || [];
    if (rawOrders.length === 0) {
      return { orders: [], error: null };
    }

    // Check if any order is missing business_name and has an audit_id
    const missingAuditIds = rawOrders
      .filter((o) => (!o.business_name || o.business_name.trim() === '') && o.audit_id)
      .map((o) => o.audit_id as string);

    if (missingAuditIds.length > 0) {
      const uniqueAuditIds = [...new Set(missingAuditIds)];
      const auditsRes = await supabase
        .from('audits')
        .select('audit_id, business_name, website')
        .in('audit_id', uniqueAuditIds);

      if (!auditsRes.error && auditsRes.data) {
        const auditMap = new Map<string, { business_name?: string | null; website?: string | null }>();
        for (const a of auditsRes.data) {
          if (a.audit_id) {
            auditMap.set(a.audit_id, a);
          }
        }

        for (const order of rawOrders) {
          if ((!order.business_name || order.business_name.trim() === '') && order.audit_id) {
            const auditData = auditMap.get(order.audit_id);
            if (auditData?.business_name) {
              order.business_name = auditData.business_name;
            }
            if ((!order.website || order.website.trim() === '') && auditData?.website) {
              order.website = auditData.website;
            }
          }
        }
      }
    }

    return { orders: rawOrders, error: null };
  } catch (err: any) {
    console.error('Unexpected error fetching recent orders:', err);
    return { orders: [], error: err?.message || 'Unexpected error' };
  }
}
