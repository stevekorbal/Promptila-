import { getSupabaseClient } from './supabase.ts';
import { formatDeliveryStatus, formatPaymentStatusLabel } from './adminRecentOrdersService.ts';

export interface BlueprintOrderItem {
  id: string;
  audit_id: string | null;
  stripe_payment_intent_id: string | null;
  amount_paid: number; // in cents
  amount_formatted: string; // e.g. "$299.00"
  currency: string;
  status: string | null;
  payment_status: string | null;
  delivery_status: string | null;
  delivered_at: string | null;
  created_at: string;
  completed_at: string | null;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  business_name: string | null;
  website: string | null;
  product: string | null;
  email_message_id: string | null;
  error_message: string | null;
  livemode: boolean;

  // Enriched fields from audits fallback
  enriched_from_audit?: boolean;
}

export interface BlueprintOrdersMetrics {
  totalOrders: number;
  liveOrdersCount: number;
  testOrdersCount: number;
  liveSalesCount: number; // livemode === true && payment_status === 'paid' && status === 'completed'
  liveGrossRevenueDollars: number; // sum of amount_paid/100 for live sales
  liveGrossRevenueFormatted: string; // e.g. "$0.00"
  deliveryFulfillmentRate: number | null; // percentage or null if denominator is 0
  qualifyingLiveOrdersCount: number;
  qualifyingDeliveredCount: number;
}

/**
 * Format Blueprint minor currency units (cents) into standard USD currency string.
 * Example: 29900 -> $299.00
 */
export function formatBlueprintAmount(amountPaidCents: number, currency: string = 'usd'): string {
  const dollars = (amountPaidCents || 0) / 100;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: (currency || 'USD').toUpperCase(),
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(dollars);
}

/**
 * Format human-readable relative time (e.g. 2h ago, 3d ago).
 */
export function formatOrderRelativeTime(dateString?: string | null): string {
  if (!dateString) return 'recently';
  const date = new Date(dateString);
  const diffMs = Date.now() - date.getTime();
  if (isNaN(diffMs)) return 'recently';

  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return '1d ago';
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

/**
 * Format calendar date (e.g. Oct 2, 2026).
 */
export function formatOrderCalendarDate(dateString?: string | null): string {
  if (!dateString) return '—';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '—';

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Fetches all Blueprint orders from public.blueprint_orders and performs read-only
 * fallback enrichment from public.audits where business/contact details are missing.
 *
 * Accounting Rules:
 * - amount_paid is ALWAYS minor currency units (cents). 29900 = $299.00.
 * - livemode = false transactions MUST NOT count toward live sales or live revenue.
 * - Live revenue and live sales strictly filter:
 *   livemode = true AND payment_status = 'paid' AND status = 'completed'.
 */
export async function fetchAdminBlueprintOrders(): Promise<{
  orders: BlueprintOrderItem[];
  metrics: BlueprintOrdersMetrics;
  error?: string | null;
}> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return {
      orders: [],
      metrics: {
        totalOrders: 0,
        liveOrdersCount: 0,
        testOrdersCount: 0,
        liveSalesCount: 0,
        liveGrossRevenueDollars: 0,
        liveGrossRevenueFormatted: '$0.00',
        deliveryFulfillmentRate: null,
        qualifyingLiveOrdersCount: 0,
        qualifyingDeliveredCount: 0,
      },
      error: 'Supabase client unavailable',
    };
  }

  try {
    // 1. Fetch all blueprint_orders ordered by created_at DESC
    const { data: rawOrdersData, error: ordersError } = await supabase
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
        delivered_at,
        created_at,
        completed_at,
        customer_name,
        customer_email,
        customer_phone,
        business_name,
        website,
        product,
        email_message_id,
        error_message,
        livemode
      `)
      .order('created_at', { ascending: false });

    if (ordersError) {
      console.error('Error querying blueprint_orders:', ordersError);
      return {
        orders: [],
        metrics: {
          totalOrders: 0,
          liveOrdersCount: 0,
          testOrdersCount: 0,
          liveSalesCount: 0,
          liveGrossRevenueDollars: 0,
          liveGrossRevenueFormatted: '$0.00',
          deliveryFulfillmentRate: null,
          qualifyingLiveOrdersCount: 0,
          qualifyingDeliveredCount: 0,
        },
        error: ordersError.message,
      };
    }

    const rawOrders = rawOrdersData || [];

    // 2. Collect audit_id references to batch-enrich missing fields from public.audits
    const auditIdsToFetch = Array.from(
      new Set(rawOrders.map((o) => o.audit_id).filter(Boolean))
    ) as string[];

    const auditEnrichmentMap = new Map<string, any>();

    if (auditIdsToFetch.length > 0) {
      try {
        const { data: auditsData, error: auditsError } = await supabase
          .from('audits')
          .select(`
            audit_id,
            business_name,
            website,
            contact_name,
            contact_email,
            location,
            category,
            visibility_score,
            overall_score
          `)
          .in('audit_id', auditIdsToFetch);

        if (!auditsError && auditsData) {
          for (const a of auditsData) {
            if (a.audit_id) {
              auditEnrichmentMap.set(a.audit_id, a);
            }
          }
        }
      } catch (err) {
        console.warn('Could not batch-enrich audits for blueprint orders:', err);
      }
    }

    // 3. Process and enrich each order (prefer direct order values, fallback to audit)
    const orders: BlueprintOrderItem[] = rawOrders.map((o) => {
      const audit = o.audit_id ? auditEnrichmentMap.get(o.audit_id) : null;

      const directCustomerName = o.customer_name?.trim() || null;
      const directCustomerEmail = o.customer_email?.trim() || null;
      const directBusinessName = o.business_name?.trim() || null;
      const directWebsite = o.website?.trim() || null;

      const fallbackContactName = audit?.contact_name?.trim() || null;
      const fallbackContactEmail = audit?.contact_email?.trim() || null;
      const fallbackBusinessName = audit?.business_name?.trim() || null;
      const fallbackWebsite = audit?.website?.trim() || null;

      const finalCustomerName = directCustomerName || fallbackContactName || null;
      const finalCustomerEmail = directCustomerEmail || fallbackContactEmail || null;
      const finalBusinessName = directBusinessName || fallbackBusinessName || null;
      const finalWebsite = directWebsite || fallbackWebsite || null;

      const wasEnriched = Boolean(
        (!directCustomerName && fallbackContactName) ||
        (!directCustomerEmail && fallbackContactEmail) ||
        (!directBusinessName && fallbackBusinessName) ||
        (!directWebsite && fallbackWebsite)
      );

      const amountCents = typeof o.amount_paid === 'number' ? o.amount_paid : 0;
      const currency = (o.currency || 'usd').toLowerCase();

      return {
        id: o.id,
        audit_id: o.audit_id || null,
        stripe_payment_intent_id: o.stripe_payment_intent_id || null,
        amount_paid: amountCents,
        amount_formatted: formatBlueprintAmount(amountCents, currency),
        currency: currency,
        status: o.status || null,
        payment_status: o.payment_status || null,
        delivery_status: o.delivery_status || null,
        delivered_at: o.delivered_at || null,
        created_at: o.created_at,
        completed_at: o.completed_at || null,
        customer_name: finalCustomerName,
        customer_email: finalCustomerEmail,
        customer_phone: o.customer_phone?.trim() || null,
        business_name: finalBusinessName,
        website: finalWebsite,
        product: o.product?.trim() || 'DIY Blueprint',
        email_message_id: o.email_message_id || null,
        error_message: o.error_message?.trim() || null,
        livemode: Boolean(o.livemode),
        enriched_from_audit: wasEnriched,
      };
    });

    // 4. Calculate Summary Metrics
    const totalOrders = orders.length;
    const liveOrdersCount = orders.filter((o) => o.livemode === true).length;
    const testOrdersCount = orders.filter((o) => o.livemode === false).length;

    // Qualifying LIVE paid sales:
    // livemode = true AND payment_status = 'paid' AND status = 'completed'
    const qualifyingLiveSales = orders.filter(
      (o) => o.livemode === true && o.payment_status === 'paid' && o.status === 'completed'
    );
    const liveSalesCount = qualifyingLiveSales.length;

    // Live Gross Revenue (in Dollars)
    const liveGrossRevenueCents = qualifyingLiveSales.reduce((sum, o) => sum + o.amount_paid, 0);
    const liveGrossRevenueDollars = liveGrossRevenueCents / 100;
    const liveGrossRevenueFormatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(liveGrossRevenueDollars);

    // Delivery Fulfillment Rate:
    // Denominator = qualifying live paid orders
    // Numerator = qualifying live orders where delivery_status === 'delivered'
    const qualifyingDeliveredCount = qualifyingLiveSales.filter(
      (o) => o.delivery_status === 'delivered'
    ).length;

    let deliveryFulfillmentRate: number | null = null;
    if (liveSalesCount > 0) {
      deliveryFulfillmentRate = Math.round((qualifyingDeliveredCount / liveSalesCount) * 100);
    }

    return {
      orders,
      metrics: {
        totalOrders,
        liveOrdersCount,
        testOrdersCount,
        liveSalesCount,
        liveGrossRevenueDollars,
        liveGrossRevenueFormatted,
        deliveryFulfillmentRate,
        qualifyingLiveOrdersCount: liveSalesCount,
        qualifyingDeliveredCount,
      },
      error: null,
    };
  } catch (err: any) {
    console.error('Unexpected error in fetchAdminBlueprintOrders:', err);
    return {
      orders: [],
      metrics: {
        totalOrders: 0,
        liveOrdersCount: 0,
        testOrdersCount: 0,
        liveSalesCount: 0,
        liveGrossRevenueDollars: 0,
        liveGrossRevenueFormatted: '$0.00',
        deliveryFulfillmentRate: null,
        qualifyingLiveOrdersCount: 0,
        qualifyingDeliveredCount: 0,
      },
      error: err?.message || 'Unexpected error fetching Blueprint orders',
    };
  }
}
