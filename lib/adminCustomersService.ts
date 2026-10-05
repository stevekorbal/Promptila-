import { getSupabaseClient } from './supabase.ts';
import { resolveAuditScore } from './adminRecentAuditsService.ts';

export type CustomerStage = 'paying_customer' | 'audited_lead' | 'pending_lead' | 'other_lead';

export interface CustomerContactItem {
  id: string; // Grouping identifier (e.g. email:..., domain:..., audit:...)
  contact_name: string | null;
  contact_email: string | null;
  customer_phone?: string | null;
  business_name: string | null;
  website: string | null;
  normalized_domain: string | null;
  category: string | null;
  location: string | null;
  stage: CustomerStage;
  stageLabel: string;
  blueprintPurchased: boolean;
  blueprintAmount: number | null;
  latest_audit_id: string | null;
  latest_audit_uuid: string | null;
  latest_audit_score: number | null;
  latest_audit_status: string | null;
  total_audits: number;
  total_orders: number;
  first_seen_at: string;
  last_active_at: string;
}

export interface CustomersSummaryMetrics {
  totalContacts: number;
  payingCustomers: number;
  auditedLeads: number;
  averageVisibilityScore: number | null;
}

export function normalizeDomain(url?: string | null): string {
  if (!url) return '';
  let clean = url.trim().toLowerCase();
  clean = clean.replace(/^https?:\/\//, '');
  clean = clean.replace(/^www\./, '');
  clean = clean.replace(/\/.*$/, '');
  clean = clean.replace(/:\d+$/, '');
  return clean.trim();
}

export function normalizeEmail(email?: string | null): string {
  if (!email) return '';
  return email.trim().toLowerCase();
}

export function formatCustomerTimeAgo(dateString?: string | null): string {
  if (!dateString) return '—';
  const diffMs = Date.now() - new Date(dateString).getTime();
  if (isNaN(diffMs)) return '—';

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
 * Fetches and groups Promptila contacts & leads at read-time across audits and blueprint orders.
 *
 * Rules:
 * 1. Primary grouping key: normalized email (audits.contact_email / blueprint_orders.customer_email).
 * 2. Fallback key: normalized domain (audits.website / blueprint_orders.website).
 * 3. Fallback for unkeyed: isolated record id (do NOT group unrelated empty records).
 * 4. Blueprint join: blueprint_orders.audit_id = audits.audit_id (primary), customer_email (secondary).
 * 5. Production Paying Customer check: livemode === true AND payment_status === 'paid' AND status === 'completed'.
 *    (Stripe test transactions where livemode === false MUST NOT convert a lead to a paying customer).
 */
export async function fetchAdminCustomers(): Promise<{
  contacts: CustomerContactItem[];
  metrics: CustomersSummaryMetrics;
  error?: string | null;
}> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return {
      contacts: [],
      metrics: {
        totalContacts: 0,
        payingCustomers: 0,
        auditedLeads: 0,
        averageVisibilityScore: null,
      },
      error: 'Supabase client unavailable',
    };
  }

  try {
    const [auditsRes, ordersRes] = await Promise.all([
      supabase
        .from('audits')
        .select(`
          id,
          audit_id,
          audit_type,
          business_name,
          website,
          location,
          category,
          contact_name,
          contact_email,
          visibility_score,
          overall_score,
          score_band,
          status,
          created_at,
          completed_at
        `)
        .order('created_at', { ascending: false }),
      supabase
        .from('blueprint_orders')
        .select(`
          id,
          audit_id,
          customer_name,
          customer_email,
          customer_phone,
          business_name,
          website,
          amount_paid,
          payment_status,
          status,
          delivery_status,
          livemode,
          created_at,
          completed_at
        `)
        .order('created_at', { ascending: false }),
    ]);

    if (auditsRes.error) {
      console.error('Error querying audits for customers directory:', auditsRes.error);
      return {
        contacts: [],
        metrics: { totalContacts: 0, payingCustomers: 0, auditedLeads: 0, averageVisibilityScore: null },
        error: auditsRes.error.message,
      };
    }

    if (ordersRes.error) {
      console.error('Error querying blueprint_orders for customers directory:', ordersRes.error);
      return {
        contacts: [],
        metrics: { totalContacts: 0, payingCustomers: 0, auditedLeads: 0, averageVisibilityScore: null },
        error: ordersRes.error.message,
      };
    }

    const rawAudits = auditsRes.data || [];
    const rawOrders = ordersRes.data || [];

    // Map audits to contact groups
    const auditIdToGroupKey = new Map<string, string>();
    const groupKeyToAudits = new Map<string, any[]>();
    const groupKeyToOrders = new Map<string, any[]>();

    for (const audit of rawAudits) {
      const email = normalizeEmail(audit.contact_email);
      const domain = normalizeDomain(audit.website);

      let key: string;
      if (email) {
        key = `email:${email}`;
      } else if (domain) {
        key = `domain:${domain}`;
      } else {
        // Isolated audit without email or website
        key = `audit:${audit.id}`;
      }

      if (audit.audit_id) {
        auditIdToGroupKey.set(audit.audit_id, key);
      }
      auditIdToGroupKey.set(audit.id, key);

      if (!groupKeyToAudits.has(key)) {
        groupKeyToAudits.set(key, []);
      }
      groupKeyToAudits.get(key)!.push(audit);
    }

    // Map blueprint orders to group keys
    for (const order of rawOrders) {
      let key: string | undefined;

      // 1. Strongest relationship: audit_id = audits.audit_id
      if (order.audit_id && auditIdToGroupKey.has(order.audit_id)) {
        key = auditIdToGroupKey.get(order.audit_id);
      }

      // 2. Secondary correlation: customer_email
      if (!key) {
        const orderEmail = normalizeEmail(order.customer_email);
        if (orderEmail && groupKeyToAudits.has(`email:${orderEmail}`)) {
          key = `email:${orderEmail}`;
        } else if (orderEmail) {
          key = `email:${orderEmail}`;
        }
      }

      // 3. Fallback: domain
      if (!key) {
        const orderDomain = normalizeDomain(order.website);
        if (orderDomain && groupKeyToAudits.has(`domain:${orderDomain}`)) {
          key = `domain:${orderDomain}`;
        } else if (orderDomain) {
          key = `domain:${orderDomain}`;
        }
      }

      // 4. Standalone unlinked order
      if (!key) {
        key = `order:${order.id}`;
      }

      if (!groupKeyToOrders.has(key)) {
        groupKeyToOrders.set(key, []);
      }
      groupKeyToOrders.get(key)!.push(order);
    }

    // Unite all unique group keys
    const allKeys = new Set<string>([
      ...groupKeyToAudits.keys(),
      ...groupKeyToOrders.keys(),
    ]);

    const contacts: CustomerContactItem[] = [];

    for (const key of allKeys) {
      const groupAudits = groupKeyToAudits.get(key) || [];
      const groupOrders = groupKeyToOrders.get(key) || [];

      // Sort newest first
      groupAudits.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      groupOrders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      const latestAudit = groupAudits[0] || null;
      const latestOrder = groupOrders[0] || null;

      // Extract reliable identity fields
      const contactName =
        latestAudit?.contact_name?.trim() ||
        latestOrder?.customer_name?.trim() ||
        null;

      const contactEmail =
        latestAudit?.contact_email?.trim() ||
        latestOrder?.customer_email?.trim() ||
        (key.startsWith('email:') ? key.replace('email:', '') : null);

      const customerPhone =
        latestOrder?.customer_phone?.trim() ||
        null;

      const businessName =
        latestAudit?.business_name?.trim() ||
        latestOrder?.business_name?.trim() ||
        null;

      const website =
        latestAudit?.website?.trim() ||
        latestOrder?.website?.trim() ||
        null;

      const normalizedDomain = normalizeDomain(website);

      const category = latestAudit?.category?.trim() || null;
      const location = latestAudit?.location?.trim() || null;

      // Check LIVE paid blueprint purchases ONLY
      // Stripe test purchases (livemode = false) must NOT convert a lead into a paying customer!
      const qualifyingLiveOrders = groupOrders.filter(
        (o) => o.livemode === true && o.payment_status === 'paid' && o.status === 'completed'
      );
      const hasLivePaidBlueprint = qualifyingLiveOrders.length > 0;
      const blueprintAmount = hasLivePaidBlueprint ? (qualifyingLiveOrders[0].amount_paid || 29700) : null;

      // Derive Customer Stage
      let stage: CustomerStage = 'other_lead';
      let stageLabel = 'Other Lead';

      if (hasLivePaidBlueprint) {
        stage = 'paying_customer';
        stageLabel = 'Paying Customer';
      } else if (latestAudit) {
        const auditStatus = (latestAudit.status || '').toLowerCase().trim();
        if (['free_audit_sent', 'completed'].includes(auditStatus)) {
          stage = 'audited_lead';
          stageLabel = 'Audited Lead';
        } else if (['pending', 'in_progress'].includes(auditStatus)) {
          stage = 'pending_lead';
          stageLabel = 'Pending Lead';
        } else {
          stage = 'other_lead';
          stageLabel = 'Other Lead';
        }
      }

      // Latest audit score
      const latestAuditScore = latestAudit ? resolveAuditScore(latestAudit) : null;

      // Activity timestamps
      const allTimestamps: number[] = [
        ...groupAudits.map((a) => new Date(a.created_at).getTime()),
        ...groupOrders.map((o) => new Date(o.created_at).getTime()),
      ].filter((t) => !isNaN(t));

      const firstSeenTs = allTimestamps.length > 0 ? Math.min(...allTimestamps) : Date.now();
      const firstSeenAt = new Date(firstSeenTs).toISOString();

      const activeTimestamps: number[] = [
        ...groupAudits.map((a) => new Date(a.completed_at || a.created_at).getTime()),
        ...groupOrders.map((o) => new Date(o.completed_at || o.created_at).getTime()),
      ].filter((t) => !isNaN(t));

      const lastActiveTs = activeTimestamps.length > 0 ? Math.max(...activeTimestamps) : firstSeenTs;
      const lastActiveAt = new Date(lastActiveTs).toISOString();

      contacts.push({
        id: key,
        contact_name: contactName,
        contact_email: contactEmail,
        customer_phone: customerPhone,
        business_name: businessName,
        website: website,
        normalized_domain: normalizedDomain,
        category: category,
        location: location,
        stage: stage,
        stageLabel: stageLabel,
        blueprintPurchased: hasLivePaidBlueprint,
        blueprintAmount: blueprintAmount,
        latest_audit_id: latestAudit?.audit_id || latestAudit?.id || null,
        latest_audit_uuid: latestAudit?.id || null,
        latest_audit_score: latestAuditScore,
        latest_audit_status: latestAudit?.status || null,
        total_audits: groupAudits.length,
        total_orders: groupOrders.length,
        first_seen_at: firstSeenAt,
        last_active_at: lastActiveAt,
      });
    }

    // Default sort: most recent activity DESC
    contacts.sort((a, b) => new Date(b.last_active_at).getTime() - new Date(a.last_active_at).getTime());

    // Calculate Summary Metrics
    const totalContacts = contacts.length;
    const payingCustomers = contacts.filter((c) => c.stage === 'paying_customer').length;
    const auditedLeads = contacts.filter((c) => c.stage === 'audited_lead').length;

    const scoredContacts = contacts.filter((c) => c.latest_audit_score !== null);
    const averageVisibilityScore =
      scoredContacts.length > 0
        ? Math.round(
            scoredContacts.reduce((sum, c) => sum + (c.latest_audit_score || 0), 0) / scoredContacts.length
          )
        : null;

    return {
      contacts,
      metrics: {
        totalContacts,
        payingCustomers,
        auditedLeads,
        averageVisibilityScore,
      },
      error: null,
    };
  } catch (err: any) {
    console.error('Unexpected error in fetchAdminCustomers:', err);
    return {
      contacts: [],
      metrics: { totalContacts: 0, payingCustomers: 0, auditedLeads: 0, averageVisibilityScore: null },
      error: err?.message || 'Unexpected error fetching customers',
    };
  }
}
