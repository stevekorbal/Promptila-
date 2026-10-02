import { getSupabaseClient } from './supabase.ts';
import { getDateRangeBounds, calculateTrend } from './adminKpiService.ts';

export interface AuditCategoryBar {
  category: string;
  count: number;
  color: string;
  textColor: string;
}

export interface AuditVolumeChartData {
  categories: AuditCategoryBar[];
  totalAudits: number;
  totalAuditsFormatted: string;
  subtitle: string;
  trendChange?: string;
  trendChangeType: 'positive' | 'negative' | 'neutral';
  avgAuditsPerDay: string;
  maxCount: number;
  error?: string | null;
}

const CATEGORY_COLORS = [
  { color: '#86efac', textColor: 'text-emerald-700' }, // Mint / Apple green
  { color: '#67e8f9', textColor: 'text-cyan-700' },    // Cyan / Golden
  { color: '#d8b4fe', textColor: 'text-purple-700' },  // Lilac / Crisp
  { color: '#fde047', textColor: 'text-amber-700' },   // Amber / Gala
  { color: '#fca5a5', textColor: 'text-rose-700' },    // Rose / Honey
];

function formatSubtitleDateRange(start: Date, end: Date): string {
  const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  const startStr = start.toLocaleDateString('en-US', options);
  const endStr = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  return `${startStr} - ${endStr}`;
}

/**
 * Fetches real Free Audit data from public.audits for the Free Audit Volume by Business Category chart.
 * Strictly requires:
 * - audit_type = 'free'
 * - created_at within selected date range
 *
 * Groups by `category` column (falling back to 'Other / Unspecified' if null/empty).
 * Returns the top 5 categories sorted by count descending.
 */
export async function fetchAuditVolumeChartData(dateRange: string): Promise<AuditVolumeChartData> {
  const bounds = getDateRangeBounds(dateRange);
  const { currentStart, currentEnd, prevStart, prevEnd, days } = bounds;
  const subtitle = formatSubtitleDateRange(currentStart, currentEnd);

  const supabase = getSupabaseClient();
  if (!supabase) {
    console.error('Supabase client is not available for audit volume chart.');
    return {
      categories: [],
      totalAudits: 0,
      totalAuditsFormatted: '—',
      subtitle,
      trendChange: undefined,
      trendChangeType: 'neutral',
      avgAuditsPerDay: 'Average 0.0 Audits/Day',
      maxCount: 0,
      error: 'Supabase client unavailable',
    };
  }

  try {
    const [currentAuditsRes, prevAuditsRes] = await Promise.all([
      // Current Period Free Audits
      supabase
        .from('audits')
        .select('id, category, created_at', { count: 'exact' })
        .eq('audit_type', 'free')
        .gte('created_at', currentStart.toISOString())
        .lte('created_at', currentEnd.toISOString()),

      // Previous Period Free Audits (for comparison trend)
      supabase
        .from('audits')
        .select('id', { count: 'exact' })
        .eq('audit_type', 'free')
        .gte('created_at', prevStart.toISOString())
        .lte('created_at', prevEnd.toISOString()),
    ]);

    if (currentAuditsRes.error) {
      console.error('Supabase query error on current audits for volume chart:', currentAuditsRes.error);
      return {
        categories: [],
        totalAudits: 0,
        totalAuditsFormatted: '—',
        subtitle,
        trendChange: undefined,
        trendChangeType: 'neutral',
        avgAuditsPerDay: 'Average 0.0 Audits/Day',
        maxCount: 0,
        error: currentAuditsRes.error.message,
      };
    }

    if (prevAuditsRes.error) {
      console.warn('Supabase query note on previous audits for volume chart:', prevAuditsRes.error);
    }

    const currentAudits = currentAuditsRes.data || [];
    const totalAudits = currentAuditsRes.count ?? currentAudits.length;
    const prevAudits = prevAuditsRes.count ?? (prevAuditsRes.data ? prevAuditsRes.data.length : 0);

    // Group audits by `category`
    const categoryCounts: Record<string, number> = {};
    for (const audit of currentAudits) {
      const rawCat = audit.category ? String(audit.category).trim() : '';
      const cat = rawCat.length > 0 ? rawCat : 'Other / Unspecified';
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    }

    // Sort categories descending by count, then alphabetically
    const sortedCategories = Object.entries(categoryCounts)
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count || a.category.localeCompare(b.category));

    // Take top 5 categories (only real categories that exist)
    const top5 = sortedCategories.slice(0, 5);

    const categories: AuditCategoryBar[] = top5.map((item, idx) => ({
      category: item.category,
      count: item.count,
      color: CATEGORY_COLORS[idx % CATEGORY_COLORS.length].color,
      textColor: CATEGORY_COLORS[idx % CATEGORY_COLORS.length].textColor,
    }));

    const maxCount = categories.length > 0 ? Math.max(...categories.map((c) => c.count)) : 0;

    // Trend calculation
    const trend = calculateTrend(totalAudits, prevAudits);

    // Average audits per calendar day
    const avgPerDay = days > 0 ? (totalAudits / days).toFixed(1) : '0.0';
    const avgAuditsPerDay = `Average ${avgPerDay} Audits/Day`;

    const totalAuditsFormatted = `${totalAudits} ${totalAudits === 1 ? 'Audit' : 'Audits'}`;

    return {
      categories,
      totalAudits,
      totalAuditsFormatted,
      subtitle,
      trendChange: trend.change,
      trendChangeType: trend.changeType,
      avgAuditsPerDay,
      maxCount,
      error: null,
    };
  } catch (err: any) {
    console.error('Unexpected error fetching audit volume chart data:', err);
    return {
      categories: [],
      totalAudits: 0,
      totalAuditsFormatted: '—',
      subtitle,
      trendChange: undefined,
      trendChangeType: 'neutral',
      avgAuditsPerDay: 'Average 0.0 Audits/Day',
      maxCount: 0,
      error: err?.message || 'Unexpected error',
    };
  }
}
