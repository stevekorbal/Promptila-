import { getSupabaseClient } from './supabase.ts';
import { resolveAuditScore } from './adminRecentAuditsService.ts';

export interface AuditRecordItem {
  id: string;
  audit_id: string;
  audit_type: string;
  overall_score: number | null;
  score_band: string | null;
  optimization_potential: number | null;
  status: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at?: string | null;
  business_name: string | null;
  website: string | null;
  location: string | null;
  category: string | null;
  visibility_score: number | null;
  source_message_id?: string | null;
  contact_name: string | null;
  contact_email: string | null;
}

export interface DetailedAuditRecord extends AuditRecordItem {
  canonical_audit?: any;
  audit_data?: any;
}

export interface AuditsSummaryMetrics {
  totalAudits: number;
  freeAudits: number;
  averageVisibilityScore: number | null;
  needsAttention: number;
  availableStatuses: string[];
}

export interface FetchAuditsParams {
  searchQuery?: string;
  auditTypeFilter?: string; // 'all' | 'free' | 'other'
  statusFilter?: string; // 'all' | string
  scoreFilter?: string; // 'all' | '0-24' | '25-49' | '50-74' | '75-100'
  sortOption?: 'newest' | 'oldest' | 'score_high' | 'score_low';
  page: number;
  pageSize: number;
}

export interface FetchAuditsResponse {
  audits: AuditRecordItem[];
  totalCount: number;
  error?: string | null;
}

/**
 * Fetches operational summary card metrics across all stored public.audits records.
 * Does not depend on client-side search or table filters.
 */
export async function fetchAuditsSummaryMetrics(): Promise<{
  metrics: AuditsSummaryMetrics;
  error?: string | null;
}> {
  const supabase = getSupabaseClient();
  const defaultMetrics: AuditsSummaryMetrics = {
    totalAudits: 0,
    freeAudits: 0,
    averageVisibilityScore: null,
    needsAttention: 0,
    availableStatuses: [],
  };

  if (!supabase) {
    return { metrics: defaultMetrics, error: 'Supabase client unavailable' };
  }

  try {
    const { data, error } = await supabase
      .from('audits')
      .select('id, audit_type, visibility_score, overall_score, contact_email, website, status');

    if (error) {
      console.error('Error fetching audits summary metrics:', error);
      return { metrics: defaultMetrics, error: error.message };
    }

    const rows = data || [];
    const totalAudits = rows.length;
    const freeAudits = rows.filter((r) => (r.audit_type || '').toLowerCase() === 'free').length;

    let scoreSum = 0;
    let scoreCount = 0;
    for (const r of rows) {
      const s = resolveAuditScore(r);
      if (s !== null) {
        scoreSum += s;
        scoreCount++;
      }
    }
    const averageVisibilityScore = scoreCount > 0 ? Math.round(scoreSum / scoreCount) : null;

    const needsAttention = rows.filter((r) => {
      const hasMissingEmail = !r.contact_email || r.contact_email.trim() === '';
      const hasMissingWebsite = !r.website || r.website.trim() === '';
      const st = (r.status || '').toLowerCase().trim();
      const isPendingOrInProgress = st === 'pending' || st === 'in_progress';
      return hasMissingEmail || hasMissingWebsite || isPendingOrInProgress;
    }).length;

    const distinctStatuses = Array.from(
      new Set(rows.map((r) => r.status?.trim()).filter(Boolean) as string[])
    );

    return {
      metrics: {
        totalAudits,
        freeAudits,
        averageVisibilityScore,
        needsAttention,
        availableStatuses: distinctStatuses,
      },
      error: null,
    };
  } catch (err: any) {
    console.error('Unexpected error fetching audits metrics:', err);
    return { metrics: defaultMetrics, error: err?.message || 'Unexpected error' };
  }
}

/**
 * Queries public.audits with real server-side pagination, search, status/type/score filters, and sorting.
 * Excludes large JSONB fields (canonical_audit, audit_data) for performance.
 */
export async function fetchPaginatedAudits(params: FetchAuditsParams): Promise<FetchAuditsResponse> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { audits: [], totalCount: 0, error: 'Supabase client unavailable' };
  }

  const {
    searchQuery,
    auditTypeFilter = 'all',
    statusFilter = 'all',
    scoreFilter = 'all',
    sortOption = 'newest',
    page = 1,
    pageSize = 10,
  } = params;

  try {
    let query = supabase
      .from('audits')
      .select(
        `
        id,
        audit_id,
        audit_type,
        overall_score,
        score_band,
        optimization_potential,
        status,
        completed_at,
        created_at,
        updated_at,
        business_name,
        website,
        location,
        category,
        visibility_score,
        source_message_id,
        contact_name,
        contact_email
      `,
        { count: 'exact' }
      );

    // 1. Search across key text fields
    if (searchQuery && searchQuery.trim() !== '') {
      const term = searchQuery.trim();
      query = query.or(
        `audit_id.ilike.%${term}%,business_name.ilike.%${term}%,website.ilike.%${term}%,contact_name.ilike.%${term}%,contact_email.ilike.%${term}%,location.ilike.%${term}%,category.ilike.%${term}%`
      );
    }

    // 2. Audit Type filter
    if (auditTypeFilter && auditTypeFilter !== 'all') {
      if (auditTypeFilter === 'free') {
        query = query.eq('audit_type', 'free');
      } else if (auditTypeFilter === 'other') {
        query = query.neq('audit_type', 'free');
      }
    }

    // 3. Status filter
    if (statusFilter && statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
    }

    // 4. Score filter (visibility_score preferred, overall_score fallback)
    if (scoreFilter && scoreFilter !== 'all') {
      let min = 0;
      let max = 100;
      if (scoreFilter === '0-24') {
        min = 0;
        max = 24;
      } else if (scoreFilter === '25-49') {
        min = 25;
        max = 49;
      } else if (scoreFilter === '50-74') {
        min = 50;
        max = 74;
      } else if (scoreFilter === '75-100') {
        min = 75;
        max = 100;
      }

      query = query.or(
        `and(visibility_score.gte.${min},visibility_score.lte.${max}),and(visibility_score.is.null,overall_score.gte.${min},overall_score.lte.${max})`
      );
    }

    // 5. Sorting
    if (sortOption === 'oldest') {
      query = query.order('created_at', { ascending: true });
    } else if (sortOption === 'score_high') {
      query = query
        .order('visibility_score', { ascending: false, nullsFirst: false })
        .order('overall_score', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false });
    } else if (sortOption === 'score_low') {
      query = query
        .order('visibility_score', { ascending: true, nullsFirst: false })
        .order('overall_score', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: false });
    } else {
      // Default: Newest first
      query = query.order('created_at', { ascending: false });
    }

    // 6. Pagination range
    const from = Math.max(0, (page - 1) * pageSize);
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data, count, error } = await query;

    if (error) {
      console.error('Supabase error fetching paginated audits:', error);
      return { audits: [], totalCount: 0, error: error.message };
    }

    return {
      audits: (data as AuditRecordItem[]) || [],
      totalCount: count ?? 0,
      error: null,
    };
  } catch (err: any) {
    console.error('Unexpected error in fetchPaginatedAudits:', err);
    return { audits: [], totalCount: 0, error: err?.message || 'Unexpected error' };
  }
}

/**
 * Fetches exactly one audit record by its human-readable audit_id.
 * Includes canonical_audit and audit_data for the detailed operational view.
 */
export async function fetchAuditByAuditId(auditId: string): Promise<{
  audit: DetailedAuditRecord | null;
  error?: string | null;
}> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { audit: null, error: 'Supabase client unavailable' };
  }

  try {
    const cleanId = auditId.trim();
    const { data, error } = await supabase
      .from('audits')
      .select(`
        id,
        audit_id,
        audit_type,
        overall_score,
        score_band,
        optimization_potential,
        audit_data,
        status,
        completed_at,
        created_at,
        updated_at,
        canonical_audit,
        business_name,
        website,
        location,
        category,
        visibility_score,
        source_message_id,
        contact_name,
        contact_email
      `)
      .eq('audit_id', cleanId)
      .maybeSingle();

    if (error) {
      console.error('Supabase error querying audit detail by audit_id:', error);
      return { audit: null, error: error.message };
    }

    return { audit: (data as DetailedAuditRecord) || null, error: null };
  } catch (err: any) {
    console.error('Unexpected error fetching audit detail:', err);
    return { audit: null, error: err?.message || 'Unexpected error' };
  }
}

