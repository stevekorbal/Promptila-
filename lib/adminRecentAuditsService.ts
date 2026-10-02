import { getSupabaseClient } from './supabase.ts';

export interface RecentAuditItem {
  id: string;
  audit_id: string;
  audit_type: string;
  overall_score: number | null;
  score_band: string | null;
  optimization_potential: string | null;
  status: string | null;
  completed_at: string | null;
  created_at: string;
  business_name: string | null;
  website: string | null;
  location: string | null;
  category: string | null;
  visibility_score: number | null;
  contact_name: string | null;
  contact_email: string | null;
}

export interface RecentAuditsResult {
  audits: RecentAuditItem[];
  error?: string | null;
}

/**
 * Resolves the primary score according to business rules:
 * Prefer visibility_score; if null, fallback to overall_score; if both null, returns null.
 */
export function resolveAuditScore(audit: { visibility_score?: number | null; overall_score?: number | null }): number | null {
  if (audit.visibility_score !== null && audit.visibility_score !== undefined) {
    const num = Number(audit.visibility_score);
    return isNaN(num) ? null : Math.round(num);
  }
  if (audit.overall_score !== null && audit.overall_score !== undefined) {
    const num = Number(audit.overall_score);
    return isNaN(num) ? null : Math.round(num);
  }
  return null;
}

/**
 * Maps database audit status to readable UI status labels:
 * free_audit_sent -> Free Audit Sent
 * completed -> Completed
 * in_progress -> In Progress
 * pending -> Pending
 */
export function formatAuditStatusLabel(status?: string | null): string {
  if (!status) return 'Pending';
  const s = status.toLowerCase().trim();
  switch (s) {
    case 'free_audit_sent':
      return 'Free Audit Sent';
    case 'completed':
      return 'Completed';
    case 'in_progress':
      return 'In Progress';
    case 'pending':
      return 'Pending';
    default:
      return s
        .replace(/[_-]+/g, ' ')
        .replace(/\b\w/g, (char) => char.toUpperCase());
  }
}

/**
 * Human-friendly relative or concise timestamp for audit creation time
 */
export function formatAuditTimeAgo(dateString?: string): string {
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
  if (days < 30) return `${days}d ago`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Fetches the 5 most recently created Free Audits from public.audits.
 * Operational data source: NOT restricted by the dashboard analytics date range.
 */
export async function fetchRecentAudits(limit = 5): Promise<RecentAuditsResult> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    console.error('Supabase client unavailable for recent audits service');
    return { audits: [], error: 'Supabase client unavailable' };
  }

  try {
    const { data, error } = await supabase
      .from('audits')
      .select(`
        id,
        audit_id,
        audit_type,
        overall_score,
        score_band,
        optimization_potential,
        status,
        completed_at,
        created_at,
        business_name,
        website,
        location,
        category,
        visibility_score,
        contact_name,
        contact_email
      `)
      .eq('audit_type', 'free')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Supabase error querying recent audits:', error);
      return { audits: [], error: error.message };
    }

    return { audits: (data as RecentAuditItem[]) || [], error: null };
  } catch (err: any) {
    console.error('Unexpected error fetching recent audits:', err);
    return { audits: [], error: err?.message || 'Unexpected error' };
  }
}
