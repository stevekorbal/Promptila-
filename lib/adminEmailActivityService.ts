import { getSupabaseClient } from './supabase.ts';

export interface EmailFollowupItem {
  id: string;
  audit_id: string;
  email_number: number;
  email_type: string;
  recipient_email: string | null;
  sent_at: string | null;
  status: string | null;
  created_at: string;
}

export interface EmailActivityResult {
  emails: EmailFollowupItem[];
  error?: string | null;
}

export function formatEmailType(type?: string | null): string {
  if (!type) return 'Follow-Up Email';
  const s = type.trim();
  if (s.toLowerCase() === 'blueprint_purchase_confirmation') {
    return 'Blueprint Purchase Confirmation';
  }
  if (s.toLowerCase() === 'free_audit_followup') {
    return 'Free Audit Follow-Up';
  }
  return s
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function formatEmailStatus(status?: string | null): { status: string; label: string } {
  if (!status) return { status: 'pending', label: 'Pending' };
  const s = status.toLowerCase().trim();
  switch (s) {
    case 'sent':
      return { status: 'sent', label: 'Sent' };
    case 'delivered':
      return { status: 'delivered', label: 'Delivered' };
    case 'failed':
    case 'error':
    case 'bounce':
    case 'bounced':
      return { status: 'failed', label: 'Failed' };
    case 'pending':
    case 'queued':
      return { status: 'pending', label: 'Pending' };
    default:
      return {
        status: s,
        label: s.replace(/[_-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      };
  }
}

export function formatEmailSentTime(sentAt?: string | null, createdAt?: string | null): string {
  const dateStr = sentAt || createdAt;
  if (!dateStr) return 'recently';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return 'recently';

  const diffMs = Date.now() - date.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Fetches the 10 most recent email followup records from public.email_followups.
 * Operational stream: NOT restricted by the dashboard analytics date selector.
 */
export async function fetchEmailActivity(limit = 10): Promise<EmailActivityResult> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    console.error('Supabase client unavailable for email activity service');
    return { emails: [], error: 'Supabase client unavailable' };
  }

  try {
    const { data, error } = await supabase
      .from('email_followups')
      .select(`
        id,
        audit_id,
        email_number,
        email_type,
        recipient_email,
        sent_at,
        status,
        created_at
      `)
      .order('sent_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Supabase error querying email_followups:', error);
      return { emails: [], error: error.message };
    }

    return { emails: (data as EmailFollowupItem[]) || [], error: null };
  } catch (err: any) {
    console.error('Unexpected error fetching email activity:', err);
    return { emails: [], error: err?.message || 'Unexpected error' };
  }
}

export interface EnrichedEmailFollowupItem extends EmailFollowupItem {
  business_name: string | null;
  contact_name: string | null;
  website: string | null;
}

export interface EmailActivitySummaryMetrics {
  totalLogged: number;
  sentCount: number;
  failedCount: number;
  pendingCount: number;
}

/**
 * Format full date and time for table display (e.g. Oct 4, 2026, 4:15 PM).
 */
export function formatEmailCalendarDateTime(dateStr?: string | null): string {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '—';

  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Fetches all email follow-up records from public.email_followups,
 * enriches business/contact information from public.audits where available,
 * and calculates dispatch summary metrics.
 *
 * Terminology & Integrity Rules:
 * - public.email_followups is a DISPATCH LOG.
 * - status = 'sent' means the message was successfully dispatched to the mail agent.
 * - No confirmed delivery, open, click, or bounce metrics are tracked or invented.
 */
export async function fetchAdminEmailActivityDirectory(): Promise<{
  emails: EnrichedEmailFollowupItem[];
  metrics: EmailActivitySummaryMetrics;
  error?: string | null;
}> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return {
      emails: [],
      metrics: {
        totalLogged: 0,
        sentCount: 0,
        failedCount: 0,
        pendingCount: 0,
      },
      error: 'Supabase client unavailable',
    };
  }

  try {
    // 1. Fetch all email followup logs
    const { data: rawEmailsData, error: emailsError } = await supabase
      .from('email_followups')
      .select(`
        id,
        audit_id,
        email_number,
        email_type,
        recipient_email,
        sent_at,
        status,
        created_at
      `)
      .order('sent_at', { ascending: false, nullsFirst: false });

    if (emailsError) {
      console.error('Supabase error querying all email_followups:', emailsError);
      return {
        emails: [],
        metrics: {
          totalLogged: 0,
          sentCount: 0,
          failedCount: 0,
          pendingCount: 0,
        },
        error: emailsError.message,
      };
    }

    const rawEmails = rawEmailsData || [];

    // 2. Collect audit_id references to batch-enrich display fields from public.audits
    const auditIdsToFetch = Array.from(
      new Set(rawEmails.map((e) => e.audit_id).filter(Boolean))
    ) as string[];

    const auditMap = new Map<string, { business_name?: string; contact_name?: string; website?: string }>();

    if (auditIdsToFetch.length > 0) {
      try {
        const { data: auditsData, error: auditsError } = await supabase
          .from('audits')
          .select('audit_id, business_name, contact_name, website')
          .in('audit_id', auditIdsToFetch);

        if (!auditsError && auditsData) {
          for (const a of auditsData) {
            if (a.audit_id) {
              auditMap.set(a.audit_id, a);
            }
          }
        }
      } catch (err) {
        console.warn('Could not batch-enrich audits for email followups:', err);
      }
    }

    // 3. Map into EnrichedEmailFollowupItem
    const emails: EnrichedEmailFollowupItem[] = rawEmails.map((item) => {
      const audit = item.audit_id ? auditMap.get(item.audit_id) : null;
      return {
        ...item,
        business_name: audit?.business_name?.trim() || null,
        contact_name: audit?.contact_name?.trim() || null,
        website: audit?.website?.trim() || null,
      };
    });

    // 4. Calculate Summary Metrics (Strictly Send/Dispatch Logs)
    const totalLogged = emails.length;
    const sentCount = emails.filter((e) => (e.status || '').toLowerCase().trim() === 'sent').length;
    const failedCount = emails.filter((e) => {
      const s = (e.status || '').toLowerCase().trim();
      return s === 'failed' || s === 'error';
    }).length;
    const pendingCount = emails.filter((e) => {
      const s = (e.status || '').toLowerCase().trim();
      return s === 'pending' || s === 'queued';
    }).length;

    return {
      emails,
      metrics: {
        totalLogged,
        sentCount,
        failedCount,
        pendingCount,
      },
      error: null,
    };
  } catch (err: any) {
    console.error('Unexpected error fetching email activity directory:', err);
    return {
      emails: [],
      metrics: {
        totalLogged: 0,
        sentCount: 0,
        failedCount: 0,
        pendingCount: 0,
      },
      error: err?.message || 'Unexpected error loading email activity',
    };
  }
}

