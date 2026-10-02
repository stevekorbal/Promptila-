import { getSupabaseClient } from './supabase.ts';
import { AdminAlert } from '../components/admin/AlertCard.tsx';

export interface AdminAlertsResult {
  alerts: AdminAlert[];
  error?: string | null;
}

export function formatTimeAgo(dateString?: string): string {
  if (!dateString) return 'recently';
  const diffMs = Date.now() - new Date(dateString).getTime();
  if (isNaN(diffMs)) return 'recently';

  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/**
 * Fetches and generates operational alerts for Promptila Admin from real production Supabase data.
 *
 * Operational Alert Rules:
 * 1. Blueprint processing failure: livemode=true AND (status='failed'|'error' OR non-empty error_message)
 * 2. Blueprint delivery failure: livemode=true AND (delivery_status='failed'|'bounce'|'error')
 * 3. Paid Blueprint awaiting delivery: livemode=true AND payment_status='paid' AND status='completed' AND delivered_at IS NULL AND age > 2h
 * 4. Missing contact email: audit_type='free' AND (contact_email IS NULL OR trimmed = '')
 * 5. Missing business website: audit_type='free' AND (website IS NULL OR trimmed = '')
 *
 * Rules strictly exclude:
 * - Stripe test transactions (livemode=false)
 * - Fake / unconnected DFY events
 */
export async function fetchAdminAlerts(): Promise<AdminAlertsResult> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    console.error('Supabase client unavailable for alerts service');
    return { alerts: [], error: 'Supabase client unavailable' };
  }

  try {
    const [ordersRes, auditsRes] = await Promise.all([
      // Source 1: Production Blueprint orders (livemode = true ONLY)
      supabase
        .from('blueprint_orders')
        .select(`
          id,
          audit_id,
          stripe_payment_intent_id,
          status,
          payment_status,
          delivery_status,
          error_message,
          created_at,
          completed_at,
          delivered_at,
          business_name,
          customer_email,
          livemode
        `)
        .eq('livemode', true),

      // Source 2: Production Free Audits
      supabase
        .from('audits')
        .select(`
          id,
          audit_id,
          audit_type,
          status,
          business_name,
          website,
          contact_email,
          created_at
        `)
        .eq('audit_type', 'free')
    ]);

    if (ordersRes.error) {
      console.error('Supabase error fetching blueprint_orders for alerts:', ordersRes.error);
    }
    if (auditsRes.error) {
      console.error('Supabase error fetching audits for alerts:', auditsRes.error);
    }

    if (ordersRes.error && auditsRes.error) {
      return { alerts: [], error: 'Failed to query operational data sources' };
    }

    const orders = ordersRes.data || [];
    const audits = auditsRes.data || [];
    const rawAlerts: (AdminAlert & { priority: number; rawTimestamp: number })[] = [];
    const now = Date.now();
    const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

    // Process Blueprint Orders
    for (const order of orders) {
      // Rule: Must be livemode = true (already filtered in query, double checked)
      if (order.livemode !== true) continue;

      const orderAuditId = order.audit_id || order.id || 'ORDER';
      const orderCreatedAt = order.created_at || new Date().toISOString();
      const rawTimestamp = new Date(orderCreatedAt).getTime();

      // Rule 1: Blueprint Processing / Generation Failure
      const isStatusFailure = order.status === 'failed' || order.status === 'error';
      const hasErrorMessage = Boolean(order.error_message && order.error_message.trim() !== '' && order.status !== 'completed');

      if (isStatusFailure || hasErrorMessage) {
        rawAlerts.push({
          id: `alert-bp-fail-${order.id}`,
          title: 'Blueprint processing failed',
          description: order.error_message?.trim() || 'Automated Blueprint processing encountered an unhandled error.',
          auditId: orderAuditId,
          category: 'blueprint_generation',
          severity: 'critical',
          timestamp: formatTimeAgo(order.completed_at || order.created_at),
          actionLabel: 'View Order',
          priority: 1,
          rawTimestamp
        });
        continue; // Avoid duplicate alert for same order
      }

      // Rule 2: Blueprint Delivery Failure
      const isDeliveryFailure = order.delivery_status === 'failed' || order.delivery_status === 'bounce' || order.delivery_status === 'error';
      if (isDeliveryFailure) {
        rawAlerts.push({
          id: `alert-bp-deliv-${order.id}`,
          title: 'Blueprint delivery failed',
          description: order.error_message?.trim() || 'Automated Blueprint dispatch delivery could not be completed.',
          auditId: orderAuditId,
          category: 'email_delivery',
          severity: 'critical',
          timestamp: formatTimeAgo(order.delivered_at || order.completed_at || order.created_at),
          actionLabel: 'View Order',
          priority: 1,
          rawTimestamp
        });
        continue;
      }

      // Rule 3: Paid Blueprint Awaiting Delivery (> 2 hours)
      const isPaidCompleted = order.payment_status === 'paid' && order.status === 'completed';
      const isUndelivered = !order.delivered_at;
      const refTime = new Date(order.completed_at || order.created_at).getTime();
      const isOlderThan2h = (now - refTime) > TWO_HOURS_MS;

      if (isPaidCompleted && isUndelivered && isOlderThan2h) {
        rawAlerts.push({
          id: `alert-bp-pending-${order.id}`,
          title: 'Paid Blueprint awaiting delivery',
          description: 'Payment completed but Blueprint has not been delivered.',
          auditId: orderAuditId,
          category: 'order_fulfillment',
          severity: 'warning',
          timestamp: formatTimeAgo(order.completed_at || order.created_at),
          actionLabel: 'View Order',
          priority: 2,
          rawTimestamp
        });
      }
    }

    // Process Free Audits
    for (const audit of audits) {
      if (audit.audit_type !== 'free') continue;

      const auditId = audit.audit_id || audit.id || 'AUDIT';
      const auditCreatedAt = audit.created_at || new Date().toISOString();
      const rawTimestamp = new Date(auditCreatedAt).getTime();
      const businessName = audit.business_name?.trim();

      // Rule 4: Missing Contact Email
      const isMissingEmail = !audit.contact_email || audit.contact_email.trim() === '';
      if (isMissingEmail) {
        rawAlerts.push({
          id: `alert-audit-email-${audit.id}`,
          title: 'Missing contact email',
          description: businessName ? `Contact email missing for ${businessName}` : 'Audit intake completed without a contact email address.',
          auditId,
          category: 'customer_data',
          severity: 'warning',
          timestamp: formatTimeAgo(audit.created_at),
          actionLabel: 'View Audit',
          priority: 3,
          rawTimestamp
        });
      }

      // Rule 5: Missing Business Website
      const isMissingWebsite = !audit.website || audit.website.trim() === '';
      if (isMissingWebsite) {
        rawAlerts.push({
          id: `alert-audit-web-${audit.id}`,
          title: 'Missing business website',
          description: businessName ? `Website URL missing for ${businessName}` : 'Audit intake completed without a business domain.',
          auditId,
          category: 'customer_data',
          severity: 'warning',
          timestamp: formatTimeAgo(audit.created_at),
          actionLabel: 'View Audit',
          priority: 4,
          rawTimestamp
        });
      }
    }

    // Sort by priority (1 to 4), then by recency (newest first)
    rawAlerts.sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }
      return b.rawTimestamp - a.rawTimestamp;
    });

    const alerts: AdminAlert[] = rawAlerts.map(({ priority, rawTimestamp, ...alert }) => alert);

    return { alerts, error: null };
  } catch (err: any) {
    console.error('Unexpected error in fetchAdminAlerts:', err);
    return { alerts: [], error: err?.message || 'Unexpected error' };
  }
}
