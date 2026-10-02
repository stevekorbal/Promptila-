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
